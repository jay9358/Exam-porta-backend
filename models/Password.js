const mongoose = require("mongoose");

const passwordSchema = new mongoose.Schema({
    defaultPassword: {
        type: String,
        required: true,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // Reference to admin who created/updated the password
    }
}, {
    timestamps: true,
});

// Ensure only one document exists
passwordSchema.pre('save', async function(next) {
    const Password = this.constructor;
    if (this.isNew) {
        const count = await Password.countDocuments();
        if (count > 0) {
            throw new Error('Only one default password document can exist');
        }
    }
    next();
});

module.exports = mongoose.model("Password", passwordSchema);