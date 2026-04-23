const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const pool = require('../database');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// Import complet élèves
router.post('/', upload.single('fichier'), async (req, res) => {
  if (!req.file) return res.status(400).json({ erreur: 'Aucun fichier' });
  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    let importes = 0, mises_a_jour = 0, erreurs = [];
    let doublons_matricule = [];   // même matricule → UPDATE signalé
    let doublons_nom = [];         // même nom+prénom, matricule différent → ignoré

    for (const row of data) {
      try {
        const matricule = String(row['Matricule'] || row['matricule'] || row['MATRICULE'] || '').trim();
        const nom = String(row['Nom'] || row['nom'] || row['NOM'] || '').trim().toUpperCase();
        const prenom = String(row['Prenom'] || row['prenom'] || row['PRENOM'] || row['Prénom'] || row['prénom'] || '').trim().toUpperCase();
        const classe = String(row['Classe'] || row['classe'] || row['CLASSE'] || '').trim();
        const numero_extrait = String(row['N° Extrait'] || row['numero_extrait'] || row['Extrait'] || '').trim();
        const sexe = String(row['Sexe'] || row['sexe'] || row['SEXE'] || '').trim();
        const statut = String(row['Statut'] || row['statut'] || row['STATUT'] || '').trim();
        const qualite = String(row['Qualite'] || row['qualite'] || row['QUALITE'] || row['Qualité'] || row['qualité'] || '').trim();
        const moyenne_t1 = parseFloat(row['Moy_T1'] || row['moyenne_t1'] || row['Moyenne_T1'] || row['moyennes trimestres 1'] || row['Moyenne T1'] || '') || null;
        const moyenne_t2 = parseFloat(row['Moy_T2'] || row['moyenne_t2'] || row['Moyenne_T2'] || row['moyennes trimestres 2'] || row['Moyenne T2'] || '') || null;
        const moyenne_t3 = parseFloat(row['Moy_T3'] || row['moyenne_t3'] || row['Moyenne_T3'] || row['moyennes trimestres 3'] || row['Moyenne T3'] || '') || null;
        const moyenne_generale = parseFloat(row['Moy_Gen'] || row['moyenne_generale'] || row['Moyenne_Generale'] || row['Moyenne Generale'] || '') || null;
        const decision_fin_annee = String(row['Decision'] || row['decision_fin_annee'] || row['Décision'] || row['decision'] || '').trim();
        const nom_parent = String(row['Nom_Parent'] || row['nom_parent'] || row['Parent'] || row['parent'] || '').trim();
        const telephone1 = String(row['Telephone1'] || row['telephone1'] || row['Téléphone1'] || row['Tel1'] || row['Contact'] || row['contact'] || '').trim();
        const telephone2 = String(row['Telephone2'] || row['telephone2'] || row['Téléphone2'] || row['Tel2'] || '').trim();

        if (!nom || !prenom) continue;

        // ── DOUBLON 1 : Vérifier si même nom+prénom existe avec un matricule DIFFÉRENT ──
        const checkNom = await pool.query(
          `SELECT matricule FROM eleves
           WHERE UPPER(TRIM(nom)) = $1 AND UPPER(TRIM(prenom)) = $2
           AND (matricule != $3 OR ($3 = '' AND matricule IS NOT NULL))`,
          [nom, prenom, matricule]
        );
        if (checkNom.rows.length > 0) {
          doublons_nom.push({
            nom_complet: `${nom} ${prenom}`,
            matricule_excel: matricule || '(vide)',
            matricule_base: checkNom.rows[0].matricule,
            classe: classe
          });
          // On n'insère PAS cet élève — doublon de nom détecté
          continue;
        }

        // ── DOUBLON 2 : Même matricule → UPDATE (signalé séparément) ──
        if (matricule) {
          const checkMat = await pool.query('SELECT id FROM eleves WHERE matricule = $1', [matricule]);
          if (checkMat.rows.length > 0) {
            doublons_matricule.push({
              nom_complet: `${nom} ${prenom}`,
              matricule: matricule,
              classe: classe
            });
            // On continue quand même → l'ON CONFLICT va faire l'UPDATE
          }
        }

        await pool.query(
          `INSERT INTO eleves (matricule, nom, prenom, classe, numero_extrait, sexe, statut, qualite, moyenne_t1, moyenne_t2, moyenne_t3, moyenne_generale, decision_fin_annee, nom_parent, telephone1, telephone2)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
           ON CONFLICT (matricule) DO UPDATE SET
             nom=EXCLUDED.nom, prenom=EXCLUDED.prenom, classe=EXCLUDED.classe,
             numero_extrait=EXCLUDED.numero_extrait,
             sexe=EXCLUDED.sexe, statut=EXCLUDED.statut, qualite=EXCLUDED.qualite,
             moyenne_t1=EXCLUDED.moyenne_t1, moyenne_t2=EXCLUDED.moyenne_t2,
             moyenne_t3=EXCLUDED.moyenne_t3, moyenne_generale=EXCLUDED.moyenne_generale,
             decision_fin_annee=EXCLUDED.decision_fin_annee,
             nom_parent=EXCLUDED.nom_parent, telephone1=EXCLUDED.telephone1, telephone2=EXCLUDED.telephone2`,
          [matricule, nom, prenom, classe, numero_extrait, sexe, statut, qualite, moyenne_t1, moyenne_t2, moyenne_t3, moyenne_generale, decision_fin_annee, nom_parent, telephone1, telephone2]
        );

        if (doublons_matricule.find(d => d.matricule === matricule)) {
          mises_a_jour++;
        } else {
          importes++;
        }

      } catch (e) { erreurs.push(e.message); }
    }

    res.json({
      importes,
      mises_a_jour,
      erreurs,
      doublons_matricule,       // même matricule → mis à jour
      doublons_nom,             // même nom+prénom, matricule différent → ignorés
      total_doublons: doublons_matricule.length + doublons_nom.length
    });

  } catch (err) { res.status(500).json({ erreur: err.message }); }
});

