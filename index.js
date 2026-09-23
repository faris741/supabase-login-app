const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_KEY must be configured.');
}

app.use(express.urlencoded({ extended: false }));

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function parseCookies(req) {
  return Object.fromEntries(
    String(req.headers.cookie || '')
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf('=');
        if (separator === -1) return [part, ''];
        return [
          part.slice(0, separator),
          decodeURIComponent(part.slice(separator + 1)),
        ];
      })
  );
}

function cookieAttributes(maxAge) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function setSessionCookies(res, session) {
  res.setHeader('Set-Cookie', [
    `sb-access-token=${encodeURIComponent(session.access_token)}; ${cookieAttributes(session.expires_in || 3600)}`,
    `sb-refresh-token=${encodeURIComponent(session.refresh_token)}; ${cookieAttributes(60 * 60 * 24 * 30)}`,
  ]);
}

function clearSessionCookies(res) {
  res.setHeader('Set-Cookie', [
    `sb-access-token=; ${cookieAttributes(0)}`,
    `sb-refresh-token=; ${cookieAttributes(0)}`,
  ]);
}

function createSupabaseClient() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

function userView(user) {
    const metadata = user.user_metadata || {};
    const appMetadata = user.app_metadata || {};
    const role = appMetadata.role || metadata.role || 'Member';
    return {
      email: user.email || '',
      username: metadata.username || user.email || 'there',
      role,
      isAdmin: String(role).toLowerCase() === 'admin',
    };
    }

    async function getAuthenticatedUser(req) {
  const accessToken = parseCookies(req)['sb-access-token'];
  if (!accessToken) return null;

  const { data, error } = await createSupabaseClient().auth.getUser(accessToken);
  if (error || !data.user) return null;
  return userView(data.user);
}

