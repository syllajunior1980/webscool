const { Pool } = require('pg');

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      }
    : {
        host: 'localhost',
        port: 5432,
        database: 'webscool',
        user: 'postgres',
        password: 'postgres',
      }
);

pool.connect()
  .then(() => console.log('✅ Connecté à la base de données WebScool'))
  .catch(err => console.error('❌ Erreur connexion DB:', err.message));

module.exports = { pool };