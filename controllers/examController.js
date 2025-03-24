const Exam = require("../models/Exam");
const QuestionSet = require("../models/QuestionSet");
const School = require("../models/School");
const Session = require("../models/Sessions");
const {GenerateQuestionSets} = require("./helperController");
const Question = require("../models/Question");
// Create a new exam
exports.createExam = async (req, res) => {
	
	
	const { title, description, timeLimit, questionSets, level, Status,totalQuestions, date, startTime, batch,questionSetWeights } = req.body;
	
	// Validate required fields
	if (!title || !description || !timeLimit || !questionSets || !level || !Status || !date ||!totalQuestions|| !startTime|| !batch || !questionSetWeights) {
		return res.status(400).json({ message: "All fields are required" });
	}
	const ApprovalStatus="Pending";

	try {
		// Ensure the question sets exist
		const validQuestionSets = await QuestionSet.find({
			_id: { $in: questionSets },
		});

		if (validQuestionSets.length !== questionSets.length) {
			return res.status(400).json({ message: "Invalid question sets" });
		}

		// Convert questionSetWeights to a Map
		const questionSetWeightsMap = new Map(Object.entries(questionSetWeights));

		const exam = new Exam({
			title,
			description,
			timeLimit: Number(timeLimit), // Convert to number in case it's sent as string
			questionSets,
			level: Number(level), // Convert to number in case it's sent as string
			Status,
			totalQuestions,
			date: new Date(date), // Convert to Date object
			startTime,
			createdBy: req.user._id,
			batch,
			ApprovalStatus,
			questionSetWeights: questionSetWeightsMap,
		});

		await exam.save();
		const selectedQuestions=await GenerateQuestionSets(exam);
		if(selectedQuestions.length===0){
			return res.status(400).json({ message: "No questions found" });
		}
		console.log(selectedQuestions);

		const questionSet=new QuestionSet({
			setName:exam.title,
			questions:selectedQuestions,
			exam:exam._id,
			weightage:questionSetWeightsMap,
			type:"Exam Set",
		});
		await questionSet.save();
		res.status(201).json({ message: "Exam created successfully", exam });
	} catch (error) {
		console.error("Error creating exam:", error);
		res.status(500).json({ message: "Error creating exam", error: error.message });
	}
};
// Update an exam
exports.updateExam = async (req, res) => {
	const { examId } = req.params;
	const { title, description, timeLimit, questionSets, date, startTime, Status, level } = req.body;
	try {
		// Ensure the exam exists
		const exam = await Exam.findById(examId);
		if (!exam) {
			return res.status(404).json({ message: "Exam not found" });
		}
		// Update exam fields
		exam.title = title || exam.title;
		exam.description = description || exam.description;
		exam.timeLimit = timeLimit || exam.timeLimit;
		exam.date = date || exam.date;
		exam.startTime = startTime || exam.startTime;
		exam.Status = Status || exam.Status;
		exam.level = level || exam.level;

		// If questionSets are updated, validate them
		if (questionSets) {
			const validQuestionSets = await QuestionSet.find({
				_id: { $in: questionSets },
			});
			if (validQuestionSets.length !== questionSets.length) {
				return res.status(400).json({ message: "Invalid question sets" });
			}
			exam.questionSets = questionSets;
		}
		await exam.save();
		res.status(200).json({ message: "Exam updated successfully", exam });
	} catch (error) {
		console.error("Error updating exam:", error);
		res.status(500).json({ message: "Error updating exam", error: error.message });
	}
};
// Assign exam to schools
exports.assignExamToSchools = async (req, res) => {
	const { examId } = req.params;
	const { assignedToSchools } = req.body;
	try {
		// Ensure the exam exists
		const exam = await Exam.findById(examId);
		if (!exam) {
			return res.status(404).json({ message: "Exam not found" });
		}
		// Ensure the schools exist
		const validSchools = await School.find({ _id: { $in: assignedToSchools } });
		if (validSchools.length !== assignedToSchools.length) {
			return res.status(400).json({ message: "Invalid schools" });
		}
		// Assign the schools to the exam
		exam.assignedToSchools = assignedToSchools;
		await exam.save();
		res.status(200).json({ message: "Exam assigned to schools successfully", exam });
	} catch (error) {
		res.status(500).json({ message: "Error assigning exam to schools", error });
	}
};
// View all exams
exports.getAllExams = async (req, res) => {
	try {
		const exams = await Exam.find()
			.populate("questionSets")
			.populate("assignedToSchools")
			.populate("createdBy", "firstName lastName"); // Populating createdBy to see which admin created the exam
		res.status(200).json({ exams });
	} catch (error) {
		res.status(500).json({ message: "Error fetching exams", error });
	}
};
// Delete an exam
exports.deleteExam = async (req, res) => {
	const { examId } = req.params;
	try {
		const exam = await Exam.findByIdAndDelete(examId);
		if (!exam) {
			return res.status(404).json({ message: "Exam not found" });
		}
		res.status(200).json({ message: "Exam deleted successfully" });
	} catch (error) {
		res.status(500).json({ message: "Error deleting exam", error });
	}
};

exports.postSession = async (req, res) => {
	const { examId } = req.params;
	const { sessionId } = req.body;
	console.log("REACHED");
	const session = await Session.findOne({ sessionId });
	if (session) {
		return res.status(200).json({ message: "Session already exists" });
	}
	const newSession = new Session({
		sessionId,
		examId,
		
	});
	await newSession.save();
	res.status(200).json({ message: "Session created successfully", newSession });
}
exports.deleteSession = async (req, res) => {
	const { sessionId } = req.params;
	const session = await Session.findOneAndDelete({ sessionId });
	if (!session) {
		return res.status(404).json({ message: "Session not found" });
	}
	res.status(200).json({ message: "Session deleted successfully", session });
}
exports.getAllSessions = async (req, res) => {
	const sessions = await Session.find();
	res.status(200).json({ sessions });
}
exports.getQuestionsByExamId = async (req, res) => {
	console.log("REACHED");
	const { examId } = req.params;
	const exam = await Exam.findById(examId);
	if (!exam) {
		return res.status(404).json({ message: "Exam not found" });
	}
	const questionSets = await QuestionSet.find({ exam: examId });
	console.log(questionSets);
	
	const questions = [];
	for (const questionSet of questionSets) {
		
		const question = await Question.find({ _id: { $in: questionSet.questions } });
		console.log(question);
		questions.push(...question);
	}
	console.log(questions);
	res.status(200).json({ questions });
}

exports.getQuestionsByQuestionSetId = async (req, res) => {
	console.log("REACHED Question Set Id");
	const { questionSetId } = req.params;
	const questionSet = await QuestionSet.findById(questionSetId);
	if (!questionSet) {
		return res.status(404).json({ message: "Question set not found" });
	}
	
	res.status(200).json({ questionSet });
}
