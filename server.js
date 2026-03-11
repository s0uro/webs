const path = require("path");
const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const nodemailer = require("nodemailer");

const app = express();

// SQLite database in local file
const DB_PATH = path.join(__dirname, "users.db");
const db = new sqlite3.Database(DB_PATH);

// Ensure users table exists
db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      age INTEGER NOT NULL,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      countryCode TEXT NOT NULL,
      password TEXT NOT NULL
    )`
  );
  console.log("SQLite ready, users table ensured at", DB_PATH);
});

app.use(cors());
app.use(express.json());

// Configure email transporter (fill with your real SMTP details)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || "mydatas2004@gmail.com",
    pass: process.env.SMTP_PASS || "mydatas2004@gmail.com",
  },
});

async function sendWelcomeEmail(to, fullName) {
  if (!to) return;
  const safeName = fullName || "there";

  const mailOptions = {
    from: process.env.SMTP_FROM || (process.env.SMTP_USER || "mydatas2004@gmail.com"),
    to,
    subject: "Welcome to MyModernSite",
    text: `Hi ${safeName},\n\nWelcome to MyModernSite! Your account has been created successfully.\n\nThank you,\nMyModernSite`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Welcome email sent to", to);
  } catch (err) {
    console.error("Failed to send welcome email:", err.message || err);
  }
}

// API: Sign up - create user in DB
app.post("/api/signup", (req, res) => {
  const {
    firstName,
    lastName,
    age,
    username,
    email,
    phone,
    countryCode,
    password,
  } = req.body || {};

  if (
    !firstName ||
    !lastName ||
    !age ||
    !username ||
    !email ||
    !phone ||
    !countryCode ||
    !password
  ) {
    return res.status(400).json({ success: false, message: "Missing fields" });
  }

  const ageNumber = Number(age);
  if (!Number.isFinite(ageNumber) || ageNumber < 18) {
    return res
      .status(400)
      .json({ success: false, message: "Age must be 18+" });
  }

  const sql = `INSERT INTO users
    (firstName, lastName, age, username, email, phone, countryCode, password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  const params = [
    firstName,
    lastName,
    ageNumber,
    username,
    email,
    phone,
    countryCode,
    password,
  ];

  db.run(sql, params, function (err) {
    if (err) {
      if (err.code === "SQLITE_CONSTRAINT") {
        return res
          .status(400)
          .json({ success: false, message: "User already exists" });
      }
      console.error("DB error on signup:", err);
      return res
        .status(500)
        .json({ success: false, message: "Database error" });
    }

    // Fire-and-forget welcome email (response is already successful)
    const fullName = `${firstName} ${lastName}`.trim();
    sendWelcomeEmail(email, fullName);

    return res.json({ success: true });
  });
});

// API: Login - check username/email + password from DB
app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Missing fields" });
  }

  // allow login with either username OR email
  const sql = `SELECT * FROM users WHERE (username = ? OR email = ?) AND password = ?`;
  db.get(sql, [username, username, password], (err, row) => {
    if (err) {
      console.error("DB error on login:", err);
      return res
        .status(500)
        .json({ success: false, message: "Database error" });
    }
    if (!row) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const usernameValue = (row.username || "").toLowerCase();
    const isAdmin = usernameValue === "admin13";

    return res.json({ success: true, isAdmin });
  });
});

// Optional: list users (for debugging)
app.get("/api/users", (req, res) => {
  const sql = `SELECT id, firstName, lastName, age, username, email, phone, countryCode FROM users`;
  db.all(sql, (err, rows) => {
    if (err) {
      console.error("DB error on list users:", err);
      return res
        .status(500)
        .json({ success: false, message: "Database error" });
    }
    res.json({ success: true, users: rows });
  });
});

// Serve static frontend files
app.use(express.static(__dirname));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

