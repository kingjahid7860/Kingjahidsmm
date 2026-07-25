import { Router } from "express";
import { db, usersTable, walletsTable, ordersTable, servicesTable, topupRequestsTable, settingsTable } from "@workspace/db";
import { eq, desc, sql, and } from "drizzle-orm";
import { ensureWallet } from "./wallet";

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
    const [{ totalUsers }] = await db
      .select({ totalUsers: sql<number>`count(*)::int` })
      .from(usersTable);

    const [{ totalBalance }] = await db
      .select({ totalBalance: sql<number>`coalesce(sum(balance::numeric), 0)` })
      .from(walletsTable);

    const [{ totalOrders }] = await db
      .select({ totalOrders: sql<number>`count(*)::int` })
      .from(ordersTable);

    const [{ pendingTopups }] = await db
      .select({ pendingTopups: sql<number>`count(*)::int` })
      .from(topupRequestsTable)
      .where(eq(topupRequestsTable.status, "Pending"));

    res.json({
      totalUsers,
      totalBalance: Number(totalBalance),
      totalOrders,
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
    const users = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        profileImageUrl: usersTable.profileImageUrl,
        createdAt: usersTable.createdAt,
        balance: walletsTable.balance,
        totalOrders: sql<number>`count(${ordersTable.id})::int`,
      })
      .from(usersTable)
      .leftJoin(walletsTable, eq(walletsTable.userId, usersTable.id))
      .leftJoin(ordersTable, eq(ordersTable.userId, usersTable.id))
      .groupBy(usersTable.id, walletsTable.balance)
      .orderBy(desc(usersTable.createdAt));

    res.json(
      users.map((u) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        profileImageUrl: u.profileImageUrl,
        balance: Number(u.balance ?? 0),
        totalOrders: u.totalOrders,
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
    const [updated] = await db
      .update(walletsTable)
      .set({ balance: String(balance), updatedAt: new Date() })
      .where(eq(walletsTable.userId, userId))
      .returning();

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

    const conditions: any[] = [];
    if (status && status !== "all") conditions.push(eq(ordersTable.status, status));

    const rows = await db
      .select({
        order: ordersTable,
        serviceName: servicesTable.name,
        platform: servicesTable.platform,
        userEmail: usersTable.email,
      })
      .from(ordersTable)
      .leftJoin(servicesTable, eq(ordersTable.serviceId, servicesTable.id))
      .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(ordersTable.createdAt));

    const total = rows.length;
    const paginated = rows.slice(offset, offset + limitNum);

    res.json({
      orders: paginated.map((r) => ({
        id: r.order.id,
        userId: r.order.userId,
        userEmail: r.userEmail ?? null,
        serviceId: r.order.serviceId,
        serviceName: r.serviceName ?? "",
        platform: r.platform ?? "",
        link: r.order.link,
        quantity: r.order.quantity,
        charge: Number(r.order.charge),
        status: r.order.status,
        createdAt: r.order.createdAt,
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
    const id = Number(req.params.id);
    const status = String(req.body?.status ?? "");
    if (!["Pending", "Processing", "Completed", "Cancelled"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const [row] = await db
      .select({
        order: ordersTable,
        serviceName: servicesTable.name,
        platform: servicesTable.platform,
        userEmail: usersTable.email,
      })
      .from(ordersTable)
      .leftJoin(servicesTable, eq(ordersTable.serviceId, servicesTable.id))
      .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
      .where(eq(ordersTable.id, id));

    if (!row) return res.status(404).json({ error: "Order not found" });

    const [updated] = await db
      .update(ordersTable)
      .set({ status })
      .where(eq(ordersTable.id, id))
      .returning();

    res.json({
      id: updated.id,
      userId: updated.userId,
      userEmail: row.userEmail ?? null,
      serviceId: updated.serviceId,
      serviceName: row.serviceName ?? "",
      platform: row.platform ?? "",
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

    const conditions: any[] = [];
    if (status && status !== "all") conditions.push(eq(topupRequestsTable.status, status));

    const rows = await db
      .select({
        topup: topupRequestsTable,
        userEmail: usersTable.email,
      })
      .from(topupRequestsTable)
      .leftJoin(usersTable, eq(topupRequestsTable.userId, usersTable.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(topupRequestsTable.createdAt));

    const total = rows.length;
    const paginated = rows.slice(offset, offset + limitNum);

    res.json({
      topups: paginated.map((r) => ({
        id: r.topup.id,
        userId: r.topup.userId,
        userEmail: r.userEmail ?? null,
        amount: Number(r.topup.amount),
        paymentMethod: r.topup.paymentMethod,
        transactionId: r.topup.transactionId,
        status: r.topup.status,
        createdAt: r.topup.createdAt,
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
    const id = Number(req.params.id);
    const status = String(req.body?.status ?? "");
    if (!["Pending", "Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const [topup] = await db
      .select({ topup: topupRequestsTable, userEmail: usersTable.email })
      .from(topupRequestsTable)
      .leftJoin(usersTable, eq(topupRequestsTable.userId, usersTable.id))
      .where(eq(topupRequestsTable.id, id));
    if (!topup) return res.status(404).json({ error: "Topup not found" });

    const [updated] = await db
      .update(topupRequestsTable)
      .set({ status })
      .where(eq(topupRequestsTable.id, id))
      .returning();

    if (status === "Approved" && topup.topup.status !== "Approved") {
      const wallet = await ensureWallet(topup.topup.userId);
      const newBalance = Number(wallet.balance) + Number(topup.topup.amount);
      const newAdded = Number(wallet.totalAdded) + Number(topup.topup.amount);
      await db
        .update(walletsTable)
        .set({ balance: String(newBalance), totalAdded: String(newAdded), updatedAt: new Date() })
        .where(eq(walletsTable.userId, topup.topup.userId));
    }

    res.json({
      id: updated.id,
      userId: updated.userId,
      userEmail: topup.userEmail ?? null,
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
    const services = await db.select().from(servicesTable).orderBy(servicesTable.platform, servicesTable.name);
    res.json(services.map((s) => ({ ...s, pricePerThousand: Number(s.pricePerThousand) })));
  } catch (err) {
    req.log.error(err, "Failed to list admin services");
    res.status(500).json({ error: "Internal server error" });
  }
  return;
});

router.get("/admin/api-settings", requireAdmin, async (req, res) => {
  try {
    const rows = await db.select().from(settingsTable);
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

    for (const [key, value] of [["smm_api_url", apiUrl], ["smm_api_key", apiKey], ["smm_api_enabled", String(isEnabled)]] as [string, string][]) {
      await db.insert(settingsTable).values({ key, value }).onConflictDoUpdate({ target: settingsTable.key, set: { value, updatedAt: new Date() } });
    }
    res.json({ apiUrl, apiKey, isEnabled });
  } catch (err) {
    req.log.error(err, "Failed to update API settings");
    res.status(500).json({ error: "Internal server error" });
  }
  return;
});

router.get("/admin/settings", requireAdmin, async (req, res) => {
  try {
    const rows = await db.select().from(settingsTable);
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

    await db
      .insert(settingsTable)
      .values({ key: "upi_id", value: upiId })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value: upiId, updatedAt: new Date() } });

    await db
      .insert(settingsTable)
      .values({ key: "qr_url", value: qrUrl })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value: qrUrl, updatedAt: new Date() } });

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
    const [service] = await db
      .insert(servicesTable)
      .values({
        name,
        category,
        platform,
        description,
        pricePerThousand: String(pricePerThousand),
        minQuantity: Number(minQuantity),
        maxQuantity: Number(maxQuantity),
        isActive: true,
      })
      .returning();
    res.status(201).json({ ...service, pricePerThousand: Number(service.pricePerThousand) });
  } catch (err) {
    req.log.error(err, "Failed to create service");
    res.status(500).json({ error: "Internal server error" });
  }
  return;
});

router.patch("/admin/services/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, category, platform, description, pricePerThousand, minQuantity, maxQuantity } = req.body;
    const [service] = await db
      .update(servicesTable)
      .set({
        name,
        category,
        platform,
        description,
        pricePerThousand: String(pricePerThousand),
        minQuantity: Number(minQuantity),
        maxQuantity: Number(maxQuantity),
      })
      .where(eq(servicesTable.id, id))
      .returning();
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
    const id = Number(req.params.id);
    await db.update(servicesTable).set({ isActive: false }).where(eq(servicesTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error(err, "Failed to delete service");
    res.status(500).json({ error: "Internal server error" });
  }
  return;
});

export default router;
