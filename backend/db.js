const mysql = require("mysql2/promise");

const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "admin",
    database: "db_groqapi",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function testConnection() {
    try {
        const connection = await pool.getConnection();

        console.log("Connected to MySQL successfully.");

        connection.release(); // very important
    } catch (err) {
        console.error("Failed to connect to database:", err);
    }
}

testConnection();

module.exports = pool;