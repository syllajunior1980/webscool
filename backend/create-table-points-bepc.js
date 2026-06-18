// create-table-points-bepc.js
// Script à exécuter UNE SEULE FOIS pour créer la table points_bepc
// Usage : node create-table-points-bepc.js

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function creerTable() {
  try {
    console.log('🔄 Connexion à la base de données...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS points_bepc (
        id SERIAL PRIMARY KEY,
        matricule VARCHAR(50) NOT NULL,
        nom VARCHAR(100) NOT NULL,
        prenom VARCHAR(100) NOT NULL,
        points DECIMAL(6,2) NOT NULL,
        decision VARCHAR(20) NOT NULL CHECK (decision IN ('Admis', 'Refusé')),
        classe VARCHAR(20),
        annee_session VARCHAR(10) DEFAULT '2026',
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(matricule, annee_session)
      );
    `);
    console.log('✅ Table points_bepc créée (ou déjà existante)');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_points_bepc_nom ON points_bepc (UPPER(TRIM(nom)), UPPER(TRIM(prenom)));
    `);
    console.log('✅ Index alphabétique créé');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_points_bepc_decision ON points_bepc (decision);
    `);
    console.log('✅ Index decision créé');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_points_bepc_matricule ON points_bepc (matricule);
    `);
    console.log('✅ Index matricule créé');

    console.log('\n🎉 Tout est prêt ! La table points_bepc est en place.');
  } catch (err) {
    console.error('❌ Erreur :', err.message);
  } finally {
    await pool.end();
  }
}

creerTable();
