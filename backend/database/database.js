require('dotenv').config();
const mysql = require('mysql2');

// Configuração para usar variáveis de ambiente
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
        // Desativar SSL para conexões locais
        rejectUnauthorized: false
    },
    // Configurações de pool para melhor performance
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Para debug - remover em produção
pool.on('connection', function (connection) {
    console.log('DB Connection established');
});

pool.on('error', function (err) {
    console.error('MySQL pool error:', err);
});

module.exports = pool.promise();