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
  updateUser,
  getAllApiProviders,
  getApiProviderById,
  createApiProvider,
  updateApiProvider,
  deleteApiProvider,
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
        discountPercent: Number(u.discountPercent ?? 0),
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

router.patch("/admin/users/:id/pricing", requireAdmin, async (req, res) => {
  try {
    const userId = String(req.params.id);
    const discountPercent = Number(req.body?.discountPercent);
    if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      return res.status(400).json({ error: "Discount must be between 0 and 100" });
    }
    const user = await getUserById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    const updated = await updateUser(userId, { discountPercent });
    res.json({ id: updated.id, discountPercent: Number(updated.discountPercent) });
  } catch (err) {
    req.log.error(err, "Failed to update user pricing");
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
      res.json(services.map((s) => ({ ...s, apiServiceId: s.apiServiceId, pricePerThousand: Number(s.pricePerThousand) })));
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

router.get("/admin/api-providers", requireAdmin, async (req, res) => {
  try {
    const providers = await getAllApiProviders();
    res.json(providers.map(({ apiKey, ...provider }) => ({ ...provider, hasApiKey: Boolean(apiKey) })));
  } catch (err) {
    req.log.error(err, "Failed to list API providers");
    res.status(500).json({ error: "Internal server error" });
  }
  return;
});

router.post("/admin/api-providers", requireAdmin, async (req, res) => {
  try {
    const { name, apiUrl, apiKey, isEnabled = true, markupPercent = 0 } = req.body ?? {};
    if (!String(name ?? "").trim() || !String(apiUrl ?? "").trim() || !String(apiKey ?? "").trim()) {
      return res.status(400).json({ error: "Provider name, API URL and API key are required" });
    }
    const provider = await createApiProvider({ name: String(name).trim(), apiUrl: String(apiUrl).trim(), apiKey: String(apiKey), isEnabled: Boolean(isEnabled), markupPercent: Math.max(0, Number(markupPercent) || 0) });
    res.status(201).json({ ...provider, apiKey: undefined });
  } catch (err) {
    req.log.error(err, "Failed to create API provider");
    res.status(500).json({ error: "Internal server error" });
  }
  return;
});

router.patch("/admin/api-providers/:id", requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    const current = await getApiProviderById(id);
    if (!current) return res.status(404).json({ error: "Provider not found" });
    const patch = req.body ?? {};
    const provider = await updateApiProvider(id, {
      name: patch.name === undefined ? current.name : String(patch.name).trim(),
      apiUrl: patch.apiUrl === undefined ? current.apiUrl : String(patch.apiUrl).trim(),
      apiKey: patch.apiKey ? String(patch.apiKey) : current.apiKey,
      isEnabled: patch.isEnabled === undefined ? current.isEnabled : Boolean(patch.isEnabled),
      markupPercent: patch.markupPercent === undefined ? current.markupPercent : Math.max(0, Number(patch.markupPercent) || 0),
    });
    const { apiKey, ...safe } = provider;
    res.json({ ...safe, hasApiKey: Boolean(apiKey) });
  } catch (err) {
    req.log.error(err, "Failed to update API provider");
    res.status(500).json({ error: "Internal server error" });
  }
  return;
});

router.delete("/admin/api-providers/:id", requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    if (!(await getApiProviderById(id))) return res.status(404).json({ error: "Provider not found" });
    await deleteApiProvider(id);
    res.json({ success: true });
  } catch (err) {
    req.log.error(err, "Failed to delete API provider");
    res.status(500).json({ error: "Internal server error" });
  }
  return;
});

