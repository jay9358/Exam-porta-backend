const Exam = require("../models/Exam");
const QuestionSet = require("../models/QuestionSet");
const Question = require("../models/Question");
const Result = require("../models/Result");
const User = require("../models/User");
const School = require("../models/School");

// Start Exam Process for a Student
exports.startExam = async (req, res) => {
	try {
		console.log("Starting exam");
		const { examId } = req.params;
		const studentId = req.user._id;

		// Ensure student and exam exist
		const student = await User.findById(studentId);
		const exam = await Exam.findById(examId).populate("questionSets");

		if (!student || student.accountType !== "Student") {
			return res
				.status(404)
				.json({ message: "Student not found or invalid user" });
		}
		if (!exam) {
			return res.status(404).json({ message: "Exam not found" });
		}

		// Check if the student has already submitted the exam
		const previousResult = await Result.findOne({
			student: studentId,
			exam: examId,
		});

		if (previousResult) {
			return res
				.status(400)
				.json({ message: "You have already completed this exam" });
		}

		// Check if the student has already started the exam
		if (
			req.session?.examDetails &&
			req.session?.examDetails?.examId === examId &&
			req.session?.examDetails?.studentId === studentId
		) {
			return res
				.status(400)
				.json({ message: "Exam already started for this student" });
		}

		// Fetch all questions from all question sets
		let allQuestions = [];
		let questionSets = [];
		for (const questionSetId of exam.questionSets) {
			const 	questionSet = await QuestionSet.findById(questionSetId).populate("questions");
			questionSets.push(questionSet);
		
		}
		console.log(questionSets);
		// Get a random set from the questionSets
		const randomIndex = Math.floor(Math.random() * questionSets.length);
		const randomQuestionSet = questionSets[randomIndex];
		console.log(randomQuestionSet);
		allQuestions = randomQuestionSet.questions;
		console.log(allQuestions);
		const totalQuestions = exam.totalQuestions;
		
		// Validate if we have enough questions
		if (allQuestions.length < totalQuestions) {
			return res.status(400).json({ 
				message: `Not enough questions available. Required: ${totalQuestions}, Available: ${allQuestions.length}` 
			});
		}

		// Fisher-Yates shuffle algorithm
		const shuffledQuestions = [...allQuestions];
		for (let i = shuffledQuestions.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]];
		}
		
		const selectedQuestions = shuffledQuestions.slice(0, totalQuestions);
		console.log(selectedQuestions.length);
		
		// Start exam with predefined time limit
		const startTime = exam.startTime;
		const endTime = startTime + exam.timeLimit * 60 * 1000;
		console.log("Start time:", startTime);
		const timeLimit = exam.timeLimit;
		// Store student-exam-session details
		const examDetails = {
			studentId,
			examId,
			startTime,
			endTime,
			questions: selectedQuestions,
			timeLimit,
		};

		res
			.status(200)
			.json({ message: "Exam started", endTime, questions: selectedQuestions, examDetails });
	} catch (error) {
		console.log(error);
		console.error(error);
		res.status(500).json({ message: "Error starting exam", error });
	}
};

// View all exams
exports.getAllExamsStud = async (req, res) => {
	console.log("Getting all exams for student");

	const { level } = req.body;
	console.log(level);
	try {
		const exams = await Exam.find({ level: level })
			.populate("questionSets")
			.populate("assignedToSchools")
			.populate("createdBy", "firstName lastName"); // Populating createdBy to see which admin created the exam
		res.status(200).json({ exams });
	} catch (error) {
		res.status(500).json({ message: "Error fetching exams", error });
	}
};

// Assign Random Question Set for an Exam to a Student
exports.assignRandomQuestionSet = async (req, res) => {
	try {
		// Ensure student and exam exist
		const studentId = req.user._id;
		const examId = req.params.examId;

		const student = await User.findById(studentId);
		const exam = await Exam.findById(examId).populate("questionSets");

		if (!student || student.accountType !== "Student") {
			throw new Error("Student not found or invalid user");
		}
		if (!exam) {
			throw new Error("Exam not found");
		}

		// Assign random question set to the student if not already assigned
			const randomQuestionSet = exam.questionSets[Math.floor(Math.random() * exam.questionSets.length)];
			const questions = await QuestionSet.findById(randomQuestionSet).populate("questions");

			// Store student-exam-session details
		const assgnDetails = {
				studentId,
				examId,
				questionSetId: randomQuestionSet,
				questions,
			};
		res
			.status(200)
			.json({ message: "Set Assigned", assgnDetails });
			
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Error assigning set", error });
	}
};

