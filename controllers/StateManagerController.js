const School = require("../models/School");
const Exam = require("../models/Exam");

exports.getSchools = async (req, res) => {
    try {
        console.log("reaching here");
        const { State, City } = req.body;
        
        // Build query object based on provided parameters
        const query = {};
        if (State) query.state = State;
        if (City) query.city = City;

        const schools = await School.find(query);
        console.log(schools);
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
        const exams = await Exam.find()
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


