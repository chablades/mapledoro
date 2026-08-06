import type { AppTheme } from "../../../components/themes";
import { CHARACTERS_TRANSITION_MS } from "./useSetupFlowTransitions";

export function getCharacterSetupFlowStyles(theme: AppTheme) {
      return `
        @keyframes char-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .char-refresh-spin {
          animation: char-spin 0.9s linear infinite;
          transform-box: fill-box;
          transform-origin: center;
        }

        :root {
          scrollbar-gutter: stable;
          --characters-fast: ${CHARACTERS_TRANSITION_MS.fast}ms;
          --characters-standard: ${CHARACTERS_TRANSITION_MS.standard}ms;
          --characters-slow: ${CHARACTERS_TRANSITION_MS.slow}ms;
          --characters-search-fade: ${CHARACTERS_TRANSITION_MS.searchFadeIn}ms;
        }

        .character-search-panel {
          transition:
            background var(--characters-slow) ease,
            border-color var(--characters-slow) ease;
        }

        .characters-main {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 0;
          width: 100%;
          padding: 1rem 1.5rem 2rem 2.75rem;
        }

        .characters-search-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 0.65rem;
        }

        .characters-content {
          width: 100%;
          max-width: 1100px;
          display: flex;
          gap: 1rem;
          align-items: start;
        }

        .characters-content.suppress-layout .search-pane,
        .characters-content.suppress-layout .preview-pane {
          transition: none !important;
        }

        .search-pane {
          flex: 1 1 auto;
          min-width: 0;
          transition: flex-basis var(--characters-slow) ease;
        }

        .search-card {
          width: 100%;
          transition:
            opacity var(--characters-standard) ease,
            transform var(--characters-standard) ease;
        }

        .search-card.confirm-fade {
          opacity: 0;
          transform: translateY(8px);
        }

        .search-card.profile-to-directory-fade,
        .setup-panel.profile-to-directory-fade {
          animation: profileToDirectoryOut var(--characters-fast) ease forwards !important;
        }

        .profile-actions-card.profile-to-directory-fade {
          animation: profileToDirectoryOut var(--characters-fast) ease forwards !important;
        }

        .setup-step-content.profile-to-directory-fade,
        .confirmed-summary-card.profile-to-directory-fade {
          animation: profileToDirectoryFadeOnly var(--characters-fast) ease forwards !important;
        }

        /* Deleting reuses these same profile-to-directory-fade elements, but slowed down to
           match .profile-binder-closing's own duration below -- otherwise this fade reaches
           opacity 0 at --characters-fast (160ms) and hides the rest of the binder's closing
           animation before it's had a chance to actually be seen. Same specificity (2 classes)
           as the rules above, so source order (this comes after) settles the tie. */
        .profile-to-directory-fade.deleting {
          animation-duration: var(--characters-slow) !important;
        }

        .profile-actions-card {
          transition:
            opacity var(--characters-standard) ease,
            transform var(--characters-standard) ease;
        }

        .profile-actions-card.profile-actions-fade-in {
          animation: profileActionsFadeIn var(--characters-standard) ease both;
        }

        .search-card.search-fade-in {
          animation: searchCardFadeIn var(--characters-search-fade) ease;
        }

        /* Same entrance as .search-fade-in, reused for the preview pane's initial-load
           reveal (landing straight on a profile on refresh/deep link) instead of the
           step-forward slide used for in-session navigation, so it matches the profile
           card beside it. Longhand (not the animation: shorthand) deliberately, to match
           .step-forward/.step-backward below: the shorthand resets animation-fill-mode to
           its default (none), so once the animation finished the element would snap back
           to .setup-step-content's static opacity: 0 instead of holding the fade's end
           state — this way it keeps inheriting fill-mode: both from that base rule. */
        .setup-step-content.initial-reveal-fade {
          animation-name: searchCardFadeIn;
          animation-duration: var(--characters-search-fade);
          animation-timing-function: ease;
        }

        .preview-card {
          transition:
            opacity var(--characters-standard) ease,
            transform var(--characters-standard) ease;
        }

        .preview-card.confirm-fade {
          opacity: 0;
          transform: translateY(8px);
        }

        .preview-card.back-fade {
          animation: previewBackFade var(--characters-standard) ease forwards;
        }

        .image-skeleton-wrap {
          position: relative;
          overflow: hidden;
          background: ${theme.border};
        }

        .confirmed-avatar-wrap {
          overflow: hidden;
          flex: 0 0 auto;
          width: 210px;
          height: 210px;
          border-radius: 18px;
        }

        .confirmed-avatar-wrap img {
          border-radius: 18px;
          object-fit: contain;
          object-position: center bottom;
          display: block;
          /* Pixel-art sprite scaled well past its native resolution; the browser's default
             bilinear smoothing blurs it, nearest-neighbor keeps the pixel edges crisp. */
          image-rendering: pixelated;
        }

        .confirmed-summary-card {
          width: 100%;
          max-width: 300px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          text-align: center;
          gap: 0.35rem;
        }

        .character-profile-nav-row {
          width: 100%;
          display: flex;
          justify-content: flex-start;
          margin-bottom: 0.65rem;
        }

        .confirmed-summary-info {
          width: 100%;
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .profile-role-chip-row {
          justify-content: center;
        }

        .char-profile-back-btn {
          border-radius: 999px;
          font-size: 0.76rem;
          padding: 0.38rem 0.62rem;
        }

        .image-skeleton-wrap::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            110deg,
            transparent 20%,
            rgba(255, 255, 255, 0.38) 42%,
            transparent 64%
          );
          transform: translateX(-120%);
          animation: imageShimmer 1.2s ease-in-out infinite;
        }

        .image-fade-in {
          opacity: 0;
          transition: opacity var(--characters-standard) ease;
        }

        .image-fade-in.image-loaded {
          opacity: 1;
        }

        .preview-pane {
          flex: 0 0 0;
          max-width: 0;
          overflow: hidden;
          align-self: stretch;
          display: flex;
          align-items: flex-start;
          justify-content: flex-start;
          opacity: 0;
          transform: translateY(8px);
          transition:
            flex-basis var(--characters-slow) ease,
            max-width var(--characters-slow) ease,
            opacity var(--characters-standard) ease var(--characters-fast),
            transform var(--characters-standard) ease var(--characters-fast);
        }

        .characters-content.has-preview .search-pane {
          flex-basis: calc(100% - 360px);
        }

        .characters-content.setup-active .search-pane {
          flex: 0 0 340px;
          max-width: 340px;
        }

        .characters-content.profile-view .search-pane {
          flex: 0 0 340px;
          max-width: 340px;
        }

        .characters-content.profile-view .preview-pane {
          flex: 0 0 0;
          max-width: 0;
          overflow: hidden;
          opacity: 0;
          transform: translateY(8px);
        }

        .characters-content.has-preview .preview-pane {
          flex-basis: 360px;
          max-width: 360px;
          overflow: visible;
          opacity: 1;
          transform: translateY(0);
        }

        .characters-content.setup-active .preview-pane {
          flex: 1 1 auto;
          max-width: calc(100% - 356px);
          min-width: 520px;
          overflow: visible;
          opacity: 1;
          transform: translateY(0);
        }

        .characters-content.directory-view .preview-pane {
          flex: 1 1 auto;
          min-width: 0;
          max-width: 100%;
          width: 100%;
          opacity: 1;
          transform: translateY(0);
          transition:
            opacity var(--characters-standard) ease,
            transform var(--characters-standard) ease;
        }

        /* .characters-main vertically centers its content by default, which is fine for
           panels of roughly consistent height, but the directory screen swaps between very
           different content heights (a tall character grid vs. the much shorter Legion
           panel tabs) without a page navigation in between. Re-centering on every swap reads
           as a jarring jump; pinning this family to the top removes the jump entirely. */
        .characters-content.directory-view {
          align-self: flex-start;
        }

        .preview-pane > .character-search-panel {
          width: 100%;
          min-width: 0;
        }

        .preview-content {
          transition:
            opacity var(--characters-standard) ease,
            transform var(--characters-standard) ease;
        }

        .preview-char-swap {
          animation: previewSwap var(--characters-standard) ease;
        }

        .preview-confirm-fade {
          opacity: 0 !important;
          transform: none !important;
          transition: opacity var(--characters-standard) ease;
        }

        .preview-content.back-fade-content {
          animation: previewBackFade var(--characters-standard) ease forwards;
        }

        .setup-panel {
          opacity: 0;
          transform: translateY(8px);
          transition:
            opacity var(--characters-standard) ease,
            transform var(--characters-standard) ease;
        }

        .setup-panel.setup-panel-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .setup-panel.setup-panel-fade {
          opacity: 0 !important;
          transform: translateY(8px) !important;
        }

        .setup-panel.setup-finish-fade {
          opacity: 0 !important;
          transform: none !important;
          transition: opacity var(--characters-standard) ease !important;
        }

        .setup-step-content {
          animation-duration: var(--characters-standard);
          animation-timing-function: ease;
          animation-fill-mode: both;
          opacity: 0;
        }

        .setup-step-content.step-forward {
          animation-name: setupStepSlideForward;
        }

        .setup-step-content.step-backward {
          animation-name: setupStepSlideBackward;
        }

        .setup-step-content.directory-step-content {
          animation: none !important;
          opacity: 1;
          transform: none;
        }

        .desktop-back-label {
          display: inline;
        }

        .mobile-back-label {
          display: none;
        }

        .profile-role-chip {
          font-size: 0.76rem !important;
          padding: 0.22rem 0.68rem !important;
        }

        .profile-actions-wrap {
          width: 100%;
        }

        .profile-action-button {
          flex: 0 0 auto;
        }

        .profile-actions-divider {
          display: none;
        }

        @keyframes previewSwap {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes previewBackFade {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(8px); }
        }

        @keyframes imageShimmer {
          100% { transform: translateX(120%); }
        }

        @keyframes searchCardFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes setupStepSlideForward {
          from { opacity: 0; transform: translateX(16px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes setupStepSlideBackward {
          from { opacity: 0; transform: translateX(-16px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes profileActionsFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes profileToDirectoryOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(8px); }
        }

        @keyframes profileToDirectoryFadeOnly {
          from { opacity: 1; transform: none; }
          to { opacity: 0; transform: none; }
        }

        /* Runs on the .profile-binder element itself alongside the ancestor panels' own
           profile-to-directory-fade (slowed to match via the .deleting modifier above), so a
           deletion reads as the binder itself closing rather than a generic cross-fade -- see
           isDeleteTransitioning's own comment in useCharacterSetupController.ts. Collapses
           toward the spine's edge (left on desktop, top on mobile via the --binder-close-s*
           override below) like the pages folding shut into the binder's cover, using scale()
           on both axes driven by CSS vars rather than two separate keyframes for the two
           directions. Duration matches --characters-slow (not -fast) -- the first version used
           -fast and was too quick to actually register as a deliberate animation. */
        @keyframes profileBinderClose {
          from { opacity: 1; transform: scale(1, 1); }
          to { opacity: 0; transform: scale(var(--binder-close-sx, 0.05), var(--binder-close-sy, 1)); }
        }

        .profile-binder-closing {
          transform-origin: left center;
          animation: profileBinderClose var(--characters-slow) ease forwards;
        }

        @media (max-width: 860px) {
          /* Absolutely positioned off the name's right edge on desktop (see
             genderMarriageIconRowStyle's comment) so their width never pulls the name
             off-center -- on a narrow viewport with a long IGN that overflows the card
             and can clip/cause horizontal scroll. Static on mobile trades perfect
             centering for never overflowing, which is the right call at this width. */
          .gender-marriage-icons {
            position: static !important;
          }

          .desktop-back-label {
            display: none;
          }

          .mobile-back-label {
            display: inline;
          }

          .profile-role-chip {
            font-size: 0.75rem !important;
            padding: 0.1rem 0.42rem !important;
          }

          .profile-actions-wrap {
            /* No max-width override here anymore -- falls back to the 300px cap already set
               inline (same as desktop). The old 220px override shrank this card noticeably
               narrower than everything else on the page, which read as a random floating box
               rather than a normal panel at this width. */
            margin-top: 0.35rem !important;
          }

          /* Standalone hairline (not a border baked into the danger button itself, which
             would clash with the button's own full pill border) separating the destructive
             Remove action from the two harmless toggle buttons above it -- otherwise all
             three read as equally-weighted items in the same stacked list, and Remove doesn't
             visually announce itself as a different, more serious kind of action. Desktop
             isn't touched: its side-by-side wrapped row doesn't have this problem. */
          .profile-actions-divider {
            display: block;
            width: 100%;
            border-top: 1px solid ${theme.border};
            margin: 0.15rem 0 0.05rem;
          }

          .character-profile-nav-row {
            justify-content: center !important;
            margin-bottom: 0.45rem !important;
          }

          .character-profile-nav-row button {
            margin-left: 0 !important;
            align-self: center !important;
          }

          .profile-actions-card > div {
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 0.35rem !important;
            justify-items: stretch !important;
            padding: 0.45rem !important;
          }

          .profile-action-button {
            width: 100% !important;
            justify-content: center !important;
          }

          .characters-main {
            padding: 1rem;
            align-items: flex-start;
            justify-content: flex-start;
          }

          .characters-search-row {
            grid-template-columns: 1fr;
          }

          .characters-content {
            flex-direction: column;
            width: 100%;
            max-width: 640px;
            margin: 0 auto;
            gap: 0.85rem;
            align-items: center;
          }

          .search-pane,
          .preview-pane {
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }

          .search-card,
          .preview-pane > .character-search-panel {
            width: min(100%, 560px);
            margin: 0 auto;
          }

          .characters-content.setup-active .search-pane,
          .characters-content.setup-active .preview-pane,
          .characters-content.profile-view .search-pane,
          .characters-content.profile-view .preview-pane {
            flex: 0 0 auto;
            max-width: 100%;
            width: 100%;
          }

          .characters-content.setup-active .preview-pane {
            order: 2;
            min-width: 0;
          }

          .characters-content.setup-active .search-pane,
          .characters-content.profile-view .search-pane {
            order: 1;
          }

          .characters-content.setup-active .preview-pane > .character-search-panel {
            width: min(100%, 640px);
            margin: 0 auto;
            padding: 1.15rem !important;
          }

          .characters-content.setup-active .search-card {
            width: min(100%, 440px);
            margin: 0 auto;
            padding: 0.65rem 0.75rem !important;
          }

          .confirmed-summary-card {
            min-height: 0;
            max-width: 152px;
            gap: 0.1rem;
          }

          .confirmed-summary-card .confirmed-avatar-wrap {
            width: 64px;
            height: 64px;
            border-radius: 8px;
          }

          .confirmed-summary-card .confirmed-avatar-wrap img {
            width: 100% !important;
            height: 100% !important;
            border-radius: 8px;
            object-fit: cover;
            /* At this display size the sprite is close to (or below) its native
               resolution, so nearest-neighbor scaling reads as chunky/blocky rather than
               crisp — only worth it at the full 210px desktop size. */
            image-rendering: auto;
          }

          .confirmed-summary-card button:not(.char-profile-back-btn) {
            font-size: 0.75rem !important;
            padding: 0.32rem 0.52rem !important;
          }

          .confirmed-summary-card .char-profile-back-btn {
            font-size: 0.75rem;
            padding: 0.32rem 0.52rem;
          }

          .confirmed-summary-card p:nth-of-type(2),
          .confirmed-summary-card p:nth-of-type(3) {
            font-size: 0.75rem !important;
            line-height: 1.2 !important;
          }

          /* Setup card: horizontal layout — round back pill | bigger avatar | info.
             The card adds this modifier class itself (SearchPaneModel.profile.isSetupContext),
             so these rules just cascade over the base .confirmed-summary-card rules above —
             no ancestor scoping or !important needed. */
          .confirmed-summary-card--setup {
            flex-direction: row;
            align-items: center;
            justify-content: center;
            max-width: 100%;
            gap: 0.7rem;
            text-align: left;
          }

          .confirmed-summary-card--setup .character-profile-nav-row {
            width: auto;
            margin: 0;
            flex: 0 0 auto;
          }

          .confirmed-summary-card--setup .char-profile-back-btn {
            padding: 0.4rem 0.72rem;
            font-size: 0.75rem;
            border-radius: 10px;
          }

          .confirmed-summary-card--setup .confirmed-avatar-wrap {
            width: 84px;
            height: 84px;
            border-radius: 12px;
            flex: 0 0 auto;
          }

          .confirmed-summary-card--setup .confirmed-avatar-wrap img {
            border-radius: 12px;
            /* Overrides the base mobile rule's object-fit: cover (60 lines up), which crops a
               full-body sprite down to just the head in this box -- a tall portrait sprite
               (e.g. 43x68 native) forced to cover an 84x84 SQUARE box scales up until its
               WIDTH fills the box, stretching height well past it, then object-position: center
               top (below) anchors the crop window at the top, showing only the head/shoulders
               and cutting off everything below. contain (matching desktop's own object-fit,
               same fix as CharacterAvatar.tsx's fallback avatar bug) letterboxes instead,
               keeping the whole body visible. The base 64px non-setup card's own cover isn't
               touched -- that's a different, smaller context this bug wasn't reported in. */
            object-fit: contain;
            object-position: center top;
            image-rendering: auto;
          }

          .confirmed-summary-card--setup .confirmed-summary-info {
            width: auto;
            flex: 0 1 auto;
            min-width: 0;
            align-items: flex-start;
          }

          .confirmed-summary-card--setup .profile-role-chip-row {
            justify-content: center;
          }

          /* The setup card's info column is narrow (beside the avatar, not full card width --
             see confirmed-summary-info above), so "Updated <date>" wraps wherever the browser
             finds room, often splitting mid-date ("Aug 1," / "2026") instead of a clean break.
             Force it onto its own line only here; the plain (non-setup) profile card is full
             width with room to keep it on one line, so this shouldn't apply there. */
          .confirmed-summary-card--setup .profile-updated-date {
            display: block;
          }

          .preview-pane,
          .characters-content.has-preview .preview-pane {
            flex-basis: auto;
            max-width: 100%;
            width: 100%;
            align-self: auto;
          }

          .characters-content.has-preview .search-pane {
            flex-basis: auto;
          }

          .search-card {
            padding: 1.1rem !important;
          }
        }

        /* Profile "binder": thumb-index bookmark spine + page-swap panel. Stretched
           (via the chain below) to match the confirmed-summary-card's height beside it
           instead of sizing to its own content, so it doesn't read as visually
           unbalanced next to a taller card; .profile-binder-page centers its content
           vertically to absorb whatever extra room that leaves on shorter pages. */
        .preview-pane:has(.profile-binder) {
          align-items: stretch;
        }

        .preview-pane:has(.profile-binder) > aside {
          display: flex;
          flex-direction: column;
        }

        .preview-pane:has(.profile-binder) > aside > .setup-step-content {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .profile-binder {
          display: flex;
          align-items: stretch;
          width: 100%;
          flex: 1;
          border-radius: 18px;
          overflow: hidden;
          /* Pinned to EXP's measured height (the tallest bookmark as of this writing, since its
             two charts were added — was previously V Matrix at 665px) so switching between
             bookmarks doesn't resize the row and shift the spine tabs (and the mouse's position
             over them) — shorter bookmarks just sit in extra empty space below their content
             instead. A bookmark taller than this still grows the row past it; only the shrink
             direction is pinned. Has to live here, not on .profile-binder-page below — this
             element's own overflow:hidden clips a nested child's min-height demand instead of
             letting it grow the flex row that stretches against the confirmed-summary-card
             sibling. 697px was measured on .profile-binder-page-content (with the spine's own
             natural height, ~622px, temporarily ruled out as a confound — the spine is a flex
             row sibling under align-items:stretch, so any bookmark shorter than the spine's own
             height renders at spine height regardless of its real content, which otherwise
             masks a shorter bookmark's true size), which sits inside .profile-binder-page's own
             vertical padding (1rem top + 1rem bottom = 2rem) — added back here since this
             min-height applies one level higher, outside that padding. */
          min-height: calc(697px + 2rem);
        }

        .profile-binder-page {
          flex: 1;
          min-width: 0;
          padding: 1rem 1.15rem;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
        }

        .profile-binder-spine {
          display: flex;
          flex-direction: column;
          gap: 3px;
          flex-shrink: 0;
          /* No left padding/gap: the active tab's highlight (border-radius flush on
             that side) is meant to reach the spine's own left edge, like a real
             binder tab, rather than floating with a gap on both sides. */
          padding: 10px 6px 10px 0;
          width: 108px;
          background: ${theme.bg};
        }

        .profile-bookmark-tab {
          display: flex;
          align-items: center;
          width: 100%;
          border: none;
          border-radius: 0 8px 8px 0;
          padding: 7px 10px;
          min-height: 32px;
          font-size: 0.75rem;
          font-weight: 800;
          line-height: 1.25;
          text-align: left;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.15s ease, color 0.15s ease;
        }

        /* Sits at the end of the list already (last in ALL_BOOKMARKS); this pushes it to
           the bottom of the spine's own box instead of just the end of a content-length
           list, so it reads as detached from the data bookmarks above it regardless of
           how many of those there are. */
        .profile-bookmark-pinned-group {
          margin-top: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        /* A standalone element (not a border on the button) with its own margin on both
           sides, so it never sits flush against the tab label above or below it — a hard
           line touching the text caused an optical illusion in an earlier attempt. */
        .profile-bookmark-divider {
          border-top: 1px solid ${theme.border};
          margin: 0 4px;
        }

        @keyframes profile-page-reveal {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .profile-binder-page-content {
          animation: profile-page-reveal 0.2s ease-out both;
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        /* Combat/Basic Stats' label+value pairs — side by side on desktop (plenty of room for
           even a long "15,069,287"), stacked on mobile (see mobile override below) where the
           2-column stat grid leaves too little width per value for that to keep fitting. */
        .summary-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 10px;
        }

        .summary-row-value {
          text-align: right;
        }

        /* Gear bookmark's "Titles, Totems & Symbols" nav button — full label on desktop,
           a shorter one on mobile (see mobile override below) so it fits on one line instead
           of wrapping and blowing up the button's height next to its "Pets"/"Gear" sibling. */
        .equipment-action-label-full {
          display: inline;
        }

        .equipment-action-label-short {
          display: none;
        }

        @media (prefers-reduced-motion: reduce) {
          .profile-bookmark-tab,
          .profile-binder-page-content {
            animation: none !important;
            transition: none !important;
          }
        }

        @media (max-width: 860px) {
          .profile-binder {
            flex-direction: column;
            /* No reserved height here (unlike the desktop min-height above) -- V Matrix is
               such an outlier in mobile height (measured 1123.90625px vs a fraction of that
               for shorter bookmarks like Bio) that pinning to it would waste huge amounts
               of screen space on every other bookmark. */
            min-height: auto;
          }

          .profile-binder-spine {
            flex-direction: row;
            width: 100%;
            overflow-x: auto;
            padding: 8px;
            /* .profile-binder-page renders BEFORE this in the JSX
               (CharacterProfileOverviewScreen.tsx), which puts the spine below a bookmark's
               content on this column layout instead of above it. order:-1 flips it to
               render first visually, so a resize expands downward from the spine instead
               of moving it. */
            order: -1;
            /* --edge-fade-mask is set inline via useScrollEdges/edgeFadeMask
               (CharacterProfileOverviewScreen.tsx) -- only consumed into a real mask HERE,
               inside this mobile-only media query, never as a literal inline style, since
               the desktop vertical column has no horizontal overflow and would otherwise
               get an incorrect fade clipping its content. */
            mask-image: var(--edge-fade-mask);
            -webkit-mask-image: var(--edge-fade-mask);
            /* This row layout also kicks in on a narrowed desktop browser window, not just
               real mobile -- there it gets a real (visible, non-overlay) OS scrollbar, which
               reads as chunky next to the pill/fade treatment above. Kept visible rather than
               hidden entirely (a mouse-only desktop user has no touch swipe to fall back on),
               just slimmed down and themed to match. */
            scrollbar-width: thin;
            scrollbar-color: ${theme.border} transparent;
          }

          .profile-binder-spine::-webkit-scrollbar {
            height: 6px;
          }

          .profile-binder-spine::-webkit-scrollbar-track {
            background: transparent;
          }

          .profile-binder-spine::-webkit-scrollbar-thumb {
            background: ${theme.border};
            border-radius: 999px;
          }

          .profile-bookmark-tab {
            width: auto;
            flex-shrink: 0;
            border-radius: 999px;
            white-space: nowrap;
          }

          /* The vertical pin + divider don't translate to the horizontal scroll strip
             mobile uses instead; Setup just flows as the last tab in the row here. */
          .profile-bookmark-pinned-group {
            margin-top: 0;
            display: contents;
          }

          .profile-bookmark-divider {
            display: none;
          }

          .profile-binder-page {
            padding: 0.9rem 1rem;
          }

          .summary-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 2px;
          }

          .summary-row-value {
            align-self: flex-end;
          }

          .equipment-action-label-full {
            display: none;
          }

          .equipment-action-label-short {
            display: inline;
          }

          /* Several bookmarks (Stats/Hyper Stat/Ability, HEXA Skills/HEXA Stat, Gear/Titles/
             Pets) stack their sub-views in one grid cell so the row sizes to the tallest of
             them (desktop keeps that via visibility:hidden, see StatsBookmark's/
             HexaMatrixBookmark's/EquipmentBookmark's own comments) — on mobile there's no
             panel min-height for that extra space to disappear into, so it read as a giant
             blank gap above the action bar whenever a shorter view was active. Switching the
             inactive panes to real display:none here removes them from the grid's sizing
             entirely, so the row matches whichever view is actually showing.
          */
          .bookmark-subview:not(.bookmark-subview-active) {
            display: none !important;
          }

          /* That fix above then exposed a second-order jump: the same bookmarks' internal
             switcher bar (Hyper Stats/Ability, HEXA Skills/Stat, Gear/Titles/Pets) sits below
             the content via marginTop:auto, pinned to the panel's bottom edge -- fine on
             desktop where the panel's height is fixed regardless of sub-view, but on mobile
             the panel now genuinely grows/shrinks per sub-view, so a bottom-pinned bar moves
             every time you tap it. Mirrors the outer bookmark spine's own top-anchoring fix:
             order:-1 moves the bar above the content instead, right under the page header, so
             its position no longer depends on how tall the content below it is. */
          .bookmark-page-nav {
            order: -1;
            /* !important: overriding the inline paddingTop:14/marginTop:"auto" set for the
               desktop bottom-pinned layout -- an external rule alone can't beat an inline
               style, and the auto margin in particular would otherwise still absorb any free
               space above this now-first flex item, recreating the same gap this was meant
               to remove. */
            margin-top: 0 !important;
            padding-top: 0 !important;
            padding-bottom: 14px;
          }


          /* The binder's spine reorders to the top on mobile (.profile-binder-spine above),
             so the closing animation should collapse toward the top edge here instead of the
             left edge desktop uses. */
          .profile-binder-closing {
            transform-origin: top center;
            --binder-close-sx: 1;
            --binder-close-sy: 0.05;
          }

          /* Familiars' "Equipped Badges" staggers its second row of 4 by half a badge width
             (matches the in-game brick-offset look) -- on a narrow viewport that offset alone
             is enough to push the row's last pentagon past the available width, clipping it.
             Dropping the offset here in favor of a plain, flush 4-column x 2-row grid trades
             the in-game-accurate stagger for never overflowing, which is the right call at
             this width (same reasoning as .gender-marriage-icons above). */
          .familiar-badge-row-offset {
            margin-left: 0 !important;
          }
        }

        /* Boss Clear's Quick View row (BossClearGrid.tsx) wraps its banner+chips onto separate
           lines once the ROW's own available width drops below ~392px (banner 180 + gap 12 +
           chip-container's 200px flex-basis) -- that can happen well inside typical "desktop"
           viewport widths if the bookmark panel itself is narrow (confirmed live: wrapped at a
           970px viewport in a narrower panel layout, well above the 860px breakpoint above), so
           a container query keyed to the row-list's own rendered width is the right tool here,
           not a viewport media query. Threshold matches the flex math above, no !important
           needed since nothing sets justify-content inline to fight with. */
        .boss-quick-row-list {
          container-type: inline-size;
        }
        @container (max-width: 400px) {
          .boss-quick-row {
            justify-content: center;
          }
          .boss-quick-chip-grid {
            justify-content: center;
          }
        }

        /* PowerStrip's 4-across grid (BossClearGrid.tsx) overflows "Converted"'s long value on
           narrow panels -- same container-query approach as .boss-quick-row-list above. */
        .power-strip {
          container-type: inline-size;
        }
        @container (max-width: 400px) {
          .power-strip-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }

        /* Stat Efficiency (StatEfficiencyPanel.tsx) puts both its sections in two side-by-side
           boxes, which halves the panel's height at the ~517px this bookmark normally gets
           (binder page = the setup panel minus the 108px spine and its padding). A half has to
           hold source + meter + answer for the comparisons, or a stat name + amount box + value
           for the per-stat table, so below the width where two of those fit the boxes stack
           into one column instead. Same container-query approach as .power-strip-grid above. */
        .stat-efficiency-panel {
          container-type: inline-size;
        }
        @container (max-width: 470px) {
          .stat-efficiency-columns {
            grid-template-columns: minmax(0, 1fr) !important;
          }
        }
        /* Full width and still no room for the meter: it's the only elastic track in a
           comparison row, so it drops out entirely rather than becoming an unreadable stub, and
           the answer takes over its track (still right-aligned via its own justify-self). The
           source and answer are the load-bearing halves; the range marker is context. */
        @container (max-width: 300px) {
          .stat-efficiency-comparisons {
            grid-template-columns: max-content 1fr !important;
          }
          .stat-efficiency-meter {
            display: none !important;
          }
        }
        /* The per-stat table's Amount box, tightened from .tool-input's own padding/type size to
           fit a column that also has to hold a stat name and its value. Shape lives here rather
           than inline so globals' iOS anti-zoom rule (a focused control under 16px scales the
           page in on iPhone) still applies -- an inline font-size would beat that media query.
           This block is injected after globals.css, though, so a plain .tool-input rule there
           loses to anything declared here: the query has to be restated for this class. */
        .stat-efficiency-amount {
          width: 100%;
          box-sizing: border-box;
          padding: 1px 5px;
          font-size: 0.75rem;
        }
        @media (max-width: 560px) {
          .stat-efficiency-amount {
            font-size: 16px;
          }
        }

        /* Spotlight's tile row (BossClearGrid.tsx, SpotlightTile) is one row across all 5
           subgrid columns (icon/difficulty/tag/clear%/Adjusted) by default. Below 400px, some
           end-game characters clear a low-tier boss at an 8-digit clear% (e.g. 474248.20%), which
           has no room left on the same line as icon+difficulty+tag on a narrow panel -- so
           clear%/Adjusted move onto a second row sharing the difficulty/tag columns instead.
           Placement lives here (not inline) specifically so this query can override it. */
        .spotlight-tile-stack {
          container-type: inline-size;
        }
        /* 1 row on desktop so content vertically centers in a single-row-tall box (align-items:
           center on .spotlight-tile handles the centering itself); 2 rows on mobile since the
           wrapped layout below needs the full 2-row height. Applies to both the HoverTooltip
           wrapper and its inner div -- both carry this class (see SpotlightTile). */
        .spotlight-tile {
          grid-row: span 1;
        }
        .spotlight-tile-cell-diff { grid-column: 2; grid-row: 1; }
        .spotlight-tile-cell-tag { grid-column: 3; grid-row: 1; }
        @container (max-width: 400px) {
          .spotlight-tile {
            grid-row: span 2 !important;
          }
          /* Icon spans both rows so it vertically centers against the tile's full 2-row height
             instead of sitting in row 1 only, next to just the difficulty/tag line. */
          .spotlight-tile-cell-icon {
            grid-row: 1 / span 2 !important;
          }
          /* .spotlight-tile-cell-numbers is the desktop flex wrapper around clear%/Adjusted
             (display: flex inline, see SpotlightTile) -- switching it to display: contents makes
             its two children direct grid items in their own right, so the grid-column/-row below
             can place them independently under the diff/tag columns on their own row instead of
             staying grouped in column 4. !important required: the element's own inline
             display: flex otherwise wins outright (inline beats a plain stylesheet rule
             regardless of the @container match -- same class of bug hit earlier this session with
             .spotlight-tile-numbers's flex-basis). */
          .spotlight-tile-cell-numbers {
            display: contents !important;
          }
          .spotlight-tile-cell-clear {
            grid-column: 2 !important;
            grid-row: 2 !important;
          }
          .spotlight-tile-cell-adjusted {
            grid-column: 3 !important;
            grid-row: 2 !important;
          }
        }

        /* CharacterDirectoryScreen's World/Sort controls row: the Export/Import button
           pair (.directory-export-import) stays right-aligned and content-sized on
           desktop (margin-left: auto keeps it visually separate from World/Sort without
           stretching). Below 480px it wraps onto its own line -- there, overriding to
           width:100% with no auto margin makes it fill that line and split evenly
           between the two buttons, instead of the marginLeft:auto still pulling it to
           hug the right edge with stray empty space under Sort (flex-basis alone can't
           express "full width once wrapped, content-sized otherwise" without a real
           breakpoint, since flex-grow:0 needed for the desktop case never lets it fill
           the wrapped line either). */
        @media (max-width: 480px) {
          .directory-export-import {
            width: 100%;
            margin-left: 0 !important;
          }
        }

  `;
}
