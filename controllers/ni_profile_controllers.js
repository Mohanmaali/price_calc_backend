const Profile_System_Model = require("../models/profile_system_model");
const Profile_Input_Model = require("../models/profile_input_model");
const Profile_Calculator = require("../models/profile_non_insulated_calc_model");
const {
  Profile_Insulated_Input,
} = require("../models/profile_insulated_input");
const Accessories_Input_Model = require("../models/accessories_input_model");
const Operations_Model = require("../models/extrusion_model");
const {
  price_calc_step2_Helper,
  acc_package_pl_helper,
} = require("./accessories_controllers");
const xlsx = require("xlsx");
const fs = require("fs");
const Raw_Material_Model = require("../models/raw_material_model");
const Stock_model = require("../models/stock_model");
const Profile_Insulated_Calculator = require("../models/profile_insulated_calc_model");
const Kit_Input = require("../models/kit_model");
const Packaging_Material = require("../models/packaging_material_model");
const Accessories_Supplier_Model = require("../models/accessories_supplier_model");
const Loose_Stock_model = require("../models/loose_stock_model");
const Project_Model = require("../models/project_model");
const Action_model = require("../models/actions_model");
const Group_Subgroup = require("../models/group_subgroup");
const Units = require("../models/units");
const { default: mongoose } = require("mongoose");
const AccessoriesCalculator = require("../models/accessories_calculator_model");
const { Purchase_Model } = require("../models/purchase_order_model");
const Log_Model = require("../models/log");
const Finish = require("../models/finish");

const non_ins_subsystems = async (req, res) => {
  try {
    const subsystem = await Profile_Input_Model.aggregate([
      { $group: { _id: null, subsystem: { $addToSet: "$subsystem" } } },
    ]);
    return res.json({ subsystem });
  } catch (error) {
    return res
      .status(500)
      .json({ mssg: error?.message || "Internal server error" });
  }
};

