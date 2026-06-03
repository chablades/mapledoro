export interface AttributionSource {
  label: string;
  href: string;
  license?: { label: string; href: string };
}

export const WIKI_ATTRIBUTION_SOURCE: AttributionSource = {
  label: "MapleStory Wiki",
  href: "https://maplestorywiki.net",
  license: {
    label: "CC BY-NC-SA 4.0",
    href: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
  },
};
