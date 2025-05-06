const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",       // Replace with your actual MySQL password
  database: "hospital_db",  // Replace with your actual database name
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed: ", err.stack);
    return;
  }
  console.log("Connected to MySQL database");
});

module.exports = db;
