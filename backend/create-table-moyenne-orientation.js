require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    console.log('🔄 Connexion à la base de données...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS moyenne_orientation (
        id SERIAL PRIMARY KEY,
        matricule VARCHAR(20) UNIQUE NOT NULL,
        nom VARCHAR(100) NOT NULL,
        prenoms VARCHAR(150) NOT NULL,
        classe VARCHAR(20),

        -- MGA importées du fichier Excel (non modifiables côté interface)
        math_mga NUMERIC(5,2),
        phch_mga NUMERIC(5,2),
        ang_mga NUMERIC(5,2),
        cf_mga NUMERIC(5,2),

        -- Notes BEPC saisies par les parents/collègues (modifiables à tout moment)
        math_bepc NUMERIC(5,2),
        cf_bepc NUMERIC(5,2),
        phch_bepc NUMERIC(5,2),
        ang_oral_bepc NUMERIC(5,2),
        ang_ecrit_bepc NUMERIC(5,2),

        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Table moyenne_orientation créée (ou déjà existante)');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_moyenne_orientation_matricule
      ON moyenne_orientation (matricule);
    `);
    console.log('✅ Index matricule créé');

    console.log('🎉 Tout est prêt ! La table moyenne_orientation est en place.');
  } catch (err) {
    console.error('❌ Erreur :', err.message);
  } finally {
    await pool.end();
  }
}

main();
