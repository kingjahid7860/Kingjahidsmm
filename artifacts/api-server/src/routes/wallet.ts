import { Router } from "express";
import {
  ensureWallet,
  getWalletByUserId,
  createWallet,
  updateWallet,
  getTopupRequestsByUser,
  createTopupRequest,
  type Wallet,
} from "../lib/firestore";
import { TopupWalletBody } from "@workspace/api-zod";

const router = Router();

export { ensureWallet };

router.get("/wallet", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const wallet = await ensureWallet(req.user!.id);
    res.json({
      balance: Number(wallet.balance),
      totalSpent: Number(wallet.totalSpent),
      totalAdded: Number(wallet.totalAdded),
    });
  } catch (err) {
    req.log.error(err, "Failed to get wallet");
    res.status(500).json({ error: "Internal server error" });
  }
  return;
});

router.post("/wallet/topup", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const parsed = TopupWalletBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
    const { amount, paymentMethod, transactionId } = parsed.data;

    const topup = await createTopupRequest({
      userId: req.user!.id,
      amount,
      paymentMethod,
      transactionId,
      status: "Pending",
    });

    res.status(201).json({
      ...topup,
      amount: Number(topup.amount),
    });
  } catch (err) {
    req.log.error(err, "Failed to create topup");
    res.status(500).json({ error: "Internal server error" });
  }
  return;
});

router.get("/wallet/topups", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const topups = await getTopupRequestsByUser(req.user!.id);
    res.json(topups.map((t) => ({ ...t, amount: Number(t.amount) })));
  } catch (err) {
    req.log.error(err, "Failed to list topups");
    res.status(500).json({ error: "Internal server error" });
  }
  return;
});

export default router;
