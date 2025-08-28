const Project_Model = require("../models/project_model");
const Stock_model = require("../models/stock_model");
const ejs = require("ejs");
const puppeteer = require("puppeteer-core");
const xlsx = require("xlsx");
const fs = require("fs");
const pdf = require("html-pdf");
const path = require("path");
const handlebars = require("handlebars");
const { get_eta_for_project_helper } = require("./purchase_order_controller");
const Loose_Stock_model = require("../models/loose_stock_model");
const Action_model = require("../models/actions_model");
const { default: mongoose, Mongoose } = require("mongoose");
const Log_Model = require("../models/log");
const { LooseStockPopulate } = require("../config/common");
const Client = require("../models/client");
const Accessories_Input_Model = require("../models/accessories_input_model");
const {
  Profile_Insulated_Input,
} = require("../models/profile_insulated_input");
const Kit_Input = require("../models/kit_model");
const Profile_Input_Model = require("../models/profile_input_model");
const Scope_Work = require("../models/scopeWork_Model");
const { type } = require("os");

function validateParts(partsArray) {
  return Object.values(partsArray).every(
    (value) => value !== null && value !== undefined
  );
}

const add_project = async (req, res) => {
  const session = await mongoose.startSession(); // Start a session
  session.startTransaction(); // Begin transaction
  try {
    const files = req.files;
    const other = files.files || [];
    const excelfile = files.file;
    const client_confirmation =
      req.files != {} && req.files.client_confirmation !== undefined
        ? `${process.env.BACKENDURL}/uploads/${req.files.client_confirmation[0].filename}`
        : "";
    const quotation_number =
      req.files != {} && req.files.quotation_number !== undefined
        ? `${process.env.BACKENDURL}/uploads/${req.files.quotation_number[0].filename}`
        : "";
    const fileData = req.body.fileData ? JSON.parse(req.body.fileData) : [];
    const project_form = JSON.parse(req.body.project_form);
    const client_form = JSON.parse(req.body.client_form);
    const payments = JSON.parse(req.body.payments);

    const paymentTerms = JSON.parse(req.body.paymentTerms);

    const total = JSON.parse(req.body.total);
    const commision = JSON.parse(req.body.commision);
    const backCharges = JSON.parse(req.body.backCharges);
    const finalTotal = req.body.finalTotal;
    const coating = JSON.parse(req.body.coating);
    const parts = JSON.parse(req.body.parts);
    const scope = JSON.parse(req.body.scope);
    // const sid = scope[0]
    // let scopeid = await Scope_Work.findById(sid)

    const {
      is_empty,
      materialSupply,
      packing,
      transportation,
      installation,
      fabrication,
      glass,
      project_number,
      currency,
    } = req.body;

    const combinedFiles = other.map((file) => {
      const fileInfo = fileData.find((data) => data.name === file.originalname);
      return {
        file: files.files,
        name: fileInfo ? fileInfo.name : "",
        path: `${process.env.BACKENDURL}/uploads/${file.filename}`,
        date: fileInfo ? fileInfo.date : "",
        revision: fileInfo ? fileInfo.revision : 0,
        type: fileInfo ? fileInfo.type : ".jpg",
      };
    });
    const {
      name,
      number,
      country,
      city,
      client_project_number,
      client_confirmation_number,
      client_quotation_number,
      contract_value,
      project_confirmationDate,
      project_completionDate,
    } = project_form;

    const expectedHeaders = [
      "category",
      "type",
      "code",
      "required",
      "unit_price",
    ];

    if (
      client_form.name === "" ||
      client_form.name === null ||
      name === "" ||
      name === null ||
      number === "" ||
      number === null ||
      city === "" ||
      city === null ||
      client_project_number === "" ||
      client_project_number === null ||
      client_confirmation === "" ||
      client_confirmation === null ||
      quotation_number === "" ||
      quotation_number === null ||
      contract_value === "" ||
      contract_value === null ||
      project_confirmationDate === "" ||
      project_confirmationDate === null ||
      project_completionDate === "" ||
      project_completionDate === null ||
      country === "" ||
      country === null ||
      city === "" ||
      city === null
    ) {
      return res.status(400).json({
        type: "validation_failed",
        mssg: "Client Name, Project Name, Project number, City, Client Project Number, Client Confirmation, Quotation Number, Contract Value, Project Confirmation Date, Project Completion Date, Country, City",
      });
    }

    if (excelfile && excelfile.length > 0) {
      const filteredParts = parts.filter((item) => {
        return parseFloat(item.required) != 0;
      });
      const new_project = await Project_Model.create([{
        client_name: client_form.name,
        project_name: name,
        number: number,
        project_number: number,
        country,
        city,
        client_project_number,
        client_confirmation_number,
        client_quotation_number,
        client_confirmation,
        quotation_number,
        contract_value,
        project_confirmationDate,
        project_completionDate,
        retention_per: paymentTerms.retention.per,
        retention_val: paymentTerms.retention.val,
        retention_description: paymentTerms.retention.description,
        advanced_per: paymentTerms.advanced.per,
        advanced_val: paymentTerms.advanced.val,
        advanced_description: paymentTerms.advanced.description,
        recovery_per: paymentTerms.recovery.per,
        recovery_val: paymentTerms.recovery.val,
        recovery_description: paymentTerms.recovery.description,
        payments: payments,
        total_per: total.per,
        total_val: total.val,
        backCharges: backCharges,
        finalTotal: finalTotal,
        commision_per: commision.per,
        commision_val: commision.val,
        materialSupply,
        packing,
        transportation,
        installation,
        coating_required: coating.required,
        coating_type: coating.type,
        coating_supplier: coating.supplier,
        coating_product_desc: coating.product_desc,
        glass,
        fabrication,
        files: combinedFiles,
        parts: filteredParts,
        scope: scope,
      }], { session: session });
      await session.commitTransaction()
      session.endSession()
      return res.status(200).json({ mssg: `Project Created` });
    } else {
      partsData = JSON.parse(req.body.parts);
      let sums = {};
      const check_project = await Project_Model.findOne({
        project_name: name,
      }).session(session);
      if (check_project) {
        return res
          .status(400)
          .json({ mssg: "Project Already Exists with this Name and Number" });
      }
      if (is_empty === "false") {
        if (
          !client_form.name ||
          !name ||
          !number ||
          !country ||
          !city ||
          !client_project_number ||
          !contract_value ||
          !project_confirmationDate ||
          !project_completionDate
          // !parts[0].unit_price ||
          // !parts[0].total_price
        ) {
          return res.status(400).json({ mssg: "All Entries Are Required" });
        }
        await Promise.all(
          partsData.map(async (part) => {
            if (!sums[part.code_id]) {
              sums[part.code_id] = {
                code: part.code,
                reference_code: part.reference_code,
                code_id: part.code_id,
                ref_code_id: part.ref_code_id,
                available: part.available,
                required: 0,
                balance: 0,
                eta: part.eta,
                // stock_detail: part.stock_detail,
                type: part.type,
                category: part.category,
                // unit: part.unit,
                // description: part.description,
                // system: part.system,
                // subsystem: part.subsystem,
                //  group: part.group,
                // sub_group: part.sub_group,
                unit_price: part.unit_price,
                total_price: part.total_price,
                scope: part.scope,
              };
            }
            sums[part.code_id].required += parseFloat(part.required);
          })
        );
        Object.keys(sums).forEach((code_id) => {
          sums[code_id].balance =
            sums[code_id].available - sums[code_id].required;
        });
        let result = Object.values(sums);
        await Promise.all(
          result.map(async (itm, idx) => {
            if (
              name === "" ||
              name === null ||
              itm.code === "" ||
              itm.code === null ||
              itm.reference_code === "" ||
              itm.reference_code === null ||
              itm.code_id === "" ||
              itm.code_id === null ||
              itm.ref_code_id === "" ||
              itm.ref_code_id === null ||
              itm.required == 0
            ) {
              res.status(400).json({
                type: "parts_validation_failed",
                mssg: "Project Name, Part Code, Reference Code missing and Required should be > 0",
              });
              throw new Error(
                `Project Name, Part Code, Reference Code missing and Required should be > 0`
              );
            }
            if (itm.category === "Package") {
              const exist_stock = await Stock_model.findOne({
                _id: itm.code_id,
              });
              if (!exist_stock) {
                res
                  .status(400)
                  .json({ mssg: `Stock not found for code: ${itm.code}` });
                throw new Error(`Stock not found for code: ${itm.code}`);
              }
              let updated_stock = {};
              if (exist_stock.open >= itm.required) {
                updated_stock = await Stock_model.findOneAndUpdate(
                  { _id: itm.code_id },
                  {
                    $set: {
                      open: exist_stock.open - itm.required,
                      // available: exist_stock.available - itm.required,
                      free_inventory: exist_stock.free_inventory - itm.required,
                    },
                    $inc: { reserve: itm.required },
                  },
                  { new: true }
                ).session(session);
                const NewLog = await Log_Model.create({
                  stock_id: itm.code_id,
                  ref_code_id: itm.ref_code_id,
                  category: updated_stock.category,
                  stockType: "Package",
                  description: `Action: ${updated_stock.packing_code} Assigned(${itm.required}) to Project ${name} (Condition Open > Required ), Open-=${itm.required}, Free-=${itm.required}, Reserve+=${itm.required} `,
                  snapShot: updated_stock.toObject(),
                });
              } else if (
                exist_stock.open < itm.required &&
                exist_stock.open !== 0
              ) {
                let open_till_zero = itm.required - exist_stock.open;
                updated_stock = await Stock_model.findOneAndUpdate(
                  { _id: itm.code_id },
                  {
                    $set: {
                      open: exist_stock.open - exist_stock.open,
                      // available:
                      //   exist_stock.available - exist_stock.open - open_till_zero,
                      free_inventory:
                        exist_stock.free_inventory -
                        exist_stock.open -
                        open_till_zero,
                    },
                    $inc: { reserve: itm.required },
                  },
                  { new: true }
                ).session(session);
                const NewLog = await Log_Model.create({
                  stock_id: itm.code_id,
                  ref_code_id: itm.ref_code_id,
                  category: updated_stock.category,
                  stockType: "Package",
                  description: `Action: ${updated_stock.packing_code} Assigned(${itm.required}) to Project ${name} (Condition Open < Required && Open!=0 ), Open=0, Free-=(${exist_stock.open}+${open_till_zero}), Reserve+=${itm.required} `,
                  snapShot: updated_stock.toObject(),
                });
              } else if (exist_stock.open === 0) {
                updated_stock = await Stock_model.findOneAndUpdate(
                  { _id: itm.code_id },
                  [
                    // $set: {
                    //   // available: exist_stock.available - itm.required,
                    //   // free_inventory: exist_stock.free_inventory - itm.required,
                    // },
                    {
                      $set: {
                        reserve: { $add: ["$reserve", itm.required] },
                        free_inventory: {
                          $subtract: [
                            "$total_available",
                            { $add: ["$reserve", itm.required] },
                          ],
                        },
                      },
                    },
                  ],
                  { new: true }
                ).session(session);
                const NewLog = await Log_Model.create({
                  stock_id: itm.code_id,
                  ref_code_id: itm.ref_code_id,
                  category: updated_stock.category,
                  stockType: "Package",
                  description: `Action: ${updated_stock.packing_code} Assigned(${itm.required}) to Project ${name} (Condition Open == 0), Free-=(${itm.required}), Reserve+=${itm.required} `,
                  snapShot: updated_stock.toObject(),
                });
              }
              //get detail of each stock in array and create action based on condition
              let stock_qty =
                updated_stock.free_inventory;
              if (stock_qty < updated_stock.msq) {
                const if_action = await Action_model.findOne({
                  code_id: updated_stock._id,
                  ref_code_id: updated_stock.reference_code_id,
                });
                if (!if_action) {
                  const new_notification = await Action_model.create({
                    code_id: updated_stock._id,
                    ref_code_id: updated_stock.reference_code_id,
                    category: itm.type,
                  });
                }
              }
            } else if (itm.category === "Loose") {
              const exist_stock = await Loose_Stock_model.findOne({
                _id: itm.code_id,
              });
              if (!exist_stock) {
                res.status(400).json({
                  mssg: `Loose Stock not found for code: ${itm.code}`,
                });
                throw new Error(`Loose Stock not found for code: ${itm.code}`);
              }
              // const updated_stock = await Loose_Stock_model.findOneAndUpdate(
              //   { _id: itm.code_id },
              //   {
              //     $set: {
              //       available: exist_stock.available - itm.required,
              //       free_inventory: exist_stock.free_inventory - itm.required,
              //     },
              //     $inc: { reserve: itm.required },
              //   },
              //   { new: true }
              // );
              let updated_stock = {};
              const LooseDetail = await LooseStockPopulate(itm.code_id);
              if (exist_stock.open >= itm.required) {
                updated_stock = await Loose_Stock_model.findOneAndUpdate(
                  { _id: itm.code_id },
                  {
                    $set: {
                      open: exist_stock.open - itm.required,
                      // available: exist_stock.available - itm.required,
                      free_inventory: exist_stock.free_inventory - itm.required,
                    },
                    $inc: { reserve: itm.required },
                  },
                  { new: true }
                ).session(session);
                const NewLog = await Log_Model.create({
                  stock_id: itm.code_id,
                  ref_code_id: itm.ref_code_id,
                  category: updated_stock.category,
                  stockType: "Loose",
                  description: `Action: ${LooseDetail[0].entry_details.code} Assigned(${itm.required}) to Project ${name} (Condition Open > Required ), Open-=${itm.required}, Free-=${itm.required}, Reserve+=${itm.required} `,
                  snapShot: updated_stock.toObject(),
                });
              } else if (
                exist_stock.open < itm.required &&
                exist_stock.open !== 0
              ) {
                let open_till_zero = itm.required - exist_stock.open;
                updated_stock = await Loose_Stock_model.findOneAndUpdate(
                  { _id: itm.code_id },
                  {
                    $set: {
                      open: exist_stock.open - exist_stock.open,
                      // available:
                      //   exist_stock.available - exist_stock.open - open_till_zero,
                      free_inventory:
                        exist_stock.free_inventory -
                        exist_stock.open -
                        open_till_zero,
                    },
                    $inc: { reserve: itm.required },
                  },
                  { new: true }
                ).session(session);
                const NewLog = await Log_Model.create({
                  stock_id: itm.code_id,
                  ref_code_id: itm.ref_code_id,
                  category: updated_stock.category,
                  stockType: "Loose",
                  description: `Action: ${LooseDetail[0].entry_details.code} Assigned(${itm.required}) to Project ${name} (Condition Open < Required && Open!=0 ), Open=0, Free-=(${exist_stock.open}+${open_till_zero}), Reserve+=${itm.required} `,
                  snapShot: updated_stock.toObject(),
                });
              } else if (exist_stock.open === 0) {
                updated_stock = await Loose_Stock_model.findOneAndUpdate(
                  { _id: itm.code_id },
                  [
                    {
                      $set: {
                        reserve: { $add: ["$reserve", itm.required] },
                        free_inventory: {
                          $subtract: [
                            "$total_available",
                            { $add: ["$reserve", itm.required] },
                          ],
                        },
                      },
                    },
                  ],
                  { new: true }
                ).session(session);
                const NewLog = await Log_Model.create({
                  stock_id: itm.code_id,
                  ref_code_id: itm.ref_code_id,
                  category: updated_stock.category,
                  stockType: "Loose",
                  description: `Action: ${LooseDetail[0].entry_details.code} Assigned(${itm.required}) to Project ${name} (Condition Open == 0), Free-=(${itm.required}), Reserve+=${itm.required} `,
                  snapShot: updated_stock.toObject(),
                });
              }
              let stock_qty =
                updated_stock.free_inventory;
              if (stock_qty < updated_stock.msq) {
                const if_action = await Action_model.findOne({
                  code_id: updated_stock._id,
                  // reference_code: updated_stock.code_id,
                });
                if (!if_action) {
                  const new_notification = await Action_model.create({
                    code_id: updated_stock._id,
                    ref_code_id: updated_stock.code_id,
                    category: itm.type,
                    order_type: "Loose",
                  });
                }
              } else if (stock_qty >= updated_stock.msq) {
                const deleted_notification =
                  await Action_model.findOneAndDelete({
                    code_id: updated_stock._id,
                    ref_code_id: updated_stock.code_id,
                  });
              }
            }
          })
        );
        const new_project = await Project_Model.create([{
          client_name: client_form.name,
          project_name: name,
          number: number,
          project_number: number,
          country,
          city,
          client_project_number,
          client_confirmation_number,
          client_quotation_number,
          client_confirmation,
          quotation_number,
          contract_value,
          project_confirmationDate,
          project_completionDate,
          retention_per: paymentTerms.retention.per,
          retention_val: paymentTerms.retention.val,
          retention_description: paymentTerms.retention.description,
          advanced_per: paymentTerms.advanced.per,
          advanced_val: paymentTerms.advanced.val,
          advanced_description: paymentTerms.advanced.description,
          recovery_per: paymentTerms.recovery.per,
          recovery_val: paymentTerms.recovery.val,
          recovery_description: paymentTerms.recovery.description,
          payments: payments,
          total_per: total.per,
          total_val: total.val,
          backCharges: backCharges,
          finalTotal: finalTotal,
          commision_per: commision.per,
          commision_val: commision.val,
          materialSupply,
          packing,
          transportation,
          installation,
          coating_required: coating.required,
          coating_type: coating.type,
          coating_supplier: coating.supplier,
          coating_product_desc: coating.product_desc,
          glass,
          fabrication,
          files: combinedFiles,
          parts: result,
          scope: scope,
        }], { session: session });
        await session.commitTransaction(); // Commit all operations
        session.endSession();
        return res.status(200).json({ mssg: `Project Created` });
      } else {
        if (name === "") {
          return res.status(400).json({ mssg: "Please enter Project Name" });
        }
        const new_project = await Project_Model.create([{ project_name: name }], { session: session });
        await session.commitTransaction(); // Commit all operations
        session.endSession();
        return res.status(200).json({ mssg: `Project Empty Created` });
      }
    }
  } catch (error) {
    await session.abortTransaction(); // Rollback in case of an error
    session.endSession();
    console.log(error);
    return res.status(200).json({ mssg: error?.message || 'Internal server error' });
  }
};

