const Profile_System_Model = require("../models/profile_system_model");
const Profile_Input_Model = require("../models/profile_input_model");
const Profile_Calculator = require("../models/profile_non_insulated_calc_model");
const {
    Profile_Insulated_Input,
} = require("../models/profile_insulated_input");
const Accessories_Input_Model = require("../models/accessories_input_model");
const Operations_Model = require("../models/extrusion_model");
const {
    price_calc_step2_Helper,
    acc_package_pl_helper,
} = require("./accessories_controllers");
const xlsx = require("xlsx");
const fs = require("fs");
const Raw_Material_Model = require("../models/raw_material_model");
const Stock_model = require("../models/stock_model");
const Profile_Insulated_Calculator = require("../models/profile_insulated_calc_model");
const Kit_Input = require("../models/kit_model");
const Packaging_Material = require("../models/packaging_material_model");
const Accessories_Supplier_Model = require("../models/accessories_supplier_model");
const Loose_Stock_model = require("../models/loose_stock_model");
const Project_Model = require("../models/project_model");
const Action_model = require("../models/actions_model");
const Group_Subgroup = require("../models/group_subgroup");
const Units = require("../models/units");
const { default: mongoose } = require("mongoose");
const AccessoriesCalculator = require("../models/accessories_calculator_model");
const { Purchase_Model } = require("../models/purchase_order_model");
const Log_Model = require("../models/log");
const Finish = require("../models/finish");

