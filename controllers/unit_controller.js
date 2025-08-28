const Units = require("../models/units");

const addUnit = async (req, res) => {
  try {
    const { name } = req.body.form;
    const units = req.body.state1;
    if (name == "") {
      return res.status(400).json({ mssg: "All Fields Are Mandatory" });
    }
    const newUnit = await Units.create({ unit_name: name, unit_detail: units });
    return res.status(200).json({ mssg: "Unit Added" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};

const getUnits = async (req, res) => {
  try {
    let { search, page, filter } = req.query;
    let searchRegex = { $regex: new RegExp(".*" + search + ".*", "i") };
    const limit = 10;
    const pageNumber = parseFloat(page) || 1;
    const skip = (pageNumber - 1) * limit;
    let and = [{}];
    let where = {
      $or: [
        { unit_name: searchRegex },
        { "unit_detail.description": searchRegex },
        { "unit_detail.units.measure": searchRegex },
        { "unit_detail.units.code": searchRegex },
      ],
      $and: and,
    };
    const result = await Units.find(where)
      .limit(limit)
      .skip(skip)
      .sort({ unit_name: 1 });
    const totalCount = await Units.countDocuments(where);
    const currentPage = pageNumber;
    const total_page = Math.ceil(totalCount / limit);
    return res
      .status(200)
      .json({ result, currentPage, total_page, totalCount, limit });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};

const getSingleUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const unit = await Units.findById(id);
    return res.status(200).json(unit);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};

const updateUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body.form;
    const units = req.body.state1;
    // console.log(name, validate(units));
    if (name == "") {
      return res.status(400).json({ mssg: "All Fields Are Mandatory" });
    }
    const newUnit = await Units.findByIdAndUpdate(id, {
      unit_name: name,
      unit_detail: units,
    });
    return res.status(200).json({ mssg: "Unit Updated" });
  } catch (error) {
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};

module.exports = { addUnit, getUnits, getSingleUnit, updateUnit };
