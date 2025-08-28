const Coating = require("../models/Coating");

function isValidProduct(product) {
  const requiredFields = [
    "product_desc",
    "product_code",
    "color_desc",
    "color_code",
    "color_thickness",
    "color_specs",
  ];
  return requiredFields.every(
    (field) => product[field] && product[field].trim() !== ""
  );
}

function isValidEntry(entry) {
  return (
    entry.supplier &&
    entry.supplier.trim() !== "" &&
    Array.isArray(entry.product) &&
    entry.product.length > 0 &&
    entry.product.every(isValidProduct)
  );
}

function validateData(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return false;
  }

  // Filter out invalid entries
  const invalidEntries = data.filter((entry) => !isValidEntry(entry));

  // If there are any invalid entries, return false
  return invalidEntries.length === 0;
}

const add_coating = async (req, res) => {
  try {
    const { type, mainState } = req.body;
    if (type == "") {
      return res.status(400).json({ mssg: "All Fields Are Mandatory" });
    }
    const is_valid = await validateData(mainState);
    if (!is_valid) {
      return res.status(400).json({ mssg: "All Fields Are Mandatory" });
    }
    const new_coating = await Coating.create({
      type,
      product_detail: mainState,
    });
    return res.status(200).json({ mssg: "Coating Added" });
  } catch (error) {
    console.log(error);
    res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};

const get_all_coatings = async (req, res) => {
  try {
    let { search, page, filter } = req.query;
    let searchRegex = { $regex: new RegExp(".*" + search + ".*", "i") };
    const limit = 10;
    const pageNumber = parseFloat(page) || 1;
    const skip = (pageNumber - 1) * limit;
    let and = [{}];
    let where = {
      $or: [
        { type: searchRegex },
        { "product_detail.supplier": searchRegex },
        { "product_detail.product.product_desc": searchRegex },
        { "product_detail.product.product_code": searchRegex },
      ],
      $and: and,
    };
    const result = await Coating.find(where)
      .limit(limit)
      .skip(skip)
      .sort({ type: 1 });
    const totalCount = await Coating.countDocuments(where);
    const currentPage = pageNumber;
    const total_page = Math.ceil(totalCount / limit);
    return res
      .status(200)
      .json({ result, currentPage, total_page, totalCount, limit });
  } catch (error) {
    console.log(error);
    res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};

const get_single_coating = async (req, res) => {
  try {
    const { id } = req.params;
    const coating = await Coating.findById(id);
    return res.status(200).json(coating);
  } catch (error) {
    console.log(error);
    res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};

const update_coating = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, mainState } = req.body;
    if (type == "") {
      return res.status(400).json({ mssg: "All Fields Are Mandatory" });
    }
    const is_valid = await validateData(mainState);
    if (!is_valid) {
      return res.status(400).json({ mssg: "All Fields Are Mandatory" });
    }
    const new_coating = await Coating.findByIdAndUpdate(id, {
      type,
      product_detail: mainState,
    });
    return res.status(200).json({ mssg: "Coating Updated" });
  } catch (error) {
    console.log(error);
    res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};

module.exports = {
  add_coating,
  get_all_coatings,
  get_single_coating,
  update_coating,
};
