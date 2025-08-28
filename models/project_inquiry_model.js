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

const RepresentativeSchema = new mongoose.Schema({
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    required: false,
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team",
    required: false,
  },
  positionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Position",
    required: false,
  },
  userIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
});

const quotationDocuments = new mongoose.Schema({
  name: String,
  path: String,
  mimetype: String,
  size: Number,
});

const quotationSubmission = new mongoose.Schema({
  quotationNumber: String,
  editedQuotationNumber: String,
  date: Date,
  remark: String,
  price: Number,
  documents: [quotationDocuments],
});

const project_inquiry_schema = new mongoose.Schema(
  {
    client_name: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    contacts: [
      {
        salutation: String,
        name: String,
        title: String,
        department: String,
        landline: String,
        mobile: String,
        email: String,
      },
    ],

    inquiry_number: {
      type: String,
      trim: true,
      required: true,
    },

    project_name: {
      type: String,
      trim: true,
      required: true,
    },
    inquiryType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InquiryType",
      required: true,
    },
    edited_inquiry_number: {
      type: String,
      required: true,
    },
    // inquiry: {
    //   type: String,
    //   required: true
    // },
    client_confirmation_number: {
      type: String,
      trim: true,
      required: true,
    },

    quotation_submission_date: {
      type: Date,
      required: true,
    },
    date: {
      type: Date,
      // required: true
    },
    country: {
      label: { type: String, required: true },
      value: { type: String, required: true },
    },
    state: {
      label: { type: String, required: true },
      value: { type: String, required: true },
    },
    city: {
      label: { type: String, required: true },
      value: { type: String, required: true },
    },
    inquiryCreatedBy: {
      type: mongoose.Types.ObjectId,
      ref: "User_model",
    },

    parts: [parts],
    files: [files],
    quotationSubmissions: [quotationSubmission],

    representative: [RepresentativeSchema],

    estimationStatus: {
      type: String,
      default: "Active",
      enum: ["Active", "In Progress", "Submitted", "Overdue"],
    },

    salesStatus: {
      type: String,
      default: "Send To Client",
      enum: ["Send To Client", "Negotiations", "Signed", "Lost"],
    },

    estimationDepartmentId: {
      type: mongoose.Types.ObjectId,
      ref: "Department",
      // required: true,
    },

    salesDepartmentId: {
      type: mongoose.Types.ObjectId,
      ref: "Department",
      // required: true,
    },

    scope: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Scope_Work",
      },
    ],
    revision: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);
const Project_inquiry_Model = mongoose.model(
  "Project_inquiry_Model",
  project_inquiry_schema
);
module.exports = Project_inquiry_Model;
