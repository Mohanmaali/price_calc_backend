const mongoose = require("mongoose");

const client_schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    logofile: {
      type: String,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
    },
    currency_id: {
      type: mongoose.Types.ObjectId,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    clientTypeId:{
      type: mongoose.Types.ObjectId,
      ref:"Client_Type",
      // required: true,
      trim: true,
    },
    companyName:{
      type: String,
      trim: true,
    },
    company_landline: {
      type: String,
      trim: true,
    },
    company_email: {
      type: String,
      trim: true,
    },
    company_address: {
      type: String,
      trim: true,
    },
    company_city: {
      label: { type: String },
      value: { type: String },
    },
    company_state:{
      label: { type: String },
      value: { type: String},
    },
    company_country: {
      label: { type: String},
      value: { type: String },
    },
    
    company_zip: {
      type: String,
      trim: true,
    },
    trn_no: {
      type: String,
      trim: true,
    },
    trn_address: {
      type: String,
      trim: true,
    },

    trn_country: {
      label: { type: String },
      value: { type: String },
    },
    trn_state: {
      label: { type: String },
      value: { type: String  },
    },
    trn_city: {
      label: { type: String },
      value: { type: String},
    },
    // trn_city: {
    //   type: String,
    //   trim: true,
    // },
    // trn_state: {
    //   type: String,
    //   trim: true,
    // },
    // trn_country: {
    //   type: String,
    //   trim: true,
    // },
    trn_zip: {
      type: String,
      trim: true,
    },
    trn_file: {
      type: String,
      trim: true,
    },
    trade_lic_no: {
      type: String,
      trim: true,
    },
    trade_lic_file: {
      type: String,
      trim: true,
    },
    auth_poa: {
      type: String,
      trim: true,
    },
    auth_no: {
      type: String,
      trim: true,
    },
    auth_file: {
      type: String,
      trim: true,
    },
    auth_idfile: {
      type: String,
      trim: true,
    },
    remark: {
      type: String,
      trim: true,
    },
    contacts: [
      {
        salutation: {
          type: String,
          trim: true,
        },
        name: {
          type: String,
          trim: true,
        },
        lastName: {
          type: String,
          trim: true,
        },
        title: {
          type: String,
          trim: true,
        },
        department: {
          type: String,
          trim: true,
        },
        landline: {
          type: String,
          trim: true,
        },
        mobile: {
          type: String,
          trim: true,
        },
        email: {
          type: String,
          trim: true,
        },
      },
    ],
    // overhead: {
    //   type: Number,
    //   required: true,
    //   trim: true,
    // },
    // profit: {
    //   type: Number,
    //   required: true,
    //   trim: true,
    // },
    // price_list_1: {
    //   type: Number,
    //   required: true,
    //   trim: true,
    // },
    // price_list_2: {
    //   type: Number,
    //   required: true,
    //   trim: true,
    // },
    // price_list_3: {
    //   type: Number,
    //   required: true,
    //   trim: true,
    // },
    // price_list_4: {
    //   type: Number,
    //   required: true,
    //   trim: true,
    // },
  },
  {
    timestamps: true,
  }
);

const Client = mongoose.model("Client", client_schema);

module.exports = Client;
