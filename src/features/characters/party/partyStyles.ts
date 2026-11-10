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
  .party-name { display: inline-flex; align-items: center; gap: 4px; }
  .party-world { display: inline-flex; flex-shrink: 0; }
  .party-world img { display: block; width: 14px; height: 14px; object-fit: contain; }
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

  .party-worlds { margin: 12px 2px 0; font-size: 0.85rem; font-weight: 700; }

  /* The bosses as a boss select: a strip of boss art to pick from, the picked one's hero below. */
  .party-board { margin-top: 14px; }
  .party-panel { background: var(--party-panel); border: 1px solid var(--party-border); border-radius: 18px; padding: 16px 18px; }
  .party-panel-head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
  .party-panel-head h2 { font-family: var(--font-heading); font-size: 1.25rem; margin: 0; }
  .party-thumbs { display: grid; grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); gap: 8px; }
  .party-thumb {
    position: relative; overflow: hidden; height: 72px; padding: 0; cursor: pointer; font: inherit; text-align: left;
    background: var(--party-floor); border: 1px solid var(--party-border); border-radius: 12px; transition: border-color 140ms ease;
  }
  .party-thumb-art { position: absolute; inset: 0; }
  /* The splash art letters the boss's name across its top. Drawing it in a box that starts 16%
     above the visible area (and runs 6% below it) keeps that strip out of view whatever the width (cover then scales
     the picture to this taller box, so its top always lands above the cut). */
  .party-art-crop { position: absolute; left: 0; right: 0; bottom: -6%; top: -16%; transform: translateY(var(--art-shift, 0%)); }
  .party-thumb::after { content: ""; position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.7), transparent 65%); }
  .party-thumb b {
    position: absolute; left: 9px; right: 9px; bottom: 8px; z-index: 1; font-size: 0.85rem; font-weight: 800; color: #fff;
    text-shadow: 0 1px 3px rgba(0,0,0,0.8); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .party-thumb-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; z-index: 1; }
  .party-thumb:hover { border-color: var(--party-accent); }
  .party-thumb:focus-visible { outline: 2px solid var(--party-accent); outline-offset: 2px; }
  .party-thumb[aria-pressed="true"] { border-color: var(--party-accent); box-shadow: 0 0 0 1px var(--party-accent); }

  /* The picked boss: its art large on the right, its difficulties and breakdown on the left. */
  .party-hero {
    position: relative; overflow: hidden; isolation: isolate; margin-top: 14px; min-height: 360px;
    border: 1px solid var(--party-border); border-radius: 16px; background: var(--party-panel);
  }
  .party-hero-art {
    /* From just inside the body's right edge (460px wide) to the panel's, faded in from the left.
       Never narrower than 560px: on a narrow window it slides left under the faded part instead,
       since a narrow box would scale the art to its height and bring the lettered name at the top
       of every splash into view. */
    position: absolute; top: 0; bottom: 0; right: 0; left: clamp(0px, calc(100% - 560px), 420px); z-index: -1;
    -webkit-mask-image: linear-gradient(to left, #000 35%, rgba(0,0,0,0.6) 65%, transparent 100%);
    mask-image: linear-gradient(to left, #000 35%, rgba(0,0,0,0.6) 65%, transparent 100%);
  }
  .party-hero-body { position: relative; width: min(460px, 100%); padding: 18px 20px 20px; }
  .party-hero-body h3 { font-family: var(--font-heading); font-size: 1.6rem; line-height: 1.15; margin: 0 0 2px; }
  .party-hero .party-facts { margin: 0 0 14px; }
  .party-diffs { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }
  .party-diff {
    min-width: 88px; display: grid; justify-items: center; padding: 6px 8px 0; cursor: pointer; overflow: hidden;
    font: inherit; color: inherit; background: var(--party-panel); border: 1px solid var(--party-border); border-radius: 10px;
    transition: border-color 140ms ease;
  }
  .party-diff:hover { border-color: var(--party-accent); }
  .party-diff:focus-visible { outline: 2px solid var(--party-accent); outline-offset: 1px; }
  .party-diff[aria-selected="true"] { border-color: var(--party-accent); box-shadow: inset 0 0 0 1px var(--party-accent); }
  .party-diff-name { font-size: 0.75rem; font-weight: 800; color: var(--party-muted); }
  .party-diff strong { font-family: var(--font-heading); font-size: 1.15rem; line-height: 1.15; }
  .party-diff.is-blocked strong { color: var(--party-muted); }
  .party-tag { font-size: 0.75rem; font-weight: 800; white-space: nowrap; }
  .party-diff .party-tag { max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
  .party-strip { width: calc(100% + 16px); display: flex; height: 4px; margin: 5px -8px 0; background: var(--party-line); }
  .party-diff.is-blocked .party-strip { background: repeating-linear-gradient(90deg, var(--party-line) 0 6px, transparent 6px 10px); }
  .party-strip i { display: block; height: 100%; transition: width 260ms ease; }
  .party-foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 4px 16px; margin-top: 12px; }
  .party-note { font-size: 0.78rem; font-weight: 700; color: var(--party-muted); margin: 0; }
  .party-empty { padding: 28px 8px; text-align: center; font-weight: 700; color: var(--party-muted); }

  .party-label { font-size: 0.75rem; font-weight: 800; color: var(--party-muted); margin: 0 0 8px; }
  .party-share { margin-bottom: 11px; }
  .party-share-line { display: flex; justify-content: space-between; gap: 8px; font-size: 0.85rem; font-weight: 800; margin-bottom: 4px; }
  .party-bar { height: 9px; border-radius: 999px; background: var(--party-line); overflow: hidden; }
  .party-bar i { display: block; height: 100%; border-radius: 999px; transition: width 260ms ease; }
  .party-facts { font-size: 0.8rem; font-weight: 700; color: var(--party-muted); }
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
  /* The card outline (the same one View a Character shows) beside the drop prompt. */
  .party-pick-drop {
    width: 100%; display: flex; align-items: center; justify-content: center; gap: 16px; padding: 12px 14px; cursor: pointer;
    font: inherit; color: inherit; background: none; text-align: left;
    border: 2px dashed var(--party-line); border-radius: 14px; transition: border-color 160ms ease, background-color 160ms ease;
  }
  .party-pick-drop:hover, .party-pick-drop.is-dragging, .party-pick-drop:focus-visible {
    border-color: var(--party-accent); background: color-mix(in srgb, var(--party-accent) 8%, transparent);
  }
  .party-pick-drop:disabled { background: none; }
  .party-pick-drop:disabled { cursor: progress; }
  .party-pick-drop svg { width: 54px; height: auto; display: block; flex-shrink: 0; }
  /* The drop zone's own dashed border frames it, so the card's frame is left out here. */
  .party-pick-drop .viewer-card-outline { display: none; }
  .party-pick-drop.is-reading .viewer-qr-finders { animation: partyScan 0.9s ease-in-out infinite alternate; }
  @keyframes partyScan { from { stroke-opacity: 0.2; } to { stroke-opacity: 1; } }
  @media (prefers-reduced-motion: reduce) { .party-pick-drop.is-reading .viewer-qr-finders { animation: none; } }
  .party-pick-drop-text { display: grid; gap: 2px; }
  .party-pick-drop b { font-weight: 800; font-size: 0.9rem; color: var(--party-muted); transition: color 160ms ease; }
  .party-pick-drop:hover b, .party-pick-drop.is-dragging b, .party-pick-drop:focus-visible b { color: var(--party-text); }
  /* No hover on touch screens, so the prompt starts at full strength there. */
  @media (hover: none) { .party-pick-drop b { color: var(--party-text); } }
  .party-pick-drop small { font-size: 0.78rem; font-weight: 700; }
  .party-pick-error { margin: 8px 0 0; font-size: 0.82rem; font-weight: 700; }
  .party-pick-world > p { font-size: 0.75rem; font-weight: 800; margin: 10px 0 4px; }
  .party-pick-row {
    width: 100%; display: flex; align-items: center; gap: 10px; padding: 6px 8px; text-align: left; cursor: pointer;
    font: inherit; color: inherit; background: none; border: 1px solid transparent; border-radius: 12px;
  }
  .party-pick-row:hover:not(:disabled), .party-pick-row:focus-visible { border-color: var(--party-accent); }
  .party-pick-row:disabled { cursor: default; opacity: 0.55; }
  .party-pick-row img { width: 44px; height: 44px; image-rendering: pixelated; object-fit: contain; }
  .party-pick-name { flex: 1; min-width: 0; display: grid; }
  .party-pick-name b { font-size: 0.88rem; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .party-pick-name small { font-size: 0.75rem; font-weight: 700; }

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
    .party-thumbs { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .party-hero-art { left: 0; width: 100%; height: 150px; bottom: auto; -webkit-mask-image: linear-gradient(to top, transparent, #000 60%); mask-image: linear-gradient(to top, transparent, #000 60%); }
    .party-hero-body { padding: 110px 14px 16px; }
    .party-diff { flex: 1 1 76px; width: auto; }
  }
`;
