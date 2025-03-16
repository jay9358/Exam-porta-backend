const express = require("express");
const router = express.Router();
const cityController = require("../controllers/CityManagerController");
const authMiddleware = require("../middlewares/authMiddeware");
const citymiddleware = require("../middlewares/cityManagerMiddleware");
const stateController = require("../controllers/StateManagerController");
const userController = require("../controllers/userController");
const { GetPerformanceReports } = require("../controllers/Admin");

router.get("/schools",authMiddleware,citymiddleware, cityController.getSchools);
router.get("/exams",authMiddleware,citymiddleware, stateController.getExams);
router.get("/reports/performance",authMiddleware,citymiddleware, GetPerformanceReports);

module.exports = router;
