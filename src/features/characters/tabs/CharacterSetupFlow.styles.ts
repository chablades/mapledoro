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

        @media (max-width: 860px) {
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
            max-width: min(100%, 220px) !important;
            margin-top: 0.35rem !important;
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

          .confirmed-summary-card p:first-of-type {
            font-size: 0.9rem !important;
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
            font-size: 0.8rem;
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
            justify-content: flex-start;
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
          padding: 10px 6px;
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
          transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease;
        }

        .profile-bookmark-tab--active {
          transform: translateX(4px);
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
          }

          .profile-binder-spine {
            flex-direction: row;
            width: 100%;
            overflow-x: auto;
            padding: 8px;
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

          .profile-bookmark-tab--active {
            transform: none;
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
        }
  `;
}
