const mongoose = require("mongoose");

const resultSchema = new mongoose.Schema(
	{
		student: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User", // Reference to the Student who took the exam
			required: true,
		},
		exam: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Exam", // Reference to the Exam
			required: true,
		},
		score: {
			type: Number,
			required: true,
		},
		questionsAnswered: [
			{
				question: {
					type: mongoose.Schema.Types.ObjectId,
					ref: "Question",
					required: true,
				},
				selectedOption: {
					type: String,
					required: true,
				},
				isCorrect: {
					type: Boolean,
					required: true,
				},
			},
		],
	},
	{
		timestamps: true,
	}
);

module.exports = mongoose.model("Result", resultSchema);
