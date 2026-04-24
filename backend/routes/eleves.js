const express = require('express');
const router = express.Router();
const { pool } = require('../database');

// GET tous les eleves
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM eleves ORDER BY nom, prenom');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ erreur: err.message }); }
});

// GET classes distinctes
router.get('/classes', async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT classe FROM eleves WHERE classe IS NOT NULL ORDER BY classe');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ erreur: err.message }); }
});

// GET recherche
router.get('/recherche', async (req, res) => {
  const q = req.query.q || '';
  try {
    const result = await pool.query(
      `SELECT * FROM eleves WHERE nom ILIKE $1 OR prenom ILIKE $1 OR matricule ILIKE $1 OR (nom || ' ' || COALESCE(prenom,'')) ILIKE $1 ORDER BY nom, prenom LIMIT 500`,
      [`%${q}%`]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ erreur: err.message }); }
});

// GET par classe
router.get('/classe/:classe', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM eleves WHERE classe = $1 ORDER BY nom, prenom',
      [req.params.classe]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ erreur: err.message }); }
});

// POST calculer MGA et DFA
router.post('/calculer-moyennes', async (req, res) => {
  try {
    const eleves = await pool.query(
      'SELECT id, moyenne_t1, moyenne_t2, moyenne_t3 FROM eleves WHERE moyenne_t1 IS NOT NULL AND moyenne_t2 IS NOT NULL AND moyenne_t3 IS NOT NULL'
    );
    let mis_a_jour = 0, admis = 0, redoublants = 0, exclus = 0;
    for (const eleve of eleves.rows) {
      const mga = (parseFloat(eleve.moyenne_t1) + parseFloat(eleve.moyenne_t2) + parseFloat(eleve.moyenne_t3)) / 3;
      const mga_arrondi = Math.round(mga * 100) / 100;
      let dfa = '';
      if (mga_arrondi < 8.5) { dfa = 'Exclu'; exclus++; }
      else if (mga_arrondi < 10) { dfa = 'Redoublant'; redoublants++; }
      else { dfa = 'Admis'; admis++; }
      await pool.query(
        'UPDATE eleves SET moyenne_generale = $1, decision_fin_annee = $2 WHERE id = $3',
        [mga_arrondi, dfa, eleve.id]
      );
      mis_a_jour++;
    }
    res.json({ mis_a_jour, admis, redoublants, exclus });
  } catch (err) { res.status(500).json({ erreur: err.message }); }
});

// ============================================================
// POST réinitialiser pour nouvelle année
// ETAPE 1 : vérifier d'abord que tous les élèves sont supprimés
// ETAPE 2 : si non → supprimer tout proprement
// ============================================================
router.post('/reinitialiser-annee', async (req, res) => {
  try {

    // --- ETAPE 1 : Vérifier combien d'élèves restent dans la base ---
    const check = await pool.query('SELECT COUNT(*) FROM eleves');
    const nombreEleves = parseInt(check.rows[0].count);

    if (nombreEleves === 0) {
      // La base est déjà vide, rien à faire
      return res.json({
        succes: true,
        message: 'La base est déjà vide. Aucun élève à supprimer.',
        eleves_supprimes: 0
      });
    }

    // --- ETAPE 2 : Supprimer dans l'ordre (clés étrangères d'abord) ---

    // 2a. Supprimer inscriptions économat
    await pool.query('DELETE FROM inscriptions').catch(() => {});

    // 2b. Supprimer inscriptions éducateurs
    await pool.query('DELETE FROM inscriptions_educateurs').catch(() => {});

    // 2c. Supprimer autres tables liées si elles existent
    await pool.query('DELETE FROM photos').catch(() => {});
    await pool.query('DELETE FROM notes').catch(() => {});
    await pool.query('DELETE FROM bulletins').catch(() => {});

    // 2d. Supprimer tous les élèves (TRUNCATE CASCADE = plus rapide et sûr)
    try {
      await pool.query('TRUNCATE TABLE eleves RESTART IDENTITY CASCADE');
    } catch (e) {
      // Fallback si TRUNCATE échoue
      await pool.query('DELETE FROM eleves');
    }

    // --- ETAPE 3 : Vérifier que la suppression est bien complète ---
    const verification = await pool.query('SELECT COUNT(*) FROM eleves');
    const resteEleves = parseInt(verification.rows[0].count);

    if (resteEleves > 0) {
      // Echec partiel — des élèves restent encore
      return res.status(500).json({
        succes: false,
        message: `Attention : ${resteEleves} élève(s) n'ont pas pu être supprimés. Veuillez réessayer.`,
        eleves_restants: resteEleves
      });
    }

    // Tout est supprimé avec succès
    res.json({
      succes: true,
      message: `Réinitialisation complète — ${nombreEleves} élève(s) et toutes les inscriptions supprimés avec succès.`,
      eleves_supprimes: nombreEleves
    });

  } catch (err) {
    res.status(500).json({
      succes: false,
      message: 'Erreur lors de la réinitialisation : ' + err.message
    });
  }
});

// GET un eleve
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM eleves WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ erreur: 'Eleve non trouve' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ erreur: err.message }); }
});

