const express = require("express");
const Router = express.Router();

const {
  add_Organization,
  get_Organization,
  get_OrganizationById,
  update_Organization,
  delete_Organization,
  filter_Organization,
} = require("../controllers/organization_controller");
const role_auth = require("../middleware/role_auth");
const upload = require("../middleware/photo_middleware");

Router.route("/add").post(
  role_auth(),
  upload.single("org_logo"),
  add_Organization
);
Router.route("/get_all").get(role_auth(), get_Organization);
Router.route("/getbyname").get(role_auth(), filter_Organization);
Router.route("/get_byid/:id").get(role_auth(), get_OrganizationById);
Router.route("/update/:id").put(
  role_auth(),
  upload.single("org_logo"),
  update_Organization
);
Router.route("/delete/:id").delete(role_auth(), delete_Organization);

module.exports = Router;
