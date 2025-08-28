const mongoose = require("mongoose");

const positionSchema = new mongoose.Schema(
    {
        name: { type: String, trim: true, required: true },
        department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
        // team: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
        tabs: [
            {
                name: { type: String, trim: true },
                visibility: { type: Boolean, trim: false },
                create: { type: Boolean, default: false },
                read: { type: Boolean, default: false },
                update: { type: Boolean, default: false },
                delete: { type: Boolean, default: false },
                type: { type: String, enum: ["Setting", "Module"], default: "Setting" }
            },
        ],
        image: {
            type: String,
            trim: true,
        }
    },
    {
        timestamps: true,
    }
);

const Position = mongoose.model("Position", positionSchema);

module.exports = Position;
