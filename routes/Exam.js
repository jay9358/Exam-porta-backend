const express = require("express");
const router = express.Router();
const adminMiddleware = require("../middlewares/adminMiddleware");
const authMiddleware = require("../middlewares/authMiddeware");
const cityManagerMiddleware = require("../middlewares/cityManagerMiddleware");
const stateManagerMiddleware = require("../middlewares/stateManagerMiddleware");
const workerMiddleware = require("../middlewares/workerMiddleware");
const studentExamController = require("../controllers/studentExamController");
const studentMiddleware = require("../middlewares/studentMiddleware");
const monitoringController = require("../controllers/examMonitoring");
const examController = require("../controllers/examController");
// Live Monitoring of Exams
router.get(
	"/liveMonitor/:role/:userId/:schoolId?",
	authMiddleware,
	monitoringController.liveMonitorExam
);

// Generate Performance Reports
router.get(
	"/performanceReports/:role/:userId/:schoolId?",
	authMiddleware,
	monitoringController.generatePerformanceReports
);
// School-Wise Data Segregation
router.get(
	"/schoolWiseData/:role/:userId/:schoolId?",
	authMiddleware,
	monitoringController.getSchoolWiseData
);
// Admin: View School-Wise Reports and Exam Data
router.get(
	"/schools/:schoolId/reports",
	authMiddleware,
	adminMiddleware,
	studentExamController.viewSchoolReports
);
// State Manager: View and Generate Reports for Schools in their State
router.get(
	"/state/:state/reports",
	authMiddleware,
	stateManagerMiddleware,
	studentExamController.viewStateReports
);

// City Manager: View and Generate Reports for Schools in their City
router.get(
	"/city/:city/reports",
	authMiddleware,
	cityManagerMiddleware,
	studentExamController.viewCityReports
);

// Worker: Monitor Exam Processes in Assigned Schools
router.get(
	"/worker/:workerId/monitor",
	authMiddleware,
	workerMiddleware,
	studentExamController.monitorAssignedSchools
);
// Assign Random Question Set for an Exam to a Student
router.post(
	"/:examId/assignSet",
	authMiddleware,
	studentMiddleware,
	studentExamController.assignRandomQuestionSet
);
// Start Exam for a Student
router.get(
	"/:examId/start",
	authMiddleware,
	studentMiddleware,
	studentExamController.startExam
);

// Submit Exam for a Student
router.post(
	"/:examId/submit",
	authMiddleware,
	studentMiddleware,
	studentExamController.submitExam
);

// Result Exam for a Student
router.get(
	"/:examId/result",
	authMiddleware,
	studentMiddleware,
	studentExamController.sendExamResult
);

// Auto-Submit Exam when Time Expires
router.post("/:examId/autoSubmit", studentExamController.autoSubmitExam);

// Live Monitor an Exam
router.get(
	"/:examId/liveMonitor",
	authMiddleware,
	adminMiddleware,
	studentExamController.liveMonitorExam
);
router.get(
	"/:examId/questionsets",
	authMiddleware,
	adminMiddleware,
	examController.getQuestionsetbyexamId	
)
router.post("/:examId/session", authMiddleware, examController.postSession);
router.delete("/:sessionId/sessionDelete", authMiddleware, examController.deleteSession);
router.get("/getAllSessions", authMiddleware, examController.getAllSessions);

router.get("/questionsets/:type",authMiddleware,adminMiddleware,examController.getQuestionbytype)
module.exports = router;
