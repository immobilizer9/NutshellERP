# Nutshell ERP

School book distribution management system built with Next.js 14, Prisma, and PostgreSQL.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: JWT stored in httpOnly cookies
- **Email**: Nodemailer (SMTP)
- **PDF**: `@react-pdf/renderer`
- **Tests**: Vitest

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### Setup

1. **Clone and install dependencies**
   ```bash
   git clone <repo-url>
   cd erp-system
   npm install
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. **Set up the database**
   ```bash
   npx prisma db push
   ```

4. **Seed initial data** (development only)
   ```bash
   node prisma/seed.js
   ```

5. **Start the dev server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

### Default Seed Credentials

| Role         | Email                    | Password   |
|--------------|--------------------------|------------|
| Admin        | admin@nutshell.com       | admin123   |
| BD Head      | bdhead@nutshell.com      | bdhead123  |
| Sales        | sales1@nutshell.com      | sales123   |
| Content Team | content@nutshell.com     | content123 |
| Trainer      | trainer@nutshell.com     | trainer123 |
| Design Team  | design@nutshell.com      | design123  |

> **Change all passwords immediately after first login in production.**

## Environment Variables

See [`.env.example`](.env.example) for all required and optional variables.

| Variable              | Required | Description                                        |
|-----------------------|----------|----------------------------------------------------|
| `DATABASE_URL`        | Yes      | PostgreSQL connection string                       |
| `JWT_SECRET`          | Yes      | Secret for signing JWT tokens                      |
| `SMTP_HOST`           | Optional | SMTP server hostname for email notifications       |
| `SMTP_PORT`           | Optional | SMTP port (default: 587)                           |
| `SMTP_USER`           | Optional | SMTP username                                      |
| `SMTP_PASS`           | Optional | SMTP password / app password                       |
| `SMTP_FROM`           | Optional | Sender address for outgoing emails                 |
| `NEXT_PUBLIC_APP_URL` | Optional | Public URL used in email links                     |
| `CRON_SECRET`         | Optional | Bearer token to protect `/api/cron/*` endpoints    |
| `ALLOW_SEED`          | Optional | Set `true` to allow seeding in production          |

## Scripts

```bash
npm run dev           # Start development server
npm run build         # Build for production
npm run start         # Start production server
npm run test          # Run tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npx prisma studio     # Open Prisma GUI
```

## Role-Based Access

| Module             | ADMIN | BD_HEAD | SALES | CONTENT_TEAM | TRAINER | DESIGN_TEAM |
|--------------------|-------|---------|-------|--------------|---------|-------------|
| Admin Dashboard    | Yes   |         |       |              |         |             |
| User Management    | Yes   |         |       |              |         |             |
| Team Dashboard     | Yes   | Yes     |       |              |         |             |
| Orders / Pipeline  | Yes   | Yes     | Yes   |              |         |             |
| Schools / Targets  | Yes   | Yes     | Yes   |              |         |             |
| Tasks / Reports    | Yes   | Yes     | Yes   |              |         |             |
| Events             | Yes   | Yes     | Yes   |              |         |             |
| Receivables        | Yes   | Yes     |       |              |         |             |
| Content            | Yes   |         |       | Yes          |         |             |
| Quiz/Training      | Yes   | Yes     | Yes   | Yes          | Yes     |             |
| Design             | Yes   |         |       |              |         | Yes         |
| Settings / Exports | Yes   |         |       |              |         |             |

## Cron Jobs

The following endpoints are intended to be called on a schedule:

| Endpoint                       | Schedule | Purpose                                  |
|--------------------------------|----------|------------------------------------------|
| `POST /api/cron/overdue-tasks` | Daily    | Notify users of overdue incomplete tasks |

Protect with: `Authorization: Bearer <CRON_SECRET>`

Example:
```bash
curl -X POST https://your-domain.com/api/cron/overdue-tasks \
     -H "Authorization: Bearer $CRON_SECRET"
```

## Deployment

1. Set all required environment variables on your hosting platform.
2. Run `npx prisma db push` against your production database.
3. Seed via: `ALLOW_SEED=true node prisma/seed.js`
   - Run once only — re-seeding will create duplicate records.
4. Deploy the Next.js app (`npm run build && npm run start`).

## CI/CD

GitHub Actions workflow at `.github/workflows/ci.yml` runs on every push and PR:
- Type-check (`tsc --noEmit`)
- Tests (Vitest)
- Build (`next build`)

Required repository secret: `DATABASE_URL` pointing to a test database.
