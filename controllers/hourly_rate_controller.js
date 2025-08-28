const Operations_Model = require("../models/extrusion_model");
const Hourly_Rate = require("../models/hourly_rate_model");

const add_hourly_rate = async (req, res) => {
  try {
    const { type, cost, unit } = req.body;
    if (!type || cost === null || isNaN(cost) || !unit) {
      return res.status(400).json({ mssg: "All Fields Are Mandatory" });
    }
    const new_rate = await Hourly_Rate.create({
      type,
      cost,
      unit,
    });
    return res.status(200).json({ mssg: "Hourly Rate Added" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};
const get_hourly_rate = async (req, res) => {
  try {
    const entries = await Hourly_Rate.find({});
    return res.status(200).json(entries);
  } catch (error) {
    console.log(error);
    return res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};

const get_single_rate = async (req, res) => {
  try {
    const id = req.params.id;
    const entries = await Hourly_Rate.findById(id);
    return res.status(200).json(entries);
  } catch (error) {
    console.log(error);
    return res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};

const update_rate = async (req, res) => {
  try {
    const id = req.params.id;
    const { type, cost, unit } = req.body;
    if (!type || cost === null || isNaN(cost) || !unit) {
      return res.status(400).json({ mssg: "All Fields Are Mandatory" });
    }
    const updated_rate = await Hourly_Rate.findByIdAndUpdate(id, {
      type,
      cost,
      unit,
    });
    return res.status(200).json({ mssg: "Hourly Rate Updated" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};

const delete_rate = async (req, res) => {
  try {
    const id = req.params.id;
    const deleted_rate = await Hourly_Rate.findByIdAndDelete(id);
    // console.log(cost_usd_per_kg,fluctuation,cost_with_fluctuation)
    return res.status(200).json({ mssg: "Rate Deleted" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};
const hourly_rate_assigned_to = async (req, res) => {
  try {
    const { id } = req.params;
    const rate_detail = await Hourly_Rate.findById(id);
    const operational_rate = await Operations_Model.aggregate([
      {
        $match: {
          unit: { $in: [rate_detail.type] },
        },
      },
      {
        $project: {
          operation: 1,
        },
      },
    ]);
    return res.status(200).json(operational_rate);
  } catch (error) {
    console.log(error);
    return res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};

module.exports = {
  add_hourly_rate,
  get_hourly_rate,
  delete_rate,
  get_single_rate,
  update_rate,
  hourly_rate_assigned_to,
};
