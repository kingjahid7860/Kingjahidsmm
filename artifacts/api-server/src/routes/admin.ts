import { Router } from "express";
import {
  ensureWallet,
  updateWallet,
  getAllUsers,
  getAllWallets,
  getAllOrders,
  getAllTopupRequests,
  getAllServices,
  getServiceById,
  getUserById,
  getSettings,
  setSetting,
  createService,
  updateService,
  softDeleteService,
  updateOrder,
  updateTopupRequest,
  type Service,
  type Wallet,
  type Order,
  type TopupRequest,
  type User,
} from "../lib/firestore";

const router = Router();

const ADMIN_USER_ID = process.env.ADMIN_USER_ID ?? "61264607";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "kingjahid0786@gmail.com";

function requireAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const isAdmin =
    req.user?.id === ADMIN_USER_ID ||
    (req.user?.email && req.user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
  if (!isAdmin) return res.status(403).json({ error: "Forbidden" });
  next();
}

router.get("/admin/stats", requireAdmin, async (req, res) => {
  try {
    const [users, wallets, orders, topups] = await Promise.all([
      getAllUsers(),
      getAllWallets(),
      getAllOrders(),
      getAllTopupRequests(),
    ]);
    const totalBalance = wallets.reduce((sum, w) => sum + Number(w.balance), 0);
    const pendingTopups = topups.filter((t) => t.status === "Pending").length;

    res.json({
      totalUsers: users.length,
      totalBalance,
      totalOrders: orders.length,
      pendingTopups,
    });
  } catch (err) {
    req.log.error(err, "Failed to get admin stats");
    res.status(500).json({ error: "Internal server error" });
  }
  return;
});

router.get("/admin/users", requireAdmin, async (req, res) => {
  try {
    const [users, wallets, orders] = await Promise.all([
      getAllUsers(),
      getAllWallets(),
      getAllOrders(),
    ]);
    const walletMap = new Map(wallets.map((w) => [w.userId, w]));
    const orderCounts = new Map<string, number>();
    orders.forEach((o) => {
      orderCounts.set(o.userId, (orderCounts.get(o.userId) || 0) + 1);
    });

    res.json(
      users.map((u) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        profileImageUrl: u.profileImageUrl,
        balance: Number(walletMap.get(u.id)?.balance ?? 0),
        totalOrders: orderCounts.get(u.id) ?? 0,
        createdAt: u.createdAt,
      })),
    );
  } catch (err) {
    req.log.error(err, "Failed to list admin users");
    res.status(500).json({ error: "Internal server error" });
  }
  return;
});

router.patch("/admin/users/:id/balance", requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const balance = Number(req.body?.balance);
    if (isNaN(balance) || balance < 0) return res.status(400).json({ error: "Invalid balance" });

    const wallet = await ensureWallet(userId);
    const updated = await updateWallet(userId, {
      balance,
      updatedAt: new Date(),
    });

    res.json({
      balance: Number(updated.balance),
      totalSpent: Number(updated.totalSpent),
      totalAdded: Number(updated.totalAdded),
    });
  } catch (err) {
    req.log.error(err, "Failed to update user balance");
    res.status(500).json({ error: "Internal server error" });
  }
  return;
});