const get_all_projects = async (req, res) => {
  try {
    let { search, page, filter } = req.query;
    let searchRegex = { $regex: new RegExp(".*" + search + ".*", "i") };
    const limit = 10;
    const pageNumber = parseFloat(page) || 1;
    const skip = (pageNumber - 1) * limit;
    let and = [{ project_status: filter }];
    let where = {
      $or: [{ project_name: searchRegex }],
      $and: and,
    };

    const result = await Project_Model.find(where)
      .limit(limit)
      .skip(skip)
      .sort({ name: 1 });

    const totalCount = await Project_Model.countDocuments(where);
    const currentPage = pageNumber;
    const total_page = Math.ceil(totalCount / limit);
    return res
      .status(200)
      .json({ result, currentPage, total_page, totalCount, limit });
  } catch (error) {
    console.log(error);
    return res.status(200).json({ mssg: error?.message || 'Internal server error' });
  }
};

const get_Project = async (req, res) => {
  try {
    const data = await Project_Model.find();
    res.status(200).json({ data });
  } catch (error) {
    console.log(error);
    return res.status(200).json({ mssg: error?.message || 'Internal server error' });
  }
};

const get_project_Client_name = async (req, res) => {
  try {
    const { name } = req.query;
    const clientProjects = await Project_Model.find({ client_name: name });

    if (clientProjects.length >= 0) {
      const nextSerialNumber = (clientProjects.length + 1)
        .toString()
        .padStart(3, "0");

      const clientCode = await Client.findOne({ name: name });
      //  const Code = clientCode.code;
      const prefix = `${new Date().getFullYear()}-${clientCode?.code
        }-${nextSerialNumber}-A`;

      res.status(200).json({ prefix });
    } else {
      res.status(404).json({ message: "No projects found for this client." });
    }
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({ message: "Server error." });
  }
};

