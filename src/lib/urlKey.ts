const IG_KEY = /instagram\.com\/(?:reels?|p|tv)\/([A-Za-z0-9_-]{5,})/;
const FB_KEY = /facebook\.com\/(?:reel|watch|share\/r|share\/v|video)[/?](?:\?v=)?([A-Za-z0-9._-]{5,})/;
const FB_WATCH = /[?&]v=(\d{6,})/;
const YT_KEY = /(?:youtube\.com\/shorts\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/)([A-Za-z0-9_-]{6,})/;

export const URL_RE = /https?:\/\/[^\s"'<>\\]+/;

/** Normalize a reel/short URL to a stable dedupe/merge key like `ig:SHORTCODE`. */
export function urlKey(url: string | undefined | null): string | null {
  if (!url) return null;
  const yt = YT_KEY.exec(url);
  if (yt) return `yt:${yt[1]}`;
  const ig = IG_KEY.exec(url);
  if (ig) return `ig:${ig[1]}`;
  const fb = FB_KEY.exec(url);
  if (fb) return `fb:${fb[1]}`;
  const watch = FB_WATCH.exec(url);
  if (watch) return `fb:${watch[1]}`;
  return null;
}
