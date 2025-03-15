const stateManagerMiddleware = (req, res, next) => {
	if (req.user.accountType === "StateManager") {
		next(); // State Manager is allowed to access this route
	} else {
		res.status(403).send({ error: "Access denied. State Managers only." });
	}
};

module.exports = stateManagerMiddleware;
