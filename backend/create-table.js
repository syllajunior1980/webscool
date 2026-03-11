require('dotenv').config();
const pool = require('./database');

pool.query(`
  ALTER TABLE eleves 
  ADD COLUMN IF NOT EXISTS nom_parent VARCHAR(150),
  ADD COLUMN IF NOT EXISTS telephone1 VARCHAR(20),
  ADD COLUMN IF NOT EXISTS telephone2 VARCHAR(20)
`).then(() => {
  console.log('Colonnes contact parent ajoutees !');
  process.exit();
}).catch(e => {
  console.error('Erreur:', e.message);
  process.exit();
});
