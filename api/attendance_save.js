// // api/attendance_save.js
// const mysql = require('mysql2/promise');

// const pool = mysql.createPool({
//   host: process.env.DB_HOST,      // on Vercel: set these env vars
//   port: process.env.DB_PORT,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
//   waitForConnections: true,
//   connectionLimit: 5,
//   queueLimit: 0
// });

// // Haversine function
// function calculateDistance(lat1, lng1, lat2, lng2) {
//   const R = 6371000;
//   const φ1 = (lat1 * Math.PI) / 180;
//   const φ2 = (lat2 * Math.PI) / 180;
//   const Δφ = ((lat2 - lat1) * Math.PI) / 180;
//   const Δλ = ((lng2 - lng1) * Math.PI) / 180;
//   const a =
//     Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
//     Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
//   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//   return R * c;
// }

// // Ensure table exists (run on cold start)
// let initialized = false;
// async function ensureTable() {
//   if (initialized) return;
//   const conn = await pool.getConnection();
//   await conn.query(`
//     CREATE TABLE IF NOT EXISTS attendances (
//       id INT AUTO_INCREMENT PRIMARY KEY,
//       name VARCHAR(255) NOT NULL,
//       latitude DECIMAL(10, 8) NOT NULL,
//       longitude DECIMAL(11, 8) NOT NULL,
//       distance DECIMAL(10, 2) NOT NULL,
//       status VARCHAR(50) NOT NULL,
//       time VARCHAR(100) NOT NULL,
//       timestamp VARCHAR(100) NOT NULL,
//       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//     )
//   `);
//   conn.release();
//   initialized = true;
// }

// // Vercel serverless handler
// module.exports = async (req, res) => {
//   await ensureTable();

//   if (req.method === 'POST') {
//     try {
//       const { name, lat, lng, distance, status, time, timestamp } = req.body || {};

//       if (!name || !lat || !lng || distance === undefined) {
//         return res.status(400).json({
//           success: false,
//           error: 'Missing required fields'
//         });
//       }

//       const REFERENCE_LAT = -7.054970805597252;
//       const REFERENCE_LNG = 107.56087285759028;
//       const DISTANCE_LIMIT = 25;

//       const calculatedDistance = calculateDistance(
//         parseFloat(lat),
//         parseFloat(lng),
//         REFERENCE_LAT,
//         REFERENCE_LNG
//       );

//       if (calculatedDistance > DISTANCE_LIMIT) {
//         return res.status(403).json({
//           success: false,
//           error: `Distance ${calculatedDistance.toFixed(2)}m exceeds limit`
//         });
//       }

//       const [result] = await pool.query(
//         'INSERT INTO attendances (name, latitude, longitude, distance, status, time, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
//         [name, lat, lng, distance, status, time, timestamp]
//       );

//       return res.status(200).json({
//         success: true,
//         data: { id: result.insertId, name, distance, status }
//       });
//     } catch (error) {
//       console.error('Error saving:', error);
//       return res.status(500).json({
//         success: false,
//         error: 'Server error: ' + error.message
//       });
//     }
//   }

//   if (req.method === 'GET') {
//     try {
//       const [rows] = await pool.query(
//         'SELECT * FROM attendances WHERE DATE(created_at) = CURDATE() ORDER BY created_at DESC'
//       );
//       return res.status(200).json({ success: true, data: rows });
//     } catch (error) {
//       console.error('Error fetching:', error);
//       return res.status(500).json({ success: false, error: error.message });
//     }
//   }

//   return res.status(405).json({ success: false, error: 'Method not allowed' });
// };

// api/attendance_save.js
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Haversine function
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  // return R * c;
  return 1;
}

// Vercel serverless handler
module.exports = async (req, res) => {
  if (req.method === 'POST') {
    try {
      const { name, lat, lng, distance, status, time, timestamp } = req.body || {};

      if (!name || !lat || !lng || distance === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }

      const REFERENCE_LAT = -7.054970805597252;
      const REFERENCE_LNG = 107.56087285759028;
      const DISTANCE_LIMIT = 25;

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

      // Insert ke Supabase
      const { data, error } = await supabase
        .from('attendances')
        .insert({
          name,
          latitude: lat,
          longitude: lng,
          distance,
          status,
          time,
          timestamp
        })
        .select();

      if (error) {
        console.error('Supabase error:', error);
        return res.status(500).json({
          success: false,
          error: error.message
        });
      }

      return res.status(200).json({
        success: true,
        data: data[0]
      });
    } catch (error) {
      console.error('Error saving:', error);
      return res.status(500).json({
        success: false,
        error: 'Server error: ' + error.message
      });
    }
  }

  if (req.method === 'GET') {
    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      // Query data hari ini saja
      const { data, error } = await supabase
        .from('attendances')
        .select('*')
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        return res.status(500).json({
          success: false,
          error: error.message
        });
      }

      return res.status(200).json({ success: true, data: data || [] });
    } catch (error) {
      console.error('Error fetching:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
