# Prep Master

Prep Master is a learning platform built with Node.js, Express and Supabase.

It supports multiple apps, premium app keys, batch loading through external APIs, user accounts, AI Doubts and Community.

---

## Features

- Multiple apps from one common system
- Admin panel
- App add / edit / delete
- App logo and description
- App categories
- Premium access keys
- Lifetime app unlock
- User registration and login
- Persistent unlocked apps
- External batch API support
- Custom batch opening URLs
- Custom app header
- Custom header logo
- Header name and badge
- App-specific themes
- AI Doubts
- AI study image generation
- AI chat history
- Community chat
- Community image sharing
- Notifications
- Supabase database
- Supabase Storage
- Vercel deployment support

---

# Tech Stack

- Node.js
- Express.js
- Supabase
- PostgreSQL
- JWT
- bcrypt
- Multer
- OpenAI API
- Vercel

---

# Project Structure

```text
prep-master/
│
├── public/
│   ├── index.html
│   ├── admin.html
│   ├── learning.html
│   │
│   ├── css/
│   │   ├── app.css
│   │   ├── admin.css
│   │   └── learning-app.css
│   │
│   ├── js/
│   │   ├── app.js
│   │   ├── admin.js
│   │   └── learning-app.js
│   │
│   └── assets/
│       └── logo.png
│
├── supabase/
│   └── schema.sql
│
├── server.js
├── package.json
├── vercel.json
├── .env.example
├── .gitignore
└── README.md
