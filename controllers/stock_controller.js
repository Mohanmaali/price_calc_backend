const Stock_model = require("../models/stock_model");
const { Purchase_Model } = require("../models/purchase_order_model");
const Loose_Stock_model = require("../models/loose_stock_model");
const xlsx = require("xlsx");
const fs = require("fs");
const Accessories_Input_Model = require("../models/accessories_input_model");
const {
  Profile_Insulated_Input,
} = require("../models/profile_insulated_input");
const Profile_Input_Model = require("../models/profile_input_model");
const Kit_Input = require("../models/kit_model");
const Packaging_Unit = require("../models/packaging_unit_model");
const Packaging_Material = require("../models/packaging_material_model");
const Action_model = require("../models/actions_model");

const { refresh_kit_package_price_list } = require("./kit_controllers");
const { default: mongoose } = require("mongoose");
const Log_Model = require("../models/log");
const { LooseStockPopulate, checkInteger } = require("../config/common");
const Project_Model = require("../models/project_model");
const Notification_model = require("../models/notification_model");
const Inquiry_Model = require("../models/inquiry_model");

const get_all_stocks = async (req, res) => {
  try {
    let { page, filter, getAll } = req.query;
    let pipeline = [
      {
        $match: {
          active: true,
        },
      },
      // {
      //   $lookup: {
      //     from: "purchase_models",
      //     let: { stock_id: "$_id" },
      //     pipeline: [
      //       {
      //         $match: {
      //           status: "Active",
      //         },
      //       },
      //       { $unwind: "$parts" },
      //       {
      //         $match: {
      //           $expr: { $eq: ["$parts.code_id", "$$stock_id"] },
      //         },
      //       },
      //       { $unwind: "$parts.history" },
      //       {
      //         $lookup: {
      //           from: "history_models", // the name of the history model collection
      //           localField: "parts.history",
      //           foreignField: "_id",
      //           as: "historyDetails",
      //         },
      //       },
      //       { $unwind: "$historyDetails" },
      //       { $sort: { "historyDetails.eta": 1 } },
      //       { $limit: 1 },
      //       { $project: { eta: "$historyDetails.eta" } },
      //     ],
      //     as: "latest_eta",
      //   },
      // },
      {
        $lookup: {
          from: "purchase_models",
          let: { stock_id: "$_id" },
          pipeline: [
            {
              $match: {
                status: "Active"
              }
            },
            { $sort: { revision: -1 } },
            {
              $group: {
                _id: "$name",
                doc: { $first: "$$ROOT" }
              }
            },
            { $replaceRoot: { newRoot: "$doc" } },
            { $unwind: "$parts" },
            {
              $match: {
                $expr: {
                  $eq: [
                    "$parts.code_id",
                    "$$stock_id"
                  ]
                }
              }
            },
            {
              $lookup: {
                from: "history_models", // the name of the history model collection
                localField: "parts.history",
                foreignField: "_id",
                as: "historyDetails"
              }
            },
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $gt: [
                        { $size: "$historyDetails" },
                        0
                      ]
                    },
                    {
                      $allElementsTrue: {
                        $map: {
                          input: "$historyDetails",
                          as: "h",
                          in: {
                            $ne: ["$$h.eta", null]
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          ],
          as: "latest_eta"
        }
      },
      {
        $set: {
          last_etas: {
            $map: {
              input: "$latest_eta",
              as: "entry",
              in: {
                $let: {
                  vars: {
                    sorted: {
                      $sortArray: {
                        input:
                          "$$entry.historyDetails",
                        sortBy: { _id: 1 } // or use createdAt
                      }
                    }
                  },
                  in: {
                    $last: "$$sorted.eta"
                  }
                }
              }
            }
          }
        }
      },
      {
        $set: {
          eta: { $min: "$last_etas" }
        }
      },
      {
        $unset: "last_etas"
      },
      {
        $addFields: {
          // eta: { $arrayElemAt: ["$latest_eta.eta", 0] },
          total_avail: {
            $multiply: ["$packing_quantity", "$free_inventory"],
          },
          stock_type: "Package",
        },
      },
      {
        $lookup: {
          from: "accessories_input_models",
          localField: "reference_code_id",
          foreignField: "_id",
          as: "accessory_details",
        },
      },
      {
        $lookup: {
          from: "profile_input_models",
          localField: "reference_code_id",
          foreignField: "_id",
          as: "ni_details",
        },
      },
      {
        $lookup: {
          from: "profile_insulated_inputs",
          localField: "reference_code_id",
          foreignField: "_id",
          as: "ins_details",
        },
      },
      {
        $lookup: {
          from: "kit_inputs",
          localField: "reference_code_id",
          foreignField: "_id",
          as: "kit_details",
        },
      },
      {
        $addFields: {
          entry_details: {
            $switch: {
              branches: [
                {
                  case: { $eq: ["$category", "Accessory"] },
                  then: { $arrayElemAt: ["$accessory_details", 0] },
                },
                {
                  case: { $eq: ["$category", "Non-Insulated Profile"] },
                  then: { $arrayElemAt: ["$ni_details", 0] },
                },
                {
                  case: { $eq: ["$category", "Insulated Profile"] },
                  then: { $arrayElemAt: ["$ins_details", 0] },
                },
                {
                  case: { $eq: ["$category", "Kit"] },
                  then: { $arrayElemAt: ["$kit_details", 0] },
                },
              ],
              default: null,
            },
          },
        },
      },
      {
        $unset: [
          "accessory_details",
          "ni_details",
          "ins_details",
          "kit_details",
          "latest_eta",
        ],
      },
      {
        $unionWith: {
          coll: "loose_stock_models",
          pipeline: [
            {
              $match: {
                active: true,
              },
            },
            {
              $lookup: {
                from: "purchase_models",
                let: { stock_id: "$_id" },
                pipeline: [
                  {
                    $match: {
                      status: "Active"
                    }
                  },
                  { $sort: { revision: -1 } },
                  {
                    $group: {
                      _id: "$name",
                      doc: { $first: "$$ROOT" }
                    }
                  },
                  { $replaceRoot: { newRoot: "$doc" } },
                  { $unwind: "$parts" },
                  {
                    $match: {
                      $expr: {
                        $eq: [
                          "$parts.code_id",
                          "$$stock_id"
                        ]
                      }
                    }
                  },
                  {
                    $lookup: {
                      from: "history_models", // the name of the history model collection
                      localField: "parts.history",
                      foreignField: "_id",
                      as: "historyDetails"
                    }
                  },
                  {
                    $match: {
                      $expr: {
                        $and: [
                          {
                            $gt: [
                              { $size: "$historyDetails" },
                              0
                            ]
                          },
                          {
                            $allElementsTrue: {
                              $map: {
                                input: "$historyDetails",
                                as: "h",
                                in: {
                                  $ne: ["$$h.eta", null]
                                }
                              }
                            }
                          }
                        ]
                      }
                    }
                  }
                ],
                as: "latest_eta"
              }
            },
            {
              $set: {
                last_etas: {
                  $map: {
                    input: "$latest_eta",
                    as: "entry",
                    in: {
                      $let: {
                        vars: {
                          sorted: {
                            $sortArray: {
                              input:
                                "$$entry.historyDetails",
                              sortBy: { _id: 1 } // or use createdAt
                            }
                          }
                        },
                        in: {
                          $last: "$$sorted.eta"
                        }
                      }
                    }
                  }
                }
              }
            },
            {
              $set: {
                eta: { $min: "$last_etas" }
              }
            },
            {
              $unset: "last_etas"
            },
            {
              $addFields: {
                // eta: { $arrayElemAt: ["$latest_eta.eta", 0] },
                stock_type: "Loose",
              },
            },
            {
              $lookup: {
                from: "accessories_input_models",
                localField: "code_id",
                foreignField: "_id",
                as: "accessory_details",
              },
            },
            {
              $lookup: {
                from: "profile_input_models",
                localField: "code_id",
                foreignField: "_id",
                as: "ni_details",
              },
            },
            {
              $lookup: {
                from: "profile_insulated_inputs",
                localField: "code_id",
                foreignField: "_id",
                as: "ins_details",
              },
            },
            {
              $lookup: {
                from: "kit_inputs",
                localField: "code_id",
                foreignField: "_id",
                as: "kit_details",
              },
            },
            {
              $addFields: {
                entry_details: {
                  $switch: {
                    branches: [
                      {
                        case: { $eq: ["$category", "Accessory"] },
                        then: { $arrayElemAt: ["$accessory_details", 0] },
                      },
                      {
                        case: { $eq: ["$category", "Non-Insulated Profile"] },
                        then: { $arrayElemAt: ["$ni_details", 0] },
                      },
                      {
                        case: { $eq: ["$category", "Insulated Profile"] },
                        then: { $arrayElemAt: ["$ins_details", 0] },
                      },
                      {
                        case: { $eq: ["$category", "Kit"] },
                        then: { $arrayElemAt: ["$kit_details", 0] },
                      },
                    ],
                    default: null,
                  },
                },
              },
            },
            {
              $unset: [
                "accessory_details",
                "ni_details",
                "ins_details",
                "kit_details",
                "latest_eta",
              ],
            },
            {
              $lookup: {
                from: "accessories_supplier_models",
                localField: "entry_details.supplier_id",
                foreignField: "_id",
                as: "supplier_detail",
              },
            },
            {
              $lookup: {
                from: "profile_system_models", // Name of the collection for Profile_System_Model
                let: {
                  systemField: "$entry_details.system_id",
                  subsystemField: "$entry_details.subsystem_id",
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
                          cond: {
                            $eq: ["$$subsystem._id", "$$subsystemField"],
                          },
                        },
                      },
                    },
                  },
                ],
                as: "system_detail",
              },
            },
            {
              $lookup: {
                from: "group_subgroups",
                localField: "entry_details.group_id",
                foreignField: "_id",
                as: "group_detail",
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "accessories_supplier_models",
          localField: "entry_details.supplier_id",
          foreignField: "_id",
          as: "supplier_detail",
        },
      },
      {
        $lookup: {
          from: "profile_system_models", // Name of the collection for Profile_System_Model
          let: {
            systemField: "$entry_details.system_id",
            subsystemField: "$entry_details.subsystem_id",
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
          localField: "entry_details.group_id",
          foreignField: "_id",
          as: "group_detail",
        },
      },
      {
        $addFields: {
          group_detail: {
            $map: {
              input: "$group_detail",
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
                            "$entry_details.subgroup_id",
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
        $addFields: {
          supplier: { $arrayElemAt: ["$supplier_detail.name", 0] },
          supplier_id: { $arrayElemAt: ["$supplier_detail._id", 0] },
          supplier_code: { $arrayElemAt: ["$supplier_detail.code", 0] },
          system: { $arrayElemAt: ["$lookup_system.system_detail.name", 0] },
          system_id: { $arrayElemAt: ["$lookup_system.system_detail._id", 0] },
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
          subsystem_id: {
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
                  in: "$$subsystem._id",
                },
              },
              0,
            ],
          },
          group: { $arrayElemAt: ["$group_detail.name", 0] },
          group_id: { $arrayElemAt: ["$group_detail._id", 0] },
          subgroup: {
            $arrayElemAt: ["$group_detail.subgroup.name", 0],
          },
          subgroup_id: {
            $arrayElemAt: ["$group_detail.subgroup._id", 0],
          },
        },
      },
    ];
    if (getAll) {
      pipeline.push({ $sort: { createdAt: 1 } });
      const result = await Stock_model.aggregate(pipeline);
      return res.status(200).json({
        result,
      });
    } else {
      filter = filter ? JSON.parse(filter) : {};
      const limit = 8;
      const pageNumber = parseInt(page) || 1;
      const skip = (pageNumber - 1) * limit;
      let andConditions = [{}];
      const searchRegex = new RegExp(".*" + filter?.search + ".*", "i");
      if (filter?.category) {
        andConditions.push({ category: filter.category });
      }
      if (filter?.system) {
        andConditions.push({
          system_id: new mongoose.Types.ObjectId(filter.system),
        });
      }
      if (filter?.subsystem) {
        andConditions.push({
          subsystem_id: new mongoose.Types.ObjectId(filter.subsystem),
        });
      }
      if (filter?.group) {
        andConditions.push({
          group_id: new mongoose.Types.ObjectId(filter.group),
        });
      }
      if (filter?.subgroup) {
        andConditions.push({
          subgroup_id: new mongoose.Types.ObjectId(filter.subgroup),
        });
      }
      if (filter?.supplier) {
        andConditions.push({
          supplier_id: new mongoose.Types.ObjectId(filter.supplier),
        });
      }
      let where = {
        $or: [
          { "entry_details.code": searchRegex },
          { packing_code: searchRegex },
        ],
        $and: andConditions,
      };
      const countPipeline = [
        ...pipeline,
        { $match: where },
        // ADD ALL STAGES THAT GENERATE system_id, subsystem_id, etc.
        { $count: "totalCount" },
      ];

      const countResult = await Stock_model.aggregate(countPipeline);
      const totalCount = countResult.length > 0 ? countResult[0].totalCount : 0;
      const total_page = Math.ceil(totalCount / limit);

      pipeline.push(
        { $match: where },
        { $sort: { createdAt: 1 } },
        { $skip: skip },
        { $limit: limit }
      );
      const result = await Stock_model.aggregate(pipeline);
      // const [StockCount, LooseStockCount] = await Promise.all([
      //   Stock_model.countDocuments(where),
      //   Loose_Stock_model.countDocuments(where),
      // ]);
      return res.status(200).json({
        result,
        currentPage: pageNumber,
        total_page,
        totalCount,
        limit,
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};

const get_package_stock = async (req, res) => {
  try {
    let { search } = req.query;
    let searchRegex = { $regex: new RegExp(".*" + search + ".*", "i") };
    // const inventory_result = await Purchase_Model.aggregate([
    //   {
    //     $project: {
    //       _id: 0,
    //       code: { $arrayElemAt: ["$parts.code", 0] },
    //       category: { $arrayElemAt: ["$parts.type", 0] },
    //     },
    //   },
    //   {
    //     $match: {
    //       code: searchRegex,
    //     },
    //   },
    // ]);
    const result = await Stock_model.aggregate([
      {
        $match: {
          $and: [{ packing_code: searchRegex }, { active: true }],
        },
      },
      {
        $lookup: {
          from: "accessories_input_models",
          localField: "reference_code_id",
          foreignField: "_id",
          as: "accessory_details",
        },
      },
      {
        $lookup: {
          from: "profile_input_models",
          localField: "reference_code_id",
          foreignField: "_id",
          as: "ni_details",
        },
      },
      {
        $lookup: {
          from: "profile_insulated_inputs",
          localField: "reference_code_id",
          foreignField: "_id",
          as: "ins_details",
        },
      },
      {
        $lookup: {
          from: "kit_inputs",
          localField: "reference_code_id",
          foreignField: "_id",
          as: "kit_details",
        },
      },
      {
        $addFields: {
          entry_details: {
            $switch: {
              branches: [
                {
                  case: { $eq: ["$category", "Accessory"] },
                  then: { $arrayElemAt: ["$accessory_details", 0] },
                },
                {
                  case: { $eq: ["$category", "Non-Insulated Profile"] },
                  then: { $arrayElemAt: ["$ni_details", 0] },
                },
                {
                  case: { $eq: ["$category", "Insulated Profile"] },
                  then: { $arrayElemAt: ["$ins_details", 0] },
                },
                {
                  case: { $eq: ["$category", "Kit"] },
                  then: { $arrayElemAt: ["$kit_details", 0] },
                },
              ],
              default: null,
            },
          },
        },
      },
      {
        $lookup: {
          from: "profile_system_models", // Name of the collection for Profile_System_Model
          let: {
            systemField: "$entry_details.system_id",
            subsystemField: "$entry_details.subsystem_id",
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
          localField: "entry_details.group_id",
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
                            "$entry_details.subgroup_id",
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
          from: "accessories_supplier_models",
          localField: "entry_details.supplier_id",
          foreignField: "_id",
          as: "lookup_supplier",
        },
      },
      {
        $project: {
          _id: 1,
          packing_code: 1,
          reference_code_id: 1,
          entry_details: 1,
          category: 1,
          available: 1,
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
          supplier: { $arrayElemAt: ["$lookup_supplier.name", 0] },
          supplier_code: { $arrayElemAt: ["$lookup_supplier.code", 0] },
        },
      },
    ])
      .limit(25)
      .sort({ packing_code: 1 });
    return res.status(200).json({ result });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};
const get_stock_filter_data = async (req, res) => {
  try {
    const reference_code = await Stock_model.aggregate([
      {
        $group: { _id: null, reference_code: { $addToSet: "$reference_code" } },
      },
    ]);
    const filters = await Stock_model.aggregate([
      {
        $lookup: {
          from: "purchase_models", // the name of the purchase model collection
          let: { stock_id: "$_id" },
          pipeline: [
            {
              $match: {
                status: "Active",
              },
            },
            { $unwind: "$parts" },
            {
              $match: {
                $expr: {
                  $eq: ["$parts.code_id", "$$stock_id"],
                },
              },
            },
            { $unwind: "$parts.history" },
            {
              $lookup: {
                from: "history_models", // the name of the history model collection
                localField: "parts.history",
                foreignField: "_id",
                as: "historyDetails",
              },
            },
            { $unwind: "$historyDetails" },
            { $sort: { "historyDetails.eta": 1 } },
            { $limit: 1 },
            {
              $project: {
                eta: "$historyDetails.eta",
              },
            },
          ],
          as: "latest_eta",
        },
      },
      {
        $addFields: {
          eta: {
            $arrayElemAt: ["$latest_eta.eta", 0],
          },
          total_avail: {
            $multiply: ["$packing_quantity", "$free_inventory"],
          },
          stock_type: "Package",
        },
      },
      {
        $lookup: {
          from: "accessories_input_models",
          localField: "reference_code_id",
          foreignField: "_id",
          as: "accessory_details",
        },
      },
      {
        $lookup: {
          from: "profile_input_models",
          localField: "reference_code_id",
          foreignField: "_id",
          as: "ni_details",
        },
      },
      {
        $lookup: {
          from: "profile_insulated_inputs",
          localField: "reference_code_id",
          foreignField: "_id",
          as: "ins_details",
        },
      },
      {
        $lookup: {
          from: "kit_inputs",
          localField: "reference_code_id",
          foreignField: "_id",
          as: "kit_details",
        },
      },
      {
        $addFields: {
          entry_details: {
            $switch: {
              branches: [
                {
                  case: {
                    $eq: ["$category", "Accessory"],
                  },
                  then: {
                    $arrayElemAt: ["$accessory_details", 0],
                  },
                },
                {
                  case: {
                    $eq: ["$category", "Non-Insulated Profile"],
                  },
                  then: {
                    $arrayElemAt: ["$ni_details", 0],
                  },
                },
                {
                  case: {
                    $eq: ["$category", "Insulated Profile"],
                  },
                  then: {
                    $arrayElemAt: ["$ins_details", 0],
                  },
                },
                {
                  case: { $eq: ["$category", "Kit"] },
                  then: {
                    $arrayElemAt: ["$kit_details", 0],
                  },
                },
              ],
              default: null,
            },
          },
        },
      },
      {
        $unset: [
          "accessory_details",
          "ni_details",
          "ins_details",
          "kit_details",
          "latest_eta",
        ],
      },
      {
        $unionWith: {
          coll: "loose_stock_models",
          pipeline: [
            {
              $lookup: {
                from: "purchase_models", // the name of the purchase model collection
                let: { loose_stock_id: "$_id" },
                pipeline: [
                  {
                    $match: {
                      status: "Active",
                    },
                  },
                  { $unwind: "$parts" },
                  {
                    $match: {
                      $expr: {
                        $eq: ["$parts.code_id", "$$loose_stock_id"],
                      },
                    },
                  },
                  { $unwind: "$parts.history" },
                  {
                    $lookup: {
                      from: "history_models", // the name of the history model collection
                      localField: "parts.history",
                      foreignField: "_id",
                      as: "historyDetails",
                    },
                  },
                  { $unwind: "$historyDetails" },
                  {
                    $sort: {
                      "historyDetails.eta": 1,
                    },
                  },
                  { $limit: 1 },
                  {
                    $project: {
                      eta: "$historyDetails.eta",
                    },
                  },
                ],
                as: "latest_eta",
              },
            },
            {
              $addFields: {
                eta: {
                  $arrayElemAt: ["$latest_eta.eta", 0],
                },
                stock_type: "Loose",
              },
            },
            {
              $lookup: {
                from: "accessories_input_models",
                localField: "code_id",
                foreignField: "_id",
                as: "accessory_details",
              },
            },
            {
              $lookup: {
                from: "profile_input_models",
                localField: "code_id",
                foreignField: "_id",
                as: "ni_details",
              },
            },
            {
              $lookup: {
                from: "profile_insulated_inputs",
                localField: "code_id",
                foreignField: "_id",
                as: "ins_details",
              },
            },
            {
              $lookup: {
                from: "kit_inputs",
                localField: "code_id",
                foreignField: "_id",
                as: "kit_details",
              },
            },
            {
              $addFields: {
                entry_details: {
                  $switch: {
                    branches: [
                      {
                        case: {
                          $eq: ["$category", "Accessory"],
                        },
                        then: {
                          $arrayElemAt: ["$accessory_details", 0],
                        },
                      },
                      {
                        case: {
                          $eq: ["$category", "Non-Insulated Profile"],
                        },
                        then: {
                          $arrayElemAt: ["$ni_details", 0],
                        },
                      },
                      {
                        case: {
                          $eq: ["$category", "Insulated Profile"],
                        },
                        then: {
                          $arrayElemAt: ["$ins_details", 0],
                        },
                      },
                      {
                        case: {
                          $eq: ["$category", "Kit"],
                        },
                        then: {
                          $arrayElemAt: ["$kit_details", 0],
                        },
                      },
                    ],
                    default: null,
                  },
                },
              },
            },
            {
              $unset: [
                "accessory_details",
                "ni_details",
                "ins_details",
                "kit_details",
                "latest_eta",
              ],
            },
            {
              $lookup: {
                from: "accessories_supplier_models",
                localField: "entry_details.supplier_id",
                foreignField: "_id",
                as: "supplier_detail",
              },
            },
            {
              $lookup: {
                from: "profile_system_models", // Name of the collection for Profile_System_Model
                let: {
                  systemField: "$entry_details.system_id",
                  subsystemField: "$entry_details.subsystem_id",
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
                as: "system_detail",
              },
            },
            {
              $lookup: {
                from: "group_subgroups",
                localField: "entry_details.group_id",
                foreignField: "_id",
                as: "group_detail",
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "accessories_supplier_models",
          localField: "entry_details.supplier_id",
          foreignField: "_id",
          as: "supplier_detail",
        },
      },
      {
        $lookup: {
          from: "profile_system_models", // Name of the collection for Profile_System_Model
          let: {
            systemField: "$entry_details.system_id",
            subsystemField: "$entry_details.subsystem_id",
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
          localField: "entry_details.group_id",
          foreignField: "_id",
          as: "group_detail",
        },
      },
      {
        $addFields: {
          group_detail: {
            $map: {
              input: "$group_detail",
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
                            "$entry_details.subgroup_id",
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
        $project: {
          _id: 0,
          supplier_id: {
            $arrayElemAt: ["$supplier_detail._id", 0],
          },
          supplier: {
            $arrayElemAt: ["$supplier_detail.name", 0],
          },
          supplier_code: {
            $arrayElemAt: ["$supplier_detail.code", 0],
          },
          system_id: {
            $arrayElemAt: ["$lookup_system.system_detail._id", 0],
          },
          system: {
            $arrayElemAt: ["$lookup_system.system_detail.name", 0],
          },
          subsystem_id: {
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
                  in: "$$subsystem._id",
                },
              },
              0,
            ],
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
          group_id: {
            $arrayElemAt: ["$group_detail._id", 0],
          },
          group: {
            $arrayElemAt: ["$group_detail.name", 0],
          },
          subgroup_id: {
            $arrayElemAt: ["$group_detail.subgroup._id", 0],
          },
          subgroup: {
            $arrayElemAt: ["$group_detail.subgroup.name", 0],
          },
        },
      },
      {
        $group: {
          _id: null,
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
        },
      },
    ]);
    return res.status(200).json({
      // reference_code,
      // packing_unit,
      system: filters[0].systems,
      subsystem: filters[0].subsystems,
      group: filters[0].groups,
      subgroup: filters[0].subgroups,
      supplier: filters[0].suppliers,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};
const get_simple_package_filter_data = async (req, res) => {
  try {
    const { category } = req.query;
    const packing_unit = await Stock_model.aggregate([
      {
        $match: {
          category: category,
        },
      },
      {
        $group: { _id: null, packing_unit: { $addToSet: "$packing_unit" } },
      },
    ]);
    return res.status(200).json({
      packing_unit,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};
const get_for_prefill_lpo = async (req, res) => {
  try {
    const { selectedCode, code_supplier } = req.query;
    const stocks = [];
    await Promise.all(
      selectedCode.map(async (itm) => {
        let stock_detail;
        if (itm.order_type === "Loose") {
          if (!mongoose.Types.ObjectId.isValid(itm.code_id)) {
            throw new Error("Invalid ObjectId");
          }
          stock_detail = await Loose_Stock_model.aggregate([
            {
              $match: {
                _id: new mongoose.Types.ObjectId(itm.code_id),
              },
            },
            {
              $lookup: {
                from: "accessories_input_models",
                localField: "code_id",
                foreignField: "_id",
                as: "accessory_detail",
              },
            },
            {
              $lookup: {
                from: "profile_input_models",
                localField: "code_id",
                foreignField: "_id",
                as: "ni_detail",
              },
            },
            {
              $lookup: {
                from: "profile_insulated_inputs",
                localField: "code_id",
                foreignField: "_id",
                as: "ins_detail",
              },
            },
            {
              $lookup: {
                from: "kit_inputs",
                localField: "code_id",
                foreignField: "_id",
                as: "kit_detail",
              },
            },
            {
              $addFields: {
                details: {
                  $switch: {
                    branches: [
                      {
                        case: {
                          $eq: ["$category", "Accessory"],
                        },
                        then: {
                          $arrayElemAt: ["$accessory_detail", 0],
                        },
                      },
                      {
                        case: {
                          $eq: ["$category", "Non-Insulated Profile"],
                        },
                        then: {
                          $arrayElemAt: ["$ni_detail", 0],
                        },
                      },
                      {
                        case: {
                          $eq: ["$category", "Insulated Profile"],
                        },
                        then: {
                          $arrayElemAt: ["$ins_detail", 0],
                        },
                      },
                      {
                        case: { $eq: ["$category", "Kit"] },
                        then: {
                          $arrayElemAt: ["$kit_detail", 0],
                        },
                      },
                    ],
                    default: null, // Default value if none of the conditions match
                  },
                },
              },
            },
            {
              $addFields: {
                ordered: 0,
                received: 0,
                cost: 0,
                eta: new Date(),
                description: "$details.description",
              },
            },
            {
              $project: {
                code: "$details.code",
                reference_code: "$details.code",
                code_id: "$_id",
                ref_code_id: "$details._id",
                ordered: 1,
                type: "$category",
                description: 1,
                received: 1,
                cost: 1,
                eta: 1,
                order_type: "Loose",
                free: "$free_inventory",
                msq: 1,
              },
            },
          ]);
        } else if (itm.order_type === "Package") {
          if (!mongoose.Types.ObjectId.isValid(itm.code_id)) {
            throw new Error("Invalid ObjectId");
          }
          stock_detail = await Stock_model.aggregate([
            {
              $match: {
                _id: new mongoose.Types.ObjectId(itm.code_id),
                reference_code_id: new mongoose.Types.ObjectId(itm.ref_code_id),
              },
            },
            {
              $lookup: {
                from: "accessories_input_models",
                localField: "reference_code_id",
                foreignField: "_id",
                as: "accessory_detail",
              },
            },
            {
              $lookup: {
                from: "profile_input_models",
                localField: "reference_code_id",
                foreignField: "_id",
                as: "ni_detail",
              },
            },
            {
              $lookup: {
                from: "profile_insulated_inputs",
                localField: "reference_code_id",
                foreignField: "_id",
                as: "ins_detail",
              },
            },
            {
              $lookup: {
                from: "kit_inputs",
                localField: "reference_code_id",
                foreignField: "_id",
                as: "kit_detail",
              },
            },
            {
              $addFields: {
                details: {
                  $switch: {
                    branches: [
                      {
                        case: {
                          $eq: ["$category", "Accessory"],
                        },
                        then: {
                          $arrayElemAt: ["$accessory_detail", 0],
                        },
                      },
                      {
                        case: {
                          $eq: ["$category", "Non-Insulated Profile"],
                        },
                        then: {
                          $arrayElemAt: ["$ni_detail", 0],
                        },
                      },
                      {
                        case: {
                          $eq: ["$category", "Insulated Profile"],
                        },
                        then: {
                          $arrayElemAt: ["$ins_detail", 0],
                        },
                      },
                      {
                        case: { $eq: ["$category", "Kit"] },
                        then: {
                          $arrayElemAt: ["$kit_detail", 0],
                        },
                      },
                    ],
                    default: null, // Default value if none of the conditions match
                  },
                },
              },
            },
            {
              $addFields: {
                ordered: 0,
                received: 0,
                cost: 0,
                eta: new Date(),
                description: "$details.description",
              },
            },
            {
              $project: {
                code: "$packing_code",
                reference_code: "$details.code",
                code_id: "$_id",
                ref_code_id: "$reference_code_id",
                ordered: 1,
                type: "$category",
                description: 1,
                received: 1,
                cost: 1,
                eta: 1,
                order_type: "Package",
                free: "$free_inventory",
                msq: 1,
              },
            },
          ]);
        }

        if (stock_detail && stock_detail.length > 0) {
          stocks.push(stock_detail[0]);
        }
      })
    );
    return res.status(200).json(stocks);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};
const get_all_loose_stock = async (req, res) => {
  try {
    let { search, page, filter } = req.query;
    const limit = 25;
    const pageNumber = parseInt(page) || 1;
    const skip = (pageNumber - 1) * limit;
    let and = [{}];
    const searchRegex = new RegExp(".*" + search + ".*", "i");
    if (filter?.category) {
      and.push({ category: filter.category });
    }
    let where = {
      $or: [{ code: searchRegex }],
      $and: and,
    };

    const result = await Loose_Stock_model.aggregate([
      {
        $match: {
          active: true,
        },
      },
      {
        $lookup: {
          from: "accessories_input_models",
          localField: "code_id",
          foreignField: "_id",
          as: "accessory_detail",
        },
      },
      {
        $lookup: {
          from: "profile_input_models",
          localField: "code_id",
          foreignField: "_id",
          as: "ni_detail",
        },
      },
      {
        $lookup: {
          from: "profile_insulated_inputs",
          localField: "code_id",
          foreignField: "_id",
          as: "ins_detail",
        },
      },
      {
        $lookup: {
          from: "kit_inputs",
          localField: "code_id",
          foreignField: "_id",
          as: "kit_detail",
        },
      },
      {
        $addFields: {
          details: {
            $switch: {
              branches: [
                {
                  case: {
                    $eq: ["$category", "Accessory"],
                  },
                  then: {
                    $arrayElemAt: ["$accessory_detail", 0],
                  },
                },
                {
                  case: {
                    $eq: ["$category", "Non-Insulated Profile"],
                  },
                  then: {
                    $arrayElemAt: ["$ni_detail", 0],
                  },
                },
                {
                  case: {
                    $eq: ["$category", "Insulated Profile"],
                  },
                  then: {
                    $arrayElemAt: ["$ins_detail", 0],
                  },
                },
                {
                  case: { $eq: ["$category", "Kit"] },
                  then: {
                    $arrayElemAt: ["$kit_detail", 0],
                  },
                },
              ],
              default: null, // Default value if none of the conditions match
            },
          },
        },
      },
      {
        $lookup: {
          from: "profile_system_models", // Name of the collection for Profile_System_Model
          let: {
            systemField: "$details.system_id",
            subsystemField: "$details.subsystem_id",
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
          localField: "details.group_id",
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
                          $eq: ["$$subgroupEntry._id", "$details.subgroup_id"],
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
          localField: "details.supplier_id",
          foreignField: "_id",
          as: "lookup_supplier",
        },
      },
      {
        $project: {
          _id: 1,
          code_id: 1,
          available: 1,
          expected: 1,
          reserve: 1,
          free_inventory: 1,
          total_ordered: 1,
          total_received: 1,
          total_balance: 1,
          avg_price: 1,
          value_purchased: 1,
          createdAt: 1,
          updatedAt: 1,
          category: 1,
          details: 1,

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
          supplier: { $arrayElemAt: ["$lookup_supplier.name", 0] },
          supplier_code: { $arrayElemAt: ["$lookup_supplier.code", 0] },
        },
      },
      {
        $match: {
          $and: [{ "details.code": searchRegex }],
        },
      },
    ]);
    const totalCount = await Loose_Stock_model.countDocuments(where);
    const currentPage = pageNumber;
    const total_page = Math.ceil(totalCount / limit);

    return res
      .status(200)
      .json({ result, currentPage, total_page, totalCount, limit });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};
const get_avlb_for_package = async (req, res) => {
  try {
    const { type } = req.params;
    const result = await Stock_model.aggregate([
      {
        $lookup: {
          from: "Accessories_Input_Model",
          localField: "reference_code",
          foreignField: "code",
          as: "matched_docs",
        },
      },
      {
        $match: {
          matched_docs: { $eq: [] }, // Filter out documents without matches in collection2
        },
      },
    ]);
    return res.status(200).json(result);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};
const get_code_from_ref = async (req, res) => {
  try {
    const { ref } = req.params;
    const codes = await Stock_model.find({ reference_code: ref });
    return res.status(200).json(codes);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};

function isNumeric(value) {
  if (typeof value === "number") {
    return Number.isInteger(value); // Only allow integers
  }

  if (typeof value === "string") {
    // Trim whitespace and test against an integer-only regular expression
    return /^-?\d+$/.test(value.trim());
  }

  return false;
}

const update_open = async (req, res) => {
  try {
    const { id } = req.params;
    const open = req.body.openToUpdate;
    if (!isNumeric(open)) {
      return res
        .status(400)
        .json({ mssg: "Wrong Data Type or decimal value not allowed" });
    }
    const { stockType } = req.body;
    const openInt = parseFloat(open);
    if (stockType == "Package") {
      const ifStock = await Stock_model.findById(id);
      // const updatedStock = await Stock_model.findByIdAndUpdate(
      //   id,
      //   {
      //     $set: {
      //       open: open,
      //       free_inventory: ifStock.free_inventory + (open - ifStock.open),
      //       available: ifStock.available + (open - ifStock.open),
      //     },
      //   },
      //   { new: true }
      // );
      const updatedStock = await Stock_model.findByIdAndUpdate(
        id,
        [
          {
            $set: {
              open: 0,
              available: { $add: ["$available", openInt] },
              total_available: { $add: ["$total_available", openInt] },
              free_inventory: {
                $subtract: [
                  { $add: ["$total_available", openInt] },
                  "$reserve",
                ],
              },
            },
          },
        ],
        { new: true }
      );
      const StockLog = await Log_Model.create({
        stock_id: id,
        ref_code_id: updatedStock.reference_code_id,
        category: updatedStock.category,
        stockType: "Package",
        description: `Open Quantity updated for ${updatedStock.packing_code}, Open:${open}, Free:${ifStock.free_inventory} + (${open} - ${ifStock.open}), Available:${ifStock.available} + (${open} - ${ifStock.open})`,
        snapShot: updatedStock.toObject(),
        updateType: "Open",
        updatedBy: req.user.id,
      });
      let stock_qty = updatedStock.free_inventory;

      if (stock_qty < updatedStock.msq) {
        const if_action = await Action_model.findOne({
          code_id: updatedStock._id,
          // ref_code_id: updatedStock.reference_code_id,
        });
        if (!if_action) {
          const new_notification = await Action_model.create({
            code_id: updatedStock._id,
            ref_code_id: updatedStock.reference_code_id,
            category: updatedStock.category,
          });
        }
      } else if (stock_qty >= updatedStock.msq) {
        const deleted_notification = await Action_model.deleteMany({
          code_id: updatedStock._id,
          // ref_code_id: updatedStock.reference_code_id,
        });
      }
    } else if (stockType == "Loose") {
      const ifStock = await Loose_Stock_model.findById(id);
      // const updatedStock = await Loose_Stock_model.findByIdAndUpdate(
      //   id,
      //   {
      //     $set: {
      //       open: open,
      //       free_inventory: ifStock.free_inventory + (open - ifStock.open),
      //       available: ifStock.available + (open - ifStock.open),
      //     },
      //   },
      //   { new: true }
      // );
      const updatedStock = await Loose_Stock_model.findByIdAndUpdate(
        id,
        // {
        //   $set: {
        //     open: 0,
        //   },
        //   $inc: {
        //     free_inventory: openInt,
        //     available: openInt,
        //     total_available: openInt,
        //   },
        // },
        [
          {
            $set: {
              open: 0,
              available: { $add: ["$available", openInt] },
              total_available: { $add: ["$total_available", openInt] },
              free_inventory: {
                $subtract: [
                  { $add: ["$total_available", openInt] },
                  "$reserve",
                ],
              },
            },
          },
        ],
        { new: true }
      );
      const LooseDetail = await LooseStockPopulate(id);
      const LooseLog = await Log_Model.create({
        stock_id: id,
        ref_code_id: updatedStock.code_id,
        category: updatedStock.category,
        stockType: "Loose",
        description: `Open Quantity updated for ${LooseDetail[0]?.entry_details?.code}, Open:${open}, Free:${ifStock.free_inventory} + (${open} - ${ifStock.open}), Available:${ifStock.available} + (${open} - ${ifStock.open})`,
        snapShot: updatedStock.toObject(),
        updateType: "Open",
        updatedBy: req.user.id,
      });
      let stock_qty = updatedStock.free_inventory;

      if (stock_qty < updatedStock.msq) {
        const if_action = await Action_model.findOne({
          code_id: updatedStock._id,
          // ref_code_id: updatedStock.reference_code_id,
        });
        if (!if_action) {
          const new_notification = await Action_model.create({
            code_id: updatedStock._id,
            ref_code_id: updatedStock.code_id,
            category: updatedStock.category,
            order_type: "Loose",
          });
        }
      } else if (stock_qty >= updatedStock.msq) {
        const deleted_notification = await Action_model.deleteMany({
          code_id: updatedStock._id,
          // ref_code_id: updatedStock.reference_code_id,
        });
      }
    }
    return res.status(200).json({ mssg: "Open updated" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};
const update_location = async (req, res) => {
  try {
    const { id } = req.params;
    const location = req.body.warehouseLocation;
    const { type } = req.body.entryDataforLocation;
    if (type == "Package") {
      const updatedStock = await Stock_model.findByIdAndUpdate(id, {
        location: location,
      });
      const StockLog = await Log_Model.create({
        stock_id: id,
        ref_code_id: updatedStock.reference_code_id,
        category: updatedStock.category,
        stockType: "Package",
        description: `Location Updated for Package ${updatedStock.packing_code}`,
        snapShot: updatedStock.toObject(),
      });
    } else if (type == "Loose") {
      const ifLoose = await Loose_Stock_model.findByIdAndUpdate(id, {
        location: location,
      });
      const LooseDetail = await LooseStockPopulate(id);
      const LooseLog = await Log_Model.create({
        stock_id: id,
        ref_code_id: ifLoose.code_id,
        category: ifLoose.category,
        stockType: "Loose",
        description: `Location Updated for Loose Stock ${LooseDetail[0]?.entry_details?.code}`,
        snapShot: ifLoose.toObject(),
      });
    }
    return res.status(200).json({ mssg: "Location updated" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};

const import_stock = async (req, res) => {
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
      Code_Non_Exist: "FEFE00", // Yellow
      // Duplicate_Code: "FFFFC000", // Purple
      // Category_Non_Exist: "FF00B050", // Green
      // Packing_Unit_Mismatch: "0000FF", //Blue
      // Packing_Material_Mismatch: "C19A6B", //Brown//Orange
      // Group_Subgroup_Mismatch: "FFA500", //Orange
    };
    let rejectionReason = null;
    await Promise.all(
      jsonData.map(async (itm, idx) => {
        let ifStock = await Stock_model.findOne({
          packing_code: itm?.Packing_Code,
        });
        if (
          !itm?.Packing_Code ||
          itm?.Open === undefined ||
          itm?.Open === null ||
          typeof itm?.Open !== "number"
        ) {
          rejected_entry.push({
            reason: "Missing_Data",
            data: itm,
            color: colorMap["Missing_Data"],
          });
        } else {
          if (!ifStock) {
            rejected_entry.push({
              reason: "Code_Non_Exist",
              data: itm,
              color: colorMap["Code_Non_Exist"],
            });
            return;
          } else {
            const updatedStock = await Stock_model.findOneAndUpdate(
              { packing_code: itm.Packing_Code },
              // {
              //   $set: {
              //     open: 0,
              //   },
              //   $inc: {
              //     free_inventory: itm.Open,
              //     available: itm.Open,
              //     total_available: itm.Open,
              //   },
              // }
              [
                {
                  $set: {
                    open: 0,
                    available: { $add: ["$available", openInt] },
                    total_available: { $add: ["$total_available", openInt] },
                    free_inventory: {
                      $subtract: [
                        { $add: ["$total_available", openInt] },
                        "$reserve",
                      ],
                    },
                  },
                },
              ],
              { new: true }
            );
            let stock_qty = updatedStock.free_inventory;
            if (stock_qty < updatedStock.msq) {
              const if_action = await Action_model.findOne({
                code_id: updatedStock._id,
              });
              if (!if_action) {
                const new_notification = await Action_model.create({
                  code_id: updatedStock._id,
                  ref_code_id: updatedStock.reference_code_id,
                  category: updatedStock.category,
                  order_type: "Package",
                });
              }
            } else if (stock_qty >= updatedStock.msq) {
              const deleted_notification = await Action_model.deleteMany({
                code_id: updatedStock._id,
              });
            }
          }
        }
      })
    );
    fs.unlinkSync(filePath);
    return res.status(200).json({ mssg: "File Imported", rejected_entry });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};

const package_pl_helper = async () => {
  try {
    await refresh_kit_package_price_list();
    const stocks = await Stock_model.find();
    return stocks;
  } catch (error) {
    console.log(error);
    return error;
  }
};

const package_pl = async (req, res) => {
  try {
    const stocks_pl = await package_pl_helper();
    return res.status(200).json(stocks_pl);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};
const get_packages_list_for_loose = async (req, res) => {
  try {
    const { id } = req.params;
    const stocks = await Stock_model.find({ reference_code_id: id });
    return res.status(200).json(stocks);
  } catch (error) {
    console.log(err);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};
const convert_loose_to_package = async (req, res) => {
  try {
    const { looseStock, package } = req.body;
    let move_amount = req.body.move_amount;
    if (!checkInteger(move_amount)) {
      return res.status(400).json({ mssg: "Move amount must be integer." });
    }
    move_amount = parseInt(move_amount);
    if (move_amount > looseStock.free_inventory) {
      return res
        .status(400)
        .json({ mssg: "Please enter valid quantity to move" });
    }
    // const updatedLoose = await Loose_Stock_model.findByIdAndUpdate(
    //   looseStock._id,
    //   {
    //     $inc: {
    //       available: -move_amount,
    //       free_inventory: -move_amount,
    //     },
    //   },
    //   {
    //     new: true,
    //   }
    // );
    let updatedLoose = {};
    const LooseDetail = await LooseStockPopulate(looseStock._id);
    if (looseStock.open >= move_amount) {
      updatedLoose = await Loose_Stock_model.findOneAndUpdate(
        { _id: looseStock._id },
        {
          $inc: {
            open: -move_amount,
            available: -move_amount,
            free_inventory: -move_amount,
            total_available: -move_amount,
          },
        },
        { new: true }
      );
      const LooseLog = await Log_Model.create({
        stock_id: looseStock._id,
        ref_code_id: looseStock.code_id,
        category: looseStock.category,
        stockType: "Loose",
        description: `Action: Loose To Package for ${LooseDetail[0]?.entry_details?.code}(Condition Open >= move amount), Open-=${move_amount}, Free-=${move_amount}, Available-=${move_amount} `,
        snapShot: updatedLoose.toObject(),
      });
    } else if (looseStock.open < move_amount && looseStock.open !== 0) {
      let open_till_zero = move_amount - looseStock.open;
      updatedLoose = await Loose_Stock_model.findOneAndUpdate(
        { _id: looseStock._id },
        {
          $set: {
            open: 0,
          },
          $inc: {
            available: -(looseStock.open + open_till_zero),
            free_inventory: -(looseStock.open + open_till_zero),
          },
        },
        { new: true }
      );
      const LooseLog = await Log_Model.create({
        stock_id: looseStock._id,
        ref_code_id: looseStock.code_id,
        category: looseStock.category,
        stockType: "Loose",
        description: `Action: Loose To Package for ${LooseDetail[0]?.entry_details?.code}(Condition Open < move amount && Open!=0), Open=0, Free-=(${looseStock.open}+${open_till_zero}), Available-=(${looseStock.open}+${open_till_zero}) `,
        snapShot: updatedLoose.toObject(),
      });
    } else if (looseStock.open === 0) { // only this condition will work, rest 2 will never be triggered
      updatedLoose = await Loose_Stock_model.findOneAndUpdate(
        { _id: looseStock._id },
        [
          {
            $set: {
              available: { $subtract: ["$available", move_amount] },
              total_available: { $subtract: ["$total_available", move_amount] },
              free_inventory: {
                $subtract: [
                  { $subtract: ["$total_available", move_amount] },
                  "$reserve",
                ],
              },
            },
          },
        ],
        { new: true }
      );

      const LooseLog = await Log_Model.create({
        stock_id: looseStock._id,
        ref_code_id: looseStock.code_id,
        category: looseStock.category,
        stockType: "Loose",
        description: `Action: Loose To Package for ${LooseDetail[0]?.entry_details?.code}(Condition Open===0), Free-=${move_amount}, Available-=${move_amount} `,
        snapShot: updatedLoose.toObject(),
      });
    }
    //checking quantity for loose and creating action for loose
    let loose_stock_qty = updatedLoose.free_inventory;
    if (loose_stock_qty < updatedLoose.msq) {
      const if_action = await Action_model.findOne({
        code_id: updatedLoose._id,
      });
      if (!if_action) {
        const new_notification = await Action_model.create({
          code_id: updatedLoose._id,
          ref_code_id: updatedLoose.code_id,
          category: updatedLoose.category,
          order_type: "Loose",
        });
      }
    } else if (loose_stock_qty > updatedLoose.msq) {
      const deleted_notification = await Action_model.deleteMany({
        code_id: updatedLoose._id,
      });
    }

    const UpdatedPackage = await Stock_model.findByIdAndUpdate(
      package._id,
      [
        {
          $set: {
            available: {
              $add: ["$available", move_amount / package.packing_quantity],
            },
            total_available: {
              $add: [
                "$total_available",
                move_amount / package.packing_quantity,
              ],
            },
            free_inventory: {
              $subtract: [
                {
                  $add: [
                    "$total_available",
                    move_amount / package.packing_quantity,
                  ],
                },
                "$reserve",
              ],
            },
          },
        },
      ],
      { new: true }
    );

    const StockLog = await Log_Model.create({
      stock_id: package._id,
      ref_code_id: UpdatedPackage.reference_code_id,
      category: UpdatedPackage.category,
      stockType: "Package",
      description: `Action: Loose to Package for ${UpdatedPackage.packing_code}, Free+=${move_amount}/${package.packing_quantity}, Available+=${move_amount}/${package.packing_quantity}`,
      snapShot: UpdatedPackage.toObject(),
    });
    let stock_qty = UpdatedPackage.free_inventory;
    if (stock_qty < UpdatedPackage.msq) {
      const if_action = await Action_model.findOne({
        code_id: UpdatedPackage._id,
      });
      if (!if_action) {
        const new_notification = await Action_model.create({
          code_id: UpdatedPackage._id,
          ref_code_id: UpdatedPackage.reference_code_id,
          order_type: "Package",
          category: UpdatedPackage.category,
        });
      }
    } else if (stock_qty >= UpdatedPackage.msq) {
      const deleted_notification = await Action_model.findOneAndDelete({
        code_id: UpdatedPackage._id,
      });
    }
    return res.status(200).json({ mssg: "Converted Successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};

const convert_package_to_loose = async (req, res) => {
  try {
    const { stock } = req.body;
    let move_amount = req.body.move_amount;
    if (!checkInteger(move_amount)) {
      return res.status(400).json({ mssg: "Move amount must be integer." });
    }
    move_amount = parseInt(move_amount);
    const ifLoose = await Loose_Stock_model.findOne({
      code_id: stock.reference_code_id,
    });
    if (!ifLoose) {
      return res.status(400).json({
        mssg: `Loose Stock Not Found For Code: ${stock.packing_code}`,
      });
    }
    // Deducting From Package and Actions Logic
    // const updatedStock = await Stock_model.findByIdAndUpdate(
    //   { _id: stock._id },
    //   {
    //     $inc: {
    //       free_inventory: -move_amount,
    //       available: -move_amount,
    //     },
    //   },
    //   { new: true }
    // );
    let updatedStock = {};
    if (stock.open >= move_amount) {
      updatedStock = await Stock_model.findOneAndUpdate(
        { _id: stock._id },
        {
          $inc: {
            open: -move_amount,
            available: -move_amount,
            free_inventory: -move_amount,
          },
        },
        { new: true }
      );
      const StockLog = await Log_Model.create({
        stock_id: stock._id,
        ref_code_id: updatedStock.reference_code_id,
        category: updatedStock.category,
        stockType: "Package",
        description: `Action: Package To Loose for ${updatedStock.packing_code}(Condition Open >= move amount), Open-=${move_amount}, Free-=${move_amount}, Available-=${move_amount} `,
        snapShot: updatedStock.toObject(),
      });
    } else if (stock.open < move_amount && stock.open !== 0) {
      let open_till_zero = move_amount - stock.open;
      updatedStock = await Stock_model.findOneAndUpdate(
        { _id: stock._id },
        {
          $set: {
            open: 0,
          },
          $inc: {
            available: -(stock.open + open_till_zero),
            free_inventory: -(stock.open + open_till_zero),
          },
        },
        { new: true }
      );
      const StockLog = await Log_Model.create({
        stock_id: stock._id,
        ref_code_id: updatedStock.reference_code_id,
        category: updatedStock.category,
        stockType: "Package",
        description: `Action: Package To Loose for ${updatedStock.packing_code}(Condition Open < move amount && Open!=0), Open=0, Free-=(${stock.open}+${open_till_zero}), Available-=(${stock.open}+${open_till_zero}) `,
        snapShot: updatedStock.toObject(),
      });
    } else if (stock.open === 0) {
      updatedStock = await Stock_model.findOneAndUpdate(
        { _id: stock._id },
        [
          {
            $set: {
              available: { $subtract: ["$available", move_amount] },
              total_available: { $subtract: ["$total_available", move_amount] },
              free_inventory: {
                $subtract: [
                  { $subtract: ["$total_available", move_amount] },
                  "$reserve",
                ],
              },
            },
          },
        ],
        { new: true }
      );

      const StockLog = await Log_Model.create({
        stock_id: stock._id,
        ref_code_id: updatedStock.reference_code_id,
        category: updatedStock.category,
        stockType: "Package",
        description: `Action: Package To Loose for ${updatedStock.packing_code}(Condition Open==0), Free-=(${move_amount}, Available-=${move_amount} `,
        snapShot: updatedStock.toObject(),
      });
    }
    if (updatedStock.free_inventory < updatedStock.msq) {
      const new_notification = await Action_model.findOneAndUpdate(
        { code_id: updatedStock._id },
        {
          code_id: updatedStock._id,
          ref_code_id: updatedStock.reference_code_id,
          category: updatedStock.category,
          order_type: "Package",
        },
        {
          upsert: true,
        }
      );
    } else {
      await Action_model.deleteMany({ code_id: updatedStock._id });
    }

    // Incrementing Loose and Actions Logic
    const updatedLoose = await Loose_Stock_model.findOneAndUpdate(
      { code_id: stock.reference_code_id },
      [
        {
          $set: {
            available: {
              $add: ["$available", move_amount * stock.packing_quantity],
            },
            total_available: {
              $add: ["$total_available", move_amount * stock.packing_quantity],
            },
            free_inventory: {
              $subtract: [
                {
                  $add: [
                    "$total_available",
                    move_amount * stock.packing_quantity,
                  ],
                },
                "$reserve",
              ],
            },
          },
        },
      ],
      { new: true }
    );

    const LooseDetail = await LooseStockPopulate(ifLoose._id);
    const LooseLog = await Log_Model.create({
      stock_id: ifLoose._id,
      ref_code_id: ifLoose.code_id,
      category: ifLoose.category,
      stockType: "Loose",
      description: `Action: Package to Loose for ${LooseDetail[0]?.entry_details?.code}, Free+=(${stock?.packing_quantity}*${move_amount}), Available-=(${stock?.packing_quantity}*${move_amount}) `,
      snapShot: updatedLoose.toObject(),
    });
    if (updatedLoose.free_inventory < updatedLoose.msq) {
      const new_notification = await Action_model.findOneAndUpdate(
        { code_id: updatedLoose._id },
        {
          code_id: updatedLoose._id,
          ref_code_id: updatedLoose.code_id,
          category: updatedLoose.category,
          order_type: "Loose",
        },
        {
          upsert: true,
        }
      );
    } else {
      await Action_model.deleteMany({ code_id: updatedLoose._id });
    }
    return res
      .status(200)
      .json({ mssg: "Successfully Converted Package To Loose" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};

function hasDuplicatePackingCode(array) {
  const seen = new Set();

  for (const item of array) {
    if (seen.has(item.packing_code)) {
      return true; // Duplicate found
    }
    seen.add(item.packing_code);
  }

  return false; // No duplicates
}

// Package Manipulation
const add_package = async (req, res) => {
  const session = await mongoose.startSession(); // Start a session
  session.startTransaction();
  try {
    const packages = req.body.packages;
    const loose = req.body.loose;
    const { add_new_package, add_new_loose, category } = req.body;
    if (!add_new_loose && !add_new_package) {
      return res.status(400).json({ mssg: "Need to enter atleast one package or loose to save entry." })
    }
    const { code, id } = req.body.selectedCode;
    if (!code || !id) {
      return res.status(400).json({ mssg: "Please Select a Code" });
    }
    let ref_code_detail = {};
    if (category == "Accessory") {
      ref_code_detail = await Accessories_Input_Model.findById(id).session(
        session
      );
    } else if (category == "Non-Insulated Profile") {
      ref_code_detail = await Profile_Input_Model.findById(id).session(session);
    } else if (category == "Insulated Profile") {
      ref_code_detail = await Profile_Insulated_Input.findById(id).session(
        session
      );
    } else if (category == "Kit") {
      ref_code_detail = await Kit_Input.findById(id).session(session);
    }
    if (
      !checkInteger(loose.msq) ||
      !Array.isArray(packages) ||
      packages.some((itm) => !checkInteger(itm.msq))
    ) {
      return res.status(400).json({ mssg: "MSQ must be integer." });
    }
    //loose code
    if (add_new_loose) {
      const newLoose = await Loose_Stock_model.findOneAndUpdate(
        {
          code_id: id,
        },
        {
          $set: {
            msq: loose.msq,
            category: category,
            code_id: id,
            active: loose.active,
          },
        },
        { upsert: true, new: true }
      ).session(session);

      if (loose.active && newLoose.msq > newLoose.free_inventory) {
        const new_notification = await Action_model.findOneAndUpdate(
          { code_id: newLoose._id },
          {
            code_id: newLoose._id,
            ref_code_id: ref_code_detail._id,
            category: category,
            order_type: "Loose",
          },
          {
            upsert: true,
          }
        ).session(session);
      }
      if (hasDuplicatePackingCode(packages)) {
        return res
          .status(400)
          .json({ mssg: "Cannot Save Packages with same name" });
      }
    }
    //package code
    if (add_new_package) {
      const filteredNewPackages = packages.filter((package) => {
        return (
          package.packing_code !== "" &&
          package.packing_unit !== "" &&
          package.packing_quantity !== 0 &&
          package.packing_material !== "" &&
          package.packing_description !== ""
        );
      });
      if (filteredNewPackages.length != packages.length) {
        return res.status(400).json({ mssg: "All Fields Are Mandatory" });
      }
      await Promise.all(
        filteredNewPackages.map(async (itm) => {
          const new_package = await Stock_model.create(
            [
              {
                packing_code: itm.packing_code,
                packing_description: itm.packing_description,
                packing_unit: itm.packing_unit,
                packing_quantity: itm.packing_quantity,
                packing_material: itm.packing_material,
                packing_cost: itm.packing_cost,
                packing_total_cost:
                  parseFloat(itm.packing_quantity) +
                  parseFloat(itm.packing_cost),
                reference_code_id: ref_code_detail._id,
                category: category,
                msq: itm.msq,
                active: itm.active,
              },
            ],
            { session: session }
          );
          if (itm.active && new_package[0].msq > new_package[0].free_inventory) {
            const new_notification = await Action_model.findOneAndUpdate(
              { code_id: new_package[0]._id },
              {
                code_id: new_package[0]._id,
                ref_code_id: ref_code_detail._id,
                category: category,
                order_type: "Package",
              },
              {
                upsert: true,
              }
            ).session(session);
          }
          const StockLog = await Log_Model.create(
            [
              {
                stock_id: new_package[0]._id,
                ref_code_id: ref_code_detail._id,
                category: category,
                stockType: "Package",
                description: `Stock created for code ${itm.packing_code}`,
                snapShot: new_package[0].toObject(),
              },
            ],
            { session: session }
          );
          ref_code_detail.stock_detail.push(new_package[0]._id);
        })
      );
      await ref_code_detail.save({ session: session });
    }
    await session.commitTransaction(); // Commit all operations
    session.endSession();
    return res.status(200).json({ mssg: "Package Added" });
  } catch (error) {
    await session.abortTransaction(); // Commit all operations
    session.endSession();
    console.log(error);
    if (error.code == 11000) {
      return res.status(400).json({
        mssg: `Duplicate Packing Code ${error.keyValue.packing_code}`,
      });
    }
    return res.status(500).json({ mssg: "Some Error Occured" });
  }
};
const get_packages = async (req, res) => {
  try {
    let { search, page, filter, getAll, category } = req.query;

    let pipeline = [
      {
        $lookup: {
          from: "accessories_input_models",
          localField: "reference_code_id",
          foreignField: "_id",
          as: "accessory_details",
        },
      },
      {
        $lookup: {
          from: "profile_input_models",
          localField: "reference_code_id",
          foreignField: "_id",
          as: "ni_details",
        },
      },
      {
        $lookup: {
          from: "profile_insulated_inputs",
          localField: "reference_code_id",
          foreignField: "_id",
          as: "ins_details",
        },
      },
      {
        $lookup: {
          from: "kit_inputs",
          localField: "reference_code_id",
          foreignField: "_id",
          as: "kit_details",
        },
      },
      {
        $addFields: {
          stock_type: "Package",
        },
      },
      {
        $addFields: {
          entry_detail: {
            $switch: {
              branches: [
                {
                  case: { $eq: ["$category", "Accessory"] },
                  then: "$accessory_details",
                },
                {
                  case: { $eq: ["$category", "Non-Insulated Profile"] },
                  then: "$ni_details",
                },
                {
                  case: { $eq: ["$category", "Insulated Profile"] },
                  then: "$ins_details",
                },
                {
                  case: { $eq: ["$category", "Kit"] },
                  then: "$kit_details",
                },
              ],
              default: null,
            },
          },
        },
      },
      {
        $unset: [
          "accessory_details",
          "ni_details",
          "ins_details",
          "kit_details",
          "latest_eta",
        ],
      },
      {
        $unionWith: {
          coll: "loose_stock_models",
          pipeline: [
            {
              $lookup: {
                from: "accessories_input_models",
                localField: "code_id",
                foreignField: "_id",
                as: "accessory_details",
              },
            },
            {
              $lookup: {
                from: "profile_input_models",
                localField: "code_id",
                foreignField: "_id",
                as: "ni_details",
              },
            },
            {
              $lookup: {
                from: "profile_insulated_inputs",
                localField: "code_id",
                foreignField: "_id",
                as: "ins_details",
              },
            },
            {
              $lookup: {
                from: "kit_inputs",
                localField: "code_id",
                foreignField: "_id",
                as: "kit_details",
              },
            },
            {
              $addFields: {
                entry_detail: {
                  $switch: {
                    branches: [
                      {
                        case: { $eq: ["$category", "Accessory"] },
                        then: "$accessory_details",
                      },
                      {
                        case: { $eq: ["$category", "Non-Insulated Profile"] },
                        then: "$ni_details",
                      },
                      {
                        case: { $eq: ["$category", "Insulated Profile"] },
                        then: "$ins_details",
                      },
                      {
                        case: { $eq: ["$category", "Kit"] },
                        then: "$kit_details",
                      },
                    ],
                    default: null,
                  },
                },
              },
            },
            {
              $unset: [
                "accessory_details",
                "ni_details",
                "ins_details",
                "kit_details",
                "latest_eta",
              ],
            },
            {
              $addFields: {
                stock_type: "Loose",
              },
            },
            // {
            //   $lookup: {
            //     from: "accessories_supplier_models",
            //     localField: "entry_detail.supplier_id",
            //     foreignField: "_id",
            //     as: "supplier_detail",
            //   },
            // },
          ],
        },
      },
      {
        $lookup: {
          from: "accessories_supplier_models",
          localField: "entry_detail.supplier_id",
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
      // {
      //   $match: {
      //     $and: [{ category: category }],
      //   },
      // },
    ];
    if (getAll) {
      let and = [{ category: category }];
      let where = {
        $and: and,
      };
      if (filter?.activity) {
        if (filter?.activity == "Active") {
          and.push({ active: true });
        } else if (filter?.activity == "Inactive") {
          and.push({ active: false });
        }
      }
      if (filter?.stockType) {
        if (filter?.stockType == "Package") {
          and.push({ stock_type: "Package" });
        } else if (filter?.stockType == "Loose") {
          and.push({ stock_type: "Loose" });
        }
      }
      pipeline.push({ $match: where });
      const entry = await Stock_model.aggregate(pipeline);
      return res.status(200).json({
        entry,
      });
    } else {
      let searchRegex = { $regex: new RegExp(".*" + search + ".*", "i") };
      const limit = 8;
      const pageNumber = parseInt(page) || 1;
      const skip = (pageNumber - 1) * limit;
      let and = [{ category: category }];
      if (filter?.packing_unit) {
        and.push({ packing_unit: filter.packing_unit });
      }
      if (filter?.activity) {
        if (filter?.activity == "Active") {
          and.push({ active: true });
        } else if (filter?.activity == "Inactive") {
          and.push({ active: false });
        }
      }
      if (filter?.stockType) {
        if (filter?.stockType == "Package") {
          and.push({ stock_type: "Package" });
        } else if (filter?.stockType == "Loose") {
          and.push({ stock_type: "Loose" });
        }
      }
      let where = {
        $or: [
          { "entry_detail.code": searchRegex },
          { packing_code: searchRegex },
        ],
        $and: and,
      };
      const countPipeline = [
        ...pipeline,
        { $match: where },
        { $count: "totalCount" },
      ];
      const countResult = await Stock_model.aggregate(countPipeline);
      const totalCount = countResult.length > 0 ? countResult[0].totalCount : 0;
      const total_page = Math.ceil(totalCount / limit);

      pipeline.push(
        { $match: where },
        { $sort: { createdAt: 1 } },
        { $skip: skip },
        { $limit: limit }
      );

      const entry = await Stock_model.aggregate(pipeline);
      // const totalCount = await Stock_model.countDocuments({ $and: and });
      // const total_page = Math.ceil(totalCount / limit);
      return res.status(200).json({
        entry,
        currentPage: pageNumber,
        total_page,
        totalCount,
        limit,
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};
const get_single_package = async (req, res) => {
  try {
    const id = req.params.id;
    const { category } = req.query;
    // const entry = await Accessories_Input_Model.findById(id).populate({
    //   path: "stock_detail",
    //   model: "Stock_model",
    // });
    const pipeline = [
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
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
          from: "stock_models",
          localField: "stock_detail",
          foreignField: "_id",
          as: "stock_detail",
        },
      },
      {
        $addFields: {
          supplier: { $arrayElemAt: ["$lookup_supplier.name", 0] },
          supplier_code: { $arrayElemAt: ["$lookup_supplier.code", 0] },
        },
      },
    ];
    let entry = {};
    if (category == "Accessory") {
      entry = await Accessories_Input_Model.aggregate(pipeline);
    } else if (category == "Non-Insulated Profile") {
      entry = await Profile_Input_Model.aggregate(pipeline);
    } else if (category == "Insulated Profile") {
      entry = await Profile_Insulated_Input.aggregate(pipeline);
    } else if (category == "Kit") {
      entry = await Kit_Input.aggregate(pipeline);
    }
    const loose_stock_entry = await Loose_Stock_model.findOne({ code_id: id });
    return res.status(200).json({ entry: entry[0], loose_stock_entry });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};
const update_package = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { packages, loose, new_packages, category, add_new_loose, deleteId } = req.body;
    const { code, id } = req.body.selectedCode;
    const packageToDelete = deleteId.filter((itm) => {
      return itm.type == "Package"
    })
    const looseToDelete = deleteId.filter((itm) => {
      return itm.type == "Loose"
    })
    for (const itm of packageToDelete) {
      await delete_package(id, itm.id, session);
    }

    for (const itm of looseToDelete) {
      await delete_loose(id, itm.id, session);
    }

    let ref_code_detail = {};
    if (category == "Accessory") {
      ref_code_detail = await Accessories_Input_Model.findById(id).session(
        session
      );
    } else if (category == "Non-Insulated Profile") {
      ref_code_detail = await Profile_Input_Model.findById(id).session(session);
    } else if (category == "Insulated Profile") {
      ref_code_detail = await Profile_Insulated_Input.findById(id).session(
        session
      );
    } else if (category == "Kit") {
      ref_code_detail = await Kit_Input.findById(id).session(session);
    }
    if (
      !checkInteger(loose.msq) ||
      !Array.isArray(packages) ||
      packages.some((itm) => !checkInteger(itm.msq)) ||
      !Array.isArray(new_packages) ||
      new_packages.some((itm) => !checkInteger(itm.msq))
    ) {
      return res.status(400).json({ mssg: "MSQ must be integer." });
    }
    if (add_new_loose) {
      // loose stock code
      let loose_stock = await Loose_Stock_model.findOne({
        code_id: ref_code_detail._id,
      }).session(session);
      if (!loose_stock) {
        loose_stock = await Loose_Stock_model.create(
          [
            {
              code_id: loose.code_id,
              category: category,
              msq: loose.msq,
              active: loose.active,
            },
          ],
          { session: session }
        );
        const looseLog = await Log_Model.create({
          stock_id: loose_stock[0]._id,
          ref_code_id: loose.code_id,
          category: category,
          stockType: "Loose",
          description: `Loose Stock created for code ${ref_code_detail.code}`,
          snapShot: loose_stock[0].toObject(),
        });
      } else {
        loose_stock = await Loose_Stock_model.findOneAndUpdate(
          { code_id: ref_code_detail._id },
          {
            code_id: loose.code_id,
            category: category,
            msq: loose.msq,
          },
          { new: true }
        ).session(session);
        const looseLog = await Log_Model.create({
          stock_id: loose_stock._id,
          ref_code_id: loose.code_id,
          category: category,
          stockType: "Loose",
          description: `Loose Stock's updated for code ${ref_code_detail.code} through package page`,
          snapShot: loose_stock.toObject(),
        });
      }
      // let new_fetched_loose_stock = await Loose_Stock_model.findOne({
      //   code_id: ref_code_detail._id,
      // }).session(session)
      let new_fetched_loose_stock = loose_stock || loose_stock[0];
      if (
        new_fetched_loose_stock.free_inventory < new_fetched_loose_stock.msq
      ) {
        const new_notification = await Action_model.findOneAndUpdate(
          { code_id: loose_stock._id },
          {
            code_id: loose_stock._id,
            ref_code_id: ref_code_detail._id,
            category: category,
            order_type: "Loose",
          },
          {
            upsert: true,
          }
        ).session(session);
      } else {
        await Action_model.deleteMany({ code_id: loose_stock._id }).session(
          session
        );
      }
    }

    if (hasDuplicatePackingCode([...packages, ...new_packages])) {
      return res
        .status(400)
        .json({ mssg: "Cannot Save Packages with same name" });
    }
    // new package added code
    const filteredNewPackages = new_packages.filter((package) => {
      return (
        package.packing_code !== "" &&
        package.packing_unit !== "" &&
        package.packing_quantity !== 0 &&
        package.packing_material !== "" &&
        package.packing_description !== ""
      );
    });
    if (filteredNewPackages.length > 0) {
      await Promise.all(
        filteredNewPackages.map(async (itm) => {
          const new_package = await Stock_model.create(
            [
              {
                packing_code: itm.packing_code,
                packing_description: itm.packing_description,
                packing_unit: itm.packing_unit,
                packing_quantity: itm.packing_quantity,
                packing_material: itm.packing_material,
                packing_cost: itm.packing_cost,

                packing_total_cost:
                  parseFloat(itm.packing_quantity) +
                  parseFloat(itm.packing_cost),
                reference_code_id: ref_code_detail._id,
                category: category,
                msq: itm.msq,
                active: itm.active,
              },
            ],
            { session: session }
          );
          const StockLog = await Log_Model.create({
            stock_id: new_package[0]._id,
            ref_code_id: ref_code_detail._id,
            category: category,
            stockType: "Package",
            description: `Stock created for code ${itm.packing_code}`,
            snapShot: new_package[0].toObject(),
          });
          if (itm.active) {
            let stock_qty = new_package[0].free_inventory;
            if (stock_qty < itm.msq) {
              const new_notification = await Action_model.create({
                code_id: new_package[0]._id,
                ref_code_id: ref_code_detail._id,
                category: category,
              });
            }
          }
          ref_code_detail.stock_detail.push(new_package[0]._id);
        })
      );
    }
    await ref_code_detail.save({ session: session });
    const filteredPackages = packages.filter((package) => {
      return (
        package.packing_code !== "" &&
        package.packing_unit !== "" &&
        package.packing_quantity !== 0 &&
        package.packing_material !== "" &&
        package.packing_description !== ""
      );
    });
    await Promise.all(
      filteredPackages.map(async (itm) => {
        const existing_package = await Stock_model.findByIdAndUpdate(
          itm._id,
          {
            packing_code: itm.packing_code,
            packing_description: itm.packing_description,
            packing_unit: itm.packing_unit,
            packing_quantity: itm.packing_quantity,
            packing_material: itm.packing_material,
            packing_cost: itm.packing_cost,
            packing_total_cost:
              parseFloat(itm.packing_quantity) + parseFloat(itm.packing_cost),
            reference_code_id: ref_code_detail._id,
            category: category,
            msq: itm.msq,
          },
          { new: true }
        ).session(session);
        const StockLog = await Log_Model.create({
          stock_id: existing_package._id,
          ref_code_id: ref_code_detail._id,
          category: category,
          stockType: "Package",
          description: `Stock Updated for code ${itm.packing_code} through package page`,
          snapShot: existing_package.toObject(),
        });
        let stock_qty = existing_package.free_inventory;
        if (stock_qty < itm.msq) {
          const if_action = await Action_model.findOne({
            code_id: existing_package._id,
          });
          if (!if_action) {
            const new_notification = await Action_model.create({
              code_id: existing_package._id,
              ref_code_id: ref_code_detail._id,
              category: category,
            });
          }
        } else if (stock_qty >= itm.msq) {
          const deleted_notification = await Action_model.findOneAndDelete({
            code_id: existing_package._id,
          });
        }
      })
    );
    await session.commitTransaction(); // Commit all operations
    session.endSession();
    return res.status(200).json({ mssg: "Package Updated" });
  } catch (error) {
    await session.abortTransaction(); // Commit all operations
    session.endSession();
    console.log(error);
    if (error.code == 11000) {
      return res.status(400).json({
        mssg: `Duplicate Packing Code ${error.keyValue.packing_code}`,
      });
    }
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};
const delete_package = async (parentId, packageId, session) => {
  try {
    const package = await Stock_model.findById(packageId);
    if (package.category === "Accessory") {
      const updatedAccessory = await Accessories_Input_Model.findByIdAndUpdate(
        parentId,
        { $pull: { stock_detail: packageId } },
        { new: true }
      );
    } else if (package.category === "Non-Insulated Profile") {
      const updatedNI = await Profile_Input_Model.findByIdAndUpdate(
        parentId,
        { $pull: { stock_detail: packageId } },
        { new: true }
      );
    } else if (package.category === "Insulated Profile") {
      const updatedIns = await Profile_Insulated_Input.findByIdAndUpdate(
        parentId,
        { $pull: { stock_detail: packageId } },
        { new: true }
      );
    } else if (package.category === "Kit") {
      const updatedNI = await Kit_Input.findByIdAndUpdate(
        parentId,
        { $pull: { stock_detail: packageId } },
        { new: true }
      );
    }
    const deletedLog = await Log_Model.deleteMany({
      stock_id: packageId,
    }).session(session)
    const deletedActions = await Action_model.deleteMany({
      code_id: packageId,
    }).session(session)
    const deletedNotifications = await Notification_model.deleteMany({
      code_id: packageId,
    }).session(session)
    const delete_package = await Stock_model.findByIdAndDelete(packageId).session(session)
    return true
  } catch (error) {
    console.log(error);
  }
};
const delete_loose = async (parentId, packageId, session) => {
  try {
    const deletedLog = await Log_Model.deleteMany({
      stock_id: packageId,
    }).session(session)
    const deletedActions = await Action_model.deleteMany({
      code_id: packageId,
    }).session(session)
    const deletedNotifications = await Notification_model.deleteMany({
      code_id: packageId,
    }).session(session)
    const delete_package = await Loose_Stock_model.findByIdAndDelete(packageId).session(session)
    return true
  } catch (error) {
    console.log(error);
  }
};

const changeActivityStatus = async (req, res) => {
  try {
    const { id, type, ref_code_id, category } = req.body;
    if (type == "Package") {
      const stock = await Stock_model.findById(id);
      if (stock.active) {
        if (stock.reserve == 0 && stock.free_inventory == 0) {
          const updatedStock = await Stock_model.findByIdAndUpdate(id, {
            $set: { msq: 0, active: false },
          });
          const deleteActions = await Action_model.deleteMany({ code_id: id });
          return res
            .status(200)
            .json({ mssg: `${stock.packing_code} Deactivated` });
        }
        return res.status(400).json({
          mssg: `${stock.packing_code} cannot be deactivated since ${stock.reserve > 0 ? `\n reserve(${stock.reserve}) > 0` : ""
            }
          ${stock.free_inventory > 0
              ? ` \n free(${stock.free_inventory}) > 0`
              : ``
            }`,
        });
      } else {
        const updatedStock = await Stock_model.findByIdAndUpdate(id, {
          $set: { active: true },
        });
        if (updatedStock.free_inventory < updatedStock.msq) {
          const new_notification = await Action_model.findOneAndUpdate(
            { code_id: updatedStock._id },
            {
              code_id: updatedStock._id,
              ref_code_id: updatedStock.reference_code_id,
              category: updatedStock.category,
              order_type: "Package",
            },
            {
              upsert: true,
            }
          );
        } else {
          await Action_model.deleteMany({ code_id: updatedStock._id });
        }
        return res
          .status(200)
          .json({ mssg: `${stock.packing_code} Activated` });
      }
    } else if (type == "Loose") {
      const looseStock = await Loose_Stock_model.findOne({
        code_id: ref_code_id,
      });
      let ref_code_detail = {};
      if (category == "Accessory") {
        ref_code_detail = await Accessories_Input_Model.findById(ref_code_id);
      } else if (category == "Non-Insulated Profile") {
        ref_code_detail = await Profile_Input_Model.findById(ref_code_id);
      } else if (category == "Insulated Profile") {
        ref_code_detail = await Profile_Insulated_Input.findById(ref_code_id);
      } else if (category == "Kit") {
        ref_code_detail = await Kit_Input.findById(ref_code_id);
      }
      //lose stock was not created before
      if (!looseStock) {
        const newLoose = await Loose_Stock_model.findOneAndUpdate(
          {
            code_id: ref_code_id,
          },
          {
            $set: {
              msq: 0,
              category: category,
              code_id: ref_code_id,
              active: false,
            },
          },
          { upsert: true, new: true }
        );
        return res
          .status(200)
          .json({ mssg: `${ref_code_detail.code} Created and Deactivated` });
      }
      if (looseStock.active) {
        if (looseStock.reserve == 0 && looseStock.free_inventory == 0) {
          const updatedLooseStock = await Loose_Stock_model.findOneAndUpdate(
            { code_id: ref_code_id },
            { $set: { msq: 0, active: false } }
          );
          const deleteActions = await Action_model.deleteMany({ code_id: id });
          return res
            .status(200)
            .json({ mssg: `${ref_code_detail.code} Deactivated` });
        }
        return res.status(400).json({
          mssg: `${ref_code_detail.code} cannot be deactivated since ${looseStock.reserve > 0 ? `reserve(${looseStock.reserve}) > 0` : ""
            } or 
          ${looseStock.free_inventory > 0
              ? `free(${looseStock.free_inventory}) != 0`
              : ``
            }
          free(${looseStock.free_inventory}) > 0`,
        });
      } else {
        const updatedLooseStock = await Loose_Stock_model.findOneAndUpdate(
          { code_id: ref_code_id },
          { $set: { active: true } }
        );
        if (updatedLooseStock.free_inventory < updatedLooseStock.msq) {
          const new_notification = await Action_model.findOneAndUpdate(
            { code_id: updatedLooseStock._id },
            {
              code_id: updatedLooseStock._id,
              ref_code_id: updatedLooseStock.code_id,
              category: updatedLooseStock.category,
              order_type: "Loose",
            },
            {
              upsert: true,
            }
          );
        } else {
          await Action_model.deleteMany({ code_id: updatedLooseStock._id });
        }
        return res
          .status(200)
          .json({ mssg: `${ref_code_detail.code} Activated` });
      }
    } else {
      return res.status(400).json({ mssg: "Wrong Type" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ mssg: "Some Error Occured" });
  }
};

//common for all
const acc_package_assigned_to = async (req, res) => {
  try {
    const { id } = req.params;
    const stock = await Stock_model.findById(id);
    // if (stock.reserve > 0 || stock.free_inventory > 0) {
    //   return res
    //     .status(400)
    //     .json({
    //       mssg: "Package cannot be deleted because reserve > 0 or free inventory > 0",
    //     });
    // }
    const project = await Project_Model.aggregate([
      {
        $unwind: {
          path: "$parts",
        },
      },
      {
        $match: {
          // project_status: "Active",
          "parts.code_id": stock._id,
        },
      },
      {
        $project: {
          name: "$project_name",
        },
      },
    ]);
    const po = await Purchase_Model.aggregate([
      {
        $unwind: {
          path: "$parts",
        },
      },
      {
        $match: {
          // status: "Active",
          "parts.code_id": stock._id,
        },
      },
      {
        $project: {
          name: "$lpo",
        },
      },
    ]);
    const inquiry = await Inquiry_Model.aggregate([
      {
        $unwind: {
          path: "$parts",
        },
      },
      {
        $match: {
          // status: "Active",
          "parts.code_id": stock._id,
        },
      },
      {
        $project: {
          name: "$inquiry_ref",
        },
      },
    ]);
    return res.status(200).json({
      project,
      po,
      inquiry,
      reserve: stock.reserve,
      free_inventory: stock.free_inventory,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: "Some Error Occured" });
  }
};

//common for all
const acc_loose_assigned_to = async (req, res) => {
  try {
    const { id } = req.params;
    const stock = await Loose_Stock_model.findById(id);
    // if (stock.reserve > 0 || stock.free_inventory > 0) {
    //   return res
    //     .status(200)
    //     .json({
    //       mssg: "Loose stock cannot be deleted because reserve > 0 or free inventory > 0.",
    //     });
    // }
    const project = await Project_Model.aggregate([
      {
        $unwind: {
          path: "$parts",
        },
      },
      {
        $match: {
          // project_status: "Active",
          "parts.code_id": stock._id,
        },
      },
      {
        $project: {
          name: "$project_name",
        },
      },
    ]);
    const po = await Purchase_Model.aggregate([
      {
        $unwind: {
          path: "$parts",
        },
      },
      {
        $match: {
          // status: "Active",
          "parts.code_id": stock._id,
        },
      },
      {
        $project: {
          name: "$lpo",
        },
      },
    ]);
    const inquiry = await Inquiry_Model.aggregate([
      {
        $unwind: {
          path: "$parts",
        },
      },
      {
        $match: {
          // status: "Active",
          "parts.code_id": stock._id,
        },
      },
      {
        $project: {
          name: "$inquiry_ref",
        },
      },
    ]);
    return res.status(200).json({
      project,
      po,
      inquiry,
      reserve: stock.reserve,
      free_inventory: stock.free_inventory,
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: "Some Error Occured" });
  }
};

module.exports = {
  get_all_stocks,
  get_package_stock,
  get_stock_filter_data,
  get_simple_package_filter_data,
  get_for_prefill_lpo,
  get_all_loose_stock,
  get_avlb_for_package,
  get_code_from_ref,
  import_stock,
  update_open,
  update_location,
  package_pl_helper,
  package_pl,
  convert_package_to_loose,
  convert_loose_to_package,
  get_packages_list_for_loose,

  //packages
  add_package,
  get_single_package,
  update_package,
  // delete_package,
  // delete_loose,
  get_packages,
  acc_package_assigned_to,
  acc_loose_assigned_to,
  changeActivityStatus,
};
