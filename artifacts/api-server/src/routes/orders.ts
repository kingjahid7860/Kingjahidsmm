import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, servicesTable, walletsTable } from "@workspace/db";
import { eq, and, ilike, or, desc, sql } from "drizzle-orm";
import { CreateOrderBody } from "@workspace/api-zod";
import { ensureWallet } from "./wallet";

const router = Router();

router.get("/orders", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const { status, search, page = "1", limit = "10" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [eq(ordersTable.userId, req.user!.id)];
    if (status && status !== "all") {
      if (status === "completed") {
        conditions.push(eq(ordersTable.status, "Completed"));
      } else if (status === "pending") {
        conditions.push(sql`${ordersTable.status} != 'Completed'`);
      }
    }

    const baseQuery = db
      .select({
        order: ordersTable,
        serviceName: servicesTable.name,
        platform: servicesTable.platform,
      })
      .from(ordersTable)
      .leftJoin(servicesTable, eq(ordersTable.serviceId, servicesTable.id))
      .where(and(...conditions))
      .orderBy(desc(ordersTable.createdAt));

    const allRows = await baseQuery;
    let filtered = allRows;

    if (search) {
      const term = search.toLowerCase();
      filtered = allRows.filter(
        (r) =>
          String(r.order.id).includes(term) ||
          (r.serviceName ?? "").toLowerCase().includes(term),
      );
    }

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limitNum);

    res.json({
      orders: paginated.map((r) => ({
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

    const [service] = await db
      .select()
      .from(servicesTable)
      .where(eq(servicesTable.id, serviceId));
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

    const [newWallet] = await db
      .update(walletsTable)
      .set({
        balance: String(Number(wallet.balance) - charge),
        totalSpent: String(Number(wallet.totalSpent) + charge),
        updatedAt: new Date(),
      })
      .where(eq(walletsTable.userId, req.user!.id))
      .returning();

    const [order] = await db
      .insert(ordersTable)
      .values({
        userId: req.user!.id,
        serviceId,
        link,
        quantity,
        charge: String(charge),
        status: "Pending",
      })
      .returning();

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
    const id = Number(req.params.id);
    const [row] = await db
      .select({
        order: ordersTable,
        serviceName: servicesTable.name,
        platform: servicesTable.platform,
      })
      .from(ordersTable)
      .leftJoin(servicesTable, eq(ordersTable.serviceId, servicesTable.id))
      .where(and(eq(ordersTable.id, id), eq(ordersTable.userId, req.user!.id)));
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({
      id: row.order.id,
      serviceId: row.order.serviceId,
      serviceName: row.serviceName ?? "",
      platform: row.platform ?? "",
      link: row.order.link,
      quantity: row.order.quantity,
      charge: Number(row.order.charge),
      status: row.order.status,
      createdAt: row.order.createdAt,
    });
  } catch (err) {
    req.log.error(err, "Failed to get order");
    res.status(500).json({ error: "Internal server error" });
  }
  return;
});

export default router;
