const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const stockSchema = new Schema(
  {
    name: { type: String, required: true },
    returnList: [
      {
        date: { type: Date, required: true },
        returnVal: { type: Number, required: false },
      },
    ],
    lastDate: { type: Date, required: true },
  },
  { timestamps: true }
);

const Stock = mongoose.model("Stock", stockSchema);

module.exports = Stock;
