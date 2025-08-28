const express = require("express");
const Router = express.Router();

const {
    addClient_Type,
    getClient_Type,
    getClient_TypeById,
    updateClient_Type,
    deleteClient_Type,
    isClientTypeAssignedAnyWhere
} = require("../controllers/clientType_controller");

Router.route('/addClientType').post(addClient_Type)
Router.route('/getClientType').get(getClient_Type)
Router.route('/getClientTypeById/:id').get(getClient_TypeById)
Router.route('/updateClientType/:id').patch(updateClient_Type)
Router.route('/deleteClientType/:id').delete(deleteClient_Type)

Router.route('/check-assigned/:id').get(isClientTypeAssignedAnyWhere)

module.exports = Router;