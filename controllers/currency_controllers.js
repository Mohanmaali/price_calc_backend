const { default: mongoose } = require("mongoose");
const Accessories_Input_Model = require("../models/accessories_input_model");
const Accessories_Supplier_Model = require("../models/accessories_supplier_model");
const Currency_model = require("../models/currency_model");
const Operations_Model = require("../models/extrusion_model");
const Raw_Material_Model = require("../models/raw_material_model");

const add_currency = async (req, res) => {
  try {
    // console.log(req.body)
    const { name, code, regularUpdate } = req.body;
    const fluctuation = Number(req.body.fluctuation);
    const cost_usd_per_kg = Number(req.body.cost_usd_per_kg);
    if (
      !name ||
      !code ||
      req.body.fluctuation === null ||
      isNaN(req.body.fluctuation) ||
      req.body.cost_usd_per_kg === null ||
      isNaN(req.body.cost_usd_per_kg)
    ) {
      return res.status(400).json({ mssg: "All Fields Are Mandatory" });
    }
    const cost_with_fluctuation =
      cost_usd_per_kg + (fluctuation / 100) * cost_usd_per_kg;
    const if_currency = await Currency_model.findOne({
      $or: [{ name: name }, { code: code }],
    });
    if (if_currency) {
      return res
        .status(400)
        .json({ mssg: "A Currency already exists with this code or name" });
    }
    const new_currency = await Currency_model.create({
      name,
      code,
      fluctuation,
      cost_usd_per_kg,
      cost_usd_per_kg_plus_fluctuation: cost_with_fluctuation,
      regularUpdate
    });
    // console.log(cost_usd_per_kg,fluctuation,cost_with_fluctuation)
    return res.status(200).json({ mssg: "New Currency Added" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ mssg: error?.message || 'Internal server error' })
  }
};
const get_all_currency = async (req, res) => {
  try {
    const all_currency = await Currency_model.find({});
    return res.status(200).json(all_currency);
  } catch (error) {
    console.log(error);
    res.status(500).json({ mssg: error?.message || 'Internal server error' })
  }
};
const get_single_currency = async (req, res) => {
  try {
    const id = req.params.id;
    const currency = await Currency_model.findById(id);
    return res.status(200).json(currency);
  } catch (error) {
    console.log(error);
    res.status(500).json({ mssg: error?.message || 'Internal server error' })
  }
};
const update_currency = async (req, res) => {
  try {
    // console.log(req.body)
    const id = req.params.id;
    const { name, code, regularUpdate } = req.body;
    const fluctuation = Number(req.body.fluctuation);
    const cost_usd_per_kg = Number(req.body.cost_usd_per_kg);
    if (
      !name ||
      !code ||
      req.body.fluctuation === null ||
      isNaN(req.body.fluctuation) ||
      req.body.cost_usd_per_kg === null ||
      isNaN(req.body.cost_usd_per_kg)
    ) {
      return res.status(400).json({ mssg: "All Fields Are Mandatory" });
    }
    const cost_with_fluctuation =
      cost_usd_per_kg + (fluctuation / 100) * cost_usd_per_kg;
    const new_currency = await Currency_model.findByIdAndUpdate(id, {
      name,
      code,
      fluctuation,
      cost_usd_per_kg,
      cost_usd_per_kg_plus_fluctuation: cost_with_fluctuation,
      regularUpdate
    });
    // console.log(cost_usd_per_kg,fluctuation,cost_with_fluctuation)
    await update_raw_material_for_currency(id)
    return res.status(200).json({ mssg: "Currency Updated" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ mssg: error?.message || 'Internal server error' })
  }
};
const delete_currency = async (req, res) => {
  try {
    const id = req.params.id;
    const deleted_currency = await Currency_model.findByIdAndDelete(id);
    // console.log(cost_usd_per_kg,fluctuation,cost_with_fluctuation)
    return res.status(200).json({ mssg: "Currency Deleted" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ mssg: error?.message || 'Internal server error' })
  }
};
const currency_assigned_to = async (req, res) => {
  try {
    const { id } = req.params;
    const raw_material_currency = await Raw_Material_Model.aggregate([
      {
        $match: { currency_id: new mongoose.Types.ObjectId(id) },
      },
      {
        $project: {
          name: 1,
        },
      },
    ]);
    const operation_currency = await Operations_Model.aggregate([
      {
        $match: { currency_id: new mongoose.Types.ObjectId(id) },
      },
      {
        $lookup: {
          from: "accessories_supplier_models",
          localField: "supplier_id",
          foreignField: "_id",
          as: "lookupSupplier",
        },
      },
      {
        $project: {
          name: 1,
          supplier: { $arrayElemAt: ["$lookupSupplier.name", 0] },
        },
      },
    ]);
    const supplier_currency = await Accessories_Supplier_Model.aggregate([
      {
        $match: { currency_id: new mongoose.Types.ObjectId(id) },
      },
      {
        $project: {
          name: 1,
        },
      },
    ]);
    const accessories_input_currency = await Accessories_Input_Model.aggregate([
      {
        $lookup: {
          from: "accessories_supplier_models",
          localField: "supplier_id",
          foreignField: "_id",
          as: "supplierDetail",
        },
      },
      {
        $match: {
          "supplierDetail.currency_id": new mongoose.Types.ObjectId(id),
        },
      },
      {
        $project: {
          code: 1,
        },
      },
    ]);
    // const profile_currency = await Profile_Input_Model.aggregate(pipeline);

    return res.status(200).json({
      raw_material_currency,
      operation_currency,
      supplier_currency,
      accessories_input_currency,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ mssg: error?.message || 'Internal server error' })
  }
};
const update_raw_material_for_currency = async (currency_id) => {
  try {
    const currency = await Currency_model.findById(currency_id);
    const materials = await Raw_Material_Model.find({ currency_id })
    materials.map(async (itm) => {
      const {
        _id,
        name,
        cost,
        currency_id,
        cost_aed_per_kg,
        alloy,
        temper,
        grade,
        finish,
        fluctuation
      } = itm

      const fluctuation_calc = (fluctuation / 100) * cost;
      const currency_val = currency.cost_usd_per_kg_plus_fluctuation;
      const final_cost = currency_val * (fluctuation_calc + cost);
      itm.cost_aed_per_kg = final_cost
      await itm.save()
    })
  } catch (error) {
    console.error("Error in update_raw_material_for_currency:", error)
  }
}
module.exports = {
  add_currency,
  get_all_currency,
  get_single_currency,
  update_currency,
  delete_currency,
  currency_assigned_to,

  update_raw_material_for_currency
};