function renderPage({ email = '', error = '', success = null } = {}) {
  const isSuccess = Boolean(success);
  const pageTitle = isSuccess ? 'Welcome back' : error ? 'Login issue' : 'Sign in';
  const message = error
    ? `<div class="notice notice-error" role="alert"><span class="notice-icon">!</span><span>${escapeHtml(error)}</span></div>`
    : '';
  const successPanel = isSuccess
    ? `
      <section class="success-panel" aria-live="polite">
        <div class="success-mark" aria-hidden="true">✓</div>
        <p class="eyebrow">Access granted</p>
        <h1>Welcome, ${escapeHtml(success.username)}</h1>
        <p class="success-copy">You are signed in to your account.</p>
        <div class="role-row">
          <span>Account role</span>
          <strong>${escapeHtml(success.role || 'Member')}</strong>
        </div>
        <form action="/logout" method="POST">
          <button class="button button-secondary" type="submit">Sign out</button>
        </form>
      </section>
    `
    : `
      <p class="eyebrow">Private workspace</p>
      <h1>Welcome back</h1>
      <p class="intro">Sign in to continue to your account.</p>
      ${message}
      <form action="/login" method="POST" id="login-form">
        <div class="field">
          <label for="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value="${escapeHtml(email)}"
            placeholder="Enter your email"
            autocomplete="email"
            autocapitalize="none"
            spellcheck="false"
            required
          >
        </div>
        <div class="field">
          <div class="label-row">
            <label for="password">Password</label>
          </div>
          <div class="password-wrap">
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Enter your password"
              autocomplete="current-password"
              minlength="1"
              required
            >
            <button type="button" class="password-toggle" id="password-toggle" aria-label="Show password">Show</button>
          </div>
        </div>
        <button type="submit" class="button button-primary" id="submit-button">
          <span id="submit-label">Sign in</span>
          <span class="spinner" id="spinner" aria-hidden="true"></span>
        </button>
      </form>
      <p class="secure-note"><span aria-hidden="true">●</span> Your sign-in is securely checked against Supabase.</p>
    `;

  return `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="theme-color" content="#101522">
        <title>${pageTitle} · Supabase Login</title>
        <style>
          :root {
            color-scheme: dark;
            --bg: #101522;
            --card: rgba(25, 34, 52, 0.88);
            --card-border: rgba(169, 188, 222, 0.18);
            --text: #f4f7fc;
            --muted: #9ba8bd;
            --accent: #8b7cff;
            --accent-bright: #a698ff;
            --error: #ffb4b4;
            --error-bg: rgba(153, 41, 64, 0.22);
            --success: #9af0c3;
          }

          * { box-sizing: border-box; }

          body {
            min-height: 100vh;
            margin: 0;
            display: grid;
            place-items: center;
            padding: 24px;
            color: var(--text);
            background:
              radial-gradient(circle at 14% 20%, rgba(114, 96, 255, 0.28), transparent 34%),
              radial-gradient(circle at 86% 78%, rgba(33, 178, 182, 0.16), transparent 32%),
              var(--bg);
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          }

          .shell {
            width: min(100%, 430px);
            animation: rise-in 480ms ease-out both;
          }

          .brand {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            margin-bottom: 22px;
            color: var(--text);
            font-size: 0.9rem;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
          }

          .brand-mark {
            width: 28px;
            height: 28px;
            display: grid;
            place-items: center;
            border-radius: 9px;
            color: #151326;
            background: linear-gradient(135deg, #b0a6ff, #78e0d1);
            font-size: 0.9rem;
          }

          .card {
            padding: clamp(28px, 7vw, 44px);
            border: 1px solid var(--card-border);
            border-radius: 24px;
            background: var(--card);
            box-shadow: 0 28px 80px rgba(0, 0, 0, 0.36);
            backdrop-filter: blur(18px);
          }

          .eyebrow {
            margin: 0 0 12px;
            color: var(--accent-bright);
            font-size: 0.72rem;
            font-weight: 800;
            letter-spacing: 0.16em;
            text-transform: uppercase;
          }

          h1 {
            margin: 0;
            font-size: clamp(2rem, 7vw, 2.65rem);
            letter-spacing: -0.05em;
            line-height: 1.05;
          }

          .intro, .success-copy {
            margin: 14px 0 30px;
            color: var(--muted);
            font-size: 0.98rem;
            line-height: 1.6;
          }

          .field { margin-top: 20px; }
          label, .label-row {
            display: block;
            margin-bottom: 9px;
            color: #d9e0ec;
            font-size: 0.82rem;
            font-weight: 700;
          }

          input {
            width: 100%;
            height: 52px;
            padding: 0 15px;
            border: 1px solid rgba(169, 188, 222, 0.2);
            border-radius: 12px;
            outline: none;
            color: var(--text);
            background: rgba(7, 11, 20, 0.34);
            font: inherit;
            transition: border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;
          }

          input::placeholder { color: #68758c; }
          input:focus {
            border-color: var(--accent);
            background: rgba(7, 11, 20, 0.5);
            box-shadow: 0 0 0 4px rgba(139, 124, 255, 0.14);
          }

          .password-wrap { position: relative; }
          .password-wrap input { padding-right: 70px; }
          .password-toggle {
            position: absolute;
            top: 50%;
            right: 10px;
            transform: translateY(-50%);
            padding: 7px 8px;
            border: 0;
            border-radius: 7px;
            color: var(--accent-bright);
            background: transparent;
            cursor: pointer;
            font: inherit;
            font-size: 0.78rem;
            font-weight: 800;
          }
          .password-toggle:hover { background: rgba(139, 124, 255, 0.12); }

          .button {
            width: 100%;
            min-height: 52px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            margin-top: 28px;
            border: 0;
            border-radius: 12px;
            cursor: pointer;
            font: inherit;
            font-weight: 800;
            text-decoration: none;
            transition: transform 180ms ease, box-shadow 180ms ease, background 180ms ease;
          }
          .button:hover { transform: translateY(-1px); }
          .button-primary {
            color: #17132c;
            background: linear-gradient(135deg, #b0a6ff, #86e4d3);
            box-shadow: 0 10px 24px rgba(112, 105, 255, 0.22);
          }
          .button-primary:hover { box-shadow: 0 14px 30px rgba(112, 105, 255, 0.34); }
          .button-secondary {
            color: var(--text);
            background: rgba(169, 188, 222, 0.1);
          }

          .notice {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            margin: 22px 0 -4px;
            padding: 12px 13px;
            border: 1px solid rgba(255, 180, 180, 0.22);
            border-radius: 11px;
            color: var(--error);
            background: var(--error-bg);
            font-size: 0.86rem;
            line-height: 1.45;
          }
          .notice-icon {
            flex: 0 0 19px;
            height: 19px;
            display: grid;
            place-items: center;
            border-radius: 50%;
            color: #311018;
            background: var(--error);
            font-size: 0.72rem;
            font-weight: 900;
          }

          .secure-note {
            margin: 22px 0 0;
            color: #7e8ba2;
            font-size: 0.76rem;
            text-align: center;
          }
          .secure-note span { color: var(--success); font-size: 0.6rem; vertical-align: 1px; }

          .success-panel { text-align: center; }
          .success-mark {
            width: 58px;
            height: 58px;
            display: grid;
            place-items: center;
            margin: 0 auto 24px;
            border: 1px solid rgba(154, 240, 195, 0.34);
            border-radius: 50%;
            color: #101d1a;
            background: var(--success);
            font-size: 1.6rem;
            font-weight: 900;
          }
          .success-copy { margin-bottom: 24px; }
          .role-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 14px 15px;
            border: 1px solid rgba(169, 188, 222, 0.14);
            border-radius: 12px;
            color: var(--muted);
            font-size: 0.84rem;
            text-align: left;
          }
          .role-row strong { color: var(--text); }

          .spinner {
            width: 16px;
            height: 16px;
            display: none;
            border: 2px solid rgba(23, 19, 44, 0.28);
            border-top-color: #17132c;
            border-radius: 50%;
            animation: spin 700ms linear infinite;
          }
          .is-loading .spinner { display: inline-block; }
          .is-loading #submit-label { opacity: 0.72; }

          @keyframes rise-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes spin { to { transform: rotate(360deg); } }
          @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }
        </style>
      </head>
      <body>
        <main class="shell">
          <div class="brand"><span class="brand-mark" aria-hidden="true">✦</span> Supabase Login</div>
          <div class="card">${successPanel}</div>
        </main>
        <script>
          const password = document.getElementById('password');
          const toggle = document.getElementById('password-toggle');
          const form = document.getElementById('login-form');
          const submitButton = document.getElementById('submit-button');

          if (password && toggle) {
            toggle.addEventListener('click', () => {
              const visible = password.type === 'text';
              password.type = visible ? 'password' : 'text';
              toggle.textContent = visible ? 'Show' : 'Hide';
              toggle.setAttribute('aria-label', visible ? 'Show password' : 'Hide password');
            });
          }

          if (form && submitButton) {
            form.addEventListener('submit', () => {
              submitButton.classList.add('is-loading');
              submitButton.disabled = true;
              submitButton.setAttribute('aria-busy', 'true');
            });
          }
        </script>
      </body>
    </html>`;
}

