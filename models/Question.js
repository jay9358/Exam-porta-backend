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
	},
	{
		timestamps: true,
	}
);

module.exports = mongoose.model("Question", questionSchema);