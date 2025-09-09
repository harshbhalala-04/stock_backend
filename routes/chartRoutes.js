import express from "express";
import { calculateStats, demoChart, comparision } from "../controllers/charts.js";

const router = express.Router();

router.get("/calculate-stats", calculateStats);
router.get("/demo", demoChart);
router.get("/comparision", comparision);

export default router;