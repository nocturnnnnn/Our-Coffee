# Our Coffee

Full-stack cafe operations platform unifying **Self-Ordering Kiosk**, **POS Kasir & Shift Management**, **Kitchen Display System (KDS)**, **Public Queue Display**, and **Backoffice Inventory & Analytics**. Built with **Laravel 13**, **Inertia.js v3**, **React 19**, **TypeScript**, **Tailwind CSS v4**, and **MariaDB (`oc_db`)**.

---

## Core Modules & Features

### 1. Self-Ordering Kiosk (`/kiosk`)

- **Device Pairing**: Authorized via `/kiosk/pair/{token}` (`kiosk.device` middleware) without requiring staff authentication on the lobby tablet.
- **6-Step Ordering Flow**: Welcome/idle screen -> Category & Menu browsing -> Dynamic modifier customization (Size, Sugar, Ice, Add-on) -> Cart drawer -> Dine-In / Takeaway & Payment selection -> Order confirmation & queue ticket.
- **Touch & Kiosk Hardening**: Minimum `64x64px` touch targets, zoom/context-menu lock, 60-second idle auto-reset (with 50-second warning countdown), and 8-second post-confirmation reset.
- **Real-Time Stock & Payment**: 5-second menu availability polling, atomic `409 Conflict` stock guard at checkout, **Pay at Cashier** (`A-001` queue ticket), and simulated QRIS support.
- **Protected Exit**: Hidden Admin exit gesture verified by 6-digit Supervisor/Admin PIN (`POST /kiosk/exit`, rate-limited `throttle:15,1`).

### 2. POS Kasir & Shift Management (`/pos`, `/pos/shift`)

- **Mandatory Cash Shift**: Cashiers must open a shift with an opening cash amount before accessing the register and close with actual drawer count & variance tracking.
- **3-Column Register Layout**: Category/menu grid, live Kiosk Unpaid Queue (`3s` polling) + active order items, and tender panel with `60x60px` touch NumPad.
- **Order Operations**: Walk-in order creation, Kiosk Pay-at-Cashier settlement (Tunai / Cash with touch NumPad), and Supervisor 6-digit PIN void (`POST /pos/orders/{order}/void`, `throttle:15,1`) with automatic stock rollback and audit logging.
- **Thermal Receipt Printing**: Dedicated `58mm` / `80mm` `@media print` thermal receipt layout.

### 3. Kitchen Display System (`/kds`)

- **3-Column FIFO Kanban**: `Paid` -> `Preparing` -> `Ready` -> `Completed` workflow (`3s` polling).
- **Barista Ergonomics**: SLA color timers (`<5m` normal, `5-10m` amber, `>10m` red border), highlighted non-default modifier pills, `52px` action buttons, optimistic status transitions with a 5-second Undo toast, and Web Audio chime for incoming tickets.

### 4. Public Queue Display (`/display/queue`)

- Lobby status screen showing **Sedang Disiapkan** (`Preparing`) and **Siap Diambil** (`Ready`) queue numbers (`4s` polling).

### 5. Backoffice Admin (`/admin/*`)

- **Analytics Dashboard (`/admin/dashboard`)**: 30-second polling KPIs, 7/30-day revenue SVG chart, Kiosk vs POS donut breakdown, 24-hour peak hours heatmap, Top 5 bestsellers, and low-stock alerts.
- **Catalog, Modifiers & BOM (`/admin/categories`, `/admin/menus`, `/admin/modifiers`)**: Menu management with Bill of Materials (BOM) recipe builder, automatic HPP (COGS) & profit margin calculation, and manual/stock availability toggles.
- **Inventory & Distributors (`/admin/inventory`, `/admin/distributors`)**: Ingredient catalog, supplier tracking, weighted-average-cost restocking, waste logging, stock opname reconciliation, and an immutable `stock_movements` ledger backed by `DB::transaction` + `lockForUpdate`.
- **Reports, Staff, Audit & Settings (`/admin/reports`, `/admin/staff`, `/admin/audit-logs`, `/admin/settings`)**: Filtered sales/margin/inventory reports with CSV export, staff & 6-digit PIN management, immutable audit trail, store profile settings, and Kiosk device token management/rotation.

---

## Roles & Access Control (RBAC)

