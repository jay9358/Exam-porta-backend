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
exports.getUserById = async (req, res) => {
	try {
		console.log("Reaching getUserById");
		const { userId } = req.params;

		// Validate userId format
		if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) {
			return res.status(400).json({ message: "Invalid user ID format" });
		}

		const user = await User.findById(userId);
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		res.status(200).json({
			message: "User found",
			user,
		});
	} catch (error) {
		console.error("Error fetching user:", error);
		res.status(500).json({ 
			message: "Error fetching user",
			error: error.message 
		});
	}
};

// Update a user's role and adjust leading schools based on city or state
exports.update = async (req, res) => {
	
	try {
		console.log("RACHED")
		const { userId } = req.params;
		const updates = req.body;

		// Validate userId format
		if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) {
			return res.status(400).json({ message: "Invalid user ID format" });
		}

		// Find and update the user
		const user = await User.findById(userId);
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}



		// Update allowed fields
		console.log(updates.rollNo);
		if(updates.rollNo) user.rollNo=updates.rollNo;
		if (updates.firstName) user.firstName = updates.firstName;
		if (updates.lastName) user.lastName = updates.lastName;
		if (updates.email) user.email = updates.email;
		if (updates.mobileNumber) user.mobileNumber = updates.mobileNumber;
		if (updates.accountType) user.accountType = updates.accountType;
		if (updates.level) user.level = updates.level;
		if (updates.batch) user.batch = updates.batch;
		if (updates.image) user.image = updates.image;

		// Save the updated user
		await user.save();

		res.status(200).json({
			message: "User updated successfully",
			user
		});

	} catch (error) {
		console.error("Error updating user:", error);
		res.status(500).json({
			message: "Error updating user",
			error: error.message
		});
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
				State: user.State,
				City: user.City,
				batch: user.batch,
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
				const mobileNumber = trimmedRow['Mobile Number'] || trimmedRow['mobileNumber'] || trimmedRow['Mobile Number'];
				const batchID = trimmedRow['BatchID'] || trimmedRow['batchID'] || trimmedRow['BatchID'];
				// Validate required fields
				if (!rollNo || !firstName || !lastName || !trimmedRow.email || !trimmedRow.level || !school || !schoolId || !mobileNumber) {
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
				

				// Create new user with school information
				const newUser = new User({
					firstName: firstName.trim(),
					lastName: lastName.trim(),
					email: trimmedRow.email,
					rollNo: rollNo,
					mobileNumber,
					batch: batchID,
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

exports.deleteuser = async (req, res) => {
	console.log("REacjedas")
	try {
		const { userId } = req.params;

		// Validate userId format
		if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) {
			return res.status(400).json({ 
				message: "Invalid user ID format" 
			});
		}

		// Find and delete the specific user
		const result = await User.findByIdAndDelete(userId);
		
		if (result) {
			res.status(200).json({ 
				message: "User deleted successfully",
				deletedUser: result
			});
		} else {
			res.status(404).json({ 
				message: "User not found" 
			});
		}
	} catch (error) {
		console.error("Error deleting user:", error);
		res.status(500).json({ 
			message: "Error deleting user",
			error: error.message 
		});
	}
};