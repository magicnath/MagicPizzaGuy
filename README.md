# magicpizzaguy.com

Static site + one Cloudflare Pages Function for the inquiry form.

    index.html              the site
    assets/                 images and icons
    functions/api/contact.js  POST /api/contact -> emails the inquiry (via Resend)
    _headers                caching / security headers

## Deploy
1. Push this folder to a GitHub repo (e.g. magicpizzaguy).
2. Cloudflare dashboard > Workers & Pages > Create > Pages > Connect to Git > pick the repo.
   Framework preset: None. Build command: (empty). Output directory: /
3. Settings > Variables and Secrets (Production):
   RESEND_API_KEY = your Resend key (secret)
   optional: TO_EMAIL, FROM_EMAIL, TURNSTILE_SECRET
   Then redeploy.
4. Custom domains > add magicpizzaguy.com (and www).

## Form email (Resend)
- Free plan, sign up at resend.com, create an API key.
- Quick start: with FROM_EMAIL unset, mail comes from onboarding@resend.dev,
  which only delivers to the email you signed up to Resend with.
  So sign up with info@segalmagic.com, or:
- Better: Resend > Domains > add magicpizzaguy.com, add the DNS records it shows in
  Cloudflare DNS, then set FROM_EMAIL = "Magic Pizza Guy <bookings@magicpizzaguy.com>".
- Replying to an inquiry email replies straight to the customer.

## Optional spam protection (Turnstile)
Cloudflare dashboard > Turnstile > add widget for magicpizzaguy.com.
Put the SITE key in index.html (TURNSTILE_SITE_KEY) and the SECRET key in
Pages as TURNSTILE_SECRET. A hidden honeypot field is already on by default.
