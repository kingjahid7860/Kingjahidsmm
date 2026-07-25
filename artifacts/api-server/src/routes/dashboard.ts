import { Router } from "express";
import {
  ensureWallet,
  getRecentOrdersByUser,
  getOrdersByUser,
  getServiceById,
} from "../lib/firestore";

const router = Router();

router.get("/dashboard/stats", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const userId = req.user!.id;

    const wallet = await ensureWallet(userId);
    const orders = await getOrdersByUser(userId);

    const totalOrders = orders.length;
    const completedOrders = orders.filter((o) => o.status === "Completed").length;
    const pendingOrders = orders.filter((o) => o.status !== "Completed").length;

    const recentOrders = orders.slice(0, 5);
    const serviceIds = Array.from(new Set(recentOrders.map((o) => o.serviceId)));
    const serviceMap = new Map<string, { name: string; platform: string }>();
    await Promise.all(
      serviceIds.map(async (id) => {
        const service = await getServiceById(id);
        if (service) serviceMap.set(id, { name: service.name, platform: service.platform });
      }),
    );

    res.json({
      balance: Number(wallet.balance),
      totalOrders,
      completedOrders,
      pendingOrders,
      totalSpent: Number(wallet.totalSpent),
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        serviceId: o.serviceId,
        serviceName: serviceMap.get(o.serviceId)?.name ?? "",
        platform: serviceMap.get(o.serviceId)?.platform ?? "",
        link: o.link,
        quantity: o.quantity,
        charge: Number(o.charge),
        status: o.status,
        createdAt: o.createdAt,
      })),
    });
  } catch (err) {
    req.log.error(err, "Failed to get dashboard stats");
    res.status(500).json({ error: "Internal server error" });
  }
  return;
});

export default router;
