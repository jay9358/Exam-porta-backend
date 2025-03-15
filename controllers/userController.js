const User = require("../models/User");
const School = require("../models/School");
const csv = require('csv-parser');
const { Readable } = require('stream');
const { getAllSchools } = require("./helperController"); // Import the getAllSchools function

// Create a user and assign a role with leading schools based on city or state
exports.assignRole = async (req, res) => {
	const { firstName, lastName, email, mobileNumber, role, place } = req.body;

	// Validate the role
	const validRoles = ["StateManager", "CityManager", "Worker"];
	if (!validRoles.includes(role)) {
		return res.status(400).json({ message: "Invalid role" });
	}

	try {
		// Check if the user already exists (based on email or mobile number)
		let existingUser = await User.findOne({ email });
		if (existingUser) {
			return res.status(400).json({ message: "User already exists" });
		}
		// Create a new user
		const newUser = new User({
			firstName,
			lastName,
			email,
			mobileNumber,
			image: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${firstName} ${lastName}`,
			accountType: role, // Assign the role when creating the user
		});
		// Find and assign schools based on the role and place (city or state)
		if (role === "CityManager") {
			// Find all schools in the city
			const citySchools = await School.find({ city: place });
			newUser.leading = citySchools.map((school) => school._id);
		} else if (role === "StateManager") {
			// Find all schools in the state
			const stateSchools = await School.find({ state: place });
			newUser.leading = stateSchools.map((school) => school._id);
		}
		// Save the user to the database
		await newUser.save();
		res.status(201).json({
			message: `User created and role ${role} assigned successfully`,
			user: newUser,
		});
	} catch (error) {
		console.error(error);
		res
			.status(500)
			.json({ message: "Error creating user and assigning role", error });
	}
};

// Update a user's role and adjust leading schools based on city or state
exports.updateRole = async (req, res) => {
	const { userId } = req.params;
	const { role, place } = req.body;
	// Validate the role
	const validRoles = ["StateManager", "CityManager", "Worker", "None"];
	if (!validRoles.includes(role)) {
		return res.status(400).json({ message: "Invalid role" });
	}
	try {
		// Find the user by ID
		const user = await User.findById(userId);
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}
		// If the user is promoted/demoted, adjust their leading schools
		let leadingSchools = [];
		if (role === "CityManager") {
			// Demoted from StateManager to CityManager: Keep only schools in the city
			const citySchools = await School.find({ city: place });
			leadingSchools = citySchools.map((school) => school._id);
		} else if (role === "StateManager") {
			// Promoted from CityManager to StateManager: Add all schools in the state
			const stateSchools = await School.find({ state: place });
			leadingSchools = stateSchools.map((school) => school._id);
		}
		// Update the user's role and leading schools
		user.accountType = role;
		user.leading = leadingSchools;
		// Save the updated user
		await user.save();
		res.status(200).json({
			message: `Role updated to ${role} successfully`,
			user,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Error updating role", error });
	}
};
// Remove a user's role (set role to default or "None")
exports.removeRole = async (req, res) => {
	const { userId } = req.params;

	try {
		// Set the user's role to a neutral state, such as "None"
		const user = await User.findByIdAndUpdate(
			userId,
			{ accountType: "None" },
			{ new: true }
		);

		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		res.status(200).json({ message: "Role removed successfully", user });
	} catch (error) {
		res.status(500).json({ message: "Error removing role", error });
	}
};
// Get all users by role and show their managing place (city or state)
exports.getUsersByRole = async (req, res) => {
	const { role } = req.params;

	// Validate the role
	const validRoles = ["StateManager", "CityManager", "Worker", "Admin", "Student"];
	if (role && !validRoles.includes(role)) {
		return res.status(400).json({ message: "Invalid role" });
	}

	try {
		// Find all users, optionally filter by role
		const query = role ? { accountType: role } : {};
		const users = await User.find(query).populate('leading', 'name city state');

		if (users.length === 0) {
			return res.status(404).json({ message: "No users found." });
		}

		// Process the users to include the place they are managing
		const userWithPlace = users.map(user => {
			let place = null;
			// Extract city or state based on the role
			if (user.accountType === 'CityManager') {
				const cities = [...new Set(user.leading.map(school => school.city))];
				place = cities.length > 0 ? cities.join(', ') : 'No city assigned';
			} else if (user.accountType === 'StateManager') {
				const states = [...new Set(user.leading.map(school => school.state))];
				place = states.length > 0 ? states.join(', ') : 'No state assigned';
			}
			// Return the user details with the place they are managing
			return {
				_id: user._id,
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.email,
				mobileNumber: user.mobileNumber,
				rollNo: user.rollNo, // Added rollNo
				level: user.level, // Added level
				accountType: user.accountType,
				image: user.image, // Added image
				leading: user.leading,
				place: place,
				school: user.school,
				schoolId: user.schoolId,
				createdAt: user.createdAt, // Added createdAt
				updatedAt: user.updatedAt, // Added updatedAt
			};
		});

		console.log(userWithPlace);
		res.status(200).json({
			message: role ? `Users with role ${role}` : "All users retrieved successfully.",
			users: userWithPlace,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Error fetching users", error });
	}
};

// Register multiple students from CSV file
exports.registerStudents = async (req, res) => {
	console.log("Reaching register Students");
	
	if (!req.file) {
		return res.status(400).json({ message: "No CSV file provided" });
	}

	const results = [];
	const errors = [];

	try {
		// Convert buffer to readable stream
		const csvBuffer = req.file.buffer.toString('utf-8');
		console.log("CSV Buffer Content:", csvBuffer);

		const stream = Readable.from(csvBuffer);
		console.log("Stream Created:", stream);

		// Process CSV stream
		await new Promise((resolve, reject) => {
			stream
				.pipe(csv())
				.on('data', (data) => {
					console.log("CSV Row Data:", data);
					results.push(data);
				})
				.on('end', () => {
					console.log("CSV Stream Ended");
					resolve();
				})
				.on('error', (error) => {
					console.error("Stream error:", error);
					reject(error);
				});
		});

		// Function to generate a random mobile number
		const generateRandomMobileNumber = () => {
			const prefix = '07';
			const number = Math.floor(100000000 + Math.random() * 900000000);
			return prefix + number;
		};

		// Process each row and create users
		for (const row of results) {
			try {
				// Trim the keys to avoid issues with spaces
				const trimmedRow = Object.fromEntries(
					Object.entries(row).map(([key, value]) => [key.trim(), value])
				);

				// Check for fields in different possible formats
				const rollNo = trimmedRow['RollNo'] || trimmedRow['Roll No'] || trimmedRow['rollNo'];
				const firstName = trimmedRow['firstName'] || trimmedRow['first Name'] || trimmedRow['FirstName'];
				const lastName = trimmedRow['lastName'] || trimmedRow['last Name'] || trimmedRow['LastName'];
				const school = trimmedRow['School'] || trimmedRow['school'];
				const schoolId = trimmedRow['SchoolID'] || trimmedRow['schoolId'] || trimmedRow['schoolID'];
				
				// Validate required fields
				if (!rollNo || !firstName || !lastName || !trimmedRow.email || !trimmedRow.level || !school || !schoolId) {
					errors.push({
						row: trimmedRow,
						error: `Missing required fields: ${!rollNo ? 'RollNo, ' : ''}${!firstName ? 'firstName, ' : ''}${!lastName ? 'lastName, ' : ''}${!trimmedRow.email ? 'email, ' : ''}${!trimmedRow.level ? 'level, ' : ''}${!school ? 'School, ' : ''}${!schoolId ? 'SchoolID' : ''}`
					});
					continue;
				}

				// Verify if the school exists
				const existingSchool = await School.findOne({ schoolId: schoolId });
				if (!existingSchool) {
					errors.push({
						row: trimmedRow,
						error: `School with ID ${schoolId} does not exist`
					});
					continue;
				}

				// Check if user already exists by email or roll number
				const existingUser = await User.findOne({
					$or: [
						{ email: trimmedRow.email },
						{ rollNo: rollNo }
					]
				});

				if (existingUser) {
					errors.push({
						row: trimmedRow,
						error: existingUser.email === trimmedRow.email 
							? "User with this email already exists"
							: "User with this roll number already exists"
					});
					continue;
				}

				// Generate a random mobile number
				const mobileNumber = generateRandomMobileNumber();

				// Create new user with school information
				const newUser = new User({
					firstName: firstName.trim(),
					lastName: lastName.trim(),
					email: trimmedRow.email,
					rollNo: rollNo,
					mobileNumber,
					accountType: "Student",
					level: parseInt(trimmedRow.level) || 1,
					school: school,
					schoolId: schoolId,
					image: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${firstName} ${lastName}`,
				});

				await newUser.save();

			} catch (error) {
				errors.push({
					row: row,
					error: error.message
				});
			}
		}

		// Send response with results
		res.status(200).json({
			message: "CSV processing completed",
			totalProcessed: results.length,
			successCount: results.length - errors.length,
			errorCount: errors.length,
			errors: errors.length > 0 ? errors : undefined
		});

	} catch (error) {
		console.error("Error processing CSV:", error);
		res.status(500).json({
			message: "Error processing CSV file",
			error: error.message
		});
	}
};

