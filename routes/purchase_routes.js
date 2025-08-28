const express = require("express");
const Router = express.Router();

const {
  add_purchase_order,
  get_all_purchases,
  get_single_purchase,
  update_purchase_order,
  delete_order,
  get_eta_for_project,
  get_po_suppliers,
  purchase_order_pdf,
  send_po_mail,
  getPurchaseOrderNumber,
  receive_purchase_order,
} = require("../controllers/purchase_order_controller");
const auth = require("../middleware/auth");
const role_auth = require("../middleware/role_auth");
const upload = require("../middleware/photo_middleware");

Router.route("/add").post(role_auth(), upload.array("files"), add_purchase_order);
Router.route("/get").get(role_auth(), get_all_purchases);
Router.route("/get/:id").get(role_auth(), get_single_purchase);
Router.route("/update/:id").patch(
  role_auth(),
  upload.any(),
  // upload.array("files"),
  update_purchase_order
);
Router.route("/receive/:id").patch(
  role_auth(),
  upload.any(),
  receive_purchase_order
);
Router.route("/delete/:id").delete(role_auth(), delete_order);
Router.route("/get-project-eta/:id").get(role_auth(), get_eta_for_project);
Router.route("/get-suppliers").get(role_auth(), get_po_suppliers);
Router.route("/generate_pdf").post(role_auth(), upload.any(), purchase_order_pdf);
Router.route("/send_mail").post(role_auth(), send_po_mail);
Router.route("/getpurchaseserial").get(role_auth(), getPurchaseOrderNumber);

module.exports = Router;
