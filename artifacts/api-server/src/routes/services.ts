import { Router } from "express";
import {
  getActivePlatforms,
  getActiveServices,
  getServicesByPlatform,
  getServiceById,
} from "../lib/firestore";

const router = Router();

router.get("/services/categories", async (req, res) => {
  try {
    const categories = await getActivePlatforms();
    res.json(categories);
  } catch (err) {
    req.log.error(err, "Failed to list categories");
    res.status(500).json({ error: "Internal server error" });
  }
  return;
});

router.get("/services", async (req, res) => {
  try {
    const { category } = req.query as { category?: string };
    const services = category
      ? await getServicesByPlatform(category)
      : await getActiveServices();
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
  return;
});

router.get("/services/:id", async (req, res) => {
  try {
    const id = String(req.params.id);
    const service = await getServiceById(id);
    if (!service) return res.status(404).json({ error: "Not found" });
    res.json({ ...service, pricePerThousand: Number(service.pricePerThousand) });
  } catch (err) {
    req.log.error(err, "Failed to get service");
    res.status(500).json({ error: "Internal server error" });
  }
  return;
});
export default  router;
