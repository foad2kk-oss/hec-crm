// Supabase Edge Function: thin cron trigger for the daily briefing email (Module 11).
// Actual logic lives in app/api/cron/daily-briefing/route.ts.
//
// Deploy:  supabase functions deploy daily-briefing
// Set secrets:  supabase secrets set APP_URL=https://your-app.vercel.app CRON_SECRET=...

Deno.serve(async () => {
  const appUrl = Deno.env.get("APP_URL");
  const cronSecret = Deno.env.get("CRON_SECRET");

  const res = await fetch(`${appUrl}/api/cron/daily-briefing`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cronSecret}` },
  });

  const body = await res.text();
  return new Response(body, { status: res.status, headers: { "Content-Type": "application/json" } });
});