exports.submitExam = async (req, res) => {
	try {
		const { answers,questions } = req.body;
		const studentId = req.user._id;
		const examId = req.params.examId;
		console.log(answers, studentId, examId);

		// Validate input	
		if (!answers || typeof answers !== "object") {
			return res
				.status(400)
				.json({ message: "Answers are required and must be an object" });
		}

		// Ensure student exists and is of type 'Student'
		const student = await User.findById(studentId);
		if (!student || student.accountType !== "Student") {
			return res
				.status(404)
				.json({ message: "Student not found or user is not authorized" });
		}

		// Ensure exam exists
		const exam = await Exam.findById(examId);
		if (!exam) {
			return res.status(404).json({ message: "Exam not found" });
		}

		// Fetch all question details from the database
		const questionIds = Object.keys(answers); // Extract question IDs from the keys of the answers object
		const question = await Question.find({ _id: { $in: questionIds } });
		
		// Validate that all questions exist
		if (question.length !== questionIds.length) {
			return res
				.status(400)
				.json({ message: "Some questions provided in answers are invalid" });
		}

		// Calculate score
		let score = 0;
		const questionsAnswered = question.map((question) => {
			const selectedOptionId = answers[question._id.toString()]; // Get the selected option ID from the answers object
			const selectedOption = question.options.find(
				(option) => option._id.toString() === selectedOptionId
			); // Find the matching option
			const isCorrect = selectedOption && selectedOption.isCorrect;
			if (isCorrect) score += 1;

			return {
				question: question._id,
				selectedOption: selectedOption ? selectedOption.text : null,
				isCorrect,
			};
		});
		const status = score >= question.length * 0.4 ? "Pass" : "Fail";

		// Save result to database
		const result = new Result({
			student: studentId,
			exam: examId,
			score,
			questionsAnswered,
			status,


		});
		await result.save();

		// Respond with success
		res.status(200).json({
			message: "Exam submitted successfully",
			score,
			questionsAnswered,
			status,
		});
	} catch (error) {
		// Log and handle errors
		console.error("Error submitting exam:", error);
		res.status(500).json({
			message: "An error occurred while submitting the exam",
			error: error.message,
		});
	}
};

// Auto-Submit Exam when Time Expires
exports.autoSubmitExam = async (req, res) => {
	try {
		const { studentId, examId } = req.session.examDetails;
		const currentTime = Date.now();
		if (currentTime > req.session.examDetails.endTime) {
			// Auto-submit exam if time has expired
			await this.submitExam(
				{
					body: {
						studentId,
						examId,
						answers: req.session.examDetails.answers || [],
					},
				},
				res
			);
		} else {
			res.status(400).json({ message: "Time has not expired yet" });
		}
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Error during auto-submission", error });
	}
};

// Live Monitoring of Exam Progress
exports.liveMonitorExam = async (req, res) => {
	try {
		const { examId } = req.params;

		// Ensure exam exists
		const exam = await Exam.findById(examId).populate("questionSets");
		if (!exam) {
			return res.status(404).json({ message: "Exam not found" });
		}

		// Fetch ongoing exam sessions (can be improved using a database or in-memory store like Redis)
		const liveSessions = req.sessionStore.sessions;
		const examSessions = Object.values(liveSessions).filter((session) => {
			const sessionData = JSON.parse(session);
			return (
				sessionData.examDetails && sessionData.examDetails.examId === examId
			);
		});

		// Format live progress data
		const liveData = examSessions.map((session) => {
			const { studentId, startTime, endTime, questions } = session.examDetails;
			const student = User.findById(studentId);
			return {
				studentId,
				studentName: `${student.firstName} ${student.lastName}`,
				startTime,
				endTime,
				questionsAttempted: questions.filter((q) => q.selectedOption).length,
				timeRemaining: endTime - Date.now(),
			};
		});

		res.status(200).json({ message: "Live exam data", liveData });
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Error during live monitoring", error });
	}
};

// View All Exams in Which a Student is Enrolled
exports.viewStudentExams = async (req, res) => {
	try {
		const { studentId } = req.params;

		// Ensure student exists
		const student = await User.findById(studentId).populate("school");
		if (!student || student.accountType !== "Student") {
			return res
				.status(404)
				.json({ message: "Student not found or invalid user" });
		}

		// Fetch school and assigned exams
		const school = await School.findById(student.school).populate(
			"assignedExams"
		);
		if (!school) {
			return res.status(404).json({ message: "School not found" });
		}

		res
			.status(200)
			.json({
				message: "Exams fetched successfully",
				exams: school.assignedExams,
			});
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Error fetching student exams", error });
	}
};

