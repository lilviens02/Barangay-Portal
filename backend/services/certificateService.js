const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const generateCertificate = (data, filePath) => {
  return new Promise((resolve, reject) => {
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });

      const doc = new PDFDocument({
        size: "A4",
        margin: 50
      });

      const stream = fs.createWriteStream(filePath);
      stream.on("finish", resolve);
      stream.on("error", reject);

      doc.pipe(stream);

      const logoPath = path.join(__dirname, "..", "assets", "barangay-logo.png");
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 240, 35, { width: 80 });
      }

      doc.moveDown(3);
      doc.font("Helvetica-Bold").fontSize(18).text("Republic of the Philippines", { align: "center" });
      doc.font("Helvetica-Bold").fontSize(20).text("BARANGAY CERTIFICATE", { align: "center" });
      doc.moveDown(1);

      doc
        .font("Helvetica")
        .fontSize(13)
        .text(`Name: ${data.name}`)
        .text(`Document Type: ${data.document}`)
        .text(`Purpose: ${data.purpose}`)
        .text(`Reference No.: ${data.reference}`)
        .text(`Date Issued: ${data.date}`);

      doc.moveDown(2);
      doc.fontSize(12).text("This certificate is issued by the Barangay Office.", {
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