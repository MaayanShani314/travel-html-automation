require("dotenv").config();
const Airtable = require("airtable");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

// הגדרת חיבור ל-Airtable
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);

const TABLE_NAME = "Requests";

// מייצר HTML מותאם מהרשומה
function generateHTML(record) {
  const { Email, Location, Notes } = record.fields;

  return `
    <html>
      <body>
        <h2>Travel Request Summary</h2>
        <p><strong>Email:</strong> ${Email}</p>
        <p><strong>Location:</strong> ${Location}</p>
        <p><strong>Notes:</strong> ${Notes || "None"}</p>
      </body>
    </html>
  `;
}

// שומר את קובץ ה-HTML על דיסק
function saveHTMLToFile(html, recordId) {
  const fileName = `request_${recordId}.html`;
  const filePath = path.join(__dirname, fileName);

  fs.writeFileSync(filePath, html);
  return filePath;
}

// שליחת אימייל
async function sendEmail(to, htmlContent) {
  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: "Your Travel Request Summary",
    html: htmlContent,
  });

  console.log("Email sent to:", to);
}

// עדכון הסטטוס ב-Airtable ל-Done
async function markAsCompleted(recordId) {
  await base(TABLE_NAME).update(recordId, {
    Status: "Done",
  });

  console.log(`Record ${recordId} marked as Done`);
}

// הקוד הראשי
async function run() {
  console.log("Starting automation...");

  try {
    const records = await base(TABLE_NAME)
      .select({
        filterByFormula: `{Status} = 'New'`,
      })
      .all();

    console.log(`Found ${records.length} new requests`);

    for (const record of records) {
      console.log("Processing record:", record.fields);

      const html = generateHTML(record);

      const filePath = saveHTMLToFile(html, record.id);
      console.log("HTML file saved:", filePath);

      await sendEmail(record.fields.Email, html);

      await markAsCompleted(record.id);

      console.log("Finished record:", record.id);
    }

    console.log("Done.");

  } catch (err) {
    console.error("Error:", err);
  }
}

run();
