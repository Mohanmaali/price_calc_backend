const { default: mongoose } = require("mongoose");
const NodeCache = require("node-cache")
const Kit_Calculator = require("../models/Kit_Calc_Model");
const AccessoriesCalculator = require("../models/accessories_calculator_model");
const Action_model = require("../models/actions_model");
const Operations_Model = require("../models/extrusion_model");
const Kit_Input = require("../models/kit_model");
const Loose_Stock_model = require("../models/loose_stock_model");
const {
  Profile_Insulated_Input,
} = require("../models/profile_insulated_input");
const Profile_Calculator = require("../models/profile_non_insulated_calc_model");
const Project_Model = require("../models/project_model");
const Stock_model = require("../models/stock_model");
const {
  price_calc_step2_Helper,
  acc_package_pl_helper,
} = require("./accessories_controllers");
const {
  generate_PriceList_Helper,
  generate_Package_PL_Helper,
} = require("./ni_profile_controllers");
const {
  generate_insulated_pl,
  generate_insulated_package_pl,
} = require("./ins_profile_controllers")
const { Purchase_Model } = require("../models/purchase_order_model");
const Log_Model = require("../models/log");
const plRefreshLock = new NodeCache({ stdTTL: 60 });
let plRefreshPromise = null;

const packagePlRefreshLock = new NodeCache({ stdTTL: 60 });
let packagePlRefreshPromise = null;

