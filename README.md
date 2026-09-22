# Supabase Login App

A centered, responsive Express login page backed by the existing Supabase
`public.test_users` table. Successful logins show the signed-in username and
role, while invalid credentials and service errors return clear in-page states.

## Local setup

Install dependencies and start the server:

```bash
npm install
npm start
```

Set these server-side environment variables before starting:

- `SUPABASE_URL` — your Supabase project URL
- `SUPABASE_KEY` — the Supabase service-role key

The service-role key is used only by `index.js` on the server. Do not put it
in frontend code or commit it to the repository.

## Render setup

The included `render.yaml` defines a Node web service. In Render:

1. Create a **Web Service** from this GitHub repository.
2. Set the build command to `npm install`.
3. Set the start command to `npm start`.
4. Add `SUPABASE_URL` with your Supabase project URL.
5. Add `SUPABASE_KEY` with the Supabase service-role key.
6. Deploy and open the generated Render URL.

Render supplies the `PORT` environment variable automatically. The health
check endpoint is `/healthz`.

The Supabase table must be `public.test_users` and include `username`,
`password`, and `role` columns. Since Row Level Security is enabled without
policies, keep the service-role key server-side; never expose it in the page.
