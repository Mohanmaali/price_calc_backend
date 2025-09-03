const mongoose = require("mongoose");
const upload = require("../middleware/photo_middleware");

const task = new mongoose.Schema({
  commonId: { type: String, required: true },
  type: {
    type: String,
  },

  title: {
    type: String
  },


  projectInquiryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InquiryType'
  },
 
  users: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User_model",
      required: true,
    },
  ],

  link: {
    type: String,
  },

  details: {
    type: String,
  },
  remark: {
    type: String,
  },

  tab: {
    type: String,
  },
  status: {
    type: String,
    default: "Active",
  },

    
  
  category: {
    type: String,
    require: true,
  },
  description: { type: String, },

  assignments: [
    {
      departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
      employees: [{ type: mongoose.Schema.Types.ObjectId, ref: "User_model" }]
    }
  ],


  actionRequired: { type: String },
  dueDate: { type: Date },
  reply: { type: String },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User_model",
  },



  previousAssignUserReply: [
    {
      departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User_model" },
      reply: { type: String },
      repliedAt: { type: Date, default: Date.now }
    }
  ],


  files: [
    {
      originalname: { type: String },
      filename: { type: String },
      path: { type: String },
      url: { type: String },
      uploadedAt: { type: Date, default: Date.now }
    }
  ]


}, {
  timestamps: true
});

const Task_model = mongoose.model("task_model", task);
module.exports = Task_model;
