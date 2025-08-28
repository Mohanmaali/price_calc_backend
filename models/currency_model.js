const mongoose = require("mongoose");

const currency_schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
    },
    fluctuation: {
      type: Number,
      required: true,
      trim: true,
    },
    cost_usd_per_kg: {
      type: Number,
      required: true,
      trim: true,
    },
    cost_usd_per_kg_plus_fluctuation: {
      type: Number,
      required: true,
      trim: true,
    },
    regularUpdate: {
      type: Boolean,
      required: true,
      default: false
    }
  },
  {
    timestamps: true,
  }
);

const Currency_model = mongoose.model("Currency_model", currency_schema);

module.exports = Currency_model;