const add_system = async (req, res) => {
    try {
        const { name, group } = req.body.system_form;
        const royality = parseFloat(req.body.system_form.royality);
        const overhead = parseFloat(req.body.system_form.overhead);
        const profit = parseFloat(req.body.system_form.profit);
        const price_list_1 = parseFloat(req.body.system_form.price_list_1);
        const price_list_2 = parseFloat(req.body.system_form.price_list_2);
        const price_list_3 = parseFloat(req.body.system_form.price_list_3);
        const price_list_4 = parseFloat(req.body.system_form.price_list_4);
        const nestedState = req.body.state1;
        if (
            !name ||
            !group ||
            royality === null ||
            isNaN(royality) ||
            overhead === null ||
            isNaN(overhead) ||
            profit === null ||
            isNaN(profit) ||
            price_list_1 === null ||
            isNaN(price_list_1) ||
            price_list_2 === null ||
            isNaN(price_list_2) ||
            price_list_3 === null ||
            isNaN(price_list_3) ||
            price_list_4 === null ||
            isNaN(price_list_4) ||
            nestedState.length == 0
        ) {
            return res.status(400).json({ mssg: "All Entries Are Required" });
        }
        const if_system = await Profile_System_Model.findOne({
            $or: [{ name }, { group }],
        });
        if (if_system) {
            return res
                .status(400)
                .json({ mssg: "Entry Already Exists With This System or Group" });
        }
        const new_system = await Profile_System_Model.create({
            name,
            group,
            royality,
            overhead,
            profit,
            price_list_1,
            price_list_2,
            price_list_3,
            price_list_4,
            system_detail: nestedState,
        });
        return res.status(200).json({ mssg: "New System Added" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            mssg: error?.message || 'Internal server error'
        })
    }
};
const get_all_systems = async (req, res) => {
    try {
        const systems = await Profile_System_Model.find();
        return res.status(200).json(systems);
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            mssg: error?.message || 'Internal server error'
        })
    }
};
const get_single_system = async (req, res) => {
    try {
        const id = req.params.id;
        const system = await Profile_System_Model.findById(id);
        return res.status(200).json(system);
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            mssg: error?.message || 'Internal server error'
        })
    }
};
const update_system = async (req, res) => {
    try {
        const id = req.params.id;
        const { name, group } = req.body.system_form;
        const royality = parseFloat(req.body.system_form.royality);
        const overhead = parseFloat(req.body.system_form.overhead);
        const profit = parseFloat(req.body.system_form.profit);
        const price_list_1 = parseFloat(req.body.system_form.price_list_1);
        const price_list_2 = parseFloat(req.body.system_form.price_list_2);
        const price_list_3 = parseFloat(req.body.system_form.price_list_3);
        const price_list_4 = parseFloat(req.body.system_form.price_list_4);
        const nestedState = req.body.state1;
        if (
            !name ||
            !group ||
            royality === null ||
            isNaN(royality) ||
            overhead === null ||
            isNaN(overhead) ||
            profit === null ||
            isNaN(profit) ||
            price_list_1 === null ||
            isNaN(price_list_1) ||
            price_list_2 === null ||
            isNaN(price_list_2) ||
            price_list_3 === null ||
            isNaN(price_list_3) ||
            price_list_4 === null ||
            isNaN(price_list_4)
        ) {
            return res.status(400).json({ mssg: "All Entries Are Required" });
        }
        const updated_system = await Profile_System_Model.findByIdAndUpdate(id, {
            name,
            group,
            royality,
            overhead,
            profit,
            price_list_1,
            price_list_2,
            price_list_3,
            price_list_4,
            system_detail: nestedState,
        });
        return res.status(200).json({ mssg: "System Updated" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            mssg: error?.message || 'Internal server error'
        })
    }
};
const delete_system = async (req, res) => {
    try {
        const id = req.params.id;
        const deleted_system = await Profile_System_Model.findByIdAndDelete(id);
        // console.log(cost_usd_per_kg,fluctuation,cost_with_fluctuation)
        return res.status(200).json({ mssg: "System Deleted" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            mssg: error?.message || 'Internal server error'
        })
    }
};
const assigned_systems = async (req, res) => {
    try {
        const accessoriesSystem = await Accessories_Input_Model.aggregate([
            { $group: { _id: null, system: { $addToSet: "$system" } } },
        ]);

        const profileSystem = await Profile_Input_Model.aggregate([
            { $group: { _id: null, system: { $addToSet: "$system" } } },
        ]);

        const insulatedSystem = await Profile_Insulated_Input.aggregate([
            { $group: { _id: null, system: { $addToSet: "$system" } } },
        ]);

        // Combine System from all three collections
        const System = [
            ...(accessoriesSystem[0]?.system || []),
            ...(profileSystem[0]?.system || []),
            ...(insulatedSystem[0]?.system || []),
        ];

        return res.status(200).json(System);
    } catch (error) {
        return res.status(500).json({
            mssg: error?.message || 'Internal server error'
        })
    }
};
const systems_assigned_to = async (req, res) => {
    try {
        const { id } = req.params;
        const acc_ni_pipeline = [
            {
                $match: { supersystem_id: new mongoose.Types.ObjectId(id) }, // Filter documents based on the system name
            },
            {
                $project: {
                    code: "$code",
                },
            },
        ];
        const in_kit_pipeline = [
            {
                $match: { supersystem_id: new mongoose.Types.ObjectId(id) }, // Filter documents based on the system name
            },
            {
                $project: {
                    code: 1,
                },
            },
        ];
        const accessory_system = await Accessories_Input_Model.aggregate(
            acc_ni_pipeline
        );
        const profile_system = await Profile_Input_Model.aggregate(acc_ni_pipeline);
        const profile_ins_system = await Profile_Insulated_Input.aggregate(
            in_kit_pipeline
        );
        const kit_system = await Kit_Input.aggregate(in_kit_pipeline);

        return res.status(200).json({
            accessory_system,
            profile_system,
            profile_ins_system,
            kit_system,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            mssg: error?.message || 'Internal server error'
        })
    }
};
const non_ins_subsystems = async (req, res) => {
    try {
        const subsystem = await Profile_Input_Model.aggregate([
            { $group: { _id: null, subsystem: { $addToSet: "$subsystem" } } },
        ]);
        return res.json({ subsystem });
    } catch (error) {
        return res.status(500).json({
            mssg: error?.message || 'Internal server error'
        })
    }
};


const combinedSystem = async (req, res) => {
    try {
        const systems = await Profile_System_Model.find({}, { system_detail: 1 });

        // Flatten all system_detail arrays into one
        const allSystemDetails = systems.flatMap(system => system.system_detail.map(detail => ({
            ...detail.toObject(), // ensure plain object
        })));

        res.status(200).json(allSystemDetails);
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            mssg: error?.message || 'Internal server error'
        })
    }
}

module.exports = {
    add_system,
    get_all_systems,
    get_single_system,
    update_system,
    delete_system,
    assigned_systems,
    systems_assigned_to,
    non_ins_subsystems,
    combinedSystem
}