exports.registerSchools = async (req, res) => {
	console.log("Reaching register Schools");

	if (!req.file) {
		return res.status(400).json({ message: "No CSV file provided" });
	}

	const results = [];
	const errors = [];

	try {
		// Convert buffer to readable stream
		const csvBuffer = req.file.buffer.toString('utf-8');
		console.log("CSV Buffer Content:", csvBuffer); // Log the CSV data

		const stream = Readable.from(csvBuffer); // Create a readable stream from the CSV data
		console.log("Stream Created:", stream); // Log the stream object

		// Process CSV stream
		await new Promise((resolve, reject) => {
			stream
				.pipe(csv())
				.on('data', (data) => {
					console.log("CSV Row Data:", data); // Log each row of data
					results.push(data);
				})
				.on('end', () => {
					console.log("CSV Stream Ended"); // Log when the stream ends
					resolve();
				})
				.on('error', (error) => {
					console.error("Stream error:", error); // Log stream errors
					reject(error);
				});
		});

		// Process each row and create schools
		for (const row of results) {
			try {
				// Log the current row data for debugging
				console.log("Processing Row:", row);

				// Trim the keys to avoid issues with spaces
				const trimmedRow = Object.fromEntries(
					Object.entries(row).map(([key, value]) => [key.trim(), value])
				);

				// Validate required fields
				if (!trimmedRow['SchoolName'] || !trimmedRow['SchoolID'] || !trimmedRow['City'] || !trimmedRow['State']) {
					errors.push({
						row: trimmedRow,
						error: "Missing required fields"
					});
					continue;
				}

				// Check if school already exists by SchoolID
				const existingSchool = await School.findOne({ schoolId: trimmedRow['SchoolID'] });

				if (existingSchool) {
					errors.push({
						row: trimmedRow,
						error: "School with this ID already exists"
					});
					continue;
				}

				// Create new school
				const newSchool = new School({
					name: trimmedRow['SchoolName'],
					schoolId: trimmedRow['SchoolID'],
					city: trimmedRow['City'],
					state: trimmedRow['State'],
				});

				await newSchool.save();

			} catch (error) {
				errors.push({
					row: row,
					error: error.message
				});
			}
		}

		// Send response with results
		res.status(200).json({
			message: "CSV processing completed",
			totalProcessed: results.length,
			successCount: results.length - errors.length,
			errorCount: errors.length,
			errors: errors.length > 0 ? errors : undefined
		});

	} catch (error) {
		console.error("Error processing CSV:", error);
		res.status(500).json({
			message: "Error processing CSV file",
			error: error.message
		});
	}
};

// Function to fetch all schools
exports.fetchSchools = async (req, res) => {
	try {
		await getAllSchools(req, res); // Call the getAllSchools function
	} catch (error) {
		console.error("Error fetching schools:", error);
		res.status(500).json({
			message: "Error fetching schools",
			error: error.message,
		});
	}
};

exports.deleteAllUsers = async (req, res) => {
	try {
		console.log("Reaching delete all students");
		const result = await User.deleteMany({ accountType: "Student" });
		
		if (result.deletedCount > 0) {
			res.status(200).json({ 
				message: "All students deleted successfully",
				deletedCount: result.deletedCount 
			});
		} else {
			res.status(404).json({ 
				message: "No students found to delete" 
			});
		}
	} catch (error) {
		console.error("Error deleting students:", error);
		res.status(500).json({ 
			message: "Error deleting students",
			error: error.message 
		});
	}
};