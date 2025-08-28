const mongoose = require("mongoose");

const packaging_unit_schema = new mongoose.Schema(
  {
    packing_code: {
      type: String,
      required: true,
      trim: true,
    },
    reference: {
      type: String,
      required: true,
    },
    packing_unit: {
      type: String,
      required: true,
    },
    packing_quantity: {
      type: String,
      trim: true,
    },
    packing_material: {
      type: String,
      trim: true,
    },
    packing_cost: {
      type: Number,
      trim: true,
    },
    packing_itm_cost: {
      type: Number,
      trim: true,
    },
    packing_total_cost: {
      type: Number,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Packaging_Unit = mongoose.model("Packaging_Unit", packaging_unit_schema);

module.exports = Packaging_Unit;
