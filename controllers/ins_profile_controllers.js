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

//insulated input
const search_insulated_input_code = async (req, res) => {
    try {
        let { search } = req.query;
        let searchRegex = { $regex: new RegExp(".*" + search + ".*", "i") };
        const result = await Profile_Input_Model.aggregate([
            {
                $match: {
                    code: searchRegex,
                },
            },
            {
                $lookup: {
                    from: "profile_calculators",
                    localField: "_id",
                    foreignField: "input_model_id",
                    as: "price_lists",
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
                $match: {
                    price_lists: { $not: { $size: 0 } }, // Ensure there's a match in the second table
                },
            },
            {
                $limit: 10
            }
        ]);
        // const code_weight = await Profile_Input_Model.find({
        //   code: searchRegex,
        // });
        // const code_cost = await Profile_Calculator.find({
        //   code: searchRegex,
        // });
        // console.log(result);
        return res.status(200).json({ result });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ mssg: error?.message || 'Internal server error' })
    }
};
const get_weight_cost = async (req, res) => {
    try {
        const { code, id } = req.query;
        const code_weight = await Profile_Input_Model.findOne({
            _id: id,
        });
        const code_cost = await Profile_Calculator.findOne({
            input_model_id: id,
        });
        return res.status(200).json({ code_weight, code_cost });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ mssg: error?.message || 'Internal server error' })
    }
};
const add_insulated_input = async (req, res) => {
    try {
        const {
            code,
            supersystem,
            supersystem_id,
            system,
            system_id,
            subsystem,
            subsystem_id,
            supplier_id,
            supplier,
            supplier_code,
            supplier_item_code,
            rd,
            crimping,
            crimping_id,
            unit_system,
            unit_description,
            unit,
            currency,
            currency_id,
            description,

            systemTags
        } = JSON.parse(req.body.inputForm);
        const files = JSON.parse(req.body.files);
        const aluminium = JSON.parse(req.body.aluminium);
        const polyamide = JSON.parse(req.body.polyamide);

        const filename = `${process.env.BACKENDURL}/uploads/${req.file?.filename}`;
        if (
            !code ||
            !supersystem_id ||
            !system_id ||
            !supplier_id ||
            isNaN(parseFloat(rd)) ||
            // !subsystem ||
            !description ||
            !unit ||
            !unit_system ||
            !unit_description ||
            !crimping ||
            !crimping_id

            // || !packing_code ||
            // !packing_unit ||
            // isNaN(parseFloat(packing_cost)) ||
            // isNaN(parseFloat(packing_quantity)) ||
            // isNaN(parseFloat(packing_itm_cost)) ||
            // !packing_material
        ) {
            return res.status(400).json({
                mssg: "Parent Code, System, Description and Image are Required",
            });
        }
        const if_input = await Profile_Insulated_Input.find({ code });
        if (if_input.length > 0) {
            return res.status(400).json({
                mssg: "Entry Already Exists With This Code",
            });
        }
        function isEntryFilled(entry) {
            return (
                entry.code_id !== "" &&
                entry.code_pl_id !== "" &&
                // entry.unit_cost !== 0 &&
                // entry.total_cost !== 0 &&
                entry.quantity > 0
            );
        }
        const Aluminium_Filled = aluminium.some(isEntryFilled);
        const Polyamide_Filled = polyamide.some(isEntryFilled);
        if (!Aluminium_Filled || !Polyamide_Filled) {
            return res.status(400).json({
                mssg: "You need to fill at least 1 Aluminium and Polyamide part",
            });
        }
        let al_total_weight = 0;
        let al_total_cost = 0;
        let al_oc_sum = 0;
        let al_lc_sum = 0;
        let al_sp_sum = 0;
        let poly_total_weight = 0;
        let poly_total_cost = 0;
        let polyamide_qty = 0;
        let polyamide_oc = 0;
        let polyamide_lc = 0;
        let polyamide_sp = 0;
        // const aluminium_weight_cost = await Promise.all(
        //   aluminium.map((itm) => {
        //     if (
        //       !itm.code_id ||
        //       !itm.code_pl_id ||
        //       !itm.total_cost ||
        //       !itm.weight ||
        //       !itm.quantity
        //     ) {
        //       return;
        //     }
        //     al_total_weight += itm.weight;
        //     al_total_cost += itm.total_cost;
        //     al_oc_sum += itm.origin_cost;
        //     al_lc_sum += itm.landing_cost;
        //     al_sp_sum += itm.selling_price;
        //   })
        // );
        const polyamide_weight_cost = await Promise.all(
            polyamide.map((itm) => {
                if (
                    !itm.code_id ||
                    !itm.code_pl_id ||
                    !itm.unit_cost ||
                    !itm.weight ||
                    !itm.quantity
                ) {
                    return;
                }
                // poly_total_weight += itm.weight * itm.quantity;
                // poly_total_cost += itm.unit_cost * itm.quantity;
                polyamide_qty += parseFloat(itm.quantity);
                // polyamide_oc += itm.origin_cost;
                // polyamide_lc += itm.landing_cost;
                // polyamide_sp += itm.selling_price;
            })
        );
        // console.log(polyamide, aluminium);
        // return;
        const saved_input = await Profile_Insulated_Input.create({
            code,
            image: filename,
            unit: unit,
            unit_system: unit_system,
            unit_description: unit_description,
            crimping: crimping * polyamide_qty,
            crimping_id,
            polyamide: polyamide,
            aluminium: aluminium,
            supplier_id,
            supplier_item_code,
            rd: rd,
            supersystem_id,
            system_id,
            subsystem_id,
            description,
            // total_cost: al_total_cost + poly_total_cost + polyamide_qty * crimping,
            // total_weight: al_total_weight + poly_total_weight,
            // origin_cost: al_oc_sum + polyamide_oc + polyamide_qty * crimping,
            // landing_cost: al_lc_sum + polyamide_lc + polyamide_qty * crimping,
            // selling_price: al_sp_sum + polyamide_sp + polyamide_qty * crimping,
            files: files,

            systemTags
        });

        return res.status(200).json({ mssg: "Input Added", saved_input });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ mssg: error?.message || 'Internal server error' })
    }
};
const get_insulated_input = async (req, res) => {
    try {
        let { page, filter, getAll } = req.query;
        if (getAll) {
            const result = await Profile_Insulated_Input.aggregate([
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
                    },
                },
                {
                    $lookup: {
                        from: "stock_models",
                        localField: "_id",
                        foreignField: "reference_code_id",
                        as: "stock_detail",
                        pipeline: [
                            { $match: { active: true } }
                        ]
                    },
                },
                { $unwind: "$aluminium" },
                {
                    $lookup: {
                        from: "profile_input_models", // Replace with the actual collection name
                        localField: "aluminium.code_id",
                        foreignField: "_id",
                        as: "aluminium.code_info",
                    },
                },
                {
                    $lookup: {
                        from: "profile_calculators", // Replace with the actual collection name
                        localField: "aluminium.code_pl_id",
                        foreignField: "_id",
                        as: "aluminium.code_pl_info",
                    },
                },
                {
                    $unwind: {
                        path: "$aluminium.code_info",
                        path: "$aluminium.code_pl_info",
                        preserveNullAndEmptyArrays: true,
                    },
                },
                // Group back the aluminium array
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
                        from: "accessories_input_models", // Replace with the actual collection name
                        localField: "polyamide.code_id",
                        foreignField: "_id",
                        as: "polyamide.code_info",
                    },
                },
                {
                    $lookup: {
                        from: "accessories_calculators", // Replace with the actual collection name
                        localField: "polyamide.code_pl_id",
                        foreignField: "_id",
                        as: "polyamide.code_pl_info",
                    },
                },
                {
                    $unwind: {
                        path: "$polyamide.code_info",
                        path: "$polyamide.code_pl_info",
                        preserveNullAndEmptyArrays: true,
                    },
                },
                // Group back the polyamide array
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
            let where = {
                $or: [
                    { code: searchRegex },
                    { description: searchRegex },
                    { system: searchRegex },
                    { subsystem: searchRegex },
                ],
                $and: and,
            };
            const result = await Profile_Insulated_Input.aggregate([
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
                    },
                },
                {
                    $lookup: {
                        from: "stock_models",
                        localField: "_id",
                        foreignField: "reference_code_id",
                        as: "stock_detail",
                        pipeline: [
                            { $match: { active: true } }
                        ]
                    },
                },
                { $unwind: "$aluminium" },
                {
                    $lookup: {
                        from: "profile_input_models", // Replace with the actual collection name
                        localField: "aluminium.code_id",
                        foreignField: "_id",
                        as: "aluminium.code_info",
                    },
                },
                {
                    $lookup: {
                        from: "profile_calculators", // Replace with the actual collection name
                        localField: "aluminium.code_pl_id",
                        foreignField: "_id",
                        as: "aluminium.code_pl_info",
                    },
                },
                {
                    $unwind: {
                        path: "$aluminium.code_info",
                        path: "$aluminium.code_pl_info",
                        preserveNullAndEmptyArrays: true,
                    },
                },
                // Group back the aluminium array
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
                        from: "accessories_input_models", // Replace with the actual collection name
                        localField: "polyamide.code_id",
                        foreignField: "_id",
                        as: "polyamide.code_info",
                    },
                },
                {
                    $lookup: {
                        from: "accessories_calculators", // Replace with the actual collection name
                        localField: "polyamide.code_pl_id",
                        foreignField: "_id",
                        as: "polyamide.code_pl_info",
                    },
                },
                {
                    $unwind: {
                        path: "$polyamide.code_info",
                        path: "$polyamide.code_pl_info",
                        preserveNullAndEmptyArrays: true,
                    },
                },
                // Group back the polyamide array
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
                    $sort: {
                        code: 1,
                    },
                },
            ]);

            const totalCount = await Profile_Insulated_Input.countDocuments(where);
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
const get_single_insulted_input = async (req, res) => {
    try {
        const { id } = req.params;
        // const insulated_input = await Profile_Insulated_Input.findById(id, {
        //    ,
        // }).populate({ path: "stock_detail", model: "Stock_model" });
        const insulated_input = await Profile_Insulated_Input.aggregate([
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
                    from: "accessories_supplier_models",
                    localField: "supplier_id",
                    foreignField: "_id",
                    as: "lookup_supplier",
                },
            },
            {
                $addFields: {
                    supersystem: {
                        $arrayElemAt: ["$lookup_system.name", 0],
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
                    supplier: { $arrayElemAt: ["$lookup_supplier.name", 0] },
                    supplier_code: { $arrayElemAt: ["$lookup_supplier.code", 0] },
                    supplier_item_code: 1,
                },
            },
            {
                $lookup: {
                    from: "stock_models",
                    localField: "_id",
                    foreignField: "reference_code_id",
                    as: "stock_detail",
                    pipeline: [
                        { $match: { active: true } }
                    ]
                },
            },
            { $unwind: "$aluminium" },
            {
                $lookup: {
                    from: "profile_input_models", // Replace with the actual collection name
                    localField: "aluminium.code_id",
                    foreignField: "_id",
                    as: "aluminium.code_info",
                },
            },
            {
                $lookup: {
                    from: "profile_calculators", // Replace with the actual collection name
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
            // Group back the aluminium array
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
                    from: "accessories_input_models", // Replace with the actual collection name
                    localField: "polyamide.code_id",
                    foreignField: "_id",
                    as: "polyamide.code_info",
                },
            },
            {
                $lookup: {
                    from: "accessories_calculators", // Replace with the actual collection name
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
            // Group back the polyamide array
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
        ]);
        const loose_stock = await Loose_Stock_model.findOne({
            code_id: id,
        });
        res.status(200).json({ insulated_input: insulated_input[0], loose_stock });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ mssg: error?.message || 'Internal server error' })
    }
};
const delete_insulated_input = async (req, res) => {
    try {
        const id = req.params.id;
        const deleted_entry = await Profile_Insulated_Input.findByIdAndDelete(id);
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
        return res.status(500).json({ mssg: error?.message || 'Internal server error' })
    }
};
const update_insulated_input = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            code,
            supersystem,
            supersystem_id,
            system,
            system_id,
            subsystem,
            subsystem_id,
            supplier_id,
            supplier,
            supplier_code,
            supplier_item_code,
            rd,
            crimping,
            crimping_id,
            unit_system,
            unit_description,
            unit,
            currency,
            currency_id,
            description,
            systemTags
        } = JSON.parse(req.body.inputForm);
        const files = JSON.parse(req.body.files);
        const aluminium = JSON.parse(req.body.aluminium);
        const polyamide = JSON.parse(req.body.polyamide);
        const filename = req.file
            ? `${process.env.BACKENDURL}/uploads/${req.file.filename}`
            : req.body.photo;
        if (
            !code ||
            !supersystem_id ||
            !system_id ||
            !supplier_id ||
            isNaN(parseFloat(rd)) ||
            // !subsystem ||
            !description ||
            !unit ||
            !unit_system ||
            !unit_description ||
            !crimping ||
            !crimping_id

            // || !packing_code ||
            // !packing_unit ||
            // isNaN(parseFloat(packing_cost)) ||
            // isNaN(parseFloat(packing_quantity)) ||
            // isNaN(parseFloat(packing_itm_cost)) ||
            // !packing_material
        ) {
            return res.status(400).json({
                mssg: "Parent Code, System, Description and Image are Required",
            });
        }
        function isEntryFilled(entry) {
            return (
                entry.code_id !== "" &&
                entry.code_pl_id !== "" &&
                // entry.weight !== "" &&
                // entry.unit_cost !== 0 &&
                // entry.total_cost !== 0 &&
                entry.quantity > 0
            );
        }
        const Aluminium_Filled = aluminium.some(isEntryFilled);
        const Polyamide_Filled = polyamide.some(isEntryFilled);
        if (!Aluminium_Filled || !Polyamide_Filled) {
            return res.status(400).json({
                mssg: "You need to select at least 1 Aluminium and Polyamide part",
            });
        }
        let al_total_weight = 0;
        let al_total_cost = 0;
        let al_oc_sum = 0;
        let al_lc_sum = 0;
        let al_sp_sum = 0;
        let poly_total_weight = 0;
        let poly_total_cost = 0;
        let polyamide_qty = 0;
        let polyamide_oc = 0;
        let polyamide_lc = 0;
        let polyamide_sp = 0;
        // const aluminium_weight_cost = await Promise.all(
        //   aluminium.map((itm) => {
        //     if (
        //       !itm.code_id ||
        //       itm?.code_pl_id ||
        //       !itm.total_cost ||
        //       !itm.quantity
        //     ) {
        //       return;
        //     }
        //     al_total_weight += itm.weight;
        //     al_total_cost += itm.total_cost;
        //     al_oc_sum += itm.origin_cost * itm.quantity;
        //     al_lc_sum += itm.landing_cost * itm.quantity;
        //     al_sp_sum += itm.selling_price * itm.quantity;
        //   })
        // );
        const polyamide_weight_cost = await Promise.all(
            polyamide.map((itm) => {
                if (
                    !itm.code_id ||
                    !itm.code_pl_id ||
                    !itm.unit_cost ||
                    !itm.weight ||
                    !itm.quantity
                ) {
                    return;
                }
                // poly_total_weight += itm.weight * itm.quantity;
                // poly_total_cost += itm.unit_cost * itm.quantity;
                polyamide_qty += parseFloat(itm.quantity);
                // polyamide_oc += itm.origin_cost * itm.quantity;
                // polyamide_lc += itm.landing_cost * itm.quantity;
                // polyamide_sp += itm.selling_price * itm.quantity;
            })
        );
        const updatedEntry = await Profile_Insulated_Input.findOneAndUpdate(
            { _id: id },
            {
                code,
                image: filename,
                unit: unit,
                unit_system: unit_system,
                unit_description: unit_description,
                crimping: crimping * polyamide_qty,
                crimping_id,
                polyamide: polyamide,
                aluminium: aluminium,
                supplier_id,
                supplier_item_code,
                rd: rd,
                supersystem_id,
                system_id,
                subsystem_id,
                description,
                files: files,

                systemTags
                // total_cost: al_total_cost + poly_total_cost + polyamide_qty * crimping,
                // total_weight: al_total_weight + poly_total_weight,
                // origin_cost: al_oc_sum + polyamide_oc + polyamide_qty * crimping,
                // landing_cost: al_lc_sum + polyamide_lc + polyamide_qty * crimping,
                // selling_price: al_sp_sum + polyamide_sp + polyamide_qty * crimping,
            },
            { new: true, runValidators: true, context: "query" }
        );

        // Fetch and save the document to trigger pre-save middleware
        if (updatedEntry) {
            await updatedEntry.save();
        }

        return res.status(200).json({ mssg: "Input Updated" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ mssg: error?.message || 'Internal server error' })
    }
};
const create_duplicate_ins = async (req, res) => {
    try {
        const {
            code,
            supersystem,
            supersystem_id,
            system,
            system_id,
            subsystem,
            subsystem_id,
            supplier_id,
            supplier,
            supplier_code,
            supplier_item_code,
            rd,
            crimping,
            crimping_id,
            unit_system,
            unit_description,
            unit,
            currency,
            currency_id,
            description,

            systemTags
        } = JSON.parse(req.body.inputForm);
        const files = JSON.parse(req.body.files);
        const aluminium = JSON.parse(req.body.aluminium);
        const polyamide = JSON.parse(req.body.polyamide);
        // console.log(aluminium, polyamide);
        // return;
        const filename = req.body.photo;
        if (
            !code ||
            !supersystem_id ||
            !system_id ||
            !supplier_id ||
            isNaN(parseFloat(rd)) ||
            // !subsystem ||
            !description ||
            !unit ||
            !unit_system ||
            !unit_description ||
            !crimping ||
            !crimping_id

            // || !packing_code ||
            // !packing_unit ||
            // isNaN(parseFloat(packing_cost)) ||
            // isNaN(parseFloat(packing_quantity)) ||
            // isNaN(parseFloat(packing_itm_cost)) ||
            // !packing_material
        ) {
            return res.status(400).json({
                mssg: "Parent Code, System, Description and Image are Required",
            });
        }
        const if_input = await Profile_Insulated_Input.find({ code });
        if (if_input.length > 0) {
            return res.status(400).json({
                mssg: "Entry Already Exists With This Code",
            });
        }
        function isEntryFilled(entry) {
            return (
                entry.code_id !== "" &&
                entry.code_pl_id !== "" &&
                // entry.unit_cost !== 0 &&
                // entry.total_cost !== 0 &&
                entry.quantity > 0
            );
        }
        const Aluminium_Filled = aluminium.some(isEntryFilled);
        const Polyamide_Filled = polyamide.some(isEntryFilled);
        if (!Aluminium_Filled || !Polyamide_Filled) {
            return res.status(400).json({
                mssg: "You need to fill at least 1 Aluminium and Polyamide part",
            });
        }
        let al_total_weight = 0;
        let al_total_cost = 0;
        let al_oc_sum = 0;
        let al_lc_sum = 0;
        let al_sp_sum = 0;
        let poly_total_weight = 0;
        let poly_total_cost = 0;
        let polyamide_qty = 0;
        let polyamide_oc = 0;
        let polyamide_lc = 0;
        let polyamide_sp = 0;
        // const aluminium_weight_cost = await Promise.all(
        //   aluminium.map((itm) => {
        //     if (
        //       !itm.code_id ||
        //       !itm.code_pl_id ||
        //       !itm.total_cost ||
        //       !itm.weight ||
        //       !itm.quantity
        //     ) {
        //       return;
        //     }
        //     al_total_weight += itm.weight;
        //     al_total_cost += itm.total_cost;
        //     al_oc_sum += itm.origin_cost;
        //     al_lc_sum += itm.landing_cost;
        //     al_sp_sum += itm.selling_price;
        //   })
        // );
        const polyamide_weight_cost = await Promise.all(
            polyamide.map((itm) => {
                if (
                    !itm.code_id ||
                    !itm.code_pl_id ||
                    !itm.unit_cost ||
                    !itm.weight ||
                    !itm.quantity
                ) {
                    return;
                }
                // poly_total_weight += itm.weight * itm.quantity;
                // poly_total_cost += itm.unit_cost * itm.quantity;
                polyamide_qty += parseFloat(itm.quantity);
                // polyamide_oc += itm.origin_cost;
                // polyamide_lc += itm.landing_cost;
                // polyamide_sp += itm.selling_price;
            })
        );
        // console.log(polyamide, aluminium);
        // return;
        const saved_input = await Profile_Insulated_Input.create({
            code,
            image: filename,
            unit: unit,
            unit_system: unit_system,
            unit_description: unit_description,
            crimping: crimping * polyamide_qty,
            crimping_id,
            polyamide: polyamide,
            aluminium: aluminium,
            supplier_id,
            supplier_item_code,
            rd: rd,
            supersystem_id,
            system_id,
            subsystem_id,
            description,
            files: files,
            systemTags
            // total_cost: al_total_cost + poly_total_cost + polyamide_qty * crimping,
            // total_weight: al_total_weight + poly_total_weight,
            // origin_cost: al_oc_sum + polyamide_oc + polyamide_qty * crimping,
            // landing_cost: al_lc_sum + polyamide_lc + polyamide_qty * crimping,
            // selling_price: al_sp_sum + polyamide_sp + polyamide_qty * crimping,
        });

        return res.status(200).json({
            mssg: `New Entry Created`,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ mssg: error?.message || 'Internal server error' })
    }
};

