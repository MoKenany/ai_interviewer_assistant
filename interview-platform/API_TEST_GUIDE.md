# 🚀 دليل اختبار الـ API خطوة بخطوة (API Testing Guide)

هذا الدليل يحتوي على البيانات (JSON) اللازمة لاختبار السيرفر من خلال الـ **Swagger UI** (على الرابط `http://127.0.0.1:8000/docs`) أو عبر أدوات مثل Postman و cURL. يمكنك أخذ هذه البيانات "نسخ ولصق".

---

## 1. تسجيل الدخول (Login)
**المسار:** `POST /api/v1/auth/login`
أول خطوة هي تسجيل الدخول للحصول على `access_token` الخاص بك. 
*ملاحظة: في واجهة Swagger، فقط اضغط على زر **Authorize** الأخضر في الأعلى وأدخل البيانات التالية:*

**البيانات (Form Data):**
- **username**: `hr@example.com`
- **password**: `hr123`

*(بعد تسجيل الدخول في Swagger سيتم إرفاق التوكن تلقائياً مع كل الطلبات القادمة)*.

---

## 2. إنشاء وظيفة جديدة (Create Job)
**المسار:** `POST /api/v1/jobs`

**البيانات (JSON Payload):**
```json
{
  "title": "Senior Backend Developer",
  "department": "Engineering",
  "location": "Remote",
  "employment_type": "Full-time",
  "status": "open"
}
```

---

## 3. إنشاء نسخة للوظيفة وتوليد معايير بالذكاء الاصطناعي (Create Job Version)
**المسار:** `POST /api/v1/jobs/{job_id}/versions`
قم بتمرير الـ `job_id` (مثلاً `1` أو `4` حسب ما رجع لك في الخطوة السابقة). وضع `criteria_mode` على `ai` ليقوم السستم تلقائياً بقراءة الوصف الوظيفي وإنشاء معايير تقييم باستخدام Gemini!

**البيانات (JSON Payload):**
```json
{
  "version_number": 1,
  "raw_jd_text": "We are looking for a Senior Backend Developer. Requirements: 5+ years experience in Python, strong knowledge of FastAPI, asynchronous programming, PostgreSQL, and basic knowledge of Docker and CI/CD pipelines. Must have excellent communication skills.",
  "criteria_mode": "ai"
}
```
*(ملاحظة: هذا الطلب قد يأخذ بضع ثوانٍ لأن السيرفر يتصل بـ Gemini لاستخراج المعايير)*.

---

## 4. إضافة مرشح (Create Candidate)
**المسار:** `POST /api/v1/candidates`

**البيانات (JSON Payload):**
```json
{
  "full_name": "Ahmed Youssef",
  "email": "ahmed.youssef@example.com",
  "phone": "+201012345678",
  "source": "LinkedIn"
}
```

---

## 5. إنشاء تقديم على الوظيفة (Create Application)
**المسار:** `POST /api/v1/applications`

**البيانات (JSON Payload):**
```json
{
  "candidate_id": 1,
  "job_version_id": 1,
  "status": "interview"
}
```

---

## 6. إنشاء جلسة مقابلة (Create Session)
**المسار:** `POST /api/v1/sessions`

**البيانات (JSON Payload):**
```json
{
  "application_id": 1,
  "session_type": "technical"
}
```
*(خذ الـ `id` الخاص بالـ Session الذي سيظهر في الرد، سنحتاجه في الخطوة القادمة، وليكن `1`)*.

---

## 7. رفع ملف المقابلة الصوتي/الفيديو وبدء الـ Pipeline (Upload Media)
**المسار:** `POST /api/v1/sessions/{session_id}/upload`
- ضع `session_id` في المسار (مثلاً `1`).
- قم برفع ملف صوتي أو فيديو (mp3, mp4, wav, m4a, etc).
*(بمجرد رفع الملف، سيتم بدء الـ Background Tasks في الخلفية تلقائياً)*.

---

## 8. مراقبة حالة الـ Pipeline (Check Pipeline Status)
**المسار:** `GET /api/v1/sessions/{session_id}/status`
- ضع الـ `session_id` نفسه.
سيرد عليك بتقرير يوضح الخطوات الحالية وحالتها (`pending`, `running`, `success`):

**شكل الرد المتوقع:**
```json
{
  "id": 1,
  "session_id": 1,
  "status": "running",
  "started_at": "2024-05-15T12:00:00Z",
  "steps": [
    {
      "step_name": "audio_extract",
      "status": "success"
    },
    {
      "step_name": "stt",
      "status": "running"
    }
  ]
}
```

---

## 9. عرض التقييم النهائي (Get Evaluation)
**المسار:** `GET /api/v1/evaluations/session/{session_id}`
بعد أن تنتهي جميع الخطوات وتصبح حالة الـ Pipeline `completed`، قم باستدعاء هذا المسار لرؤية التقييم النهائي الشامل (الأداء، نقاط القوة، نقاط الضعف، الأسئلة المقترحة وتوصية التوظيف).

---

*(يُمكنك أيضاً استدعاء `GET /api/v1/sessions/{session_id}/artifacts` لرؤية كل تفاصيل الخطوات مثل الـ Transcript الأصلي والـ Q&A المستخرج).*
