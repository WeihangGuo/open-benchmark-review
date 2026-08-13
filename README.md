# Open Benchmark Review

Open Benchmark Review is an open-source community prototype for discussing the machine-learning benchmarks that shape research progress.

The community site includes:

- A searchable benchmark directory focused on video generation and action understanding
- Canonical benchmark pages tied to official sources
- Community comments and replies
- New benchmark submission with duplicate detection
- A lightweight administrator review queue
- GitHub login through Supabase Auth
- Shared comments, replies, helpful votes, reports, and benchmark submissions
- Row-level database permissions for users and administrators

## Run locally

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local`.

## Build

```bash
pnpm build
```

The static frontend is written to `dist/` and hosted on GitHub Pages. The included GitHub Actions workflow deploys every push to `main`. Supabase's project URL and publishable client key are intentionally public; all data access is protected by row-level security in the database.

## Supabase setup

1. Create a Supabase project and enable the GitHub authentication provider.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL Editor.
3. In Supabase Auth URL Configuration, set the site URL and allowed redirect URL to the deployed GitHub Pages URL.
4. In the GitHub OAuth App, use `https://<project-ref>.supabase.co/auth/v1/callback` as the callback URL.

The schema seeds the starter catalog, prevents exact repository duplicates, and makes the GitHub account `WeihangGuo` an administrator.

## Project status

This is an early prototype intended for community feedback.

Initiated by Weihang Guo.
