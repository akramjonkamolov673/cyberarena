# Cyber Arena

Cyber Arena — bu o‘qituvchi va talabalar uchun onlayn kodlash va test platformasi.

## Arxitektura

- **Backend**: Django 5 + Django REST Framework
  - JWT + HttpOnly cookie asosidagi autentifikatsiya
  - Google va GitHub orqali OAuth login
  - Testlar, kod masalalar, CodeBattle guruhlari uchun REST API
  - Kodni tashqi Piston API orqali xavfsiz ishga tushirish
- **Frontend**: React + TypeScript + Vite
  - Talaba va o‘qituvchi uchun alohida panellar
  - Single Page Application (SPA) routing (`react-router-dom`)
  - API bilan `fetch`/`axios` orqali ishlash

## Asosiy funksiyalar

- **Ro‘yxatdan o‘tish va login**
  - Oddiy username/parol orqali login
  - Google / GitHub bilan autentifikatsiya
  - Tokenlar backend tomonidan cookie va `Authorization: Bearer` orqali boshqariladi

- **O‘qituvchi paneli (TeacherPanel)**
  - **Savollar boshqaruvi**: test savollarini yaratish, tahrirlash, o‘chirish
  - **CodeTrain**: kod masalalarini yaratish va talabalar uchun e’lon qilish
  - **CodeBattle**: guruhlar va musobaqaviy challange’lar boshqaruvi
  - **Javoblarni ko‘rish**: talabalar topshirgan javoblarni ko‘rish va tahlil qilish

- **Talaba paneli (StudentPanel)**
  - **Savollar bo‘limi**: testlarni ko‘rish, yechish va javoblarni yuborish
  - **CodeTrain**: turli dasturlash masalalarini Piston yordamida online ishga tushirish
  - **CodeBattle**: o‘qituvchi yaratgan guruhlardagi musobaqalarda qatnashish

- **Kod bajarish (run_code)**
  - Backend `/api/run-code/` endpointi orqali Piston API’ga proksi qilib so‘rov yuboradi
  - Piston API kaliti `PISTON_API_KEY` environment o‘zgaruvchisida saqlanadi
  - Frontend hech qachon API keyni ko‘rmaydi, faqat backend bilan gaplashadi

## Backendni ishga tushirish

1. **Talablar**:
   - Python 3.10+
   - PostgreSQL

2. **Virtual environment va kutubxonalar**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **.env fayl** (`backend/.env.example` dan nusxa olish):
   - `SECRET_KEY`
   - `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`
   - `PISTON_API_KEY` (ixtiyoriy, mavjud bo‘lsa Authorization header orqali yuboriladi)
   - OAuth sozlamalari: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`

4. **Migratsiyalar va server**:
   ```bash
   python manage.py migrate
   python manage.py runserver
   ```

Backend API URL’lari odatda `http://127.0.0.1:8000/` orqali ishlaydi.

## Frontendni ishga tushirish

1. **Talablar**:
   - Node.js (LTS versiya)

2. **O‘rnatish va dev server**:
   ```bash
   cd fronted
   npm install
   npm run dev
   ```

3. Brauzer orqali `http://localhost:5173/` ga o‘ting.

`fronted/.env` ichida backend bazaviy URL’ini (`VITE_API_BASE_URL`) mos ravishda sozlash mumkin.

## Rollar va ish jarayoni

1. Foydalanuvchi ro‘yxatdan o‘tadi yoki login qiladi (oddiy yoki OAuth).
2. Backend JWT token yaratib, cookie va javob bodysida qaytaradi.
3. Frontend tokenni localStorage va cookie orqali saqlab, har bir API so‘rovda yuboradi.
4. O‘qituvchi testlar, kod masalalari va CodeBattle guruhlarini yaratadi.
5. Talabalar o‘z panelida testlarni bajaradi, kod yozadi va natijani real vaqtda ko‘radi.
6. O‘qituvchi natijalarni kuzatadi va tahlil qiladi.

## Hissa qo‘shish

- Kod stilini saqlash uchun `eslint` va TypeScript qoidalariga rioya qiling.
- Yangi endpoint qo‘shganda, mos frontend servislarini (`src/services/api.ts`) yangilang.
- Xavfsizlik uchun barcha maxfiy kalitlarni `.env` fayllarda saqlang, repoga qo‘shmang.
