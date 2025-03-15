const adminMiddleware = (req, res, next) => {
	if (req.user.accountType === "Admin") {
		next();
	} else {
		res.status(403).send({ error: "Access denied. Admins only." });
	}
};

module.exports = adminMiddleware;