const add_kit = async (req, res) => {
  try {
    const {
      code,
      rd,
      description,
      unit_system,
      unit_description,
      unit,

      supplier_id,
      supplier,
      supplier_code,
      supplier_item_code,
      currency_id,
      currency,

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

      systemTags
    } = JSON.parse(req.body.inputForm);
    const files = JSON.parse(req.body.files);
    const operations = JSON.parse(req.body.operation_inputs);
    const accessory = JSON.parse(req.body.accessories_inputs);
    const non_insulated = JSON.parse(req.body.noninsulated_inputs);
    const insulated = JSON.parse(req.body.insulated_inputs);
    const kit = JSON.parse(req.body.kit_inputs);
    // console.log(insulated);
    // return;
    const filename = `${process.env.BACKENDURL}/uploads/${req.file?.filename}`;
    if (
      !code ||
      !supersystem_id ||
      !system_id ||
      // !subsystem ||
      !supplier_id ||
      !supplier_item_code ||
      !unit ||
      !unit_system ||
      !unit_description ||
      !description ||
      isNaN(parseFloat(rd))
      // !group || !subgroup ||
      // !req.file?.filename
      // || !packing_code ||
      // !packing_unit ||
      // isNaN(parseFloat(packing_cost)) ||
      // isNaN(parseFloat(packing_quantity)) ||
      // isNaN(parseFloat(packing_itm_cost)) ||
      // !packing_material
    ) {
      return res.status(400).json({
        mssg: "You need to add Code, system, group, subgroup, description and Image.",
      });
    }
    const if_kit = await Kit_Input.find({ code });
    if (if_kit.length > 0) {
      return res.status(400).json({
        mssg: "Entry Already Exists With Code",
      });
    }
    let total_cost = 0;
    let origin_costs_sum = 0;
    let landing_costs_sum = 0;
    let selling_price_sum = 0;
    const errors = [];
    // await accessory.forEach((itm) => {
    //   if (itm.quantity <= 0) {
    //     errors.push("Quantity cannot be <= 0 for accessory");
    //   } else {
    //     total_cost += itm.total_cost;
    //     origin_costs_sum += itm.origin_cost;
    //     landing_costs_sum += itm.landing_cost;
    //     selling_price_sum += itm.selling_price;
    //   }
    // });
    // await non_insulated.forEach((itm) => {
    //   if (itm.quantity <= 0) {
    //     errors.push("Quantity cannot be <= 0 for non-insulated profile ");
    //   } else {
    //     total_cost += itm.total_cost;
    //     origin_costs_sum += itm.origin_cost;
    //     landing_costs_sum += itm.landing_cost;
    //     selling_price_sum += itm.selling_price;
    //   }
    // });
    // await insulated.forEach((itm) => {
    //   if (itm.quantity <= 0) {
    //     errors.push("Quantity cannot be <= 0 for insulated profile ");
    //   } else {
    //     total_cost += itm.total_cost;
    //     origin_costs_sum += itm.origin_cost;
    //     landing_costs_sum += itm.landing_cost;
    //     selling_price_sum += itm.selling_price;
    //   }
    // });
    // await operations.forEach((itm) => {
    //   if (itm.quantity <= 0) {
    //     errors.push("Quantity cannot be <= 0 for operation ");
    //   } else {
    //     origin_costs_sum += itm?.unit_cost;
    //     landing_costs_sum += itm?.unit_cost;
    //     selling_price_sum += itm?.unit_cost;
    //     total_cost += itm?.total_cost;
    //   }
    // });
    // await kit.forEach((itm) => {
    //   if (itm.quantity <= 0) {
    //     errors.push("Quantity cannot be <= 0 for kit item");
    //   } else {
    //     total_cost += itm.total_cost;
    //     origin_costs_sum += itm?.unit_cost;
    //     landing_costs_sum += itm?.unit_cost;
    //     selling_price_sum += itm?.unit_cost;
    //   }
    // });
    if (errors.length > 0) {
      return res.status(400).json({ mssg: errors.join(", ") });
    }
    const new_kit = await Kit_Input.create({
      code,
      image: filename,
      supplier_id,
      supplier_item_code,
      unit,
      unit_system,
      unit_description,
      rd,
      supersystem_id,
      system_id,
      subsystem_id,
      group_id,
      subgroup_id,
      description,
      operation: operations,
      accessories: accessory,
      non_insulated_aluminium_profile: non_insulated,
      insulated_aluminium_profile: insulated,
      kit: kit,
      files: files,

      systemTags
      // origin_cost: origin_costs_sum,
      // landing_cost: landing_costs_sum,
      // selling_price: selling_price_sum,
      // total_cost,
    });
    return res.status(200).json({ mssg: "Kit Added Successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: error?.message || 'Internal server error' })
  }
};
const get_all_kit = async (req, res) => {
  try {
    let { page, filter, getAll } = req.query;
    if (getAll) {
      const result = await Kit_Input.aggregate([
        {
          $lookup: {
            from: "stock_models",
            localField: "_id",
            foreignField: "reference_code_id",
            as: "stock_detail",
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

        { $unwind: "$accessories" },
        {
          $lookup: {
            from: "accessories_input_models", // Replace with the actual collection name
            localField: "accessories.code_id",
            foreignField: "_id",
            as: "accessories.code_info",
          },
        },
        {
          $lookup: {
            from: "accessories_calculators", // Replace with the actual collection name
            localField: "accessories.code_pl_id",
            foreignField: "_id",
            as: "accessories.code_pl_info",
          },
        },
        {
          $unwind: {
            path: "$accessories.code_info",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: "$accessories.code_pl_info",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            accessories: {
              code: "$accessories.code_info.code",
              unit_cost: "$accessories.code_pl_info.selling_price",
              total_cost: {
                $multiply: [
                  "$accessories.code_pl_info.selling_price",
                  "$accessories.quantity",
                ],
              },
              origin_cost: "$accessories.code_pl_info.oc",
              landing_cost: "$accessories.code_pl_info.landing_cost",
              selling_price: "$accessories.code_pl_info.selling_price",
            },
          },
        },
        {
          $group: {
            _id: "$_id",
            accessories: { $push: "$accessories" },
            root: { $first: "$$ROOT" },
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: ["$root", { accessories: "$accessories" }],
            },
          },
        },

        { $unwind: "$non_insulated_aluminium_profile" },
        {
          $lookup: {
            from: "profile_input_models", // Replace with the actual collection name
            localField: "non_insulated_aluminium_profile.code_id",
            foreignField: "_id",
            as: "non_insulated_aluminium_profile.code_info",
          },
        },
        {
          $lookup: {
            from: "profile_calculators", // Replace with the actual collection name
            localField: "non_insulated_aluminium_profile.code_pl_id",
            foreignField: "_id",
            as: "non_insulated_aluminium_profile.code_pl_info",
          },
        },
        {
          $unwind: {
            path: "$non_insulated_aluminium_profile.code_info",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: "$non_insulated_aluminium_profile.code_pl_info",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            non_insulated_aluminium_profile: {
              code: "$non_insulated_aluminium_profile.code_info.code",
              unit_cost:
                "$non_insulated_aluminium_profile.code_pl_info.final_selling_price",
              total_cost: {
                $multiply: [
                  "$non_insulated_aluminium_profile.code_pl_info.final_selling_price",
                  "$non_insulated_aluminium_profile.quantity",
                ],
              },
              origin_cost:
                "$non_insulated_aluminium_profile.code_pl_info.origin_cost",
              landing_cost:
                "$non_insulated_aluminium_profile.code_pl_info.origin_cost",
              selling_price:
                "$non_insulated_aluminium_profile.code_pl_info.final_selling_price",
            },
          },
        },
        {
          $group: {
            _id: "$_id",
            non_insulated_aluminium_profile: {
              $push: "$non_insulated_aluminium_profile",
            },
            root: { $first: "$$ROOT" },
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: [
                "$root",
                {
                  non_insulated_aluminium_profile:
                    "$non_insulated_aluminium_profile",
                },
              ],
            },
          },
        },

        { $unwind: "$insulated_aluminium_profile" },
        {
          $lookup: {
            from: "profile_insulated_inputs", // Replace with the actual collection name
            localField: "insulated_aluminium_profile.code_id",
            foreignField: "_id",
            as: "insulated_aluminium_profile.code_info",
          },
        },
        {
          $lookup: {
            from: "profile_insulated_calculators", // Replace with the actual collection name
            localField: "insulated_aluminium_profile.code_pl_id",
            foreignField: "_id",
            as: "insulated_aluminium_profile.code_pl_info",
          },
        },
        {
          $unwind: {
            path: "$insulated_aluminium_profile.code_info",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: "$insulated_aluminium_profile.code_pl_info",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            insulated_aluminium_profile: {
              code: "$insulated_aluminium_profile.code_info.code",
              unit_cost: "$insulated_aluminium_profile.code_pl_info.total_cost",
              total_cost: {
                $multiply: [
                  "$insulated_aluminium_profile.code_pl_info.total_cost",
                  "$insulated_aluminium_profile.quantity",
                ],
              },
              origin_cost:
                "$insulated_aluminium_profile.code_pl_info.origin_cost",
              landing_cost:
                "$insulated_aluminium_profile.code_pl_info.landing_cost",
              selling_price:
                "$insulated_aluminium_profile.code_pl_info.selling_price",
            },
          },
        },
        {
          $group: {
            _id: "$_id",
            insulated_aluminium_profile: {
              $push: "$insulated_aluminium_profile",
            },
            root: { $first: "$$ROOT" },
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: [
                "$root",
                {
                  insulated_aluminium_profile: "$insulated_aluminium_profile",
                },
              ],
            },
          },
        },

        { $unwind: "$operation" },
        {
          $lookup: {
            from: "operations_models", // Replace with the actual collection name
            localField: "operation.code_id",
            foreignField: "_id",
            as: "operation.code_info",
          },
        },
        {
          $lookup: {
            from: "accessories_supplier_models", // Replace with the actual collection name
            localField: "operation.code_info.supplier_id",
            foreignField: "_id",
            as: "operation.supplier_info",
          },
        },
        {
          $unwind: {
            path: "$operation.code_info",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $addFields: {
            operation: {
              code: {
                $concat: [
                  "$operation.code_info.name",
                  " ",
                  {
                    $ifNull: [
                      { $arrayElemAt: ["$operation.supplier_info.name", 0] },
                      "",
                    ],
                  },
                ],
              },
              unit_cost: "$operation.code_info.cost_to_aed",
              total_cost: {
                $multiply: [
                  "$operation.code_info.cost_to_aed",
                  "$operation.quantity",
                ],
              },
              origin_cost: 0,
              landing_cost: 0,
              selling_price: 0,
            },
          },
        },

        {
          $group: {
            _id: "$_id",
            operation: {
              $push: "$operation",
            },
            root: { $first: "$$ROOT" },
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: ["$root", { operation: "$operation" }],
            },
          },
        },

        { $unwind: "$kit" },
        {
          $lookup: {
            from: "kit_inputs", // Replace with the actual collection name
            localField: "kit.code_id",
            foreignField: "_id",
            as: "kit.code_info",
          },
        },
        {
          $lookup: {
            from: "kit_calculators", // Replace with the actual collection name
            localField: "kit.code_pl_id",
            foreignField: "_id",
            as: "kit.code_pl_info",
          },
        },
        {
          $unwind: {
            path: "$kit.code_info",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: "$kit.code_pl_info",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            kit: {
              code: "$kit.code_info.code",
              unit_cost: "$kit.code_pl_info.total_cost",
              total_cost: {
                $multiply: ["$kit.code_pl_info.total_cost", "$kit.quantity"],
              },
              origin_cost: "$kit.code_pl_info.origin_cost",
              landing_cost: "$kit.code_pl_info.landing_cost",
              selling_price: "$kit.code_pl_info.selling_price",
            },
          },
        },
        {
          $group: {
            _id: "$_id",
            kit: {
              $push: "$kit",
            },
            root: { $first: "$$ROOT" },
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: ["$root", { kit: "$kit" }],
            },
          },
        },
        {
          $addFields: {
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
          $sort: {
            code: 1,
          },
        },
      ]);
      return res.status(200).json({ result });
    } else {
      filter = filter ? JSON.parse(filter) : {};
      let searchRegex = {
        $regex: new RegExp(".*" + filter?.search + ".*", "i"),
      };
      const limit = 5;
      const pageNumber = parseInt(page) || 1;
      const skip = (pageNumber - 1) * limit;
      let and = [{}];
      if (filter?.system) {
        and.push({ system_id: new mongoose.Types.ObjectId(filter.system) });
      }
      if (filter?.group) {
        and.push({ group_id: new mongoose.Types.ObjectId(filter.group) });
      }
      if (filter?.subgroup) {
        and.push({ subgroup_id: new mongoose.Types.ObjectId(filter.subgroup) });
      }
      let where = {
        $or: [{ code: searchRegex }, { description: searchRegex }],
        $and: and,
      };

      const result = await Kit_Input.aggregate([
        {
          $lookup: {
            from: "stock_models",
            localField: "_id",
            foreignField: "reference_code_id",
            as: "stock_detail",
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

        { $unwind: "$accessories" },
        {
          $lookup: {
            from: "accessories_input_models", // Replace with the actual collection name
            localField: "accessories.code_id",
            foreignField: "_id",
            as: "accessories.code_info",
          },
        },
        {
          $lookup: {
            from: "accessories_calculators", // Replace with the actual collection name
            localField: "accessories.code_pl_id",
            foreignField: "_id",
            as: "accessories.code_pl_info",
          },
        },
        {
          $unwind: {
            path: "$accessories.code_info",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: "$accessories.code_pl_info",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            accessories: {
              code: "$accessories.code_info.code",
              unit_cost: "$accessories.code_pl_info.selling_price",
              total_cost: {
                $multiply: [
                  "$accessories.code_pl_info.selling_price",
                  "$accessories.quantity",
                ],
              },
              origin_cost: "$accessories.code_pl_info.oc",
              landing_cost: "$accessories.code_pl_info.landing_cost",
              selling_price: "$accessories.code_pl_info.selling_price",
            },
          },
        },
        {
          $group: {
            _id: "$_id",
            accessories: { $push: "$accessories" },
            root: { $first: "$$ROOT" },
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: ["$root", { accessories: "$accessories" }],
            },
          },
        },

        { $unwind: "$non_insulated_aluminium_profile" },
        {
          $lookup: {
            from: "profile_input_models", // Replace with the actual collection name
            localField: "non_insulated_aluminium_profile.code_id",
            foreignField: "_id",
            as: "non_insulated_aluminium_profile.code_info",
          },
        },
        {
          $lookup: {
            from: "profile_calculators", // Replace with the actual collection name
            localField: "non_insulated_aluminium_profile.code_pl_id",
            foreignField: "_id",
            as: "non_insulated_aluminium_profile.code_pl_info",
          },
        },
        {
          $unwind: {
            path: "$non_insulated_aluminium_profile.code_info",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: "$non_insulated_aluminium_profile.code_pl_info",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            non_insulated_aluminium_profile: {
              code: "$non_insulated_aluminium_profile.code_info.code",
              unit_cost:
                "$non_insulated_aluminium_profile.code_pl_info.final_selling_price",
              total_cost: {
                $multiply: [
                  "$non_insulated_aluminium_profile.code_pl_info.final_selling_price",
                  "$non_insulated_aluminium_profile.quantity",
                ],
              },
              origin_cost:
                "$non_insulated_aluminium_profile.code_pl_info.origin_cost",
              landing_cost:
                "$non_insulated_aluminium_profile.code_pl_info.origin_cost",
              selling_price:
                "$non_insulated_aluminium_profile.code_pl_info.final_selling_price",
            },
          },
        },
        {
          $group: {
            _id: "$_id",
            non_insulated_aluminium_profile: {
              $push: "$non_insulated_aluminium_profile",
            },
            root: { $first: "$$ROOT" },
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: [
                "$root",
                {
                  non_insulated_aluminium_profile:
                    "$non_insulated_aluminium_profile",
                },
              ],
            },
          },
        },

        { $unwind: "$insulated_aluminium_profile" },
        {
          $lookup: {
            from: "profile_insulated_inputs", // Replace with the actual collection name
            localField: "insulated_aluminium_profile.code_id",
            foreignField: "_id",
            as: "insulated_aluminium_profile.code_info",
          },
        },
        {
          $lookup: {
            from: "profile_insulated_calculators", // Replace with the actual collection name
            localField: "insulated_aluminium_profile.code_pl_id",
            foreignField: "_id",
            as: "insulated_aluminium_profile.code_pl_info",
          },
        },
        {
          $unwind: {
            path: "$insulated_aluminium_profile.code_info",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: "$insulated_aluminium_profile.code_pl_info",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            insulated_aluminium_profile: {
              code: "$insulated_aluminium_profile.code_info.code",
              unit_cost: "$insulated_aluminium_profile.code_pl_info.total_cost",
              total_cost: {
                $multiply: [
                  "$insulated_aluminium_profile.code_pl_info.total_cost",
                  "$insulated_aluminium_profile.quantity",
                ],
              },
              origin_cost:
                "$insulated_aluminium_profile.code_pl_info.origin_cost",
              landing_cost:
                "$insulated_aluminium_profile.code_pl_info.landing_cost",
              selling_price:
                "$insulated_aluminium_profile.code_pl_info.selling_price",
            },
          },
        },
        {
          $group: {
            _id: "$_id",
            insulated_aluminium_profile: {
              $push: "$insulated_aluminium_profile",
            },
            root: { $first: "$$ROOT" },
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: [
                "$root",
                { insulated_aluminium_profile: "$insulated_aluminium_profile" },
              ],
            },
          },
        },

        { $unwind: "$operation" },
        {
          $lookup: {
            from: "operations_models", // Replace with the actual collection name
            localField: "operation.code_id",
            foreignField: "_id",
            as: "operation.code_info",
          },
        },
        {
          $lookup: {
            from: "accessories_supplier_models", // Replace with the actual collection name
            localField: "operation.code_info.supplier_id",
            foreignField: "_id",
            as: "operation.supplier_info",
          },
        },
        {
          $unwind: {
            path: "$operation.code_info",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $addFields: {
            operation: {
              code: {
                $concat: [
                  "$operation.code_info.name",
                  " ",
                  {
                    $ifNull: [
                      { $arrayElemAt: ["$operation.supplier_info.name", 0] },
                      "",
                    ],
                  },
                ],
              },
              unit_cost: "$operation.code_info.cost_to_aed",
              total_cost: {
                $multiply: [
                  "$operation.code_info.cost_to_aed",
                  "$operation.quantity",
                ],
              },
              origin_cost: 0,
              landing_cost: 0,
              selling_price: 0,
            },
          },
        },

        {
          $group: {
            _id: "$_id",
            operation: {
              $push: "$operation",
            },
            root: { $first: "$$ROOT" },
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: ["$root", { operation: "$operation" }],
            },
          },
        },

        { $unwind: "$kit" },
        {
          $lookup: {
            from: "kit_inputs", // Replace with the actual collection name
            localField: "kit.code_id",
            foreignField: "_id",
            as: "kit.code_info",
          },
        },
        {
          $lookup: {
            from: "kit_calculators", // Replace with the actual collection name
            localField: "kit.code_pl_id",
            foreignField: "_id",
            as: "kit.code_pl_info",
          },
        },
        {
          $unwind: {
            path: "$kit.code_info",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: "$kit.code_pl_info",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            kit: {
              code: "$kit.code_info.code",
              unit_cost: "$kit.code_pl_info.total_cost",
              total_cost: {
                $multiply: ["$kit.code_pl_info.total_cost", "$kit.quantity"],
              },
              origin_cost: "$kit.code_pl_info.origin_cost",
              landing_cost: "$kit.code_pl_info.landing_cost",
              selling_price: "$kit.code_pl_info.selling_price",
            },
          },
        },
        {
          $group: {
            _id: "$_id",
            kit: {
              $push: "$kit",
            },
            root: { $first: "$$ROOT" },
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: ["$root", { kit: "$kit" }],
            },
          },
        },
        {
          $addFields: {
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
            $or: [{ code: searchRegex }, { description: searchRegex }],
            $and: and,
          },
        },
        {
          $skip: skip,
        },
        {
          $limit: limit,
        },
        {
          $sort: {
            code: 1,
          },
        },
      ]);

      const totalCount = await Kit_Input.countDocuments(where);
      const currentPage = pageNumber;
      const total_page = Math.ceil(totalCount / limit);
      return res
        .status(200)
        .json({ result, currentPage, total_page, totalCount, limit });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: error?.message || 'Internal server error' })
  }
};

