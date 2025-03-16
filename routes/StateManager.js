const express = require("express");
const router = express.Router();
const stateController = require("../controllers/StateManagerController");
const authMiddleware = require("../middlewares/authMiddeware");
const stateMiddleware = require("../middlewares/stateManagerMiddleware");

const { GetPerformanceReports } = require("../controllers/Admin");
router.get("/", (req, res) => {
	res.send("Hello World");
});
router.get("/schools",authMiddleware,stateMiddleware, stateController.getSchools);
router.get("/exams",authMiddleware,stateMiddleware, stateController.getExams);
router.get("/reports/performance",authMiddleware,stateMiddleware, GetPerformanceReports);

module.exports = router;
