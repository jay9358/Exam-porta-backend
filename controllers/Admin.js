const multer = require("multer");
const csvParser = require("csv-parser");
const fs = require("fs");
const xlsx = require("xlsx");
const User = require("../models/User");
const School = require("../models/School");
const Exam = require("../models/Exam");
const Result = require("../models/Result");
const mongoose = require("mongoose");
// Setup multer for file uploads
const upload = multer({ dest: "uploads/" });
// Export both the middleware and the handler separately
exports.registerStudents = async (req, res) => {
	console.log("Reached here");
	console.log(req.body);

	// Check if the required fields are present in the request body
	const { schoolId, Users } = req.body; // Expecting Users to be an array of user objects

	// Validate schoolId and Users
	if (!schoolId || typeof schoolId !== 'string' || !Array.isArray(Users) || Users.length === 0) {
		return res.status(400).json({ message: "Invalid input: schoolId must be a string and Users are required" });
	}

	try {
		// Validate schoolId format
		const school = await School.findOne({ schoolId }); // Assuming schoolId is a string in the School model
		if (!school) {
			return res.status(404).json({ message: "School not found" });
		}

		// Function to generate a random 4-digit number
		const generateRandomRollNo = () => {
			return Math.floor(1000 + Math.random() * 9000).toString(); // Generates a number between 1000 and 9999
		};

		// Ensure that each user object has the required fields
		const userData = Users.map(user => ({
			firstName: user.firstName,
			lastName: user.lastName,
			email: user.email || null, // Optional, can be null
			mobileNumber: user.mobileNumber || null, // Optional, can be null
			accountType: user.accountType || "Student", // Use provided account type or default to "Student"
			school: schoolId, // Associate with the school
			rollNo: user.rollNo || generateRandomRollNo(), // Use provided rollNo or generate a random one
			level: user.level || null, // Optional, can be null
			batch: user.batch || null, // Optional, can be null
			image: user.image || null, // Optional, can be null
			leading: user.leading || [], // Optional, can be an empty array
		}));

		// Insert users into the User collection
		const insertedUsers = await User.insertMany(userData);
		const userIds = insertedUsers.map((user) => user._id);

		// Update the school with the new user IDs
		await School.findByIdAndUpdate(
			school._id,
			{ $push: { students: { $each: userIds } } }, // Assuming you want to push user IDs to a students array in the School model
			{ new: true }
		);

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
        const { state, city, schoolId } = req.query;
		console.log(state, city, schoolId);
		const user = await User.find({schoolId:schoolId});
		if(!user){
			return res.status(404).json({
				success: false,
				message: "User not found"
			});
		}
		console.log(user);
		const result = await Result.find({userId:user._id});
		console.log(result);
		return res.status(200).json({
			success: true,
			message: "Performance reports fetched successfully",
			data: {
				user,
				result
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
