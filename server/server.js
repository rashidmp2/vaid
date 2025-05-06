const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ✅ MySQL Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "root",
  database: process.env.DB_NAME || "auth_demo",
});

db.connect((err) => {
  if (err) {
    console.error("MySQL Connection Error:", err.stack);
    process.exit(1); // Exit the app if DB connection fails
  }
  console.log("Connected to MySQL");
});

// ✅ Hardcoded admin credentials
const HARD_CODED_EMAIL = "rashid24@gmail.com";
const HARD_CODED_PASSWORD = "87654321";

// ✅ User Registration
app.post("/register", async (req, res) => {
  const { name, email, password, mobileNumber } = req.body;

  if (!name || !email || !password || !mobileNumber) {
    return res.status(400).send("All fields are required");
  }

  const passwordValidationRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,20}$/;
  if (!passwordValidationRegex.test(password)) {
    return res.status(400).send("Password must be at least 6 characters long and contain both letters and numbers.");
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    const sql = "INSERT INTO users (name, email, password, mobileNumber) VALUES (?, ?, ?, ?)";
    db.query(sql, [name, email, hashed, mobileNumber], (err) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          console.error(`Duplicate entry for email ${email}: ${err.message}`);
          return res.status(409).send("Email already registered");
        }
        console.error("DB Error:", err.stack);
        return res.status(500).send("Database error");
      }
      return res.send("User registered successfully");
    });
  } catch (err) {
    console.error("Hashing error:", err.stack);
    return res.status(500).send("Server error");
  }
});

// ✅ User Login
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
    if (err || results.length === 0) {
      console.error(`Login failed for email ${email}: ${err ? err.message : 'No user found'}`);
      return res.status(401).send("Invalid credentials");
    }

    const user = results[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      console.error(`Invalid password attempt for email ${email}`);
      return res.status(401).send("Invalid credentials");
    }

    return res.send("Login successful");
  });
});

// ✅ Forgot Password
app.post("/forgot-password", (req, res) => {
  const { email } = req.body;
  db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
    if (err || results.length === 0) {
      console.error(`Forgot password failed for email ${email}: ${err ? err.message : 'No user found'}`);
      return res.status(404).send("User not found");
    }
    return res.send("Password reset link sent (mock)");
  });
});

// ✅ Admin Login
app.post("/admin-login", (req, res) => {
  const { email, password } = req.body;
  if (email === HARD_CODED_EMAIL && password === HARD_CODED_PASSWORD) {
    return res.send("Admin login successful");
  }
  console.error(`Admin login failed for email ${email}`);
  return res.status(401).send("Invalid credentials");
});

