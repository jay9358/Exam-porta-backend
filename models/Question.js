const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
	{
		questionText: {
			type: String,
			required: true,
		},
		options: [
			{
				text: { type: String, required: true }, // Option text
				isCorrect: { type: Boolean, default: false }, // Whether this option is correct
			},
		],
		chapter: {
			type: String,
			required: true,
		},
		difficulty: {
			type: String,
			required: true,
		},
	},
	{
		timestamps: true,
	}
);

module.exports = mongoose.model("Question", questionSchema);