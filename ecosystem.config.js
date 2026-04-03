module.exports = {
    apps: [
        {
            name: 'robo-jti',
            script: 'index.js',
            restart_delay: 5000,
            max_restarts: 50,
            exp_backoff_restart_delay: 100,
            env: {
                NODE_ENV: 'production',
            },
        },
    ],
};
