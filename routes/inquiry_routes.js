const express = require("express");
const Router = express.Router();

const auth = require("../middleware/auth");
const {
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
  checkCodeInIquiry,
} = require("../controllers/inquiry_controller");
const role_auth = require("../middleware/role_auth");
const upload = require("../middleware/photo_middleware");

Router.route("/add-inquiry").post(role_auth(), upload.array("files"), add_inquiry);
Router.route("/get").get(role_auth(), get_all_inquiry);
Router.route("/getbystatus").get(role_auth(), get_status_inquiry);
Router.route("/getinquiryserial").get(role_auth(), getInquirySerialNumber);
Router.route("/get/:id").get(role_auth(), get_single_inquiry);
Router.route("/update/:id").patch(role_auth(), upload.array("files"), update_inquiry);
Router.route("/delete/:id").delete(role_auth(), delete_inquiry);
Router.route("/get-action-code").get(role_auth(), get_action_code);
Router.route("/get-code-inquiry/:id").get(role_auth(), get_code_inquiry);
Router.route("/send-inquiry").post(
  role_auth(),
  upload.array("files"),
  send_inquiry
);
Router.route("/generate_pdf").post(role_auth(), inquiry_pdf);
Router.route("/send_mail").post(role_auth(), send_inquiry_mail);

Router.route("/upload-free-image").post(role_auth(), upload.single("photo"), uploadFreeImage);
Router.route("/get-suppliers").get(role_auth(), get_inquiry_suppliers);

Router.route("/check-code").post(role_auth(), checkCodeInIquiry);

module.exports = Router;
