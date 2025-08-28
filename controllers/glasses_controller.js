const Glass = require("../models/glasses");

const addGlass = async (req, res) => {
  try {
    const { code, outer_panel, spacer1, middle_panel, spacer2, inner_panel } =
      req.body;
    if (
      !code ||
      !outer_panel ||
      !spacer1 ||
      !middle_panel ||
      !spacer2 ||
      !inner_panel
    ) {
      return res.status(400).json({ mssg: "All Fields Are Mandatory" });
    }
    const new_rate = await Glass.create({
      code,
      outer_panel,
      spacer1,
      middle_panel,
      spacer2,
      inner_panel,
    });
    return res.status(200).json({ mssg: "Glass Added" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};
const get_glasses = async (req, res) => {
  try {
    const entries = await Glass.find({});
    return res.status(200).json(entries);
  } catch (error) {
    console.log(error);
    return res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};

const get_single_glass = async (req, res) => {
  try {
    const id = req.params.id;
    const entries = await Glass.findById(id);
    return res.status(200).json(entries);
  } catch (error) {
    console.log(error);
    return res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};

const update_glass = async (req, res) => {
  try {
    const id = req.params.id;
    const { code, outer_panel, spacer1, middle_panel, spacer2, inner_panel } =
      req.body;
    if (
      !code ||
      !outer_panel ||
      !spacer1 ||
      !middle_panel ||
      !spacer2 ||
      !inner_panel
    ) {
      return res.status(400).json({ mssg: "All Fields Are Mandatory" });
    }
    const updated_rate = await Glass.findByIdAndUpdate(id, {
      code,
      outer_panel,
      spacer1,
      middle_panel,
      spacer2,
      inner_panel,
    });
    return res.status(200).json({ mssg: "Glass Updated" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};

module.exports = {
  addGlass,
  get_glasses,
  get_single_glass,
  update_glass,
};