router.post("/admin/api-providers/:id/sync", requireAdmin, async (req, res) => {
  try {
    const provider = await getApiProviderById(String(req.params.id));
    if (!provider) return res.status(404).json({ error: "Provider not found" });
    const response = await fetch(provider.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json, text/plain, */*" },
      body: new URLSearchParams({ key: provider.apiKey, action: "services" }).toString(),
      signal: AbortSignal.timeout(20000),
    });
    const raw = await response.text();
    let payload: unknown;
    try { payload = JSON.parse(raw); } catch { payload = null; }
    if (!response.ok || !payload) return res.status(502).json({ error: "Provider returned an invalid services response" });
    const rows = Array.isArray(payload) ? payload : Array.isArray((payload as any).services) ? (payload as any).services : [];
    if (!rows.length) return res.status(422).json({ error: "Provider returned no services" });
    const existing = await getAllServices();
    const byProviderId = new Map(existing.filter((s) => s.providerId === provider.id).map((s) => [s.apiServiceId, s]));
    let imported = 0;
    for (const row of rows as Record<string, unknown>[]) {
      const apiServiceId = String(row.service ?? row.id ?? "").trim();
      const name = String(row.name ?? `Service ${apiServiceId}`).trim();
      if (!apiServiceId || !name) continue;
      const rate = Number(row.rate ?? row.price ?? 0);
      const markupPercent = Math.max(0, Number(req.body?.markupPercent ?? provider.markupPercent) || 0);
      const minQuantity = Number(row.min ?? row.min_quantity ?? 1);
      const maxQuantity = Number(row.max ?? row.max_quantity ?? 1000000);
      const category = String(row.category ?? row.type ?? "Imported");
      const platform = String(row.platform ?? category);
      const values = { providerId: provider.id, apiServiceId, name, category, platform, description: String(row.description ?? name), pricePerThousand: Number.isFinite(rate) ? rate * (1 + markupPercent / 100) : 0, minQuantity: Number.isFinite(minQuantity) ? minQuantity : 1, maxQuantity: Number.isFinite(maxQuantity) ? maxQuantity : 1000000, isActive: false };
      const match = byProviderId.get(apiServiceId);
      if (match) await updateService(match.id, values);
      else await createService(values);
      imported++;
    }
    res.json({ imported });
  } catch (err) {
    req.log.error(err, "Failed to sync API provider services");
    res.status(502).json({ error: "Could not fetch services from this provider" });
  }
  return;
});

router.get("/admin/api-providers/:id/catalog", requireAdmin, async (req, res) => {
  try {
    const provider = await getApiProviderById(String(req.params.id));
    if (!provider) return res.status(404).json({ error: "Provider not found" });
    const response = await fetch(provider.apiUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json, text/plain, */*" }, body: new URLSearchParams({ key: provider.apiKey, action: "services" }).toString(), signal: AbortSignal.timeout(20000) });
    const raw = await response.text();
    let payload: any;
    try { payload = JSON.parse(raw); } catch { payload = null; }
    const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.services) ? payload.services : [];
    if (!response.ok || !rows.length) return res.status(502).json({ error: "Provider returned no services" });
    res.json(rows);
  } catch (err) {
    req.log.error(err, "Failed to load provider catalog");
    res.status(502).json({ error: "Could not load provider services" });
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
    const { apiServiceId, name, category, platform, description, pricePerThousand, minQuantity, maxQuantity } = req.body;
    if (!apiServiceId || !name || !category || !platform || !description || pricePerThousand == null) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const service = await createService({
      apiServiceId: String(apiServiceId),
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
    const { apiServiceId, name, category, platform, description, pricePerThousand, minQuantity, maxQuantity } = req.body;
    const service = await updateService(id, {
      apiServiceId: String(apiServiceId ?? ""),
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

router.patch("/admin/services/:id/status", requireAdmin, async (req, res) => {
  try {
    const service = await getServiceById(String(req.params.id));
    if (!service) return res.status(404).json({ error: "Service not found" });
    const updated = await updateService(service.id, { isActive: req.body?.isActive === true });
    res.json({ ...updated, pricePerThousand: Number(updated.pricePerThousand) });
  } catch (err) {
    req.log.error(err, "Failed to update service status");
    res.status(500).json({ error: "Internal server error" });
  }
  return;
});

router.post("/admin/services/price-adjustment", requireAdmin, async (req, res) => {
  try {
    const percent = Number(req.body?.percent);
    const mode = req.body?.mode === "discount" ? "discount" : "increase";
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) return res.status(400).json({ error: "Percentage must be between 0 and 100" });
    const services = await getAllServices();
    const factor = mode === "discount" ? 1 - percent / 100 : 1 + percent / 100;
    await Promise.all(services.map((service) => updateService(service.id, { pricePerThousand: Number((service.pricePerThousand * factor).toFixed(6)) })));
    res.json({ updated: services.length, mode, percent });
  } catch (err) {
    req.log.error(err, "Failed to adjust service prices");
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
