// Supabase Edge Function: thin cron trigger for the AI Lead Discovery agent.
// The actual discovery logic lives in the Next.js app (app/api/leads/discover/route.ts)
// so it can reuse the Node-based OpenAI/Anthropic SDKs. This function just calls it
// on a schedule with the shared CRON_SECRET.
//
// Deploy:  supabase functions deploy discover-leads
// Set secrets:  supabase secrets set APP_URL=https://your-app.vercel.app CRON_SECRET=...
// Schedule (SQL, run once): see supabase/schema.sql bottom section for the pg_cron example.

Deno.serve(async () => {
  const appUrl = Deno.env.get("APP_URL");
  const cronSecret = Deno.env.get("CRON_SECRET");

  const res = await fetch(`${appUrl}/api/leads/discover`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cronSecret}` },
  });

  const body = await res.text();
  return new Response(body, { status: res.status, headers: { "Content-Type": "application/json" } });
});