const get_single_kit = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Kit_Input.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
        },
      },
      {
        $lookup: {
          from: "stock_models",
          localField: "_id",
          foreignField: "reference_code_id",
          as: "stock_detail",
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
              in: "$$tag.system_id"
            }
          }
        }
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
                  $in: [
                    "$system_detail._id",
                    "$$tagIds"
                  ]
                }
              }
            },
            {
              $project: {
                _id: 0,
                system_id: "$system_detail._id",
                system: "$system_detail.code"
              }
            }
          ],
          as: "systemTags"
        }
      },
      {
        $project: {
          systemTagIds: 0
        }
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

      { $unwind: "$accessories" },
      {
        $lookup: {
          from: "accessories_input_models", // Replace with the actual collection name
          localField: "accessories.code_id",
          foreignField: "_id",
          as: "accessories.code_info",
        },
      },
      {
        $lookup: {
          from: "accessories_calculators", // Replace with the actual collection name
          localField: "accessories.code_pl_id",
          foreignField: "_id",
          as: "accessories.code_pl_info",
        },
      },
      {
        $unwind: {
          path: "$accessories.code_info",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$accessories.code_pl_info",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          accessories: {
            code: "$accessories.code_info.code",
            unit_cost: "$accessories.code_pl_info.selling_price",
            total_cost: {
              $multiply: [
                "$accessories.code_pl_info.selling_price",
                "$accessories.quantity",
              ],
            },
            origin_cost: "$accessories.code_pl_info.oc",
            landing_cost: "$accessories.code_pl_info.landing_cost",
            selling_price: "$accessories.code_pl_info.selling_price",
          },
        },
      },
      {
        $group: {
          _id: "$_id",
          accessories: { $push: "$accessories" },
          root: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$root", { accessories: "$accessories" }],
          },
        },
      },

      { $unwind: "$non_insulated_aluminium_profile" },
      {
        $lookup: {
          from: "profile_input_models", // Replace with the actual collection name
          localField: "non_insulated_aluminium_profile.code_id",
          foreignField: "_id",
          as: "non_insulated_aluminium_profile.code_info",
        },
      },
      {
        $lookup: {
          from: "profile_calculators", // Replace with the actual collection name
          localField: "non_insulated_aluminium_profile.code_pl_id",
          foreignField: "_id",
          as: "non_insulated_aluminium_profile.code_pl_info",
        },
      },
      {
        $unwind: {
          path: "$non_insulated_aluminium_profile.code_info",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$non_insulated_aluminium_profile.code_pl_info",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          non_insulated_aluminium_profile: {
            code: "$non_insulated_aluminium_profile.code_info.code",
            unit_cost:
              "$non_insulated_aluminium_profile.code_pl_info.final_selling_price",
            total_cost: {
              $multiply: [
                "$non_insulated_aluminium_profile.code_pl_info.final_selling_price",
                "$non_insulated_aluminium_profile.quantity",
              ],
            },
            origin_cost:
              "$non_insulated_aluminium_profile.code_pl_info.origin_cost",
            landing_cost:
              "$non_insulated_aluminium_profile.code_pl_info.origin_cost",
            selling_price:
              "$non_insulated_aluminium_profile.code_pl_info.final_selling_price",
          },
        },
      },
      {
        $group: {
          _id: "$_id",
          non_insulated_aluminium_profile: {
            $push: "$non_insulated_aluminium_profile",
          },
          root: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              "$root",
              {
                non_insulated_aluminium_profile:
                  "$non_insulated_aluminium_profile",
              },
            ],
          },
        },
      },

      { $unwind: "$insulated_aluminium_profile" },
      {
        $lookup: {
          from: "profile_insulated_inputs", // Replace with the actual collection name
          localField: "insulated_aluminium_profile.code_id",
          foreignField: "_id",
          as: "insulated_aluminium_profile.code_info",
        },
      },
      {
        $lookup: {
          from: "profile_insulated_calculators", // Replace with the actual collection name
          localField: "insulated_aluminium_profile.code_pl_id",
          foreignField: "_id",
          as: "insulated_aluminium_profile.code_pl_info",
        },
      },
      {
        $unwind: {
          path: "$insulated_aluminium_profile.code_info",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$insulated_aluminium_profile.code_pl_info",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          insulated_aluminium_profile: {
            code: "$insulated_aluminium_profile.code_info.code",
            unit_cost: "$insulated_aluminium_profile.code_pl_info.total_cost",
            total_cost: {
              $multiply: [
                "$insulated_aluminium_profile.code_pl_info.total_cost",
                "$insulated_aluminium_profile.quantity",
              ],
            },
            origin_cost:
              "$insulated_aluminium_profile.code_pl_info.origin_cost",
            landing_cost:
              "$insulated_aluminium_profile.code_pl_info.landing_cost",
            selling_price:
              "$insulated_aluminium_profile.code_pl_info.selling_price",
          },
        },
      },
      {
        $group: {
          _id: "$_id",
          insulated_aluminium_profile: {
            $push: "$insulated_aluminium_profile",
          },
          root: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              "$root",
              { insulated_aluminium_profile: "$insulated_aluminium_profile" },
            ],
          },
        },
      },

      { $unwind: "$operation" },
      {
        $lookup: {
          from: "operations_models", // Replace with the actual collection name
          localField: "operation.code_id",
          foreignField: "_id",
          as: "operation.code_info",
        },
      },
      {
        $lookup: {
          from: "accessories_supplier_models", // Replace with the actual collection name
          localField: "operation.code_info.supplier_id",
          foreignField: "_id",
          as: "operation.supplier_info",
        },
      },
      {
        $unwind: {
          path: "$operation.code_info",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $addFields: {
          operation: {
            code: {
              $concat: [
                "$operation.code_info.name",
                " ",
                {
                  $ifNull: [
                    { $arrayElemAt: ["$operation.supplier_info.name", 0] },
                    "",
                  ],
                },
              ],
            },
            unit_cost: "$operation.code_info.cost_to_aed",
            total_cost: {
              $multiply: [
                "$operation.code_info.cost_to_aed",
                "$operation.quantity",
              ],
            },
            origin_cost: 0,
            landing_cost: 0,
            selling_price: 0,
          },
        },
      },

      {
        $group: {
          _id: "$_id",
          operation: {
            $push: "$operation",
          },
          root: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$root", { operation: "$operation" }],
          },
        },
      },

      { $unwind: "$kit" },
      {
        $lookup: {
          from: "kit_inputs", // Replace with the actual collection name
          localField: "kit.code_id",
          foreignField: "_id",
          as: "kit.code_info",
        },
      },
      {
        $lookup: {
          from: "kit_calculators", // Replace with the actual collection name
          localField: "kit.code_pl_id",
          foreignField: "_id",
          as: "kit.code_pl_info",
        },
      },
      {
        $unwind: {
          path: "$kit.code_info",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$kit.code_pl_info",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          kit: {
            code: "$kit.code_info.code",
            unit_cost: "$kit.code_pl_info.total_cost",
            total_cost: {
              $multiply: ["$kit.code_pl_info.total_cost", "$kit.quantity"],
            },
            origin_cost: "$kit.code_pl_info.origin_cost",
            landing_cost: "$kit.code_pl_info.landing_cost",
            selling_price: "$kit.code_pl_info.selling_price",
          },
        },
      },
      {
        $group: {
          _id: "$_id",
          kit: {
            $push: "$kit",
          },
          root: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$root", { kit: "$kit" }],
          },
        },
      },
      {
        $addFields: {
          supersystem: { $arrayElemAt: ["$lookup_system.name", 0] },
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
    ]);
    const loose_stock_entry = await Loose_Stock_model.findOne({
      code_id: id,
    });
    return res.status(200).json({ result: result[0], loose_stock_entry });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: error?.message || 'Internal server error' })
  }
};
function validateParts(partsArray) {
  return Object.values(partsArray).every(
    (value) => value !== null && value !== undefined && value !== ""
  );
}
const update_kit = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code,
      rd,
      description,
      unit_system,
      unit_description,
      unit,

      supplier_id,
      supplier,
      supplier_code,
      supplier_item_code,
      currency_id,
      currency,

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

      systemTags
    } = JSON.parse(req.body.inputForm);
    const files = JSON.parse(req.body.files);
    const operations = JSON.parse(req.body.operation_inputs);
    const accessory = JSON.parse(req.body.accessories_inputs);
    const non_insulated = JSON.parse(req.body.noninsulated_inputs);
    const insulated = JSON.parse(req.body.insulated_inputs);
    const kit = JSON.parse(req.body.kit_inputs);
    const filename = req.file
      ? `${process.env.BACKENDURL}/uploads/${req.file.filename}`
      : req.body.photo;
    if (
      !code ||
      !supersystem_id ||
      !system_id ||
      // !subsystem ||
      !supplier_id ||
      !supplier_item_code ||
      !unit ||
      !unit_system ||
      !unit_description ||
      !description ||
      isNaN(parseFloat(rd))
      // || !packing_code ||
      // !packing_unit ||
      // isNaN(parseFloat(packing_cost)) ||
      // isNaN(parseFloat(packing_quantity)) ||
      // isNaN(parseFloat(packing_itm_cost)) ||
      // !packing_material
    ) {
      return res.status(400).json({
        mssg: "You need to add Code, system, group, subgroup, description, Open and Image.",
      });
    }
    let total_cost = 0;
    let origin_costs_sum = 0;
    let landing_costs_sum = 0;
    let selling_price_sum = 0;
    const errors = [];
    // await accessory.forEach((itm) => {
    //   if (itm.quantity <= 0) {
    //     errors.push("Quantity cannot be <= 0 for accessory");
    //   } else {
    //     total_cost += itm.total_cost;
    //     origin_costs_sum += itm.origin_cost * itm.quantity;
    //     landing_costs_sum += itm.landing_cost * itm.quantity;
    //     selling_price_sum += itm.selling_price * itm.quantity;
    //   }
    // });
    // await non_insulated.forEach((itm) => {
    //   if (itm.quantity <= 0) {
    //     errors.push("Quantity cannot be <= 0 for non-insulated profile ");
    //   } else {
    //     total_cost += itm.total_cost;
    //     origin_costs_sum += itm.origin_cost * itm.quantity;
    //     landing_costs_sum += itm.landing_cost * itm.quantity;
    //     selling_price_sum += itm.selling_price * itm.quantity;
    //   }
    // });
    // await insulated.forEach((itm) => {
    //   if (itm.quantity <= 0) {
    //     errors.push("Quantity cannot be <= 0 for insulated profile ");
    //   } else {
    //     total_cost += itm.total_cost;
    //     origin_costs_sum += itm.origin_cost * itm.quantity;
    //     landing_costs_sum += itm.landing_cost * itm.quantity;
    //     selling_price_sum += itm.selling_price * itm.quantity;
    //   }
    // });
    // await operations.forEach((itm) => {
    //   if (itm.quantity <= 0) {
    //     errors.push("Quantity cannot be <= 0 for operation ");
    //   } else {
    //     total_cost += itm?.total_cost;
    //     origin_costs_sum += itm?.unit_cost * itm.quantity;
    //     landing_costs_sum += itm?.unit_cost * itm.quantity;
    //     selling_price_sum += itm?.unit_cost * itm.quantity;
    //   }
    // });
    // await kit.forEach((itm) => {
    //   if (itm.quantity <= 0) {
    //     errors.push("Quantity cannot be <= 0 for kit item");
    //   } else {
    //     total_cost += itm.total_cost;
    //     origin_costs_sum += itm?.unit_cost * itm.quantity;
    //     landing_costs_sum += itm?.unit_cost * itm.quantity;
    //     selling_price_sum += itm?.unit_cost * itm.quantity;
    //   }
    // });
    if (errors.length > 0) {
      return res.status(400).json({ mssg: errors.join(", ") });
    }
    const updatedEntry = await Kit_Input.findOneAndUpdate(
      { _id: id },
      {
        code,
        image: filename,
        supplier_id,
        supplier_item_code,
        unit,
        unit_system,
        unit_description,
        rd,
        supersystem_id,
        system_id,
        subsystem_id,
        group_id,
        subgroup_id,
        description,
        operation: operations,
        accessories: accessory,
        non_insulated_aluminium_profile: non_insulated,
        insulated_aluminium_profile: insulated,
        kit: kit,
        files: files,
        systemTags
        // total_cost,
        //   origin_cost: origin_costs_sum,
        //   landing_cost: landing_costs_sum,
        //   selling_price: selling_price_sum,
      },
      { new: true, runValidators: true, context: "query" }
    );
    if (updatedEntry) {
      await updatedEntry.save();
    }

    return res.status(200).json({ mssg: "Kit Updated Successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: error?.message || 'Internal server error' })
  }
};

