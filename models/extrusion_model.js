const mongoose = require("mongoose");

const operations_schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // supplier: {
    //   type: String,
    //   required: true,
    //   trim: true,
    // },
    // currency: {
    //   type: String,
    //   required: true,
    //   trim: true,
    // },
    alloy_id: {
      type: mongoose.Schema.Types.Mixed,
      // required: true,
      trim: true,
    },
    supplier_id: {
      type: mongoose.Types.ObjectId,
      required: true,
      trim: true,
    },
    currency_id: {
      type: mongoose.Types.ObjectId,
      required: true,
      trim: true,
    },
    cost: {
      type: Number,
      required: true,
      trim: true,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    conversion_to_aed: {
      type: Number,
      required: true,
      trim: true,
    },
    cost_to_aed: {
      type: Number,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Operations_Model = mongoose.model("Operations_Model", operations_schema);

module.exports = Operations_Model;
