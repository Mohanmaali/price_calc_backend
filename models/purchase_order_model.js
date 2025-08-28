const mongoose = require("mongoose");

const history_schema = new mongoose.Schema({
  received: {
    type: Number,
    required: true,
    trim: true,
  },
  balance: {
    type: Number,
    required: true,
    trim: true,
  },
  eta: {
    type: Date,
    // required: true,
    trim: true,
  },
  image: {
    type: String,
    // required: false,
    trim: true,
  },
});

const History_model = mongoose.model("History_model", history_schema);

const parts = mongoose.Schema({
  order_type: {
    type: String,
    trim: true,
    default: "Package",
  },
  code_id: {
    type: mongoose.Schema.ObjectId,
  },
  ref_code_id: {
    type: mongoose.Schema.ObjectId,
  },
  // cost: {
  //   type: Number,
  //   required: true,
  //   trim: true,
  // },
  // ordered: {
  //   type: Number,
  //   required: true,
  //   trim: true,
  // },
  // category: {
  //   type: String,
  // },
  eta: {
    type: Date,
    trim: true,
  },
  quantity: {
    type: Number,
  },
  total_weight: {
    type: Number,
  },
  type: {
    type: String,
    trim: true,
  },
  unit_price: {
    type: Number,
  },
  total_price: {
    type: Number,
  },
  delivery_point: {
    type: String,
  },
  remarks: {
    type: String,
  },
  history: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "History_model",
    },
  ],
});

const payments = mongoose.Schema({
  title: {
    type: String,
    trim: true,
  },
  val: {
    type: Number,
    trim: true,
  },
  amount: {
    type: Number,
    trim: true,
  },
  paydate: {
    type: Date,
    trim: true,
  },
});

const fileSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
  },
  path: {
    type: String,
    trim: true,
  },
}, { _id: false });

const freeFieldSchema = new mongoose.Schema({
  code: {
    type: String
  },
  quantity: {
    type: Number,
  },
  total_weight: {
    type: Number,
  },
  unit_price: {
    type: Number,
  },
  total_price: {
    type: Number,
  },
  delivery_point: {
    type: String,
  },
  remarks: {
    type: String,
  },
  history: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "History_model",
    },
  ],
}, { strict: false });

const purchase_schema = new mongoose.Schema(
  {
    // lpo: {
    //   type: String,
    //   required: true,
    //   trim: true,
    // },
    purchase_order_num: {
      type: String,
    },
    supplier_id: {
      type: mongoose.Types.ObjectId,
      required: true,
      trim: true,
    },
    inquiry_ref: {
      type: String,
    },
    supplier_contact: [
      {
        department: {
          type: String,
        },
        email: {
          type: String,
        },

        landline: {
          type: String,
        },

        mobile: {
          type: String,
        },

        name: {
          type: String,
        },
      },
    ],

    project: [
      {
        id: {
          type: mongoose.Types.ObjectId,
        }
      }
    ],
    organization: {
      org_logo: {
        type: String,
      },
      org_name: {
        type: String,
      },
      address: {
        type: String,
      },
      tax_number: {
        type: String,
      },
      email: {
        type: String,
      },
      website: {
        type: String,
      },
    },
    supplier_date: {
      type: String,
    },
    remark: {
      type: String,
    },
    revision: {
      type: Number,
      default: 1,
    },
    quantity_total: {
      type: Number,
    },
    totalWeight_total: {
      type: Number,
    },
    totalPrice_total: {
      type: Number,
    },
    form_rev_date: {
      type: String,
    },
    ref_code_rev: {
      type: String,
    },
    status: {
      type: String,
      trim: true,
      default: "Active",
    },
    purchaseFor: {
      type: String,
      // enum: ["General Stock Order", "Project Order"],
    },
    parts: [parts],
    payments: [payments],
    freeFields: [freeFieldSchema],
    files: [fileSchema],
    supplier_qtn_ref: {
      type: String,
    },
    supplier_trn: {
      type: String,
    },
    vat: {
      type: Number,
    },
    percentage_of_vat: {
      type: Number,
    },
    grandTotal: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);
const Purchase_Model = mongoose.model("Purchase_Model", purchase_schema);

module.exports = { Purchase_Model, History_model };
