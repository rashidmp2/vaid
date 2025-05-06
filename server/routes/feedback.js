const express = require("express");
const router = express.Router();
const db = require("./db"); // or wherever your MySQL connection is

// Submit feedback
router.post("/submit", (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const sql = "INSERT INTO feedback (name, email, message) VALUES (?, ?, ?)";
  db.query(sql, [name, email, message], (err) => {
    if (err) {
      console.error("Error inserting feedback:", err);
      return res.status(500).json({ error: "Database error while submitting feedback" });
    }
    res.status(200).json({ message: "Feedback submitted successfully" });
  });
});

module.exports = router;
