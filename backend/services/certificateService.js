const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const generateCertificate = (data, filePath) => {
  return new Promise((resolve, reject) => {
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });

      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const stream = fs.createWriteStream(filePath);

      stream.on("finish", resolve);
      stream.on("error", reject);

      doc.pipe(stream);

      doc.fontSize(22).text("BARANGAY CERTIFICATE", { align: "center" });
      doc.moveDown(1);

      doc.fontSize(14).text(`Name: ${data.name}`);
      doc.text(`Document Type: ${data.document}`);
      doc.text(`Purpose: ${data.purpose}`);
      doc.text(`Reference No.: ${data.reference}`);
      doc.text(`Date Issued: ${data.date}`);
      doc.moveDown(2);

      doc.text("This certificate is issued by the Barangay Office.", {
        align: "left"
      });

      doc.moveDown(3);
      doc.text("__________________________", { align: "right" });
      doc.text(`Signed By: ${data.signedBy}`, { align: "right" });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = generateCertificate;