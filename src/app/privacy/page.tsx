"use client";

import AppShell from "../../components/AppShell";
import LegalPageLayout, { LegalSection } from "../../components/LegalPageLayout";
import type { AppTheme } from "../../components/themes";

function PrivacyContent({ theme }: { theme: AppTheme }) {
  return (
    <LegalPageLayout theme={theme} title="Privacy Policy" lastUpdated="May 10, 2026">
      <LegalSection theme={theme} title="Summary">
        MapleDoro does not collect personal information. There are no
        accounts and no tracking cookies. Everything you enter is stored
        in your own browser via localStorage and never leaves your device.
      </LegalSection>

      <LegalSection theme={theme} title="Analytics">
        MapleDoro uses{" "}
        <a
          href="https://vercel.com/docs/analytics"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: theme.accent, textDecoration: "none" }}
        >
          Vercel Analytics
        </a>{" "}
        to collect anonymous, aggregated usage data such as page views,
        visitor counts, and general geographic region. This data does not
        include any personally identifiable information, does not use
        cookies, and cannot be used to identify individual users. It is
        used solely to understand which features are popular and to
        improve the site. You can learn more about how Vercel handles
        this data in their{" "}
        <a
          href="https://vercel.com/docs/analytics/privacy-policy"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: theme.accent, textDecoration: "none" }}
        >
          privacy policy
        </a>
        .
      </LegalSection>

      <LegalSection theme={theme} title="What we store locally">
        Data you enter (characters, boss crystal progress, symbol
        tracking, pitched boss drops, theme preference) is saved to your
        browser&apos;s localStorage. This data stays on your device. You
        can wipe it at any time from the Settings page or by clearing your
        browser data.
      </LegalSection>

      <LegalSection theme={theme} title="Server-side caching">
        To keep the site fast, MapleDoro&apos;s server caches publicly
        available data such as character lookups (from the MapleStory
        Rankings API), patch notes (from the Nexon CDN), and Sunny Sunday
        event announcements (from a public Discord channel). These caches
        contain only publicly available information and are not linked to
        you as an individual.
      </LegalSection>

      <LegalSection theme={theme} title="Third-party services">
        When you view character portraits, patch notes, or event
        information, your browser may fetch images and content directly
        from third-party domains including the Nexon CDN and MapleStory
        Wiki. These requests are subject to the privacy policies of those
        respective services.
      </LegalSection>

      <LegalSection theme={theme} title="No tracking, no advertising">
        MapleDoro does not use Google Analytics, Facebook Pixel, or any
        advertising network. We do not sell, rent, or share any data
        about you. The only analytics service in use is Vercel Analytics,
        which collects anonymous, non-identifiable usage metrics as
        described above.
      </LegalSection>

      <LegalSection theme={theme} title="Children">
        MapleDoro is intended for a general audience and does not
        knowingly collect information from anyone, including children
        under the age of 13.
      </LegalSection>

      <LegalSection theme={theme} title="Changes to this policy">
        If this policy is updated, the &quot;Last updated&quot; date at
        the top of this page will change. Material changes will be noted
        in the project changelog.
      </LegalSection>
    </LegalPageLayout>
  );
}

export default function PrivacyPage() {
  return (
    <AppShell currentPath="/privacy">
      {({ theme }) => <PrivacyContent theme={theme} />}
    </AppShell>
  );
}
