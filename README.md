# Supabase Login App

A centered, responsive Express login page backed by Supabase Auth. Successful
logins show the signed-in email and role, while invalid credentials and service
errors return clear in-page states. Sessions are stored in HttpOnly cookies and
can be ended with the sign-out button.

## Local setup

Install dependencies and start the server:

```bash
npm install
npm start
```

Set these server-side environment variables before starting:

- `SUPABASE_URL` — your Supabase project URL
- `SUPABASE_KEY` — a server-side Supabase API key (the anon/publishable key is
  sufficient for Auth)

The key is used only by `index.js` on the server. Do not put it in frontend code
or commit it to the repository. Accounts must be created in Supabase under
**Authentication → Users** and must sign in with their email address.

To assign an administrator role, open the user in Supabase **Authentication →
Users**, set the user's **App Metadata** to `{"role":"admin"}`, and save. The
app reads roles from App Metadata first because users cannot safely promote
themselves through User Metadata. Sign out and sign in again after changing the
role so the new token is used.

## Render setup

The included `render.yaml` defines a Node web service. In Render:

1. Create a **Web Service** from this GitHub repository.
2. Set the build command to `npm install`.
3. Set the start command to `npm start`.
4. Add `SUPABASE_URL` with your Supabase project URL.
5. Add `SUPABASE_KEY` with a server-side Supabase API key.
6. Deploy and open the generated Render URL.

Render supplies the `PORT` environment variable automatically. The health
check endpoint is `/healthz`.


## Role-based home pages

Users with `app_metadata.role` set to `admin` are sent to `/admin` after sign-in. Other authenticated users are sent to `/guest`. Both pages show the current role at the top and protect their routes with the Supabase session.
