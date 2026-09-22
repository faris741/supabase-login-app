const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_KEY must be configured.');
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

app.use(express.urlencoded({ extended: false }));

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderPage({ username = '', error = '', success = null } = {}) {
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
        <a class="button button-secondary" href="/">Return to sign in</a>
      </section>
    `
    : `
      <p class="eyebrow">Private workspace</p>
      <h1>Welcome back</h1>
      <p class="intro">Sign in to continue to your account.</p>
      ${message}
      <form action="/login" method="POST" id="login-form">
        <div class="field">
          <label for="username">Username</label>
          <input
            type="text"
            id="username"
            name="username"
            value="${escapeHtml(username)}"
            placeholder="Enter your username"
            autocomplete="username"
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
          <div class="brand"><span class="brand-mark" aria-hidden="true">↗</span> Supabase Login</div>
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

app.get('/', (req, res) => {
  res.send(renderPage());
});

app.get('/healthz', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/login', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');

  if (!username || !password) {
    return res.status(400).send(
      renderPage({
        username,
        error: 'Enter both your username and password to continue.',
      })
    );
  }

  const { data: user, error } = await supabase
    .from('test_users')
    .select('username, role')
    .eq('username', username)
    .eq('password', password)
    .maybeSingle();

  if (error) {
    console.error('Supabase query failed:', error.message);
    return res.status(500).send(
      renderPage({
        username,
        error: 'We could not reach the login service. Please try again.',
      })
    );
  }

  if (!user) {
    return res.status(401).send(
      renderPage({
        username,
        error: 'That username or password is not correct.',
      })
    );
  }

  return res.send(renderPage({ success: user }));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});