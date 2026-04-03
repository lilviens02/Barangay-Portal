/* ======================================================
BARANGAY E-DOCS SYSTEM
FILE: backend/index.js
DESCRIPTION: MAIN SERVER FILE (FINAL SECURE VERSION)
======================================================*/
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

require("dotenv").config();
const ROLES = {
  RESIDENT: "resident",
  STAFF: "staff",
  ADMIN: "superadmin"
};

//  JWT SECRET VALIDATION
if (!process.env.JWT_SECRET) {
  console.error("❌ CRITICAL ERROR: JWT_SECRET is missing in .env file!");
  process.exit(1); 
}

const app = express();

// ✅ Advanced Helmet: Para ma-view ang images/PDFs sa browser (Bonus Point)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false
}));

app.use(express.json()); 

// ✅ Corrected CORS: Siguraduhin na may "true" ang credentials
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true 
}));

//  RATE LIMITERS
// Global Limiter (General protection)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000 
});
app.use(limiter);

/* 
// Login Limiter (Brute-force protection - nextime nalang ito)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts lang
  message: { message: "Too many login attempts, please try again after 15 minutes" }
});
*/

// ✅ FIX NI SIR: FOLDER CHECKS USING ABSOLUTE PATHS
const UPLOAD_DIR = path.join(__dirname, "uploads");
const CERT_DIR = path.join(__dirname, "certificates");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log("📁 Created uploads folder automatically.");
}

if (!fs.existsSync(CERT_DIR)) {
  fs.mkdirSync(CERT_DIR, { recursive: true });
  console.log("📁 Created certificates folder automatically.");
}

//  SERVICES
require("./services/emailListener");
const generateCertificate = require("./services/certificateService");

/* ======================================================
   ROUTES (DITO MO ILALAGAY ANG MGA API ENDPOINTS MO)
   ====================================================== */


/* ======================================================
AUTH MIDDLEWARE
======================================================*/

const authenticateToken = (req, res, next) => {

  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Access denied. No token provided."
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {

    if (err) {
      return res.status(403).json({
        message: "Invalid token"
      });
    }

    req.user = user;
    next();

  });

};

const requireStaffReady = (req, res, next) => {
  if (req.user.role === "staff" || req.user.role === "superadmin") {
    if (req.user.mustChangePassword) {
      return res.status(403).json({
        message: "Please change your temporary password first."
      });
    }
  }
  next();
};

/* ======================================================
SERVE UPLOADED FILES
======================================================*/

app.use("/uploads", express.static(UPLOAD_DIR));


/* ======================================================
FILE UPLOAD CONFIGURATION (UPDATED VERSION)
======================================================*/
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = Date.now() + "-" + crypto.randomBytes(4).toString("hex") + ext;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ["application/pdf", "image/png", "image/jpeg"];
    const allowedExtensions = [".pdf", ".png", ".jpg", ".jpeg"];
    const fileExt = path.extname(file.originalname).toLowerCase();

    const isValidMime = allowedMimeTypes.includes(file.mimetype);
    const isValidExt = allowedExtensions.includes(fileExt);

    if (isValidMime && isValidExt) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF, PNG, and JPG are allowed."), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});


/* ======================================================
DATABASE CONNECTION Admin and Staff Creation
======================================================*/

// admin / staff auto-create helper
const createDefaultStaff = async () => {
  const staffEmail = "staff@barangay.com";

  db.query(
    "SELECT * FROM barangay_staff WHERE LOWER(Email) = LOWER(?)",
    [staffEmail],
    async (err, results) => {
      if (err) {
        console.log("❌ Error checking staff account");
        return;
      }

      if (results.length > 0) {
        console.log("✅ Staff already exists");
        return;
      }

      try {
        const hashedPassword = await bcrypt.hash("staff123", 10);

        db.query(
          `INSERT INTO barangay_staff
           (FullName, Email, PasswordHash, RoleName)
           VALUES (?, ?, ?, ?)`,
          [
            "Default Staff",
            "staff@barangay.com",
            hashedPassword,
            "staff"
          ],
          (err) => {
            if (err) {
              console.log("❌ Failed to create staff");
            } else {
              console.log("✅ Default staff created!");
              console.log("Email: staff@barangay.com");
              console.log("Password: staff123");
            }
          }
        );
      } catch (error) {
        console.log("❌ Error generating staff password");
      }
    }
  );
};


const db = require("./db");
const dbp = db.promise();

db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Database connection failed:", err);
  } else {
    console.log("✅ Connected to MySQL");
    connection.release();

    // ✅ FIX: Dito natin ilalagay ang condition ni Sir
    // Gagana lang ang auto-create kung HINDI "production" ang mode natin.
    if (process.env.NODE_ENV !== "production") {
      createDefaultAdmin();
      createDefaultStaff();
    } else {
      console.log("🛡️ Production Mode: Auto-creation of default accounts is DISABLED for security.");
    }
  }
});