//Price Input Controllers
const add_input = async (req, res) => {
  try {
    const {
      code,
      description,
      unit,
      unit_system,
      unit_description,
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

      material,
      material_id,

      alloy,
      alloy_id,

      temper,
      temper_id,

      grade,
      grade_id,

      finish,
      finish_id,

      color,
      color_id,

      systemTags,
    } = JSON.parse(req.body.price_input_form);
    const files = JSON.parse(req.body.files);
    const unit_weight = parseFloat(req.body.unit_weight);
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
      !supplier_code ||
      !supplier_item_code ||
      !supplier_id ||
      isNaN(parseFloat(rd)) ||
      !material_id ||
      !alloy_id ||
      !temper_id ||
      !grade_id ||
      !finish_id ||
      !color_id ||
      !unit ||
      !unit_system ||
      !unit_description ||
      !weight_unit ||
      unit_weight === null ||
      isNaN(unit_weight) ||
      isNaN(additional_profit) ||
      !lead_time
      // ||
      // !selected_subSystem
    ) {
      return res.status(400).json({ mssg: "All Entries Are Required" });
    }
    const if_input = await Profile_Input_Model.find({
      $and: [
        { code },
        { supplier_id },
        { supplier_item_code: supplier_item_code },
        { material_id },
        { alloy_id },
        { temper_id },
        { grade_id },
        { finish_id },
        { color_id },
      ],
    });
    if (if_input.length > 0) {
      return res.status(400).json({
        mssg: "Entry Already Exists With This Code, Supplier, Supplier Item Code, Raw Material, Alloy, Temper, Grade, Finish and Color",
      });
    }
    const new_entry = await Profile_Input_Model.create({
      code,
      image: filename,
      description,
      group_id,
      subgroup_id,
      supersystem_id,
      system_id,
      subsystem_id,
      supplier_id,
      supplier_item_code,
      rd,
      material_id,
      alloy_id,
      temper_id,
      grade_id,
      finish_id,
      color_id,
      unit_weight,
      unit_system,
      unit_description,
      unit,
      weight_unit,
      additional_profit,
      lead_time,
      files: files,

      systemTags,
    });
    return res.status(200).json({ mssg: "New Entry Added" });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ mssg: error?.message || "Internal server error" });
  }
};
const get_all_entry = async (req, res) => {
  try {
    let { page, filter, getAll } = req.query;
    if (getAll) {
      const result = await Profile_Input_Model.aggregate([
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
                          cond: { $eq: ["$$alloy._id", "$alloy_id"] },
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
                          cond: { $eq: ["$$temper._id", "$temper_id"] },
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
            material_id: 1,
            material: { $arrayElemAt: ["$lookup_raw_material.name", 0] },
            alloy_id: 1,
            alloy: { $arrayElemAt: ["$lookup_raw_material.alloy.name", 0] },
            temper_id: 1,
            temper: { $arrayElemAt: ["$lookup_raw_material.temper.name", 0] },
            grade_id: 1,
            grade: { $arrayElemAt: ["$lookup_raw_material.grade.name", 0] },
            finish_id: 1,
            finish: { $arrayElemAt: ["$lookup_finish.name", 0] },
            color_id: 1,
            color: { $arrayElemAt: ["$lookup_finish.color.name", 0] },
            unit_weight: 1,
            weight_unit: 1,
            unit_system: 1,
            unit_description: 1,
            unit: 1,
            rd: 1,
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
      const limit = 6;
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
      if (filter?.alloy) {
        and.push({ alloy_id: new mongoose.Types.ObjectId(filter.alloy) });
      }
      if (filter?.finish) {
        and.push({ finish_id: new mongoose.Types.ObjectId(filter.finish) });
      }
      if (filter?.color) {
        and.push({ color_id: new mongoose.Types.ObjectId(filter.color) });
      }
      if (filter?.unit) {
        and.push({ unit: filter.unit });
      }
      let where = {
        $or: [{ code: searchRegex }, { description: searchRegex }],
        $and: and,
      };
      const result = await Profile_Input_Model.aggregate([
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
                          cond: { $eq: ["$$alloy._id", "$alloy_id"] },
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
                          cond: { $eq: ["$$temper._id", "$temper_id"] },
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
            material_id: 1,
            material: { $arrayElemAt: ["$lookup_raw_material.name", 0] },
            alloy_id: 1,
            alloy: { $arrayElemAt: ["$lookup_raw_material.alloy.name", 0] },
            temper_id: 1,
            temper: { $arrayElemAt: ["$lookup_raw_material.temper.name", 0] },
            grade_id: 1,
            grade: { $arrayElemAt: ["$lookup_raw_material.grade.name", 0] },
            finish_id: 1,
            finish: { $arrayElemAt: ["$lookup_finish.name", 0] },
            color_id: 1,
            color: { $arrayElemAt: ["$lookup_finish.color.name", 0] },
            unit_weight: 1,
            weight_unit: 1,
            unit_system: 1,
            unit_description: 1,
            unit: 1,
            rd: 1,
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

      const totalCount = await Profile_Input_Model.countDocuments(where);
      const currentPage = pageNumber;
      const total_page = Math.ceil(totalCount / limit);
      return res
        .status(200)
        .json({ result, currentPage, total_page, totalCount, limit });
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ mssg: error?.message || "Internal server error" });
  }
};
const get_single_entry = async (req, res) => {
  try {
    const id = req.params.id;
    const entry = await Profile_Input_Model.aggregate([
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
                        cond: { $eq: ["$$alloy._id", "$alloy_id"] },
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
                        cond: { $eq: ["$$temper._id", "$temper_id"] },
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
          supersystem: {
            $arrayElemAt: ["$lookup_system.name", 0],
          },
          supersystem_id: 1,
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
          material_id: 1,
          material: { $arrayElemAt: ["$lookup_raw_material.name", 0] },
          alloy_id: 1,
          alloy: { $arrayElemAt: ["$lookup_raw_material.alloy.name", 0] },
          temper_id: 1,
          temper: { $arrayElemAt: ["$lookup_raw_material.temper.name", 0] },
          grade_id: 1,
          grade: { $arrayElemAt: ["$lookup_raw_material.grade.name", 0] },
          finish_id: 1,
          finish: { $arrayElemAt: ["$lookup_finish.name", 0] },
          color_id: 1,
          color: { $arrayElemAt: ["$lookup_finish.color.name", 0] },
          unit_weight: 1,
          weight_unit: 1,
          unit_system: 1,
          unit_description: 1,
          unit: 1,
          rd: 1,
          additional_profit: 1,
          lead_time: 1,
          systemTags: 1,
        },
      },
    ]);
    const loose_stock = await Loose_Stock_model.findOne({
      code: entry.code,
    });
    return res.status(200).json({ entry: entry[0], loose_stock });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ mssg: error?.message || "Internal server error" });
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
      unit,
      unit_system,
      unit_description,
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

      material,
      material_id,

      alloy,
      alloy_id,

      temper,
      temper_id,

      grade,
      grade_id,

      finish,
      finish_id,

      color,
      color_id,

      systemTags,
    } = JSON.parse(req.body.price_input_form);
    const files = JSON.parse(req.body.files);
    const unit_weight = parseFloat(req.body.unit_weight);
    const filename = req.file
      ? `${process.env.BACKENDURL}/uploads/${req.file.filename}`
      : req.body.photo;
    if (
      !code ||
      !filename ||
      !description ||
      !group_id ||
      !subgroup_id ||
      !supersystem_id ||
      !system_id ||
      !subsystem_id ||
      !supplier_code ||
      !supplier_item_code ||
      !supplier_id ||
      isNaN(parseFloat(rd)) ||
      !material_id ||
      !alloy_id ||
      !temper_id ||
      !grade_id ||
      !finish_id ||
      !color_id ||
      !unit ||
      !unit_system ||
      !unit_description ||
      !weight_unit ||
      unit_weight === null ||
      isNaN(unit_weight) ||
      isNaN(additional_profit) ||
      !lead_time
      // ||
      // !selected_subSystem
    ) {
      return res.status(400).json({ mssg: "All Entries Are Required" });
    }
    const update_entry = await Profile_Input_Model.findByIdAndUpdate(id, {
      code,
      image: filename,
      description,
      group_id,
      subgroup_id,
      supersystem_id,
      system_id,
      subsystem_id,
      supplier_id,
      supplier_item_code,
      rd,
      material_id,
      alloy_id,
      temper_id,
      grade_id,
      finish_id,
      color_id,
      unit_weight,
      unit_system,
      unit_description,
      unit,
      weight_unit,
      additional_profit,
      lead_time,
      files: files,

      systemTags,
    });
    return res.status(200).json({ mssg: "Input Updated" });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ mssg: error?.message || "Internal server error" });
  }
};
const delete_input = async (req, res) => {
  try {
    const id = req.params.id;
    const deleted_entry = await Profile_Input_Model.findByIdAndDelete(id);
    const deleted_pl = await Profile_Calculator.findOneAndDelete({
      input_model_id: id,
    });
    const deletedStock = await Stock_model.deleteMany({
      reference_code_id: id,
    });
    const deletedActions = await Action_model.deleteMany({ ref_code_id: id });
    return res.status(200).json({ mssg: "Entry Deleted" });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ mssg: error?.message || "Internal server error" });
  }
};
const create_duplicate_ni = async (req, res) => {
  try {
    const {
      code,
      description,
      unit,
      unit_system,
      unit_description,
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

      material,
      material_id,

      alloy,
      alloy_id,

      temper,
      temper_id,

      grade,
      grade_id,

      finish,
      finish_id,

      color,
      color_id,

      systemTags,
    } = JSON.parse(req.body.price_input_form);
    const files = JSON.parse(req.body.files);
    const unit_weight = parseFloat(req.body.unit_weight);
    const filename = req.file
      ? `${process.env.BACKENDURL}/uploads/${req.file.filename}`
      : req.body.photo;
    if (
      !code ||
      !filename ||
      !description ||
      !group_id ||
      !subgroup_id ||
      !supersystem_id ||
      !system_id ||
      !subsystem_id ||
      !supplier_code ||
      !supplier_item_code ||
      !supplier_id ||
      isNaN(parseFloat(rd)) ||
      !material_id ||
      !alloy_id ||
      !temper_id ||
      !grade_id ||
      !finish_id ||
      !color_id ||
      !unit ||
      !unit_system ||
      !unit_description ||
      !weight_unit ||
      unit_weight === null ||
      isNaN(unit_weight) ||
      isNaN(additional_profit) ||
      !lead_time
      // ||
      // !selected_subSystem
    ) {
      return res.status(400).json({ mssg: "All Entries Are Required" });
    }
    const if_input = await Profile_Input_Model.find({
      $and: [
        { code },
        { supplier_id },
        { supplier_item_code: supplier_item_code },
        { material_id },
        { alloy_id },
        { temper_id },
        { grade_id },
        { finish_id },
        { color_id },
      ],
    });
    if (if_input.length > 0) {
      return res.status(400).json({
        mssg: "Entry Already Exists With This Code, Supplier, Supplier Item Code, Raw Material, Alloy, Temper, Grade, Finish and Color",
      });
    }
    const new_entry = await Profile_Input_Model.create({
      code,
      image: filename,
      description,
      group_id,
      subgroup_id,
      supersystem_id,
      system_id,
      subsystem_id,
      supplier_id,
      supplier_item_code,
      rd,
      material_id,
      alloy_id,
      temper_id,
      grade_id,
      finish_id,
      color_id,
      unit_weight,
      unit_system,
      unit_description,
      unit,
      weight_unit,
      additional_profit,
      lead_time,
      files: files,

      systemTags,
    });
    return res.status(200).json({
      mssg: `New Entry Created`,
      code: new_entry.code,
      id: new_entry._id,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ mssg: error?.message || "Internal server error" });
  }
};

