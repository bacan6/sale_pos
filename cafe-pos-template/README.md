# Cafe POS Cross-Platform UI Template & Theme

Template dan tema antarmuka (UI/UX) modern untuk aplikasi Point of Sale (POS) Kafe / Coffee Shop yang responsif untuk **iOS, Android (via Capacitor), Tablet (iPad), dan Desktop**.

---

## 📱 Daftar Interface & Halaman yang Tersedia

1. **Kasir (Cashier / POS Terminal)** (`src/views/CashierView.tsx`)
   - Pemilihan tipe pesanan (*Dine-In* / *Take-Away*) dan nomor meja.
   - Filter kategori cepat & pencarian menu.
   - Panel pesanan aktif (cart) dengan perhitungan otomatis Subtotal, Diskon (%), Pajak Restoran (PB1 10%), dan Total.
   - Modal Pembayaran: Tunai/Cash (dengan tombol uang pas & hitung kembalian), QRIS (iPaymu), dan EDC Kartu.

2. **Daftar Menu & Pemesanan Pelanggan (Self-Order Kiosk)** (`src/views/CustomerMenuView.tsx`)
   - Tampilan ramah tablet/smartphone untuk diletakkan di atas meja pelanggan.
   - Header meja (*Meja 02*).
   - Modal kustomisasi pesanan (pilihan takaran gula, jenis susu, suhu Panas/Dingin, dan instruksi catatan khusus).
   - Floating cart bar & drawer konfirmasi kirim pesanan langsung ke dapur.

3. **Menu Komputer & Handheld Pramuniaga (Waitstaff Order)** (`src/views/WaitstaffView.tsx`)
   - Dirancang ringkas untuk input pesanan cepat (*fast entry*) oleh pramusaji / waiter.
   - Pengaturan jumlah tamu (*guest counter*) dan nomor meja aktif.
   - Input catatan masak per item secara langsung (contoh: *pedas banget, telur setengah matang*).
   - Tombol **"Kirim Tiket ke Dapur (Fire)"** dengan status konfirmasi instan.

4. **Struk & Instruksi Kitchen Staff (KDS & Thermal Receipt)** (`src/views/KitchenTicketView.tsx`)
   - **Kitchen Display System (KDS)** interaktif dengan kolom status: *Antrian*, *Sedang Dimasak*, dan *Siap Saji*.
   - Badge catatan urgensi & instruksi khusus.
   - **Preview Struk Thermal 80mm** siap cetak (`window.print()`) dengan CSS print layout khusus.

5. **Pengelolaan Produk dan Harga** (`src/views/ProductManagementView.tsx`)
   - Tabel katalog menu, kode SKU, kategori, harga jual, dan HPP (biaya modal).
   - Perhitungan otomatis margin keuntungan (+%).
   - Switch toggle status *Tersedia / Habis*.
   - Modal Tambah & Edit Produk.

6. **Pengelolaan Master Data & Denah Meja** (`src/views/TableManagementView.tsx`)
   - Visual floor plan per zona (*Indoor*, *Outdoor*, *VIP Area*).
   - Status meja berkode warna (*Kosong*, *Terisi*, *Minta Billing*, *Reserved*).
   - Counter kapasitas tamu dan modal Tambah Meja baru.

---

## 🛠️ Fitur Simulator Layar (Built-in Responsive Switcher)

Pada header bagian atas aplikasi, terdapat tombol toggle simulator:
- **Desktop**: Tampilan lebar layar penuh untuk komputer kasir / PC workstation.
- **Tablet**: Simulasi frame tablet iPad (820px) cocok untuk meja kasir atau self-order kiosk.
- **Mobile**: Simulasi frame smartphone (420px) untuk penggunaan waiter atau scan QR mobile.

---

## 🚀 Cara Menjalankan

### 1. Jalankan di Browser (Development Mode)
```bash
cd cafe-pos-template
npm run dev
```
Buka browser pada URL yang ditampilkan (biasanya `http://localhost:5173`).

### 2. Build untuk Produksi
```bash
npm run build
```
File hasil build akan berada di folder `dist/`.

### 3. Menjalankan di Mobile (Android / iOS via Capacitor)
Capacitor sudah terkonfigurasi di `capacitor.config.ts`.
```bash
# Tambahkan platform Android / iOS
npx cap add android
npx cap add ios

# Sinkronisasikan build web ke platform native
npm run build
npx cap sync

# Buka di Android Studio atau Xcode
npx cap open android
npx cap open ios
```

---

## 📂 Struktur Folder
```text
cafe-pos-template/
├── src/
│   ├── components/
│   │   ├── Sidebar.tsx        # Navigasi sidebar desktop/tablet
│   │   └── MobileNav.tsx      # Navigasi bottom bar smartphone
│   ├── data/
│   │   └── mockData.ts        # Data mock produk, meja, tiket dapur & helper mata uang
│   ├── views/
│   │   ├── CashierView.tsx
│   │   ├── CustomerMenuView.tsx
│   │   ├── WaitstaffView.tsx
│   │   ├── KitchenTicketView.tsx
│   │   ├── ProductManagementView.tsx
│   │   └── TableManagementView.tsx
│   ├── App.tsx                # Master container & device preview frame
│   └── index.css              # Styling Tailwind CSS & print media
├── capacitor.config.ts        # Konfigurasi Capacitor untuk iOS & Android
└── package.json
```
