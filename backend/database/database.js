require('dotenv').config();
const mysql = require('mysql2');

// Configuração para usar variáveis de ambiente (Railway) ou fallback para local
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'yamabiko.proxy.rlwy.net',
    port: process.env.DB_PORT || 41584,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'tKGeUlJlkUpmGlNRJYqiMCATwKfcluyv',
    database: process.env.DB_NAME || 'railway',
    ssl: {
        // Recomendado para conexões remotas, mas pode ser necessário desativar para testes
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