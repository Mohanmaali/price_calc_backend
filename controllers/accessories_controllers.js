const Accessories_Input_Model = require("../models/accessories_input_model");
const Accessories_Supplier_Model = require("../models/accessories_supplier_model");
const Currency_model = require("../models/currency_model");
const AccessoriesCalculator = require("../models/accessories_calculator_model");
const Stock_model = require("../models/stock_model");
const xlsx = require("xlsx");
const fs = require("fs");
const Profile_System_Model = require("../models/profile_system_model");
const Profile_Input_Model = require("../models/profile_input_model");
const {
  Profile_Insulated_Input,
} = require("../models/profile_insulated_input");
const Kit_Input = require("../models/kit_model");
const Packaging_Material = require("../models/packaging_material_model");
const Loose_Stock_model = require("../models/loose_stock_model");
const Project_Model = require("../models/project_model");
const Action_model = require("../models/actions_model");
const Group_Subgroup = require("../models/group_subgroup");
const Units = require("../models/units");
const { Purchase_Model } = require("../models/purchase_order_model");
const { default: mongoose } = require("mongoose");
const Notification_model = require("../models/notification_model");
const Log_Model = require("../models/log");
const Materials = require("../models/material");
const Finish = require("../models/finish");

// Supplier_controllers
const add_supplier = async (req, res) => {
  try {
    const supplier_form = JSON.parse(req.body.supplier_form);
    const { name, code } = supplier_form;
    const shipping = parseFloat(supplier_form.shipping);
    const customs = parseFloat(supplier_form.customs);
    const vat = parseFloat(supplier_form.vat);
    const finance = parseFloat(supplier_form.finance);
    const royality = parseFloat(supplier_form.royality);
    const profit = parseFloat(supplier_form.profit);
    const company_contacts = JSON.parse(req.body.company_contact);
    const contacts = JSON.parse(req.body.contacts);
    const trn = JSON.parse(req.body.trn);
    const trade = JSON.parse(req.body.trade);
    const auth_sign = JSON.parse(req.body.auth_sign);
    const scope = JSON.parse(req.body.scope);
    // const material = JSON.parse(req.body.material);
    // const grade = JSON.parse(req.body.grade);
    // const color = JSON.parse(req.body.color);
    // const finish = JSON.parse(req.body.finish);
    const { remark, selectedCurrency } = req.body;
    const trn_file =
      req.files != {} && req.files.trn_file !== undefined
        ? `${process.env.BACKENDURL}/uploads/${req.files.trn_file[0].filename}`
        : trn.file;
    const trade_file =
      req.files != {} && req.files.trade_file !== undefined
        ? `${process.env.BACKENDURL}/uploads/${req.files.trade_file[0].filename}`
        : trade.file;
    const auth_file =
      req.files != {} && req.files.auth_file !== undefined
        ? `${process.env.BACKENDURL}/uploads/${req.files.auth_file[0].filename}`
        : auth_sign.file;
    // const filename = req.file
    //   ? `${process.env.BACKENDURL}/uploads/${req.file.filename}`
    //   : req.body.photo;
    // if (
    //   !supplier ||
    //   !code ||
    //   !selectedCurrency ||
    //   shipping === null ||
    //   isNaN(shipping) ||
    //   customs === null ||
    //   isNaN(customs) ||
    //   vat === null ||
    //   isNaN(vat) ||
    //   finance === null ||
    //   isNaN(finance) ||
    //   royality === null ||
    //   isNaN(royality)
    // ) {
    //   return res.status(400).json({ mssg: "All Entries Are Required" });
    // }

    // return;
    const id = req.params.id;
    const new_supplier = await Accessories_Supplier_Model.create({
      name,
      code,
      shipping,
      currency_id: selectedCurrency,
      customs,
      vat,
      finance,
      royality,
      profit,
      // material,
      // grade,
      // color,
      // finish,
      scope,
      company_name: company_contacts.company_name,
      company_landline: company_contacts.landline,
      company_email: company_contacts.email,
      company_address: company_contacts.address,
      company_city: company_contacts.city,
      company_state: company_contacts.state,
      company_country: company_contacts.country,
      company_zip: company_contacts.zip,
      trn_no: trn.number,
      trn_exp_date: trn.expiry_date,
      trn_file: trn_file,
      trade_lic_no: trade.number,
      trade_lic_exp_date: trade.expiry_date,
      trade_lic_file: trade_file,
      auth_poa: auth_sign.poa,
      auth_no: auth_sign.number,
      auth_exp_date: auth_sign.expiry_date,
      auth_file: auth_file,
      remark: remark,
      contacts: contacts,
    });
    return res.status(200).json({ mssg: "New Supplier Added" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ mssg: error?.message || "Internal server error" });
  }
};
const get_all_suppliers = async (req, res) => {
  try {
    let { search } = req.query;
    search = search ? search : "";
    let searchRegex = { $regex: new RegExp(".*" + search + ".*", "i") };
    let where = {
      $or: [
        { name: searchRegex },
        { code: searchRegex },
        { currency: searchRegex },
      ],
      $and: [{}],
    };
    const suppliers = await Accessories_Supplier_Model.aggregate([
      {
        $match: where,
      },
      {
        $unwind: {
          path: "$scope",
        },
      },
      {
        $lookup: {
          from: "currency_models",
          localField: "currency_id",
          foreignField: "_id",
          as: "currencyDetails",
        },
      },
      {
        $lookup: {
          from: "group_subgroups",
          localField: "scope.group_id",
          foreignField: "_id",
          as: "groupDetails",
        },
      },
      {
        $lookup: {
          from: "materials",
          localField: "scope.subgroup.material.material_id",
          foreignField: "_id",
          as: "materialDetails",
        },
      },
      {
        $lookup: {
          from: "finishes",
          localField: "scope.subgroup.material.finish.finish_id",
          foreignField: "_id",
          as: "finishDetails",
        },
      },
      {
        $group: {
          _id: "$_id",
          name: { $first: "$name" },
          scope: { $addToSet: "$scope" },
          code: { $first: "$code" },
          currency_id: { $first: "$currency_id" },
          currencyDetails: { $first: "$currencyDetails" },
          shipping: { $first: "$shipping" },
          customs: { $first: "$customs" },
          vat: { $first: "$vat" },
          finance: { $first: "$finance" },
          royality: { $first: "$royality" },
          company_name: { $first: "$company_name" },
          company_landline: { $first: "$company_landline" },
          company_email: { $first: "$company_email" },
          company_address: { $first: "$company_address" },
          company_city: { $first: "$company_city" },
          company_state: { $first: "$company_state" },
          company_country: { $first: "$company_country" },
          company_zip: { $first: "$company_zip" },
          trn_no: { $first: "$trn_no" },
          trn_exp_date: { $first: "$trn_exp_date" },
          trn_file: { $first: "$trn_file" },
          trade_lic_no: { $first: "$trade_lic_no" },
          trade_lic_exp_date: { $first: "$trade_lic_exp_date" },
          trade_lic_file: { $first: "$trade_lic_file" },
          auth_poa: { $first: "$auth_poa" },
          auth_no: { $first: "$auth_no" },
          auth_exp_date: { $first: "$auth_exp_date" },
          auth_file: { $first: "$auth_file" },
          remark: { $first: "$remark" },
          contacts: { $first: "$contacts" },
          profit: { $first: "$profit" },
          groupDetails: { $addToSet: "$groupDetails" },
          materialDetails: { $addToSet: "$materialDetails" },
          finishDetails: { $addToSet: "$finishDetails" },
        },
      },
      {
        $project: {
          name: 1,
          code: 1,
          currency_id: 1,
          currencyDetails: 1,
          shipping: 1,
          customs: 1,
          vat: 1,
          finance: 1,
          royality: 1,
          company_name: 1,
          company_landline: 1,
          company_email: 1,
          company_address: 1,
          company_city: 1,
          company_state: 1,
          company_country: 1,
          company_zip: 1,
          trn_no: 1,
          trn_exp_date: 1,
          trn_file: 1,
          trade_lic_no: 1,
          trade_lic_exp_date: 1,
          trade_lic_file: 1,
          auth_poa: 1,
          auth_no: 1,
          auth_exp_date: 1,
          auth_file: 1,
          remark: 1,
          scope: 1,
          contacts: 1,
          profit: 1,
          groupDetails: {
            $reduce: {
              input: "$groupDetails",
              initialValue: [],
              in: { $concatArrays: ["$$value", "$$this"] },
            },
          },
          materialDetails: {
            $reduce: {
              input: "$materialDetails",
              initialValue: [],
              in: { $concatArrays: ["$$value", "$$this"] },
            },
          },
          finishDetails: {
            $reduce: {
              input: "$finishDetails",
              initialValue: [],
              in: { $concatArrays: ["$$value", "$$this"] },
            },
          },
        },
      },
      {
        $unwind: {
          path: "$scope",
        },
      },

      {
        $addFields: {
          scopeDetail: {
            name: {
              $let: {
                vars: {
                  matchedGroup: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$groupDetails",
                          as: "gDt",
                          cond: {
                            $eq: ["$$gDt._id", "$scope.group_id"],
                          },
                        },
                      },
                      0,
                    ],
                  },
                },
                in: {
                  $ifNull: ["$$matchedGroup.name", ""],
                }, // Extract only 'name'
              },
            },
            group_id: "$scope.group_id",
            subgroup: {
              $map: {
                input: "$scope.subgroup",
                as: "subgroup",
                in: {
                  name: {
                    $let: {
                      vars: {
                        matchedSubgroup: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                // input: {
                                //   $arrayElemAt: ["$groupDetails.subgroup", 0],
                                // },
                                input: {
                                  $reduce: {
                                    input: "$groupDetails",
                                    initialValue: [],
                                    in: {
                                      $concatArrays: [
                                        "$$value",
                                        "$$this.subgroup",
                                      ],
                                    },
                                  },
                                },
                                as: "gSub",
                                cond: {
                                  $eq: ["$$gSub._id", "$$subgroup.subgroup_id"],
                                },
                              },
                            },
                            0,
                          ],
                        },
                      },
                      in: {
                        $ifNull: ["$$matchedSubgroup.name", ""],
                      }, // Extract only 'name'
                    },
                  },
                  subgroup_id: "$$subgroup.subgroup_id",
                  material: {
                    $map: {
                      input: "$$subgroup.material",
                      as: "material",
                      in: {
                        name: {
                          $let: {
                            vars: {
                              matchedMaterial: {
                                $arrayElemAt: [
                                  {
                                    $filter: {
                                      input: "$materialDetails",
                                      as: "mat",
                                      cond: {
                                        $eq: [
                                          "$$mat._id",
                                          "$$material.material_id",
                                        ],
                                      },
                                    },
                                  },
                                  0,
                                ],
                              },
                            },
                            in: {
                              $ifNull: ["$$matchedMaterial.name", ""],
                            }, // Extract only 'name'
                          },
                        },
                        material_id: "$$material.material_id",
                        grade: {
                          $map: {
                            input: "$$material.grade",
                            as: "grade",
                            in: {
                              name: {
                                $let: {
                                  vars: {
                                    matchedGrade: {
                                      $arrayElemAt: [
                                        {
                                          $filter: {
                                            // input: {
                                            //   $arrayElemAt: [
                                            //     "$materialDetails.grade",
                                            //     0,
                                            //   ],
                                            // },
                                            input: {
                                              $reduce: {
                                                input: "$materialDetails",
                                                initialValue: [],
                                                in: {
                                                  $concatArrays: [
                                                    "$$value",
                                                    "$$this.grade",
                                                  ],
                                                },
                                              },
                                            },
                                            as: "mGrd",
                                            cond: {
                                              $eq: [
                                                "$$mGrd._id",
                                                "$$grade.grade_id",
                                              ],
                                            },
                                          },
                                        },
                                        0,
                                      ],
                                    },
                                  },
                                  in: {
                                    $ifNull: ["$$matchedGrade.name", ""],
                                  }, // Extract only 'name'
                                },
                              },
                              grade_id: "$$grade.grade_id",
                            },
                          },
                        },
                        finish: {
                          $map: {
                            input: "$$material.finish",
                            as: "finish",
                            in: {
                              name: {
                                $let: {
                                  vars: {
                                    matchedFinish: {
                                      $arrayElemAt: [
                                        {
                                          $filter: {
                                            input: "$finishDetails",
                                            as: "fnsh",
                                            cond: {
                                              $eq: [
                                                "$$fnsh._id",
                                                "$$finish.finish_id",
                                              ],
                                            },
                                          },
                                        },
                                        0,
                                      ],
                                    },
                                  },
                                  in: {
                                    $ifNull: ["$$matchedFinish.name", ""],
                                  }, // Extract only 'name'
                                },
                              },
                              code: {
                                $let: {
                                  vars: {
                                    matchedFinish: {
                                      $arrayElemAt: [
                                        {
                                          $filter: {
                                            input: "$finishDetails",
                                            as: "fnsh",
                                            cond: {
                                              $eq: [
                                                "$$fnsh._id",
                                                "$$finish.finish_id",
                                              ],
                                            },
                                          },
                                        },
                                        0,
                                      ],
                                    },
                                  },
                                  in: {
                                    $ifNull: ["$$matchedFinish.code", ""],
                                  }, // Extract only 'name'
                                },
                              },
                              description: {
                                $let: {
                                  vars: {
                                    matchedFinish: {
                                      $arrayElemAt: [
                                        {
                                          $filter: {
                                            input: "$finishDetails",
                                            as: "fnsh",
                                            cond: {
                                              $eq: [
                                                "$$fnsh._id",
                                                "$$finish.finish_id",
                                              ],
                                            },
                                          },
                                        },
                                        0,
                                      ],
                                    },
                                  },
                                  in: {
                                    $ifNull: [
                                      "$$matchedFinish.description",
                                      "",
                                    ],
                                  }, // Extract only 'name'
                                },
                              },
                              finish_id: "$$finish.finish_id",
                              color: {
                                $map: {
                                  input: "$$finish.color",
                                  as: "color",
                                  in: {
                                    name: {
                                      $let: {
                                        vars: {
                                          matchedColor: {
                                            $arrayElemAt: [
                                              {
                                                $filter: {
                                                  input: {
                                                    $reduce: {
                                                      input: "$finishDetails",
                                                      initialValue: [],
                                                      in: {
                                                        $concatArrays: [
                                                          "$$value",
                                                          "$$this.color",
                                                        ],
                                                      },
                                                    },
                                                  },
                                                  as: "fclr",
                                                  cond: {
                                                    $eq: [
                                                      "$$fclr._id",
                                                      "$$color.color_id",
                                                    ],
                                                  },
                                                },
                                              },
                                              0,
                                            ],
                                          },
                                        },
                                        in: {
                                          $ifNull: ["$$matchedColor.name", ""],
                                        }, // Extract only 'name'
                                      },
                                    },
                                    color_id: "$$color.color_id",
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },

      {
        $group: {
          _id: "$_id",
          scope: { $push: "$scopeDetail" },
          name: { $first: "$name" },
          code: { $first: "$code" },
          currency_id: { $first: "$currency_id" },
          currencyDetails: { $first: "$currencyDetails" },
          shipping: { $first: "$shipping" },
          customs: { $first: "$customs" },
          vat: { $first: "$vat" },
          finance: { $first: "$finance" },
          royality: { $first: "$royality" },
          company_name: { $first: "$company_name" },
          company_landline: { $first: "$company_landline" },
          company_email: { $first: "$company_email" },
          company_address: { $first: "$company_address" },
          company_city: { $first: "$company_city" },
          company_state: { $first: "$company_state" },
          company_country: { $first: "$company_country" },
          company_zip: { $first: "$company_zip" },
          trn_no: { $first: "$trn_no" },
          trn_exp_date: { $first: "$trn_exp_date" },
          trn_file: { $first: "$trn_file" },
          trade_lic_no: { $first: "$trade_lic_no" },
          trade_lic_exp_date: { $first: "$trade_lic_exp_date" },
          trade_lic_file: { $first: "$trade_lic_file" },
          auth_poa: { $first: "$auth_poa" },
          auth_no: { $first: "$auth_no" },
          auth_exp_date: { $first: "$auth_exp_date" },
          auth_file: { $first: "$auth_file" },
          remark: { $first: "$remark" },
          contacts: { $first: "$contacts" },
          profit: { $first: "$profit" },
          groupDetails: { $first: "$groupDetails" },
          materialDetails: { $first: "$materialDetails" },
          finishDetails: { $first: "$finishDetails" },
        },
      },
      {
        $project: {
          name: 1,
          code: 1,
          currency_id: 1,
          currencyDetails: 1,
          shipping: 1,
          customs: 1,
          vat: 1,
          finance: 1,
          royality: 1,
          company_name: 1,
          company_landline: 1,
          company_email: 1,
          company_address: 1,
          company_city: 1,
          company_state: 1,
          company_country: 1,
          company_zip: 1,
          trn_no: 1,
          trn_exp_date: 1,
          trn_file: 1,
          trade_lic_no: 1,
          trade_lic_exp_date: 1,
          trade_lic_file: 1,
          auth_poa: 1,
          auth_no: 1,
          auth_exp_date: 1,
          auth_file: 1,
          remark: 1,
          scope: 1,
          contacts: 1,
          profit: 1,
        },
      },
      {
        $sort: {
          name: 1,
        },
      },
    ]);
    return res.status(200).json(suppliers);
  } catch (error) {
    console.log(error);
    res.status(500).json({ mssg: error?.message || "Internal server error" });
  }
};
const get_single_supplier = async (req, res) => {
  try {
    const id = req.params.id;
    let supplier = await Accessories_Supplier_Model.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
        },
      },
      {
        $unwind: {
          path: "$scope",
        },
      },
      {
        $lookup: {
          from: "currency_models",
          localField: "currency_id",
          foreignField: "_id",
          as: "currencyDetails",
        },
      },
      {
        $lookup: {
          from: "group_subgroups",
          localField: "scope.group_id",
          foreignField: "_id",
          as: "groupDetails",
        },
      },
      {
        $lookup: {
          from: "materials",
          localField: "scope.subgroup.material.material_id",
          foreignField: "_id",
          as: "materialDetails",
        },
      },
      {
        $lookup: {
          from: "finishes",
          localField: "scope.subgroup.material.finish.finish_id",
          foreignField: "_id",
          as: "finishDetails",
        },
      },
      {
        $group: {
          _id: "$_id",
          name: { $first: "$name" },
          scope: { $addToSet: "$scope" },
          code: { $first: "$code" },
          currency_id: { $first: "$currency_id" },
          currencyDetails: {
            $first: "$currencyDetails",
          },
          shipping: { $first: "$shipping" },
          customs: { $first: "$customs" },
          vat: { $first: "$vat" },
          finance: { $first: "$finance" },
          royality: { $first: "$royality" },
          company_name: { $first: "$company_name" },
          company_landline: {
            $first: "$company_landline",
          },
          company_email: { $first: "$company_email" },
          company_address: {
            $first: "$company_address",
          },
          company_city: { $first: "$company_city" },
          company_state: { $first: "$company_state" },
          company_country: {
            $first: "$company_country",
          },
          company_zip: { $first: "$company_zip" },
          trn_no: { $first: "$trn_no" },
          trn_exp_date: { $first: "$trn_exp_date" },
          trn_file: { $first: "$trn_file" },
          trade_lic_no: { $first: "$trade_lic_no" },
          trade_lic_exp_date: {
            $first: "$trade_lic_exp_date",
          },
          trade_lic_file: {
            $first: "$trade_lic_file",
          },
          auth_poa: { $first: "$auth_poa" },
          auth_no: { $first: "$auth_no" },
          auth_exp_date: { $first: "$auth_exp_date" },
          auth_file: { $first: "$auth_file" },
          remark: { $first: "$remark" },
          contacts: { $first: "$contacts" },
          profit: { $first: "$profit" },
          groupDetails: {
            $addToSet: "$groupDetails",
          },
          materialDetails: {
            $addToSet: "$materialDetails",
          },
          finishDetails: {
            $addToSet: "$finishDetails",
          },
          createdAt: { $first: "$createdAt" },
          updatedAt: { $first: "$updatedAt" },
        },
      },
      {
        $project: {
          name: 1,
          code: 1,
          currency_id: 1,
          currencyDetails: 1,
          shipping: 1,
          customs: 1,
          vat: 1,
          finance: 1,
          royality: 1,
          company_name: 1,
          company_landline: 1,
          company_email: 1,
          company_address: 1,
          company_city: 1,
          company_state: 1,
          company_country: 1,
          company_zip: 1,
          trn_no: 1,
          trn_exp_date: 1,
          trn_file: 1,
          trade_lic_no: 1,
          trade_lic_exp_date: 1,
          trade_lic_file: 1,
          auth_poa: 1,
          auth_no: 1,
          auth_exp_date: 1,
          auth_file: 1,
          remark: 1,
          scope: 1,
          contacts: 1,
          profit: 1,
          groupDetails: {
            $reduce: {
              input: "$groupDetails",
              initialValue: [],
              in: {
                $concatArrays: ["$$value", "$$this"],
              },
            },
          },
          materialDetails: {
            $reduce: {
              input: "$materialDetails",
              initialValue: [],
              in: {
                $concatArrays: ["$$value", "$$this"],
              },
            },
          },
          finishDetails: {
            $reduce: {
              input: "$finishDetails",
              initialValue: [],
              in: {
                $concatArrays: ["$$value", "$$this"],
              },
            },
          },
          createdAt: 1,
          updatedAt: 1,
        },
      },
      {
        $unwind: {
          path: "$scope",
        },
      },

      {
        $addFields: {
          scopeDetail: {
            name: {
              $let: {
                vars: {
                  matchedGroup: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$groupDetails",
                          as: "gDt",
                          cond: {
                            $eq: ["$$gDt._id", "$scope.group_id"],
                          },
                        },
                      },
                      0,
                    ],
                  },
                },
                in: {
                  $ifNull: ["$$matchedGroup.name", ""],
                }, // Extract only 'name'
              },
            },
            group_id: "$scope.group_id",
            subgroup: {
              $map: {
                input: "$scope.subgroup",
                as: "subgroup",
                in: {
                  name: {
                    $let: {
                      vars: {
                        matchedSubgroup: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                // input: {
                                //   $arrayElemAt: ["$groupDetails.subgroup", 0],
                                // },
                                input: {
                                  $reduce: {
                                    input: "$groupDetails",
                                    initialValue: [],
                                    in: {
                                      $concatArrays: [
                                        "$$value",
                                        "$$this.subgroup",
                                      ],
                                    },
                                  },
                                },
                                as: "gSub",
                                cond: {
                                  $eq: ["$$gSub._id", "$$subgroup.subgroup_id"],
                                },
                              },
                            },
                            0,
                          ],
                        },
                      },
                      in: {
                        $ifNull: ["$$matchedSubgroup.name", ""],
                      }, // Extract only 'name'
                    },
                  },
                  subgroup_id: "$$subgroup.subgroup_id",
                  material: {
                    $map: {
                      input: "$$subgroup.material",
                      as: "material",
                      in: {
                        name: {
                          $let: {
                            vars: {
                              matchedMaterial: {
                                $arrayElemAt: [
                                  {
                                    $filter: {
                                      input: "$materialDetails",
                                      as: "mat",
                                      cond: {
                                        $eq: [
                                          "$$mat._id",
                                          "$$material.material_id",
                                        ],
                                      },
                                    },
                                  },
                                  0,
                                ],
                              },
                            },
                            in: {
                              $ifNull: ["$$matchedMaterial.name", ""],
                            }, // Extract only 'name'
                          },
                        },
                        material_id: "$$material.material_id",
                        grade: {
                          $map: {
                            input: "$$material.grade",
                            as: "grade",
                            in: {
                              name: {
                                $let: {
                                  vars: {
                                    matchedGrade: {
                                      $arrayElemAt: [
                                        {
                                          $filter: {
                                            // input: {
                                            //   $arrayElemAt: [
                                            //     "$materialDetails.grade",
                                            //     0,
                                            //   ],
                                            // },
                                            input: {
                                              $reduce: {
                                                input: "$materialDetails",
                                                initialValue: [],
                                                in: {
                                                  $concatArrays: [
                                                    "$$value",
                                                    "$$this.grade",
                                                  ],
                                                },
                                              },
                                            },
                                            as: "mGrd",
                                            cond: {
                                              $eq: [
                                                "$$mGrd._id",
                                                "$$grade.grade_id",
                                              ],
                                            },
                                          },
                                        },
                                        0,
                                      ],
                                    },
                                  },
                                  in: {
                                    $ifNull: ["$$matchedGrade.name", ""],
                                  }, // Extract only 'name'
                                },
                              },
                              grade_id: "$$grade.grade_id",
                            },
                          },
                        },
                        finish: {
                          $map: {
                            input: "$$material.finish",
                            as: "finish",
                            in: {
                              name: {
                                $let: {
                                  vars: {
                                    matchedFinish: {
                                      $arrayElemAt: [
                                        {
                                          $filter: {
                                            input: "$finishDetails",
                                            as: "fnsh",
                                            cond: {
                                              $eq: [
                                                "$$fnsh._id",
                                                "$$finish.finish_id",
                                              ],
                                            },
                                          },
                                        },
                                        0,
                                      ],
                                    },
                                  },
                                  in: {
                                    $ifNull: ["$$matchedFinish.name", ""],
                                  }, // Extract only 'name'
                                },
                              },
                              finish_id: "$$finish.finish_id",
                              color: {
                                $map: {
                                  input: "$$finish.color",
                                  as: "color",
                                  in: {
                                    name: {
                                      $let: {
                                        vars: {
                                          matchedColor: {
                                            $arrayElemAt: [
                                              {
                                                $filter: {
                                                  // input: {
                                                  //   $arrayElemAt: [
                                                  //     "$finishDetails.color",
                                                  //     1,
                                                  //   ],
                                                  // },
                                                  input: {
                                                    $reduce: {
                                                      input: "$finishDetails",
                                                      initialValue: [],
                                                      in: {
                                                        $concatArrays: [
                                                          "$$value",
                                                          "$$this.color",
                                                        ],
                                                      },
                                                    },
                                                  },
                                                  as: "fclr",
                                                  cond: {
                                                    $eq: [
                                                      "$$fclr._id",
                                                      "$$color.color_id",
                                                    ],
                                                  },
                                                },
                                              },
                                              0,
                                            ],
                                          },
                                        },
                                        in: {
                                          $ifNull: ["$$matchedColor.name", ""],
                                        }, // Extract only 'name'
                                      },
                                    },
                                    color_id: "$$color.color_id",
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },

      {
        $group: {
          _id: "$_id",
          scope: { $push: "$scopeDetail" },
          name: { $first: "$name" },
          code: { $first: "$code" },
          currency_id: { $first: "$currency_id" },
          currencyDetails: {
            $first: "$currencyDetails",
          },
          shipping: { $first: "$shipping" },
          customs: { $first: "$customs" },
          vat: { $first: "$vat" },
          finance: { $first: "$finance" },
          royality: { $first: "$royality" },
          company_name: { $first: "$company_name" },
          company_landline: {
            $first: "$company_landline",
          },
          company_email: { $first: "$company_email" },
          company_address: {
            $first: "$company_address",
          },
          company_city: { $first: "$company_city" },
          company_state: { $first: "$company_state" },
          company_country: {
            $first: "$company_country",
          },
          company_zip: { $first: "$company_zip" },
          trn_no: { $first: "$trn_no" },
          trn_exp_date: { $first: "$trn_exp_date" },
          trn_file: { $first: "$trn_file" },
          trade_lic_no: { $first: "$trade_lic_no" },
          trade_lic_exp_date: {
            $first: "$trade_lic_exp_date",
          },
          trade_lic_file: {
            $first: "$trade_lic_file",
          },
          auth_poa: { $first: "$auth_poa" },
          auth_no: { $first: "$auth_no" },
          auth_exp_date: { $first: "$auth_exp_date" },
          auth_file: { $first: "$auth_file" },
          remark: { $first: "$remark" },
          contacts: { $first: "$contacts" },
          profit: { $first: "$profit" },
          groupDetails: { $first: "$groupDetails" },
          materialDetails: {
            $first: "$materialDetails",
          },
          finishDetails: { $first: "$finishDetails" },
          createdAt: { $first: "$createdAt" },
          updatedAt: { $first: "$updatedAt" },
        },
      },
      {
        $project: {
          name: 1,
          code: 1,
          currency_id: 1,
          currencyDetails: 1,
          shipping: 1,
          customs: 1,
          vat: 1,
          finance: 1,
          royality: 1,
          company_name: 1,
          company_landline: 1,
          company_email: 1,
          company_address: 1,
          company_city: 1,
          company_state: 1,
          company_country: 1,
          company_zip: 1,
          trn_no: 1,
          trn_exp_date: 1,
          trn_file: 1,
          trade_lic_no: 1,
          trade_lic_exp_date: 1,
          trade_lic_file: 1,
          auth_poa: 1,
          auth_no: 1,
          auth_exp_date: 1,
          auth_file: 1,
          remark: 1,
          scope: 1,
          contacts: 1,
          profit: 1,
          groupDetails: 1,
          materialDetails: 1,
          finishDetails: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);
    return res.status(200).json(supplier[0]);
  } catch (error) {
    console.log(error);
    res.status(500).json({ mssg: error?.message || "Internal server error" });
  }
};
const update_supplier = async (req, res) => {
  try {
    // console.log(req.body);
    // console.log(req.files);
    const supplier_form = JSON.parse(req.body.supplier_form);
    const { name, code } = supplier_form;
    const shipping = parseFloat(supplier_form.shipping);
    const customs = parseFloat(supplier_form.customs);
    const vat = parseFloat(supplier_form.vat);
    const finance = parseFloat(supplier_form.finance);
    const royality = parseFloat(supplier_form.royality);
    const profit = parseFloat(supplier_form.profit);
    const company_contacts = JSON.parse(req.body.company_contact);
    const contacts = JSON.parse(req.body.contacts);
    const trn = JSON.parse(req.body.trn);
    const trade = JSON.parse(req.body.trade);
    const auth_sign = JSON.parse(req.body.auth_sign);
    const scope = JSON.parse(req.body.scope);
    // const material = JSON.parse(req.body.material);
    // const grade = JSON.parse(req.body.grade);
    // const color = JSON.parse(req.body.color);
    // const finish = JSON.parse(req.body.finish);
    // console.log(material[0], material[1]);
    // return;
    const { remark, selectedCurrency } = req.body;
    const trn_file =
      req.files != {} && req.files.trn_file !== undefined
        ? `${process.env.BACKENDURL}/uploads/${req.files.trn_file[0].filename}`
        : trn.file;
    const trade_file =
      req.files != {} && req.files.trade_file !== undefined
        ? `${process.env.BACKENDURL}/uploads/${req.files.trade_file[0].filename}`
        : trade.file;
    const auth_file =
      req.files != {} && req.files.auth_file !== undefined
        ? `${process.env.BACKENDURL}/uploads/${req.files.auth_file[0].filename}`
        : auth_sign.file;
    // const filename = req.file
    //   ? `${process.env.BACKENDURL}/uploads/${req.file.filename}`
    //   : req.body.photo;
    // if (
    //   !supplier ||
    //   !code ||
    //   !selectedCurrency ||
    //   shipping === null ||
    //   isNaN(shipping) ||
    //   customs === null ||
    //   isNaN(customs) ||
    //   vat === null ||
    //   isNaN(vat) ||
    //   finance === null ||
    //   isNaN(finance) ||
    //   royality === null ||
    //   isNaN(royality)
    // ) {
    //   return res.status(400).json({ mssg: "All Entries Are Required" });
    // }

    // return;
    const id = req.params.id;
    const updated_supplier = await Accessories_Supplier_Model.findByIdAndUpdate(
      id,
      {
        name,
        code,
        shipping,
        currency_id: selectedCurrency,
        customs,
        vat,
        finance,
        royality,
        profit,
        scope,
        company_name: company_contacts.company_name,
        company_landline: company_contacts.landline,
        company_email: company_contacts.email,
        company_address: company_contacts.address,
        company_city: company_contacts.city,
        company_state: company_contacts.state,
        company_country: company_contacts.country,
        company_zip: company_contacts.zip,
        trn_no: trn.number,
        trn_exp_date: trn.expiry_date,
        trn_file: trn_file,
        trade_lic_no: trade.number,
        trade_lic_exp_date: trade.expiry_date,
        trade_lic_file: trade_file,
        auth_poa: auth_sign.poa,
        auth_no: auth_sign.number,
        auth_exp_date: auth_sign.expiry_date,
        auth_file: auth_file,
        remark: remark,
        contacts: contacts,
        // $set: {
        //   material,
        //   grade,
        //   color,
        //   finish,
        // },
      }
    );
    return res.status(200).json({ mssg: "Supplier Updated" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ mssg: error?.message || "Internal server error" });
  }
};
const delete_supplier = async (req, res) => {
  try {
    const id = req.params.id;
    const deleted_supplier = await Accessories_Supplier_Model.findByIdAndDelete(
      id
    );
    // console.log(cost_usd_per_kg,fluctuation,cost_with_fluctuation)
    return res.status(200).json({ mssg: "Supplier Deleted" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ mssg: error?.message || "Internal server error" });
  }
};
const assigned_suppliers = async (req, res) => {
  try {
    const accessoriesSuppliers = await Accessories_Input_Model.aggregate([
      { $group: { _id: null, supplier_id: { $addToSet: "$supplier_id" } } },
    ]);

    const profileSuppliers = await Profile_Input_Model.aggregate([
      { $group: { _id: null, supplier_id: { $addToSet: "$supplier_id" } } },
    ]);

    const insulatedSuppliers = await Profile_Insulated_Input.aggregate([
      { $group: { _id: null, supplier_id: { $addToSet: "$supplier_id" } } },
    ]);

    // Combine suppliers from all three collections
    const suppliers = [
      ...(accessoriesSuppliers[0]?.supplier || []),
      ...(profileSuppliers[0]?.supplier || []),
      ...(insulatedSuppliers[0]?.supplier || []),
    ];

    return res.status(200).json(suppliers);
  } catch (error) {
    console.log(error);
    res.status(500).json({ mssg: error?.message || "Internal server error" });
  }
};
const supplier_assigned_to = async (req, res) => {
  try {
    const { id } = req.params;
    const pipeline = [
      {
        $match: { supplier_id: new mongoose.Types.ObjectId(id) },
      },
      {
        $project: {
          code: 1, // Project only the 'code' field
        },
      },
    ];
    const accessory_supplier = await Accessories_Input_Model.aggregate(
      pipeline
    );
    const profile_supplier = await Profile_Input_Model.aggregate(pipeline);
    const insultedSuppliers = await Profile_Insulated_Input.aggregate(pipeline);
    const kitSuppliers = await Kit_Input.aggregate(pipeline);

    return res.status(200).json({
      accessory_supplier: accessory_supplier,
      profile_supplier: profile_supplier,
      insulated_supplier: insultedSuppliers,
      kit_supplier: kitSuppliers,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ mssg: error?.message || "Internal server error" });
  }
};
const code_acc_to_supplier = async (req, res) => {
  try {
    const { supplier } = req.params;
    if (supplier == "undefined" || !supplier) {
      return;
    }
    const accessory_supplier = await Accessories_Input_Model.aggregate([
      {
        $match: {
          supplier_id: new mongoose.Types.ObjectId(supplier),
        },
      },
      {
        $unwind: {
          path: "$stock_detail",
        },
      },
      {
        $lookup: {
          from: "stock_models",
          localField: "stock_detail",
          foreignField: "_id",
          as: "stock",
          pipeline: [{ $match: { active: true } }],
        },
      },
      {
        $lookup: {
          from: "accessories_calculators",
          localField: "_id",
          foreignField: "input_model_id",
          as: "pl",
        },
      },
      {
        $addFields: {
          reference_code: "$code",
          ref_code_id: "$stock.reference_code_id",
          free: "$stock.free_inventory",
          msq: "$stock.msq",
          origin_cost: "$pl.oc",
        },
      },
      {
        $lookup: {
          from: "profile_system_models", // Name of the collection for Profile_System_Model
          let: {
            systemField: "$system_id",
            subsystemField: "$subsystem_id",
          },
          pipeline: [
            {
              $unwind: "$system_detail",
            },
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$system_detail._id", "$$systemField"],
                    },
                    {
                      $in: [
                        "$$subsystemField",
                        "$system_detail.subsystems._id",
                      ],
                    },
                  ],
                },
              },
            },
            {
              $addFields: {
                "system_detail.subsystems": {
                  $filter: {
                    input: "$system_detail.subsystems",
                    as: "subsystem",
                    cond: {
                      $eq: ["$$subsystem._id", "$$subsystemField"],
                    },
                  },
                },
              },
            },
          ],
          as: "lookup_system",
        },
      },
      {
        $lookup: {
          from: "group_subgroups",
          localField: "group_id",
          foreignField: "_id",
          as: "lookup_group_subgroup",
        },
      },
      {
        $addFields: {
          lookup_group_subgroup: {
            $map: {
              input: "$lookup_group_subgroup",
              as: "groupDetail",
              in: {
                _id: "$$groupDetail._id",
                name: "$$groupDetail.name",
                subgroup: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$$groupDetail.subgroup",
                        as: "subgroupEntry",
                        cond: {
                          $eq: ["$$subgroupEntry._id", "$subgroup_id"],
                        },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: "accessories_supplier_models",
          localField: "supplier_id",
          foreignField: "_id",
          as: "lookup_supplier",
        },
      },
      {
        $lookup: {
          from: "currency_models",
          localField: "lookup_supplier.currency_id",
          foreignField: "_id",
          as: "lookup_currency",
        },
      },
      {
        $lookup: {
          from: "materials",
          localField: "material_id",
          foreignField: "_id",
          as: "lookup_material",
        },
      },
      {
        $addFields: {
          lookup_material: {
            $map: {
              input: "$lookup_material",
              as: "materialDetail",
              in: {
                _id: "$$materialDetail._id",
                name: "$$materialDetail.name",
                grade: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$$materialDetail.grade",
                        as: "grade",
                        cond: {
                          $eq: ["$$grade._id", "$grade_id"],
                        },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: "finishes",
          localField: "finish_id",
          foreignField: "_id",
          as: "lookup_finish",
        },
      },
      {
        $addFields: {
          lookup_finish: {
            $map: {
              input: "$lookup_finish",
              as: "finishDetail",
              in: {
                _id: "$$finishDetail._id",
                name: "$$finishDetail.name",
                code: "$$finishDetail.code",
                description: "$$finishDetail.description",
                color: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$$finishDetail.color",
                        as: "color",
                        cond: {
                          $eq: ["$$color._id", "$color_id"],
                        },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          code: 1,
          image: 1,
          description: 1,
          system_id: 1,
          system: {
            $arrayElemAt: ["$lookup_system.system_detail.name", 0],
          },
          subsystem_id: 1,
          subsystem: {
            $arrayElemAt: [
              {
                $map: {
                  input: {
                    $arrayElemAt: [
                      "$lookup_system.system_detail.subsystems",
                      0,
                    ],
                  },
                  as: "subsystem",
                  in: "$$subsystem.name",
                },
              },
              0,
            ],
          },
          group: {
            $arrayElemAt: ["$lookup_group_subgroup.name", 0],
          },
          group_id: 1,
          subgroup_id: 1,
          subgroup: {
            $arrayElemAt: ["$lookup_group_subgroup.subgroup.name", 0],
          },
          supplier_id: 1,
          supplier: {
            $arrayElemAt: ["$lookup_supplier.name", 0],
          },
          supplier_code: {
            $arrayElemAt: ["$lookup_supplier.code", 0],
          },
          supplier_item_code: 1,
          rd: 1,
          material_id: 1,
          material: {
            $arrayElemAt: ["$lookup_material.name", 0],
          },
          grade_id: 1,
          grade: {
            $arrayElemAt: ["$lookup_material.grade.name", 0],
          },
          finish_id: 1,
          finish: {
            $arrayElemAt: ["$lookup_finish.name", 0],
          },
          color_id: 1,
          color: {
            $arrayElemAt: ["$lookup_finish.color.name", 0],
          },
          unit_weight: 1,
          weight_unit: 1,
          unit_system: 1,
          unit_description: 1,
          unit: 1,
          cost: 1,
          currency_id: {
            $arrayElemAt: ["$lookup_supplier.currency_id", 0],
          },
          currency: {
            $arrayElemAt: ["$lookup_currency.code", 0],
          },
          cost_to_aed: 1,
          additional_profit: 1,
          code: {
            $arrayElemAt: ["$stock.packing_code", 0],
          },
          code_id: {
            $arrayElemAt: ["$stock._id", 0],
          },
          reference_code: 1,
          ref_code_id: {
            $arrayElemAt: ["$ref_code_id", 0],
          },
          origin_cost: {
            $arrayElemAt: ["$origin_cost", 0],
          },
          free: { $arrayElemAt: ["$free", 0] },
          msq: { $arrayElemAt: ["$msq", 0] },
          description: 1,
          stock: { $arrayElemAt: ["$stock", 0] },
          category: "Accessory",
          order_type: "Package",
        },
      },
    ]);
    const non_ins_supplier = await Profile_Input_Model.aggregate([
      {
        $match: {
          supplier_id: new mongoose.Types.ObjectId(supplier),
        },
      },
      {
        $unwind: {
          path: "$stock_detail",
        },
      },
      {
        $lookup: {
          from: "stock_models",
          localField: "stock_detail",
          foreignField: "_id",
          as: "stock",
          pipeline: [{ $match: { active: true } }],
        },
      },
      {
        $lookup: {
          from: "profile_calculators",
          localField: "_id",
          foreignField: "input_model_id",
          as: "pl",
        },
      },
      {
        $addFields: {
          reference_code: "$code",
          ref_code_id: "$stock.reference_code_id",
          free: "$stock.free_inventory",
          msq: "$stock.msq",
          origin_cost: "$pl.origin_cost",
        },
      },
      {
        $lookup: {
          from: "profile_system_models", // Name of the collection for Profile_System_Model
          let: {
            systemField: "$system_id",
            subsystemField: "$subsystem_id",
          },
          pipeline: [
            {
              $unwind: "$system_detail",
            },
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$system_detail._id", "$$systemField"],
                    },
                    {
                      $in: [
                        "$$subsystemField",
                        "$system_detail.subsystems._id",
                      ],
                    },
                  ],
                },
              },
            },
            {
              $addFields: {
                "system_detail.subsystems": {
                  $filter: {
                    input: "$system_detail.subsystems",
                    as: "subsystem",
                    cond: {
                      $eq: ["$$subsystem._id", "$$subsystemField"],
                    },
                  },
                },
              },
            },
          ],
          as: "lookup_system",
        },
      },
      {
        $lookup: {
          from: "group_subgroups",
          localField: "group_id",
          foreignField: "_id",
          as: "lookup_group_subgroup",
        },
      },
      {
        $addFields: {
          lookup_group_subgroup: {
            $map: {
              input: "$lookup_group_subgroup",
              as: "groupDetail",
              in: {
                _id: "$$groupDetail._id",
                name: "$$groupDetail.name",
                subgroup: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$$groupDetail.subgroup",
                        as: "subgroupEntry",
                        cond: {
                          $eq: ["$$subgroupEntry._id", "$subgroup_id"],
                        },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: "accessories_supplier_models",
          localField: "supplier_id",
          foreignField: "_id",
          as: "lookup_supplier",
        },
      },
      {
        $lookup: {
          from: "currency_models",
          localField: "currency_id",
          foreignField: "_id",
          as: "lookup_currency",
        },
      },
      {
        $lookup: {
          from: "raw_material_models",
          localField: "material_id",
          foreignField: "_id",
          as: "lookup_raw_material",
        },
      },
      {
        $addFields: {
          lookup_raw_material: {
            $map: {
              input: "$lookup_raw_material",
              as: "materialDetail",
              in: {
                _id: "$$materialDetail._id",
                name: "$$materialDetail.name",
                alloy: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$$materialDetail.alloy",
                        as: "alloy",
                        cond: {
                          $eq: ["$$alloy._id", "$alloy_id"],
                        },
                      },
                    },
                    0,
                  ],
                },
                temper: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$$materialDetail.temper",
                        as: "temper",
                        cond: {
                          $eq: ["$$temper._id", "$temper_id"],
                        },
                      },
                    },
                    0,
                  ],
                },
                grade: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$$materialDetail.grade",
                        as: "grade",
                        cond: {
                          $eq: ["$$grade._id", "$grade_id"],
                        },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: "finishes",
          localField: "finish_id",
          foreignField: "_id",
          as: "lookup_finish",
        },
      },
      {
        $addFields: {
          lookup_finish: {
            $map: {
              input: "$lookup_finish",
              as: "finishDetail",
              in: {
                _id: "$$finishDetail._id",
                name: "$$finishDetail.name",
                code: "$$finishDetail.code",
                description: "$$finishDetail.description",
                color: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$$finishDetail.color",
                        as: "color",
                        cond: {
                          $eq: ["$$color._id", "$color_id"],
                        },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          code: 1,
          image: 1,
          description: 1,
          system_id: 1,
          system: {
            $arrayElemAt: ["$lookup_system.system_detail.name", 0],
          },
          subsystem_id: 1,
          subsystem: {
            $arrayElemAt: [
              {
                $map: {
                  input: {
                    $arrayElemAt: [
                      "$lookup_system.system_detail.subsystems",
                      0,
                    ],
                  },
                  as: "subsystem",
                  in: "$$subsystem.name",
                },
              },
              0,
            ],
          },
          group: {
            $arrayElemAt: ["$lookup_group_subgroup.name", 0],
          },
          group_id: 1,
          subgroup_id: 1,
          subgroup: {
            $arrayElemAt: ["$lookup_group_subgroup.subgroup.name", 0],
          },
          supplier_id: 1,
          supplier: {
            $arrayElemAt: ["$lookup_supplier.name", 0],
          },
          supplier_code: {
            $arrayElemAt: ["$lookup_supplier.code", 0],
          },
          supplier_item_code: 1,
          material_id: 1,
          material: {
            $arrayElemAt: ["$lookup_raw_material.name", 0],
          },
          alloy_id: 1,
          alloy: {
            $arrayElemAt: ["$lookup_raw_material.alloy.name", 0],
          },
          temper_id: 1,
          temper: {
            $arrayElemAt: ["$lookup_raw_material.temper.name", 0],
          },
          grade_id: 1,
          grade: {
            $arrayElemAt: ["$lookup_raw_material.grade.name", 0],
          },
          finish_id: 1,
          finish: {
            $arrayElemAt: ["$lookup_finish.name", 0],
          },
          color_id: 1,
          color: {
            $arrayElemAt: ["$lookup_finish.color.name", 0],
          },
          unit_weight: 1,
          weight_unit: 1,
          unit_system: 1,
          unit_description: 1,
          unit: 1,
          rd: 1,
          additional_profit: 1,

          stock: { $arrayElemAt: ["$stock", 0] },
          category: "Non-Insulated Profile",
          order_type: "Package",
        },
      },
    ]);
    // const ins_supplier = await Profile_Insulated_Input.aggregate([
    //   {
    //     $match: {
    //       supplier_id: new mongoose.Types.ObjectId(supplier),
    //     },
    //   },
    //   {
    //     $unwind: {
    //       path: "$stock_detail",
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "stock_models",
    //       localField: "stock_detail",
    //       foreignField: "_id",
    //       as: "stock",
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "profile_insulated_calculators",
    //       localField: "_id",
    //       foreignField: "input_model_id",
    //       as: "pl",
    //     },
    //   },
    //   {
    //     $addFields: {
    //       reference_code: "$code",
    //       ref_code_id: "$stock.reference_code_id",
    //       free: "$stock.free_inventory",
    //       msq: "$stock.msq",
    //       origin_cost: "$pl.origin_cost",
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "profile_system_models", // Name of the collection for Profile_System_Model
    //       let: {
    //         systemField: "$system_id",
    //         subsystemField: "$subsystem_id",
    //       },
    //       pipeline: [
    //         {
    //           $unwind: "$system_detail",
    //         },
    //         {
    //           $match: {
    //             $expr: {
    //               $and: [
    //                 {
    //                   $eq: ["$system_detail._id", "$$systemField"],
    //                 },
    //                 {
    //                   $in: [
    //                     "$$subsystemField",
    //                     "$system_detail.subsystems._id",
    //                   ],
    //                 },
    //               ],
    //             },
    //           },
    //         },
    //         {
    //           $addFields: {
    //             "system_detail.subsystems": {
    //               $filter: {
    //                 input: "$system_detail.subsystems",
    //                 as: "subsystem",
    //                 cond: {
    //                   $eq: ["$$subsystem._id", "$$subsystemField"],
    //                 },
    //               },
    //             },
    //           },
    //         },
    //       ],
    //       as: "lookup_system",
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "accessories_supplier_models",
    //       localField: "supplier_id",
    //       foreignField: "_id",
    //       as: "lookup_supplier",
    //     },
    //   },
    //   {
    //     $addFields: {
    //       system: {
    //         $arrayElemAt: ["$lookup_system.system_detail.name", 0],
    //       },
    //       subsystem: {
    //         $arrayElemAt: [
    //           {
    //             $map: {
    //               input: {
    //                 $arrayElemAt: [
    //                   "$lookup_system.system_detail.subsystems",
    //                   0,
    //                 ],
    //               },
    //               as: "subsystem",
    //               in: "$$subsystem.name",
    //             },
    //           },
    //           0,
    //         ],
    //       },
    //       supplier: {
    //         $arrayElemAt: ["$lookup_supplier.name", 0],
    //       },
    //       supplier_code: {
    //         $arrayElemAt: ["$lookup_supplier.code", 0],
    //       },
    //       supplier_item_code: 1,
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "stock_models",
    //       localField: "_id",
    //       foreignField: "reference_code_id",
    //       as: "stock_detail",
    //     },
    //   },
    //   { $unwind: "$aluminium" },
    //   {
    //     $lookup: {
    //       from: "profile_input_models", // Replace with the actual collection name
    //       localField: "aluminium.code_id",
    //       foreignField: "_id",
    //       as: "aluminium.code_info",
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "profile_calculators", // Replace with the actual collection name
    //       localField: "aluminium.code_pl_id",
    //       foreignField: "_id",
    //       as: "aluminium.code_pl_info",
    //     },
    //   },
    //   {
    //     $unwind: {
    //       path: "$aluminium.code_info",

    //       preserveNullAndEmptyArrays: true,
    //     },
    //   },
    //   {
    //     $unwind: {
    //       path: "$aluminium.code_pl_info",
    //       preserveNullAndEmptyArrays: true,
    //     },
    //   },
    //   // Group back the aluminium array
    //   {
    //     $group: {
    //       _id: "$_id",
    //       aluminium: { $push: "$aluminium" },
    //       root: { $first: "$$ROOT" },
    //     },
    //   },
    //   {
    //     $replaceRoot: {
    //       newRoot: {
    //         $mergeObjects: ["$root", { aluminium: "$aluminium" }],
    //       },
    //     },
    //   },
    //   { $unwind: "$polyamide" },
    //   {
    //     $lookup: {
    //       from: "accessories_input_models", // Replace with the actual collection name
    //       localField: "polyamide.code_id",
    //       foreignField: "_id",
    //       as: "polyamide.code_info",
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "accessories_calculators", // Replace with the actual collection name
    //       localField: "polyamide.code_pl_id",
    //       foreignField: "_id",
    //       as: "polyamide.code_pl_info",
    //     },
    //   },
    //   {
    //     $unwind: {
    //       path: "$polyamide.code_info",

    //       preserveNullAndEmptyArrays: true,
    //     },
    //   },
    //   {
    //     $unwind: {
    //       path: "$polyamide.code_pl_info",
    //       preserveNullAndEmptyArrays: true,
    //     },
    //   },
    //   // Group back the polyamide array
    //   {
    //     $group: {
    //       _id: "$_id",
    //       polyamide: { $push: "$polyamide" },
    //       root: { $first: "$$ROOT" },
    //     },
    //   },
    //   {
    //     $replaceRoot: {
    //       newRoot: {
    //         $mergeObjects: ["$root", { polyamide: "$polyamide" }],
    //       },
    //     },
    //   },
    //   {
    //     $addFields: {
    //       code: {
    //         $arrayElemAt: ["$stock.packing_code", 0],
    //       },
    //       code_id: {
    //         $arrayElemAt: ["$stock._id", 0],
    //       },
    //       reference_code: 1,
    //       ref_code_id: {
    //         $arrayElemAt: ["$ref_code_id", 0],
    //       },
    //       supplier_code: 1,
    //       origin_cost: {
    //         $arrayElemAt: ["$origin_cost", 0],
    //       },
    //       free: { $arrayElemAt: ["$free", 0] },
    //       msq: { $arrayElemAt: ["$msq", 0] },
    //       description: 1,
    //       category: "Insulated Profile",
    //       order_type: "Package",
    //     },
    //   },
    // ]);
    // const kit_supplier = await Kit_Input.aggregate([
    //   {
    //     $match: {
    //       supplier_id: new mongoose.Types.ObjectId(supplier),
    //     },
    //   },
    //   {
    //     $unwind: {
    //       path: "$stock_detail",
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "stock_models",
    //       localField: "stock_detail",
    //       foreignField: "_id",
    //       as: "stock",
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "kit_calculators",
    //       localField: "_id",
    //       foreignField: "input_model_id",
    //       as: "pl",
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "profile_system_models", // Name of the collection for Profile_System_Model
    //       let: {
    //         systemField: "$system_id",
    //         subsystemField: "$subsystem_id",
    //       },
    //       pipeline: [
    //         {
    //           $unwind: "$system_detail",
    //         },
    //         {
    //           $match: {
    //             $expr: {
    //               $and: [
    //                 {
    //                   $eq: ["$system_detail._id", "$$systemField"],
    //                 },
    //                 {
    //                   $in: [
    //                     "$$subsystemField",
    //                     "$system_detail.subsystems._id",
    //                   ],
    //                 },
    //               ],
    //             },
    //           },
    //         },
    //         {
    //           $addFields: {
    //             "system_detail.subsystems": {
    //               $filter: {
    //                 input: "$system_detail.subsystems",
    //                 as: "subsystem",
    //                 cond: {
    //                   $eq: ["$$subsystem._id", "$$subsystemField"],
    //                 },
    //               },
    //             },
    //           },
    //         },
    //       ],
    //       as: "lookup_system",
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "group_subgroups",
    //       localField: "group_id",
    //       foreignField: "_id",
    //       as: "lookup_group_subgroup",
    //     },
    //   },
    //   {
    //     $addFields: {
    //       lookup_group_subgroup: {
    //         $map: {
    //           input: "$lookup_group_subgroup",
    //           as: "groupDetail",
    //           in: {
    //             _id: "$$groupDetail._id",
    //             name: "$$groupDetail.name",
    //             subgroup: {
    //               $arrayElemAt: [
    //                 {
    //                   $filter: {
    //                     input: "$$groupDetail.subgroup",
    //                     as: "subgroupEntry",
    //                     cond: {
    //                       $eq: ["$$subgroupEntry._id", "$subgroup_id"],
    //                     },
    //                   },
    //                 },
    //                 0,
    //               ],
    //             },
    //           },
    //         },
    //       },
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "accessories_supplier_models",
    //       localField: "supplier_id",
    //       foreignField: "_id",
    //       as: "lookup_supplier",
    //     },
    //   },

    //   { $unwind: "$accessories" },
    //   {
    //     $lookup: {
    //       from: "accessories_input_models", // Replace with the actual collection name
    //       localField: "accessories.code_id",
    //       foreignField: "_id",
    //       as: "accessories.code_info",
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "accessories_calculators", // Replace with the actual collection name
    //       localField: "accessories.code_pl_id",
    //       foreignField: "_id",
    //       as: "accessories.code_pl_info",
    //     },
    //   },
    //   {
    //     $unwind: {
    //       path: "$accessories.code_info",
    //       preserveNullAndEmptyArrays: true,
    //     },
    //   },
    //   {
    //     $unwind: {
    //       path: "$accessories.code_pl_info",
    //       preserveNullAndEmptyArrays: true,
    //     },
    //   },
    //   {
    //     $addFields: {
    //       accessories: {
    //         code: "$accessories.code_info.code",
    //         unit_cost: "$accessories.code_pl_info.selling_price",
    //         total_cost: {
    //           $multiply: [
    //             "$accessories.code_pl_info.selling_price",
    //             "$accessories.quantity",
    //           ],
    //         },
    //         origin_cost: "$accessories.code_pl_info.oc",
    //         landing_cost: "$accessories.code_pl_info.landing_cost",
    //         selling_price: "$accessories.code_pl_info.selling_price",
    //       },
    //     },
    //   },
    //   {
    //     $group: {
    //       _id: "$_id",
    //       accessories: { $push: "$accessories" },
    //       root: { $first: "$$ROOT" },
    //     },
    //   },
    //   {
    //     $replaceRoot: {
    //       newRoot: {
    //         $mergeObjects: ["$root", { accessories: "$accessories" }],
    //       },
    //     },
    //   },

    //   { $unwind: "$non_insulated_aluminium_profile" },
    //   {
    //     $lookup: {
    //       from: "profile_input_models", // Replace with the actual collection name
    //       localField: "non_insulated_aluminium_profile.code_id",
    //       foreignField: "_id",
    //       as: "non_insulated_aluminium_profile.code_info",
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "profile_calculators", // Replace with the actual collection name
    //       localField: "non_insulated_aluminium_profile.code_pl_id",
    //       foreignField: "_id",
    //       as: "non_insulated_aluminium_profile.code_pl_info",
    //     },
    //   },
    //   {
    //     $unwind: {
    //       path: "$non_insulated_aluminium_profile.code_info",
    //       preserveNullAndEmptyArrays: true,
    //     },
    //   },
    //   {
    //     $unwind: {
    //       path: "$non_insulated_aluminium_profile.code_pl_info",
    //       preserveNullAndEmptyArrays: true,
    //     },
    //   },
    //   {
    //     $addFields: {
    //       non_insulated_aluminium_profile: {
    //         code: "$non_insulated_aluminium_profile.code_info.code",
    //         unit_cost:
    //           "$non_insulated_aluminium_profile.code_pl_info.final_selling_price",
    //         total_cost: {
    //           $multiply: [
    //             "$non_insulated_aluminium_profile.code_pl_info.final_selling_price",
    //             "$non_insulated_aluminium_profile.quantity",
    //           ],
    //         },
    //         origin_cost:
    //           "$non_insulated_aluminium_profile.code_pl_info.origin_cost",
    //         landing_cost:
    //           "$non_insulated_aluminium_profile.code_pl_info.origin_cost",
    //         selling_price:
    //           "$non_insulated_aluminium_profile.code_pl_info.final_selling_price",
    //       },
    //     },
    //   },
    //   {
    //     $group: {
    //       _id: "$_id",
    //       non_insulated_aluminium_profile: {
    //         $push: "$non_insulated_aluminium_profile",
    //       },
    //       root: { $first: "$$ROOT" },
    //     },
    //   },
    //   {
    //     $replaceRoot: {
    //       newRoot: {
    //         $mergeObjects: [
    //           "$root",
    //           {
    //             non_insulated_aluminium_profile:
    //               "$non_insulated_aluminium_profile",
    //           },
    //         ],
    //       },
    //     },
    //   },

    //   { $unwind: "$insulated_aluminium_profile" },
    //   {
    //     $lookup: {
    //       from: "profile_insulated_inputs", // Replace with the actual collection name
    //       localField: "insulated_aluminium_profile.code_id",
    //       foreignField: "_id",
    //       as: "insulated_aluminium_profile.code_info",
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "profile_insulated_calculators", // Replace with the actual collection name
    //       localField: "insulated_aluminium_profile.code_pl_id",
    //       foreignField: "_id",
    //       as: "insulated_aluminium_profile.code_pl_info",
    //     },
    //   },
    //   {
    //     $unwind: {
    //       path: "$insulated_aluminium_profile.code_info",
    //       preserveNullAndEmptyArrays: true,
    //     },
    //   },
    //   {
    //     $unwind: {
    //       path: "$insulated_aluminium_profile.code_pl_info",
    //       preserveNullAndEmptyArrays: true,
    //     },
    //   },
    //   {
    //     $addFields: {
    //       insulated_aluminium_profile: {
    //         code: "$insulated_aluminium_profile.code_info.code",
    //         unit_cost: "$insulated_aluminium_profile.code_pl_info.total_cost",
    //         total_cost: {
    //           $multiply: [
    //             "$insulated_aluminium_profile.code_pl_info.total_cost",
    //             "$insulated_aluminium_profile.quantity",
    //           ],
    //         },
    //         origin_cost:
    //           "$insulated_aluminium_profile.code_pl_info.origin_cost",
    //         landing_cost:
    //           "$insulated_aluminium_profile.code_pl_info.landing_cost",
    //         selling_price:
    //           "$insulated_aluminium_profile.code_pl_info.selling_price",
    //       },
    //     },
    //   },
    //   {
    //     $group: {
    //       _id: "$_id",
    //       insulated_aluminium_profile: {
    //         $push: "$insulated_aluminium_profile",
    //       },
    //       root: { $first: "$$ROOT" },
    //     },
    //   },
    //   {
    //     $replaceRoot: {
    //       newRoot: {
    //         $mergeObjects: [
    //           "$root",
    //           {
    //             insulated_aluminium_profile: "$insulated_aluminium_profile",
    //           },
    //         ],
    //       },
    //     },
    //   },

    //   { $unwind: "$operation" },
    //   {
    //     $lookup: {
    //       from: "operations_models", // Replace with the actual collection name
    //       localField: "operation.code_id",
    //       foreignField: "_id",
    //       as: "operation.code_info",
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "accessories_supplier_models", // Replace with the actual collection name
    //       localField: "operation.code_info.supplier_id",
    //       foreignField: "_id",
    //       as: "operation.supplier_info",
    //     },
    //   },
    //   {
    //     $unwind: {
    //       path: "$operation.code_info",
    //       preserveNullAndEmptyArrays: true,
    //     },
    //   },

    //   {
    //     $addFields: {
    //       operation: {
    //         code: {
    //           $concat: [
    //             "$operation.code_info.name",
    //             " ",
    //             {
    //               $ifNull: [
    //                 {
    //                   $arrayElemAt: ["$operation.supplier_info.name", 0],
    //                 },
    //                 "",
    //               ],
    //             },
    //           ],
    //         },
    //         unit_cost: "$operation.code_info.cost_to_aed",
    //         total_cost: {
    //           $multiply: [
    //             "$operation.code_info.cost_to_aed",
    //             "$operation.quantity",
    //           ],
    //         },
    //         origin_cost: 0,
    //         landing_cost: 0,
    //         selling_price: 0,
    //       },
    //     },
    //   },

    //   {
    //     $group: {
    //       _id: "$_id",
    //       operation: {
    //         $push: "$operation",
    //       },
    //       root: { $first: "$$ROOT" },
    //     },
    //   },
    //   {
    //     $replaceRoot: {
    //       newRoot: {
    //         $mergeObjects: ["$root", { operation: "$operation" }],
    //       },
    //     },
    //   },

    //   { $unwind: "$kit" },
    //   {
    //     $lookup: {
    //       from: "kit_inputs", // Replace with the actual collection name
    //       localField: "kit.code_id",
    //       foreignField: "_id",
    //       as: "kit.code_info",
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "kit_calculators", // Replace with the actual collection name
    //       localField: "kit.code_pl_id",
    //       foreignField: "_id",
    //       as: "kit.code_pl_info",
    //     },
    //   },
    //   {
    //     $unwind: {
    //       path: "$kit.code_info",
    //       preserveNullAndEmptyArrays: true,
    //     },
    //   },
    //   {
    //     $unwind: {
    //       path: "$kit.code_pl_info",
    //       preserveNullAndEmptyArrays: true,
    //     },
    //   },
    //   {
    //     $addFields: {
    //       kit: {
    //         code: "$kit.code_info.code",
    //         unit_cost: "$kit.code_pl_info.total_cost",
    //         total_cost: {
    //           $multiply: ["$kit.code_pl_info.total_cost", "$kit.quantity"],
    //         },
    //         origin_cost: "$kit.code_pl_info.origin_cost",
    //         landing_cost: "$kit.code_pl_info.landing_cost",
    //         selling_price: "$kit.code_pl_info.selling_price",
    //       },
    //     },
    //   },
    //   {
    //     $group: {
    //       _id: "$_id",
    //       kit: {
    //         $push: "$kit",
    //       },
    //       root: { $first: "$$ROOT" },
    //     },
    //   },
    //   {
    //     $replaceRoot: {
    //       newRoot: {
    //         $mergeObjects: ["$root", { kit: "$kit" }],
    //       },
    //     },
    //   },
    //   {
    //     $addFields: {
    //       system: {
    //         $arrayElemAt: ["$lookup_system.system_detail.name", 0],
    //       },
    //       subsystem: {
    //         $arrayElemAt: [
    //           {
    //             $map: {
    //               input: {
    //                 $arrayElemAt: [
    //                   "$lookup_system.system_detail.subsystems",
    //                   0,
    //                 ],
    //               },
    //               as: "subsystem",
    //               in: "$$subsystem.name",
    //             },
    //           },
    //           0,
    //         ],
    //       },
    //       group: {
    //         $arrayElemAt: ["$lookup_group_subgroup.name", 0],
    //       },
    //       subgroup: {
    //         $arrayElemAt: ["$lookup_group_subgroup.subgroup.name", 0],
    //       },
    //       supplier: {
    //         $arrayElemAt: ["$lookup_supplier.name", 0],
    //       },
    //       supplier_code: {
    //         $arrayElemAt: ["$lookup_supplier.code", 0],
    //       },
    //       category: "Kit",
    //       order_type: "Package",
    //     },
    //   },
    // ]);
    const result = [
      ...accessory_supplier,
      ...non_ins_supplier,
      // ...ins_supplier,
      // ...kit_supplier,
    ];
    return res.status(200).json({ result });
  } catch (error) {
    console.log(error);
    res.status(500).json({ mssg: error?.message || "Internal server error" });
  }
};
const code_acc_to_supplier_for_loose = async (req, res) => {
  try {
    const { supplier } = req.params;
    if (supplier == "undefined" || !supplier) {
      return;
    }
    const accessory_supplier = await Accessories_Input_Model.aggregate([
      {
        $match: {
          supplier_id: new mongoose.Types.ObjectId(supplier),
        },
      },
      {
        $lookup: {
          from: "accessories_calculators",
          localField: "_id",
          foreignField: "input_model_id",
          as: "pl",
        },
      },
      {
        $lookup: {
          from: "loose_stock_models",
          localField: "_id",
          foreignField: "code_id",
          as: "loose_stock",
          pipeline: [{ $match: { active: true } }],
        },
      },
      {
        $match: {
          "loose_stock.0": { $exists: true }, // Checks if loose_stock has at least one entry
        },
      },
      {
        $addFields: {
          origin_cost: "$pl.oc",
          loose_id: "$loose_stock._id",
        },
      },
      {
        $lookup: {
          from: "profile_system_models", // Name of the collection for Profile_System_Model
          let: {
            systemField: "$system_id",
            subsystemField: "$subsystem_id",
          },
          pipeline: [
            {
              $unwind: "$system_detail",
            },
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$system_detail._id", "$$systemField"],
                    },
                    {
                      $in: [
                        "$$subsystemField",
                        "$system_detail.subsystems._id",
                      ],
                    },
                  ],
                },
              },
            },
            {
              $addFields: {
                "system_detail.subsystems": {
                  $filter: {
                    input: "$system_detail.subsystems",
                    as: "subsystem",
                    cond: {
                      $eq: ["$$subsystem._id", "$$subsystemField"],
                    },
                  },
                },
              },
            },
          ],
          as: "lookup_system",
        },
      },
      {
        $lookup: {
          from: "group_subgroups",
          localField: "group_id",
          foreignField: "_id",
          as: "lookup_group_subgroup",
        },
      },
      {
        $addFields: {
          lookup_group_subgroup: {
            $map: {
              input: "$lookup_group_subgroup",
              as: "groupDetail",
              in: {
                _id: "$$groupDetail._id",
                name: "$$groupDetail.name",
                subgroup: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$$groupDetail.subgroup",
                        as: "subgroupEntry",
                        cond: {
                          $eq: ["$$subgroupEntry._id", "$subgroup_id"],
                        },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: "accessories_supplier_models",
          localField: "supplier_id",
          foreignField: "_id",
          as: "lookup_supplier",
        },
      },
      {
        $lookup: {
          from: "currency_models",
          localField: "lookup_supplier.currency_id",
          foreignField: "_id",
          as: "lookup_currency",
        },
      },
      {
        $lookup: {
          from: "materials",
          localField: "material_id",
          foreignField: "_id",
          as: "lookup_material",
        },
      },
      {
        $addFields: {
          lookup_material: {
            $map: {
              input: "$lookup_material",
              as: "materialDetail",
              in: {
                _id: "$$materialDetail._id",
                name: "$$materialDetail.name",
                grade: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$$materialDetail.grade",
                        as: "grade",
                        cond: {
                          $eq: ["$$grade._id", "$grade_id"],
                        },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: "finishes",
          localField: "finish_id",
          foreignField: "_id",
          as: "lookup_finish",
        },
      },
      {
        $addFields: {
          lookup_finish: {
            $map: {
              input: "$lookup_finish",
              as: "finishDetail",
              in: {
                _id: "$$finishDetail._id",
                name: "$$finishDetail.name",
                code: "$$finishDetail.code",
                description: "$$finishDetail.description",
                color: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$$finishDetail.color",
                        as: "color",
                        cond: {
                          $eq: ["$$color._id", "$color_id"],
                        },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          code: 1,
          image: 1,
          description: 1,
          system_id: 1,
          system: {
            $arrayElemAt: ["$lookup_system.system_detail.name", 0],
          },
          subsystem_id: 1,
          subsystem: {
            $arrayElemAt: [
              {
                $map: {
                  input: {
                    $arrayElemAt: [
                      "$lookup_system.system_detail.subsystems",
                      0,
                    ],
                  },
                  as: "subsystem",
                  in: "$$subsystem.name",
                },
              },
              0,
            ],
          },
          group: {
            $arrayElemAt: ["$lookup_group_subgroup.name", 0],
          },
          group_id: 1,
          subgroup_id: 1,
          subgroup: {
            $arrayElemAt: ["$lookup_group_subgroup.subgroup.name", 0],
          },
          supplier_id: 1,
          supplier: {
            $arrayElemAt: ["$lookup_supplier.name", 0],
          },
          supplier_code: {
            $arrayElemAt: ["$lookup_supplier.code", 0],
          },
          supplier_item_code: 1,
          rd: 1,
          material_id: 1,
          material: {
            $arrayElemAt: ["$lookup_material.name", 0],
          },
          grade_id: 1,
          grade: {
            $arrayElemAt: ["$lookup_material.grade.name", 0],
          },
          finish_id: 1,
          finish: {
            $arrayElemAt: ["$lookup_finish.name", 0],
          },
          color_id: 1,
          color: {
            $arrayElemAt: ["$lookup_finish.color.name", 0],
          },
          unit_weight: 1,
          weight_unit: 1,
          unit_system: 1,
          unit_description: 1,
          unit: 1,
          cost: 1,
          currency_id: {
            $arrayElemAt: ["$lookup_supplier.currency_id", 0],
          },
          currency: {
            $arrayElemAt: ["$lookup_currency.code", 0],
          },
          cost_to_aed: 1,
          additional_profit: 1,
          // code: {
          //   $arrayElemAt: ["$stock.packing_code", 0],
          // },
          // code_id: {
          //   $arrayElemAt: ["$stock._id", 0],
          // },
          reference_code: 1,
          ref_code_id: {
            $arrayElemAt: ["$ref_code_id", 0],
          },
          // supplier_code: 1,
          origin_cost: {
            $arrayElemAt: ["$origin_cost", 0],
          },
          free: { $arrayElemAt: ["$free", 0] },
          msq: { $arrayElemAt: ["$msq", 0] },
          description: 1,
          stock: { $arrayElemAt: ["$loose_stock", 0] },
          category: "Accessory",
          order_type: "Loose",
        },
      },
    ]);

    const non_ins_supplier = await Profile_Input_Model.aggregate([
      {
        $match: {
          supplier_id: new mongoose.Types.ObjectId(supplier),
        },
      },
      {
        $lookup: {
          from: "profile_calculators",
          localField: "_id",
          foreignField: "input_model_id",
          as: "pl",
        },
      },
      {
        $lookup: {
          from: "loose_stock_models",
          localField: "_id",
          foreignField: "code_id",
          as: "loose_stock",
          pipeline: [{ $match: { active: true } }],
        },
      },
      {
        $match: {
          "loose_stock.0": { $exists: true }, // Checks if loose_stock has at least one entry
        },
      },
      {
        $addFields: {
          origin_cost: "$pl.origin_cost",
          loose_id: "$loose_stock._id",
        },
      },
      {
        $lookup: {
          from: "profile_system_models", // Name of the collection for Profile_System_Model
          let: {
            systemField: "$system_id",
            subsystemField: "$subsystem_id",
          },
          pipeline: [
            {
              $unwind: "$system_detail",
            },
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$system_detail._id", "$$systemField"],
                    },
                    {
                      $in: [
                        "$$subsystemField",
                        "$system_detail.subsystems._id",
                      ],
                    },
                  ],
                },
              },
            },
            {
              $addFields: {
                "system_detail.subsystems": {
                  $filter: {
                    input: "$system_detail.subsystems",
                    as: "subsystem",
                    cond: {
                      $eq: ["$$subsystem._id", "$$subsystemField"],
                    },
                  },
                },
              },
            },
          ],
          as: "lookup_system",
        },
      },
      {
        $lookup: {
          from: "group_subgroups",
          localField: "group_id",
          foreignField: "_id",
          as: "lookup_group_subgroup",
        },
      },
      {
        $addFields: {
          lookup_group_subgroup: {
            $map: {
              input: "$lookup_group_subgroup",
              as: "groupDetail",
              in: {
                _id: "$$groupDetail._id",
                name: "$$groupDetail.name",
                subgroup: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$$groupDetail.subgroup",
                        as: "subgroupEntry",
                        cond: {
                          $eq: ["$$subgroupEntry._id", "$subgroup_id"],
                        },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: "accessories_supplier_models",
          localField: "supplier_id",
          foreignField: "_id",
          as: "lookup_supplier",
        },
      },
      {
        $lookup: {
          from: "currency_models",
          localField: "currency_id",
          foreignField: "_id",
          as: "lookup_currency",
        },
      },
      {
        $lookup: {
          from: "raw_material_models",
          localField: "material_id",
          foreignField: "_id",
          as: "lookup_raw_material",
        },
      },
      {
        $addFields: {
          lookup_raw_material: {
            $map: {
              input: "$lookup_raw_material",
              as: "materialDetail",
              in: {
                _id: "$$materialDetail._id",
                name: "$$materialDetail.name",
                alloy: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$$materialDetail.alloy",
                        as: "alloy",
                        cond: {
                          $eq: ["$$alloy._id", "$alloy_id"],
                        },
                      },
                    },
                    0,
                  ],
                },
                temper: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$$materialDetail.temper",
                        as: "temper",
                        cond: {
                          $eq: ["$$temper._id", "$temper_id"],
                        },
                      },
                    },
                    0,
                  ],
                },
                grade: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$$materialDetail.grade",
                        as: "grade",
                        cond: {
                          $eq: ["$$grade._id", "$grade_id"],
                        },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: "finishes",
          localField: "finish_id",
          foreignField: "_id",
          as: "lookup_finish",
        },
      },
      {
        $addFields: {
          lookup_finish: {
            $map: {
              input: "$lookup_finish",
              as: "finishDetail",
              in: {
                _id: "$$finishDetail._id",
                name: "$$finishDetail.name",
                code: "$$finishDetail.code",
                description: "$$finishDetail.description",
                color: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$$finishDetail.color",
                        as: "color",
                        cond: {
                          $eq: ["$$color._id", "$color_id"],
                        },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          code: 1,
          image: 1,
          description: 1,
          system_id: 1,
          system: {
            $arrayElemAt: ["$lookup_system.system_detail.name", 0],
          },
          subsystem_id: 1,
          subsystem: {
            $arrayElemAt: [
              {
                $map: {
                  input: {
                    $arrayElemAt: [
                      "$lookup_system.system_detail.subsystems",
                      0,
                    ],
                  },
                  as: "subsystem",
                  in: "$$subsystem.name",
                },
              },
              0,
            ],
          },
          group: {
            $arrayElemAt: ["$lookup_group_subgroup.name", 0],
          },
          group_id: 1,
          subgroup_id: 1,
          subgroup: {
            $arrayElemAt: ["$lookup_group_subgroup.subgroup.name", 0],
          },
          supplier_id: 1,
          supplier: {
            $arrayElemAt: ["$lookup_supplier.name", 0],
          },
          supplier_code: {
            $arrayElemAt: ["$lookup_supplier.code", 0],
          },
          supplier_item_code: 1,
          material_id: 1,
          material: {
            $arrayElemAt: ["$lookup_raw_material.name", 0],
          },
          alloy_id: 1,
          alloy: {
            $arrayElemAt: ["$lookup_raw_material.alloy.name", 0],
          },
          temper_id: 1,
          temper: {
            $arrayElemAt: ["$lookup_raw_material.temper.name", 0],
          },
          grade_id: 1,
          grade: {
            $arrayElemAt: ["$lookup_raw_material.grade.name", 0],
          },
          finish_id: 1,
          finish: {
            $arrayElemAt: ["$lookup_finish.name", 0],
          },
          color_id: 1,
          color: {
            $arrayElemAt: ["$lookup_finish.color.name", 0],
          },
          unit_weight: 1,
          weight_unit: 1,
          unit_system: 1,
          unit_description: 1,
          unit: 1,
          rd: 1,
          additional_profit: 1,

          stock: { $arrayElemAt: ["$loose_stock", 0] },
          category: "Non-Insulated Profile",
          order_type: "Loose",
        },
      },
    ]);
    // const ins_supplier = await Profile_Insulated_Input.aggregate([
    //   {
    //     $match: {
    //       supplier_id: new mongoose.Types.ObjectId(supplier),
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "profile_insulated_calculators",
    //       localField: "_id",
    //       foreignField: "input_model_id",
    //       as: "pl",
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "loose_stock_models",
    //       localField: "_id",
    //       foreignField: "code_id",
    //       as: "loose_stock",
    //     },
    //   },
    //   {
    //     $match: {
    //       "loose_stock.0": { $exists: true }, // Checks if loose_stock has at least one entry
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "profile_system_models", // Name of the collection for Profile_System_Model
    //       let: {
    //         systemField: "$system_id",
    //         subsystemField: "$subsystem_id",
    //       },
    //       pipeline: [
    //         {
    //           $unwind: "$system_detail",
    //         },
    //         {
    //           $match: {
    //             $expr: {
    //               $and: [
    //                 {
    //                   $eq: ["$system_detail._id", "$$systemField"],
    //                 },
    //                 {
    //                   $in: [
    //                     "$$subsystemField",
    //                     "$system_detail.subsystems._id",
    //                   ],
    //                 },
    //               ],
    //             },
    //           },
    //         },
    //         {
    //           $addFields: {
    //             "system_detail.subsystems": {
    //               $filter: {
    //                 input: "$system_detail.subsystems",
    //                 as: "subsystem",
    //                 cond: {
    //                   $eq: ["$$subsystem._id", "$$subsystemField"],
    //                 },
    //               },
    //             },
    //           },
    //         },
    //       ],
    //       as: "lookup_system",
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "accessories_supplier_models",
    //       localField: "supplier_id",
    //       foreignField: "_id",
    //       as: "lookup_supplier",
    //     },
    //   },
    //   {
    //     $addFields: {
    //       system: {
    //         $arrayElemAt: ["$lookup_system.system_detail.name", 0],
    //       },
    //       subsystem: {
    //         $arrayElemAt: [
    //           {
    //             $map: {
    //               input: {
    //                 $arrayElemAt: [
    //                   "$lookup_system.system_detail.subsystems",
    //                   0,
    //                 ],
    //               },
    //               as: "subsystem",
    //               in: "$$subsystem.name",
    //             },
    //           },
    //           0,
    //         ],
    //       },
    //       supplier: {
    //         $arrayElemAt: ["$lookup_supplier.name", 0],
    //       },
    //       supplier_code: {
    //         $arrayElemAt: ["$lookup_supplier.code", 0],
    //       },
    //       supplier_item_code: 1,
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "stock_models",
    //       localField: "_id",
    //       foreignField: "reference_code_id",
    //       as: "stock_detail",
    //     },
    //   },
    //   { $unwind: "$aluminium" },
    //   {
    //     $lookup: {
    //       from: "profile_input_models", // Replace with the actual collection name
    //       localField: "aluminium.code_id",
    //       foreignField: "_id",
    //       as: "aluminium.code_info",
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "profile_calculators", // Replace with the actual collection name
    //       localField: "aluminium.code_pl_id",
    //       foreignField: "_id",
    //       as: "aluminium.code_pl_info",
    //     },
    //   },
    //   {
    //     $unwind: {
    //       path: "$aluminium.code_info",

    //       preserveNullAndEmptyArrays: true,
    //     },
    //   },
    //   {
    //     $unwind: {
    //       path: "$aluminium.code_pl_info",
    //       preserveNullAndEmptyArrays: true,
    //     },
    //   },
    //   // Group back the aluminium array
    //   {
    //     $group: {
    //       _id: "$_id",
    //       aluminium: { $push: "$aluminium" },
    //       root: { $first: "$$ROOT" },
    //     },
    //   },
    //   {
    //     $replaceRoot: {
    //       newRoot: {
    //         $mergeObjects: ["$root", { aluminium: "$aluminium" }],
    //       },
    //     },
    //   },
    //   { $unwind: "$polyamide" },
    //   {
    //     $lookup: {
    //       from: "accessories_input_models", // Replace with the actual collection name
    //       localField: "polyamide.code_id",
    //       foreignField: "_id",
    //       as: "polyamide.code_info",
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "accessories_calculators", // Replace with the actual collection name
    //       localField: "polyamide.code_pl_id",
    //       foreignField: "_id",
    //       as: "polyamide.code_pl_info",
    //     },
    //   },
    //   {
    //     $unwind: {
    //       path: "$polyamide.code_info",

    //       preserveNullAndEmptyArrays: true,
    //     },
    //   },
    //   {
    //     $unwind: {
    //       path: "$polyamide.code_pl_info",
    //       preserveNullAndEmptyArrays: true,
    //     },
    //   },
    //   // Group back the polyamide array
    //   {
    //     $group: {
    //       _id: "$_id",
    //       polyamide: { $push: "$polyamide" },
    //       root: { $first: "$$ROOT" },
    //     },
    //   },
    //   {
    //     $replaceRoot: {
    //       newRoot: {
    //         $mergeObjects: ["$root", { polyamide: "$polyamide" }],
    //       },
    //     },
    //   },
    //   {
    //     $addFields: {
    //       stock: { $arrayElemAt: ["$loose_stock", 0] },
    //       // code: {
    //       //   $arrayElemAt: ["$stock.packing_code", 0],
    //       // },
    //       // code_id: {
    //       //   $arrayElemAt: ["$stock._id", 0],
    //       // },
    //       reference_code: 1,
    //       ref_code_id: {
    //         $arrayElemAt: ["$ref_code_id", 0],
    //       },
    //       supplier_code: 1,
    //       origin_cost: {
    //         $arrayElemAt: ["$origin_cost", 0],
    //       },
    //       free: { $arrayElemAt: ["$free", 0] },
    //       msq: { $arrayElemAt: ["$msq", 0] },
    //       description: 1,
    //       category: "Insulated Profile",
    //       order_type: "Loose",
    //     },
    //   },
    // ]);
    // const kit_supplier = await Kit_Input.aggregate([
    //   {
    //     $match: {
    //       supplier_id: new mongoose.Types.ObjectId(supplier),
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "kit_calculators",
    //       localField: "_id",
    //       foreignField: "input_model_id",
    //       as: "pl",
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "loose_stock_models",
    //       localField: "_id",
    //       foreignField: "code_id",
    //       as: "loose_stock",
    //     },
    //   },
    //   {
    //     $match: {
    //       "loose_stock.0": { $exists: true }, // Checks if loose_stock has at least one entry
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "profile_system_models", // Name of the collection for Profile_System_Model
    //       let: {
    //         systemField: "$system_id",
    //         subsystemField: "$subsystem_id",
    //       },
    //       pipeline: [
    //         {
    //           $unwind: "$system_detail",
    //         },
    //         {
    //           $match: {
    //             $expr: {
    //               $and: [
    //                 {
    //                   $eq: ["$system_detail._id", "$$systemField"],
    //                 },
    //                 {
    //                   $in: [
    //                     "$$subsystemField",
    //                     "$system_detail.subsystems._id",
    //                   ],
    //                 },
    //               ],
    //             },
    //           },
    //         },
    //         {
    //           $addFields: {
    //             "system_detail.subsystems": {
    //               $filter: {
    //                 input: "$system_detail.subsystems",
    //                 as: "subsystem",
    //                 cond: {
    //                   $eq: ["$$subsystem._id", "$$subsystemField"],
    //                 },
    //               },
    //             },
    //           },
    //         },
    //       ],
    //       as: "lookup_system",
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "group_subgroups",
    //       localField: "group_id",
    //       foreignField: "_id",
    //       as: "lookup_group_subgroup",
    //     },
    //   },
    //   {
    //     $addFields: {
    //       lookup_group_subgroup: {
    //         $map: {
    //           input: "$lookup_group_subgroup",
    //           as: "groupDetail",
    //           in: {
    //             _id: "$$groupDetail._id",
    //             name: "$$groupDetail.name",
    //             subgroup: {
    //               $arrayElemAt: [
    //                 {
    //                   $filter: {
    //                     input: "$$groupDetail.subgroup",
    //                     as: "subgroupEntry",
    //                     cond: {
    //                       $eq: ["$$subgroupEntry._id", "$subgroup_id"],
    //                     },
    //                   },
    //                 },
    //                 0,
    //               ],
    //             },
    //           },
    //         },
    //       },
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "accessories_supplier_models",
    //       localField: "supplier_id",
    //       foreignField: "_id",
    //       as: "lookup_supplier",
    //     },
    //   },

    //   { $unwind: "$accessories" },
    //   {
    //     $lookup: {
    //       from: "accessories_input_models", // Replace with the actual collection name
    //       localField: "accessories.code_id",
    //       foreignField: "_id",
    //       as: "accessories.code_info",
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "accessories_calculators", // Replace with the actual collection name
    //       localField: "accessories.code_pl_id",
    //       foreignField: "_id",
    //       as: "accessories.code_pl_info",
    //     },
    //   },
    //   {
    //     $unwind: {
    //       path: "$accessories.code_info",
    //       preserveNullAndEmptyArrays: true,
    //     },
    //   },
    //   {
    //     $unwind: {
    //       path: "$accessories.code_pl_info",
    //       preserveNullAndEmptyArrays: true,
    //     },
    //   },
    //   {
    //     $addFields: {
    //       accessories: {
    //         code: "$accessories.code_info.code",
    //         unit_cost: "$accessories.code_pl_info.selling_price",
    //         total_cost: {
    //           $multiply: [
    //             "$accessories.code_pl_info.selling_price",
    //             "$accessories.quantity",
    //           ],
    //         },
    //         origin_cost: "$accessories.code_pl_info.oc",
    //         landing_cost: "$accessories.code_pl_info.landing_cost",
    //         selling_price: "$accessories.code_pl_info.selling_price",
    //       },
    //     },
    //   },
    //   {
    //     $group: {
    //       _id: "$_id",
    //       accessories: { $push: "$accessories" },
    //       root: { $first: "$$ROOT" },
    //     },
    //   },
    //   {
    //     $replaceRoot: {
    //       newRoot: {
    //         $mergeObjects: ["$root", { accessories: "$accessories" }],
    //       },
    //     },
    //   },

    //   { $unwind: "$non_insulated_aluminium_profile" },
    //   {
    //     $lookup: {
    //       from: "profile_input_models", // Replace with the actual collection name
    //       localField: "non_insulated_aluminium_profile.code_id",
    //       foreignField: "_id",
    //       as: "non_insulated_aluminium_profile.code_info",
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "profile_calculators", // Replace with the actual collection name
    //       localField: "non_insulated_aluminium_profile.code_pl_id",
    //       foreignField: "_id",
    //       as: "non_insulated_aluminium_profile.code_pl_info",
    //     },
    //   },
    //   {
    //     $unwind: {
    //       path: "$non_insulated_aluminium_profile.code_info",
    //       preserveNullAndEmptyArrays: true,
    //     },
    //   },
    //   {
    //     $unwind: {
    //       path: "$non_insulated_aluminium_profile.code_pl_info",
    //       preserveNullAndEmptyArrays: true,
    //     },
    //   },
    //   {
    //     $addFields: {
    //       non_insulated_aluminium_profile: {
    //         code: "$non_insulated_aluminium_profile.code_info.code",
    //         unit_cost:
    //           "$non_insulated_aluminium_profile.code_pl_info.final_selling_price",
    //         total_cost: {
    //           $multiply: [
    //             "$non_insulated_aluminium_profile.code_pl_info.final_selling_price",
    //             "$non_insulated_aluminium_profile.quantity",
    //           ],
    //         },
    //         origin_cost:
    //           "$non_insulated_aluminium_profile.code_pl_info.origin_cost",
    //         landing_cost:
    //           "$non_insulated_aluminium_profile.code_pl_info.origin_cost",
    //         selling_price:
    //           "$non_insulated_aluminium_profile.code_pl_info.final_selling_price",
    //       },
    //     },
    //   },
    //   {
    //     $group: {
    //       _id: "$_id",
    //       non_insulated_aluminium_profile: {
    //         $push: "$non_insulated_aluminium_profile",
    //       },
    //       root: { $first: "$$ROOT" },
    //     },
    //   },
    //   {
    //     $replaceRoot: {
    //       newRoot: {
    //         $mergeObjects: [
    //           "$root",
    //           {
    //             non_insulated_aluminium_profile:
    //               "$non_insulated_aluminium_profile",
    //           },
    //         ],
    //       },
    //     },
    //   },

    //   { $unwind: "$insulated_aluminium_profile" },
    //   {
    //     $lookup: {
    //       from: "profile_insulated_inputs", // Replace with the actual collection name
    //       localField: "insulated_aluminium_profile.code_id",
    //       foreignField: "_id",
    //       as: "insulated_aluminium_profile.code_info",
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "profile_insulated_calculators", // Replace with the actual collection name
    //       localField: "insulated_aluminium_profile.code_pl_id",
    //       foreignField: "_id",
    //       as: "insulated_aluminium_profile.code_pl_info",
    //     },
    //   },
    //   {
    //     $unwind: {
    //       path: "$insulated_aluminium_profile.code_info",
    //       preserveNullAndEmptyArrays: true,
    //     },
    //   },
    //   {
    //     $unwind: {
    //       path: "$insulated_aluminium_profile.code_pl_info",
    //       preserveNullAndEmptyArrays: true,
    //     },
    //   },
    //   {
    //     $addFields: {
    //       insulated_aluminium_profile: {
    //         code: "$insulated_aluminium_profile.code_info.code",
    //         unit_cost: "$insulated_aluminium_profile.code_pl_info.total_cost",
    //         total_cost: {
    //           $multiply: [
    //             "$insulated_aluminium_profile.code_pl_info.total_cost",
    //             "$insulated_aluminium_profile.quantity",
    //           ],
    //         },
    //         origin_cost:
    //           "$insulated_aluminium_profile.code_pl_info.origin_cost",
    //         landing_cost:
    //           "$insulated_aluminium_profile.code_pl_info.landing_cost",
    //         selling_price:
    //           "$insulated_aluminium_profile.code_pl_info.selling_price",
    //       },
    //     },
    //   },
    //   {
    //     $group: {
    //       _id: "$_id",
    //       insulated_aluminium_profile: {
    //         $push: "$insulated_aluminium_profile",
    //       },
    //       root: { $first: "$$ROOT" },
    //     },
    //   },
    //   {
    //     $replaceRoot: {
    //       newRoot: {
    //         $mergeObjects: [
    //           "$root",
    //           {
    //             insulated_aluminium_profile: "$insulated_aluminium_profile",
    //           },
    //         ],
    //       },
    //     },
    //   },

    //   { $unwind: "$operation" },
    //   {
    //     $lookup: {
    //       from: "operations_models", // Replace with the actual collection name
    //       localField: "operation.code_id",
    //       foreignField: "_id",
    //       as: "operation.code_info",
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "accessories_supplier_models", // Replace with the actual collection name
    //       localField: "operation.code_info.supplier_id",
    //       foreignField: "_id",
    //       as: "operation.supplier_info",
    //     },
    //   },
    //   {
    //     $unwind: {
    //       path: "$operation.code_info",
    //       preserveNullAndEmptyArrays: true,
    //     },
    //   },

    //   {
    //     $addFields: {
    //       operation: {
    //         code: {
    //           $concat: [
    //             "$operation.code_info.name",
    //             " ",
    //             {
    //               $ifNull: [
    //                 {
    //                   $arrayElemAt: ["$operation.supplier_info.name", 0],
    //                 },
    //                 "",
    //               ],
    //             },
    //           ],
    //         },
    //         unit_cost: "$operation.code_info.cost_to_aed",
    //         total_cost: {
    //           $multiply: [
    //             "$operation.code_info.cost_to_aed",
    //             "$operation.quantity",
    //           ],
    //         },
    //         origin_cost: 0,
    //         landing_cost: 0,
    //         selling_price: 0,
    //       },
    //     },
    //   },

    //   {
    //     $group: {
    //       _id: "$_id",
    //       operation: {
    //         $push: "$operation",
    //       },
    //       root: { $first: "$$ROOT" },
    //     },
    //   },
    //   {
    //     $replaceRoot: {
    //       newRoot: {
    //         $mergeObjects: ["$root", { operation: "$operation" }],
    //       },
    //     },
    //   },

    //   { $unwind: "$kit" },
    //   {
    //     $lookup: {
    //       from: "kit_inputs", // Replace with the actual collection name
    //       localField: "kit.code_id",
    //       foreignField: "_id",
    //       as: "kit.code_info",
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "kit_calculators", // Replace with the actual collection name
    //       localField: "kit.code_pl_id",
    //       foreignField: "_id",
    //       as: "kit.code_pl_info",
    //     },
    //   },
    //   {
    //     $unwind: {
    //       path: "$kit.code_info",
    //       preserveNullAndEmptyArrays: true,
    //     },
    //   },
    //   {
    //     $unwind: {
    //       path: "$kit.code_pl_info",
    //       preserveNullAndEmptyArrays: true,
    //     },
    //   },
    //   {
    //     $addFields: {
    //       kit: {
    //         code: "$kit.code_info.code",
    //         unit_cost: "$kit.code_pl_info.total_cost",
    //         total_cost: {
    //           $multiply: ["$kit.code_pl_info.total_cost", "$kit.quantity"],
    //         },
    //         origin_cost: "$kit.code_pl_info.origin_cost",
    //         landing_cost: "$kit.code_pl_info.landing_cost",
    //         selling_price: "$kit.code_pl_info.selling_price",
    //       },
    //     },
    //   },
    //   {
    //     $group: {
    //       _id: "$_id",
    //       kit: {
    //         $push: "$kit",
    //       },
    //       root: { $first: "$$ROOT" },
    //     },
    //   },
    //   {
    //     $replaceRoot: {
    //       newRoot: {
    //         $mergeObjects: ["$root", { kit: "$kit" }],
    //       },
    //     },
    //   },
    //   {
    //     $addFields: {
    //       system: {
    //         $arrayElemAt: ["$lookup_system.system_detail.name", 0],
    //       },
    //       subsystem: {
    //         $arrayElemAt: [
    //           {
    //             $map: {
    //               input: {
    //                 $arrayElemAt: [
    //                   "$lookup_system.system_detail.subsystems",
    //                   0,
    //                 ],
    //               },
    //               as: "subsystem",
    //               in: "$$subsystem.name",
    //             },
    //           },
    //           0,
    //         ],
    //       },
    //       group: {
    //         $arrayElemAt: ["$lookup_group_subgroup.name", 0],
    //       },
    //       subgroup: {
    //         $arrayElemAt: ["$lookup_group_subgroup.subgroup.name", 0],
    //       },
    //       supplier: {
    //         $arrayElemAt: ["$lookup_supplier.name", 0],
    //       },
    //       supplier_code: {
    //         $arrayElemAt: ["$lookup_supplier.code", 0],
    //       },
    //       stock: { $arrayElemAt: ["$loose_stock", 0] },
    //       category: "Kit",
    //     },
    //   },
    // ]);
    const result = [
      ...accessory_supplier,
      ...non_ins_supplier,
      // ...ins_supplier,
      // ...kit_supplier,
    ];
    return res.status(200).json({ result });
  } catch (error) {
    console.log(error);
    res.status(500).json({ mssg: error?.message || "Internal server error" });
  }
};

//Price Input Controllers
const add_input = async (req, res) => {
  try {
    const {
      code,
      description,
      unit_system,
      unit_description,
      unit,
      weight_unit,
      rd,
      additional_profit,
      lead_time,

      supersystem,
      supersystem_id,
      system,
      system_id,
      subsystem,
      subsystem_id,

      group,
      group_id,
      subgroup,
      subgroup_id,

      supplier_id,
      supplier,
      supplier_code,
      supplier_item_code,
      currency,
      currency_id,
      material_id,
      grade_id,
      finish_id,
      color_id,

      systemTags,

      material,
      grade,
      finish,
      finish_code,
      finish_description,
      color,
    } = JSON.parse(req.body.price_input_form);
    const files = JSON.parse(req.body.files);
    const unit_weight = parseFloat(req.body.unit_weight);
    const cost = parseFloat(req.body.cost);
    const filename = `${process.env.BACKENDURL}/uploads/${req.file?.filename}`;
    if (
      !code ||
      !filename ||
      !description ||
      !group_id ||
      !subgroup_id ||
      !supersystem_id ||
      !system_id ||
      !subsystem_id ||
      !supplier_id ||
      !supplier_item_code ||
      !currency_id ||
      !material_id ||
      !finish_id ||
      !color_id ||
      !unit ||
      !unit_system ||
      !unit_description ||
      !weight_unit ||
      unit_weight === null ||
      isNaN(parseFloat(unit_weight)) ||
      isNaN(parseFloat(cost)) ||
      isNaN(parseFloat(additional_profit)) ||
      isNaN(parseFloat(rd)) ||
      !lead_time
    ) {
      return res.status(400).json({ mssg: "All Entries Are Required" });
    }
    const if_input = await Accessories_Input_Model.find({
      $and: [
        { code },
        { supplier_id },
        { supplier_item_code: supplier_item_code },
        { material_id },
        { grade_id },
        { finish_id },
        { color_id },
      ],
    });
    if (if_input.length > 0) {
      return res.status(400).json({
        mssg: "Entry Already Exists With This Code, Supplier, Supplier Item Code, Material, Grade, Finish and Color",
      });
    }
    const amount = await Currency_model.findOne({ code: currency });
    const new_entry = await Accessories_Input_Model.create({
      code,
      description,
      image: filename,
      supersystem_id,
      system_id,
      subsystem_id,
      group_id,
      subgroup_id,
      supplier_id,
      supplier_item_code,
      material_id,
      rd,
      grade_id,
      finish_id,
      color_id,
      unit_weight,
      weight_unit,
      unit,
      unit_description,
      unit_system,
      cost,
      additional_profit,
      systemTags,
      cost_to_aed: amount.cost_usd_per_kg_plus_fluctuation * cost,
      files: files,
      lead_time,
    });
    return res.status(200).json({ mssg: "New Entry Added" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ mssg: error?.message || "Internal server error" });
  }
};
const get_all_entry = async (req, res) => {
  try {
    let { page, filter, getAll } = req.query;
    if (getAll) {
      const result = await Accessories_Input_Model.aggregate([
        {
          $lookup: {
            from: "profile_system_models", // Name of the collection for Profile_System_Model
            let: {
              systemField: "$system_id",
              subsystemField: "$subsystem_id",
            },
            pipeline: [
              {
                $unwind: "$system_detail",
              },
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$system_detail._id", "$$systemField"] },
                      {
                        $in: [
                          "$$subsystemField",
                          "$system_detail.subsystems._id",
                        ],
                      },
                    ],
                  },
                },
              },
              {
                $addFields: {
                  "system_detail.subsystems": {
                    $filter: {
                      input: "$system_detail.subsystems",
                      as: "subsystem",
                      cond: { $eq: ["$$subsystem._id", "$$subsystemField"] },
                    },
                  },
                },
              },
            ],
            as: "lookup_system",
          },
        },
        {
          $lookup: {
            from: "group_subgroups",
            localField: "group_id",
            foreignField: "_id",
            as: "lookup_group_subgroup",
          },
        },
        {
          $addFields: {
            lookup_group_subgroup: {
              $map: {
                input: "$lookup_group_subgroup",
                as: "groupDetail",
                in: {
                  _id: "$$groupDetail._id",
                  name: "$$groupDetail.name",
                  subgroup: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$$groupDetail.subgroup",
                          as: "subgroupEntry",
                          cond: {
                            $eq: ["$$subgroupEntry._id", "$subgroup_id"],
                          },
                        },
                      },
                      0,
                    ],
                  },
                },
              },
            },
          },
        },
        {
          $lookup: {
            from: "accessories_supplier_models",
            localField: "supplier_id",
            foreignField: "_id",
            as: "lookup_supplier",
          },
        },
        {
          $lookup: {
            from: "currency_models",
            localField: "lookup_supplier.currency_id",
            foreignField: "_id",
            as: "lookup_currency",
          },
        },
        {
          $lookup: {
            from: "materials",
            localField: "material_id",
            foreignField: "_id",
            as: "lookup_material",
          },
        },
        {
          $addFields: {
            lookup_material: {
              $map: {
                input: "$lookup_material",
                as: "materialDetail",
                in: {
                  _id: "$$materialDetail._id",
                  name: "$$materialDetail.name",
                  grade: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$$materialDetail.grade",
                          as: "grade",
                          cond: { $eq: ["$$grade._id", "$grade_id"] },
                        },
                      },
                      0,
                    ],
                  },
                },
              },
            },
          },
        },
        {
          $lookup: {
            from: "finishes",
            localField: "finish_id",
            foreignField: "_id",
            as: "lookup_finish",
          },
        },
        {
          $addFields: {
            lookup_finish: {
              $map: {
                input: "$lookup_finish",
                as: "finishDetail",
                in: {
                  _id: "$$finishDetail._id",
                  name: "$$finishDetail.name",
                  code: "$$finishDetail.code",
                  description: "$$finishDetail.description",
                  color: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$$finishDetail.color",
                          as: "color",
                          cond: { $eq: ["$$color._id", "$color_id"] },
                        },
                      },
                      0,
                    ],
                  },
                },
              },
            },
          },
        },
        {
          $project: {
            _id: 1,
            code: 1,
            image: 1,
            description: 1,
            system_id: 1,
            system: { $arrayElemAt: ["$lookup_system.system_detail.name", 0] },
            subsystem_id: 1,
            subsystem: {
              $arrayElemAt: [
                {
                  $map: {
                    input: {
                      $arrayElemAt: [
                        "$lookup_system.system_detail.subsystems",
                        0,
                      ],
                    },
                    as: "subsystem",
                    in: "$$subsystem.name",
                  },
                },
                0,
              ],
            },
            group: { $arrayElemAt: ["$lookup_group_subgroup.name", 0] },
            group_id: 1,
            subgroup_id: 1,
            subgroup: {
              $arrayElemAt: ["$lookup_group_subgroup.subgroup.name", 0],
            },
            supplier_id: 1,
            supplier: { $arrayElemAt: ["$lookup_supplier.name", 0] },
            supplier_code: { $arrayElemAt: ["$lookup_supplier.code", 0] },
            supplier_item_code: 1,
            rd: 1,
            material_id: 1,
            material: { $arrayElemAt: ["$lookup_material.name", 0] },
            grade_id: 1,
            grade: { $arrayElemAt: ["$lookup_material.grade.name", 0] },
            finish_id: 1,
            finish: { $arrayElemAt: ["$lookup_finish.name", 0] },
            color_id: 1,
            color: { $arrayElemAt: ["$lookup_finish.color.name", 0] },
            unit_weight: 1,
            weight_unit: 1,
            unit_system: 1,
            unit_description: 1,
            unit: 1,
            cost: 1,
            currency_id: { $arrayElemAt: ["$lookup_supplier.currency_id", 0] },
            currency: { $arrayElemAt: ["$lookup_currency.code", 0] },
            cost_to_aed: 1,
            additional_profit: 1,
            lead_time: 1,
          },
        },
        {
          $sort: { code: 1 },
        },
      ]);
      return res.status(200).json({ result });
    } else {
      filter = filter ? JSON.parse(filter) : {};
      let searchRegex = {
        $regex: new RegExp(".*" + filter?.search + ".*", "i"),
      };
      const limit = getAll ? 10000 : 6;
      const pageNumber = parseInt(page) || 1;
      const skip = (pageNumber - 1) * limit;
      let and = [{}];
      if (filter?.system) {
        and.push({ system_id: new mongoose.Types.ObjectId(filter.system) });
      }
      if (filter?.subsystem) {
        and.push({
          subsystem_id: new mongoose.Types.ObjectId(filter.subsystem),
        });
      }
      if (filter?.group) {
        and.push({ group_id: new mongoose.Types.ObjectId(filter.group) });
      }
      if (filter?.subgroup) {
        and.push({ subgroup_id: new mongoose.Types.ObjectId(filter.subgroup) });
      }
      if (filter?.supplier) {
        and.push({ supplier_id: new mongoose.Types.ObjectId(filter.supplier) });
      }
      if (filter?.material) {
        and.push({ material_id: new mongoose.Types.ObjectId(filter.material) });
      }
      if (filter?.grade) {
        and.push({ grade_id: new mongoose.Types.ObjectId(filter.grade) });
      }
      if (filter?.finish) {
        and.push({ finish_id: new mongoose.Types.ObjectId(filter.finish) });
      }
      if (filter?.color) {
        and.push({ color: new mongoose.Types.ObjectId(filter.color) });
      }
      if (filter?.currency) {
        and.push({ currency_id: new mongoose.Types.ObjectId(filter.currency) });
      }
      let where = {
        $or: [{ code: searchRegex }, { description: searchRegex }],
        $and: and,
      };

      const result = await Accessories_Input_Model.aggregate([
        {
          $lookup: {
            from: "profile_system_models", // Name of the collection for Profile_System_Model
            let: {
              systemField: "$system_id",
              subsystemField: "$subsystem_id",
            },
            pipeline: [
              {
                $unwind: "$system_detail",
              },
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$system_detail._id", "$$systemField"] },
                      {
                        $in: [
                          "$$subsystemField",
                          "$system_detail.subsystems._id",
                        ],
                      },
                    ],
                  },
                },
              },
              {
                $addFields: {
                  "system_detail.subsystems": {
                    $filter: {
                      input: "$system_detail.subsystems",
                      as: "subsystem",
                      cond: { $eq: ["$$subsystem._id", "$$subsystemField"] },
                    },
                  },
                },
              },
            ],
            as: "lookup_system",
          },
        },
        {
          $lookup: {
            from: "group_subgroups",
            localField: "group_id",
            foreignField: "_id",
            as: "lookup_group_subgroup",
          },
        },
        {
          $addFields: {
            lookup_group_subgroup: {
              $map: {
                input: "$lookup_group_subgroup",
                as: "groupDetail",
                in: {
                  _id: "$$groupDetail._id",
                  name: "$$groupDetail.name",
                  subgroup: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$$groupDetail.subgroup",
                          as: "subgroupEntry",
                          cond: {
                            $eq: ["$$subgroupEntry._id", "$subgroup_id"],
                          },
                        },
                      },
                      0,
                    ],
                  },
                },
              },
            },
          },
        },
        {
          $lookup: {
            from: "accessories_supplier_models",
            localField: "supplier_id",
            foreignField: "_id",
            as: "lookup_supplier",
          },
        },
        {
          $lookup: {
            from: "currency_models",
            localField: "lookup_supplier.currency_id",
            foreignField: "_id",
            as: "lookup_currency",
          },
        },
        {
          $lookup: {
            from: "materials",
            localField: "material_id",
            foreignField: "_id",
            as: "lookup_material",
          },
        },
        {
          $addFields: {
            lookup_material: {
              $map: {
                input: "$lookup_material",
                as: "materialDetail",
                in: {
                  _id: "$$materialDetail._id",
                  name: "$$materialDetail.name",
                  grade: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$$materialDetail.grade",
                          as: "grade",
                          cond: { $eq: ["$$grade._id", "$grade_id"] },
                        },
                      },
                      0,
                    ],
                  },
                },
              },
            },
          },
        },
        {
          $lookup: {
            from: "finishes",
            localField: "finish_id",
            foreignField: "_id",
            as: "lookup_finish",
          },
        },
        {
          $addFields: {
            lookup_finish: {
              $map: {
                input: "$lookup_finish",
                as: "finishDetail",
                in: {
                  _id: "$$finishDetail._id",
                  name: "$$finishDetail.name",
                  code: "$$finishDetail.code",
                  description: "$$finishDetail.description",
                  color: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$$finishDetail.color",
                          as: "color",
                          cond: { $eq: ["$$color._id", "$color_id"] },
                        },
                      },
                      0,
                    ],
                  },
                },
              },
            },
          },
        },
        {
          $project: {
            _id: 1,
            code: 1,
            image: 1,
            description: 1,
            system_id: 1,
            system: { $arrayElemAt: ["$lookup_system.system_detail.name", 0] },
            subsystem_id: 1,
            subsystem: {
              $arrayElemAt: [
                {
                  $map: {
                    input: {
                      $arrayElemAt: [
                        "$lookup_system.system_detail.subsystems",
                        0,
                      ],
                    },
                    as: "subsystem",
                    in: "$$subsystem.name",
                  },
                },
                0,
              ],
            },
            group: { $arrayElemAt: ["$lookup_group_subgroup.name", 0] },
            group_id: 1,
            subgroup_id: 1,
            subgroup: {
              $arrayElemAt: ["$lookup_group_subgroup.subgroup.name", 0],
            },
            supplier_id: 1,
            supplier: { $arrayElemAt: ["$lookup_supplier.name", 0] },
            supplier_code: { $arrayElemAt: ["$lookup_supplier.code", 0] },
            supplier_item_code: 1,
            rd: 1,
            material_id: 1,
            material: { $arrayElemAt: ["$lookup_material.name", 0] },
            grade_id: 1,
            grade: { $arrayElemAt: ["$lookup_material.grade.name", 0] },
            finish_id: 1,
            finish: { $arrayElemAt: ["$lookup_finish.name", 0] },
            color_id: 1,
            color: { $arrayElemAt: ["$lookup_finish.color.name", 0] },
            unit_weight: 1,
            weight_unit: 1,
            unit_system: 1,
            unit_description: 1,
            unit: 1,
            cost: 1,
            currency_id: { $arrayElemAt: ["$lookup_supplier.currency_id", 0] },
            currency: { $arrayElemAt: ["$lookup_currency.code", 0] },
            cost_to_aed: 1,
            additional_profit: 1,
            lead_time: 1,
          },
        },
        {
          $match: where,
        },
        {
          $skip: skip,
        },
        {
          $limit: limit,
        },
        {
          $sort: { code: 1 },
        },
      ]);

      const totalCount = await Accessories_Input_Model.countDocuments(where);
      const currentPage = pageNumber;
      const total_page = Math.ceil(totalCount / limit);
      return res
        .status(200)
        .json({ result, currentPage, total_page, totalCount, limit });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ mssg: error?.message || "Internal server error" });
  }
};
const get_single_entry = async (req, res) => {
  try {
    const id = req.params.id;
    const entry = await Accessories_Input_Model.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
        },
      },
      {
        $lookup: {
          from: "profile_system_models", // Name of the collection for Profile_System_Model
          let: {
            systemField: "$system_id",
            subsystemField: "$subsystem_id",
          },
          pipeline: [
            {
              $unwind: "$system_detail",
            },
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$system_detail._id", "$$systemField"] },
                    {
                      $in: [
                        "$$subsystemField",
                        "$system_detail.subsystems._id",
                      ],
                    },
                  ],
                },
              },
            },
            {
              $addFields: {
                "system_detail.subsystems": {
                  $filter: {
                    input: "$system_detail.subsystems",
                    as: "subsystem",
                    cond: { $eq: ["$$subsystem._id", "$$subsystemField"] },
                  },
                },
              },
            },
          ],
          as: "lookup_system",
        },
      },
      {
        $addFields: {
          systemTagIds: {
            $map: {
              input: "$systemTags",
              as: "tag",
              in: "$$tag.system_id",
            },
          },
        },
      },
      {
        $lookup: {
          from: "profile_system_models",
          let: { tagIds: "$systemTagIds" },
          pipeline: [
            { $unwind: "$system_detail" },
            {
              $match: {
                $expr: {
                  $in: ["$system_detail._id", "$$tagIds"],
                },
              },
            },
            {
              $project: {
                _id: 0,
                system_id: "$system_detail._id",
                system: "$system_detail.code",
              },
            },
          ],
          as: "systemTags",
        },
      },
      {
        $project: {
          systemTagIds: 0,
        },
      },
      {
        $lookup: {
          from: "group_subgroups",
          localField: "group_id",
          foreignField: "_id",
          as: "lookup_group_subgroup",
        },
      },
      {
        $addFields: {
          lookup_group_subgroup: {
            $map: {
              input: "$lookup_group_subgroup",
              as: "groupDetail",
              in: {
                _id: "$$groupDetail._id",
                name: "$$groupDetail.name",
                subgroup: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$$groupDetail.subgroup",
                        as: "subgroupEntry",
                        cond: { $eq: ["$$subgroupEntry._id", "$subgroup_id"] },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: "accessories_supplier_models",
          localField: "supplier_id",
          foreignField: "_id",
          as: "lookup_supplier",
        },
      },
      {
        $lookup: {
          from: "currency_models",
          localField: "lookup_supplier.currency_id",
          foreignField: "_id",
          as: "lookup_currency",
        },
      },
      {
        $lookup: {
          from: "materials",
          localField: "material_id",
          foreignField: "_id",
          as: "lookup_material",
        },
      },
      {
        $addFields: {
          lookup_material: {
            $map: {
              input: "$lookup_material",
              as: "materialDetail",
              in: {
                _id: "$$materialDetail._id",
                name: "$$materialDetail.name",
                grade: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$$materialDetail.grade",
                        as: "grade",
                        cond: { $eq: ["$$grade._id", "$grade_id"] },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: "finishes",
          localField: "finish_id",
          foreignField: "_id",
          as: "lookup_finish",
        },
      },
      {
        $addFields: {
          lookup_finish: {
            $map: {
              input: "$lookup_finish",
              as: "finishDetail",
              in: {
                _id: "$$finishDetail._id",
                name: "$$finishDetail.name",
                code: "$$finishDetail.code",
                description: "$$finishDetail.description",
                color: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$$finishDetail.color",
                        as: "color",
                        cond: { $eq: ["$$color._id", "$color_id"] },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          },
        },
      },
    ]);
    const loose_stock_entry = await Loose_Stock_model.findOne({
      code: entry?.code,
    });
    return res.status(200).json({ entry: entry[0], loose_stock_entry });
  } catch (error) {
    console.log(error);
    res.status(500).json({ mssg: error?.message || "Internal server error" });
  }
};
function validateParts(partsArray) {
  return Object.values(partsArray).every(
    (value) => value !== null && value !== undefined && value !== ""
  );
}
const update_input = async (req, res) => {
  try {
    const id = req.params.id;
    const {
      code,
      description,
      unit_system,
      unit_description,
      unit,
      weight_unit,
      rd,
      additional_profit,
      lead_time,

      supersystem,
      supersystem_id,
      system,
      system_id,
      subsystem,
      subsystem_id,

      group,
      group_id,
      subgroup,
      subgroup_id,

      supplier_id,
      supplier,
      supplier_code,
      supplier_item_code,
      currency,
      currency_id,
      material_id,
      grade_id,
      finish_id,
      color_id,

      systemTags,

      material,
      grade,
      finish,
      finish_code,
      finish_description,
      color,
    } = JSON.parse(req.body.price_input_form);
    const files = JSON.parse(req.body.files);
    const unit_weight = parseFloat(req.body.unit_weight);
    const cost = parseFloat(req.body.cost);
    const filename = req.file
      ? `${process.env.BACKENDURL}/uploads/${req.file.filename}`
      : req.body.photo;
    if (
      !code ||
      !filename ||
      !description ||
      !supersystem_id ||
      !system_id ||
      !subsystem_id ||
      !group_id ||
      !subgroup_id ||
      !supplier_id ||
      !grade_id ||
      !material_id ||
      !finish_id ||
      !color_id ||
      !unit ||
      !unit_system ||
      !unit_description ||
      !supplier_item_code ||
      !weight_unit ||
      unit_weight === null ||
      isNaN(parseFloat(unit_weight)) ||
      isNaN(parseFloat(cost)) ||
      isNaN(parseFloat(additional_profit)) ||
      isNaN(parseFloat(rd)) ||
      !lead_time
    ) {
      return res.status(400).json({ mssg: "All Entries Are Required" });
    }
    const amount = await Currency_model.findOne({ code: currency });
    const update_entry = await Accessories_Input_Model.findByIdAndUpdate(id, {
      code,
      description,
      image: filename,
      supersystem_id,
      system_id,
      subsystem_id,
      group_id,
      subgroup_id,
      supplier_id,
      supplier_item_code,
      material_id,
      rd,
      grade_id,
      finish_id,
      color_id,
      unit_weight,
      weight_unit,
      unit,
      unit_description,
      unit_system,
      cost,
      additional_profit,
      lead_time,
      cost_to_aed: amount.cost_usd_per_kg_plus_fluctuation * cost,
      files: files,
      systemTags,
    });
    return res.status(200).json({ mssg: "Input Updated" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ mssg: error?.message || "Internal server error" });
  }
};
const delete_input = async (req, res) => {
  try {
    const id = req.params.id;
    const deleted_entry = await Accessories_Input_Model.findByIdAndDelete(id);
    const deleted_pl = await AccessoriesCalculator.findOneAndDelete({
      input_model_id: id,
    });
    const deletedStock = await Stock_model.deleteMany({
      reference_code_id: id,
    });
    const deletedActions = await Action_model.deleteMany({ ref_code_id: id });
    return res.status(200).json({ mssg: "Entry Deleted" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ mssg: error?.message || "Internal server error" });
  }
};
const create_duplicate_acc = async (req, res) => {
  try {
    const {
      code,
      description,
      unit_system,
      unit_description,
      unit,
      weight_unit,
      rd,
      additional_profit,
      lead_time,

      supersystem,
      supersystem_id,
      system,
      system_id,
      subsystem,
      subsystem_id,

      group,
      group_id,
      subgroup,
      subgroup_id,

      supplier_id,
      supplier,
      supplier_code,
      supplier_item_code,
      currency,
      currency_id,
      material_id,
      grade_id,
      finish_id,
      color_id,

      systemTags,

      material,
      grade,
      finish,
      finish_code,
      finish_description,
      color,
    } = JSON.parse(req.body.price_input_form);
    const files = JSON.parse(req.body.files);
    const unit_weight = parseFloat(req.body.unit_weight);
    const cost = parseFloat(req.body.cost);

    const filename = req.file
      ? `${process.env.BACKENDURL}/uploads/${req.file.filename}`
      : req.body.photo;
    if (
      !code ||
      !filename ||
      !description ||
      !supersystem_id ||
      !system_id ||
      !subsystem_id ||
      !group_id ||
      !subgroup_id ||
      !supplier_id ||
      !grade_id ||
      !material_id ||
      !finish_id ||
      !color_id ||
      !unit ||
      !unit_system ||
      !unit_description ||
      // !currency_id ||
      !supplier_item_code ||
      !weight_unit ||
      unit_weight === null ||
      isNaN(parseFloat(unit_weight)) ||
      isNaN(parseFloat(cost)) ||
      isNaN(parseFloat(additional_profit)) ||
      isNaN(parseFloat(rd)) ||
      !lead_time
    ) {
      return res.status(400).json({ mssg: "All Entries Are Required" });
    }
    const if_input = await Accessories_Input_Model.find({
      $and: [
        { code },
        { supplier_id },
        { supplier_item_code: supplier_item_code },
        { material_id },
        { grade_id },
        { finish_id },
        { color_id },
      ],
    });
    if (if_input.length > 0) {
      return res.status(400).json({
        mssg: "Entry Already Exists With This Code, Supplier, Supplier Item Code, Material, Grade, Finish and Color",
      });
    }
    const amount = await Currency_model.findOne({ code: currency });
    const new_entry = await Accessories_Input_Model.create({
      code,
      description,
      image: filename,
      supersystem_id,
      system_id,
      subsystem_id,
      group_id,
      subgroup_id,
      supplier_id,
      supplier_item_code,
      // currency_id,
      material_id,
      rd,
      grade_id,
      finish_id,
      color_id,
      unit_weight,
      weight_unit,
      unit,
      unit_description,
      unit_system,
      cost,
      additional_profit,
      lead_time,
      cost_to_aed: amount.cost_usd_per_kg_plus_fluctuation * cost,
      files: files,
      systemTags,
    });
    return res.status(200).json({ mssg: "New Entry Added" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ mssg: error?.message || "Internal server error" });
  }
};

const price_calc_step2_Helper = async () => {
  try {
    let skip = 0;
    let limit = 100;
    let hasMore = true;

    while (hasMore) {
      const input = await Accessories_Input_Model.aggregate([
        {
          $skip: skip,
        },
        {
          $limit: limit,
        },
        {
          $lookup: {
            from: "profile_system_models",
            localField: "system_id",
            foreignField: "system_detail._id",
            as: "lookup_system",
          },
        },
        {
          $lookup: {
            from: "accessories_supplier_models",
            localField: "supplier_id",
            foreignField: "_id",
            as: "lookup_supplier",
          },
        },
        {
          $lookup: {
            from: "currency_models",
            localField: "lookup_supplier.currency_id",
            foreignField: "_id",
            as: "lookup_currency",
          },
        },
      ]);
      if (input.length == 0) {
        hasMore = false;
      } else {
        await Promise.all(
          input.map(async (itm) => {
            try {
              let origin_cost =
                itm.lookup_currency[0].cost_usd_per_kg_plus_fluctuation *
                itm.cost;
              let landed_cost =
                origin_cost +
                origin_cost * (itm.lookup_supplier[0].shipping / 100) +
                origin_cost * (itm.lookup_supplier[0].customs / 100) +
                origin_cost * (itm.lookup_supplier[0].vat / 100) +
                origin_cost * (itm.lookup_supplier[0].finance / 100);
              let item_additional_cost = (itm.rd / 100) * landed_cost;
              let final_cost = item_additional_cost + landed_cost;
              let selling_price =
                final_cost +
                (itm.additional_profit / 100) * final_cost +
                (itm.lookup_supplier[0].profit / 100) * final_cost +
                (itm.lookup_system[0].royality / 100) * final_cost +
                (itm.lookup_system[0].profit / 100) * final_cost +
                (itm.lookup_system[0].overhead / 100) * landed_cost;
              let pl1 =
                selling_price / (1 - itm.lookup_system[0].price_list_1 / 100);
              let pl2 =
                selling_price / (1 - itm.lookup_system[0].price_list_2 / 100);
              let pl3 =
                selling_price / (1 - itm.lookup_system[0].price_list_3 / 100);
              let pl4 =
                selling_price / (1 - itm.lookup_system[0].price_list_4 / 100);
              const stockWithNoAvgCost = await Stock_model.find({
                reference_code_id: itm._id,
                avg_price: 0,
              });
              // if (itm.currency !== itm.lookup_currency[0].code) {
              //   const update_input_currency =
              //     await Accessories_Input_Model.findByIdAndUpdate(itm._id, {
              //       currency: itm.lookup_currency[0].code,
              //     });
              // }
              if (stockWithNoAvgCost.length > 0) {
                await Stock_model.updateMany(
                  {
                    reference_code_id: itm._id,
                    avg_price: 0,
                  },
                  { $set: { avg_price: landed_cost } }
                );
              }
              let AccessoriesCalculatorExist =
                await AccessoriesCalculator.findOne({
                  input_model_id: itm._id,
                });
              let ACObj = {
                input_model_id: itm._id,
                // code: itm.code,
                // image: itm.image,
                // weight: itm.unit_weight,
                // description: itm.description,
                // supplier: itm.supplier,
                // system: itm.system,
                oc: origin_cost,
                landing_cost: landed_cost,
                // profit: itm.additional_profit,
                final_cost,
                selling_price: selling_price,
                priceList1: pl1,
                priceList2: pl2,
                priceList3: pl3,
                priceList4: pl4,
                // files: itm.files,
              };
              if (AccessoriesCalculatorExist) {
                await AccessoriesCalculator.findOneAndUpdate(
                  { input_model_id: itm._id },
                  ACObj
                );
              } else {
                await AccessoriesCalculator.create(ACObj);
              }
            } catch (error) {
              console.error(
                "Accessory, Error processing item:",
                itm._id,
                error.message
              );
            }
          })
        );
        skip += limit;
      }
    }
    return true;
  } catch (error) {
    console.log(error);
    // res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};
const price_calc_step2 = async (req, res) => {
  try {
    const suppliers = await price_calc_step2_Helper();
    return res.json("refreshed");
  } catch (error) {
    console.log(error);
    res.status(500).json({ mssg: error?.message || "Internal server error" });
  }
};

const get_pl_for_insulated = async (req, res) => {
  try {
    const { id } = req.params;
    const acc_pl = await AccessoriesCalculator.findOne({
      input_model_id: id,
    });
    return res.status(200).json(acc_pl);
  } catch (error) {
    console.log(error);
    res.status(500).json({ mssg: error?.message || "Internal server error" });
  }
};

const getPriceList = async (req, res) => {
  try {
    let { filter, page, getAll } = req.query;
    if (getAll) {
      const result = await AccessoriesCalculator.aggregate([
        {
          $lookup: {
            from: "accessories_input_models",
            localField: "input_model_id",
            foreignField: "_id",
            as: "input_detail",
          },
        },
        {
          $lookup: {
            from: "accessories_supplier_models",
            localField: "input_detail.supplier_id",
            foreignField: "_id",
            as: "supplier_detail",
          },
        },
        {
          $lookup: {
            from: "profile_system_models", // Name of the collection for Profile_System_Model
            let: {
              systemField: { $arrayElemAt: ["$input_detail.system_id", 0] },
            },
            pipeline: [
              {
                $unwind: "$system_detail",
              },
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $eq: ["$system_detail._id", "$$systemField"],
                      },
                    ],
                  },
                },
              },
            ],
            as: "lookup_system",
          },
        },
        {
          $addFields: {
            supplier: { $arrayElemAt: ["$supplier_detail.name", 0] },
            supplier_code: { $arrayElemAt: ["$supplier_detail.code", 0] },
            system: {
              $arrayElemAt: ["$lookup_system.system_detail.name", 0],
            },
          },
        },
        {
          $unwind: "$input_detail",
        },
        {
          $sort: {
            "input_detail.code": 1,
          },
        },
      ]);
      return res.json({ result });
    } else {
      filter = filter ? JSON.parse(filter) : {};
      let searchRegex = {
        $regex: new RegExp(".*" + filter?.search + ".*", "i"),
      };
      const limit = 10;
      const pageNumber = parseInt(page) || 1;
      const skip = (pageNumber - 1) * limit;
      let and = [{}];
      if (filter?.system) {
        and.push({
          "input_detail.system_id": new mongoose.Types.ObjectId(filter.system),
        });
      }
      if (filter?.subsystem) {
        and.push({
          "input_detail.subsystem_id": new mongoose.Types.ObjectId(
            filter.subsystem
          ),
        });
      }
      if (filter?.supplier) {
        and.push({
          "input_detail.supplier_id": new mongoose.Types.ObjectId(
            filter.supplier
          ),
        });
      }
      if (filter?.group) {
        and.push({
          "input_detail.group_id": new mongoose.Types.ObjectId(filter.group),
        });
      }
      if (filter?.subgroup) {
        and.push({
          "input_detail.subgroup_id": new mongoose.Types.ObjectId(
            filter.subgroup
          ),
        });
      }
      if (filter?.supplier) {
        and.push({
          "input_detail.supplier_id": new mongoose.Types.ObjectId(
            filter.supplier
          ),
        });
      }
      if (filter?.material) {
        and.push({
          "input_detail.material_id": new mongoose.Types.ObjectId(
            filter.material
          ),
        });
      }
      if (filter?.grade) {
        and.push({
          "input_detail.grade_id": new mongoose.Types.ObjectId(filter.grade),
        });
      }
      if (filter?.finish) {
        and.push({
          "input_detail.finish_id": new mongoose.Types.ObjectId(filter.finish),
        });
      }
      if (filter?.color) {
        and.push({
          "input_detail.color_id": new mongoose.Types.ObjectId(filter.color),
        });
      }
      if (filter?.currency) {
        and.push({
          "input_detail.currency_id": new mongoose.Types.ObjectId(
            filter.currency
          ),
        });
      }
      let where = and.length > 0 ? { $and: and } : {};

      const result = await AccessoriesCalculator.aggregate([
        {
          $lookup: {
            from: "accessories_input_models",
            localField: "input_model_id",
            foreignField: "_id",
            as: "input_detail",
          },
        },
        {
          $unwind: "$input_detail",
        },
        {
          $lookup: {
            from: "accessories_supplier_models",
            localField: "input_detail.supplier_id",
            foreignField: "_id",
            as: "supplier_detail",
          },
        },
        {
          $lookup: {
            from: "profile_system_models", // Name of the collection for Profile_System_Model
            let: {
              systemField: "$input_detail.system_id",
            },
            pipeline: [
              {
                $unwind: "$system_detail",
              },
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $eq: ["$system_detail._id", "$$systemField"],
                      },
                    ],
                  },
                },
              },
            ],
            as: "lookup_system",
          },
        },
        {
          $lookup: {
            from: "group_subgroups",
            localField: "input_detail.group_id",
            foreignField: "_id",
            as: "lookup_group_subgroup",
          },
        },
        {
          $addFields: {
            lookup_group_subgroup: {
              $map: {
                input: "$lookup_group_subgroup",
                as: "groupDetail",
                in: {
                  _id: "$$groupDetail._id",
                  name: "$$groupDetail.name",
                  subgroup: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$$groupDetail.subgroup",
                          as: "subgroupEntry",
                          cond: {
                            $eq: [
                              "$$subgroupEntry._id",
                              "$input_detail.subgroup_id",
                            ],
                          },
                        },
                      },
                      0,
                    ],
                  },
                },
              },
            },
          },
        },
        {
          $lookup: {
            from: "currency_models",
            localField: "supplier_detail.currency_id",
            foreignField: "_id",
            as: "lookup_currency",
          },
        },
        {
          $lookup: {
            from: "materials",
            localField: "input_detail.material_id",
            foreignField: "_id",
            as: "lookup_material",
          },
        },
        {
          $addFields: {
            lookup_material: {
              $map: {
                input: "$lookup_material",
                as: "materialDetail",
                in: {
                  _id: "$$materialDetail._id",
                  name: "$$materialDetail.name",
                  grade: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$$materialDetail.grade",
                          as: "grade",
                          cond: {
                            $eq: ["$$grade._id", "$input_detail.grade_id"],
                          },
                        },
                      },
                      0,
                    ],
                  },
                },
              },
            },
          },
        },
        {
          $lookup: {
            from: "finishes",
            localField: "input_detail.finish_id",
            foreignField: "_id",
            as: "lookup_finish",
          },
        },
        {
          $addFields: {
            lookup_finish: {
              $map: {
                input: "$lookup_finish",
                as: "finishDetail",
                in: {
                  _id: "$$finishDetail._id",
                  name: "$$finishDetail.name",
                  code: "$$finishDetail.code",
                  description: "$$finishDetail.description",
                  color: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$$finishDetail.color",
                          as: "color",
                          cond: {
                            $eq: ["$$color._id", "$input_detail.color_id"],
                          },
                        },
                      },
                      0,
                    ],
                  },
                },
              },
            },
          },
        },
        {
          $addFields: {
            supplier: { $arrayElemAt: ["$supplier_detail.name", 0] },
            supplier_code: { $arrayElemAt: ["$supplier_detail.code", 0] },
            system: {
              $arrayElemAt: ["$lookup_system.system_detail.name", 0],
            },
            system: { $arrayElemAt: ["$lookup_system.system_detail.name", 0] },
            subsystem: {
              $arrayElemAt: [
                {
                  $map: {
                    input: {
                      $arrayElemAt: [
                        "$lookup_system.system_detail.subsystems",
                        0,
                      ],
                    },
                    as: "subsystem",
                    in: "$$subsystem.name",
                  },
                },
                0,
              ],
            },
            group: { $arrayElemAt: ["$lookup_group_subgroup.name", 0] },
            subgroup: {
              $arrayElemAt: ["$lookup_group_subgroup.subgroup.name", 0],
            },
            supplier_item_code: 1,
            material: { $arrayElemAt: ["$lookup_material.name", 0] },

            grade: { $arrayElemAt: ["$lookup_material.grade.name", 0] },

            finish: { $arrayElemAt: ["$lookup_finish.name", 0] },

            color: { $arrayElemAt: ["$lookup_finish.color.name", 0] },
            currency: { $arrayElemAt: ["$lookup_currency.code", 0] },
          },
        },
        {
          $match: {
            "input_detail.code": searchRegex,
          },
        },
        {
          $sort: {
            "input_detail.code": 1,
          },
        },
        {
          $match: {
            ...where,
          },
        },
        {
          $skip: skip,
        },
        {
          $limit: limit,
        },
      ]);

      const totalCount = await AccessoriesCalculator.aggregate([
        {
          $lookup: {
            from: "accessories_input_models",
            localField: "input_model_id",
            foreignField: "_id",
            as: "input_detail",
          },
        },
        {
          $match: where,
        },
        {
          $match: {
            "input_detail.code": searchRegex,
          },
        },
        {
          $count: "totalCount",
        },
      ]);
      const currentPage = pageNumber;
      const total_page = Math.ceil(totalCount[0].totalCount / limit);
      return res.json({
        result,
        currentPage,
        total_page,
        totalCount: totalCount[0].totalCount,
        limit,
      });
    }
  } catch (error) {
    return res.status(500).json({ msg: error.message });
  }
};