function renderHomePage(user, kind) {
    const isAdmin = Boolean(user.isAdmin);
    const roleLabel = isAdmin ? 'Admin' : 'Guest';
    const roleClass = isAdmin ? 'admin' : 'guest';
    const title = isAdmin ? 'Admin home' : 'Guest home';
    const heading = isAdmin ? 'Your admin workspace' : 'Your guest home';
    const intro = isAdmin
      ? 'You have administrator access to this Supabase-backed workspace.'
      : 'You are signed in with guest access. Here is the information available to you.';
    const cards = isAdmin
      ? '<article><small>ADMIN ACCESS</small><h2>Workspace controls</h2><p>Review your account and manage the workspace from this secure admin area.</p><b>Administrator access active</b></article><article><small>SUPABASE</small><h2>Connected account</h2><p>Your session is authenticated through Supabase and your role is read from App Metadata.</p><b>Session verified</b></article><article><small>NEXT STEP</small><h2>Ready to manage</h2><p>This page is ready for admin-only tools as your app grows.</p><b>Admin area</b></article>'
      : '<article><small>GUEST ACCESS</small><h2>Welcome to the workspace</h2><p>You can view the information shared with guest accounts while admin tools stay protected.</p><b>Guest access active</b></article><article><small>YOUR ACCOUNT</small><h2>Signed in safely</h2><p>Your account is authenticated through Supabase. Contact an administrator if you need more access.</p><b>Session verified</b></article><article><small>NEED HELP?</small><h2>Request access</h2><p>Ask an administrator to update your role in Supabase App Metadata.</p><b>Guest area</b></article>';
    return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="theme-color" content="#101522"><title>' + title + ' · Supabase Login</title><style>' +
      ':root{color-scheme:dark;--bg:#101522;--card:rgba(25,34,52,.88);--border:rgba(169,188,222,.18);--text:#f4f7fc;--muted:#9ba8bd;--accent:#a698ff;--admin:#b0a6ff;--guest:#86e4d3;--success:#9af0c3}*{box-sizing:border-box}body{min-height:100vh;margin:0;padding:22px;color:var(--text);background:radial-gradient(circle at 12% 12%,rgba(114,96,255,.26),transparent 32%),radial-gradient(circle at 88% 78%,rgba(33,178,182,.16),transparent 32%),var(--bg);font-family:Inter,system-ui,sans-serif}.topbar,.home{width:min(100%,1060px);margin:auto}.topbar{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:8px 0 28px}.brand{display:flex;align-items:center;gap:10px;font-size:.9rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.brand-mark{width:30px;height:30px;display:grid;place-items:center;border-radius:9px;color:#151326;background:linear-gradient(135deg,#b0a6ff,#78e0d1)}.badge{padding:8px 12px;border:1px solid;border-radius:999px;font-size:.72rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.admin{color:var(--admin);border-color:rgba(176,166,255,.38);background:rgba(139,124,255,.12)}.guest{color:var(--guest);border-color:rgba(134,228,211,.34);background:rgba(33,178,182,.1)}.hero{display:flex;align-items:end;justify-content:space-between;gap:24px;margin:20px 0 34px}.eyebrow,small{color:var(--accent);font-size:.72rem;font-weight:900;letter-spacing:.15em}.eyebrow{margin:0 0 12px}h1{margin:0;font-size:clamp(2.1rem,6vw,4rem);letter-spacing:-.06em;line-height:1.02}.intro{max-width:620px;margin:16px 0 0;color:var(--muted);font-size:1.05rem;line-height:1.6}.identity{padding:14px 16px;border:1px solid var(--border);border-radius:14px;color:var(--muted);font-size:.8rem}.identity strong{display:block;margin-top:5px;color:var(--text);font-size:.9rem}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}article{min-height:220px;padding:24px;border:1px solid var(--border);border-radius:20px;background:var(--card);box-shadow:0 22px 60px rgba(0,0,0,.24)}article:first-child{border-color:rgba(139,124,255,.34);background:linear-gradient(145deg,rgba(51,46,94,.72),rgba(25,34,52,.9))}article h2{margin:18px 0 10px;font-size:1.35rem;letter-spacing:-.03em}article p{margin:0;color:var(--muted);line-height:1.6}article b{display:inline-block;margin-top:22px;color:var(--success);font-size:.76rem}.bottom{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-top:28px;color:#7e8ba2;font-size:.78rem}.button{padding:12px 18px;border:0;border-radius:11px;color:var(--text);background:rgba(169,188,222,.12);cursor:pointer;font:inherit;font-weight:800}.button:hover{background:rgba(169,188,222,.2)}@media(max-width:760px){body{padding:18px}.hero{display:block}.identity{display:inline-block;margin-top:22px}.grid{grid-template-columns:1fr}article{min-height:0}.bottom{align-items:flex-start;flex-direction:column-reverse}}@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}' +
      'body.admin-page{background:radial-gradient(circle at 12% 12%,rgba(255,168,76,.25),transparent 32%),radial-gradient(circle at 88% 78%,rgba(95,70,190,.2),transparent 32%),#151321}body.admin-page .eyebrow,body.admin-page small{color:#ffc36e}body.admin-page .brand-mark{background:linear-gradient(135deg,#ffd18a,#b69cff)}body.admin-page .admin{color:#ffd18a;border-color:rgba(255,195,110,.48);background:rgba(255,168,76,.13)}body.admin-page article:first-child{border-color:rgba(255,195,110,.42);background:linear-gradient(145deg,rgba(91,58,38,.78),rgba(30,28,50,.92))}body.admin-page article b{color:#ffd18a}' + '</style></head><body class="' + (isAdmin ? 'admin-page' : 'guest-page') + '"><header class="topbar"><div class="brand"><span class="brand-mark" aria-hidden="true">✦</span> Supabase Login</div><span class="badge ' + roleClass + '">' + roleLabel + '</span></header><main class="home"><section class="hero"><div><p class="eyebrow">' + (kind === 'admin' ? 'Administrator home' : 'Guest home') + '</p><h1>' + heading + '</h1><p class="intro">' + intro + '</p></div><div class="identity">Signed in as<strong>' + escapeHtml(user.email || user.username) + '</strong></div></section><section class="grid" aria-label="' + roleLabel + ' information">' + cards + '</section><div class="bottom"><span>Your role is controlled by Supabase App Metadata.</span><form action="/logout" method="POST"><button class="button" type="submit">Sign out</button></form></div></main></body></html>';
    }

