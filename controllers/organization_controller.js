const Organization = require("../models/organization_model");

const add_Organization = async (req, res) => {
  try {
    const organization = JSON.parse(req.body.organization);
    const { org_name, address, tax_number, email, phone, website } =
      organization;
    const org_logo =
      req.file != {} && req.file !== undefined
        ? `${process.env.BACKENDURL}/uploads/${req.file.filename}`
        : organization.org_logo;
    const new_Organization = await Organization.create({
      org_logo: org_logo,
      org_name,
      address,
      tax_number,
      email,
      phone,
      website,
    });
    return res.status(200).json({ mssg: "Organization Added" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};

const get_Organization = async (req, res) => {
  try {
    const data = await Organization.find();
    res.status(200).json({ data });
  } catch (error) {
    console.log(error);
    return res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};

const filter_Organization = async (req, res) => {
  try {
    const { selectedOrg } = req.query;
    const data = await Organization.findOne({ org_name: selectedOrg });
    res.status(200).json({ data });
  } catch (error) {
    console.log(error);
    return res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};

const get_OrganizationById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await Organization.findById(id);
    res.status(200).json({ data });
  } catch (error) {
    console.log(error);
    return res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};

const update_Organization = async (req, res) => {
  try {
    const { id } = req.params;
    const organization = JSON.parse(req.body.organization);
    const { org_name, address, tax_number, email, phone, website } =
      organization;
    const org_logo =
      req.file != {} && req.file !== undefined
        ? `${process.env.BACKENDURL}/uploads/${req.file.filename}`
        : organization.org_logo;
    const data = await Organization.findByIdAndUpdate(
      id,
      {
        org_logo: org_logo,
        org_name,
        address,
        tax_number,
        email,
        phone,
        website,
      },
      { new: true }
    );
    res.status(200).json({ mssg: "Data Updated", data });
  } catch (error) {
    console.log(error);
    return res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};

const delete_Organization = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await Organization.findByIdAndDelete(id);
    res.status(200).json({ mssg: "Data Deleted", data });
  } catch (error) {
    console.log(error);
    return res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};

module.exports = {
  add_Organization,
  get_Organization,
  get_OrganizationById,
  update_Organization,
  delete_Organization,
  filter_Organization,
};
