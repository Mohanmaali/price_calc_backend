const { default: mongoose } = require("mongoose");
const Kit_Calculator = require("../models/Kit_Calc_Model");
const Currency_model = require("../models/currency_model");
const Operations_Model = require("../models/extrusion_model");
const Hourly_Rate = require("../models/hourly_rate_model");
const Kit_Input = require("../models/kit_model");
const Profile_Input_Model = require("../models/profile_input_model");

const add_extrusion = async (req, res) => {
  try {
    const {
      name,
      unit,
      currency,
      supplier,
      alloy_id,
      supplier_id,
      currency_id,
    } = req.body;
    const cost = parseFloat(req.body.cost);
    if (!name || !unit) {
      return res.status(400).json({ mssg: "All Fields Are Mandatory" });
    }
    // const if_operation = await Operations_Model.findOne({
    //   name,
    // });
    // if (if_operation) {
    //   return res
    //     .status(400)
    //     .json({ mssg: "Operation Already Exists With This Name" });
    // }
    const currency_conversion_rate = await Currency_model.findOne({
      _id: currency_id,
    });

    if (unit === "F-Hr" || unit === "S-Hr") {
      const hr_cost = await Hourly_Rate.findOne({ type: unit });
      const new_material = await Operations_Model.create({
        name,
        alloy_id:
          alloy_id == "" ? alloy_id : new mongoose.Types.ObjectId(alloy_id),
        currency_id: "66e9162fbfb740da8602f5d2", // _id of AED currency from prod DB, change for Test DB
        supplier_id,
        cost: hr_cost.cost,
        unit,
        conversion_to_aed: 1,
        cost_to_aed: hr_cost.cost,
      });
      return res.status(200).json({ mssg: "Operation Added" });
    }
    const new_material = await Operations_Model.create({
      name,
      alloy_id:
        alloy_id == "" ? alloy_id : new mongoose.Types.ObjectId(alloy_id),
      currency_id,
      supplier_id,
      cost,
      unit,
      conversion_to_aed:
        currency_conversion_rate.cost_usd_per_kg_plus_fluctuation,
      cost_to_aed:
        cost * currency_conversion_rate.cost_usd_per_kg_plus_fluctuation,
    });
    return res.status(200).json({ mssg: "Operation Added" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: error?.message || 'Internal server error' })
  }
};

