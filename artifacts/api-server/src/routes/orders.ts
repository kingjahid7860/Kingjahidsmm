import { Router } from "express";
import {
  getOrdersByUserAndStatus,
  getServiceById,
  ensureWallet,
  updateWallet,
  createOrder,
  getOrderById,
} from "../lib/firestore";
import { CreateOrderBody } from "@workspace/api-zod";

const router = Router();

router.get("/orders", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const { status, search, page = "1", limit = "10" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const offset = (pageNum - 1) * limitNum;

    let statusFilter: string | null = null;
    if (status && status !== "all") {
      if (status === "completed") statusFilter = "Completed";
      else if (status === "pending") statusFilter = "Pending";
    }

    const allRows = await getOrdersByUserAndStatus(req.user!.id, statusFilter);

    let filtered = allRows;
    if (search) {
      const term = search.toLowerCase();
      filtered = allRows.filter(
        (r) =>
          String(r.id).includes(term) ||
          r.link.toLowerCase().includes(term),
      );
    }

    const serviceIds = Array.from(new Set(filtered.map((o) => o.serviceId)));
    const serviceMap = new Map<string, { name: string; platform: string }>();
    await Promise.all(
      serviceIds.map(async (id) => {
        const service = await getServiceById(id);
        if (service) serviceMap.set(id, { name: service.name, platform: service.platform });
      }),
    );

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limitNum);

    res.json({
      orders: paginated.map((r) => ({
        id: r.id,
        serviceId: r.serviceId,
        serviceName: serviceMap.get(r.serviceId)?.name ?? "",
        platform: serviceMap.get(r.serviceId)?.platform ?? "",
        link: r.link,
        quantity: r.quantity,
        charge: Number(r.charge),
        status: r.status,
        createdAt: r.createdAt,
      })),
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    req.log.error(err, "Failed to list orders");
    res.status(500).json({ error: "Internal server error" });
  }
  return;
});

router.post("/orders", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const parsed = CreateOrderBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
    const { serviceId, link, quantity } = parsed.data;

    const service = await getServiceById(String(serviceId));
    if (!service) return res.status(404).json({ error: "Service not found" });

    if (quantity < service.minQuantity || quantity > service.maxQuantity) {
      return res.status(400).json({
        error: `Quantity must be between ${service.minQuantity} and ${service.maxQuantity}`,
      });
    }

    const charge = (Number(service.pricePerThousand) * quantity) / 1000;
    const wallet = await ensureWallet(req.user!.id);
    if (Number(wallet.balance) < charge) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    await updateWallet(req.user!.id, {
      balance: Number(wallet.balance) - charge,
      totalSpent: Number(wallet.totalSpent) + charge,
      updatedAt: new Date(),
    });

    const order = await createOrder({
      userId: req.user!.id,
      serviceId: String(serviceId),
      link,
      quantity,
      charge,
      status: "Pending",
    });

    res.status(201).json({
      id: order.id,
      serviceId: order.serviceId,
      serviceName: service.name,
      platform: service.platform,
      link: order.link,
      quantity: order.quantity,
      charge: Number(order.charge),
      status: order.status,
      createdAt: order.createdAt,
    });
  } catch (err) {
    req.log.error(err, "Failed to create order");
    res.status(500).json({ error: "Internal server error" });
  }
  return;
});

router.get("/orders/:id", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const id = String(req.params.id);
    const order = await getOrderById(id);
    if (!order || order.userId !== req.user!.id) {
      return res.status(404).json({ error: "Not found" });
    }
    const service = await getServiceById(order.serviceId);
    res.json({
      id: order.id,
      serviceId: order.serviceId,
      serviceName: service?.name ?? "",
      platform: service?.platform ?? "",
      link: order.link,
      quantity: order.quantity,
      charge: Number(order.charge),
      status: order.status,
      createdAt: order.createdAt,
    });
  } catch (err) {
    req.log.error(err, "Failed to get order");
    res.status(500).json({ error: "Internal server error" });
  }
  return;
});

export default router;
