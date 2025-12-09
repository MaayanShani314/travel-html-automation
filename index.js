require("dotenv").config();
const Airtable = require("airtable");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

// חיבור ל-Airtable
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);

const TABLE_NAME = "Requests";

// מייצר HTML מתוך הרשומה
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

// שמירת HTML כקובץ
function saveHTMLToFile(html, recordId) {
  const fileName = `request_${recordId}.html`;
  const filePath = path.join(__dirname, fileName);

  fs.writeFileSync(filePath, html);
  console.log("HTML saved:", filePath);

  return filePath;
}

// יצירת Transporter לשליחת מייל דרך Outlook
async function sendEmail(to, htmlContent) {
  let transporter = nodemailer.createTransport({
    host: "smtp.office365.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,  // מייל אאוטלוק
      pass: process.env.EMAIL_PASS,  // סיסמה רגילה של אאוטלוק
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

// עדכון סטטוס הרשומה ל-Done
async function markAsCompleted(recordId) {
  await base(TABLE_NAME).update(recordId, {
    Status: "Done",
  });
  console.log(`Record ${recordId} marked as Done`);
}

// הרצת התהליך המלא
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

      await sendEmail(record.fields.Email, html);

      await markAsCompleted(record.id);

      console.log("Finished record:", record.id);
    }

    console.log("Automation complete.");

  } catch (err) {
    console.error("Error:", err);
  }
}

run();
