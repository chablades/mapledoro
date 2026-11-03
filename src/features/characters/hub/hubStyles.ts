// The hub's layout rules. Colours come in as --hub-* variables set from the theme on the page's
// container, so these stay static.

export const hubStyles = `
  .hub-grid {
    display: grid; grid-template-columns: 2fr 1fr; grid-template-rows: 1fr 1fr;
    gap: 16px; min-height: 520px;
  }
  .hub-grid > * { min-width: 0; }
  .hub-block {
    position: relative; overflow: hidden; display: block;
    background: var(--hub-panel); border: 1px solid var(--hub-border); border-radius: 18px;
    padding: 22px 24px; box-shadow: 0 12px 36px rgba(0,0,0,0.06);
    text-decoration: none; transition: border-color 180ms ease;
  }
  a.hub-block:hover, a.hub-block:focus-visible, .hub-mine:has(.hub-stretch:hover), .hub-mine:has(.hub-stretch:focus-visible) {
    border-color: var(--hub-accent);
  }
  a.hub-block:focus-visible, .hub-stretch:focus-visible { outline: 2px solid var(--hub-accent); outline-offset: 2px; }
  .hub-block h2 { font-family: var(--font-heading); font-size: 1.35rem; line-height: 1.15; margin: 0; }
  .hub-block p { font-weight: 600; font-size: 0.88rem; line-height: 1.45; margin: 4px 0 0; max-width: 30ch; position: relative; z-index: 1; }

  .hub-mine { grid-row: 1 / span 2; display: flex; flex-direction: column; }
  .hub-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
  /* Everything clickable inside Your Characters sits above the stretched directory link. */
  .hub-raised { position: relative; z-index: 2; }
  .hub-stretch::after { content: ""; position: absolute; inset: 0; z-index: 1; border-radius: 18px; }

  /* The Main on top, its Champions in a row beneath. */
  .hub-stage { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0; padding: 10px 0; }
  .hub-line { display: flex; align-items: flex-end; justify-content: center; gap: 6px; width: 100%; }
  .hub-who {
    display: grid; justify-items: center; gap: 3px; width: 88px; min-width: 0;
    text-decoration: none; border-radius: 12px;
  }
  .hub-who--main { width: 150px; }
  .hub-fig { position: relative; display: grid; justify-items: center; }
  .hub-fig::after {
    content: ""; position: absolute; bottom: 2px; width: 54px; height: 8px;
    border-radius: 50%; background: rgba(0,0,0,0.09);
  }
  /* The sprite's empty space under the feet scales with it, so the bigger Main stands higher. */
  .hub-who--main .hub-fig::after { width: 80px; height: 10px; bottom: 6px; }
  .hub-fig img { position: relative; z-index: 1; display: block; width: 96px; height: 96px; }
  .hub-who--main .hub-fig img { width: 160px; height: 160px; }
  .hub-who b { font-size: 0.82rem; font-weight: 800; white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
  a.hub-who:hover b, a.hub-who:focus-visible b { text-decoration: underline; text-underline-offset: 2px; }
  .hub-chips { display: flex; gap: 4px; justify-content: center; }
  .hub-chip { font-size: 0.75rem; font-weight: 800; border-radius: 999px; padding: 1px 8px; }
  /* An empty slot's figure area is the avatar's height, its dashed box standing on the same floor. */
  .hub-who--empty .hub-fig { height: 96px; align-content: end; }
  .hub-who--main.hub-who--empty .hub-fig { height: 160px; }
  .hub-who--empty .hub-fig::after { display: none; }
  .hub-slot { display: block; width: 56px; height: 80px; border: 2px dashed; border-radius: 14px; margin-bottom: 4px; }
  .hub-who--main .hub-slot { width: 84px; height: 120px; }
  .hub-who--empty b { font-weight: 700; }

  .hub-foot { display: flex; justify-content: space-between; align-items: center; gap: 12px; border-top: 1px solid; padding-top: 14px; font-size: 0.85rem; font-weight: 700; }
  .hub-btn { border-radius: 10px; padding: 10px 16px; font-weight: 800; font-size: 0.88rem; text-decoration: none; white-space: nowrap; }

  /* A sample card rising out of the block's bottom edge, faded into it. */
  .hub-card-art {
    position: absolute; right: -14px; bottom: -150px; width: 200px; border-radius: 10px;
    transform: rotate(6deg); opacity: 0.5;
    -webkit-mask-image: linear-gradient(to bottom, #000 30%, transparent 92%);
    mask-image: linear-gradient(to bottom, #000 30%, transparent 92%);
  }
  /* Three Heroes standing together. */
  .hub-heroes { position: absolute; right: 6px; bottom: -6px; display: flex; align-items: flex-end; opacity: 0.85; }
  .hub-heroes img { width: auto; height: 116px; margin-left: calc(-30px - var(--pull, 0px)); }
  .hub-heroes img:nth-child(2) { height: 132px; position: relative; z-index: 1; }

  @media (max-width: 720px) {
    .hub-grid { grid-template-columns: 1fr; grid-template-rows: auto; min-height: 0; }
    .hub-mine { grid-row: auto; }
    .hub-side { min-height: 170px; }
    .hub-party { min-height: 200px; }
    .hub-head { flex-wrap: wrap; }
    .hub-block p { max-width: 22ch; }
    /* Champions wrap into centred rows of up to three with room for their names; empty
       Champion slots only add noise at this width, so they hide (a missing Main still shows). */
    .hub-line { flex-wrap: wrap; gap: 10px 4px; max-width: 280px; }
    .hub-line .hub-who--empty { display: none; }
    .hub-who { width: 86px; }
    .hub-who--main { width: 140px; }
    .hub-fig img { width: 72px; height: 72px; }
    .hub-who--main .hub-fig img { width: 120px; height: 120px; }
    .hub-who b { font-size: 0.75rem; }
    .hub-line .hub-chips { display: none; }
    .hub-who--main .hub-slot { width: 64px; height: 92px; }
    .hub-who--main.hub-who--empty .hub-fig { height: 120px; }
    .hub-foot { flex-direction: column; align-items: stretch; gap: 10px; }
    .hub-btn { text-align: center; }
    .hub-card-art { width: 130px; bottom: -70px; }
    .hub-heroes img { height: 84px; margin-left: calc(-24px - var(--pull, 0px) * 0.72); }
    .hub-heroes img:nth-child(2) { height: 96px; }
  }
  @media (prefers-reduced-motion: reduce) { .hub-block { transition: none; } }
`;
