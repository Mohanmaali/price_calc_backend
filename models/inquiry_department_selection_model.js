const mongoose = require("mongoose");

const projectInquiryDepartmentSelection = new mongoose.Schema({
    estimationDepartmentId:{
        type: mongoose.Types.ObjectId,
        ref: "Department",
    },
    salesDepartmentId: {
        type: mongoose.Types.ObjectId,
        ref: "Department",
    }
},{
    timestamps: true
})

const ProjectInquiryDepartmentSelection = mongoose.model('projectInquiry_department_selection_model',projectInquiryDepartmentSelection);
module.exports = ProjectInquiryDepartmentSelection;