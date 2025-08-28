const mongoose = require("mongoose");

const organizationSchema = new mongoose.Schema(
  {
    org_name: {
      type: String,
      trim: true,
    },
    org_logo: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    tax_number: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Organization = mongoose.model("Organization", organizationSchema);

module.exports = Organization;
