const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
	{
		firstName: {
			type: String,
			required: true,
			trim: true,
		},
		lastName: {
			type: String,
			required: true,
			trim: true,
		},
		email: {
			type: String,
			trim: true,
			unique: true,
			// required: true,
			// sparse: true,
		},
		rollNo: {
			type: String,
			trim: true,
			unique: true,
		},
		mobileNumber: {
			type: String,
			
			// required: true,
			// sparse: true,
		},
		level: {
			type: Number,
		},
		batch: {
			type: String,
		},
		accountType: {
			type: String,
			enum: [
				"Admin",
				"Student",
				"StateManager",
				"CityManager",
				"Worker",
				"None",
			],
			required: true,
		},
		otp: {
			type: String,
		},
		otpExpiry: {
			type: Date,
		},
		token: {
			type: String,
		},
		image: {
			type: String,
			default: null,
		},
		school: {
			type: String,
			default: null,
		},
		schoolId: {
			type: String,
		},
		State:{
			type: String,
			default: null,
		},
		City:{
			type: String,
			default: null,
		},
		leading: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: "School",
		}],
	},
	{
		timestamps: true, // Automatically adds createdAt and updatedAt fields
	}
);
module.exports = mongoose.model("User", userSchema);