| Role / Surface                    | Route Prefix                   | Permissions & Access                                                                          |
| :-------------------------------- | :----------------------------- | :-------------------------------------------------------------------------------------------- |
| **Admin** (`admin`)               | `/admin/*`, `/pos/*`, `/kds/*` | Full access to backoffice, inventory, reports, staff/PIN management, settings, POS, and KDS   |
| **Kasir** (`kasir`)               | `/pos/*`                       | Shift open/close, walk-in orders, settle Kiosk queue orders, void orders (requires Admin PIN) |
| **Barista** (`barista`)           | `/kds/*`                       | View live kitchen tickets and advance order preparation statuses                              |
| **Kiosk Device** (`kiosk.device`) | `/kiosk/*`                     | Paired via `kiosk_devices.device_token`; self-ordering & QRIS/Cashier checkout only           |
| **Public Display**                | `/display/queue`               | Read-only lobby queue monitor                                                                 |

---

## Tech Stack & Design System

- **Backend**: PHP 8.3+, Laravel 13, Laravel Fortify, Laravel Wayfinder, MariaDB (`oc_db` / `oc_db_testing`)
- **Frontend**: Inertia.js v3, React 19, TypeScript, Tailwind CSS v4, `shadcn/ui` (Radix UI), Zustand, Sonner, Lucide React, Vite Plus (`vp`)
- **Tooling & Quality**: Laravel Pint, Larastan / PHPStan (Level 7), Pest 5, TypeScript (`tsc --noEmit`), Vite Plus Check (`vp check`)
- **Design Tokens**: Espresso (`#1c120d`), Crema (`#b45309`), Oat (`#faf7f2`), Latte (`#eadfd3`), typography in `Plus Jakarta Sans` & `JetBrains Mono`
- **Domain Conventions**:
    - Currency stored as integer **Rupiah (IDR)** (`id-ID` formatting, no decimals)
    - All timestamps and daily `A-001` queue resets operate in `Asia/Jakarta` (WIB)

---

## Architecture & Database (`oc_db`)

Core domain logic lives in `app/Services/` and `app/Contracts/`:

- `OrderService` — Order creation, Kiosk/POS settlement, KDS transitions, and PIN-authorized void with stock rollback
- `InventoryService` — Atomic `DB::transaction` + `lockForUpdate` stock deduction, restock, waste, and opname ledger recording
- `BomCostService` — Ingredient BOM cost calculation (HPP) and gross margin analysis
- `MenuAvailabilityService` — Real-time menu purchasability checks against BOM ingredient stock
- `QueueNumberGenerator` — Daily-reset `A-001` queue numbering (`Asia/Jakarta`)
- `PinAuthorizationService` — 6-digit Admin/Supervisor PIN verification
- `AuditLogService` — Security & operational action trail
- `QrisGatewayInterface` -> `SimulatedQrisGateway` — Swappable QRIS payment provider contract

The schema comprises 18 domain tables created across 14 domain migrations (plus Laravel system tables): `users` (with `role`, `pin_hash`, `is_active`), `kiosk_devices`, `categories`, `distributors`, `ingredients`, `menu_items`, `modifier_groups`, `modifier_options`, `menu_item_ingredients`, `stock_movements`, `cashier_shifts`, `orders`, `order_items`, `order_item_modifiers`, `payments`, `audit_logs`, and `app_settings`.

---

## Getting Started

### Prerequisites

- PHP `^8.3` with `pdo_mysql` extension
- Composer
- Node.js `22+` & npm
- MariaDB or MySQL (`127.0.0.1:3306`)

### Installation

```bash
# 1. Install PHP and JavaScript dependencies
composer install
npm install

# 2. Configure environment
cp .env.example .env
php artisan key:generate
```

Create the databases in MariaDB/MySQL (adjust `.env` and `phpunit.xml` credentials if needed):

```sql
CREATE DATABASE IF NOT EXISTS oc_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS oc_db_testing CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Run migrations, seed sample cafe data, and build frontend assets:

```bash
php artisan migrate:fresh --seed
npm run build
```

Start the local development stack (Laravel server, queue/logs, and Vite):

```bash
composer dev
```

---

## Default Seeded Accounts & Kiosk Pairing

| Role        | Email                    | Password   | 6-Digit PIN |
| :---------- | :----------------------- | :--------- | :---------- |
| **Admin**   | `admin@ourcoffee.test`   | `password` | `123456`    |
| **Kasir**   | `kasir@ourcoffee.test`   | `password` | —           |
| **Barista** | `barista@ourcoffee.test` | `password` | —           |

- **Default Kiosk Pairing URL**: `/kiosk/pair/our-coffee-kiosk-lobby-1-token`
- **Public Queue Display URL**: `/display/queue`

---

## Testing & Code Quality

```bash
# Run full backend verification (Pint lint check, PHPStan Level 7, Pest test suite)
composer test

# Frontend typechecking and Vite Plus formatting/lint check
npm run types:check
npm run check

# Full CI check (frontend + backend)
composer ci:check
```

---

## Roadmap

Implementation phases **Alur 1 - Alur 8** are documented in [implementation_plan.md](implementation_plan.md).
