const mongoose = require("mongoose");

const logSchema = new mongoose.Schema(
  {
    stock_id: {
      type: mongoose.Types.ObjectId,
      required: true,
      trim: true,
    },
    ref_code_id: {
      type: mongoose.Types.ObjectId,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
    },
    stockType: {
      type: String,
      trim: true,
      default: "Package",
    },
    description: {
      type: String,
      trim: true,
      required: true,
    },
    snapShot: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    updateType: {
      type: String,
      enum: ["Open", "Other"],
      required: false,
      trim: true,
      default: "Other",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

const Log_Model = mongoose.model("Log_Model", logSchema);

module.exports = Log_Model;
