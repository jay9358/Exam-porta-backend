const multer = require("multer");
const csvParser = require("csv-parser");
const fs = require("fs");
const xlsx = require("xlsx");
const User = require("../models/User");
const School = require("../models/School");
const Exam = require("../models/Exam");
const Result = require("../models/Result");
const mongoose = require("mongoose");
const QuestionSet = require("../models/QuestionSet");
const Question = require("../models/Question");
const Password=require('../models/Password');
const { Console } = require("console");

// Use memory storage
const storage = multer.memoryStorage();

const upload = multer({ storage: storage });

// Export both the middleware and the handler separately
exports.registerStudents = async (req, res) => {
	console.log("Reached here");
	console.log(req.body);

	// Check if the required fields are present in the request body
	const { schoolId, Users } = req.body; // Expecting Users to be an array of user objects
	console.log(Users);
	// Validate schoolId and Users
	if(Users.accountType=="Student" || Users.accountType=="Worker"){
	if (!schoolId || typeof schoolId !== 'string' || !Array.isArray(Users) || Users.length === 0) {
		return res.status(400).json({ message: "Invalid input: schoolId must be a string and Users are required" });
	}
	}

	try {
		const school = await School.findOne({ schoolId });
		// Validate schoolId format
		if(Users.accountType=="Student" || Users.accountType=="Worker"){
		 // Assuming schoolId is a string in the School model
		if (!school) {
			return res.status(404).json({ message: "School not found" });
		}
		}

		// Function to generate a random 4-digit number


		const SchoolSpec = await School.findOne({schoolId:schoolId});
		console.log("SCHOOL SPEC:" + SchoolSpec)
		// Ensure that each user object has the required fields
		const userData = Users.map(user => ({
			firstName: user.firstName,
			lastName: user.lastName,
			email: user.email || null, // Optional, can be null
			mobileNumber: user.mobileNumber || null, // Optional, can be null
			accountType: user.accountType || "Student", // Use provided account type or default to "Student"
			schoolId: schoolId,
			State:  SchoolSpec.state || null, // Associate with the school
			City: SchoolSpec.city || null, // Associate with the school
			rollNo: user.rollNo, // Use provided rollNo or generate a random one
			level: user.level || null, // Optional, can be null
			batch: user.batch || null, // Optional, can be null
			image: user.image || null, // Optional, can be null
			leading: user.leading || [], // Optional, can be an empty array
		}));

		// Insert users into the User collection
		const insertedUsers = await User.insertMany(userData);
		const userIds = insertedUsers.map((user) => user._id);

		// Update the school with the new user IDs
		if(Users.accountType=="Student" || Users.accountType=="Worker"){
		await School.findByIdAndUpdate(
			school._id,
			{ $push: { students: { $each: userIds } } }, // Assuming you want to push user IDs to a students array in the School model
			{ new: true }
		);
		}
		res.status(201).json({ message: "Users registered successfully", users: insertedUsers });
	} catch (error) {
		console.error("Error adding users:", error.message); // Log the error message
		res.status(500).json({ message: error.message }); // Return error message as JSON
	}
};

