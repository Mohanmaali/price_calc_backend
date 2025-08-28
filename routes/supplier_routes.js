const express = require("express");
const Router = express.Router();

const {
    add_supplier,
    get_all_suppliers,
    get_single_supplier,
    update_supplier,
    delete_supplier,
    assigned_suppliers,
    supplier_assigned_to,
    code_acc_to_supplier,
    code_acc_to_supplier_for_loose,
} = require("../controllers/supplier_controllers");

const auth = require("../middleware/auth");
const role_auth = require("../middleware/role_auth");

const upload = require("../middleware/photo_middleware");

Router.route("/add").post(
    role_auth(),
    upload.fields([
        { name: "trn_file", maxCount: 1 },
        { name: "trade_file", maxCount: 1 },
        { name: "auth_file", maxCount: 1 },
    ]),
    add_supplier
);
Router.route("/get_all").get(role_auth(), get_all_suppliers);
Router.route("/get_one/:id").get(role_auth(), get_single_supplier);
Router.route("/update/:id").patch(
    role_auth(),
    upload.fields([
        { name: "trn_file", maxCount: 1 },
        { name: "trade_file", maxCount: 1 },
        { name: "auth_file", maxCount: 1 },
    ]),
    update_supplier
);
Router.route("/delete/:id").delete(role_auth(), delete_supplier);
Router.route("/get-assigned").get(role_auth(), assigned_suppliers);
Router.route("/assigned-to/:id").get(role_auth(), supplier_assigned_to);
Router.route("/code-acc-supplier/:supplier").get(
    role_auth(),
    code_acc_to_supplier
);
Router.route("/code-acc-supplier-for-loose/:supplier").get(
    role_auth(),
    code_acc_to_supplier_for_loose
);

module.exports = Router;
