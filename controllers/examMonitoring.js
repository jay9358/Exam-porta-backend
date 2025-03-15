const Exam = require("../models/Exam");
const Result = require("../models/Result");
const User = require("../models/User");
const School = require("../models/School");

// Live Monitoring of Exams
exports.liveMonitorExam = async (req, res) => {
	try {
		const { role, userId, schoolId } = req.params;

		let filter = {};
		if (role === "Admin") {
			// Admin can view live data for all schools
			filter = {};
		} else if (role === "StateManager") {
			const stateSchools = await School.find({ stateManager: userId });
			filter.schoolId = { $in: stateSchools.map((school) => school._id) };
		} else if (role === "CityManager") {
			const citySchools = await School.find({ cityManager: userId });
			filter.schoolId = { $in: citySchools.map((school) => school._id) };
		} else if (role === "Worker") {
			filter.schoolId = schoolId;
		} else {
			return res.status(403).json({ message: "Invalid role" });
		}

		// Get live monitoring data based on the filter
		const liveSessions = req.sessionStore.sessions;
		const examSessions = Object.values(liveSessions).filter((session) => {
			const sessionData = JSON.parse(session);
			return sessionData.examDetails && filter.schoolId
				? filter.schoolId.includes(sessionData.examDetails.schoolId)
				: true;
		});

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

// Generate Performance Reports
exports.generatePerformanceReports = async (req, res) => {
	try {
		const { role, userId, schoolId } = req.params;

		let filter = {};
		if (role === "Admin") {
			// Admin can view data for all schools
			filter = {};
		} else if (role === "StateManager") {
			const stateSchools = await School.find({ stateManager: userId });
			filter.schoolId = { $in: stateSchools.map((school) => school._id) };
		} else if (role === "CityManager") {
			const citySchools = await School.find({ cityManager: userId });
			filter.schoolId = { $in: citySchools.map((school) => school._id) };
		} else if (role === "Worker") {
			filter.schoolId = schoolId;
		} else {
			return res.status(403).json({ message: "Invalid role" });
		}
		const schools = await School.find(filter);
		const performanceReports = await Promise.all(
			schools.map(async (school) => {
				const results = await Result.find({ school: school._id });
				const averageScore =
					results.reduce((acc, result) => acc + result.score, 0) /
					results.length;
				const completionRate =
					results.filter((result) => result.isCompleted).length /
					results.length;
				const questionLevelPerformance = results.map((result) => {
					return {
						question: result.question,
						isCorrect: result.isCorrect,
					};
				});

				return {
					schoolName: school.name,
					averageScore,
					completionRate,
					questionLevelPerformance,
				};
			})
		);

		res
			.status(200)
			.json({
				message: "Performance reports generated successfully",
				performanceReports,
			});
	} catch (error) {
		console.error(error);
		res
			.status(500)
			.json({ message: "Error generating performance reports", error });
	}
};

// School-Wise Data Segregation
exports.getSchoolWiseData = async (req, res) => {
	try {
		const { role, userId, schoolId } = req.params;

		let filter = {};
		if (role === "Admin") {
			// Admin can view data for all schools
			filter = {};
		} else if (role === "StateManager") {
			const stateSchools = await School.find({ stateManager: userId });
			filter.schoolId = { $in: stateSchools.map((school) => school._id) };
		} else if (role === "CityManager") {
			const citySchools = await School.find({ cityManager: userId });
			filter.schoolId = { $in: citySchools.map((school) => school._id) };
		} else if (role === "Worker") {
			filter.schoolId = schoolId;
		} else {
			return res.status(403).json({ message: "Invalid role" });
		}

		const schools = await School.find(filter);
		const schoolData = await Promise.all(
			schools.map(async (school) => {
				const results = await Result.find({ school: school._id });
				return {
					schoolName: school.name,
					results,
				};
			})
		);

		res
			.status(200)
			.json({ message: "School-wise data fetched successfully", schoolData });
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Error fetching school-wise data", error });
	}
};
