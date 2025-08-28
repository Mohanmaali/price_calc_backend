const { addInquiryType, getInquiryType, getSingleInquiryType, updateInquiryType, deleteInquiryType } = require("../controllers/project_inquiry_types_controller")
const role_auth = require("../middleware/role_auth")

const Router = require("express").Router()

Router.route("/")
                .post(role_auth(), addInquiryType)
                .get(role_auth(), getInquiryType);

Router.route("/:id")
                    .get(role_auth(), getSingleInquiryType)
                    .patch(role_auth(), updateInquiryType)
                    .delete(role_auth(), deleteInquiryType)

module.exports = Router