import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      const { provider_refresh_token, provider_token, user } = data.session as unknown as {
        provider_refresh_token?: string;
        provider_token?: string;
        user: { id: string };
      };

      // Google only returns a refresh_token on the FIRST consent (access_type=offline,
      // prompt=consent are set in the sign-in call). Persist it server-side so
      // lib/google/tokens.ts can mint fresh access tokens for Calendar/Gmail later.
      if (provider_refresh_token) {
        const admin = createServiceRoleClient();
        await admin.from("google_tokens").upsert({
          user_id: user.id,
          refresh_token: provider_refresh_token,
          access_token: provider_token ?? null,
          scope: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.send",
          updated_at: new Date().toISOString(),
        });
        await admin.from("profiles").update({ google_connected: true }).eq("id", user.id);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
