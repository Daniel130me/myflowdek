# Google Integrations Setup

Flowdek currently uses Google Drive for user-owned file storage and Gmail SMTP for
transactional email. OneDrive and Dropbox are deferred. Gmail SMTP can later be
replaced by Resend without changing email callers.

## Google Drive OAuth

1. Create or select a project in Google Cloud Console.
2. Enable the Google Drive API.
3. Configure the OAuth consent screen and add the test users who will connect
   their Drive accounts during development.
4. Create an OAuth 2.0 Client ID with application type Web application.
5. Add this local authorized redirect URI exactly:

   http://localhost:3004/api/storage/oauth/google-drive/callback

6. Put the client ID and secret in the local .env file:

   GOOGLE_DRIVE_CLIENT_ID=
   GOOGLE_DRIVE_CLIENT_SECRET=

7. Confirm APP_BASE_URL and NEXTAUTH_URL are both http://localhost:3004.
8. Sign in to Flowdek, open Settings, and select Connect beside Google Drive.

Flowdek requests the narrow drive.file scope. It can manage files created through
Flowdek without receiving broad access to every file in the user's Drive. OAuth
access and refresh tokens are encrypted in PostgreSQL with
STORAGE_TOKEN_ENCRYPTION_KEY.

Official references:

- https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- https://developers.google.com/workspace/drive/api/guides/manage-uploads

## Gmail SMTP

Use a dedicated Gmail or Google Workspace sender account. Do not use the normal
Google account password.

1. Enable 2-Step Verification on the sender Google account.
2. Create a Google app password for Flowdek.
3. Store the Gmail address and app password in .env:

   GMAIL_SMTP_USER=your-address@gmail.com
   GMAIL_SMTP_APP_PASSWORD=your-16-character-app-password
   EMAIL_FROM=your-address@gmail.com

4. Restart the Next.js development server after changing environment variables.
5. Test registration verification, password reset, and workspace invitation
   emails.

Google revokes app passwords when the Google account password changes. Create a
new app password and update the deployment secret when that happens.

Official reference:

- https://support.google.com/mail/answer/185833

## Required secrets

Never commit these values:

- GOOGLE_DRIVE_CLIENT_SECRET
- STORAGE_TOKEN_ENCRYPTION_KEY
- GMAIL_SMTP_APP_PASSWORD
- NEXTAUTH_SECRET

Production must use the exact HTTPS production origin for both APP_BASE_URL and
NEXTAUTH_URL, and the matching HTTPS Google OAuth callback URI.