# Open Benchmark Review

An open-source community forum for discussing machine-learning benchmarks.

[Live site](https://weihangguo.github.io/open-benchmark-review/) · [Report an issue](https://github.com/WeihangGuo/open-benchmark-review/issues)

## About

Benchmark choices are often driven by convention rather than transparent community knowledge. Open Benchmark Review gives each benchmark a canonical page where researchers can share practical experience, limitations, and evidence.

The current catalog focuses on two areas:

- Video generation
- Robotics

## Features

- Search benchmarks by name and browse by category
- View canonical benchmark pages linked to official sources
- Comment without creating an account
- Rate benchmarks on a five-point scale and provide a confidence score
- Mark comments as helpful and report inappropriate content
- Sign in with GitHub or Google to submit a benchmark
- Detect duplicate GitHub and Hugging Face repositories
- Review submissions and moderate comments through an administrator interface

## Tech stack

- React and TypeScript
- Vite
- Supabase Database and Auth
- GitHub Pages and GitHub Actions

## Local development

Requirements:

- Node.js 22.13 or newer
- pnpm 11
- A configured Supabase project

Clone the repository and install the dependencies:

```bash
git clone https://github.com/WeihangGuo/open-benchmark-review.git
cd open-benchmark-review
pnpm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Add the following values to `.env.local`:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

Start the development server:

```bash
pnpm dev
```

## Available scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the local development server |
| `pnpm build` | Create a production build in `dist/` |
| `pnpm preview` | Preview the production build locally |
| `pnpm test` | Verify that the production build succeeds |

## Project structure

```text
src/                    React application
supabase/schema.sql     Database schema and security policies
supabase/migrations/    Incremental database changes
.github/workflows/      GitHub Pages deployment workflow
```

## Contributing

Issues and pull requests are welcome. For benchmark data changes, please include an official GitHub or Hugging Face source and enough context to identify duplicate or renamed benchmarks.

## License

This project is available under the [MIT License](LICENSE).
