const mongoose = require("mongoose");

const schoolSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
		},
		schoolId: {
			type: String,
			required: true,
			unique: true,
		},
		city: {
			type: String,
			required: true,
		},
		state: {
			type: String,
			required: true,
		},
		assignedExams: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "Exam",
			},
		],
		students: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "User", // Only users with role 'Student'
			},
		],
		workers: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "User", // Only users with role 'Worker'
			},
		],
		cityManager: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User", // Only users with role 'CityManager'
		},
		stateManager: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User", // Only users with role 'StateManager'
		},
	},
	{
		timestamps: true,
	}
);

module.exports = mongoose.model("School", schoolSchema);
