# Knovora

Knovora is a no-code platform for creating AI chatbots grounded in your own
documents and website content. Customize each bot, test its answers, and share
it through a hosted chat page or an embeddable website widget.

## Features

- Create an account and manage chatbots from a workspace dashboard.
- Add knowledge from uploaded files and website URLs.
- Chat with answers grounded in indexed knowledge.
- Customize chatbot appearance and preview it before publishing.
- Publish a shareable chat page or embed a floating chat widget on a website.

## Tech stack

- [Next.js](https://nextjs.org/) and React
- [Supabase](https://supabase.com/) for authentication, PostgreSQL, storage, and
  vector search with pgvector
- [Google Gemini](https://ai.google.dev/) for chat and embeddings
- [Tailwind CSS](https://tailwindcss.com/) for styling

## Getting started

### Prerequisites

- Node.js 20 or newer and npm
- A Supabase project
- A Google Gemini API key

### Run locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` with the environment variables described in
   [SETUP.md](./SETUP.md). Keep server-side secrets private and never commit
   them.
3. Apply the Supabase migrations in `supabase/migrations/` as described in
   [SETUP.md](./SETUP.md).
4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000).

For complete environment, database, and deployment instructions, see
[SETUP.md](./SETUP.md) and [DEPLOYMENT.md](./DEPLOYMENT.md).

## Useful commands

```bash
npm run dev        # Start the local development server
npm run build      # Create a production build
npm run start      # Serve the production build
npm run lint       # Run lint checks
npm run typecheck  # Run the TypeScript check
npm test           # Run unit tests
```

## Project layout

- `src/app/` — application pages, dashboard, and API routes
- `src/components/` — shared UI components
- `src/lib/` — authentication, chatbot, chat, ingestion, and Supabase logic
- `public/widget.js` — embeddable chat widget
- `supabase/migrations/` — database schema, policies, functions, and storage
- `scripts/` — setup, migration, and verification utilities
