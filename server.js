const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (if you have CSS/JS in separate files)
app.use(express.static(path.join(__dirname, 'public')));

// MySQL connection pool (same as before)
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Haversine function (same as before)
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Serve HTML file at root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// POST /api/attendance/save (same as before)
app.post('/api/attendance/save', async (req, res) => {
    try {
        const { name, lat, lng, distance, status, time, timestamp } = req.body;

        if (!name || !lat || !lng || distance === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        const REFERENCE_LAT = -7.054970805597252;
        const REFERENCE_LNG = 107.56087285759028;
        const DISTANCE_LIMIT = 10;

        const calculatedDistance = calculateDistance(
            parseFloat(lat),
            parseFloat(lng),
            REFERENCE_LAT,
            REFERENCE_LNG
        );

        if (calculatedDistance > DISTANCE_LIMIT) {
            return res.status(403).json({
                success: false,
                error: `Distance ${calculatedDistance.toFixed(2)}m exceeds limit`
            });
        }

        const [result] = await pool.query(
            'INSERT INTO attendances (name, latitude, longitude, distance, status, time, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, lat, lng, distance, status, time, timestamp]
        );

        res.status(200).json({
            success: true,
            data: { id: result.insertId, name, distance, status }
        });

    } catch (error) {
        console.error('Error saving:', error);
        res.status(500).json({
            success: false,
            error: 'Server error: ' + error.message
        });
    }
});

// GET /api/attendance
app.get('/api/attendance', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM attendances ORDER BY created_at DESC');
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Initialize database and start server
async function initializeDatabase() {
    try {
        const connection = await pool.getConnection();
        await connection.query(`
            CREATE TABLE IF NOT EXISTS attendances (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                latitude DECIMAL(10, 8) NOT NULL,
                longitude DECIMAL(11, 8) NOT NULL,
                distance DECIMAL(10, 2) NOT NULL,
                status VARCHAR(50) NOT NULL,
                time VARCHAR(100) NOT NULL,
                timestamp VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        connection.release();
        console.log('✅ Database ready');
    } catch (error) {
        console.error('❌ Database error:', error);
        process.exit(1);
    }
}

const PORT = process.env.PORT || 8080;
initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server: http://localhost:${PORT}`);
        console.log(`📄 Open browser: http://localhost:${PORT}`);
    });
});
