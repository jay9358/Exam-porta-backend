const mongoose = require("mongoose");

const questionSetSchema = new mongoose.Schema(
	{
		setName: {
			type: String,
			// enum: ["A", "B", "C"],
			required: true,
		},
		questions: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "Question", // Reference to the Question Model
			},
		],
		createdBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User", // Usually an Admin
		},
		level: {
			type: Number,
			min: 0,
			max: 4,
			required: true,
		},
	},
	{
		timestamps: true,
	}
);

module.exports = mongoose.model("QuestionSet", questionSetSchema);
