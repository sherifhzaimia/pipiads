const puppeteer = require("puppeteer");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

// تمكين CORS فقط للطلبات القادمة من https://app.inno-acc.com
app.use(cors({
 origin: ['https://app.inno-acc.com',
   'chrome-extension://imhiiignfblghjjhpjfpgedinddaobjf']
}));

// الاتصال بقاعدة بيانات MongoDB Atlas
mongoose.connect('mongodb+srv://sherif_hzaimia:ch0793478417@cluster0.oth1w.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB Atlas');
}).catch((error) => {
  console.error('Error connecting to MongoDB:', error);
});

// إنشاء نموذج للجلسات
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

    const page = await browser.newPage();

    // الذهاب إلى صفحة تسجيل الدخول لـ pipiads
    await page.goto("https://pipiads.com/login", {
      waitUntil: "networkidle2",
      timeout: 120000, //  120 ثانية  
    });

    // إدخال البريد الإلكتروني
    await page.type('input[placeholder="Veuillez saisir votre adresse e-mail"]', "spyessentials2024@outlook.com");

    // إدخال كلمة المرور
    await page.type('input[placeholder="Veuillez saisir votre mot de passe"]', "ScboLi12.");

    // النقر على زر تسجيل الدخول
    await page.click('button.el-button--primary');

    // الانتظار حتى يتم التوجيه بعد تسجيل الدخول
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 });

    // استخراج الكوكيز بعد تسجيل الدخول
    const cookies = await page.cookies();

    // حذف الجلسات القديمة
    await Session.deleteMany({});
    console.log("Old sessions deleted.");

    // البحث عن توكين الجلسة
    const sessionToken = cookies.find(
      (cookie) => cookie.name === "PP-userInfo"
    );

    if (sessionToken) {
      // حفظ التوكين في قاعدة البيانات
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

      // إرسال التوكين كاستجابة لـ API
      res.json({ success: true, token: sessionData });
    } else {
      console.log("لم يتم العثور على توكين الجلسة.");
      res.json({ success: false, message: "لم يتم العثور على توكين الجلسة." });
    }

    // إغلاق المتصفح
    await browser.close();
  } catch (error) {
    console.error("حدث خطأ:", error);
    res.status(500).json({ success: false, message: "حدث خطأ أثناء استخراج التوكين." });
  }
}

// نقطة النهاية الجديدة لجلب أحدث بيانات الجلسة
app.get("/get-session", async (req, res) => {
  try {
    // استرجاع أحدث جلسة من قاعدة البيانات
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