app.get('/', async (req, res) => {
    const user = await getAuthenticatedUser(req);
    if (user) return res.redirect(user.isAdmin ? '/admin' : '/guest');
    return res.send(renderPage());
    });

    app.get('/admin', async (req, res) => {
    const user = await getAuthenticatedUser(req);
    if (!user) return res.redirect('/');
    if (!user.isAdmin) return res.redirect('/guest');
    return res.send(renderHomePage(user, 'admin'));
    });

    app.get('/guest', async (req, res) => {
    const user = await getAuthenticatedUser(req);
    if (!user) return res.redirect('/');
    if (user.isAdmin) return res.redirect('/admin');
    return res.send(renderHomePage(user, 'guest'));
    });

app.get('/healthz', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/login', async (req, res) => {
  const email = String(req.body.email || '').trim();
  const password = String(req.body.password || '');

  if (!email || !password) {
    return res.status(400).send(
      renderPage({
        email,
        error: 'Enter both your email and password to continue.',
      })
    );
  }

  const { data, error } = await createSupabaseClient().auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session || !data.user) {
    const invalidCredentials = error?.status === 400;
    if (!invalidCredentials) {
      console.error('Supabase sign-in failed:', error?.message || 'No session returned');
    }
    return res.status(invalidCredentials ? 401 : 502).send(
      renderPage({
        email,
        error: invalidCredentials
          ? 'That email or password is not correct.'
          : 'We could not reach the login service. Please try again.',
      })
    );
  }

  const signedInUser = userView(data.user);
    setSessionCookies(res, data.session);
    return res.redirect(303, signedInUser.isAdmin ? '/admin' : '/guest');
});

app.post('/logout', (req, res) => {
  clearSessionCookies(res);
  res.redirect(303, '/');
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});