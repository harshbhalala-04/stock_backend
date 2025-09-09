import express from "express";
import { searchTicker } from "../controllers/search.js";

const router = express.Router();

router.get("/ticker", searchTicker);

export default router;