// Import trimestre
router.post('/trimestre', upload.single('fichier'), async (req, res) => {
  if (!req.file) return res.status(400).json({ erreur: 'Aucun fichier' });
  const trimestre = req.body.trimestre || 'T1';
  const colonneMap = { T1: 'moyenne_t1', T2: 'moyenne_t2', T3: 'moyenne_t3' };
  const colonne = colonneMap[trimestre];
  if (!colonne) return res.status(400).json({ erreur: 'Trimestre invalide' });
  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);
    let mis_a_jour = 0, erreurs = [];
    for (const row of data) {
      try {
        const matricule = String(
          row['Matricule'] || row['matricule'] || row['MATRICULE'] || ''
        ).trim();

        let moyenne = null;
        if (trimestre === 'T1') {
          moyenne = parseFloat(
            row['moy_trim1'] || row['Moy_trim1'] || row['MOY_TRIM1'] ||
            row['Moyenne_T1'] || row['moyenne_t1'] || row['Moy_T1'] ||
            row['moyennes trimestres 1'] || row['Moyenne T1'] ||
            row['moyenne t1'] || row['Moyenne'] || row['moyenne'] || ''
          ) || null;
        } else if (trimestre === 'T2') {
          moyenne = parseFloat(
            row['moy_trim2'] || row['Moy_trim2'] || row['MOY_TRIM2'] ||
            row['Moyenne_T2'] || row['moyenne_t2'] || row['Moy_T2'] ||
            row['moyennes trimestres 2'] || row['Moyenne T2'] ||
            row['moyenne t2'] || row['Moyenne'] || row['moyenne'] || ''
          ) || null;
        } else if (trimestre === 'T3') {
          moyenne = parseFloat(
            row['moy_trim3'] || row['Moy_trim3'] || row['MOY_TRIM3'] ||
            row['Moyenne_T3'] || row['moyenne_t3'] || row['Moy_T3'] ||
            row['moyennes trimestres 3'] || row['Moyenne T3'] ||
            row['moyenne t3'] || row['Moyenne'] || row['moyenne'] || ''
          ) || null;
        }

        if (!matricule || moyenne === null) continue;
        const result = await pool.query(
          `UPDATE eleves SET ${colonne} = $1 WHERE matricule = $2`,
          [moyenne, matricule]
        );
        if (result.rowCount > 0) mis_a_jour++;
      } catch (e) { erreurs.push(e.message); }
    }

    // ── Calcul automatique MGA + DFA après import ──
    let admis = 0, redoublants = 0, exclus = 0, calcules = 0;
    try {
      const eleves = await pool.query(
        'SELECT id, moyenne_t1, moyenne_t2, moyenne_t3 FROM eleves WHERE moyenne_t1 IS NOT NULL AND moyenne_t2 IS NOT NULL AND moyenne_t3 IS NOT NULL'
      );
      for (const eleve of eleves.rows) {
        const mga = (parseFloat(eleve.moyenne_t1) + parseFloat(eleve.moyenne_t2) + parseFloat(eleve.moyenne_t3)) / 3;
        const mga_arrondi = Math.round(mga * 100) / 100;
        let dfa = '';
        if (mga_arrondi < 8.5) { dfa = 'Exclu'; exclus++; }
        else if (mga_arrondi < 10) { dfa = 'Redoublant'; redoublants++; }
        else { dfa = 'Admis'; admis++; }
        await pool.query(
          'UPDATE eleves SET moyenne_generale=$1, decision_fin_annee=$2 WHERE id=$3',
          [mga_arrondi, dfa, eleve.id]
        );
        calcules++;
      }
    } catch (e) { console.error('Erreur calcul MGA:', e.message); }

    res.json({ mis_a_jour, erreurs, moyennes_calculees: calcules, admis, redoublants, exclus });
  } catch (err) { res.status(500).json({ erreur: err.message }); }
});


