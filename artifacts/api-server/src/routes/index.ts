import { Router, type IRouter } from "express";
import healthRouter from "./health";
import resumeRouter from "./resume";
import blogAiRouter from "./blog-ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(resumeRouter);
router.use(blogAiRouter);

export default router;
