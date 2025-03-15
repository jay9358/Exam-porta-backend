const express = require("express");
const router = express.Router();

const { sendOTP, verifyOTPAndLogin } = require("../controllers/Auth");
const { registerStudents } = require("../controllers/Admin");
const studentExamController = require("../controllers/studentExamController");
const adminMiddleware = require("../middlewares/adminMiddleware");
const authMiddleware = require("../middlewares/authMiddeware");

//Authentication Routes
router.post("/login", verifyOTPAndLogin);
router.post("/sendotp", sendOTP);
router.post("/registerStudents", authMiddleware, adminMiddleware, registerStudents);
router.post("/exams", studentExamController.getAllExamsStud);
module.exports = router;
