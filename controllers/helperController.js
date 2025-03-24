const User = require("../models/User");
const Exam = require("../models/Exam");
const multer = require('multer');
const School = require("../models/School");
const QuestionSet = require("../models/QuestionSet");
const Question = require("../models/Question");
const { EsimProfilePage } = require("twilio/lib/rest/supersim/v1/esimProfile");
// Configure multer for CSV file uploads
const csvUpload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        // Accept CSV files with different possible mime types
        const allowedMimeTypes = [
            'text/csv',
            'application/vnd.ms-excel',
            'application/csv',
            'text/x-csv',
            'application/x-csv',
        ];
        
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Please upload a valid CSV file'));
        }
    },
    limits: {
        fileSize: 1024 * 1024 * 5 // 5MB limit
    }
});

// Function to get all schools
const getAllSchools = async (req, res) => {
    try {
        const schools = await School.find(); // Fetch all schools from the database
        res.status(200).json({
            message: "Schools fetched successfully",
            schools: schools,
        });
    } catch (error) {
        console.error("Error fetching schools:", error);
        // Ensure that you do not send a response if one has already been sent
        if (!res.headersSent) {
            res.status(500).json({
                message: "Error fetching schools",
                error: error.message,
            });
        }
    }
};

async function GenerateQuestionSets(exam) {
    const questionSetsID = exam.questionSets;
    const questionSets = await QuestionSet.find({ _id: { $in: questionSetsID } });
    const questionSetWeights = exam.questionSetWeights;
    const selectedQuestions = new Set();
    const totalQuestions = exam.totalQuestions;

    // Fetch all questions once
    const allQuestions = await Question.find({ _id: { $in: questionSets.flatMap(qs => qs.questions) } });

    for (let i = 0; i < questionSets.length; i++) {
        const questionSet = questionSets[i];
        const weightage = parseInt(questionSetWeights.get(questionSet._id.toString()), 10);
        const numberOfQuestions = Math.ceil(totalQuestions * (weightage / 100));
        console.log(numberOfQuestions);

        const levelQuestions = [];
        for (let j = 0; j < allQuestions.length; j++) {
            const question = allQuestions[j];
            if (questionSet.questions.includes(question._id) && question.difficulty === exam.level.toString()) {
                levelQuestions.push(question);
            }
        }
        console.log(levelQuestions);

        if (levelQuestions.length === 0) {
            continue; // Skip if no questions match the level
        }
        if (levelQuestions.length < numberOfQuestions) {
            return res.status(400).json({ message: "Not enough questions found in SET :" + questionSet.setName + " for level :" + exam.level });
        }

        // Randomly select questions based on the calculated number
        const selectedIndices = new Set();
        while (selectedIndices.size < numberOfQuestions) {
            const randomIndex = Math.floor(Math.random() * levelQuestions.length);
            if (!selectedIndices.has(randomIndex)) {
                selectedIndices.add(randomIndex);
                selectedQuestions.add(levelQuestions[randomIndex]._id);
            }
        }
        console.log("FROM THIS ITERATION :" + Array.from(selectedQuestions));
    }

    if (selectedQuestions.size < totalQuestions) {
        return res.status(400).json({ message: "Not enough questions found" });
    }

    console.log(Array.from(selectedQuestions));
    return Array.from(selectedQuestions);
}

module.exports = {
    csvUpload,
    getAllSchools,
    GenerateQuestionSets
};