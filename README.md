# UNIB Navi - Aplikasi Navigasi Universitas Bengkulu

Aplikasi pencarian rute terdekat dan navigasi interaktif antar-gedung/fakultas di Universitas Bengkulu (UNIB). Didesain dengan tema **cream cerah** yang hangat dan modern menggunakan **Tailwind CSS**, peta interaktif **Leaflet**, dan kalkulasi rute dinamis dari **API OSRM (Open Source Routing Machine)**.

Aplikasi ini mendeteksi lokasi GPS pengguna secara real-time dan secara otomatis memberikan estimasi waktu serta jarak untuk berbagai moda transportasi: mobil, sepeda motor, dan jalan kaki.

## Fitur Utama

- **Akses GPS Real-time & Akurat**: Menampilkan posisi Anda saat ini secara langsung di peta kampus UNIB.
- **Deteksi Otomatis & Simulasi**: Jika mendeteksi bahwa pengguna berada di luar jangkauan kampus (misal di kota lain), sistem akan secara cerdas memindahkan titik mulai default ke **Gerbang Utama UNIB** agar simulasi rute navigasi tetap bisa berjalan dengan lancar.
- **Kalkulasi Rute Multi-moda**: Estimasi waktu & jarak tempuh untuk:
  - 🚗 **Mobil** (berdasarkan rute jalan mobil)
  - 🛵 **Sepeda Motor** (waktu tempuh disesuaikan lebih cepat ~25% karena kelincahan motor di kampus)
  - 🚶 **Jalan Kaki** (rute jalur pejalan kaki)
- **Titik Terdekat (Nearest POI)**: Menampilkan daftar 5 gedung terdekat secara otomatis dari lokasi asal Anda.
- **Direktori Gedung Lengkap**: Pencarian & filter kategori gedung (Fakultas, Akademik, Administrasi, Fasilitas, Ibadah, Asrama) dengan kemampuan memusatkan kamera peta secara instan.

## Menjalankan Secara Lokal

1. **Instalasi Dependensi**:
   ```bash
   npm install
   ```

2. **Jalankan Server Development (Vite)**:
   ```bash
   npm run dev
   ```
   Aplikasi akan dapat diakses melalui browser di `http://localhost:5173`.

3. **Jalankan Server Produksi Lokal (Simulasi Railway)**:
   ```bash
   # Build berkas statis
   npm run build
   
   # Jalankan server Express
   npm start
   ```
   Aplikasi akan berjalan di `http://localhost:3000`.

---

## Panduan Deploy ke Railway

Aplikasi ini telah dikonfigurasi dengan server Node.js Express (`server.js`) yang secara otomatis menyajikan hasil build statis Vite. Ini adalah metode deployment yang paling tangguh untuk Railway karena Railway akan secara otomatis membaca berkas `package.json`, menginstal dependensi, mem-build aplikasi, dan menjalankan server pada port yang dialokasikan.

### Langkah 1: Push Kode ke GitHub

Buat repositori baru di GitHub dan unggah kode proyek Anda ke sana:
```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin <url-repo-github-anda>
git push -u origin main
```

### Langkah 2: Deploy di Railway Dashboard

1. Buka [Railway Dashboard](https://railway.app) dan masuk ke akun Anda.
2. Klik tombol **New Project** (atau **+ Add Service**).
3. Pilih **Deploy from GitHub repo**.
4. Pilih repositori GitHub Anda (`unib-navigation`).
5. Kereta instalasi Railway akan mendeteksi Node.js secara otomatis.
6. Klik **Deploy**.
7. Setelah deployment selesai, masuk ke tab **Settings** pada servis tersebut di Railway, lalu cari bagian **Environment** atau **Networking** dan klik **Generate Domain** untuk mendapatkan URL publik aplikasi Anda.

Aplikasi Anda kini sudah online dan siap digunakan di perangkat mobile maupun desktop!
