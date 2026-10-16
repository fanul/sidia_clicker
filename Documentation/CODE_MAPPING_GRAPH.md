# SIDIA Automation — Code Mapping & Architecture Graph

Dokumen ini menyediakan pemetaan visual lengkap (graph/diagram) untuk seluruh modul, fungsi, dan alur eksekusi pada proyek **SIDIA Clicker (Automation)**.

---

## 1. Modul Dependency Graph (Peta Ketergantungan Modul)

Graph ini memetakan bagaimana modul-modul di dalam proyek saling terhubung dan bergantung satu sama lain:

```mermaid
graph TD
    classDef entry fill:#4CAF50,stroke:#388E3C,stroke-width:2px,color:#fff;
    classDef core fill:#2196F3,stroke:#1976D2,stroke-width:2px,color:#fff;
    classDef helper fill:#FF9800,stroke:#F57C00,stroke-width:2px,color:#fff;
    classDef server fill:#9C27B0,stroke:#7B1FA2,stroke-width:2px,color:#fff;

    Index["index.js<br/>(Main Entry Point)"]:::entry
    Server["server.js<br/>(Dashboard Server :3333)"]:::server
    Settings["settings.js<br/>(Config & .env Manager)"]:::server

    subgraph Browser & Env
        Browser["browser.js<br/>(Puppeteer Launcher & Anti-detect)"]:::core
        KeepAwake["keepAwake.js<br/>(Powercfg Sleep Blocker)"]:::helper
        Stats["stats.js<br/>(Metrics Tracker)"]:::helper
        Tracker["tracker.js<br/>(Event Logger to events.jsonl)"]:::helper
    end

    subgraph Authentication & Role
        Login["login.js<br/>(Login Orchestrator)"]:::core
        RoleInput["roleInput.js<br/>(Dropdown Field Finder)"]:::core
        RoleSelection["roleSelection.js<br/>(PSTFF / Role Chooser)"]:::core
        PilihButton["pilihButton.js<br/>(PILIH Action & Verifier)"]:::core
    end

    subgraph Document Processing Flow
        Docs["documents.js<br/>(Menu Navigation & Badge Checker)"]:::core
        SubmenuNav["submenuNavigation.js<br/>(Submenu /inbox Routing)"]:::core
        Disposisi["disposisiTab.js<br/>(Disposisi Tab Activator)"]:::core
        DocProc["documentProcessor.js<br/>(Detail, Feedback, Save Loop)"]:::core
    end

    subgraph Utilities & Verification
        ClickHelper["clickHelper.js<br/>(traditionalClick, type, sleep)"]:::helper
        VisualHelper["visualHelper.js<br/>(Screenshots & Fallback Clicks)"]:::helper
        Verification["verification.js<br/>(clickAndVerify)"]:::helper
        ElemRef["elementReference.js<br/>(DOM Target Definitions)"]:::helper
        PageHelper["pageHelper.js<br/>(Page State & Text Checks)"]:::helper
        Constants["constants.js<br/>(Selectors & Configurations)"]:::helper
        Utils["utils.js<br/>(Sleep & Common Tools)"]:::helper
    end

    Index --> Browser
    Index --> KeepAwake
    Index --> Stats
    Index --> Tracker
    Index --> Login
    Index --> Docs

    Server --> Settings
    Server --> Index

    Login --> RoleInput
    Login --> RoleSelection
    Login --> PilihButton
    Login --> VisualHelper
    Login --> PageHelper
    Login --> ClickHelper
    Login --> Constants

    RoleInput --> Utils
    RoleInput --> VisualHelper
    RoleSelection --> Utils
    RoleSelection --> VisualHelper
    PilihButton --> Utils
    PilihButton --> VisualHelper

    Docs --> SubmenuNav
    Docs --> Disposisi
    Docs --> DocProc
    Docs --> ClickHelper
    Docs --> Constants

    DocProc --> VisualHelper
    DocProc --> ClickHelper
    DocProc --> Constants

    VisualHelper --> Verification
    VisualHelper --> ElemRef
    Verification --> Constants
```

---

## 2. End-to-End Execution Flow (Alur Eksekusi Sistem)

Diagram alir urutan proses otomasi dari mulai dijalankan sampai selesai:

