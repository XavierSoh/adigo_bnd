module.exports = {
  apps: [{
    name: 'adigo-api',
    script: 'dist/src/index.js',
    cwd: '/var/www/adigo',
    instances: 1,
    autorestart: true,
    watch: false,
    env: {
      NODE_ENV: 'production',
      PORT: 3800
    }
  }]
};