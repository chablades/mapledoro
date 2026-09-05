/*
  Twitch Helix "is this channel live" check for the home page's Doro live dot.
  Uses an app access token (client-credentials grant), cached in memory until
  close to expiry -- Twitch's app tokens last ~64 days, so this almost never
  refetches. Requires TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET env vars.
*/

const TWITCH_LOGIN = "da_wakaiyuki";
const TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const STREAMS_URL = `https://api.twitch.tv/helix/streams?user_login=${TWITCH_LOGIN}`;
// Refresh a bit before Twitch's own expiry so a near-expiry token is never handed to a caller.
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000;

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAppAccessToken(clientId: string, clientSecret: string): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Twitch token request failed: ${res.status}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000 - TOKEN_REFRESH_MARGIN_MS,
  };
  return cachedToken.value;
}

/** Returns false (rather than throwing) when credentials aren't configured yet,
 *  so the dot just stays off until TWITCH_CLIENT_ID/SECRET are set. */
export async function isTwitchChannelLive(): Promise<boolean> {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return false;

  const token = await getAppAccessToken(clientId, clientSecret);
  const res = await fetch(STREAMS_URL, {
    headers: {
      "Client-Id": clientId,
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (res.status === 401) {
    // Token was rejected (e.g. app credentials rotated) -- drop the cache so the
    // next request fetches a fresh one instead of retrying the same bad token.
    cachedToken = null;
    throw new Error("Twitch streams request unauthorized");
  }
  if (!res.ok) {
    throw new Error(`Twitch streams request failed: ${res.status}`);
  }

  const data = (await res.json()) as { data: unknown[] };
  return data.data.length > 0;
}
