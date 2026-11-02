// Party Scouter's layout rules. Colours come in as --party-* variables set from the theme on the
// page's container, so these stay static.

export const partyStyles = `
  .party-head { display: flex; flex-direction: column; align-items: flex-start; gap: 10px; margin-bottom: 14px; }

  /* The lineup: everyone standing on one floor, like a party select screen. */
  .party-stage {
    position: relative; overflow: hidden; display: grid; grid-template-columns: repeat(6, minmax(0, 1fr));
    min-height: 236px; padding: 0 12px; border: 1px solid var(--party-border); border-radius: 18px;
    background: var(--party-panel);
  }
  .party-floor {
    position: absolute; left: 0; right: 0; bottom: 0; height: 78px;
    background: var(--party-floor); border-top: 1px solid var(--party-border);
  }
  .party-slot { position: relative; z-index: 1; display: flex; min-width: 0; }
  .party-member {
    flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
    gap: 1px; padding: 12px 4px 12px; background: none; border: none; font: inherit; color: inherit;
    cursor: pointer; border-radius: 14px; transition: opacity 160ms ease, filter 160ms ease;
  }
  .party-member:focus-visible { outline: 2px solid var(--party-accent); outline-offset: -2px; }
  .party-member[aria-pressed="false"] { opacity: 0.45; filter: grayscale(0.7); }
  .party-fig { position: relative; display: grid; justify-items: center; margin-bottom: 2px; }
  .party-fig img { position: relative; z-index: 1; display: block; width: 96px; height: 96px; image-rendering: pixelated; object-fit: contain; object-position: center bottom; }
  /* A soft shadow under each member's feet, the same as the hub's lineup. An empty place keeps a
     fainter one, the spot where the next member will stand. */
  .party-fig::after {
    content: ""; position: absolute; bottom: 2px; width: 54px; height: 8px; border-radius: 50%; background: rgba(0,0,0,0.12);
  }
  .party-add .party-fig::after { bottom: -6px; width: 70px; background: rgba(0,0,0,0.06); }
  .party-plinth { width: 76%; max-width: 92px; height: 6px; border-radius: 999px; margin: 2px 0 7px; }
  .party-member b { font-size: 0.88rem; font-weight: 800; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .party-member small { font-size: 0.75rem; font-weight: 700; color: var(--party-muted); white-space: nowrap; }
  .party-hexa { font-family: var(--font-heading); font-size: 1rem; line-height: 1.2; }
  .party-out {
    position: absolute; top: 10px; left: 50%; transform: translateX(-50%); z-index: 2; white-space: nowrap;
    font-size: 0.75rem; font-weight: 800; color: var(--party-muted); background: var(--party-panel);
    border: 1px solid var(--party-border); border-radius: 999px; padding: 1px 9px; pointer-events: none;
  }
  .party-remove {
    position: absolute; top: 8px; right: 6px; z-index: 3; width: 26px; height: 26px; border-radius: 999px;
    display: grid; place-items: center; padding: 0; cursor: pointer; font: inherit; font-size: 0.9rem; line-height: 1;
    color: var(--party-muted); background: var(--party-panel); border: 1px solid var(--party-border);
    opacity: 0; transition: opacity 140ms ease;
  }
  .party-slot:hover .party-remove, .party-remove:focus-visible { opacity: 1; }
  @media (hover: none) { .party-remove { opacity: 1; } }
  .party-add-box {
    position: relative; z-index: 1; display: grid; place-items: center; width: 76px; height: 96px; border: 2px dashed var(--party-line);
    border-radius: 14px; background: var(--party-panel); color: var(--party-muted); font-weight: 800; font-size: 0.85rem;
    transition: border-color 160ms ease, color 160ms ease;
  }
  .party-add .party-plinth { background: transparent; }
  .party-add:hover .party-add-box, .party-add:focus-visible .party-add-box { border-color: var(--party-accent); color: var(--party-text); }
  .party-add:focus-visible { outline: none; }

  /* The bosses, with the chosen one's breakdown beside them. */
  .party-work { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 14px; margin-top: 14px; align-items: start; }
  .party-panel { background: var(--party-panel); border: 1px solid var(--party-border); border-radius: 18px; padding: 16px 18px; }
  .party-panel-head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
  .party-panel-head h2 { font-family: var(--font-heading); font-size: 1.25rem; margin: 0; }
  /* One row per boss: its art on the left, its difficulties beside it. Every row is one height. */
  .party-tiles { display: grid; gap: 8px; }
  .party-boss { display: grid; grid-template-columns: 180px minmax(0, 1fr); gap: 10px; align-items: center; }
  .party-boss-cells { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 8px; }
  .party-row {
    width: 100%; display: grid; grid-template-columns: 24px minmax(0, 1fr) auto; column-gap: 8px; align-items: center;
    padding: 7px 8px 0; text-align: left; cursor: pointer; font: inherit; color: inherit;
    background: none; border: 1px solid var(--party-border); border-radius: 10px; overflow: hidden; transition: border-color 140ms ease;
  }
  .party-row:hover { border-color: var(--party-accent); }
  .party-row:focus-visible { outline: 2px solid var(--party-accent); outline-offset: 1px; }
  .party-row[aria-pressed="true"] { border-color: var(--party-accent); box-shadow: inset 0 0 0 1px var(--party-accent); }
  /* The difficulty with its tag under it, the % beside both. */
  .party-row-name { display: grid; min-width: 0; line-height: 1.25; }
  .party-row-name > span:first-child { font-size: 0.82rem; font-weight: 700; color: var(--party-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .party-row strong { font-family: var(--font-heading); font-size: 1.25rem; line-height: 1.2; text-align: right; }
  .party-row.is-blocked strong { color: var(--party-muted); }
  .party-tag { font-size: 0.75rem; font-weight: 800; white-space: nowrap; }
  .party-strip { grid-column: 1 / -1; display: flex; height: 4px; margin: 7px -8px 0; background: var(--party-line); }
  .party-row.is-blocked .party-strip { background: repeating-linear-gradient(90deg, var(--party-line) 0 6px, transparent 6px 10px); }
  .party-strip i { display: block; height: 100%; transition: width 260ms ease; }
  .party-fold { margin-top: 12px; border-top: 1px solid var(--party-border); padding-top: 10px; }
  .party-fold summary {
    cursor: pointer; font-weight: 800; font-size: 0.85rem; color: var(--party-muted); padding: 4px 0; width: fit-content;
  }
  .party-fold summary:hover, .party-fold summary:focus-visible { color: var(--party-text); }
  .party-fold[open] summary { margin-bottom: 10px; }
  .party-note { font-size: 0.78rem; font-weight: 700; color: var(--party-muted); margin: 12px 0 0; }
  .party-empty { padding: 28px 8px; text-align: center; font-weight: 700; color: var(--party-muted); }

  .party-side { position: sticky; top: 16px; }
  .party-side-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 14px; }
  .party-side-head h3 { font-family: var(--font-heading); font-size: 1.2rem; margin: 0; line-height: 1.2; }
  .party-side-head span { font-size: 0.85rem; font-weight: 700; color: var(--party-muted); }
  .party-label { font-size: 0.75rem; font-weight: 800; color: var(--party-muted); margin: 0 0 8px; }
  .party-share { margin-bottom: 11px; }
  .party-share-line { display: flex; justify-content: space-between; gap: 8px; font-size: 0.85rem; font-weight: 800; margin-bottom: 4px; }
  .party-bar { height: 9px; border-radius: 999px; background: var(--party-line); overflow: hidden; }
  .party-bar i { display: block; height: 100%; border-radius: 999px; transition: width 260ms ease; }
  .party-facts { font-size: 0.78rem; font-weight: 700; color: var(--party-muted); margin: -6px 0 14px; }
  .party-share-name { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
  .party-share-name > span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .party-loss { flex-shrink: 0; font-size: 0.75rem; font-weight: 800; white-space: nowrap; cursor: help; }
  /* No marker: the figure answers the pointer with a soft tint instead. */
  .party-loss-figure { display: inline-block; border-radius: 6px; padding: 0 4px; margin: 0 -4px; transition: background-color 140ms ease; }
  .party-loss:hover .party-loss-figure, .party-loss:focus-within .party-loss-figure { background: color-mix(in srgb, currentColor 14%, transparent); }
  .party-loss-table { display: grid; grid-template-columns: auto auto auto; column-gap: 12px; row-gap: 2px; font-size: 0.78rem; text-align: left; }
  .party-loss-row { display: contents; }
  .party-loss-row > span:nth-child(2), .party-loss-row > b { text-align: right; font-variant-numeric: tabular-nums; }
  .party-total { display: flex; justify-content: space-between; border-top: 1px solid var(--party-border); padding-top: 10px; font-weight: 800; font-size: 0.88rem; }
  .party-hexa-box { margin-top: 14px; border-radius: 12px; padding: 12px 14px; background: var(--party-floor); }
  .party-hexa-box strong { display: block; font-family: var(--font-heading); font-size: 1.8rem; line-height: 1.1; }

  .party-pick-head { display: flex; justify-content: space-between; align-items: center; padding: 16px 18px 10px; }
  .party-pick-head h2 { font-family: var(--font-heading); font-size: 1.25rem; margin: 0; }
  .party-pick-close {
    width: 32px; height: 32px; border-radius: 999px; display: grid; place-items: center; padding: 0; cursor: pointer;
    font: inherit; font-size: 1.1rem; line-height: 1; color: var(--party-muted); background: none; border: 1px solid var(--party-border);
  }
  .party-pick-body { padding: 4px 18px 18px; max-height: min(70vh, 640px); overflow-y: auto; }
  .party-pick-drop {
    width: 100%; display: grid; justify-items: center; gap: 2px; padding: 18px 12px; cursor: pointer; text-align: center;
    font: inherit; color: inherit; background: none;
    border: 2px dashed var(--party-line); border-radius: 14px; transition: border-color 160ms ease;
  }
  .party-pick-drop:hover, .party-pick-drop.is-dragging, .party-pick-drop:focus-visible { border-color: var(--party-accent); outline: none; }
  .party-pick-drop b { font-weight: 800; font-size: 0.9rem; }
  .party-pick-drop small { font-size: 0.78rem; font-weight: 700; }
  .party-pick-error { margin: 8px 0 0; font-size: 0.82rem; font-weight: 700; }
  .party-pick-world > p { font-size: 0.75rem; font-weight: 800; margin: 10px 0 4px; }
  .party-pick-row {
    width: 100%; display: flex; align-items: center; gap: 10px; padding: 6px 8px; text-align: left; cursor: pointer;
    font: inherit; color: inherit; background: none; border: 1px solid transparent; border-radius: 12px;
  }
  .party-pick-row:hover:not(:disabled), .party-pick-row:focus-visible { border-color: var(--party-accent); outline: none; }
  .party-pick-row:disabled { cursor: default; opacity: 0.55; }
  .party-pick-row img { width: 44px; height: 44px; image-rendering: pixelated; object-fit: contain; }
  .party-pick-name { flex: 1; min-width: 0; display: grid; }
  .party-pick-name b { font-size: 0.88rem; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .party-pick-name small { font-size: 0.75rem; font-weight: 700; }

  @media (max-width: 860px) {
    .party-work { grid-template-columns: 1fr; }
    .party-side { position: static; }
  }
  @media (max-width: 640px) {
    .party-stage { grid-template-columns: repeat(3, minmax(0, 1fr)); padding: 0 4px; }
    .party-floor { display: none; }
    .party-fig img { width: 72px; height: 72px; }
    .party-fig::after { bottom: 4px; width: 42px; height: 7px; }
    .party-add .party-fig::after { bottom: -5px; width: 56px; }
    .party-add-box { width: 60px; height: 72px; }
    .party-stage { min-height: 0; }
    /* With nobody to line up with, the empty places drop their hidden text rows: two compact rows. */
    .party-stage.is-empty .party-add > :not(.party-fig) { display: none; }
    .party-stage.is-empty .party-member { padding: 10px 4px; }
    /* Class and level on their own lines, so a long class name fits. */
    .party-member small { display: grid; justify-items: center; }
    .party-member small span { max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
    .party-sep { display: none; }
    .party-boss { grid-template-columns: 1fr; }
  }
`;
