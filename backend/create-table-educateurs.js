require('dotenv').config();
const pool = require('./database');

pool.query(`
  CREATE TABLE IF NOT EXISTS inscriptions_educateurs (
    id SERIAL PRIMARY KEY,
    eleve_id INTEGER UNIQUE REFERENCES eleves(id) ON DELETE CASCADE,
    extrait BOOLEAN DEFAULT false,
    chemise_rabat BOOLEAN DEFAULT false,
    enveloppe_timbree BOOLEAN DEFAULT false,
    bulletin BOOLEAN DEFAULT false,
    photos_identite BOOLEAN DEFAULT false,
    fiche_renseignement BOOLEAN DEFAULT false,
    fiche_inscription_ligne BOOLEAN DEFAULT false,
    carnet_correspondance BOOLEAN DEFAULT false,
    livret_scolaire BOOLEAN DEFAULT false,
    diplome BOOLEAN DEFAULT false,
    observations TEXT DEFAULT '',
    date_inscription TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`).then(() => {
  console.log('✅ Table inscriptions_educateurs créée avec les nouvelles colonnes !');
  process.exit();
}).catch(e => {
  console.error('Erreur:', e.message);
  process.exit(1);
});
