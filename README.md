# Booking Agent — Dashboard

The web app for your WhatsApp booking agent. It has three parts:

- **Login** — clients and you sign in.
- **My bookings** (`/dashboard`) — a client sees only their own business + appointments.
- **All clients** (`/admin`) — you (admin) see every client and their bookings.

It reads everything from your existing **Supabase** database. The agent on
Railway keeps working exactly as it does now — this app just shows the data.

---

## What connects to what

```
Marketing site (Hostinger)      →  sells the product, links to "Sign in"
This dashboard (Vercel)         →  login + client & admin dashboards   ← you are here
The agent / brain (Railway)     →  WhatsApp + Claude + Calendar (already live)
Supabase (database)             →  the glue: everyone reads/writes here
```

---

## Run it on your laptop (5 minutes)

You need **Node.js** installed (you already have it from the agent).

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Open http://localhost:3000 — you'll see the **Sign in** screen.

To actually sign in and see data, fill in `.env.local` (next section) and run
the database setup.

---

## Fill in `.env.local`

Open `.env.local` and paste two values from Supabase
(**Project Settings → API**):

- `NEXT_PUBLIC_SUPABASE_URL` — already filled in for your project.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the **anon public** key (safe for the browser).

Do **not** put the `service_role` key here. That one stays on Railway only.

---

## Set up the database (once)

1. Supabase → **SQL Editor** → **New query**.
2. Paste everything from `supabase/schema.sql` and click **Run**.
3. Create your login: **Authentication → Users → Add user** (your email + password).
4. Make yourself admin — run in SQL Editor:
   ```sql
   update public.profiles set is_admin = true where email = 'YOUR_EMAIL';
   ```
5. Link a business to a client user once they have an account:
   ```sql
   update public.businesses set owner_id = 'THE_USER_UUID' where id = <business id>;
   ```

Now sign in at http://localhost:3000.

---

## The one remaining agent tweak (so bookings appear here)

Right now the agent writes bookings only to Google Calendar. For them to show
in the dashboard, the agent should also insert a row into the `bookings` table
whenever it books an appointment — using the Supabase **service role** key on
Railway. That's a small change we'll wire into the agent next.

---

## Put it live (Vercel — free)

1. Push this folder to a GitHub repo.
2. vercel.com → **New Project** → import that repo.
3. Add the same two env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4. Deploy. Point `app.yourdomain.com` at it later.
