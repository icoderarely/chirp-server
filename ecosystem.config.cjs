/**
 * PM2 process file for Chirp backend on EC2.
 * Keep this next to package.json (the server repo root), not in $HOME.
 *
 *   cd ~/chirp-server
 *   pm2 start ecosystem.config.cjs
 *
 * Secrets stay in each service's .env.
 * Chat must stay at 1 instance (presence is in-memory).
 */
module.exports = {
  apps: [
    {
      name: "chirp-user",
      cwd: "./services/user",
      script: "dist/index.js",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "chirp-mail",
      cwd: "./services/mail",
      script: "dist/index.js",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      max_memory_restart: "200M",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "chirp-chat",
      cwd: "./services/chat",
      script: "dist/index.js",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      max_memory_restart: "400M",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "chirp-gateway",
      cwd: "./services/gateway",
      script: "dist/index.js",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
