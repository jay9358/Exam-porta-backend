const express = require("express");
const app = express();

const userRoutes = require("./routes/User");
const adminRoutes = require("./routes/Admin");
// const paymentRoutes = require("./routes/Payment");
// const courseRoutes = require("./routes/Course");
// const contactRoutes = require("./routes/Contact");

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
app.use(cors({
	origin:process.env.ORIGIN,
	credentials:true,
	allowedHeaders: ['Authorization', 'Content-Type'],
}));
//console.log(process.env.ORIGIN)
//Routes
app.use("/v1/auth", userRoutes);
app.use("/v1/admin", adminRoutes);
// app.use("/api/v1/course", courseRoutes);
// app.use("/api/v1/payment", paymentRoutes);
// app.use("/api/v1", contactRoutes);

app.get("/", (req, res) => {
	return res.json({
		success: true,
		message: "Your server is up and running....",
	});
});

app.listen(PORT, () => {
	console.log(`App is running at ${PORT}`);
});
