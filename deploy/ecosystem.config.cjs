// pm2 start deploy/ecosystem.config.cjs && pm2 save && pm2 startup
module.exports = {
  apps: [{
    name: 'artspace',
    script: 'server/index.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      ADMIN_PASSWORD: 'CHANGE-ME-long-and-unique',
      SITE_URL: 'https://www.yourdomain.com',
      TRUST_PROXY: 'true',
      // SMTP_HOST: 'smtp.example.com', SMTP_PORT: 587, SMTP_USER: '', SMTP_PASS: '', MAIL_FROM: 'Art Space <quotes@yourdomain.com>', NOTIFY_TO: 'you@yourdomain.com',
    },
  }],
};