// ── Route /json : Import par lots avec détection doublons (utilisée par App.js) ──
router.post('/json', async (req, res) => {
  const { rows } = req.body;
  if (!rows || !Array.isArray(rows)) return res.status(400).json({ erreur: 'Données invalides' });

  let importes = 0, mises_a_jour = 0, erreurs = [];
  let doublons_matricule = [];
  let doublons_nom = [];

  for (const row of rows) {
    try {
      const matricule = String(row['Matricule'] || row['matricule'] || row['MATRICULE'] || '').trim();
      const nom = String(row['Nom'] || row['nom'] || row['NOM'] || '').trim().toUpperCase();
      const prenom = String(row['Prenom'] || row['prenom'] || row['PRENOM'] || row['Prénom'] || row['prénom'] || '').trim().toUpperCase();
      const classe = String(row['Classe'] || row['classe'] || row['CLASSE'] || '').trim();
      const numero_extrait = String(row['N° Extrait'] || row['numero_extrait'] || row['Extrait'] || '').trim();
      const sexe = String(row['Sexe'] || row['sexe'] || row['SEXE'] || '').trim();
      const statut = String(row['Statut'] || row['statut'] || row['STATUT'] || '').trim();
      const qualite = String(row['Qualite'] || row['qualite'] || row['QUALITE'] || row['Qualité'] || row['qualité'] || '').trim();
      const date_naissance = String(row['DateNaiss'] || row['date_naissance'] || row['Date_Naissance'] || '').trim() || null;
      const lieu_naissance = String(row['LieuNaiss'] || row['lieu_naissance'] || row['Lieu_Naissance'] || '').trim();
      const moyenne_t1 = parseFloat(row['Moy_T1'] || row['moyenne_t1'] || row['Moyenne_T1'] || '') || null;
      const moyenne_t2 = parseFloat(row['Moy_T2'] || row['moyenne_t2'] || row['Moyenne_T2'] || '') || null;
      const moyenne_t3 = parseFloat(row['Moy_T3'] || row['moyenne_t3'] || row['Moyenne_T3'] || '') || null;
      const moyenne_generale = parseFloat(row['Moy_Gen'] || row['moyenne_generale'] || '') || null;
      const decision_fin_annee = String(row['Decision'] || row['decision_fin_annee'] || row['Décision'] || '').trim();
      const nom_parent = String(row['nom_parent'] || row['Nom_Parent'] || row['Parent'] || '').trim();
      const telephone1 = String(row['telephone1'] || row['Telephone1'] || row['Tel1'] || row['Contact'] || '').trim();
      const telephone2 = String(row['telephone2'] || row['Telephone2'] || row['Tel2'] || '').trim();

      if (!nom || !prenom) continue;

      // ── DOUBLON 1 : même nom+prénom, matricule différent → ignorer ──
      const checkNom = await pool.query(
        `SELECT matricule FROM eleves
         WHERE UPPER(TRIM(nom)) = $1 AND UPPER(TRIM(prenom)) = $2
         AND ($3 = '' OR matricule != $3)`,
        [nom, prenom, matricule]
      );
      if (checkNom.rows.length > 0) {
        doublons_nom.push({
          nom_complet: `${nom} ${prenom}`,
          matricule_excel: matricule || '(vide)',
          matricule_base: checkNom.rows[0].matricule,
          classe
        });
        continue; // Ne pas insérer cet élève
      }

      // ── DOUBLON 2 : même matricule → UPDATE signalé ──
      if (matricule) {
        const checkMat = await pool.query('SELECT id FROM eleves WHERE matricule = $1', [matricule]);
        if (checkMat.rows.length > 0) {
          doublons_matricule.push({ nom_complet: `${nom} ${prenom}`, matricule, classe });
        }
      }

      await pool.query(
        `INSERT INTO eleves (matricule, nom, prenom, classe, numero_extrait, sexe, statut, qualite,
          date_naissance, lieu_naissance, moyenne_t1, moyenne_t2, moyenne_t3,
          moyenne_generale, decision_fin_annee, nom_parent, telephone1, telephone2)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
         ON CONFLICT (matricule) DO UPDATE SET
           nom=EXCLUDED.nom, prenom=EXCLUDED.prenom, classe=EXCLUDED.classe,
           numero_extrait=EXCLUDED.numero_extrait, sexe=EXCLUDED.sexe,
           statut=EXCLUDED.statut, qualite=EXCLUDED.qualite,
           date_naissance=EXCLUDED.date_naissance, lieu_naissance=EXCLUDED.lieu_naissance,
           moyenne_t1=EXCLUDED.moyenne_t1, moyenne_t2=EXCLUDED.moyenne_t2,
           moyenne_t3=EXCLUDED.moyenne_t3, moyenne_generale=EXCLUDED.moyenne_generale,
           decision_fin_annee=EXCLUDED.decision_fin_annee,
           nom_parent=EXCLUDED.nom_parent, telephone1=EXCLUDED.telephone1, telephone2=EXCLUDED.telephone2`,
        [matricule, nom, prenom, classe, numero_extrait, sexe, statut, qualite,
         date_naissance, lieu_naissance, moyenne_t1, moyenne_t2, moyenne_t3,
         moyenne_generale, decision_fin_annee, nom_parent, telephone1, telephone2]
      );

      if (doublons_matricule.find(d => d.matricule === matricule)) {
        mises_a_jour++;
      } else {
        importes++;
      }

    } catch (e) { erreurs.push(e.message); }
  }

  res.json({ importes, mises_a_jour, erreurs, doublons_matricule, doublons_nom });
});

module.exports = router;