const getGroups = async (req, res) => {
  try {
    const filters = await Accessories_Input_Model.aggregate([
      {
        $lookup: {
          from: "profile_system_models", // Name of the collection for Profile_System_Model
          let: {
            systemField: "$system_id",
            subsystemField: "$subsystem_id",
          },
          pipeline: [
            {
              $unwind: "$system_detail",
            },
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$system_detail._id", "$$systemField"],
                    },
                    {
                      $in: [
                        "$$subsystemField",
                        "$system_detail.subsystems._id",
                      ],
                    },
                  ],
                },
              },
            },
            {
              $addFields: {
                "system_detail.subsystems": {
                  $filter: {
                    input: "$system_detail.subsystems",
                    as: "subsystem",
                    cond: {
                      $eq: ["$$subsystem._id", "$$subsystemField"],
                    },
                  },
                },
              },
            },
          ],
          as: "lookup_system",
        },
      },
      {
        $lookup: {
          from: "group_subgroups",
          localField: "group_id",
          foreignField: "_id",
          as: "lookup_group_subgroup",
        },
      },
      {
        $addFields: {
          lookup_group_subgroup: {
            $map: {
              input: "$lookup_group_subgroup",
              as: "groupDetail",
              in: {
                _id: "$$groupDetail._id",
                name: "$$groupDetail.name",
                subgroup: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$$groupDetail.subgroup",
                        as: "subgroupEntry",
                        cond: {
                          $eq: ["$$subgroupEntry._id", "$subgroup_id"],
                        },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: "accessories_supplier_models",
          localField: "supplier_id",
          foreignField: "_id",
          as: "lookup_supplier",
        },
      },
      {
        $lookup: {
          from: "currency_models",
          localField: "lookup_supplier.currency_id",
          foreignField: "_id",
          as: "lookup_currency",
        },
      },
      {
        $lookup: {
          from: "materials",
          localField: "material_id",
          foreignField: "_id",
          as: "lookup_material",
        },
      },
      {
        $addFields: {
          lookup_material: {
            $map: {
              input: "$lookup_material",
              as: "materialDetail",
              in: {
                _id: "$$materialDetail._id",
                name: "$$materialDetail.name",
                grade: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$$materialDetail.grade",
                        as: "grade",
                        cond: {
                          $eq: ["$$grade._id", "$grade_id"],
                        },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: "finishes",
          localField: "finish_id",
          foreignField: "_id",
          as: "lookup_finish",
        },
      },
      {
        $addFields: {
          lookup_finish: {
            $map: {
              input: "$lookup_finish",
              as: "finishDetail",
              in: {
                _id: "$$finishDetail._id",
                name: "$$finishDetail.name",
                code: "$$finishDetail.code",
                description: "$$finishDetail.description",
                color: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$$finishDetail.color",
                        as: "color",
                        cond: {
                          $eq: ["$$color._id", "$color_id"],
                        },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          },
        },
      },
      {
        $project: {
          system_id: 1,
          subsystem_id: 1,
          system: {
            $arrayElemAt: ["$lookup_system.system_detail.name", 0],
          },
          subsystem: {
            $arrayElemAt: [
              {
                $map: {
                  input: {
                    $arrayElemAt: [
                      "$lookup_system.system_detail.subsystems",
                      0,
                    ],
                  },
                  as: "subsystem",
                  in: "$$subsystem.name",
                },
              },
              0,
            ],
          },
          group: {
            $arrayElemAt: ["$lookup_group_subgroup.name", 0],
          },
          group_id: 1,
          subgroup_id: 1,
          subgroup: {
            $arrayElemAt: ["$lookup_group_subgroup.subgroup.name", 0],
          },
          supplier_id: 1,
          supplier: {
            $arrayElemAt: ["$lookup_supplier.name", 0],
          },
          material_id: 1,
          material: {
            $arrayElemAt: ["$lookup_material.name", 0],
          },
          grade_id: 1,
          grade: {
            $arrayElemAt: ["$lookup_material.grade.name", 0],
          },
          finish_id: 1,
          finish: {
            $arrayElemAt: ["$lookup_finish.name", 0],
          },
          color_id: 1,
          color: {
            $arrayElemAt: ["$lookup_finish.color.name", 0],
          },
          currency_id: {
            $arrayElemAt: ["$lookup_currency._id", 0],
          },
          currency: {
            $arrayElemAt: ["$lookup_currency.code", 0],
          },
        },
      },
      {
        $group: {
          _id: null, // Grouping everything to a single result set
          systems: {
            $addToSet: {
              id: "$system_id",
              name: "$system",
            },
          },
          subsystems: {
            $addToSet: {
              id: "$subsystem_id",
              name: "$subsystem",
              system_id: "$system_id",
            },
          },
          groups: {
            $addToSet: {
              id: "$group_id",
              name: "$group",
            },
          },
          subgroups: {
            $addToSet: {
              id: "$subgroup_id",
              name: "$subgroup",
              group_id: "$group_id",
            },
          },
          suppliers: {
            $addToSet: {
              id: "$supplier_id",
              name: "$supplier",
            },
          },
          materials: {
            $addToSet: {
              id: "$material_id",
              name: "$material",
            },
          },
          grades: {
            $addToSet: {
              id: "$grade_id",
              name: "$grade",
            },
          },
          finishes: {
            $addToSet: {
              id: "$finish_id",
              name: "$finish",
            },
          },
          colors: {
            $addToSet: {
              id: "$color_id",
              name: "$color",
            },
          },
          currencies: {
            $addToSet: {
              id: "$currency_id",
              name: "$currency",
            },
          },
        },
      },
      {
        $project: {
          _id: 0, // Exclude the `_id` field from the output
          systems: 1,
          subsystems: 1,
          groups: 1,
          subgroups: 1,
          suppliers: 1,
          materials: 1,
          grades: 1,
          finishes: 1,
          colors: 1,
          currencies: 1,
        },
      },
    ]);

    return res.json({
      system: filters[0].systems,
      subsystem: filters[0].subsystems,
      group: filters[0].groups,
      subgroup: filters[0].subgroups,
      supplier: filters[0].suppliers,
      material: filters[0].materials,
      grade: filters[0].grades,
      finish: filters[0].finishes,
      color: filters[0].colors,
      currency: filters[0].currencies,
    });
  } catch (error) {
    return res.status(500).json({ msg: error.message });
  }
};

//Seach code
const search_accessories_input_code = async (req, res) => {
  try {
    let { search } = req.query;
    let searchRegex = { $regex: new RegExp(".*" + search + ".*", "i") };
    const result = await Accessories_Input_Model.aggregate([
      {
        $match: {
          code: searchRegex,
        },
      },
      {
        $lookup: {
          from: "accessories_supplier_models",
          localField: "supplier_id",
          foreignField: "_id",
          as: "supplier_detail",
        },
      },
      {
        $addFields: {
          supplier: { $arrayElemAt: ["$supplier_detail.name", 0] },
          supplier_code: { $arrayElemAt: ["$supplier_detail.code", 0] },
        },
      },
      {
        $limit: 10,
      },
    ]);
    // find({
    //   code: searchRegex,
    // });
    // const result = await Accessories_Input_Model.aggregate([
    //   {
    //     $match: {
    //       code: searchRegex,
    //        ,
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "profile_calculators",
    //       localField: "code",
    //       foreignField: "code",
    //       as: "price_lists",
    //     },
    //   },
    //   {
    //     $match: {
    //       price_lists: { $not: { $size: 0 } }, // Ensure there's a match in the second table
    //     },
    //   },
    // ]);
    return res.status(200).json({ result: result });
  } catch (error) {
    console.log(error);
    res.status(500).json({ mssg: error?.message || "Internal server error" });
  }
};
const search_accessories_price_list = async (req, res) => {
  try {
    let { search } = req.query;
    let searchRegex = { $regex: new RegExp(".*" + search + ".*", "i") };
    const result = await AccessoriesCalculator.find({
      code: searchRegex,
    });
    return res.status(200).json({ result });
  } catch (error) {
    console.log(error);
    res.status(500).json({ mssg: error?.message || "Internal server error" });
  }
};
const search_acc_subsystem = async (req, res) => {
  try {
    const subsystem = await Accessories_Input_Model.aggregate([
      { $group: { _id: null, subsystem: { $addToSet: "$subsystem" } } },
    ]);
    return res.json({ subsystem });
  } catch (error) {
    console.log(error);
    res.status(500).json({ mssg: error?.message || "Internal server error" });
  }
};

//import
const import_excel_file = async (req, res) => {
  try {
    const file = req.file;
    const filePath = req.file.path;
    const workbook = xlsx.readFile(filePath);
    const sheetNames = workbook.SheetNames;
    const firstSheetName = sheetNames[0];
    const firstSheet = workbook.Sheets[firstSheetName];
    const jsonData = xlsx.utils.sheet_to_json(firstSheet);
    const rejected_entry = [];
    const colorMap = {
      Missing_Data: "FFFF0000", // Red
      Duplicate_Code: "FEFE00", // Yellow
      System_Supplier_Absent_In_DB: "FF00B050", // Green
      Unit_Mismatch: "FF7030A0", // Purple
      Mismatch_File_Data: "0000FF", //Blue
      Group_Subgroup_Mismatch: "C19A6B", //Brown
      Material_Grade_Finish_Color_Mismatch: "FFA600", //Orange
    };
    let rejectionReason = null;
    await Promise.all(
      jsonData.map(async (itm, idx) => {
        let if_system = await Profile_System_Model.findOne(
          {
            name: itm?.System_Name,
            system_detail: {
              $elemMatch: {
                name: itm?.System,
                "subsystems.name": itm?.Subsystem,
              },
            },
          },
          {
            "system_detail.$": 1,
          }
        );
        let if_supplier = await Accessories_Supplier_Model.findOne({
          name: itm?.Supplier,
        });
        let if_curr = await Currency_model.findOne({
          _id: if_supplier.currency_id,
        });
        const if_group_subgroup = await Group_Subgroup.findOne(
          { name: itm?.Group, "subgroup.name": itm?.Subgroup },
          { "subgroup.$": 1 }
        );
        let if_unit = await Units.findOne({
          unit_name: itm?.Unit_System,
          unit_detail: {
            $elemMatch: {
              description: itm?.Unit_Description,
              units: {
                $elemMatch: { code: itm?.Unit },
              },
            },
          },
        });
        let if_material_grade = await Materials.findOne(
          { name: itm?.Material, "grade.name": itm?.Grade },
          { "grade.$": 1 }
        );
        let if_finish_color = await Finish.findOne(
          { name: itm?.Finish, "color.name": itm?.Color },
          { "color.$": 1 }
        );
        let systemTags = [];
        if (itm.SystemTags.split(",").length) {
          let tags = itm.SystemTags.split(",");
          tags.map(async (tag) => {
            const ifTag = await Profile_System_Model.findOne(
              {
                system_detail: {
                  $elemMatch: {
                    code: tag,
                  },
                },
              },
              {
                "system_detail.$": 1,
              }
            );
            if (ifTag) {
              systemTags.push({ system_id: ifTag.system_detail[0]._id });
            }
          });
        }
        const if_vmc = await Accessories_Input_Model.find({
          $and: [
            { code: itm?.code },
            { supplier_id: if_supplier._id },
            { supplier_item_code: itm?.Supplier_Item_Code },
            { material_id: if_material_grade._id },
            { grade_id: if_material_grade.grade[0]._id },
            { finish_id: if_finish_color._id },
            { color_id: if_finish_color.color[0]._id },
          ],
        });
        if (
          !itm?.code ||
          !itm?.Image ||
          !itm?.Link ||
          !itm?.Filename ||
          !itm?.Date ||
          itm?.Revision_No == null ||
          itm?.Revision_No == undefined ||
          !itm?.Filetype ||
          !itm?.Description ||
          !itm?.System_Name ||
          !itm?.System ||
          !itm?.Subsystem ||
          !itm?.Group ||
          !itm?.Subgroup ||
          !itm?.Supplier ||
          !itm?.Supplier_Item_Code ||
          !itm?.Material ||
          !itm?.Grade ||
          !itm?.Finish ||
          !itm?.Color ||
          !itm?.Unit_System ||
          !itm?.Unit_Description ||
          !itm?.Unit ||
          itm?.Unit_Weight === undefined ||
          itm?.Unit_Weight === null ||
          typeof itm?.Unit_Weight !== "number" ||
          !itm?.Weight_Unit ||
          itm?.Cost === undefined ||
          itm?.Cost === null ||
          typeof itm?.Cost !== "number" ||
          itm?.RD === undefined ||
          itm?.RD === null ||
          typeof itm?.RD !== "number" ||
          itm?.Additional_Profit === undefined ||
          itm?.Additional_Profit === null ||
          typeof itm?.Additional_Profit !== "number" ||
          !itm?.Lead_Time
        ) {
          rejected_entry.push({
            reason: "Missing_Data",
            data: itm,
            color: colorMap["Missing_Data"],
          });
        } else {
          if (if_vmc.length > 0) {
            rejected_entry.push({
              reason: "Duplicate_Code",
              data: itm,
              color: colorMap["Duplicate_Code"],
            });
            return;
          } else if (!if_system || !if_supplier) {
            rejectionReason = "System_Supplier_Absent_In_DB";
            rejected_entry.push({
              reason: "System_Supplier_Absent_In_DB",
              data: itm,
              color: colorMap["System_Supplier_Absent_In_DB"],
            });
            return;
          } else if (
            !if_unit
            // itm.Weight_Unit !== "Kg" &&
            // itm.Weight_Unit !== "kg" &&
            // itm.Weight_Unit !== "Gm" &&
            // itm.Weight_Unit !== "gm" &&
            // itm.Weight_Unit !== "Mg" &&
            // itm.Weight_Unit !== "mg" &&
            // itm.Weight_Unit !== "Lb" &&
            // itm.Weight_Unit !== "lb" &&
            // itm.Weight_Unit !== "Oz" &&
            // itm.Weight_Unit !== "oz"
          ) {
            rejectionReason = "Unit_Mismatch";
            rejected_entry.push({
              reason: "Unit_Mismatch",
              data: itm,
              color: colorMap["Unit_Mismatch"],
            });
            return;
          } else if (!if_group_subgroup) {
            rejectionReason = "Group_Subgroup_Mismatch";
            rejected_entry.push({
              reason: "Group_Subgroup_Mismatch",
              data: itm,
              color: colorMap["Group_Subgroup_Mismatch"],
            });
            return;
          } else if (
            typeof itm.Revision_No !== "Number" &&
            itm.Filetype !== ".png" &&
            itm.Filetype !== ".PNG" &&
            itm.Filetype !== ".jpg" &&
            itm.Filetype !== ".JPG" &&
            itm.Filetype !== ".pdf" &&
            itm.Filetype !== ".PDF" &&
            itm.Filetype !== ".dwg" &&
            itm.Filetype !== ".DWG"
          ) {
            rejectionReason = "Mismatch_File_Data";
            rejected_entry.push({
              reason: "Mismatch_File_Data",
              data: itm,
              color: colorMap["Mismatch_File_Data"],
            });
            return;
          } else if (!if_material_grade || !if_finish_color) {
            rejectionReason = "Material_Grade_Finish_Color_Mismatch";
            rejected_entry.push({
              reason: "Material_Grade_Finish_Color_Mismatch",
              data: itm,
              color: colorMap["Material_Grade_Finish_Color_Mismatch"],
            });
            return;
          } else {
            const supersystem_id = if_system._id;
            const matchedSystem = if_system.system_detail[0];
            const system_id = matchedSystem._id;
            const matchedSubsystem = matchedSystem.subsystems.find(
              (sub) => sub.name === itm.Subsystem
            );
            const subsystem_id = matchedSubsystem?._id;
            const group_id = if_group_subgroup._id;
            const subgroup_id = if_group_subgroup.subgroup[0]._id;
            const supplier_id = if_supplier._id;
            const material_id = if_material_grade._id;
            const grade_id = if_material_grade.grade[0]._id;
            const finish_id = if_finish_color._id;
            const color_id = if_finish_color.color[0]._id;
            let new_entry = await Accessories_Input_Model.create({
              code: itm.code,
              image: itm.Image,
              description: itm.Description,
              supersystem_id,
              system_id,
              subsystem_id,
              group_id: group_id,
              subgroup_id: subgroup_id,
              supplier_id: supplier_id,
              // supplier: itm.Supplier,
              // supplier_code: if_supplier.code,
              supplier_item_code: itm.Supplier_Item_Code,
              material_id,
              grade_id,
              finish_id,
              color_id,
              unit_weight: itm.Unit_Weight,
              weight_unit: itm.Weight_Unit,
              unit_system: itm?.Unit_System,
              unit_description: itm?.Unit_Description,
              unit: itm.Unit,
              cost: itm.Cost,
              lead_time: itm.Lead_Time,
              // currency: if_curr.code,
              rd: itm.RD,
              additional_profit:
                itm.Additional_Profit === 0 ? 1 : itm.Additional_Profit,

              cost_to_aed: if_curr.cost_usd_per_kg_plus_fluctuation * itm.Cost,
              systemTags: systemTags,
              files: [
                {
                  link: itm.Link,
                  name: itm.Filename,
                  date: itm.Date,
                  revision: itm.Revision_No,
                  type: itm.Filetype,
                },
              ],
            });
          }
        }
      })
    );
    fs.unlinkSync(filePath);
    return res.status(200).json({ mssg: "File Imported", rejected_entry });
  } catch (error) {
    console.log(error);
    res.status(500).json({ mssg: error?.message || "Internal server error" });
  }
};
const acc_assigned_to = async (req, res) => {
  try {
    const { id } = req.params;
    const input = await Accessories_Input_Model.findById(id);
    const po = await Purchase_Model.aggregate([
      {
        $unwind: {
          path: "$parts",
        },
      },
      {
        $match: {
          status: "Active",
          "parts.ref_code_id": input._id,
        },
      },
      {
        $group: {
          _id: "$lpo",
        },
      },
      {
        $project: {
          name: "$lpo",
        },
      },
    ]);
    const project = await Project_Model.aggregate([
      {
        $unwind: {
          path: "$parts",
        },
      },
      {
        $match: {
          project_status: "Active",
          "parts.ref_code_id": input._id,
        },
      },
      {
        $group: {
          _id: "$project_name",
        },
      },
      {
        $project: {
          name: "$project_name",
        },
      },
    ]);
    const insulated = await Profile_Insulated_Input.aggregate([
      {
        $unwind: {
          path: "$polyamide",
        },
      },
      {
        $match: {
          "polyamide.code_id": input._id,
        },
      },
      {
        $project: {
          code: 1,
        },
      },
    ]);
    const kit = await Kit_Input.aggregate([
      {
        $unwind: {
          path: "$accessories",
        },
      },
      {
        $match: {
          "accessories.code_id": input._id,
        },
      },
      {
        $project: {
          code: 1,
        },
      },
    ]);
    const stock = await Stock_model.aggregate([
      {
        $match: {
          reference_code_id: input._id,
          //  ,
        },
      },
      {
        $project: {
          name: "$packing_code",
        },
      },
    ]);
    const loose_stock = await Loose_Stock_model.aggregate([
      {
        $match: {
          code_id: input._id,
          //  ,
        },
      },
      {
        $project: {
          name: input.code,
        },
      },
    ]);
    return res.status(200).json({
      po,
      project,
      insulated,
      kit,
      stock,
      loose_stock,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ mssg: error?.message || "Internal server error" });
  }
};

const get_acc_avlb_for_package = async (req, res) => {
  try {
    let { search } = req.query;
    let searchRegex = { $regex: new RegExp(".*" + search + ".*", "i") };
    const result = await Accessories_Input_Model.aggregate([
      {
        $lookup: {
          from: "stock_models", // Name of the Stock_model collection
          localField: "stock_detail", // Field from Accessories_Input_Model
          foreignField: "_id", // Field from Stock_model
          as: "stockDetails", // Output field containing matched documents from Stock_model
        },
      },
      {
        $lookup: {
          from: "loose_stock_models",
          localField: "_id",
          foreignField: "code_id",
          as: "LooseStock",
        },
      },
      {
        $lookup: {
          from: "accessories_supplier_models",
          localField: "supplier_id",
          foreignField: "_id",
          as: "supplierDetail",
        },
      },
      {
        $lookup: {
          from: "materials",
          localField: "material_id",
          foreignField: "_id",
          as: "lookup_material",
        },
      },
      {
        $addFields: {
          lookup_material: {
            $map: {
              input: "$lookup_material",
              as: "materialDetail",
              in: {
                _id: "$$materialDetail._id",
                name: "$$materialDetail.name",
                grade: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$$materialDetail.grade",
                        as: "grade",
                        cond: { $eq: ["$$grade._id", "$grade_id"] },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: "finishes",
          localField: "finish_id",
          foreignField: "_id",
          as: "lookup_finish",
        },
      },
      {
        $addFields: {
          lookup_finish: {
            $map: {
              input: "$lookup_finish",
              as: "finishDetail",
              in: {
                _id: "$$finishDetail._id",
                name: "$$finishDetail.name",
                code: "$$finishDetail.code",
                description: "$$finishDetail.description",
                color: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$$finishDetail.color",
                        as: "color",
                        cond: { $eq: ["$$color._id", "$color_id"] },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          supplier: { $arrayElemAt: ["$supplierDetail.name", 0] },
          supplier_code: { $arrayElemAt: ["$supplierDetail.code", 0] },
          material_id: 1,
          material: { $arrayElemAt: ["$lookup_material.name", 0] },
          grade_id: 1,
          grade: { $arrayElemAt: ["$lookup_material.grade.name", 0] },
          finish_id: 1,
          finish: { $arrayElemAt: ["$lookup_finish.name", 0] },
          color_id: 1,
          color: { $arrayElemAt: ["$lookup_finish.color.name", 0] },
        },
      },
      {
        $match: {
          code: searchRegex,
          $and: [
            { $expr: { $eq: [{ $size: "$stockDetails" }, 0] } }, // Check if stockDetails is empty
            { $expr: { $eq: [{ $size: "$LooseStock" }, 0] } }, // Check if LooseStock is empty
          ],
        },
      },
      {
        $limit: 20,
      },
    ]);

    return res.status(200).json({ result });
  } catch (error) {
    console.log(error);
    res.status(500).json({ mssg: error?.message || "Internal server error" });
  }
};
const acc_package_pl_helper = async (req, res) => {
  try {
    let skip = 0;
    let limit = 100;
    let hasMore = true;
    while (hasMore) {
      const input = await Stock_model.aggregate([
        { $skip: skip },
        { $limit: limit },
        {
          $match: {
            category: "Accessory",
          },
        },
        {
          $lookup: {
            from: "accessories_calculators",
            localField: "reference_code_id",
            foreignField: "input_model_id",
            as: "lookup_acc_calc",
          },
        },
        {
          $lookup: {
            from: "accessories_input_models",
            localField: "reference_code_id",
            foreignField: "_id",
            as: "lookup_acc",
          },
        },
        {
          $lookup: {
            from: "profile_system_models",
            localField: "lookup_acc.system_id",
            foreignField: "system_detail._id",
            as: "lookup_system",
          },
        },
        {
          $lookup: {
            from: "accessories_supplier_models",
            localField: "lookup_acc.supplier_id",
            foreignField: "_id",
            as: "lookup_supplier",
          },
        },
      ]);
      if (input.length == 0) {
        hasMore = false;
      } else {
        await Promise.all(
          input.map(async (itm) => {
            let package_origin_cost =
              itm.lookup_acc_calc[0]?.oc * itm?.packing_quantity +
              itm?.packing_cost;
            let landed_cost =
              itm.lookup_acc_calc[0]?.landing_cost * itm?.packing_quantity +
              itm?.packing_cost;
            let selling_price =
              itm.lookup_acc_calc[0]?.selling_price * itm?.packing_quantity +
              itm?.packing_cost;
            let pl1 =
              itm.lookup_acc_calc[0]?.priceList1 * itm?.packing_quantity +
              itm?.packing_cost;
            let pl2 =
              itm.lookup_acc_calc[0]?.priceList2 * itm?.packing_quantity +
              itm?.packing_cost;
            let pl3 =
              itm.lookup_acc_calc[0]?.priceList3 * itm?.packing_quantity +
              itm?.packing_cost;
            let pl4 =
              itm.lookup_acc_calc[0]?.priceList4 * itm?.packing_quantity +
              itm?.packing_cost;

            let updateFields = {
              origin_cost: package_origin_cost,
              landing_cost: landed_cost,
              selling_price: selling_price,
              priceList1: pl1,
              priceList2: pl2,
              priceList3: pl3,
              priceList4: pl4,
            };

            await Stock_model.findOneAndUpdate(
              { _id: itm._id },
              updateFields,
              { new: true },
              { upsert: true }
            );
          })
        );
        skip += limit;
      }
    }
    // const input = await Stock_model.aggregate([
    //   {
    //     $match: {
    //       category: "Accessory",
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "accessories_calculators",
    //       localField: "reference_code_id",
    //       foreignField: "input_model_id",
    //       as: "lookup_acc_calc",
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "accessories_input_models",
    //       localField: "reference_code_id",
    //       foreignField: "_id",
    //       as: "lookup_acc",
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "profile_system_models",
    //       localField: "lookup_acc.system_id",
    //       foreignField: "system_detail._id",
    //       as: "lookup_system",
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "accessories_supplier_models",
    //       localField: "lookup_acc.supplier_id",
    //       foreignField: "_id",
    //       as: "lookup_supplier",
    //     },
    //   },
    // ]);
    // await Promise.all(
    //   input.map(async (itm) => {
    //     let package_origin_cost =
    //       itm.lookup_acc_calc[0]?.oc * itm?.packing_quantity +
    //       itm?.packing_cost;
    //     let landed_cost =
    //       itm.lookup_acc_calc[0]?.landing_cost * itm?.packing_quantity +
    //       itm?.packing_cost;
    //     let selling_price =
    //       itm.lookup_acc_calc[0]?.selling_price * itm?.packing_quantity +
    //       itm?.packing_cost;
    //     let pl1 =
    //       itm.lookup_acc_calc[0]?.priceList1 * itm?.packing_quantity +
    //       itm?.packing_cost;
    //     let pl2 =
    //       itm.lookup_acc_calc[0]?.priceList2 * itm?.packing_quantity +
    //       itm?.packing_cost;
    //     let pl3 =
    //       itm.lookup_acc_calc[0]?.priceList3 * itm?.packing_quantity +
    //       itm?.packing_cost;
    //     let pl4 =
    //       itm.lookup_acc_calc[0]?.priceList4 * itm?.packing_quantity +
    //       itm?.packing_cost;

    //     let updateFields = {
    //       origin_cost: package_origin_cost,
    //       landing_cost: landed_cost,
    //       selling_price: selling_price,
    //       priceList1: pl1,
    //       priceList2: pl2,
    //       priceList3: pl3,
    //       priceList4: pl4,
    //     };

    //     await Stock_model.findOneAndUpdate(
    //       { _id: itm._id },
    //       updateFields,
    //       { new: true },
    //       { upsert: true }
    //     );
    //   })
    // );
    return true;
  } catch (error) {
    console.log(error);
    res.status(500).json({ mssg: error?.message || "Internal server error" });
  }
};
const acc_package_pl = async (req, res) => {
  try {
    const package_pl = await acc_package_pl_helper();
    return res.json({ package_pl });
  } catch (error) {
    console.log(error);
    res.status(500).json({ mssg: error?.message || "Internal server error" });
  }
};
const getPackagePriceList = async (req, res) => {
  try {
    let { search, page, getAll } = req.query;
    if (getAll) {
      let result = await Stock_model.find({
        $and: [{ category: "Accessory" }],
      })
        .populate({
          path: "reference_code_id",
          model: "Accessories_Input_Model",
        })
        .sort({ packing_code: 1 });

      return res.json({ result });
    } else {
      let searchRegex = { $regex: new RegExp(".*" + search + ".*", "i") };

      const limit = 10;
      const pageNumber = parseInt(page) || 1;
      const skip = (pageNumber - 1) * limit;
      let and = [{ category: "Accessory" }];
      let where = {
        $or: [{ packing_code: searchRegex }],
        $and: and,
      };

      let result = await Stock_model.find(where)
        .populate({
          path: "reference_code_id",
          model: "Accessories_Input_Model",
        })
        .limit(limit)
        .sort({ packing_code: 1 })
        .skip(skip);

      const totalCount = await Stock_model.countDocuments(where);
      const currentPage = pageNumber;
      const total_page = Math.ceil(totalCount / limit);
      return res.json({ result, currentPage, total_page, totalCount, limit });
    }
  } catch (error) {
    return res.status(500).json({ msg: error.message });
  }
};

const addFields = async (req, res) => {
  try {
    const allAccessory = await Profile_Input_Model.aggregate([
      {
        $lookup: {
          from: "profile_system_models", // Name of the collection for Profile_System_Model
          let: {
            systemField: "$system_id",
            subsystemField: "$subsystem_id",
          },
          pipeline: [
            {
              $unwind: "$system_detail",
            },
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$system_detail._id", "$$systemField"] },
                    {
                      $in: [
                        "$$subsystemField",
                        "$system_detail.subsystems._id",
                      ],
                    },
                  ],
                },
              },
            },
            {
              $addFields: {
                "system_detail.subsystems": {
                  $filter: {
                    input: "$system_detail.subsystems",
                    as: "subsystem",
                    cond: { $eq: ["$$subsystem._id", "$$subsystemField"] },
                  },
                },
              },
            },
          ],
          as: "lookup_system",
        },
      },
    ]);
    allAccessory.map(async (itm) => {
      const updatedAcc = await Profile_Input_Model.findByIdAndUpdate(itm._id, {
        $set: {
          supersystem_id: itm.lookup_system[0]._id,
        },
      });
    });
    return res.status(200).json({ mssg: "Done" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: error.message });
  }
};

module.exports = {
  add_supplier,
  get_all_suppliers,
  get_single_supplier,
  update_supplier,
  delete_supplier,
  assigned_suppliers,
  supplier_assigned_to,
  code_acc_to_supplier,
  code_acc_to_supplier_for_loose,
  acc_assigned_to,
  //inputs
  add_input,
  get_all_entry,
  get_single_entry,
  update_input,
  delete_input,
  create_duplicate_acc,

  //package
  get_acc_avlb_for_package,

  //price list
  price_calc_step2,
  price_calc_step2_Helper,
  get_pl_for_insulated,
  getPriceList,
  getGroups,
  search_accessories_input_code,
  search_accessories_price_list,
  search_acc_subsystem,
  import_excel_file,

  //package pl
  acc_package_pl_helper,
  acc_package_pl,
  getPackagePriceList,
  addFields,
};
