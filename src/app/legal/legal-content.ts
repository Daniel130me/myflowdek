/**
 * Content for FlowDeck's public legal pages (/legal/terms, /legal/privacy).
 *
 * Kept as plain typed data (not JSX) so the documents read as documents:
 * the owner can edit copy here without touching layout code, and
 * LegalDocument renders both documents with one shared presentation.
 *
 * Operators: review this copy with counsel before launch and update
 * LEGAL_CONTACT_EMAIL / LEGAL_LAST_UPDATED to match how you actually
 * operate the service.
 */

/** Published contact address used inside both documents (single source). */
export const LEGAL_CONTACT_EMAIL = 'kosokodaniel@gmail.com';

/** ISO date shown as "Last updated" on both documents. */
export const LEGAL_LAST_UPDATED = '2026-09-09';

export interface LegalSection {
  heading: string;
  /** Each entry is one paragraph. Kept as plain strings for easy editing. */
  paragraphs: string[];
}

export interface LegalDocumentData {
  title: string;
  intro: string;
  sections: LegalSection[];
}

export const TERMS_DOC: LegalDocumentData = {
  title: 'Terms of Service',
  intro:
    'These Terms of Service ("Terms") govern your access to and use of FlowDeck, a workflow and project management service. By creating an account, accessing, or using FlowDeck, you agree to be bound by these Terms. If you do not agree, do not use the service.',
  sections: [
    {
      heading: '1. Who these Terms apply to',
      paragraphs: [
        'FlowDeck is provided by the FlowDeck team ("we", "us", "our"). "You" means the individual or organisation that creates an account or is invited to use the service on behalf of that organisation. If you use FlowDeck on behalf of a company or other legal entity, you represent that you have authority to bind that entity to these Terms.',
        'Workspaces in FlowDeck are owned by the organisation that created them. If you join a workspace as an invited member, the workspace owner and administrators control your access, and your content within that workspace is managed on their behalf.',
      ],
    },
    {
      heading: '2. Your account',
      paragraphs: [
        'You must provide accurate and complete information when creating an account and keep it up to date. You are responsible for safeguarding your credentials and for all activity that occurs under your account. Notify us immediately if you suspect unauthorised use of your account.',
        'You must be at least 16 years old, or the minimum digital-consent age in your jurisdiction, to create a FlowDeck account.',
      ],
    },
    {
      heading: '3. Acceptable use',
      paragraphs: [
        'You agree not to use FlowDeck to break the law or infringe the rights of others, and not to: probe, scan or test the vulnerability of the service; circumvent authentication, rate limits or usage limits; upload malware or content you do not have the right to share; harass other members; or resell or provide the service to third parties as a hosted offering without our written permission.',
        'We may suspend or terminate accounts that violate these Terms, that create unacceptable security or legal risk, or that remain unpaid where payment is required for the plan in use.',
      ],
    },
    {
      heading: '4. Your content',
      paragraphs: [
        '"Content" means the projects, tasks, comments, files, and other material you or your workspace members submit to FlowDeck. You retain all rights you hold in your Content. You grant us a limited, worldwide, non-exclusive licence to host, store, reproduce, and display your Content solely as needed to operate, secure, and support the service for you.',
        'You are responsible for the Content you submit and for having the necessary rights to share it, including the rights of anyone who appears in or is referenced by that Content. We do not claim ownership of your Content and will not sell it.',
      ],
    },
    {
      heading: '5. Subscriptions, billing and cancellation',
      paragraphs: [
        'Some FlowDeck features may be offered on a paid subscription basis. If you purchase a subscription, you agree to pay the fees stated at checkout, which are processed by our third-party payment providers. Subscriptions renew automatically for successive billing periods unless cancelled before the renewal date.',
        'You may cancel a paid subscription at any time from your billing settings; cancellation stops future charges. Except where required by law, fees already paid are non-refundable. If we make a material adverse change to a paid feature, we will give you reasonable advance notice so you can cancel before the change takes effect.',
      ],
    },
    {
      heading: '6. Service availability and support',
      paragraphs: [
        'We aim to keep FlowDeck available and performant, and we maintain backups of workspace data. The service is nonetheless provided "as is" and "as available"; we do not promise that it will be uninterrupted or error-free. We may make functional changes, and may discontinue features that are demonstrably unused, with notice where practical.',
        'Scheduled maintenance and urgent security fixes may temporarily limit availability. Where an incident materially affects the service, we will communicate status through the product or the channels we publish.',
      ],
    },
    {
      heading: '7. Intellectual property',
      paragraphs: [
        'FlowDeck, including its software, design, branding, and documentation, is protected by intellectual-property laws. Except for the limited rights expressly granted in these Terms, we retain all rights in the service. You may not copy, modify, or create derivative works of FlowDeck, or reverse-engineer it except where such restriction is prohibited by law.',
      ],
    },
    {
      heading: '8. Disclaimers and limitation of liability',
      paragraphs: [
        'To the maximum extent permitted by law, we disclaim all implied warranties, including merchantability, fitness for a particular purpose, and non-infringement. We are not responsible for the accuracy of Content submitted by users, or for decisions you make based on that Content.',
        'To the maximum extent permitted by law, our aggregate liability arising out of or relating to the service is limited to the amounts you paid us for the service in the twelve months before the event giving rise to the claim. We are not liable for indirect, incidental, special, consequential, or punitive damages, or for lost profits, revenue, or data, even if advised of the possibility of such damages.',
      ],
    },
    {
      heading: '9. Termination',
      paragraphs: [
        'You may stop using FlowDeck and delete your account at any time. We may suspend or terminate your access with notice where practical if you materially breach these Terms, create legal or security exposure for us or others, or fail to pay fees when due.',
        'On termination, your workspace and Content may be permanently deleted after any retention window we publish in the Privacy Policy. It is your responsibility to export Content you wish to keep before termination.',
      ],
    },
    {
      heading: '10. Changes to these Terms',
      paragraphs: [
        'We may update these Terms as the service evolves. If a change materially reduces your rights, we will notify you through the service or by email before it takes effect. Continuing to use FlowDeck after the effective date of an update means you accept the updated Terms.',
      ],
    },
    {
      heading: '11. Contact and governing terms',
      paragraphs: [
        'Questions, complaints, and legal notices about these Terms can be sent to us. We will acknowledge and work to resolve any good-faith complaint promptly.',
        'These Terms are governed by the laws applicable at our principal place of business, without regard to conflict-of-law rules. If any provision of these Terms is found unenforceable, the remaining provisions stay in force.',
      ],
    },
  ],
};

