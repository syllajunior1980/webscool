const express = require('express');
const router = express.Router();
const pool = require('../database');

// GET toutes les inscriptions éducateurs
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ie.*, e.nom, e.prenom, e.matricule, e.classe
      FROM inscriptions_educateurs ie
      JOIN eleves e ON e.id = ie.eleve_id
      ORDER BY e.nom, e.prenom
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ erreur: err.message }); }
});

// GET par élève
router.get('/eleve/:eleve_id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM inscriptions_educateurs WHERE eleve_id = $1',
      [req.params.eleve_id]
    );
    res.json(result.rows[0] || null);
  } catch (err) { res.status(500).json({ erreur: err.message }); }
});

// POST ou UPDATE inscription éducateur
router.post('/', async (req, res) => {
  const {
    eleve_id,
    extrait_naissance, chemise_cartonnee, photos, fiche_inscription,
    fiche_bonne_conduite, recu_economat, fiche_renseignement,
    bulletin_transfert, photocopie_diplome, enveloppe_timbree,
    observations
  } = req.body;
  try {
    const result = await pool.query(`
      INSERT INTO inscriptions_educateurs
        (eleve_id, extrait_naissance, chemise_cartonnee, photos, fiche_inscription,
         fiche_bonne_conduite, recu_economat, fiche_renseignement,
         bulletin_transfert, photocopie_diplome, enveloppe_timbree, observations)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      ON CONFLICT (eleve_id) DO UPDATE SET
        extrait_naissance=EXCLUDED.extrait_naissance,
        chemise_cartonnee=EXCLUDED.chemise_cartonnee,
        photos=EXCLUDED.photos,
        fiche_inscription=EXCLUDED.fiche_inscription,
        fiche_bonne_conduite=EXCLUDED.fiche_bonne_conduite,
        recu_economat=EXCLUDED.recu_economat,
        fiche_renseignement=EXCLUDED.fiche_renseignement,
        bulletin_transfert=EXCLUDED.bulletin_transfert,
        photocopie_diplome=EXCLUDED.photocopie_diplome,
        enveloppe_timbree=EXCLUDED.enveloppe_timbree,
        observations=EXCLUDED.observations,
        date_inscription=CURRENT_TIMESTAMP
      RETURNING *`,
      [eleve_id, extrait_naissance||false, chemise_cartonnee||false, photos||false,
       fiche_inscription||false, fiche_bonne_conduite||false, recu_economat||false,
       fiche_renseignement||false, bulletin_transfert||false, photocopie_diplome||false,
       enveloppe_timbree||false, observations||'']
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ erreur: err.message }); }
});

// DELETE
router.delete('/:eleve_id', async (req, res) => {
  try {
    await pool.query('DELETE FROM inscriptions_educateurs WHERE eleve_id = $1', [req.params.eleve_id]);
    res.json({ message: 'Supprimé' });
  } catch (err) { res.status(500).json({ erreur: err.message }); }
});

module.exports = router;
