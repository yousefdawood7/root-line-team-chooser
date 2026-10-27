# Root Line - Team Chooser & Candidate Draft Portal 🎯

A modern full-stack Next.js 15 application designed for organizations and teams to draft candidates from Excel/CSV files in real-time, powered serverlessly by **Vercel Blob** storage.

---

## ✨ Features

- **🔐 Whitelist Email Authentication**:
  - Team Leads log in directly with their pre-authorized email address without needing passwords.
  - Admin access secured via Admin credentials and dedicated control dashboard.
- **📁 Excel & CSV Ingestion**:
  - Drag-and-drop file uploader for `.xlsx`, `.xls`, and `.csv` spreadsheets.
  - Automatically detects common column names (`Name`, `Role`, `Department`, `Experience`, `Skills`, `Email`, `Phone`, `Notes`) while preserving all custom columns in detailed candidate previews.
- **⚖️ Dynamic Equal Quota & Odd Remainder Allocation**:
  - Quotas are automatically divided equally among active team leads (e.g. 50/50 for 2 leads).
  - Any odd remainder candidates are randomly assigned to one of the leads.
  - Admin can manually adjust or override individual quotas at any time.
- **⚡ Real-Time Candidate Locking & Collision Prevention**:
  - Once a candidate is claimed by a Team Lead, they are permanently locked for all other leads in real-time.
  - Optimistic locking prevents double-claims if two leads click at the same millisecond.
- **👁️ Candidate Detail Drawer & Preview**:
  - Full candidate card preview displaying contact info, experience, skill tags, and all custom spreadsheet columns.
- **📋 "My Squad" Roster Drawer**:
  - Quick slide-over drawer allowing leads to track their selected members and remaining pick quotas.
- **📊 Admin Control Center**:
  - Add, manage, and remove Team Lead emails and custom quotas.
  - Pause / resume drafting at any time.
  - Reset draft picks with safety confirmation.
  - One-click Excel export (`.xlsx`) of the final draft results and lead assignments.
- **☁️ Vercel Blob Storage**:
  - Uses `@vercel/blob` for zero-database serverless state and file storage.
  - Built-in local filesystem fallback (`/.data/`) for offline/local development without needing cloud credentials.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ (tested on Node 20 / 24)
- npm or yarn

### 2. Installation
```bash
git clone https://github.com/yousefdawood7/root-line-team-chooser.git
cd root-line-team-chooser
npm install
```

### 3. Environment Configuration
Create a `.env.local` file based on `.env.example`:
```env
# Optional for local development; required on Vercel
BLOB_READ_WRITE_TOKEN=""

# Admin Credentials
ADMIN_EMAIL="admin@rootline.com"
ADMIN_PASSCODE="admin123"

# JWT Secret for Session Cookies
AUTH_SECRET="your-32-character-secret-key-here"
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing
Run the automated verification suite:
```bash
npx tsx src/test-verification.ts
```
The test verifies:
1. Excel/CSV parsing and column extraction.
2. Even and odd quota division algorithm with random remainder allocation.
3. Concurrency lock collision prevention (second claimant rejected).
4. Candidate release and reassignment.
5. Excel export workbook generation.

---

## 🌐 Deploying to Vercel

1. Push your repository to GitHub.
2. Import the repository in [Vercel](https://vercel.com).
3. Under the **Storage** tab in your Vercel project dashboard, create and connect a **Vercel Blob** store.
4. Vercel automatically injects the `BLOB_READ_WRITE_TOKEN` environment variable.
5. Set `ADMIN_EMAIL`, `ADMIN_PASSCODE`, and `AUTH_SECRET` in **Project Settings > Environment Variables**.
6. Deploy!

---

## 📄 License
MIT License. Built for Root Line.
