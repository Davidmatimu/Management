const sql = require('mssql');
// Configuration for the MSSQL database
const config = {
    user: 'sa', // Replace with your MSSQL username
    password: 'david', // Replace with your MSSQL password
    server: 'UMBRELLA', // Replace with your server address or IP
    database: 'TMS', // Replace with your database name
    options: {
        encrypt: true, // Use encryption for data transfer (optional; required for Azure)
        trustServerCertificate: true, // Needed if you're using a self-signed certificate
        trustedConnection:false,
        enableArithAbort:false,
        instancename:"MSSQLSERVER01"
    },
    pool: {
        max: 10, // Maximum number of connections in the pool
        min: 0,  // Minimum number of connections in the pool
        idleTimeoutMillis: 30000, // Time before a connection in the pool is closed
    },
};

// Create a connection pool
const db = new sql.ConnectionPool(config);

// Connect to the database
db.connect()
    .then(() => {
        console.log("Successfully connected to the database");
    })
    .catch((err) => {
        console.error(`Could not connect to the database: ${err.message}`);
    });

module.exports = db;
