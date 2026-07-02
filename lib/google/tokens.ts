import { google } from "googleapis";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Returns a live Google OAuth2 client for the given user, refreshing the access
 * token from the stored refresh_token if needed. Returns null if the user never
 * connected Google (no refresh token on file) — callers should treat this as
 * "Calendar/Gmail not connected" and prompt the user to sign in with Google.
 */
export async function getGoogleClientForUser(userId: string) {
  const admin = createServiceRoleClient();
  const { data: tokenRow } = await admin.from("google_tokens").select("*").eq("user_id", userId).single();
  if (!tokenRow?.refresh_token) return null;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({ refresh_token: tokenRow.refresh_token });

  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      await admin
        .from("google_tokens")
        .update({
          access_token: tokens.access_token,
          access_token_expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    }
  });

  return oauth2Client;
}
