const puppeteer = require("puppeteer");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
 origin: ['https://app.inno-acc.com',
   'chrome-extension://imhiiignfblghjjhpjfpgedinddaobjf']
}));

mongoose.connect('mongodb+srv://sherif_hzaimia:ch0793478417@cluster0.oth1w.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
}).then(() => {
  console.log('Connected to MongoDB Atlas');
}).catch((error) => {
  console.error('Error connecting to MongoDB:', error);
});

const sessionSchema = new mongoose.Schema({
  name: String,
  value: String,
  domain: String,
  path: String,
  expires: Number,
  httpOnly: Boolean,
  secure: Boolean,
});

const Session = mongoose.model('Sessionpipiads', sessionSchema);

async function extractSessionToken(res) {
  try {
    console.log("Starting browser...");
    // التغيير الرئيسي هنا - تعديل إعدادات المتصفح
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-zygote",
        "--single-process",
      ]
    });
    console.log("Browser started with GUI.");

    const page = await browser.newPage();
    console.log("Navigating to login page...");

    await page.goto("https://pipiads.com/login", {
      waitUntil: "load",
      timeout: 120000,
    });
    console.log("Login page loaded.");

    await page.waitForSelector('input[placeholder="Veuillez saisir votre adresse e-mail"]', { timeout: 60000 });
    await page.type('input[placeholder="Veuillez saisir votre adresse e-mail"]', "hzaimiacherif@gmail.com");
    console.log("Email entered.");

    await page.waitForSelector('input[placeholder="Veuillez saisir votre mot de passe"]', { timeout: 60000 });
    await page.type('input[placeholder="Veuillez saisir votre mot de passe"]', "ch0793478417");
    console.log("Password entered.");

    await page.waitForSelector('button.el-button--primary', { timeout: 60000 });
    await page.click('button.el-button--primary');
    console.log("Login button clicked.");

    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 120000 });
    console.log("Login successful, extracting cookies...");

    const cookies = await page.cookies();

    await Session.deleteMany({});
    console.log("Old sessions deleted.");

    const sessionToken = cookies.find(
      (cookie) => cookie.name === "PP-userInfo"
    );

    if (sessionToken) {
      const sessionData = new Session({
        name: sessionToken.name,
        value: sessionToken.value,
        domain: sessionToken.domain,
        path: sessionToken.path,
        expires: sessionToken.expires,
        httpOnly: sessionToken.httpOnly,
        secure: sessionToken.secure,
      });

      await sessionData.save();
      console.log("Session token saved to MongoDB Atlas successfully.");

      res.json({ success: true, token: sessionData });
    } else {
      console.log("No session token found.");
      res.json({ success: false, message: "لم يتم العثور على توكين الجلسة." });
    }

    await browser.close();
  } catch (error) {
    console.error("An error occurred:", error);
    res.status(500).json({ success: false, message: "حدث خطأ أثناء استخراج التوكين." });
  }
}

app.get("/get-session", async (req, res) => {
  try {
    const sessionData = await Session.findOne().sort({ _id: -1 });

    if (sessionData) {
      res.json({ success: true, session: sessionData });
    } else {
      res.json({ success: false, message: "No session data found." });
    }
  } catch (error) {
    console.error("Error retrieving session data:", error);
    res.status(500).json({ success: false, message: "Error retrieving session data." });
  }
});

app.get("/start-session", (req, res) => {
  extractSessionToken(res);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});