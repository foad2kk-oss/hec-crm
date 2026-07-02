import { google } from "googleapis";
import { getGoogleClientForUser } from "./tokens";

function buildRawMessage(to: string, subject: string, body: string) {
  const message = [
    `To: ${to}`,
    "Content-Type: text/html; charset=utf-8",
    "MIME-Version: 1.0",
    `Subject: =?utf-8?B?${Buffer.from(subject).toString("base64")}?=`,
    "",
    body,
  ].join("\n");

  return Buffer.from(message).toString("base64url");
}

/** Sends an email via the user's connected Gmail account. Returns false if Google isn't connected. */
export async function sendGmail(userId: string, to: string, subject: string, body: string) {
  const auth = await getGoogleClientForUser(userId);
  if (!auth) return false;

  const gmail = google.gmail({ version: "v1", auth });
  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: buildRawMessage(to, subject, body) },
  });
  return true;
}
