**KNOVORA  /  PRODUCT REQUIREMENTS**

**PRODUCT SPECIFICATION  •  VERSION 1.1  •  OCTOBER 2026**

Knovora

**AI CHATBOT BUILDER**

# Project Overview & Feature Specification

A no-code SaaS platform for creating personalized AI chatbots trained on a business’s or individual’s own knowledge.

| **AI ENGINE** | **PRIMARY DEPLOYMENT** | **DATA & SEARCH** |
| --- | --- | --- |
| Google Gemini API | Vercel (Next.js) | Supabase (Postgres + pgvector) |

Prepared for product planning, UI/UX design, engineering estimation, and MVP delivery.

## Product at a glance

- Target users: small and medium businesses, creators, educators, agencies, support teams, and professionals.

- Core promise: upload information, customize a chatbot, test it, and publish it without writing code.

- Deployment: Vercel-hosted app and API, website embed widget, and shareable hosted chat page.

- Architecture: multi-tenant Next.js SaaS, Supabase knowledge storage, RAG search, and server-side Gemini API integration.

Technology principle: Gemini is a proprietary hosted AI API. Next.js, PostgreSQL, pgvector, and other libraries are open source; Vercel and managed Supabase are hosting services.

**KNOVORA / SPECIFICATION**

# 01  |  Project overview

What we are building, the value it delivers, and who it serves.

## 1.1  Vision

Knovora empowers anyone to transform existing documents, websites, and business knowledge into an AI assistant that answers visitor questions accurately, in the organization’s voice, around the clock.

## 1.2  Problem and opportunity

Creating a trustworthy AI assistant commonly requires technical skills, data preparation, model integration, and website deployment. Knovora combines these activities into one guided workflow for non-technical users.

## 1.3  Primary goals

- Launch a chatbot from uploaded knowledge and website content with minimal setup.

- Deliver useful, source-grounded answers with clear handling of unknown questions.

- Make branding and deployment possible through an intuitive visual interface.

- Give bot owners visibility into conversations, lead interest, and knowledge gaps.

- Keep operating costs predictable through usage metering, rate limits, and efficient retrieval.

## 1.4  Users and key use cases

| **USER TYPE** | **REPRESENTATIVE USE CASE** |
| --- | --- |
| Small businesses | Customer support, store policies, product FAQs, service inquiries. |
| Agencies / freelancers | Create and manage separate branded bots for multiple clients. |
| Educators / coaches | Answer questions using course material and program information. |
| Content creators | Guide audiences through articles, resources, and premium content. |
| Internal teams | Search internal SOPs, policies, manuals, and onboarding knowledge. |

## 1.5  Success metrics

Activation rate (bot created and deployed), successful answer rate, human-reported helpfulness, median response latency, conversations per active bot, lead capture rate, document indexing success, monthly active workspaces, and Gemini cost per conversation.

## 1.6  Product principles

No-code by default • Knowledge-first answers • Explicit data boundaries • Transparent usage • Mobile-responsive UI • Accessible widget • Secure by design

**KNOVORA / SPECIFICATION**

# 02  |  Core user journey

A straightforward flow that can be completed without programming knowledge.

**1. Create workspace  **Register, verify email, and create a business or personal workspace.

**2. Create chatbot  **Name the bot; define its purpose, language, tone, and instructions.

**3. Add knowledge  **Upload files, add URLs, or write FAQs; review extraction and indexing status.

**4. Test the bot  **Use a live preview, inspect cited sources, and refine instructions or data.

**5. Customize appearance  **Choose colors, avatar, welcome message, suggested prompts, and widget position.

**6. Publish  **Copy a small JavaScript embed snippet or share a hosted chatbot link.

**7. Monitor and improve  **Review conversations, quality feedback, unresolved questions, and usage.

## 2.1  Functional feature list — MVP (P0)

