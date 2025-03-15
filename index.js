const express = require("express");
const app = express();

const userRoutes = require("./routes/User");
const adminRoutes = require("./routes/Admin");
const examRoutes = require("./routes/Exam");
const timeRoutes = require("./routes/timeRoutes");

const { connectDB } = require("./config/database");
const cookieParser = require("cookie-parser");
const cors = require("cors");
require("dotenv").config();

const PORT = process.env.PORT;

//Database connection
connectDB();

//Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
	cors({
		origin: process.env.ORIGIN, // Adjust the port to match your frontend's port
		credentials: true,
		allowedHeaders: ["Authorization", "Content-Type"],
		methods: ["GET", "POST", "PUT", "DELETE"], // Ensure you're allowing all methods you use
	})
);


//Routes
app.use("/v1/auth", userRoutes);
app.use("/v1/admin", adminRoutes);
app.use("/v1/exams", examRoutes);
app.use("/v1/time", timeRoutes);
app.get("/", (req, res) => {
	return res.json({
		success: true,
		message: "Your server is up and running....",
	});
});

app.listen(PORT, () => {
	console.log(`App is running at ${PORT}`);
});
