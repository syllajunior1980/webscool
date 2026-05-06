require('dotenv').config();
const { pool } = require('./database');

async function creerTableTransferes() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transferes (
        id SERIAL PRIMARY KEY,
        matricule VARCHAR(20),
        nom VARCHAR(100) NOT NULL,
        prenoms VARCHAR(150) NOT NULL,
        niveau VARCHAR(10) NOT NULL,
        lv2 VARCHAR(10),
        etaborigine VARCHAR(200),
        etabfin VARCHAR(200),
        sexe VARCHAR(10),
        date_naissance DATE,
        lieu_naissance VARCHAR(150),
        nom_parent VARCHAR(150),
        telephone1 VARCHAR(20),
        dfa VARCHAR(20),
        classe_attribuee VARCHAR(50),
        valide BOOLEAN DEFAULT FALSE,
        date_import TIMESTAMP DEFAULT NOW(),
        date_validation TIMESTAMP
      )
    `);
    console.log('✅ Table transferes créée !');
    process.exit();
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  }
}

creerTableTransferes();
