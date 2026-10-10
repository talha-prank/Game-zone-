# GameZone PK — Pakistan's Free-to-Play Skill Gaming Platform

Complete production-ready online skill gaming platform designed for Pakistani users with English & Urdu bilingual support, 6 playable HTML5 browser games, PostgreSQL database persistence (Drizzle ORM), Firebase/OAuth authentication, `/admin` governance console, and compliant official Easypaisa merchant gateway readiness.

## 1. Architecture & Working Features

### Fully Working Out-of-the-Box
- **6 Free-to-Play Browser Games (Zero Deposit Required)**:
  1. **Memory Match**: Easy (12 cards), Medium (16 cards), and Hard (20 cards) geometric grids with move tracking, elapsed timer, and personal best storage.
  2. **Quick Tap Reflex**: 25-second target reflex challenge with accuracy tracking and anti-automation click-interval verification.
  3. **Pakistan Brain Quiz**: Randomized multiple-choice trivia covering Pakistani geography, cricket history, science, and Indus Valley civilization with answer explanations.
  4. **Sliding Number Puzzle**: Solvable 4x4 numeric tile puzzle.
  5. **Tactical Tic-Tac-Toe**: 3-round series against an adaptive tactical bot.
  6. **Daily Emerald Cipher**: Deterministic daily arithmetic sequence challenge awarding virtual XP.
- **PostgreSQL Database & Drizzle ORM**:
  - Tables: `profiles`, `games`, `game_sessions`, `achievements`, `user_achievements`, `support_tickets`, `notifications`, `announcements`, `faqs`, `site_settings`, `payment_records`, `audit_logs`.
- **Authentication & Player Dashboard (`/dashboard`)**:
  - Google Sign-In via OAuth popup plus email registration, verification, and password reset support.
  - Displays games played, personal best score, non-cash virtual XP, unlocked badges, national leaderboard rank, notifications, support ticket statuses, and account deletion requests.
- **Administrator Console (`/admin`)**:
  - Server-verified admin role enforcement (`requireAdmin` middleware).
  - Enable/disable games, toggle featured status, edit game metadata & thumbnails, resolve customer support tickets, moderate leaderboard scores, publish announcements/FAQs, export CSV reports, and inspect admin audit logs.

### Features Requiring External Merchant Approval / Credentials
- **Live Easypaisa PKR Merchant Transactions**:
  - In accordance with compliance and anti-fraud rules, live PKR payments display a clear **"Payments not yet available"** notice until your business account is approved on the [Official Easypaisa Merchant Portal](https://merchantportal.easypaisa.com.pk/) and `EASYPAISA_STORE_ID` + `EASYPAISA_HASH_KEY` are configured on the server.
  - A **Development Sandbox Verification Harness** is included inside the Player Dashboard to test unique order reference generation (`GZPK-...`), HMAC SHA-256 callback signature verification, invalid-signature rejection, and duplicate-callback idempotency protection.

---

## 2. Environment Variables Setup (`.env.example`)

Copy `.env.example` to `.env` and configure the required variables:
- `APP_URL`: Public URL of your deployed site.
- `SQL_HOST`, `SQL_DB_NAME`, `SQL_USER`, `SQL_PASSWORD`, `SQL_ADMIN_USER`, `SQL_ADMIN_PASSWORD`: PostgreSQL database credentials.
- `EASYPAISA_STORE_ID`, `EASYPAISA_HASH_KEY`, `EASYPAISA_POSTBACK_URL`: Official server-side Easypaisa merchant credentials (never expose in client bundles).

---

## 3. Vercel & Production Deployment Instructions

1. **Push Repository to GitHub**: Ensure `.env` is excluded via `.gitignore`.
2. **Import Project in Vercel**:
   - Framework Preset: Vite / Node.js Full-Stack Server.
   - Build Command: `npm run build`
   - Start Command: `npm run start`
3. **Configure Environment Variables in Vercel**:
   - Add all required variables from `.env.example` in **Project Settings → Environment Variables**.
4. **Custom Domain & Rollback**:
   - Attach your custom domain under **Settings → Domains**.
   - Use Vercel **Deployments → Instant Rollback** and automated daily PostgreSQL snapshots for backup recovery.

---

## 4. Pre-Deployment Verification Checklist
- [x] Responsive layout verified across mobile (Android/iPhone), tablet, and 1440px desktop viewports.
- [x] All 6 HTML5 games playable immediately without login; score saving & badge unlocking verified upon login.
- [x] Server-side anti-cheat rejects impossible scores and automated <3s durations.
- [x] `/admin` routes protected by server-side token & database role verification.
- [x] Easypaisa callback endpoint verifies HMAC SHA-256 signatures and enforces idempotency on duplicate callbacks.
