# IPO Management System - Setup & Usage Guide

This guide explains how to clone, configure, and run the **IPO Management System** on both **macOS** and **Windows**.

---

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed on your machine:

1. **Node.js** (v18.x or v20.x, LTS recommended)
   - [Download Node.js](https://nodejs.org/)
2. **PostgreSQL Database** (v14 or newer)
   - [Download PostgreSQL](https://www.postgresql.org/download/)
   - Alternatively, you can run PostgreSQL via Docker:
     ```bash
     docker run --name ipo-postgres -e POSTGRES_PASSWORD=postgres_secure_pass -p 5432:5432 -d postgres
     ```

---

## 📥 1. Cloning the Repository

Open your terminal (macOS **Terminal** or Windows **PowerShell / CMD**) and run:

```bash
git clone https://github.com/Anuj55112/ipo_Management.git
cd ipo_Management
```

---

## ⚙️ 2. Environment Configuration

1. Create a `.env` file in the root directory of the project.
2. Define your database connection string as `DATABASE_URL`:

### On macOS / Windows:
```env
DATABASE_URL="postgresql://<db_username>:<db_password>@<host>:<port>/<db_name>"
```

*Example for local PostgreSQL (default username `postgres` and password `postgres_secure_pass`):*
```env
DATABASE_URL="postgresql://postgres:postgres_secure_pass@localhost:5432/ipo_management"
```

---

## 📦 3. Installing Dependencies

Install the project node packages:

```bash
npm install
```

---

## 🗄️ 4. Setting Up the Database

Next.js uses Prisma ORM to interact with the database. Synchronize your local PostgreSQL database schema and generate the Prisma Client:

```bash
# Push the schema structure to your database
npx prisma db push

# Generate client typescript bindings
npx prisma generate
```

---

## 🚀 5. Running the Application

### Development Mode
Start the local server. The application will be accessible at [http://localhost:3000](http://localhost:3000).

```bash
npm run dev
```

### Production Build & Run
To compile optimized static pages and start the production server:

```bash
# Compile and build pages
npm run build

# Start production server
npm start
```

---

## 🖥️ Platform-Specific Setup Notes

### Windows (PowerShell / Command Prompt)
- Node.js commands (`npm install`, `npm run dev`, `npx prisma db push`) execute identically as on macOS.
- Ensure that the PostgreSQL service is started and running. You can check this in the Windows **Services** manager or start it from PowerShell:
  ```powershell
  Start-Service postgresql-x64-<version>
  ```
- If your default shell blocks execution policies for scripts, run:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
  ```

### macOS (Terminal)
- Ensure PostgreSQL is running using Homebrew (if installed via brew):
  ```bash
  brew services start postgresql
  ```
- File permissions are managed automatically by npm, but if you run into environment pathing errors, ensure you are running Node LTS.
