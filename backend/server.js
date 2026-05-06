const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
const path = require('path');
app.use('/photos', express.static(path.join(__dirname, 'uploads/photos')));

// ============================================================
// MIGRATION AUTOMATIQUE — Ajoute les colonnes manquantes
// ============================================================
const { pool } = require('./database');
async function migrerBase() {
  try {
    await pool.query(`ALTER TABLE eleves ADD COLUMN IF NOT EXISTS date_naissance DATE`);
    await pool.query(`ALTER TABLE eleves ADD COLUMN IF NOT EXISTS lieu_naissance VARCHAR(150)`);
    await pool.query(`ALTER TABLE eleves ADD COLUMN IF NOT EXISTS numero_extrait VARCHAR(50)`);
    await pool.query(`ALTER TABLE eleves ADD COLUMN IF NOT EXISTS moyenne_t1 NUMERIC(5,2)`);
    await pool.query(`ALTER TABLE eleves ADD COLUMN IF NOT EXISTS moyenne_t2 NUMERIC(5,2)`);
    await pool.query(`ALTER TABLE eleves ADD COLUMN IF NOT EXISTS moyenne_t3 NUMERIC(5,2)`);
    await pool.query(`ALTER TABLE eleves ADD COLUMN IF NOT EXISTS moyenne_generale NUMERIC(5,2)`);
    await pool.query(`ALTER TABLE eleves ADD COLUMN IF NOT EXISTS decision_fin_annee VARCHAR(50)`);
    await pool.query(`ALTER TABLE eleves ADD COLUMN IF NOT EXISTS nom_parent VARCHAR(150)`);
    await pool.query(`ALTER TABLE eleves ADD COLUMN IF NOT EXISTS telephone1 VARCHAR(20)`);
    await pool.query(`ALTER TABLE eleves ADD COLUMN IF NOT EXISTS telephone2 VARCHAR(20)`);
    console.log('✅ Migration base de données OK');
  } catch (err) {
    console.error('⚠️ Migration erreur:', err.message);
  }
}
migrerBase();

const elevesRoutes = require('./routes/eleves');
const importRoutes = require('./routes/import');
app.use('/api/eleves', elevesRoutes);
app.use('/api/inscriptions', require('./routes/inscriptions'));
app.use('/api/import', importRoutes);
app.use('/api/photos', require('./routes/photos'));
app.use('/api/educateurs', require('./routes/educateurs'));
app.use('/api/eleves', require('./routes/reconnaissance'));
app.use('/api/archives', require('./routes/archives'));  // ← ARCHIVES
app.use('/api/transferes', require('./routes/transferes'));
app.get('/', (req, res) => { res.json({ message: 'WebScool', status: 'OK' }); });
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => { console.log(`Serveur démarré sur http://localhost:${PORT}`); });
