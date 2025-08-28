const { default: mongoose } = require("mongoose");
const Action_model = require("../models/actions_model");
const Stock_model = require("../models/stock_model");
const Loose_Stock_model = require("../models/loose_stock_model");

const get_actions = async (req, res) => {
    try {
        const {
            search = "",
            sortBy = "",
            supplier = "",
            dateFrom = "",
            dateTill = "",
        } = req.query.actionsFilters || {};
        // return;
        // let and = [{}];
        // if (actions_filter?.supplier_id) {
        //   and.push({ "entry_details.supplier_id": actions_filter.supplier_id });
        // }
        // let where = {
        //   $and: and,
        // };
        let pipeline = [
            {
                $match: {
                    category: { $nin: ["Insulated Profile", "Kit"] },
                },
            },
            {
                $lookup: {
                    from: "accessories_input_models",
                    localField: "ref_code_id",
                    foreignField: "_id",
                    as: "accessory_detail",
                },
            },
            {
                $lookup: {
                    from: "profile_input_models",
                    localField: "ref_code_id",
                    foreignField: "_id",
                    as: "ni_detail",
                },
            },
            {
                $lookup: {
                    from: "profile_insulated_inputs",
                    localField: "ref_code_id",
                    foreignField: "_id",
                    as: "ins_detail",
                },
            },
            {
                $lookup: {
                    from: "kit_inputs",
                    localField: "ref_code_id",
                    foreignField: "_id",
                    as: "kit_detail",
                },
            },
            {
                $lookup: {
                    from: "stock_models",
                    localField: "code_id",
                    foreignField: "_id",
                    as: "stock_detail",
                    pipeline: [
                        { $match: { active: true } }
                    ]
                },
            },
            {
                $lookup: {
                    from: "loose_stock_models",
                    localField: "code_id",
                    foreignField: "_id",
                    as: "loose_stock_detail",
                    pipeline: [
                        { $match: { active: true } }
                    ]
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
                    stock_details: {
                        $switch: {
                            branches: [
                                {
                                    case: {
                                        $eq: ["$order_type", "Package"],
                                    },
                                    then: {
                                        $arrayElemAt: ["$stock_detail", 0],
                                    },
                                },
                                {
                                    case: {
                                        $eq: ["$order_type", "Loose"],
                                    },
                                    then: {
                                        $arrayElemAt: ["$loose_stock_detail", 0],
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
                $lookup: {
                    from: "currency_models",
                    localField: "entry_details.lookup_supplier.currency_id",
                    foreignField: "_id",
                    as: "lookup_currency",
                },
            },
            {
                $lookup: {
                    from: "finishes",
                    localField: "entry_details.finish_id",
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
                                                    $eq: ["$$color._id", "$entry_details.color_id"],
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
                            $match: {
                                $or: [{ category: "Accessory" }, { category: "Kit" }],
                            },
                        },
                        {
                            $lookup: {
                                from: "materials",
                                localField: "entry_details.material_id",
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
                                                                $eq: ["$$grade._id", "$entry_details.grade_id"],
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
                                $or: [
                                    { category: "Non-Insulated Profile" },
                                    { category: "Insulated Profile" },
                                ],
                            },
                        },
                        {
                            $lookup: {
                                from: "raw_material_models",
                                localField: "entry_details.material_id",
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
                                                                $eq: ["$$grade._id", "$entry_details.grade_id"],
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
                                        $eq: ["$category", "Accessory"],
                                    },
                                    then: {
                                        $arrayElemAt: ["$lookup_material.name", 0],
                                    },
                                },
                                {
                                    case: {
                                        $eq: ["$category", "Non-Insulated Profile"],
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
                                        $eq: ["$category", "Accessory"],
                                    },
                                    then: {
                                        $arrayElemAt: ["$lookup_material.grade.name", 0],
                                    },
                                },
                                {
                                    case: {
                                        $eq: ["$category", "Non-Insulated Profile"],
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
                                        $eq: ["$category", "Non-Insulated Profile"],
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
                                        $eq: ["$category", "Non-Insulated Profile"],
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
                                            $eq: ["$category", "Accessory"],
                                        },
                                        then: {
                                            $arrayElemAt: ["$lookup_material.name", 0],
                                        },
                                    },
                                    {
                                        case: {
                                            $eq: ["$category", "Non-Insulated Profile"],
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
                                            $eq: ["$category", "Accessory"],
                                        },
                                        then: {
                                            $arrayElemAt: ["$lookup_material.grade.name", 0],
                                        },
                                    },
                                    {
                                        case: {
                                            $eq: ["$category", "Non-Insulated Profile"],
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
            {
                $lookup: {
                    from: "inquiry_models",
                    localField: "inquiryId",
                    foreignField: "_id",
                    as: "inquiryDetail",
                    pipeline: [
                        {
                            $match: { "status": "Active" }
                        }
                    ]
                },
            },
            {
                $lookup: {
                    from: "purchase_models",
                    localField: "purchaseOrderId",
                    foreignField: "_id",
                    as: "purchaseOrderDetail",
                    pipeline: [
                        {
                            $match: { "status": "Active" }
                        }
                    ]
                },
            },

            {
                $project: {
                    _id: 1,
                    code_id: 1,
                    ref_code_id: 1,
                    order_type: 1,
                    category: 1,
                    entry_details: 1,
                    stock_details: 1,
                    updatedAt: 1,
                    inquiryDetail: 1,
                    purchaseOrderDetail: 1
                },
            },
        ];
        if (supplier) {
            pipeline.push({
                $match: {
                    "entry_details.supplier_id": new mongoose.Types.ObjectId(supplier),
                },
            });
        }
        if (dateFrom && dateTill) {
            pipeline.push({
                $match: {
                    $and: [
                        { updatedAt: { $gte: new Date(`${dateFrom}T00:00:00.000Z`) } },
                        { updatedAt: { $lte: new Date(`${dateTill}T23:59:59.999Z`) } },
                    ],
                },
            });
        }
        if (search) {
            pipeline.push({
                $match: {
                    $or: [
                        { "entry_details.code": search },
                        { "stock_details.code": search },
                    ],
                },
            });
        }
        if (sortBy) {
            let sortVal;
            if (sortBy == "date_asc") {
                sortVal = { updatedAt: 1 };
            } else if (sortBy == "date_desc") {
                sortVal = { updatedAt: -1 };
            } else if (sortBy == "code_asc") {
                sortVal = { "entry_details.code": 1 };
            } else if (sortBy == "code_desc") {
                sortVal = { "entry_details.code": -1 };
            }

            pipeline.push({
                $sort: sortVal,
            });
        }
        const actions = await Action_model.aggregate(pipeline);
        return res.status(200).json(actions);
    } catch (error) {
        console.log(error);
        res.status(500).json({ mssg: error?.message || 'Internal server error' })
    }
};

const get_action = async (req, res) => {
    try {
        const { code_supplier } = req.query;
        let and = [{}];
        if (code_supplier) {
            and.push({ "entry_details.supplier": code_supplier });
        }
        let where = {
            $and: and,
        };
        const actions = await Action_model.aggregate([
            {
                $lookup: {
                    from: "accessories_input_models",
                    localField: "ref_code_id",
                    foreignField: "_id",
                    as: "accessory_detail",
                },
            },
            {
                $lookup: {
                    from: "profile_input_models",
                    localField: "ref_code_id",
                    foreignField: "_id",
                    as: "ni_detail",
                },
            },
            {
                $lookup: {
                    from: "profile_insulated_inputs",
                    localField: "ref_code_id",
                    foreignField: "_id",
                    as: "ins_detail",
                },
            },
            {
                $lookup: {
                    from: "kit_inputs",
                    localField: "ref_code_id",
                    foreignField: "_id",
                    as: "kit_detail",
                },
            },
            {
                $lookup: {
                    from: "stock_models",
                    localField: "code_id",
                    foreignField: "_id",
                    as: "stock_detail",
                    pipeline: [
                        { $match: { active: true } }
                    ]
                },
            },
            {
                $lookup: {
                    from: "loose_stock_models",
                    localField: "code_id",
                    foreignField: "_id",
                    as: "loose_stock_detail",
                    pipeline: [
                        { $match: { active: true } }
                    ]
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
                    stock_details: {
                        $switch: {
                            branches: [
                                {
                                    case: {
                                        $eq: ["$order_type", "Package"],
                                    },
                                    then: {
                                        $arrayElemAt: ["$stock_detail", 0],
                                    },
                                },
                                {
                                    case: {
                                        $eq: ["$order_type", "Loose"],
                                    },
                                    then: {
                                        $arrayElemAt: ["$loose_stock_detail", 0],
                                    },
                                },
                            ],
                            default: null, // Default value if none of the conditions match
                        },
                    },
                },
            },
            {
                $project: {
                    _id: 1,
                    code_id: 1,
                    ref_code_id: 1,
                    order_type: 1,
                    category: 1,
                    entry_details: 1,
                    stock_details: 1,
                    updatedAt: 1,
                },
            },
            {
                $match: where,
                // "entry_details.supplier": `${actions_filter?.supplier}`,
            },
        ]);
        return res.status(200).json(actions);
    } catch (error) {
        console.log(error);
        res.status(500).json({ mssg: error?.message || 'Internal server error' })
    }
};

const get_single_actions = async (req, res) => {
    try {
        const { code } = req.params;
        const actions = await Action_model.find({ code: code }).sort({
            createdAt: -1,
        });
        return res.status(200).json(actions);
    } catch (error) {
        console.log(error);
        res.status(500).json({ mssg: error?.message || 'Internal server error' })
    }
};
const get_actions_filter_data = async (req, res) => {
    try {
        const supplier = await Action_model.aggregate([
            {
                $lookup: {
                    from: "accessories_input_models",
                    localField: "ref_code_id",
                    foreignField: "_id",
                    as: "accessory_detail",
                },
            },
            {
                $lookup: {
                    from: "profile_input_models",
                    localField: "ref_code_id",
                    foreignField: "_id",
                    as: "ni_detail",
                },
            },
            {
                $lookup: {
                    from: "profile_insulated_inputs",
                    localField: "ref_code_id",
                    foreignField: "_id",
                    as: "ins_detail",
                },
            },
            {
                $lookup: {
                    from: "kit_inputs",
                    localField: "ref_code_id",
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
                    from: "accessories_supplier_models",
                    localField: "details.supplier_id",
                    foreignField: "_id",
                    as: "supplierDetail",
                },
            },
            {
                $project: {
                    _id: 1,
                    code_id: 1,
                    ref_code_id: 1,
                    order_type: 1,
                    category: 1,
                    details: 1,
                    supplierDetail: {
                        $arrayElemAt: ["$supplierDetail", 0],
                    },
                },
            },
            {
                $match: {
                    category: { $nin: ["Insulated Profile", "Kit"] },
                },
            },
            {
                $group: {
                    _id: "$supplierDetail._id",
                    name: { $first: "$supplierDetail.name" },
                },
            },
        ]);
        return res.status(200).json(supplier);
    } catch (error) {
        console.log(error);
        res.status(500).json({ mssg: error?.message || 'Internal server error' })
    }
};


const create_new_actions = async (req, res) => {
    try {
        // // For Stocks
        // const stock = await Stock_model.find()
        // Promise.all(
        //     stock.map(async (itm) => {
        //         if (itm.msq > itm.free_inventory) {
        //             const new_notification = await Action_model.create({
        //                 code_id: itm._id,
        //                 ref_code_id: itm.reference_code_id,
        //                 category: itm.category,
        //             });
        //         }
        //     })
        // )

        // // For Loose Stocks
        const stock = await Loose_Stock_model.find()
        Promise.all(
            stock.map(async (itm) => {
                if (itm.msq > itm.free_inventory) {
                    const new_notification = await Action_model.create({
                        code_id: itm._id,
                        ref_code_id: itm.code_id,
                        category: itm.category,
                    });
                }
            })
        )
        return res.json(stock)
    } catch (error) {
        console.log(error)
        res.status(500).json({ mssg: error?.message || 'Internal server error' })
    }
}

module.exports = {
    get_actions,
    get_single_actions,
    get_actions_filter_data,
    get_action,
    create_new_actions
};
