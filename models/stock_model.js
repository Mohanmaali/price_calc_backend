const mongoose = require("mongoose");

const stock_schema = new mongoose.Schema(
  {
    packing_code: {
      type: String,
      required: true,
      trim: true,
    },
    packing_description: {
      type: String,
      trim: true,
    },
    packing_unit: {
      type: String,
      required: true,
    },
    packing_quantity: {
      type: Number,
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
    packing_total_cost: {
      type: Number,
      trim: true,
    },
    // unit: {
    //   type: String,
    //   trim: true,
    // },
    // reference_code: {
    //   type: String,
    //   trim: true,
    //   required: true,
    // },
    reference_code_id: {
      type: mongoose.Schema.Types.ObjectId,
      trim: true,
      required: true,
    },
    // image: {
    //   type: String,
    //   trim: true,
    // },
    // description: {
    //   type: String,
    //   trim: true,
    // },
    // category: {
    //   type: String,
    //   trim: true,
    //   required: true,
    // },
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
    category: {
      type: String,
      trim: true,
    },
    open: {
      type: Number,
      trim: true,
      default: 0,
    },
    msq: {
      type: Number,
      required: true,
      trim: true,
      default: 1,
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
    origin_cost: {
      type: Number,
      default: 0,
    },
    landing_cost: {
      type: Number,
      trim: true,
    },
    selling_price: {
      type: Number,
      trim: true,
    },
    priceList1: {
      type: Number,
    },
    priceList2: {
      type: Number,
    },
    priceList3: {
      type: Number,
    },
    priceList4: {
      type: Number,
    },
    location: {
      type: String,
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

const Stock_model = mongoose.model("Stock_model", stock_schema);

module.exports = Stock_model;
