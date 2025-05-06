app.get("/getAllPatients", (req, res) => {
    const query = `
      SELECT 
        p.name AS patientName,
        p.diseaseType,
        h.name AS hospitalName,
        h.contactNumber AS hospitalContact,
        h.address AS hospitalAddress
      FROM patients p
      LEFT JOIN hospitals h ON p.diseaseType = h.specialization
    `;
    
    db.query(query, (err, result) => {
      if (err) {
        console.error("Error fetching data:", err);
        return res.status(500).send("Database query error");
      }
      res.json(result);
    });
  });
  