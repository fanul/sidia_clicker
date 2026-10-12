# SIDIA Dashboard (Graph)

Dashboard web untuk melihat grafik hasil automation dan menjalankan/menghentikannya dari browser.

- URL: **http://localhost:3333**
- Grafik: dokumen per menu, dokumen per hari (14 hari), riwayat run, log live
- Data grafik disimpan di `data/events.jsonl` (otomatis tercatat saat automation berjalan, baik lewat dashboard maupun `npm start`)

## Pengaturan (username & password)

Buka panel **Pengaturan** di bagian atas dashboard, isi lalu klik **Simpan**. Nilainya ditulis ke file `.env`:

- Username dan password SIDIA
- Pesan feedback
- Kode jenis dokumen
- Submenu yang dilewati

Password tidak pernah ditampilkan kembali di dashboard; kosongkan kolom password jika tidak ingin mengubahnya. Perubahan berlaku pada run berikutnya, tanpa restart server.

## Windows

| File | Fungsi |
|------|--------|
| `start.bat` | Install dependencies (jika perlu), start dashboard, buka browser |
| `start.bat run` | Start dashboard dan langsung menjalankan automation |
| `start.bat run headless` | Sama, tetapi browser Chrome disembunyikan |
| `stop.bat` | Hentikan dashboard + automation + Chrome yang sedang berjalan |
| `update.bat` | Hentikan dashboard, `git pull` versi terbaru dari GitHub (`master`), `npm install`, lalu start lagi |
| `update.bat norestart` | Update saja tanpa menjalankan dashboard |

## Update

Klik dua kali `update.bat` untuk mengambil versi terbaru. File `.env` (username/password) dan folder `data\` tidak terpengaruh. Jika Anda mengubah file project sendiri dan bentrok dengan update, `update.bat` akan berhenti dengan pesan error dan tidak menimpa perubahan Anda.

## Ganti Port

Default port **3333**. Untuk mengganti, set di `.env`:

```env
PORT=3333
```

`start.bat` dan `stop.bat` ikut membaca nilai `PORT` dari `.env`.

## Tanpa .bat

```bash
npm run dashboard
```

## Catatan

- Jika automation dihentikan paksa saat berjalan, pengaturan sleep Windows mungkin belum dipulihkan:
  `powercfg /change standby-timeout-ac 30` dan `powercfg /change monitor-timeout-ac 10`.
- Server hanya listen di `127.0.0.1` dan hanya menerima akses lewat `localhost`/`127.0.0.1` pada port yang sama, supaya website lain tidak bisa mengubah pengaturan.
