const sendEmail = require("../config/sendEmail");
const sendInquiry = require("../config/sendInquiry");
const Inquiry_Model = require("../models/inquiry_model");
const Sent_Inquiry_Model = require("../models/sent_inquiry_model");
const fs = require("fs");
const pdf = require("html-pdf");
const path = require("path");
const ejs = require("ejs");
const { default: mongoose } = require("mongoose");
const Loose_Stock_model = require("../models/loose_stock_model");
const Stock_model = require("../models/stock_model");
const Accessories_Supplier_Model = require("../models/accessories_supplier_model");
const { checkInteger } = require("../config/common");
const Action_model = require("../models/actions_model");

const inquiry_pdf_maker = (id) => {
  return new Promise(async (resolve, reject) => {
    try {
      let inq = await Inquiry_Model.findById(id)
      let inquiry = []
      if (inq.parts.length) {
        inquiry = await Inquiry_Model.aggregate([
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
                        case: { $eq: ["$parts.order_type", "Package"] },
                        then: { $arrayElemAt: ["$stock_details", 0] },
                      },
                      {
                        case: { $eq: ["$parts.order_type", "Loose"] },
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
                        {
                          $eq: ["$system_detail._id", "$$systemField"],
                        },
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
                        cond: {
                          $eq: ["$$subsystem._id", "$$subsystemField"],
                        },
                      },
                    },
                  },
                },
              ],
              as: "lookup_system",
            },
          },
          {
            $lookup: {
              from: "group_subgroups",
              localField: "parts.entry_details.group_id",
              foreignField: "_id",
              as: "lookup_group_subgroup",
            },
          },
          {
            $addFields: {
              lookup_group_subgroup: {
                $map: {
                  input: "$lookup_group_subgroup",
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
            $lookup: {
              from: "accessories_supplier_models",
              localField: "parts.entry_details.supplier_id",
              foreignField: "_id",
              as: "lookup_supplier",
            },
          },
          {
            $lookup: {
              from: "currency_models",
              localField: "parts.entry_details.lookup_supplier.currency_id",
              foreignField: "_id",
              as: "lookup_currency",
            },
          },
          {
            $lookup: {
              from: "finishes",
              localField: "parts.entry_details.finish_id",
              foreignField: "_id",
              as: "lookup_finish",
            },
          },
          {
            $addFields: {
              lookup_finish: {
                $map: {
                  input: "$lookup_finish",
                  as: "finishDetail",
                  in: {
                    _id: "$$finishDetail._id",
                    name: "$$finishDetail.name",
                    code: "$$finishDetail.code",
                    description: "$$finishDetail.description",
                    color: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$$finishDetail.color",
                            as: "color",
                            cond: {
                              $eq: [
                                "$$color._id",
                                "$parts.entry_details.color_id",
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
            $facet: {
              accessoryLookup: [
                {
                  $match: {
                    $or: [{ "parts.type": "Accessory" }, { "parts.type": "Kit" }],
                  },
                },
                {
                  $lookup: {
                    from: "materials",
                    localField: "parts.entry_details.material_id",
                    foreignField: "_id",
                    as: "lookup_material",
                  },
                },
                {
                  $addFields: {
                    lookup_material: {
                      $map: {
                        input: "$lookup_material",
                        as: "materialDetail",
                        in: {
                          _id: "$$materialDetail._id",
                          name: "$$materialDetail.name",
                          grade: {
                            $arrayElemAt: [
                              {
                                $filter: {
                                  input: "$$materialDetail.grade",
                                  as: "grade",
                                  cond: {
                                    $eq: [
                                      "$$grade._id",
                                      "$parts.entry_details.grade_id",
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
              ],
              niProfileLookup: [
                {
                  $match: {
                    $or: [
                      { "parts.type": "Non-Insulated Profile" },
                      { "parts.type": "Insulated Profile" },
                    ],
                  },
                },
                {
                  $lookup: {
                    from: "raw_material_models",
                    localField: "parts.entry_details.material_id",
                    foreignField: "_id",
                    as: "lookup_raw_material",
                  },
                },
                {
                  $addFields: {
                    lookup_raw_material: {
                      $map: {
                        input: "$lookup_raw_material",
                        as: "rawMaterialDetail",
                        in: {
                          _id: "$$rawMaterialDetail._id",
                          name: "$$rawMaterialDetail.name",
                          grade: {
                            $arrayElemAt: [
                              {
                                $filter: {
                                  input: "$$rawMaterialDetail.grade",
                                  as: "grade",
                                  cond: {
                                    $eq: [
                                      "$$grade._id",
                                      "$parts.entry_details.grade_id",
                                    ],
                                  },
                                },
                              },
                              0,
                            ],
                          },
                          alloy: "$$rawMaterialDetail.alloy",
                          temper: "$$rawMaterialDetail.temper",
                        },
                      },
                    },
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              combinedResults: {
                $concatArrays: ["$accessoryLookup", "$niProfileLookup"],
              },
            },
          },
          {
            $unwind: "$combinedResults",
          },
          {
            $replaceRoot: { newRoot: "$combinedResults" },
          },
          {
            $addFields: {
              material: {
                $switch: {
                  branches: [
                    {
                      case: {
                        $eq: ["$parts.type", "Accessory"],
                      },
                      then: {
                        $arrayElemAt: ["$lookup_material.name", 0],
                      },
                    },
                    {
                      case: {
                        $eq: ["$parts.type", "Non-Insulated Profile"],
                      },
                      then: {
                        $arrayElemAt: ["$lookup_raw_material.name", 0],
                      },
                    },
                  ],
                  default: null,
                },
              },
              grade: {
                $switch: {
                  branches: [
                    {
                      case: {
                        $eq: ["$parts.type", "Accessory"],
                      },
                      then: {
                        $arrayElemAt: ["$lookup_material.grade.name", 0],
                      },
                    },
                    {
                      case: {
                        $eq: ["$parts.type", "Non-Insulated Profile"],
                      },
                      then: {
                        $arrayElemAt: ["$lookup_raw_material.grade.name", 0],
                      },
                    },
                  ],
                  default: null,
                },
              },
              alloy: {
                $switch: {
                  branches: [
                    {
                      case: {
                        $eq: ["$parts.type", "Non-Insulated Profile"],
                      },
                      then: {
                        $arrayElemAt: [
                          {
                            $map: {
                              input: "$lookup_raw_material.alloy",
                              as: "alloyItem",
                              in: "$$alloyItem.name",
                            },
                          },
                          0,
                        ],
                      },
                    },
                  ],
                  default: null,
                },
              },
              temper: {
                $switch: {
                  branches: [
                    {
                      case: {
                        $eq: ["$parts.type", "Non-Insulated Profile"],
                      },
                      then: {
                        $arrayElemAt: [
                          {
                            $map: {
                              input: "$lookup_raw_material.temper",
                              as: "temperItem",
                              in: "$$temperItem.name",
                            },
                          },
                          0,
                        ],
                      },
                    },
                  ],
                  default: null,
                },
              },
            },
          },

          {
            $addFields: {
              parts: {
                entry_details: {
                  system: {
                    $arrayElemAt: ["$lookup_system.system_detail.name", 0],
                  },
                  subsystem: {
                    $arrayElemAt: [
                      {
                        $map: {
                          input: {
                            $arrayElemAt: [
                              "$lookup_system.system_detail.subsystems",
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
                  group: {
                    $arrayElemAt: ["$lookup_group_subgroup.name", 0],
                  },
                  subgroup: {
                    $arrayElemAt: ["$lookup_group_subgroup.subgroup.name", 0],
                  },
                  supplier: {
                    $arrayElemAt: ["$lookup_supplier.name", 0],
                  },
                  supplier_code: {
                    $arrayElemAt: ["$lookup_supplier.code", 0],
                  },
                  material: {
                    $switch: {
                      branches: [
                        {
                          case: {
                            $eq: ["$parts.type", "Accessory"],
                          },
                          then: {
                            $arrayElemAt: ["$lookup_material.name", 0],
                          },
                        },
                        {
                          case: {
                            $eq: ["$parts.type", "Non-Insulated Profile"],
                          },
                          then: {
                            $arrayElemAt: ["$lookup_raw_material.name", 0],
                          },
                        },
                      ],
                      default: null,
                    },
                  },
                  grade: {
                    $switch: {
                      branches: [
                        {
                          case: {
                            $eq: ["$parts.type", "Accessory"],
                          },
                          then: {
                            $arrayElemAt: ["$lookup_material.grade.name", 0],
                          },
                        },
                        {
                          case: {
                            $eq: ["$parts.type", "Non-Insulated Profile"],
                          },
                          then: {
                            $arrayElemAt: ["$lookup_raw_material.grade.name", 0],
                          },
                        },
                      ],
                      default: null,
                    },
                  },
                  finish: {
                    $arrayElemAt: ["$lookup_finish.name", 0],
                  },
                  color: {
                    $arrayElemAt: ["$lookup_finish.color.name", 0],
                  },
                  temper: {
                    $arrayElemAt: ["$temper", 0],
                  },
                  alloy: {
                    $arrayElemAt: ["$alloy", 0],
                  },
                },
              },
            },
          },

          {
            $lookup: {
              from: "project_models",
              localField: "project.id",
              foreignField: "_id",
              as: "projectsDetail",
              pipeline: [
                {
                  $project: {
                    _id: 1,
                    project_name: 1
                  }
                }
              ]
            }
          },

          {
            $group: {
              _id: "$_id",
              supplier_id: { $first: "$supplier_id" },
              status: { $first: "$status" },
              inquiryFor: { $first: "$inquiryFor" },
              inquiry_ref: { $first: "$inquiry_ref" },
              supplier_contact: { $first: "$supplier_contact" },
              project: { $first: "$projectsDetail" },
              organization: { $first: "$organization" },
              supplier_date: { $first: "$supplier_date" },
              remark: { $first: "$remark" },
              revision: { $first: "$revision" },
              total_quantity: { $first: "$total_quantity" },
              total_unit_weight: { $first: "$total_unit_weight" },
              total_weight: { $first: "$total_weight" },
              form_rev_date: { $first: "$form_rev_date" },
              ref_code_rev: { $first: "$ref_code_rev" },
              update_count: { $first: "$update_count" },
              parts: { $push: "$parts" },
              freeFields: { $first: "$freeFields" },
            },
          },
          {
            $addFields: {
              parts: {
                $map: {
                  input: "$parts",
                  as: "part",
                  in: {
                    order_type: "$$part.order_type",
                    code_id: "$$part.code_id",
                    ref_code_id: "$$part.ref_code_id",
                    type: "$$part.type",
                    entry_details: "$$part.entry_details",
                    stock_details: "$$part.stock_details",
                    quantity: "$$part.quantity",
                    unit_price: "$$part.unit_price",
                    total_weight: "$$part.total_weight",
                    remarks: "$$part.remarks",
                  },
                },
              },
            },
          },
        ]);
      } else {
        inquiry = await Inquiry_Model.aggregate([
          {
            $match: {
              _id: new mongoose.Types.ObjectId(id),
            },
          },
          {
            $lookup: {
              from: "accessories_supplier_models",
              localField:
                "supplier_id",
              foreignField: "_id",
              as: "lookup_supplier"
            }
          },
          {
            $lookup: {
              from: "currency_models",
              localField:
                "parts.entry_details.lookup_supplier.currency_id",
              foreignField: "_id",
              as: "lookup_currency"
            }
          },
          {
            $lookup: {
              from: "project_models",
              localField: "project.id",
              foreignField: "_id",
              as: "projectsDetail",
              pipeline: [
                {
                  $project: {
                    _id: 1,
                    project_name: 1
                  }
                }
              ]
            }
          },
          {
            $group: {
              _id: "$_id",
              inquiry_ref: { $first: "$inquiry_ref" },
              supplier_id: { $first: "$supplier_id" },
              supplier_contact: {
                $first: "$supplier_contact"
              },
              project: { $first: "$projectsDetail" },
              organization: { $first: "$organization" },
              order_type: { $first: "$order_type" },
              supplier_date: { $first: "$supplier_date" },
              remark: { $first: "$remark" },
              revision: { $first: "$revision" },
              status: { $first: "$status" },
              total_quantity: {
                $first: "$total_quantity"
              },
              total_unit_weight: {
                $first: "$total_unit_weight"
              },
              total_weight: { $first: "$total_weight" },
              form_rev_date: { $first: "$form_rev_date" },
              ref_code_rev: { $first: "$ref_code_rev" },
              inquiryFor: { $first: "$inquiryFor" },
              update_count: { $first: "$update_count" },
              freeFields: { $first: "$freeFields" },
              supplier_detail: {
                $first: "$lookup_supplier"
              },
              files: { $first: "$files" }
            }
          },
          {
            $addFields: {
              parts: []
            }
          }
        ])
      }
      const supplier_detail = await Accessories_Supplier_Model.find({
        _id: inquiry[0].supplier_id,
      });
      let templateData = {
        parts: inquiry[0].parts || [],
        freeFields: inquiry[0].freeFields || [],
        supplier_detail: supplier_detail || [],
        organization: inquiry[0].organization || {},
        supplier: inquiry[0].supplier || "",
        inquiryRef: inquiry[0].inquiry_ref || "",
        supplier_date: inquiry[0].supplier_date || "",
        inquiryFor: inquiry[0].inquiryFor || "",
        selectedProject: inquiry[0].project || "",
        selectedContact: inquiry[0].supplier_contact || {},
        total_quantity: inquiry[0].total_quantity || 0,
        total_unit_weight: inquiry[0].total_unit_weight || 0,
        total_weight: inquiry[0].total_weight || 0,
        remark: inquiry[0].remark || "",
        revision: inquiry[0].revision,
        form_rev_date: inquiry[0].form_rev_date || "",
        ref_code_rev: inquiry[0].ref_code_rev || "",
      };

      const htmlpath = path.join(
        __dirname,
        `../uploads/inquiry_details/${inquiry[0].inquiry_ref}.html`
      );
      const pdfpath = path.join(
        __dirname,
        `../uploads/inquiry_details/${inquiry[0].inquiry_ref}.pdf`
      );
      const filePath = path.join(__dirname, "../view/inquiry_detail.ejs");

      ejs.renderFile(filePath, templateData, (err, data) => {
        if (err) {
          console.log("Error rendering template:", err);
          return reject(err);
        }

        fs.writeFile(htmlpath, data, (err) => {
          if (err) {
            console.error("Error writing HTML file:", err);
            return reject(err);
          }

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
              header: {
                height: "10mm",
              },
              footer: {
                height: "30mm",
                contents: {
                  default: `
                    <div style=" text-align: center;">
                      <table 
            role="presentation" 
            style="
              width: 100%; 
              border:none; 
              margin-bottom: 10px; 
              border-collapse:collapse; 
              font-size: 12px;
              margin-left:4px;
              margin-right:4px;"
          >
            <tr>
              <td style="padding:0px 0px 0px 25px; border:none;text-align: left;">
                Reference Code Rev: ${inquiry[0].ref_code_rev}
              </td>
              <td style="padding:0px 30px 0px 0px; border:none; text-align: right;">
                Form Rev Date: ${inquiry[0].form_rev_date}
              </td>
            </tr>
          </table>
                      <p
                        style="
                          font-weight: bold;
                          font-size: 14px;  
                          text-transform: uppercase;
                          letter-spacing: 0.5px;
                          color: #000;
                        "
                      >
                      THIS IS A SOFTWARE GENERATED PURCHASE ORDER AND DOES NOT REQUIRE SIGNATURE AND STAMP
                      </p>
                    </div>
                    <div style="text-align: center; margin-top:8px;">Page {{page}} of {{pages}}</div>
                    `,
                },
              },
            })
            .toFile(pdfpath, (err) => {
              if (err) {
                console.error("Error generating PDF:", err);
                return reject(err);
              }

              fs.unlinkSync(htmlpath);
              const pdfUrl = `${process.env.BACKENDURL}/uploads/inquiry_details/${inquiry[0].inquiry_ref}.pdf`;
              resolve({
                mssg: "PDF created successfully!",
                url: pdfUrl,
                pdfpath,
              });
            });
        });
      });
    } catch (error) {
      console.error("Error in inquiry:", error);
      reject(error);
    }
  });
};

const send_inquiry_mail = async (req, res) => {
  try {
    const { id } = req.body;
    const po = await Inquiry_Model.findById(id);
    pdfData = await inquiry_pdf_maker(id);
    const message = {
      // email: po.supplier_contact[0].email,
      email: po.supplier_contact[0].email,
      inquiryRef: po.inquiry_ref,
      name: po.supplier_contact.name,
      organization: po.organization.org_name,
    };
    const subject = `${po.inquiry_ref}`;
    let recepients = po?.supplier_contact.map((itm) => itm.email);
    let files = [{ filename: "inquiry.pdf", path: pdfData.pdfpath }, ...po.files];

    await sendInquiry(recepients, files, subject, message, res);

    return res.status(200).json({ mssg: "Email sent successfully!" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: "Email sending failed!", error });
  }
};

const inquiry_pdf = async (req, res) => {
  try {
    const { id } = req.body;
    const pdfData = await inquiry_pdf_maker(id);
    return res.status(200).json({
      mssg: "PDF created successfully!",
      url: pdfData.url,
    });
  } catch (error) {
    console.error("Error in inquiry_pdf:", error);
    return res.status(500).json({ mssg: "Server Error", error });
  }
};

const add_inquiry = async (req, res) => {
  const session = await mongoose.startSession(); // Start a session
  session.startTransaction(); // Begin transaction
  try {
    const {
      supplier,
      remark,
      inquiryRef,
      supplier_date,
      revision,
      total_quantity,
      total_unit_weight,
      total_weight,
      form_rev_date,
      ref_code_rev,
      inquiryFor,
    } = req.body;
    const selectedProject = JSON.parse(req.body.selectedProject)
    const parts = JSON.parse(req.body.parts)
    const freeFields = JSON.parse(req.body.freeFields)
    const selectedContact = JSON.parse(req.body.selectedContact)
    const fileObjects = await Promise.all(req.files);
    const selectedfilterOrg = JSON.parse(req.body.selectedfilterOrg)
    let attachments = fileObjects.map((file) => ({
      name: file.filename,
      path: `${process.env.BACKENDURL}/uploads/${file.filename}`,
    }));
    const invalidPart = parts?.some(
      (part) =>
        !checkInteger(part?.quantity) ||
        part?.quantity < 0 ||
        part?.quantity === 0 ||
        part?.quantity === "" ||
        part?.quantity === undefined
    );
    const invalidFree = freeFields?.some(
      (part) =>
        !checkInteger(part?.quantity) ||
        part?.quantity < 0 ||
        part?.quantity === 0 ||
        part?.quantity === "" ||
        part?.quantity === undefined
    );
    if (invalidPart || invalidFree) {
      return res.status(400).json({
        mssg: "Each part and free field must have a quantity greater than 0 and must be a whole number."
      });
    }
    // let ifExisting = []
    // await Promise.all(parts.map(async (itm) => {
    //   const ifSame = await Inquiry_Model.find({
    //     parts: {
    //       $elemMatch: {
    //         code_id: new mongoose.Types.ObjectId(itm.code_id),
    //         quantity: parseInt(itm.quantity)
    //       }
    //     }
    //   }, { inquiry_ref: 1, _id: 0 })
    //   if (ifSame.length) {
    //     ifExisting.push({ type: "Parts", inquiry: ifSame, code: itm.code || itm.stock_details.packing_code || itm.entry_details.code })
    //   }
    // }))

    // await Promise.all(freeFields.map(async (itm) => {
    //   const ifSame = await Inquiry_Model.find({
    //     freeFields: {
    //       $elemMatch: {
    //         code: itm.code,
    //         quantity: parseInt(itm.quantity)
    //       }
    //     }
    //   }, { inquiry_ref: 1, _id: 0 })
    //   if (ifSame.length) {
    //     ifExisting.push({ type: "FreeFields", inquiry: ifSame, code: itm.code })
    //   }
    // }))
    // if (ifExisting.length) {
    //   let formattedMessage = "Code(s) already exist in another Inquiry with the same quantity. Please change the quantity to save.\n\n";

    //   ifExisting.forEach(item => {
    //     const inquiryRefs = item.inquiry.map(i => i.inquiry_ref).join(', ');
    //     formattedMessage += `Type: ${item.type}\n  Code: ${item.code}\n  Inquiries: ${inquiryRefs}\n\n`;
    //   });

    //   return res.status(400).json({ mssg: formattedMessage.trim() });
    // }

    const new_inquiry = await Inquiry_Model.create([{
      supplier_id: supplier,
      parts: parts,
      freeFields,
      organization: selectedfilterOrg,
      project: selectedProject,
      supplier_contact: selectedContact,
      inquiry_ref: inquiryRef,
      supplier_date: supplier_date,
      remark: remark,
      revision: revision,
      total_quantity,
      total_unit_weight,
      total_weight,
      form_rev_date,
      ref_code_rev,
      inquiryFor,
      files: attachments,
      // $inc: { revision: 1 },
    }], { session: session });
    await Promise.all(parts.map(async (part) => {
      if (part.order_type == "Package") {
        let partDetail = await Stock_model.findById(part.code_id).session(session)
        if (partDetail.msq > partDetail.free_inventory) {
          let newAction = await Action_model.findOneAndUpdate({ code_id: part.code_id },
            { $addToSet: { inquiryId: new_inquiry[0]._id } },
            { new: true }
          ).session(session)
        }
      } else if (part.order_type == "Loose") {
        let partDetail = await Loose_Stock_model.findById(part.code_id).session(session)
        if (partDetail.msq > partDetail.free_inventory) {
          let newAction = await Action_model.findOneAndUpdate({ code_id: part.code_id },
            { $addToSet: { inquiryId: new_inquiry[0]._id } },
            { new: true }
          ).session(session)
        }
      }
    }))
    await session.commitTransaction(); // Commit all operations
    session.endSession();
    return res
      .status(200)
      .json({ mssg: "Inquiry Added", inquiry_id: new_inquiry[0]._id });
  } catch (error) {
    await session.abortTransaction(); // Rollback in case of an error
    session.endSession();
    console.log(error);
    return res.status(500).json({ mssg: error?.message || 'Internal server error' })
  }
};

const get_all_inquiry = async (req, res) => {
  try {
    let { search, page, filter } = req.query;
    let searchRegex = { $regex: new RegExp(".*" + search + ".*", "i") };
    const limit = 10;
    const pageNumber = parseInt(page) || 1;
    const skip = (pageNumber - 1) * limit;
    let and = [{}];
    if (filter.status) {
      and.push({ status: filter.status });
    }
    if (filter.supplier) {
      and.push({ supplier_id: new mongoose.Types.ObjectId(filter.supplier) });
    }
    let where = {
      $or: [{ inquiry_ref: searchRegex }],
      $and: and,
    };
    const result = await Inquiry_Model.aggregate([
      // Lookup supplier details
      {
        $lookup: {
          from: "accessories_supplier_models",
          localField: "supplier_id",
          foreignField: "_id",
          as: "supplierDetail",
        },
      },
      {
        $addFields: {
          supplier: { $arrayElemAt: ["$supplierDetail.name", 0] },
          supplier_code: { $arrayElemAt: ["$supplierDetail.code", 0] },
        },
      },
      // Filter based on search and filters
      {
        $match: where,
      },
      {
        $sort: {
          createdAt: -1
        }
      },
      // Group by `inquiry_ref`
      {
        $group: {
          _id: "$inquiry_ref",
          latestInquiry: { $first: "$$ROOT" }, // Keep the latest inquiry
          prev_inquiry: {
            $push: {
              _id: "$_id",
              revision: "$revision",
            },
          },
        },
      },
      {
        $addFields: {
          latestInquiry: {
            prev_inquiry: {
              $filter: {
                input: "$prev_inquiry",
                as: "inq",
                cond: { $ne: ["$$inq._id", "$latestInquiry._id"] },
              },
            },
          },
        },
      },
      {
        $replaceRoot: { newRoot: "$latestInquiry" }
      },
      {
        $lookup: {
          from: "purchase_models",
          localField: "inquiry_ref",
          foreignField: "inquiry_ref",
          as: "pos",
          pipeline: [
            {
              $sort: {
                createdAt: -1
              }
            },
            {
              $limit: 1
            }
          ]
        }
      },

      {
        $addFields: {
          purchaseOrder_id: {
            $let: {
              vars: {
                po: { $arrayElemAt: ["$pos", 0] }
              },
              in: "$$po._id"
            }
          },
          // purchaseOrder_id: {
          //   $arrayElemAt: ["$pos", 0]
          // }
        }
      },
      // Sort by `createdAt` in descending order (latest first)
      {
        $sort: { inquiry_ref: -1 },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ]);

    // Count total unique `inquiry_ref`
    const totalCount = await Inquiry_Model.aggregate([
      { $match: where },
      { $group: { _id: "$inquiry_ref" } },
      { $count: "totalCount" },
    ]);

    const total_page = Math.ceil((totalCount[0]?.totalCount || 0) / limit);
    const currentPage = pageNumber;

    return res.status(200).json({
      result,
      currentPage,
      total_page,
      totalCount: totalCount[0]?.totalCount || 0,
      limit,
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: error?.message || 'Internal server error' })
  }
};

const get_single_inquiry = async (req, res) => {
  try {
    const id = req.params.id;
    const inq = await Inquiry_Model.findById(id)
    if (inq.parts.length) {
      const inquiry = await Inquiry_Model.aggregate([
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
                      case: { $eq: ["$parts.order_type", "Package"] },
                      then: { $arrayElemAt: ["$stock_details", 0] },
                    },
                    {
                      case: { $eq: ["$parts.order_type", "Loose"] },
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
                      {
                        $eq: ["$system_detail._id", "$$systemField"],
                      },
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
                      cond: {
                        $eq: ["$$subsystem._id", "$$subsystemField"],
                      },
                    },
                  },
                },
              },
            ],
            as: "lookup_system",
          },
        },
        {
          $lookup: {
            from: "group_subgroups",
            localField: "parts.entry_details.group_id",
            foreignField: "_id",
            as: "lookup_group_subgroup",
          },
        },
        {
          $addFields: {
            lookup_group_subgroup: {
              $map: {
                input: "$lookup_group_subgroup",
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
          $lookup: {
            from: "accessories_supplier_models",
            localField: "parts.entry_details.supplier_id",
            foreignField: "_id",
            as: "lookup_supplier",
          },
        },
        {
          $lookup: {
            from: "currency_models",
            localField: "parts.entry_details.lookup_supplier.currency_id",
            foreignField: "_id",
            as: "lookup_currency",
          },
        },
        {
          $lookup: {
            from: "finishes",
            localField: "parts.entry_details.finish_id",
            foreignField: "_id",
            as: "lookup_finish",
          },
        },
        {
          $addFields: {
            lookup_finish: {
              $map: {
                input: "$lookup_finish",
                as: "finishDetail",
                in: {
                  _id: "$$finishDetail._id",
                  name: "$$finishDetail.name",
                  code: "$$finishDetail.code",
                  description: "$$finishDetail.description",
                  color: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$$finishDetail.color",
                          as: "color",
                          cond: {
                            $eq: ["$$color._id", "$parts.entry_details.color_id"],
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
          $facet: {
            accessoryLookup: [
              {
                $match: {
                  $or: [{ "parts.type": "Accessory" }, { "parts.type": "Kit" }],
                },
              },
              {
                $lookup: {
                  from: "materials",
                  localField: "parts.entry_details.material_id",
                  foreignField: "_id",
                  as: "lookup_material",
                },
              },
              {
                $addFields: {
                  lookup_material: {
                    $map: {
                      input: "$lookup_material",
                      as: "materialDetail",
                      in: {
                        _id: "$$materialDetail._id",
                        name: "$$materialDetail.name",
                        grade: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: "$$materialDetail.grade",
                                as: "grade",
                                cond: {
                                  $eq: [
                                    "$$grade._id",
                                    "$parts.entry_details.grade_id",
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
            ],
            niProfileLookup: [
              {
                $match: {
                  $or: [
                    { "parts.type": "Non-Insulated Profile" },
                    { "parts.type": "Insulated Profile" },
                  ],
                },
              },
              {
                $lookup: {
                  from: "raw_material_models",
                  localField: "parts.entry_details.material_id",
                  foreignField: "_id",
                  as: "lookup_raw_material",
                },
              },
              {
                $addFields: {
                  lookup_raw_material: {
                    $map: {
                      input: "$lookup_raw_material",
                      as: "rawMaterialDetail",
                      in: {
                        _id: "$$rawMaterialDetail._id",
                        name: "$$rawMaterialDetail.name",
                        grade: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: "$$rawMaterialDetail.grade",
                                as: "grade",
                                cond: {
                                  $eq: [
                                    "$$grade._id",
                                    "$parts.entry_details.grade_id",
                                  ],
                                },
                              },
                            },
                            0,
                          ],
                        },
                        alloy: "$$rawMaterialDetail.alloy",
                        temper: "$$rawMaterialDetail.temper",
                      },
                    },
                  },
                },
              },
            ],
          },
        },
        {
          $addFields: {
            combinedResults: {
              $concatArrays: ["$accessoryLookup", "$niProfileLookup"],
            },
          },
        },
        {
          $unwind: "$combinedResults",
        },
        {
          $replaceRoot: { newRoot: "$combinedResults" },
        },
        {
          $addFields: {
            material: {
              $switch: {
                branches: [
                  {
                    case: {
                      $eq: ["$parts.type", "Accessory"],
                    },
                    then: {
                      $arrayElemAt: ["$lookup_material.name", 0],
                    },
                  },
                  {
                    case: {
                      $eq: ["$parts.type", "Non-Insulated Profile"],
                    },
                    then: {
                      $arrayElemAt: ["$lookup_raw_material.name", 0],
                    },
                  },
                ],
                default: null,
              },
            },
            grade: {
              $switch: {
                branches: [
                  {
                    case: {
                      $eq: ["$parts.type", "Accessory"],
                    },
                    then: {
                      $arrayElemAt: ["$lookup_material.grade.name", 0],
                    },
                  },
                  {
                    case: {
                      $eq: ["$parts.type", "Non-Insulated Profile"],
                    },
                    then: {
                      $arrayElemAt: ["$lookup_raw_material.grade.name", 0],
                    },
                  },
                ],
                default: null,
              },
            },
            alloy: {
              $switch: {
                branches: [
                  {
                    case: {
                      $eq: ["$parts.type", "Non-Insulated Profile"],
                    },
                    then: {
                      $arrayElemAt: [
                        {
                          $map: {
                            input: "$lookup_raw_material.alloy",
                            as: "alloyItem",
                            in: "$$alloyItem.name",
                          },
                        },
                        0,
                      ],
                    },
                  },
                ],
                default: null,
              },
            },
            temper: {
              $switch: {
                branches: [
                  {
                    case: {
                      $eq: ["$parts.type", "Non-Insulated Profile"],
                    },
                    then: {
                      $arrayElemAt: [
                        {
                          $map: {
                            input: "$lookup_raw_material.temper",
                            as: "temperItem",
                            in: "$$temperItem.name",
                          },
                        },
                        0,
                      ],
                    },
                  },
                ],
                default: null,
              },
            },
          },
        },

        {
          $addFields: {
            parts: {
              entry_details: {
                system: {
                  $arrayElemAt: ["$lookup_system.system_detail.name", 0],
                },
                subsystem: {
                  $arrayElemAt: [
                    {
                      $map: {
                        input: {
                          $arrayElemAt: [
                            "$lookup_system.system_detail.subsystems",
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
                group: {
                  $arrayElemAt: ["$lookup_group_subgroup.name", 0],
                },
                subgroup: {
                  $arrayElemAt: ["$lookup_group_subgroup.subgroup.name", 0],
                },
                supplier: {
                  $arrayElemAt: ["$lookup_supplier.name", 0],
                },
                supplier_code: {
                  $arrayElemAt: ["$lookup_supplier.code", 0],
                },
                material: {
                  $switch: {
                    branches: [
                      {
                        case: { $eq: ["$parts.type", "Accessory"] },
                        then: { $arrayElemAt: ["$lookup_material.name", 0] },
                      },
                      {
                        case: { $eq: ["$parts.type", "Non-Insulated Profile"] },
                        then: { $arrayElemAt: ["$lookup_raw_material.name", 0] },
                      },
                    ],
                    default: null,
                  },
                },
                grade: {
                  $switch: {
                    branches: [
                      {
                        case: { $eq: ["$parts.type", "Accessory"] },
                        then: {
                          $arrayElemAt: ["$lookup_material.grade.name", 0],
                        },
                      },
                      {
                        case: { $eq: ["$parts.type", "Non-Insulated Profile"] },
                        then: {
                          $arrayElemAt: ["$lookup_raw_material.grade.name", 0],
                        },
                      },
                    ],
                    default: null,
                  },
                },
                finish: {
                  $arrayElemAt: ["$lookup_finish.name", 0],
                },
                color: {
                  $arrayElemAt: ["$lookup_finish.color.name", 0],
                },
                temper: {
                  $arrayElemAt: ["$temper", 0],
                },
                alloy: {
                  $arrayElemAt: ["$alloy", 0],
                },
              },
            },
          },
        },
        {
          $lookup: {
            from: "project_models",
            localField: "project.id",
            foreignField: "_id",
            as: "projectsDetail",
            pipeline: [
              {
                $project: {
                  _id: 1,
                  project_name: 1
                }
              }
            ]
          }
        },

        {
          $group: {
            _id: "$_id",
            inquiry_ref: { $first: "$inquiry_ref" },
            supplier_id: { $first: "$supplier_id" },
            supplier_contact: { $first: "$supplier_contact" },
            project: { $first: "$projectsDetail" },
            organization: { $first: "$organization" },
            order_type: { $first: "$order_type" },
            supplier_date: { $first: "$supplier_date" },
            remark: { $first: "$remark" },
            revision: { $first: "$revision" },
            status: { $first: "$status" },
            total_quantity: { $first: "$total_quantity" },
            total_unit_weight: { $first: "$total_unit_weight" },
            total_weight: { $first: "$total_weight" },
            form_rev_date: { $first: "$form_rev_date" },
            ref_code_rev: { $first: "$ref_code_rev" },
            inquiryFor: { $first: "$inquiryFor" },
            update_count: { $first: "$update_count" },
            parts: { $push: "$parts" },
            freeFields: { $first: "$freeFields" },
            supplier_detail: { $first: "$lookup_supplier" },
            files: { $first: "$files" },
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
                  order_type: "$$part.order_type",
                  quantity: "$$part.quantity",
                  total_weight: "$$part.total_weight",
                  remarks: "$$part.remarks",
                },
              },
            },
          },
        },
      ]);
      return res.status(200).json(inquiry);
    } else {
      const inquiry = await Inquiry_Model.aggregate([
        {
          $match: {
            _id: new mongoose.Types.ObjectId(id),
          },
        },
        {
          $lookup: {
            from: "accessories_supplier_models",
            localField:
              "supplier_id",
            foreignField: "_id",
            as: "lookup_supplier"
          }
        },
        {
          $lookup: {
            from: "currency_models",
            localField:
              "parts.entry_details.lookup_supplier.currency_id",
            foreignField: "_id",
            as: "lookup_currency"
          }
        },
        {
          $lookup: {
            from: "project_models",
            localField: "project.id",
            foreignField: "_id",
            as: "projectsDetail",
            pipeline: [
              {
                $project: {
                  _id: 1,
                  project_name: 1
                }
              }
            ]
          }
        },
        {
          $group: {
            _id: "$_id",
            inquiry_ref: { $first: "$inquiry_ref" },
            supplier_id: { $first: "$supplier_id" },
            supplier_contact: {
              $first: "$supplier_contact"
            },
            project: { $first: "$projectsDetail" },
            organization: { $first: "$organization" },
            order_type: { $first: "$order_type" },
            supplier_date: { $first: "$supplier_date" },
            remark: { $first: "$remark" },
            revision: { $first: "$revision" },
            status: { $first: "$status" },
            total_quantity: {
              $first: "$total_quantity"
            },
            total_unit_weight: {
              $first: "$total_unit_weight"
            },
            total_weight: { $first: "$total_weight" },
            form_rev_date: { $first: "$form_rev_date" },
            ref_code_rev: { $first: "$ref_code_rev" },
            inquiryFor: { $first: "$inquiryFor" },
            update_count: { $first: "$update_count" },
            freeFields: { $first: "$freeFields" },
            supplier_detail: {
              $first: "$lookup_supplier"
            },
            files: { $first: "$files" }
          }
        },
        {
          $addFields: {
            parts: []
          }
        }
      ])
      return res.status(200).json(inquiry);
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: error?.message || 'Internal server error' })
  }
};

const get_code_inquiry = async (req, res) => {
  try {
    const id = req.params.id;
    const inq = await Inquiry_Model.findById(id)
    if (inq.parts.length) {
      const inquiry = await Inquiry_Model.aggregate([
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
                      case: { $eq: ["$parts.order_type", "Package"] },
                      then: { $arrayElemAt: ["$stock_details", 0] },
                    },
                    {
                      case: { $eq: ["$parts.order_type", "Loose"] },
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
                      {
                        $eq: ["$system_detail._id", "$$systemField"],
                      },
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
                      cond: {
                        $eq: ["$$subsystem._id", "$$subsystemField"],
                      },
                    },
                  },
                },
              },
            ],
            as: "lookup_system",
          },
        },
        {
          $lookup: {
            from: "group_subgroups",
            localField: "parts.entry_details.group_id",
            foreignField: "_id",
            as: "lookup_group_subgroup",
          },
        },
        {
          $addFields: {
            lookup_group_subgroup: {
              $map: {
                input: "$lookup_group_subgroup",
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
          $lookup: {
            from: "accessories_supplier_models",
            localField: "parts.entry_details.supplier_id",
            foreignField: "_id",
            as: "lookup_supplier",
          },
        },
        {
          $lookup: {
            from: "currency_models",
            localField: "parts.entry_details.lookup_supplier.currency_id",
            foreignField: "_id",
            as: "lookup_currency",
          },
        },
        {
          $lookup: {
            from: "finishes",
            localField: "parts.entry_details.finish_id",
            foreignField: "_id",
            as: "lookup_finish",
          },
        },
        {
          $addFields: {
            lookup_finish: {
              $map: {
                input: "$lookup_finish",
                as: "finishDetail",
                in: {
                  _id: "$$finishDetail._id",
                  name: "$$finishDetail.name",
                  code: "$$finishDetail.code",
                  description: "$$finishDetail.description",
                  color: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$$finishDetail.color",
                          as: "color",
                          cond: {
                            $eq: ["$$color._id", "$parts.entry_details.color_id"],
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
          $facet: {
            accessoryLookup: [
              {
                $match: {
                  $or: [{ "parts.type": "Accessory" }, { "parts.type": "Kit" }],
                },
              },
              {
                $lookup: {
                  from: "materials",
                  localField: "parts.entry_details.material_id",
                  foreignField: "_id",
                  as: "lookup_material",
                },
              },
              {
                $addFields: {
                  lookup_material: {
                    $map: {
                      input: "$lookup_material",
                      as: "materialDetail",
                      in: {
                        _id: "$$materialDetail._id",
                        name: "$$materialDetail.name",
                        grade: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: "$$materialDetail.grade",
                                as: "grade",
                                cond: {
                                  $eq: [
                                    "$$grade._id",
                                    "$parts.entry_details.grade_id",
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
            ],
            niProfileLookup: [
              {
                $match: {
                  $or: [
                    { "parts.type": "Non-Insulated Profile" },
                    { "parts.type": "Insulated Profile" },
                  ],
                },
              },
              {
                $lookup: {
                  from: "raw_material_models",
                  localField: "parts.entry_details.material_id",
                  foreignField: "_id",
                  as: "lookup_raw_material",
                },
              },
              {
                $addFields: {
                  lookup_raw_material: {
                    $map: {
                      input: "$lookup_raw_material",
                      as: "rawMaterialDetail",
                      in: {
                        _id: "$$rawMaterialDetail._id",
                        name: "$$rawMaterialDetail.name",
                        grade: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: "$$rawMaterialDetail.grade",
                                as: "grade",
                                cond: {
                                  $eq: [
                                    "$$grade._id",
                                    "$parts.entry_details.grade_id",
                                  ],
                                },
                              },
                            },
                            0,
                          ],
                        },
                        alloy: "$$rawMaterialDetail.alloy",
                        temper: "$$rawMaterialDetail.temper",
                      },
                    },
                  },
                },
              },
            ],
          },
        },
        {
          $addFields: {
            combinedResults: {
              $concatArrays: ["$accessoryLookup", "$niProfileLookup"],
            },
          },
        },
        {
          $unwind: "$combinedResults",
        },
        {
          $replaceRoot: { newRoot: "$combinedResults" },
        },
        {
          $addFields: {
            material: {
              $switch: {
                branches: [
                  {
                    case: {
                      $eq: ["$parts.type", "Accessory"],
                    },
                    then: {
                      $arrayElemAt: ["$lookup_material.name", 0],
                    },
                  },
                  {
                    case: {
                      $eq: ["$parts.type", "Non-Insulated Profile"],
                    },
                    then: {
                      $arrayElemAt: ["$lookup_raw_material.name", 0],
                    },
                  },
                ],
                default: null,
              },
            },
            grade: {
              $switch: {
                branches: [
                  {
                    case: {
                      $eq: ["$parts.type", "Accessory"],
                    },
                    then: {
                      $arrayElemAt: ["$lookup_material.grade.name", 0],
                    },
                  },
                  {
                    case: {
                      $eq: ["$parts.type", "Non-Insulated Profile"],
                    },
                    then: {
                      $arrayElemAt: ["$lookup_raw_material.grade.name", 0],
                    },
                  },
                ],
                default: null,
              },
            },
            alloy: {
              $switch: {
                branches: [
                  {
                    case: {
                      $eq: ["$parts.type", "Non-Insulated Profile"],
                    },
                    then: {
                      $arrayElemAt: [
                        {
                          $map: {
                            input: "$lookup_raw_material.alloy",
                            as: "alloyItem",
                            in: "$$alloyItem.name",
                          },
                        },
                        0,
                      ],
                    },
                  },
                ],
                default: null,
              },
            },
            temper: {
              $switch: {
                branches: [
                  {
                    case: {
                      $eq: ["$parts.type", "Non-Insulated Profile"],
                    },
                    then: {
                      $arrayElemAt: [
                        {
                          $map: {
                            input: "$lookup_raw_material.temper",
                            as: "temperItem",
                            in: "$$temperItem.name",
                          },
                        },
                        0,
                      ],
                    },
                  },
                ],
                default: null,
              },
            },
          },
        },

        {
          $addFields: {
            parts: {
              entry_details: {
                system: {
                  $arrayElemAt: ["$lookup_system.system_detail.name", 0],
                },
                subsystem: {
                  $arrayElemAt: [
                    {
                      $map: {
                        input: {
                          $arrayElemAt: [
                            "$lookup_system.system_detail.subsystems",
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
                group: {
                  $arrayElemAt: ["$lookup_group_subgroup.name", 0],
                },
                subgroup: {
                  $arrayElemAt: ["$lookup_group_subgroup.subgroup.name", 0],
                },
                supplier: {
                  $arrayElemAt: ["$lookup_supplier.name", 0],
                },
                supplier_code: {
                  $arrayElemAt: ["$lookup_supplier.code", 0],
                },
                material: {
                  $switch: {
                    branches: [
                      {
                        case: { $eq: ["$parts.type", "Accessory"] },
                        then: { $arrayElemAt: ["$lookup_material.name", 0] },
                      },
                      {
                        case: { $eq: ["$parts.type", "Non-Insulated Profile"] },
                        then: { $arrayElemAt: ["$lookup_raw_material.name", 0] },
                      },
                    ],
                    default: null,
                  },
                },
                grade: {
                  $switch: {
                    branches: [
                      {
                        case: { $eq: ["$parts.type", "Accessory"] },
                        then: {
                          $arrayElemAt: ["$lookup_material.grade.name", 0],
                        },
                      },
                      {
                        case: { $eq: ["$parts.type", "Non-Insulated Profile"] },
                        then: {
                          $arrayElemAt: ["$lookup_raw_material.grade.name", 0],
                        },
                      },
                    ],
                    default: null,
                  },
                },
                finish: {
                  $arrayElemAt: ["$lookup_finish.name", 0],
                },
                color: {
                  $arrayElemAt: ["$lookup_finish.color.name", 0],
                },
                temper: {
                  $arrayElemAt: ["$temper", 0],
                },
                alloy: {
                  $arrayElemAt: ["$alloy", 0],
                },
              },
            },
          },
        },
        {
          $lookup: {
            from: "project_models",
            localField: "project.id",
            foreignField: "_id",
            as: "projectsDetail",
            pipeline: [
              {
                $project: {
                  _id: 1,
                  project_name: 1
                }
              }
            ]
          }
        },

        {
          $group: {
            _id: "$_id",
            inquiry_ref: { $first: "$inquiry_ref" },
            supplier_id: { $first: "$supplier_id" },
            supplier_contact: { $first: "$supplier_contact" },
            project: { $first: "$projectsDetail" },
            organization: { $first: "$organization" },
            order_type: { $first: "$order_type" },
            supplier_date: { $first: "$supplier_date" },
            remark: { $first: "$remark" },
            revision: { $first: "$revision" },
            status: { $first: "$status" },
            total_quantity: { $first: "$total_quantity" },
            total_unit_weight: { $first: "$total_unit_weight" },
            total_weight: { $first: "$total_weight" },
            form_rev_date: { $first: "$form_rev_date" },
            ref_code_rev: { $first: "$ref_code_rev" },
            inquiryFor: { $first: "$inquiryFor" },
            update_count: { $first: "$update_count" },
            parts: { $push: "$parts" },
            freeFields: { $first: "$freeFields" },
            supplier_detail: { $first: "$lookup_supplier" },
            files: { $first: "$files" },
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
                  order_type: "$$part.order_type",
                  quantity: "$$part.quantity",
                  total_weight: "$$part.total_weight",
                  remarks: "$$part.remarks",
                },
              },
            },
          },
        },
      ]);
      return res.status(200).json(inquiry);
    } else {
      const inquiry = await Inquiry_Model.aggregate([
        {
          $match: {
            _id: new mongoose.Types.ObjectId(id),
          },
        },
        {
          $lookup: {
            from: "accessories_supplier_models",
            localField:
              "supplier_id",
            foreignField: "_id",
            as: "lookup_supplier"
          }
        },
        {
          $lookup: {
            from: "currency_models",
            localField:
              "parts.entry_details.lookup_supplier.currency_id",
            foreignField: "_id",
            as: "lookup_currency"
          }
        },
        {
          $lookup: {
            from: "project_models",
            localField: "project.id",
            foreignField: "_id",
            as: "projectsDetail",
            pipeline: [
              {
                $project: {
                  _id: 1,
                  project_name: 1
                }
              }
            ]
          }
        },
        {
          $group: {
            _id: "$_id",
            inquiry_ref: { $first: "$inquiry_ref" },
            supplier_id: { $first: "$supplier_id" },
            supplier_contact: {
              $first: "$supplier_contact"
            },
            project: { $first: "$projectsDetail" },
            organization: { $first: "$organization" },
            order_type: { $first: "$order_type" },
            supplier_date: { $first: "$supplier_date" },
            remark: { $first: "$remark" },
            revision: { $first: "$revision" },
            status: { $first: "$status" },
            total_quantity: {
              $first: "$total_quantity"
            },
            total_unit_weight: {
              $first: "$total_unit_weight"
            },
            total_weight: { $first: "$total_weight" },
            form_rev_date: { $first: "$form_rev_date" },
            ref_code_rev: { $first: "$ref_code_rev" },
            inquiryFor: { $first: "$inquiryFor" },
            update_count: { $first: "$update_count" },
            freeFields: { $first: "$freeFields" },
            supplier_detail: {
              $first: "$lookup_supplier"
            },
            files: { $first: "$files" },
          }
        },
        {
          $addFields: {
            parts: []
          }
        }
      ])
      return res.status(200).json(inquiry);
    }
  } catch (error) {
    console.log(error)
    return res.status(500).json({ mssg: error?.message || 'Internal server error' })
  }
};

const get_action_code = async (req, res) => {
  try {
    const { selectedCode, code_supplier } = req.query;
    const stocks = [];
    await Promise.all(
      selectedCode.map(async (itm) => {
        let stock_detail;
        if (itm.order_type === "Loose") {
          if (!mongoose.Types.ObjectId.isValid(itm.code_id)) {
            throw new Error("Invalid ObjectId");
          }
          stock_detail = await Loose_Stock_model.aggregate([
            {
              $match: {
                active: true
              }
            },
            {
              $match: {
                _id: new mongoose.Types.ObjectId(itm.code_id),
              },
            },
            {
              $lookup: {
                from: "accessories_input_models",
                localField: "code_id",
                foreignField: "_id",
                as: "accessory_detail",
              },
            },
            {
              $lookup: {
                from: "profile_input_models",
                localField: "code_id",
                foreignField: "_id",
                as: "ni_detail",
              },
            },
            {
              $lookup: {
                from: "profile_insulated_inputs",
                localField: "code_id",
                foreignField: "_id",
                as: "ins_detail",
              },
            },

            {
              $lookup: {
                from: "kit_inputs",
                localField: "code_id",
                foreignField: "_id",
                as: "kit_detail",
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
                          $arrayElemAt: ["$accessory_detail", 0],
                        },
                      },
                      {
                        case: {
                          $eq: ["$category", "Non-Insulated Profile"],
                        },
                        then: {
                          $arrayElemAt: ["$ni_detail", 0],
                        },
                      },
                      {
                        case: {
                          $eq: ["$category", "Insulated Profile"],
                        },
                        then: {
                          $arrayElemAt: ["$ins_detail", 0],
                        },
                      },
                      {
                        case: { $eq: ["$category", "Kit"] },
                        then: {
                          $arrayElemAt: ["$kit_detail", 0],
                        },
                      },
                    ],
                    default: null, // Default value if none of the conditions match
                  },
                },
              },
            },

            {
              $lookup: {
                from: "profile_system_models", // Name of the collection for Profile_System_Model
                let: {
                  systemField: "$entry_details.system_id",
                  subsystemField: "$entry_details.subsystem_id",
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
                          cond: {
                            $eq: ["$$subsystem._id", "$$subsystemField"],
                          },
                        },
                      },
                    },
                  },
                ],
                as: "lookup_system",
              },
            },
            {
              $lookup: {
                from: "group_subgroups",
                localField: "entry_details.group_id",
                foreignField: "_id",
                as: "lookup_group_subgroup",
              },
            },
            {
              $addFields: {
                lookup_group_subgroup: {
                  $map: {
                    input: "$lookup_group_subgroup",
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
                                $eq: ["$$subgroupEntry._id", "$subgroup_id"],
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
              $lookup: {
                from: "accessories_supplier_models",
                localField: "entry_details.supplier_id",
                foreignField: "_id",
                as: "lookup_supplier",
              },
            },
            {
              $lookup: {
                from: "currency_models",
                localField: "entry_details.lookup_supplier.currency_id",
                foreignField: "_id",
                as: "lookup_currency",
              },
            },
            {
              $lookup: {
                from: "finishes",
                localField: "entry_details.finish_id",
                foreignField: "_id",
                as: "lookup_finish",
              },
            },
            {
              $addFields: {
                lookup_finish: {
                  $map: {
                    input: "$lookup_finish",
                    as: "finishDetail",
                    in: {
                      _id: "$$finishDetail._id",
                      name: "$$finishDetail.name",
                      code: "$$finishDetail.code",
                      description: "$$finishDetail.description",
                      color: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: "$$finishDetail.color",
                              as: "color",
                              cond: {
                                $eq: ["$$color._id", "$entry_details.color_id"],
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
              $facet: {
                accessoryLookup: [
                  {
                    $match: {
                      $or: [{ category: "Accessory" }, { category: "Kit" }],
                    },
                  },
                  {
                    $lookup: {
                      from: "materials",
                      localField: "entry_details.material_id",
                      foreignField: "_id",
                      as: "lookup_material",
                    },
                  },
                  {
                    $addFields: {
                      lookup_material: {
                        $map: {
                          input: "$lookup_material",
                          as: "materialDetail",
                          in: {
                            _id: "$$materialDetail._id",
                            name: "$$materialDetail.name",
                            grade: {
                              $arrayElemAt: [
                                {
                                  $filter: {
                                    input: "$$materialDetail.grade",
                                    as: "grade",
                                    cond: {
                                      $eq: [
                                        "$$grade._id",
                                        "$entry_details.grade_id",
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
                ],
                niProfileLookup: [
                  {
                    $match: {
                      $or: [
                        { category: "Non-Insulated Profile" },
                        { category: "Insulated Profile" },
                      ],
                    },
                  },
                  {
                    $lookup: {
                      from: "raw_material_models",
                      localField: "entry_details.material_id",
                      foreignField: "_id",
                      as: "lookup_raw_material",
                    },
                  },
                  {
                    $addFields: {
                      lookup_raw_material: {
                        $map: {
                          input: "$lookup_raw_material",
                          as: "rawMaterialDetail",
                          in: {
                            _id: "$$rawMaterialDetail._id",
                            name: "$$rawMaterialDetail.name",
                            grade: {
                              $arrayElemAt: [
                                {
                                  $filter: {
                                    input: "$$rawMaterialDetail.grade",
                                    as: "grade",
                                    cond: {
                                      $eq: [
                                        "$$grade._id",
                                        "$entry_details.grade_id",
                                      ],
                                    },
                                  },
                                },
                                0,
                              ],
                            },
                            alloy: "$$rawMaterialDetail.alloy",
                            temper: "$$rawMaterialDetail.temper",
                          },
                        },
                      },
                    },
                  },
                ],
              },
            },
            {
              $addFields: {
                combinedResults: {
                  $concatArrays: ["$accessoryLookup", "$niProfileLookup"],
                },
              },
            },
            {
              $unwind: "$combinedResults",
            },
            {
              $replaceRoot: { newRoot: "$combinedResults" },
            },
            {
              $addFields: {
                material: {
                  $switch: {
                    branches: [
                      {
                        case: {
                          $eq: ["$category", "Accessory"],
                        },
                        then: {
                          $arrayElemAt: ["$lookup_material.name", 0],
                        },
                      },
                      {
                        case: {
                          $eq: ["$category", "Non-Insulated Profile"],
                        },
                        then: {
                          $arrayElemAt: ["$lookup_raw_material.name", 0],
                        },
                      },
                    ],
                    default: null,
                  },
                },
                grade: {
                  $switch: {
                    branches: [
                      {
                        case: {
                          $eq: ["$category", "Accessory"],
                        },
                        then: {
                          $arrayElemAt: ["$lookup_material.grade.name", 0],
                        },
                      },
                      {
                        case: {
                          $eq: ["$category", "Non-Insulated Profile"],
                        },
                        then: {
                          $arrayElemAt: ["$lookup_raw_material.grade.name", 0],
                        },
                      },
                    ],
                    default: null,
                  },
                },
                alloy: {
                  $switch: {
                    branches: [
                      {
                        case: {
                          $eq: ["$category", "Non-Insulated Profile"],
                        },
                        then: {
                          $arrayElemAt: [
                            {
                              $map: {
                                input: "$lookup_raw_material.alloy",
                                as: "alloyItem",
                                in: "$$alloyItem.name",
                              },
                            },
                            0,
                          ],
                        },
                      },
                    ],
                    default: null,
                  },
                },
                temper: {
                  $switch: {
                    branches: [
                      {
                        case: {
                          $eq: ["$category", "Non-Insulated Profile"],
                        },
                        then: {
                          $arrayElemAt: [
                            {
                              $map: {
                                input: "$lookup_raw_material.temper",
                                as: "temperItem",
                                in: "$$temperItem.name",
                              },
                            },
                            0,
                          ],
                        },
                      },
                    ],
                    default: null,
                  },
                },
              },
            },

            {
              $addFields: {
                ordered: 0,
                received: 0,
                cost: 0,
                eta: new Date(),
                image: "$details.image",
                description: "$details.description",
                // material: "$details.material",
                // grade: "$details.grade",
                // color: "$details.color",
                // finish: "$details.finish",

                material: {
                  $switch: {
                    branches: [
                      {
                        case: { $eq: ["$category", "Accessory"] },
                        then: { $arrayElemAt: ["$lookup_material.name", 0] },
                      },
                      {
                        case: { $eq: ["$category", "Non-Insulated Profile"] },
                        then: {
                          $arrayElemAt: ["$lookup_raw_material.name", 0],
                        },
                      },
                    ],
                    default: null,
                  },
                },
                grade: {
                  $switch: {
                    branches: [
                      {
                        case: { $eq: ["$category", "Accessory"] },
                        then: {
                          $arrayElemAt: ["$lookup_material.grade.name", 0],
                        },
                      },
                      {
                        case: { $eq: ["$category", "Non-Insulated Profile"] },
                        then: {
                          $arrayElemAt: ["$lookup_raw_material.grade.name", 0],
                        },
                      },
                    ],
                    default: null,
                  },
                },
                finish: { $arrayElemAt: ["$lookup_finish.name", 0] },
                color: { $arrayElemAt: ["$lookup_finish.color.name", 0] },
                temper: {
                  $arrayElemAt: ["$temper", 0],
                },
                alloy: {
                  $arrayElemAt: ["$alloy", 0],
                },
                supplier_code: { $arrayElemAt: ["$lookup_supplier.code", 0] },

                unit: "$details.unit",
                unit_weight: "$details.unit_weight",
                entry_details: "$entry_details",
              },
            },
            {
              $project: {
                code: "$entry_details.code",
                reference_code: "$details.code",
                code_id: "$_id",
                ref_code_id: "$entry_details._id",
                ordered: 1,
                type: "$category",
                description: 1,
                material: 1,
                grade: 1,
                image: 1,
                color: 1,
                finish: 1,
                alloy: 1,
                temper: 1,
                unit: 1,
                unit_weight: 1,
                supplier_code: 1,
                cost: 1,
                eta: 1,
                order_type: "Loose",
                free: "$free_inventory",
                msq: 1,
                entry_details: "$entry_details",
              },
            },
          ]);
        } else if (itm.order_type === "Package") {
          if (!mongoose.Types.ObjectId.isValid(itm.code_id)) {
            throw new Error("Invalid ObjectId");
          }
          stock_detail = await Stock_model.aggregate([
            {
              $match: {
                active: true
              }
            },
            {
              $match: {
                _id: new mongoose.Types.ObjectId(itm.code_id),
                reference_code_id: new mongoose.Types.ObjectId(itm.ref_code_id),
              },
            },
            {
              $lookup: {
                from: "accessories_input_models",
                localField: "reference_code_id",
                foreignField: "_id",
                as: "accessory_detail",
              },
            },
            {
              $lookup: {
                from: "profile_input_models",
                localField: "reference_code_id",
                foreignField: "_id",
                as: "ni_detail",
              },
            },
            {
              $lookup: {
                from: "profile_insulated_inputs",
                localField: "reference_code_id",
                foreignField: "_id",
                as: "ins_detail",
              },
            },
            {
              $lookup: {
                from: "kit_inputs",
                localField: "reference_code_id",
                foreignField: "_id",
                as: "kit_detail",
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
                          $arrayElemAt: ["$accessory_detail", 0],
                        },
                      },
                      {
                        case: {
                          $eq: ["$category", "Non-Insulated Profile"],
                        },
                        then: {
                          $arrayElemAt: ["$ni_detail", 0],
                        },
                      },
                      {
                        case: {
                          $eq: ["$category", "Insulated Profile"],
                        },
                        then: {
                          $arrayElemAt: ["$ins_detail", 0],
                        },
                      },
                      {
                        case: { $eq: ["$category", "Kit"] },
                        then: {
                          $arrayElemAt: ["$kit_detail", 0],
                        },
                      },
                    ],
                    default: null,
                  },
                },
              },
            },

            {
              $lookup: {
                from: "profile_system_models", // Name of the collection for Profile_System_Model
                let: {
                  systemField: "$entry_detailssystem_id",
                  subsystemField: "$entry_details.subsystem_id",
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
                          cond: {
                            $eq: ["$$subsystem._id", "$$subsystemField"],
                          },
                        },
                      },
                    },
                  },
                ],
                as: "lookup_system",
              },
            },
            {
              $lookup: {
                from: "group_subgroups",
                localField: "entry_details.group_id",
                foreignField: "_id",
                as: "lookup_group_subgroup",
              },
            },
            {
              $addFields: {
                lookup_group_subgroup: {
                  $map: {
                    input: "$lookup_group_subgroup",
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
                                $eq: ["$$subgroupEntry._id", "$subgroup_id"],
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
              $lookup: {
                from: "accessories_supplier_models",
                localField: "entry_details.supplier_id",
                foreignField: "_id",
                as: "lookup_supplier",
              },
            },
            {
              $lookup: {
                from: "currency_models",
                localField: "entry_details.lookup_supplier.currency_id",
                foreignField: "_id",
                as: "lookup_currency",
              },
            },
            {
              $lookup: {
                from: "finishes",
                localField: "entry_details.finish_id",
                foreignField: "_id",
                as: "lookup_finish",
              },
            },
            {
              $addFields: {
                lookup_finish: {
                  $map: {
                    input: "$lookup_finish",
                    as: "finishDetail",
                    in: {
                      _id: "$$finishDetail._id",
                      name: "$$finishDetail.name",
                      code: "$$finishDetail.code",
                      description: "$$finishDetail.description",
                      color: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: "$$finishDetail.color",
                              as: "color",
                              cond: {
                                $eq: ["$$color._id", "$entry_details.color_id"],
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
              $facet: {
                accessoryLookup: [
                  {
                    $match: {
                      $or: [{ category: "Accessory" }, { category: "Kit" }],
                    },
                  },
                  {
                    $lookup: {
                      from: "materials",
                      localField: "entry_details.material_id",
                      foreignField: "_id",
                      as: "lookup_material",
                    },
                  },
                  {
                    $addFields: {
                      lookup_material: {
                        $map: {
                          input: "$lookup_material",
                          as: "materialDetail",
                          in: {
                            _id: "$$materialDetail._id",
                            name: "$$materialDetail.name",
                            grade: {
                              $arrayElemAt: [
                                {
                                  $filter: {
                                    input: "$$materialDetail.grade",
                                    as: "grade",
                                    cond: {
                                      $eq: [
                                        "$$grade._id",
                                        "$entry_details.grade_id",
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
                ],
                niProfileLookup: [
                  {
                    $match: {
                      $or: [
                        { category: "Non-Insulated Profile" },
                        { category: "Insulated Profile" },
                      ],
                    },
                  },
                  {
                    $lookup: {
                      from: "raw_material_models",
                      localField: "entry_details.material_id",
                      foreignField: "_id",
                      as: "lookup_raw_material",
                    },
                  },
                  {
                    $addFields: {
                      lookup_raw_material: {
                        $map: {
                          input: "$lookup_raw_material",
                          as: "rawMaterialDetail",
                          in: {
                            _id: "$$rawMaterialDetail._id",
                            name: "$$rawMaterialDetail.name",
                            grade: {
                              $arrayElemAt: [
                                {
                                  $filter: {
                                    input: "$$rawMaterialDetail.grade",
                                    as: "grade",
                                    cond: {
                                      $eq: [
                                        "$$grade._id",
                                        "$entry_details.grade_id",
                                      ],
                                    },
                                  },
                                },
                                0,
                              ],
                            },
                            alloy: "$$rawMaterialDetail.alloy",
                            temper: "$$rawMaterialDetail.temper",
                          },
                        },
                      },
                    },
                  },
                ],
              },
            },
            {
              $addFields: {
                combinedResults: {
                  $concatArrays: ["$accessoryLookup", "$niProfileLookup"],
                },
              },
            },
            {
              $unwind: "$combinedResults",
            },
            {
              $replaceRoot: { newRoot: "$combinedResults" },
            },
            {
              $addFields: {
                material: {
                  $switch: {
                    branches: [
                      {
                        case: {
                          $eq: ["$category", "Accessory"],
                        },
                        then: {
                          $arrayElemAt: ["$lookup_material.name", 0],
                        },
                      },
                      {
                        case: {
                          $eq: ["$category", "Non-Insulated Profile"],
                        },
                        then: {
                          $arrayElemAt: ["$lookup_raw_material.name", 0],
                        },
                      },
                    ],
                    default: null,
                  },
                },
                grade: {
                  $switch: {
                    branches: [
                      {
                        case: {
                          $eq: ["$category", "Accessory"],
                        },
                        then: {
                          $arrayElemAt: ["$lookup_material.grade.name", 0],
                        },
                      },
                      {
                        case: {
                          $eq: ["$category", "Non-Insulated Profile"],
                        },
                        then: {
                          $arrayElemAt: ["$lookup_raw_material.grade.name", 0],
                        },
                      },
                    ],
                    default: null,
                  },
                },
                alloy: {
                  $switch: {
                    branches: [
                      {
                        case: {
                          $eq: ["$category", "Non-Insulated Profile"],
                        },
                        then: {
                          $arrayElemAt: [
                            {
                              $map: {
                                input: "$lookup_raw_material.alloy",
                                as: "alloyItem",
                                in: "$$alloyItem.name",
                              },
                            },
                            0,
                          ],
                        },
                      },
                    ],
                    default: null,
                  },
                },
                temper: {
                  $switch: {
                    branches: [
                      {
                        case: {
                          $eq: ["$category", "Non-Insulated Profile"],
                        },
                        then: {
                          $arrayElemAt: [
                            {
                              $map: {
                                input: "$lookup_raw_material.temper",
                                as: "temperItem",
                                in: "$$temperItem.name",
                              },
                            },
                            0,
                          ],
                        },
                      },
                    ],
                    default: null,
                  },
                },
              },
            },

            {
              $addFields: {
                ordered: 0,
                received: 0,
                cost: 0,
                eta: new Date(),
                description: "$details.description",
                image: "$details.image",
                // material: "$details.material",
                // color: "$details.color",
                // finish: "$details.finish",
                // grade: "$details.grade",
                // supplier_code: "$details.supplier_code",
                unit: "$details.unit",
                unit_weight: "$details.unit_weight",
                entry_details: "$entry_details",

                material: {
                  $switch: {
                    branches: [
                      {
                        case: { $eq: ["$category", "Accessory"] },
                        then: { $arrayElemAt: ["$lookup_material.name", 0] },
                      },
                      {
                        case: { $eq: ["$category", "Non-Insulated Profile"] },
                        then: {
                          $arrayElemAt: ["$lookup_raw_material.name", 0],
                        },
                      },
                    ],
                    default: null,
                  },
                },
                grade: {
                  $switch: {
                    branches: [
                      {
                        case: { $eq: ["$category", "Accessory"] },
                        then: {
                          $arrayElemAt: ["$lookup_material.grade.name", 0],
                        },
                      },
                      {
                        case: { $eq: ["$category", "Non-Insulated Profile"] },
                        then: {
                          $arrayElemAt: ["$lookup_raw_material.grade.name", 0],
                        },
                      },
                    ],
                    default: null,
                  },
                },
                finish: { $arrayElemAt: ["$lookup_finish.name", 0] },
                color: { $arrayElemAt: ["$lookup_finish.color.name", 0] },
                temper: {
                  $arrayElemAt: ["$temper", 0],
                },
                alloy: {
                  $arrayElemAt: ["$alloy", 0],
                },
                supplier_code: { $arrayElemAt: ["$lookup_supplier.code", 0] },
              },
            },
            {
              $project: {
                code: "$packing_code",
                reference_code: "$details.code",
                code_id: "$_id",
                ref_code_id: "$reference_code_id",
                ordered: 1,
                type: "$category",
                description: 1,
                material: 1,
                image: 1,
                color: 1,
                finish: 1,
                unit: 1,
                unit_weight: 1,
                grade: 1,
                alloy: 1,
                temper: 1,
                supplier_code: 1,
                cost: 1,
                eta: 1,
                packing_quantity: 1,
                order_type: "Package",
                free: "$free_inventory",
                msq: 1,
                packing_quantity: 1,
                packing_unit: 1,
                entry_details: "$entry_details",
              },
            },
          ]);
        }
        if (stock_detail && stock_detail.length > 0) {
          stocks.push(stock_detail[0]);
        }
      })
    );
    return res.status(200).json(stocks);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: error?.message || 'Internal server error' })
  }
};

const update_inquiry = async (req, res) => {
  const session = await mongoose.startSession(); // Start a session
  session.startTransaction(); // Begin transaction
  try {
    const { id } = req.params;
    const {
      supplier,
      selectedProjectName,
      remark,
      inquiryRef,
      supplier_date,
      status,
      revision,
      total_quantity,
      total_unit_weight,
      total_weight,
      form_rev_date,
      ref_code_rev,
      inquiryFor,
    } = req.body;
    const selectedProject = JSON.parse(req.body.selectedProject)
    const parts = JSON.parse(req.body.parts)
    const freeFields = JSON.parse(req.body.freeFields)
    const oldFiles = JSON.parse(req.body.oldFiles)
    const selectedContact = JSON.parse(req.body.selectedContact)
    const selectedfilterOrg = JSON.parse(req.body.selectedfilterOrg)
    const fileObjects = await Promise.all(req.files);
    let attachments = fileObjects.map((file) => ({
      name: file.filename,
      path: `${process.env.BACKENDURL}/uploads/${file.filename}`,
    }));
    const invalidPart = parts?.some(
      (part) =>
        !checkInteger(part?.quantity) ||
        part?.quantity < 0 ||
        part?.quantity === 0 ||
        part?.quantity === "" ||
        part?.quantity === undefined
    );
    const invalidFree = freeFields?.some(
      (part) =>
        !checkInteger(part?.quantity) ||
        part?.quantity < 0 ||
        part?.quantity === 0 ||
        part?.quantity === "" ||
        part?.quantity === undefined
    );
    if (invalidPart || invalidFree) {
      return res.status(400).json({
        mssg: "Each part and free field must have a quantity greater than 0 and must be a whole number."
      });
    }
    const prevInq = await Inquiry_Model.findById(id)
    const new_inquiry = await Inquiry_Model.create(
      [{
        supplier_id: supplier,
        parts: parts,
        freeFields,
        organization: selectedfilterOrg,
        project: selectedProject,
        supplier_contact: selectedContact,
        inquiry_ref: inquiryRef,
        supplier_date: supplier_date,
        remark: remark,
        // status: status,
        total_quantity,
        total_unit_weight,
        total_weight,
        form_rev_date,
        ref_code_rev,
        revision: prevInq.revision + 1,
        inquiryFor,
        files: [...oldFiles, ...attachments]
      }],
      { session }
    );
    await Promise.all(parts.map(async (part) => {
      if (part.order_type == "Package") {
        let partDetail = await Stock_model.findById(part.code_id).session(session)
        if (partDetail.msq > partDetail.free_inventory) {
          let newAction = await Action_model.findOneAndUpdate({ code_id: part.code_id },
            { $addToSet: { inquiryId: new_inquiry[0]._id } },
            { new: true }
          ).session(session)
        }
      } else if (part.order_type == "Loose") {
        let partDetail = await Loose_Stock_model.findById(part.code_id).session(session)
        if (partDetail.msq > partDetail.free_inventory) {
          let newAction = await Action_model.findOneAndUpdate({ code_id: part.code_id },
            { $addToSet: { inquiryId: new_inquiry[0]._id } },
            { new: true }
          ).session(session)
        }
      }
    }))
    await session.commitTransaction(); // Commit all operations
    session.endSession();
    return res
      .status(200)
      .json({ mssg: "Inquiry Updated", inquiry_id: new_inquiry[0]._id });
  } catch (error) {
    await session.abortTransaction(); // Rollback in case of an error
    session.endSession();
    console.log(error);
    return res.status(500).json({ mssg: error?.message || 'Internal server error' })
  }
};

const delete_inquiry = async (req, res) => {
  try {
    const { id } = req.params;
    await Action_model.updateMany(
      { inquiryId: id }, // Only update those that contain the ID
      { $pull: { inquiryId: id } }
    );
    const deleted_entry = await Inquiry_Model.findByIdAndDelete(id); return res.status(200).json({ mssg: "Inquiry Deleted" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: error?.message || 'Internal server error' })
  }
};

const send_inquiry = async (req, res) => {
  try {
    const { recepients, subject, content } = req.body;
    const fileObjects = await Promise.all(req.files);
    let attachments = fileObjects.map((file) => ({
      filename: file.filename,
      path: `${process.env.BACKENDURL}/uploads/${file.filename}`,
    }));
    const info = await sendInquiry(recepients, attachments, subject, content);
    attachments = attachments.map((file) => ({
      filename: file.filename,
      path: `${process.env.BACKENDURL}/uploads/${file.href}`,
    }));
    if (info.accepted.length > 0) {
      const entry = await Sent_Inquiry_Model.create({
        recepients: info.accepted,
        subject,
        content,
        files: attachments,
      });
      return res.status(200).json({ mssg: "Email sent successfully" });
    } else {
      return res
        .status(400)
        .json({ accepted: info.accepted, rejected: info.rejected });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: error?.message || 'Internal server error' })
  }
};

const getInquirySerialNumber = async (req, res) => {
  try {
    const { code_supplier } = req.query;
    const data = await Inquiry_Model.aggregate([
      { $match: { supplier_id: new mongoose.Types.ObjectId(code_supplier) } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$inquiry_ref",
          revision: { $push: "$revision" },
        }
      },
      { $project: { inquiry_ref: 1, revision: 1 } }
    ]);
    if (data.length >= 0) {
      const serial_number = (data.length + 1).toString().padStart(3, "0");
      res.status(200).json({ serial_number });
    } else {
      res.status(404).json({ mssg: "No Supplier found for this client." });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: error?.message || 'Internal server error' })
  }
};

const get_status_inquiry = async (req, res) => {
  try {
    const { search } = req.query;
    const inquiry = await Inquiry_Model.find({ status: search });
    res.status(200).json(inquiry);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: error?.message || 'Internal server error' })
  }
};

const uploadFreeImage = async (req, res) => {
  try {
    const filename = `${process.env.BACKENDURL}/uploads/${req.file?.filename}`;
    return res.status(200).json(filename);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: "Error uploading image", error });
  }
};

const get_inquiry_suppliers = async (req, res) => {
  try {
    const supplier = await Inquiry_Model.aggregate([
      {
        $lookup: {
          from: "accessories_supplier_models",
          localField: "supplier_id",
          foreignField: "_id",
          as: "supplier_detail"
        }
      },
      {
        $unwind: "$supplier_detail" // Ensure each document has a single supplier detail
      },
      {
        $group: {
          _id: null,
          supplier: {
            $addToSet: {
              _id: "$supplier_detail._id",
              name: "$supplier_detail.name"
            }
          }
        }
      },
      {
        $project: {
          _id: 0, // Remove _id to return only the supplier array
          supplier: 1
        }
      }
    ]
    );
    return res.status(200).json({ supplier });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: error?.message || 'Internal server error' })
  }
};

const checkCodeInIquiry = async (req, res) => {
  try {
    const { code_id, ref_code_id } = req.body
    const ifPart = await Inquiry_Model.findOne({
      status: "Active",
      parts: {
        $elemMatch: {
          code_id: new mongoose.Types.ObjectId(code_id),
          ref_code_id: new mongoose.Types.ObjectId(ref_code_id)

        }
      }
    }, { inquiry_ref: 1, _id: 0 })

    if (ifPart) {
      return res.status(200).json({
        found: true,
        inquiry_ref: ifPart.inquiry_ref,
        mssg: "Code exists in another active inquiry."
      })
    } else {
      return res.status(200).json({
        found: false,
        mssg: "Code not found in any inquiry."
      })
    }

  } catch (error) {
    console.log(error)
    return res.status(500).json({ mssg: "Some error occured" })
  }
}
module.exports = {
  add_inquiry,
  get_all_inquiry,
  get_single_inquiry,
  update_inquiry,
  delete_inquiry,
  send_inquiry,
  inquiry_pdf,
  getInquirySerialNumber,
  get_action_code,
  send_inquiry_mail,
  get_code_inquiry,
  get_status_inquiry,
  uploadFreeImage,
  get_inquiry_suppliers,
  checkCodeInIquiry
};
