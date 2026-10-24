// PM2 entry point:  pm2 start deploy/ecosystem.config.cjs && pm2 save && pm2 startup
//
// Secrets are deliberately NOT stored in this file. Put ADMIN_PASSWORD, SITE_URL and the
// optional SMTP_* values in .env (see .env.example) — the server loads it through
// `--env-file-if-exists=.env`, and the production guard refuses placeholder passwords.
const path = require('node:path');

module.exports = {
  apps: [{
    name: 'artspace',
    cwd: path.join(__dirname, '..'),
    script: 'server/index.js',
    node_args: '--env-file-if-exists=.env',
    env: { NODE_ENV: 'production' },
    max_memory_restart: '400M',
    kill_timeout: 5000,
  }],
};
