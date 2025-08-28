const mongoose = require("mongoose");

const parts = mongoose.Schema({
  code_id: {
    type: mongoose.Schema.ObjectId,
    trim: true,
  },
  ref_code_id: {
    type: mongoose.Schema.ObjectId,
    trim: true,
  },
  required: {
    type: Number,
  },
  available: {
    type: Number,
  },
  balance: {
    type: Number,
  },
  issued: {
    type: Number,
    default: 0,
  },
  category: {
    type: String,
    trim: true,
  },
  order_type: {
    type: String,
  },
  type: {
    type: String,
    trim: true,
  },
  eta: {
    type: String,
  },
  // unit: {
  //   type: String,
  //   trim: true,
  // },
  // description: {
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
  // sub_group: {
  //   type: String,
  //   trim: true,
  // },
  unit_price: {
    type: Number,
    trim: true,
  },
  total_price: {
    type: Number,
    trim: true,
  },
  scope: {
    type: String,
  },
});
const payments = mongoose.Schema({
  per: {
    type: Number,

    min: 0,
    max: 100,
  },
  val: {
    type: Number,

    min: 0,
  },
  description: {
    type: String,
    trim: true,
  },
});

const backCharges = mongoose.Schema({
  description: {
    type: String,
  },
  val: {
    type: Number,
    min: 0,
  },
});

const files = mongoose.Schema({
  name: {
    type: String,
    trim: true,
  },
  path: {
    type: String,
    trim: true,
  },
  date: {
    type: Date,
    trim: true,
  },
  revision: {
    type: Number,
  },
  type: {
    type: String,
  },
});
const project_schema = new mongoose.Schema(
  {
    client_name: {
      type: String,

      trim: true,
    },
    project_number: {
      type: String,
      trim: true,
    },
    number: {
      type: String,

      trim: true,
    },
    project_name: {
      type: String,

      trim: true,
    },
    country: {
      type: String,

      trim: true,
    },
    city: {
      type: String,

      trim: true,
    },
    client_project_number: {
      type: String,
      trim: true,
    },
    client_confirmation_number: {
      type: String,
      trim: true,
    },
    client_confirmation: {
      type: String,
      trim: true,
    },
    client_quotation_number: {
      type: String,
      trim: true,
    },
    quotation_number: {
      type: String,
      trim: true,
    },
    contract_value: {
      type: String,
      trim: true,
    },
    project_confirmationDate: {
      type: Date,
      default: Date.now(),
      trim: true,
    },
    project_completionDate: {
      type: Date,
      default: Date.now(),
      trim: true,
    },

    retention_per: {
      type: Number,

      max: 100,
      min: 0,
    },
    retention_val: {
      type: Number,

      min: 0,
    },
    retention_description: {
      type: String,
      trim: true,
    },

    advanced_per: {
      type: Number,

      max: 100,
      min: 0,
    },
    advanced_val: {
      type: Number,

      min: 0,
    },
    advanced_description: {
      type: String,
      trim: true,
    },
    recovery_per: {
      type: Number,

      max: 100,
      min: 0,
    },
    recovery_val: {
      type: Number,

      min: 0,
    },
    recovery_description: {
      type: String,
      trim: true,
    },
    payments: [payments],

    total_per: {
      type: Number,

      max: 100,
      min: 0,
    },

    total_val: {
      type: Number,

      min: 0,
    },

    commision_per: {
      type: Number,
      max: 100,
      min: 0,
    },

    commision_val: {
      type: Number,

      min: 0,
    },

    backCharges: [backCharges],

    finalTotal: {
      type: Number,
    },

    materialSupply: {
      type: String,
      trim: true,
    },
    packing: {
      type: String,
      trim: true,
    },
    serial_number: {
      type: Number,
      default: 0,
    },
    transportation: {
      type: String,
      trim: true,
    },
    installation: {
      type: String,
      trim: true,
    },
    coating_required: {
      type: String,
      trim: true,
    },
    coating_type: {
      type: String,
      trim: true,
    },
    coating_supplier: {
      type: String,
      trim: true,
    },
    coating_product_desc: {
      type: String,
      trim: true,
    },
    fabrication: {
      type: String,
      trim: true,
    },
    glass: {
      type: String,
      trim: true,
    },
    files: [files],
    parts: [parts],
    project_status: {
      type: String,
      default: "Active",
    },

    scope: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Scope_Work",
      },
    ],
  },
  {
    timestamps: true,
  }
);
const Project_Model = mongoose.model("Project_Model", project_schema);
module.exports = Project_Model;
