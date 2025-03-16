const School = require("../models/School");
const Exam = require("../models/Exam");

exports.getSchools = async (req, res) => {
    try {
        const { City } = req.body;
        
        // Build query object based on provided city
        const query = {};
        if (City) query.city = City;

        const schools = await School.find(query);
        
        return res.status(200).json({
            success: true,
            message: "Schools fetched successfully",
            data: schools
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error while fetching schools",
            error: error.message
        });
    }
};

exports.getExams = async (req, res) => {
    try {
        // Get city from request body
        const { City } = req.body;
        
        // First find schools in the specified city
        const citySchools = await School.find({ city: City });
        const citySchoolIds = citySchools.map(school => school._id);

        // Find exams assigned to schools in this city
        const exams = await Exam.find({
            assignedToSchools: { $in: citySchoolIds }
        })
        .populate('questionSets')
        .populate('assignedToSchools')
        .populate('createdBy');

        return res.status(200).json({
            success: true,
            message: "Exams fetched successfully",
            data: exams
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error while fetching exams",
            error: error.message
        });
    }
};
