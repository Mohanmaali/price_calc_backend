const mongoose = require("mongoose");

const loose_stock_schema = new mongoose.Schema(
  {
    // code: {
    //   type: String,
    //   trim: true,
    //   required: true,
    //   unique: true,
    // },
    code_id: {
      type: mongoose.Schema.ObjectId,
      trim: true,
    },
    // image: {
    //   type: String,
    //   trim: true,
    // },
    category: {
      type: String,
      trim: true,
      required: true,
    },
    msq: {
      type: Number,
      required: true,
      trim: true,
      default: 1,
    },
    location: {
      type: String,
      trim: true,
      // required: true,
    },
    // supplier: {
    //   type: String,
    //   trim: true,
    // },
    // system: {
    //   type: String,
    //   trim: true,
    // },
    // subsystem: {
    //   type: String,
    //   trim: true,
    // },
    // group: {
    //   type: String,
    //   trim: true,
    // },
    // subgroup: {
    //   type: String,
    //   trim: true,
    // },
    open: {
      type: Number,
      trim: true,
      default: 0,
    },
    available: {
      type: Number,
      trim: true,
      default: 0,
    },
    expected: {
      type: Number,
      trim: true,
      default: 0,
    },
    reserve: {
      type: Number,
      trim: true,
      default: 0,
    },
    free_inventory: {
      type: Number,
      trim: true,
      default: 0,
    },
    // msq: {
    //   type: Number,
    //   trim: true,
    //   default: 0,
    // },
    total_ordered: {
      type: Number,
      trim: true,
      default: 0,
    },
    total_received: {
      type: Number,
      trim: true,
      default: 0,
    },
    total_balance: {
      type: Number,
      trim: true,
      default: 0,
    },
    total_available: {
      type: Number,
      trim: true,
      default: 0,
    },
    avg_price: {
      type: Number,
      default: 0,
      trim: true,
    },
    value_purchased: {
      type: Number,
      default: 0,
      trim: true,
    },
    active: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
  }
);

const Loose_Stock_model = mongoose.model(
  "Loose_Stock_model",
  loose_stock_schema
);

module.exports = Loose_Stock_model;
