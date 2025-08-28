const {
  Purchase_Model,
  History_model,
} = require("../models/purchase_order_model");
const Stock_model = require("../models/stock_model");
const Notification_model = require("../models/notification_model");
const accessories_calculator = require("../models/accessories_calculator_model");
const Profile_Calculator = require("../models/profile_non_insulated_calc_model");
const Profile_Input_Model = require("../models/profile_input_model");
const Profile_Insulated_Calculator = require("../models/profile_insulated_calc_model");
const Kit_Calculator = require("../models/Kit_Calc_Model");
const Action_model = require("../models/actions_model");
const Loose_Stock_model = require("../models/loose_stock_model");
const Accessories_Input_Model = require("../models/accessories_input_model");
const {
  Profile_Insulated_Input,
} = require("../models/profile_insulated_input");
const Kit_Input = require("../models/kit_model");
const { default: mongoose } = require("mongoose");
const Log_Model = require("../models/log");
const { LooseStockPopulate, checkInteger } = require("../config/common");
const Inquiry_Model = require("../models/inquiry_model");
const fs = require("fs");
const pdf = require("html-pdf");
const path = require("path");
const ejs = require("ejs");
const sendInquiry = require("../config/sendInquiry");
const sendPurchase = require("../config/sendpurchaseorder");
const Accessories_Supplier_Model = require("../models/accessories_supplier_model");

function validateParts(partsArray) {
  return Object.values(partsArray).every(
    (value) => value !== null && value !== undefined
  );
}
const createPartHistory = async (received, balance, eta, image, session) => {
  const add_history = await History_model.create([{
    received,
    balance,
    eta,
    image,
  }], { session: session })
  return add_history[0]._id;
};

const processSinglePart = async (from = "inquiry", lpo_code, itm, session) => {
  let code_acc =
    itm.order_type === "Package"
      ? itm.stock_details.packing_code
      : itm.entry_details.code;
  // if (from == "inquiry") {
  //   code_acc =
  //     itm.order_type === "Package"
  //       ? itm.stock_details.packing_code
  //       : itm.entry_details.code;
  // } else {
  //   code_acc = itm.order_type === "Package" ? itm.code : itm.code;
  // }
  const {
    order_type,
    code,
    reference_code,
    code_id,
    ref_code_id,
    description,
    received = 0,
    eta,
    type,
    total_weight = parseFloat(total_weight),
    quantity = parseFloat(quantity),
    unit_price = parseFloat(unit_price),
    total_price = parseFloat(total_price),
    delivery_point,
    remarks,
  } = itm;
  let check_balance = parseFloat(quantity) - parseFloat(received);
  if (order_type === "Package") {
    const update_stock = await Stock_model.findOneAndUpdate(
      { _id: code_id },
      [
        {
          $set: {
            total_available: { $add: ["$total_available", parseFloat(quantity)] },
            free_inventory: {
              $subtract: [
                { $add: ["$total_available", parseFloat(quantity)] },
                "$reserve",
              ],
            },
            expected: { $add: ["$expected", parseFloat(quantity)] },
            total_ordered: { $add: ["$total_ordered", parseFloat(quantity)] },
            value_purchased: {
              $add: ["$value_purchased", parseFloat(unit_price) * parseFloat(quantity)],
            },
            total_balance: {
              $add: ["$total_balance", check_balance],
            },
          },
        },
      ],
      {
        new: true
      }
    ).session(session);
    const stockLog = await Log_Model.create([{
      stock_id: code_id,
      ref_code_id: ref_code_id,
      category: type,
      stockType: "Package",
      description: `Action: New PO ${lpo_code} for ${update_stock.packing_code}, Expected+=${quantity}, Value Purchased+=${unit_price}*${quantity}, Total Balance+=${check_balance}`,
      snapShot: update_stock.toObject(),
    }], { session });
    // console.log(code, reference_code, order_type);
    if (
      update_stock.free_inventory <
      update_stock.msq
    ) {
      const if_action = await Action_model.findOne({
        code_id: code_id,
      }).session(session)
      if (!if_action) {
        const new_notification = await Action_model.create([{
          code_id: code_id,
          ref_code_id: ref_code_id,
          category: type,
        }], { session })
      }
    } else {
      await Action_model.findOneAndDelete({
        code_id: code_id,
      }).session(session)
    }
  } else if (order_type === "Loose") {
    let loose_stock = await Loose_Stock_model.findOneAndUpdate(
      { _id: code_id },
      [
        {
          $set: {
            total_available: {
              $add: ["$total_available", parseFloat(quantity)],
            },
            free_inventory: {
              $subtract: [
                { $add: ["$total_available", parseFloat(quantity)] },
                "$reserve",
              ],
            },
            expected: {
              $add: ["$expected", parseFloat(quantity)],
            },
            total_ordered: {
              $add: ["$total_ordered", parseFloat(quantity)],
            },
            value_purchased: {
              $add: ["$value_purchased", parseFloat(unit_price) * parseFloat(quantity)],
            },
            total_balance: {
              $add: ["$total_balance", check_balance],
            },
          },
        },
      ],
      { new: true }
    ).session(session);
    const LooseDetail = await LooseStockPopulate(code_id);
    const stockLog = await Log_Model.create([{
      stock_id: code_id,
      ref_code_id: ref_code_id,
      category: type,
      stockType: "Loose",
      description: `Action: New PO ${lpo_code} for ${LooseDetail[0]?.entry_details?.code}, Expected+=${quantity}, Total quantity+=${quantity}, Value Purchased+=${unit_price}*${quantity}, Total Balance+=${check_balance}`,
      snapShot: loose_stock.toObject(),
    }], { session });
    if (
      loose_stock.free_inventory <
      loose_stock.msq
    ) {
      const if_action = await Action_model.findOne({
        code_id: code_id,
      }).session(session)
      if (!if_action) {
        const new_notification = await Action_model.create([{
          code_id: code_id,
          ref_code_id: ref_code_id,
          order_type: "Loose",
          category: type,
        }], { session });
      }
    } else {
      await Action_model.findOneAndDelete({
        code_id: code_id,
      }).session(session)
    }
  }
  const new_notification = await Notification_model.create([{
    lpo_code: lpo_code,
    part_code: code_acc,
    code_id: code_id,
    eta: eta.eta || eta,
    order_type,
  }], { session: session })
  const historyId = await createPartHistory(
    received,
    check_balance,
    eta.eta || eta,
    "",
    session
  );
  return {
    order_type,
    code_id,
    ref_code_id,
    description,
    unit_price,
    quantity,
    type,
    total_weight,
    quantity,
    total_price,
    delivery_point,
    remarks,
    history: historyId,
  };
}

const createPartArray = async (from = "inquiry", lpo_code, partsArray, session) => {
  const finalArray = [];

  for (const itm of partsArray) {
    const part = await processSinglePart(from, lpo_code, itm, session); // your logic
    finalArray.push(part);
  }
  // const finalArray = await Promise.all(
  //   partsArray.map(async (itm) => {

  //   })
  // );
  return finalArray;
};
const createFreeFieldArray = async (lpo_code, freeFields, session) => {
  let finalArray = []
  for (let itm of freeFields) {
    const {
      alloy = undefined,
      temper = undefined,
      length = undefined,

      material = undefined,
      color = undefined,

      code = "",
      description = "",
      finish = "",
      grade = "",
      image = "",
      quantity = 0,
      remarks = "",
      supplier_code = "",
      total_weight = 0,
      unit = "",
      unit_weight = 0,
      unit_price = 0,
      total_price = 0,
      eta = "",
      delivery_point = "",

      received = 0,
    } = itm;
    let check_balance = parseFloat(quantity) - parseFloat(received);
    // const new_notification = await Notification_model.create({
    //   lpo_code: lpo_code,
    //   part_code: code,
    //   code_id: code_id,
    //   eta: eta.eta || eta,
    //   order_type,
    // });
    const historyId = await createPartHistory(
      received,
      check_balance,
      eta.eta || eta,
      "",
      session
    );
    finalArray.push({
      ...(alloy !== undefined && { alloy }),
      ...(temper !== undefined && { temper }),
      ...(length !== undefined && { length }),
      ...(material !== undefined && { material }),
      ...(color !== undefined && { color }),

      code,
      description,
      finish,
      grade,
      image,
      quantity,
      remarks,
      supplier_code,
      total_weight,
      unit,
      unit_weight,
      unit_price,
      total_price,
      eta,
      delivery_point,
      received,
      history: historyId,
    })
  }
  // const finalArray =
  //   freeFields.map(async (itm) => {
  //     const {
  //       alloy = undefined,
  //       temper = undefined,
  //       length = undefined,

  //       material = undefined,
  //       color = undefined,

  //       code = "",
  //       description = "",
  //       finish = "",
  //       grade = "",
  //       image = "",
  //       quantity = 0,
  //       remarks = "",
  //       supplier_code = "",
  //       total_weight = 0,
  //       unit = "",
  //       unit_weight = 0,
  //       unit_price = 0,
  //       total_price = 0,
  //       eta = "",
  //       delivery_point = "",

  //       received = 0,
  //     } = itm;
  //     let check_balance = parseFloat(quantity) - parseFloat(received);
  //     // const new_notification = await Notification_model.create({
  //     //   lpo_code: lpo_code,
  //     //   part_code: code,
  //     //   code_id: code_id,
  //     //   eta: eta.eta || eta,
  //     //   order_type,
  //     // });
  //     const historyId = await createPartHistory(
  //       received,
  //       check_balance,
  //       eta.eta || eta,
  //       "",
  //       session
  //     );
  //     return {
  //       ...(alloy !== undefined && { alloy }),
  //       ...(temper !== undefined && { temper }),
  //       ...(length !== undefined && { length }),
  //       ...(material !== undefined && { material }),
  //       ...(color !== undefined && { color }),

  //       code,
  //       description,
  //       finish,
  //       grade,
  //       image,
  //       quantity,
  //       remarks,
  //       supplier_code,
  //       total_weight,
  //       unit,
  //       unit_weight,
  //       unit_price,
  //       total_price,
  //       eta,
  //       delivery_point,
  //       received,
  //       history: historyId,
  //     };
  //   })
  return finalArray;
}

