const express = require("express");
const router = express.Router();
const adminMiddleware = require("../middlewares/adminMiddleware");
const questionSetController = require("../controllers/questionSetController");
const examController = require("../controllers/examController");
const userController = require("../controllers/userController");
const authMiddleware = require("../middlewares/authMiddeware");
const { CheckAdminFromFrontend, CheckStudentFromFrontend ,GetDashboard ,UpdatePassword,getPassword } = require("../controllers/Admin");
const studentMiddleware = require("../middlewares/studentMiddleware");
const { csvUpload } = require('../controllers/helperController');
const multer = require('multer');
const { GetPerformanceReports, GetAllResults, GetWeightage, GetBatches } = require("../controllers/Admin");
const stateMiddleware = require("../middlewares/stateManagerMiddleware");
const cityMiddleware = require("../middlewares/cityManagerMiddleware");
const User=require("../models/User");
// Create a new question set
router.post(
	"/questionSets",
    authMiddleware,
	adminMiddleware,
	questionSetController.createQuestionSet
);

// Add questions to a question set
router.post(
	"/questionSets/questions",
	authMiddleware,
	adminMiddleware,
	questionSetController.addQuestionToSet
);

// Update a question in a question set
router.put(
	"/questions/update/:questionId",
	authMiddleware,
	adminMiddleware,
	questionSetController.updateQuestion
);
// Delete a question from a question set
router.delete(
	"/questions/:questionId",
	authMiddleware,
	adminMiddleware,
	questionSetController.deleteQuestion
);
router.get("/exams/:setId/questions",authMiddleware,adminMiddleware,examController.getQuestionsByExamId);
// View all question sets
router.get(
	"/questionSets",
	authMiddleware,
	questionSetController.getAllQuestionSets
);

// Create a new exam
router.post(
    "/exams", 
    authMiddleware, 
    adminMiddleware, 
    examController.createExam
);
router.post(
	"/exams/:id/reject",
	authMiddleware,
	adminMiddleware,
	examController.handleReject
)

// Update an exam
router.put(
	"/exams/:examId",
	authMiddleware,
	adminMiddleware,
	examController.updateExam
);

// Assign exam to schools
router.post(
	"/exams/:examId/assignSchools",
	authMiddleware,
	adminMiddleware,
	examController.assignExamToSchools
);

// View all exams
router.get(
	"/exams",
	examController.getAllExams
);

// Delete an exam
router.delete(
	"/exams/:examId",
	authMiddleware,
	adminMiddleware,
	examController.deleteExam
);

// Crete user and assign role to that user
router.post(
    "/users/:userId/assignRole", 
    authMiddleware, 
    adminMiddleware, 
    userController.assignRole
);

// Update a user's role
router.put(
	"/users/:userId/update",
	authMiddleware,
	adminMiddleware,
	userController.update
);

// Remove a user's role
router.put(
	"/users/:userId/removeRole",
	authMiddleware,
	adminMiddleware,
	userController.removeRole
);

// View all users by role (State Manager, City Manager, Worker)
router.get(
	"/users/role/:role",
	authMiddleware,
	adminMiddleware,
	userController.getUsersByRole
);

router.get(
	"/user/checkadmin",
	authMiddleware,
    adminMiddleware,
	CheckAdminFromFrontend
)
router.get(
	"/user/checkstudent",
	authMiddleware,
    studentMiddleware,
	CheckStudentFromFrontend
)

router.delete(
	"/users/delete/:userId",
	authMiddleware,
	adminMiddleware,
	userController.deleteuser
)
router.post(
	"/updatePassword",
	authMiddleware,
	adminMiddleware,
	UpdatePassword 
)
router.get(
	"/getPassword",
	authMiddleware,
	adminMiddleware,
	getPassword 
)

// Error handling middleware for multer errors
const handleMulterError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        return res.status(400).json({
            message: "File upload error",
            error: error.message
        });
    }
    next(error);
};

router.post(
	"/registerStudents",
	authMiddleware,
	csvUpload.single('file'),
	handleMulterError,
	userController.registerStudents
)
router.post(
	"/registerSchools",
	authMiddleware,
	csvUpload.single('file'),
	handleMulterError,
	userController.registerSchools // Create this function in your userController
  );

router.get(
    "/schools",
    authMiddleware,
    adminMiddleware,
    userController.fetchSchools // Ensure this points to the correct function
);

router.get(
	"/dashboard",
	authMiddleware,
	adminMiddleware,
	GetDashboard
);

router.get(
	"/reports/performance",
	authMiddleware,
	adminMiddleware,
	GetPerformanceReports
);


router.get(
	"/user/:userId",
	authMiddleware,
	userController.getUserById
);
router.get(
	"/users/:userId",
	authMiddleware,
	cityMiddleware,
	userController.getUserById
);
router.get(
	"/results",
	authMiddleware,
	adminMiddleware,
	GetAllResults
);
router.get(
	"/questionSets/:questionSetId/weightage",
	authMiddleware,
	adminMiddleware,
	GetWeightage
);

router.get(
	"/batches",
	authMiddleware,
	adminMiddleware,
	GetBatches
);

router.get(
	"/questionSets/:questionSetId",
	authMiddleware,
	adminMiddleware,
	examController.getQuestionsByQuestionSetId
);

router.post(
	"/exams/:id/approve",
	authMiddleware,
	adminMiddleware,
	examController.ApproveExam
)

// Delete a question set by ID
router.delete(
    "/questionSets/:questionSetId",
    authMiddleware,
    adminMiddleware,
    questionSetController.deleteQuestionSet
);
router.get(
	"/users/batch/:batchId",
	authMiddleware,
	adminMiddleware,
	async (req, res) => {
		console.log("REACHEDDD")
		const { batchId } = req.params;
		try {
			const users = await User.find({ batch: batchId });
			if (!users.length) {
				return res.status(404).json({ message: "No users found for this batch" });
			}
			res.status(200).json({ message: "Users retrieved successfully", users });
		} catch (error) {
			console.error("Error fetching users by batch:", error);
			res.status(500).json({ message: "Error fetching users by batch", error: error.message });
		}
	}
);

module.exports = router;