const get_Non_Insulated_Groups = async (req, res) => {
  try {
    const filters = await Profile_Input_Model.aggregate([
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
          unit: 1,
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
          materials: {
            $addToSet: {
              id: "$material_id",
              name: "$material",
            },
          },
          alloys: {
            $addToSet: {
              id: "$alloy_id",
              name: "$alloy",
            },
          },
          tempers: {
            $addToSet: {
              id: "$temper_id",
              name: "$temper",
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
          units: {
            $addToSet: {
              id: "$unit",
              name: "$unit",
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
          alloys: 1,
          tempers: 1,
          grades: 1,
          finishes: 1,
          colors: 1,
          units: 1,
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
      alloy: filters[0].alloys,
      temper: filters[0].tempers,
      grade: filters[0].grades,
      finish: filters[0].finishes,
      color: filters[0].colors,
      unit: filters[0].units,
    });
  } catch (error) {
    return res.status(500).json({ msg: error.message });
  }
};
const ni_profile_assigned_to = async (req, res) => {
  try {
    const { id } = req.params;
    const input = await Profile_Input_Model.findById(id);
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
          path: "$non_insulated_aluminium_profile",
        },
      },
      {
        $match: {
          "non_insulated_aluminium_profile.code_id": input._id,
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
      insulated,
      kit,
      stock,
      loose_stock,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ mssg: error?.message || "Internal server error" });
  }
};
//non-insulated price list
const generate_PriceList_Helper = async () => {
  try {
    let skip = 0;
    let limit = 75;
    let hasMore = true;
    while (hasMore) {
      const input = await Profile_Input_Model.aggregate([
        {
          $skip: skip,
        },
        {
          $limit: limit,
        },
        // { $match: {   } },
        {
          $lookup: {
            from: "profile_system_models",
            localField: "system_id",
            foreignField: "system_detail._id",
            as: "profile_system",
            // pipeline: [{ $match: {   } }],
          },
        },
        {
          $lookup: {
            from: "raw_material_models",
            localField: "material_id",
            foreignField: "_id",
            as: "raw_material",
            //pipeline: [{ $match: {   } }],
          },
        },
        {
          $unwind: {
            path: "$raw_material",
          },
        },
        {
          $addFields: {
            alloy: {
              $arrayElemAt: [
                {
                  $filter: {
                    input: {
                      $ifNull: ["$raw_material.alloy", []],
                    },
                    as: "alloy",
                    cond: {
                      $eq: ["$$alloy._id", "$alloy_id"],
                    },
                  },
                },
                0,
              ],
            },
          },
        },
        {
          $lookup: {
            from: "operations_models",
            let: {
              alloy: "$alloy.name",
              supplier: "$supplier_id",
            }, // Pass the supplier field
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $eq: ["$supplier_id", "$$supplier"],
                      }, // Check if suppliers match
                      { $eq: ["$name", "$$alloy"] }, // Check if suppliers match
                      // { $gte: [{ $indexOfBytes: ["$operation", "$$alloy"] }, 0] },
                    ],
                  },
                },
              },
            ],
            as: "operation",
          },
        },
        {
          $lookup: {
            from: "currency_models",
            localField: "raw_material.currency_id",
            foreignField: "_id",
            as: "lookup_currency",
          },
        },
        {
          $lookup: {
            from: "currency_models",
            localField: "operation.currency_id",
            foreignField: "_id",
            as: "operation_currency",
          },
        },
      ]);
      if (input.length === 0) {
        hasMore = false;
      } else {
        await Promise.all(
          input.map(async (itm) => {
            try {
              let new_op_cost =
                itm.operation_currency[0].cost_usd_per_kg_plus_fluctuation *
                itm.operation[0].cost;
              let op_cost = itm.operation.length === 0 ? 0 : new_op_cost;
              // let product_cost = itm.raw_material[0]?.cost_aed_per_kg + op_cost;
              let new_raw_material_cost =
                ((itm.raw_material.fluctuation / 100) * itm.raw_material.cost + itm.raw_material.cost) * itm.lookup_currency[0].cost_usd_per_kg_plus_fluctuation
              let product_cost = new_raw_material_cost + op_cost;
              let origin_cost = itm?.unit_weight * product_cost;
              let final_cost = (origin_cost * itm.rd) / 100 + origin_cost;
              let final_selling =
                // 0.03 +
                final_cost +
                (itm.additional_profit / 100) * final_cost +
                (itm.profile_system[0]?.profit / 100) * final_cost +
                (itm.profile_system[0]?.royality / 100) * final_cost +
                (itm.profile_system[0]?.overhead / 100) * final_cost;
              let final_selling_lm = (final_selling * itm?.unit_weight).toFixed(
                2
              );
              let pl1 =
                final_selling /
                (1 - itm?.profile_system[0]?.price_list_1 / 100);
              let pl2 =
                final_selling /
                (1 - itm?.profile_system[0]?.price_list_2 / 100);
              let pl3 =
                final_selling /
                (1 - itm?.profile_system[0]?.price_list_3 / 100);
              let pl4 =
                final_selling /
                (1 - itm?.profile_system[0]?.price_list_4 / 100);
              let Profile_Calculator_Exist = await Profile_Calculator.findOne({
                input_model_id: itm._id,
              });
              const stockWithNoAvgCost = await Stock_model.find({
                reference_code_id: itm._id,
                avg_price: 0,
              });
              if (
                itm.raw_material.cost_aed_per_kg !=
                new_raw_material_cost
              ) {
                const update_raw_material =
                  await Raw_Material_Model.findByIdAndUpdate(
                    itm.raw_material._id,
                    {
                      $set: {
                        cost_aed_per_kg: new_raw_material_cost,
                      },
                    }
                  );
              }
              if (itm.operation[0].cost != new_op_cost) {
                const update_operation =
                  await Operations_Model.findByIdAndUpdate(
                    itm.operation[0]._id,
                    {
                      $set: {
                        currency: itm.operation_currency[0].code,
                        conversion_to_aed: new_op_cost / itm.operation[0].cost,
                        cost_to_aed: new_op_cost,
                      },
                    }
                  );
              }
              if (stockWithNoAvgCost.length > 0) {
                await Stock_model.updateMany(
                  {
                    reference_code_id: itm._id,
                    avg_price: 0,
                  },
                  { $set: { avg_price: product_cost * itm.unit_weight } }
                );
              }

              if (Profile_Calculator_Exist) {
                await Profile_Calculator.findOneAndUpdate(
                  { input_model_id: itm._id },
                  {
                    // code: itm.code,
                    // image: itm.image,
                    // weight: itm.unit_weight,
                    // system: itm.system,
                    // material: itm.material,
                    // alloy: itm.alloy,
                    final_selling_price: final_selling,
                    final_selling_price_lm: final_selling_lm,
                    final_cost,
                    // $set: { input_model_id: itm._id },
                    product_cost: product_cost,
                    origin_cost: origin_cost,
                    // description: itm.description,
                    // files: itm.files,
                    price_list_1: pl1,
                    price_list_2: pl2,
                    price_list_3: pl3,
                    price_list_4: pl4,
                  }
                );
              } else {
                await Profile_Calculator.create({
                  // code: itm.code,
                  // image: itm.image,
                  // weight: itm.unit_weight,
                  // system: itm.system,
                  // material: itm.material,
                  // alloy: itm.alloy,
                  // description: itm.description,
                  product_cost: product_cost,
                  input_model_id: itm._id,
                  origin_cost: origin_cost,
                  final_selling_price: final_selling,
                  final_selling_price_lm: final_selling_lm,
                  final_cost,
                  price_list_1: pl1,
                  price_list_2: pl2,
                  price_list_3: pl3,
                  price_list_4: pl4,
                  files: itm.files,
                });
              }
            } catch (error) {
              console.error(
                "Non Insulated Profile, Error processing item:",
                itm._id,
                error.message
              );
              // console.error("Error details:", error);
            }
          })
        );
        skip += limit;
      }
    }
    return true;
  } catch (error) {
    console.log(error);
    // return res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};
const genratePriceList = async (req, res) => {
  try {
    const input = await generate_PriceList_Helper();
    return res.status(200).json({ mssg: "Price List Generated", input });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ mssg: error?.message || "Internal server error" });
  }
};
const get_price_list = async (req, res) => {
  try {
    let { filter, page, getAll } = req.query;
    if (getAll) {
      const result = await Profile_Calculator.aggregate([
        {
          $lookup: {
            from: "profile_input_models",
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
          $lookup: {
            from: "raw_material_models",
            localField: "input_detail.material_id",
            foreignField: "_id",
            as: "raw_material",
            //pipeline: [{ $match: {   } }],
          },
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
      if (filter?.supplier) {
        and.push({
          "input_detail.supplier_id": new mongoose.Types.ObjectId(
            filter.supplier
          ),
        });
      }
      let where = and.length > 0 ? { $and: and } : {};

      const result = await Profile_Calculator.aggregate([
        {
          $lookup: {
            from: "profile_input_models",
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
          $lookup: {
            from: "raw_material_models",
            localField: "input_detail.material_id",
            foreignField: "_id",
            as: "raw_material",
            pipeline: [{ $project: { cost_aed_per_kg: 1 } }],
          },
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
      const totalCount = await Profile_Calculator.aggregate([
        {
          $match: {},
        },
        {
          $lookup: {
            from: "profile_input_models",
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
      const total_page = Math.ceil((totalCount[0]?.totalCount || 0) / limit);
      return res.json({
        result,
        currentPage,
        total_page,
        totalCount: totalCount[0]?.totalCount || 0,
        limit,
      });
    }
  } catch (error) {
    return res.status(500).json({ msg: error.message });
  }
};

//import
const import_profile_excel_file = async (req, res) => {
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
      System_Absent_In_DB: "FF00B050", // Green
      Unit_Mismatch: "FF7030A0", // Purple
      Mismatch_File_Data: "0000FF", //Blue
      Group_Subgroup_Mismatch: "C19A6B", //Brown
      Material_Finish_Color_Mismatch: "FFA600", //Orange
    };
    let rejectionReason = null;
    await Promise.all(
      jsonData.map(async (itm, idx) => {
        let if_stock = await Stock_model.findOne({
          packing_code: itm?.Packing_Code,
          // reference_code: itm.code,
        });
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
        // let if_material = await Raw_Material_Model.findOne({
        //   material: itm?.Material,
        // });
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
        const if_material_alloy_temper_grade = await Raw_Material_Model.findOne(
          {
            name: itm?.Material,
            "alloy.name": itm?.Alloy,
            "temper.name": itm?.Temper,
            "grade.name": itm?.Grade,
          }
        );
        const if_finish_color = await Finish.findOne({
          name: itm?.Finish,
          "color.name": itm?.Color,
        });
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
        let if_vmc = await Profile_Input_Model.find({
          $and: [
            { code: itm.Code },
            { supplier_id: if_supplier._id },
            { supplier_item_code: itm?.Supplier_Item_Code },
            { material_id: if_material_alloy_temper_grade._id },
            { alloy_id: if_material_alloy_temper_grade.alloy[0]._id },
            { temper_id: if_material_alloy_temper_grade.temper[0]._id },
            { grade_id: if_material_alloy_temper_grade.grade[0]._id },
            { finish_id: if_finish_color._id },
            { color_id: if_finish_color.color[0]._id },
          ],
        });
        if (
          !itm?.Code ||
          !itm?.Image ||
          !itm?.Link ||
          !itm?.Filename ||
          !itm?.Date ||
          itm?.Revision_No === undefined ||
          itm?.Revision_No === null ||
          typeof itm?.Revision_No !== "number" ||
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
          !itm?.Alloy ||
          !itm?.Finish ||
          !itm?.Color ||
          !itm.Unit ||
          !itm?.Unit_System ||
          !itm?.Unit_Description ||
          !itm?.Lead_Time ||
          itm?.Unit_Weight === undefined ||
          itm?.Unit_Weight === null ||
          typeof itm?.Unit_Weight !== "number" ||
          itm?.RD === undefined ||
          itm?.RD === null ||
          typeof itm?.RD !== "number" ||
          itm?.Additional_Profit === undefined ||
          itm?.Additional_Profit === null ||
          typeof itm?.Additional_Profit !== "number"
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
          } else if (!if_system || !if_supplier) {
            rejectionReason = "System_Absent_In_DB";
            rejected_entry.push({
              reason: "System_Absent_In_DB",
              data: itm,
              color: colorMap["System_Absent_In_DB"],
            });
          } else if (!if_unit) {
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
            itm.Filetype !== ".jpg" &&
            itm.Filetype !== ".JPG" &&
            itm.Filetype !== ".png" &&
            itm.Filetype !== ".PNG" &&
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
          } else if (!if_material_alloy_temper_grade || !if_finish_color) {
            rejectionReason = "Material_Finish_Color_Mismatch";
            rejected_entry.push({
              reason: "Material_Finish_Color_Mismatch",
              data: itm,
              color: colorMap["Material_Finish_Color_Mismatch"],
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
            const material_id = if_material_alloy_temper_grade._id;
            const alloy_id = if_material_alloy_temper_grade.alloy[0]._id;
            const temper_id = if_material_alloy_temper_grade.temper[0]._id;
            const grade_id = if_material_alloy_temper_grade.grade[0]._id;
            const finish_id = if_finish_color._id;
            const color_id = if_finish_color.color[0]._id;
            let new_entry = await Profile_Input_Model.create({
              code: itm.Code,
              image: itm.Image,
              description: itm.Description,
              supersystem_id,
              system_id,
              subsystem_id,
              group_id,
              subgroup_id,
              // supplier: itm.Supplier,
              // supplier_code: if_supplier.code,
              supplier_id: supplier_id,
              supplier_item_code: itm.Supplier_Item_Code,
              material_id,
              alloy_id,
              temper_id,
              grade_id,
              finish_id,
              color_id,
              unit: itm.Unit,
              unit_system: itm?.Unit_System,
              unit_description: itm?.Unit_Description,
              unit_weight: itm.Unit_Weight,
              weight_unit: itm.Weight_Unit,
              rd: itm.RD,
              additional_profit: itm.Additional_Profit,
              lead_time: itm?.Lead_Time,
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
    return res
      .status(500)
      .json({ mssg: error?.message || "Internal server error" });
  }
};

//non insulated packages
const add_non_insulated_package = async (req, res) => {
  try {
    const packages = req.body.packages;
    const loose = req.body.loose;
    const { add_new_package } = req.body;
    const { code, id } = req.body.selectedCode;
    if (!code || !id) {
      return res.status(400).json({ mssg: "Please Select a Code" });
    }
    const ref_code_detail = await Profile_Input_Model.findById(id);
    if (loose.msq != 0) {
      const ifLooseExist = await Loose_Stock_model.findOne({
        code_id: loose.code_id,
      });
      if (!ifLooseExist) {
        const loose_stock = await Loose_Stock_model.create({
          code_id: loose.code_id,
          category: "Non-Insulated Profile",
          msq: loose.msq,
        });
        const looseLog = await Log_Model.create({
          stock_id: loose_stock._id,
          ref_code_id: loose.code_id,
          category: "Non-Insulated Profile",
          stockType: "Loose",
          description: `Loose Stock created for code ${ref_code_detail.code}`,
          snapShot: loose_stock.toObject(),
        });
        if (loose_stock.free_inventory < loose.msq) {
          const new_notification = await Action_model.create({
            code_id: loose_stock._id,
            ref_code_id: loose.code_id,
            category: "Non-Insulated Profile",
            order_type: "Loose",
          });
        }
      } else {
        const loose_stock = await Loose_Stock_model.findOneAndUpdate(
          { code_id: loose.code_id },
          {
            category: "Non-Insulated Profile",
            msq: loose.msq,
          },
          {
            new: true,
          }
        );

        const looseLog = await Log_Model.create({
          stock_id: loose_stock._id,
          ref_code_id: loose.code_id,
          category: "Non-Insulated Profile",
          stockType: "Loose",
          description: `Loose Stock updated for code ${ref_code_detail.code} through package page`,
          snapShot: loose_stock.toObject(),
        });

        if (loose_stock.free_inventory < loose.msq) {
          const new_notification = await Action_model.create({
            code_id: loose_stock._id,
            ref_code_id: loose.code_id,
            category: "Non-Insulated Profile",
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
            category: "Non-Insulated Profile",
            msq: itm.msq,
          });
          const StockLog = await Log_Model.create({
            stock_id: new_package._id,
            ref_code_id: ref_code_detail._id,
            category: "Non-Insulated Profile",
            stockType: "Package",
            description: `Stock created for code ${itm.packing_code}`,
            snapShot: new_package.toObject(),
          });
          let stock_qty = new_package.free_inventory;
          if (stock_qty < itm.msq) {
            const if_action = await Action_model.findOne({
              code_id: new_package._id,
            });
            if (!if_action) {
              const new_notification = await Action_model.create({
                code_id: new_package._id,
                ref_code_id: ref_code_detail._id,
                category: "Non-Insulated Profile",
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
    return res
      .status(500)
      .json({ mssg: error?.message || "Internal server error" });
  }
};
const get_non_insulated_packages = async (req, res) => {
  try {
    let { search, page, filter, getAll } = req.query;
    if (getAll) {
      const entry = await Stock_model.aggregate([
        {
          $lookup: {
            from: "profile_input_models",
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
            $and: [{ category: "Non-Insulated Profile" }],
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
      let and = [{ category: "Non-Insulated Profile" }];
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
            from: "profile_input_models",
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
    return res
      .status(500)
      .json({ mssg: error?.message || "Internal server error" });
  }
};
const get_single_non_insulated_package = async (req, res) => {
  try {
    const id = req.params.id;
    const input = await Profile_Input_Model.findById(id);
    // const entry = await Profile_Input_Model.findById(id).populate({
    //   path: "stock_detail",
    //   model: "Stock_model",
    // });
    const entry = await Profile_Input_Model.aggregate([
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
    return res
      .status(500)
      .json({ mssg: error?.message || "Internal server error" });
  }
};
const update_non_insulated_package = async (req, res) => {
  try {
    const { packages, loose, new_packages } = req.body;
    const { code, id } = req.body.selectedCode;
    const ref_code_detail = await Profile_Input_Model.findById(id);
    if (loose.msq != 0) {
      let loose_stock = await Loose_Stock_model.findOne({
        code_id: ref_code_detail._id,
      });

      if (!loose_stock) {
        loose_stock = await Loose_Stock_model.create({
          code_id: loose.code_id,
          category: "Non-Insulated Profile",
          msq: loose.msq,
        });
        const looseLog = await Log_Model.create({
          stock_id: loose_stock._id,
          ref_code_id: loose.code_id,
          category: "Non-Insulated Profile",
          stockType: "Loose",
          description: `Loose Stock created for code ${ref_code_detail.code}`,
          snapShot: loose_stock.toObject(),
        });
      } else {
        loose_stock = await Loose_Stock_model.findOneAndUpdate(
          { code_id: ref_code_detail._id },
          {
            code_id: loose.code_id,
            category: "Non-Insulated Profile",
            msq: loose.msq,
          },
          { new: true }
        );
        const looseLog = await Log_Model.create({
          stock_id: loose_stock._id,
          ref_code_id: loose.code_id,
          category: "Non-Insulated Profile",
          stockType: "Loose",
          description: `Loose Stock's updated for code ${ref_code_detail.code} through package page`,
          snapShot: loose_stock.toObject(),
        });
      }
      let new_fetched_loose_stock = await Loose_Stock_model.findOne({
        code_id: ref_code_detail._id,
      });
      if (
        new_fetched_loose_stock.free_inventory < new_fetched_loose_stock.msq
      ) {
        const new_notification = await Action_model.findOneAndUpdate(
          { code_id: loose_stock._id },
          {
            code_id: loose_stock._id,
            ref_code_id: ref_code_detail._id,
            category: "Non-Insulated Profile",
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
            category: "Non-Insulated Profile",
            msq: itm.msq,
          });
          const StockLog = await Log_Model.create({
            stock_id: new_package._id,
            ref_code_id: ref_code_detail._id,
            category: "Non-Insulated Profile",
            stockType: "Package",
            description: `Stock created for code ${itm.packing_code}`,
            snapShot: new_package.toObject(),
          });
          let stock_qty = new_package.free_inventory;
          if (stock_qty < itm.msq) {
            const new_notification = await Action_model.create({
              code_id: new_package._id,
              ref_code_id: ref_code_detail._id,
              category: "Non-Insulated Profile",
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
            category: "Non-Insulated Profile",
            msq: itm.msq,
          },
          { new: true }
        );
        const StockLog = await Log_Model.create({
          stock_id: existing_package._id,
          ref_code_id: ref_code_detail._id,
          category: "Non-Insulated Profile",
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
              category: "Non-Insulated Profile",
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
    return res
      .status(500)
      .json({ mssg: error?.message || "Internal server error" });
  }
};
const get_ni_avlb_for_package = async (req, res) => {
  try {
    let { search } = req.query;
    let searchRegex = { $regex: new RegExp(".*" + search + ".*", "i") };
    const result = await Profile_Input_Model.aggregate([
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
                        cond: { $eq: ["$$alloy._id", "$alloy_id"] },
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
                        cond: { $eq: ["$$temper._id", "$temper_id"] },
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
          material: { $arrayElemAt: ["$lookup_raw_material.name", 0] },
          alloy_id: 1,
          alloy: { $arrayElemAt: ["$lookup_raw_material.alloy.name", 0] },
          temper_id: 1,
          temper: { $arrayElemAt: ["$lookup_raw_material.temper.name", 0] },
          grade_id: 1,
          grade: { $arrayElemAt: ["$lookup_raw_material.grade.name", 0] },
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
    return res
      .status(500)
      .json({ mssg: error?.message || "Internal server error" });
  }
};
//non insulated package pl
const generate_Package_PL_Helper = async () => {
  try {
    let skip = 0;
    let limit = 100;
    let hasMore = true;
    while (hasMore) {
      const input = await Stock_model.aggregate([
        { $skip: skip },
        { $limit: limit },
        { $match: { category: "Non-Insulated Profile" } },
        {
          $lookup: {
            from: "profile_calculators",
            localField: "reference_code_id",
            foreignField: "input_model_id",
            as: "lookup_profile_calc",
          },
        },
      ]);
      if (input.length == 0) {
        hasMore = false;
      } else {
        await Promise.all(
          input.map(async (itm) => {
            let package_origin_cost =
              itm.lookup_profile_calc[0]?.origin_cost * itm?.packing_quantity +
              itm?.packing_cost;
            let final_selling =
              itm.lookup_profile_calc[0]?.final_selling_price *
              itm?.packing_quantity +
              itm?.packing_cost;
            let pl1 =
              itm.lookup_profile_calc[0]?.price_list_1 * itm?.packing_quantity +
              itm?.packing_cost;
            let pl2 =
              itm.lookup_profile_calc[0]?.price_list_2 * itm?.packing_quantity +
              itm?.packing_cost;
            let pl3 =
              itm.lookup_profile_calc[0]?.price_list_3 * itm?.packing_quantity +
              itm?.packing_cost;
            let pl4 =
              itm.lookup_profile_calc[0]?.price_list_4 * itm?.packing_quantity +
              itm?.packing_cost;
            let updateFields = {
              origin_cost: package_origin_cost,
              landing_cost: package_origin_cost,
              selling_price: final_selling,
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
    return true;
  } catch (error) {
    console.log(error);
  }
};
const generate_Package_PL = async (req, res) => {
  try {
    const input = await generate_Package_PL_Helper();
    return res.status(200).json({ mssg: "Price List Generated" });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ mssg: error?.message || "Internal server error" });
  }
};
const get_ni_package_pl = async (req, res) => {
  try {
    let { search, page, getAll } = req.query;
    if (getAll) {
      let result = await Stock_model.find({
        $and: [{ category: "Non-Insulated Profile" }],
      })
        .populate({
          path: "reference_code_id",
          model: "Profile_Input_Model",
        })
        .sort({ packing_code: 1 });

      return res.json({ result });
    } else {
      let searchRegex = { $regex: new RegExp(".*" + search + ".*", "i") };

      const limit = 10;
      const pageNumber = parseInt(page) || 1;
      const skip = (pageNumber - 1) * limit;
      let and = [{ category: "Non-Insulated Profile" }];
      let where = {
        $or: [{ packing_code: searchRegex }],
        $and: and,
      };

      let result = await Stock_model.find(where)
        .populate({
          path: "reference_code_id",
          model: "Profile_Input_Model",
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

module.exports = {
  add_input,
  get_all_entry,
  get_single_entry,
  update_input,
  delete_input,
  create_duplicate_ni,
  genratePriceList,
  get_price_list,
  ni_profile_assigned_to,
  import_profile_excel_file,
  get_Non_Insulated_Groups,
  generate_PriceList_Helper,

  //non-insulated packages
  add_non_insulated_package,
  get_non_insulated_packages,
  get_single_non_insulated_package,
  update_non_insulated_package,
  get_ni_avlb_for_package,
  generate_Package_PL_Helper,
  generate_Package_PL,
  get_ni_package_pl,
  non_ins_subsystems,
};
