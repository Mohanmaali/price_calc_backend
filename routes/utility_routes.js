const express = require("express");
const Router = express.Router();

const {
    get_acc_filter,
    get_stock_filter,
    get_ni_filter,
    get_insulated_filter,
    get_kit_filter,
    get_stock_filter_data,
    get_task_filter,
} = require("../controllers/utility_controllers");
const auth = require("../middleware/auth");
const role_auth = require("../middleware/role_auth");

// accessory
Router.route("/accessory/get-filter").get(auth, get_acc_filter);

// non-ins profile routes
Router.route("/non-insulated-profile/get-filter").get(auth, get_ni_filter);

// insulated profile routes
Router.route("/insulated-profile/get-filter").get(auth, get_insulated_filter);

// kit routes
Router.route("/kit/get-filter").get(auth, get_kit_filter);

//stock
Router.route("/stock/get-filter").get(auth, get_stock_filter_data);
 
//Task
Router.route("/task/get-filter/:userId").get(auth, get_task_filter);


module.exports = Router;
