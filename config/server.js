const serverConfig = {
    "user": process.env.NODE_ENV? process.env.DEV_USER : process.env.PROD_USER,
    "password": process.env.NODE_ENV? process.env.DEV_PASSWORD : process.env.PROD_PASSWORD,
    "server": process.env.NODE_ENV? process.env.DEV_SERVER : process.env.PROD_SERVER,
    "port": process.env.NODE_ENV? 1434 : null,
    "database": process.env.NODE_ENV? process.env.DEV_DATABASE : process.env.PROD_DATABASE,
    requestTimeout: 600000,
    pool: {
        max: 50,
        min: 0,
        idleTimeoutMillis: 30000
    },
    "options": {
        "encrypt": false // Disable encryption
    }
}

module.exports = serverConfig