const get_insulated_system = async (req, res) => {
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
                    pipeline: [
                        { $match: { active: true } }
                    ]
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

        return res.json({
            system: filters[0]?.systems,
            subsystem: filters[0]?.subsystems,
            suppliers: filters[0]?.suppliers,
        });
    } catch (error) {
        return res.status(500).json({ msg: error.message });
    }
};

const get_insulated_price_list = async (req, res) => {
    try {
        let { filter, page, getAll } = req.query;
        if (getAll) {
            let result = await Profile_Insulated_Calculator.aggregate([
                {
                    $lookup: {
                        from: "profile_insulated_inputs",
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
                        from: "profile_system_models",
                        let: { systemField: "$input_detail.system_id" },
                        pipeline: [
                            { $unwind: "$system_detail" },
                            {
                                $match: {
                                    $expr: { $eq: ["$system_detail._id", "$$systemField"] },
                                },
                            },
                        ],
                        as: "system_info",
                    },
                },
                {
                    $addFields: {
                        system: { $arrayElemAt: ["$system_info.system_detail.name", 0] },
                    },
                },
                {
                    $sort: {
                        "input_detail.code": 1,
                    },
                },

                {
                    $project: {
                        origin_cost: 1,
                        landing_cost: 1,
                        description: 1,
                        input_detail: 1,
                        total_cost: "$selling_price",
                        input_model_id: 1,
                        price_list_1: 1,
                        price_list_2: 1,
                        price_list_3: 1,
                        price_list_4: 1,
                        supplier: 1,
                        supplier_code: 1,
                        system: 1,
                        _id: 1,
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
            // let where = { "input_model_id.code": searchRegex };
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

            let result = await Profile_Insulated_Calculator.aggregate([
                {
                    $lookup: {
                        from: "profile_insulated_inputs",
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
                        from: "profile_system_models",
                        let: { systemField: "$input_detail.system_id" },
                        pipeline: [
                            { $unwind: "$system_detail" },
                            {
                                $match: {
                                    $expr: { $eq: ["$system_detail._id", "$$systemField"] },
                                },
                            },
                        ],
                        as: "system_info",
                    },
                },
                {
                    $addFields: {
                        system: { $arrayElemAt: ["$system_info.system_detail.name", 0] },
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
                    $project: {
                        origin_cost: 1,
                        landing_cost: 1,
                        description: 1,
                        input_detail: 1,
                        total_cost: "$selling_price",
                        input_model_id: 1,
                        price_list_1: 1,
                        price_list_2: 1,
                        price_list_3: 1,
                        price_list_4: 1,
                        supplier: 1,
                        supplier_code: 1,
                        system: 1,
                        _id: 1,
                    },
                },
                {
                    $skip: skip,
                },
                {
                    $limit: limit,
                },
            ]);
            const totalCount = await Profile_Insulated_Calculator.aggregate([
                {
                    $lookup: {
                        from: "profile_insulated_inputs",
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
const generate_insulated_pl = async (req, res) => {
    try {
        let skip = 0
        let limit = 100
        let hasMore = true
        while (hasMore) {
            const insulated_input = await Profile_Insulated_Input.aggregate([
                // Join with profile_system_models
                {
                    $skip: skip
                },
                {
                    $limit: limit
                },
                {
                    $lookup: {
                        from: "profile_system_models",
                        localField: "system_id",
                        foreignField: "system_detail._id",
                        as: "profile_system",
                    },
                },
                { $unwind: "$aluminium" },
                {
                    $lookup: {
                        from: "profile_input_models", // Replace with the actual collection name
                        localField: "aluminium.code_id",
                        foreignField: "_id",
                        as: "aluminium.code_info",
                    },
                },
                {
                    $lookup: {
                        from: "profile_calculators", // Replace with the actual collection name
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
                // Group back the aluminium array
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
                        from: "accessories_input_models", // Replace with the actual collection name
                        localField: "polyamide.code_id",
                        foreignField: "_id",
                        as: "polyamide.code_info",
                    },
                },
                {
                    $lookup: {
                        from: "accessories_calculators", // Replace with the actual collection name
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
                // Group back the polyamide array
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
            ]);
            if (insulated_input.length == 0) {
                hasMore = false
            } else {
                const crimping = await Operations_Model.findOne({ name: "Crimping" });
                await Promise.all(
                    insulated_input.map(async (itm) => {
                        try {

                            let al_total_weight = 0;
                            let al_total_cost = 0;
                            let al_oc_sum = 0;
                            let al_lc_sum = 0;
                            let al_sp_sum = 0;
                            let poly_total_weight = 0;
                            let poly_total_cost = 0;
                            let polyamide_qty = 0;
                            let polyamide_oc = 0;
                            let polyamide_lc = 0;
                            let polyamide_sp = 0;
                            // console.log(itm.aluminium);
                            const aluminium_weight_cost = await Promise.all(
                                itm.aluminium.map((aitm) => {
                                    al_total_weight += aitm.code_info?.unit_weight
                                        ? aitm.code_info?.unit_weight
                                        : 0;
                                    al_total_cost += aitm.code_pl_info?.final_selling_price
                                        ? aitm.code_pl_info?.final_selling_price
                                        : 0 * aitm.quantity;
                                    al_oc_sum += aitm.code_pl_info?.origin_cost
                                        ? aitm.code_pl_info?.origin_cost
                                        : 0 * aitm.quantity;
                                    al_lc_sum += aitm.code_pl_info?.origin_cost
                                        ? aitm.code_pl_info?.origin_cost
                                        : 0 * aitm.quantity;
                                    al_sp_sum += aitm.code_pl_info?.final_selling_price
                                        ? aitm.code_pl_info?.final_selling_price
                                        : 0 * aitm.quantity;
                                })
                            );
                            const polyamide_weight_cost = await Promise.all(
                                itm.polyamide.map((pitm) => {
                                    // console.log("polyamide", pitm.code_pl_info);
                                    poly_total_weight += pitm.code_info?.unit_weight
                                        ? pitm.code_info?.unit_weight
                                        : 0 * pitm.quantity;
                                    poly_total_cost += pitm.code_pl_info?.selling_price
                                        ? pitm.code_pl_info?.selling_price
                                        : 0 * pitm.quantity;
                                    polyamide_oc += pitm.code_pl_info?.oc
                                        ? pitm.code_pl_info?.oc
                                        : 0 * pitm.quantity;
                                    polyamide_lc += pitm.code_pl_info?.landing_cost
                                        ? pitm.code_pl_info?.landing_cost
                                        : 0 * pitm.quantity;
                                    polyamide_sp += pitm.code_pl_info?.selling_price
                                        ? pitm.code_pl_info?.selling_price
                                        : 0 * pitm.quantity;
                                    polyamide_qty += parseFloat(pitm.quantity);
                                })
                            );
                            // if (itm.code == "TST INS ASD 1") {
                            //   console.log(
                            //     al_oc_sum,
                            //     polyamide_oc,
                            //     polyamide_qty * crimping.cost_to_aed,
                            //     al_lc_sum,
                            //     polyamide_lc,
                            //     polyamide_qty * crimping.cost_to_aed,
                            //     al_sp_sum,
                            //     polyamide_sp,
                            //     polyamide_qty * crimping.cost_to_aed
                            //   );
                            // }
                            const total_cost =
                                al_total_cost +
                                poly_total_cost +
                                polyamide_qty * crimping.cost_to_aed;
                            let pl1 = total_cost / (1 - itm?.profile_system[0]?.price_list_1 / 100);
                            let pl2 = total_cost / (1 - itm?.profile_system[0]?.price_list_2 / 100);
                            let pl3 = total_cost / (1 - itm?.profile_system[0]?.price_list_3 / 100);
                            let pl4 = total_cost / (1 - itm?.profile_system[0]?.price_list_4 / 100);
                            let Profile_Calculator_Exist =
                                await Profile_Insulated_Calculator.findOne({
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
                            if (Profile_Calculator_Exist) {
                                await Profile_Insulated_Calculator.findOneAndUpdate(
                                    { input_model_id: itm._id },
                                    {
                                        // code: itm.code,
                                        // image: itm.code,
                                        // system: itm.system,
                                        // description: itm.description,
                                        // files: itm.files,
                                        origin_cost:
                                            al_oc_sum + polyamide_oc + polyamide_qty * crimping.cost_to_aed,
                                        landing_cost:
                                            al_lc_sum + polyamide_lc + polyamide_qty * crimping.cost_to_aed,
                                        selling_price:
                                            al_sp_sum + polyamide_sp + polyamide_qty * crimping.cost_to_aed,
                                        total_cost:
                                            al_total_cost +
                                            poly_total_cost +
                                            polyamide_qty * crimping.cost_to_aed,
                                        price_list_1: pl1,
                                        price_list_2: pl2,
                                        price_list_3: pl3,
                                        price_list_4: pl4,
                                    }
                                );
                            } else {
                                await Profile_Insulated_Calculator.create({
                                    // image: itm.code,
                                    input_model_id: itm._id,
                                    // system: itm.system,
                                    origin_cost:
                                        al_oc_sum + polyamide_oc + polyamide_qty * crimping.cost_to_aed,
                                    landing_cost:
                                        al_lc_sum + polyamide_lc + polyamide_qty * crimping.cost_to_aed,
                                    selling_price:
                                        al_sp_sum + polyamide_sp + polyamide_qty * crimping.cost_to_aed,
                                    total_cost:
                                        al_total_cost +
                                        poly_total_cost +
                                        polyamide_qty * crimping.cost_to_aed,
                                    // description: itm.description,
                                    price_list_1: pl1,
                                    price_list_2: pl2,
                                    price_list_3: pl3,
                                    price_list_4: pl4,
                                    // files: itm.files,
                                });
                            }
                        } catch (error) {
                            console.error("Insulated Profile, Error processing item:", itm._id, error.message);
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
const ins_profile_assigned_to = async (req, res) => {
    try {
        const { id } = req.params;
        const input = await Profile_Insulated_Input.findById(id);
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
        const kit = await Kit_Input.aggregate([
            {
                $unwind: {
                    path: "$insulated_aluminium_profile",
                },
            },
            {
                $match: {
                    "insulated_aluminium_profile.code_id": input._id,
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
const refresh_price_list = async (req, res) => {
    try {
        await price_calc_step2_Helper();
        await generate_PriceList_Helper();
        await generate_insulated_pl();
        return res.status(200).json({ mssg: "Success" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ mssg: error?.message || 'Internal server error' })
    }
};

//Search
const get_Insulated_SubSystems = async (req, res) => {
    try {
        const subsystem = await Profile_Insulated_Input.aggregate([
            { $group: { _id: null, subsystem: { $addToSet: "$subsystem" } } },
        ]);

        return res.json({ subsystem });
    } catch (error) {
        return res.status(500).json({ msg: error.message });
    }
};

//insulated packages
const add_insulated_package = async (req, res) => {
    try {
        const packages = req.body.packages;
        const loose = req.body.loose;
        const { add_new_package } = req.body;
        const { code, id } = req.body.selectedCode;
        if (!code || !id) {
            return res.status(400).json({ mssg: "Please Select a Code" });
        }
        const ref_code_detail = await Profile_Insulated_Input.findById(id);
        if (loose.msq != 0) {
            const ifLooseExist = await Loose_Stock_model.findOne({
                code_id: loose.code_id,
            });
            if (!ifLooseExist) {
                const loose_stock = await Loose_Stock_model.create({
                    code_id: loose.code_id,
                    category: "Insulated Profile",
                    msq: loose.msq,
                });
                const looseLog = await Log_Model.create({
                    stock_id: loose_stock._id,
                    ref_code_id: loose.code_id,
                    category: "Insulated Profile",
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
                        category: "Insulated Profile",
                        order_type: "Loose",
                    });
                }
            } else {
                const loose_stock = await Loose_Stock_model.findOneAndUpdate(
                    { code_id: loose.code_id },
                    {
                        category: "Insulated Profile",
                        msq: loose.msq,
                    },
                    {
                        new: true,
                    }
                );
                const looseLog = await Log_Model.create({
                    stock_id: loose_stock._id,
                    ref_code_id: loose.code_id,
                    category: "Insulated Profile",
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
                        category: "Insulated Profile",
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
                        category: "Insulated Profile",
                        msq: itm.msq,
                    });
                    const StockLog = await Log_Model.create({
                        stock_id: new_package._id,
                        ref_code_id: ref_code_detail._id,
                        category: "Insulated Profile",
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
                                category: "Insulated Profile",
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
const get_insulated_packages = async (req, res) => {
    try {
        let { search, page, filter, getAll } = req.query;
        if (getAll) {
            const entry = await Stock_model.aggregate([
                {
                    $lookup: {
                        from: "profile_insulated_inputs",
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
                        $and: [{ category: "Insulated Profile" }],
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
            let and = [{ category: "Insulated Profile" }];
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
                        from: "profile_insulated_inputs",
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
    }
};
const get_single_insulated_package = async (req, res) => {
    try {
        const id = req.params.id;
        const input = await Profile_Insulated_Input.findById(id);
        // const entry = await Profile_Insulated_Input.findById(id).populate({
        //   path: "stock_detail",
        //   model: "Stock_model",
        // });
        const entry = await Profile_Insulated_Input.aggregate([
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
const update_insulated_package = async (req, res) => {
    try {
        const { packages, new_packages, loose } = req.body;
        const { code, id } = req.body.selectedCode;
        const ref_code_detail = await Profile_Insulated_Input.findById(id);
        if (loose.msq != 0) {
            let loose_stock = await Loose_Stock_model.findOne({
                code_id: ref_code_detail._id,
            });

            if (!loose_stock) {
                loose_stock = await Loose_Stock_model.create({
                    code_id: loose.code_id,
                    category: "Insulated Profile",
                    msq: loose.msq,
                });
                const looseLog = await Log_Model.create({
                    stock_id: loose_stock._id,
                    ref_code_id: loose.code_id,
                    category: "Insulated Profile",
                    stockType: "Loose",
                    description: `Loose Stock created for code ${ref_code_detail.code}`,
                    snapShot: loose_stock.toObject(),
                });
            } else {
                loose_stock = await Loose_Stock_model.findOneAndUpdate(
                    { code_id: ref_code_detail._id },
                    {
                        code_id: loose.code_id,
                        category: "Insulated Profile",
                        msq: loose.msq,
                    },
                    { new: true }
                );
                const looseLog = await Log_Model.create({
                    stock_id: loose_stock._id,
                    ref_code_id: loose.code_id,
                    category: "Insulated Profile",
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
                        category: "Insulated Profile",
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
                        category: "Insulated Profile",
                        msq: itm.msq,
                    });
                    const StockLog = await Log_Model.create({
                        stock_id: new_package._id,
                        ref_code_id: ref_code_detail._id,
                        category: "Insulate Profile",
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
                            category: "Insulated Profile",
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
                        category: "Insulated Profile",
                        msq: itm.msq,
                    },
                    { new: true }
                );
                const StockLog = await Log_Model.create({
                    stock_id: existing_package._id,
                    ref_code_id: ref_code_detail._id,
                    category: "Insulated Profile",
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
                            category: "Insulated Profile",
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
const get_ins_avlb_for_package = async (req, res) => {
    try {
        let { search } = req.query
        let searchRegex = { $regex: new RegExp(".*" + search + ".*", "i") };
        const result = await Profile_Insulated_Input.aggregate([
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
//insulated package pl
const generate_insulated_package_pl = async (req, res) => {
    try {
        let skip = 0
        let limit = 100
        let hasMore = true
        while (hasMore) {
            const insulated_input = await Stock_model.aggregate([
                {
                    $skip: skip
                },
                {
                    $limit: limit
                },
                {
                    $match: {
                        category: "Insulated Profile",
                    },
                },
                {
                    $lookup: {
                        from: "profile_insulated_calculators",
                        localField: "reference_code_id",
                        foreignField: "input_model_id",
                        as: "lookup_ins_calc",
                    },
                },
            ]);
            if (insulated_input.length == 0) {
                hasMore = false
            } else {
                await Promise.all(
                    insulated_input.map(async (itm) => {
                        let package_origin_cost =
                            itm.lookup_ins_calc[0]?.origin_cost * itm?.packing_quantity +
                            itm?.packing_cost;
                        let package_landing_cost =
                            itm.lookup_ins_calc[0]?.landing_cost * itm?.packing_quantity +
                            itm?.packing_cost;
                        let package_selling_price =
                            itm.lookup_ins_calc[0]?.selling_price * itm?.packing_quantity +
                            itm?.packing_cost;
                        let pl1 =
                            itm.lookup_ins_calc[0]?.price_list_1 * itm?.packing_quantity +
                            itm?.packing_cost;
                        let pl2 =
                            itm.lookup_ins_calc[0]?.price_list_2 * itm?.packing_quantity +
                            itm?.packing_cost;
                        let pl3 =
                            itm.lookup_ins_calc[0]?.price_list_3 * itm?.packing_quantity +
                            itm?.packing_cost;
                        let pl4 =
                            itm.lookup_ins_calc[0]?.price_list_4 * itm?.packing_quantity +
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
        return true;
    } catch (error) {
        console.log(error);
        return res.status(500).json({ mssg: error?.message || 'Internal server error' })
    }
};
const refresh_insulated_package_price_list = async (req, res) => {
    try {
        await acc_package_pl_helper();
        await generate_Package_PL_Helper();
        await generate_insulated_package_pl();
        return res.status(200).json({ mssg: "Success" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ mssg: error?.message || 'Internal server error' })
    }
};
const get_ins_package_pl = async (req, res) => {
    try {
        let { search, page, getAll } = req.query;
        if (getAll) {
            let result = await Stock_model.find({
                $and: [{ category: "Insulated Profile" }],
            })
                .populate({
                    path: "reference_code_id",
                    model: "Profile_Insulated_Input",
                })
                .sort({ packing_code: 1 });

            return res.json({ result });
        } else {
            let searchRegex = { $regex: new RegExp(".*" + search + ".*", "i") };

            const limit = 10;
            const pageNumber = parseInt(page) || 1;
            const skip = (pageNumber - 1) * limit;
            let and = [{ category: "Insulated Profile" }];
            let where = {
                $or: [{ packing_code: searchRegex }],
                $and: and,
            };

            let result = await Stock_model.find(where)
                .populate({
                    path: "reference_code_id",
                    model: "Profile_Insulated_Input",
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
    search_insulated_input_code,
    get_weight_cost,
    add_insulated_input,
    get_insulated_input,
    get_single_insulted_input,
    delete_insulated_input,
    create_duplicate_ins,
    update_insulated_input,
    get_insulated_system,
    get_insulated_price_list,
    generate_insulated_pl,
    ins_profile_assigned_to,
    refresh_price_list,
    get_Insulated_SubSystems,

    //insulated packages
    add_insulated_package,
    get_insulated_packages,
    get_single_insulated_package,
    update_insulated_package,
    get_ins_avlb_for_package,
    generate_insulated_package_pl,
    refresh_insulated_package_price_list,
    get_ins_package_pl,
};
