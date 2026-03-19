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
    extrait, chemise_rabat, enveloppe_timbree, bulletin,
    photos_identite, fiche_renseignement, fiche_inscription_ligne,
    carnet_correspondance, livret_scolaire, diplome,
    observations
  } = req.body;
  try {
    const result = await pool.query(`
      INSERT INTO inscriptions_educateurs
        (eleve_id, extrait, chemise_rabat, enveloppe_timbree, bulletin,
         photos_identite, fiche_renseignement, fiche_inscription_ligne,
         carnet_correspondance, livret_scolaire, diplome, observations)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      ON CONFLICT (eleve_id) DO UPDATE SET
        extrait=EXCLUDED.extrait,
        chemise_rabat=EXCLUDED.chemise_rabat,
        enveloppe_timbree=EXCLUDED.enveloppe_timbree,
        bulletin=EXCLUDED.bulletin,
        photos_identite=EXCLUDED.photos_identite,
        fiche_renseignement=EXCLUDED.fiche_renseignement,
        fiche_inscription_ligne=EXCLUDED.fiche_inscription_ligne,
        carnet_correspondance=EXCLUDED.carnet_correspondance,
        livret_scolaire=EXCLUDED.livret_scolaire,
        diplome=EXCLUDED.diplome,
        observations=EXCLUDED.observations,
        date_inscription=CURRENT_TIMESTAMP
      RETURNING *`,
      [eleve_id,
       extrait||false, chemise_rabat||false, enveloppe_timbree||false, bulletin||false,
       photos_identite||false, fiche_renseignement||false, fiche_inscription_ligne||false,
       carnet_correspondance||false, livret_scolaire||false, diplome||false,
       observations||'']
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
