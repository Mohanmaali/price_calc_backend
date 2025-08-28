const Accessories_Input_Model = require("../models/accessories_input_model");
const Accessories_Supplier_Model = require("../models/accessories_supplier_model");
const Currency_model = require("../models/currency_model");
const AccessoriesCalculator = require("../models/accessories_calculator_model");
const Stock_model = require("../models/stock_model");
const xlsx = require("xlsx");
const fs = require("fs");
const Profile_Input_Model = require("../models/profile_input_model");
const {
    Profile_Insulated_Input,
} = require("../models/profile_insulated_input");
const Kit_Input = require("../models/kit_model");
const Loose_Stock_model = require("../models/loose_stock_model");
const Project_Model = require("../models/project_model");
const { Purchase_Model } = require("../models/purchase_order_model");
const { default: mongoose } = require("mongoose");

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
        return res.status(500).json({
            mssg: error?.message || 'Internal server error'
          })
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
        return res.status(500).json({
            mssg: error?.message || 'Internal server error'
          })
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
        return res.status(500).json({
            mssg: error?.message || 'Internal server error'
          })
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
        return res.status(500).json({
            mssg: error?.message || 'Internal server error'
          })
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
        return res.status(500).json({
            mssg: error?.message || 'Internal server error'
          })
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
        return res.status(500).json({
            mssg: error?.message || 'Internal server error'
          })
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
        return res.status(500).json({
            mssg: error?.message || 'Internal server error'
          })
    }
};
const code_acc_to_supplier = async (req, res) => {
    try {
        const { supplier } = req.params;
        let { search } = req.query;
        const searchRegex = new RegExp(".*" + search + ".*", "i");
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
                $lookup: {
                    from: "action_models",
                    localField: "stock.0._id",
                    foreignField: "code_id",
                    as: "action_matches"
                }
            },
            {
                $addFields: {
                    hasAction: { $gt: [{ $size: "$action_matches" }, 0] }
                }
            },
            {
                $match: {
                    "stock.0.active": true
                }
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
                    hasAction: 1
                },
            },
            {
                $match: {
                    $or: [
                        { "code": searchRegex },
                        { "stock.packing_code": searchRegex },
                    ]
                }
            }
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
                $lookup: {
                    from: "action_models",
                    localField: "stock.0._id",
                    foreignField: "code_id",
                    as: "action_matches"
                }
            },
            {
                $addFields: {
                    hasAction: { $gt: [{ $size: "$action_matches" }, 0] }
                }
            },
            {
                $match: {
                    "stock.0.active": true
                }
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
                    order_type: "Package",
                    hasAction: 1,

                    stock: { $arrayElemAt: ["$stock", 0] },
                    category: "Non-Insulated Profile",
                    order_type: "Package",
                    hasAction: 1
                },
            },
            {
                $match: {
                    $or: [
                        { "code": searchRegex },
                        { "stock.packing_code": searchRegex },
                    ]
                }
            }
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
        return res.status(500).json({
            mssg: error?.message || 'Internal server error'
          })
    }
};
const code_acc_to_supplier_for_loose = async (req, res) => {
    try {
        const { supplier } = req.params;
        let { search } = req.query;
        const searchRegex = new RegExp(".*" + search + ".*", "i");
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
                $lookup: {
                    from: "action_models",
                    localField: "loose_stock.0._id",
                    foreignField: "code_id",
                    as: "action_matches"
                }
            },
            {
                $addFields: {
                    hasAction: { $gt: [{ $size: "$action_matches" }, 0] }
                }
            },
            {
                $match: {
                    "loose_stock.0.active": true
                }
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
                    code_id: {
                        $arrayElemAt: ["$loose_stock._id", 0],
                    },
                    reference_code: 1,
                    ref_code_id: "$_id",
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
                    hasAction: 1
                },
            },
            {
                $match: {
                    $or: [
                        { "code": searchRegex },
                    ]
                }
            }
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
                $lookup: {
                    from: "action_models",
                    localField: "loose_stock.0._id",
                    foreignField: "code_id",
                    as: "action_matches"
                }
            },
            {
                $addFields: {
                    hasAction: { $gt: [{ $size: "$action_matches" }, 0] }
                }
            },
            {
                $match: {
                    "loose_stock.0.active": true
                }
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
                    hasAction: 1,
                    code_id: {
                        $arrayElemAt: ["$loose_stock._id", 0],
                    },
                    ref_code_id: "$_id"
                },
            },
            {
                $match: {
                    $or: [
                        { "code": searchRegex },
                    ]
                }
            }
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
        return res.status(500).json({
            mssg: error?.message || 'Internal server error'
          })
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
        return res.status(500).json({
            mssg: error?.message || 'Internal server error'
          })
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
}