# SIDIA Dashboard (Graph)

Dashboard web untuk melihat grafik hasil automation dan menjalankan/menghentikannya dari browser.

- URL: **http://localhost:3333**
- Grafik: dokumen per menu, dokumen per hari (14 hari), riwayat run, log live
- Data grafik disimpan di `data/events.jsonl` (otomatis tercatat saat automation berjalan, baik lewat dashboard maupun `npm start`)

## Windows

| File | Fungsi |
|------|--------|
| `start.bat` | Install dependencies (jika perlu), start dashboard, buka browser |
| `start.bat run` | Start dashboard dan langsung menjalankan automation |
| `start.bat run headless` | Sama, tetapi browser Chrome disembunyikan |
| `stop.bat` | Hentikan dashboard + automation + Chrome yang sedang berjalan |

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
- Server hanya listen di `127.0.0.1` (bisa diubah dengan env `HOST`).
