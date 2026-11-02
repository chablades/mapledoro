"use client";

// The View a Character block's art: a real card, drawn by the same renderer Export uses so it
// always matches the current card design, for Doro (the MapleDoro mascot) rather than anyone's
// own character. Her details are a joke on purpose: a Lop Bunny from Kamakura, at level 67.

import { useEffect, useState } from "react";
import { renderCharacterCard } from "../share/cardRender";

// Scanning it just leads home.
const SAMPLE_QR_TEXT = "https://mapledoro.com/";
const DORO = "/icons/doro.png";

async function linkQrModules(text: string): Promise<boolean[][]> {
  const { default: qrcode } = await import("qrcode-generator");
  const qr = qrcode(0, "L");
  qr.addData(text, "Byte");
  qr.make();
  const n = qr.getModuleCount();
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (__, c) => qr.isDark(r, c)));
}

async function renderSampleCard(): Promise<string> {
  const png = await renderCharacterCard({
    ign: "Doro",
    level: 67,
    className: "Lop Bunny",
    // A kamakura is a Japanese snow dome: a snow bunny's snow fortress. It has no server crest.
    worldName: "Kamakura",
    worldIconUrl: "",
    avatarUrl: DORO,
    // Her own class splash art is also just her.
    classArtUrl: DORO,
    scouter: 6767,
    date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    qr: { modules: await linkQrModules(SAMPLE_QR_TEXT) },
  });
  // A data URL rather than an object URL: it lives for the whole page anyway (see below), and a
  // data URL has nothing to release.
  let binary = "";
  for (let i = 0; i < png.length; i += 0x8000) binary += String.fromCharCode(...png.subarray(i, i + 0x8000));
  return `data:image/png;base64,${btoa(binary)}`;
}

// Drawn once per page load: returning to the hub reuses it rather than repainting the canvas.
let sampleCard: Promise<string | null> | null = null;

function drawSampleCardOnce(): Promise<string | null> {
  if (!sampleCard) sampleCard = renderSampleCard().catch(() => null);
  return sampleCard;
}

/** A data URL of the sample card's PNG, or null until it is drawn (or if drawing failed). */
export function useSampleCard(): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void drawSampleCardOnce().then((drawn) => { if (!cancelled) setUrl(drawn); });
    return () => { cancelled = true; };
  }, []);
  return url;
}
