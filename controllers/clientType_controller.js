const { default: mongoose } = require("mongoose");
const Client = require("../models/client");
const Client_Type = require("../models/client_type");
const ClientType = require("../models/client_type")

const addClient_Type = async(req,res) => {
    try {
        const { clienttype } = req.body;
        console.log("req.body",req.body);
        
        if (clienttype == "") {
          return res.status(400).json({ mssg: "All Fields Are Mandatory" });
        }
        const new_type = await ClientType.create({
            clienttype
        });
        console.log(new_type)
        return res.status(200).json({ mssg: "Client Type Added" });
      } catch (error) {
        console.log(error);
        res.status(500).json({
            mssg:error?.message
        })
      }
}

const getClient_Type = async(req,res) => {
    try {
        const data = await ClientType.find();
        res.status(200).json({data});
    } catch (error) {
        console.log(error);
        res.status(500).json({mssg: error?.message || 'Internal server error'})
    }
}

const getClient_TypeById = async(req,res) => {
    try {
        const {id} = req.params;
        const data = await ClientType.findById(id);
        res.status(200).json({data});
    } catch (error) {
        console.log(error);
        res.status(500).json({mssg: error?.message || 'Internal server error'})
    }
}

const updateClient_Type = async(req,res) => {
    try {
        const {id} = req.params;
        const data = await ClientType.findByIdAndUpdate(id,req.body,{new:true});
        res.status(200).json({mssg:'Data Updated',data});
    } catch (error) {
        console.log(error);
        res.status(500).json({mssg: error?.message || 'Internal server error'})
    }
}

const deleteClient_Type = async(req,res) => {
    try {
        const {id} = req.params;
        const data = await ClientType.findByIdAndDelete(id);
        res.status(200).json({mssg:'Data Deleted',data});
    } catch (error) {
        console.log(error);
        res.status(500).json({mssg: error?.message || 'Internal server error'})
    }
}

const isClientTypeAssignedAnyWhere = async (req , res) => {
    try {
        const {id} = req.params;

        const isAssigned = await Client.find({clientTypeId: new mongoose.Types.ObjectId(id)}).select("name");
        const usedAnywhere = isAssigned?.length > 0;

        const result = {
            client: isAssigned
        }

        res.status(200).json({
            success:true,
            usedAnywhere,
            data:result
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({mssg: error?.message || 'Internal server error'})
    }
}

module.exports = {
    addClient_Type,
    getClient_Type,
    getClient_TypeById,
    updateClient_Type,
    deleteClient_Type,
    isClientTypeAssignedAnyWhere
}