const studentMiddleware = (req, res, next) => {
	if (req.user.accountType === "Student") {
		next(); // Student is allowed to access this route
	} else {
		res.status(403).send({ error: "Access denied. Students only." });
	}
};

module.exports = studentMiddleware;
