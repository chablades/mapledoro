// Keep in sync with next.config.mjs's images.remotePatterns -- both allowlist the same
// three third-party game-art hosts, just for different purposes (next/image optimization
// vs. the same-origin image proxy used only during PNG card export).
export const TRUSTED_IMAGE_HOSTS = ["msavatar1.nexon.net", "g.nexonstatic.com", "haku.network"] as const;
