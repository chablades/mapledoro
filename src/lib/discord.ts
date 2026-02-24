/*
  Lightweight Discord REST API helper.
  Uses plain fetch — no discord.js gateway connection needed.
*/

const DISCORD_API = "https://discord.com/api/v10";

interface DiscordApiMessage {
  id: string;
  content: string;
  author: { username: string };
  timestamp: string;
}

export interface DiscordMessage {
  id: string;
  content: string;
  author: string;
  createdAt: string;
  url: string;
}

export async function fetchDiscordMessages(
  channelId: string,
  limit = 1,
): Promise<DiscordMessage[]> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN environment variable is not set");
  }

  const res = await fetch(
    `${DISCORD_API}/channels/${channelId}/messages?limit=${limit}`,
    {
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Discord API ${res.status}: ${body}`);
  }

  const raw = (await res.json()) as DiscordApiMessage[];

  // Discord returns newest-first; figure out guild for the URL
  // Channel messages URL: https://discord.com/channels/{guild_id}/{channel_id}/{message_id}
  // We don't know guild_id from this endpoint, so we'll use a generic link
  return raw.map((msg) => ({
    id: msg.id,
    content: msg.content,
    author: msg.author.username,
    createdAt: msg.timestamp,
    url: `https://discord.com/channels/@me/${channelId}/${msg.id}`,
  }));
}
