import axios from "axios";
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import { MongoClient, ServerApiVersion } from "mongodb";
import chartRoutes from "./routes/chartRoutes.js";
import strategyRoutes from "./routes/strategyRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import cors from "cors";
import * as dotenv from 'dotenv';


const app = express();
const port = process.env.PORT || 8000;
// Load environment variables from .env file
dotenv.config();

app.use(bodyParser.json({limit: "50mb"}));
app.use(cors({
  origin: '*', // Or replace '*' with your frontend URL for more security
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(bodyParser.urlencoded({
	limit: "50mb",
	extended: true
}));
	
const connectionParams = {
	useNewUrlParser: true,
	useUnifiedTopology: true,
};

mongoose
	.connect(process.env.MONGODB_URI, connectionParams)
	.then(() => {
		console.log("connected");
	})
	.catch((e) => {
		console.log("error " + e);
});

app.use("/chart", chartRoutes);
app.use("/strategy", strategyRoutes);
app.use("/search", searchRoutes);

app.get("/", (req, res) => {
	res.json({"message": "Server started"});
});

app.get("/status", (req, res) => {
	const state = mongoose.connection.readyState;

  let status = "Unknown";
  switch (state) {
    case 0:
      status = "🔴 Disconnected";
      break;
    case 1:
      status = "🟢 Connected";
      break;
    case 2:
      status = "🟡 Connecting";
      break;
    case 3:
      status = "🟠 Disconnecting";
      break;
  }

  res.json({
    state,
    status,
  });
});

app.listen(port, () => {
	console.log("Server running on ", port);
});