| **MODULE** | **FEATURES INCLUDED IN FIRST RELEASE** |
| --- | --- |
| Authentication / workspace | Supabase Auth signup/login; email verification and password reset; profile; owner-managed workspace; basic settings. |
| Chatbot management | Create, edit, duplicate, archive, and delete chatbot; configuration wizard; default system instructions; draft/published state. |
| Knowledge ingestion | Direct file upload to storage (PDF, DOCX, TXT, MD); single-page URL extraction; manual FAQs; indexing status, errors, and retry. |
| Knowledge retrieval | Chunking and embedding; per-chatbot vector search; context assembly; link to original source; re-index after changes. |
| Gemini chat engine | Server-side Gemini API using @google/genai; limited chat memory; streamed replies; unknown-answer fallback; retries and timeouts. |
| Appearance / distribution | Visual settings for name, theme, avatar, greeting, and starter questions; responsive widget; copy-paste script; hosted chat link. |
| Bot testing | Preview mode; test conversations; source visibility for administrators; reset session. |
| Analytics / leads | Conversation count, message count, helpfulness votes, unresolved questions; opt-in lead form; CSV export. |
| Platform administration | User/workspace/bot overview, ingestion failures, usage tracking, moderation controls, basic audit trail. |
| Security / controls | Workspace isolation and database RLS; secret storage; domain controls; chat rate limits; data retention/deletion controls. |

P0 = necessary for a usable launch. Some items, such as OAuth, subscriptions, and team roles, can ship after the first validated release.

**KNOVORA / SPECIFICATION**

# 03  |  Feature roadmap

Capabilities grouped by delivery priority rather than promises of a fixed launch date.

## 3.1  Phase 2 — Growth features (P1)

| **CATEGORY** | **FEATURE SET** |
| --- | --- |
| Team collaboration | Workspace invitations; owner/admin/editor/viewer roles; team audit log. |
| Additional sources | Sitemap and multi-page crawling; CSV import; recurring source sync; improved parsing on external workers. |
| Advanced customization | Custom bot domains, deeper branding, conditional welcome flows, white-label options. |
| Lead & support workflows | Lead qualification questions, email alerts, webhook delivery, human handoff and escalation. |
| Channels | Official integrations for Slack, Discord, and other supported channels. |
| AI tuning & testing | Answer test sets, prompt versions, confidence thresholds, answer correction workflow. |
| SaaS monetization | Subscription plans, metered message limits, billing portal, invoices, plan upgrades. |
| Analytics | Bot performance trends, source usage, unanswered question clusters, funnel reporting. |

## 3.2  Phase 3 — Advanced / enterprise (P2)

- Hybrid search and reranking for improved retrieval quality on large knowledge bases.

- Multi-bot routing and agent workflows using validated Gemini function calling.

- Ticketing/CRM integrations and approved actions with permissions and confirmation.

- SSO/SAML, advanced enterprise access controls, retention policies, and export capabilities.

- Multi-region deployments, enterprise observability, SLAs, and dedicated workspace options.

- Voice or multimodal chat only after evaluating usability, safety, and ongoing API cost.

## 3.3  Explicit MVP non-goals

Fully autonomous agents that change external systems; direct integrations with every messaging platform; unlimited crawling; model fine-tuning; regulated-data compliance certification; complex white-label reseller billing. These are excluded until the product demonstrates demand and operational stability.

## 3.4  Suggested user roles

| **ROLE** | **ACCESS** |
| --- | --- |
| Visitor | Public chatbot interaction only; no access to workspace knowledge files. |
| Workspace owner | Manage chatbot, documents, workspace, billing (later), and team (later). |
| Platform administrator | Moderate and monitor platform-wide resources, users, abuse, and service health. |

**KNOVORA / SPECIFICATION**

# 04  |  AI architecture and technology stack

Gemini handles answer generation; Knovora owns the application, retrieval, and user experience.

## 4.1  Recommended deployment-ready stack

| **LAYER** | **TECHNOLOGY** | **RESPONSIBILITY** |
| --- | --- | --- |
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS | Dashboard, public chat pages, bot builder, and widget styling. |
| Hosting | Vercel | Production and preview deployments, CDN, and managed serverless functions. |
| Application API | Next.js Route Handlers on Vercel | Secure chat endpoints, uploads orchestration, bot management, webhooks. |
| AI generation | Google Gemini API via @google/genai | Streaming answers, conversation responses, optional structured output. |
| Embeddings | Gemini Embeddings initially; open-source service later | Creates vectors for documents and questions. Evaluate cost and retrieval quality. |
| Database & vectors | Supabase Postgres + pgvector | Users, bots, chats, source metadata, and isolated semantic search. |
| Authentication | Supabase Auth | Email login, session management, password recovery. |
| File storage | Supabase Storage | Private user documents with signed/direct uploads. |
| Background jobs | Inngest + Vercel functions | Asynchronous extraction, chunking, embedding, retries, job status. |
| Text extraction | pdf-parse, Mammoth, Cheerio / Readability | Process documents and extract text from web pages. |
| Observability | Vercel logs + OpenTelemetry-compatible tooling | Errors, latency, jobs, token usage, cost signals. |
| Version control | GitHub + Vercel Git integration | Pull request previews, main-branch production releases. |

