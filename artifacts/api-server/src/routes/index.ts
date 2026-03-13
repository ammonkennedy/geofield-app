import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import foldersRouter from "./folders";
import samplesRouter from "./samples";
import proxyRouter from "./proxy";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(foldersRouter);
router.use(samplesRouter);
router.use(proxyRouter);

export default router;
