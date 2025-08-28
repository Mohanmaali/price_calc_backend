const { default: mongoose } = require("mongoose");
const Client = require("../models/client");
const Project_inquiry_Model = require("../models/project_inquiry_model");

const add_client = async (req, res) => {
  try {
    const client_form = JSON.parse(req.body.client_form);
    const { name, code } = client_form;
    let { type } = req.body;
    type = JSON.parse(type)
    
    const { currency_id } = req.body;
    const company_contacts = JSON.parse(req.body.company_contact);
    const contacts = JSON.parse(req.body.contacts);
    const trn = JSON.parse(req.body.trn);
    const trade = JSON.parse(req.body.trade);
    const auth_sign = JSON.parse(req.body.auth_sign);
    const { remark } = req.body;
    const logofile =
      req.files != {} && req.files.logofile !== undefined
        ? `${process.env.BACKENDURL}/uploads/${req.files?.logofile[0].filename}`
        : client_form.logofile;
    const trn_file =
      req.files != {} && req.files.trn_file !== undefined
        ? `${process.env.BACKENDURL}/uploads/${req.files?.trn_file[0].filename}`
        : trn.file;
    const trade_file =
      req.files != {} && req.files.trade_file !== undefined
        ? `${process.env.BACKENDURL}/uploads/${req.files?.trade_file[0].filename}`
        : trade.file;
    const auth_file =
      req.files != {} && req.files.auth_file !== undefined
        ? `${process.env.BACKENDURL}/uploads/${req.files?.auth_file[0].filename}`
        : auth_sign.file;
    const auth_idfile =
      req.files != {} && req.files.auth_idfile !== undefined
        ? `${process.env.BACKENDURL}/uploads/${req.files?.auth_idfile[0].filename}`
        : auth_sign.file;
    if (
      !name ||
      !code ||
      !currency_id ||
      !type
      //  ||
      // !trn.number ||
      // !trade.number ||
      // !auth_sign.number ||
      // !auth_sign.poa
    ) {
      return res
        .status(400)
        .json({ mssg: "Client Name, Code, Currency and Type Are Required" });
    }
    const id = req.params.id;
    const new_client = await Client.create({
      name,
      code,
      type: type?.clienttype,
      clientTypeId: type?._id,
      currency_id: currency_id,
      companyName: company_contacts?.companyName,
      company_landline: company_contacts.landline,
      company_email: company_contacts.email,
      company_address: company_contacts.address,
      company_city: company_contacts.city,
      company_state: company_contacts.state,
      company_country: company_contacts.country,
      company_zip: company_contacts.zip,
      trn_no: trn.number,
      trn_address: trn.address,
      trn_city: trn.city,
      trn_state: trn.state,
      trn_country: trn.country,
      trn_zip: trn.zip,
      trn_file: trn_file,
      logofile: logofile,
      trade_lic_no: trade.number,
      trade_lic_file: trade_file,
      auth_poa: auth_sign.poa,
      auth_no: auth_sign.number,
      auth_file: auth_file,
      auth_idfile: auth_idfile,
      remark: remark,
      contacts: contacts,
    });
    return res.status(200).json({ mssg: "New client Added" });
  } catch (error) {
    console.log(error);
    res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};
const get_all_clients = async (req, res) => {
  try {
    let { search } = req.query;
    search = search ? search : "";
    let searchRegex = { $regex: new RegExp(".*" + search + ".*", "i") };
    let where = {
      $or: [{ name: searchRegex }, { code: searchRegex }],
      $and: [{}],
    };
    const clients = await Client.aggregate([
      {
        $lookup: {
          from: "currency_models",
          localField: "currency_id",
          foreignField: "_id",
          as: "currencyDetails",
        },
      },
      {
        $sort: {
          name: 1,
        },
      },
    ]);
    // const clients = await Client.find(where).sort({
    //   name: 1,
    // });
    return res.status(200).json(clients);
  } catch (error) {
    console.log(error);
    res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};
const get_single_client = async (req, res) => {
  try {
    const id = req.params.id;
    const client = await Client.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
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
          from: "client_types",              // collection name for client types
          localField: "clientTypeId",
          foreignField: "_id",
          as: "clientTypeDetails",
        },
      },
      {
        $unwind: {
          path: "$currencyDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$clientTypeDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);
    return res.status(200).json(client[0]);
  } catch (error) {
    console.log(error);
    res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};
const update_client = async (req, res) => {
  try {
    const client_form = JSON.parse(req.body.client_form);
    const { name, code } = client_form;
    let { type } = req.body;
    type = JSON.parse(type);
    const { currency_id } = req.body;
    const company_contacts = JSON.parse(req.body.company_contact);
    const contacts = JSON.parse(req.body.contacts);
    const trn = JSON.parse(req.body.trn);
    const trade = JSON.parse(req.body.trade);
    const auth_sign = JSON.parse(req.body.auth_sign);
    const { remark } = req.body;
    const logofile =
      req.files != {} && req.files.logofile !== undefined
        ? `${process.env.BACKENDURL}/uploads/${req.files.logofile[0].filename}`
        : trn.logofile;
    const trn_file =
      req.files != {} && req.files.trn_file !== undefined
        ? `${process.env.BACKENDURL}/uploads/${req.files.trn_file[0].filename}`
        : trn.file;
    const trade_file =
      req.files != {} && req.files.trade_file !== undefined
        ? `${process.env.BACKENDURL}/uploads/${req.files.trade_file[0].filename}`
        : trade.file;
    const auth_file =
      req.files != {} && req.files.auth_file !== undefined
        ? `${process.env.BACKENDURL}/uploads/${req.files.auth_file[0].filename}`
        : auth_sign.file;
    const auth_idfile =
      req.files != {} && req.files.auth_idfile !== undefined
        ? `${process.env.BACKENDURL}/uploads/${req.files.auth_idfile[0].filename}`
        : auth_sign.idfile;

    if (
      !name ||
      !code ||
      !currency_id ||
      !type
      // ||
      // !trn.number ||
      // !trade.number ||
      // !auth_sign.number ||
      // !auth_sign.poa
    ) {
      return res
        .status(400)
        .json({ mssg: "Client Name, Code, Currency and Type Are Required" });
    }
    const id = req.params.id;
    const updated_client = await Client.findByIdAndUpdate(id, {
      name,
      code,
      currency_id: currency_id,
      type: type?.clienttype,
      clientTypeId: type?._id,
      companyName: company_contacts?.companyName,
      company_landline: company_contacts.landline,
      company_email: company_contacts.email,
      company_address: company_contacts.address,
      company_city: company_contacts.city,
      company_state: company_contacts.state,
      company_country: company_contacts.country,
      company_zip: company_contacts.zip,
      trn_no: trn.number,
      trn_address: trn.address,
      trn_city: trn.city,
      trn_state: trn.state,
      trn_country: trn.country,
      trn_zip: trn.zip,
      trn_file: trn_file,
      logofile: logofile,
      trade_lic_no: trade.number,
      trade_lic_file: trade_file,
      auth_poa: auth_sign.poa,
      auth_no: auth_sign.number,
      auth_file: auth_file,
      auth_idfile: auth_idfile,
      remark: remark,
      contacts: contacts,
    });
    return res.status(200).json({ mssg: "client Updated" });
  } catch (error) {
    console.log(error);
    res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};
const delete_client = async (req, res) => {
  try {
    const id = req.params.id;
    const deleted_client = await Client.findByIdAndDelete(id);
    // console.log(cost_usd_per_kg,fluctuation,cost_with_fluctuation)
    return res.status(200).json({ mssg: "client Deleted" });
  } catch (error) {
    console.log(error);
    res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};

const isClientAssignedAnywhere = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid client ID',
      });
    }

    const objectId = new mongoose.Types.ObjectId(id);

    const inquiries = await Project_inquiry_Model.find({ client_name: objectId });

    const isUsedAnywhere = inquiries.length > 0;

    return res.status(200).json({
      success: true,
      clientId: id,
      usedAnywhere: isUsedAnywhere,
      counts: {
        inquiries: inquiries.length,
      },
      data: {
        inquiries,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Internal server error',
    });
  }
};


module.exports = {
  add_client,
  get_all_clients,
  get_single_client,
  update_client,
  delete_client,
  isClientAssignedAnywhere
};
