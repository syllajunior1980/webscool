const express = require('express');
const router = express.Router();
const { pool } = require('../database');

// ── Créer la table archives si elle n'existe pas ──────────────────────────────
async function creerTableArchives() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS archives (
      id SERIAL PRIMARY KEY,
      annee_scolaire VARCHAR(20) NOT NULL,
      matricule VARCHAR(20),
      nom VARCHAR(100) NOT NULL,
      prenom VARCHAR(150) NOT NULL,
      classe VARCHAR(50),
      numero_extrait VARCHAR(50),
      sexe VARCHAR(10),
      statut VARCHAR(30),
      qualite VARCHAR(50),
      date_naissance DATE,
      lieu_naissance VARCHAR(150),
      moyenne_t1 NUMERIC(5,2),
      moyenne_t2 NUMERIC(5,2),
      moyenne_t3 NUMERIC(5,2),
      moyenne_generale NUMERIC(5,2),
      decision_fin_annee VARCHAR(30),
      nom_parent VARCHAR(150),
      telephone1 VARCHAR(20),
      telephone2 VARCHAR(20),
      photo_url TEXT,
      -- Inscriptions économat
      inscrit_economatf BOOLEAN DEFAULT false,
      montant_inscription INTEGER,
      date_paiement DATE,
      -- Inscriptions éducateurs
      inscrit_educateur BOOLEAN DEFAULT false,
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
      date_archivage TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ Table archives prête');
}
creerTableArchives().catch(console.error);

// ── GET : Liste des années archivées ─────────────────────────────────────────
router.get('/annees', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT annee_scolaire,
             COUNT(*) as nb_eleves,
             COUNT(CASE WHEN decision_fin_annee = 'Admis' THEN 1 END) as admis,
             COUNT(CASE WHEN decision_fin_annee = 'Redoublant' THEN 1 END) as redoublants,
             COUNT(CASE WHEN decision_fin_annee = 'Exclu' THEN 1 END) as exclus,
             COUNT(CASE WHEN inscrit_economatf = true THEN 1 END) as payes_economatf,
             MAX(date_archivage) as date_archivage
      FROM archives
      GROUP BY annee_scolaire
      ORDER BY annee_scolaire DESC
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ erreur: err.message }); }
});

// ── GET : Élèves d'une année ──────────────────────────────────────────────────
router.get('/:annee', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM archives WHERE annee_scolaire = $1 ORDER BY nom, prenom',
      [req.params.annee]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ erreur: err.message }); }
});

// ── GET : Recherche dans les archives ────────────────────────────────────────
router.get('/:annee/recherche', async (req, res) => {
  const q = req.query.q || '';
  try {
    const result = await pool.query(
      `SELECT * FROM archives
       WHERE annee_scolaire = $1
       AND (nom ILIKE $2 OR prenom ILIKE $2 OR matricule ILIKE $2
            OR (nom || ' ' || prenom) ILIKE $2)
       ORDER BY nom, prenom LIMIT 200`,
      [req.params.annee, `%${q}%`]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ erreur: err.message }); }
});

// ── GET : Recherche globale toutes années ─────────────────────────────────────
router.get('/recherche/global', async (req, res) => {
  const q = req.query.q || '';
  if (!q || q.length < 2) return res.json([]);
  try {
    const result = await pool.query(
      `SELECT * FROM archives
       WHERE nom ILIKE $1 OR prenom ILIKE $1 OR matricule ILIKE $1
            OR (nom || ' ' || prenom) ILIKE $1
       ORDER BY annee_scolaire DESC, nom, prenom LIMIT 200`,
      [`%${q}%`]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ erreur: err.message }); }
});

// ── POST : Archiver l'année courante ─────────────────────────────────────────
router.post('/archiver', async (req, res) => {
  const { annee_scolaire } = req.body;
  if (!annee_scolaire) return res.status(400).json({ erreur: 'Année scolaire requise (ex: 2024-2025)' });

  try {
    // Vérifier que des élèves existent
    const check = await pool.query('SELECT COUNT(*) FROM eleves');
    const nbEleves = parseInt(check.rows[0].count);
    if (nbEleves === 0) return res.status(400).json({ erreur: 'Aucun élève à archiver' });

    // Supprimer l'archive existante pour cette année si elle existe
    await pool.query('DELETE FROM archives WHERE annee_scolaire = $1', [annee_scolaire]);

    // Archiver tous les élèves avec leurs inscriptions
    const result = await pool.query(`
      INSERT INTO archives (
        annee_scolaire, matricule, nom, prenom, classe, numero_extrait,
        sexe, statut, qualite, date_naissance, lieu_naissance,
        moyenne_t1, moyenne_t2, moyenne_t3, moyenne_generale,
        decision_fin_annee, nom_parent, telephone1, telephone2, photo_url,
        inscrit_economatf, montant_inscription, date_paiement,
        inscrit_educateur, extrait, chemise_rabat, enveloppe_timbree,
        bulletin, photos_identite, fiche_renseignement, fiche_inscription_ligne,
        carnet_correspondance, livret_scolaire, diplome, observations
      )
      SELECT
        $1 as annee_scolaire,
        e.matricule, e.nom, e.prenom, e.classe, e.numero_extrait,
        e.sexe, e.statut, e.qualite, e.date_naissance, e.lieu_naissance,
        e.moyenne_t1, e.moyenne_t2, e.moyenne_t3, e.moyenne_generale,
        e.decision_fin_annee, e.nom_parent, e.telephone1, e.telephone2, e.photo_url,
        CASE WHEN i.id IS NOT NULL THEN true ELSE false END as inscrit_economatf,
        i.montant as montant_inscription,
        i.date_paiement,
        CASE WHEN ie.id IS NOT NULL THEN true ELSE false END as inscrit_educateur,
        COALESCE(ie.extrait, false),
        COALESCE(ie.chemise_rabat, false),
        COALESCE(ie.enveloppe_timbree, false),
        COALESCE(ie.bulletin, false),
        COALESCE(ie.photos_identite, false),
        COALESCE(ie.fiche_renseignement, false),
        COALESCE(ie.fiche_inscription_ligne, false),
        COALESCE(ie.carnet_correspondance, false),
        COALESCE(ie.livret_scolaire, false),
        COALESCE(ie.diplome, false),
        COALESCE(ie.observations, '')
      FROM eleves e
      LEFT JOIN inscriptions i ON i.eleve_id = e.id
      LEFT JOIN inscriptions_educateurs ie ON ie.eleve_id = e.id
    `, [annee_scolaire]);

    const nbArchives = result.rowCount;

    res.json({
      succes: true,
      message: `✅ ${nbArchives} élèves archivés pour l'année ${annee_scolaire}`,
      nb_archives: nbArchives,
      annee_scolaire
    });

  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
});

// ── DELETE : Supprimer une archive ───────────────────────────────────────────
router.delete('/:annee', async (req, res) => {
  try {
    await pool.query('DELETE FROM archives WHERE annee_scolaire = $1', [req.params.annee]);
    res.json({ message: `Archive ${req.params.annee} supprimée` });
  } catch (err) { res.status(500).json({ erreur: err.message }); }
});

module.exports = router;
