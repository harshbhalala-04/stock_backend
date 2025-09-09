import mongoose from "mongoose";
const Schema = mongoose.Schema;

const stockSchema = new Schema(
  {
    name: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    requestedStartDate: { type: Date, required: true },
    requestedEndDate: { type: Date, required: true },
    returnList: [
      {
        date: { type: Date, required: true },
        returnVal: { type: Number, required: false },
      },
    ],
    statsList: [
      {
        date: { type: Date, required: false },
        candle: { type: Number, required: false },
        greenDay: { type: Number, required: false },
        redDay: { type: Number, required: false },
        gaps: { type: Number, required: false },
        gapUp: { type: Number, required: false },
        gapDown: { type: Number, required: false },
      },
    ],
  },
  { timestamps: true }
);

const Stock = mongoose.model("stock", stockSchema);

export default Stock;