// Helper function to parse the uploaded file
async function parseFile(filePath, fileExtension, schoolId) {
	if (fileExtension === "csv") {
		return new Promise((resolve, reject) => {
			const students = [];
			fs.createReadStream(filePath)
				.pipe(csvParser())
				.on("data", (data) => {
					data.school = schoolId; // Add schoolId to each student record
					data.accountType = "Student";
					data.image = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${data.firstName} ${data.lastName}`;
					students.push(data);
				})
				.on("end", () => resolve(students))
				.on("error", (error) => reject(error));
		});
	} else if (fileExtension === "xlsx") {
		try {
			const workbook = xlsx.readFile(filePath);
			const sheetName = workbook.SheetNames[0];
			const sheet = workbook.Sheets[sheetName];
			const students = xlsx.utils.sheet_to_json(sheet);
			students.forEach((student) => {
				student.school = schoolId;
				student.accountType = "Student";
				student.image = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${student.firstName} ${student.lastName}`;
			});
			return students;
		} catch (error) {
			throw new Error("Failed to parse Excel file: " + error.message);
		}
	} else {
		throw new Error("Unsupported file type");
	}
}
exports.CheckAdminFromFrontend=(req,res)=>{
	return res
                .status(200)
                .json({ message: "User is Admin", success: true });
}	
exports.CheckStudentFromFrontend=(req,res)=>{
	return res
				.status(200)
				.json({ message: "User is Student", success: true });
}
exports.GetDashboard = async (req, res) => {
    try {
        // Get count of students (users with accountType "Student")
        const studentCount = await User.countDocuments({ accountType: "Student" });
        
        // Get count of all registered exams
        const examCount = await Exam.countDocuments();
        
        // Get count of registered schools
        const schoolCount = await School.countDocuments();
        


        return res.status(200).json({
            success: true,
            message: "Dashboard data fetched successfully",
            data: {
                
                    totalStudents: studentCount,
                    totalExams: examCount,
                    totalSchools: schoolCount
                },

            
        });
		
    } catch (error) {
        console.error("Dashboard Error:", error);
        return res.status(500).json({
            success: false,
            message: "Error fetching dashboard data",
            error: error.message
        });
    }
}
exports.GetPerformanceReports = async (req, res) => {
    try {
        const { state, city, schoolId, examId } = req.query;
		console.log(state, city, schoolId, examId);
        // Validate required parameters
        if (!schoolId || !examId) {
            return res.status(400).json({
                success: false,
                message: "School ID and Exam ID are required parameters"
            });
        }

        // Validate and convert examId to ObjectId
        if (!mongoose.Types.ObjectId.isValid(examId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Exam ID format"
            });
        }
        const examObjectId = new mongoose.Types.ObjectId(examId);

        // Find all students from the specified school
        const users = await User.find({
            schoolId: schoolId,
            accountType: "Student"
        }).select('firstName lastName rollNo batch level');
		console.log(users);
        if (!users || users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No students found for the given criteria"
            });
        }

        // Get user IDs
        const userIds = users.map(user => user._id);
		console.log(userIds);
		console.log(examObjectId);
		
        // Find results for all students in the exam
        const results = await Result.find({
            student: { $in: userIds },
            exam: examObjectId
        });
		console.log(results);

        return res.status(200).json({
            success: true,
            message: "Performance reports fetched successfully",
            data: {
                users,
                results,
                totalStudents: users.length,
                totalSubmissions: results.length
            }
        });
    } catch (error) {
        console.error("Error fetching performance reports:", error);
        return res.status(500).json({
            success: false,
            message: "Error fetching performance reports",
            error: error.message
        });
    }
};
exports.GetAllResults = async (req, res) => {
	console.log("Reached here");
	try {
		const results = await Result.find();
		return res.status(200).json({ results });
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
}

exports.GetWeightage = async (req, res) => {
	const { questionSetId } = req.params;
	const questionSet = await QuestionSet.findById(questionSetId);
	const questions = questionSet.questions;
	console.log(questions);
	
	const questionData = await Question.find({ _id: { $in: questions } });
	console.log(questionData);
	const chapters = questionData.map(question => question.chapter);
	const difficulty = questionData.map(question => question.difficulty);
	console.log(chapters);
	console.log(difficulty);
	return res.status(200).json({ chapters, difficulty });
}
exports.GetUsersByLevel = async (req, res) => {
	const { level } = req.params;
	const users = await User.find({ level });
	return res.status(200).json({ users });
}
exports.GetBatches = async (req, res) => {
	console.log("Reached here");
	const batches = await User.distinct('batch');
	return res.status(200).json({ batches });
}

exports.UpdatePassword = async (req, res) => {
	try {
		const { newPassword } = req.body;
		const {userId}=req.body;
		if (!newPassword) {
			return res.status(400).json({
				success: false,
				message: "New password is required"
			});
		}

		// Try to find existing password document
		let password = await Password.findOne();
		console.log(password);
		if (!password) {  
			// Create new password document if none exists
			password = new Password({
				defaultPassword: newPassword,
				createdBy: userId // Assuming you have user info in req.user
			});
		} else {
			// Update existing password using findOneAndUpdate
			await Password.findOneAndUpdate(
				{ _id: password._id },
				{ 
					defaultPassword: newPassword,
					updatedAt: Date.now()
				},
				{ new: true }
			);
		}

		await password.save();

		return res.status(200).json({
			success: true,
			message: "Password updated successfully"
		});
	} catch (error) {
		console.error("Error updating password:", error);
		return res.status(500).json({
			success: false,
			message: "Error updating password",
			error: error.message
		});
	}
}

exports.getPassword = async (req, res) => {
    try {
        console.log("REACHED");
        // Find the default password document
        const password = await Password.findOne();
        
        if (!password) {
            return res.status(404).json({
                success: false,
                message: "No default password found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Default password retrieved successfully",
            defaultPassword: password.defaultPassword
        });

    } catch (error) {
        console.error("Error fetching default password:", error);
        return res.status(500).json({
            success: false,
            message: "Error fetching default password",
            error: error.message
        });
    }
};