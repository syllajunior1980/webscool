const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const { pool } = require('../database');

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
    // Règle : T=21 ou NULL → trimestre non classé, ignoré dans la somme
    // Coefficients : T1×1, T2×2, T3×2 → total=5
    // DFA : si déjà Redoublant → MGA < 10 = Exclu (pas de 2ème redoublement)
    let admis = 0, redoublants = 0, exclus = 0, calcules = 0;
    try {
      const eleves = await pool.query(
        'SELECT id, statut, moyenne_t1, moyenne_t2, moyenne_t3 FROM eleves WHERE moyenne_t1 IS NOT NULL OR moyenne_t2 IS NOT NULL OR moyenne_t3 IS NOT NULL'
      );
      for (const eleve of eleves.rows) {
        const raw1 = eleve.moyenne_t1 !== null ? parseFloat(eleve.moyenne_t1) : null;
        const raw2 = eleve.moyenne_t2 !== null ? parseFloat(eleve.moyenne_t2) : null;
        const raw3 = eleve.moyenne_t3 !== null ? parseFloat(eleve.moyenne_t3) : null;

        const t1 = (raw1 === null || raw1 === 21) ? null : raw1;
        const t2 = (raw2 === null || raw2 === 21) ? null : raw2;
        const t3 = (raw3 === null || raw3 === 21) ? null : raw3;

        // Calcul MGA — T1 absent → T2 coeff 1, T3 coeff 2 → /3
        // T2 absent → T1 coeff 1, T3 coeff 2 → /3
        // T3 absent → T1 coeff 1, T2 coeff 2 → /3
        // Tous présents → T1×1+T2×2+T3×2 → /5
        let somme = 0, poids = 0;
        if (t1 !== null && t2 !== null && t3 !== null) {
          somme = t1*1 + t2*2 + t3*2; poids = 5;
        } else if (t1 === null && t2 !== null && t3 !== null) {
          somme = t2*1 + t3*2; poids = 3;
        } else if (t2 === null && t1 !== null && t3 !== null) {
          somme = t1*1 + t3*2; poids = 3;
        } else if (t3 === null && t1 !== null && t2 !== null) {
          somme = t1*1 + t2*2; poids = 3;
        } else if (t1 !== null) { somme = t1; poids = 1; }
        else if (t2 !== null) { somme = t2; poids = 1; }
        else if (t3 !== null) { somme = t3; poids = 1; }

        if (poids === 0) continue;

        const mga_arrondi = Math.round((somme / poids) * 100) / 100;
        const dejaredoublant = (eleve.qualite || eleve.statut || '').toLowerCase().includes('redouble');

        let dfa = '';
        if (dejaredoublant) {
          if (mga_arrondi < 10) { dfa = 'Exclu'; exclus++; }
          else { dfa = 'Admis'; admis++; }
        } else {
          if (mga_arrondi < 8.5) { dfa = 'Exclu'; exclus++; }
          else if (mga_arrondi < 10) { dfa = 'Redouble'; redoublants++; }
          else { dfa = 'Admis'; admis++; }
        }
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


// ── Import MGA + DFA depuis fichier plateforme nationale ──
// Accepte le fichier tel quel (colonnes: MATRICULE, MOY. AN., DÉCISION)
// Admis(e) → Admis | Exclu(e) → Exclu | Redouble(e) → Redouble | NC → ignoré
router.post('/mga-dfa', upload.single('fichier'), async (req, res) => {
  if (!req.file) return res.status(400).json({ erreur: 'Aucun fichier' });
  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    // DEBUG : logger les noms de colonnes du fichier reçu
    if (data.length > 0) {
      console.log('📋 Colonnes détectées dans le fichier MGA+DFA:', Object.keys(data[0]));
      console.log('📋 Première ligne exemple:', data[0]);
    }

    let mis_a_jour = 0, non_trouves = 0, ignores = 0, erreurs = [];
    let colonnes_mga_non_trouvees = 0;

    for (const row of data) {
      try {
        const matricule = String(
          row['MATRICULE'] || row['Matricule'] || row['matricule'] || ''
        ).trim();
        if (!matricule) continue;

        // MGA — recherche exhaustive sur tous les noms de colonnes possibles
        // On parcourt toutes les clés de la ligne pour trouver la MGA
        let mga_raw = '';
        const cles_mga = [
          'MOY. AN.', 'MOY.AN.', 'Moy. An.', 'moy_an', 'MGA', 'Mga',
          'moyenne_generale', 'Moyenne_Generale', 'MOYENNE_GENERALE',
          'Moyenne Annuelle', 'MOYENNE ANNUELLE', 'moyenne annuelle',
          'MOYENNE AN', 'Moyenne An', 'MOY AN', 'Moy An', 'moy an',
          'MOY.AN', 'Moy.An', 'moy.an',
          'MOYENNE', 'Moyenne', 'moyenne',
          'MOY. AN', 'Moy. An'
        ];
        for (const cle of cles_mga) {
          if (row[cle] !== undefined && row[cle] !== '') {
            mga_raw = row[cle];
            break;
          }
        }
        // Fallback : chercher dans toutes les clés une colonne contenant "moy" et "an"
        if (mga_raw === '') {
          for (const cle of Object.keys(row)) {
            const cleN = cle.toLowerCase().replace(/[.\s_]/g, '');
            if ((cleN.includes('moy') && cleN.includes('an')) || cleN === 'mga') {
              if (row[cle] !== undefined && row[cle] !== '') {
                mga_raw = row[cle];
                console.log(`✅ MGA trouvée via fallback — colonne: "${cle}", valeur: ${mga_raw}`);
                break;
              }
            }
          }
        }

        const mga_str = String(mga_raw).replace(',', '.').trim();
        const mga = mga_str && mga_str !== 'NC' && mga_str !== '' ? parseFloat(mga_str) : null;
        if (mga_raw !== '' && mga === null) colonnes_mga_non_trouvees++;

        // DFA — normaliser les valeurs
        const dfa_raw = String(
          row['DÉCISION'] || row['DECISION'] || row['Décision'] ||
          row['Decision'] || row['decision'] || row['DFA'] ||
          row['Décision fin année'] || row['DECISION FIN ANNEE'] || ''
        ).trim();
        let dfa = '';
        const d = dfa_raw.toLowerCase();
        if (d.includes('admis')) dfa = 'Admis';
        else if (d.includes('exclu')) dfa = 'Exclu';
        else if (d.includes('redouble')) dfa = 'Redouble';

        // Ignorer si NC ou rien d'utile
        if (mga === null && dfa === '') { ignores++; continue; }

        const sets = [], vals = [];
        let idx = 1;
        if (mga !== null && !isNaN(mga)) { sets.push(`moyenne_generale=$${idx++}`); vals.push(mga); }
        if (dfa !== '') { sets.push(`decision_fin_annee=$${idx++}`); vals.push(dfa); }
        if (sets.length === 0) { ignores++; continue; }
        vals.push(matricule);

        const result = await pool.query(
          `UPDATE eleves SET ${sets.join(', ')} WHERE matricule=$${idx}`, vals
        );
        if (result.rowCount > 0) mis_a_jour++;
        else non_trouves++;
      } catch (e) { erreurs.push(e.message); }
    }

    // Inclure les noms de colonnes dans la réponse pour diagnostic
    const colonnes_fichier = data.length > 0 ? Object.keys(data[0]) : [];
    res.json({ mis_a_jour, non_trouves, ignores, total: data.length, erreurs, colonnes_fichier, colonnes_mga_non_trouvees });
  } catch (err) { res.status(500).json({ erreur: err.message }); }
});

module.exports = router;