const get_single_project = async (req, res) => {
  try {
    const id = req.params.id;

    //  const project = await Project_Model.findById(id).populate('scope').exec();

    // if (project) {
    //   for (const part of project.parts) {
    //     let populatePath;
    //     let populateModel;
    //     if (part.category === "Package") {
    //       populatePath = "code_id";
    //       populateModel = "Stock_model";
    //     } else if (part.category === "Loose") {
    //       populatePath = "code_id";
    //       populateModel = "Loose_Stock_model";
    //     }

    //     // Populate based on the determined path
    //     await Project_Model.populate(part, {
    //       path: populatePath,
    //       model: populateModel,
    //     });
    //   }
    // }

    const project = await Project_Model.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
        },
      },
      {
        $unwind: "$parts",
      },
      {
        $lookup: {
          from: "loose_stock_models",
          localField: "parts.code_id",
          foreignField: "_id",
          as: "loose_stock_details",
          pipeline: [
            { $match: { active: true } }
          ]
        },
      },
      {
        $lookup: {
          from: "stock_models",
          localField: "parts.code_id",
          foreignField: "_id",
          as: "stock_details",
          pipeline: [
            { $match: { active: true } }
          ]
        },
      },
      {
        $lookup: {
          from: "accessories_input_models",
          localField: "parts.ref_code_id",
          foreignField: "_id",
          as: "accessory_details",
        },
      },
      {
        $lookup: {
          from: "profile_input_models",
          localField: "parts.ref_code_id",
          foreignField: "_id",
          as: "ni_details",
        },
      },
      {
        $lookup: {
          from: "profile_insulated_inputs",
          localField: "parts.ref_code_id",
          foreignField: "_id",
          as: "ins_details",
        },
      },
      {
        $lookup: {
          from: "kit_inputs",
          localField: "parts.ref_code_id",
          foreignField: "_id",
          as: "kit_details",
        },
      },
      {
        $lookup: {
          from: "scope_works",
          localField: "scope",
          foreignField: "_id",
          as: "scope_details",
        },
      },
      {
        $addFields: {
          parts: {
            entry_details: {
              $switch: {
                branches: [
                  {
                    case: { $eq: ["$parts.type", "Accessory"] },
                    then: { $arrayElemAt: ["$accessory_details", 0] },
                  },
                  {
                    case: { $eq: ["$parts.type", "Non-Insulated Profile"] },
                    then: { $arrayElemAt: ["$ni_details", 0] },
                  },
                  {
                    case: { $eq: ["$parts.type", "Insulated Profile"] },
                    then: { $arrayElemAt: ["$ins_details", 0] },
                  },
                  {
                    case: { $eq: ["$parts.type", "Kit"] },
                    then: { $arrayElemAt: ["$kit_details", 0] },
                  },
                ],
                default: null,
              },
            },
          },
        },
      },
      {
        $addFields: {
          parts: {
            stock_details: {
              $switch: {
                branches: [
                  {
                    case: { $eq: ["$parts.category", "Package"] },
                    then: { $arrayElemAt: ["$stock_details", 0] },
                  },
                  {
                    case: { $eq: ["$parts.category", "Loose"] },
                    then: { $arrayElemAt: ["$loose_stock_details", 0] },
                  },
                ],
                default: null,
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: "accessories_supplier_models",
          localField: "parts.entry_details.supplier_id",
          foreignField: "_id",
          as: "lookupSupplier",
        },
      },
      {
        $lookup: {
          from: "profile_system_models", // Name of the collection for Profile_System_Model
          let: {
            systemField: "$parts.entry_details.system_id",
            subsystemField: "$parts.entry_details.subsystem_id",
          },
          pipeline: [
            {
              $unwind: "$system_detail",
            },
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$system_detail._id", "$$systemField"] },
                    {
                      $in: [
                        "$$subsystemField",
                        "$system_detail.subsystems._id",
                      ],
                    },
                  ],
                },
              },
            },
            {
              $addFields: {
                "system_detail.subsystems": {
                  $filter: {
                    input: "$system_detail.subsystems",
                    as: "subsystem",
                    cond: { $eq: ["$$subsystem._id", "$$subsystemField"] },
                  },
                },
              },
            },
          ],
          as: "lookupSystem",
        },
      },
      {
        $lookup: {
          from: "group_subgroups",
          localField: "parts.entry_details.group_id",
          foreignField: "_id",
          as: "lookupGroup",
        },
      },
      {
        $addFields: {
          lookupGroup: {
            $map: {
              input: "$lookupGroup",
              as: "groupDetail",
              in: {
                _id: "$$groupDetail._id",
                name: "$$groupDetail.name",
                subgroup: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$$groupDetail.subgroup",
                        as: "subgroupEntry",
                        cond: {
                          $eq: [
                            "$$subgroupEntry._id",
                            "$parts.entry_details.subgroup_id",
                          ],
                        },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          parts: {
            entry_details: {
              supplier: { $arrayElemAt: ["$lookupSupplier.name", 0] },
              system: {
                $arrayElemAt: ["$lookupSystem.system_detail.name", 0],
              },
              subsystem: {
                $arrayElemAt: [
                  {
                    $map: {
                      input: {
                        $arrayElemAt: [
                          "$lookupSystem.system_detail.subsystems",
                          0,
                        ],
                      },
                      as: "subsystem",
                      in: "$$subsystem.name",
                    },
                  },
                  0,
                ],
              },
              group: { $arrayElemAt: ["$lookupGroup.name", 0] },
              subgroup: {
                $arrayElemAt: ["$lookupGroup.subgroup.name", 0],
              },
            },
          },
        },
      },
      {
        $group: {
          _id: "$_id",
          client_name: { $first: "$client_name" },
          project_name: { $first: "$project_name" },
          project_number: { $first: "$project_number" },
          client_project_number: { $first: "$client_project_number" },
          client_confirmation_number: { $first: "$client_confirmation_number" },
          client_quotation_number: { $first: "$client_quotation_number" },
          client_confirmation: { $first: "$client_confirmation" },
          quotation_number: { $first: "$quotation_number" },
          contract_value: { $first: "$contract_value" },
          project_confirmationDate: { $first: "$project_confirmationDate" },
          project_completionDate: { $first: "$project_completionDate" },
          number: { $first: "$number" },
          country: { $first: "$country" },
          city: { $first: "$city" },
          retention_per: { $first: "$retention_per" },
          retention_val: { $first: "$retention_val" },
          retention_description: { $first: "$retention_description" },

          advanced_per: { $first: "$advanced_per" },
          advanced_val: { $first: "$advanced_val" },
          advanced_description: {
            $first: "$advanced_description",
          },
          recovery_per: {
            $first: "$recovery_per",
          },
          recovery_val: {
            $first: "$recovery_val",
          },
          recovery_description: {
            $first: "$recovery_description",
          },
          payments: { $first: "$payments" },

          total_per: {
            $first: "$total_per",
          },

          total_val: {
            $first: "$total_val",
          },

          commision_per: {
            $first: "$commision_per",
          },

          commision_val: {
            $first: "$commision_val",
          },

          backCharges: { $first: "$backCharges" },

          finalTotal: {
            $first: "$finalTotal",
          },
          project_status: { $first: "$project_status" },
          parts: { $push: "$parts" },
          files: { $push: "$files" },
          scope: { $first: "$scope_details" },
        },
      },
      {
        $addFields: {
          parts: {
            $map: {
              input: "$parts",
              as: "part",
              in: {
                code_id: "$$part.code_id",
                code: "$$part.code",
                ref_code_id: "$$part.ref_code_id",
                required: "$$part.required",
                available: "$$part.available",
                balance: "$$part.balance",
                issued: "$$part.issued",
                category: "$$part.category",
                type: "$$part.type",
                eta: "$$part.eta",
                entry_details: "$$part.entry_details",
                stock_details: "$$part.stock_details",
                scope: "$$part.scope",
                unit_price: "$$part.unit_price",
                total_price: "$$part.total_price",
                // order_type: "$$part.order_type",
                // description: "$$part.order_type",
                // system: "$$part.order_type",
                // subsystem: "$$part.order_type",
                // group: "$$part.order_type",
              },
            },
          },
        },
      },
    ]);
    return res.status(200).json(project);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: error?.message || 'Internal server error' });
  }
};
const update_project = async (req, res) => {
  const session = await mongoose.startSession(); // Start a session
  session.startTransaction(); // Begin transaction
  try {
    const { id } = req.params;
    const files = req.files;
    const other = files.files || [];
    const client_confirmation =
      req.files != {} && req.files.client_confirmation !== undefined
        ? `${process.env.BACKENDURL}/uploads/${req.files.client_confirmation[0].filename}`
        : req.body.client_confirmation;

    const quotation_number =
      req.files != {} && req.files.quotation_number !== undefined
        ? `${process.env.BACKENDURL}/uploads/${req.files.quotation_number[0].filename}`
        : req.body.quotation_number;

    const fileData = req.body.fileData ? JSON.parse(req.body.fileData) : [];
    const project_form = JSON.parse(req.body.project_form);
    const client_form = JSON.parse(req.body.client_form);
    const payments = JSON.parse(req.body.payments);
    const paymentTerms = JSON.parse(req.body.paymentTerms);
    const total = JSON.parse(req.body.total);
    const commision = JSON.parse(req.body.commision);
    const backCharges = JSON.parse(req.body.backCharges);
    const coating = JSON.parse(req.body.coating);
    const parts = JSON.parse(req.body.parts);
    const {
      name,
      number,
      country,
      city,
      client_project_number,
      client_confirmation_number,
      client_quotation_number,
      contract_value,
      project_confirmationDate,
      project_completionDate,
    } = project_form;
    const {
      // parts,
      project_number,
      currency,
      // client_form,
      // paymentTerms,
      // payments,
      materialSupply,
      packing,
      transportation,
      installation,
      fabrication,
      glass,
      // coating,
    } = req.body;

    const combinedFiles = other.map((file) => {
      const fileInfo = fileData.find((data) => data.name === file.originalname);
      return {
        // file:files.files,
        name: fileInfo ? fileInfo.name : "",
        path: `${process.env.BACKENDURL}/uploads/${file.filename}`,
        date: fileInfo ? fileInfo.date : "",
        revision: fileInfo ? fileInfo.revision : 0,
        type: fileInfo ? fileInfo.type : ".jpg",
      };
    });

    // const filed = fileData.map((file) => {
    //   return {
    //     name: file.name,
    //     path: `${process.env.BACKENDURL}/uploads/${file.name}`,
    //     date: file.date,
    //     revision: file.revision,
    //     type: file.type,
    //   };
    // });

    const project_detail = await Project_Model.findByIdAndUpdate(id, {
      client_name: client_form.name,
      // client_code: client_form.code,
      // client_confirmation_no: client_form.confirmation_no,
      // contract_value: client_form.contract_value,
      // currency: currency,
      // confirmation_date: client_form.confirmation_date,
      // completion_date: client_form.completion_date,
      project_name: name,
      number: number,
      project_number: number,
      country,
      city,
      client_project_number,
      client_confirmation_number,
      client_quotation_number,
      contract_value,
      project_confirmationDate,
      project_completionDate,
      client_confirmation,
      quotation_number,
      retention_per: paymentTerms.retention.per,
      retention_val: paymentTerms.retention.val,
      retention_description: paymentTerms.retention.description,
      advanced_per: paymentTerms.advanced.per,
      advanced_val: paymentTerms.advanced.val,
      advanced_description: paymentTerms.advanced.description,
      recovery_per: paymentTerms.recovery.per,
      recovery_val: paymentTerms.recovery.val,
      recovery_description: paymentTerms.recovery.description,
      payments: payments,
      total_per: total.per,
      total_val: total.val,
      backCharges: backCharges,
      commision_per: commision.per,
      commision_val: commision.val,
      materialSupply,
      packing,
      transportation,
      installation,
      coating_required: coating.required,
      coating_type: coating.type,
      coating_supplier: coating.supplier,
      coating_product_desc: coating.product_desc,
      glass,
      fabrication,
      files: combinedFiles,
      // ...(combinedFiles.length > 0 && { files: combinedFiles }),
    }).session(session);
    // return;
    await Promise.all(
      parts.map(async (itm, idx) => {
        if (
          name === "" ||
          name === null ||
          itm.code === "" ||
          itm.code === null ||
          itm.reference_code === "" ||
          itm.reference_code === null ||
          itm.code_id === "" ||
          itm.code_id === null ||
          itm.ref_code_id === "" ||
          itm.ref_code_id === null ||
          itm.required == 0
        ) {
          res.status(400).json({
            mssg: "Project Name, Part Code, Reference Code missing and Required should be > 0",
          });
          throw new Error(
            "Project Name, Part Code, Reference Code missing and Required should be > 0"
          );
        }
        if (itm.category === "Package") {
          const existingPart = project_detail.parts.find(
            (entry) => entry.code_id == itm.code_id
          );
          const exist_stock = await Stock_model.findOne({
            _id: itm.code_id,
          }).session(session);
          if (!exist_stock) {
            res
              .status(400)
              .json({ mssg: `Stock not found for code: ${itm.code}` });
            throw new Error(`Stock not found for code: ${itm.code}`);
          }
          let updated_stock = {};
          //if a new part is added
          if (!existingPart || itm.new_issue === undefined) {
            if (exist_stock.open >= itm.required) {
              updated_stock = await Stock_model.findOneAndUpdate(
                { _id: itm.code_id },
                {
                  $set: {
                    open: exist_stock.open - itm.required,
                    // available: exist_stock.available - itm.required,
                    free_inventory: exist_stock.free_inventory - itm.required,
                  },
                  $inc: { reserve: parseFloat(itm.required) },
                },
                { new: true }
              ).session(session);
              const NewLog = await Log_Model.create({
                stock_id: itm.code_id,
                ref_code_id: itm.ref_code_id,
                category: updated_stock.category,
                stockType: "Package",
                description: `Action: ${updated_stock.packing_code} Assigned(${itm.required}) to Project ${name} (Condition Open >= Required ), Open-=${itm.required}, Free-=${itm.required}, Reserve+=${itm.required} `,
                snapShot: updated_stock.toObject(),
              });
            } else if (
              exist_stock.open < itm.required &&
              exist_stock.open !== 0
            ) {
              let open_till_zero = itm.required - exist_stock.open;
              updated_stock = await Stock_model.findOneAndUpdate(
                { _id: itm.code_id },
                {
                  $set: {
                    open: exist_stock.open - exist_stock.open,
                    // available:
                    //   exist_stock.available - open_till_zero - exist_stock.open,
                    free_inventory:
                      exist_stock.free_inventory -
                      open_till_zero -
                      exist_stock.open,
                  },
                  $inc: { reserve: parseFloat(itm.required) },
                },
                { new: true }
              ).session(session);
              const NewLog = await Log_Model.create({
                stock_id: itm.code_id,
                ref_code_id: itm.ref_code_id,
                category: updated_stock.category,
                stockType: "Package",
                description: `Action: ${updated_stock.packing_code} Assigned(${itm.required}) to Project ${name} (Condition Open < Required && Open!=0 ), Open=0, Free-=(${exist_stock.open}+${open_till_zero}), Reserve+=${itm.required} `,
                snapShot: updated_stock.toObject(),
              });
            } else if (exist_stock.open === 0) {
              updated_stock = await Stock_model.findOneAndUpdate(
                { _id: itm.code_id },
                // {
                //   $set: {
                //     // available: exist_stock.available - itm.required,
                //     // free_inventory: exist_stock.free_inventory - itm.required,
                //   },
                //   $inc: {
                //     reserve: parseFloat(itm.required),
                //     free_inventory: -parseFloat(itm.required),
                //     total_available: -parseFloat(itm.required),
                //   },
                // },
                {
                  $set: {
                    free_inventory: {
                      $subtract: [
                        "$total_available",
                        { $add: ["$reserve", parseFloat(itm.required)] },
                      ],
                    },
                    reserve: { $add: ["$reserve", parseFloat(itm.required)] },
                  },
                },
                { new: true }
              ).session(session);
              const NewLog = await Log_Model.create({
                stock_id: itm.code_id,
                ref_code_id: itm.ref_code_id,
                category: updated_stock.category,
                stockType: "Package",
                description: `Action: ${updated_stock.packing_code} Assigned(${itm.required}) to Project ${name} (Condition Open == 0), Free-=(${itm.required}), Reserve+=${itm.required} `,
                snapShot: updated_stock.toObject(),
              });
            }
            // itm.stock_detail = updated_stock._id;
            project_detail.parts.push(itm);
          } else {
            const partIndex = project_detail.parts.findIndex(
              (part) => part.code_id == itm.code_id
            );
            const issued_quantity = project_detail.parts[partIndex].issued;
            const new_issue = parseFloat(itm.new_issue || 0);
            if (
              new_issue >
              parseFloat(
                (
                  parseFloat(project_detail.parts[partIndex].required) -
                  parseFloat(issued_quantity)
                ).toFixed(1)
              )
            ) {
              res
                .status(400)
                .json({ mssg: "Please Enter Valid New Issue Amount" });
              throw new Error("Please Enter Valid New Issue Amount");
            }
            // updated_stock = await Stock_model.findOneAndUpdate(
            //   { _id: itm.code_id },
            //   [
            //     {
            //       $set: {
            //         free_inventory: {
            //           $subtract: [
            //             "$total_available",
            //             { $subtract: ["$reserve", -new_issue] },
            //           ],
            //         },
            //       },
            //       $inc: {
            //         total_available: -new_issue,
            //         available: -new_issue,
            //         reserve: -new_issue,
            //       },
            //     },
            //   ],
            //   { new: true }
            // );
            updated_stock = await Stock_model.findOneAndUpdate(
              { _id: itm.code_id },
              [
                {
                  $set: {
                    total_available: { $subtract: ["$total_available", new_issue] },
                    available: { $subtract: ["$available", new_issue] },
                    reserve: { $subtract: ["$reserve", new_issue] },
                    free_inventory: {
                      $subtract: [
                        { $subtract: ["$total_available", new_issue] },
                        { $subtract: ["$reserve", new_issue] }
                      ]
                    }
                  }
                }
              ],
              { new: true }
            ).session(session);

            const NewLog = await Log_Model.create({
              stock_id: itm.code_id,
              ref_code_id: itm.ref_code_id,
              category: updated_stock.category,
              stockType: "Package",
              description: `Action: ${updated_stock.packing_code} Issued(${new_issue}) in Project ${name}, Available-=(${new_issue}), Reserve-=${new_issue} `,
              snapShot: updated_stock.toObject(),
            });
            //code to change balance and total_issued based on new_issued qty
            if (partIndex !== -1 && itm.new_issue != 0) {
              project_detail.parts[partIndex].balance -= parseFloat(
                itm.new_issue
              );
              project_detail.parts[partIndex].issued =
                issued_quantity + new_issue;
            }
          }
          let stock_qty =
            updated_stock.free_inventory;
          if (stock_qty < updated_stock.msq) {
            const if_action = await Action_model.findOne({
              code_id: itm.code_id,
              // ref_code_id: itm.ref_code_id,
            });
            if (!if_action) {
              const new_notification = await Action_model.create({
                code_id: itm.code_id,
                ref_code_id: itm.ref_code_id,
                category: itm.type,
                order_type: "Package",
              });
            }
          } else if (stock_qty > updated_stock.msq) {
            const deleted_notification = await Action_model.deleteMany({
              code_id: itm.code_id,
              // ref_code_id: itm.ref_code_id,
            });
          }
        } else if (itm.category === "Loose") {
          const existingPart = project_detail.parts.find(
            (entry) => entry.code_id == itm.code_id
          );
          const exist_stock = await Loose_Stock_model.findOne({
            _id: itm?.code_id,
          }).session(session);
          if (!exist_stock) {
            res
              .status(400)
              .json({ mssg: `Stock not found for code: ${itm.code}` });
            throw new Error(`Stock not found for code: ${itm.code}`);
          }
          let updated_stock = {};
          const LooseDetail = await LooseStockPopulate(itm.code_id);
          if (!existingPart || itm.new_issue === undefined) {
            // updated_stock = await Loose_Stock_model.findOneAndUpdate(
            //   { _id: itm.code_id },
            //   {
            //     $set: {
            //       available: exist_stock.available - itm.required,
            //       free_inventory: exist_stock.free_inventory - itm.required,
            //     },
            //     $inc: { reserve: parseFloat(itm.required) },
            //   },
            //   { new: true }
            // );
            // project_detail.parts.push(itm);
            if (exist_stock.open >= itm.required) {
              updated_stock = await Loose_Stock_model.findOneAndUpdate(
                { _id: itm.code_id },
                {
                  $set: {
                    open: exist_stock.open - itm.required,
                    // available: exist_stock.available - itm.required,
                    free_inventory: exist_stock.free_inventory - itm.required,
                  },
                  $inc: { reserve: parseFloat(itm.required) },
                },
                { new: true }
              ).session(session);
              const NewLog = await Log_Model.create({
                stock_id: itm.code_id,
                ref_code_id: itm.ref_code_id,
                category: updated_stock.category,
                stockType: "Loose",
                description: `Action: ${LooseDetail[0].entry_details.code} Assigned(${itm.required}) to Project ${name} (Condition Open >= Required ), Open-=${itm.required}, Free-=${itm.required}, Reserve+=${itm.required} `,
                snapShot: updated_stock.toObject(),
              });
            } else if (
              exist_stock.open < itm.required &&
              exist_stock.open !== 0
            ) {
              let open_till_zero = itm.required - exist_stock.open;
              updated_stock = await Loose_Stock_model.findOneAndUpdate(
                { _id: itm.code_id },
                {
                  $set: {
                    open: exist_stock.open - exist_stock.open,
                    // available:
                    //   exist_stock.available - open_till_zero - exist_stock.open,
                    free_inventory:
                      exist_stock.free_inventory -
                      open_till_zero -
                      exist_stock.open,
                  },
                  $inc: { reserve: parseFloat(itm.required) },
                },
                { new: true }
              ).session(session);
              const NewLog = await Log_Model.create({
                stock_id: itm.code_id,
                ref_code_id: itm.ref_code_id,
                category: updated_stock.category,
                stockType: "Loose",
                description: `Action: ${LooseDetail[0].entry_details.code} Assigned(${itm.required}) to Project ${name} (Condition Open < Required && Open!=0 ), Open=0, Free-=(${exist_stock.open}+${open_till_zero}), Reserve+=${itm.required} `,
                snapShot: updated_stock.toObject(),
              });
            } else if (exist_stock.open === 0) {
              updated_stock = await Loose_Stock_model.findOneAndUpdate(
                { _id: itm.code_id },
                // {
                //   $set: {
                //     // available: exist_stock.available - itm.required,
                //     // free_inventory: exist_stock.free_inventory - itm.required,
                //   },
                //   $inc: {
                //     reserve: parseFloat(itm.required),
                //     free_inventory: -parseFloat(itm.required),
                //     total_available: -parseFloat(itm.required),
                //   },
                // },
                {
                  $set: {
                    free_inventory: {
                      $subtract: [
                        "$total_available",
                        { $add: ["$reserve", parseFloat(itm.required)] },
                      ],
                    },
                    reserve: { $add: ["$reserve", parseFloat(itm.required)] },
                  },
                },
                { new: true }
              ).session(session);
              const NewLog = await Log_Model.create({
                stock_id: itm.code_id,
                ref_code_id: itm.ref_code_id,
                category: updated_stock.category,
                stockType: "Loose",
                description: `Action: ${LooseDetail[0].entry_details.code} Assigned(${itm.required}) to Project ${name} (Condition Open == 0), Free-=(${itm.required}), Reserve+=${itm.required} `,
                snapShot: updated_stock.toObject(),
              });
            }
            // itm.stock_detail = updated_stock._id;
            project_detail.parts.push(itm);
          } else {
            const partIndex = project_detail.parts.findIndex(
              (part) => part.code_id == itm.code_id
            );
            const issued_quantity = project_detail.parts[partIndex].issued;
            const new_issue = parseFloat(itm.new_issue || 0);
            if (
              new_issue >
              parseFloat(
                (
                  parseFloat(project_detail.parts[partIndex].required) -
                  parseFloat(issued_quantity)
                ).toFixed(1)
              )
            ) {
              res
                .status(400)
                .json({ mssg: "Please Enter Valid New Issue Amount" });
              throw new Error("Please Enter Valid New Issue Amount");
            }
            const updated_stock = await Loose_Stock_model.findOneAndUpdate(
              { _id: itm.code_id },
              [
                {
                  $set: {
                    total_available: { $subtract: ["$total_available", new_issue] },
                    available: { $subtract: ["$available", new_issue] },
                    reserve: { $subtract: ["$reserve", new_issue] },
                    free_inventory: {
                      $subtract: [
                        "$total_available",
                        { $subtract: ["$reserve", new_issue] },
                      ],
                    },
                  },
                },
              ],
              { new: true }
            ).session(session);
            const NewLog = await Log_Model.create({
              stock_id: itm.code_id,
              ref_code_id: itm.ref_code_id,
              category: updated_stock.category,
              stockType: "Loose",
              description: `Action: ${LooseDetail[0].entry_details.code} Issued(${new_issue}) in Project ${name}, Available-=(${new_issue}), Reserve-=${new_issue} `,
              snapShot: updated_stock.toObject(),
            });
            //code to change balance and total_issued based on new_issued qty
            if (partIndex !== -1 && itm.new_issue != 0) {
              project_detail.parts[partIndex].balance -= parseFloat(
                itm.new_issue
              );
              project_detail.parts[partIndex].issued =
                issued_quantity + new_issue;
            }
          }
          let stock_qty =
            updated_stock.free_inventory;
          if (stock_qty < updated_stock.msq) {
            const if_action = await Action_model.findOne({
              code_id: itm.code_id,
              // ref_code_id: itm.ref_code_id,
            });
            if (!if_action) {
              const new_notification = await Action_model.create({
                code_id: itm.code_id,
                ref_code_id: itm.ref_code_id,
                category: itm.type,
                order_type: "Loose",
              });
            }
          } else if (stock_qty > updated_stock.msq) {
            const deleted_notification = await Action_model.deleteMany({
              code_id: itm.code_id,
              // ref_code_id: itm.ref_code_id,
            });
          }
        }
      })
    );
    const totalIssued = project_detail.parts.reduce(
      (acc, part) => parseFloat(acc) + parseFloat(part.issued),
      0
    );
    const totalRequired = project_detail.parts.reduce(
      (acc, part) => acc + part.required,
      0
    );
    const isProjectComplete = totalIssued === totalRequired;
    if (isProjectComplete) {
      project_detail.project_status = "Completed";
    }
    await project_detail.save({ session: session });
    await session.commitTransaction(); // Commit all operations
    session.endSession();
    return res.status(200).json({ mssg: `Project Updated` });
  } catch (error) {
    await session.abortTransaction(); // Rollback in case of an error
    session.endSession();
    console.log(error);
    return res.status(500).json({ mssg: error?.message || 'Internal server error' });
  }
};
const get_project_with_code = async (req, res) => {
  try {
    const { code_id, ref_code_id } = req.body;
    const projects = await Project_Model.aggregate([
      {
        $match: {
          "parts.code_id": new mongoose.Types.ObjectId(code_id),
          "parts.ref_code_id": new mongoose.Types.ObjectId(ref_code_id),
          project_status: "Active",
        },
      },
    ]);
    return res.status(200).json(projects);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: error?.message || 'Internal server error' });
  }
};
const move_code = async (req, res) => {
  try {
    const {
      code_id,
      ref_code_id,
      project_to_move,
      project_move_from,
      available_to_move,
      move_amount,
      category,
    } = req.body;
    if (move_amount === 0) {
      return res.status(400).json({ mssg: "Quantity to move cannot be 0" });
    }
    if (move_amount > available_to_move) {
      return res
        .status(400)
        .json({ mssg: "Please Enter Valid Quantity To Move" });
    }
    const from_project = await Project_Model.findOne({
      _id: project_move_from,
      project_status: "Active",
    });
    const to_project = await Project_Model.findOne({
      _id: project_to_move,
      project_status: "Active",
    });
    const partToMove = from_project.parts.find(
      (part) => part.code_id == code_id
    );
    if (!partToMove) {
      return res
        .status(404)
        .json({ error: "Code not found in the source project" });
    }
    partToMove.required -= move_amount;
    // partToMove.balance -= move_amount;
    const existingPartInToProject = to_project.parts.find(
      (part) => part.code_id == code_id
    );
    existingPartInToProject.required += parseFloat(move_amount);
    if (partToMove.required == 0) {
      from_project.parts = from_project.parts.filter((part) => {
        return part.code_id != code_id;
      });
    }
    await from_project.save();
    await to_project.save();
    // existingPartInToProject.balance += move_amount;
    if (category == "Package") {
      const stockDetail = await Stock_model.findById(code_id);
      const newLog = await Log_Model.create({
        stock_id: code_id,
        ref_code_id: ref_code_id,
        category: stockDetail.category,
        stockType: "Package",
        description: `${move_amount} of ${stockDetail.packing_code} Moved from ${from_project.project_name} to ${to_project.project_name} `,
        snapShot: stockDetail.toObject(),
      });
    } else {
      const stockDetail = await LooseStockPopulate(code_id);
      const LooseStock = await Loose_Stock_model.findById(code_id);
      const newLog = await Log_Model.create({
        stock_id: code_id,
        ref_code_id: ref_code_id,
        category: stockDetail[0].category,
        stockType: "Loose",
        description: `${move_amount} of ${stockDetail[0].entry_details.code} Moved from ${from_project.project_name} to ${to_project.project_name} `,
        snapShot: LooseStock.toObject(),
      });
    }

    return res.status(200).json({ mssg: "Code Moved" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: error?.message || 'Internal server error' });
  }
};
const revert_code = async (req, res) => {
  const session = await mongoose.startSession(); // Start a session
  session.startTransaction(); // Begin transaction
  try {
    const {
      code_id,
      ref_code_id,
      category,
      move_amount,
      available_to_move_amount,
      project_move_from,
    } = req.body;
    if (move_amount === 0) {
      return res.status(400).json({ mssg: "Quantity to move cannot be 0" });
    }
    if (move_amount > available_to_move_amount) {
      return res.status(400).json({ mssg: "Please Enter Valid Quantity" });
    }
    const from_project = await Project_Model.findOne({
      _id: project_move_from,
      project_status: "Active",
    }).session(session);
    const partToMove = from_project.parts.find(
      (part) => part.code_id == code_id
    );
    if (!partToMove) {
      return res
        .status(404)
        .json({ error: "Code not found in the source project" });
    }
    partToMove.required -= move_amount;
    if (category === "Package") {
      const update_stock = await Stock_model.findOneAndUpdate(
        { _id: code_id },
        [
          {
            $set: {
              reserve: { $add: ["$reserve", -parseFloat(move_amount)] },
              free_inventory: {
                $subtract: [
                  "$total_available",
                  { $add: ["$reserve", -parseFloat(move_amount)] },
                ],
              },
            },
          },
        ],
        { new: true }
      ).session(session);

      let stock_qty = update_stock.free_inventory;
      if (stock_qty < update_stock.msq) {
        const if_action = await Action_model.findOne({
          code_id: code_id,
          // ref_code_id: ref_code_id,
        });
        if (!if_action) {
          const new_notification = await Action_model.create({
            code_id: code_id,
            ref_code_id: ref_code_id,
            category: update_stock.category,
            order_type: "Package",
          });
        }
      } else if (stock_qty > update_stock.msq) {
        const deleted_notification = await Action_model.deleteMany({
          code_id: code_id,
          // ref_code_id: ref_code_id,
        });
      }
      const newLog = await Log_Model.create({
        stock_id: code_id,
        ref_code_id: ref_code_id,
        category: update_stock.category,
        stockType: "Package",
        description: `Action: ${update_stock.packing_code} Reverted from ${from_project.project_name}, Free+=${move_amount}, Reserve-=${move_amount}`,
        snapShot: update_stock.toObject(),
      });
    } else if (category === "Loose") {
      const update_stock = await Stock_model.findOneAndUpdate(
        { _id: code_id },
        [
          {
            $set: {
              reserve: { $add: ["$reserve", -parseFloat(move_amount)] },
              free_inventory: {
                $subtract: [
                  "$total_available",
                  { $add: ["$reserve", -parseFloat(move_amount)] },
                ],
              },
            },
          },
        ],
        { new: true }
      ).session(session);
      let stock_qty = update_stock.free_inventory;
      if (stock_qty < update_stock.msq) {
        const if_action = await Action_model.findOne({
          code_id: code_id,
          // ref_code_id: ref_code_id,
        });
        if (!if_action) {
          const new_notification = await Action_model.create({
            code_id: code_id,
            ref_code_id: ref_code_id,
            category: update_stock.category,
            order_type: "Loose",
          });
        }
      } else if (stock_qty > update_stock.msq) {
        const deleted_notification = await Action_model.deleteMany({
          code_id: code_id,
          // ref_code_id: ref_code_id,
        });
      }
      const stockDetail = await LooseStockPopulate(code_id);
      const newLog = await Log_Model.create({
        stock_id: code_id,
        ref_code_id: ref_code_id,
        category: update_stock.category,
        stockType: "Loose",
        description: `Action: ${stockDetail[0].entry_details.code} Reverted from ${from_project.project_name}, Free+=${move_amount}, Reserve-=${move_amount}`,
        snapShot: update_stock.toObject(),
      });
    }
    if (partToMove.required == 0) {
      from_project.parts = from_project.parts.filter((part) => {
        return part.code_id != code_id;
      });
    }
    await from_project.save({ session: session });
    await session.commitTransaction(); // Commit all operations
    session.endSession();
    return res.status(200).json({ mssg: "Code Reverted" });
  } catch (error) {
    await session.abortTransaction(); // Rollback in case of an error
    session.endSession();
    console.log(error);
    return res.status(500).json({ mssg: error?.message || 'Internal server error' });
  }
};
const revert_issued_code = async (req, res) => {
  const session = await mongoose.startSession(); // Start a session
  session.startTransaction(); // Begin transaction
  try {
    const {
      code_id,
      ref_code_id,
      category,
      project_move_from,
      available_to_move_amount,
      move_amount,
    } = req.body;
    if (move_amount === 0) {
      return res.status(400).json({ mssg: "Quantity to move cannot be 0" });
    }
    if (move_amount > available_to_move_amount) {
      return res.status(400).json({ mssg: "Please Enter Valid Quantity" });
    }
    const from_project = await Project_Model.findOne({
      _id: project_move_from,
      project_status: "Active",
    }).session(session);
    const partToMove = from_project.parts.find(
      (part) => part.code_id == code_id
    );
    if (!partToMove) {
      return res
        .status(404)
        .json({ error: "Code not found in the source project" });
    }
    partToMove.required -= move_amount;
    partToMove.issued = available_to_move_amount - move_amount;
    if (category === "Package") {
      const update_stock = await Stock_model.findOneAndUpdate(
        { _id: code_id },
        [
          {
            $set: {
              available: { $add: ["$available", parseFloat(move_amount)] },
              total_available: { $add: ["$total_available", parseFloat(move_amount)] },
              free_inventory: {
                $subtract: [
                  { $add: ["$total_available", parseFloat(move_amount)] },
                  "$reserve"
                ]
              }
            }
          }
        ],
        { new: true }
      ).session(session);


      let stock_qty = update_stock.free_inventory;
      if (stock_qty < update_stock.msq) {
        const if_action = await Action_model.findOne({
          code_id: code_id,
          // ref_code_id: ref_code_id,
        });
        if (!if_action) {
          const new_notification = await Action_model.create({
            code_id: code_id,
            ref_code_id: ref_code_id,
            category: update_stock.category,
            order_type: "Package",
          });
        }
      } else if (stock_qty > update_stock.msq) {
        const deleted_notification = await Action_model.deleteMany({
          code_id: code_id,
          // ref_code_id: ref_code_id,
        });
      }
      const newLog = await Log_Model.create({
        stock_id: code_id,
        ref_code_id: ref_code_id,
        category: update_stock.category,
        stockType: "Package",
        description: `Action: ${update_stock.packing_code}(Issued Quantity) Reverted from ${from_project.project_name}, Free+=${move_amount}, Available+=${move_amount}`,
        snapShot: update_stock.toObject(),
      });
    } else if (category === "Loose") {
      const update_stock = await Stock_model.findOneAndUpdate(
        { _id: code_id },
        [
          {
            $set: {
              available: { $add: ["$available", parseFloat(move_amount)] },
              total_available: { $add: ["$total_available", parseFloat(move_amount)] },
              free_inventory: {
                $subtract: [
                  { $add: ["$total_available", parseFloat(move_amount)] },
                  "$reserve"
                ]
              }
            },
          },
        ],
        { new: true }
      ).session(session);
      let stock_qty = update_stock.free_inventory;
      if (stock_qty < update_stock.msq) {
        const if_action = await Action_model.findOne({
          code_id: code_id,
          // ref_code_id: ref_code_id,
        });
        if (!if_action) {
          const new_notification = await Action_model.create({
            code_id: code_id,
            ref_code_id: ref_code_id,
            category: update_stock.category,
            order_type: "Loose",
          });
        }
      } else if (stock_qty > update_stock.msq) {
        const deleted_notification = await Action_model.deleteMany({
          code_id: code_id,
          // ref_code_id: ref_code_id,
        });
      }
      const stockDetail = await LooseStockPopulate(code_id);
      const newLog = await Log_Model.create({
        stock_id: code_id,
        ref_code_id: ref_code_id,
        category: update_stock.category,
        stockType: "Loose",
        description: `Action: ${stockDetail[0].entry_details.code} Reverted from ${from_project.project_name}, Free+=${move_amount}, Available+=${move_amount}`,
        snapShot: update_stock.toObject(),
      });
    }
    if (partToMove.required == 0) {
      from_project.parts = from_project.parts.filter((part) => {
        return part.code_id != code_id;
      });
    }
    await from_project.save({ session: session });
    await session.commitTransaction(); // Commit all operations
    session.endSession();
    return res.status(200).json({ mssg: "Issued Code Reverted" });
  } catch (error) {
    await session.abortTransaction(); // Rollback in case of an error
    session.endSession();
    console.log(error);
    return res.status(500).json({ mssg: error?.message || 'Internal server error' });
  }
};
const increase_required_qnt = async (req, res) => {
  const session = await mongoose.startSession(); // Start a session
  session.startTransaction(); // Begin transaction
  try {
    const { project, code, code_id, ref_code_id, required_amount, category } =
      req.body;
    const project_detail = await Project_Model.findOne({
      _id: project,
      project_status: "Active",
    }).session(session);
    const part_to_update = project_detail.parts.find((itm) => {
      return itm.code_id == code_id;
    });
    if (!part_to_update) {
      res.status(400).json({
        mssg: "Part does not exist in project",
      });
      throw new Error(`Part does not exist in project`);
    }
    if (category === "Package") {
      const exist_stock = await Stock_model.findOne({
        _id: code_id,
      }).session(session);
      if (!exist_stock) {
        res.status(400).json({ mssg: `Stock not found for code: ${code}` });
        throw new Error(`Stock not found for code: ${code}`);
      }
      // if (required_amount > exist_stock.available) {
      //   res.status(400).json({
      //     mssg: `Required Quantity more than Available(${exist_stock.available}) for code ${code}`,
      //   });
      //   throw new Error(
      //     `Required Quantity more than Available(${exist_stock.available}) for code ${code}`
      //   );
      // }
      let updated_stock = {};
      if (exist_stock.open >= required_amount) {
        updated_stock = await Stock_model.findOneAndUpdate(
          { _id: code_id },
          {
            $set: {
              open: exist_stock.open - required_amount,
              // available: exist_stock.available - required_amount,
              free_inventory: exist_stock.free_inventory - required_amount,
            },
            $inc: { reserve: required_amount },
          },
          { new: true }
        ).session(session);
        const NewLog = await Log_Model.create({
          stock_id: code_id,
          ref_code_id: ref_code_id,
          category: updated_stock.category,
          stockType: "Package",
          description: `Action: ${updated_stock.packing_code}'s Quantity Increased(+${required_amount}) in Project ${project_detail.project_name} (Condition Open >= Required), Open-=${required_amount}, Free-=${required_amount}, Reserve+=${required_amount} `,
          snapShot: updated_stock.toObject(),
        });
      } else if (exist_stock.open < required_amount && exist_stock.open !== 0) {
        let open_till_zero = required_amount - exist_stock.open;
        updated_stock = await Stock_model.findOneAndUpdate(
          { _id: code_id },
          {
            $set: {
              open: exist_stock.open - exist_stock.open,
              // available:
              //   exist_stock.available - exist_stock.open - open_till_zero,
              free_inventory:
                exist_stock.free_inventory - exist_stock.open - open_till_zero,
            },
            $inc: { reserve: required_amount },
          },
          { new: true }
        ).session(session);
        const NewLog = await Log_Model.create({
          stock_id: code_id,
          ref_code_id: ref_code_id,
          category: updated_stock.category,
          stockType: "Package",
          description: `Action: ${updated_stock.packing_code}'s Quantity Increased(+${required_amount}) in Project ${project_detail.project_name} (Condition Open < Required && Open!=0 ), Open=0, Free-=(${exist_stock.open}+${open_till_zero}), Reserve+=${required_amount} `,
          snapShot: updated_stock.toObject(),
        });
      } else if (exist_stock.open === 0) {
        updated_stock = await Stock_model.findOneAndUpdate(
          { _id: code_id },
          // {
          //   $set: {
          //     // available: exist_stock.available - required_amount,
          //     // free_inventory: exist_stock.free_inventory - required_amount,
          //   },
          //   $inc: {
          //     reserve: required_amount,
          //     free_inventory: -required_amount,
          //     total_available: -required,
          //   },
          // },
          [
            {
              $set: {
                reserve: { $add: ["$reserve", parseFloat(required_amount)] },
                free_inventory: {
                  $subtract: [
                    "$total_available",
                    { $add: ["$reserve", parseFloat(required_amount)] },
                  ],
                },
              },
            },
          ],
          { new: true }
        ).session(session);
        const NewLog = await Log_Model.create({
          stock_id: code_id,
          ref_code_id: ref_code_id,
          category: updated_stock.category,
          stockType: "Package",
          description: `Action: ${updated_stock.packing_code}'s Quantity Increased(+${required_amount}) in Project ${project_detail.project_name} (Condition Open == 0), Free-=(${required_amount}), Reserve+=${required_amount} `,
          snapShot: updated_stock.toObject(),
        });
      }
      let stock_qty =
        updated_stock.free_inventory;
      if (stock_qty < exist_stock.msq) {
        const if_action = await Action_model.findOne({
          code_id: exist_stock._id,
          ref_code_id: exist_stock.reference_code_id,
        });
        if (!if_action) {
          const new_notification = await Action_model.create({
            code_id: exist_stock._id,
            ref_code_id: exist_stock.reference_code_id,
            category: exist_stock.category,
          });
        }
      }
    } else if (category === "Loose") {
      const exist_stock = await Loose_Stock_model.findOne({
        _id: code_id,
      }).session(session);
      if (!exist_stock) {
        res.status(400).json({ mssg: `Stock not found for code: ${code}` });
        throw new Error(`Stock not found for code: ${code}`);
      }
      // if (required_amount > exist_stock.available) {
      //   res.status(400).json({
      //     mssg: `Required Quantity more than Available(${exist_stock.available}) for code ${code}`,
      //   });
      //   throw new Error(
      //     `Required Quantity more than Available(${exist_stock.available}) for code ${code}`
      //   );
      // }

      //previous logic for loose

      // let updated_stock = await Loose_Stock_model.findOneAndUpdate(
      //   { _id: code_id },
      //   {
      //     $set: {
      //       available: exist_stock.available - required_amount,
      //       free_inventory: exist_stock.free_inventory - required_amount,
      //     },
      //     $inc: { reserve: required_amount },
      //   },
      //   { new: true }
      // );

      let updated_stock = {};
      const LooseDetail = await LooseStockPopulate(code_id);
      if (exist_stock.open >= required_amount) {
        updated_stock = await Loose_Stock_model.findOneAndUpdate(
          { _id: code_id },
          {
            $set: {
              open: exist_stock.open - required_amount,
              // available: exist_stock.available - required_amount,
              free_inventory: exist_stock.free_inventory - required_amount,
            },
            $inc: { reserve: required_amount },
          },
          { new: true }
        ).session(session);
        const NewLog = await Log_Model.create({
          stock_id: code_id,
          ref_code_id: ref_code_id,
          category: updated_stock.category,
          stockType: "Loose",
          description: `Action: ${LooseDetail[0].entry_details.code}'s Quantity Increased(+${required_amount}) in Project ${project_detail.project_name} (Condition Open >= Required ), Open-=${required_amount}, Free-=${required_amount}, Reserve+=${required_amount} `,
          snapShot: updated_stock.toObject(),
        });
      } else if (exist_stock.open < required_amount && exist_stock.open !== 0) {
        let open_till_zero = required_amount - exist_stock.open;
        updated_stock = await Loose_Stock_model.findOneAndUpdate(
          { _id: code_id },
          {
            $set: {
              open: exist_stock.open - exist_stock.open,
              // available:
              //   exist_stock.available - exist_stock.open - open_till_zero,
              free_inventory:
                exist_stock.free_inventory - exist_stock.open - open_till_zero,
            },
            $inc: { reserve: required_amount },
          },
          { new: true }
        ).session(session);
        const NewLog = await Log_Model.create({
          stock_id: code_id,
          ref_code_id: ref_code_id,
          category: updated_stock.category,
          stockType: "Loose",
          description: `Action: ${LooseDetail[0].entry_details.code}'s Quantity Increased(+${required_amount}) in Project ${project_detail.project_name} (Condition Open < Required && Open!=0 ), Open=0, Free-=(${exist_stock.open}+${open_till_zero}), Reserve+=${required_amount} `,
          snapShot: updated_stock.toObject(),
        });
      } else if (exist_stock.open === 0) {
        updated_stock = await Loose_Stock_model.findOneAndUpdate(
          { _id: code_id },
          // {
          //   $set: {
          //     // available: exist_stock.available - required_amount,
          //     // free_inventory: exist_stock.free_inventory - required_amount,
          //   },
          //   $inc: {
          //     reserve: required_amount,
          //     free_inventory: -required_amount,
          //     total_available: -required,
          //   },
          // },
          [
            {
              $set: {
                reserve: { $add: ["$reserve", parseFloat(required_amount)] },
                free_inventory: {
                  $subtract: [
                    "$total_available",
                    { $add: ["$reserve", parseFloat(required_amount)] },
                  ],
                },
              },
            },
          ],
          { new: true }
        ).session(session);
        const NewLog = await Log_Model.create({
          stock_id: code_id,
          ref_code_id: ref_code_id,
          category: updated_stock.category,
          stockType: "Loose",
          description: `Action: ${LooseDetail[0].entry_details.code}'s Quantity Increased(+${required_amount}) in Project ${project_detail.project_name} (Condition Open == 0), Free-=(${required_amount}), Reserve+=${required_amount} `,
          snapShot: updated_stock.toObject(),
        });
      }

      let stock_qty =
        updated_stock.free_inventory;
      if (stock_qty < updated_stock.msq) {
        const if_action = await Action_model.findOne({
          code_id: updated_stock._id,
          // ref_code_id: updated_stock.code_id,
        });
        if (!if_action) {
          const new_notification = await Action_model.create({
            code_id: updated_stock._id,
            ref_code_id: updated_stock.code_id,
            category: updated_stock.category,
            order_type: "Loose",
          });
        }
      } else if (stock_qty > updated_stock.msq) {
        const deleted_notification = await Action_model.deleteMany({
          code_id: updated_stock._id,
          // ref_code_id: updated_stock.code_id,
        });
      }
    }
    part_to_update.balance += parseFloat(required_amount);
    part_to_update.required += parseFloat(required_amount);
    await project_detail.save({ session: session });
    await session.commitTransaction(); // Commit all operations
    session.endSession();
    return res
      .status(200)
      .json({ mssg: "Required Quantity Updated for Project" });
  } catch (error) {
    await session.abortTransaction(); // Rollback in case of an error
    session.endSession();
    console.log(error);
    return res
      .status(500)
      .json({ mssg: "Some Error Occured" });
  }
};
const delete_project = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project_Model.findById(id);
    const totalIssued = project.parts.reduce(
      (acc, part) => parseFloat(acc) + parseFloat(part.issued),
      0
    );
    const totalRequired = project.parts.reduce(
      (acc, part) => acc + part.required,
      0
    );
    if (totalIssued < totalRequired) {
      return res
        .status(400)
        .json({ mssg: "Revert Required Stock Before Deleteing the Project" });
    } else {
      const update_project = await Project_Model.findByIdAndDelete(id);
      return res.status(200).json({ mssg: "Project Deleted Successfully" });
    }
    // await Promise.all(
    //   project.parts.map(async (itm) => {
    //     const stock_detail = await Stock_model.findOne({
    //       packing_code: itm.code,
    //     });
    //     const update_stock = await Stock_model.findOneAndUpdate(
    //       { packing_code: itm.code },
    //       { available: stock_detail.available + itm.required }
    //     );
    //   })
    // );
    // const update_project = await Project_Model.findByIdAndUpdate(id, {
    //   is_deleted: true,
    // });
    // return res.status(200).json({ mssg: "Project Deleted Successfully" });
  } catch (error) {
    console.log(error);
  }
};
const update_status = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project_Model.findByIdAndUpdate(id, {
      $set: { project_status: "Completed" },
    });
    return res.status(200).json({ mssg: "Project Status Updated" });
  } catch (error) {
    console.log(error);
  }
};
const code_in_projects = async (req, res) => {
  try {
    const { code_id } = req.params;
    const projects = await Project_Model.aggregate([
      {
        $unwind: {
          path: "$parts",
        },
      },
      {
        $match: {
          "parts.code_id": new mongoose.Types.ObjectId(code_id),
          project_status: "Active",
        },
      },
      {
        $lookup: {
          from: "loose_stock_models",
          localField: "parts.code_id",
          foreignField: "_id",
          as: "loose_stock_details",
          pipeline: [
            { $match: { active: true } }
          ]
        },
      },
      {
        $lookup: {
          from: "stock_models",
          localField: "parts.code_id",
          foreignField: "_id",
          as: "stock_details",
          pipeline: [
            { $match: { active: true } }
          ]
        },
      },
      {
        $lookup: {
          from: "accessories_input_models",
          localField: "parts.ref_code_id",
          foreignField: "_id",
          as: "accessory_details",
        },
      },
      {
        $lookup: {
          from: "profile_input_models",
          localField: "parts.ref_code_id",
          foreignField: "_id",
          as: "ni_details",
        },
      },
      {
        $lookup: {
          from: "profile_insulated_inputs",
          localField: "parts.ref_code_id",
          foreignField: "_id",
          as: "ins_details",
        },
      },
      {
        $lookup: {
          from: "kit_inputs",
          localField: "parts.ref_code_id",
          foreignField: "_id",
          as: "kit_details",
        },
      },
      {
        $addFields: {
          parts: {
            entry_details: {
              $switch: {
                branches: [
                  {
                    case: { $eq: ["$parts.type", "Accessory"] },
                    then: { $arrayElemAt: ["$accessory_details", 0] },
                  },
                  {
                    case: { $eq: ["$parts.type", "Non-Insulated Profile"] },
                    then: { $arrayElemAt: ["$ni_details", 0] },
                  },
                  {
                    case: { $eq: ["$parts.type", "Insulated Profile"] },
                    then: { $arrayElemAt: ["$ins_details", 0] },
                  },
                  {
                    case: { $eq: ["$parts.type", "Kit"] },
                    then: { $arrayElemAt: ["$kit_details", 0] },
                  },
                ],
                default: null,
              },
            },
          },
        },
      },
      {
        $addFields: {
          parts: {
            stock_details: {
              $switch: {
                branches: [
                  {
                    case: { $eq: ["$parts.category", "Package"] },
                    then: { $arrayElemAt: ["$stock_details", 0] },
                  },
                  {
                    case: { $eq: ["$parts.category", "Loose"] },
                    then: { $arrayElemAt: ["$loose_Stock_details", 0] },
                  },
                ],
                default: null,
              },
            },
          },
        },
      },
      {
        $group: {
          _id: "$_id",
          project_name: { $first: "$project_name" },
          project_number: { $first: "$project_number" },
          country: { $first: "$country" },
          city: { $first: "$city" },
          project_status: { $first: "$project_status" },
          parts: { $push: "$parts" },
        },
      },
      {
        $addFields: {
          parts: {
            $map: {
              input: "$parts",
              as: "part",
              in: {
                code_id: "$$part.code_id",
                ref_code_id: "$$part.ref_code_id",
                required: "$$part.required",
                available: "$$part.available",
                balance: "$$part.balance",
                issued: "$$part.issued",
                category: "$$part.category",
                type: "$$part.type",
                eta: "$$part.eta",
                entry_details: "$$part.entry_details",
                stock_details: "$$part.stock_details",
              },
            },
          },
        },
      },
    ]);
    // const projects = await Project_Model.aggregate([
    //   {
    //     $unwind: {
    //       path: "$parts",
    //     },
    //   },
    //   {
    //     $match: {
    //       "parts.code_id": new mongoose.Types.ObjectId(code_id),
    //       project_status: "Active",
    //        ,
    //     },
    //   },
    // ]);
    return res.status(200).json(projects);
  } catch (error) {
    console.log(error);
  }
};
const GeneratePdf = async (typeOfFile, filePath, answer) => {
  try {
    const template = fs.readFileSync(typeOfFile, "utf-8");
    const renderedTemplate = ejs.render(template, answer);
    const compiledTemplate = handlebars.compile(renderedTemplate);
    const executablePath = puppeteer.executablePath();
    // const browser = await puppeteer.launch({
    //   headless: true,
    //   executablePath: "/snap/bin/chromium",
    //   args: ["--no-sandbox", "--disable-setuid-sandbox"],
    // });

    const browser = await puppeteer.launch();

    const page = await browser.newPage();

    const htmlContent = compiledTemplate({ answer });
    await page.setContent(htmlContent);

    await page.pdf({
      path: filePath,
      printBackground: true,
    });
    await browser.close();

    return "PDF generated successfully!";
  } catch (error) {
    // console.error(error);
    return error;
  }
};
function formatDate(dateString) {
  const date = new Date(dateString);

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);

  return `${day}/${month}/${year}`;
}

