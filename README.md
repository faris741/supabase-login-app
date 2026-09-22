# Supabase Login App

An Express login form backed by Supabase.

## Render setup

Add `SUPABASE_URL` and `SUPABASE_KEY` as Render environment variables, then deploy the web service. The app listens on Render's `PORT` value.

The Supabase table must be named `test_users` and include `username`, `password`, and `role` columns.