Open-source-first does not mean every hosted service is free or open source. Gemini, Vercel, Supabase hosting, and optional job services have independent terms, quotas, and costs.

## 4.2  AI response request

Visitor → Embedded widget / hosted chat page → Vercel API → bot access & usage checks → pgvector retrieval → selected source context + guardrails → Gemini API → streamed answer + source references → conversation and usage logs.

## 4.3  Knowledge ingestion

Owner uploads directly to private Supabase Storage or adds a URL → ingestion event → background parser → text normalization and chunking → embeddings → workspace-scoped pgvector records → source marked ready or failed.

## 4.4  Gemini integration rules

- Keep Gemini API keys and Supabase service credentials on the server only; never expose them in public widget code.

- Use the official @google/genai SDK and configurable model IDs to allow upgrades without code-wide changes.

- Retrieve only documents belonging to the requested chatbot and attach source IDs for verifiable citations.

- Set a clear “I do not know” fallback when the knowledge base lacks supporting information.

- Log response latency, Gemini token usage, errors, and estimated spend by workspace; enforce budgets and limits.

**KNOVORA / SPECIFICATION**

# 05  |  Vercel deployment design

Vercel serves the product; persistent storage and heavy background work use supporting services.

## 5.1  Hosting boundaries

| **SERVICE** | **WHERE IT RUNS** | **NOTES** |
| --- | --- | --- |
| Web app / dashboard | Vercel | Next.js pages, auth-aware routes, and bot management UI. |
| Public embed widget | Vercel CDN | Small isolated JavaScript bundle injected into third-party websites. |
| Chat API | Vercel Functions | Authenticate public bot, retrieve sources, call Gemini, stream reply. |
| Persistent database | Supabase managed Postgres | Relational records, pgvector similarity search, RLS policies. |
| Uploaded files | Supabase Storage | Direct-to-storage uploads; private buckets and scoped signed URLs. |
| Ingestion orchestrator | Inngest | Coordinates jobs/retries; function steps execute within provider limits. |
| Heavy parsing / crawling | Dedicated worker service if needed | Only add off-Vercel compute for large/slow imports or browser automation. |

## 5.2  Deployment workflow

- Create a GitHub repository for the Next.js monorepo and connect it to a Vercel project.

- Configure separate preview and production environments; keep Gemini and Supabase secrets in server-only environment variables.

- Create Supabase projects and migrations for tables, storage policies, and pgvector; enable RLS on tenant data.

- Configure Inngest and the ingestion endpoint; ensure document jobs can resume safely after transient failures.

- Set approved domains, rate limiting, usage caps, and error monitoring before public traffic.

- Attach the production domain and confirm TLS, chatbot previews, embed script, uploads, and chat streaming.

## 5.3  Serverless-specific design considerations

- Upload files directly to Supabase Storage instead of routing large binaries through Vercel Functions.

- Keep synchronous chat requests focused on retrieval and Gemini; move crawling and file processing to queued jobs.

- Respect Vercel function payload, execution, and memory limits; validate current plan limits at implementation time.

- Treat scheduled/long-running jobs as restartable and idempotent; use an external worker when function limits become restrictive.

- Keep Vercel Functions geographically close to Supabase where possible, and pool database connections.

## 5.4  Deployment environments

Local: developer machine with test credentials. Preview: Vercel PR deployment against non-production data. Production: locked-down Vercel environment linked to production Supabase and Gemini resources. Always test database migrations and backups before release.

**KNOVORA / SPECIFICATION**

# 06  |  Quality, privacy, and operations

The application must be reliable, secure, and transparent as it handles customer-uploaded content.

## 5.1  Knowledge-grounded answer requirements

- Retrieve information only from the currently authorized chatbot and its active knowledge sources.

- Display citations/source links when a cited source is available, with no fabricated references.

- When documents do not answer the question, respond with an explicit uncertainty/fallback message.

- Treat source documents and retrieved web pages as untrusted content; prevent them from overriding system rules.

