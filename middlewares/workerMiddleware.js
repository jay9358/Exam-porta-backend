const workerMiddleware = (req, res, next) => {
	if (req.user.accountType === "Worker") {
		next(); // Worker is allowed to access this route
	} else {
		res.status(403).send({ error: "Access denied. Workers only." });
	}
};

module.exports = workerMiddleware;
