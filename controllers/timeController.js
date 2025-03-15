const Exam = require('../models/Exam');
const { NtpTimeSync } = require('ntp-time-sync');

// Cache for NTP offset
let cachedOffset = null;
let lastSyncTime = 0;
const SYNC_INTERVAL = 5 * 60 * 1000; // Sync every 5 minutes

// Initialize NTP time sync as singleton with optimized settings
const timeSync = NtpTimeSync.getInstance({
    servers: [
        "0.pool.ntp.org",
        "1.pool.ntp.org"
    ],
    sampleCount: 4, // Reduced from 8
    replyTimeout: 2000 // Reduced from 3000
});

// Function to get current time using cached offset
const getCurrentTime = () => {
    if (cachedOffset === null) {
        return Date.now();
    }
    return Date.now() + cachedOffset;
};

// Function to get formatted Indian time
const getIndianTime = (timestamp) => {
    const date = new Date(timestamp);

    return {
        localTime: date.toLocaleString('en-US', {
            timeZone: 'Asia/Kolkata',
            hour12: true,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }),
        readableTime: date.toLocaleTimeString('en-US', {
            timeZone: 'Asia/Kolkata',
            hour12: true,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }),
        isoString: date.toISOString()
    };
};

exports.getServerTime = async (req, res) => {
    try {
        const t1 = process.hrtime.bigint();
        
        let currentTime;
        // Only sync with NTP server if cache expired
        if (!cachedOffset || Date.now() - lastSyncTime > SYNC_INTERVAL) {
            const result = await timeSync.getTime();
            cachedOffset = result.offset;
            lastSyncTime = Date.now();
            currentTime = result.now;
        } else {
            currentTime = new Date(getCurrentTime());
        }

        const time = getIndianTime(currentTime);
        
        const timeData = {
            serverTime: time.isoString,
            timestamp: currentTime.getTime(),
            localTime: time.readableTime,
            readableTime: time.readableTime,
            offset: cachedOffset,
            requestReceived: Number(t1) / 1e6,
            responseTime: Number(process.hrtime.bigint()) / 1e6,
            timezone: 'Asia/Kolkata'
        };

        if (req.query.examId) {
            const exam = await Exam.findById(req.query.examId);
            if (exam) {
                timeData.examStartTime = new Date(exam.date + 'T' + exam.startTime).toISOString();
                timeData.examDate = new Date(exam.date).toISOString();
                timeData.examDuration = exam.timeLimit;
            }
        }
        console.log("Time data:", timeData);
        res.status(200).json({ success: true, data: timeData });
    } catch (error) {
        console.error("Time synchronization error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Error synchronizing time",
            error: error.message 
        });
    }
};

exports.validateExamTime = async (req, res) => {
    try {
        const { examId } = req.params;
        if (!examId) {
            return res.status(400).json({
                success: false,
                message: "Exam ID is required"
            });
        }

        const exam = await Exam.findById(examId);
        if (!exam) {
            return res.status(404).json({
                success: false,
                message: "Exam not found"
            });
        }

        let currentTime;
        // Use cached time when possible
        if (!cachedOffset || Date.now() - lastSyncTime > SYNC_INTERVAL) {
            const result = await timeSync.getTime();
            cachedOffset = result.offset;
            lastSyncTime = Date.now();
            currentTime = result.now.getTime();
        } else {
            currentTime = getCurrentTime();
        }

        const examStartTime = new Date(exam.date);
        const [hours, minutes] = exam.startTime.split(':');
        examStartTime.setHours(hours, minutes, 0);

        const examEndTime = new Date(examStartTime.getTime() + (exam.timeLimit * 60 * 1000));
        const time = getIndianTime(currentTime);

        const timeData = {
            serverTime: time.isoString,
            localTime: time.localTime,
            readableTime: time.readableTime,
            timestamp: currentTime,
            offset: cachedOffset,
            examStartTime: examStartTime.toISOString(),
            examEndTime: examEndTime.toISOString(),
            isExamActive: currentTime >= examStartTime.getTime() && currentTime <= examEndTime.getTime(),
            remainingTime: Math.max(0, examEndTime.getTime() - currentTime)
        };

        res.status(200).json({ success: true, data: timeData });
    } catch (error) {
        console.error("Exam time validation error:", error);
        res.status(500).json({
            success: false,
            message: "Error validating exam time",
            error: error.message
        });
    }
}; 