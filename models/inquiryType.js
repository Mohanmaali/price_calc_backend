const mongoose = require("mongoose");

const inquiryType_schema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        }
    },
    {
        timestamps: true,
    }
);

const InquiryType = mongoose.model("InquiryType", inquiryType_schema);

module.exports = InquiryType;
