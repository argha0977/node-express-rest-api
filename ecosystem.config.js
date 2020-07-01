module.exports = {
  apps : [{
    name: "NODE_EXPRESS_API",
    script: './bin/www',
    watch: true,
    ignore_watch:['node_modules', '*.log'],
    exp_backoff_restart_delay: 100,
    max_memory_restart: '900M',
    /* instances: 2,
    exec_mode: "cluster", */
    env: {
      "PORT": 4012,
      "NODE_ENV": "development",
    },
    env_production: {
      "PORT": 4052,
      "NODE_ENV": "production"
    }
  }
  /* , {
    script: './service-worker/',
    watch: ['./service-worker']
  } */
],

  /* deploy : {
    staging : {
      user: 'qrnd',
      host: '35.240.146.50',
      ref  : 'origin/staging',
      repo: 'git@bitbucket.org:programmersgroup/otpgapi.git',
      path : '~/stage',
      pre_deploy_local: '',
      ssh_options: ["StrictHostKeyChecking=no", "PasswordAuthentication=no"],
      post_deploy: "pm2 startOrRestart ecosystem.json --env dev",
      env: {
        "NODE_ENV": "staging"
      }
    }
  } */
};
