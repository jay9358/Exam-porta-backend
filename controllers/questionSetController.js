const QuestionSet = require("../models/QuestionSet");
const Question = require("../models/Question");

// Create a new question set
exports.createQuestionSet = async (req, res) => {
	const { setName } = req.body;
	try {
		const questionSet = new QuestionSet({
			setName: setName,
			createdBy: req.user._id, // Assuming req.user is the authenticated admin
		});
		await questionSet.save();
		res
			.status(201)
			.json({ message: "Question set created successfully", questionSet });
	} catch (error) {
		res.status(500).json({ message: "Error creating question set", error });
	}
};
// Add a question to a question set
exports.addQuestionToSet = async (req, res) => {
	const { questionText, options, setId } = req.body;
	try {
		// Create a new question
		const question = new Question({ questionText, options });
		await question.save();
		// Add question to the question set
		await QuestionSet.findByIdAndUpdate(setId, {
			$push: { questions: question._id },
		});
		res.status(200).json({ message: "Question added to the set", question });
	} catch (error) {
		res
			.status(500)
			.json({ message: "Error adding question to the set", error });
	}
};
// Update a question in a question set
exports.updateQuestion = async (req, res) => {
	const questionId = req.params.questionId;
	const { questionText, options } = req.body;

	try {
		const updatedQuestion = await Question.findByIdAndUpdate(
			questionId,
			{ questionText, options },
			{ new: true }
		);

		if (!updatedQuestion) {
			return res.status(404).json({ message: "Question not found" });
		}
		res
			.status(200)
			.json({ message: "Question updated successfully", updatedQuestion });
	} catch (error) {
		res.status(500).json({ message: "Error updating question", error });
	}
};
// Delete a question from a question set
exports.deleteQuestion = async (req, res) => {
	const { questionId } = req.params;
	try {
		// Remove the question from all question sets
		await QuestionSet.updateMany({}, { $pull: { questions: questionId } });
		// Remove the question itself
		await Question.findByIdAndDelete(questionId);
		res.status(200).json({ message: "Question deleted successfully" });
	} catch (error) {
		res.status(500).json({ message: "Error deleting question", error });
	}
};
// View all question sets
exports.getAllQuestionSets = async (req, res) => {
	try {
		const questionSets = await QuestionSet.find().populate("questions");
		res.status(200).json({ questionSets });
	} catch (error) {
		res.status(500).json({ message: "Error retrieving question sets", error });
	}
};
