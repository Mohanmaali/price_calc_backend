const Router = require("express").Router();
const {
  add_client,
  get_all_clients,
  get_single_client,
  update_client,
  delete_client,
  isClientAssignedAnywhere,
} = require("../controllers/client_controller");
const {
  addClient_Type,
  getClient_Type,
  getClient_TypeById,
  updateClient_Type,
  deleteClient_Type,
} = require("../controllers/clientType_controller");

const auth = require("../middleware/auth");
const role_auth = require("../middleware/role_auth");
const upload = require("../middleware/photo_middleware");

Router.route("/add").post(
  role_auth(),
  upload.fields([
    { name: "logofile", maxCount: 1 },
    { name: "trn_file", maxCount: 1 },
    { name: "trade_file", maxCount: 1 },
    { name: "auth_file", maxCount: 1 },
    { name: "auth_idfile", maxCount: 1 },
  ]),
  add_client
);
Router.route("/get_all").get(role_auth(), get_all_clients);
Router.route("/get_one/:id").get(role_auth(), get_single_client);
Router.route("/update/:id").patch(
  role_auth(),
  upload.fields([
    { name: "logofile", maxCount: 1 },
    { name: "trn_file", maxCount: 1 },
    { name: "trade_file", maxCount: 1 },
    { name: "auth_file", maxCount: 1 },
    { name: "auth_idfile", maxCount: 1 },
  ]),
  update_client
);
Router.route("/delete/:id").delete(role_auth(), delete_client);

Router.route("/client-type/add").post(addClient_Type);
Router.route("/client-type/get").get(getClient_Type);
Router.route("/client-type/get/:id").get(getClient_TypeById);
Router.route("/client-type/update/:id").patch(updateClient_Type);
Router.route("/client-type/delete/:id").delete(deleteClient_Type);
Router.route("/check-assigned/:id").get(isClientAssignedAnywhere)

module.exports = Router;
