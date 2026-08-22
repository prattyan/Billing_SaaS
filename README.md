# Multi-Tenant Grocery / Shop Billing & Inventory SaaS

A modern, full-featured multi-tenant POS billing, barcode inventory, and customer management SaaS platform designed for grocery counters, convenience stores, and supermarkets.

---

## 🚀 Quick Start (Zero Docker Required)

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Full Application (Backend + Frontend)
From the root folder, simply run:
```bash
npm run dev
```

This single command concurrently starts:
- **NestJS REST API**: [http://localhost:4000/api/v1](http://localhost:4000/api/v1) (Swagger API Docs at `/api/docs`)
- **Next.js Web App**: [http://localhost:3000](http://localhost:3000)

---

## 🔑 Demo Login Credentials

The local database (`apps/api/prisma/dev.db`) comes pre-seeded with sample inventory, categories, suppliers, and users:

| Account Type | Email | Password | Access |
|---|---|---|---|
| **Shop Owner** | `owner@demo-grocery.com` | `Owner@123` | Full shop management (POS, Inventory, Reports, Subscriptions, Settings) |
| **Cashier / Biller** | `biller@demo-grocery.com` | `Biller@123` | Counter sales billing & stock search only |
| **Platform Super Admin** | `admin@billingsaas.com` | `SuperAdmin@123` | Platform portal (`/superadmin`) with all shops, live SKU counts & plan overrides |

---

## 📋 Database Management

The local database uses SQLite out of the box with zero external database installation required.

```bash
# Push schema changes to database
npm run db:push

# Re-seed demo data
npm run db:seed

# Open Prisma Studio web inspector
npm run db:studio
```

---

## 📦 Features Included

- **POS Billing Counter (`/pos`)**: USB HID barcode scanner support, real-time product search, customer phone lookup & loyalty points, multi-payment options, cart hold/resume, and 58mm/80mm thermal receipt printing.
- **Inventory Management (`/inventory`)**: SKU capacity plan enforcement, 7-day grace period logic, barcode quick restock modal, and low-stock filters.
- **Customer CRM (`/customers`)**: Auto-captured profiles, purchase history drawer, and loyalty point rewards.
- **Suppliers & Purchase Orders (`/suppliers`)**: Vendor directory, PO creation, and automated restock on PO receipt.
- **GST & Analytics Reports (`/reports`)**: Sales turnover, fast movers, critical shortage alerts, 50/50 CGST+SGST tax breakdown, and immutable stock audit logs.
- **Subscriptions & Cashfree (`/subscription`)**: Live SKU capacity meter and instant automated plan tier upgrades.
- **Shop Settings (`/settings`)**: GSTIN, invoice prefixes, cashier staff accounts, and WhatsApp e-bill toggles.
- **Super Admin Platform (`/superadmin`)**: Global GMV and SaaS revenue metrics, tenant table, manual plan overrides, and shop suspension controls.
