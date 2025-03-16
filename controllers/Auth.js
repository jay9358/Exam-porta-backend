const User = require("../models/User");
const otpGenerator = require("otp-generator");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
// const twilio = require("twilio");
const Response=require("../Helper/Response")
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
		const { contact, otp,flag } = req.body;
		let role;
		if(flag=="Student"){
			role="Student";
		}
		else if(flag=="Worker"){
			role="Worker";
		}
		else if(flag=="StateManager"){
			role="StateManager";
		}
		else if(flag=="CityManager"){
			role="CityManager";
		}
		else{
            role="Admin";
        }
		console.log(role);
		const isNumeric = /^\d+$/.test(contact); // Checks if the contact is only digits
		const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact); // Basic check for email structure
		let user;
		if (isNumeric) {
			user = await User.findOne({ mobileNumber: contact,accountType:role });
		} else if (isEmail) {
			user = await User.findOne({ email: contact, accountType:role });
		} else {
			return res
				.status(400)
				.json({ message: "Invalid contact format", success: false });
		}
		if (!user) {
			return res
				.status(404)
				.json({ message: "User not found", success: false });
		}
		if (new Date() > user.otpExpiry) {
			user.otp = null; // Reset OTP
			user.otpExpiry = null; // Reset expiry
			await user.save();
			return res
				.status(400)
				.json({ message: "OTP has expired", success: false });
		}

		if (user.otp !== otp) {
			return res.status(400).json({ message: "Invalid OTP", success: false });
		}
		user.otp = null; // Clear OTP
		user.otpExpiry = null; // Clear expiry
		await user.save();
		// Token Created
        const token = jwt.sign(
					{
						userId: user._id,
						email: user.email,
						accountType: user.accountType,
					},
					process.env.JWT_SECRET,
					{ expiresIn: "1d" }
				);
        user.token = token;
        await user.save();
		res.status(200).json({ message: "User logged in successfully", success: true, userDetails: user });
	} catch (err) {
		console.error(err);
		res.status(500)
			.json({
				message: "Error while verifying OTP and logging in",
				success: false,
			});
	}
};
