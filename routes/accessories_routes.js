const express = require("express");
const Router = express.Router();

const {
  add_input,
  get_all_entry,
  get_single_entry,
  update_input,
  delete_input,
  price_calc_step2,
  getPriceList,
  search_accessories_input_code,
  search_accessories_price_list,
  import_excel_file,
  search_acc_subsystem,
  acc_assigned_to,
  get_acc_avlb_for_package,
  create_duplicate_acc,
  acc_package_pl_helper,
  acc_package_pl,
  getPackagePriceList,
  get_pl_for_insulated,
  addFields,
} = require("../controllers/accessories_controllers");
const auth = require("../middleware/auth");
const role_auth = require("../middleware/role_auth");
const upload = require("../middleware/photo_middleware");

// Price Input Routes
Router.route("/input/add").post(role_auth(), upload.single("photo"), add_input);
Router.route("/input/get_all").get(role_auth(), get_all_entry);
Router.route("/input/get_one/:id").get(role_auth(), get_single_entry);
Router.route("/input/update/:id").patch(
  role_auth(),
  upload.single("photo"),
  update_input
);
Router.route("/input/assigned/:id").get(role_auth(), acc_assigned_to);
Router.route("/input/delete/:id").delete(role_auth(), delete_input);
Router.route("/input/create-duplicate").post(
  role_auth(),
  upload.single("photo"),
  create_duplicate_acc
);


//Price_list routes
Router.route("/price_list/step2").get(auth, price_calc_step2);
Router.route("/price_list/get").get(auth, getPriceList);
Router.route("/price_list/get/:id").get(auth, get_pl_for_insulated);
Router.route("/package/price-list/refresh").get(auth, acc_package_pl);
Router.route("/package/price-list/get").get(auth, getPackagePriceList);
Router.route("/package/available").get(role_auth(), get_acc_avlb_for_package);

//Search Code for Insulated
Router.route("/input/search-code").get(
  role_auth(),
  search_accessories_input_code
);
Router.route("/input/price_list_search").get(
  role_auth(),
  search_accessories_price_list
);
Router.route("/input/subsytems").get(role_auth(), search_acc_subsystem);
//import excel file
Router.route("/input/import").post(
  role_auth(),
  upload.single("file"),
  import_excel_file
);
Router.route("/addFields").get(addFields);

module.exports = Router;
