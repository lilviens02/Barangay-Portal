const Imap = require("node-imap");
const { simpleParser } = require("mailparser");
const mysql = require("mysql2");
require("dotenv").config();

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

const imap = new Imap({
  user: process.env.EMAIL,
  password: process.env.EMAIL_PASS,
  host: "imap.gmail.com",
  port: 993,
  tls: true
});

function openInbox(cb) {
  imap.openBox("INBOX", false, cb);
}

imap.once("ready", () => {
  openInbox((err, box) => {
    if (err) throw err;

    imap.on("mail", () => {
      const f = imap.seq.fetch(box.messages.total + ":*", {
        bodies: ""
      });

      f.on("message", (msg) => {
        msg.on("body", (stream) => {
          simpleParser(stream, async (err, parsed) => {
            if (err) return;

            const subject = parsed.subject || "";
            const body = parsed.text || "";
            const fromEmail = parsed.from?.value?.[0]?.address || "resident"; // Inayos ang semicolon error

            // search reference number in subject or body
            const match = `${subject} ${body}`.match(/BRGY-\d{4}-\d+/i);

            if (!match) return;

            const reference = match[0].toUpperCase();

            db.query(
              `SELECT RequestID FROM requests WHERE ReferenceNo = ?`,
              [reference],
              (err, result) => {
                if (err || result.length === 0) return;

                const requestId = result[0].RequestID;

                // 1. I-save ang message sa messages table
                db.query(
                  `INSERT INTO messages (RequestID, Sender, Body, Timestamp)
                   VALUES (?, ?, ?, NOW())`,
                  [requestId, fromEmail, body] // Inayos: fromEmail gamit imbes na static "resident"
                );

                // 2. I-save sa email_audit_logs (FR4 Requirement ni Sir)
                db.query(
                  `INSERT INTO email_audit_logs
                   (RequestID, ReferenceNo, RecipientEmail, Subject, Body, Direction, Status, CreatedAt)
                   VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
                  [
                    requestId,
                    reference,
                  process.env.EMAIL,

                    subject,
                    body,
                    "incoming",
                    "captured"
                  ]
                );
              }
            );
          });
        });
      });
    });
  });
});

imap.connect();