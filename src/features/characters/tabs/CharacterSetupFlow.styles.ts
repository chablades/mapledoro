import type { AppTheme } from "../../../components/themes";

export function getCharacterSetupFlowStyles(theme: AppTheme) {
      return `
        :root {
          scrollbar-gutter: stable;
        }

        .character-search-panel { transition: background 0.35s ease, border-color 0.35s ease; }

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
          transition: flex-basis 0.35s ease;
        }

        .search-card {
          width: 100%;
          transition: opacity 0.22s ease, transform 0.22s ease;
        }

        .search-card.confirm-fade {
          opacity: 0;
          transform: translateY(8px);
        }

        .search-card.profile-to-directory-fade,
        .setup-panel.profile-to-directory-fade {
          animation: profileToDirectoryOut 0.16s ease forwards !important;
        }

        .profile-actions-card.profile-to-directory-fade {
          animation: profileToDirectoryOut 0.16s ease forwards !important;
        }

        .setup-step-content.profile-to-directory-fade,
        .confirmed-summary-card.profile-to-directory-fade {
          animation: profileToDirectoryFadeOnly 0.16s ease forwards !important;
        }

        .profile-actions-card {
          transition: opacity 0.2s ease, transform 0.2s ease;
        }

        .profile-actions-card.profile-actions-fade-in {
          animation: profileActionsFadeIn 0.22s ease both;
        }

        .profile-actions-card.profile-actions-fade-out {
          animation: profileActionsFadeOut 0.14s ease both;
        }

        .search-card.search-fade-in {
          animation: searchCardFadeIn 0.26s ease;
        }

        .preview-card {
          transition: opacity 0.22s ease, transform 0.22s ease;
        }

        .preview-card.confirm-fade {
          opacity: 0;
          transform: translateY(8px);
        }

        .preview-card.back-fade {
          animation: previewBackFade 0.22s ease forwards;
        }

        .image-skeleton-wrap {
          position: relative;
          overflow: hidden;
          background: ${theme.border};
        }

        .confirmed-avatar-wrap {
          overflow: hidden;
          flex: 0 0 auto;
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
          transition: opacity 0.2s ease;
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
          align-items: center;
          justify-content: center;
          opacity: 0;
          transform: translateY(8px);
          transition:
            flex-basis 0.35s ease,
            max-width 0.35s ease,
            opacity 0.2s ease 0.12s,
            transform 0.2s ease 0.12s;
        }

        .characters-content.has-preview .search-pane {
          flex-basis: calc(100% - 360px);
        }

        .characters-content.setup-active .search-pane {
          flex: 0 0 340px;
          max-width: 340px;
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
          overflow: visible;
          opacity: 1;
          transform: translateY(0);
        }

        .characters-content.directory-view .preview-pane {
          flex: 1 1 auto;
          max-width: 100%;
          width: 100%;
          opacity: 1;
          transform: translateY(0);
          transition: opacity 0.2s ease, transform 0.2s ease;
        }

        .preview-pane > .character-search-panel {
          width: 100%;
        }

        .preview-content {
          transition: opacity 0.2s ease, transform 0.2s ease;
        }

        .preview-char-swap {
          animation: previewSwap 0.24s ease;
        }

        .preview-confirm-fade {
          opacity: 0 !important;
          transform: none !important;
          transition: opacity 0.2s ease;
        }

        .preview-content.back-fade-content {
          animation: previewBackFade 0.22s ease forwards;
        }

        .setup-panel {
          opacity: 0;
          transform: translateY(8px);
          transition: opacity 0.25s ease, transform 0.25s ease;
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
          transition: opacity 0.2s ease !important;
        }

        .setup-panel.setup-panel-fade-out {
          animation: setupPanelFadeOut 0.16s ease both;
        }

        .setup-step-content {
          animation-duration: 0.24s;
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

        .setup-step-content.step-no-slide {
          animation: none !important;
          opacity: 0;
          transform: none;
        }

        .setup-panel.step-panel-fade-in {
          animation: stepPanelFadeIn 0.22s ease both;
        }

        .setup-step-content.step-flow-fade-in {
          animation: stepFlowFadeIn 0.22s ease both;
        }

        .summary-panel-fade-in {
          animation: summaryFadeIn 0.22s ease both;
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

        .profile-shell-fade-in {
          animation: profileShellFadeIn 0.22s ease both;
        }

        .profile-shell-fade-out {
          animation: profileShellFadeOut 0.16s ease both;
        }

        .profile-shell-state-fade-in {
          animation: profileShellStateFadeIn 0.22s ease both;
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

        @keyframes summaryFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes profileActionsFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes profileActionsFadeOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(8px); }
        }

        @keyframes profileShellFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes profileShellFadeOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(8px); }
        }

        @keyframes profileShellStateFadeIn {
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

        @keyframes stepPanelFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes stepFlowFadeIn {
          from { opacity: 0; transform: none; }
          to { opacity: 1; transform: none; }
        }

        @keyframes setupPanelFadeOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(8px); }
        }

        @media (max-width: 860px) {
          .desktop-back-label {
            display: none;
          }

          .mobile-back-label {
            display: inline;
          }

          .profile-role-chip {
            font-size: 0.62rem !important;
            padding: 0.1rem 0.42rem !important;
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
            justify-content: center;
          }

          .search-card,
          .preview-pane > .character-search-panel {
            width: min(100%, 560px);
            margin: 0 auto;
          }

          .characters-content.setup-active .search-pane,
          .characters-content.setup-active .preview-pane {
            flex: 0 0 auto;
            max-width: 100%;
            width: 100%;
          }

          .characters-content.setup-active .preview-pane {
            order: 2;
          }

          .characters-content.setup-active .search-pane {
            order: 1;
          }

          .characters-content.setup-active .preview-pane > .character-search-panel {
            width: min(100%, 640px);
            margin: 0 auto;
            padding: 1.15rem !important;
          }

          .characters-content.setup-active .search-card {
            width: min(100%, 170px);
            margin: 0 auto;
            padding: 0.55rem !important;
          }

          .confirmed-summary-card {
            min-height: 0 !important;
            max-width: 152px !important;
            gap: 0.1rem !important;
          }

          .confirmed-summary-card .confirmed-avatar-wrap {
            width: 64px !important;
            height: 64px !important;
            border-radius: 8px !important;
          }

          .confirmed-summary-card .confirmed-avatar-wrap img {
            width: 100% !important;
            height: 100% !important;
            border-radius: 8px !important;
            object-fit: cover !important;
          }

          .confirmed-summary-card button {
            font-size: 0.74rem !important;
            padding: 0.32rem 0.52rem !important;
          }

          .confirmed-summary-card p:first-of-type {
            font-size: 0.9rem !important;
          }

          .confirmed-summary-card p:nth-of-type(2),
          .confirmed-summary-card p:nth-of-type(3) {
            font-size: 0.72rem !important;
            line-height: 1.2 !important;
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
  `;
}
