import { Router } from "express";
import {
  getOrdersByUserAndStatus,
  getServiceById,
  ensureWallet,
  updateWallet,
  createOrder,
  getOrderById,
  getSetting,
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

    // Forward the order to the configured provider before charging the wallet.
    // Most SMM APIs use the common action/key/service/link/quantity contract.
    const apiEnabled = (await getSetting("smm_api_enabled")) === "true";
    if (apiEnabled) {
      const apiUrl = (await getSetting("smm_api_url")).trim();
      const apiKey = await getSetting("smm_api_key");
      if (!apiUrl || !apiKey) {
        return res.status(503).json({
          error: "External SMM API is enabled but its URL or API key is missing",
        });
      }

      let apiResponse: Response;
      try {
        apiResponse = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json, text/plain, */*",
          },
          body: new URLSearchParams({
            key: apiKey,
            action: "add",
            service: service.apiServiceId || String(serviceId),
            link,
            quantity: String(quantity),
          }).toString(),
          signal: AbortSignal.timeout(20_000),
        });
      } catch (providerError) {
        req.log.error({ err: providerError }, "External SMM API request failed");
        return res.status(502).json({
          error: "Could not reach the external SMM API. The order was not charged.",
        });
      }

      const rawProviderBody = await apiResponse.text();
      let providerData: Record<string, unknown> | null = null;
      try {
        providerData = JSON.parse(rawProviderBody) as Record<string, unknown>;
      } catch {
        // Some providers return a plain-text error/success response.
      }

      // SMM providers commonly return {error: "..."} or {errors: [...]}
      // with HTTP 200, so inspect the body as well as the HTTP status.
      const providerError =
        providerData?.error ??
        providerData?.errors ??
        (String(providerData?.status ?? "").toLowerCase() === "error"
          ? providerData?.message ?? "provider error"
          : null);
      if (!apiResponse.ok || providerError) {
        req.log.error(
          { status: apiResponse.status, body: rawProviderBody.slice(0, 500) },
          "External SMM API rejected order",
        );
        return res.status(502).json({
          error: `External SMM API rejected the order: ${String(providerError ?? rawProviderBody).slice(0, 240)}`,
        });
      }
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
      status: apiEnabled ? "Processing" : "Pending",
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
