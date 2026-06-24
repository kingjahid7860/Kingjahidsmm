import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import servicesRouter from "./services";
import ordersRouter from "./orders";
import walletRouter from "./wallet";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(servicesRouter);
router.use(ordersRouter);
router.use(walletRouter);
router.use(dashboardRouter);

export default router;
