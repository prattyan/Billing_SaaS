# Cloud POS Billing, Barcode Inventory & SaaS Platform

A modern, high-performance, multi-tenant POS billing, barcode inventory, and customer management SaaS platform designed for retail shops, supermarkets, and multi-branch grocery businesses.

---

## 🌟 Key Features

### ⚡ High-Speed POS Billing Counter
- **Instant Barcode Scanning**: Full USB HID barcode scanner support with instant product lookups.
- **Smart Loyalty Rewards Engine**: Automatically awards **1 Loyalty Point for every ₹100 spent**, with real-time redemption (1 pt = ₹1 discount) on future orders.
- **Returning Customer Auto-Fetch**: Enter a contact number to automatically fetch returning customer details and loyalty balances.
- **Cart Management**: Real-time tax calculation (GST 5%, 12%, 18%, 28%), cart hold/park & resume, and manual bill discounts.
- **80mm Thermal Receipt Printing**: Realistic portrait receipt print animation with live item breakdowns, payment modes, and self-scan QR codes.

### 📲 1-Click WhatsApp Direct Invoicing
- **Zero-Cost Digital Bill Delivery**: Send itemized digital tax invoices directly to customer WhatsApp numbers in one click.
- **Clean Cross-Platform Formatting**: Universal WhatsApp bold markdown typography without emoji corruption.
- **Interactive Customer Digital Receipt**: Dedicated mobile-responsive portrait e-receipt view (`/bill/:id`) with download, print, and self-scan capabilities.

### 📦 Multi-Tenant Inventory & SKU Tracking
- **Automated Stock Sync**: Decrements inventory in real time with transactional integrity on every sale and restock.
- **Low Stock & Expiry Alerts**: Visual threshold indicators and quick-action restock modals.
- **Categories & Suppliers**: Supplier directory and Purchase Order (PO) workflows.

### 📊 GST & Business Analytics
- **Tax Breakdown**: Automated 50/50 CGST + SGST reporting.
- **Live Sales Dashboard**: Daily revenue, top-selling products, transaction history, and inventory movements.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Vanilla CSS Design System, Zustand, Lucide Icons
- **Backend**: NestJS, TypeScript, Prisma ORM, JWT Authentication & Role Guards
- **Database**: PostgreSQL (Supabase / RDS / Local)
- **Monorepo**: Turborepo & Concurrently workspace

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/prattyan/Billing_SaaS.git
cd Billing_SaaS
```

### 2. Configure Environment Variables
Create `.env` files in `apps/api` and `apps/web` based on the provided `.env.example` templates:

```bash
# In apps/api/.env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
JWT_SECRET=your_jwt_secret_key
PORT=4000
APP_BASE_URL=http://localhost:3000

# In apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Setup Database
```bash
# Push Prisma schema to your database
npm run db:push --prefix apps/api

# (Optional) Seed initial configuration
npm run seed --prefix apps/api
```

### 5. Run the Application
```bash
npm run dev
```

This single command concurrently starts:
- **API Server**: [http://localhost:4000/api/v1](http://localhost:4000/api/v1) (Swagger Docs at `/api/docs`)
- **Web Frontend**: [http://localhost:3000](http://localhost:3000)

---

## 📜 License

This project is licensed under the MIT License.
