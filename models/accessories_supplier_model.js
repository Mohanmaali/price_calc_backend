const mongoose = require("mongoose");

const supplier_schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
    },
    // currency: {
    //   type: String,
    //   required: true,
    //   trim: true,
    // },
    currency_id: {
      type: mongoose.Schema.ObjectId,
      required: true,
    },
    shipping: {
      type: Number,
      required: true,
      trim: true,
    },
    customs: {
      type: Number,
      required: true,
      trim: true,
    },
    vat: {
      type: Number,
      required: true,
      trim: true,
    },
    finance: {
      type: Number,
      required: true,
      trim: true,
    },
    royality: {
      type: Number,
      required: true,
      trim: true,
    },
    company_name: {
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
      type: String,
      trim: true,
    },
    company_state: {
      type: String,
      trim: true,
    },
    company_country: {
      type: String,
      trim: true,
    },
    company_zip: {
      type: String,
      trim: true,
    },
    trn_no: {
      type: String,
      trim: true,
    },
    trn_exp_date: {
      type: Date,
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
    trade_lic_exp_date: {
      type: Date,
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
    auth_exp_date: {
      type: Date,
      trim: true,
    },
    auth_file: {
      type: String,
      trim: true,
    },
    remark: {
      type: String,
      trim: true,
    },
    scope: [
      {
        group_id: mongoose.Schema.ObjectId,
        subgroup: [
          {
            subgroup_id: mongoose.Schema.ObjectId,
            material: [
              {
                material_id: mongoose.Schema.ObjectId,
                grade: [
                  {
                    grade_id: mongoose.Schema.ObjectId,
                  },
                ],
                finish: [
                  {
                    finish_id: mongoose.Schema.ObjectId,
                    color: [
                      {
                        color_id: mongoose.Schema.ObjectId,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
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
    // material: [
    //   {
    //     name: {
    //       type: String,
    //       trim: true,
    //     },
    //     grade: [
    //       {
    //         name: {
    //           type: String,
    //           trim: true,
    //         },
    //       },
    //     ],
    //     color: [
    //       {
    //         name: {
    //           type: String,
    //           trim: true,
    //         },
    //       },
    //     ],
    //     finish: [
    //       {
    //         name: {
    //           type: String,
    //           trim: true,
    //         },
    //       },
    //     ],
    //   },
    // ],
    // material: [
    //   {
    //     name: {
    //       type: String,
    //       trim: true,
    //     },
    //   },
    // ],
    // grade: [
    //   {
    //     name: {
    //       type: String,
    //       trim: true,
    //     },
    //   },
    // ],
    // color: [
    //   {
    //     name: {
    //       type: String,
    //       trim: true,
    //     },
    //   },
    // ],
    // finish: [
    //   {
    //     name: {
    //       type: String,
    //       trim: true,
    //     },
    //   },
    // ],
    // overhead: {
    //   type: Number,
    //   required: true,
    //   trim: true,
    // },
    profit: {
      type: Number,
      // required: true,
      trim: true,
    },
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

const Accessories_Supplier_Model = mongoose.model(
  "Accessories_Supplier_Model",
  supplier_schema
);

module.exports = Accessories_Supplier_Model;
