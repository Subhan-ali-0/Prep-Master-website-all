# Prep Master — Supabase Edition

## Stack
- Node.js + Express
- Supabase PostgreSQL
- JWT + bcryptjs
- Plain HTML/CSS/JS frontend

## 1. Create Supabase project
Create a project at Supabase and open SQL Editor.

## 2. Run the database schema
Copy everything from `supabase/schema.sql` into Supabase SQL Editor and run it.

## 3. Environment variables
Set these on Render:
- `SUPABASE_URL` = your Supabase Project URL
- `SUPABASE_SERVICE_ROLE_KEY` = Supabase service-role key (server only; never expose it in frontend)
- `JWT_SECRET` = a long random secret
- `ADMIN_USERNAME` = your admin username
- `ADMIN_PASSWORD` = your admin password
- `PORT` = 10000

`PUBLIC_BASE_URL` is optional.

## 4. Deploy
Build command:
`npm install`

Start command:
`npm start`

## Important
The service-role key must stay only in Render environment variables. Do not put it in GitHub or frontend JavaScript.

## Features
- Admin login and dashboard
- Add/edit/delete apps
- App-specific keys
- Server-side key verification
- Lifetime unlock
- App-specific home URL
- Purchase-help video URL
- Read-only notifications
- Explore = active apps
- My Apps = unlocked apps
- Light/dark mode
- Splash logo
- Optional user account
