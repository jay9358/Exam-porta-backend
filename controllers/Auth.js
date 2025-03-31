const User = require("../models/User");
const otpGenerator = require("otp-generator");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
// const twilio = require("twilio");
const Response=require("../Helper/Response")
const Password = require("../models/Password")
require("dotenv").config();
const transporter = nodemailer.createTransport({
	service: process.env.MAIL_HOST,
	auth: {
		user: process.env.MAIL_USER,
		pass: process.env.MAIL_PASS,
	},
});

// const accountSid = process.env.TWILIO_ACCOUNT_SID;
// const authToken = process.env.TWILIO_AUTH_TOKEN;
// const client = new twilio(accountSid, authToken);
// const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
const bcrypt = require('bcryptjs');

exports.sendOTP = async (req, res) => {
	console.log(req.body);
	try {
		const { contact } = req.body; // Assuming contact can be email or mobile number
		
        const isNumeric = /^\d+$/.test(contact); // Checks if the contact is only digits
		const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact); // Basic check for email structure

		let user;
		if (isNumeric) {
			user = await User.findOne({ mobileNumber: contact });
		} else if (isEmail) {
			user = await User.findOne({ email: contact });} 
        else {
			return res
				.status(400)
				.json({ message: "Invalid contact format", success: false });
		}
		if (!user) {
			return res
				.status(404)
				.json({ message: "User not found", success: false });
		}
		const otp = otpGenerator.generate(6, {
			digits: true,
			alphabets: false,
			upperCase: false,
			specialChars: false,
		});
		const otpExpiry = new Date(new Date().getTime() + 15 * 60 * 1000); // 15 minutes from now
		user.otp = otp;
		user.otpExpiry = otpExpiry;
		await user.save();
        if (isEmail){
            const mailOptions = {
                from: "Exam Portal",
                to: contact,
                subject: "Your OTP to Login",
                text: `Your OTP is ${otp}. It is valid for 15 minutes.`,
            };
            try{
                await transporter.sendMail(mailOptions);
            }   catch(err){
                console.log(err);
                return res.status(500).json({ message: "Error sending Mail", success: false });
            }
        }
        else {
            client.messages.create({
								to: contact,
								from: twilioNumber,
								body: `Your OTP is ${otp}. It is valid for 15 minutes.`,
							})
							.then((message) => console.log(message.sid));
        }
            
		res.status(200).json({ message: "OTP sent successfully", success: true });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Error sending OTP", success: false });
	}
};

exports.verifyOTPAndLogin = async (req, res) => {
	try {
		const { contact, rollNumber, otp, password, flag } = req.body;
		let role;

		// Determine role from flag
		if(flag=="Student") {
			role="Student";
		} else if(flag=="Worker") {
			role="Worker";
		} else if(flag=="StateManager") {
			role="StateManager";
		} else if(flag=="CityManager") {
			role="CityManager";
		} else {
			role="Admin";
		}

		let user;

		// Handle Roll Number + Password Login
		if (rollNumber) {
			// Roll number login flow
			const loginResult = await handleRollNumberLogin(rollNumber, password, role);
			if (!loginResult.success) {
				return res.status(loginResult.status).json(loginResult);
			}
			user = loginResult.user;
		}
		// Handle Contact (Email/Mobile) + OTP Login
		else if (contact) {
			// Contact login flow
			const loginResult = await handleContactLogin(contact, otp, role);
			if (!loginResult.success) {
				return res.status(loginResult.status).json(loginResult);
			}
			user = loginResult.user;
		} 
		// No valid login method provided
		else {
			return res.status(400).json({
				message: "Either roll number or contact is required",
				success: false
			});
		}

		// Generate JWT token
		const token = jwt.sign(
			{
				userId: user._id,
				email: user.email,
				accountType: user.accountType,
			},
			process.env.JWT_SECRET,
			{ expiresIn: "1d" }
		);

		// Update user token and save
		user.token = token;
		await user.save();

		res.status(200).json({
			message: "User logged in successfully",
			success: true,
			userDetails: user
		});

	} catch (err) {
		console.error(err);
		res.status(500).json({
			message: "Error while verifying and logging in",
			success: false,
		});
	}
};

// Helper function for roll number login
async function handleRollNumberLogin(rollNumber, password, role) {
	// Find user by roll number
	const user = await User.findOne({ rollNo: rollNumber, accountType: role });
	
	if (!user) {
		return {
			success: false,
			status: 404,
			message: "User not found"
		};
	}

	if (!password) {
		return {
			success: false,
			status: 400,
			message: "Password is required for roll number login"
		};
	}

	// Get global password
	const Gpass = await Password.find();
	if (!Gpass || Gpass.length === 0) {
		return {
			success: false,
			status: 500,
			message: "System error: Default password not set"
		};
	}

	const Gpassword = Gpass[0].defaultPassword;
	const isPasswordValid = password === Gpassword;

	if (!isPasswordValid) {
		return {
			success: false,
			status: 401,
			message: "Invalid password"
		};
	}

	return {
		success: true,
		user: user
	};
}

// Helper function for contact (email/mobile) login
async function handleContactLogin(contact, otp, role) {
	const isNumeric = /^\d+$/.test(contact);
	const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);

	if (!isNumeric && !isEmail) {
		return {
			success: false,
			status: 400,
			message: "Invalid contact format"
		};
	}

	// Find user by contact
	const user = await User.findOne(
		isNumeric 
			? { mobileNumber: contact, accountType: role }
			: { email: contact, accountType: role }
	);

	if (!user) {
		return {
			success: false,
			status: 404,
			message: "User not found"
		};
	}

	if (!otp) {
		return {
			success: false,
			status: 400,
			message: "OTP is required for mobile/email login"
		};
	}

	// Check OTP expiry
	if (new Date() > user.otpExpiry) {
		user.otp = null;
		user.otpExpiry = null;
		await user.save();
		return {
			success: false,
			status: 400,
			message: "OTP has expired"
		};
	}

	// Verify OTP
	if (user.otp !== otp) {
		return {
			success: false,
			status: 401,
			message: "Invalid OTP"
		};
	}

	// Clear OTP after successful verification
	user.otp = null;
	user.otpExpiry = null;
	await user.save();

	return {
		success: true,
		user: user
	};
}
