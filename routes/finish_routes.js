const express = require("express");
const Router = express.Router();

const {
    add_finish,
    get_all_finish,
    get_single_finish,
    update_finish,
    finish_assigned_to,
    delete_finish,
} = require("../controllers/raw_material_controllers");
const auth = require("../middleware/auth");
const role_auth = require("../middleware/role_auth");

Router.route("/add").post(role_auth(), add_finish);
Router.route("/get").get(role_auth(), get_all_finish);
Router.route("/get/:id").get(role_auth(), get_single_finish);
Router.route("/update/:id").patch(role_auth(), update_finish);
Router.route("/assigned/:id").get(role_auth(), finish_assigned_to);
Router.route("/delete/:id").delete(role_auth(), delete_finish);

module.exports = Router;
