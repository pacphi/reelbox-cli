import { describe, expect, it } from "vitest";
import { urlKey, URL_RE } from "../../src/lib/urlKey.js";

describe("urlKey", () => {
  it("returns null for falsy input", () => {
    expect(urlKey(undefined)).toBeNull();
    expect(urlKey(null)).toBeNull();
    expect(urlKey("")).toBeNull();
  });

  it("keys Instagram reel/p/tv URLs as ig:<shortcode>", () => {
    expect(urlKey("https://www.instagram.com/reel/Cxyz123abc/")).toBe("ig:Cxyz123abc");
    expect(urlKey("https://www.instagram.com/p/Cxyz123abc/")).toBe("ig:Cxyz123abc");
    expect(urlKey("https://www.instagram.com/tv/Cxyz123abc/")).toBe("ig:Cxyz123abc");
  });

  it("keys YouTube URLs (shorts, watch, embed, youtu.be) as yt:<id>", () => {
    expect(urlKey("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("yt:dQw4w9WgXcQ");
    expect(urlKey("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("yt:dQw4w9WgXcQ");
    expect(urlKey("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("yt:dQw4w9WgXcQ");
    expect(urlKey("https://youtu.be/dQw4w9WgXcQ")).toBe("yt:dQw4w9WgXcQ");
  });

  it("keys Facebook reel/watch/share URLs as fb:<id>", () => {
    expect(urlKey("https://www.facebook.com/reel/1234567890123456")).toBe("fb:1234567890123456");
    expect(urlKey("https://www.facebook.com/share/r/AbCdEfGhIj/")).toBe("fb:AbCdEfGhIj");
  });

  it("falls back to the ?v= numeric id for facebook.com/watch links", () => {
    expect(urlKey("https://www.facebook.com/watch?v=987654321")).toBe("fb:987654321");
  });

  it("checks platforms in yt -> ig -> fb -> fb-watch priority order", () => {
    // A YouTube-shaped URL should never be mistaken for anything else.
    expect(urlKey("https://youtu.be/abcdefghijk")?.startsWith("yt:")).toBe(true);
  });

  it("returns null for URLs that match none of the known platforms", () => {
    expect(urlKey("https://example.com/not-a-reel")).toBeNull();
  });
});

describe("URL_RE", () => {
  it("matches the first http(s) URL in a string", () => {
    const text = 'see https://example.com/a"trailing text';
    expect(URL_RE.exec(text)?.[0]).toBe("https://example.com/a");
  });
});