const project_pdf = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project_Model.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
        },
      },
      {
        $unwind: "$parts",
      },
      {
        $lookup: {
          from: "loose_stock_models",
          localField: "parts.code_id",
          foreignField: "_id",
          as: "loose_stock_details",
          pipeline: [
            { $match: { active: true } }
          ]
        },
      },
      {
        $lookup: {
          from: "stock_models",
          localField: "parts.code_id",
          foreignField: "_id",
          as: "stock_details",
          pipeline: [
            { $match: { active: true } }
          ]
        },
      },
      {
        $lookup: {
          from: "accessories_input_models",
          localField: "parts.ref_code_id",
          foreignField: "_id",
          as: "accessory_details",
        },
      },
      {
        $lookup: {
          from: "profile_input_models",
          localField: "parts.ref_code_id",
          foreignField: "_id",
          as: "ni_details",
        },
      },
      {
        $lookup: {
          from: "profile_insulated_inputs",
          localField: "parts.ref_code_id",
          foreignField: "_id",
          as: "ins_details",
        },
      },
      {
        $lookup: {
          from: "kit_inputs",
          localField: "parts.ref_code_id",
          foreignField: "_id",
          as: "kit_details",
        },
      },
      {
        $addFields: {
          parts: {
            entry_details: {
              $switch: {
                branches: [
                  {
                    case: { $eq: ["$parts.type", "Accessory"] },
                    then: { $arrayElemAt: ["$accessory_details", 0] },
                  },
                  {
                    case: { $eq: ["$parts.type", "Non-Insulated Profile"] },
                    then: { $arrayElemAt: ["$ni_details", 0] },
                  },
                  {
                    case: { $eq: ["$parts.type", "Insulated Profile"] },
                    then: { $arrayElemAt: ["$ins_details", 0] },
                  },
                  {
                    case: { $eq: ["$parts.type", "Kit"] },
                    then: { $arrayElemAt: ["$kit_details", 0] },
                  },
                ],
                default: null,
              },
            },
          },
        },
      },
      {
        $addFields: {
          parts: {
            stock_details: {
              $switch: {
                branches: [
                  {
                    case: { $eq: ["$parts.category", "Package"] },
                    then: { $arrayElemAt: ["$stock_details", 0] },
                  },
                  {
                    case: { $eq: ["$parts.category", "Loose"] },
                    then: { $arrayElemAt: ["$loose_stock_details", 0] },
                  },
                ],
                default: null,
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: "accessories_supplier_models",
          localField: "parts.entry_details.supplier_id",
          foreignField: "_id",
          as: "lookupSupplier",
        },
      },
      {
        $lookup: {
          from: "profile_system_models", // Name of the collection for Profile_System_Model
          let: {
            systemField: "$parts.entry_details.system_id",
            subsystemField: "$parts.entry_details.subsystem_id",
          },
          pipeline: [
            {
              $unwind: "$system_detail",
            },
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$system_detail._id", "$$systemField"] },
                    {
                      $in: [
                        "$$subsystemField",
                        "$system_detail.subsystems._id",
                      ],
                    },
                  ],
                },
              },
            },
            {
              $addFields: {
                "system_detail.subsystems": {
                  $filter: {
                    input: "$system_detail.subsystems",
                    as: "subsystem",
                    cond: { $eq: ["$$subsystem._id", "$$subsystemField"] },
                  },
                },
              },
            },
          ],
          as: "lookupSystem",
        },
      },
      {
        $lookup: {
          from: "group_subgroups",
          localField: "parts.entry_details.group_id",
          foreignField: "_id",
          as: "lookupGroup",
        },
      },
      {
        $addFields: {
          lookupGroup: {
            $map: {
              input: "$lookupGroup",
              as: "groupDetail",
              in: {
                _id: "$$groupDetail._id",
                name: "$$groupDetail.name",
                subgroup: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$$groupDetail.subgroup",
                        as: "subgroupEntry",
                        cond: {
                          $eq: [
                            "$$subgroupEntry._id",
                            "$parts.entry_details.subgroup_id",
                          ],
                        },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          parts: {
            entry_details: {
              supplier: { $arrayElemAt: ["$lookupSupplier.name", 0] },
              system: {
                $arrayElemAt: ["$lookupSystem.system_detail.name", 0],
              },
              subsystem: {
                $arrayElemAt: [
                  {
                    $map: {
                      input: {
                        $arrayElemAt: [
                          "$lookupSystem.system_detail.subsystems",
                          0,
                        ],
                      },
                      as: "subsystem",
                      in: "$$subsystem.name",
                    },
                  },
                  0,
                ],
              },
              group: { $arrayElemAt: ["$lookupGroup.name", 0] },
              subgroup: {
                $arrayElemAt: ["$lookupGroup.subgroup.name", 0],
              },
            },
          },
        },
      },
      {
        $group: {
          _id: "$_id",
          project_name: { $first: "$project_name" },
          project_number: { $first: "$project_number" },
          client_project_number: { $first: "$client_project_number" },
          client_confirmation_number: { $first: "$client_confirmation_number" },
          project_confirmationDate: { $first: "$project_confirmationDate" },
          project_completionDate: { $first: "$project_completionDate" },
          country: { $first: "$country" },
          city: { $first: "$city" },
          project_status: { $first: "$project_status" },
          parts: { $push: "$parts" },
          createdAt: { $first: "$createdAt" },
          updatedAt: { $first: "$updatedAt" },
        },
      },
      {
        $addFields: {
          parts: {
            $map: {
              input: "$parts",
              as: "part",
              in: {
                code_id: "$$part.code_id",
                ref_code_id: "$$part.ref_code_id",
                required: "$$part.required",
                available: "$$part.available",
                balance: "$$part.balance",
                issued: "$$part.issued",
                category: "$$part.category",
                type: "$$part.type",
                eta: "$$part.eta",
                entry_details: "$$part.entry_details",
                stock_details: "$$part.stock_details",
              },
            },
          },
        },
      },
    ]);
    // console.log(project[0]);
    // return;
    const project_details = {
      project_number: project[0]?.project_number,
      project_name: project[0]?.project_name,
      client_project_number: project[0]?.client_project_number,
      client_confirmation_number: project[0]?.client_confirmation_number,
      project_confirmationDate: formatDate(
        project[0]?.project_confirmationDate
      ),
      project_completionDate: formatDate(project[0]?.project_completionDate),
      city: project[0]?.city,
      country: project[0]?.country,
      // issue_date: formatDate(project[0]?.createdAt),
      // last_update: formatDate(project[0]?.updatedAt),
      // client_name: project[0]?.client_name,

      // project_no: project[0]?.project_number,
      // project_name: project[0]?.project_name,
      // scope: "",
      bes_path:
        "https://phpstack-1164607-4081687.cloudwaysapps.com/uploads/BES.png",
      vetromax_path:
        "https://phpstack-1164607-4081687.cloudwaysapps.com/uploads/Vetromax.png",
    };
    const parts_detail = await project[0].parts.map(async (itm) => {
      // let part;
      // if (itm.category === "Package") {
      //   part = await Stock_model.findById(itm.stock_detail);
      // } else if (itm.category === "Loose") {
      //   part = await Loose_Stock_model.findById(itm.stock_detail);
      // }
      // const sumOfIssued = itm.issued.reduce(
      //   (partialSum, a) => partialSum + a,
      //   0
      // );
      let eta = null;
      let status = "";
      if (itm.stock_details.available == 0) {
        status = "Not Available";
        const check = (await get_eta_for_project_helper(itm.code_id)) || {};
        const { latestEta, ordered } = check;
        eta = latestEta ?? null;
      } else if (
        itm.stock_details.available !== 0 &&
        itm.stock_details.available < itm.required
      ) {
        status = "Partially Available";
        const check = (await get_eta_for_project_helper(itm.code_id)) || {};
        const { latestEta, ordered } = check;
        eta = latestEta ?? null;
      } else if (
        itm.stock_details.available !== 0 &&
        itm.stock_details.available >= itm.required
      ) {
        status = "Available";
      } else if (
        itm.stock_details.available !== 0 &&
        itm.stock_details.available < itm.required &&
        itm.issued < itm.required
      ) {
        status = "Partially Delivered";
      } else if (
        itm.stock_details.available !== 0 &&
        itm.stock_details.available < itm.required &&
        itm.issued == itm.required
      ) {
        status = "Delivered";
      } else {
        status = "Received From Coating";
      }
      // console.log(itm);
      // return;
      return {
        drawing: itm?.entry_details?.image,
        number:
          itm.category === "Package"
            ? itm?.stock_details?.packing_code
            : itm?.entry_details?.code,
        description:
          itm.category === "Package"
            ? itm?.stock_details?.packing_description
            : itm?.entry_details?.description,
        system: itm?.entry_details?.system,
        required: itm?.required,
        delivered: itm?.issued,
        balance: itm?.required - itm?.issued,
        unit:
          itm.category === "Package" ? itm?.stock_details?.packing_unit : "-",
        status,
        dn: "-",
        eta: eta ? formatDate(eta) : itm.entry_details?.lead_time,
        notes: "-",
      };
    });
    // return;
    Promise.all(parts_detail)
      .then(async (resolvedPartsDetail) => {
        const filepath = path.join(__dirname, "../view/project_detail.ejs");
        const htmlpath = path.join(
          __dirname,
          `../uploads/project_details/${project[0].project_name}.html`
        );
        const pdfpath = path.join(
          __dirname,
          `../uploads/project_details/${project[0].project_name}.pdf`
        );
        // const data = await GeneratePdf(filepath, pdfpath, {
        //   project_details,
        //   parts_detail: resolvedPartsDetail,
        // });
        // return res.status(200).json({
        //   mssg: "Success",
        //   // url: `https://price-list-api.ibrcloud.com/uploads/project_details/${project[0].project_name}.pdf`,
        //   url: `http://localhost:3003/uploads/project_details/${project[0].project_name}.pdf`,
        //   data: data.message,
        // });
        ejs.renderFile(
          filepath,
          { project_details, parts_detail: resolvedPartsDetail },
          (err, data) => {
            if (err) {
              res.send(err);
            } else {
              fs.writeFile(htmlpath, data, (err) => {
                if (err) {
                  console.error("Error writing file:", err);
                } else {
                  console.log("HTML file saved successfully!");
                  pdf
                    .create(data, {
                      format: "A3",
                      width: "1600px",
                      childProcessOptions: {
                        env: {
                          OPENSSL_CONF: "/dev/null",
                        },
                      },
                    })
                    .toFile(pdfpath, function (err, data) {
                      if (err) {
                        console.log(err);
                        res.send(err);
                      } else {
                        // res.send("File created successfully");
                        fs.unlinkSync(htmlpath);
                        return res.status(200).json({
                          mssg: "Success",
                          url: `${process.env.BACKENDURL}/uploads/project_details/${project[0].project_name}.pdf`,
                          data: data.message,
                        });
                      }
                    });
                }
              });
            }
          }
        );
      })
      .catch((error) => {
        console.error("promise Error:", error);
      });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: error?.message || 'Internal server error' });
  }
};
const import_excel_file = async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.file;
    const filePath = req.file.path;
    const project_name = file.originalname.split(".")[0];
    const workbook = xlsx.readFile(filePath);
    const sheetNames = workbook.SheetNames;
    const firstSheetName = sheetNames[0];
    const firstSheet = workbook.Sheets[firstSheetName];
    const jsonData = xlsx.utils.sheet_to_json(firstSheet);
    const rejected_entry = [];
    const colorMap = {
      Missing_Data: "FFFF0000", // Red
      Stock_Not_Found: "FEFE00", // Yellow
      Invalid_Required: "0000FF", //Blue
      Invalid_Category: "FF00B050", // Green,
      Required_Greater_than_Available: "C19A6B", // Brown,
    };
    let rejectionReason = null;
    let sums = {};
    await Promise.all(
      jsonData.map(async (part) => {
        if (
          !part?.Code ||
          part?.Required === undefined ||
          part?.Required === null ||
          !part?.Category
        ) {
          rejected_entry.push({
            reason: "Missing_Data",
            data: part,
            color: colorMap["Missing_Data"],
          });
        } else {
          let stock;
          if (part?.Category === "Package") {
            stock = await Stock_model.findOne({
              packing_code: part.Code,
            });
          } else if (part?.Category === "Loose") {
            stock = await Loose_Stock_model.findOne({
              code: part.Code,
            });
          }
          if (part?.Category !== "Package" && part?.Category !== "Loose") {
            rejected_entry.push({
              reason: "Invalid_Category",
              data: part,
              color: colorMap["Invalid_Category"],
            });
            return;
          } else if (!stock) {
            rejected_entry.push({
              reason: "Stock_Not_Found",
              data: part,
              color: colorMap["Stock_Not_Found"],
            });
            return;
          } else if (part.Required == 0 || typeof part?.Required !== "number") {
            rejectionReason = "Invalid_Required";
            rejected_entry.push({
              reason: "Invalid_Required",
              data: part,
              color: colorMap["Invalid_Required"],
            });
            return;
          } else {
            if (!sums[part.Code]) {
              let eta = null;
              if (part.Required > stock?.available) {
                const { latestEta, ordered } = await get_eta_for_project_helper(
                  part?.Code
                );
                eta = latestEta;
                // if (ordered + stock?.available > part.Required) {
                //   rejectionReason = "Required_Greater_than_Available";
                //   rejected_entry.push({
                //     reason: "Required_Greater_than_Available",
                //     data: part,
                //     color: colorMap["Required_Greater_than_Available"],
                //   });
                //   return;
                // }
              }
              sums[part.Code] = {
                code: part.Code,
                reference_code: stock?.reference_code,
                code_id: stock?._id,
                ref_code_id: stock?.reference_code_id,
                available: stock?.free_inventory,
                balance: 0,
                eta: eta,
                stock_detail: stock?._id,
                type: stock?.category,
                category: part.Category,
                required: 0,
              };
            }
            sums[part.Code].required += parseFloat(part.Required);
          }
        }
      })
    );
    Object.keys(sums).forEach((code) => {
      sums[code].balance = sums[code].required - sums[code].available;
    });
    let result = Object.values(sums);
    // return;
    await Promise.all(
      result.map(async (itm, idx) => {
        if (itm.category === "Package") {
          const exist_stock = await Stock_model.findOne({
            _id: new mongoose.Types.ObjectId(itm.code_id),
          });
          let updated_stock = {};
          if (exist_stock.open >= itm.required) {
            updated_stock = await Stock_model.findOneAndUpdate(
              { _id: new mongoose.Types.ObjectId(itm.code_id) },
              {
                $set: {
                  open: exist_stock.open - itm.required,
                  // available: exist_stock.available - itm.required,
                  free_inventory: exist_stock.free_inventory - itm.required,
                },
                $inc: { reserve: parseFloat(itm.required) },
              },
              { new: true }
            );
          } else if (
            exist_stock.open < itm.required &&
            exist_stock.open !== 0
          ) {
            let open_till_zero = itm.required - exist_stock.open;
            updated_stock = await Stock_model.findOneAndUpdate(
              { _id: new mongoose.Types.ObjectId(itm.code_id) },
              {
                $set: {
                  open: exist_stock.open - exist_stock.open,
                  // available:
                  //   exist_stock.available - open_till_zero - exist_stock.open,
                  free_inventory:
                    exist_stock.free_inventory -
                    open_till_zero -
                    exist_stock.open,
                },
                $inc: { reserve: parseFloat(itm.required) },
              },
              { new: true }
            );
          } else if (exist_stock.open === 0) {
            updated_stock = await Stock_model.findOneAndUpdate(
              { _id: new mongoose.Types.ObjectId(itm.code_id) },
              // {
              //   $set: {
              //     // available: exist_stock.available - itm.required,
              //     // free_inventory: exist_stock.free_inventory - itm.required,
              //   },
              //   $inc: {
              //     reserve: parseFloat(itm.required),
              //     free_inventory: -parseFloat(itm.required),
              //     total_available: -parseFloat(itm.required),
              //   },
              // },
              [
                {
                  $set: {
                    reserve: { $add: ["$reserve", parseFloat(itm.required)] },
                    free_inventory: {
                      $subtract: [
                        "$total_available",
                        { $add: ["$reserve", parseFloat(itm.required)] },
                      ],
                    },
                  },
                },
              ],
              { new: true }
            );
          }
          let stock_qty =
            updated_stock.free_inventory;
          if (stock_qty < exist_stock.msq) {
            const if_action = await Action_model.findOne({
              code_id: exist_stock._id,
              // ref_code_id: exist_stock.reference_code_id,
            });
            if (!if_action) {
              const new_notification = await Action_model.create({
                code_id: exist_stock._id,
                ref_code_id: exist_stock.reference_code_id,
                category: exist_stock.category,
                order_type: "Package",
              });
            }
          }
        } else if (itm.category === "Loose") {
          const exist_stock = await Loose_Stock_model.findOne({
            _id: itm.code_id,
          });
          if (!exist_stock) {
            res
              .status(400)
              .json({ mssg: `Loose Stock not found for code: ${itm.code}` });
            throw new Error(`Loose Stock not found for code: ${itm.code}`);
          }
          let updated_stock = {};
          if (exist_stock.open >= itm.required) {
            updated_stock = await Loose_Stock_model.findOneAndUpdate(
              { _id: new mongoose.Types.ObjectId(itm.code_id) },
              {
                $set: {
                  open: exist_stock.open - itm.required,
                  // available: exist_stock.available - itm.required,
                  free_inventory: exist_stock.free_inventory - itm.required,
                },
                $inc: { reserve: parseFloat(itm.required) },
              },
              { new: true }
            );
          } else if (
            exist_stock.open < itm.required &&
            exist_stock.open !== 0
          ) {
            let open_till_zero = itm.required - exist_stock.open;
            updated_stock = await Loose_Stock_model.findOneAndUpdate(
              { _id: new mongoose.Types.ObjectId(itm.code_id) },
              {
                $set: {
                  open: exist_stock.open - exist_stock.open,
                  // available:
                  //   exist_stock.available - open_till_zero - exist_stock.open,
                  free_inventory:
                    exist_stock.free_inventory -
                    open_till_zero -
                    exist_stock.open,
                },
                $inc: { reserve: parseFloat(itm.required) },
              },
              { new: true }
            );
          } else if (exist_stock.open === 0) {
            updated_stock = await Loose_Stock_model.findOneAndUpdate(
              { _id: new mongoose.Types.ObjectId(itm.code_id) },
              // {
              //   $set: {
              //     // available: exist_stock.available - itm.required,
              //     // free_inventory: exist_stock.free_inventory - itm.required,
              //   },
              //   $inc: {
              //     reserve: parseFloat(itm.required),
              //     free_inventory: -parseFloat(itm.required),
              //     total_available: -parseFloat(itm.required),
              //   },
              // },
              [
                {
                  $set: {
                    reserve: { $add: ["$reserve", parseFloat(itm.required)] },
                    free_inventory: {
                      $subtract: [
                        "$total_available",
                        { $add: ["$reserve", parseFloat(itm.required)] },
                      ],
                    },
                  },
                },
              ],
              { new: true }
            );
          }
          let stock_qty =
            updated_stock.free_inventory;
          if (stock_qty < updated_stock.msq) {
            const if_action = await Action_model.findOne({
              code_id: updated_stock._id,
            });
            if (!if_action) {
              const new_notification = await Action_model.create({
                code_id: updated_stock._id,
                ref_code_id: updated_stock.code_id,
                // Stock_details: updated_stock.reference_code_id,
                category: updated_stock.category,
                order_type: "Loose",
              });
            }
          } else if (stock_qty > updated_stock.msq) {
            const deleted_notification = await Action_model.deleteMany({
              code_id: updated_stock._id,
            });
          }
        }
      })
    );
    if (result.length > 0) {
      const new_project = await Project_Model.findByIdAndUpdate(id, {
        project_name: project_name,
        $push: {
          parts: result,
        },
      });
    }
    fs.unlinkSync(filePath);
    return res
      .status(200)
      .json({ mssg: "Project File Imported", rejected_entry });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: error?.message || 'Internal server error' });
  }
};

