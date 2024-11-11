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
        "--memory-pressure-off",
      ]
    });

    const page = await browser.newPage();

    // الذهاب إلى صفحة تسجيل الدخول لـ Pipiads
    await page.goto("https://pipiads.com/login", {
      waitUntil: "networkidle2",
      timeout: 120000,
    });

    // انتظار تحميل حقل البريد الإلكتروني
    await page.waitForSelector('input[placeholder="Veuillez saisir votre adresse e-mail"]', { timeout: 10000 });
    await page.type('input[placeholder="Veuillez saisir votre adresse e-mail"]', "spyessentials2024@outlook.com");

    // انتظار تحميل حقل كلمة المرور
    await page.waitForSelector('input[placeholder="Veuillez saisir votre mot de passe"]', { timeout: 10000 });
    await page.type('input[placeholder="Veuillez saisir votre mot de passe"]', "ScboLi12.");

    // الانتظار لمدة قصيرة للتأكد من تحميل العناصر
    await page.waitForTimeout(3000);

    // النقر على زر تسجيل الدخول
    await page.click('button.el-button--primary');

    // الانتظار حتى يتم التوجيه بعد تسجيل الدخول
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 });

    // استخراج الكوكيز بعد تسجيل الدخول
    const cookies = await page.cookies();

    // حذف الجلسات القديمة
    await Session.deleteMany({});
    console.log("تم حذف الجلسات القديمة.");

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
      console.log("تم حفظ توكين الجلسة بنجاح في MongoDB Atlas.");

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
    res.status(500).json({ success: false, message: "حدث خطأ أثناء استخراج التوكين.", error: error.message });
  }
}
