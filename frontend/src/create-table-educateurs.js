require('dotenv').config();
const pool = require('./database');

pool.query(`
  CREATE TABLE IF NOT EXISTS inscriptions_educateurs (
    id SERIAL PRIMARY KEY,
    eleve_id INTEGER UNIQUE REFERENCES eleves(id) ON DELETE CASCADE,
    extrait_naissance BOOLEAN DEFAULT false,
    chemise_cartonnee BOOLEAN DEFAULT false,
    photos BOOLEAN DEFAULT false,
    fiche_inscription BOOLEAN DEFAULT false,
    fiche_bonne_conduite BOOLEAN DEFAULT false,
    recu_economat BOOLEAN DEFAULT false,
    fiche_renseignement BOOLEAN DEFAULT false,
    bulletin_transfert BOOLEAN DEFAULT false,
    photocopie_diplome BOOLEAN DEFAULT false,
    enveloppe_timbree BOOLEAN DEFAULT false,
    observations TEXT DEFAULT '',
    date_inscription TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`).then(() => {
  console.log('✅ Table inscriptions_educateurs créée !');
  process.exit();
}).catch(e => {
  console.error('Erreur:', e.message);
  process.exit(1);
});