export const PRIVACY_DOC: LegalDocumentData = {
  title: 'Privacy Policy',
  intro:
    'This Privacy Policy explains how FlowDeck collects, uses, shares, and protects personal data when you use the FlowDeck service, and the choices you have. FlowDeck is the data controller for account and billing data, and processes workspace Content on behalf of the workspace owner.',
  sections: [
    {
      heading: '1. Data we collect',
      paragraphs: [
        'Account data: when you register we collect your name, email address, and a securely hashed password. If you are invited to a workspace, we process the email address the invitation was sent to, plus any profile details you later add.',
        'Content and usage data: you and your workspace members submit projects, tasks, comments, files, time logs and similar records, which we store and process to operate the service for you. We also keep security-relevant logs (for example sign-in events and rate-limit counters) and basic device/browser information needed to render the application.',
      ],
    },
    {
      heading: '2. How we use data',
      paragraphs: [
        'We use personal data to: provide and secure the service (authentication, sessions, preventing abuse, enforcing rate limits); operate workspace features you interact with; send transactional email such as invitations, email verification, and password resets; and, where a plan is paid, handle billing through our payment providers.',
        'We do not sell personal data, and we do not use your workspace Content to advertise to you or to train third-party AI models.',
      ],
    },
    {
      heading: '3. Legal bases (EEA/UK visitors)',
      paragraphs: [
        'Where the GDPR or UK GDPR applies, we process account and security data to perform our contract with you (providing the service), and to pursue our legitimate interests in securing and protecting the service. Email and similar communications are sent under our contract with you or, for optional communications, your consent, which you may withdraw at any time.',
      ],
    },
    {
      heading: '4. Sharing and processors',
      paragraphs: [
        'We share personal data only with the categories of providers needed to run the service, bound by contract to process it only on our instructions: hosting and database providers; transactional email delivery (currently SMTP via Google); payment processors where a paid plan is purchased; and file-integration providers you explicitly connect, such as Google Drive.',
        'We may also disclose data where required by law or to protect the rights, property, or safety of FlowDeck, our users, or the public, subject to applicable legal safeguards. A workspace owner\'s administrators can see Content and member details within their workspace, consistent with how the product works.',
      ],
    },
    {
      heading: '5. Cookies and similar storage',
      paragraphs: [
        'FlowDeck uses a session cookie to keep you signed in (authentication is cookie-based), and may use local browser storage to remember interface preferences such as your selected view or theme. We do not use third-party advertising or cross-site tracking cookies.',
      ],
    },
    {
      heading: '6. Retention',
      paragraphs: [
        'Account data is retained while your account is active. If you delete your account, we remove or de-identify your personal data within a reasonable period, except where we must keep it longer for legal, accounting, or security purposes. Content you delete may persist in encrypted backups for a limited window before being purged.',
      ],
    },
    {
      heading: '7. Your rights',
      paragraphs: [
        'Subject to applicable law, you may request access to, correction of, deletion of, and a portable copy of your personal data, and you may object to or restrict certain processing. Workspace members should first contact their workspace owner for Content-related requests, since the owner controls that workspace; you can always reach us directly using the contact details below.',
        'EEA/UK residents may lodge a complaint with their local data-protection authority. We respond to verified requests within the timeframes required by applicable law.',
      ],
    },
    {
      heading: '8. Security',
      paragraphs: [
        'We protect personal data with measures proportionate to the risk, including TLS in transit, passwords stored only as salted hashes, scoped database credentials, rate limiting on authentication endpoints, and least-privilege access controls for our operators. No method of storage or transmission is perfectly secure; if a breach affecting your data occurs, we will notify you and the relevant authorities as required by law.',
      ],
    },
    {
      heading: '9. International transfers',
      paragraphs: [
        'Your data may be processed in countries other than your own. Where personal data is transferred out of the EEA or UK, we rely on appropriate safeguards such as adequacy decisions or standard contractual clauses with the relevant provider.',
      ],
    },
    {
      heading: '10. Changes and contact',
      paragraphs: [
        'We will update this policy as our processing changes and publish the new version here with a revised "last updated" date. Material changes affecting your rights will be communicated through the service or by email.',
        `Privacy requests and questions can be sent to: ${LEGAL_CONTACT_EMAIL}. We aim to respond within 30 days.`,
      ],
    },
  ],
};
