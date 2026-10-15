# Buku Kas UMKM

Aplikasi pembukuan sederhana untuk UMKM: **Google Sheets sebagai database**, **Apps Script sebagai API**, **HTML/CSS/JS murni siap GitHub Pages** (tanpa build step).

## Fitur

1. **Akun login** — daftar & masuk dengan email + kata sandi (hash SHA-256 dengan salt, token sesi 7 hari).
2. **Dashboard** — saldo, pemasukan & pengeluaran bulan ini, grafik batang 6 bulan, transaksi terbaru.
3. **Uang Masuk** — tambah / ubah / hapus transaksi pemasukan.
4. **Uang Keluar** — tambah / ubah / hapus transaksi pengeluaran.
5. **Laporan detail** — filter rentang tanggal, ringkasan per bulan, per kategori, daftar lengkap, unduh CSV, cetak.
6. **Pengaturan Profil UMKM** — nama usaha, pemilik, telepon, alamat, catatan.

## Langkah Deploy (±5 menit)

### A. Backend (Google Sheets + Apps Script)

1. Buat **Google Sheet baru** di drive Anda.
2. Menu **Extensions → Apps Script**, hapus kode bawaan.
3. Salin seluruh isi [`appscript/Code.gs`](appscript/Code.gs) ke editor, lalu **Simpan**.
4. Klik **Deploy → New deployment → Web app**:
   - *Description*: bebas, mis. `buku-kas-v1`
   - **Execute as: Me**
   - **Who has access: Anyone**
5. Klik **Deploy**, salin **URL Web App** (diakhiri `/exec`).
6. Buka URL tersebut di tab baru, tambahkan `?action=ping` di belakangnya — harus muncul `{"status":"ok",...}`.

### B. Frontend (GitHub Pages)

7. Buat repository GitHub baru, unggah seluruh isi folder ini (root repo berisi `index.html`).
8. **Settings → Pages → Source: Deploy from a branch**, pilih branch `main` folder `/root`, Save.
9. Tunggu ±1 menit, buka URL GitHub Pages yang diberikan.

### C. Hubungkan keduanya

10. Edit [`assets/js/api.js`](assets/js/api.js), isi `BASE_URL` dengan URL `/exec` dari langkah 5, commit.
11. Buka situs, klik **Daftar** untuk membuat akun pertama, lalu mulai catat transaksi.

## Catatan

- Sheet `Users`, `Transactions`, `Profile` dibuat otomatis saat API pertama kali dipanggil.
- Sesi token disimpan di Google Sheets, berlaku 7 hari; login ulang otomatis saat kedaluwarsa.
- Data tidak pernah meninggalkan Google Sheet milik Anda sendiri.
- Untuk ganti foto produk/laporan cetak, seluruh teks diatur dari halaman **Pengaturan**.
