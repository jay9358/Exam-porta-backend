const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
	sessionId: {
		type: String,
		required: true,
		
	},
	examId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Exam",
		required: true,

	},

	createdAt: {
		type: Date,
		default: Date.now,
	},
});

module.exports = mongoose.model("Session", sessionSchema);
