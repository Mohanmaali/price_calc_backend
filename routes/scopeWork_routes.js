const express = require("express");
const Router = express.Router();

const {
    addScope,
    getScope,
    getScopeById,
    updateScope,
    deleteScope,
} = require("../controllers/scopeWork_controller");
const role_auth = require("../middleware/role_auth");

Router.route("/addScope").post(role_auth(), addScope);
Router.route("/getScope").get(role_auth(), getScope);
Router.route("/getScopeById/:id").get(role_auth(), getScopeById);
Router.route("/updateScope/:id").patch(role_auth(), updateScope);
Router.route("/deleteScope/:id").delete(role_auth(), deleteScope);

module.exports = Router;