# Rekaman Flow SIDIA (login manual di Chrome, 2026-10-12)

Direkam dari satu sesi manual: login → role → Naskah Masuk → dokumen → feedback → logout.
Nilai input (username, password, isi feedback) sengaja tidak direkam.

## Urutan aksi dan tombol

| # | Halaman | Aksi | Elemen | Request yang terlihat |
|---|---------|------|--------|-----------------------|
| 1 | `/login` | Isi username, isi password, tekan **Enter** di kolom password | `input[type=text]` (id dinamis: `input-15`, `input-484`, ...), `input#password`. Tombol `button.btn-login` (LOGIN) nonaktif sampai kedua field terisi | `POST /services/login` 200 (+ panggilan reCAPTCHA) → `GET /services/roles` |
| 2 | `/role` | Klik input role, pilih opsi `PSTFF - Pelaksana/Staff ( 52A )` (`div.v-list-item--link`), klik **PILIH** | tombol: `Clear Pilih Role Akses`, `LOGOUT`, `PILIH` (`button.btn-half`) | `GET /services/master/master-kantor`, `sidia-menu`, `sidia-menu-notif` (banyak) |
| 3 | `/` | Klik header **Naskah Masuk** (`div.v-list-group__header`) → submenu muncul beserta badge | submenu `a.v-list-item`: Surat Biasa, Surat Rahasia, Memo Eksternal, Memo Internal, Berita Acara, Surat Masuk, Surat Perintah | - |
| 4 | `/inbox?f=NKH0016` | Klik submenu (mis. **Surat Biasa 75**). Tab `DISPOSISI TOP LEVEL` dan `DISPOSISI <n>` (`div.v-tab`, aktif = `DISPOSISI <n>`) | tiap baris punya tombol **LIHAT** (`button.mr-2.v-btn`) + paginasi | `GET /services/naskah/`, `POST .../notifBadgeTabInbox` |
| 5 | `/inbox/<id>?obj=...` | Klik **LIHAT** | tombol: `KEMBALI`, `FEEDBACK`, `FULL PDF`, `CETAK` | `GET /services/naskah/detail-disposisi/<id>`, `GET api-sidia2.../arsip/fullPdf` |
| 6 | detail | Klik **FEEDBACK** → dialog "Feedback Disposisi" | `textarea` (id dinamis), `CLOSE`, `SIMPAN` (nonaktif sampai ada teks) | - |
| 7 | detail | Isi textarea, klik **SIMPAN** | `button.v-btn--is-elevated` teks SIMPAN | `POST /services/naskah/tr/feedback/<id>` 200 |
| 8 | detail | Popup SweetAlert, klik **OK** | `button.swal2-confirm` | - |
| 9 | detail → `/inbox?f=NKH0016` | Klik **KEMBALI**; badge DISPOSISI turun 75 → 74 | `button.v-btn--outlined` teks KEMBALI | `GET /services/naskah/` |
| 10 | menu user | Klik **Logout** (`div.v-list-item`) | - | `POST /services/logout` 200 → `/login`, snackbar "Akun anda telah berhasil keluar." |

## Temuan penting

- Login berhasil dengan kredensial di `.env` ketika dilakukan manual di Chrome biasa; pengiriman form lewat **Enter**.
- ID input (`input-15`, `input-484`, `input-508`, `input-771`, ...) dinamis. Jangan mengandalkan ID tersebut, pakai `type`/tag.
- SIDIA membersihkan `sessionStorage` saat logout.
- Pesan error login tampil di `.v-snack__wrapper` (class `error`), tombol `Tutup`.
