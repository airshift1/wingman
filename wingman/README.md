# Wingman

Static site (your two original HTML pages) + **Supabase** (auth, Postgres, Row Level Security, realtime) hosted on **Vercel**.

```
public/
  index.html        ← landing + public reviews page (your wingman-ratings.html)
  app.html          ← the social app (your wingman-app.html)
  js/home.js        ← logic for index.html
  js/app.js         ← logic for app.html
  config.js         ← GENERATED at build time from env vars (git-ignored)
scripts/build.js    ← writes config.js; refuses secret/service_role keys
scripts/serve.js    ← tiny local server (npm run dev)
supabase/schema.sql ← tables, RLS policies, triggers, public view, realtime
vercel.json         ← build settings + security headers (CSP etc.)
.env.example
```

No framework, no npm dependencies. The Supabase client is loaded from jsDelivr (pinned version).

---

## Part 1 — Create the Supabase project (≈10 min)

1. Go to <https://supabase.com> → **Sign in** (GitHub is easiest) → **New project**.
2. Pick an organization, then fill in:
   - **Name:** `wingman`
   - **Database password:** click *Generate a password*, save it in a password manager (the app never needs it).
   - **Region:** closest to your users (e.g. *East US (N. Virginia)*).
3. Click **Create new project** and wait until it finishes provisioning.
4. **Create the database:** left sidebar → **SQL Editor** → **New query**.
   Open `supabase/schema.sql`, copy **all** of it, paste, click **Run**.
   You should see *Success. No rows returned*. If you see an error, copy the message to me.
5. **Check RLS is on:** sidebar → **Table Editor**. Every table (`profiles`, `friend_requests`, `posts`, `ratings`, `comments`, `comment_likes`, `reactions`, `notifications`, `site_reviews`) should show **RLS enabled** (no red "RLS disabled" badge).
6. **Copy your two public values:** sidebar → **Project Settings** (gear) → **API**
   - **Project URL** → this is `SUPABASE_URL`
   - **Project API keys → `anon` `public`** key (or the **Publishable key**, starts with `sb_publishable_`) → this is `SUPABASE_ANON_KEY`
   - ⚠️ Do **not** copy or use the `service_role` / **secret** key anywhere. The build script aborts if you do.
7. **Email sign-up settings:** sidebar → **Authentication** → **Sign In / Providers** → *Email* is enabled by default. Leave **Confirm email** ON (recommended).
   - Supabase's built-in email sender is heavily rate-limited (only a few emails per hour). For real users, add your own SMTP under **Authentication → Emails → SMTP Settings** (Resend, Postmark, SendGrid…) before you launch.
8. *(Do this after the first Vercel deploy in Part 2.)* **Authentication → URL Configuration:**
   - **Site URL:** `https://YOUR-PROJECT.vercel.app` (or your custom domain)
   - **Redirect URLs:** add `https://YOUR-PROJECT.vercel.app/**` and, for local testing, `http://localhost:3000/**`

## Part 2 — Deploy on Vercel (≈5 min)

1. Put the project in a GitHub repo:
   ```bash
   cd wingman
   git init && git add . && git commit -m "Wingman"
   # create an empty repo on github.com, then:
   git remote add origin https://github.com/YOU/wingman.git
   git branch -M main && git push -u origin main
   ```
   (`.gitignore` already excludes `.env` and `public/config.js`.)
2. <https://vercel.com> → **Add New… → Project** → **Import** your `wingman` repo (authorize the Vercel GitHub app when asked).
3. On the configure screen:
   | Setting | Value |
   |---|---|
   | Framework Preset | **Other** |
   | Root Directory | `./` (leave default) |
   | Build Command | `node scripts/build.js` (already set by `vercel.json`) |
   | Output Directory | `public` (already set by `vercel.json`) |
   | Install Command | leave empty |
4. Expand **Environment Variables** and add, for **Production, Preview and Development**:
   - `SUPABASE_URL` = the Project URL from step 6
   - `SUPABASE_ANON_KEY` = the anon/publishable key from step 6
5. Click **Deploy**. When done, copy your `https://….vercel.app` URL.
6. Go back to Supabase **Part 1, step 8** and enter that URL.

## Part 3 — Verify it yourself (checklist)

Use two different browsers (or one normal + one private window) with two accounts:

- [ ] `/` loads; **Reviews** tab shows "No ratings yet"; submit is gated behind sign-in
- [ ] `/app.html` → **Create an account** → confirm email → sign in → set name/username
- [ ] Account B: **Friends** → search A's username → **Add** → A sees it under **Requests** → **Accept**
- [ ] A: **New report** → B sees it in **Feed**; B rates it; A cannot rate own report; B rating twice updates, never duplicates
- [ ] Comment, reply, like, react; notifications appear for the other person
- [ ] A third (non-friend) account can't see A's reports
- [ ] `/` → sign in → leave a review → visible to logged-out visitors; second submit edits it
- [ ] Phone: both pages, no sideways scrolling

## Local development

```bash
cp .env.example .env     # fill in the two values, then:
export $(grep -v '^#' .env | xargs) && npm run dev   # http://localhost:3000
```

## Security model

- The browser only ever receives the **anon/publishable** key. All protection is **Row Level Security** in `schema.sql`:
  - Reports, ratings, comments, reactions are visible only to the author and their accepted friends.
  - You can only rate a friend's report, never your own, and only once (unique constraint + policy + trigger).
  - Friend requests are visible only to the two people involved; only the recipient can accept.
  - Notifications are created by database triggers, so they cannot be forged.
  - Usernames cannot be changed after creation (column-level grants).
  - Service reviews: one per signed-in user; the public sees them via a view that hides user ids.
- `vercel.json` sets a Content-Security-Policy, `X-Frame-Options: DENY`, etc.

## Known limitations / next steps

- The page loads up to 1000 rows per table; fine for early growth, then add pagination/search RPCs.
- All signed-in users can list all profiles (needed for Find Friends). Names/usernames/bios are therefore not private.
- No moderation/report/delete-post UI yet (policies allow authors to delete their own posts if you add a button).
- Add custom SMTP (above) and consider enabling **Auth → Attack Protection** (CAPTCHA, leaked-password protection).
