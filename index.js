const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = 3000;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

app.use(express.urlencoded({ extended: false }));

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login</title>
      </head>
      <body>
        <h1>Login</h1>
        <form action="/login" method="POST">
          <div>
            <label for="username">Username</label>
            <input type="text" id="username" name="username" required>
          </div>
          <div>
            <label for="password">Password</label>
            <input type="password" id="password" name="password" required>
          </div>
          <button type="submit">Log in</button>
        </form>
      </body>
    </html>
  `);
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const { data: user, error } = await supabase
    .from('test_users')
    .select('username, role')
    .eq('username', username)
    .eq('password', password)
    .maybeSingle();

  if (error) {
    console.error('Supabase query failed:', error);
    return res.status(500).send(`
      <!DOCTYPE html>
      <html lang="en">
        <head><meta charset="UTF-8"><title>Login Error</title></head>
        <body>
          <h1>Something went wrong</h1>
          <p>We could not complete the login request.</p>
          <a href="/">Try again</a>
        </body>
      </html>
    `);
  }

  if (!user) {
    return res.status(401).send(`
      <!DOCTYPE html>
      <html lang="en">
        <head><meta charset="UTF-8"><title>Login Failed</title></head>
        <body>
          <h1>Login failed</h1>
          <p>Invalid username or password.</p>
          <a href="/">Try again</a>
        </body>
      </html>
    `);
  }

  return res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head><meta charset="UTF-8"><title>Login Successful</title></head>
      <body>
        <h1>Login successful</h1>
        <p>Welcome, ${escapeHtml(user.username)}!</p>
        <p>Role: ${escapeHtml(user.role)}</p>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});