// الحصول على العناصر من الـ DOM
const ingredientsInput = document.getElementById('ingredients');
const suggestBtn = document.getElementById('suggest-btn');
const recipeResult = document.getElementById('recipe-result');
const loadingDiv = document.getElementById('loading');

// عنوان الـ API الخاص بخادمنا الوكيل (Proxy Server)
const PROXY_API_URL = 'http://localhost:3001/recipe';

// دالة لاستدعاء الـ API المحلي وعرض الوصفة
async function generateRecipe() {
    const ingredients = ingredientsInput.value.trim();

    if (!ingredients) {
        alert('الرجاء إدخال مكون واحد على الأقل!');
        return;
    }

    // إظهار رسالة التحميل وإخفاء النتائج القديمة
    loadingDiv.classList.remove('hidden');
    recipeResult.classList.add('hidden');

    try {
        // --- التعديل الرئيسي هنا ---
        // نستدعي خادمنا المحلي بدلاً من Google API
        const response = await fetch(PROXY_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            // نرسل المكونات في جسم الطلب بصيغة JSON بسيطة
            body: JSON.stringify({ ingredients: ingredients })
        });

        // التحقق مما إذا كانت الاستجابة ناجحة
        if (!response.ok) {
            // محاولة قراءة رسالة الخطأ من الخادم
            const errorData = await response.json();
            throw new Error(errorData.error || 'فشل في جلب الوصفة.');
        }

        // الخادم يعيد استجابة من هيئة { ok: true, recipe: {...} }
        const data = await response.json();
        
        // التأكد من أن الخادم أرسل بيانات صحيحة
        if (data.ok && data.recipe) {
            const recipe = data.recipe;
            // عرض الوصفة
            displayRecipe(recipe);
        } else {
            // في حال كانت الاستجابة لا تحتوي على وصفة
            throw new Error(data.error || 'لم يتم العثور على وصفة.');
        }

    } catch (error) {
        console.error('Error:', error);
        recipeResult.innerHTML = `<p style="color: red;">حدث خطأ: ${error.message}. حاول مرة أخرى.</p>`;
        recipeResult.classList.remove('hidden');
    } finally {
        // إخفاء رسالة التحميل
        loadingDiv.classList.add('hidden');
    }
}

// دالة لعرض بيانات الوصفة في الصفحة
function displayRecipe(recipe) {
    recipeResult.innerHTML = `
        <h2>${recipe.title}</h2>
        <p><strong>وقت التحضير:</strong> ${recipe.time} دقيقة</p>
        <p><strong>نصيحة صحية:</strong> ${recipe.healthTip}</p>
        
        <h3>المكونات:</h3>
        <ul>
            ${recipe.ingredients.map(ing => `<li>${ing}</li>`).join('')}
        </ul>

        <h3>طريقة التحضير:</h3>
        <ol>
            ${recipe.steps.map(step => `<li>${step}</li>`).join('')}
        </ol>
    `;
    recipeResult.classList.remove('hidden');
}

// إضافة حدث النقر على الزر
suggestBtn.addEventListener('click', generateRecipe);

// السماح بالضغط على Enter في حقل الإدخال
ingredientsInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        generateRecipe();
    }
});