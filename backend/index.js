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
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

require("dotenv").config();
require("./services/emailListener");
const generateCertificate = require("./services/certificateService");


const app = express();

app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use(limiter);

app.use(cors());

app.use(express.json());


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

app.use("/uploads", express.static("uploads"));



/* ======================================================
FILE UPLOAD CONFIGURATION (UPDATED VERSION)
======================================================*/
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    // Ngayon gagana na ito dahil may require("path") na tayo sa taas
    const ext = path.extname(file.originalname);
    
    // Random hex + timestamp para siguradong unique
    const uniqueName = Date.now() + "-" + crypto.randomBytes(4).toString("hex") + ext;
    
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["application/pdf", "image/png", "image/jpeg"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"), false);
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
    "SELECT * FROM barangay_staff WHERE Email = ?",
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

    createDefaultAdmin();
    createDefaultStaff();
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
// <--- nadadag --->
 const logEmail = async ({ 
  requestId = null,
  referenceNo = null,
  recipientEmail = null,
  subject,
  body,
  direction,
  status = null, 
}) => {
  //new 
  await dbp.query(`INSERT INTO email_audit_logs
    (RequestID, ReferenceNo, RecipientEmail, Subject, Body, Direction, Status, CreatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [requestId, referenceNo, recipientEmail, subject, body, direction, status]
  );
};

// <--- HANGGANG DITO --->

/* ======================================================
CREATE DOCUMENT REQUEST (FR2)
- generates reference number
- saves uploaded file
- sends confirmation email
======================================================*/
app.post("/api/requests", authenticateToken, upload.single("file"), async (req, res) => {
  try {
    if (req.user.role !== "resident") {
      return res.status(403).json({ message: "Residents only" });
    }

    const user_id = req.user.id;
    const { documentType, purpose } = req.body;
    const filePath = req.file ? req.file.filename : null;

    if (!documentType || !purpose) {
      return res.status(400).json({ message: "Document type and purpose are required" });
    }

    // 1. Check for duplicates
    const [duplicateRows] = await dbp.query(
      `SELECT RequestID FROM requests 
       WHERE ResidentID = ? AND DocumentType = ? AND Purpose = ? 
       AND Status IN ('Pending', 'Approved')`,
      [user_id, documentType, purpose]
    );

    if (duplicateRows.length > 0) {
      return res.status(400).json({ message: "Duplicate request already exists" });
    }

    // 2. Generate Reference Number
    const year = new Date().getFullYear();
    const [lastRows] = await dbp.query("SELECT MAX(RequestID) as lastID FROM requests");
    const number = String((lastRows[0].lastID || 0) + 1).padStart(4, "0");
    const reference = `BRGY-${year}-${number}`;

    // 3. Insert to Database (FIXED: Added insertResult here)
    const [insertResult] = await dbp.query(
      `INSERT INTO requests (ReferenceNo, ResidentID, DocumentType, Purpose, FilePath, Status, DateSubmitted)
       VALUES (?, ?, ?, ?, ?, 'Pending', NOW())`,
      [reference, user_id, documentType, purpose, filePath]
    );

    // KUKUNIN ANG ID PARA SA LOG
    const newRequestId = insertResult.insertId; 
    // 4. Email Notification & Logging
    const [userResult] = await dbp.query(
      "SELECT Email, Firstname FROM residents WHERE ResidentID = ?",
      [user_id]
    );

    if (userResult.length > 0) {
      const emailBody = `Good day ${userResult[0].Firstname},

Your request has been submitted successfully.
Reference Number: ${reference}
Document Type: ${documentType}
Purpose: ${purpose}`;

      // ✅ EMAIL FAIL SAFE START
      try {
        await transporter.sendMail({
          from: process.env.EMAIL,
          to: userResult[0].Email,
          subject: `Barangay Request Submitted - ${reference}`,
          text: emailBody
        });

        await logEmail({
          requestId: newRequestId,
          referenceNo: reference,
          recipientEmail: userResult[0].Email,
          subject: `Barangay Request Submitted - ${reference}`,
          body: emailBody,
          direction: "outgoing",
          status: "sent"
        });
        
        console.log(`✅ Email sent & logged for ${reference}`);
      } catch (err) {
        // Kapag nag-fail ang email, mag-log lang sa console pero TULOY PA RIN ang response
        console.error("❌ Email failed but request was saved:", err);
      }
      // ✅ EMAIL FAIL SAFE END
    }

    return res.json({
      message: "Request submitted successfully",
      reference: reference
    });

  } catch (error) {
    console.error("Request submit error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});






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
CERTIFICATE FETCH ROUTE (ILAGAY DITO)
======================================================*/

app.get("/api/certificates/:id", authenticateToken, requireStaffReady, async (req, res) => {
  try {
    if (req.user.role !== "staff" && req.user.role !== "superadmin") {
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
  if (!firstname || !lastname || !gender || !email || !password) {
    return res.status(400).json({ message: "Required fields missing" });
  }

  // 2. EMAIL FORMAT VALIDATION
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  try {
    // 3. HASH THE PASSWORD
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. SQL QUERY (Idinagdag ang AccountStatus at "Pending" value)
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
        email,
        hashedPassword,
        "Pending" // <--- Eto yung instruction ni sir (Default Status)
      ],
      (err) => {
        // 5. DATABASE ERROR HANDLING
        if (err) {
          if (err.code === "ER_DUP_ENTRY") {
            return res.status(400).json({ message: "Email already exists" });
          }
          return res.status(500).json({ message: "Database error" });
        }

        // 6. SEND CONFIRMATION EMAIL
        transporter.sendMail({
          from: process.env.EMAIL,
          to: email,
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

  // 2. Validation: Fullname at Email lang ang mandatory
  if (!fullname || !email) {
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
        email,
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
LOGIN ROUTE (FINAL SECURE VERSION)
- Supports: Residents, Staff, Superadmin
- Checks: Password, Account Status (Pending/Approved), 
  and Password Change requirements
======================================================*/
app.post("/api/login", async (req, res) => {
  const { email, password, role } = req.body;

  let table = "";
  let sql = "";
  let values = [];

  // 1. DETERMINE TABLE BASED ON ROLE
  if (role === "resident") {
    table = "residents";
    sql = `SELECT * FROM residents WHERE Email = ?`;
    values = [email];
  } else if (role === "staff") {
    table = "barangay_staff";
    sql = `SELECT * FROM barangay_staff WHERE Email = ? AND RoleName = 'staff'`;
    values = [email];
  } else if (role === "superadmin") {
    table = "barangay_staff";
    sql = `SELECT * FROM barangay_staff WHERE Email = ? AND RoleName = 'superadmin'`;
    values = [email];
  } else {
    return res.status(400).json({ message: "Invalid role" });
  }

  db.query(sql, values, async (err, results) => {
    if (err) return res.status(500).json({ message: "Database error" });
    
    // 2. CHECK IF USER EXISTS
    if (results.length === 0) {
      return res.status(400).json({ message: "User not found" });
    }

    const user = results[0];

    // 3. VERIFY PASSWORD
    const match = await bcrypt.compare(password, user.PasswordHash);
    if (!match) return res.status(400).json({ message: "Wrong password" });

    
    // Haharangin ang resident kung hindi pa 'Approved' ang AccountStatus
    if (role === "resident" && user.AccountStatus !== "Approved") {
      return res.status(403).json({
        message: "Your account is still pending approval. Please wait for the barangay staff to verify your registration."
      });
    }

    // 4. PREPARE USER DATA FOR TOKEN
    const userId = table === "residents" ? user.ResidentID : user.StaffID;
    const userRole = user.RoleName || "resident";
    
    // 5. STAFF PASSWORD CHANGE CHECK 
    const mustChange = user.MustChangePassword === 1;

    // 6. GENERATE JWT TOKEN
    const token = jwt.sign(
      {
        id: userId,
        role: userRole,
        mustChangePassword: mustChange
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

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
   PART D: APPROVE RESIDENT
   - Action para maging 'Approved' ang account
   ======================================================*/
app.put("/api/residents/:id/approve", authenticateToken, requireStaffReady, async (req, res) => {
  if (req.user.role !== "staff" && req.user.role !== "superadmin") {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    await dbp.query(
      `UPDATE residents
       SET AccountStatus = 'Approved',
           ApprovedBy = ?,
           ApprovedAt = NOW()
       WHERE ResidentID = ?`,
      [req.user.id, req.params.id]
    );
    res.json({ message: "Resident approved successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Database error" });
  }
});

/* ======================================================
   PART E: REJECT RESIDENT
   - Action para i-reject ang registration
   ======================================================*/
app.put("/api/residents/:id/reject", authenticateToken, requireStaffReady, async (req, res) => {
  if (req.user.role !== "staff" && req.user.role !== "superadmin") {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    await dbp.query(
      `UPDATE residents
       SET AccountStatus = 'Rejected',
           ApprovedBy = ?,
           ApprovedAt = NOW()
       WHERE ResidentID = ?`,
      [req.user.id, req.params.id]
    );
    res.json({ message: "Resident rejected successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Database error" });
  }
});






/* ======================================================
UPDATE REQUEST STATUS (FINAL VERSION)
- adds email notification
- adds logging (timestamp + staffID
======================================================*/
app.put("/api/requests/:id/status", authenticateToken, requireStaffReady, async (req, res) => {
  try {
    if (req.user.role !== "staff" && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { id } = req.params;
    const staff_id = req.user.id;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    await dbp.query(
      `UPDATE requests
       SET Status = ?, ProcessedBy = ?, DateProcessed = NOW()
       WHERE RequestID = ?`,
      [status, staff_id, id]
    );

    const [result] = await dbp.query(
      `SELECT r.*, u.Email, u.Firstname, u.Lastname
       FROM requests r
       JOIN residents u ON r.ResidentID = u.ResidentID
       WHERE r.RequestID = ?`,
      [id]
    );

    if (result.length === 0) {
      return res.status(404).json({ message: "Request not found" });
    }

    const data = result[0];

    await transporter.sendMail({
      from: process.env.EMAIL,
      to: data.Email,
      subject: "Barangay Request Update",
      text: `Good day!

Your request with reference number ${data.ReferenceNo} has been ${status}.

Thank you for using Barangay E-Docs System.`
    });

    await logEmail({
      requestId: data.RequestID,
      referenceNo: data.ReferenceNo,
      recipientEmail: data.Email,
      subject: "Barangay Request Update",
      body: `Your request with reference number ${data.ReferenceNo} has been ${status}.`,
      direction: "outgoing",
      status: "sent"
    });

    if (String(status).toLowerCase() === "approved") {
      const certificatePath = `certificates/${data.ReferenceNo}.pdf`;

      await generateCertificate(
        {
          name: `${data.Firstname} ${data.Lastname}`,
          document: data.DocumentType,
          purpose: data.Purpose,
          reference: data.ReferenceNo,
          date: new Date().toLocaleDateString(),
          signedBy: req.user.id
        },
        certificatePath
      );

      await dbp.query(
        `INSERT INTO certificates
         (RequestID, ReferenceNo, CertName, Description, DateIssued, SignedBy, FilePath)
         VALUES (?, ?, ?, ?, NOW(), ?, ?)`,
        [
          data.RequestID,
          data.ReferenceNo,
          data.DocumentType,
          data.Purpose,
          staff_id,
          certificatePath
        ]
      );
    }

    await dbp.query(
      `INSERT INTO request_logs
       (RequestID, StaffID, Status, ActionDate)
       VALUES (?, ?, ?, NOW())`,
      [id, staff_id, status]
    );

    return res.json({ message: "Updated successfully" });
  } catch (error) {
    console.error("Update request status error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

/* BUBURAHIN PAG GUMANA NA YUNG EMAIL FUNCTIONALITY, KASI MAY KINALAMAN YUNG PAG-APPROVE SA PAG-GENERATE NG CERTIFICATE, AT AYAW NATIN MA-DISTURB YUNG FLOW NA YUN. 
app.put("/api/requests/:id/status", authenticateToken, requireStaffReady, (req, res) => {

  if (req.user.role !== "staff" && req.user.role !== "superadmin") {
    return res.status(403).json({ message: "Access denied" });
  }

  const { id } = req.params;
  const staff_id = req.user.id;
  const { status } = req.body;

  db.query(
    `UPDATE requests
     SET Status=?, ProcessedBy=?, DateProcessed=NOW()
     WHERE RequestID=?`,
    [status, staff_id, id],
    (err) => {

      if (err) {
        console.log("❌ UPDATE ERROR:", err);
        return res.status(500).json({ message: "Update failed" });
      }

      // 🔥 GET REQUEST DETAILS
      db.query(`
        SELECT r.*, u.Email
        FROM requests r
        JOIN residents u ON r.ResidentID = u.ResidentID
        WHERE r.RequestID = ?
      `, [id], (err, result) => {

        if (err) {
          console.log("❌ QUERY ERROR:", err);
          return;
        }

        console.log("DEBUG RESULT:", result);

        if (result.length > 0) {

          const data = result[0];

          console.log("📧 Sending email to:", data.Email);

          // ✅ SEND EMAIL (WITH ERROR LOGGING)
          transporter.sendMail({
            from: process.env.EMAIL,
            to: data.Email,
            subject: "Barangay  Request Update",
            text: `Good day!

              Your request with reference number ${data.ReferenceNo} has been ${status}.

              Thank you for using Barangay E-Docs System.`
              
          }, (err, info) => {
            if (err) {
              console.log("❌ Email failed:", err);
            } else {
              console.log("✅ Email sent:", info.response);
            }
          });

          // ✅ AUTO GENERATE CERTIFICATE
           if (status.toLowerCase() === "approved") {

  const filePath = `certificates/${data.ReferenceNo}.pdf`;

  generateCertificate({
    name: data.Firstname + " " + data.Lastname,
    document: data.DocumentType,
    purpose: data.Purpose,
    reference: data.ReferenceNo,
    date: new Date().toLocaleDateString()
  }, filePath);

  db.query(`
    INSERT INTO certificates
    (RequestID, ReferenceNo, CertName, Description, DateIssued, SignedBy, FilePath)
    VALUES (?, ?, ?, ?, NOW(), ?, ?)
  `, [
    data.RequestID,
    data.ReferenceNo,
    data.DocumentType,
    data.Purpose,
    staff_id,
    filePath
  ]);

}
          // ✅ LOGGING
          db.query(`
            INSERT INTO request_logs
            (RequestID, StaffID, Status, ActionDate)
            VALUES (?, ?, ?, NOW())
          `, [id, staff_id, status]);

        } else {
          console.log("❌ No data found for request ID:", id);
        }

      });

      res.json({ message: "Updated successfully" });

    }
  );

});*/


/* ======================================================
DOWNLOAD CERTIFICATE
======================================================*/
app.get("/api/certificates/download/:reference", authenticateToken, requireStaffReady, (req,res)=>{
  if (req.user.role !== "staff" && req.user.role !== "superadmin") {
    return res.status(403).json({ message: "Access denied" });
  }
const { reference } = req.params;

  db.query(
    "SELECT FilePath FROM certificates WHERE ReferenceNo=?",
    [reference],
    (err,result)=>{

      if(err || result.length === 0){
        return res.status(404).json({message:"Certificate not found"});
      }

      res.download(result[0].FilePath);

    }
  );

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
