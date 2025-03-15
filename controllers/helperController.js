const User = require("../models/User");
const Exam = require("../models/Exam");
const multer = require('multer');
const School = require("../models/School");

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

module.exports = {
    csvUpload,
    getAllSchools
};