// POST ajouter
router.post('/', async (req, res) => {
  const { matricule, nom, prenom, classe, numero_extrait, sexe, statut, qualite, date_naissance, lieu_naissance, moyenne_t1, moyenne_t2, moyenne_t3, moyenne_generale, decision_fin_annee, nom_parent, telephone1, telephone2 } = req.body;
  try {
    // Ajouter les colonnes si elles n'existent pas encore
    await pool.query(`ALTER TABLE eleves ADD COLUMN IF NOT EXISTS date_naissance DATE`).catch(()=>{});
    await pool.query(`ALTER TABLE eleves ADD COLUMN IF NOT EXISTS lieu_naissance VARCHAR(150)`).catch(()=>{});
    const result = await pool.query(
      `INSERT INTO eleves (matricule, nom, prenom, classe, numero_extrait, sexe, statut, qualite, date_naissance, lieu_naissance, moyenne_t1, moyenne_t2, moyenne_t3, moyenne_generale, decision_fin_annee, nom_parent, telephone1, telephone2)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
      [matricule, nom, prenom, classe, numero_extrait, sexe||'', statut||'', qualite||'', date_naissance||null, lieu_naissance||'', moyenne_t1||null, moyenne_t2||null, moyenne_t3||null, moyenne_generale||null, decision_fin_annee, nom_parent, telephone1, telephone2]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ erreur: err.message }); }
});

// PUT modifier
router.put('/:id', async (req, res) => {
  const { matricule, nom, prenom, classe, numero_extrait, sexe, statut, qualite, date_naissance, lieu_naissance, moyenne_t1, moyenne_t2, moyenne_t3, moyenne_generale, decision_fin_annee, nom_parent, telephone1, telephone2 } = req.body;
  try {
    const result = await pool.query(
      `UPDATE eleves SET matricule=$1, nom=$2, prenom=$3, classe=$4, numero_extrait=$5,
       sexe=$6, statut=$7, qualite=$8, date_naissance=$9, lieu_naissance=$10,
       moyenne_t1=$11, moyenne_t2=$12, moyenne_t3=$13, moyenne_generale=$14,
       decision_fin_annee=$15, nom_parent=$16, telephone1=$17, telephone2=$18
       WHERE id=$19 RETURNING *`,
      [matricule, nom, prenom, classe, numero_extrait, sexe||'', statut||'', qualite||'', date_naissance||null, lieu_naissance||'', moyenne_t1||null, moyenne_t2||null, moyenne_t3||null, moyenne_generale||null, decision_fin_annee, nom_parent, telephone1, telephone2, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ erreur: err.message }); }
});

// DELETE supprimer
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM eleves WHERE id = $1', [req.params.id]);
    res.json({ message: 'Supprime' });
  } catch (err) { res.status(500).json({ erreur: err.message }); }
});
// ─── RECONNAISSANCE FACIALE FACE++ ───────────────────────────────────────────
const FormData = require('form-data');
const fetch = require('node-fetch');

router.post('/reconnaissance-photo', async (req, res) => {
  try {
    const { photo_base64 } = req.body;
    if (!photo_base64) return res.status(400).json({ erreur: 'Photo manquante' });

    // Récupérer tous les élèves avec photo
    const eleves = await pool.query(
      'SELECT id, nom, prenom, matricule, classe, photo_url FROM eleves WHERE photo_url IS NOT NULL AND photo_url != \'\' LIMIT 200'
    );

    if (eleves.rows.length === 0) {
      return res.status(404).json({ erreur: 'Aucun élève avec photo dans la base' });
    }

    let meilleurEleve = null;
    let meilleurScore = 0;

    for (const eleve of eleves.rows) {
      try {
        const form = new FormData();
        form.append('api_key', process.env.FACEPP_API_KEY);
        form.append('api_secret', process.env.FACEPP_API_SECRET);
        form.append('image_base64_1', photo_base64);
        form.append('image_url2', eleve.photo_url);

        const response = await fetch('https://api-us.faceplusplus.com/facepp/v3/compare', {
          method: 'POST',
          body: form
        });
        const data = await response.json();

        if (data.confidence && data.confidence > meilleurScore) {
          meilleurScore = data.confidence;
          meilleurEleve = eleve;
        }
      } catch (e) { continue; }
    }

    if (meilleurEleve && meilleurScore >= 75) {
      res.json({ eleve: meilleurEleve, score: meilleurScore });
    } else {
      res.status(404).json({ erreur: 'Élève non reconnu', score: meilleurScore });
    }
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
});
module.exports = router;

// PUT modifier résultat BEPC uniquement
router.put('/bepc/:id', async (req, res) => {
  const { resultat_bepc } = req.body;
  try {
    await pool.query(
      `ALTER TABLE eleves ADD COLUMN IF NOT EXISTS resultat_bepc VARCHAR(20)`,
    ).catch(()=>{});
    const result = await pool.query(
      'UPDATE eleves SET resultat_bepc = $1 WHERE id = $2 RETURNING *',
      [resultat_bepc, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ erreur: err.message }); }
});