- Support language-specific bot instructions and multilingual queries without promising perfect translation.

- Preserve a limited, configurable conversation history; do not leak prior user sessions.

## 5.2  Security and privacy baseline

| **AREA** | **MINIMUM EXPECTATION** |
| --- | --- |
| Isolation | Workspace IDs and bot IDs validated in APIs; Supabase RLS protects database/storage access. |
| Secrets | Gemini API key and Supabase service-role credentials stored only in Vercel server-side secrets. |
| Data handling | Privacy notice, upload ownership rules, opt-in data collection, defined retention and deletion. |
| Abuse prevention | Per-IP and per-workspace throttles, bot-level budgets, file size limits, malware scanning. |
| Chat widget | Allowed-domain checks, per-bot traffic limits, CSP-safe embed guidance, no credentials in JS. |
| Transport / storage | HTTPS, private Storage buckets, managed backups, least-privilege policies and keys. |
| Auditability | Log important admin actions and ingestion errors without unnecessarily storing sensitive prompts. |

## 5.3  Gemini-specific operating constraints

Gemini API usage is governed by Google’s quotas, pricing, safety settings, terms, and data-use rules. Free-tier availability is not a viable guarantee for a production SaaS. Choose an appropriate paid configuration, confirm data processing terms, set spending controls, and expose customer usage limits. Monitor provider changes as models and quotas may change.

## 5.4  Proposed entities

User • Workspace • WorkspaceMember (future) • Chatbot • Source • SourceChunk • Conversation • Message • Lead • Feedback • UsageEvent • IngestionJob • Subscription (future) • AuditEvent

## 5.5  Non-functional targets to define and test

Availability and response-time SLOs; maximum upload sizes; concurrent chat capacity; crawl budgets; restoration time objectives; accessibility criteria; localization; load testing; observability; cost/usage alarms. Numerical targets should be set after MVP performance testing.

**KNOVORA / SPECIFICATION**

# 07  |  Delivery plan and acceptance criteria

A practical roadmap for shipping a working product and validating usage.

## 6.1  Recommended workstreams

| **STAGE** | **DELIVERABLE / EXIT CONDITION** |
| --- | --- |
| A. Foundation | Vercel project; Next.js app; Supabase Auth/RLS; design system; workspace and bot models; preview CI. |
| B. Knowledge ingestion | Supabase direct uploads; URL import; Inngest parsing; embeddings; pgvector search; job states. |
| C. Gemini chat | Server-side @google/genai; RAG prompt; Vercel streaming route; unknown-answer fallback; usage logs. |
| D. Bot builder | No-code configuration wizard; live preview; appearance options; publish and embed script. |
| E. Launch readiness | Analytics; abuse controls; Supabase backups; terms/privacy; end-to-end tests; production deployment. |
| F. Growth | Subscriptions, multiple team members, integrations, advanced analytics after customer validation. |

## 6.2  MVP acceptance tests

- A new user can sign up, create a chatbot, add a PDF or URL, and publish an embeddable bot.

- A bot answers a question using relevant source passages and shows a valid source reference when possible.

- A bot indicates when the answer is absent instead of inventing an unsupported business policy.

- A visitor using bot A cannot access data uploaded to bot B or another workspace.

- The owner can update/delete source material and trigger re-indexing with visible status.

- The system logs Gemini request failures, rate limits, and usage without exposing API keys.

- A production Vercel deployment serves the dashboard, widget, and working chat API on mobile and desktop.

## 6.3  Dependencies / open decisions

- Select Gemini model(s) based on real task evaluations, response speed, geographic availability, and budget.

- Choose local Sentence Transformers embeddings or Gemini embeddings based on retrieval tests; avoid mixing vector spaces.

- Define the first accepted file formats and website crawl restrictions.

- Decide whether public chat history and captured leads persist by default or only after opt-in.

- Choose a Vercel region close to Supabase; decide retention, upload limits, and subscription requirements.

## 6.4  Reference documentation

Gemini API: https://ai.google.dev/gemini-api/docs
Google Gen AI SDK: https://github.com/googleapis/js-genai
Vercel Functions: https://vercel.com/docs/functions
Supabase pgvector: https://supabase.com/docs/guides/database/extensions/pgvector
Inngest: https://www.inngest.com/docs

Document status: initial product specification. No software implementation, provider account, or API key is included.

		Knovora  •  Gemini API + Vercel deployment   |