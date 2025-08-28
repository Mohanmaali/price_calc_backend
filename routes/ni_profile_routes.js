const express = require("express");
const Router = express.Router();

const {
  add_input,
  get_all_entry,
  get_single_entry,
  update_input,
  delete_input,
  genratePriceList,
  get_price_list,
  import_profile_excel_file,
  non_ins_subsystems,
  add_non_insulated_package,
  get_single_non_insulated_package,
  update_non_insulated_package,
  ni_profile_assigned_to,
  get_ni_avlb_for_package,
  create_duplicate_ni,
  generate_Package_PL,
  get_ni_package_pl,
  get_non_insulated_packages,
  get_Non_Insulated_Groups,
} = require("../controllers/ni_profile_controllers");
const auth = require("../middleware/auth");
const role_auth = require("../middleware/role_auth");
const upload = require("../middleware/photo_middleware");

//Profile Input
Router.route("/input/add").post(role_auth(), upload.single("photo"), add_input);
Router.route("/input/get_all").get(role_auth(), get_all_entry);
Router.route("/input/get_one/:id").get(role_auth(), get_single_entry);
Router.route("/input/update/:id").patch(
  role_auth(),
  upload.single("photo"),
  update_input
);
Router.route("/input/assigned/:id").get(role_auth(), ni_profile_assigned_to);
Router.route("/input/delete/:id").delete(role_auth(), delete_input);
Router.route("/input/create-duplicate").post(
  role_auth(),
  upload.single("photo"),
  create_duplicate_ni
);
Router.route("/input/import").post(
  role_auth(),
  upload.single("file"),
  import_profile_excel_file
);

//Price List
Router.route("/price_list/genrate-price-list").get(
  role_auth(),
  genratePriceList
);
Router.route("/price_list/get").get(role_auth(), get_price_list);

//packages
Router.route("/package/add").post(role_auth(), add_non_insulated_package);
Router.route("/package/get").get(role_auth(), get_non_insulated_packages);
Router.route("/package/get_one/:id").get(
  role_auth(),
  get_single_non_insulated_package
);
Router.route("/package/update/:id").post(
  role_auth(),
  update_non_insulated_package
);
Router.route("/package/available").get(role_auth(), get_ni_avlb_for_package);
//package pl
Router.route("/package/price-list/genrate-price-list").get(
  auth,
  generate_Package_PL
);
Router.route("/package/price-list/get").get(role_auth(), get_ni_package_pl);

//Search Subsystem
Router.route("/input/search-subsystem").get(
  role_auth(),
  non_ins_subsystems
);
Router.route("/input/get-group").get(
  role_auth(),
  get_Non_Insulated_Groups
);

module.exports = Router;