// Admin: View School-Wise Reports and Exam Data
exports.viewSchoolReports = async (req, res) => {
	try {
		const { schoolId } = req.params;

		// Fetch school and assigned exams
		const school = await School.findById(schoolId).populate("assignedExams");
		if (!school) {
			return res.status(404).json({ message: "School not found" });
		}

		// Fetch results for the school's exams
		const results = await Result.find({
			exam: { $in: school.assignedExams },
		}).populate("student exam");

		res
			.status(200)
			.json({
				message: "School reports fetched successfully",
				school,
				results,
			});
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Error fetching school reports", error });
	}
};

// State Manager: View and Generate Reports for Schools in their State
exports.viewStateReports = async (req, res) => {
	try {
		const { state } = req.params;

		// Fetch schools in the state
		const schools = await School.find({ state }).populate("assignedExams");
		if (schools.length === 0) {
			return res
				.status(404)
				.json({ message: "No schools found in this state" });
		}

		// Fetch results for all schools in the state
		const exams = schools.flatMap((school) => school.assignedExams);
		const results = await Result.find({ exam: { $in: exams } }).populate(
			"student exam"
		);

		res
			.status(200)
			.json({
				message: "State reports fetched successfully",
				schools,
				results,
			});
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Error fetching state reports", error });
	}
};

// City Manager: View and Generate Reports for Schools in their City
exports.viewCityReports = async (req, res) => {
	try {
		const { city } = req.params;

		// Fetch schools in the city
		const schools = await School.find({ city }).populate("assignedExams");
		if (schools.length === 0) {
			return res.status(404).json({ message: "No schools found in this city" });
		}

		// Fetch results for all schools in the city
		const exams = schools.flatMap((school) => school.assignedExams);
		const results = await Result.find({ exam: { $in: exams } }).populate(
			"student exam"
		);

		res
			.status(200)
			.json({ message: "City reports fetched successfully", schools, results });
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Error fetching city reports", error });
	}
};

// Worker: Monitor Exam Processes in Assigned Schools
exports.monitorAssignedSchools = async (req, res) => {
	try {
		const { workerId } = req.params;

		// Ensure worker exists
		const worker = await User.findById(workerId).populate("leading");
		if (!worker || worker.accountType !== "Worker") {
			return res
				.status(404)
				.json({ message: "Worker not found or invalid user" });
		}

		// Fetch live monitoring data for assigned schools
		const liveSessions = req.sessionStore.sessions;
		const assignedSchoolIds = worker.leading.map((school) =>
			school._id.toString()
		);
		const examSessions = Object.values(liveSessions).filter((session) => {
			const sessionData = JSON.parse(session);
			return (
				sessionData.examDetails &&
				assignedSchoolIds.includes(sessionData.examDetails.schoolId)
			);
		});

		// Format live monitoring data
		const liveData = examSessions.map((session) => {
			const { studentId, startTime, endTime, questions } = session.examDetails;
			const student = User.findById(studentId);
			return {
				studentId,
				studentName: `${student.firstName} ${student.lastName}`,
				startTime,
				endTime,
				questionsAttempted: questions.filter((q) => q.selectedOption).length,
				timeRemaining: endTime - Date.now(),
			};
		});

		res
			.status(200)
			.json({ message: "Live monitoring data for assigned schools", liveData });
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Error during live monitoring", error });
	}
};

// Send result of submitted exam to student
module.exports.sendExamResult = async (req, res) => {
	try {
		const { examId } = req.params;
		const studentId = req.user._id;

		// Fetch result of the exam
		const result= await Result.findOne
			({
				student: studentId,
				exam: examId,
			})
			.populate("exam");
			if (!result) {
				return res.status(404).json({ message: "Result not found" });
			}

			const student = await User.findById(studentId);
			if (!student) {
				return res.status(404).json({ message: "Student not found" });
			}

			const exam = await Exam.findById(examId);
			if (!exam) {
				return res.status(404).json({ message: "Exam not found" });
			}

			const questionsAttempted = result.questionsAnswered.filter(
				(q) => q.selectedOption
			);
			const totalQuestions
			= exam.questionSets[0].length;
			const score
			= result.score;
			const attem = questionsAttempted.length;
			const resultData = {
				student: student.email,
				exam: exam.title,
				score,
				questionsAttempted: attem,
				totalQuestions: exam.totalQuestions,
			};
			res.status(200).json({
				message: "Exam submitted successfully",
				resultData,
			});
		}
		catch (error) {
			console.error(error);
			res.status(500).json({ message: "Internal Server Error" });
		}
	};

