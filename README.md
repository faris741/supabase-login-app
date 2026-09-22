# Supabase Login App

A small Express login server backed by Supabase.

## Setup

1. Install dependencies with `npm install`.
2. Set `SUPABASE_URL` and `SUPABASE_KEY` as environment variables or Replit Secrets.
3. Make sure the Supabase `test_users` table contains `username`, `password`, and `role` columns.
4. Start the server with `npm start`.

The server listens on port 3000 and exposes a login form at `/`.