const delete_kit = async (req, res) => {
  try {
    const id = req.params.id;
    const deleted_entry = await Kit_Input.findByIdAndDelete(id);
    const deleted_pl = await Kit_Calculator.findOneAndDelete({
      input_model_id: id,
    });
    const deletedStock = await Stock_model.deleteMany({
      reference_code_id: id,
    });
    const deletedActions = await Action_model.deleteMany({ ref_code_id: id });
    return res.status(200).json({ mssg: "Entry Deleted" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: error?.message || 'Internal server error' })
  }
};
const create_duplicate_kit = async (req, res) => {
  try {
    const {
      code,
      rd,
      description,
      unit_system,
      unit_description,
      unit,

      supplier_id,
      supplier,
      supplier_code,
      supplier_item_code,
      currency_id,
      currency,

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

      systemTags
    } = JSON.parse(req.body.inputForm);
    const files = JSON.parse(req.body.files);
    const operations = JSON.parse(req.body.operation_inputs);
    const accessory = JSON.parse(req.body.accessories_inputs);
    const non_insulated = JSON.parse(req.body.noninsulated_inputs);
    const insulated = JSON.parse(req.body.insulated_inputs);
    const kit = JSON.parse(req.body.kit_inputs);
    // console.log(insulated);
    // return;
    const filename = req.body.photo;
    if (
      !code ||
      !supersystem_id ||
      !system_id ||
      // !subsystem ||
      !supplier_id ||
      !supplier_item_code ||
      !unit ||
      !unit_system ||
      !unit_description ||
      !description ||
      isNaN(parseFloat(rd))
      // !req.file?.filename
      // || !packing_code ||
      // !packing_unit ||
      // isNaN(parseFloat(packing_cost)) ||
      // isNaN(parseFloat(packing_quantity)) ||
      // isNaN(parseFloat(packing_itm_cost)) ||
      // !packing_material
    ) {
      return res.status(400).json({
        mssg: "You need to add Code, system, group, subgroup, description and Image.",
      });
    }
    const if_kit = await Kit_Input.find({ code });
    if (if_kit.length > 0) {
      return res.status(400).json({
        mssg: "Entry Already Exists With Code",
      });
    }
    let total_cost = 0;
    let origin_costs_sum = 0;
    let landing_costs_sum = 0;
    let selling_price_sum = 0;
    const errors = [];
    // await accessory.forEach((itm) => {
    //   if (itm.quantity <= 0) {
    //     errors.push("Quantity cannot be <= 0 for accessory");
    //   } else {
    //     total_cost += itm.total_cost;
    //     origin_costs_sum += itm.origin_cost;
    //     landing_costs_sum += itm.landing_cost;
    //     selling_price_sum += itm.selling_price;
    //   }
    // });
    // await non_insulated.forEach((itm) => {
    //   if (itm.quantity <= 0) {
    //     errors.push("Quantity cannot be <= 0 for non-insulated profile ");
    //   } else {
    //     total_cost += itm.total_cost;
    //     origin_costs_sum += itm.origin_cost;
    //     landing_costs_sum += itm.landing_cost;
    //     selling_price_sum += itm.selling_price;
    //   }
    // });
    // await insulated.forEach((itm) => {
    //   if (itm.quantity <= 0) {
    //     errors.push("Quantity cannot be <= 0 for insulated profile ");
    //   } else {
    //     total_cost += itm.total_cost;
    //     origin_costs_sum += itm.origin_cost;
    //     landing_costs_sum += itm.landing_cost;
    //     selling_price_sum += itm.selling_price;
    //   }
    // });
    // await operations.forEach((itm) => {
    //   if (itm.quantity <= 0) {
    //     errors.push("Quantity cannot be <= 0 for operation ");
    //   } else {
    //     origin_costs_sum += itm?.unit_cost;
    //     landing_costs_sum += itm?.unit_cost;
    //     selling_price_sum += itm?.unit_cost;
    //     total_cost += itm?.total_cost;
    //   }
    // });
    // await kit.forEach((itm) => {
    //   if (itm.quantity <= 0) {
    //     errors.push("Quantity cannot be <= 0 for kit item");
    //   } else {
    //     total_cost += itm.total_cost;
    //     origin_costs_sum += itm?.unit_cost;
    //     landing_costs_sum += itm?.unit_cost;
    //     selling_price_sum += itm?.unit_cost;
    //   }
    // });
    if (errors.length > 0) {
      return res.status(400).json({ mssg: errors.join(", ") });
    }
    const new_kit = await Kit_Input.create({
      code,
      image: filename,
      supplier_id,
      supplier_item_code,
      unit,
      unit_system,
      unit_description,
      rd,
      supersystem_id,
      system_id,
      subsystem_id,
      group_id,
      subgroup_id,
      description,
      operation: operations,
      accessories: accessory,
      non_insulated_aluminium_profile: non_insulated,
      insulated_aluminium_profile: insulated,
      kit: kit,
      files: files,
      systemTags
    });
    return res.status(200).json({ mssg: `Duplicate Entry Created` });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: error?.message || 'Internal server error' })
  }
};
const kit_price_list = async (req, res) => {
  try {
    let { filter, page, getAll } = req.query;
    if (getAll) {
      let result = await Kit_Calculator.aggregate([
        {
          $lookup: {
            from: "kit_inputs",
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
      // let where = { code: searchRegex };
      let and = [{}];
      if (filter?.system) {
        and.push({
          "input_detail.system_id": new mongoose.Types.ObjectId(filter.system),
        });
      }
      if (filter?.supplier) {
        and.push({
          "input_detail.supplier_id": new mongoose.Types.ObjectId(
            filter.supplier
          ),
        });
      }
      let where = and.length > 0 ? { $and: and } : {};
      let result = await Kit_Calculator.aggregate([
        {
          $lookup: {
            from: "kit_inputs",
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
          $match: {
            "input_detail.code": searchRegex,
          },
        },
        {
          $match: {
            ...where,
          },
        },
        {
          $sort: {
            "input_detail.code": 1,
          },
        },
        {
          $skip: skip,
        },
        {
          $limit: limit,
        },
      ]);

      const totalCount = await Kit_Calculator.aggregate([
        {
          $lookup: {
            from: "kit_inputs",
            localField: "input_model_id",
            foreignField: "_id",
            as: "input_detail",
          },
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
      const total_page = Math.ceil(totalCount / limit);
      return res.json({ result, currentPage, total_page, totalCount, limit });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: error?.message || 'Internal server error' })
  }
};
const generate_kit_pl = async (req, res) => {
  try {
    let skip = 0
    let limit = 100
    let hasMore = true
    while (hasMore) {
      const kit = await Kit_Input.aggregate([
        // { $match: {   } },
        {
          $skip: skip
        },
        {
          $limit: limit
        },
        {
          $lookup: {
            from: "profile_system_models",
            localField: "system",
            foreignField: "system_detail.name",
            as: "profile_system",
            // pipeline: [{ $match: {   } }],
          },
        },
        { $unwind: "$accessories" },
        {
          $lookup: {
            from: "accessories_input_models", // Replace with the actual collection name
            localField: "accessories.code_id",
            foreignField: "_id",
            as: "accessories.code_info",
          },
        },
        {
          $lookup: {
            from: "accessories_calculators", // Replace with the actual collection name
            localField: "accessories.code_pl_id",
            foreignField: "_id",
            as: "accessories.code_pl_info",
          },
        },
        {
          $unwind: {
            path: "$accessories.code_info",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: "$accessories.code_pl_info",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            accessories: {
              code: "$accessories.code_info.code",
              unit_cost: "$accessories.code_pl_info.selling_price",
              total_cost: {
                $multiply: [
                  "$accessories.code_pl_info.selling_price",
                  "$accessories.quantity",
                ],
              },
              origin_cost: "$accessories.code_pl_info.oc",
              landing_cost: "$accessories.code_pl_info.landing_cost",
              selling_price: "$accessories.code_pl_info.selling_price",
            },
          },
        },
        {
          $group: {
            _id: "$_id",
            accessories: { $push: "$accessories" },
            root: { $first: "$$ROOT" },
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: ["$root", { accessories: "$accessories" }],
            },
          },
        },

        { $unwind: "$non_insulated_aluminium_profile" },
        {
          $lookup: {
            from: "profile_input_models", // Replace with the actual collection name
            localField: "non_insulated_aluminium_profile.code_id",
            foreignField: "_id",
            as: "non_insulated_aluminium_profile.code_info",
          },
        },
        {
          $lookup: {
            from: "profile_calculators", // Replace with the actual collection name
            localField: "non_insulated_aluminium_profile.code_pl_id",
            foreignField: "_id",
            as: "non_insulated_aluminium_profile.code_pl_info",
          },
        },
        {
          $unwind: {
            path: "$non_insulated_aluminium_profile.code_info",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: "$non_insulated_aluminium_profile.code_pl_info",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            non_insulated_aluminium_profile: {
              code: "$non_insulated_aluminium_profile.code_info.code",
              unit_cost:
                "$non_insulated_aluminium_profile.code_pl_info.final_selling_price",
              total_cost: {
                $multiply: [
                  "$non_insulated_aluminium_profile.code_pl_info.final_selling_price",
                  "$non_insulated_aluminium_profile.quantity",
                ],
              },
              origin_cost:
                "$non_insulated_aluminium_profile.code_pl_info.origin_cost",
              landing_cost:
                "$non_insulated_aluminium_profile.code_pl_info.origin_cost",
              selling_price:
                "$non_insulated_aluminium_profile.code_pl_info.final_selling_price",
            },
          },
        },
        {
          $group: {
            _id: "$_id",
            non_insulated_aluminium_profile: {
              $push: "$non_insulated_aluminium_profile",
            },
            root: { $first: "$$ROOT" },
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: [
                "$root",
                {
                  non_insulated_aluminium_profile:
                    "$non_insulated_aluminium_profile",
                },
              ],
            },
          },
        },

        { $unwind: "$insulated_aluminium_profile" },
        {
          $lookup: {
            from: "profile_insulated_inputs", // Replace with the actual collection name
            localField: "insulated_aluminium_profile.code_id",
            foreignField: "_id",
            as: "insulated_aluminium_profile.code_info",
          },
        },
        {
          $lookup: {
            from: "profile_insulated_calculators", // Replace with the actual collection name
            localField: "insulated_aluminium_profile.code_pl_id",
            foreignField: "_id",
            as: "insulated_aluminium_profile.code_pl_info",
          },
        },
        {
          $unwind: {
            path: "$insulated_aluminium_profile.code_info",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: "$insulated_aluminium_profile.code_pl_info",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            insulated_aluminium_profile: {
              code: "$insulated_aluminium_profile.code_info.code",
              unit_cost: "$insulated_aluminium_profile.code_pl_info.total_cost",
              total_cost: {
                $multiply: [
                  "$insulated_aluminium_profile.code_pl_info.total_cost",
                  "$insulated_aluminium_profile.quantity",
                ],
              },
              origin_cost:
                "$insulated_aluminium_profile.code_pl_info.origin_cost",
              landing_cost:
                "$insulated_aluminium_profile.code_pl_info.landing_cost",
              selling_price:
                "$insulated_aluminium_profile.code_pl_info.selling_price",
            },
          },
        },
        {
          $group: {
            _id: "$_id",
            insulated_aluminium_profile: {
              $push: "$insulated_aluminium_profile",
            },
            root: { $first: "$$ROOT" },
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: [
                "$root",
                { insulated_aluminium_profile: "$insulated_aluminium_profile" },
              ],
            },
          },
        },

        { $unwind: "$operation" },
        {
          $lookup: {
            from: "operations_models", // Replace with the actual collection name
            localField: "operation.code_id",
            foreignField: "_id",
            as: "operation.code_info",
          },
        },
        {
          $unwind: {
            path: "$operation.code_info",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $addFields: {
            operation: {
              code: {
                $concat: [
                  "$operation.code_info.operation",
                  " ",
                  { $ifNull: ["$operation.code_info.supplier", ""] },
                ],
              },
              unit_cost: "$operation.code_info.cost_to_aed",
              total_cost: {
                $multiply: [
                  "$operation.code_info.cost_to_aed",
                  "$operation.quantity",
                ],
              },
              origin_cost: 0,
              landing_cost: 0,
              selling_price: 0,
            },
          },
        },

        {
          $group: {
            _id: "$_id",
            operation: {
              $push: "$operation",
            },
            root: { $first: "$$ROOT" },
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: ["$root", { operation: "$operation" }],
            },
          },
        },

        { $unwind: "$kit" },
        {
          $lookup: {
            from: "kit_inputs", // Replace with the actual collection name
            localField: "kit.code_id",
            foreignField: "_id",
            as: "kit.code_info",
          },
        },
        {
          $lookup: {
            from: "kit_calculators", // Replace with the actual collection name
            localField: "kit.code_pl_id",
            foreignField: "_id",
            as: "kit.code_pl_info",
          },
        },
        {
          $unwind: {
            path: "$kit.code_info",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: "$kit.code_pl_info",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            kit: {
              code: "$kit.code_info.code",
              unit_cost: "$kit.code_pl_info.total_cost",
              total_cost: {
                $multiply: ["$kit.code_pl_info.total_cost", "$kit.quantity"],
              },
              origin_cost: "$kit.code_pl_info.origin_cost",
              landing_cost: "$kit.code_pl_info.landing_cost",
              selling_price: "$kit.code_pl_info.selling_price",
            },
          },
        },
        {
          $group: {
            _id: "$_id",
            kit: {
              $push: "$kit",
            },
            root: { $first: "$$ROOT" },
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: ["$root", { kit: "$kit" }],
            },
          },
        },
      ]);
      if (kit.length == 0) {
        hasMore = false
      } else {
        await Promise.all(
          kit.map(async (itm) => {
            try {
              let origin_cost_sum = 0;
              let landing_cost_sum = 0;
              let selling_price_sum = 0;
              let sum_total = 0;
              const accessory = itm.accessories;
              await Promise.all(
                accessory.map(async (aitm) => {
                  origin_cost_sum += aitm?.origin_cost ? aitm?.origin_cost : 0;
                  landing_cost_sum += aitm?.landing_cost ? aitm?.landing_cost : 0;
                  selling_price_sum += aitm?.selling_price ? aitm?.selling_price : 0;
                  sum_total +=
                    (aitm?.selling_price ? aitm?.selling_price : 0) * aitm?.quantity;
                  // sum_total += aitm.total_cost;
                })
              );

              const non_insulated = itm.non_insulated_aluminium_profile;
              await Promise.all(
                non_insulated.map(async (nitm) => {
                  origin_cost_sum += nitm?.origin_cost ? nitm?.origin_cost : 0;
                  landing_cost_sum += nitm?.landing_cost ? nitm?.landing_cost : 0;
                  selling_price_sum += nitm?.selling_price ? nitm?.selling_price : 0;
                  sum_total +=
                    (nitm?.selling_price ? nitm?.selling_price : 0) * nitm?.quantity;
                  // sum_total += nitm.total_cost;
                })
              );

              const insulated = itm.insulated_aluminium_profile;
              await Promise.all(
                insulated.map(async (ins_itm) => {
                  origin_cost_sum += ins_itm?.origin_cost ? ins_itm?.origin_cost : 0;
                  landing_cost_sum += ins_itm?.landing_cost
                    ? ins_itm?.landing_cost
                    : 0;
                  selling_price_sum += ins_itm?.selling_price
                    ? ins_itm?.selling_price
                    : 0;
                  sum_total +=
                    (ins_itm?.selling_price ? ins_itm?.selling_price : 0) *
                    ins_itm?.quantity;
                  // sum_total += ins_itm.total_cost;
                })
              );

              const operation = itm.operation;
              await Promise.all(
                operation.map(async (op_itm) => {
                  origin_cost_sum += 0;
                  landing_cost_sum += 0;
                  selling_price_sum += 0;
                  sum_total +=
                    (op_itm.unit_cost ? op_itm.unit_cost : 0) * op_itm?.quantity;
                  // sum_total += op_itm.total_cost;
                })
              );

              const kit = itm.kit;
              await Promise.all(
                kit.map(async (kit_itm) => {
                  origin_cost_sum += kit_itm?.origin_cost ? kit_itm?.origin_cost : 0;
                  landing_cost_sum += kit_itm?.landing_cost
                    ? kit_itm?.landing_cost
                    : 0;
                  selling_price_sum += kit_itm?.selling_price
                    ? kit_itm?.selling_price
                    : 0;
                  sum_total +=
                    (kit_itm?.selling_price ? kit_itm?.selling_price : 0) *
                    kit_itm?.quantity;
                  // sum_total += kit_itm.total_cost;
                })
              );
              let pl1 = sum_total / (1 - itm?.profile_system[0]?.price_list_1 / 100);
              let pl2 = sum_total / (1 - itm?.profile_system[0]?.price_list_2 / 100);
              let pl3 = sum_total / (1 - itm?.profile_system[0]?.price_list_3 / 100);
              let pl4 = sum_total / (1 - itm?.profile_system[0]?.price_list_4 / 100);
              let Kit_Calc_Exist = await Kit_Calculator.findOne({
                input_model_id: itm._id,
              });
              const stockWithNoAvgCost = await Stock_model.find({
                reference_code_id: itm._id,
                avg_price: 0,
              });
              if (stockWithNoAvgCost.length > 0) {
                await Stock_model.updateMany(
                  {
                    reference_code_id: itm._id,
                    avg_price: 0,
                  },
                  { $set: { avg_price: itm.total_cost } }
                );
              }

              if (Kit_Calc_Exist) {
                await Kit_Calculator.findOneAndUpdate(
                  { input_model_id: itm._id },
                  {
                    // code: itm.code,
                    // system: itm.system,
                    // description: itm.description,
                    // files: itm.files,
                    origin_cost: origin_cost_sum,
                    landing_cost: landing_cost_sum,
                    selling_price: selling_price_sum,
                    input_model_id: itm._id,
                    total_cost: sum_total,
                    price_list_1: pl1,
                    price_list_2: pl2,
                    price_list_3: pl3,
                    price_list_4: pl4,
                  }
                );
              } else {
                await Kit_Calculator.create({
                  // code: itm.code,
                  // system: itm.system,
                  // description: itm.description,
                  // files: itm.files,
                  input_model_id: itm._id,
                  total_cost: sum_total,
                  origin_cost: origin_cost_sum,
                  landing_cost: landing_cost_sum,
                  selling_price: selling_price_sum,
                  price_list_1: pl1,
                  price_list_2: pl2,
                  price_list_3: pl3,
                  price_list_4: pl4,
                });
              }
            } catch (error) {
              console.error("Kit, Error processing item:", itm._id, error.message);
            }
          })
        );
        skip += limit
      }
    }
    return true;
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: error?.message || 'Internal server error' })
  }
};

const refresh_pl = async (req, res) => {
  try {
    if (plRefreshLock.get("refreshing")) {
      await plRefreshPromise;
      return res
        .status(200)
        .json({ mssg: "Refreshed via existing process (waited)" });
    }
    plRefreshLock.set("refreshing", true);
    plRefreshPromise = (async () => {
      await price_calc_step2_Helper();
      await generate_PriceList_Helper();
      await generate_insulated_pl();
      await generate_kit_pl();
    })();

    await plRefreshPromise;

    return res
      .status(200)
      .json({ mssg: "Successfully Refreshed Price List (first trigger)" });
    // const entries = await Kit_Input.find();
    // await Promise.all(
    //   entries.map(async (entry) => {
    //     let sum_total = 0;
    //     const accessory = entry.accessories;
    //     await Promise.all(
    //       accessory.map(async (itm) => {
    //         const ac_entry = await AccessoriesCalculator.findOne({
    //           code: itm.code,
    //         });
    //         if (ac_entry) {
    //           itm.unit_cost = ac_entry.selling_price;
    //           itm.total_cost = ac_entry.selling_price * itm.quantity;
    //           sum_total += itm.total_cost;
    //         }
    //       })
    //     );

    //     const non_insulated = entry.non_insulated_aluminium_profile;
    //     await Promise.all(
    //       non_insulated.map(async (itm) => {
    //         const ni_entry = await Profile_Calculator.findOne({
    //           code: itm.code,
    //         });
    //         if (ni_entry) {
    //           itm.unit_cost = ni_entry.final_selling_price;
    //           itm.total_cost = ni_entry.final_selling_price * itm.quantity;
    //           sum_total += itm.total_cost;
    //         }
    //       })
    //     );

    //     const insulated = entry.insulated_aluminium_profile;
    //     await Promise.all(
    //       insulated.map(async (itm) => {
    //         const i_entry = await Profile_Insulated_Input.findOne({
    //           code: itm.code,
    //         });
    //         if (i_entry) {
    //           itm.unit_cost = i_entry.total_cost;
    //           itm.total_cost = i_entry.total_cost * itm.quantity;
    //           sum_total += itm.total_cost;
    //         }
    //       })
    //     );

    //     const operation = entry.operation;
    //     await Promise.all(
    //       operation.map(async (itm) => {
    //         const firstSpaceIndex = itm.code.indexOf(" ");
    //         const operationCode = itm.code.substring(0, firstSpaceIndex); // Extracting operation code
    //         const supplierName = itm.code.substring(firstSpaceIndex + 1); // Extracting supplier name on operation code and supplier
    //         const op_entry = await Operations_Model.findOne({
    //           operation: operationCode,
    //           supplier: supplierName,
    //         });
    //         if (op_entry) {
    //           itm.unit_cost = op_entry.cost_to_aed;
    //           itm.total_cost = op_entry.cost_to_aed * itm.quantity;
    //           sum_total += itm.total_cost;
    //         }
    //       })
    //     );
    //     const kit = entry.kit;
    //     await Promise.all(
    //       kit.map(async (itm) => {
    //         const kit_entry = await Kit_Input.findOne({
    //           code: itm.code,
    //         });
    //         if (kit_entry) {
    //           itm.unit_cost = kit_entry.total_cost;
    //           itm.total_cost = kit_entry.total_cost * itm.quantity;
    //           sum_total += itm.total_cost;
    //         }
    //       })
    //     );
    //     entry.total_cost = sum_total;
    //     await entry.save();
    //   })
    // );
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Package Price list refresh failed." });
  } finally {
    plRefreshLock.del("refreshing");
    plRefreshPromise = null;
  }
};

//kit packages
const add_kit_package = async (req, res) => {
  try {
    const packages = req.body.packages;
    const loose = req.body.loose;
    const { add_new_package } = req.body;
    const { code, id } = req.body.selectedCode;
    if (!code || !id) {
      return res.status(400).json({ mssg: "Please Select a Code" });
    }
    const ref_code_detail = await Kit_Input.findById(id);
    if (loose.msq != 0) {
      const ifLooseExist = await Loose_Stock_model.findOne({
        code_id: loose.code_id,
      });
      if (!ifLooseExist) {
        const loose_stock = await Loose_Stock_model.create({
          code_id: loose.code_id,
          category: "Kit",
          msq: loose.msq,
        });
        const looseLog = await Log_Model.create({
          stock_id: loose_stock._id,
          ref_code_id: loose.code_id,
          category: "Kit",
          stockType: "Loose",
          description: `Loose Stock created for code ${ref_code_detail.code}`,
          snapShot: loose_stock.toObject(),
        });
        if (
          loose_stock.free_inventory <
          loose.msq
        ) {
          const new_notification = await Action_model.create({
            code_id: loose_stock._id,
            ref_code_id: loose.code_id,
            category: "Kit",
            order_type: "Loose",
          });
        }
      } else {
        const loose_stock = await Loose_Stock_model.findOneAndUpdate(
          { code_id: loose.code_id },
          {
            category: "Kit",
            msq: loose.msq,
          },
          { new: true }
        );
        const looseLog = await Log_Model.create({
          stock_id: loose_stock._id,
          ref_code_id: loose.code_id,
          category: "Kit",
          stockType: "Loose",
          description: `Loose Stock updated for code ${ref_code_detail.code} through package page`,
          snapShot: loose_stock.toObject(),
        });
        if (
          loose_stock.free_inventory <
          loose.msq
        ) {
          const new_notification = await Action_model.create({
            code_id: loose_stock._id,
            ref_code_id: loose.code_id,
            category: "Kit",
            order_type: "Loose",
          });
        }
      }
    }
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
          const new_package = await Stock_model.create({
            packing_code: itm.packing_code,
            packing_description: itm.packing_description,
            packing_unit: itm.packing_unit,
            packing_quantity: itm.packing_quantity,
            packing_material: itm.packing_material,
            packing_cost: itm.packing_cost,
            packing_total_cost:
              parseFloat(itm.packing_quantity) + parseFloat(itm.packing_cost),
            reference_code_id: ref_code_detail._id,
            category: "Kit",
            msq: itm.msq,
          });
          const StockLog = await Log_Model.create({
            stock_id: new_package._id,
            ref_code_id: ref_code_detail._id,
            category: "Kit",
            stockType: "Package",
            description: `Stock created for code ${itm.packing_code}`,
            snapShot: new_package.toObject(),
          });
          let stock_qty =
            new_package.free_inventory;
          if (stock_qty < itm.msq) {
            const if_action = await Action_model.findOne({
              code_id: new_package._id,
            });
            if (!if_action) {
              const new_notification = await Action_model.create({
                code_id: new_package._id,
                ref_code_id: ref_code_detail._id,
                category: "Kit",
              });
            }
          } else if (stock_qty >= itm.msq) {
            const deleted_notification = await Action_model.findOneAndDelete({
              code_id: new_package._id,
            });
          }
          ref_code_detail.stock_detail.push(new_package._id);
        })
      );
      await ref_code_detail.save();
    }
    await ref_code_detail.save();
    return res.status(200).json({ mssg: "Package Added" });
  } catch (error) {
    if (error.code == 11000) {
      return res.status(400).json({
        mssg: `Duplicate Packing Code ${error.keyValue.packing_code}`,
      });
    }
    console.log(error);
    return res.status(500).json({ mssg: error?.message || 'Internal server error' })
  }
};
const get_kit_packages = async (req, res) => {
  try {
    let { search, page, filter, getAll } = req.query;
    if (getAll) {
      const entry = await Stock_model.aggregate([
        {
          $lookup: {
            from: "kit_inputs",
            localField: "reference_code_id",
            foreignField: "_id",
            as: "entry_detail",
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
        {
          $match: {
            $and: [{ category: "Kit" }],
          },
        },
      ]);
      return res.status(200).json({
        entry,
      });
    } else {
      let searchRegex = { $regex: new RegExp(".*" + search + ".*", "i") };
      const limit = 8;
      const pageNumber = parseInt(page) || 1;
      const skip = (pageNumber - 1) * limit;
      let and = [{ category: "Kit" }];
      if (filter?.packing_unit) {
        and.push({ packing_unit: filter.packing_unit });
      }
      let where = {
        $or: [
          { "entry_detail.code": searchRegex },
          { packing_code: searchRegex },
        ],
        $and: and,
      };
      const entry = await Stock_model.aggregate([
        {
          $lookup: {
            from: "kit_inputs",
            localField: "reference_code_id",
            foreignField: "_id",
            as: "entry_detail",
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
        {
          $match: where,
        },
        { $skip: skip },
        { $limit: limit },
      ]);
      const totalCount = await Stock_model.countDocuments({ $and: and });
      const total_page = Math.ceil(totalCount / limit);
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
    return res.status(500).json({ mssg: error?.message || 'Internal server error' })
  }
};
const get_single_kit_package = async (req, res) => {
  try {
    const id = req.params.id;
    const input = await Kit_Input.findById(id);
    // const entry = await Kit_Input.findById(id).populate({
    //   path: "stock_detail",
    //   model: "Stock_model",
    // });
    const entry = await Kit_Input.aggregate([
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
    ]);
    const loose_stock_entry = await Loose_Stock_model.findOne({
      code_id: id,
    });
    return res.status(200).json({ entry: entry[0], loose_stock_entry });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: error?.message || 'Internal server error' })
  }
};
const update_kit_package = async (req, res) => {
  try {
    const { packages, loose, open_package, new_packages } = req.body;
    const { code, id } = req.body.selectedCode;
    const ref_code_detail = await Kit_Input.findById(id);
    if (loose.msq != 0) {
      let loose_stock = await Loose_Stock_model.findOne({
        code_id: ref_code_detail._id,
      });

      if (!loose_stock) {
        loose_stock = await Loose_Stock_model.create({
          code_id: loose.code_id,
          category: "Kit",
          msq: loose.msq,
        });
        const looseLog = await Log_Model.create({
          stock_id: loose_stock._id,
          ref_code_id: loose.code_id,
          category: "Kit",
          stockType: "Loose",
          description: `Loose Stock created for code ${ref_code_detail.code}`,
          snapShot: loose_stock.toObject(),
        });
      } else {
        loose_stock = await Loose_Stock_model.findOneAndUpdate(
          { code_id: ref_code_detail._id },
          {
            code_id: loose.code_id,
            category: "Kit",
            msq: loose.msq,
          },
          { new: true }
        );
        const looseLog = await Log_Model.create({
          stock_id: loose_stock._id,
          ref_code_id: loose.code_id,
          category: "Kit",
          stockType: "Loose",
          description: `Loose Stock's updated for code ${ref_code_detail.code} through package page`,
          snapShot: loose_stock.toObject(),
        });
      }
      let new_fetched_loose_stock = await Loose_Stock_model.findOne({
        code_id: ref_code_detail._id,
      });
      if (
        new_fetched_loose_stock.free_inventory <
        new_fetched_loose_stock.msq
      ) {
        const new_notification = await Action_model.findOneAndUpdate(
          { code_id: loose_stock._id },
          {
            code_id: loose_stock._id,
            ref_code_id: ref_code_detail._id,
            category: "Kit",
            order_type: "Loose",
          },
          {
            upsert: true,
          }
        );
      } else {
        await Action_model.deleteMany({ code_id: loose_stock._id });
      }
    }
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
          const new_package = await Stock_model.create({
            packing_code: itm.packing_code,
            packing_description: itm.packing_description,
            packing_unit: itm.packing_unit,
            packing_quantity: itm.packing_quantity,
            packing_material: itm.packing_material,
            packing_cost: itm.packing_cost,
            packing_total_cost:
              parseFloat(itm.packing_quantity) + parseFloat(itm.packing_cost),
            reference_code_id: ref_code_detail._id,
            category: "Kit",
            msq: itm.msq,
          });
          const StockLog = await Log_Model.create({
            stock_id: new_package._id,
            ref_code_id: ref_code_detail._id,
            category: "Kit",
            stockType: "Package",
            description: `Stock created for code ${itm.packing_code}`,
            snapShot: new_package.toObject(),
          });
          let stock_qty =
            new_package.free_inventory;
          if (stock_qty < itm.msq) {
            const new_notification = await Action_model.create({
              code_id: new_package._id,
              ref_code_id: ref_code_detail._id,
              category: "Kit",
            });
          }
          ref_code_detail.stock_detail.push(new_package._id);
        })
      );
    }
    await ref_code_detail.save();
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
            category: "Kit",
            msq: itm.msq,
          },
          { new: true }
        );
        const StockLog = await Log_Model.create({
          stock_id: existing_package._id,
          ref_code_id: ref_code_detail._id,
          category: "Kit",
          stockType: "Package",
          description: `Stock Updated for code ${itm.packing_code} through package page`,
          snapShot: existing_package.toObject(),
        });
        let stock_qty =
          existing_package.free_inventory;
        if (stock_qty < itm.msq) {
          const if_action = await Action_model.findOne({
            code_id: existing_package._id,
          });
          if (!if_action) {
            const new_notification = await Action_model.create({
              code_id: existing_package._id,
              ref_code_id: ref_code_detail._id,
              category: "Kit",
            });
          }
        } else if (stock_qty >= itm.msq) {
          const deleted_notification = await Action_model.findOneAndDelete({
            code_id: existing_package._id,
          });
        }
      })
    );
    return res.status(200).json({ mssg: "Package Updated" });
  } catch (error) {
    if (error.code == 11000) {
      return res.status(400).json({
        mssg: `Duplicate Packing Code ${error.keyValue.packing_code}`,
      });
    }
    console.log(error);
    return res.status(500).json({ mssg: error?.message || 'Internal server error' })
  }
};
const get_kit_avlb_for_package = async (req, res) => {
  try {
    let { search } = req.query
    let searchRegex = { $regex: new RegExp(".*" + search + ".*", "i") };
    const result = await Kit_Input.aggregate([
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
        $addFields: {
          supplier: { $arrayElemAt: ["$supplierDetail.name", 0] },
          supplier_code: { $arrayElemAt: ["$supplierDetail.code", 0] },
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
        $limit: 20
      }
    ]);
    return res.status(200).json({ result });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: error?.message || 'Internal server error' })
  }
};

