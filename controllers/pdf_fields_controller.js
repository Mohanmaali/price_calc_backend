const PDF_Fields = require("../models/pdf_fields");

const getPDF_Fields = async (req, res) => {
  try {
    const id = "67ce828d7fd8c601c2c254f9";
    const fields = await PDF_Fields.findById(id);
    return res.status(200).json(fields);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: "Failed, Some Error Occured" });
  }
};

const updatePDF_Fields = async (req, res) => {
  try {
    const id = "67ce828d7fd8c601c2c254f9";
    const { reference_code_rev, form_rev_date } = req.body;
    const updatedFields = await PDF_Fields.findByIdAndUpdate(id, {
      reference_code_rev,
      form_rev_date,
    });
    return res.status(200).json({ mssg: "PDF Fields Updated" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: "Failed, Some Error Occured" });
  }
};

module.exports = { updatePDF_Fields, getPDF_Fields };
