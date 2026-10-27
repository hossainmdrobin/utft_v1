# Cron Setup: Daily Midnight Email

## 1. What the cron job does

Every day at 12:00 AM Asia/Dhaka (Bangladesh time), cron-job.org sends an HTTP GET request to a protected Next.js API route:

`GET /api/cron/daily-email`

The route validates a `CRON_SECRET` Bearer token, then uses Resend to send an email with:

- Subject: `Daily Midnight Email`
- Body: a plain-text message containing the current date and time in the Asia/Dhaka timezone.

The endpoint returns a JSON response indicating success or failure. No internal timer or `setInterval` is used; cron-job.org is the external trigger. Vercel Cron is not used.

## 2. How to create a Resend account

1. Go to https://resend.com and sign up for a free account.
2. Verify your email address when prompted.
3. From the dashboard you can create API keys, verify domains/senders, and view email logs.

## 3. How to obtain a Resend API key

1. Log in to your Resend dashboard.
2. Navigate to **API Keys** in the left sidebar.
3. Click **Create API Key**.
4. Give it a name (e.g. `utft-daily-email`) and copy the key (starts with `re_`).
5. Store it as `RESEND_API_KEY` in your environment variables (see section 5).
6. The key is shown only once; if you lose it, create a new one and rotate the old key.

## 4. How to verify the sender email/domain in Resend

Resend requires a verified sender before you can send emails.

**Option A — Verified domain (recommended for production):**
1. In the Resend dashboard, go to **Domains** and click **Add Domain**.
2. Enter your domain and add the DNS records Resend provides (SPF, DKIM, MX, Return-Path).
3. Wait for the domain to verify (may take minutes to hours).
4. Use an address on that domain as `RESEND_FROM_EMAIL` (e.g. `noreply@yourdomain.com`).

**Option B — Resend test domain (quick start, free tier):**
1. Use `onboarding@resend.dev` as the `RESEND_FROM_EMAIL` value.
2. Emails can only be sent to your own verified Resend email address until you verify a domain.

Set `RESEND_FROM_EMAIL` accordingly in `.env` and Vercel.

## 5. How to configure environment variables

### Locally

1. Copy `.env.example` to `.env`:
   ```sh
   cp .env.example .env
   ```
2. Fill in the values:
   ```
   CRON_SECRET=<a long random string>
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
   RESEND_FROM_EMAIL=onboarding@resend.dev
   DAILY_EMAIL_TO=you@example.com
   ```
3. Never commit `.env`. It is already gitignored.

### In Vercel

1. Go to your project in the Vercel dashboard → **Settings** → **Environment Variables**.
2. Add each variable:
   - `CRON_SECRET`
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`
   - `DAILY_EMAIL_TO`
3. For each variable, select the environments where it should apply (Production, Preview, Development).
4. Redeploy after adding variables so they take effect.

### Variable reference

| Variable | Required | Description |
|---|---|---|
| `CRON_SECRET` | Yes | Bearer token used to protect `/api/cron/daily-email`. Must match the Authorization header cron-job.org sends. |
| `RESEND_API_KEY` | Yes | Resend API key (starts with `re_`). |
| `RESEND_FROM_EMAIL` | No | Sender address. Defaults to `onboarding@resend.dev`. |
| `DAILY_EMAIL_TO` | Yes | Recipient email address (your address). |

## 6. How to create a cron-job.org account

1. Go to https://cron-job.org and sign up for a free account.
2. Verify your email address.
3. Log in to the dashboard.

## 7. How to configure the cron schedule

1. In the cron-job.org dashboard, click **+ Create Cronjob**.
2. **URL to call:** `https://<your-app>.vercel.app/api/cron/daily-email`
3. **Method:** `GET`
4. **Schedule:** Daily at 12:00 AM Asia/Dhaka (UTC+6).
   - 12:00 AM Asia/Dhaka = 18:00 UTC the previous day.
   - Enter a cron expression equivalent to `0 18 * * *` UTC, or use the UI's timezone picker set to Asia/Dhaka at 00:00 daily.
5. Save the cronjob.

## 8. How to configure the authorization header

1. In the cron-job.org cronjob settings, find the **Headers** section.
2. Add a header:
   - Name: `Authorization`
   - Value: `Bearer <your-CRON_SECRET>`
3. The value must exactly match the `CRON_SECRET` environment variable.
4. Save.

Without this header, or with a wrong value, the endpoint returns `401 Unauthorized`.

## 9. How to test the endpoint manually

You can call the endpoint directly with `curl` (replace the placeholder values):

```sh
curl -X GET "https://<your-app>.vercel.app/api/cron/daily-email" \
  -H "Authorization: Bearer <your-CRON_SECRET>"
```

Expected success response:
```json
{
  "data": {
    "sent": true,
    "messageId": "x_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "to": "you@example.com",
    "subject": "Daily Midnight Email",
    "date": "2026-10-28",
    "time": "00:05:30"
  }
}
```

Expected error responses:
- Missing/wrong secret → `401 { "error": "Unauthorized" }`
- Missing config → `500 { "error": "RESEND_API_KEY is not configured" }` or `500 { "error": "DAILY_EMAIL_TO is not configured" }`
- Send failure → `500 { "error": "Failed to send daily email" }`

You can also test locally with `npm run dev` and `http://localhost:3000/api/cron/daily-email`.

## 10. How to troubleshoot common errors

| Symptom | Likely cause | Fix |
|---|---|---|
| `401 Unauthorized` | Missing or wrong `Authorization: Bearer ...` header, or `CRON_SECRET` mismatch | Verify the header in cron-job.org matches `CRON_SECRET` in `.env`/Vercel |
| `500 RESEND_API_KEY is not configured` | `RESEND_API_KEY` env var missing | Add it locally and in Vercel, then redeploy |
| `500 DAILY_EMAIL_TO is not configured` | `DAILY_EMAIL_TO` env var missing | Add it locally and in Vercel, then redeploy |
| Email not received | Sender not verified, or sending to unverified address on free tier | Verify a domain in Resend, or use `onboarding@resend.dev` and send only to your verified Resend email |
| `Failed to send daily email` | Resend API error (invalid key, rate limit, unverified sender) | Check Resend dashboard logs and email key validity |
| Cron never triggers | Wrong schedule/timezone in cron-job.org | Confirm schedule is daily at 00:00 Asia/Dhaka (= 18:00 UTC previous day) |
| Build/typecheck fails | Type error in the new route | Run `npx tsc --noEmit` and `npm run lint`; fix only the new route |

Logs are written to the server console (`console.error`). In Vercel, view them in the project **Functions** logs.
