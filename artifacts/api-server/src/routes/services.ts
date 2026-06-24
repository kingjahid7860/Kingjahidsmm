import { Router } from "express";
import { db } from "@workspace/db";
import { servicesTable } from "@workspace/db";
import { eq, ilike, and } from "drizzle-orm";

const router = Router();

router.get("/services/categories", async (req, res) => {
  try {
    const rows = await db
      .selectDistinct({ platform: servicesTable.platform })
      .from(servicesTable)
      .where(eq(servicesTable.isActive, true));
    const categories = rows.map((r) => r.platform);
    res.json(categories);
  } catch (err) {
    req.log.error(err, "Failed to list categories");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/services", async (req, res) => {
  try {
    const { category } = req.query as { category?: string };
    const conditions = [eq(servicesTable.isActive, true)];
    if (category) {
      conditions.push(ilike(servicesTable.platform, category));
    }
    const services = await db
      .select()
      .from(servicesTable)
      .where(and(...conditions));
    res.json(
      services.map((s) => ({
        ...s,
        pricePerThousand: Number(s.pricePerThousand),
      })),
    );
  } catch (err) {
    req.log.error(err, "Failed to list services");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/services/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [service] = await db
      .select()
      .from(servicesTable)
      .where(eq(servicesTable.id, id));
    if (!service) return res.status(404).json({ error: "Not found" });
    res.json({ ...service, pricePerThousand: Number(service.pricePerThousand) });
  } catch (err) {
    req.log.error(err, "Failed to get service");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
