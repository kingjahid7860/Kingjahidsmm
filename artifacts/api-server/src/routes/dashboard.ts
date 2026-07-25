import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, servicesTable, walletsTable } from "@workspace/db";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { ensureWallet } from "./wallet";

const router = Router();

router.get("/dashboard/stats", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const userId = req.user!.id;

    const wallet = await ensureWallet(userId);

    const [stats] = await db
      .select({
        totalOrders: count(),
        completedOrders: sql<number>`count(*) filter (where ${ordersTable.status} = 'Completed')`,
        pendingOrders: sql<number>`count(*) filter (where ${ordersTable.status} != 'Completed')`,
      })
      .from(ordersTable)
      .where(eq(ordersTable.userId, userId));

    const recentRows = await db
      .select({
        order: ordersTable,
        serviceName: servicesTable.name,
        platform: servicesTable.platform,
      })
      .from(ordersTable)
      .leftJoin(servicesTable, eq(ordersTable.serviceId, servicesTable.id))
      .where(eq(ordersTable.userId, userId))
      .orderBy(desc(ordersTable.createdAt))
      .limit(5);

    res.json({
      balance: Number(wallet.balance),
      totalOrders: Number(stats?.totalOrders ?? 0),
      completedOrders: Number(stats?.completedOrders ?? 0),
      pendingOrders: Number(stats?.pendingOrders ?? 0),
      totalSpent: Number(wallet.totalSpent),
      recentOrders: recentRows.map((r) => ({
        id: r.order.id,
        serviceId: r.order.serviceId,
        serviceName: r.serviceName ?? "",
        platform: r.platform ?? "",
        link: r.order.link,
        quantity: r.order.quantity,
        charge: Number(r.order.charge),
        status: r.order.status,
        createdAt: r.order.createdAt,
      })),
    });
  } catch (err) {
    req.log.error(err, "Failed to get dashboard stats");
    res.status(500).json({ error: "Internal server error" });
  }
  return;
});

export default router;
