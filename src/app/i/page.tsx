"use client";

/*
  Card QR codes link here (mapledoro.com/i#<data>), a short path to keep the QR small. The data
  after the # never reaches the server, so the hand-off to the viewer happens in the browser.
*/
import { useEffect } from "react";

export default function CardLinkPage() {
  useEffect(() => {
    window.location.replace(`/characters/view${window.location.hash}`);
  }, []);
  return null;
}
