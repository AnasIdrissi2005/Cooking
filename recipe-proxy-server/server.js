// server.js

// 1. استيراد الحزم المطلوبة
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fetch = require('node-fetch');

// 2. تحميل المتغيرات من ملف .env
dotenv.config();

// 3. التحقق من وجود مفتاح API
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
    console.error('FATAL ERROR: API_KEY is not defined in the .env file.');
    process.exit(1);
}

// 4. إعداد تطبيق Express
const app = express();
const PORT = process.env.PORT || 3001;

// 5. تفعيل الـ Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// 6. تعريف الـ Endpoint الرئيسي
app.post('/recipe', async (req, res) => {
    const { ingredients } = req.body;
    if (!ingredients || typeof ingredients !== 'string' || ingredients.trim() === '') {
        return res.status(400).json({
            ok: false,
            error: 'حقل "ingredients" مطلوب ولا يمكن أن يكون فارغًا.'
        });
    }

    const prompt = `
    أنت طاهٍ محترف ومتخصص في الوصفات السريعة والصحية. سأعطيك قائمة من المكونات، وعليك أن تقترح وصفة واحدة فقط يمكن تحضيرها باستخدام هذه المكونات (مع إضافة مكونات أساسية بسيطة مثل زيت، ملح، فلفل إذا لزم الأمر).

    المكونات المتوفرة: ${ingredients}

    **مهم جدًا:** يجب أن يكون ردك بالكامل كائن JSON واحد وصالح فقط. لا تضف أي نص قبل أو بعد كائن JSON. يجب أن يحتوي كائن JSON على الحقول التالية بالضبط:
    - "title": اسم الطبق (نص).
    - "ingredients": قائمة بالمكونات المطلوبة للوصفة (مصفوفة نصية).
    - "steps": قائمة بخطوات التحضير المرقمة (مصفوفة نصية).
    - "time": وقت التحضير التقريبي بالدقائق (رقم).
    - "healthTip": نصيحة صحية بسيطة عن الطبق (نص).
    `;

    const requestBody = {
        contents: [{
            parts: [{
                text: prompt
            }]
        }]
    };

    try {
        // ✅ هنا التعديل: استعمال الموديل الصحيح
        const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!apiResponse.ok) {
            const errorBody = await apiResponse.text();
            console.error('Gemini API Error:', apiResponse.status, errorBody);
            let errorMessage = 'فشل في الاتصال بخدمة الذكاء الاصطناعي.';
            if (apiResponse.status === 429) errorMessage = 'تم تجاوز الحصة المسموح بها من API. يرجى المحاولة لاحقًا.';
            if (apiResponse.status === 400 || apiResponse.status === 403) errorMessage = 'هناك مشكلة في مفتاح API أو الطلب المرسل.';

            return res.status(apiResponse.status).json({
                ok: false,
                error: errorMessage
            });
        }

        const data = await apiResponse.json();
        const rawText = data.candidates[0].content.parts[0].text;

        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error('Could not find a JSON object in the AI response. Raw text:', rawText);
            throw new Error('لم يتمكن الذكاء الاصطناعي من توليد استجابة بصيغة JSON صحيحة.');
        }

        const jsonString = jsonMatch[0];
        const recipe = JSON.parse(jsonString);

        res.status(200).json({
            ok: true,
            recipe: recipe
        });

    } catch (error) {
        console.error('Server Error:', error.message);
        res.status(500).json({
            ok: false,
            error: 'حدث خطأ في الخادم أثناء معالجة طلبك. يرجى المحاولة مرة أخرى.'
        });
    }
});

// 7. تشغيل الخادم
app.listen(PORT, () => {
    console.log(`🚀 Proxy server is running on http://localhost:${PORT}`);
});
