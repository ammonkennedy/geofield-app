import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import foldersRouter from "./folders";
import samplesRouter from "./samples";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(foldersRouter);
router.use(samplesRouter);

export default router;
