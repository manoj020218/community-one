module.exports = {
  apps: [
    {
      name: 'community-api',
      script: 'dist/server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      // Safety net for a shared VPS hosting many projects: caps worst-case RSS so a leak or
      // traffic spike in this app restarts itself instead of starving neighboring processes.
      // Current baseline is ~100MB RSS / ~73MB V8 heap, so this leaves generous headroom.
      max_memory_restart: '400M',
      node_args: '--max-old-space-size=350',
      env_production: {
        NODE_ENV: 'production',
      },
      merge_logs: true,
      restart_delay: 3000,
      max_restarts: 10,
      autorestart: true,
    },
  ],
};
