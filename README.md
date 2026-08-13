# Open Benchmark Review

Open Benchmark Review is an open-source community prototype for discussing the machine-learning benchmarks that shape research progress.

The prototype includes:

- A searchable benchmark directory focused on video generation and action understanding
- Canonical benchmark pages tied to official sources
- Community comments and replies
- New benchmark submission with duplicate detection
- A lightweight administrator review queue
- Browser-local demo state, with no backend or API keys required

## Run locally

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm build
```

The static site is written to `dist/` and can be hosted on GitHub Pages. The included GitHub Actions workflow deploys every push to `main`.

## Prototype data

Comments, sign-in state, votes, and benchmark submissions are stored only in the visitor's browser. A later production version can replace this layer with Supabase without changing the main product structure.

## Project status

This is an early prototype intended for community feedback. It is independent and not affiliated with OpenReview.

Initiated by Weihang Guo.
