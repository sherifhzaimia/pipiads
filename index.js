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

// دالة لإعادة المحاولة
async function retry(fn, retries = 3, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      console.log(`محاولة ${i + 1} فشلت. سبب الخطأ:`, err.message);
      if (i === retries - 1) throw err;
      console.log(`انتظار ${delay}ms قبل المحاولة التالية...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

async function extractSessionToken(res) {
  let browser = null;
  try {
    console.log("بدء تشغيل المتصفح...");
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process',
        '--no-zygote',
        '--disable-gpu',
        '--no-first-run',
        '--no-startup-window',
        '--deterministic-fetch',
        '--disable-features=IsolateOrigins',
        '--disable-site-isolation-trials'
      ]
    });

    const page = await browser.newPage();
    
    // تعيين حجم الصفحة
    await page.setViewport({
      width: 1366,
      height: 768
    });

    console.log("الانتقال إلى صفحة تسجيل الدخول...");
    await retry(async () => {
      await page.goto("https://pipiads.com/login", {
        waitUntil: ['load', 'networkidle0'],
        timeout: 120000
      });
    });

    // انتظار قصير للتأكد من تحميل الصفحة بالكامل
    await page.waitForTimeout(5000);

    console.log("البحث عن حقل البريد الإلكتروني...");
    await retry(async () => {
      await page.waitForSelector('input[placeholder="Veuillez saisir votre adresse e-mail"]', {
        timeout: 60000,
        visible: true
      });
    });

    await page.type('input[placeholder="Veuillez saisir votre adresse e-mail"]', "hzaimiacherif@gmail.com", {
      delay: 100 // إضافة تأخير بين الأحرف
    });

    console.log("البحث عن حقل كلمة المرور...");
    await retry(async () => {
      await page.waitForSelector('input[placeholder="Veuillez saisir votre mot de passe"]', {
        timeout: 60000,
        visible: true
      });
    });

    await page.type('input[placeholder="Veuillez saisir votre mot de passe"]', "ch0793478417", {
      delay: 100
    });

    console.log("النقر على زر تسجيل الدخول...");
    await retry(async () => {
      await page.waitForSelector('button.el-button--primary', {
        timeout: 60000,
        visible: true
      });
      await page.click('button.el-button--primary');
    });

    console.log("انتظار اكتمال عملية تسجيل الدخول...");
    await page.waitForNavigation({
      waitUntil: 'networkidle0',
      timeout: 120000
    });

    const cookies = await page.cookies();
    await Session.deleteMany({});
    console.log("تم حذف الجلسات القديمة.");

    const sessionToken = cookies.find(cookie => cookie.name === "PP-userInfo");

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
      console.log("تم حفظ توكن الجلسة بنجاح في MongoDB Atlas.");
      res.json({ success: true, token: sessionData });
    } else {
      console.log("لم يتم العثور على توكن الجلسة.");
      res.json({ success: false, message: "لم يتم العثور على توكن الجلسة." });
    }

  } catch (error) {
    console.error("حدث خطأ:", error);
    res.status(500).json({ 
      success: false, 
      message: "حدث خطأ أثناء استخراج التوكين.",
      error: error.message 
    });
  } finally {
    if (browser) {
      console.log("إغلاق المتصفح...");
      await browser.close();
    }
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