//kit package pl
const generate_kit_package_pl = async (req, res) => {
  try {
    let skip = 0
    let limit = 100
    let hasMore = true
    while (hasMore) {
      const kit = await Stock_model.aggregate([
        {
          $skip: skip
        },
        {
          $limit: limit
        },
        {
          $match: {
            category: "Kit",
          },
        },
        {
          $lookup: {
            from: "kit_calculators",
            localField: "reference_code_id",
            foreignField: "input_model_id",
            as: "lookup_kit_calc",
          },
        },
      ]);
      if (kit.length == 0) {
        hasMore = false
      } else {
        await Promise.all(
          kit.map(async (itm) => {
            let package_origin_cost =
              itm.lookup_kit_calc[0]?.origin_cost * itm?.packing_quantity +
              itm?.packing_cost;
            let package_landing_cost =
              itm.lookup_kit_calc[0]?.landing_cost * itm?.packing_quantity +
              itm?.packing_cost;
            let package_selling_price =
              itm.lookup_kit_calc[0]?.selling_price * itm?.packing_quantity +
              itm?.packing_cost;
            let pl1 =
              itm.lookup_kit_calc[0]?.price_list_1 * itm?.packing_quantity +
              itm?.packing_cost;
            let pl2 =
              itm.lookup_kit_calc[0]?.price_list_2 * itm?.packing_quantity +
              itm?.packing_cost;
            let pl3 =
              itm.lookup_kit_calc[0]?.price_list_3 * itm?.packing_quantity +
              itm?.packing_cost;
            let pl4 =
              itm.lookup_kit_calc[0]?.price_list_4 * itm?.packing_quantity +
              itm?.packing_cost;
            let updateFields = {
              origin_cost: package_origin_cost,
              landing_cost: package_landing_cost,
              selling_price: package_selling_price,
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
        skip += limit
      }
    }
    return kit;
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: error?.message || 'Internal server error' })
  }
};
const refresh_kit_package_price_list = async (req, res) => {
  try {
    if (packagePlRefreshLock.get("packageRefresh")) {
      await packagePlRefreshPromise
      return res.status(200).json({ mssg: "Awaited Previous Request" })
    }
    packagePlRefreshLock.set("packageRefresh", true);
    packagePlRefreshPromise = (async () => {
      await acc_package_pl_helper();
      await generate_Package_PL_Helper();
      await generate_insulated_package_pl();
      await generate_kit_package_pl();
    })()
    await packagePlRefreshPromise;

    return res
      .status(200)
      .json({ mssg: "Successfully Refreshed Package Price List (first trigger)" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Price list refresh failed." });
  } finally {
    packagePlRefreshLock.del("packageRefresh")
    packagePlRefreshPromise = null
  }
};
const get_kit_package_pl = async (req, res) => {
  try {
    let { search, page, getAll } = req.query;
    if (getAll) {
      let result = await Stock_model.find({ $and: [{ category: "Kit" }] })
        .populate({
          path: "reference_code_id",
          model: "Kit_Input",
        })
        .sort({ packing_code: 1 });

      return res.json({ result });
    } else {
      let searchRegex = { $regex: new RegExp(".*" + search + ".*", "i") };

      const limit = 10;
      const pageNumber = parseInt(page) || 1;
      const skip = (pageNumber - 1) * limit;
      let and = [{ category: "Kit" }];
      let where = {
        $or: [{ packing_code: searchRegex }],
        $and: and,
      };

      let result = await Stock_model.find(where)
        .populate({
          path: "reference_code_id",
          model: "Kit_Input",
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

const search_system = async (req, res) => {
  try {
    const result = await Kit_Input.distinct("system");

    return res.status(200).json({ result });
  } catch (error) {
    return res.status(500).json({ msg: error.message });
  }
};
const search_subsystems = async (req, res) => {
  try {
    const result = await Kit_Input.distinct("subsystem");

    return res.status(200).json({ result });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: error?.message || 'Internal server error' })
  }
};
const search_group = async (req, res) => {
  try {
    const result = await Kit_Input.distinct("group");

    return res.status(200).json({ result });
  } catch (error) {
    return res.status(500).json({ msg: error.message });
  }
};
const search_subgroup = async (req, res) => {
  try {
    const result = await await Kit_Input.distinct("subgroup");

    return res.status(200).json({ result });
  } catch (error) {
    return res.status(500).json({ msg: error.message });
  }
};
const search_kit = async (req, res) => {
  try {
    let { search, page } = req.query;
    let searchRegex = { $regex: new RegExp(".*" + search + ".*", "i") };
    const limit = 10;
    const pageNumber = parseInt(page) || 1;
    const skip = (pageNumber - 1) * limit;
    let and = [{}];
    let where = {
      $or: [{ code: searchRegex }, { description: searchRegex }],
      $and: and,
    };
    const result = await Kit_Input.find(where).limit(limit).skip(skip);

    const totalCount = await Kit_Input.countDocuments(where);
    const currentPage = pageNumber;
    const total_page = Math.ceil(totalCount / limit);
    return res
      .status(200)
      .json({ result, currentPage, total_page, totalCount, limit });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: error?.message || 'Internal server error' })
  }
};
const get_kit_system = async (req, res) => {
  try {
    const filters = await Kit_Input.aggregate([
      {
        $lookup: {
          from: "stock_models",
          localField: "_id",
          foreignField: "reference_code_id",
          as: "stock_detail",
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

      { $unwind: "$accessories" },
      {
        $lookup: {
          from: "accessories_input_models", // Replace with the actual collection name
          localField: "accessories.code_id",
          foreignField: "_id",
          as: "accessories.code_info",
        },
      },
      {
        $lookup: {
          from: "accessories_calculators", // Replace with the actual collection name
          localField: "accessories.code_pl_id",
          foreignField: "_id",
          as: "accessories.code_pl_info",
        },
      },
      {
        $unwind: {
          path: "$accessories.code_info",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$accessories.code_pl_info",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          accessories: {
            code: "$accessories.code_info.code",
            unit_cost: "$accessories.code_pl_info.selling_price",
            total_cost: {
              $multiply: [
                "$accessories.code_pl_info.selling_price",
                "$accessories.quantity",
              ],
            },
            origin_cost: "$accessories.code_pl_info.oc",
            landing_cost: "$accessories.code_pl_info.landing_cost",
            selling_price: "$accessories.code_pl_info.selling_price",
          },
        },
      },
      {
        $group: {
          _id: "$_id",
          accessories: { $push: "$accessories" },
          root: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$root", { accessories: "$accessories" }],
          },
        },
      },

      { $unwind: "$non_insulated_aluminium_profile" },
      {
        $lookup: {
          from: "profile_input_models", // Replace with the actual collection name
          localField: "non_insulated_aluminium_profile.code_id",
          foreignField: "_id",
          as: "non_insulated_aluminium_profile.code_info",
        },
      },
      {
        $lookup: {
          from: "profile_calculators", // Replace with the actual collection name
          localField: "non_insulated_aluminium_profile.code_pl_id",
          foreignField: "_id",
          as: "non_insulated_aluminium_profile.code_pl_info",
        },
      },
      {
        $unwind: {
          path: "$non_insulated_aluminium_profile.code_info",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$non_insulated_aluminium_profile.code_pl_info",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          non_insulated_aluminium_profile: {
            code: "$non_insulated_aluminium_profile.code_info.code",
            unit_cost:
              "$non_insulated_aluminium_profile.code_pl_info.final_selling_price",
            total_cost: {
              $multiply: [
                "$non_insulated_aluminium_profile.code_pl_info.final_selling_price",
                "$non_insulated_aluminium_profile.quantity",
              ],
            },
            origin_cost:
              "$non_insulated_aluminium_profile.code_pl_info.origin_cost",
            landing_cost:
              "$non_insulated_aluminium_profile.code_pl_info.origin_cost",
            selling_price:
              "$non_insulated_aluminium_profile.code_pl_info.final_selling_price",
          },
        },
      },
      {
        $group: {
          _id: "$_id",
          non_insulated_aluminium_profile: {
            $push: "$non_insulated_aluminium_profile",
          },
          root: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              "$root",
              {
                non_insulated_aluminium_profile:
                  "$non_insulated_aluminium_profile",
              },
            ],
          },
        },
      },

      { $unwind: "$insulated_aluminium_profile" },
      {
        $lookup: {
          from: "profile_insulated_inputs", // Replace with the actual collection name
          localField: "insulated_aluminium_profile.code_id",
          foreignField: "_id",
          as: "insulated_aluminium_profile.code_info",
        },
      },
      {
        $lookup: {
          from: "profile_insulated_calculators", // Replace with the actual collection name
          localField: "insulated_aluminium_profile.code_pl_id",
          foreignField: "_id",
          as: "insulated_aluminium_profile.code_pl_info",
        },
      },
      {
        $unwind: {
          path: "$insulated_aluminium_profile.code_info",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$insulated_aluminium_profile.code_pl_info",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          insulated_aluminium_profile: {
            code: "$insulated_aluminium_profile.code_info.code",
            unit_cost: "$insulated_aluminium_profile.code_pl_info.total_cost",
            total_cost: {
              $multiply: [
                "$insulated_aluminium_profile.code_pl_info.total_cost",
                "$insulated_aluminium_profile.quantity",
              ],
            },
            origin_cost:
              "$insulated_aluminium_profile.code_pl_info.origin_cost",
            landing_cost:
              "$insulated_aluminium_profile.code_pl_info.landing_cost",
            selling_price:
              "$insulated_aluminium_profile.code_pl_info.selling_price",
          },
        },
      },
      {
        $group: {
          _id: "$_id",
          insulated_aluminium_profile: {
            $push: "$insulated_aluminium_profile",
          },
          root: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              "$root",
              { insulated_aluminium_profile: "$insulated_aluminium_profile" },
            ],
          },
        },
      },

      { $unwind: "$operation" },
      {
        $lookup: {
          from: "operations_models", // Replace with the actual collection name
          localField: "operation.code_id",
          foreignField: "_id",
          as: "operation.code_info",
        },
      },
      {
        $lookup: {
          from: "accessories_supplier_models", // Replace with the actual collection name
          localField: "operation.code_info.supplier_id",
          foreignField: "_id",
          as: "operation.supplier_info",
        },
      },
      {
        $unwind: {
          path: "$operation.code_info",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $addFields: {
          operation: {
            code: {
              $concat: [
                "$operation.code_info.name",
                " ",
                {
                  $ifNull: [
                    { $arrayElemAt: ["$operation.supplier_info.name", 0] },
                    "",
                  ],
                },
              ],
            },
            unit_cost: "$operation.code_info.cost_to_aed",
            total_cost: {
              $multiply: [
                "$operation.code_info.cost_to_aed",
                "$operation.quantity",
              ],
            },
            origin_cost: 0,
            landing_cost: 0,
            selling_price: 0,
          },
        },
      },

      {
        $group: {
          _id: "$_id",
          operation: {
            $push: "$operation",
          },
          root: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$root", { operation: "$operation" }],
          },
        },
      },

      { $unwind: "$kit" },
      {
        $lookup: {
          from: "kit_inputs", // Replace with the actual collection name
          localField: "kit.code_id",
          foreignField: "_id",
          as: "kit.code_info",
        },
      },
      {
        $lookup: {
          from: "kit_calculators", // Replace with the actual collection name
          localField: "kit.code_pl_id",
          foreignField: "_id",
          as: "kit.code_pl_info",
        },
      },
      {
        $unwind: {
          path: "$kit.code_info",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$kit.code_pl_info",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          kit: {
            code: "$kit.code_info.code",
            unit_cost: "$kit.code_pl_info.total_cost",
            total_cost: {
              $multiply: ["$kit.code_pl_info.total_cost", "$kit.quantity"],
            },
            origin_cost: "$kit.code_pl_info.origin_cost",
            landing_cost: "$kit.code_pl_info.landing_cost",
            selling_price: "$kit.code_pl_info.selling_price",
          },
        },
      },
      {
        $group: {
          _id: "$_id",
          kit: {
            $push: "$kit",
          },
          root: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$root", { kit: "$kit" }],
          },
        },
      },
      {
        $addFields: {
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
        $project: {
          system_id: 1,
          subsystem_id: 1,
          system: {
            $arrayElemAt: ["$lookup_system.system_detail.name", 0],
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
          supplier: { $arrayElemAt: ["$lookup_supplier.name", 0] },
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
          supplier: {
            // <- This one right here
            $addToSet: {
              id: "$supplier_id",
              name: "$supplier",
            },
          },
        },
      },
      {
        $project: {
          _id: 0, // Exclude the `_id` field from the output
          systems: 1,
          groups: 1,
          subgroups: 1,
          supplier: 1,
        },
      },
    ]);

    return res.json({
      system: filters[0].systems,
      group: filters[0].groups,
      subgroup: filters[0].subgroups,
      supplier: filters[0].supplier,
    });
  } catch (error) {
    return res.status(500).json({ msg: error.message });
  }
};
const kit_assigned_to = async (req, res) => {
  try {
    const { id } = req.params;
    const input = await Kit_Input.findById(id);
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
        $project: {
          name: "$project_name",
        },
      },
    ]);
    const kit = await Kit_Input.aggregate([
      {
        $unwind: {
          path: "$kit",
        },
      },
      {
        $match: {
          "kit.code_id": input._id,
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
      kit,
      stock,
      loose_stock,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: error?.message || 'Internal server error' })
  }
};
module.exports = {
  add_kit,
  get_all_kit,
  get_single_kit,
  search_system,
  search_subsystems,
  search_subgroup,
  search_group,
  update_kit,
  delete_kit,
  kit_price_list,
  refresh_pl,
  create_duplicate_kit,
  //package
  add_kit_package,
  get_kit_packages,
  get_single_kit_package,
  update_kit_package,
  get_kit_avlb_for_package,
  generate_kit_package_pl,
  refresh_kit_package_price_list,
  get_kit_package_pl,

  generate_kit_pl,
  search_kit,
  get_kit_system,
  kit_assigned_to,
};
