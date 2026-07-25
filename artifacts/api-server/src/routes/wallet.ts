import { Router } from "express";
import { db } from "@workspace/db";
import { walletsTable, topupRequestsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { TopupWalletBody } from "@workspace/api-zod";

const router = Router();

async function ensureWallet(userId: string) {
  const [existing] = await db
    .select()
    .from(walletsTable)
    .where(eq(walletsTable.userId, userId));
  if (existing) return existing;
  const [created] = await db
    .insert(walletsTable)
    .values({ userId, balance: "0", totalSpent: "0", totalAdded: "0" })
    .returning();
  return created;
}

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

    const [topup] = await db
      .insert(topupRequestsTable)
      .values({
        userId: req.user!.id,
        amount: String(amount),
        paymentMethod,
        transactionId,
        status: "Pending",
      })
      .returning();

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
    const topups = await db
      .select()
      .from(topupRequestsTable)
      .where(eq(topupRequestsTable.userId, req.user!.id))
      .orderBy(topupRequestsTable.createdAt);
    res.json(topups.map((t) => ({ ...t, amount: Number(t.amount) })));
  } catch (err) {
    req.log.error(err, "Failed to list topups");
    res.status(500).json({ error: "Internal server error" });
  }
  return;
});

export { ensureWallet };
export default router;
