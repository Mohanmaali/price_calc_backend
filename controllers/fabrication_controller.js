const Fabrication = require("../models/fabrication");

const addFabrication = async (req, res) => {
  try {
    const { activity } = req.body;
    if (activity == "") {
      return res.status(400).json({ mssg: "All Fields Are Mandatory" });
    }
    const new_fab = await Fabrication.create({
      activity: activity,
    });
    return res.status(200).json({ mssg: "New Fabrication Created" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};

const getAllFabrications = async (req, res) => {
  try {
    const all_fab = await Fabrication.find({});
    return res.status(200).json(all_fab);
  } catch (error) {
    console.log(error);
    return res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};

const getSingleFabrication = async (req, res) => {
  try {
    const { id } = req.params;
    const fabrication = await Fabrication.findById(id);
    return res.status(200).json(fabrication);
  } catch (error) {
    console.log(error);
    return res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};

const updateFabrication = async (req, res) => {
  try {
    const { id } = req.params;
    const { activity } = req.body;
    if (activity == "") {
      return res.status(400).json({ mssg: "All Fields Are Mandatory" });
    }
    const new_fab = await Fabrication.findByIdAndUpdate(id, {
      activity: activity,
    });
    return res.status(200).json({ mssg: "Fabrication Updated" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};

module.exports = {
  addFabrication,
  getAllFabrications,
  getSingleFabrication,
  updateFabrication,
};
