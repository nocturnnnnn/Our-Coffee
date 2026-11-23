# Panduan Komprehensif & Catatan Arsitektur Sistem Our Coffee
> **Dokumen Studi & Referensi Teknis (Comprehensive Codebase Study Guide)**  
> Disusun untuk keperluan penguasaan arsitektur, persiapan sidang/presentasi tugas akhir/skripsi, serta panduan pengembangan (*extensibility guide*) aplikasi **Our Coffee**.

---

## DAFTAR ISI
1. [Ringkasan Eksekutif & Domain Masalah](#1-ringkasan-eksekutif--domain-masalah)
2. [Arsitektur Perangkat Lunak & Design Pattern](#2-arsitektur-perangkat-lunak--design-pattern)
3. [Pohon Direktori Lengkap & Penjelasan File](#3-pohon-direktori-lengkap--penjelasan-file)
4. [Skema Basis Data & Relasi Eloquent (Data Layer)](#4-skema-basis-data--relasi-eloquent-data-layer)
5. [Bedah Logika Bisnis: 8 Service Layer Utama](#5-bedah-logika-bisnis-8-service-layer-utama)
6. [Alur Transaksi & State Machine (Life Cycle of an Order)](#6-alur-transaksi--state-machine-life-cycle-of-an-order)
7. [Frontend Architecture, State & Real-Time Polling](#7-frontend-architecture-state--real-time-polling)
8. [Panduan Menjawab Pertanyaan Dosen (Defense Q&A Guide)](#8-panduan-menjawab-pertanyaan-dosen-defense-qa-guide)
9. [Panduan Menambah Fitur Baru (How-To Tutorial)](#9-panduan-menambah-fitur-baru-how-to-tutorial)
10. [Kredensial Default & Perintah Esensial](#10-kredensial-default--perintah-esensial)

---

## 1. RINGKASAN EKSEKUTIF & DOMAIN MASALAH

### 1.1 Apa Itu Our Coffee?
**Our Coffee** adalah sistem operasional coffee shop *omnichannel* terintegrasi berbasis web responsif modern. Aplikasi ini menggabungkan seluruh titik interaksi (*touchpoints*) bisnis kafe ke dalam satu basis data dan satu alur logika yang sinkron secara *real-time*:
1. **Self-Service Kiosk (`/kiosk`)**: Layar sentuh mandiri bagi pelanggan untuk memilih menu, meracik modifier (opsi rasa/susu/ukuran), mengisi nama panggilan, dan memilih metode pembayaran.
2. **Point of Sale / POS Kasir (`/pos`)**: Antarmuka kasir untuk memproses pesanan langsung (*walk-in*), menyelesaikan pembayaran pesanan yang berasal dari Kiosk (khususnya bayar Tunai di Kasir), manajemen buka/tutup shift kasir, cetak struk termal, dan pembatalan pesanan (*void*).
3. **Kitchen Display System / KDS (`/kds`)**: Layar dapur dan meja barista untuk memantau tiket pesanan masuk, mengubah status pengerjaan (*Paid* $\rightarrow$ *Preparing* $\rightarrow$ *Ready* $\rightarrow$ *Completed*), dan fitur *undo* 1 langkah jika terjadi kesalahan ketuk.
4. **Queue Display TV (`/display/queue`)**: Layar publik di atas konter pengambilan untuk menampilkan nomor antrean yang sedang disiapkan dan nomor yang sudah siap dipanggil.
5. **Back-Office Admin (`/admin`)**: Dashboard analitik laba kotor, manajemen katalog menu & kategori, manajemen bahan baku (inventaris & kartu stok), pengaturan resep (*Bill of Materials* / BOM), manajemen staf & otorisasi PIN 6 digit, log audit yang tidak dapat diubah (*immutable*), dan laporan penjualan yang dapat diekspor ke Excel/CSV.

### 1.2 Masalah Riil yang Dipecahkan
- **Pencegahan Human Error & Antrean Panjang**: Memindahkan beban pemesanan dari antrean kasir ke mesin Kiosk pelanggan.
- **Transparansi Bahan Baku & HPP (BOM Costing)**: Setiap cangkir kopi yang terjual secara otomatis menghitung HPP (*Cost of Goods Sold*) berdasarkan takaran resep gram/ml bahan dan memotong stok fisik secara otomatis saat pembayaran lunas.
- **Pencegahan *Theft* dan Kebocoran Kas**: Kasir tidak dapat memanipulasi diskon atau membatalkan (*void*) pesanan yang sudah bayar tanpa verifikasi PIN 6-digit Supervisor/Admin. Seluruh aksi sensitif dicatat ke dalam `audit_logs`.
- **Integritas Konkurensi**: Tidak akan terjadi penjualan melebihi kapasitas stok (*overselling*) saat beberapa pelanggan memesan menu yang sama secara bersamaan.

---

## 2. ARSITEKTUR PERANGKAT LUNAK & DESIGN PATTERN

Aplikasi Our Coffee dibangun di atas stack modern:
- **Backend**: PHP 8.3+, Laravel 13 Framework
- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide React Icons, Shadcn UI
- **Glue / Adapter**: Inertia.js v3 (Monolith Modern: Client-Side Routing dengan Server-Side State)
- **Database**: MySQL 8.0 / MariaDB 10.11+
- **Client State**: Zustand (untuk keranjang Kiosk)

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT LAYER                                     |
|  [ Kiosk Screen ]   [ POS Kasir ]   [ KDS Barista ]   [ Queue TV ]   [ Admin CMS] |
|                                (React 19 + TypeScript)                            |
+-----------------------------------------------------------------------------------+
                                          |
                      Inertia.js Protocol (X-Inertia Request/Response)
                                          |
+-----------------------------------------------------------------------------------+
|                                 ROUTING & MIDDLEWARE                              |
|  - Role Guard (EnsureUserHasRole: admin, kasir, barista)                          |
|  - Shift Guard (EnsureShiftIsOpen)                                                |
|  - Device Guard (EnsureKioskDevice via Device Token)                              |
+-----------------------------------------------------------------------------------+
                                          |
+-----------------------------------------------------------------------------------+
|                             CONTROLLER LAYER (Thin)                               |
|  - Validasi HTTP Request & Form Input                                             |
|  - Delegasi eksekusi ke Service Layer                                             |
|  - Mengembalikan Inertia::render() atau Redirect Response                         |
+-----------------------------------------------------------------------------------+
                                          |
+-----------------------------------------------------------------------------------+
|                              SERVICE LAYER (Domain Logic)                         |
|  OrderService | InventoryService | BomCostService | MenuAvailabilityService       |
|  QueueNumberGenerator | PinAuthorizationService | AuditLogService | QrisGateway   |
+-----------------------------------------------------------------------------------+
                                          |
+-----------------------------------------------------------------------------------+
|                            DATA & REPOSITORY LAYER                                |
|  - Eloquent ORM Models (Relationships, Casts, Mutators, Scopes)                   |
|  - Database Transactions (DB::transaction)                                        |
|  - Concurrency Locking (lockForUpdate - Pessimistic Locking)                      |
|  - MySQL / MariaDB (InnoDB Storage Engine)                                        |
+-----------------------------------------------------------------------------------+
```

### 2.1 Pola-Pola Desain Utama yang Diterapkan
1. **Service Layer Pattern**: Logika bisnis tidak ditulis di Controller maupun di Model, melainkan dipusatkan di folder `app/Services/`. Ini memastikan prinsip *Single Responsibility* dan kode dapat digunakan kembali (*reusable*) baik oleh POS, Kiosk, maupun Seeder/Testing.
2. **Contract / Interface-Driven Architecture**: Digunakan pada `QrisGatewayInterface` yang diimplementasikan oleh `SimulatedQrisGateway`. Pola ini memudahkan integrasi payment gateway pihak ketiga (seperti Midtrans, Xendit, atau DOKU) tanpa merombak `OrderService`.
3. **Pessimistic Locking (`lockForUpdate`)**: Menjamin integritas data stok bahan baku dan penomoran antrean di lingkungan multi-user yang konkuren.
4. **Deadlock Prevention (Ordered Lock Acquisition)**: Dalam pemotongan stok bahan baku di `InventoryService::deductForOrder()`, array ID bahan baku selalu diurutkan (`sort($ingredientIds)`) sebelum dikunci dengan `lockForUpdate()`. Ini mematahkan kondisi *Circular Wait* pada teori deadlock basis data.
5. **State Pattern & Explicit Transition Matrix**: Status pesanan (`OrderStatus`) dikontrol melalui matriks transisi yang ketat. KDS hanya dapat mengubah status sesuai alur yang ditentukan dan mendukung pembatalan 1 langkah (*undo*).
6. **Immutable Audit Logging**: Entri `audit_logs` merekam siapa melakukan apa, siapa yang mengotorisasi via PIN, data sebelum/sesudah, dan alamat IP. Tidak ada API atau UI untuk mengubah atau menghapus audit log.

---

## 3. POHON DIREKTORI LENGKAP & PENJELASAN FILE

Berikut adalah peta struktur berkas utama proyek Our Coffee beserta fungsi teknisnya:

```
Our-Coffee/
├── app/
│   ├── Contracts/
│   │   └── QrisGatewayInterface.php        # Kontrak standar untuk gateway pembayaran QRIS
│   ├── Enums/                              # Tipe data terstandarisasi (Type-safe Enum PHP 8.1+)
│   │   ├── CashierShiftStatus.php          # Open, Closed
│   │   ├── IngredientUnit.php              # Gram (g), Mililiter (ml), Pieces (pcs)
│   │   ├── MenuBadge.php                   # BestSeller, New, Promo, Recommended
│   │   ├── ModifierSelectionType.php       # Single (radio), Multiple (checkbox)
│   │   ├── OrderChannel.php                # Kiosk, Pos
│   │   ├── OrderStatus.php                 # PendingPayment, Paid, Preparing, Ready, Completed, Cancelled, Voided
│   │   ├── OrderType.php                   # DineIn, Takeaway
│   │   ├── PaymentMethod.php               # Cash, Qris
│   │   ├── PaymentStatus.php               # Pending, Paid, Expired, Failed, Refunded
│   │   ├── StockMovementType.php           # Restock, Sale, Waste, Opname
│   │   └── UserRole.php                    # Admin, Kasir, Barista
│   ├── Exceptions/                         # Custom Exception untuk penanganan error domain
│   │   ├── InvalidOrderTransitionException.php # Terlempar jika status order melompat ilegal
│   │   ├── InvalidPinException.php             # Terlempar jika PIN Supervisor salah
│   │   └── StockConflictException.php          # Terlempar jika bahan baku habis saat checkout/bayar
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Admin/                      # Modul Manajemen Back-Office
│   │   │   │   ├── AuditLogController.php      # Menampilkan daftar audit trail sensitif
│   │   │   │   ├── CategoryController.php      # CRUD kategori menu
│   │   │   │   ├── DashboardController.php     # Ringkasan omzet, laba kotor, item terlaris
│   │   │   │   ├── DistributorController.php   # Data supplier bahan baku
│   │   │   │   ├── InventoryController.php     # CRUD bahan baku, restock, waste, opname fisik
│   │   │   │   ├── MenuItemController.php      # CRUD menu, upload foto, toggle aktif, resep BOM
│   │   │   │   ├── ModifierGroupController.php # CRUD opsi tambahan (sugar, ice, topping)
│   │   │   │   ├── ReportController.php        # Laporan penjualan, filter tanggal, ekspor CSV
│   │   │   │   ├── SettingsController.php      # Pengaturan toko & pairing perangkat Kiosk
│   │   │   │   └── StaffController.php         # Manajemen akun staf & ganti PIN 6 digit
│   │   │   ├── Display/
│   │   │   │   └── QueueDisplayController.php  # Layar TV antrean & feed polling JSON
│   │   │   ├── Kds/
│   │   │   │   └── KdsController.php           # Layar dapur KDS & endpoint transisi status
│   │   │   ├── Kiosk/
│   │   │   │   └── KioskController.php         # Layar sentuh pelanggan, checkout, QRIS, exit PIN
│   │   │   └── Pos/
│   │   │       ├── CashierShiftController.php  # Buka shift kasir, hitung rekonsiliasi kas, tutup shift
│   │   │       └── PosController.php           # Pemesanan walk-in, pembayaran kiosk, void order
│   │   └── Middleware/
│   │       ├── EnsureKioskDevice.php       # Memeriksa cookie token perangkat Kiosk terpasang
│   │       ├── EnsureShiftIsOpen.php       # Memblokir akses POS jika kasir belum buka shift
│   │       ├── EnsureUserHasRole.php       # RBAC memeriksa role: admin, kasir, atau barista
│   │       ├── HandleAppearance.php        # Pengaturan mode tema (dark/light)
│   │       └── HandleInertiaRequests.php   # Berbagi session props, auth user, dan flash toast ke React
│   ├── Models/                             # 17 Eloquent Model (Entity Representatif Database)
│   │   ├── AppSetting.php                  # Konfigurasi key-value aplikasi (nama kafe, pajak, dll)
│   │   ├── AuditLog.php                    # Catatan permanen tindakan staf
│   │   ├── CashierShift.php                # Rekaman shift kasir beserta modal awal & setoran akhir
│   │   ├── Category.php                    # Kategori menu makanan/minuman
│   │   ├── Distributor.php                 # Pemasok bahan baku
│   │   ├── Ingredient.php                  # Data stok bahan baku, satuan, dan biaya per unit
│   │   ├── KioskDevice.php                 # Entitas mesin kiosk fisik yang di-pairing token
│   │   ├── MenuItem.php                    # Data menu, harga jual, status ketersediaan
│   │   ├── MenuItemIngredient.php          # Tabel pivot Bill of Materials (Resep: Menu -> Bahan)
│   │   ├── ModifierGroup.php               # Grup pilihan (contoh: Sugar Level, Milk Choice)
│   │   ├── ModifierOption.php              # Pilihan opsi (Normal Sugar, Oat Milk [+Rp 6.000])
│   │   ├── Order.php                       # Header transaksi penjualan (Nomor antrean, total, status)
│   │   ├── OrderItem.php                   # Detail menu yang dipesan beserta snapshot harga & HPP
│   │   ├── OrderItemModifier.php           # Detail modifier yang dipilih per item pesanan
│   │   ├── Payment.php                     # Detail pembayaran (Metode tunai/QRIS, jumlah, kembalian)
│   │   ├── StockMovement.php               # Buku besar mutasi stok bahan baku
│   │   └── User.php                        # Akun staf (Admin, Kasir, Barista) + PIN hash
│   └── Services/                           # Jantung Logika Bisnis (Domain Engine)
│       ├── AuditLogService.php             # Pencatat aktivitas audit yang tidak dapat diubah
│       ├── BomCostService.php              # Kalkulator HPP (COGS) dan margin keuntungan resep
│       ├── InventoryService.php            # Manajemen mutasi stok, restock, waste, dan deduct
│       ├── MenuAvailabilityService.php     # Deteksi otomatis ketersediaan menu berdasarkan stok
│       ├── OrderService.php                # Orkestrator pembuatan order, pelunasan, dan void
│       ├── PinAuthorizationService.php     # Validator PIN 6-digit Supervisor/Admin
│       ├── QueueNumberGenerator.php        # Generator nomor antrean unik harian berbasis lock
│       └── SimulatedQrisGateway.php        # Mock payment gateway QRIS untuk pengujian lokal
├── database/
│   ├── migrations/                         # 14 file migrasi skema tabel domain
│   └── seeders/                            # Seeder database untuk inisialisasi awal
│       ├── AppSettingSeeder.php            # Default pengaturan sistem
│       ├── CatalogAndInventorySeeder.php   # Katalog menu kopi, bahan baku, resep BOM
│       ├── DatabaseSeeder.php              # Master caller seeder
│       └── StaffSeeder.php                 # Akun default Owner, Kasir, dan Barista
├── resources/
│   ├── css/
│   │   └── app.css                         # Konfigurasi Tailwind CSS v4, tema amber/charcoal, font-money
│   └── js/
│       ├── components/                     # Reusable React UI Components
│       │   ├── kiosk/                      # Komponen khusus Kiosk (ModifierSheet, PinExitModal)
│       │   ├── pos/                        # Komponen khusus POS (NumPad, SupervisorPinModal, Struk Termal)
│       │   ├── ui/                         # Komponen basis Shadcn UI (Dialog, Button, Input, Table)
│       │   ├── app-logo.tsx                # Ikon & logo coffee shop
│       │   └── stock-level-bar.tsx         # Indikator visual level stok bahan baku
│       ├── hooks/                          # Custom React Hooks
│       │   ├── use-flash-toast.ts          # Menampilkan notifikasi flash message dari Laravel session
│       │   └── use-polling.ts              # Melakukan auto-refresh berkala (KDS, antrean POS, TV)
│       ├── layouts/                        # Template pembungkus halaman
│       │   ├── our-coffee-rail-layout.tsx  # Layout sidebar navigasi admin & kasir berdesain mewah
│       │   └── auth-layout.tsx             # Layout halaman login
│       ├── pages/                          # Halaman Tampilan Inertia.js (1-to-1 dengan Controller)
│       │   ├── admin/                      # Halaman manajemen admin (Dashboard, Menu, Bahan, Laporan)
│       │   ├── display/queue.tsx           # Layar Display Antrean TV
│       │   ├── kds/index.tsx               # Layar Kitchen Display System untuk barista
│       │   ├── kiosk/index.tsx             # Layar pemesanan mandiri pelanggan
│       │   └── pos/                        # Halaman POS (index.tsx) dan Buka/Tutup Shift (shift.tsx)
│       ├── stores/
│       │   └── kiosk-cart-store.ts         # Zustand store untuk keranjang belanja Kiosk
│       └── types/                          # Definisi interface TypeScript global
└── routes/
    ├── web.php                             # Seluruh route HTTP web aplikasi
    └── settings.php                        # Route profil pengguna
```

---

## 4. SKEMA BASIS DATA & RELASI ELOQUENT (DATA LAYER)

Basis data Our Coffee dirancang ternormalisasi (3NF) dengan integritas referensial yang kuat menggunakan *Foreign Keys* dan *Cascade Restrictions* untuk menjaga konsistensi keuangan kafe.

```mermaid
erDiagram
    USERS ||--o{ CASHIER_SHIFTS : "membuka/menutup"
    USERS ||--o{ ORDERS : "melayani sebagai kasir"
    USERS ||--o{ AUDIT_LOGS : "melakukan aksi"
    KIOSK_DEVICES ||--o{ ORDERS : "menghasilkan order"
    CATEGORIES ||--o{ MENU_ITEMS : "mengelompokkan"
    DISTRIBUTORS ||--o{ INGREDIENTS : "memasok bahan default"
    DISTRIBUTORS ||--o{ STOCK_MOVEMENTS : "pemasok saat restock"
    
    MENU_ITEMS ||--o{ MENU_ITEM_INGREDIENTS : "memiliki komposisi"
    INGREDIENTS ||--o{ MENU_ITEM_INGREDIENTS : "menjadi bagian resep"
    INGREDIENTS ||--o{ STOCK_MOVEMENTS : "memiliki histori mutasi"
    INGREDIENTS ||--o{ MODIFIER_OPTIONS : "dikonsumsi oleh modifier"
    
    MODIFIER_GROUPS ||--o{ MODIFIER_OPTIONS : "memiliki opsi pilihan"
    
    CASHIER_SHIFTS ||--o{ ORDERS : "mewadahi transaksi kasir"
    ORDERS ||--o{ ORDER_ITEMS : "memiliki rincian item"
    ORDERS ||--o{ PAYMENTS : "memiliki rekaman bayar"
    ORDER_ITEMS ||--o{ ORDER_ITEM_MODIFIERS : "memiliki pilihan kustomisasi"
```

### 4.1 Tabel-Tabel Utama & Karakteristik Penting
1. **`ingredients`**:
   - Kolom: `id`, `name`, `unit` (g/ml/pcs), `current_stock` (DECIMAL 12,3), `cost_per_unit` (INT Rupiah), `minimum_stock_alert` (DECIMAL 12,3), `is_active`.
   - Menggunakan presisi 3 desimal untuk mendukung takaran akurat gram/mililiter (misal: 18.5 gram espresso beans atau 120.0 ml oat milk).
2. **`menu_item_ingredients` (Tabel Pivot BOM)**:
   - Kolom: `id`, `menu_item_id`, `ingredient_id`, `quantity` (DECIMAL 12,3).
   - Menghubungkan Menu ke Bahan Baku dengan kuantitas yang dibutuhkan per 1 porsi menu.
3. **`stock_movements` (Kartu Stok / Ledger Mutasi)**:
   - Kolom: `id`, `ingredient_id`, `type` (`restock`, `sale`, `waste`, `opname`), `quantity_change`, `stock_before`, `stock_after`, `unit_cost`, `total_cost`, `reference_type`, `reference_id`, `notes`, `created_by`.
   - Menjamin bahwa perubahan stok sekecil apa pun dapat diaudit asal-usulnya.
4. **`orders`**:
   - Kolom: `id`, `order_number` (format unik: `OC-YYYYMMDD-XXXX`), `queue_number` (format harian: `A-001`), `queue_date`, `channel` (`kiosk`, `pos`), `order_type` (`dine_in`, `takeaway`), `status` (`pending_payment`, `paid`, `preparing`, `ready`, `completed`, `cancelled`, `voided`), `subtotal`, `discount_amount`, `total_amount`, `cogs_total`, `cashier_shift_id`, `cashier_id`, `kiosk_device_id`.
5. **`order_items` & `order_item_modifiers`**:
   - Merekam **snapshot harga dan HPP** pada saat transaksi terjadi (`unit_price`, `unit_cogs`, `line_total`, `price_delta`).
   - *Penting*: Data ini tidak menggunakan relasi *live* ke harga menu saat ini, agar laporan laba masa lalu tidak berubah ketika harga menu diubah di masa depan!
6. **`cashier_shifts`**:
   - Merekam shift kasir dengan `starting_cash` (modal awal), `expected_cash_end` (kalkulasi sistem dari uang tunai masuk), `actual_cash_end` (uang fisik yang dihitung kasir saat tutup shift), dan `difference_amount` (selisih lebih/kurang).

---

## 5. BEDAH LOGIKA BISNIS: 8 SERVICE LAYER UTAMA

### 5.1 `OrderService.php` (Pengelola Siklus Transaksi)
- **`createOrder(array $payload): Order`**:
  1. Validasi keranjang belanja tidak kosong.
  2. Memeriksa ketersediaan stok bahan secara *real-time* via `MenuAvailabilityService::findUnavailableCartItems()`.
  3. Membuka `DB::transaction()`.
  4. Menghasilkan nomor antrean baru dan nomor order via `QueueNumberGenerator`.
  5. Mengambil data Menu dan Modifiers, menghitung subtotal penjualan dan snapshot HPP unit via `BomCostService`.
  6. Menyimpan record `Order`, baris `OrderItem`, dan rincian `OrderItemModifier`.
  7. Jika ada diskon, mencatat log audit ke `AuditLogService`.
- **`markPaid(Order $order, PaymentMethod $method, ...): Order`**:
  1. Mengunci baris order dengan `lockForUpdate()`.
  2. Memverifikasi status order masih `pending_payment`.
  3. Jika pembayaran Cash, memvalidasi uang yang diterima $\ge$ total tagihan dan menghitung kembalian.
  4. Memanggil `InventoryService::deductForOrder()` untuk memotong stok fisik bahan baku secara atomik.
  5. Mencatat record `Payment` dengan status `Paid`.
  6. Mengubah status order menjadi `Paid` dan mengisi timestamp `paid_at`.
- **`transitionStatus(Order $order, OrderStatus $targetStatus): Order`**:
  - Mengatur alur status pesanan di KDS: `Paid` $\rightarrow$ `Preparing` $\rightarrow$ `Ready` $\rightarrow$ `Completed`.
  - Mendukung pembatalan 1 langkah (*undo*) jika barista salah menekan tombol status.
- **`voidOrder(Order $order, string $reason, string $adminPin, ...): Order`**:
  - Membatalkan pesanan yang salah/batal dengan otorisasi wajib PIN Admin 6-digit.
  - Mengubah status pembayaran menjadi `refunded` dan merekam detail ke `AuditLog`.

### 5.2 `InventoryService.php` (Manajemen Stok & Pencegahan Deadlock)
- **`restock(...)`**: Menambah stok bahan baku, memperbarui harga rata-rata bahan (*moving cost*), dan membuat rekaman `StockMovementType::Restock`.
- **`recordWaste(...)`**: Mengurangi stok bahan yang tumpah/kedaluwarsa dengan alasan wajib dan log audit.
- **`recordOpname(...)`**: Menyesuaikan stok sistem agar cocok dengan stok fisik aktual di gudang kafe.
- **`deductForOrder(Order $order, ...)` (Krusial untuk Ujian)**:
  - Mengumpulkan seluruh bahan yang dibutuhkan oleh menu dan modifier item.
  - **Pencegahan Deadlock**: Mengeksekusi `sort($ingredientIds)` agar semua proses transaksi selalu mengunci baris bahan baku dengan urutan ID yang sama.
  - Mengambil data bahan dengan `lockForUpdate()`.
  - Memeriksa apakah stok fisik mencukupi. Jika kurang, melempar `StockConflictException`.
  - Mengurangi kolom `current_stock` dan membuat entri mutasi `StockMovementType::Sale` yang merujuk pada `order_id`.

### 5.3 `BomCostService.php` (Kalkulasi HPP & Margin Laba)
- Menghitung HPP formula:
  $$\text{COGS} = \sum (\text{Qty Bahan} \times \text{Cost per Unit Bahan}) + \sum (\text{Qty Modifier Bahan} \times \text{Cost per Unit})$$
- Menghitung Laba Kotor dan Persentase Margin:
  $$\text{Gross Profit} = \text{Selling Price} - \text{COGS}$$
  $$\text{Margin \%} = \left(\frac{\text{Gross Profit}}{\text{Selling Price}}\right) \times 100\%$$
- Menyediakan metode `previewRecipeCost()` untuk kalkulasi interaktif secara instan di UI admin saat admin menggeser takaran resep.

### 5.4 `MenuAvailabilityService.php` (Ketersediaan Menu Dinamis)
- Menentukan apakah suatu menu dapat dipesan atau harus ditampilkan "Habis" secara otomatis.
- Memeriksa flag manual `is_available` dan stok fisik seluruh bahan penyusun resep.
- Menghitung `max_servings`: porsi maksimal yang bisa disajikan berdasarkan bahan baku yang paling kritis (*bottleneck ingredient*). Contoh: jika bubuk kopi cukup untuk 20 cangkir, tapi susu hanya tersisa untuk 3 cangkir latte, maka `max_servings` Latte adalah 3 porsi.
- Mencegah masalah query N+1 dengan memanfaatkan *eager loading* `recipeItems.ingredient`.

### 5.5 `QueueNumberGenerator.php` (Generator Antrean Harian Unik)
- Menghasilkan nomor antrean format `A-001`, `A-002` yang **otomatis ter-reset menjadi `A-001` setiap pergantian hari** (berdasarkan zona waktu `Asia/Jakarta`).
- Menggunakan `Order::whereDate('queue_date', $today)->lockForUpdate()` untuk mencegah dua pesanan yang dibuat pada milidetik yang sama mendapatkan nomor antrean yang kembar.
- Menghasilkan format kode order permanen: `OC-YYYYMMDD-XXXX`.

### 5.6 `PinAuthorizationService.php` (Otorisasi Supervisor)
- Memvalidasi 6-digit PIN angka untuk aksi-aksi berbahaya (Void pesanan, Diskon manual, dan Keluar dari layar Kiosk).
- PIN di-*hash* menggunakan algoritma `Bcrypt` standar Laravel (`Hash::make($pin)`).
- Menolak otorisasi jika format tidak 6 digit atau jika hash tidak cocok dengan admin yang aktif.

### 5.7 `AuditLogService.php` (Jejak Rekam yang Tidak Dapat Diubah)
- Mencatat aksi-aksi penting: `order.void`, `order.discount`, `stock.waste`, `stock.opname`, `kiosk.device_paired`.
- Menyimpan ID pelaku (`actor_id`), ID yang mengotorisasi via PIN (`authorized_by`), payload JSON metadata, dan IP address pemanggil.

### 5.8 `SimulatedQrisGateway.php` & `QrisGatewayInterface.php`
- Mensimulasikan siklus hidup QRIS standar:
  - Generate QR Payload dan kode referensi unik.
  - Simulasi batas waktu kedaluwarsa (default: 300 detik / 5 menit).
  - Endpoint simulasi `simulateQrisPaid` untuk kebutuhan demonstrasi sidang tugas akhir tanpa harus menggunakan uang riil.

---

## 6. ALUR TRANSAKSI & STATE MACHINE

```
                       +-----------------------+
                       |   Pelanggan Memilih   |
                       |    di Mesin KIOSK     |
                       +-----------------------+
                                   |
                         Checkout & Pilih Bayar
                        /                      \
          Metode: QRIS /                        \ Metode: TUNAI
                      /                          \
         +--------------------------+      +---------------------------+
         | Kiosk Menampilkan QRIS   |      | Order Masuk Antrean Kasir |
         | Status: PENDING_PAYMENT  |      | Status: PENDING_PAYMENT   |
         +--------------------------+      +---------------------------+
                      |                                  |
              Scan & Bayar Berhasil               Kasir Menerima Uang
                      |                           & Tekan Tombol Lunasi
                      \                                  /
                       \                                /
                        +------------------------------+
                        |     Pembayaran Lunas         |
                        |      (Status: PAID)          |
                        |  - Stok Bahan Dipotong Atomik|
                        |  - Masuk ke Tiket KDS Dapur  |
                        |  - Tampil di TV Antrean      |
                        +------------------------------+
                                       |
                           Barista Mulai Membuat Kopi
                                       |
                        +------------------------------+
                        |     Status: PREPARING        |
                        | (Tampil "Sedang Disiapkan")  |
                        +------------------------------+
                                       |
                              Kopi Selesai Dirakit
                                       |
                        +------------------------------+
                        |       Status: READY          |
                        |   (Tampil "Siap Diambil")    |
                        +------------------------------+
                                       |
                           Pelanggan Mengambil Pesanan
                                       |
                        +------------------------------+
                        |      Status: COMPLETED       |
                        |     (Pesanan Selesai)        |
                        +------------------------------+
```

### Matriks Transisi Status Pesanan
| Status Awal | Status Tujuan yang Diizinkan | Aksi / Pemicu |
| :--- | :--- | :--- |
| `pending_payment` | `paid` | Pembayaran tunai diterima kasir / QRIS terkonfirmasi |
| `pending_payment` | `cancelled` | Pelanggan membatalkan pesanan di Kiosk sebelum bayar |
| `paid` | `preparing` | Barista menekan tombol "Proses" di KDS |
| `paid` | `voided` | Pembatalan oleh Kasir dengan otorisasi PIN Admin |
| `preparing` | `ready` | Barista menekan tombol "Siap Diambil" di KDS |
| `preparing` | `paid` *(Undo)* | Barista membatalkan status preparing (kembali ke antrean) |
| `ready` | `completed` | Minuman diserahkan ke pelanggan |
| `ready` | `preparing` *(Undo)* | Barista membatalkan status ready jika ada perbaikan racikan |

---

## 7. FRONTEND ARCHITECTURE, STATE & REAL-TIME POLLING

### 7.1 Mengapa Inertia.js?
Inertia.js menghilangkan kebutuhan membangun REST API terpisah (beserta kerumitan autentikasi JWT/OAuth, serialisasi DTO, dan duplikasi routing).
- Laravel Controller berfungsi sebagai pengatur alur data dan mengembalikan komponen React:
  ```php
  return Inertia::render('pos/index', [
      'categories' => $categories,
      'menuItems' => $menuItems,
      'pendingKioskOrders' => $pendingKioskOrders,
  ]);
  ```
- React menerima data tersebut secara langsung melalui **Props**, dengan tipe data yang ketat (*Strict TypeScript*).

### 7.2 Manajemen State Keranjang Belanja (`kiosk-cart-store.ts`)
Khusus di antarmuka Kiosk, keranjang belanja pelanggan dikelola di sisi klien menggunakan **Zustand**:
- Menyimpan daftar item belanja beserta pilihan modifikasinya.
- Menghitung total harga belanja secara lokal secara instan.
- Mendukung fitur reset otomatis jika pesanan selesai atau dibatalkan.

### 7.3 Sinkronisasi Real-Time Tanpa Beban WebSocket (`use-polling.ts`)
Alih-alih menggunakan WebSocket server (seperti Pusher atau Laravel Reverb) yang memerlukan konfigurasi daemon server dan biaya tambahan, Our Coffee menggunakan custom React hook `usePolling`:
- **KDS Dapur**: Melakukan polling setiap 5 detik ke endpoint `/kds/tickets` secara senyap (*background fetch*).
- **POS Kasir**: Melakukan polling setiap 5 detik ke `/pos/queue` untuk mendeteksi pesanan Kiosk baru yang datang untuk bayar tunai.
- **TV Antrean**: Melakukan polling setiap 4 detik ke `/display/queue/feed`.
- **Hemat Bandwidth**: Polling hanya mengambil data JSON ringan, bukan merender ulang seluruh halaman HTML.

### 7.4 Keamanan Layar Kiosk (`EnsureKioskDevice` & `pin-exit-modal.tsx`)
- Perangkat Kiosk diidentifikasi menggunakan `kiosk_device_token` yang disimpan dalam cookie terenkripsi HTTP-Only.
- Pelanggan tidak bisa keluar dari mode Kiosk untuk membuka dashboard admin karena tombol keluar dilindungi oleh modal verifikasi PIN Admin 6 digit (`PinExitModal`).

---

## 8. PANDUAN MENJAWAB PERTANYAAN DOSEN (DEFENSE Q&A GUIDE)

Gunakan panduan berikut jika dosen penguji menanyakan aspek teknis dari sistem ini:

---

### Q1: "Mengapa Anda menggunakan Service Layer? Bukankah Laravel biasanya menaruh kode di Controller atau Model?"
> **Jawaban Terbaik:**  
> "Jika kode logika bisnis diletakkan di Controller (*Fat Controller*), kode tersebut akan terduplikasi. Contohnya: logika pembuatan pesanan dan pengecekan stok dibutuhkan di 2 tempat, yaitu `KioskController` dan `PosController`. Jika ditaruh di Controller, kami harus menyalin kode yang sama dua kali.  
> Sebaliknya, jika ditaruh di Model (*Fat Model*), Model akan melanggar prinsip *Single Responsibility* karena model Eloquent seharusnya hanya merepresentasikan struktur data dan relasi tabel.  
> Oleh karena itu, kami menerapkan **Service Layer Pattern** (`OrderService`, `InventoryService`, dll.). Controller menjadi sangat ramping (*Thin Controller*), hanya bertugas memvalidasi input HTTP dan mendelegasikan proses ke Service, sehingga kode mudah diuji (*testable*) dan mudah dirawat (*maintainable*)."

---

### Q2: "Bagaimana sistem Anda menangani situasi di mana dua pelanggan memesan cangkir kopi terakhir pada detik yang sama (*race condition*)?"
> **Jawaban Terbaik:**  
> "Kami menerapkan dua lapis pertahanan:
> 1. **Pengecekan Ketersediaan Awal**: Saat item dimasukkan ke keranjang, `MenuAvailabilityService` memverifikasi stok.
> 2. **Pessimistic Locking saat Pembayaran**: Pada saat proses pelunasan di `InventoryService::deductForOrder()`, kami membungkus eksekusi dalam `DB::transaction()` dan memanggil klausa `lockForUpdate()` pada baris tabel bahan baku terkait:
>    ```php
>    Ingredient::whereIn('id', $ids)->orderBy('id')->lockForUpdate()->get();
>    ```
>    Proses ini mengunci baris bahan baku di database tingkat InnoDB engine. Transaksi kedua akan mengantre (menunggu) sampai transaksi pertama selesai melakukan pengurangan stok dan commit. Jika stok bahan baku sudah menjadi 0, transaksi kedua akan mendeteksi kekurangan stok dan secara aman melempar `StockConflictException` serta membatalkan transaksi tanpa membuat stok bernilai negatif."

---

### Q3: "Mengapa pada saat mengunci bahan baku, Anda mengurutkan ID-nya terlebih dahulu (`sort($ingredientIds)`)?"
> **Jawaban Terbaik:**  
> "Itu adalah teknik pencegahan **Deadlock (Kebuntuan Basis Data)** yang dikenal dengan prinsip *Ordered Resource Allocation*.  
> Bayangkan Order A membutuhkan Biji Kopi (ID: 1) dan Susu (ID: 2). Pada detik yang sama, Order B membutuhkan Susu (ID: 2) dan Biji Kopi (ID: 1). Jika Order A mengunci ID 1 lalu menunggu ID 2, sementara Order B mengunci ID 2 lalu menunggu ID 1, kedua proses akan saling tunggu selamanya (*Circular Wait*) dan database mengalami Deadlock.  
> Dengan selalu mengurutkan ID (`sort($ingredientIds)`), baik Order A maupun Order B akan selalu berusaha mengunci ID 1 terlebih dahulu, baru kemudian ID 2. Dengan urutan yang sama, kondisi saling tunggu melingkar menjadi mustahil terjadi."

---

### Q4: "Mengapa pemotongan stok bahan baku dilakukan saat status `PAID`, bukan saat `PENDING_PAYMENT` ketika pelanggan checkout di Kiosk?"
> **Jawaban Terbaik:**  
> "Karena di lingkungan coffee shop nyata, pelanggan yang memesan di mesin Kiosk dapat berubah pikiran, membatalkan pesanan, atau tidak pernah mendatangi kasir untuk membayar tunai.  
> Jika stok dipotong saat `PENDING_PAYMENT`, pelanggan yang meninggalkan mesin Kiosk begitu saja akan menyebabkan stok 'terkunci' palsu, sehingga kasir tidak bisa menjual kopi tersebut ke pelanggan lain yang nyata.  
> Oleh karena itu, stok hanya dipotong ketika dana sudah dipastikan masuk (status `PAID`). Namun, untuk kenyamanan pengguna, ketersediaan menu di Kiosk tetap divalidasi sebelum order dibuat."

---

### Q5: "Bagaimana cara kerja perhitungan HPP (*Cost of Goods Sold* / BOM) jika pelanggan memilih modifier seperti Extra Shot atau Ganti Susu Oat?"
> **Jawaban Terbaik:**  
> "Di tabel `modifier_options`, kami menyediakan kolom relasi opsional `ingredient_id` dan `ingredient_qty`.  
> Pada `BomCostService::calculateCogs()`, sistem menghitung HPP dasar dari tabel resep `menu_item_ingredients`. Kemudian, sistem memeriksa seluruh modifier yang dipilih pelanggan pada pesanan tersebut. Jika modifier tersebut memiliki bahan baku (contoh: opsi 'Oat Milk' mengonsumsi 200 ml susu oat, atau 'Extra Shot' mengonsumsi 18 gram biji kopi), maka biaya bahan tersebut ditambahkan ke nilai HPP item tersebut:
> $$\text{HPP Final} = \text{HPP Resep Dasar} + \sum (\text{Qty Bahan Modifier} \times \text{Harga Satuan Bahan})$$
> Nilai HPP ini kemudian diabadikan (*snapshot*) ke dalam kolom `unit_cogs` di tabel `order_items`, sehingga laporan laba kotor di masa depan tetap akurat meskipun harga beli bahan baku dari distributor mengalami kenaikan."

---

### Q6: "Bagaimana cara nomor antrean di-reset setiap hari dan bagaimana sistem menjamin nomor tidak kembar saat transaksi bersamaan?"
> **Jawaban Terbaik:**  
> "Logika ini berada di `QueueNumberGenerator::nextForDate()`.  
> Sistem mengambil tanggal hari ini menggunakan zona waktu kafe (`Asia/Jakarta`). Di dalam transaksi database dengan `lockForUpdate()`, sistem mencari pesanan terakhir pada tanggal tersebut (`whereDate('queue_date', $today)`).  
> Jika belum ada pesanan sama sekali pada hari itu (misalnya pesanan pertama di pagi hari), nomor otomatis mulai dari urutan 1 (`A-001`). Jika sudah ada, sistem mengekstrak angka terakhir menggunakan regex dan menambahkan 1 (`A-002`, `A-003`, dst.).  
> Penggunaan `lockForUpdate()` memastikan bahwa pembacaan dan pembuatan nomor antrean bersifat serial dan terlindungi dari *race condition*."

---

### Q7: "Apa keuntungan arsitektur Inertia.js dibanding membuat Single Page Application (SPA) terpisah dengan REST API?"
> **Jawaban Terbaik:**  
> "Inertia.js memberikan produktivitas monolitik dengan pengalaman pengguna modern setara SPA:
> 1. **Tidak Memerlukan API Endpoint Tambahan**: Controller dapat langsung mengembalikan data yang dibutuhkan tanpa harus membuat `ApiResource`, rute API ganda, dan dokumentasi Swagger terpisah.
> 2. **Keamanan Bawaan**: Autentikasi menggunakan session berbasis cookie standar Laravel yang aman dari serangan XSS (karena token tidak disimpan di LocalStorage browser) dan terlindungi dari CSRF secara otomatis.
> 3. **Type-Safety yang Terjaga**: Props yang dikirim dari controller Laravel dapat dipetakan langsung ke antarmuka TypeScript di React.
> 4. **Performa**: Tidak ada overhead *full page reload* karena transisi antar halaman dilakukan melalui pertukaran JSON di balik layar."

---

## 9. PANDUAN MENAMBAH FITUR BARU (HOW-TO TUTORIAL)

Gunakan panduan *step-by-step* ini jika Anda diminta oleh dosen atau ingin mengembangkan fitur baru pada aplikasi Our Coffee:

---

### Kasus A: Menambah Metode Pembayaran Baru (Contoh: "Debit Card")
Jika Anda ingin menambahkan metode pembayaran Kartu Debit pada kasir:

1. **Perbarui Enum Backend** (`app/Enums/PaymentMethod.php`):
   ```php
   enum PaymentMethod: string
   {
       case Cash = 'cash';
       case Qris = 'qris';
       case Debit = 'debit'; // Tambahkan opsi ini
       
       public function label(): string
       {
           return match ($this) {
               self::Cash => 'Tunai',
               self::Qris => 'QRIS',
               self::Debit => 'Kartu Debit',
           };
       }
   }
   ```
2. **Perbarui Validasi di Controller** (`app/Http/Controllers/Pos/PosController.php`):
   Pastikan metode pembayaran baru diizinkan pada validasi input:
   ```php
   'payment_method' => ['required', Rule::enum(PaymentMethod::class)],
   ```
3. **Perbarui Komponen Kasir di Frontend** (`resources/js/pages/pos/index.tsx`):
   Tambahkan tombol pilihan pembayaran "Debit" di samping pilihan "Tunai", dan sesuaikan payload yang dikirim ke route `pos.orders.store` atau `pos.orders.pay`.

---

### Kasus B: Menambah Role Pengguna Baru (Contoh: "Gudang / Inventory Officer")
Jika Anda ingin membuat staf khusus yang hanya boleh mengelola stok dan bahan baku:

1. **Perbarui Enum Role** (`app/Enums/UserRole.php`):
   ```php
   enum UserRole: string
   {
       case Admin = 'admin';
       case Kasir = 'kasir';
       case Barista = 'barista';
       case Gudang = 'gudang'; // Tambahkan ini
       
       public function homeRoute(): string
       {
           return match ($this) {
               self::Admin => 'admin.dashboard',
               self::Kasir => 'pos.index',
               self::Barista => 'kds.index',
               self::Gudang => 'admin.inventory.index', // Redirect khusus
           };
       }
   }
   ```
2. **Daftarkan Izin di Rute** (`routes/web.php`):
   Ubah middleware pada grup inventaris admin agar mengizinkan role `gudang`:
   ```php
   Route::middleware(['auth', 'role:admin,gudang'])->prefix('admin')->group(function () {
       Route::get('inventory', [InventoryController::class, 'index'])->name('inventory.index');
       Route::post('inventory/ingredients/{ingredient}/restock', [InventoryController::class, 'restock']);
   });
   ```
3. **Perbarui Menu Navigasi** (`resources/js/layouts/our-coffee-rail-layout.tsx`):
   Filter item navigasi sidebar agar user dengan role `gudang` hanya melihat menu "Inventaris" dan "Distributor".

---

### Kasus C: Menambah Atribut Baru pada Menu (Contoh: "Kalori / Calories")
Jika kafe ingin mencantumkan informasi kalori pada setiap menu kopi:

1. **Buat File Migrasi Database Baru**:
   Jalankan:
   ```bash
   php artisan make:migration add_calories_to_menu_items_table --table=menu_items
   ```
   Isi migrasi:
   ```php
   Schema::table('menu_items', function (Blueprint $table) {
       $table->unsignedSmallInteger('calories')->nullable()->after('description');
   });
   ```
   Jalankan `php artisan migrate`.
2. **Perbarui Model** (`app/Models/MenuItem.php`):
   Tambahkan `'calories'` ke dalam properti `$fillable` dan `$casts`:
   ```php
   protected $fillable = [..., 'calories'];
   protected $casts = [..., 'calories' => 'integer'];
   ```
3. **Perbarui Validasi Form Admin** (`app/Http/Controllers/Admin/MenuItemController.php`):
   Tambahkan aturan validasi: `'calories' => ['nullable', 'integer', 'min:0']`.
4. **Perbarui Tampilan Form Admin & Kartu Kiosk**:
   - Di `resources/js/pages/admin/menus/index.tsx`: tambahkan input field kalori pada modal tambah/edit menu.
   - Di `resources/js/pages/kiosk/index.tsx`: tampilkan badge kecil kalori (misal: "120 kkal") pada kartu menu minuman.

---

## 10. KREDENSIAL DEFAULT & PERINTAH ESENSIAL

### 10.1 Akun Default Sistem (Hasil Database Seeder)
| Role Akun | Email Pengguna | Password | PIN Otorisasi (6 Digit) |
| :--- | :--- | :--- | :--- |
| **Owner / Admin** | `admin@ourcoffee.test` | `password` | **`123456`** |
| **Kasir Utama** | `kasir@ourcoffee.test` | `password` | *Tidak memiliki PIN supervisor* |
| **Barista Utama** | `barista@ourcoffee.test` | `password` | *Tidak memiliki PIN supervisor* |

> *Catatan Keamanan*: PIN **`123456`** digunakan oleh Admin untuk mengesahkan diskon, membatalkan (*void*) pesanan yang salah di kasir, dan membuka kunci keluar dari layar Kiosk.

### 10.2 Perintah Operasional Esensial (Terminal Cheat Sheet)

```bash
# 1. Reset database ke kondisi awal beserta data dummy lengkap:
php artisan migrate:fresh --seed

# 2. Menjalankan seluruh pengujian otomatis (72 Automated Feature & Unit Tests):
php artisan test

# 3. Menjalankan pengujian spesifik untuk satu modul (contoh: POS):
php artisan test --filter=PosTest

# 4. Memeriksa seluruh daftar rute URL yang terdaftar di aplikasi:
php artisan route:list

# 5. Membersihkan cache konfigurasi, rute, dan tampilan:
php artisan optimize:clear

# 6. Menjalankan kompilasi aset frontend (Development Server):
npm run dev

# 7. Membangun aset frontend siap produksi (Production Build):
npm run build
```

---

*Dokumen ini dibuat secara otomatis sebagai catatan penguasaan teknis dan panduan komprehensif sistem **Our Coffee**.*  
*Simpan berkas ini sebagai referensi utama Anda saat menghadapi pertanyaan dosen atau ketika melakukan ekspansi fitur di masa mendatang.*
