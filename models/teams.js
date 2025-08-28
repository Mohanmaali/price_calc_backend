const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema(
    {
        name: { type: String, trim: true, required: true },
        department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
        // tabs: [
        //     {
        //         name: { type: String, trim: true },
        //         visibility: { type: Boolean, trim: false },
        //         create: { type: Boolean, default: false },
        //         read: { type: Boolean, default: false },
        //         update: { type: Boolean, default: false },
        //         delete: { type: Boolean, default: false },
        //         type: { type: String, enum: ["Setting", "Module"], default: "Setting" }
        //     },
        // ],
        image: {
            type: String,
            trim: true,
        }
    },
    {
        timestamps: true,
    }
);

const Team = mongoose.model("Team", teamSchema);

module.exports = Team;
