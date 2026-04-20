# Docent

Docent is a hyperlocal home tuition marketplace for Mathura, India.

view preview at: https://www.docent.space/

## Stack

- Next.js 14 App Router
- Supabase Auth, PostgreSQL, and Storage ready
- Tailwind CSS
- Vercel compatible

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create your environment file from `.env.example` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ADMIN_EMAIL`

3. Run the app:

```bash
npm run dev
```

4. Apply the database schema in `supabase/schema.sql` to your Supabase project.

## Routes

- `/` homepage
- `/browse` tutor discovery
- `/auth` phone login flow
- `/onboarding` role selection
- `/teacher/setup` profile creation
- `/teacher/dashboard` teacher status dashboard
- `/teacher/[id]` public teacher profile
- `/admin` admin moderation panel
