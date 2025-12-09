require("dotenv").config();
const Airtable = require("airtable");

// הגדרת החיבור ל-Airtable
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);

const TABLE_NAME = "Requests";

async function run() {
  console.log("Starting automation...");

  try {
    // שולף רק רשומות עם Status = "New"
    const records = await base(TABLE_NAME)
      .select({
        filterByFormula: `{Status} = 'New'`,
      })
      .all();

    console.log(`Found ${records.length} new requests`);

    // הדפסה של התוכן (בשלב הבא נטפל בזה)
    records.forEach((record) => {
      console.log("Record found:", record.fields);
    });

    console.log("Done.");

  } catch (err) {
    console.error("Error:", err);
  }
}

run();
