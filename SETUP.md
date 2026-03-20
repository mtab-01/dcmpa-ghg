# Bhangra HQ — Setup Guide

## Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- A [Vercel](https://vercel.com) account for deployment

---

## 1. Supabase Database Setup

In your Supabase project, go to **SQL Editor** and run the following:

```sql
-- Videos table
create table videos (
  id uuid primary key default gen_random_uuid(),
  folder text not null,
  title text not null,
  url text not null,
  notes text,
  added_at timestamptz default now()
);

-- Events / Practice Calendar table
create table events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date not null,
  time text,
  location text,
  notes text,
  created_at timestamptz default now()
);

-- Expenses table
create table expenses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  amount numeric(10,2) not null,
  paid_by text not null,
  category text,
  date date not null,
  split_type text not null default 'even',
  splits jsonb,
  receipt_url text,
  created_at timestamptz default now()
);
```

### Disable Row Level Security (RLS)
Since there's no auth, disable RLS on all tables:

```sql
alter table videos disable row level security;
alter table events disable row level security;
alter table expenses disable row level security;
```

---

## 2. Supabase Storage Setup

1. Go to **Storage** in your Supabase dashboard
2. Click **New bucket**
3. Name it `receipts`
4. Check **Public bucket** ✓
5. Click **Create bucket**

---

## 3. Local Development

Create a `.env.local` file in the project root:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Find these values in Supabase: **Settings → API**

Then install and run:

```bash
npm install
npm run dev
```

---

## 4. Vercel Deployment

1. Push the repo to GitHub
2. Import the repo in [Vercel](https://vercel.com/new)
3. Set the following **Environment Variables** in Vercel:
   - `VITE_SUPABASE_URL` → your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` → your Supabase anon key
4. Click **Deploy**

The `vercel.json` file already handles SPA routing (all routes → `index.html`).

---

## 5. iPhone "Add to Home Screen"

On iPhone Safari:
1. Open the deployed URL
2. Tap the Share button (box with arrow)
3. Tap "Add to Home Screen"
4. Name it "Bhangra HQ" and tap Add

The app will open in standalone mode (no browser chrome).

---

## Notes

- **No auth** — the URL is shared with all 12 members. Anyone with the link can read/write.
- **Member names** — stored in each user's browser localStorage. Not synced across devices.
  If real-time name sync is needed in future, add a `members` table in Supabase.
- **Receipt images** — stored in Supabase Storage `receipts` bucket. Max recommended size: 10MB per file.
