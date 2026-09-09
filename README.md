# TULIP

TULIP adalah singkatan dari **Tukar Uang Logam Internal Prosegur**.

Aplikasi ini digunakan untuk mencatat penyerahan uang logam dari karyawan, memantau transaksi berdasarkan cabang, menyimpan bukti penyerahan, mengunggah bukti transfer penggantian, dan mengekspor data transaksi ke Excel.

## Teknologi

- Python
- FastAPI
- PostgreSQL
- SQLAlchemy
- HTML
- CSS
- JavaScript
- JWT Authentication
- OpenPyXL

## Hak Akses

### Superadmin

- Melihat seluruh transaksi.
- Memfilter transaksi berdasarkan cabang.
- Melihat dan mengunduh bukti transaksi.
- Mengunduh data transaksi ke Excel.
- Membuat akun baru.
- Mengedit akun.
- Mengaktifkan atau menonaktifkan akun.
- Mengatur ulang password akun.
- Mengubah password sendiri.

### Pusat

- Melihat transaksi seluruh cabang.
- Memfilter transaksi berdasarkan cabang.
- Melihat dan mengunduh bukti transaksi.
- Mengunduh data transaksi ke Excel.

### Kepala Cabang

- Melihat transaksi dari cabangnya sendiri.
- Melihat dan mengunduh bukti penyerahan.
- Mengunggah bukti transfer.
- Melihat dan mengunduh bukti transfer.
- Mengunduh data transaksi cabangnya ke Excel.

### Karyawan

Karyawan tidak memerlukan akun.

Karyawan dapat mengisi formulir penyerahan uang logam dan mengunggah foto bukti penyerahan melalui halaman publik.

## Cabang

- HO
- Jakarta
- Bandung
- Palembang
- Lampung
- Madiun
- Malang
- Surabaya
- Solo

## Pecahan Uang Logam

- Rp100
- Rp200
- Rp500
- Rp1.000

## Persyaratan Sistem

- Python 3.11 atau versi yang lebih baru
- PostgreSQL
- pip
- Web browser modern

## Persiapan Proyek

Buka terminal pada folder proyek:

```powershell
cd D:\TULIP
```

Buat virtual environment:

```powershell
python -m venv .venv
```

Instal seluruh dependency:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

## Konfigurasi Environment

Salin file `.env.example` menjadi `.env`.

Isi konfigurasi database dan secret key pada file `.env`:

```env
APP_NAME=TULIP
APP_ENV=development
DATABASE_URL=postgresql+psycopg://USERNAME:PASSWORD@localhost:5432/tulip
SECRET_KEY=SECRET_KEY_YANG_PANJANG_DAN_ACAK
ACCESS_TOKEN_EXPIRE_MINUTES=480
MAX_FILE_SIZE_MB=5
UPLOAD_DIRECTORY=uploads
```

Jangan menyimpan atau mengunggah file `.env` ke GitHub.

Untuk membuat secret key, jalankan:

```powershell
.\.venv\Scripts\python.exe -c "import secrets; print(secrets.token_urlsafe(64))"
```

## Membuat Database

Buat database PostgreSQL bernama:

```text
tulip
```

Pastikan nilai `DATABASE_URL` pada `.env` sesuai dengan username, password, host, port, dan nama database PostgreSQL.

## Membuat Tabel

Jalankan:

```powershell
.\.venv\Scripts\python.exe -m app.create_tables
```

## Membuat Data Awal

Jalankan:

```powershell
.\.venv\Scripts\python.exe -m app.seed_data
```

Perintah tersebut membuat data cabang dan akun awal.

Password akun baru hanya ditampilkan satu kali pada terminal. Simpan password di tempat yang aman.

## Menjalankan Aplikasi

Jalankan:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Buka aplikasi melalui:

```text
http://127.0.0.1:8000
```

Dokumentasi API tersedia melalui:

```text
http://127.0.0.1:8000/docs
```

Pemeriksaan koneksi database tersedia melalui:

```text
http://127.0.0.1:8000/api/health
```

## Penyimpanan File Bukti

Dalam lingkungan lokal, bukti transaksi disimpan pada folder:

```text
uploads
```

File bukti tidak boleh diunggah ke GitHub.

Pada server perusahaan, folder upload harus:

- Disimpan pada media penyimpanan permanen.
- Tidak dapat diakses langsung tanpa autentikasi TULIP.
- Dicadangkan secara berkala.
- Hanya dapat dibaca oleh aplikasi dan administrator server.
- Tetap tersedia setelah aplikasi diperbarui.

## Keamanan

- Password disimpan dalam bentuk hash Argon2.
- Login menggunakan token JWT.
- Bukti transaksi hanya dapat diakses setelah login.
- Kepala Cabang hanya dapat mengakses transaksi cabangnya.
- Pusat dan Superadmin dapat mengakses seluruh cabang.
- Secret key disimpan dalam environment variable.
- File `.env`, bukti transaksi, dan database tidak boleh disimpan di GitHub.

## Struktur Utama

```text
TULIP
├── app
│   ├── admin.py
│   ├── auth.py
│   ├── config.py
│   ├── constants.py
│   ├── create_tables.py
│   ├── dashboard.py
│   ├── database.py
│   ├── export.py
│   ├── files.py
│   ├── main.py
│   ├── models.py
│   ├── proofs.py
│   ├── public.py
│   ├── schemas.py
│   ├── security.py
│   ├── seed_data.py
│   └── transactions.py
├── static
│   ├── css
│   │   └── style.css
│   └── js
│       └── app.js
├── templates
│   └── index.html
├── uploads
├── .env
├── .env.example
├── .gitignore
├── README.md
└── requirements.txt
```

## Persiapan Produksi

Sebelum digunakan pada server perusahaan, tim IT perlu:

- Menggunakan PostgreSQL pada server perusahaan.
- Mengganti `APP_ENV` menjadi `production`.
- Menggunakan secret key produksi yang baru.
- Menggunakan domain dan HTTPS.
- Mengatur reverse proxy seperti Nginx.
- Menjalankan aplikasi sebagai service.
- Mengatur backup database dan folder upload.
- Membatasi akses server dan database.
- Mengatur log serta monitoring aplikasi.
- Melakukan pengujian keamanan dan pemulihan backup.

## Catatan

Aplikasi yang dijalankan menggunakan `--reload` hanya ditujukan untuk pengembangan lokal. Konfigurasi produksi harus ditentukan oleh tim IT perusahaan.