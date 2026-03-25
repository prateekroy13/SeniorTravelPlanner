import { Router, type IRouter } from "express";
import healthRouter from "./health";
import itinerariesRouter from "./itineraries";
import destinationsRouter from "./destinations";
import sparksRouter from "./sparks";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(itinerariesRouter);
router.use(destinationsRouter);
router.use(sparksRouter);
router.use(authRouter);

export default router;