const get_extrusions = async (req, res) => {
  try {
    const all_extrusions = await Operations_Model.aggregate([
      {
        $lookup: {
          from: "accessories_supplier_models",
          localField: "supplier_id",
          foreignField: "_id",
          as: "supplierDetails",
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
          from: "raw_material_models",
          localField: "alloy_id",
          foreignField: "alloy._id",
          as: "alloyDetails",
        },
      },
      {
        $addFields: {
          alloyDetails: {
            $map: {
              input: "$alloyDetails",
              as: "alloyDetail",
              in: {
                _id: "$$alloyDetail._id",
                name: "$$alloyDetail.name",
                // fluctuation: "$$alloyDetail.fluctuation",
                currency_id: "$$alloyDetail.currency_id",
                cost: "$$alloyDetail.cost",
                cost_aed_per_kg: "$$alloyDetail.cost_aed_per_kg",
                alloy: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$$alloyDetail.alloy",
                        as: "alloyEntry",
                        cond: { $eq: ["$$alloyEntry._id", "$alloy_id"] },
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
    return res.status(200).json(all_extrusions);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: error?.message || 'Internal server error' })
  }
};

const get_single_extrusion = async (req, res) => {
  try {
    const id = req.params.id;
    const extrusion = await Operations_Model.aggregate([
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
          as: "supplierDetails",
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
          from: "raw_material_models",
          localField: "alloy_id",
          foreignField: "alloy._id",
          as: "alloyDetails",
        },
      },
      {
        $addFields: {
          alloyDetails: {
            $map: {
              input: "$alloyDetails",
              as: "alloyDetail",
              in: {
                _id: "$$alloyDetail._id",
                name: "$$alloyDetail.name",
                // fluctuation: "$$alloyDetail.fluctuation",
                currency_id: "$$alloyDetail.currency_id",
                cost: "$$alloyDetail.cost",
                cost_aed_per_kg: "$$alloyDetail.cost_aed_per_kg",
                alloy: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$$alloyDetail.alloy",
                        as: "alloyEntry",
                        cond: { $eq: ["$$alloyEntry._id", "$alloy_id"] },
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
    return res.status(200).json(extrusion[0]);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: error?.message || 'Internal server error' })
  }
};

const update_extrusion = async (req, res) => {
  try {
    const id = req.params.id;
    const { name, unit, supplier, alloy_id, supplier_id, currency_id } =
      req.body.extrusion_form;
    // console.log(supplier);
    const cost = parseFloat(req.body.extrusion_form.cost);
    if (!name || !unit) {
      return res.status(400).json({ mssg: "All Fields Are Mandatory" });
    }
    const currency_conversion_rate = await Currency_model.findOne({
      _id: currency_id,
    });
    if (unit === "F-Hr" || unit === "S-Hr") {
      const hr_cost = await Hourly_Rate.findOne({ type: unit });
      const updated_material = await Operations_Model.findByIdAndUpdate(id, {
        // operation,
        // currency,
        // cost: hr_cost.cost,
        // unit,
        // conversion_to_aed: 1,
        // cost_to_aed: hr_cost.cost,
        // $set: {
        //   supplier: supplier,
        // },

        name,
        alloy_id:
          alloy_id == "" ? alloy_id : new mongoose.Types.ObjectId(alloy_id),
        currency_id: "66e9162fbfb740da8602f5d2", // _id of AED currency from prod DB, change for Test DB
        supplier_id,
        cost: hr_cost.cost,
        unit,
        conversion_to_aed: 1,
        cost_to_aed: hr_cost.cost,
      });
      return res.status(200).json({ mssg: "Operation Added" });
    }
    const updated_material = await Operations_Model.findByIdAndUpdate(id, {
      // operation,
      // currency,
      // cost,
      // unit,
      // conversion_to_aed:
      //   currency_conversion_rate.cost_usd_per_kg_plus_fluctuation,
      // cost_to_aed:
      //   cost * currency_conversion_rate.cost_usd_per_kg_plus_fluctuation,
      // $set: {
      //   supplier: supplier,
      // },
      name,
      alloy_id:
        alloy_id == "" ? alloy_id : new mongoose.Types.ObjectId(alloy_id),
      currency_id,
      supplier_id,
      cost,
      unit,
      conversion_to_aed:
        currency_conversion_rate.cost_usd_per_kg_plus_fluctuation,
      cost_to_aed:
        cost * currency_conversion_rate.cost_usd_per_kg_plus_fluctuation,
    });
    return res.status(200).json({ mssg: "Operation Updated" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: error?.message || 'Internal server error' })
  }
};

const delete_extrusion = async (req, res) => {
  try {
    const id = req.params.id;
    const deleted_material = await Operations_Model.findByIdAndDelete(id);
    return res.status(200).json({ mssg: "Operation Deleted" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: error?.message || 'Internal server error' })
  }
};
const search_operation = async (req, res) => {
  try {
    let { filter } = req.query;
    filter = filter ? JSON.parse(filter) : {};
    let searchRegex = {
      $regex: new RegExp(".*" + filter?.search + ".*", "i"),
    };

    let where = { name: searchRegex };

    let result = await Operations_Model.find(where).populate({
      path: "supplier_id",
      model: "Accessories_Supplier_Model",
    });

    return res.status(200).json({ result });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: error?.message || 'Internal server error' })
  }
};
const get_crimping = async (req, res) => {
  try {
    const crimping = await Operations_Model.findOne({ name: "Crimping" });
    return res.status(200).json(crimping);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: error?.message || 'Internal server error' })
  }
};
const operation_assigned_to = async (req, res) => {
  try {
    const { id } = req.params;
    const operation_detail = await Operations_Model.findById(id);
    if (operation_detail.name === "Crimping") {
      return res.status(200).json({
        kit_operation: [],
        crimping_as_operation:
          "Crimping Operation cannot be deleted because it is Being use in all Insulated Operations",
      });
    }
    const kit_operation = await Kit_Input.aggregate([
      {
        $match: {
          "operation.code_id": { $exists: true },

          $or: [
            {
              "operation.code_id": new mongoose.Types.ObjectId(id),
            },
          ],
        },
      },
      {
        $project: {
          code: 1,
        },
      },
    ]);

    return res.status(200).json({
      kit_operation,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: error?.message || 'Internal server error' })
  }
};
module.exports = {
  add_extrusion,
  get_extrusions,
  get_single_extrusion,
  update_extrusion,
  delete_extrusion,
  search_operation,
  get_crimping,
  operation_assigned_to,
};
