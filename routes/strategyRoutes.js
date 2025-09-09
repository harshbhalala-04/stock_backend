import express from "express";
import { longHold, longIntraDay, longHoldTRI } from "../controllers/strategy.js";

const router = express.Router();

router.get("/long-hold", longHold);
router.get("/long-intraday", longIntraDay);
router.get("/long-hold-tri", longHoldTRI);


export default router;