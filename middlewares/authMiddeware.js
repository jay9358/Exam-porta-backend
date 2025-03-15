const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
	try {
		const token = req.header("Authorization").replace("Bearer ", "");
		if (!token) {
			return res.status(401).send({ error: "Please authenticate." });
		}
		const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify JWT token
		const user = await User.findOne({ _id: decoded.userId, token: token });

		if (!user) {
			return res.status(401).send({ error: "User not found." });
		}
		req.user = user;
		next(); // Proceed to the next middleware or route handler
	} catch (error) {
		console.error(error);
		res.status(401).send({ error: "Invalid authentication token." });
	}
};

module.exports = authMiddleware;