async function findCodeWithMilutipleSupplier(req, res) {
  const files = req.files;
  const other = files.files || [];
  const excelfile = files.file[0];
  const client_confirmation =
    req.files != {} && req.files.client_confirmation !== undefined
      ? `${process.env.BACKENDURL}/uploads/${req.files.client_confirmation[0].filename}`
      : "";
  const quotation_number =
    req.files != {} && req.files.quotation_number !== undefined
      ? `${process.env.BACKENDURL}/uploads/${req.files.quotation_number[0].filename}`
      : "";
  const fileData = req.body.fileData ? JSON.parse(req.body.fileData) : [];
  const project_form = JSON.parse(req.body.project_form);
  const client_form = JSON.parse(req.body.client_form);
  const combinedFiles = other.map((file) => {
    const fileInfo = fileData.find((data) => data.name === file.originalname);
    return {
      file: files.files,
      name: fileInfo ? fileInfo.name : "",
      path: `${process.env.BACKENDURL}/uploads/${file.filename}`,
      date: fileInfo ? fileInfo.date : "",
      revision: fileInfo ? fileInfo.revision : 0,
      type: fileInfo ? fileInfo.type : ".jpg",
    };
  });
  const {
    name,
    number,
    country,
    city,
    client_project_number,
    contract_value,
    project_confirmationDate,
    project_completionDate,
  } = project_form;

  if (
    client_form.name === "" ||
    client_form.name === null ||
    name === "" ||
    name === null ||
    number === "" ||
    number === null ||
    client_project_number === "" ||
    client_project_number === null ||
    client_confirmation === "" ||
    client_confirmation === null ||
    quotation_number === "" ||
    quotation_number === null ||
    contract_value === "" ||
    contract_value === null ||
    project_confirmationDate === "" ||
    project_confirmationDate === null ||
    project_completionDate === "" ||
    project_completionDate === null ||
    country === "" ||
    country === null ||
    city === "" ||
    city === null
  ) {
    return res.status(400).json({
      type: "validation_failed",
      mssg: "Client Name, Project Name, Project number, City, Client Project Number, Client Confirmation, Quotation Number, Contract Value, Project Confirmation Date, Project Completion Date, Country, City",
    });
  }

  const filePath = excelfile.path;
  const workbook = xlsx.readFile(filePath);
  const sheetNames = workbook.SheetNames;
  const firstSheetName = sheetNames[0];
  const firstSheet = workbook.Sheets[firstSheetName];
  const jsonData = xlsx.utils.sheet_to_json(firstSheet);
  const rejected_entry = [];
  const no_code = [];
  const colorMap = {
    Missing_Data: "FFFF0000", // Red
    Stock_Not_Found: "FEFE00", // Yellow
    Invalid_Required: "87CEEB", //Blue
    Invalid_Category: "FF00B050", // Green,
    Invalid_Type: "CBC3E3", //Purple
    Required_Greater_than_Available: "C19A6B", // Brown,
    Code_Not_Found: "FEFE00",
  };
  let rejectionReason = null;
  let sums = {};
  const dataFromFile = [];
  await Promise.all(
    jsonData.map(async (part) => {
      if (
        !part?.code ||
        part?.required === undefined ||
        part?.required === null ||
        !part?.category ||
        !part?.type
      ) {
        rejected_entry.push({
          reason: "Missing_Data",
          data: part,
          color: colorMap["Missing_Data"],
        });
      } else {
        let stock;
        if (
          part?.type !== "Accessory" &&
          part?.type !== "Non-Insulated Profile" &&
          part?.type !== "Kit" &&
          part?.type !== "Insulated Profile"
        ) {
          rejected_entry.push({
            reason: "Invalid_Type",
            data: part,
            color: colorMap["Invalid_Type"],
          });
        }
        if (part?.category !== "Package" && part?.category !== "Loose") {
          rejected_entry.push({
            reason: "Invalid_Category",
            data: part,
            color: colorMap["Invalid_Category"],
          });
          return;
        } else if (part.required == 0) {
          rejectionReason = "Invalid_Required";
          rejected_entry.push({
            reason: "Invalid_Required",
            data: part,
            color: colorMap["Invalid_Required"],
          });
          return;
        }
        if (part?.category === "Package") {
          stock = await Stock_model.findOne({
            packing_code: part.code,
          });
          if (!stock) {
            no_code.push({
              reason: "Code_Not_Found",
              data: part,
              color: colorMap["Code_Not_Found"],
            });
            return;
          }
          let ifEta = await get_eta_for_project_helper(stock._id);
          let ifMultipleSupplier = await Stock_model.aggregate([
            {
              $lookup: {
                from: "accessories_input_models",
                localField: "reference_code_id",
                foreignField: "_id",
                as: "accessory_details",
              },
            },
            {
              $lookup: {
                from: "profile_input_models",
                localField: "reference_code_id",
                foreignField: "_id",
                as: "ni_details",
              },
            },
            {
              $lookup: {
                from: "profile_insulated_inputs",
                localField: "reference_code_id",
                foreignField: "_id",
                as: "ins_details",
              },
            },
            {
              $lookup: {
                from: "kit_inputs",
                localField: "reference_code_id",
                foreignField: "_id",
                as: "kit_details",
              },
            },
            {
              $addFields: {
                entry_details: {
                  $switch: {
                    branches: [
                      {
                        case: { $eq: ["$category", "Accessory"] },
                        then: { $arrayElemAt: ["$accessory_details", 0] },
                      },
                      {
                        case: { $eq: ["$category", "Non-Insulated Profile"] },
                        then: { $arrayElemAt: ["$ni_details", 0] },
                      },
                      {
                        case: { $eq: ["$category", "Insulated Profile"] },
                        then: { $arrayElemAt: ["$ins_details", 0] },
                      },
                      {
                        case: { $eq: ["$category", "Kit"] },
                        then: { $arrayElemAt: ["$kit_details", 0] },
                      },
                    ],
                    default: null,
                  },
                },
              },
            },
            {
              $project: {
                accessory_details: 0,
                ni_details: 0,
                ins_details: 0,
                kit_details: 0,
              },
            },
            {
              $addFields: {
                supplier: "$entry_details.supplier",
              },
            },
            {
              $group: {
                _id: "$packing_code",
                reference_code_ids: { $addToSet: "$reference_code_id" },
                suppliers: { $addToSet: "$supplier" },
                stocks: { $push: "$$ROOT" },
              },
            },
            {
              $match: {
                $expr: {
                  $and: [
                    { $gt: [{ $size: "$reference_code_ids" }, 1] },
                    { $gt: [{ $size: "$suppliers" }, 1] },
                  ],
                },
              },
            },
            {
              $project: {
                _id: 0,
                stock_code: "$_id",
                suppliers: 1,
                stocks: {
                  $map: {
                    input: "$stocks",
                    as: "stock",
                    in: {
                      code: "$$stock.packing_code",
                      code_id: "$$stock._id",
                      ref_code_id: "$$stock.reference_code_id",
                      type: "$$stock.category",
                      available: "$$stock.available",
                      free: "$$stock.free_inventory",
                      balance: "$$stock.available",
                      category: "Package",
                      // required: "$$stock.required",
                      required: part.required,
                      unit_price: part.unit_price,
                      total_price: 0,
                      scope: "Material",
                      supplier: "$$stock.supplier",
                      entry_details: "$$stock.entry_details",
                      eta: ifEta ? ifEta.latestEta : null,
                    },
                  },
                },
              },
            },
            {
              $match: {
                stock_code: part.code,
              },
            },
          ]);
          if (ifMultipleSupplier.length > 0) {
            dataFromFile.push(...ifMultipleSupplier);
            return;
          }
          if (!sums[part.code]) {
            sums[part.code] = {
              code: part.code, // we need code because it is used in aggregate for function to find multiple supplier with same code name
              code_id: stock._id,
              ref_code_id: stock.reference_code_id,
              category: part.category, // Package or Loose
              type: part.type,
              available: stock.available,
              balance: stock.total_balance,
              required: part.required,
              unit_price: part.unit_price,
              total_price: part.total_price,
              scope: "Material",
              eta: ifEta ? ifEta.latestEta : null,
            };
          }
        } else if (part?.category === "Loose") {
          let part_code_id = "";
          if (part.type === "Accessory") {
            const findAccessory = await Accessories_Input_Model.findOne({
              code: part.code,
            });
            part_code_id = findAccessory?._id;

            stock = await Loose_Stock_model.findOne({
              code_id: part_code_id,
            });

            if (!stock) {
              no_code.push({
                reason: "Code_Not_Found",
                data: part,
                color: colorMap["Code_Not_Found"],
              });
              return;
            }
          } else if (part.type === "Kit") {
            const findAccessory = await Kit_Input.findOne({
              code: part.code,
            });
            part_code_id = findAccessory?._id;
            stock = await Loose_Stock_model.findOne({
              code_id: part_code_id,
            });
            if (!stock) {
              no_code.push({
                reason: "Code_Not_Found",
                data: part,
                color: colorMap["Code_Not_Found"],
              });
              return;
            }
          } else if (part.type === "Insulated Profile") {
            const findAccessory = await Profile_Insulated_Input.findOne({
              code: part.code,
            });
            part_code_id = findAccessory?._id;
            stock = await Loose_Stock_model.findOne({
              code_id: part_code_id,
            });
            if (!stock) {
              no_code.push({
                reason: "Code_Not_Found",
                data: part,
                color: colorMap["Code_Not_Found"],
              });
              return;
            }
          } else if (part.type === "Non-Insulated Profile") {
            const findAccessory = await Profile_Input_Model.findOne({
              code: part.code,
            });
            part_code_id = findAccessory?._id;
            stock = await Loose_Stock_model.findOne({
              code_id: part_code_id,
            });
            if (!stock) {
              no_code.push({
                reason: "Code_Not_Found",
                data: part,
                color: colorMap["Code_Not_Found"],
              });
              return;
            }
          }
          let ifEta = get_eta_for_project_helper(part_code_id);
          let ifMultipleSupplier = await Loose_Stock_model.aggregate([
            {
              $lookup: {
                from: "accessories_input_models",
                localField: "code_id",
                foreignField: "_id",
                as: "accessory_details",
              },
            },
            {
              $lookup: {
                from: "profile_input_models",
                localField: "code_id",
                foreignField: "_id",
                as: "ni_details",
              },
            },
            {
              $lookup: {
                from: "profile_insulated_inputs",
                localField: "code_id",
                foreignField: "_id",
                as: "ins_details",
              },
            },
            {
              $lookup: {
                from: "kit_inputs",
                localField: "code_id",
                foreignField: "_id",
                as: "kit_details",
              },
            },
            {
              $addFields: {
                entry_details: {
                  $switch: {
                    branches: [
                      {
                        case: {
                          $eq: ["$category", "Accessory"],
                        },
                        then: {
                          $arrayElemAt: ["$accessory_details", 0],
                        },
                      },
                      {
                        case: {
                          $eq: ["$category", "Non-Insulated Profile"],
                        },
                        then: {
                          $arrayElemAt: ["$ni_details", 0],
                        },
                      },
                      {
                        case: {
                          $eq: ["$category", "Insulated Profile"],
                        },
                        then: {
                          $arrayElemAt: ["$ins_details", 0],
                        },
                      },
                      {
                        case: { $eq: ["$category", "Kit"] },
                        then: {
                          $arrayElemAt: ["$kit_details", 0],
                        },
                      },
                    ],
                    default: null,
                  },
                },
              },
            },
            {
              $project: {
                accessory_details: 0,
                ni_details: 0,
                ins_details: 0,
                kit_details: 0,
              },
            },
            {
              $addFields: {
                supplier: "$entry_details.supplier",
              },
            },
            {
              $group: {
                _id: "$entry_details.code",
                reference_code_ids: {
                  $addToSet: "$code_id",
                },
                suppliers: { $addToSet: "$supplier" },
                stocks: { $push: "$$ROOT" },
              },
            },
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $gt: [{ $size: "$reference_code_ids" }, 1],
                    },
                    { $gt: [{ $size: "$suppliers" }, 1] },
                  ],
                },
              },
            },
            {
              $project: {
                _id: 0,
                stock_code: "$_id",
                suppliers: 1,
                stocks: {
                  $map: {
                    input: "$stocks",
                    as: "stock",
                    in: {
                      code: "$$stock.entry_details.code",
                      code_id: "$$stock._id",
                      ref_code_id: "$$stock.reference_code_id",
                      type: "$$stock.category",
                      available: "$$stock.available",
                      free: "$$stock.free_inventory",
                      balance: "$$stock.available",
                      category: "Loose",
                      // required: "$$stock.required",
                      required: part.required,
                      unit_price: part.unit_price,
                      total_price: 1,
                      scope: "Material",
                      supplier: "$$stock.supplier",
                      entry_details: "$$stock.entry_details",
                      eta: ifEta ? ifEta.latestEta : null,
                    },
                  },
                },
              },
            },
            {
              $match: {
                stock_code: part.code,
              },
            },
          ]);
          if (ifMultipleSupplier.length > 0) {
            dataFromFile.push(...ifMultipleSupplier);
            return;
          }
          if (!sums[part.code]) {
            sums[part.code] = {
              code: part.code,
              code_id: part_code_id,
              ref_code_id: stock.code_id,
              category: part.category,
              type: part.type,
              available: stock.available,
              balance: stock.total_balance,
              required: part.required,
              unit_price: part.unit_price,
              total_price: part.total_price,
              scope: "Material",
              eta: ifEta ? ifEta.latestEta : null,
            };
          }
        }
      }
      sums[part.code].required += parseFloat(part.required);
    })
  );
  Object.keys(sums).forEach((code) => {
    sums[code].balance = sums[code].available - sums[code].required;
  });
  let result = Object.values(sums);
  fs.unlinkSync(filePath);
  if (rejected_entry.length > 0) {
    return res.status(400).json({
      mssg: "File Imported but some files were rejected",
      type: "rejected",
      rejected_entry,
    });
  }
  if (dataFromFile.length > 0 || no_code.length > 0) {
    return res.status(400).json({
      mssg: "File Imported but some entries were found to have multiple supplier, please select.",
      type: "multiple_supplier_or_no_code",
      successFul_Entry: result,
      multipleSupplierCode: dataFromFile,
      no_code,
    });
  }
  // if (no_code.length > 0) {
  //   return res.status(400).json({
  //     mssg: "File Imported but some entries were not found. Excel file contains the data.",
  //     type: "no_code",
  //     no_code,
  //   });
  // }
  return res.status(200).json({
    mssg: "All Entries From File Successfully Imported",
    type: "success",
    successFul_Entry: result,
  });
}

module.exports = {
  add_project,
  get_all_projects,
  get_single_project,
  update_project,
  get_project_with_code,
  move_code,
  revert_code,
  revert_issued_code,
  increase_required_qnt,
  delete_project,
  update_status,
  code_in_projects,
  project_pdf,
  import_excel_file,
  get_project_Client_name,
  get_Project,
  findCodeWithMilutipleSupplier,
};
