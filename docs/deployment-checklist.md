# AM Premier Connect Deployment Checklist

## Vercel

- Import the project into Vercel.
- Confirm framework preset is Vite.
- Confirm build command is `npm run build`.
- Confirm output directory is `dist`.
- Deploy to Production.

## Domains

- `ampremierconnect.com` should be assigned to the production deployment.
- `www.ampremierconnect.com` should redirect to `ampremierconnect.com`.
- Nameservers should remain:

```text
ns1.vercel-dns.com
ns2.vercel-dns.com
```

## DNS Verification

Expected once propagation completes:

```text
ampremierconnect.com -> Vercel production
www.ampremierconnect.com -> ampremierconnect.com
```

Old GoDaddy parking IPs to watch for:

```text
3.33.130.190
15.197.148.33
```

If those still appear, wait and refresh Vercel's domain screen.

## After Launch

- Create Supabase project.
- Run `supabase/schema.sql` in the Supabase SQL editor.
- Add production environment variables in Vercel:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

- Redeploy after adding environment variables.
- Enable email/password auth.
- Create initial internal admin user.

## Auth/Admin Setup

- In Supabase, go to Authentication -> Providers.
- Confirm Email provider is enabled.
- Sign up once through the production site.
- In Supabase Table Editor, open `portal_profiles`.
- Set the first owner/admin account role to `internal`.
- Sign out and sign back in on the production site.
- Confirm the admin approval queue appears.
