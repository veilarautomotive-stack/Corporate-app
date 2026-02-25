# Retail Integrity OS

A production-grade, web-based Retail Business Operating System ensuring financial integrity, capital discipline, and zero calculation errors.

## Features

- **Database-Driven Logic**: All financial calculations are performed transactionally in the backend.
- **Ledger-Enforced**: Every financial action is recorded in an immutable ledger.
- **Zero UI Calculations**: The frontend is purely for presentation.
- **Role-Based Access**: Admin and Staff roles.
- **Theme Support**: Light and Dark modes.
- **Secure Authentication**:
  - Database-backed user management.
  - Secure password hashing (bcrypt).
  - JWT-based session management (HTTP-only cookies).
  - Registration and Login flows.

## Getting Started

1. **Login**:
   - Username: `admin`
   - Password: `admin123`
   - Or register a new account via the "Create new account" link.

2. **Dashboard**: View key metrics and financial health.
3. **Inventory**: Manage products, stock levels, and pricing.
4. **POS**: Process sales with real-time stock validation.
5. **Expenses**: Record operational expenses (deducted from Profit Pool).
6. **Finance**: View capital structure and distribute profits.

## Architecture

- **Frontend**: React + Tailwind CSS + Recharts
- **Backend**: Express + Better-SQLite3
- **Database**: SQLite (Embedded) with strict schema and views.

## Integrity Rules

- **No Selling Without Stock**: The system blocks sales if inventory is insufficient.
- **No Spending Without Profit**: Expenses are rejected if the Profit Pool is empty.
- **Capital Protection**: Restocking deducts from Capital first, then Profit Pool.
- **Audit Trail**: All actions are logged in the `ledger` table.
