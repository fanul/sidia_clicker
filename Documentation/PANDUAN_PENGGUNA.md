# 📘 PANDUAN PENGGUNA SIDIA CLICKER
## Untuk Staff Non-IT BPJS Ketenagakerjaan

---

## 📋 DAFTAR ISI

1. [Apa Itu SIDIA Clicker?](#1-apa-itú-sidia-clicker)
2. [Persiapan Sebelum Menjalankan](#2-persiapan-sebelum-menjalankan)
3. [Cara Menjalankan Program](#3-cara-menjalankan-program)
4. [Memahami Tampilan Program](#4-memahami-tampilan-program)
5. [Troubleshooting (Memecahkan Masalah)](#5-troubleshooting-memecahkan-masalah)
6. [Tips Penting](#6-tips-penting)

---

## 1. APA ITU SIDIA CLICKER?

### Penjelasan Singkat

**SIDIA Clicker** adalah program otomatis yang membantu Anda memproses surat/disposisi di sistem SIDIA tanpa perlu klik manual satu per satu.

### Kenapa Pakai SIDIA Clicker?

| Tanpa SIDIA Clicker | Dengan SIDIA Clicker |
|---------------------|----------------------|
| Klik manual 1 per 1 | Otomatis semua |
| Butuh 30 menit | Cukup 5-10 menit |
| Capek dan lama | Cepat dan mudah |
| Bisa salah input | Konsisten & akurat |

### Apa Yang Otomatis?

Program akan otomatis:
1. ✅ Login ke sistem SIDIA
2. ✅ Memilih role/peran Anda
3. ✅ Membuka menu "Naskah Masuk"
4. ✅ Membuka tab "Disposisi"
5. ✅ Membaca setiap surat
6. ✅ Mengisi feedback "Dipedomani dan dilaksanakan"
7. ✅ Menyimpan dan melanjutkan ke surat berikutnya

---

## 2. PERSIAPAN SEBELUM MENJALANKAN

### A. Pastikancomputer Anda Sudah Terinstall

Pastikan install dulu sebelum运行:

```
1. Node.js (download di nodejs.org)
2. Chrome browser (download di google.com/chrome)
```

### B. Setup Aplikasi

**Langkah 1:** Buka folder project

```
Buka File Explorer → Pergi ke:
C:\FANUL\PROJECT\sidia clicker
```

**Langkah 2:** Klik kanan → "Open in Terminal" atau "Open PowerShell"

**Langkah 3:** Ketik perintah ini dan tekan Enter:

```
npm install
```

> ⚠️ Tunggu sampai muncul `added XX packages` - artinya sukses!

### C. Setup Login

**Langkah 1:** Buka file `.env` dengan Notepad

> Klik file `.env` di folder project, pilih "Open with" → "Notepad"

**Langkah 2:** Isi username dan password Anda:

```
SIDIA_USERNAME=masukkan_username_anda
SIDIA_PASSWORD=masukkan_password_anda
```

**Langkah 3:** Simpan file (Ctrl + S)

> ⚠️ Contoh: Jika username Anda "budi.suryanto" dan password "Sidia2024!", maka:

```
SIDIA_USERNAME=budi.suryanto
SIDIA_PASSWORD=Sidia2024!
```

---

## 3. CARA MENJALANKAN PROGRAM

### Metode 1: Mode Biasa (Lihat Browser) - **REKOMENDASI UNTUK PEMULA**

```
npm start
```

✅ **Kelebihan:**
- Anda bisa lihat apa yang terjadi
- Mudah debug jika ada masalah
- Cocok untuk pertama kali pakai

### Metode 2: Mode Background (Tidak Lihat Browser)

```
npm run headless
```

✅ **Kelebihan:**
- Lebih cepat
- Bisa jalankan di background

### Metode 3: Dari File Explorer Langsung

1. Buka folder `sidia clicker`
2. Klik 2x pada file `run.bat` (jika ada)
3. Atau klik 2x pada file `index.js` (pilih "Open with" → "Command Prompt")

---

## 4. MEMAHAMI TAMPILAN PROGRAM

### A. Tampilan Awal (Terminal/CMD)

Ketika program berjalan, Anda akan melihat tampilan seperti ini:

```
🚀 SIDIA Automation - Starting...

📱 Launching browser...
🔐 STEP 1: Logging in...
  ✓ Username entered
  ✓ Password entered
  ✓ Login button clicked
  ✓ Login successful

👤 STEP 2: Selecting Role...
  ✓ Role input clicked
  ✓ PSTFF role selected
  ✓ PILIH button clicked

📂 STEP 3: Navigating to Naskah Masuk...
  ✓ Menu clicked

📋 STEP 4: Processing Menus with Badges...
  Found 3 menus with badges
    1. Disposisi DariKepala Kantor (5 documents)
    2. Disposisi DariBidang (3 documents)
    3. Disposisi Dari Kasie (2 documents)

📝 Processing: Disposisi Dari Kepala Kantor
    ✓ Document 1/5 processed
    ✓ Document 2/5 processed
    ✓ Document 3/5 processed
    ...

✅ Automation completed!
```

### B. Penjelasan Setiap Step

| Step | Yang Terjadi |
|------|--------------|
| STEP 1 | Program login ke SIDIA otomatis |
| STEP 2 | Program memilih role Anda (PSTFF) |
| STEP 3 | Program membuka menu Naskah Masuk |
| STEP 4 | Program memproses semua surat dengan badge |

### C. Arti Simbol-Simbol

```
🚀 = Program dimulai
📱 = Membuka browser
🔐 = Proses login
👤 = Memilih peran/role
📂 = Membuka menu
📋 = Memproses dokumen
✅ = Berhasil / Selesai
⚠️ = Peringatan
❌ = Gagal / Error
✓  = Berhasil
✗  = Gagal
```

### D. Tahapan Processing Dokumen

Setiap dokumen diproses secara otomatis:

```
📄 Document 1/5 processing...
   → Membuka detail surat
   → Mengisi feedback
   → Menyimpan
   → Kembali ke daftar
   ✓ Document 1/5 completed
```

---

## 5. TROUBLESHOOTING (MEMECAHKAN MASALAH)

### ❌ MASALAH 1: "Please set SIDIA_USERNAME in .env file"

**Penyebab:** File `.env` belum diisi username/password

**Solusi:**
1. Buka file `.env` di folder project
2. Isi `SIDIA_USERNAME=username_anda`
3. Isi `SIDIA_PASSWORD=password_anda`
4. Simpan (Ctrl + S)
5. Jalankan lagi

---

### ❌ MASALAH 2: Login Gagal / Stuck di halaman login

**Penyebab:**
- Username/password salah
- Koneksi internet bermasalah
- Server SIDIA down

**Solusi:**
1. ✅ Cek username & password di file `.env`
2. ✅ Cek koneksi internet
3. ✅ Buka browser biasa, coba login manual ke sidia.bpjsketenagakerjaan.go.id
4. ✅ Tunggu beberapa menit, coba lagi

---

### ❌ MASALAH 3: Stuck di halaman "Pilih Peran"

**Penyebab:** Role tidak terpilih otomatis

**Solusi:**
1. Pastikan ada role yang tersedia di akun Anda
2. Hubungi admin jika tidak ada role
3. Cek apakah browser muncul (mode biasa)
4. Jika muncul, Anda bisa klik manual role-nya

---

### ❌ MASALAH 4: Tidak Menemukan Menu "Naskah Masuk"

**Penyebab:**
- Role selection gagal
- Menu tidak muncul

**Solusi:**
1. Pastikan sudah berhasil pilih role
2. Cek apakah ada screenshot di folder `screenshots/`
3. Buka SIDIA manual, cek apakah menu Naskah Masuk ada

---

### ❌ MASALAH 5: Program Berhenti di Middle of Processing

**Penyebab:**
- Internet lambat
- Server timeout
- Document stuck

**Solusi:**
1. ✅ Tutup program (Ctrl + C)
2. ✅ Jalankan lagi dengan `npm start`
3. ✅ Program akan lanjut dari awal (klik manual jika ada surat yang sudah diproses)

---

### ❌ MASALAH 6: Error "Cannot find module"

**Penyebab:** Dependencies belum terinstall

**Solusi:**
1. Buka terminal/command prompt
2. Pergi ke folder project: `cd C:\FANUL\PROJECT\sidia clicker`
3. Ketik: `npm install`
4. Jalankan lagi: `npm start`

---

### ❌ MASALAH 7: Browser Pop-up / Alert muncul

**Solusi:**
1. Jangan klik apapun
2. Biarkan program otomatis menutupnya
3. Jika stuck, tekan Ctrl + C untuk stop program

---

## 6. TIPS PENTING

### ✅ Tips 1: Selalu Pakai Mode Biasa (Non-Headless) untuk Pertama Kali

```bash
npm start
```

Ini supaya Anda bisa lihat apa yang terjadi dan mudah debug.

### ✅ Tips 2: Jangan Klik Apapun Saat Program Berjalan

Biarkan program bekerja sendiri. Jika Anda klik, bisa mengganggu proses.

### ✅ Tips 3: Pastikan Koneksi Internet Stabil

- Gunakan WiFi yang stabil
- Jangan pakai mobile data (sering disconnect)
- Hindari streaming video saat program jalan

### ✅ Tips 4: Jangan Tutup Terminal/CMD

Biarkan terminal terbuka sampai program selesai.

### ✅ Tips 5: Backup File `.env`

Jika Anda malas mengisi ulang, backup file `.env` di tempat lain.

### ✅ Tips 6: Cek Screenshot Jika Ada Masalah

Jika program gagal, cek folder `screenshots/` untuk lihat screenshot error.

---

## 📊 KONFIGURASI LANJUTAN (OPSIONAL)

### Mengganti Pesan Feedback

Default: `Dipedomani dan dilaksanakan`

Untuk ganti, edit file `.env`:

```
FEEDBACK_MESSAGE=isi_pesan_anda_di_sini
```

### Mengatur Kecepatan

```
TIMEOUT=30000        # Waktu tunggu maks (ms)
RETRY_DELAY=3000     # Jeda antar retry (ms)
```

- Jika internet lambat: naikkan jadi `60000` dan `5000`
- Jika internet cepat: bisa turunkan jadi `15000` dan `2000`

### Memilih Menu Tertentu Saja

Jika hanya mau proses menu tertentu, edit `.env`:

```
SKIP_SUBMENUS=Kabag,Kasubag
```

Ini akan skip menu yang mengandung kata "Kabag" dan "Kasubag".

---

## 📞 MEMPEROLEH BANTUAN

Jika masih ada masalah:

1. **Cek folder Documentation** → ada banyak panduan teknis
2. **Cek folder screenshots** → untuk debug visual
3. **Hubungi tim IT** → untuk masalah teknis lanjutan

---

## ✅ CHECKLIST SEBELUM MENJALANKAN

```
☐ 1. Node.js sudah terinstall
☐ 2. Chrome sudah terinstall
☐ 3. Sudah jalankan `npm install`
☐ 4. File .env sudah diisi username & password
☐ 5. Koneksi internet stabil
☐ 6. Tidak ada tab SIDIA yang terbuka
```

---

**SELAMAT MENCOBA! 🎉**

Jika ada pertanyaan, hubungi tim IT support.