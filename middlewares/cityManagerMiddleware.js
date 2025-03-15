const cityManagerMiddleware = (req, res, next) => {
	if (req.user.accountType === "CityManager") {
		next(); // City Manager is allowed to access this route
	} else {
		res.status(403).send({ error: "Access denied. City Managers only." });
	}
};

module.exports = cityManagerMiddleware;
