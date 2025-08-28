const Packaging = require("../models/packaging_material_model");
const Packaging_Unit = require("../models/packaging_unit_model");
const Stock_model = require("../models/stock_model");

const add_material = async (req, res) => {
  try {
    const { unit, material_form } = req.body;
    if (!unit || material_form.length == 0) {
      return res.status(400).json({ mssg: "All Fields Are Mandatory" });
    }
    const new_material = await Packaging.create({
      unit,
      detail: material_form,
    });
    return res.status(200).json({ mssg: "Packaging Added" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};
const get_material = async (req, res) => {
  try {
    let { search } = req.query;
    let searchRegex = { $regex: new RegExp(".*" + search + ".*", "i") };
    let and = [{}];
    let where = {
      $or: [{ unit: searchRegex }, { "detail.material": searchRegex }],
      $and: and,
    };
    // const result = await Packaging.find(where).sort({ material: 1 });
    const result = await Packaging.aggregate([
      { $match: where }, // Match the documents based on your criteria
      {
        $addFields: {
          detail: {
            $sortArray: { input: "$detail", sortBy: { material: 1 } },
          },
        },
      },
      { $sort: { unit: 1 } }, // Sort top-level documents if needed
    ]);
    return res.status(200).json(result);
  } catch (error) {
    console.log(error);
    return res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};

const get_single_material = async (req, res) => {
  try {
    const id = req.params.id;
    const entries = await Packaging.findById(id);
    return res.status(200).json(entries);
  } catch (error) {
    console.log(error);
    return res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};

const update_material = async (req, res) => {
  try {
    const id = req.params.id;
    const { unit, material_form } = req.body;
    if (!unit || material_form.length == 0) {
      return res.status(400).json({ mssg: "All Fields Are Mandatory" });
    }
    const updated_rate = await Packaging.findByIdAndUpdate(id, {
      unit,
      detail: material_form,
    });
    return res.status(200).json({ mssg: "Packaging Material Updated" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};

const delete_material = async (req, res) => {
  try {
    const id = req.params.id;
    const deleted_rate = await Packaging.findByIdAndDelete(id);
    // console.log(cost_usd_per_kg,fluctuation,cost_with_fluctuation)
    return res.status(200).json({ mssg: "Packaging Material Deleted" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};
const material_assigned_to = async (req, res) => {
  try {
    const { id } = req.params;
    const material_detail = await Packaging.findById(id);
    const assigned_materials = await Stock_model.aggregate([
      {
        $match: {
          packing_material: material_detail.material,
        },
      },
      {
        $project: {
          packing_code: 1,
        },
      },
    ]);
    return res.status(200).json({ assigned_materials });
  } catch (error) {
    console.log(error);
    return res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};

const add_unit = async (req, res) => {
  try {
    // console.log(...req.body);
    const { code, reference, unit, qty, material, packing_cost, itm_cost } =
      req.body;
    if (
      !code ||
      !reference ||
      !unit ||
      !qty ||
      !material ||
      isNaN(packing_cost) ||
      isNaN(itm_cost)
    ) {
      return res.status(400).json({ mssg: "All Fields Are Mandatory" });
    }
    const new_unit = await Packaging_Unit.create({
      packing_code: code,
      reference,
      packing_unit: unit,
      packing_quantity: qty,
      packing_material: material,
      packing_cost,
      packing_itm_cost: itm_cost,
      packing_total_cost: itm_cost * qty + packing_cost,
    });
    return res.status(200).json({ mssg: "New Unit Added" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};

const get_units = async (req, res) => {
  try {
    const { search, page, filter } = req.query;
    let searchRegex = { $regex: new RegExp(".*" + search + ".*", "i") };
    const limit = 10;
    const pageNumber = parseInt(page) || 1;
    const skip = (pageNumber - 1) * limit;
    let and = [{}];
    if (filter?.unit) {
      and.push({ unit: filter.unit });
    }
    if (filter?.material) {
      and.push({ material: filter.material });
    }
    let where = {
      $or: [{ code: searchRegex }, { reference: searchRegex }],
      $and: and,
    };
    const result = await Packaging_Unit.find(where)
      .limit(limit)
      .sort({ code: 1 })
      .skip(skip);

    const totalCount = await Packaging_Unit.countDocuments(where);
    const currentPage = pageNumber;
    const total_page = Math.ceil(totalCount / limit);
    return res
      .status(200)
      .json({ result, currentPage, total_page, totalCount, limit });
  } catch (error) {
    console.log(error);
    return res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};
const get_single_unit = async (req, res) => {
  try {
    const id = req.params.id;
    const entries = await Packaging_Unit.findById(id);
    return res.status(200).json(entries);
  } catch (error) {
    console.log(error);
    return res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};

const update_unit = async (req, res) => {
  try {
    const id = req.params.id;
    const { code, reference, unit, qty, material, packing_cost, itm_cost } =
      req.body;
    if (
      !code ||
      !reference ||
      !unit ||
      !qty ||
      !material ||
      isNaN(packing_cost) ||
      isNaN(itm_cost)
    ) {
      return res.status(400).json({ mssg: "All Fields Are Mandatory" });
    }
    const updated_unit = await Packaging_Unit.findByIdAndUpdate(id, {
      packing_code: code,
      reference,
      packing_unit: unit,
      packing_quantity: qty,
      packing_material: material,
      packing_cost,
      packing_itm_cost: itm_cost,
      packing_total_cost: itm_cost * qty + packing_cost,
    });
    return res.status(200).json({ mssg: "Packaging Unit Updated" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};

const delete_unit = async (req, res) => {
  try {
    const id = req.params.id;
    const deleted_unit = await Packaging_Unit.findByIdAndDelete(id);
    // console.log(cost_usd_per_kg,fluctuation,cost_with_fluctuation)
    return res.status(200).json({ mssg: "Packaging Unit Deleted" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};
const get_unit_type = async (req, res) => {
  try {
    const material = await Packaging.aggregate([
      { $unwind: "$detail" }, // Deconstructs the detail array
      {
        $group: {
          _id: "$detail.material",
          cost: { $first: "$detail.cost" }, // Gets the first cost found for this material
        },
      },
      { $project: { _id: 0, material: "$_id", cost: 1 } }, // Project the desired fields
      {
        $sort: {
          material: 1,
        },
      },
    ]);
    return res.status(200).json(material);
  } catch (error) {
    console.log(error);
    return res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};
module.exports = {
  add_material,
  get_material,
  get_single_material,
  update_material,
  delete_material,
  material_assigned_to,
  add_unit,
  get_units,
  get_single_unit,
  update_unit,
  delete_unit,
  get_unit_type,
};
