const Imap = require("node-imap");
const { simpleParser } = require("mailparser");
require("dotenv").config();
const db = require("../db");

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
    if (err) {
      console.error("IMAP inbox error:", err);
      return;
    }

    imap.on("mail", () => {
      const f = imap.seq.fetch(`${box.messages.total}:*`, { bodies: "" });

      f.on("message", (msg) => {
        msg.on("body", (stream) => {
          simpleParser(stream, async (err, parsed) => {
            if (err) return;

            const subject = parsed.subject || "";
            const body = parsed.text || "";
            const fromEmail = parsed.from?.value?.[0]?.address || "unknown";

            const match = `${subject} ${body}`.match(/BRGY-\d{4}-\d+/i);
            if (!match) return;

            const reference = match[0].toUpperCase();

            db.query(
              `SELECT RequestID FROM requests WHERE ReferenceNo = ?`,
              [reference],
              (err, result) => {
                if (err || result.length === 0) return;

                const requestId = result[0].RequestID;

                db.query(
                  `INSERT INTO messages (RequestID, Sender, Body, Timestamp)
                   VALUES (?, ?, ?, NOW())`,
                  [requestId, fromEmail, body]
                );

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