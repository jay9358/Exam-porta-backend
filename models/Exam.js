const { request } = require("express");
const mongoose = require("mongoose");

const examSchema = new mongoose.Schema(
	{
		title: {
			type: String,
			required: true,
		},
		description: {
			type: String,
			required: true,
		},
		timeLimit: {
			type: Number, // Time limit in minutes
			required: true,
		},
		level: {
			type: Number,
			required: true,
		},
		questionSets: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "QuestionSet",
				required: true,
			},
		],
		assignedToSchools: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "School",
			},
		],
		createdBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User", // Usually an Admin who created the exam
			required: true,
		},
		Status: {
			type: String,
			required: true
		},
		date: {
			type: Date,
			required: true
		},
		totalQuestions:{
				type:Number,
				required:true
		},
		startTime: {
			type: String,
			required: true
		},
		createdAt: {
			type: Date,
			default: Date.now
		},
		updatedAt: {
			type: Date,
			default: Date.now
		}
	},
	{
		timestamps: true,
	}
);

module.exports = mongoose.model("Exam", examSchema);
