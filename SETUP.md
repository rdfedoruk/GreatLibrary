# One-Time Setup (Andrew's checklist)

Two things need your hands: connecting this machine to the Supabase project, and
registering the app with Google so "Sign in with Google" works. Copy-paste each
command into a terminal opened in this folder (`C:\Users\Admin\Projects\GreatLibrary`).

## 1. Connect to the Supabase project and apply the database schema

```
npx supabase login
```
Opens your browser — approve the login.

```
npx supabase link --project-ref vjwvswsuzhcqrkwpqodg
```
It will ask for your **database password** (the one from when you created the
project; resettable in the dashboard under Project Settings → Database). Type it
into the terminal prompt — don't paste it into a Claude chat.

```
npx supabase db push
```
This applies the two migration files in `supabase/migrations/` (tables + starter
tags) to your live project. It shows the list first and asks you to confirm.

## 2. Wire up Google sign-in (~10 minutes)

1. Go to https://console.cloud.google.com/ → create a project (name it anything,
   e.g. "Great Library").
2. **APIs & Services → OAuth consent screen**: choose **External**, fill in the
   app name and your email, save through the steps (no scopes needed beyond the
   defaults).
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized JavaScript origins: `http://localhost:5173`
   - Authorized redirect URI: `https://vjwvswsuzhcqrkwpqodg.supabase.co/auth/v1/callback`
   - Create, then copy the **Client ID** and **Client secret**.
4. In the Supabase dashboard → **Authentication → Sign In / Providers → Google**:
   enable it and paste the Client ID and Client secret. Save.
5. Supabase dashboard → **Authentication → URL Configuration**: set Site URL to
   `http://localhost:5173` (update later when the site has a real domain).

## 3. Try it

```
npm run dev
```
Open http://localhost:5173 and click **Sign in with Google**. If you land back
on the page signed in with your name showing, Phase 1 auth is working — tell
Claude and we'll verify the schema end-to-end.