const lpo_pdf_maker = (id) => {
  return new Promise(async (resolve, reject) => {
    try {
      const po = await Purchase_Model.findById(id)
      let partsPipeline = []
      if (po.parts.length) {
        partsPipeline = [
          {
            $match: {
              _id: new mongoose.Types.ObjectId(id),
            },
          },
          {
            $unwind: "$parts",
          },
          {
            $lookup: {
              from: "loose_stock_models",
              localField: "parts.code_id",
              foreignField: "_id",
              as: "loose_stock_details",
              pipeline: [
                { $match: { active: true } }
              ]
            },
          },
          {
            $lookup: {
              from: "stock_models",
              localField: "parts.code_id",
              foreignField: "_id",
              as: "stock_details",
              pipeline: [
                { $match: { active: true } }
              ]
            },
          },
          {
            $lookup: {
              from: "accessories_input_models",
              localField: "parts.ref_code_id",
              foreignField: "_id",
              as: "accessory_details",
            },
          },
          {
            $lookup: {
              from: "profile_input_models",
              localField: "parts.ref_code_id",
              foreignField: "_id",
              as: "ni_details",
            },
          },
          {
            $lookup: {
              from: "profile_insulated_inputs",
              localField: "parts.ref_code_id",
              foreignField: "_id",
              as: "ins_details",
            },
          },
          {
            $lookup: {
              from: "kit_inputs",
              localField: "parts.ref_code_id",
              foreignField: "_id",
              as: "kit_details",
            },
          },
          {
            $lookup: {
              from: "accessories_calculators",
              localField: "parts.ref_code_id",
              foreignField: "input_model_id",
              as: "acc_pl_details",
            },
          },
          {
            $lookup: {
              from: "profile_calculators",
              localField: "parts.ref_code_id",
              foreignField: "input_model_id",
              as: "ni_pl_details",
            },
          },
          {
            $lookup: {
              from: "profile_insulated_calculators",
              localField: "parts.ref_code_id",
              foreignField: "input_model_id",
              as: "ins_pl_details",
            },
          },
          {
            $lookup: {
              from: "kit_calculators",
              localField: "parts.ref_code_id",
              foreignField: "input_model_id",
              as: "kit_pl_details",
            },
          },
          {
            $addFields: {
              parts: {
                pl_details: {
                  $switch: {
                    branches: [
                      {
                        case: {
                          $eq: ["$parts.type", "Accessory"],
                        },
                        then: {
                          $arrayElemAt: ["$acc_pl_details", 0],
                        },
                      },
                      {
                        case: {
                          $eq: ["$parts.type", "Non-Insulated Profile"],
                        },
                        then: {
                          $arrayElemAt: ["$ni_pl_details", 0],
                        },
                      },
                      {
                        case: {
                          $eq: ["$parts.type", "Insulated Profile"],
                        },
                        then: {
                          $arrayElemAt: ["$ins_pl_details", 0],
                        },
                      },
                      {
                        case: {
                          $eq: ["$parts.type", "Kit"],
                        },
                        then: {
                          $arrayElemAt: ["$kit_pl_details", 0],
                        },
                      },
                    ],
                    default: null,
                  },
                },
              },
            },
          },
          {
            $addFields: {
              parts: {
                entry_details: {
                  $switch: {
                    branches: [
                      {
                        case: { $eq: ["$parts.type", "Accessory"] },
                        then: { $arrayElemAt: ["$accessory_details", 0] },
                      },
                      {
                        case: { $eq: ["$parts.type", "Non-Insulated Profile"] },
                        then: { $arrayElemAt: ["$ni_details", 0] },
                      },
                      {
                        case: { $eq: ["$parts.type", "Insulated Profile"] },
                        then: { $arrayElemAt: ["$ins_details", 0] },
                      },
                      {
                        case: { $eq: ["$parts.type", "Kit"] },
                        then: { $arrayElemAt: ["$kit_details", 0] },
                      },
                    ],
                    default: null,
                  },
                },
              },
            },
          },
          {
            $addFields: {
              parts: {
                stock_details: {
                  $switch: {
                    branches: [
                      {
                        case: { $eq: ["$parts.order_type", "Package"] },
                        then: { $arrayElemAt: ["$stock_details", 0] },
                      },
                      {
                        case: { $eq: ["$parts.order_type", "Loose"] },
                        then: { $arrayElemAt: ["$loose_stock_details", 0] },
                      },
                    ],
                    default: null,
                  },
                },
              },
            },
          },
          {
            $lookup: {
              from: "profile_system_models", // Name of the collection for Profile_System_Model
              let: {
                systemField: "$parts.entry_details.system_id",
                subsystemField: "$parts.entry_details.subsystem_id",
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
              localField: "parts.entry_details.group_id",
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
                                "$parts.entry_details.subgroup_id",
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
              localField: "parts.entry_details.supplier_id",
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
              from: "finishes",
              localField: "parts.entry_details.finish_id",
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
                              $eq: ["$$color._id", "$parts.entry_details.color_id"],
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
            $facet: {
              accessoryLookup: [
                {
                  $match: { "parts.type": "Accessory" },
                },
                {
                  $lookup: {
                    from: "materials",
                    localField: "parts.entry_details.material_id",
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
                                    $eq: [
                                      "$$grade._id",
                                      "$parts.entry_details.grade_id",
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
              ],
              niProfileLookup: [
                {
                  $match: {
                    "parts.type": "Non-Insulated Profile",
                  },
                },
                {
                  $lookup: {
                    from: "raw_material_models",
                    localField: "parts.entry_details.material_id",
                    foreignField: "_id",
                    as: "lookup_raw_material",
                  },
                },
                {
                  $addFields: {
                    lookup_raw_material: {
                      $map: {
                        input: "$lookup_raw_material",
                        as: "rawMaterialDetail",
                        in: {
                          _id: "$$rawMaterialDetail._id",
                          name: "$$rawMaterialDetail.name",
                          grade: {
                            $arrayElemAt: [
                              {
                                $filter: {
                                  input: "$$rawMaterialDetail.grade",
                                  as: "grade",
                                  cond: {
                                    $eq: [
                                      "$$grade._id",
                                      "$parts.entry_details.grade_id",
                                    ],
                                  },
                                },
                              },
                              0,
                            ],
                          },
                          alloy: "$$rawMaterialDetail.alloy",
                          temper: "$$rawMaterialDetail.temper",
                        },
                      },
                    },
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              combinedResults: {
                $concatArrays: ["$accessoryLookup", "$niProfileLookup"],
              },
            },
          },
          {
            $unwind: "$combinedResults",
          },
          {
            $replaceRoot: { newRoot: "$combinedResults" },
          },
          {
            $addFields: {
              material: {
                $switch: {
                  branches: [
                    {
                      case: {
                        $eq: ["$parts.type", "Accessory"],
                      },
                      then: {
                        $arrayElemAt: ["$lookup_material.name", 0],
                      },
                    },
                    {
                      case: {
                        $eq: ["$parts.type", "Non-Insulated Profile"],
                      },
                      then: {
                        $arrayElemAt: ["$lookup_raw_material.name", 0],
                      },
                    },
                  ],
                  default: null,
                },
              },
              grade: {
                $switch: {
                  branches: [
                    {
                      case: {
                        $eq: ["$parts.type", "Accessory"],
                      },
                      then: {
                        $arrayElemAt: ["$lookup_material.grade.name", 0],
                      },
                    },
                    {
                      case: {
                        $eq: ["$parts.type", "Non-Insulated Profile"],
                      },
                      then: {
                        $arrayElemAt: ["$lookup_raw_material.grade.name", 0],
                      },
                    },
                  ],
                  default: null,
                },
              },
              alloy: {
                $switch: {
                  branches: [
                    {
                      case: {
                        $eq: ["$parts.type", "Non-Insulated Profile"],
                      },
                      then: {
                        $arrayElemAt: [
                          {
                            $map: {
                              input: "$lookup_raw_material.alloy",
                              as: "alloyItem",
                              in: "$$alloyItem.name",
                            },
                          },
                          0,
                        ],
                      },
                    },
                  ],
                  default: null,
                },
              },
              temper: {
                $switch: {
                  branches: [
                    {
                      case: {
                        $eq: ["$parts.type", "Non-Insulated Profile"],
                      },
                      then: {
                        $arrayElemAt: [
                          {
                            $map: {
                              input: "$lookup_raw_material.temper",
                              as: "temperItem",
                              in: "$$temperItem.name",
                            },
                          },
                          0,
                        ],
                      },
                    },
                  ],
                  default: null,
                },
              },
            },
          },

          {
            $addFields: {
              parts: {
                entry_details: {
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
                  subgroup: {
                    $arrayElemAt: ["$lookup_group_subgroup.subgroup.name", 0],
                  },
                  supplier: {
                    $arrayElemAt: ["$lookup_supplier.name", 0],
                  },
                  supplier_code: {
                    $arrayElemAt: ["$lookup_supplier.code", 0],
                  },
                  material: {
                    $switch: {
                      branches: [
                        {
                          case: {
                            $eq: ["$parts.type", "Accessory"],
                          },
                          then: {
                            $arrayElemAt: ["$lookup_material.name", 0],
                          },
                        },
                        {
                          case: {
                            $eq: ["$parts.type", "Non-Insulated Profile"],
                          },
                          then: {
                            $arrayElemAt: ["$lookup_raw_material.name", 0],
                          },
                        },
                      ],
                      default: null,
                    },
                  },
                  grade: {
                    $switch: {
                      branches: [
                        {
                          case: {
                            $eq: ["$parts.type", "Accessory"],
                          },
                          then: {
                            $arrayElemAt: ["$lookup_material.grade.name", 0],
                          },
                        },
                        {
                          case: {
                            $eq: ["$parts.type", "Non-Insulated Profile"],
                          },
                          then: {
                            $arrayElemAt: ["$lookup_raw_material.grade.name", 0],
                          },
                        },
                      ],
                      default: null,
                    },
                  },
                  finish: {
                    $arrayElemAt: ["$lookup_finish.name", 0],
                  },
                  color: {
                    $arrayElemAt: ["$lookup_finish.color.name", 0],
                  },
                  temper: {
                    $arrayElemAt: ["$temper", 0],
                  },
                  alloy: {
                    $arrayElemAt: ["$alloy", 0],
                  },
                },
              },
            },
          },

          {
            $lookup: {
              from: "history_models",
              localField: "parts.history",
              foreignField: "_id",
              as: "parts.history_details",
            },
          },
          {
            $lookup: {
              from: "project_models",
              localField: "project.id",
              foreignField: "_id",
              as: "projectsDetail",
              pipeline: [
                {
                  $project: {
                    _id: 1,
                    project_name: 1
                  }
                }
              ]
            }
          },
          {
            $group: {
              _id: "$_id",
              lpo: { $first: "$lpo" },
              supplier_id: { $first: "$supplier_id" },
              supplierDetail: {
                $first: "$lookup_supplier"
              },
              currencyDetail: {
                $first: "$lookup_currency"
              },
              status: { $first: "$status" },
              inquiry_ref: { $first: "$inquiry_ref" },
              supplier_contact: {
                $first: "$supplier_contact"
              },
              project: { $first: "$projectsDetail" },
              organization: { $first: "$organization" },
              order_type: { $first: "$order_type" },
              supplier_date: { $first: "$supplier_date" },
              remark: { $first: "$remark" },
              revision: { $first: "$revision" },
              quantity_total: {
                $first: "$quantity_total"
              },
              totalWeight_total: {
                $first: "$totalWeight_total"
              },
              totalPrice_total: {
                $first: "$totalPrice_total"
              },
              form_rev_date: { $first: "$form_rev_date" },
              ref_code_rev: { $first: "$ref_code_rev" },
              update_count: { $first: "$update_count" },
              parts: { $push: "$parts" },
              payments: { $first: "$payments" },
              supplier_qtn_ref: {
                $first: "$supplier_qtn_ref"
              },
              purchase_order_num: {
                $first: "$purchase_order_num"
              },
              supplier_trn: { $first: "$supplier_trn" },
              vat: { $first: "$vat" },
              grandTotal: { $first: "$grandTotal" },
              percentage_of_vat: {
                $first: "$percentage_of_vat"
              },
              purchaseFor: { $first: "$purchaseFor" },
              freeFields: { $first: "$freeFields" }
            }
          },
          {
            $addFields: {
              parts: {
                $map: {
                  input: "$parts",
                  as: "part",
                  in: {
                    order_type: "$$part.order_type",
                    code_id: "$$part.code_id",
                    ref_code_id: "$$part.ref_code_id",
                    cost: "$$part.cost",
                    quantity: "$$part.quantity",
                    type: "$$part.type",
                    entry_details: "$$part.entry_details",
                    stock_details: "$$part.stock_details",
                    pl_details: "$$part.pl_details",
                    history: "$$part.history_details",
                    quantity: "$$part.quantity",
                    unit_price: "$$part.unit_price",
                    total_price: "$$part.total_price",
                    total_weight: "$$part.total_weight",
                    delivery_point:
                      "$$part.delivery_point",
                    remarks: "$$part.remarks",
                    received: {
                      $sum: {
                        $map: {
                          input: "$$part.history_details",
                          as: "history",
                          in: "$$history.received"
                        }
                      }
                    },
                    balance: {
                      $subtract: [
                        "$$part.quantity",
                        {
                          $sum: {
                            $map: {
                              input:
                                "$$part.history_details",
                              as: "history",
                              in: "$$history.received"
                            }
                          }
                        }
                      ]
                    },
                    // eta: null,
                    // image: [null],
                    eta: "$$part.eta",
                    image: [null],
                    eta: {
                      $arrayElemAt: [
                        "$$part.history_details",
                        -1
                      ]
                    },
                    image: {
                      $arrayElemAt: [
                        "$$part.history_details",
                        -1
                      ]
                    }
                  }
                }
              },
            }
          }
        ]
        if (po.freeFields.length) {
          partsPipeline.push(
            {
              $unwind: "$freeFields"
            },
            {
              $lookup: {
                from: "history_models",
                localField: "freeFields.history",
                foreignField: "_id",
                as: "freeFields.history_details"
              }
            },
            {
              $lookup: {
                from: "project_models",
                localField: "project.id",
                foreignField: "_id",
                as: "projectsDetail",
                pipeline: [
                  {
                    $project: {
                      _id: 1,
                      project_name: 1
                    }
                  }
                ]
              }
            },
            {
              $group: {
                _id: "$_id",
                lpo: { $first: "$lpo" },
                supplier_id: { $first: "$supplier_id" },
                supplierDetail: {
                  $first: "$supplierDetail"
                },
                currencyDetail: {
                  $first: "$currencyDetail"
                },
                status: { $first: "$status" },
                inquiry_ref: { $first: "$inquiry_ref" },
                supplier_contact: {
                  $first: "$supplier_contact"
                },
                project: { $first: "$projectsDetail" },
                organization: { $first: "$organization" },
                order_type: { $first: "$order_type" },
                supplier_date: { $first: "$supplier_date" },
                remark: { $first: "$remark" },
                revision: { $first: "$revision" },
                quantity_total: {
                  $first: "$quantity_total"
                },
                totalWeight_total: {
                  $first: "$totalWeight_total"
                },
                totalPrice_total: {
                  $first: "$totalPrice_total"
                },
                form_rev_date: { $first: "$form_rev_date" },
                ref_code_rev: { $first: "$ref_code_rev" },
                update_count: { $first: "$update_count" },
                parts: { $first: "$parts" },
                payments: { $first: "$payments" },
                supplier_qtn_ref: {
                  $first: "$supplier_qtn_ref"
                },
                purchase_order_num: {
                  $first: "$purchase_order_num"
                },
                supplier_trn: { $first: "$supplier_trn" },
                vat: { $first: "$vat" },
                grandTotal: { $first: "$grandTotal" },
                percentage_of_vat: {
                  $first: "$percentage_of_vat"
                },
                purchaseFor: { $first: "$purchaseFor" },
                freeFields: { $push: "$freeFields" }
              }
            },
            {
              $addFields: {
                freeFields: {
                  $map: {
                    input: "$freeFields",
                    as: "part",
                    in: {
                      $mergeObjects: [
                        "$$part",
                        {
                          history: "$$part.history_details",
                          received: {
                            $sum: {
                              $map: {
                                input:
                                  "$$part.history_details",
                                as: "history",
                                in: "$$history.received"
                              }
                            }
                          },
                          balance: {
                            $subtract: [
                              "$$part.quantity",
                              {
                                $sum: {
                                  $map: {
                                    input:
                                      "$$part.history_details",
                                    as: "history",
                                    in: "$$history.received"
                                  }
                                }
                              }
                            ]
                          },
                          // eta: "$$part.eta",
                          image: "$$part.image",
                          eta: {
                            $arrayElemAt: [
                              "$$part.history_details",
                              -1
                            ]
                          },
                        }
                      ]
                    }
                  }
                }
              }
            })
        }
      } else {
        partsPipeline = [
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
              from: "currency_models",
              localField: "lookup_supplier.currency_id",
              foreignField: "_id",
              as: "lookup_currency",
            },
          },
          {
            $unwind: "$freeFields"
          },
          {
            $lookup: {
              from: "history_models",
              localField: "freeFields.history",
              foreignField: "_id",
              as: "freeFields.history_details"
            }
          },
          {
            $lookup: {
              from: "project_models",
              localField: "project.id",
              foreignField: "_id",
              as: "projectsDetail",
              pipeline: [
                {
                  $project: {
                    _id: 1,
                    project_name: 1
                  }
                }
              ]
            }
          },
          {
            $group: {
              _id: "$_id",
              lpo: { $first: "$lpo" },
              supplier_id: { $first: "$supplier_id" },
              supplierDetail: {
                $first: "$lookup_supplier"
              },
              currencyDetail: {
                $first: "$lookup_currency"
              },
              status: { $first: "$status" },
              inquiry_ref: { $first: "$inquiry_ref" },
              supplier_contact: {
                $first: "$supplier_contact"
              },
              project: { $first: "$projectsDetail" },
              organization: { $first: "$organization" },
              order_type: { $first: "$order_type" },
              supplier_date: { $first: "$supplier_date" },
              remark: { $first: "$remark" },
              revision: { $first: "$revision" },
              quantity_total: {
                $first: "$quantity_total"
              },
              totalWeight_total: {
                $first: "$totalWeight_total"
              },
              totalPrice_total: {
                $first: "$totalPrice_total"
              },
              form_rev_date: { $first: "$form_rev_date" },
              ref_code_rev: { $first: "$ref_code_rev" },
              update_count: { $first: "$update_count" },
              parts: { $first: "$parts" },
              payments: { $first: "$payments" },
              supplier_qtn_ref: {
                $first: "$supplier_qtn_ref"
              },
              purchase_order_num: {
                $first: "$purchase_order_num"
              },
              supplier_trn: { $first: "$supplier_trn" },
              vat: { $first: "$vat" },
              grandTotal: { $first: "$grandTotal" },
              percentage_of_vat: {
                $first: "$percentage_of_vat"
              },
              purchaseFor: { $first: "$purchaseFor" },
              freeFields: { $push: "$freeFields" }
            }
          },
        ]
      }
      const lpo = await Purchase_Model.aggregate(partsPipeline);

      const parts_detail = await Promise.all(
        lpo[0]?.parts.map(async (itm) => {
          if (itm?.type === "Accessory" || itm?.type === "Kit") {
            let eta = itm?.eta?.eta || itm?.eta;
            return {
              type: itm.type,
              code: itm?.entry_details?.code,
              supplier_code: itm?.entry_details?.supplier_code,
              image: itm?.entry_details?.image,
              description: itm?.entry_details?.description,
              material: itm?.entry_details?.material,
              grade: itm?.entry_details?.grade,
              color: itm?.entry_details?.color,
              finish: itm?.entry_details?.finish,
              unit_weight: itm?.entry_details?.unit_weight,
              total_weight: itm?.total_weight,
              quantity: itm?.quantity,
              unit:
                itm?.order_type === "Package"
                  ? itm?.stock_details?.packing_unit
                  : itm?.entry_details?.unit,
              unit_price: itm?.unit_price,
              total_price: itm?.total_price,
              delivery_point: itm?.delivery_point,
              remarks: itm?.remarks,
              received: itm?.received,
              eta: eta ? formatDate(eta) : "-",
              historyimage: itm?.eta?.image || itm?.image,
            };
          }
          if (
            itm?.type === "Non-Insulated Profile" ||
            itm?.type == "Insulated Profile"
          ) {
            let eta = itm?.eta?.eta || itm?.eta;
            return {
              type: itm?.type,
              code: itm?.entry_details?.code,
              supplier_code: itm?.entry_details?.supplier_code,
              image: itm?.entry_details?.image,
              description: itm?.entry_details?.description,
              alloy: itm?.entry_details?.alloy,
              grade: itm?.entry_details?.grade,
              temper: itm?.entry_details?.temper,
              finish: itm?.entry_details?.finish,
              length: itm?.stock_details?.packing_quantity,
              quantity: itm?.quantity,
              unit_weight: itm?.entry_details?.unit_weight,
              total_weight: itm?.total_weight,
              unit:
                itm?.order_type === "Package"
                  ? itm?.stock_details?.packing_unit
                  : itm?.entry_details?.unit,
              unit_price: itm?.unit_price,
              total_price: itm?.total_price,
              delivery_point: itm?.delivery_point,
              remarks: itm?.remarks,
              received: itm?.received,
              eta: eta ? formatDate(eta) : "-",
              historyimage: itm?.eta?.image || itm?.image,
            };
          }
        })
      );

      const payments = lpo[0].payments.map((itm) => {
        return {
          title: itm.title,
          val: itm.val,
          amount: itm.amount,
          paydate: formatDate(itm.paydate),
        };
      });

      const supplier_detail = await Accessories_Supplier_Model.find({
        _id: lpo[0].supplier_id,
      });
      let templateData = {
        parts: parts_detail || [],
        freeFields: lpo[0].freeFields || [],
        payments: payments || [],
        supplier_detail: supplier_detail || [],
        supplier_qtn_ref: lpo[0].supplier_qtn_ref || "",
        purchase_order_num: lpo[0].purchase_order_num || "",
        vat: lpo[0].vat || "",
        percentage_of_vat: lpo[0].percentage_of_vat || "",
        grandTotal: lpo[0].grandTotal || "",
        organization: lpo[0].organization || {},
        supplier: lpo[0].supplier || "",
        supplier_currency: lpo[0].currencyDetail[0]?.code || "",
        supplier_trn: lpo[0].supplier_trn || "",
        inquiryRef: lpo[0].inquiry_ref || "",
        supplier_date: lpo[0].supplier_date || "",
        purchaseFor: lpo[0].purchaseFor || "",
        selectedProject: lpo[0].project || "",
        selectedContact: lpo[0].supplier_contact || {},
        remark: lpo[0].remark || "",
        revision: lpo[0].revision,
        quantity_total: lpo[0].quantity_total || "",
        totalWeight_total: lpo[0].totalWeight_total || "",
        totalPrice_total: lpo[0].totalPrice_total || "",
        form_rev_date: lpo[0].form_rev_date || "",
        ref_code_rev: lpo[0].ref_code_rev || "",
      };

      const htmlpath = path.join(
        __dirname,
        `../uploads/purchase_order/${lpo[0].purchase_order_num}.html`
      );
      const pdfpath = path.join(
        __dirname,
        `../uploads/purchase_order/${lpo[0].purchase_order_num}.pdf`
      );
      const filePath = path.join(__dirname, "../view/purchase_order.ejs");

      ejs.renderFile(filePath, templateData, (err, data) => {
        if (err) {
          console.log("Error rendering template:", err);
          return reject(err);
        }

        fs.writeFile(htmlpath, data, (err) => {
          if (err) {
            console.error("Error writing HTML file:", err);
            return reject(err);
          }

          console.log("HTML file saved successfully!");
          pdf
            .create(data, {
              format: "A2",
              width: "1600px",
              childProcessOptions: {
                env: {
                  OPENSSL_CONF: "/dev/null",
                },
              },
              header: {
                height: "10mm",
              },
              footer: {
                height: "30mm",
                contents: {
                  default: `
                      <div style=" text-align: center;">
                        <table 
              role="presentation" 
              style="
                width: 100%; 
                border:none; 
                margin-bottom: 10px; 
                border-collapse:collapse; 
                font-size: 12px;
                margin-left:4px;
                margin-right:4px;"
            >
              <tr>
                 <td style="padding:0px 0px 0px 25px; border:none;text-align: left;">
                  Reference Code Rev: ${lpo[0].ref_code_rev}
                </td>
                <td style="padding:0px 30px 0px 0px; border:none; text-align: right;">
                  Form Rev Date: ${lpo[0].form_rev_date}
                </td>
              </tr>
            </table>
                        <p
                          style="
                            font-weight: bold;
                            font-size: 14px;  
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                            color: #000;
                          "
                        >
                        THIS IS A SOFTWARE GENERATED PURCHASE ORDER AND DOES NOT REQUIRE SIGNATURE AND STAMP
                        </p>
                      </div>
                      <div style="text-align: center; margin-top:8px;">Page {{page}} of {{pages}}</div>
                      `,
                },
              },
            })
            .toFile(pdfpath, (err) => {
              if (err) {
                console.error("Error generating PDF:", err);
                return reject(err);
              }

              fs.unlinkSync(htmlpath);
              const pdfUrl = `${process.env.BACKENDURL}/uploads/purchase_order/${lpo[0].purchase_order_num}.pdf`;
              resolve({
                mssg: "PDF created successfully!",
                url: pdfUrl,
                pdfpath,
              });
            });
        });
      });
    } catch (error) {
      console.error("Error in lpo generation:", error);
      reject(error);
    }
  });
};

const send_po_mail = async (req, res) => {
  try {
    const { id } = req.body;
    const po = await Purchase_Model.findById(id);
    pdfData = await lpo_pdf_maker(id);
    const message = {
      email: po.supplier_contact.email,
      purchase_order_num: po.purchase_order_num,
      name: po.supplier_contact.name,
      organization: po.organization.org_name,
    };
    const subject = `${po.purchase_order_num}`;
    let files = [{ filename: "procurement order.pdf", path: pdfData.pdfpath }, ...po.files];
    await sendPurchase(
      po.supplier_contact.email,
      subject,
      message,
      files,
      res
    );
    return res.status(200).json({ mssg: "Email sent successfully!" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};

const purchase_order_pdf = async (req, res) => {
  try {
    const { id } = req.body;

    const pdfData = await lpo_pdf_maker(id);
    return res.status(200).json({
      mssg: "PDF created successfully!",
      url: pdfData.url,
    });
  } catch (error) {
    console.error("Error in purchase_order_pdf:", error);
    return res.status(500).json({ mssg: "Server Error", error });
  }
};

const add_purchase_order = async (req, res) => {
  const session = await mongoose.startSession(); // Start a session
  session.startTransaction(); // Begin transaction
  try {
    const {
      supplier,
      supplier_qtn_ref,
      supplier_currency,
      supplier_trn,
      purchase_order_num,
      vat,
      percentage_of_vat,
      grandTotal,
      inquiryRef,
      supplier_date,
      remark,
      revision,
      quantity_total,
      totalWeight_total,
      totalPrice_total,
      form_rev_date,
      ref_code_rev,
      inquiry_id,
      purchaseFor,
    } = req.body;
    const selectedProject = req.body.selectedProject.length ? JSON.parse(req.body.selectedProject) : []
    const parts = JSON.parse(req.body.parts)
    const freeFields = req.body?.freeFields ? JSON.parse(req.body?.freeFields) : []
    const payments = JSON.parse(req.body.payments)
    const oldFiles = JSON.parse(req.body.oldFiles) || []
    const selectedContact = JSON.parse(req.body.selectedContact)
    const selectedfilterOrg = JSON.parse(req.body.selectedfilterOrg)
    const fileObjects = await Promise.all(req.files);
    let attachments = fileObjects.map((file) => ({
      name: file.filename,
      path: `${process.env.BACKENDURL}/uploads/${file.filename}`,
    }));
    if (
      !supplier ||
      //  ||
      // !selectedProjectName ||
      // !selectedContact?.name ||
      // !selectedContact?.email ||
      !supplier_qtn_ref
    ) {
      return res
        .status(400)
        .json({ mssg: "Supplier, Quotation Number Are Required" });
    }
    const invalidPart = parts?.some(
      (part) =>
        !checkInteger(part?.quantity) ||
        part?.quantity < 0 ||
        part?.quantity === 0 ||
        part?.quantity === "" ||
        part?.quantity === undefined
    );

    const invalidFree = freeFields?.some(
      (part) =>
        !checkInteger(part?.quantity) ||
        part?.quantity < 0 ||
        part?.quantity === 0 ||
        part?.quantity === "" ||
        part?.quantity === undefined
    );
    if (invalidPart || invalidFree) {
      return res.status(400).json({
        mssg: "Each part and free field must have a quantity greater than 0 and must be a whole number."
      });
    }
    const invalidUnitPrice = parts?.some(
      (part) =>
        part?.unit_price < 0 ||
        part?.unit_price === null ||
        part?.unit_price === 0 ||
        part?.unit_price === undefined ||
        (part?.unit_price === "" && part?.total_price === null) ||
        part?.total_price === 0 ||
        part?.total_price === undefined ||
        (part?.total_price === "" && part?.delivery_point === null) ||
        part?.delivery_point === undefined ||
        part?.delivery_point === ""
    );
    const invalidUnitPriceforFree = freeFields?.some(
      (part) =>
        part?.unit_price < 0 ||
        part?.unit_price === null ||
        part?.unit_price === 0 ||
        part?.unit_price === undefined ||
        (part?.unit_price === "" && part?.total_price === null) ||
        part?.total_price === 0 ||
        part?.total_price === undefined ||
        (part?.total_price === "" && part?.delivery_point === null) ||
        part?.delivery_point === undefined ||
        part?.delivery_point === ""
    );

    if (invalidUnitPrice || invalidUnitPriceforFree) {
      return res.status(400).json({
        mssg: "Unit Price, Total Price and Delivery Point are required for all parts and Price cannot be negative.",
      });
    }
    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      return res.status(400).json({
        mssg: "Payments are required and cannot be empty.",
      });
    }
    const totalPaymentVal = payments.reduce((sum, payment) => {
      const value = parseFloat(payment?.val);
      return sum + (isNaN(value) ? 0 : value);
    }, 0);
    if (totalPaymentVal !== 100) {
      return res.status(400).json({
        mssg: "All payment values must be equal to 100.",
      });
    }

    const validated_parts = await parts.filter(validateParts);
    if (validated_parts.length === 0 && parts.length > 0) {
      return res.status(400).json({ mssg: "Please complete a single Part" });
    }
    // let ifExisting = []
    // await Promise.all(parts.map(async (itm) => {
    //   const ifSame = await Purchase_Model.find({
    //     parts: {
    //       $elemMatch: {
    //         code_id: new mongoose.Types.ObjectId(itm.code_id),
    //         quantity: parseInt(itm.quantity)
    //       }
    //     }
    //   }, { purchase_order_num: 1, _id: 0 })
    //   if (ifSame.length) {
    //     ifExisting.push({ type: "Parts", po: ifSame, code: itm.code || itm.stock_details.packing_code || itm.entry_details.code })
    //   }
    // }))

    // await Promise.all(freeFields.map(async (itm) => {
    //   const ifSame = await Purchase_Model.find({
    //     freeFields: {
    //       $elemMatch: {
    //         code: itm.code,
    //         quantity: parseInt(itm.quantity)
    //       }
    //     }
    //   }, { purchase_order_num: 1, _id: 0 })
    //   if (ifSame.length) {
    //     ifExisting.push({ type: "FreeFields", po: ifSame, code: itm.code })
    //   }
    // }))
    // if (ifExisting.length) {
    //   let formattedMessage = "Code(s) already exist in another Purchase Order with the same quantity. Please change the quantity to save.\n\n";

    //   ifExisting.forEach(item => {
    //     const poRefs = item.po.map(i => i.purchase_order_num).join(', ');
    //     formattedMessage += `Type: ${item.type}\n  Code: ${item.code}\n  Purchase Order: ${poRefs}\n\n`;
    //   });

    //   return res.status(400).json({ mssg: formattedMessage.trim() });
    // }

    const free_fields_arr = freeFields ? await createFreeFieldArray(purchase_order_num, freeFields, session) : []
    const final_parts_arr = parts.length ? await createPartArray(
      inquiry_id ? "inquiry" : "direct",
      purchase_order_num,
      validated_parts,
      session
    ) : []

    const new_po = await Purchase_Model.create([{
      supplier_id: supplier,
      parts: final_parts_arr,
      payments: payments,
      supplier_qtn_ref,
      supplier_currency,
      purchase_order_num,
      vat,
      percentage_of_vat,
      grandTotal,
      supplier_trn,
      organization: selectedfilterOrg,
      project: selectedProject,
      supplier_contact: selectedContact,
      inquiry_ref: inquiryRef,
      supplier_date: supplier_date,
      remark: remark,
      revision: revision,
      quantity_total,
      totalWeight_total,
      totalPrice_total,
      form_rev_date,
      ref_code_rev,
      purchaseFor,

      freeFields: free_fields_arr,
      files: [...oldFiles, ...attachments]
      // $inc: { revision: 1 },
    }], { session: session });

    for (const part of parts) {
      if (part.order_type == "Package") {
        let partDetail = await Stock_model.findById(part.code_id).session(session)
        if (partDetail.msq > partDetail.free_inventory) {
          let newAction = await Action_model.findOneAndUpdate({ code_id: part.code_id },
            { $addToSet: { purchaseOrderId: new_po[0]._id } },
            { new: true }
          ).session(session)
        }
      } else if (part.order_type == "Loose") {
        let partDetail = await Loose_Stock_model.findById(part.code_id).session(session)
        if (partDetail.msq > partDetail.free_inventory) {
          let newAction = await Action_model.findOneAndUpdate({ code_id: part.code_id },
            { $addToSet: { purchaseOrderId: new_po[0]._id } },
            { new: true }
          ).session(session)
        }
      }
    }

    if (inquiry_id != null && inquiry_id != undefined && inquiry_id != "") {
      const inquiry = await Inquiry_Model.findByIdAndUpdate(
        inquiry_id,
        {
          status: "Archive",
          purchaseOrder_id: new_po[0]._id
        },
        { new: true }
      ).session(session)
      const updatedInquiries = await Inquiry_Model.updateMany({ inquiry_ref: inquiry.inquiry_ref }, {
        status: "Archive",
        purchaseOrder_id: new_po[0]._id
      }).session(session)
    }
    await session.commitTransaction(); // Commit all operations
    session.endSession();
    return res
      .status(200)
      .json({ mssg: "Purchase Order Added", purchase_id: new_po[0]._id });
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};

const get_all_purchases = async (req, res) => {
  try {
    let { search, page, filter } = req.query;
    let searchRegex = { $regex: new RegExp(".*" + search + ".*", "i") };
    const limit = 10;
    const pageNumber = parseInt(page) || 1;
    const skip = (pageNumber - 1) * limit;
    let and = [{}];
    if (filter.status) {
      and.push({ status: filter.status });
    }
    if (filter.supplier) {
      and.push({ supplier_id: new mongoose.Types.ObjectId(filter.supplier) });
    }
    let where = {
      // $or: [{ purchase_order_num: searchRegex }],
      $and: and,
    };
    const result = await Purchase_Model.aggregate([
      {
        $lookup: {
          from: "accessories_supplier_models",
          localField: "supplier_id",
          foreignField: "_id",
          as: "supplierDetail",
        },
      },
      {
        $addFields: {
          supplier: { $arrayElemAt: ["$supplierDetail.name", 0] },
          supplier_code: { $arrayElemAt: ["$supplierDetail.code", 0] },
        },
      },
      {
        $match: where,
      },
      {
        $sort: {
          createdAt: -1
        }
      },
      {
        $group: {
          _id: "$purchase_order_num",
          latestPO: { $first: "$$ROOT" }, // Keep the latest inquiry
          prevPO: {
            $push: {
              _id: "$_id",
              revision: "$revision",
            },
          },
        },
      },
      {
        $addFields: {
          latestPO: {
            prevPO: {
              $filter: {
                input: "$prevPO",
                as: "po",
                cond: { $ne: ["$$po._id", "$latestPO._id"] },
              },
            },
          },
        },
      },
      {
        $replaceRoot: { newRoot: "$latestPO" }
      },
      {
        $sort: { createdAt: -1 },
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
    ]);
    // const result = await Purchase_Model.find(where)
    //   .limit(limit)
    //   .skip(skip)
    //   .sort({ createdAt: -1 });

    const totalCount = await Purchase_Model.countDocuments(where);
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

const get_single_purchase = async (req, res) => {
  try {
    const id = req.params.id;
    const po = await Purchase_Model.findById(id)
    if (po.parts.length) {
      const partsPipeline = [
        {
          $match: {
            _id: new mongoose.Types.ObjectId(id),
          },
        },
        {
          $unwind: "$parts",
        },
        {
          $lookup: {
            from: "loose_stock_models",
            localField: "parts.code_id",
            foreignField: "_id",
            as: "loose_stock_details",
            pipeline: [
              { $match: { active: true } }
            ]
          },
        },
        {
          $lookup: {
            from: "stock_models",
            localField: "parts.code_id",
            foreignField: "_id",
            as: "stock_details",
            pipeline: [
              { $match: { active: true } }
            ]
          },
        },
        {
          $lookup: {
            from: "accessories_input_models",
            localField: "parts.ref_code_id",
            foreignField: "_id",
            as: "accessory_details",
          },
        },
        {
          $lookup: {
            from: "profile_input_models",
            localField: "parts.ref_code_id",
            foreignField: "_id",
            as: "ni_details",
          },
        },
        {
          $lookup: {
            from: "profile_insulated_inputs",
            localField: "parts.ref_code_id",
            foreignField: "_id",
            as: "ins_details",
          },
        },
        {
          $lookup: {
            from: "kit_inputs",
            localField: "parts.ref_code_id",
            foreignField: "_id",
            as: "kit_details",
          },
        },
        {
          $lookup: {
            from: "accessories_calculators",
            localField: "parts.ref_code_id",
            foreignField: "input_model_id",
            as: "acc_pl_details",
          },
        },
        {
          $lookup: {
            from: "profile_calculators",
            localField: "parts.ref_code_id",
            foreignField: "input_model_id",
            as: "ni_pl_details",
          },
        },
        {
          $lookup: {
            from: "profile_insulated_calculators",
            localField: "parts.ref_code_id",
            foreignField: "input_model_id",
            as: "ins_pl_details",
          },
        },
        {
          $lookup: {
            from: "kit_calculators",
            localField: "parts.ref_code_id",
            foreignField: "input_model_id",
            as: "kit_pl_details",
          },
        },
        {
          $addFields: {
            parts: {
              pl_details: {
                $switch: {
                  branches: [
                    {
                      case: {
                        $eq: ["$parts.type", "Accessory"],
                      },
                      then: {
                        $arrayElemAt: ["$acc_pl_details", 0],
                      },
                    },
                    {
                      case: {
                        $eq: ["$parts.type", "Non-Insulated Profile"],
                      },
                      then: {
                        $arrayElemAt: ["$ni_pl_details", 0],
                      },
                    },
                    {
                      case: {
                        $eq: ["$parts.type", "Insulated Profile"],
                      },
                      then: {
                        $arrayElemAt: ["$ins_pl_details", 0],
                      },
                    },
                    {
                      case: {
                        $eq: ["$parts.type", "Kit"],
                      },
                      then: {
                        $arrayElemAt: ["$kit_pl_details", 0],
                      },
                    },
                  ],
                  default: null,
                },
              },
            },
          },
        },
        {
          $addFields: {
            parts: {
              entry_details: {
                $switch: {
                  branches: [
                    {
                      case: { $eq: ["$parts.type", "Accessory"] },
                      then: { $arrayElemAt: ["$accessory_details", 0] },
                    },
                    {
                      case: { $eq: ["$parts.type", "Non-Insulated Profile"] },
                      then: { $arrayElemAt: ["$ni_details", 0] },
                    },
                    {
                      case: { $eq: ["$parts.type", "Insulated Profile"] },
                      then: { $arrayElemAt: ["$ins_details", 0] },
                    },
                    {
                      case: { $eq: ["$parts.type", "Kit"] },
                      then: { $arrayElemAt: ["$kit_details", 0] },
                    },
                  ],
                  default: null,
                },
              },
            },
          },
        },
        {
          $addFields: {
            parts: {
              stock_details: {
                $switch: {
                  branches: [
                    {
                      case: { $eq: ["$parts.order_type", "Package"] },
                      then: { $arrayElemAt: ["$stock_details", 0] },
                    },
                    {
                      case: { $eq: ["$parts.order_type", "Loose"] },
                      then: { $arrayElemAt: ["$loose_stock_details", 0] },
                    },
                  ],
                  default: null,
                },
              },
            },
          },
        },
        {
          $lookup: {
            from: "profile_system_models", // Name of the collection for Profile_System_Model
            let: {
              systemField: "$parts.entry_details.system_id",
              subsystemField: "$parts.entry_details.subsystem_id",
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
            localField: "parts.entry_details.group_id",
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
                              "$parts.entry_details.subgroup_id",
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
            localField: "parts.entry_details.supplier_id",
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
            from: "finishes",
            localField: "parts.entry_details.finish_id",
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
                            $eq: ["$$color._id", "$parts.entry_details.color_id"],
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
          $facet: {
            accessoryLookup: [
              {
                $match: { "parts.type": "Accessory" },
              },
              {
                $lookup: {
                  from: "materials",
                  localField: "parts.entry_details.material_id",
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
                                  $eq: [
                                    "$$grade._id",
                                    "$parts.entry_details.grade_id",
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
            ],
            niProfileLookup: [
              {
                $match: {
                  "parts.type": "Non-Insulated Profile",
                },
              },
              {
                $lookup: {
                  from: "raw_material_models",
                  localField: "parts.entry_details.material_id",
                  foreignField: "_id",
                  as: "lookup_raw_material",
                },
              },
              {
                $addFields: {
                  lookup_raw_material: {
                    $map: {
                      input: "$lookup_raw_material",
                      as: "rawMaterialDetail",
                      in: {
                        _id: "$$rawMaterialDetail._id",
                        name: "$$rawMaterialDetail.name",
                        grade: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: "$$rawMaterialDetail.grade",
                                as: "grade",
                                cond: {
                                  $eq: [
                                    "$$grade._id",
                                    "$parts.entry_details.grade_id",
                                  ],
                                },
                              },
                            },
                            0,
                          ],
                        },
                        alloy: "$$rawMaterialDetail.alloy",
                        temper: "$$rawMaterialDetail.temper",
                      },
                    },
                  },
                },
              },
            ],
          },
        },
        {
          $addFields: {
            combinedResults: {
              $concatArrays: ["$accessoryLookup", "$niProfileLookup"],
            },
          },
        },
        {
          $unwind: "$combinedResults",
        },
        {
          $replaceRoot: { newRoot: "$combinedResults" },
        },
        {
          $addFields: {
            material: {
              $switch: {
                branches: [
                  {
                    case: {
                      $eq: ["$parts.type", "Accessory"],
                    },
                    then: {
                      $arrayElemAt: ["$lookup_material.name", 0],
                    },
                  },
                  {
                    case: {
                      $eq: ["$parts.type", "Non-Insulated Profile"],
                    },
                    then: {
                      $arrayElemAt: ["$lookup_raw_material.name", 0],
                    },
                  },
                ],
                default: null,
              },
            },
            grade: {
              $switch: {
                branches: [
                  {
                    case: {
                      $eq: ["$parts.type", "Accessory"],
                    },
                    then: {
                      $arrayElemAt: ["$lookup_material.grade.name", 0],
                    },
                  },
                  {
                    case: {
                      $eq: ["$parts.type", "Non-Insulated Profile"],
                    },
                    then: {
                      $arrayElemAt: ["$lookup_raw_material.grade.name", 0],
                    },
                  },
                ],
                default: null,
              },
            },
            alloy: {
              $switch: {
                branches: [
                  {
                    case: {
                      $eq: ["$parts.type", "Non-Insulated Profile"],
                    },
                    then: {
                      $arrayElemAt: [
                        {
                          $map: {
                            input: "$lookup_raw_material.alloy",
                            as: "alloyItem",
                            in: "$$alloyItem.name",
                          },
                        },
                        0,
                      ],
                    },
                  },
                ],
                default: null,
              },
            },
            temper: {
              $switch: {
                branches: [
                  {
                    case: {
                      $eq: ["$parts.type", "Non-Insulated Profile"],
                    },
                    then: {
                      $arrayElemAt: [
                        {
                          $map: {
                            input: "$lookup_raw_material.temper",
                            as: "temperItem",
                            in: "$$temperItem.name",
                          },
                        },
                        0,
                      ],
                    },
                  },
                ],
                default: null,
              },
            },
          },
        },

        {
          $addFields: {
            parts: {
              entry_details: {
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
                subgroup: {
                  $arrayElemAt: ["$lookup_group_subgroup.subgroup.name", 0],
                },
                supplier: {
                  $arrayElemAt: ["$lookup_supplier.name", 0],
                },
                supplier_code: {
                  $arrayElemAt: ["$lookup_supplier.code", 0],
                },
                material: {
                  $switch: {
                    branches: [
                      {
                        case: {
                          $eq: ["$parts.type", "Accessory"],
                        },
                        then: {
                          $arrayElemAt: ["$lookup_material.name", 0],
                        },
                      },
                      {
                        case: {
                          $eq: ["$parts.type", "Non-Insulated Profile"],
                        },
                        then: {
                          $arrayElemAt: ["$lookup_raw_material.name", 0],
                        },
                      },
                    ],
                    default: null,
                  },
                },
                grade: {
                  $switch: {
                    branches: [
                      {
                        case: {
                          $eq: ["$parts.type", "Accessory"],
                        },
                        then: {
                          $arrayElemAt: ["$lookup_material.grade.name", 0],
                        },
                      },
                      {
                        case: {
                          $eq: ["$parts.type", "Non-Insulated Profile"],
                        },
                        then: {
                          $arrayElemAt: ["$lookup_raw_material.grade.name", 0],
                        },
                      },
                    ],
                    default: null,
                  },
                },
                finish: {
                  $arrayElemAt: ["$lookup_finish.name", 0],
                },
                color: {
                  $arrayElemAt: ["$lookup_finish.color.name", 0],
                },
                temper: {
                  $arrayElemAt: ["$temper", 0],
                },
                alloy: {
                  $arrayElemAt: ["$alloy", 0],
                },
              },
            },
          },
        },

        {
          $lookup: {
            from: "history_models",
            localField: "parts.history",
            foreignField: "_id",
            as: "parts.history_details",
          },
        },
        {
          $lookup: {
            from: "project_models",
            localField: "project.id",
            foreignField: "_id",
            as: "projectsDetail",
            pipeline: [
              {
                $project: {
                  _id: 1,
                  project_name: 1
                }
              }
            ]
          }
        },
        {
          $group: {
            _id: "$_id",
            lpo: { $first: "$lpo" },
            supplier_id: { $first: "$supplier_id" },
            supplierDetail: {
              $first: "$lookup_supplier"
            },
            currencyDetail: {
              $first: "$lookup_currency"
            },
            status: { $first: "$status" },
            inquiry_ref: { $first: "$inquiry_ref" },
            supplier_contact: {
              $first: "$supplier_contact"
            },
            project: { $first: "$projectsDetail" },
            organization: { $first: "$organization" },
            order_type: { $first: "$order_type" },
            supplier_date: { $first: "$supplier_date" },
            remark: { $first: "$remark" },
            revision: { $first: "$revision" },
            quantity_total: {
              $first: "$quantity_total"
            },
            totalWeight_total: {
              $first: "$totalWeight_total"
            },
            totalPrice_total: {
              $first: "$totalPrice_total"
            },
            form_rev_date: { $first: "$form_rev_date" },
            ref_code_rev: { $first: "$ref_code_rev" },
            update_count: { $first: "$update_count" },
            parts: { $push: "$parts" },
            payments: { $first: "$payments" },
            supplier_qtn_ref: {
              $first: "$supplier_qtn_ref"
            },
            purchase_order_num: {
              $first: "$purchase_order_num"
            },
            supplier_trn: { $first: "$supplier_trn" },
            vat: { $first: "$vat" },
            grandTotal: { $first: "$grandTotal" },
            percentage_of_vat: {
              $first: "$percentage_of_vat"
            },
            purchaseFor: { $first: "$purchaseFor" },
            freeFields: { $first: "$freeFields" },
            files: { $first: "$files" },
          }
        },
        {
          $addFields: {
            parts: {
              $map: {
                input: "$parts",
                as: "part",
                in: {
                  order_type: "$$part.order_type",
                  code_id: "$$part.code_id",
                  ref_code_id: "$$part.ref_code_id",
                  cost: "$$part.cost",
                  quantity: "$$part.quantity",
                  type: "$$part.type",
                  entry_details: "$$part.entry_details",
                  stock_details: "$$part.stock_details",
                  pl_details: "$$part.pl_details",
                  history: "$$part.history_details",
                  quantity: "$$part.quantity",
                  unit_price: "$$part.unit_price",
                  total_price: "$$part.total_price",
                  total_weight: "$$part.total_weight",
                  delivery_point:
                    "$$part.delivery_point",
                  remarks: "$$part.remarks",
                  received: {
                    $sum: {
                      $map: {
                        input: "$$part.history_details",
                        as: "history",
                        in: "$$history.received"
                      }
                    }
                  },
                  balance: {
                    $subtract: [
                      "$$part.quantity",
                      {
                        $sum: {
                          $map: {
                            input:
                              "$$part.history_details",
                            as: "history",
                            in: "$$history.received"
                          }
                        }
                      }
                    ]
                  },
                  // eta: null,
                  // image: [null],
                  // eta: "$$part.eta",
                  // image: [null],
                  // eta: {
                  //   $arrayElemAt: [
                  //     "$$part.history_details",
                  //     -1
                  //   ]
                  // },
                  // image: {
                  //   $arrayElemAt: [
                  //     "$$part.history_details",
                  //     -1
                  //   ]
                  // },
                  eta: {
                    $let: {
                      vars: {
                        lastHistory: { $arrayElemAt: ["$$part.history_details", -1] }
                      },
                      in: "$$lastHistory.eta"
                    }
                  },
                  image: {
                    $let: {
                      vars: {
                        lastHistory: { $arrayElemAt: ["$$part.history_details", -1] }
                      },
                      in: "$$lastHistory.image"
                    }
                  },
                }
              }
            },
          }
        }
      ]
      if (po.freeFields.length) {
        partsPipeline.push(
          {
            $unwind: "$freeFields"
          },
          {
            $lookup: {
              from: "history_models",
              localField: "freeFields.history",
              foreignField: "_id",
              as: "freeFields.history_details"
            }
          },
          {
            $group: {
              _id: "$_id",
              lpo: { $first: "$lpo" },
              supplier_id: { $first: "$supplier_id" },
              supplierDetail: {
                $first: "$supplierDetail"
              },
              currencyDetail: {
                $first: "$currencyDetail"
              },
              status: { $first: "$status" },
              inquiry_ref: { $first: "$inquiry_ref" },
              supplier_contact: {
                $first: "$supplier_contact"
              },
              project: { $first: "$project" },
              organization: { $first: "$organization" },
              order_type: { $first: "$order_type" },
              supplier_date: { $first: "$supplier_date" },
              remark: { $first: "$remark" },
              revision: { $first: "$revision" },
              quantity_total: {
                $first: "$quantity_total"
              },
              totalWeight_total: {
                $first: "$totalWeight_total"
              },
              totalPrice_total: {
                $first: "$totalPrice_total"
              },
              form_rev_date: { $first: "$form_rev_date" },
              ref_code_rev: { $first: "$ref_code_rev" },
              update_count: { $first: "$update_count" },
              parts: { $first: "$parts" },
              payments: { $first: "$payments" },
              supplier_qtn_ref: {
                $first: "$supplier_qtn_ref"
              },
              purchase_order_num: {
                $first: "$purchase_order_num"
              },
              supplier_trn: { $first: "$supplier_trn" },
              vat: { $first: "$vat" },
              grandTotal: { $first: "$grandTotal" },
              percentage_of_vat: {
                $first: "$percentage_of_vat"
              },
              purchaseFor: { $first: "$purchaseFor" },
              freeFields: { $push: "$freeFields" },
              files: { $first: "$files" },
            }
          },
          {
            $addFields: {
              freeFields: {
                $map: {
                  input: "$freeFields",
                  as: "part",
                  in: {
                    $mergeObjects: [
                      "$$part",
                      {
                        history: "$$part.history_details",
                        received: {
                          $sum: {
                            $map: {
                              input:
                                "$$part.history_details",
                              as: "history",
                              in: "$$history.received"
                            }
                          }
                        },
                        balance: {
                          $subtract: [
                            "$$part.quantity",
                            {
                              $sum: {
                                $map: {
                                  input:
                                    "$$part.history_details",
                                  as: "history",
                                  in: "$$history.received"
                                }
                              }
                            }
                          ]
                        },
                        // eta: "$$part.eta",
                        // image: "$$part.image",
                        // eta: {
                        //   $arrayElemAt: [
                        //     "$$part.history_details",
                        //     -1
                        //   ]
                        // },
                        eta: {
                          $let: {
                            vars: {
                              lastHistory: { $arrayElemAt: ["$$part.history_details", -1] }
                            },
                            in: "$$lastHistory.eta"
                          }
                        },
                        image: {
                          $let: {
                            vars: {
                              lastHistory: { $arrayElemAt: ["$$part.history_details", -1] }
                            },
                            in: "$$lastHistory.image"
                          }
                        },
                      }
                    ]
                  }
                }
              }
            }
          })
      }
      const result = await Purchase_Model.aggregate(partsPipeline);
      return res.status(200).json(result);
    } else {
      const result = await Purchase_Model.aggregate([
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
            from: "currency_models",
            localField: "lookup_supplier.currency_id",
            foreignField: "_id",
            as: "lookup_currency",
          },
        },
        {
          $unwind: "$freeFields"
        },
        {
          $lookup: {
            from: "history_models",
            localField: "freeFields.history",
            foreignField: "_id",
            as: "freeFields.history_details"
          }
        },
        {
          $group: {
            _id: "$_id",
            lpo: { $first: "$lpo" },
            supplier_id: { $first: "$supplier_id" },
            supplierDetail: {
              $first: "$lookup_supplier"
            },
            currencyDetail: {
              $first: "$lookup_currency"
            },
            status: { $first: "$status" },
            inquiry_ref: { $first: "$inquiry_ref" },
            supplier_contact: {
              $first: "$supplier_contact"
            },
            project: { $first: "$project" },
            organization: { $first: "$organization" },
            order_type: { $first: "$order_type" },
            supplier_date: { $first: "$supplier_date" },
            remark: { $first: "$remark" },
            revision: { $first: "$revision" },
            quantity_total: {
              $first: "$quantity_total"
            },
            totalWeight_total: {
              $first: "$totalWeight_total"
            },
            totalPrice_total: {
              $first: "$totalPrice_total"
            },
            form_rev_date: { $first: "$form_rev_date" },
            ref_code_rev: { $first: "$ref_code_rev" },
            update_count: { $first: "$update_count" },
            payments: { $first: "$payments" },
            supplier_qtn_ref: {
              $first: "$supplier_qtn_ref"
            },
            purchase_order_num: {
              $first: "$purchase_order_num"
            },
            supplier_trn: { $first: "$supplier_trn" },
            vat: { $first: "$vat" },
            grandTotal: { $first: "$grandTotal" },
            percentage_of_vat: {
              $first: "$percentage_of_vat"
            },
            purchaseFor: { $first: "$purchaseFor" },
            freeFields: { $push: "$freeFields" },
            files: { $first: "$files" },
          }
        },
        {
          $addFields: {
            parts: []
          }
        }
      ]);
      return res.status(200).json(result);
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: "Some Error Occured" });
  }
};

const receive_purchase_order = async (req, res) => {
  const session = await mongoose.startSession(); // Start a session
  session.startTransaction(); // Begin transaction
  try {
    const { id } = req.params;
    const { create, read, update } = req.allowedTabPermissions
    if (!update) {
      return res.status(403).json({ mssg: "Don't have enough permission to Receive in Procurement." })
    }
    const {
      supplier,
      parts,
      newHistory,
      freeFields,
      freeHistory,
      purchase_order_num
    } = req.body;
    const parsedParts = JSON.parse(parts);
    const parsedFree = JSON.parse(freeFields)
    const image = req.files || [];
    const baseURL = process.env.BACKENDURL;
    // if ((typeof newHistory == "string" && newHistory == 0) && (typeof freeHistory == "string" && freeHistory == 0)) {
    //   return res.status(400).json({
    //     mssg: "Cannot save Purchase Order without making any changes",
    //   });
    // }
    newHistory !== 0 && Object.keys(newHistory).forEach((code_id, index) => {
      let historyData = newHistory[code_id];
      historyData = { ...historyData };
      const imageFile = image.find(
        (file) => file.fieldname === `newHistory[${code_id}][image]`
      );
      const imagePath = imageFile
        ? `${baseURL}/${imageFile.path.replace(/\\/g, "/")}`
        : null;
      historyData.image = imagePath;
      newHistory[code_id] = historyData;
      return newHistory;
    });

    freeHistory !== 0 && Object.keys(freeHistory).forEach((code, index) => {
      let historyData = freeHistory[code];
      historyData = { ...historyData };
      const imageFile = image.find(
        (file) => file.fieldname === `freeHistory[${code}][image]`
      );
      const imagePath = imageFile
        ? `${baseURL}/${imageFile.path.replace(/\\/g, "/")}`
        : null;
      historyData.image = imagePath;
      freeHistory[code] = historyData;
      return freeHistory;
    });
    const validationPromises = [];
    if (typeof freeHistory === "object" && freeHistory !== null) {
      for (let itm of parsedFree) {
        if (itm.code in freeHistory) {
          const { received, eta, balance } = freeHistory[itm.code];
          const { quantity } = itm;
          const parsedReceived = parseInt(received);
          const parsedBalance = parseInt(balance);
          const parsedQuantity = parseInt(quantity);
          if (
            (parsedBalance !== 0 && eta === "" && parsedReceived >= 0) ||
            received === "" ||
            isNaN(parsedReceived)
          ) {
            res.status(400).json({ mssg: "Missing Entry" });
            throw new Error("Missing Entry");
          }
          const maxForward = parsedReceived > 0 && parsedReceived > parsedQuantity;
          const maxReverse = parsedReceived < 0 && Math.abs(parsedReceived) > parsedQuantity;

          if (maxForward || maxReverse) {
            res.status(400).json({ mssg: "Please enter valid received amount" });
            throw new Error("Please enter valid received amount");
          }
        }
      }
    }
    if (typeof newHistory === "object" && newHistory !== null) {
      for (let itm of parsedParts) {
        if (itm.code_id in newHistory) {
          const { received, eta, balance } = newHistory[itm.code_id];
          const { quantity } = itm;
          const parsedReceived = parseInt(received);
          const parsedBalance = parseInt(balance);
          const parsedQuantity = parseInt(quantity);
          if (
            (parsedBalance !== 0 && eta === "" && parsedReceived >= 0) ||
            received === "" ||
            isNaN(parsedReceived)
          ) {
            res.status(400).json({ mssg: "Missing Entry" });
            throw new Error("Missing Entry");
          }
          if (parseInt(received) > parseInt(quantity)) {
            res.status(400).json({ mssg: "Please enter valid received amount" });
            throw new Error("Please enter valid received amount");
          }
          const maxForward = parsedReceived > 0 && parsedReceived > parsedQuantity;
          const maxReverse = parsedReceived < 0 && Math.abs(parsedReceived) > parsedQuantity;

          if (maxForward || maxReverse) {
            res.status(400).json({ mssg: "Please enter valid received amount" });
            throw new Error("Please enter valid received amount");
          }
        }
      }
    }

    if (typeof freeHistory == "object" && freeHistory !== null) {
      for (let itm of parsedFree) {
        if (itm.code in freeHistory) {
          const { received, eta, balance, image } = freeHistory[itm?.code];
          const { quantity, remarks, delivery_point } = itm;
          const historyId = await createPartHistory(
            received,
            balance,
            eta,
            image,
            session
          );
          const updated_order = await Purchase_Model.findByIdAndUpdate(
            id,
            {
              $set: {
                "freeFields.$[elem].remarks": remarks,
                "freeFields.$[elem].delivery_point": delivery_point
              },
              $push: {
                "freeFields.$[elem].history": {
                  $each: [historyId],
                },
              },
            },
            {
              arrayFilters: [{ "elem.code": itm.code }],
              new: true,
            }
          ).session(session)
        }
      }
    }
    if (
      typeof newHistory == "object" && newHistory !== null
    ) {
      for (let itm of parsedParts) {
        if (itm.code_id in newHistory) {
          const { received, eta, balance, image } = newHistory[itm?.code_id];
          const { quantity, remarks, delivery_point } = itm;
          const lastHistory = itm.history.slice(-1)[0]
          if (balance == lastHistory.balance && new Date(lastHistory.eta) != new Date(eta)) {
            await History_model.findByIdAndUpdate(lastHistory._id, { eta: eta }).session(session)
          } else {
            let existingStock;
            if (itm.order_type === "Package") {
              existingStock = await Stock_model.findOne({
                _id: itm.code_id,
              });
            } else {
              existingStock = await Loose_Stock_model.findOne({
                _id: itm.code_id,
              });
            }
            let newAvgPrice = 0;
            let pl_details = {}
            if (itm.order_type === "Package") {
              if (itm.type === "Accessory") {
                const Accessory_PL = await accessories_calculator.findOne({
                  input_model_id: existingStock.reference_code_id,
                });

                pl_details = Accessory_PL
              } else if (itm.type === "Non-Insulated Profile") {
                const NI_pl = await Profile_Calculator.findOne({
                  input_model_id: existingStock.reference_code_id,
                });
                // const NI_Input = await Profile_Input_Model.findOne({
                //   _id: existingStock.reference_code_id,
                // });
                pl_details = NI_pl
              } else if (itm.type === "Insulated Profile") {
                const Ins_Pl = await Profile_Insulated_Calculator.findOne({
                  input_model_id: existingStock.reference_code_id,
                });
                pl_details = Ins_Pl
              } else if (itm.type === "Kit") {
                const Kit_Pl = await Kit_Calculator.findOne({
                  input_model_id: existingStock.reference_code_id,
                });
                pl_details = Kit_Pl
              }
            } else {
              if (itm.type === "Accessory") {
                const Accessory_PL = await accessories_calculator.findOne({
                  input_model_id: existingStock.code_id,
                });
                pl_details = Accessory_PL
              } else if (itm.type === "Non-Insulated Profile") {
                const NI_pl = await Profile_Calculator.findOne({
                  input_model_id: existingStock.code_id,
                });
                const NI_Input = await Profile_Input_Model.findOne({
                  _id: existingStock.code_id,
                });
                pl_details = NI_pl
              } else if (itm.type === "Insulated Profile") {
                const Ins_Pl = await Profile_Insulated_Calculator.findOne({
                  input_model_id: existingStock.code_id,
                });
                pl_details = Ins_Pl
              } else if (itm.type === "Kit") {
                const Kit_Pl = await Kit_Calculator.findOne({
                  input_model_id: existingStock.code_id,
                });
                pl_details = Kit_Pl
              }
            }
            if (existingStock.avg_price === 0) {
              if (itm.order_type === "Package") {
                if (itm.type === "Accessory") {
                  const Accessory_PL = await accessories_calculator.findOne({
                    input_model_id: existingStock.reference_code_id,
                  });

                  pl_details = Accessory_PL
                  newAvgPrice = (Accessory_PL.oc + Accessory_PL.landing_cost) / 2;
                } else if (itm.type === "Non-Insulated Profile") {
                  const NI_pl = await Profile_Calculator.findOne({
                    input_model_id: existingStock.reference_code_id,
                  });
                  const NI_Input = await Profile_Input_Model.findOne({
                    _id: existingStock.reference_code_id,
                  });
                  pl_details = NI_pl
                  newAvgPrice =
                    (NI_pl.origin_cost + NI_pl?.product_cost * NI_Input?.unit_weight) / 2;
                } else if (itm.type === "Insulated Profile") {
                  const Ins_Pl = await Profile_Insulated_Calculator.findOne({
                    input_model_id: existingStock.reference_code_id,
                  });
                  pl_details = Ins_Pl
                  newAvgPrice = (Ins_Pl.origin_cost + Ins_Pl.total_cost) / 2;
                } else if (itm.type === "Kit") {
                  const Kit_Pl = await Kit_Calculator.findOne({
                    input_model_id: existingStock.reference_code_id,
                  });
                  pl_details = Kit_Pl
                  newAvgPrice = (Kit_Pl.origin_cost + Kit_Pl.total_cost) / 2;
                }
              } else {
                if (itm.type === "Accessory") {
                  const Accessory_PL = await accessories_calculator.findOne({
                    input_model_id: existingStock.code_id,
                  });
                  pl_details = Accessory_PL
                  newAvgPrice = (Accessory_PL.oc + Accessory_PL.landing_cost) / 2;
                } else if (itm.type === "Non-Insulated Profile") {
                  const NI_pl = await Profile_Calculator.findOne({
                    input_model_id: existingStock.code_id,
                  });
                  const NI_Input = await Profile_Input_Model.findOne({
                    _id: existingStock.code_id,
                  });
                  pl_details = NI_pl
                  newAvgPrice =
                    (NI_pl.origin_cost + NI_pl.product_cost * NI_Input.unit_weight) / 2;
                } else if (itm.type === "Insulated Profile") {
                  const Ins_Pl = await Profile_Insulated_Calculator.findOne({
                    input_model_id: existingStock.code_id,
                  });
                  pl_details = Ins_Pl
                  newAvgPrice = (Ins_Pl.origin_cost + Ins_Pl.total_cost) / 2;
                } else if (itm.type === "Kit") {
                  const Kit_Pl = await Kit_Calculator.findOne({
                    input_model_id: existingStock.code_id,
                  });
                  pl_details = Kit_Pl
                  newAvgPrice = (Kit_Pl.origin_cost + Kit_Pl.total_cost) / 2;
                }
              }
            } else {
              newAvgPrice = (existingStock.avg_price + parseFloat(pl_details.origin_cost || pl_details.oc)) / 2;
            }
            if (itm.order_type === "Package") {
              let updatedStock = await Stock_model.findOneAndUpdate(
                { _id: itm.code_id },
                {
                  $set: {
                    avg_price: newAvgPrice,
                  },
                  $inc: {
                    available: parseFloat(received),
                    expected: -parseFloat(received),
                    total_received: received,
                    total_balance: -received,
                  },
                },
                { new: true }
              ).session(session);
              if (updatedStock.total_balance == 0) {
                let ifPOwithPart = await Purchase_Model.findOne({ _id: { $ne: id }, "parts.code_id": itm.code_id, status: "Active" })
                if (!ifPOwithPart) {
                  updatedStock = await Stock_model.findOneAndUpdate(
                    { _id: itm.code_id },
                    {
                      $set: {
                        total_balance: 0,
                        total_received: 0,
                        total_ordered: 0,
                      },
                    }
                  ).session(session)
                }
              }
              const stockLog = await Log_Model.create({
                stock_id: itm.code_id,
                ref_code_id: updatedStock.reference_code_id,
                category: itm.type,
                stockType: "Package",
                description: `Action: ${received} Received from PO ${purchase_order_num} for ${updatedStock.packing_code}, Avg Price=${newAvgPrice}, Total Balance-=${received}, Expected-=${received}, Available+=${received}, Free+=${received}-${existingStock.reserve}, Total Received+=${received}`,
                snapShot: updatedStock.toObject(),
              });
              if (
                updatedStock.free_inventory >
                updatedStock.msq
              ) {
                await Action_model.deleteMany({
                  code_id: itm.code_id,
                });
              }
            } else if (itm.order_type === "Loose") {
              let updatedStock = await Loose_Stock_model.findOneAndUpdate(
                { _id: itm.code_id },
                {
                  $set: {
                    avg_price: newAvgPrice,
                  },
                  $inc: {
                    available: parseFloat(received),
                    expected: -parseFloat(received),
                    total_received: received,
                    total_balance: -received,
                  },
                },
                { new: true }
              ).session(session);
              if (updatedStock.total_balance == 0) {
                let ifPOwithPart = await Purchase_Model.findOne({ _id: { $ne: id }, "parts.code_id": itm.code_id, status: "Active" })
                if (!ifPOwithPart) {
                  updatedStock = await Loose_Stock_model.findOneAndUpdate(
                    { _id: itm.code_id },
                    {
                      $set: {
                        total_balance: 0,
                        total_received: 0,
                        total_ordered: 0,
                      },
                    },
                  ).session(session);
                }
              }
              const LooseDetail = await LooseStockPopulate(itm.code_id);
              const stockLog = await Log_Model.create({
                stock_id: itm.code_id,
                ref_code_id: updatedStock.code_id,
                category: itm.type,
                stockType: "Loose",
                description: `Action: ${received} Received from PO ${purchase_order_num} for ${LooseDetail[0]?.entry_details?.code}, Avg Price=${newAvgPrice}, Total Balance-=${received}, Expected-=${received}, Available+=${received}, Free+=${received}-${existingStock.reserve}, Total Received+=${received}`,
                snapShot: updatedStock.toObject(),
              });
              if (
                updatedStock.free_inventory >
                updatedStock.msq
              ) {
                await Action_model.deleteMany({
                  code_id: itm.code_id,
                });
              }
            }
            const historyId = await createPartHistory(
              received,
              balance,
              eta,
              image,
              session
            );
            const updated_order = await Purchase_Model.findByIdAndUpdate(
              id,
              {
                $set: {
                  "parts.$[elem].remarks": remarks,
                  "parts.$[elem].delivery_point": delivery_point
                },
                $push: {
                  "parts.$[elem].history": {
                    $each: [historyId],
                  },
                  // "parts.$[elem].image": {
                  //   $each: imagePaths,
                  // },
                },
              },
              {
                arrayFilters: [{ "elem.code_id": itm.code_id }],
                new: true,
              }
            ).session(session);
          }
          // console.log(JSON.stringify(updated_order))
        }
      }
    }

    // to fill details suh as reamrk adnd delivery point when no received    
    if (typeof freeHistory !== "object" && freeHistory == 0) {
      for (let itm of parsedFree) {
        const { quantity, remarks, delivery_point } = itm;
        // const historyId = await createPartHistory(
        //   received,
        //   balance,
        //   eta,
        //   image,
        //   session
        // );
        const updated_order = await Purchase_Model.findByIdAndUpdate(
          id,
          {
            $set: {
              "freeFields.$[elem].remarks": remarks,
              "freeFields.$[elem].delivery_point": delivery_point
            },
            // $push: {
            //   "freeFields.$[elem].history": {
            //     $each: [historyId],
            //   },
            // },
          },
          {
            arrayFilters: [{ "elem.code": itm.code }],
            new: true,
          }
        ).session(session)
      }
    }

    if (typeof newHistory !== "object" && newHistory == 0) {
      for (let itm of parsedParts) {
        const { quantity, remarks, delivery_point } = itm;
        const updated_order = await Purchase_Model.findByIdAndUpdate(
          id,
          {
            $set: {
              "parts.$[elem].remarks": remarks,
              "parts.$[elem].delivery_point": delivery_point
            },
          },
          {
            arrayFilters: [{ "elem.code_id": itm.code_id }],
            new: true,
          }
        ).session(session);
      }
    }

    const purchase_order = await Purchase_Model.findById(id).populate([
      { path: "parts.history", model: "History_model" },
      { path: "freeFields.history", model: "History_model" }
    ]).session(session);
    let balance_remaining = purchase_order.parts.some(itm =>
      itm.history && itm.history.length > 0 && itm.history[itm.history.length - 1].balance !== 0
    ) || purchase_order.freeFields.some(itm =>
      itm.history && itm.history.length > 0 && itm.history[itm.history.length - 1].balance !== 0
    );
    if (balance_remaining) {
      purchase_order.status = "Active";
      await Notification_model.updateMany(
        { lpo_code: purchase_order.lpo },
        {
          $set: {
            supplier: supplier,
          },
        }
      );
    } else {
      purchase_order.status = "Completed";
      await Purchase_Model.updateMany({ purchase_order_num: purchase_order_num }, { status: "Completed" }).session(session)
      await Notification_model.deleteMany({
        lpo_code: purchase_order.purchase_order_num,
      }).session(session)
    }
    await purchase_order.save({ session: session })
    await session.commitTransaction(); // Commit all operations
    session.endSession();
    // console.log(purchase_order)
    return res.status(200).json({ mssg: "Purchase Order Updated", purchase_order });
  } catch (error) {
    await session.abortTransaction(); // Rollback in case of an error
    session.endSession();
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};

const updatePartArray = async (from = "inquiry", lpo_code, poId, partsArray, session) => {
  const finalArray = [];

  for (const itm of partsArray) {
    let code_acc =
      itm.order_type === "Package"
        ? itm.stock_details.packing_code
        : itm.entry_details.code;
    const {
      order_type,
      code,
      reference_code,
      code_id,
      ref_code_id,
      description,
      received = 0,
      eta,
      type,
      total_weight = parseFloat(total_weight),
      quantity = parseFloat(quantity),
      unit_price = parseFloat(unit_price),
      total_price = parseFloat(total_price),
      delivery_point,
      remarks,
    } = itm;
    let check_balance = parseFloat(quantity) - parseFloat(received);
    if (quantity < received) {
      throw Error("Cannot Decrease Quantity Below Received Amount.")
      return
    }
    console.log(quantity, received)
    let history = []
    if (itm.history) {
      const po = await Purchase_Model.findOne({
        _id: poId,
        parts: {
          $elemMatch: {
            $and: [
              { code_id },
              { ref_code_id }
            ]
          }
        }
      }, {
        "parts.$": 1,
      })
      let balance_remaining = po.parts.some(itm =>
        itm.history && itm.history.length > 0 && itm.history[itm.history.length - 1].received !== 0
      )
      const prevQty = po.parts[0].quantity
      const prevUnitPrice = po.parts[0].unit_price
      const diff = quantity - prevQty
      if (quantity > prevQty) {
        if (order_type === "Package") {
          const update_stock = await Stock_model.findOneAndUpdate(
            { _id: code_id },
            [
              {
                $set: {
                  total_available: { $add: ["$total_available", parseFloat(diff)] },
                  free_inventory: {
                    $subtract: [
                      { $add: ["$total_available", parseFloat(diff)] },
                      "$reserve",
                    ],
                  },
                  expected: { $add: ["$expected", parseFloat(diff)] },
                  total_ordered: { $add: ["$total_ordered", parseFloat(diff)] },
                  value_purchased: {
                    $add: ["$value_purchased", parseFloat(unit_price) * parseFloat(quantity)],
                  },
                  total_balance: {
                    $add: ["$total_balance", parseFloat(diff)],
                  },
                },
              },
            ],
            {
              new: true
            }
          ).session(session);
          const stockLog = await Log_Model.create([{
            stock_id: code_id,
            ref_code_id: ref_code_id,
            category: type,
            stockType: "Package",
            description: `Action: New PO ${lpo_code} for ${update_stock.packing_code}, Expected+=${quantity}, Value Purchased+=${unit_price}*${quantity}, Total Balance+=${check_balance}`,
            snapShot: update_stock.toObject(),
          }], { session });
          if (
            update_stock.free_inventory <
            update_stock.msq
          ) {
            const if_action = await Action_model.findOne({
              code_id: code_id,
            }).session(session)
            if (!if_action) {
              const new_notification = await Action_model.create([{
                code_id: code_id,
                ref_code_id: ref_code_id,
                category: type,
              }], { session })
            }
          } else {
            await Action_model.findOneAndDelete({
              code_id: code_id,
            }).session(session)
          }
        } else if (order_type === "Loose") {
          let loose_stock = await Loose_Stock_model.findOneAndUpdate(
            { _id: code_id },
            [
              {
                $set: {
                  total_available: {
                    $add: ["$total_available", parseFloat(diff)],
                  },
                  free_inventory: {
                    $subtract: [
                      { $add: ["$total_available", parseFloat(diff)] },
                      "$reserve",
                    ],
                  },
                  expected: {
                    $add: ["$expected", parseFloat(diff)],
                  },
                  total_ordered: {
                    $add: ["$total_ordered", parseFloat(diff)],
                  },
                  value_purchased: {
                    $add: ["$value_purchased", parseFloat(unit_price) * parseFloat(quantity)],
                  },
                  total_balance: {
                    $add: ["$total_balance", parseFloat(diff)],
                  },
                },
              },
            ],
            { new: true }
          ).session(session);
          const LooseDetail = await LooseStockPopulate(code_id);
          const stockLog = await Log_Model.create([{
            stock_id: code_id,
            ref_code_id: ref_code_id,
            category: type,
            stockType: "Loose",
            description: `Action: New PO ${lpo_code} for ${LooseDetail[0]?.entry_details?.code}, Expected+=${quantity}, Total quantity+=${quantity}, Value Purchased+=${unit_price}*${quantity}, Total Balance+=${check_balance}`,
            snapShot: loose_stock.toObject(),
          }], { session });
          if (
            loose_stock.free_inventory <
            loose_stock.msq
          ) {
            const if_action = await Action_model.findOne({
              code_id: code_id,
            }).session(session)
            if (!if_action) {
              const new_notification = await Action_model.create([{
                code_id: code_id,
                ref_code_id: ref_code_id,
                order_type: "Loose",
                category: type,
              }], { session });
            }
          } else {
            await Action_model.findOneAndDelete({
              code_id: code_id,
            }).session(session)
          }
        }
        // const new_notification = await Notification_model.create([{
        //   lpo_code: lpo_code,
        //   part_code: code_acc,
        //   code_id: code_id,
        //   eta: eta.eta || eta,
        //   order_type,
        // }], { session: session })
        for (let hst of itm.history) {
          const historyId = await createPartHistory(
            hst.received,
            hst.balance + diff,
            itm.eta || hst.eta,
            hst.image,
            session
          );
          history.push(historyId)
        }
      } else if (quantity < prevQty) {
        let existingStock = {}
        let newAvgPrice = 0;
        let pl_details = {}
        if (itm.order_type === "Package") {
          existingStock = await Stock_model.findById(code_id)
          if (itm.type === "Accessory") {
            const Accessory_PL = await accessories_calculator.findOne({
              input_model_id: ref_code_id,
            });

            pl_details = Accessory_PL
          } else if (itm.type === "Non-Insulated Profile") {
            const NI_pl = await Profile_Calculator.findOne({
              input_model_id: ref_code_id,
            });
            const NI_Input = await Profile_Input_Model.findOne({
              _id: ref_code_id,
            });
            pl_details = NI_pl
          } else if (itm.type === "Insulated Profile") {
            const Ins_Pl = await Profile_Insulated_Calculator.findOne({
              input_model_id: ref_code_id,
            });
            pl_details = Ins_Pl
          } else if (itm.type === "Kit") {
            const Kit_Pl = await Kit_Calculator.findOne({
              input_model_id: ref_code_id,
            });
            pl_details = Kit_Pl
          }
        } else {
          existingStock = await Loose_Stock_model.findById(code_id)
          if (itm.type === "Accessory") {
            const Accessory_PL = await accessories_calculator.findOne({
              input_model_id: ref_code_id,
            });
            pl_details = Accessory_PL
          } else if (itm.type === "Non-Insulated Profile") {
            const NI_pl = await Profile_Calculator.findOne({
              input_model_id: ref_code_id,
            });
            pl_details = NI_pl
          } else if (itm.type === "Insulated Profile") {
            const Ins_Pl = await Profile_Insulated_Calculator.findOne({
              input_model_id: ref_code_id,
            });
            pl_details = Ins_Pl
          } else if (itm.type === "Kit") {
            const Kit_Pl = await Kit_Calculator.findOne({
              input_model_id: ref_code_id,
            });
            pl_details = Kit_Pl
          }
        }
        if (existingStock.avg_price === 0) {
          if (itm.order_type === "Package") {
            if (itm.type === "Accessory") {
              const Accessory_PL = await accessories_calculator.findOne({
                input_model_id: ref_code_id,
              });

              pl_details = Accessory_PL
              newAvgPrice = (Accessory_PL.oc + Accessory_PL.landing_cost) / 2;
            } else if (itm.type === "Non-Insulated Profile") {
              const NI_pl = await Profile_Calculator.findOne({
                input_model_id: ref_code_id,
              });
              const NI_Input = await Profile_Input_Model.findOne({
                _id: ref_code_id,
              });
              pl_details = NI_pl
              newAvgPrice =
                (NI_pl.origin_cost + NI_pl?.product_cost * NI_Input?.unit_weight) / 2;
            } else if (itm.type === "Insulated Profile") {
              const Ins_Pl = await Profile_Insulated_Calculator.findOne({
                input_model_id: ref_code_id,
              });
              pl_details = Ins_Pl
              newAvgPrice = (Ins_Pl.origin_cost + Ins_Pl.total_cost) / 2;
            } else if (itm.type === "Kit") {
              const Kit_Pl = await Kit_Calculator.findOne({
                input_model_id: ref_code_id,
              });
              pl_details = Kit_Pl
              newAvgPrice = (Kit_Pl.origin_cost + Kit_Pl.total_cost) / 2;
            }
          } else {
            if (itm.type === "Accessory") {
              const Accessory_PL = await accessories_calculator.findOne({
                input_model_id: code_id,
              });
              pl_details = Accessory_PL
              newAvgPrice = (Accessory_PL.oc + Accessory_PL.landing_cost) / 2;
            } else if (itm.type === "Non-Insulated Profile") {
              const NI_pl = await Profile_Calculator.findOne({
                input_model_id: code_id,
              });
              const NI_Input = await Profile_Input_Model.findOne({
                _id: code_id,
              });
              pl_details = NI_pl
              newAvgPrice =
                (NI_pl.origin_cost + NI_pl.product_cost * NI_Input.unit_weight) / 2;
            } else if (itm.type === "Insulated Profile") {
              const Ins_Pl = await Profile_Insulated_Calculator.findOne({
                input_model_id: code_id,
              });
              pl_details = Ins_Pl
              newAvgPrice = (Ins_Pl.origin_cost + Ins_Pl.total_cost) / 2;
            } else if (itm.type === "Kit") {
              const Kit_Pl = await Kit_Calculator.findOne({
                input_model_id: code_id,
              });
              pl_details = Kit_Pl
              newAvgPrice = (Kit_Pl.origin_cost + Kit_Pl.total_cost) / 2;
            }
          }
        } else {
          newAvgPrice = (existingStock.avg_price + parseFloat(pl_details.origin_cost || pl_details.oc)) / 2;
        }
        if (order_type === "Package") {
          let update_stock = await Stock_model.findOneAndUpdate(
            { _id: code_id },
            [
              {
                $set: {
                  total_available: { $add: ["$total_available", parseFloat(diff)] },
                  free_inventory: {
                    $subtract: [
                      { $add: ["$total_available", parseFloat(diff)] },
                      "$reserve",
                    ],
                  },
                  expected: { $add: ["$expected", parseFloat(diff)] },
                  total_ordered: { $add: ["$total_ordered", parseFloat(diff)] },
                  value_purchased: {
                    $add: ["$value_purchased", parseFloat(unit_price) * parseFloat(quantity)],
                  },
                  avg_price: newAvgPrice,
                  total_balance: {
                    $add: ["$total_balance", parseFloat(diff)],
                  },
                },
              },
            ],
            {
              new: true
            }
          ).session(session);
          const stockLog = await Log_Model.create([{
            stock_id: code_id,
            ref_code_id: ref_code_id,
            category: type,
            stockType: "Package",
            description: `Action: New PO ${lpo_code} for ${update_stock.packing_code}, Expected+=${quantity}, Value Purchased+=${unit_price}*${quantity}, Total Balance+=${check_balance}`,
            snapShot: update_stock.toObject(),
          }], { session });
          if (
            update_stock.free_inventory <
            update_stock.msq
          ) {
            const if_action = await Action_model.findOne({
              code_id: code_id,
            }).session(session)
            if (!if_action) {
              const new_notification = await Action_model.create([{
                code_id: code_id,
                ref_code_id: ref_code_id,
                category: type,
              }], { session })
            }
          } else {
            await Action_model.findOneAndDelete({
              code_id: code_id,
            }).session(session)
          }
          if (update_stock.total_balance == 0) {
            let ifPOwithPart = await Purchase_Model.findOne({ _id: { $ne: poId }, "parts.code_id": code_id, status: "Active" })
            if (!ifPOwithPart) {
              update_stock = await Stock_model.findOneAndUpdate(
                { _id: code_id },
                {
                  $set: {
                    total_balance: 0,
                    total_received: 0,
                    total_ordered: 0,
                  },
                }
              ).session(session)
            }
          }
        } else if (order_type === "Loose") {
          let loose_stock = await Loose_Stock_model.findOneAndUpdate(
            { _id: code_id },
            [
              {
                $set: {
                  total_available: {
                    $add: ["$total_available", parseFloat(diff)],
                  },
                  free_inventory: {
                    $subtract: [
                      { $add: ["$total_available", parseFloat(diff)] },
                      "$reserve",
                    ],
                  },
                  expected: {
                    $add: ["$expected", parseFloat(diff)],
                  },
                  total_ordered: {
                    $add: ["$total_ordered", parseFloat(diff)],
                  },
                  value_purchased: {
                    $add: ["$value_purchased", parseFloat(unit_price) * parseFloat(quantity)],
                  },
                  total_balance: {
                    $add: ["$total_balance", parseFloat(diff)],
                  },
                },
              },
            ],
            { new: true }
          ).session(session);
          const LooseDetail = await LooseStockPopulate(code_id);
          const stockLog = await Log_Model.create([{
            stock_id: code_id,
            ref_code_id: ref_code_id,
            category: type,
            stockType: "Loose",
            description: `Action: New PO ${lpo_code} for ${LooseDetail[0]?.entry_details?.code}, Expected+=${quantity}, Total quantity+=${quantity}, Value Purchased+=${unit_price}*${quantity}, Total Balance+=${check_balance}`,
            snapShot: loose_stock.toObject(),
          }], { session });
          if (
            loose_stock.free_inventory <
            loose_stock.msq
          ) {
            const if_action = await Action_model.findOne({
              code_id: code_id,
            }).session(session)
            if (!if_action) {
              const new_notification = await Action_model.create([{
                code_id: code_id,
                ref_code_id: ref_code_id,
                order_type: "Loose",
                category: type,
              }], { session });
            }
          } else {
            await Action_model.findOneAndDelete({
              code_id: code_id,
            }).session(session)
          }
          if (loose_stock.total_balance == 0) {
            let ifPOwithPart = await Purchase_Model.findOne({ _id: { $ne: poId }, "parts.code_id": code_id, status: "Active" })
            if (!ifPOwithPart) {
              loose_stock = await Loose_Stock_model.findOneAndUpdate(
                { _id: code_id },
                {
                  $set: {
                    total_balance: 0,
                    total_received: 0,
                    total_ordered: 0,
                  },
                },
              ).session(session);
            }
          }
        }
        const new_notification = await Notification_model.create([{
          lpo_code: lpo_code,
          part_code: code_acc,
          code_id: code_id,
          eta: eta.eta || eta,
          order_type,
        }], { session: session })
        for (let hst of itm.history) {
          const historyId = await createPartHistory(
            hst.received,
            hst.balance + diff,
            hst.balance + diff != 0 ? (itm.eta || hst.eta) : null,
            hst.image,
            session
          );
          history.push(historyId)
        }
      } else {
        if (order_type === "Package") {
          const update_stock = await Stock_model.findOneAndUpdate(
            { _id: code_id },
            [
              {
                $set: {
                  value_purchased: {
                    $add: ["$value_purchased", parseFloat(unit_price) * parseFloat(quantity)],
                  },
                },
              },
            ],
            {
              new: true
            }
          ).session(session);
          const stockLog = await Log_Model.create([{
            stock_id: code_id,
            ref_code_id: ref_code_id,
            category: type,
            stockType: "Package",
            description: `Action: New PO ${lpo_code} for ${update_stock.packing_code}, Expected+=${quantity}, Value Purchased+=${unit_price}*${quantity}, Total Balance+=${check_balance}`,
            snapShot: update_stock.toObject(),
          }], { session });
          if (
            update_stock.free_inventory <
            update_stock.msq
          ) {
            const if_action = await Action_model.findOne({
              code_id: code_id,
            }).session(session)
            if (!if_action) {
              const new_notification = await Action_model.create([{
                code_id: code_id,
                ref_code_id: ref_code_id,
                category: type,
              }], { session })
            }
          } else {
            await Action_model.findOneAndDelete({
              code_id: code_id,
            }).session(session)
          }
        } else if (order_type === "Loose") {
          let loose_stock = await Loose_Stock_model.findOneAndUpdate(
            { _id: code_id },
            [
              {
                $set: {
                  value_purchased: {
                    $add: ["$value_purchased", parseFloat(unit_price) * parseFloat(quantity)],
                  },
                },
              },
            ],
            { new: true }
          ).session(session);
          const LooseDetail = await LooseStockPopulate(code_id);
          const stockLog = await Log_Model.create([{
            stock_id: code_id,
            ref_code_id: ref_code_id,
            category: type,
            stockType: "Loose",
            description: `Action: New PO ${lpo_code} for ${LooseDetail[0]?.entry_details?.code}, Expected+=${quantity}, Total quantity+=${quantity}, Value Purchased+=${unit_price}*${quantity}, Total Balance+=${check_balance}`,
            snapShot: loose_stock.toObject(),
          }], { session });
          if (
            loose_stock.free_inventory <
            loose_stock.msq
          ) {
            const if_action = await Action_model.findOne({
              code_id: code_id,
            }).session(session)
            if (!if_action) {
              const new_notification = await Action_model.create([{
                code_id: code_id,
                ref_code_id: ref_code_id,
                order_type: "Loose",
                category: type,
              }], { session });
            }
          } else {
            await Action_model.findOneAndDelete({
              code_id: code_id,
            }).session(session)
          }
        }
        for (let hst of itm.history) {
          const historyId = await createPartHistory(
            hst.received,
            hst.balance + diff,
            itm.eta || hst.eta,
            hst.image,
            session
          );
          history.push(historyId)
        }
      }
    } else {

      if (order_type === "Package") {
        const update_stock = await Stock_model.findOneAndUpdate(
          { _id: code_id },
          [
            {
              $set: {
                total_available: { $add: ["$total_available", parseFloat(quantity)] },
                free_inventory: {
                  $subtract: [
                    { $add: ["$total_available", parseFloat(quantity)] },
                    "$reserve",
                  ],
                },
                expected: { $add: ["$expected", parseFloat(quantity)] },
                total_ordered: { $add: ["$total_ordered", parseFloat(quantity)] },
                value_purchased: {
                  $add: ["$value_purchased", parseFloat(unit_price) * parseFloat(quantity)],
                },
                total_balance: check_balance,
              },
            },
          ],
          {
            new: true
          }
        ).session(session);
        const stockLog = await Log_Model.create([{
          stock_id: code_id,
          ref_code_id: ref_code_id,
          category: type,
          stockType: "Package",
          description: `Action: New PO ${lpo_code} for ${update_stock.packing_code}, Expected+=${quantity}, Value Purchased+=${unit_price}*${quantity}, Total Balance+=${check_balance}`,
          snapShot: update_stock.toObject(),
        }], { session });
        // console.log(code, reference_code, order_type);
        if (
          update_stock.free_inventory <
          update_stock.msq
        ) {
          const if_action = await Action_model.findOne({
            code_id: code_id,
          }).session(session)
          if (!if_action) {
            const new_notification = await Action_model.create([{
              code_id: code_id,
              ref_code_id: ref_code_id,
              category: type,
            }], { session })
          }
        } else {
          await Action_model.findOneAndDelete({
            code_id: code_id,
          }).session(session)
        }
      } else if (order_type === "Loose") {
        let loose_stock = await Loose_Stock_model.findOneAndUpdate(
          { _id: code_id },
          [
            {
              $set: {
                total_available: {
                  $add: ["$total_available", parseFloat(quantity)],
                },
                free_inventory: {
                  $subtract: [
                    { $add: ["$total_available", parseFloat(quantity)] },
                    "$reserve",
                  ],
                },
                expected: {
                  $add: ["$expected", parseFloat(quantity)],
                },
                total_ordered: {
                  $add: ["$total_ordered", parseFloat(quantity)],
                },
                value_purchased: {
                  $add: ["$value_purchased", parseFloat(unit_price) * parseFloat(quantity)],
                },
                total_balance: {
                  $add: ["$total_balance", check_balance],
                },
              },
            },
          ],
          { new: true }
        ).session(session);
        const LooseDetail = await LooseStockPopulate(code_id);
        const stockLog = await Log_Model.create([{
          stock_id: code_id,
          ref_code_id: ref_code_id,
          category: type,
          stockType: "Loose",
          description: `Action: New PO ${lpo_code} for ${LooseDetail[0]?.entry_details?.code}, Expected+=${quantity}, Total quantity+=${quantity}, Value Purchased+=${unit_price}*${quantity}, Total Balance+=${check_balance}`,
          snapShot: loose_stock.toObject(),
        }], { session });
        if (
          loose_stock.free_inventory <
          loose_stock.msq
        ) {
          const if_action = await Action_model.findOne({
            code_id: code_id,
          }).session(session)
          if (!if_action) {
            const new_notification = await Action_model.create([{
              code_id: code_id,
              ref_code_id: ref_code_id,
              order_type: "Loose",
              category: type,
            }], { session });
          }
        } else {
          await Action_model.findOneAndDelete({
            code_id: code_id,
          }).session(session)
        }
      }
      // const new_notification = await Notification_model.create([{
      //   lpo_code: lpo_code,
      //   part_code: code_acc,
      //   code_id: code_id,
      //   eta: eta.eta || eta,
      //   order_type,
      // }], { session: session })
      const historyId = await createPartHistory(
        received,
        check_balance,
        eta.eta || eta,
        "",
        session
      );
      history.push(historyId)
    }
    finalArray.push({
      order_type,
      code_id,
      ref_code_id,
      description,
      unit_price,
      quantity,
      type,
      total_weight,
      quantity,
      total_price,
      delivery_point,
      remarks,
      history: history,
    });
  }
  return finalArray;
};

const updateFreeArray = async (from = "inquiry", lpo_code, poId, partsArray, session) => {
  const finalArray = [];

  for (const itm of partsArray) {
    const {
      alloy = undefined,
      temper = undefined,
      length = undefined,

      material = undefined,
      color = undefined,

      code = "",
      description = "",
      finish = "",
      grade = "",
      image = "",
      quantity = 0,
      remarks = "",
      supplier_code = "",
      total_weight = 0,
      unit = "",
      unit_weight = 0,
      unit_price = 0,
      total_price = 0,
      eta = "",
      delivery_point = "",

      received = 0,
    } = itm;
    let check_balance = parseFloat(quantity) - parseFloat(received);
    let history = []
    if (itm.history) {
      const po = await Purchase_Model.findOne({
        _id: poId,
        freeFields: {
          $elemMatch: {
            $and: [
              { code },
            ]
          }
        }
      }, {
        "freeFields.$": 1,
      })
      const prevQty = po.freeFields[0].quantity
      const prevUnitPrice = po.freeFields[0].unit_price
      const diff = quantity - prevQty
      if (quantity > prevQty) {
        for (let hst of itm.history) {
          const historyId = await createPartHistory(
            hst.received,
            hst.balance + diff,
            hst.eta == null ? itm.eta : hst.eta,
            hst.image,
            session
          );
          history.push(historyId)
        }
      } else if (quantity < prevQty) {
        for (let hst of itm.history) {
          const historyId = await createPartHistory(
            hst.received,
            hst.balance + diff,
            hst.eta,
            hst.image,
            session
          );
          history.push(historyId)
        }
      }
    }
    // const new_notification = await Notification_model.create({
    //   lpo_code: lpo_code,
    //   part_code: code,
    //   code_id: code_id,
    //   eta: eta.eta || eta,
    //   order_type,
    // });
    // const historyId = await createPartHistory(
    //   received,
    //   check_balance,
    //   eta.eta || eta,
    //   "",
    //   session
    // );
    finalArray.push({
      ...(alloy !== undefined && { alloy }),
      ...(temper !== undefined && { temper }),
      ...(length !== undefined && { length }),
      ...(material !== undefined && { material }),
      ...(color !== undefined && { color }),

      code,
      description,
      finish,
      grade,
      image,
      quantity,
      remarks,
      supplier_code,
      total_weight,
      unit,
      unit_weight,
      unit_price,
      total_price,
      eta,
      delivery_point,
      received,
      history: history,
    })
  }
  return finalArray;
};

const deletePartsFromPO = async (partsArray, order, session) => {
  for (const part of partsArray) {
    const {
      order_type, code_id, ref_code_id, type,
      quantity, received = 0, unit_price
    } = part;
    const check_balance = parseFloat(quantity) - parseFloat(received);
    if (order_type === "Package") {
      const updatedStock = await Stock_model.findOneAndUpdate(
        { _id: code_id },
        [
          {
            $set: {
              total_available: { $subtract: ["$total_available", quantity] },
              free_inventory: {
                $subtract: [
                  { $subtract: ["$total_available", quantity] },
                  "$reserve"
                ]
              },
              expected: { $subtract: ["$expected", quantity] },
              total_ordered: { $subtract: ["$total_ordered", quantity] },
              value_purchased: { $subtract: ["$value_purchased", unit_price * quantity] },
              total_balance: { $subtract: ["$total_balance", quantity] }
            }
          }
        ],
        { new: true }
      ).session(session);

      await Log_Model.create({
        stock_id: code_id,
        ref_code_id,
        category: type,
        stockType: "Package",
        description: `PO ${order.purchase_order_num} deleted. Package expected -= ${quantity}`,
        snapShot: updatedStock.toObject()
      });
      if (updatedStock.free_inventory < updatedStock.msq) {
        const hasAction = await Action_model.findOne({ code_id }).session(session);
        if (!hasAction) {
          await Action_model.create([{
            code_id,
            ref_code_id,
            category: type
          }], { session })
        }
      }
    }

    else if (order_type === "Loose") {
      const updatedLoose = await Loose_Stock_model.findOneAndUpdate(
        { _id: code_id },
        [
          {
            $set: {
              total_available: { $subtract: ["$total_available", quantity] },
              free_inventory: {
                $subtract: [
                  { $subtract: ["$total_available", quantity] },
                  "$reserve"
                ]
              },
              expected: { $subtract: ["$expected", quantity] },
              total_ordered: { $subtract: ["$total_ordered", quantity] },
              value_purchased: { $subtract: ["$value_purchased", unit_price * quantity] },
              total_balance: { $subtract: ["$total_balance", quantity] }
            }
          }
        ],
        { new: true }
      ).session(session);

      const LooseDetail = await LooseStockPopulate(code_id);
      await Log_Model.create({
        stock_id: code_id,
        ref_code_id,
        category: type,
        stockType: "Loose",
        description: `PO ${order.purchase_order_num} deleted. Loose expected -= ${quantity}`,
        snapShot: updatedLoose.toObject()
      });

      if (updatedLoose.free_inventory < updatedLoose.msq) {
        const hasAction = await Action_model.findOne({ code_id }).session(session);
        if (!hasAction) {
          await Action_model.create([{
            code_id,
            ref_code_id,
            order_type: "Loose",
            category: type
          }], { session })
        }
      }
    }
  }
}

const update_purchase_order = async (req, res) => {
  const session = await mongoose.startSession(); // Start a session
  session.startTransaction(); // Begin transaction
  try {
    const { id } = req.params;
    const { create, read, update } = req.allowedTabPermissions
    if (!create || !update) {
      return res.status(403).json({ mssg: "Don't have enough permission to Update Procurement." })
    }
    const {
      supplier,
      parts,
      supplier_qtn_ref,
      supplier_trn,
      supplier_currency,
      purchase_order_num,
      vat,
      percentage_of_vat,
      grandTotal,
      selectedContact,
      selectedfilterOrg,
      inquiryRef,
      supplier_date,
      remark,
      revision,
      newHistory,
      purchaseFor,
      freeFields,
      freeHistory,
      quantity_total,
      totalPrice_total,
      totalWeight_total,
      form_rev_date,
      ref_code_rev
    } = req.body;
    const payments = JSON.parse(req.body.payments)
    const selectedProject = JSON.parse(req.body.selectedProject)
    const parsedParts = JSON.parse(parts);
    const parsedFree = JSON.parse(freeFields)
    const Contact = JSON.parse(selectedContact);
    const Organization = JSON.parse(selectedfilterOrg);
    const image = req.files || [];
    const baseURL = process.env.BACKENDURL;
    const purchase_order = await Purchase_Model.findById(id).populate([
      { path: "parts.history", model: "History_model" },
      { path: "freeFields.history", model: "History_model" }
    ]).session(session);
    const updatedCodeIds = parsedParts.map(part => part.code_id.toString());
    const newParts = parsedParts.filter(part => {
      return !purchase_order.parts.some(existing => existing.code_id.toString() === part.code_id.toString());
    });
    const removedParts = purchase_order.parts.filter(existing => {
      return !updatedCodeIds.includes(existing.code_id.toString());
    });

    removedParts.length && await deletePartsFromPO(removedParts, purchase_order, session)

    if (parsedParts.length == 0 && parsedFree.length == 0) {
      await Purchase_Model.deleteMany({ purchase_order_num: purchase_order.purchase_order_num }).session(session)
      await Inquiry_Model.deleteMany({ inquiry_ref: purchase_order.inquiry_ref }).session(session)
      await session.commitTransaction(); // Commit all operations
      session.endSession();
      return res.status(201).json({ mssg: "Empty Purchase Order Deleted." })
    }

    const invalidPart = parsedParts?.some(
      (part) =>
        !checkInteger(part?.quantity) ||
        part?.quantity < 0 ||
        part?.quantity === 0 ||
        part?.quantity === "" ||
        part?.quantity === undefined
    );

    const invalidFree = parsedFree?.some(
      (part) =>
        !checkInteger(part?.quantity) ||
        part?.quantity < 0 ||
        part?.quantity === 0 ||
        part?.quantity === "" ||
        part?.quantity === undefined
    );
    if (invalidPart || invalidFree) {
      return res.status(400).json({
        mssg: "Each part and free field must have a quantity greater than 0 and must be a whole number."
      });
    }
    const invalidUnitPrice = parsedParts?.some(
      (part) =>
        part?.unit_price < 0 ||
        part?.unit_price === null ||
        part?.unit_price === 0 ||
        part?.unit_price === undefined ||
        (part?.unit_price === "" && part?.total_price === null) ||
        part?.total_price === 0 ||
        part?.total_price === undefined ||
        (part?.total_price === "" && part?.delivery_point === null) ||
        part?.delivery_point === undefined ||
        part?.delivery_point === ""
    );
    const invalidUnitPriceforFree = parsedFree?.some(
      (part) =>
        part?.unit_price < 0 ||
        part?.unit_price === null ||
        part?.unit_price === 0 ||
        part?.unit_price === undefined ||
        (part?.unit_price === "" && part?.total_price === null) ||
        part?.total_price === 0 ||
        part?.total_price === undefined ||
        (part?.total_price === "" && part?.delivery_point === null) ||
        part?.delivery_point === undefined ||
        part?.delivery_point === ""
    );

    if (invalidUnitPrice || invalidUnitPriceforFree) {
      return res.status(400).json({
        mssg: "Unit Price, Total Price and Delivery Point are required for all parts and Price cannot be negative.",
      });
    }
    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      return res.status(400).json({
        mssg: "Payments are required and cannot be empty.",
      });
    }
    const totalPaymentVal = payments.reduce((sum, payment) => {
      const value = parseFloat(payment?.val);
      return sum + (isNaN(value) ? 0 : value);
    }, 0);
    if (totalPaymentVal !== 100) {
      return res.status(400).json({
        mssg: "All payment values must be equal to 100.",
      });
    }
    const final_parts_arr = parsedParts.length ? await updatePartArray(
      "direct",
      purchase_order_num,
      id,
      parsedParts,
      session
    ) : []
    const final_free_arr = parsedFree.length ? await updateFreeArray(
      "direct",
      purchase_order_num,
      id,
      parsedFree,
      session
    ) : []

    const new_po = await Purchase_Model.create([{
      supplier_id: supplier,
      parts: final_parts_arr,
      freeFields: final_free_arr,
      payments: payments,
      supplier_qtn_ref,
      supplier_currency,
      purchase_order_num,
      vat,
      percentage_of_vat,
      grandTotal,
      supplier_trn,
      organization: selectedfilterOrg,
      project: selectedProject,
      supplier_contact: Contact,
      inquiry_ref: inquiryRef,
      supplier_date: supplier_date,
      remark: remark,
      revision: purchase_order.revision + 1,
      quantity_total,
      totalWeight_total,
      totalPrice_total,
      form_rev_date,
      ref_code_rev,
      purchaseFor,
    }], { session: session });
    const updatedInquiries = await Inquiry_Model.updateMany({ inquiry_ref: inquiryRef }, {
      status: "Archive",
      purchaseOrder_id: new_po[0]._id
    }).session(session)

    // to fill po_id  to th existing action
    for (const part of parsedParts) {
      if (part.order_type == "Package") {
        let partDetail = await Stock_model.findById(part.code_id).session(session)
        if (partDetail.msq > partDetail.free_inventory) {
          let newAction = await Action_model.findOneAndUpdate({ code_id: part.code_id },
            { $addToSet: { purchaseOrderId: new_po[0]._id } },
            { new: true }
          ).session(session)
        }
      } else if (part.order_type == "Loose") {
        let partDetail = await Loose_Stock_model.findById(part.code_id).session(session)
        if (partDetail.msq > partDetail.free_inventory) {
          let newAction = await Action_model.findOneAndUpdate({ code_id: part.code_id },
            { $addToSet: { purchaseOrderId: new_po[0]._id } },
            { new: true }
          ).session(session)
        }
      }
    }

    // check if po is completed based on balance
    const new_fetched_purchase_order = await Purchase_Model.findById(new_po[0]._id).populate([
      { path: "parts.history", model: "History_model" },
      { path: "freeFields.history", model: "History_model" }
    ]).session(session);
    let balance_remaining = new_fetched_purchase_order.parts.some(itm =>
      itm.history && itm.history.length > 0 && itm.history[itm.history.length - 1].balance !== 0
    ) || new_fetched_purchase_order.freeFields.some(itm =>
      itm.history && itm.history.length > 0 && itm.history[itm.history.length - 1].balance !== 0
    );
    if (balance_remaining) {
      new_fetched_purchase_order.status = "Active";
      await Notification_model.updateMany(
        { lpo_code: new_fetched_purchase_order.lpo },
        {
          $set: {
            supplier: supplier,
          },
        }
      );
    } else {
      new_fetched_purchase_order.status = "Completed";
      await Purchase_Model.updateMany({ purchase_order_num: purchase_order_num }, { status: "Completed" }).session(session)
      await Notification_model.deleteMany({
        lpo_code: new_fetched_purchase_order.purchase_order_num,
      }).session(session)
    }
    await session.commitTransaction(); // Commit all operations
    session.endSession();
    return res.status(200).json({ mssg: "Purchase Order Created", new_po });
  } catch (error) {
    await session.abortTransaction(); // Rollback in case of an error
    session.endSession();
    console.trace(error.message);
    if (error.message === "Cannot Decrease Quantity Below Received Amount.") {
      // Send specific response for this error
      return res.status(500).json({
        mssg: "Cannot Decrease Quantity Below Received Amount.",
      });
    } else {

      return res.status(500).json({ mssg: "Some Error Occured" })
    }
  }
};

// const update_purchase_order = async (req, res) => {
//   const session = await mongoose.startSession(); // Start a session
//   session.startTransaction(); // Begin transaction
//   try {
//     const { id } = req.params;
//     const { create, read, update } = req.allowedTabPermissions
//     if (!create || !update) {
//       return res.status(403).json({ mssg: "Don't have enough permission to Update Procurement." })
//     }
//     const {
//       supplier,
//       parts,
//       payments,
//       supplier_qtn_ref,
//       supplier_trn,
//       supplier_currency,
//       purchase_order_num,
//       vat,
//       percentage_of_vat,
//       grandTotal,
//       selectedContact,
//       selectedfilterOrg,
//       inquiryRef,
//       supplier_date,
//       remark,
//       revision,
//       newHistory,
//       purchaseFor,
//       freeFields,
//       freeHistory
//     } = req.body;
//     const selectedProject = JSON.parse(req.body.selectedProject)
//     const parsedParts = JSON.parse(parts);
//     const parsedFree = JSON.parse(freeFields)
//     const Contact = JSON.parse(selectedContact);
//     const Organization = JSON.parse(selectedfilterOrg);
//     const Payments = JSON.parse(payments);
//     const image = req.files || [];
//     const baseURL = process.env.BACKENDURL;
//     if ((typeof newHistory == "string" && newHistory == 0) && (typeof freeHistory == "string" && freeHistory == 0)) {
//       return res.status(400).json({
//         mssg: "Cannot save Purchase Order without making any changes",
//       });
//     }
//     newHistory !== 0 && Object.keys(newHistory).forEach((code_id, index) => {
//       let historyData = newHistory[code_id];
//       historyData = { ...historyData };
//       const imageFile = image.find(
//         (file) => file.fieldname === `newHistory[${code_id}][image]`
//       );
//       const imagePath = imageFile
//         ? `${baseURL}/${imageFile.path.replace(/\\/g, "/")}`
//         : null;
//       historyData.image = imagePath;
//       newHistory[code_id] = historyData;
//       return newHistory;
//     });

//     freeHistory !== 0 && Object.keys(freeHistory).forEach((code, index) => {
//       let historyData = freeHistory[code];
//       historyData = { ...historyData };
//       const imageFile = image.find(
//         (file) => file.fieldname === `freeHistory[${code}][image]`
//       );
//       const imagePath = imageFile
//         ? `${baseURL}/${imageFile.path.replace(/\\/g, "/")}`
//         : null;
//       historyData.image = imagePath;
//       freeHistory[code] = historyData;
//       return freeHistory;
//     });
//     const validationPromises = [];
//     if (typeof freeHistory === "object" && freeHistory !== null) {
//       const freeHistoryChecks = parsedFree.map(async (itm) => {
//         if (itm.code in freeHistory) {
//           const { received, eta, balance } = freeHistory[itm.code];
//           const { quantity } = itm;

//           if ((balance != 0 && eta === "") || !received) {
//             res.status(400).json({ mssg: "Missing Entry" });
//             throw new Error("Missing Entry");
//           }
//           if (parseInt(received) > parseInt(quantity)) {
//             res.status(400).json({ mssg: "Please enter valid received amount" });
//             throw new Error("Please enter valid received amount");
//           }
//         }
//       });
//       validationPromises.push(...freeHistoryChecks);
//     }
//     if (typeof newHistory === "object" && newHistory !== null) {
//       const newHistoryChecks = parsedParts.map(async (itm) => {
//         if (itm.code_id in newHistory) {
//           const { received, eta, balance } = newHistory[itm.code_id];
//           const { quantity } = itm;
//           if ((balance != 0 && eta === "") || !received) {
//             res.status(400).json({ mssg: "Missing Entry" });
//             throw new Error("Missing Entry");
//           }
//           if (parseInt(received) > parseInt(quantity)) {
//             res.status(400).json({ mssg: "Please enter valid received amount" });
//             throw new Error("Please enter valid received amount");
//           }
//         }
//       });
//       validationPromises.push(...newHistoryChecks);
//     }

//     // Run them all
//     await Promise.all(validationPromises);

//     const mainPromise = []

//     if (typeof freeHistory == "object" && freeHistory !== null) {
//       const freeOp = parsedFree.map(async (itm) => {
//         if (itm.code in freeHistory) {
//           const { received, eta, balance, image } = freeHistory[itm?.code];
//           const { quantity } = itm;
//           const historyId = await createPartHistory(
//             received,
//             balance,
//             eta,
//             image,
//             session
//           );
//           const updated_order = await Purchase_Model.findByIdAndUpdate(
//             id,
//             {
//               $push: {
//                 "freeFields.$[elem].history": {
//                   $each: [historyId],
//                 },
//                 // "parts.$[elem].image": {
//                 //   $each: imagePaths,
//                 // },
//               },
//             },
//             {
//               arrayFilters: [{ "elem.code": itm.code }],
//               new: true,
//             }
//           ).session(session)
//         }
//       })
//       mainPromise.push(...freeOp)
//     }
//     if (
//       typeof newHistory == "object" && newHistory !== null
//     ) {
//       const partsOp = parsedParts.map(async (itm) => {
//         if (itm.code_id in newHistory) {
//           const { received, eta, balance, image } = newHistory[itm?.code_id];
//           const { quantity } = itm;
//           let existingStock;
//           if (itm.order_type === "Package") {
//             existingStock = await Stock_model.findOne({
//               _id: itm.code_id,
//             });
//           } else {
//             existingStock = await Loose_Stock_model.findOne({
//               _id: itm.code_id,
//             });
//           }
//           let newAvgPrice = 0;
//           let pl_details = {}
//           if (itm.order_type === "Package") {
//             if (itm.type === "Accessory") {
//               const Accessory_PL = await accessories_calculator.findOne({
//                 input_model_id: existingStock.reference_code_id,
//               });

//               pl_details = Accessory_PL
//             } else if (itm.type === "Non-Insulated Profile") {
//               const NI_pl = await Profile_Calculator.findOne({
//                 input_model_id: existingStock.reference_code_id,
//               });
//               const NI_Input = await Profile_Input_Model.findOne({
//                 _id: existingStock.reference_code_id,
//               });
//               pl_details = NI_pl
//             } else if (itm.type === "Insulated Profile") {
//               const Ins_Pl = await Profile_Insulated_Calculator.findOne({
//                 input_model_id: existingStock.reference_code_id,
//               });
//               pl_details = Ins_Pl
//             } else if (itm.type === "Kit") {
//               const Kit_Pl = await Kit_Calculator.findOne({
//                 input_model_id: existingStock.reference_code_id,
//               });
//               pl_details = Kit_Pl
//             }
//           } else {
//             if (itm.type === "Accessory") {
//               const Accessory_PL = await accessories_calculator.findOne({
//                 input_model_id: existingStock.code_id,
//               });
//               pl_details = Accessory_PL
//             } else if (itm.type === "Non-Insulated Profile") {
//               const NI_pl = await Profile_Calculator.findOne({
//                 input_model_id: existingStock.code_id,
//               });
//               const NI_Input = await Profile_Input_Model.findOne({
//                 _id: existingStock.code_id,
//               });
//               pl_details = NI_pl
//             } else if (itm.type === "Insulated Profile") {
//               const Ins_Pl = await Profile_Insulated_Calculator.findOne({
//                 input_model_id: existingStock.code_id,
//               });
//               pl_details = Ins_Pl
//             } else if (itm.type === "Kit") {
//               const Kit_Pl = await Kit_Calculator.findOne({
//                 input_model_id: existingStock.code_id,
//               });
//               pl_details = Kit_Pl
//             }
//           }
//           if (existingStock.avg_price === 0) {
//             if (itm.order_type === "Package") {
//               if (itm.type === "Accessory") {
//                 const Accessory_PL = await accessories_calculator.findOne({
//                   input_model_id: existingStock.reference_code_id,
//                 });

//                 pl_details = Accessory_PL
//                 newAvgPrice = (Accessory_PL.oc + Accessory_PL.landing_cost) / 2;
//               } else if (itm.type === "Non-Insulated Profile") {
//                 const NI_pl = await Profile_Calculator.findOne({
//                   input_model_id: existingStock.reference_code_id,
//                 });
//                 const NI_Input = await Profile_Input_Model.findOne({
//                   _id: existingStock.reference_code_id,
//                 });
//                 pl_details = NI_pl
//                 newAvgPrice =
//                   (NI_pl.origin_cost + NI_pl?.product_cost * NI_Input?.unit_weight) / 2;
//               } else if (itm.type === "Insulated Profile") {
//                 const Ins_Pl = await Profile_Insulated_Calculator.findOne({
//                   input_model_id: existingStock.reference_code_id,
//                 });
//                 pl_details = Ins_Pl
//                 newAvgPrice = (Ins_Pl.origin_cost + Ins_Pl.total_cost) / 2;
//               } else if (itm.type === "Kit") {
//                 const Kit_Pl = await Kit_Calculator.findOne({
//                   input_model_id: existingStock.reference_code_id,
//                 });
//                 pl_details = Kit_Pl
//                 newAvgPrice = (Kit_Pl.origin_cost + Kit_Pl.total_cost) / 2;
//               }
//             } else {
//               if (itm.type === "Accessory") {
//                 const Accessory_PL = await accessories_calculator.findOne({
//                   input_model_id: existingStock.code_id,
//                 });
//                 pl_details = Accessory_PL
//                 newAvgPrice = (Accessory_PL.oc + Accessory_PL.landing_cost) / 2;
//               } else if (itm.type === "Non-Insulated Profile") {
//                 const NI_pl = await Profile_Calculator.findOne({
//                   input_model_id: existingStock.code_id,
//                 });
//                 const NI_Input = await Profile_Input_Model.findOne({
//                   _id: existingStock.code_id,
//                 });
//                 pl_details = NI_pl
//                 newAvgPrice =
//                   (NI_pl.origin_cost + NI_pl.product_cost * NI_Input.unit_weight) / 2;
//               } else if (itm.type === "Insulated Profile") {
//                 const Ins_Pl = await Profile_Insulated_Calculator.findOne({
//                   input_model_id: existingStock.code_id,
//                 });
//                 pl_details = Ins_Pl
//                 newAvgPrice = (Ins_Pl.origin_cost + Ins_Pl.total_cost) / 2;
//               } else if (itm.type === "Kit") {
//                 const Kit_Pl = await Kit_Calculator.findOne({
//                   input_model_id: existingStock.code_id,
//                 });
//                 pl_details = Kit_Pl
//                 newAvgPrice = (Kit_Pl.origin_cost + Kit_Pl.total_cost) / 2;
//               }
//             }
//           } else {
//             newAvgPrice = (existingStock.avg_price + parseFloat(pl_details.origin_cost || pl_details.oc)) / 2;
//           }
//           if (itm.order_type === "Package") {
//             let updatedStock = await Stock_model.findOneAndUpdate(
//               { _id: itm.code_id },
//               {
//                 $set: {
//                   avg_price: newAvgPrice,
//                 },
//                 $inc: {
//                   available: parseFloat(received),
//                   expected: -parseFloat(received),
//                   total_received: received,
//                   total_balance: -received,
//                 },
//               },
//               { new: true }
//             ).session(session);
//             if (updatedStock.total_balance == 0) {
//               updatedStock = await Stock_model.findOneAndUpdate(
//                 { _id: itm.code_id },
//                 {
//                   $set: {
//                     total_balance: 0,
//                     total_received: 0,
//                     total_quantity: 0,
//                   },
//                 }
//               ).session(session)
//             }
//             const stockLog = await Log_Model.create({
//               stock_id: itm.code_id,
//               ref_code_id: updatedStock.reference_code_id,
//               category: itm.type,
//               stockType: "Package",
//               description: `Action: ${received} Received from PO ${purchase_order_num} for ${updatedStock.packing_code}, Avg Price=${newAvgPrice}, Total Balance-=${received}, Expected-=${received}, Available+=${received}, Free+=${received}-${existingStock.reserve}, Total Received+=${received}`,
//               snapShot: updatedStock.toObject(),
//             });
//             if (
//               updatedStock.free_inventory >
//               updatedStock.msq
//             ) {
//               await Action_model.deleteMany({
//                 code_id: itm.code_id,
//               });
//             }
//           } else if (itm.order_type === "Loose") {
//             let updatedStock = await Loose_Stock_model.findOneAndUpdate(
//               { _id: itm.code_id },
//               {
//                 $set: {
//                   avg_price: newAvgPrice,
//                 },
//                 $inc: {
//                   available: parseFloat(received),
//                   expected: -parseFloat(received),
//                   total_received: received,
//                   total_balance: -received,
//                 },
//               },
//               { new: true }
//             ).session(session);
//             if (updatedStock.total_balance == 0) {
//               updatedStock = await Loose_Stock_model.findOneAndUpdate(
//                 { _id: itm.code_id },
//                 {
//                   $set: {
//                     total_balance: 0,
//                     total_received: 0,
//                     total_quantity: 0,
//                   },
//                 },
//               ).session(session);
//             }
//             const LooseDetail = await LooseStockPopulate(itm.code_id);
//             const stockLog = await Log_Model.create({
//               stock_id: itm.code_id,
//               ref_code_id: updatedStock.code_id,
//               category: itm.type,
//               stockType: "Loose",
//               description: `Action: ${received} Received from PO ${purchase_order_num} for ${LooseDetail[0]?.entry_details?.code}, Avg Price=${newAvgPrice}, Total Balance-=${received}, Expected-=${received}, Available+=${received}, Free+=${received}-${existingStock.reserve}, Total Received+=${received}`,
//               snapShot: updatedStock.toObject(),
//             });
//             if (
//               updatedStock.free_inventory >
//               updatedStock.msq
//             ) {
//               await Action_model.deleteMany({
//                 code_id: itm.code_id,
//               });
//             }
//           }
//           const historyId = await createPartHistory(
//             received,
//             balance,
//             eta,
//             image,
//             session
//           );
//           const updated_order = await Purchase_Model.findByIdAndUpdate(
//             id,
//             {
//               $push: {
//                 "parts.$[elem].history": {
//                   $each: [historyId],
//                 },
//                 // "parts.$[elem].image": {
//                 //   $each: imagePaths,
//                 // },
//               },
//             },
//             {
//               arrayFilters: [{ "elem.code_id": itm.code_id }],
//               new: true,
//             }
//           ).session(session);
//           // console.log(JSON.stringify(updated_order))
//         }
//       })
//       mainPromise.push(...partsOp)
//     }
//     await Promise.all(mainPromise);

//     const purchase_order = await Purchase_Model.findById(id).populate([
//       { path: "parts.history", model: "History_model" },
//       { path: "freeFields.history", model: "History_model" }
//     ]).session(session);
//     // console.log(JSON.stringify(purchase_order))

//     purchase_order.supplier_id = supplier;
//     purchase_order.payments = Payments;
//     purchase_order.supplier_qtn_ref = supplier_qtn_ref;
//     purchase_order.supplier_currency = supplier_currency;
//     purchase_order.purchase_order_num = purchase_order_num;
//     purchase_order.vat = vat;
//     purchase_order.percentage_of_vat = percentage_of_vat;
//     purchase_order.grandTotal = grandTotal;
//     purchase_order.supplier_trn = supplier_trn;
//     purchase_order.organization = Organization;
//     purchase_order.project = selectedProject;
//     purchase_order.supplier_contact = Contact;
//     purchase_order.inquiry_ref = inquiryRef;
//     purchase_order.supplier_date = supplier_date;
//     purchase_order.remark = remark;
//     purchase_order.revision = parseInt(revision) + 1;
//     purchase_order.purchaseFor = purchaseFor;
//     purchase_order.quantity_total;
//     purchase_order.totalWeight_total;
//     purchase_order.totalPrice_total;
//     purchase_order.form_rev_date;
//     purchase_order.ref_code_rev;

//     let balance_remaining = purchase_order.parts.some(itm =>
//       itm.history && itm.history.length > 0 && itm.history[itm.history.length - 1].balance !== 0
//     ) || purchase_order.freeFields.some(itm =>
//       itm.history && itm.history.length > 0 && itm.history[itm.history.length - 1].balance !== 0
//     );

//     if (balance_remaining) {
//       purchase_order.status = "Active";
//       await Notification_model.updateMany(
//         { lpo_code: purchase_order.lpo },
//         {
//           $set: {
//             supplier: supplier,
//           },
//         }
//       );
//     } else {
//       purchase_order.status = "Completed";
//       await Notification_model.deleteMany({
//         lpo_code: purchase_order.purchase_order_num,
//       });
//     }
//     await purchase_order.save({ session: session })
//     await session.commitTransaction(); // Commit all operations
//     session.endSession();
//     // console.log(purchase_order)
//     return res.status(200).json({ mssg: "Purchase Order Updated", purchase_order });
//   } catch (error) {
//     await session.abortTransaction(); // Rollback in case of an error
//     session.endSession();
//     console.log(error);
//   }
// };

const delete_order = async (req, res) => {
  const session = await mongoose.startSession();
  let responseToSend = null;

  try {
    await session.withTransaction(async () => {
      const { id } = req.params;

      const order = await Purchase_Model.findById(id)
        .populate("parts.history")
        .session(session);

      if (!order) {
        responseToSend = { status: 404, body: { mssg: "Order not found" } };
        return;
      }

      // Case 1: Completed orders – delete directly
      if (order.status === "Completed") {
        // await Purchase_Model.findByIdAndDelete(id).session(session);
        await Notification_model.deleteMany({ lpo_id: id }).session(session);
        await Purchase_Model.deleteMany({ purchase_order_num: order.purchase_order_num }).session(session);
        await Inquiry_Model.deleteMany({ purchaseOrder_id: id }).session(session)
        responseToSend = { status: 200, body: { mssg: "Order deleted successfully" } };
        return;
      }

      // Calculate received and total quantities
      const totalReceived = order.parts.reduce((acc, part) => {
        const sumReceived = part.history.reduce((sum, entry) => sum + entry.received, 0);
        return acc + sumReceived;
      }, 0);

      const totalQuantity = order.parts.reduce((acc, part) => acc + part.quantity, 0);

      // Case 2: Partial stock received
      if (totalReceived > 0 && totalReceived < totalQuantity) {
        responseToSend = {
          status: 400,
          body: { mssg: "Cannot delete: partial stock received" }
        };
        return;
      }

      // Case 3: Not yet received – reverse expected stock and delete
      for (const part of order.parts) {
        const {
          order_type, code_id, ref_code_id, type,
          quantity, received = 0, unit_price
        } = part;

        const check_balance = parseFloat(quantity) - parseFloat(received);

        if (order_type === "Package") {
          const updatedStock = await Stock_model.findOneAndUpdate(
            { _id: code_id },
            [
              {
                $set: {
                  total_available: { $subtract: ["$total_available", quantity] },
                  free_inventory: {
                    $subtract: [
                      { $subtract: ["$total_available", quantity] },
                      "$reserve"
                    ]
                  },
                  expected: { $subtract: ["$expected", quantity] },
                  total_ordered: { $subtract: ["$total_ordered", quantity] },
                  value_purchased: { $subtract: ["$value_purchased", unit_price * quantity] },
                  total_balance: { $subtract: ["$total_balance", check_balance] }
                }
              }
            ],
            { new: true }
          ).session(session);

          await Log_Model.create({
            stock_id: code_id,
            ref_code_id,
            category: type,
            stockType: "Package",
            description: `PO ${order.purchase_order_num} deleted. Package expected -= ${quantity}`,
            snapShot: updatedStock.toObject()
          });
          if (updatedStock.free_inventory < updatedStock.msq) {
            const hasAction = await Action_model.findOne({ code_id }).session(session);
            if (!hasAction) {
              await Action_model.create([{
                code_id,
                ref_code_id,
                category: type
              }], { session })
            }
          }
        }

        else if (order_type === "Loose") {
          const updatedLoose = await Loose_Stock_model.findOneAndUpdate(
            { _id: code_id },
            [
              {
                $set: {
                  total_available: { $subtract: ["$total_available", quantity] },
                  free_inventory: {
                    $subtract: [
                      { $subtract: ["$total_available", quantity] },
                      "$reserve"
                    ]
                  },
                  expected: { $subtract: ["$expected", quantity] },
                  total_ordered: { $subtract: ["$total_ordered", quantity] },
                  value_purchased: { $subtract: ["$value_purchased", unit_price * quantity] },
                  total_balance: { $subtract: ["$total_balance", check_balance] }
                }
              }
            ],
            { new: true }
          ).session(session);

          const LooseDetail = await LooseStockPopulate(code_id);
          await Log_Model.create({
            stock_id: code_id,
            ref_code_id,
            category: type,
            stockType: "Loose",
            description: `PO ${order.purchase_order_num} deleted. Loose expected -= ${quantity}`,
            snapShot: updatedLoose.toObject()
          });
          if (updatedLoose.free_inventory < updatedLoose.msq) {
            const hasAction = await Action_model.findOne({ code_id }).session(session);
            if (!hasAction) {
              await Action_model.create([{
                code_id,
                ref_code_id,
                order_type: "Loose",
                category: type
              }], { session })
            }
          }
        }
      }

      // Remove notifications and delete order
      await Notification_model.deleteMany({ lpo_id: id }).session(session);
      await Purchase_Model.deleteMany({ purchase_order_num: order.purchase_order_num }).session(session);
      await Inquiry_Model.deleteMany({ purchaseOrder_id: id }).session(session)
      responseToSend = {
        status: 200,
        body: { mssg: "Order deleted successfully" }
      };
    });

    session.endSession();
    return res.status(responseToSend.status).json(responseToSend.body);

  } catch (err) {
    session.endSession();
    console.error(err);
    return res.status(500).json({ mssg: "Server error", error: err.message });
  }
};

const get_eta_for_project_helper = async (id) => {
  try {
    const purchase = await Purchase_Model.findOne({
      "parts.code_id": id,
    }).sort({ createdAt: -1 });
    if (
      purchase &&
      purchase.status === "Active" &&
      purchase.parts.length > 0 &&
      purchase.parts[0].history.length > 0
    ) {
      const quantity = purchase.parts[0].quantity;
      const latestHistory = purchase.parts[0].history.reduce(
        (latest, current) => {
          return current.eta > latest.eta ? current : latest;
        },
        purchase.parts[0].history[0]
      );
      const latest_eta = await History_model.findById(latestHistory);
      // console.log(latestHistory);
      return { latestEta: latest_eta.eta, quantity };
    } else {
      return null;
    }
  } catch (error) {
    console.log(error);
  }
};

const get_eta_for_project = async (req, res) => {
  try {
    const id = req.params.id;
    if (id != undefined) {
      const resp = await get_eta_for_project_helper(id);
      if (resp) {
        return res.status(200).json(resp);
      } else {
        return res.status(404).json({
          mssg: "No matching document not found in Purchase Orders therefore Out Of Stock",
        });
      }
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};

const get_po_suppliers = async (req, res) => {
  try {
    const supplier = await Purchase_Model.aggregate([
      {
        $lookup: {
          from: "accessories_supplier_models",
          localField: "supplier_id",
          foreignField: "_id",
          as: "supplier_detail"
        }
      },
      {
        $unwind: "$supplier_detail" // Ensure each document has a single supplier detail
      },
      {
        $group: {
          _id: null,
          supplier: {
            $addToSet: {
              _id: "$supplier_detail._id",
              name: "$supplier_detail.name"
            }
          }
        }
      },
      {
        $project: {
          _id: 0, // Remove _id to return only the supplier array
          supplier: 1
        }
      }
    ]
    );
    return res.status(200).json({ supplier });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};

const getPurchaseOrderNumber = async (req, res) => {
  try {
    const { code_supplier } = req.query;
    // const data = await Purchase_Model.find({ supplier_id: code_supplier });
    // if (data.length >= 0) {
    //   const serial_number = (data.length + 1).toString().padStart(3, "0");
    //   res.status(200).json({ serial_number });
    // } else {
    //   res.status(404).json({ mssg: "No Supplier found for this client." });
    // }
    const data = await Purchase_Model.aggregate([
      { $match: { supplier_id: new mongoose.Types.ObjectId(code_supplier) } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$purchase_order_num",
          revision: { $push: "$revision" },
        }
      },
      { $project: { purchase_order_num: 1, revision: 1 } }
    ]);
    if (data.length >= 0) {
      const serial_number = (data.length + 1).toString().padStart(3, "0");
      res.status(200).json({ serial_number });
    } else {
      res.status(404).json({ mssg: "No Supplier found for this client." });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};

function formatDate(dateString) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

module.exports = {
  add_purchase_order,
  get_all_purchases,
  get_single_purchase,
  receive_purchase_order,
  update_purchase_order,
  delete_order,
  get_eta_for_project,
  get_eta_for_project_helper,
  get_po_suppliers,
  purchase_order_pdf,
  send_po_mail,
  getPurchaseOrderNumber,
};
