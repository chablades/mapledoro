// The third-party game-art hosts the card export may load through /api/img-proxy. Keep in sync
// with next.config.mjs's images.remotePatterns, which allowlists the same hosts for next/image.
export const TRUSTED_IMAGE_HOSTS = ["msavatar1.nexon.net", "g.nexonstatic.com", "haku.network"] as const;
