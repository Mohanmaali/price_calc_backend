const Accessories_Input_Model = require("../models/accessories_input_model");
const Profile_Input_Model = require("../models/profile_input_model");
const {
    Profile_Insulated_Input,
} = require("../models/profile_insulated_input");
const Kit_Input = require("../models/kit_model");
const Stock_model = require("../models/stock_model");
const Task_Model = require('../models/task_model');
const { default: mongoose } = require("mongoose");
const get_acc_filter = async (req, res) => {
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
        if (req.query.for == "price-list") {
            return res.json({
                system: filters[0].systems,
                supplier: filters[0].suppliers,
            });
        } else {
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
        }
    } catch (error) {
        return res.status(500).json({ msg: error.message });
    }
};

const get_ni_filter = async (req, res) => {
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

        if (req.query.for == "price-list") {
            return res.json({
                system: filters[0].systems,
                subsystem: filters[0].subsystems,
            });
        } else {
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
        }
    } catch (error) {
        return res.status(500).json({ msg: error.message });
    }
};

const get_insulated_filter = async (req, res) => {
    try {
        const filters = await Profile_Insulated_Input.aggregate([
            {
                $lookup: {
                    from: "profile_system_models",
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
                $addFields: {
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
            { $unwind: "$aluminium" },
            {
                $lookup: {
                    from: "profile_input_models",
                    localField: "aluminium.code_id",
                    foreignField: "_id",
                    as: "aluminium.code_info",
                },
            },
            {
                $lookup: {
                    from: "profile_calculators",
                    localField: "aluminium.code_pl_id",
                    foreignField: "_id",
                    as: "aluminium.code_pl_info",
                },
            },
            {
                $unwind: {
                    path: "$aluminium.code_info",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $unwind: {
                    path: "$aluminium.code_pl_info",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $group: {
                    _id: "$_id",
                    aluminium: { $push: "$aluminium" },
                    root: { $first: "$$ROOT" },
                },
            },
            {
                $replaceRoot: {
                    newRoot: {
                        $mergeObjects: ["$root", { aluminium: "$aluminium" }],
                    },
                },
            },
            { $unwind: "$polyamide" },
            {
                $lookup: {
                    from: "accessories_input_models",
                    localField: "polyamide.code_id",
                    foreignField: "_id",
                    as: "polyamide.code_info",
                },
            },
            {
                $lookup: {
                    from: "accessories_calculators",
                    localField: "polyamide.code_pl_id",
                    foreignField: "_id",
                    as: "polyamide.code_pl_info",
                },
            },
            {
                $unwind: {
                    path: "$polyamide.code_info",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $unwind: {
                    path: "$polyamide.code_pl_info",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $group: {
                    _id: "$_id",
                    polyamide: { $push: "$polyamide" },
                    root: { $first: "$$ROOT" },
                },
            },
            {
                $replaceRoot: {
                    newRoot: {
                        $mergeObjects: ["$root", { polyamide: "$polyamide" }],
                    },
                },
            },
            // Lookup for supplier information
            {
                $lookup: {
                    from: "accessories_supplier_models",
                    localField: "supplier_id",
                    foreignField: "_id",
                    as: "lookup_supplier",
                },
            },
            {
                $unwind: {
                    path: "$lookup_supplier",
                    preserveNullAndEmptyArrays: true,
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
                    supplier: {
                        id: "$lookup_supplier._id",
                        name: "$lookup_supplier.name",
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
                    suppliers: {
                        $addToSet: {
                            id: "$supplier.id",
                            name: "$supplier.name",
                        },
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    systems: 1,
                    subsystems: 1,
                    suppliers: 1,
                },
            },
        ]);

        if (req.query.for == "price-list") {
            return res.json({
                system: filters[0]?.systems,
                subsystem: filters[0]?.subsystems,
            });
        } else {
            return res.json({
                system: filters[0]?.systems,
                subsystem: filters[0]?.subsystems,
                suppliers: filters[0]?.suppliers,
            });
        }
    } catch (error) {
        return res.status(500).json({ msg: error.message });
    }
};

const get_kit_filter = async (req, res) => {
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
        if (req.query.for == "price-list") {
            return res.json({
                system: filters[0].systems,
                supplier: filters[0].supplier,
            });
        } else {
            return res.json({
                system: filters[0].systems,
                group: filters[0].groups,
                subgroup: filters[0].subgroups,
                supplier: filters[0].supplier,
            });
        }
    } catch (error) {
        return res.status(500).json({ msg: error.message });
    }
};

const get_stock_filter = async (req, res) => {
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
                        { $sort: { "historyDetails.eta": -1 } },
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
                                            "historyDetails.eta": -1,
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





// const get_task_filter = async (req, res) => {
//     try {

//         const { userId } = req.params;

//         const matchCondition = {};


//         if (userId) {
//             matchCondition["departments.employees"] = new mongoose.Types.ObjectId(userId);
//         }
//         const filters = await Task_Model.aggregate([
//             { $match: matchCondition },
//             {
//                 $group: {
//                     _id: null,
//                     departmentIds: { $addToSet: "$department" },
//                     userIds: { $addToSet: "$users" },
//                 },
//             },

//             {
//                 $addFields: {
//                     departmentIds: {
//                         $reduce: {
//                             input: "$departmentIds",
//                             initialValue: [],
//                             in: { $setUnion: ["$$value", "$$this"] },
//                         },
//                     },
//                     userIds: {
//                         $reduce: {
//                             input: "$userIds",
//                             initialValue: [],
//                             in: { $setUnion: ["$$value", "$$this"] },
//                         },
//                     },
//                 },
//             },

//             {
//                 $lookup: {
//                     from: "departments",
//                     localField: "departmentIds",
//                     foreignField: "_id",
//                     as: "departments",
//                 },
//             },

//             {
//                 $lookup: {
//                     from: "user_models",
//                     localField: "userIds",
//                     foreignField: "_id",
//                     as: "users",
//                 },
//             },

//             {
//                 $project: {
//                     _id: 0,
//                     departments: { _id: 1, name: 1 },
//                     users: { _id: 1, name: 1, lastName: 1 },
//                 },
//             },
//         ]);

//         return res.status(200).json({
//             success: true,
//             filters: filters[0] || { departments: [], users: [] },
//         });
//     } catch (error) {
//         return res.status(500).json({
//             success: false,
//             message: error?.message,
//         });
//     }
// };



const get_task_filter = async (req, res) => {
    try {
        const { userId } = req.params;
        const matchCondition = {};


        if (userId) {
            matchCondition["assignments.employees"] = new mongoose.Types.ObjectId(userId);
        }

        const filters = await Task_Model.aggregate([
            { $match: matchCondition },
            {
                $project: {
                    departmentIds: {
                        $map: {
                            input: "$assignments",
                            as: "dept",
                            in: "$$dept.departmentId"
                        }
                    },
                    employeeIds: {
                        $reduce: {
                            input: "$assignments",
                            initialValue: [],
                            in: {
                                $setUnion: ["$$value", "$$this.employees"]
                            }
                        }
                    }
                }
            },

            {
                $group: {
                    _id: null,
                    departmentIds: { $addToSet: "$departmentIds" },
                    userIds: { $addToSet: "$employeeIds" },
                },
            },

            {
                $project: {
                    departmentIds: {
                        $reduce: {
                            input: "$departmentIds",
                            initialValue: [],
                            in: { $setUnion: ["$$value", "$$this"] }
                        }
                    },
                    userIds: {
                        $reduce: {
                            input: "$userIds",
                            initialValue: [],
                            in: { $setUnion: ["$$value", "$$this"] }
                        }
                    }
                }
            },
 
            {
                $lookup: {
                    from: "departments",
                    localField: "departmentIds",
                    foreignField: "_id",
                    as: "departments",
                }
            },

            {
                $lookup: {
                    from: "user_models",
                    localField: "userIds",
                    foreignField: "_id",
                    as: "users",
                }
            },

            {
                $project: {
                    _id: 0,
                    departments: { _id: 1, name: 1 },
                    users: { _id: 1, name: 1, lastName: 1 },
                }
            }
        ]);
 

        return res.status(200).json({
            success: true,
            filters: filters[0] || { departments: [], users: [] },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error?.message || "Server Error",
        });
    }
};




module.exports = {
    get_acc_filter,
    get_ni_filter,
    get_insulated_filter,
    get_kit_filter,
    get_stock_filter,
    get_stock_filter_data,
    get_task_filter,
};