/* ======================================================
EMAIL CONFIGURATION
======================================================*/


const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS,
  }
});

// ✅ 12. 🧾 LOGGING IMPROVEMENT (WITH IP & USER AGENT)
// ✅ CORRECTED LOG EMAIL FUNCTION (POINT #12)
const logEmail = async ({ 
  req = null, 
  requestId = null,
  referenceNo = null,
  recipientEmail = null,
  subject,
  body,
  direction,
  status = null, 
}) => {
  // Extract IP and Browser info (User Agent)
  const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : 'System';
  const ua = req ? req.headers['user-agent'] : 'System Process';

  await dbp.query(`INSERT INTO email_audit_logs
    (RequestID, ReferenceNo, RecipientEmail, Subject, Body, Direction, Status, IPAddress, UserAgent, CreatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [requestId, referenceNo, recipientEmail, subject, body, direction, status, ip, ua]
  );
};







/* ======================================================
RESIDENT PROFILE ROUTE
======================================================*/

app.get("/api/residents/me", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "resident") {
      return res.status(403).json({ message: "Access denied" });
    }

    const [rows] = await dbp.query(
      `SELECT ResidentID, Firstname, Middlename, Lastname, Address, DateOfBirth, Gender, ContactNo, Email, DateRegistered
       FROM residents
       WHERE ResidentID = ?`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Resident not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Fetch resident profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});



/* ======================================================
CERTIFICATE FETCH ROUTE

app.get("/api/certificates/:id", authenticateToken, requireStaffReady, async (req, res) => {
  try {
    // ✅ Ginamit na natin yung ROLES constant (Point #11)
    if (req.user.role !== ROLES.STAFF && req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({ message: "Access denied" });
    }

    const [rows] = await dbp.query(
      `SELECT c.CertID, c.RequestID, c.ReferenceNo, c.CertName, c.Description, c.DateIssued, c.SignedBy, c.FilePath,
              r.Firstname, r.Middlename, r.Lastname, r.Address,
              req.DocumentType, req.Purpose, req.Status
       FROM certificates c
       JOIN requests req ON req.RequestID = c.RequestID
       JOIN residents r ON r.ResidentID = req.ResidentID
       WHERE c.RequestID = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Certificate not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Fetch certificate error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
======================================================*/
app.get("/api/certificates/:id", authenticateToken, requireStaffReady, async (req, res) => {
  try {
    const requestId = req.params.id;

    const [rows] = await dbp.query(
      `SELECT c.*, r.Firstname, r.Lastname, req.Status
       FROM requests req
       LEFT JOIN certificates c ON c.RequestID = req.RequestID
       JOIN residents r ON r.ResidentID = req.ResidentID
       WHERE req.RequestID = ?`,
      [requestId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Request record not found." });
    }

    // Kung Approved na pero wala pang record sa certificates table
    if (!rows[0].CertID) {
      return res.status(404).json({ 
        message: "Certificate file has not been generated yet. Please approve the request first." 
      });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Fetch certificate error:", error);
    res.status(500).json({ message: "Server error" });
  }
});


/* ======================================================
AUTO CREATE DEFAULT ADMIN (RUNS WHEN SERVER STARTS)
- checks if admin exists
- creates one if none found
======================================================*/

const createDefaultAdmin = async () => {

  const adminEmail = "admin@barangay.com";

  // check if admin already exists
  db.query(
    "SELECT * FROM barangay_staff WHERE Email = ?",
    [adminEmail],
    async (err, results) => {

      if (err) {
        console.log("❌ Error checking admin account");
        return;
      }

      // if admin exists do nothing
      if (results.length > 0) {
        console.log("✅ Admin account already exists");
        return;
      }

      try {

        // hash default password
        const hashedPassword = await bcrypt.hash("admin123", 10);

        // create admin account
        db.query(
          `INSERT INTO barangay_staff
          (FullName, Email, PasswordHash, RoleName)
          VALUES (?, ?, ?, ?)`,
          [
            "System Administrator",
            "admin@barangay.com",
            hashedPassword,
            "superadmin"
          ],
          (err) => {

            if (err) {
              console.log("❌ Failed to create default admin");
            } else {
              console.log("✅ Default admin created!");
              console.log("Email: admin@barangay.com");
              console.log("Password: admin123");
            }

          }
        );

      } catch (error) {
        console.log("❌ Error generating admin password");
      }

    }
  );

};




/* ======================================================
RESIDENT REGISTRATION (FR1) (UPDATED WITH PENDING STATUS)
- secure password hashing
- duplicate email validation
-- Default status: Pending (needs staff approval)

======================================================*/
app.post("/api/register", async (req, res) => {
  const {
    firstname,
    middlename,
    lastname,
    gender,
    birthdate,
    contact,
    address,
    email,
    password
  } = req.body;

  // 1. CHECK REQUIRED FIELDS
if (!firstname || !lastname || !gender || !birthdate || !contact || !address || !email || !password) {
    return res.status(400).json({ message: "Required fields missing" });
  }

  // 2. EMAIL FORMAT VALIDATION
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  try {
    // ✅ DAGDAG NI SIR: 2.2 PRE-CHECK & NORMALIZATION
    const normalizedEmail = String(email).trim().toLowerCase();

    // I-check muna kung existing na ang email bago mag-insert
    const [existing] = await dbp.query(
      "SELECT ResidentID FROM residents WHERE LOWER(Email) = ?",
      [normalizedEmail]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // ✅ DAGDAG NI SIR: PASSWORD LENGTH CHECK
    if (String(password).length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    // 3. HASH THE PASSWORD
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. SQL QUERY (Gamit na ang AccountStatus at "Pending")
    const sql = `
      INSERT INTO residents
      (Firstname, Middlename, Lastname, Address, DateOfBirth, Gender, ContactNo, Email, PasswordHash, DateRegistered, AccountStatus)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)
    `;

    db.query(
      sql,
      [
        firstname,
        middlename || null,
        lastname,
        address || null,
        birthdate || null,
        gender,
        contact || null,
        normalizedEmail, // ✅ Gamit na ang normalized version dito
        hashedPassword,
        "Pending"
      ],
      (err) => {
        // 5. DATABASE ERROR HANDLING
        if (err) {
          if (err.code === "ER_DUP_ENTRY") {
            return res.status(400).json({ message: "Email already exists" });
          }
          return res.status(500).json({ message: "Database error" });
        }

        // 6. SEND CONFIRMATION EMAIL (Nandito pa rin ito!)
        transporter.sendMail({
          from: process.env.EMAIL,
          to: normalizedEmail,
          subject: "Barangay E‑Docs - Registration Received",
          text: `Welcome ${firstname}! Your account has been created and is currently PENDING for approval. Please wait for the barangay staff to verify your account.`
        }, (emailErr) => {
          if (emailErr) console.log("❌ Email failed:", emailErr);
          else console.log("✅ Registration email sent");
        });

        // 7. SUCCESS RESPONSE
        res.json({
          message: "Registered successfully. Please wait for staff approval before logging in."
        });
      }
    );
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error" });
  }
});


/* ======================================================
CREATE STAFF ACCOUNT (ADMIN ONLY)
- admin creates staff
- password hashed
======================================================*/
/* ======================================================
ADMIN: CREATE STAFF ACCOUNT (REPLACED VERSION)
======================================================*/
app.post("/api/create-staff", authenticateToken, async (req, res) => {
  // 1. Security Check: Dapat Superadmin lang
  if (req.user.role !== "superadmin") {
    return res.status(403).json({
      message: "Only superadmin can create staff"
    });
  }

  const { fullname, email, gender, birthdate } = req.body;
const normalizedEmail = String(email || "").trim().toLowerCase();

  // 2. Validation: Fullname at Email lang ang mandatory
  if (!fullname || !normalizedEmail) {
    return res.status(400).json({
      message: "Required fields missing"
    });
  }

  try {
    // 3. GENERATE TEMP PASSWORD (Dito na papasok yung crypto)
    const tempPassword = `TMP-${crypto.randomBytes(4).toString("hex")}`;
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // 4. SQL QUERY (May kasama nang MustChangePassword flag)
    const sql = `
      INSERT INTO barangay_staff
      (FullName, Email, PasswordHash, DateOfBirth, Gender, RoleName, MustChangePassword, PasswordChangedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      sql,
      [
        fullname,
        normalizedEmail,
        hashedPassword,
        birthdate || null,
        gender || null,
        "staff",
        1,    // 1 means TRUE (kailangan magpalit ng password)
        null  // Wala pang date kasi hindi pa nagpapalit
      ],
      (err) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY") {
            return res.status(400).json({
              message: "Email already exists"
            });
          }
          return res.status(500).json({
            message: "Database error"
          });
        }

        // 5. SUCCESS: Ibabalik natin yung tempPassword para maibigay sa staff
        res.json({
          message: "Staff account created successfully",
          tempPassword // Ipakita ito sa admin para ma-copy
        });
      }
    );
  } catch (error) {
    console.error("Create staff error:", error);
    res.status(500).json({
      message: "Server error"
    });
  }
});



/* ======================================================
LOGIN ROUTE (no limiter)
-  Using ROLES constant
- Resolved Duplicate Route
======================================================*/
app.post("/api/login", async (req, res) => {
  // ✅ DAGDAG NI SIR: LOGIN VALIDATION & NORMALIZATION
  const { email, password, role } = req.body;
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;


  if (!email || !password || !role) {
    return res.status(400).json({ message: "Email, password, and role are required" });
  }


  const normalizedEmail = String(email).trim().toLowerCase();


  let sql = "", values = [];


  // ✅ GINAMIT ANG normalizedEmail SA VALUES PARA SA SEARCH
  if (role === ROLES.RESIDENT) {
    sql = `SELECT * FROM residents WHERE LOWER(Email) = ?`;
    values = [normalizedEmail];
  } else if (role === ROLES.STAFF) {
    sql = `SELECT * FROM barangay_staff WHERE LOWER(Email) = ? AND RoleName = 'staff'`;
    values = [normalizedEmail];
  } else if (role === ROLES.ADMIN) {
    sql = `SELECT * FROM barangay_staff WHERE LOWER(Email) = ? AND RoleName = 'superadmin'`;
    values = [normalizedEmail];
  } else {
    return res.status(400).json({ message: "Invalid role" });
  }


  db.query(sql, values, async (err, results) => {
    if (err) {
      console.log(`❌ Login Error: ${normalizedEmail} | IP: ${ip} | Error: ${err.message}`);
      return res.status(500).json({ message: "Database error" });
    }
   
    if (results.length === 0) {
      console.log(`⚠️ Login Failed: ${normalizedEmail} not found | Role: ${role} | IP: ${ip}`);
      return res.status(400).json({ message: "User not found" });
    }


    const user = results[0];


    const match = await bcrypt.compare(password, user.PasswordHash);
    if (!match) {
      console.log(`🚫 Login Failed: ${normalizedEmail} wrong password | IP: ${ip}`);
      return res.status(400).json({ message: "Wrong password" });
    }


    if (role === ROLES.RESIDENT && user.AccountStatus !== "Approved") {
      console.log(`⏳ Login Blocked: ${normalizedEmail} is ${user.AccountStatus} | IP: ${ip}`);
      return res.status(403).json({ message: "Your account is still pending approval." });
    }


    // ✅ POINT #7: Log SUCCESSFUL login
    console.log(`✅ Login Success: ${normalizedEmail} | Role: ${role} | IP: ${ip}`);


    const userId = (role === ROLES.RESIDENT) ? user.ResidentID : user.StaffID;
    const userRole = user.RoleName || ROLES.RESIDENT;
    const mustChange = user.MustChangePassword === 1;


    // 6. GENERATE JWT TOKEN
    const token = jwt.sign(
      { id: userId, role: userRole, mustChangePassword: mustChange },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // --- TINANGGAL NA YUNG res.cookie DITO ---

    // 7. SUCCESS RESPONSE
    res.json({
      message: "Login success",
      token: token,
      user: {
        id: userId,
        email: user.Email,
        role: userRole,
        mustChangePassword: mustChange
      }
    });
  });
});


/* ======================================================
CHANGE PASSWORD ROUTE (PART E - ILAGAY SA ILALIM NG LOGIN)
======================================================*/
app.put("/api/change-password", authenticateToken, async (req, res) => {
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({
      message: "New password must be at least 8 characters"
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    if (req.user.role === "resident") {
      await dbp.query(
        `UPDATE residents SET PasswordHash = ? WHERE ResidentID = ?`,
        [hashedPassword, req.user.id]
      );
    } else {
      // ✅ Set MustChangePassword to 0 para maka-access na siya sa staff APIs
      await dbp.query(
        `UPDATE barangay_staff 
         SET PasswordHash = ?, MustChangePassword = 0, PasswordChangedAt = NOW() 
         WHERE StaffID = ?`,
        [hashedPassword, req.user.id]
      );
    }

    const token = jwt.sign(
      {
        id: req.user.id,
        role: req.user.role,
        mustChangePassword: false
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({
      message: "Password changed successfully",
      token,
      user: {
        id: req.user.id,
        role: req.user.role,
        mustChangePassword: false
      }
    });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});


/* ======================================================
GET ALL RESIDENT USERS (UPDATED WITH SEARCH)
======================================================*/
app.get("/api/users", authenticateToken, requireStaffReady, async (req, res) => {
 try {
   if (req.user.role !== "staff" && req.user.role !== "superadmin") {
     return res.status(403).json({ message: "Access denied" });
   }

   const search = req.query.search || "";
   const like = `%${search}%`;

   const sql = search
     ? `
       SELECT ResidentID, Firstname, Middlename, Lastname, Address, DateOfBirth, Gender, ContactNo, Email, DateRegistered
       FROM residents
       WHERE Firstname LIKE ?
          OR Middlename LIKE ?
          OR Lastname LIKE ?
          OR Email LIKE ?
          OR Address LIKE ?
       ORDER BY DateRegistered DESC
     `
     : `
       SELECT ResidentID, Firstname, Middlename, Lastname, Address, DateOfBirth, Gender, ContactNo, Email, DateRegistered
       FROM residents
       ORDER BY DateRegistered DESC
     `;

   const params = search ? [like, like, like, like, like] : [];

   // Gagamit na tayo ng dbp.query (async version)
   const [rows] = await dbp.query(sql, params);
   res.json(rows);
 } catch (error) {
   console.error("Fetch users error:", error);
   res.status(500).json({ message: "Database error" });
 }
});





/* ======================================================
GET ALL DOCUMENT REQUESTS (ADMIN / STAFF)
======================================================*/
app.get("/api/requests", authenticateToken, requireStaffReady, (req, res) => {
if (req.user.role !== "staff" && req.user.role !== "superadmin") {
    return res.status(403).json({ message: "Access denied" });
  }

  const { search, status } = req.query;

let sql = `
  SELECT r.*, u.Firstname, u.Lastname, u.Email
  FROM requests r
  LEFT JOIN residents u ON r.ResidentID = u.ResidentID
  WHERE 1=1
`;

let params = [];

/// 🔍 SEARCH (NAME + REFERENCE)
if (search) {
  sql += ` AND (
    LOWER(u.Firstname) LIKE LOWER(?) 
    OR LOWER(u.Lastname) LIKE LOWER(?) 
    OR LOWER(TRIM(r.ReferenceNo)) LIKE LOWER(?)
  )`;

  params.push(`%${search}%`, `%${search}%`, `%${search}%`);
}

// 🎯 FILTER
if (status) {
  sql += ` AND r.Status = ?`;
  params.push(status);
}

// ORDER
sql += ` ORDER BY r.DateSubmitted DESC`;

db.query(sql, params, (err, results) => {

  if (err) {
    console.log("❌ FETCH ERROR:", err);
    return res.status(500).json({
      message: "Database error"
    });
  }

  res.json(results);

});
});

/* ======================================================
GET SINGLE REQUEST BY ID (FR2 - COMPLETE VIEW)
======================================================*/

app.get("/api/requests/:id", authenticateToken, requireStaffReady, (req, res) => {  
if (req.user.role !== "staff" && req.user.role !== "superadmin") {
    return res.status(403).json({ message: "Access denied" });
  }

  const { id } = req.params;

  const sql = `
  SELECT r.*, 
  u.Firstname, 
  u.Lastname, 
  u.Email
  FROM requests r
  LEFT JOIN residents u ON r.ResidentID = u.ResidentID
  WHERE r.RequestID = ?
  `;

  db.query(sql, [id], (err, result) => {

    if (err) {
      return res.status(500).json({
        message: "Database error"
      });
    }

    if (result.length === 0) {
      return res.status(404).json({
        message: "Request not found"
      });
    }

    res.json(result[0]);

  });

});


/* ======================================================
GET REQUESTS BY RESIDENT
======================================================*/
app.get("/api/resident-requests/:id", authenticateToken, (req, res) => {


  // ✅ SECURITY FIX
  if (req.user.id != req.params.id) {
    return res.status(403).json({ message: "Access denied" });
  }


  const { id } = req.params;


  const sql = `
  SELECT *
  FROM requests
  WHERE ResidentID = ?
  ORDER BY DateSubmitted DESC
  `;


  db.query(sql, [id], (err, results) => {


    if (err) {
      return res.status(500).json({
        message: "Database error"
      });
    }


    res.json(results);


  });


});

/* ======================================================
GET MESSAGES BY REQUEST ID (FR2 - COMPLETE VIEW)  
   ======================================================*/
app.get("/api/messages/:requestId", authenticateToken, async (req, res) => {
  try {
    const requestId = Number(req.params.requestId);

    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({ message: "Invalid request ID" });
    }

    const [requestRows] = await dbp.query(
      `SELECT r.RequestID, r.ResidentID, r.ReferenceNo, r.DocumentType, r.Status,
              res.Firstname, res.Lastname, res.Email
       FROM requests r
       JOIN residents res ON res.ResidentID = r.ResidentID
       WHERE r.RequestID = ?`,
      [requestId]
    );

    if (requestRows.length === 0) {
      return res.status(404).json({ message: "Request not found" });
    }

    const request = requestRows[0];
    const isResident = req.user.role === "resident";
if (!req.user?.id || !req.user?.role) {
  return res.status(401).json({ message: "Unauthorized" });
}
    const isOwner = req.user.id === request.ResidentID;
    const isStaff = req.user.role === "staff" || req.user.role === "superadmin";

    if (isResident && !isOwner) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!isResident && !isStaff) {
      return res.status(403).json({ message: "Access denied" });
    }

    const [messages] = await dbp.query(
      `SELECT MessageID, RequestID, Sender, Body, Timestamp
       FROM messages
       WHERE RequestID = ?
       ORDER BY Timestamp ASC`,
      [requestId]
    );

    const [emailLogs] = await dbp.query(
      `SELECT EmailLogID, RequestID, ReferenceNo, RecipientEmail, Subject, Body, Direction, Status, CreatedAt
       FROM email_audit_logs
       WHERE RequestID = ? OR ReferenceNo = ?
       ORDER BY CreatedAt ASC`,
      [requestId, request.ReferenceNo]
    );

    return res.json({
      request,
      messages,
      emailLogs
    });
  } catch (error) {
    console.error("Fetch messages error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});




/* ======================================================
   PART C: PENDING RESIDENTS LIST
   - Para makita ng staff ang mga bagong nag-register
   ======================================================*/
app.get("/api/pending-residents", authenticateToken, requireStaffReady, async (req, res) => {
  if (req.user.role !== "staff" && req.user.role !== "superadmin") {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    const [rows] = await dbp.query(
      `SELECT ResidentID, Firstname, Middlename, Lastname, Address, DateOfBirth, Gender, ContactNo, Email, DateRegistered, AccountStatus
       FROM residents
       WHERE AccountStatus = 'Pending'
       ORDER BY DateRegistered DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Database error" });
  }
});


/* ======================================================
   PART D: APPROVE RESIDENT (WITH EMAIL NOTIFICATION)
   ======================================================*/
app.put("/api/residents/:id/approve", authenticateToken, requireStaffReady, async (req, res) => {
  if (req.user.role !== ROLES.STAFF && req.user.role !== ROLES.ADMIN) {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    // 1. I-update ang status sa Database
    await dbp.query(
      `UPDATE residents SET AccountStatus = 'Approved', ApprovedBy = ?, ApprovedAt = NOW() WHERE ResidentID = ?`,
      [req.user.id, req.params.id]
    );

    // 2. KUNIN ANG EMAIL (Para sa Notification)
    const [user] = await dbp.query(
      "SELECT Email, Firstname FROM residents WHERE ResidentID = ?",
      [req.params.id]
    );

    if (user.length > 0) {
      const { Email, Firstname } = user[0];
      const subject = "Barangay E-Docs - Account Approved";
      const body = `Hello ${Firstname}, your account has been APPROVED. You can now log in to the portal.`;

      // 3. SEND EMAIL
      await transporter.sendMail({ from: process.env.EMAIL, to: Email, subject, text: body });

      // 4. LOG EMAIL (Bonus Points!)
      await logEmail({
        req,
        recipientEmail: Email,
        subject,
        body,
        direction: "outgoing",
        status: "sent"
      });
    }

    res.json({ message: "Resident approved and notified successfully" });
  } catch (error) {
    console.error("Approve Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/* ======================================================
   PART E: REJECT RESIDENT (WITH EMAIL NOTIFICATION)
   ======================================================*/
app.put("/api/residents/:id/reject", authenticateToken, requireStaffReady, async (req, res) => {
  if (req.user.role !== ROLES.STAFF && req.user.role !== ROLES.ADMIN) {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    // 1. I-update ang status sa Database
    await dbp.query(
      `UPDATE residents SET AccountStatus = 'Rejected', ApprovedBy = ?, ApprovedAt = NOW() WHERE ResidentID = ?`,
      [req.user.id, req.params.id]
    );

    // 2. KUNIN ANG EMAIL
    const [user] = await dbp.query(
      "SELECT Email, Firstname FROM residents WHERE ResidentID = ?",
      [req.params.id]
    );

    if (user.length > 0) {
      const { Email, Firstname } = user[0];
      const subject = "Barangay E-Docs - Account Rejected";
      const body = `Hello ${Firstname}, your registration was REJECTED. Please contact the barangay office for details.`;

      // 3. SEND EMAIL
      await transporter.sendMail({ from: process.env.EMAIL, to: Email, subject, text: body });

      // 4. LOG EMAIL
      await logEmail({
        req,
        recipientEmail: Email,
        subject,
        body,
        direction: "outgoing",
        status: "sent"
      });
    }

    res.json({ message: "Resident rejected and notified successfully" });
  } catch (error) {
    console.error("Reject Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});



/* ======================================================
   CREATE DOCUMENT REQUEST (IMPROVED VERSION)
  
   ====================================================== */
app.post("/api/requests", authenticateToken, upload.single("file"), async (req, res) => {
  try {
    // ✅ POINT #11: Ginamit ang ROLES Constant
    if (req.user.role !== ROLES.RESIDENT) {
      return res.status(403).json({ message: "Residents only" });
    }


    const user_id = req.user.id;
    const { documentType, purpose } = req.body;

    // --- PINALITAN/IDINAGDAG NA PART START ---
    if (!documentType || !purpose) {
      return res.status(400).json({ message: "Document type and purpose are required" });
    }
    // --- PINALITAN/IDINAGDAG NA PART END ---

    const filePath = req.file ? req.file.filename : null;


    // 1. IMPROVED DUPLICATE CHECK
    const [duplicateRows] = await dbp.query(
      `SELECT RequestID FROM requests
       WHERE ResidentID = ? AND DocumentType = ? AND Purpose = ?
       AND Status IN ('Pending', 'Approved', 'Released')
       AND Status != 'Rejected'`,
      [user_id, documentType, purpose]
    );


    if (duplicateRows.length > 0) {
      return res.status(400).json({ message: "An active request already exists for this document." });
    }


    // 2. INSERT FIRST (Para makuha ang unique Auto-Increment ID)
    const [insertResult] = await dbp.query(
      `INSERT INTO requests (ResidentID, DocumentType, Purpose, FilePath, Status, DateSubmitted)
       VALUES (?, ?, ?, ?, 'Pending', NOW())`,
      [user_id, documentType, purpose, filePath]
    );


    const newId = insertResult.insertId;
    const year = new Date().getFullYear();
    const reference = `BRGY-${year}-${String(newId).padStart(4, "0")}`;


    // 3. UPDATE REFERENCE
    await dbp.query(
      `UPDATE requests SET ReferenceNo = ? WHERE RequestID = ?`,
      [reference, newId]
    );


    // 4. EMAIL NOTIFICATION & LOGGING
    const [userResult] = await dbp.query("SELECT Email, Firstname FROM residents WHERE ResidentID = ?", [user_id]);
   
    if (userResult.length > 0) {
      try {
        const emailBody = `Reference: ${reference}\nDocument: ${documentType}`;
        await transporter.sendMail({ from: process.env.EMAIL, to: userResult[0].Email, subject: "Request Submitted", text: emailBody });
       
        // ✅ POINT #12: Kasama na ang 'req' para sa IP Address at User Agent logging
        await logEmail({
          req, // <--- IPASA ANG req DITO PARA SA BONUS POINTS
          requestId: newId,
          referenceNo: reference,
          recipientEmail: userResult[0].Email,
          subject: "Request Submitted",
          body: emailBody,
          direction: "outgoing",
          status: "sent"
        });
      } catch (err) {
        console.error("Email notification failed:", err);
      }
    }


    return res.json({ message: "Request submitted successfully", reference });


  } catch (error) {
    console.error("Submission error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});



/* ======================================================
DOWNLOAD CERTIFICATE 
 Uses path.resolve for absolute path safety
Uses ROLES constants
======================================================*/
app.get("/api/certificates/download/:reference", authenticateToken, (req, res) => {
  // ✅ POINT #11: Ginamit ang ROLES Constant para iwas typo
  if (req.user.role !== ROLES.STAFF && req.user.role !== ROLES.ADMIN) {
    return res.status(403).json({ message: "Access denied" });
  }

  const { reference } = req.params;

  db.query(
    "SELECT FilePath FROM certificates WHERE ReferenceNo = ?",
    [reference],
    (err, result) => {
      if (err || result.length === 0) {
        return res.status(404).json({ message: "Certificate not found" });
      }

      // ✅ POINT #5: MAS SAFE VERSION (Absolute Path)
      // Gagamit tayo ng path.resolve para sigurado ang location ng file sa server
      const absolutePath = path.resolve(__dirname, result[0].FilePath);
      
      res.download(absolutePath, (err) => {
        if (err) {
          console.error("❌ Download error:", err);
          // Kung hindi na-send ang headers, mag-reply ng error
          if (!res.headersSent) {
            res.status(404).json({ message: "File could not be found on the server" });
          }
        }
      });
    }
  );
});


/* ======================================================
   CERTIFICATE OVERWRITE RISK FIX & STAFF ID FIX (2.4)
   APPROVE REQUEST & GENERATE UNIQUE PDF
   ======================================================*/
app.post("/api/requests/:id/approve", authenticateToken, requireStaffReady, async (req, res) => {
  try {
    if (req.user.role !== ROLES.STAFF && req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({ message: "Access denied" });
    }

    const requestId = Number(req.params.id);

    const [rows] = await dbp.query(
      `SELECT r.*, res.Firstname, res.Middlename, res.Lastname, res.Email
       FROM requests r
       JOIN residents res ON r.ResidentID = res.ResidentID
       WHERE r.RequestID = ?`,
      [requestId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Request not found" });
    }

    const requestData = rows[0];

    if (String(requestData.Status).toLowerCase() === "rejected") {
      return res.status(400).json({ message: "Rejected requests cannot be approved." });
    }

    const [existingCert] = await dbp.query(
      "SELECT CertID FROM certificates WHERE RequestID = ?",
      [requestId]
    );

    if (existingCert.length > 0) {
      return res.status(400).json({ message: "Certificate already generated for this request." });
    }

    const fileName = `${requestData.ReferenceNo}-${Date.now()}.pdf`;
    const certificatePath = path.join(CERT_DIR, fileName);
const storedPath = path.posix.join("certificates", fileName);
    const pdfData = {
      name: `${requestData.Firstname} ${requestData.Lastname}`,
      document: requestData.DocumentType,
      purpose: requestData.Purpose,
      reference: requestData.ReferenceNo,
      date: new Date().toLocaleDateString(),
      signedBy: req.user.role === ROLES.ADMIN ? "Superadmin" : "Barangay Staff"
    };

    await generateCertificate(pdfData, certificatePath);

    await dbp.query(
      `UPDATE requests
       SET Status = 'Approved', ProcessedBy = ?, DateProcessed = NOW()
       WHERE RequestID = ?`,
      [req.user.id, requestId]
    );

    await dbp.query(
      `INSERT INTO certificates
       (RequestID, ReferenceNo, CertName, Description, DateIssued, SignedBy, FilePath)
       VALUES (?, ?, ?, ?, NOW(), ?, ?)`,
      [
        requestId,
        requestData.ReferenceNo,
        requestData.DocumentType,
        requestData.Purpose,
        req.user.id,
        storedPath
      ]
    );

    await dbp.query(
      `INSERT INTO request_logs (RequestID, StaffID, Status, ActionDate)
       VALUES (?, ?, ?, NOW())`,
      [requestId, req.user.id, "Approved"]
    );

    const subject = "Barangay E-Docs - Request Approved";
    const body = `Hello ${requestData.Firstname}, your request ${requestData.ReferenceNo} has been APPROVED. Please print or wait for collection instructions.`;

    await transporter.sendMail({
      from: process.env.EMAIL,
      to: requestData.Email,
      subject,
      text: body
    });

    if (typeof logEmail === "function") {
      await logEmail({
        req,
        requestId,
        referenceNo: requestData.ReferenceNo,
        recipientEmail: requestData.Email,
        subject,
        body,
        direction: "outgoing",
        status: "sent"
      });
    }

    return res.json({
      message: "Certificate generated successfully!",
      fileName
    });
  } catch (error) {
    console.error("Approval Error:", error);
    return res.status(500).json({ message: "Failed to approve and generate certificate" });
  }
});

// ✅ REPLACED: FIX REJECTION LOGS AND EMAIL (2.5)
app.post("/api/requests/:id/reject", authenticateToken, requireStaffReady, async (req, res) => {
  try {
    if (req.user.role !== ROLES.STAFF && req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({ message: "Access denied" });
    }

    const requestId = Number(req.params.id);

    const [rows] = await dbp.query(
      `SELECT r.*, res.Firstname, res.Email
       FROM requests r
       JOIN residents res ON res.ResidentID = r.ResidentID
       WHERE r.RequestID = ?`,
      [requestId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Request not found" });
    }

    const requestData = rows[0];

    // Update Status with Staff ID
    await dbp.query(
      `UPDATE requests
       SET Status = 'Rejected', ProcessedBy = ?, DateProcessed = NOW()
       WHERE RequestID = ?`,
      [req.user.id, requestId]
    );

    // Add to Request Logs
    await dbp.query(
      `INSERT INTO request_logs (RequestID, StaffID, Status, ActionDate)
       VALUES (?, ?, ?, NOW())`,
      [requestId, req.user.id, "Rejected"]
    );

    const subject = "Barangay E-Docs - Request Rejected";
    const body = `Hello ${requestData.Firstname}, your request ${requestData.ReferenceNo} has been REJECTED. Please contact the barangay office for details.`;

    // Notify via Email
    await transporter.sendMail({
      from: process.env.EMAIL,
      to: requestData.Email,
      subject,
      text: body
    });

    // Log the email action
    if (typeof logEmail === "function") {
      await logEmail({
        req,
        requestId,
        referenceNo: requestData.ReferenceNo,
        recipientEmail: requestData.Email,
        subject,
        body,
        direction: "outgoing",
        status: "sent"
      });
    }

    return res.json({ message: "Request has been rejected and resident notified." });
  } catch (error) {
    console.error("Reject Error:", error);
    return res.status(500).json({ message: "Database error" });
  }
});


/* ======================================================
   GLOBAL ERROR HANDLER (POINT #9 FIX)
   - Nilalagay ito sa PINAKABABA ng index.js
   - Sasalo sa Multer errors at iba pang server errors
   ====================================================== */
app.use((err, req, res, next) => {
  // 1. Check kung ang error ay galing sa Multer (e.g., File too large)
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "File is too large. Maximum limit is 5MB." });
    }
    return res.status(400).json({ message: err.message });
  }

  // 2. Check kung ang error ay galing sa ating custom fileFilter (Invalid Type)
  if (err.message.includes("Invalid file type")) {
    return res.status(400).json({ message: err.message });
  }

  // 3. Fallback para sa lahat ng ibang hindi inaasahang errors
  console.error("🔥 Server Error:", err.stack);
  res.status(500).json({ message: "Something went wrong on the server." });
});

/* ======================================================
BASIC HEALTH CHECK
======================================================*/
app.get("/", (req, res) => {
  res.send("Barangay E-Docs API is running");
});

/* ======================================================
START SERVER
======================================================*/
const PORT = process.env.PORT || 5000;


app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

