# HEC AI Business Development CRM

AI-powered CRM for an engineering consulting office in Saudi Arabia: manages leads, discovers
new industrial investment opportunities with AI, tracks meetings, and helps convert prospects
into clients. Arabic-first RTL UI with an English toggle, dark mode, and Supabase-backed auth.

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind CSS
- **Supabase**: Postgres database, Auth (email/password + Google OAuth), Storage, Realtime
- **OpenAI / Anthropic**: lead scoring, AI Lead Discovery agent, AI Assistant, AI search
- **Google Calendar + Gmail APIs**: meeting sync, daily briefing emails
- Hand-rolled ShadCN-style UI primitives (Radix UI + Tailwind + `class-variance-authority`)
- `@dnd-kit` (pipeline Kanban), `recharts` (dashboard), `jspdf`/`xlsx` (exports)

## Module map

| Module | Where |
|---|---|
| 1. Client Database | `app/(dashboard)/clients` |
| 2. AI Lead Discovery | `app/(dashboard)/discovery`, `lib/ai/discovery-agent.ts` |
| 3. AI Lead Scoring | `lib/ai/scoring.ts`, `app/api/leads/score` |
| 4. Sales Pipeline | `app/(dashboard)/pipeline` |
| 5. Meetings + Calendar | `app/(dashboard)/meetings`, `lib/google/calendar.ts` |
| 6. Tasks | `app/(dashboard)/tasks` |
| 7. AI Assistant | `app/(dashboard)/assistant`, `components/assistant`, `lib/ai/prompts.ts` |
| 8. Documents | `app/(dashboard)/documents`, `lib/pdf.ts` |
| 9. Dashboard | `app/(dashboard)/dashboard` |
| 10. Search | `app/(dashboard)/search`, `app/api/ai/search` |
| 11. Notifications | `components/layout/Topbar.tsx`, `app/api/cron/daily-briefing` |
| 12. Reports | `app/(dashboard)/reports` |

## 1. Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run **`supabase/schema.sql`** (tables, enums, RLS policies, storage
   bucket, dashboard views). Optionally run `supabase/seed.sql` for sample data — replace the
   `assigned_engineer_id` placeholders after your first user signs up (auth creates a
   matching `profiles` row automatically).
3. **Auth providers** → enable **Google**: create an OAuth 2.0 Client (Web application) in
   Google Cloud Console with redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`,
   then paste the Client ID/Secret into Supabase's Google provider settings. Also add the same
   values to `.env.local` as `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (used server-side to
   refresh Calendar/Gmail tokens — see below).
4. Copy your **Project URL**, **anon key**, and **service_role key** into `.env.local`
   (copy `.env.example` → `.env.local`).

### Why Google sign-in needs extra plumbing

Supabase's own session only reliably carries the Google **access token** on the first
sign-in redirect — it doesn't refresh it for you afterward. To keep Calendar/Gmail working
long-term, `app/auth/callback/route.ts` captures the `provider_refresh_token` Google returns
on first consent (requires `access_type=offline&prompt=consent`, already set in the sign-in
call) and stores it server-side in the `google_tokens` table (RLS-locked to the service role
only). `lib/google/tokens.ts` uses that refresh token to mint fresh access tokens on demand.

## 2. AI provider setup

Set **either** `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` (or both — `AI_PROVIDER` picks the
default, falling back to whichever is configured). Used by:

- Lead scoring (`lib/ai/scoring.ts`)
- AI Assistant quick actions, decision-maker extraction, similar-clients, engineer suggestion
- AI-powered search (`/search`, toggle "AI")

Every AI route fails **gracefully** with a clear "AI not configured" toast/501 response if no
key is set — the rest of the app (CRUD, pipeline, meetings, tasks, reports) works without AI.

## 3. AI Lead Discovery (Module 2)

`lib/ai/discovery-agent.ts` runs a fixed list of source queries (MODON, SPARK, Royal
Commission, ministries, SPA, industry-specific searches — see `DISCOVERY_QUERIES`) through
OpenAI's Responses API `web_search` tool, extracts structured leads, and
`app/api/leads/discover/route.ts` dedupes them against existing clients/leads before
inserting into `discovered_leads`. Review results on the **AI Lead Discovery** page
(convert to a client or dismiss).

**To run it manually**: click "Run discovery now" on that page (requires `OPENAI_API_KEY`).

**To run it daily on a schedule** (fully automated, per the spec):

1. `supabase functions deploy discover-leads` (and `daily-briefing` for Module 11).
2. `supabase secrets set APP_URL=https://your-app.vercel.app CRON_SECRET=<same value as .env>`
3. In the SQL editor, enable `pg_cron` + `pg_net`, then run the `cron.schedule(...)` examples
   at the bottom of `supabase/schema.sql` to call the deployed functions daily.

If you'd rather use a dedicated search API (e.g. [Tavily](https://tavily.com)) instead of
OpenAI's hosted web-search tool, set `TAVILY_API_KEY` and swap the implementation inside
`runDiscoveryQuery()` in `lib/ai/discovery-agent.ts` for a Tavily search + a `completeJson`
extraction call — the rest of the pipeline (dedupe, insert, review UI) is unchanged.

## 4. Local development

```bash
npm install
cp .env.example .env.local   # fill in your Supabase + AI + Google values
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/login`. Sign up a user directly in the
Supabase Auth dashboard (or wire up a public sign-up flow) to get your first `profiles` row.

## 5. Deployment (Vercel)

1. Push this repo to GitHub and import it into [Vercel](https://vercel.com/new).
2. Add all variables from `.env.example` as Vercel Environment Variables.
3. Set `NEXT_PUBLIC_APP_URL` to your production URL, and update the Supabase Google OAuth
   redirect URI / authorized origins accordingly.
4. Deploy. Then finish the Supabase Edge Function cron setup from step 3 above, pointing
   `APP_URL` at your production domain.

## Known limitations / honest tradeoffs

- **Arabic PDF shaping**: `lib/pdf.ts` uses jsPDF's built-in fonts, which don't reshape/
  reorder Arabic glyphs. Labels are in English; Arabic values print but won't visually
  connect letters correctly. For production-quality Arabic PDFs, embed a Unicode Arabic
  font (e.g. Amiri) via `doc.addFont()`.
- **Meetings view** is a list (upcoming/past) rather than a full month/week calendar grid —
  functional for scheduling and Google Calendar sync, but not a visual calendar widget.
- **AI Lead Discovery** requires `OPENAI_API_KEY` (uses the Responses API's `web_search`
  tool). Swap in Tavily as described above if you prefer a dedicated search API or don't
  have access to that OpenAI feature.