router.get("/admin/orders", requireAdmin, async (req, res) => {
  try {
    const { page = "1", limit = "15", status } = req.query as Record<string, string>;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const offset = (pageNum - 1) * limitNum;

    const orders = await getAllOrders(status && status !== "all" ? status : undefined);

    const [users, services] = await Promise.all([getAllUsers(), getAllServices()]);
    const userMap = new Map(users.map((u) => [u.id, u]));
    const serviceMap = new Map(services.map((s) => [s.id, s]));

    const total = orders.length;
    const paginated = orders.slice(offset, offset + limitNum);

    res.json({
      orders: paginated.map((o) => ({
        id: o.id,
        userId: o.userId,
        userEmail: userMap.get(o.userId)?.email ?? null,
        serviceId: o.serviceId,
        serviceName: serviceMap.get(o.serviceId)?.name ?? "",
        platform: serviceMap.get(o.serviceId)?.platform ?? "",
        link: o.link,
        quantity: o.quantity,
        charge: Number(o.charge),
        status: o.status,
        createdAt: o.createdAt,
      })),
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    req.log.error(err, "Failed to list admin orders");
    res.status(500).json({ error: "Internal server error" });
  }
  return;
});

router.patch("/admin/orders/:id/status", requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    const status = String(req.body?.status ?? "");
    if (!["Pending", "Processing", "Completed", "Cancelled"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const order = await getAllOrders().then((orders) => orders.find((o) => o.id === id));
    if (!order) return res.status(404).json({ error: "Order not found" });

    const [user, service] = await Promise.all([
      getUserById(order.userId),
      getServiceById(order.serviceId),
    ]);

    const updated = await updateOrder(id, { status });

    res.json({
      id: updated.id,
      userId: updated.userId,
      userEmail: user?.email ?? null,
      serviceId: updated.serviceId,
      serviceName: service?.name ?? "",
      platform: service?.platform ?? "",
      link: updated.link,
      quantity: updated.quantity,
      charge: Number(updated.charge),
      status: updated.status,
      createdAt: updated.createdAt,
    });
  } catch (err) {
    req.log.error(err, "Failed to update order status");
    res.status(500).json({ error: "Internal server error" });
  }
  return;
});

router.get("/admin/topups", requireAdmin, async (req, res) => {
  try {
    const { page = "1", limit = "15", status } = req.query as Record<string, string>;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const offset = (pageNum - 1) * limitNum;

    const topups = await getAllTopupRequests(status && status !== "all" ? status : undefined);
    const users = await getAllUsers();
    const userMap = new Map(users.map((u) => [u.id, u]));

    const total = topups.length;
    const paginated = topups.slice(offset, offset + limitNum);

    res.json({
      topups: paginated.map((t) => ({
        id: t.id,
        userId: t.userId,
        userEmail: userMap.get(t.userId)?.email ?? null,
        amount: Number(t.amount),
        paymentMethod: t.paymentMethod,
        transactionId: t.transactionId,
        status: t.status,
        createdAt: t.createdAt,
      })),
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    req.log.error(err, "Failed to list admin topups");
    res.status(500).json({ error: "Internal server error" });
  }
  return;
});

router.patch("/admin/topups/:id", requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    const status = String(req.body?.status ?? "");
    if (!["Pending", "Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const topup = await getAllTopupRequests().then((topups) => topups.find((t) => t.id === id));
    if (!topup) return res.status(404).json({ error: "Topup not found" });

    const user = await getUserById(topup.userId);

    const updated = await updateTopupRequest(id, { status });

    if (status === "Approved" && topup.status !== "Approved") {
      const wallet = await ensureWallet(topup.userId);
      const newBalance = Number(wallet.balance) + Number(topup.amount);
      const newAdded = Number(wallet.totalAdded) + Number(topup.amount);
      await updateWallet(topup.userId, {
        balance: newBalance,
        totalAdded: newAdded,
        updatedAt: new Date(),
      });
    }

    res.json({
      id: updated.id,
      userId: updated.userId,
      userEmail: user?.email ?? null,
      amount: Number(updated.amount),
      paymentMethod: updated.paymentMethod,
      transactionId: updated.transactionId,
      status: updated.status,
      createdAt: updated.createdAt,
    });
  } catch (err) {
    req.log.error(err, "Failed to update topup status");
    res.status(500).json({ error: "Internal server error" });
  }
  return;
});

router.get("/admin/services", requireAdmin, async (req, res) => {
  try {
    const services = await getAllServices();
    res.json(services.map((s) => ({ ...s, pricePerThousand: Number(s.pricePerThousand) })));
  } catch (err) {
    req.log.error(err, "Failed to list admin services");
    res.status(500).json({ error: "Internal server error" });
  }
  return;
});

router.get("/admin/api-settings", requireAdmin, async (req, res) => {
  try {
    const rows = await getSettings();
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    res.json({
      apiUrl: map["smm_api_url"] ?? "",
      apiKey: map["smm_api_key"] ?? "",
      isEnabled: map["smm_api_enabled"] === "true",
    });
  } catch (err) {
    req.log.error(err, "Failed to get API settings");
    res.status(500).json({ error: "Internal server error" });
  }
  return;
});

router.put("/admin/api-settings", requireAdmin, async (req, res) => {
  try {
    const apiUrl = String(req.body?.apiUrl ?? "");
    const apiKey = String(req.body?.apiKey ?? "");
    const isEnabled = req.body?.isEnabled === true;

    await setSetting("smm_api_url", apiUrl);
    await setSetting("smm_api_key", apiKey);
    await setSetting("smm_api_enabled", String(isEnabled));
    res.json({ apiUrl, apiKey, isEnabled });
  } catch (err) {
    req.log.error(err, "Failed to update API settings");
    res.status(500).json({ error: "Internal server error" });
  }
  return;
});

router.get("/admin/settings", requireAdmin, async (req, res) => {
  try {
    const rows = await getSettings();
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    res.json({
      upiId: map["upi_id"] ?? "",
      qrUrl: map["qr_url"] ?? "",
    });
  } catch (err) {
    req.log.error(err, "Failed to get payment settings");
    res.status(500).json({ error: "Internal server error" });
  }
  return;
});

router.put("/admin/settings", requireAdmin, async (req, res) => {
  try {
    const upiId = String(req.body?.upiId ?? "");
    const qrUrl = String(req.body?.qrUrl ?? "");

    await setSetting("upi_id", upiId);
    await setSetting("qr_url", qrUrl);
    res.json({ upiId, qrUrl });
  } catch (err) {
    req.log.error(err, "Failed to update payment settings");
    res.status(500).json({ error: "Internal server error" });
  }
  return;
});

router.post("/admin/services", requireAdmin, async (req, res) => {
  try {
    const { name, category, platform, description, pricePerThousand, minQuantity, maxQuantity } = req.body;
    if (!name || !category || !platform || !description || pricePerThousand == null) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const service = await createService({
      name,
      category,
      platform,
      description,
      pricePerThousand: Number(pricePerThousand),
      minQuantity: Number(minQuantity),
      maxQuantity: Number(maxQuantity),
      isActive: true,
    });
    res.status(201).json({ ...service, pricePerThousand: Number(service.pricePerThousand) });
  } catch (err) {
    req.log.error(err, "Failed to create service");
    res.status(500).json({ error: "Internal server error" });
  }
  return;
});

router.patch("/admin/services/:id", requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    const { name, category, platform, description, pricePerThousand, minQuantity, maxQuantity } = req.body;
    const service = await updateService(id, {
      name,
      category,
      platform,
      description,
      pricePerThousand: Number(pricePerThousand),
      minQuantity: Number(minQuantity),
      maxQuantity: Number(maxQuantity),
    });
    if (!service) return res.status(404).json({ error: "Service not found" });
    res.json({ ...service, pricePerThousand: Number(service.pricePerThousand) });
  } catch (err) {
    req.log.error(err, "Failed to update service");
    res.status(500).json({ error: "Internal server error" });
  }
  return;
});

router.delete("/admin/services/:id", requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    await softDeleteService(id);
    res.json({ success: true });
  } catch (err) {
    req.log.error(err, "Failed to delete service");
    res.status(500).json({ error: "Internal server error" });
  }
  return;
});

export default router;
