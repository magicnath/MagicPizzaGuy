// Cloudflare Pages Function: POST /api/contact
// Emails each inquiry to you via Resend (https://resend.com).
//
// Environment variables (Cloudflare Pages > Settings > Variables and Secrets):
//   RESEND_API_KEY    (secret, required)  your Resend API key
//   TO_EMAIL          (optional) default: info@segalmagic.com
//   FROM_EMAIL        (optional) default: "Magic Pizza Guy <onboarding@resend.dev>"
//                     after verifying magicpizzaguy.com in Resend, use e.g.
//                     "Magic Pizza Guy <bookings@magicpizzaguy.com>"
//   TURNSTILE_SECRET  (optional secret) enables Cloudflare Turnstile spam check

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = (v, max) => String(v ?? '').trim().slice(0, max);
const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export async function onRequestPost({ request, env }) {
  let data;
  try {
    data = request.headers.get('content-type')?.includes('application/json')
      ? await request.json()
      : Object.fromEntries(await request.formData());
  } catch {
    return json({ ok: false, error: 'Could not read the form.' }, 400);
  }

  // Bot traps: hidden field filled, or submitted impossibly fast. Pretend success.
  if (clean(data.company, 200) || Number(data.elapsed) < 2500) return json({ ok: true });

  const name = clean(data.name, 120);
  const email = clean(data.email, 200);
  const details = clean(data.details, 4000);
  if (!validEmail(email)) return json({ ok: false, error: 'Please enter a valid email address.' }, 400);

  if (env.TURNSTILE_SECRET) {
    const form = new FormData();
    form.append('secret', env.TURNSTILE_SECRET);
    form.append('response', clean(data['cf-turnstile-response'], 4096));
    form.append('remoteip', request.headers.get('CF-Connecting-IP') || '');
    const ts = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form })
      .then((r) => r.json()).catch(() => ({ success: false }));
    if (!ts.success) return json({ ok: false, error: 'Spam check failed. Please try again.' }, 400);
  }

  if (!env.RESEND_API_KEY) return json({ ok: false, error: 'The form isn’t set up yet.' }, 500);

  const subject = `Magic Pizza Guy inquiry${name ? ' from ' + name : ''}`;
  const text = `Name: ${name || '(not given)'}\nEmail: ${email}\n\nEvent date / details:\n${details || '(none)'}\n`;
  const html = `<h2>New Magic Pizza Guy inquiry</h2>
<p><strong>Name:</strong> ${esc(name || '(not given)')}<br><strong>Email:</strong> <a href="mailto:${esc(email)}">${esc(email)}</a></p>
<p><strong>Event date / details:</strong></p><p style="white-space:pre-wrap">${esc(details || '(none)')}</p>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.FROM_EMAIL || 'Magic Pizza Guy <onboarding@resend.dev>',
      to: [env.TO_EMAIL || 'info@segalmagic.com'],
      reply_to: email,
      subject,
      text,
      html,
    }),
  });

  if (!res.ok) {
    console.log('Resend error', res.status, await res.text().catch(() => ''));
    return json({ ok: false, error: 'Your message couldn’t be sent right now.' }, 502);
  }
  return json({ ok: true });
}

export const onRequest = () => json({ ok: false, error: 'Method not allowed' }, 405);
