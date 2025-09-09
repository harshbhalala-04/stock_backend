import axios from "axios";
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import chartRoutes from "./routes/chartRoutes.js";
import strategyRoutes from "./routes/strategyRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import cors from "cors";

const app = express();
const port = process.env.PORT || 8000;

app.use(bodyParser.json({limit: "50mb"}));
app.use(cors());
app.use(bodyParser.urlencoded({
	limit: "50mb",
	extended: true
}));
const dbUrl =
	"mongodb+srv://HarshBhalala:harsh492002@scripstats-cluster.2mth2jq.mongodb.net/?retryWrites=true&w=majority&appName=scripstats-cluster";

const connectionParams = {
	useNewUrlParser: true,
	useUnifiedTopology: true,
};

mongoose
	.connect(dbUrl, connectionParams)
	.then(() => {
		console.log("connected");
	})
	.catch((e) => {
		console.log("error " + e);
});

app.use("/chart", chartRoutes);
app.use("/strategy", strategyRoutes);
app.use("/search", searchRoutes);

app.listen(port, () => {
	console.log("Server running on ", port);
});
