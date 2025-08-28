const mongoose = require("mongoose");

const inquiry_parts_schema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
  },
  code_id: {
    type: mongoose.Schema.ObjectId,
  },
  ref_code_id: {
    type: mongoose.Schema.ObjectId,
  },
  category: {
    type: String,
  },
  quantity: {
    type: Number,
  },
  total_weight: {
    type: Number,
  },
  order_type: {
    type: String,
  },

  remarks: {
    type: String,
  },
});

const inquiryFreeFieldSchema = new mongoose.Schema({}, { strict: false });

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

const inquiry_schema = new mongoose.Schema(
  {
    inquiry_ref: {
      type: String,
    },
    supplier_id: {
      type: mongoose.Types.ObjectId,
      required: true,
      trim: true,
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
    status: {
      type: String,
      default: "Active",
    },
    inquiryFor: {
      type: String,
      // enum: ["General Stock Order", "Project Order"],
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
    total_quantity: {
      type: Number,
    },
    total_unit_weight: {
      type: Number,
    },
    total_weight: {
      type: Number,
    },
    form_rev_date: {
      type: String,
    },
    ref_code_rev: {
      type: String,
    },
    parts: [inquiry_parts_schema],
    freeFields: [inquiryFreeFieldSchema],
    files: [fileSchema],
    update_count: {
      type: Number,
      default: 1,
    },
    purchaseOrder_id: {
      type: mongoose.Types.ObjectId,
      ref: "Purchase_Model",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Inquiry_Model = mongoose.model("Inquiry_Model", inquiry_schema);

module.exports = Inquiry_Model;
