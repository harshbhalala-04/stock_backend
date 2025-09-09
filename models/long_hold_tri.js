import mongoose from "mongoose";
const Schema = mongoose.Schema;

const longHoldTRISchema = new Schema(
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

  },
  { timestamps: true }
);

const LongHoldTRI = mongoose.model("long_hold_tri", longHoldTRISchema);

export default LongHoldTRI;