// ✅ Register Patient
app.post("/registerPatient", (req, res) => {
  const {
    name, mobile, dob, age, gender, bloodType, aadhar, address, taluk,
    diseaseDuration, symptoms, diseaseType, assistantName, relationToPatient, assistantTelno
  } = req.body;

  const findHospitalQuery = "SELECT id FROM hospitals WHERE diseaseType = ? LIMIT 1";
  db.query(findHospitalQuery, [diseaseType], (err, hospitalResults) => {
    if (err) {
      console.error(`Error fetching hospital for disease type ${diseaseType}: ${err.stack}`);
      return res.status(500).send("Server error");
    }
    if (hospitalResults.length === 0) {
      console.error(`No hospital found for disease type ${diseaseType}`);
      return res.status(404).send("No hospital found for this disease type");
    }

    const hospitalId = hospitalResults[0].id;
    const insertQuery = `
      INSERT INTO patients (
        name, mobile, dob, age, gender, bloodType, aadhar, address, taluk,
        diseaseDuration, symptoms, diseaseType, assistantName, relationToPatient, assistantTelno, hospitalId
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.query(insertQuery, [
      name, mobile, dob, age, gender, bloodType, aadhar, address, taluk,
      diseaseDuration, symptoms, diseaseType, assistantName, relationToPatient, assistantTelno, hospitalId
    ], (err) => {
      if (err) {
        console.error("Error registering patient:", err.stack);
        return res.status(500).send("Error registering patient");
      }
      const hospitalQuery = "SELECT name, contactNumber FROM hospitals WHERE id = ?";
      db.query(hospitalQuery, [hospitalId], (err, hospitalInfo) => {
        if (err) {
          console.error("Error fetching hospital info:", err.stack);
          return res.status(500).send("Error retrieving hospital info");
        }
        const { name: hospitalName, contactNumber } = hospitalInfo[0];
        res.json({ message: "Patient registered successfully", hospitalName, contactNumber });
      });
    });
  });
});

// ✅ Dashboard Patient Details
app.get("/patientDetails", (req, res) => {
  const query = `
    SELECT 
      p.name, p.mobile, p.dob, p.age, p.gender, p.bloodType, p.aadhar,
      p.address, p.taluk, p.diseaseType, p.diseaseDuration, p.symptoms,
      p.assistantName, p.relationToPatient, p.assistantTelno,
      h.name as hospitalName, h.contactNumber as hospitalContactNumber
    FROM patients p
    LEFT JOIN hospitals h ON p.hospitalId = h.id
  `;
  db.query(query, (err, result) => {
    if (err) {
      console.error("Error fetching patient details:", err.stack);
      res.status(500).send("Error fetching patient details");
    } else {
      res.json(result);
    }
  });
});
// ✅ Add Hospital
app.post("/addHospital", (req, res) => {
  const { name, diseaseType, contactNumber, address } = req.body;

  // Validation
  if (!name || !diseaseType || !contactNumber || !address) {
    return res.status(400).send("All fields are required");
  }

  const sql = "INSERT INTO hospitals (name, diseaseType, contactNumber, address) VALUES (?, ?, ?, ?)";
  db.query(sql, [name, diseaseType, contactNumber, address], (err) => {
    if (err) {
      console.error(`Error adding hospital: ${err.stack}`);
      return res.status(500).send("Error adding hospital");
    }
    return res.send("Hospital added successfully");
  });
});
// ✅ Get Hospital List
app.get("/hospitalList", (req, res) => {
  const query = "SELECT * FROM hospitals"; // Fetch all hospitals

  db.query(query, (err, result) => {
    if (err) {
      console.error("Error fetching hospital list:", err.stack);
      return res.status(500).send("Error fetching hospital list");
    }
    res.json(result);
  });
});


// ✅ Get All Patients with Hospital Info
app.get("/getAllPatients", (req, res) => {
  const query = `
    SELECT 
      p.name AS patientName,
      p.diseaseType,
      h.name AS hospitalName,
      h.contactNumber AS hospitalContact,
      h.address AS hospitalAddress
    FROM patients p
    LEFT JOIN hospitals h ON p.diseaseType = h.diseaseType
  `;

  db.query(query, (err, result) => {
    if (err) {
      console.error("Error fetching all patients:", err.stack);
      return res.status(500).send("Database error");
    }
    res.json(result);
  });
});


// ✅ Submit Feedback
app.post('/api/feedback/submit', (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).send("All fields are required");
  }

  const sql = "INSERT INTO feedback (name, email, message) VALUES (?, ?, ?)";
  db.query(sql, [name, email, message], (err) => {
    if (err) {
      console.error(`Error inserting feedback: ${err.stack}`);
      return res.status(500).send("Failed to submit feedback");
    }
    console.log(`Feedback submitted successfully by ${name}`);
    res.send("Feedback submitted successfully");
  });
});


// ✅ View Feedback for Admin
app.get('/api/feedback/view', (req, res) => {
  // Example: Checking for admin authentication (you can modify this based on your auth mechanism)
  const { adminEmail } = req.query; // For example, checking admin email through query params
  
  if (adminEmail !== HARD_CODED_EMAIL) { // Ensure this is your admin email or a valid token check
    logger.error(`Unauthorized access attempt by email: ${adminEmail}`);
    return res.status(403).send("Unauthorized access");
  }

  const query = "SELECT * FROM feedback ORDER BY createdAt DESC"; // Assuming you have a `createdAt` column in the feedback table
  db.query(query, (err, result) => {
    if (err) {
      logger.error(`Error fetching feedback: ${err.stack}`);
      return res.status(500).send("Error fetching feedback");
    }
    logger.info("Feedback retrieved successfully for admin.");
    res.json(result); // Return feedback data to the admin
  });
});


// ✅ Start Server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