```mermaid
flowchart TD
    Start([Mulai: npm start / start.bat]) --> InitEnv[Baca konfigurasi .env & validasi kredensial]
    InitEnv --> PreventSleep[keepAwake.js: Blokir sleep Windows]
    PreventSleep --> LaunchBr[browser.js: Launch Chromium / Chrome]
    LaunchBr --> CreatePg[Setup anti-detection, Viewport, UserAgent]

    CreatePg --> Step1{Sesi Browser Masih Aktif?}
    Step1 -- Ya (Sudah login) --> Step2[Lewati login, langsung ke cek Role]
    Step1 -- Tidak --> NavLogin[Buka https://sidia.bpjsketenagakerjaan.go.id/login/]

    NavLogin --> FillCreds[Isi Username & Password]
    FillCreds --> WaitBtn[Tunggu tombol LOGIN enabled]
    WaitBtn --> SubmitLogin[Klik Tombol LOGIN / Submit]
    SubmitLogin --> CaptchaCheck{Hasil reCAPTCHA & Respon Server?}

    CaptchaCheck -- "Token tidak valid" / Error --> RetryLogin{Coba lagi? < 5x}
    RetryLogin -- Ya --> SubmitLogin
    RetryLogin -- Tidak --> FailExit([Error: Gagal Login])

    CaptchaCheck -- Sukses / Redirect --> CheckRolePage[Deteksi Halaman /role]

    CheckRolePage --> RoleNeeded{Sudah di Dashboard atau Butuh Pilih Role?}
    RoleNeeded -- Sudah di Dashboard --> Step3[Buka Naskah Masuk]
    RoleNeeded -- Butuh Role --> SelectRoleField[roleInput.js: Klik field Role]
    SelectRoleField --> ChoosePSTFF[roleSelection.js: Pilih role PSTFF / pertama]
    ChoosePSTFF --> ClickPILIH[pilihButton.js: Klik PILIH & verifikasi redirect]
    ClickPILIH --> Step3

    Step3 --> ScanBadges[documents.js: Baca badge jumlah naskah di tiap submenu]
    ScanBadges --> HasDocs{Ada submenu dengan badge > 0?}
    HasDocs -- Tidak Ada --> DoneStats[Rekap statistik]
    HasDocs -- Ada Dokumen --> ClickSubmenu[submenuNavigation.js: Klik submenu]
    ClickSubmenu --> SwitchTab[disposisiTab.js: Klik Tab Disposisi]
    SwitchTab --> LoopDoc[documentProcessor.js: Loop klik LIHAT]

    LoopDoc --> FillFeedback[Isi feedback: 'noted' / teks config]
    FillFeedback --> SaveFeedback[Klik SIMPAN & Konfirmasi popup]
    SaveFeedback --> NextDoc{Masih ada baris dokumen?}
    NextDoc -- Ya --> LoopDoc
    NextDoc -- Tidak --> NextSubmenu{Masih ada submenu lain?}
    NextSubmenu -- Ya --> ScanBadges
    NextSubmenu -- Tidak --> DoneStats

    DoneStats --> RestoreSleep[Pulihkan sleep setting Windows]
    RestoreSleep --> CloseBrowser[Tutup Browser & Tampilkan Summary]
    CloseBrowser --> End([Selesai])
```

---

## 3. Detail State Diagram: Modul Login & Investigasi Kendala

State machine yang menggambarkan bagaimana modul `login.js` bekerja serta titik kritis terjadinya kegagalan:

```mermaid
stateDiagram-v2
    [*] --> Navigating: Buka /login
    Navigating --> CheckActiveSession: Tunggu networkidle2 (2 detik)
    
    CheckActiveSession --> AlreadyLoggedIn: Password input tidak ada & URL bukan /login
    AlreadyLoggedIn --> [*]: Lanjut ke Role

    CheckActiveSession --> EnteringCredentials: Form login terdeteksi
    EnteringCredentials --> UsernameTyped: Ketik username (input[type=text])
    UsernameTyped --> PasswordTyped: Ketik password (input[type=password])
    PasswordTyped --> FormValidation: Vue/Vuetify validasi form

    FormValidation --> ButtonEnabled: .btn-login aktif (warna hijau/success)
    
    ButtonEnabled --> SubmitAttempt: Eksekusi submit (page.click / Enter)
    SubmitAttempt --> RecaptchaExecuting: Frontend memanggil grecaptcha.execute('login')
    
    state RecaptchaExecuting {
        [*] --> GoogleRiskCheck
        GoogleRiskCheck --> HumanScore: Browser Normal (skor >= 0.5)
        GoogleRiskCheck --> BotScore: Puppeteer / Headless (skor 0.1)
    }

    HumanScore --> BackendVerifySuccess: POST /services/login (ret = 0)
    BackendVerifySuccess --> RedirectToRole: Simpan token & redirect ke /role
    RedirectToRole --> [*]: Login Berhasil

    BotScore --> BackendVerifyFail: POST /services/login (ret = -1)
    BackendVerifyFail --> SnackbarError: Tampil pesan "Token tidak valid"
    
    SnackbarError --> RetryLoop: Retry sampai batas maksimal (5x)
    RetryLoop --> SubmitAttempt: Coba kembali
    RetryLoop --> FatalError: Batas coba habis -> Crash
```

---

## 4. Struktur File & Tanggung Jawab

| File | Baris | Peran / Tanggung Jawab Utama |
|---|---|---|
| `index.js` | ~157 | Entry point eksekusi alur utama, integrasi error handling dan sleep prevention. |
| `browser.js` | ~105 | Pengaturan peluncuran Puppeteer, user agent, profil browser, dan anti-bot hooks. |
| `login.js` | ~503 | Koordinator autentikasi, pengisian form login, penanganan reCAPTCHA & retry. |
| `roleInput.js` | ~200 | Mencari elemen input dropdown pilihan role di halaman `/role`. |
| `roleSelection.js` | ~269 | Memilih opsi role (prioritas `PSTFF - Pelaksana/Staff`) dari list Vuetify. |
| `pilihButton.js` | ~130 | Memastikan tombol PILIH diklik dan halaman berpindah dari `/role`. |
| `documents.js` | ~440 | Navigasi menu utama Naskah Masuk dan pemindaian badge dokumen. |
| `submenuNavigation.js` | ~161 | Navigasi ke masing-masing submenu dokumen `/inbox?f=...`. |
| `disposisiTab.js` | ~272 | Berpindah ke tab `DISPOSISI` dan memastikan tabel dokumen tampil. |
| `documentProcessor.js` | ~654 | Pemrosesan baris dokumen: tombol LIHAT, input feedback, simpan, dan modal SweetAlert. |
| `constants.js` | ~131 | Koleksi selector DOM (CSS), timeout timing, dan regex pattern. |
| `clickHelper.js` | ~219 | Fungsi pembantu simulasi klik dan ketik bertahap (`traditionalType`). |
| `visualHelper.js` | ~772 | Pengambilan screenshot, snapshot struktur DOM saat error, dan fallback klik. |
| `server.js` | ~230 | Web server dashboard monitoring berbasis Express/HTTP di port 3333. |
| `settings.js` | ~101 | Manajemen pembacaan dan pembaruan file `.env` dari web dashboard. |
