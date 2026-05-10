"use client";

import AppShell from "../../components/AppShell";
import LegalPageLayout, { LegalSection } from "../../components/LegalPageLayout";
import type { AppTheme } from "../../components/themes";

function TermsContent({ theme }: { theme: AppTheme }) {
  return (
    <LegalPageLayout theme={theme} title="Terms of Service" lastUpdated="April 10, 2026">
      <LegalSection theme={theme} title="1. Acceptance of Terms">
        By accessing or using MapleDoro, you agree to be bound by these
        Terms of Service. If you do not agree, please do not use the site.
      </LegalSection>

      <LegalSection theme={theme} title="2. Nature of the Service">
        MapleDoro is a free, open-source, non-commercial fan project
        provided &quot;as is&quot; for the MapleStory community. The
        service is not affiliated with, endorsed, or supported by Nexon,
        Wizet, or any of their partners.
      </LegalSection>

      <LegalSection theme={theme} title="3. No Accounts, No Personal Data">
        MapleDoro does not require an account. All user data (characters,
        progress, settings) is stored locally in your browser via
        localStorage. We do not collect, store, or transmit personal
        information to any server we control.
      </LegalSection>

      <LegalSection theme={theme} title="4. Acceptable Use">
        You agree not to use MapleDoro for any unlawful purpose, to abuse
        its public APIs, or to attempt to disrupt the service for other
        users. Automated scraping or excessive request volume may result in
        rate limiting.
      </LegalSection>

      <LegalSection theme={theme} title="5. Third-Party Content">
        MapleDoro displays data from third-party sources including
        MapleStory Wiki, the Nexon CDN, and Discord. We do not control
        those sources and are not responsible for their availability,
        accuracy, or content.
      </LegalSection>

      <LegalSection theme={theme} title="6. Intellectual Property">
        MapleStory and all related assets (including but not limited to
        images, characters, and names) are the intellectual property and
        registered trademarks of Nexon. MapleDoro uses these assets under
        fair use for a non-commercial fan project. All rights remain with
        their respective owners.
      </LegalSection>

      <LegalSection theme={theme} title="7. Disclaimer of Warranty">
        MapleDoro is provided without warranty of any kind, express or
        implied. The maintainers do not guarantee that the service will be
        accurate, reliable, uninterrupted, or error-free.
      </LegalSection>

      <LegalSection theme={theme} title="8. Limitation of Liability">
        In no event shall the maintainers of MapleDoro be liable for any
        damages arising from the use or inability to use the service,
        including but not limited to loss of data or game progress.
      </LegalSection>

      <LegalSection theme={theme} title="9. Changes to These Terms">
        These Terms may be updated from time to time. Continued use of
        MapleDoro after changes constitutes acceptance of the updated
        Terms. The &quot;Last updated&quot; date at the top of this page
        reflects the most recent revision.
      </LegalSection>
    </LegalPageLayout>
  );
}

export default function TermsPage() {
  return (
    <AppShell currentPath="/terms">
      {({ theme }) => <TermsContent theme={theme} />}
    </AppShell>
  );
}
