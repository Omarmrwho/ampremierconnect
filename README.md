# AM Premier Connect

AM Premier Connect is the first portal shell for `ampremierconnect.com`.

The app is a Vite + React frontend prepared for Vercel deployment. Phase 3 adds Supabase Auth, portal profiles, and an internal admin approval queue.

## Current Features

- AM Premier branded portal landing experience
- Role selector for client, vendor, and internal access requests
- Access request confirmation state
- Access request database insert when Supabase is configured
- Intake draft database insert when Supabase is configured
- Email/password sign in and sign up
- Portal profile creation from Supabase Auth metadata
- Internal admin access queue for approving or denying requests
- Client, vendor, and internal admin access lanes
- Deployment/status module for the operating queue
- TikTok workflow download endpoint for the approval-first comment scaffold

## Vercel Settings

Use these settings if Vercel asks during import:

```text
Framework Preset: Vite
Install Command: npm install
Build Command: npm run build
Output Directory: dist
```

Production domains:

```text
ampremierconnect.com
www.ampremierconnect.com
```

Preferred redirect:

```text
www.ampremierconnect.com -> ampremierconnect.com
```

## Local Commands

```bash
npm install
npm run dev
npm run lint
npm run build
```

## Supabase Environment

Create a Supabase project, run `supabase/schema.sql` in the SQL editor, enable email/password auth, then add these variables in Vercel under Project Settings -> Environment Variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENCLAW_WEB_URL
OPENCLAW_GATEWAY_TOKEN
```

The app will still build without those variables, but form submissions and auth will only be staged in the browser until the Supabase variables are present. Workspace deletion needs `SUPABASE_SERVICE_ROLE_KEY` because the server deletes dependent CRM, proposal, campaign, task, idea, and agent rows before removing the workspace. The `/chat` route opens the real OpenClaw web access gate and signs it with the server-only `OPENCLAW_GATEWAY_TOKEN`; it is not a separate site-only chat thread.

Current OpenClaw web gate:

```text
OPENCLAW_WEB_URL=https://textbook-casio-bishop-misc.trycloudflare.com/
```

## Admin Setup

1. Apply the latest `supabase/schema.sql`.
2. Create an owner/admin account through the site sign-up form.
3. In Supabase Table Editor, open `portal_profiles`.
4. Change that account's `role` to `internal`.
5. Sign out and sign back in on the site.
6. The internal admin approval queue will appear in the operating queue panel.
7. Use the TikTok workflow download link in the operating queue to grab the n8n import JSON.
