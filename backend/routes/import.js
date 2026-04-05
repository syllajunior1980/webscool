const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const pool = require('../database');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// ============================================================
// Import JSON par lots (appelé par le frontend lot par lot)
// ============================================================
router.post('/json', async (req, res) => {
  const rows = req.body.rows;
  if (!rows || !Array.isArray(rows)) return res.status(400).json({ erreur: 'Pas de données' });

  // Fonction formatTel partagée
  const formatTel = (val) => {
    if (val === undefined || val === null || val === '') return '';
    let tel = typeof val === 'number'
      ? Math.round(val).toString()
      : String(val).trim().replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '');
    if (!tel || tel === 'undefined') return '';
    tel = tel.replace(/^\+225/, '').replace(/^00225/, '');
    if (/^\d{9}$/.test(tel)) tel = '0' + tel;
    if (/^\d{8}$/.test(tel)) tel = '0' + tel;
    return tel;
  };

  const rows_to_insert = [];
  const erreurs = [];

  for (const row of rows) {
    try {
      const matricule = String(row['Matricule'] || row['matricule'] || row['MATRICULE'] || '').trim();
      const nom = String(row['Nom'] || row['nom'] || row['NOM'] || '').trim();
      const prenom = String(row['Prenom'] || row['prenom'] || row['PRENOM'] || row['Prénom'] || row['prénom'] || '').trim();
      const classe = String(row['Classe'] || row['classe'] || row['CLASSE'] || '').trim();
      const numero_extrait = String(row['N° Extrait'] || row['numero_extrait'] || row['Extrait'] || '').trim();

      const sexeBrut = String(row['Sexe'] || row['sexe'] || row['SEXE'] || '').trim();
      const sexe = sexeBrut === 'Masculin' || sexeBrut === 'masculin' || sexeBrut === 'M' || sexeBrut === 'm' ? 'M'
                 : sexeBrut === 'Feminin'  || sexeBrut === 'feminin'  || sexeBrut === 'Féminin' || sexeBrut === 'féminin' || sexeBrut === 'F' || sexeBrut === 'f' ? 'F'
                 : sexeBrut;

      const statut = String(row['Statut'] || row['statut'] || '').trim();
      const qualite = String(row['Qualite'] || row['qualite'] || row['Qualité'] || row['qualité'] || '').trim();
      const moyenne_t1 = parseFloat(row['Moy_T1'] || row['moyenne_t1'] || row['Moyenne T1'] || '') || null;
      const moyenne_t2 = parseFloat(row['Moy_T2'] || row['moyenne_t2'] || row['Moyenne T2'] || '') || null;
      const moyenne_t3 = parseFloat(row['Moy_T3'] || row['moyenne_t3'] || row['Moyenne T3'] || '') || null;
      const moyenne_generale = parseFloat(row['Moy_Gen'] || row['moyenne_generale'] || '') || null;
      const decision_fin_annee = String(row['Decision'] || row['decision_fin_annee'] || row['Décision'] || '').trim();
      const nom_parent = String(row['Nom_Parent'] || row['nom_parent'] || row['Parent'] || '').trim();
      const telephone1 = formatTel(row['Telephone1'] || row['telephone1'] || row['Tel1'] || row['Contact'] || '');
      const telephone2 = formatTel(row['Telephone2'] || row['telephone2'] || row['Tel2'] || '');

      // Date naissance
      const dateNaissanceBrut = row['DateNaiss'] || row['Datenaiss'] || row['datenaiss'] || row['date_naissance'] || row['Date Naissance'] || '';
      let date_naissance = null;
      if (dateNaissanceBrut) {
        const str = String(dateNaissanceBrut).trim();
        if (str.includes('/')) {
          const parts = str.split('/');
          if (parts.length === 3 && parts[2].length === 4) {
            date_naissance = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
          }
        } else if (str.match(/^\d{4}-\d{2}-\d{2}/)) {
          date_naissance = str.substring(0, 10);
        } else if (/^\d+$/.test(str)) {
          const d = new Date((parseInt(str) - 25569) * 86400 * 1000);
          if (!isNaN(d.getTime())) {
            date_naissance = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          }
        }
      }
      const lieu_naissance = String(row['LieuNaiss'] || row['Lieunaiss'] || row['lieunaiss'] || row['lieu_naissance'] || row['Lieu Naissance'] || '').trim();

      if (!nom || !prenom) continue;

      rows_to_insert.push([matricule, nom, prenom, classe, numero_extrait, sexe, statut, qualite, date_naissance, lieu_naissance, moyenne_t1, moyenne_t2, moyenne_t3, moyenne_generale, decision_fin_annee, nom_parent, telephone1, telephone2]);
    } catch (e) { erreurs.push(e.message); }
  }

  if (rows_to_insert.length === 0) return res.json({ importes: 0, erreurs });

  // Insertion en une seule requête batch
  const values = [];
  const params = [];
  let p = 1;
  for (const r of rows_to_insert) {
    values.push(`($${p},$${p+1},$${p+2},$${p+3},$${p+4},$${p+5},$${p+6},$${p+7},$${p+8},$${p+9},$${p+10},$${p+11},$${p+12},$${p+13},$${p+14},$${p+15},$${p+16},$${p+17})`);
    params.push(...r);
    p += 18;
  }
  try {
    await pool.query(
      `INSERT INTO eleves (matricule, nom, prenom, classe, numero_extrait, sexe, statut, qualite, date_naissance, lieu_naissance, moyenne_t1, moyenne_t2, moyenne_t3, moyenne_generale, decision_fin_annee, nom_parent, telephone1, telephone2)
       VALUES ${values.join(',')}
       ON CONFLICT (matricule) DO UPDATE SET
         nom=EXCLUDED.nom, prenom=EXCLUDED.prenom, classe=EXCLUDED.classe,
         numero_extrait=EXCLUDED.numero_extrait,
         sexe=EXCLUDED.sexe, statut=EXCLUDED.statut, qualite=EXCLUDED.qualite,
         date_naissance=EXCLUDED.date_naissance, lieu_naissance=EXCLUDED.lieu_naissance,
         nom_parent=EXCLUDED.nom_parent, telephone1=EXCLUDED.telephone1, telephone2=EXCLUDED.telephone2`,
      params
    );
    res.json({ importes: rows_to_insert.length, erreurs });
  } catch (e) {
    res.status(500).json({ erreur: e.message, importes: 0, erreurs });
  }
});

// Import complet élèves
router.post('/', upload.single('fichier'), async (req, res) => {
  if (!req.file) return res.status(400).json({ erreur: 'Aucun fichier' });
  try {
    // Détecter si c'est un fichier CSV
    const filename = req.file.originalname || '';
    const isCSV = filename.toLowerCase().endsWith('.csv');

    let data = [];
    if (isCSV) {
      const text = req.file.buffer.toString('utf-8').replace(/^\uFEFF/, '');
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) return res.json({ importes: 0, erreurs: ['Fichier vide'] });
      const firstLine = lines[0];
      const sep = firstLine.includes(';') ? ';' : ',';
      const headers = firstLine.split(sep).map(h => h.trim().replace(/^"|"$/g, ''));
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(sep).map(v => v.trim().replace(/^"|"$/g, ''));
        if (values.length < 2) continue;
        const row = {};
        headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
        data.push(row);
      }
    } else {
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true, raw: false });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      data = XLSX.utils.sheet_to_json(sheet, { raw: false, dateNF: 'dd/mm/yyyy' });
    }
    let importes = 0, erreurs = [];
    const rows_to_insert = [];

    // Fonction pour formater les numéros de téléphone
    const formatTel = (val) => {
      if (val === undefined || val === null || val === '') return '';
      // Si c'est un nombre (Excel stocke parfois les tel comme float ex: 759109875)
      let tel = typeof val === 'number'
        ? Math.round(val).toString()
        : String(val).trim().replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '');
      if (!tel || tel === 'undefined') return '';
      // Enlever le + ou 00225 (indicatif CI)
      tel = tel.replace(/^\+225/, '').replace(/^00225/, '');
      // Si 9 chiffres → ajouter 0 devant (numéros CI sans le 0 initial)
      if (/^\d{9}$/.test(tel)) tel = '0' + tel;
      // Si 8 chiffres (ancien format) → ajouter 0 devant
      if (/^\d{8}$/.test(tel)) tel = '0' + tel;
      return tel;
    };

    for (const row of data) {
      try {
        const matricule = String(row['Matricule'] || row['matricule'] || row['MATRICULE'] || '').trim();
        const nom = String(row['Nom'] || row['nom'] || row['NOM'] || '').trim();
        const prenom = String(row['Prenom'] || row['prenom'] || row['PRENOM'] || row['Prénom'] || row['prénom'] || '').trim();
        const classe = String(row['Classe'] || row['classe'] || row['CLASSE'] || '').trim();
        const numero_extrait = String(row['N° Extrait'] || row['numero_extrait'] || row['Extrait'] || '').trim();

        // Conversion sexe : Masculin→M, Feminin/Féminin→F
        const sexeBrut = String(row['Sexe'] || row['sexe'] || row['SEXE'] || row['Genre'] || row['genre'] || '').trim();
        const sexe = sexeBrut === 'Masculin' ? 'M'
                   : sexeBrut === 'Feminin'  ? 'F'
                   : sexeBrut === 'Féminin'  ? 'F'
                   : sexeBrut === 'masculin' ? 'M'
                   : sexeBrut === 'feminin'  ? 'F'
                   : sexeBrut === 'féminin'  ? 'F'
                   : sexeBrut === 'M' ? 'M'
                   : sexeBrut === 'F' ? 'F'
                   : sexeBrut === 'm' ? 'M'
                   : sexeBrut === 'f' ? 'F'
                   : sexeBrut;

        const statut = String(row['Statut'] || row['statut'] || row['STATUT'] || '').trim();
        const qualite = String(row['Qualite'] || row['qualite'] || row['QUALITE'] || row['Qualité'] || row['qualité'] || '').trim();
        const moyenne_t1 = parseFloat(row['Moy_T1'] || row['moyenne_t1'] || row['Moyenne_T1'] || row['moyennes trimestres 1'] || row['Moyenne T1'] || '') || null;
        const moyenne_t2 = parseFloat(row['Moy_T2'] || row['moyenne_t2'] || row['Moyenne_T2'] || row['moyennes trimestres 2'] || row['Moyenne T2'] || '') || null;
        const moyenne_t3 = parseFloat(row['Moy_T3'] || row['moyenne_t3'] || row['Moyenne_T3'] || row['moyennes trimestres 3'] || row['Moyenne T3'] || '') || null;
        const moyenne_generale = parseFloat(row['Moy_Gen'] || row['moyenne_generale'] || row['Moyenne_Generale'] || row['Moyenne Generale'] || '') || null;
        const decision_fin_annee = String(row['Decision'] || row['decision_fin_annee'] || row['Décision'] || row['decision'] || '').trim();
        const nom_parent = String(row['Nom_Parent'] || row['nom_parent'] || row['Parent'] || row['parent'] || '').trim();
        const telephone1 = formatTel(row['Telephone1'] || row['telephone1'] || row['Téléphone1'] || row['Tel1'] || row['Contact'] || row['contact'] || '');
        const telephone2 = formatTel(row['Telephone2'] || row['telephone2'] || row['Téléphone2'] || row['Tel2'] || '');

        // Date et lieu de naissance
        const dateNaissanceBrut = row['DateNaiss'] || row['Datenaiss'] || row['datenaiss'] || row['date_naissance'] || row['Date_Naissance'] || row['DateNaissance'] || row['Date Naissance'] || row['datenaissance'] || row['DATE_NAISS'] || row['Date de naissance'] || '';
        let date_naissance = null;
        if (dateNaissanceBrut !== '' && dateNaissanceBrut !== undefined && dateNaissanceBrut !== null) {
          // Cas 1 : Date JavaScript (quand cellDates:true)
          if (dateNaissanceBrut instanceof Date) {
            const d = dateNaissanceBrut;
            if (!isNaN(d.getTime())) {
              date_naissance = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            }
          } else {
            const str = String(dateNaissanceBrut).trim();
            if (str.includes('/')) {
              // Format dd/mm/yyyy ou mm/dd/yyyy
              const parts = str.split('/');
              if (parts.length === 3) {
                const p0 = parts[0].padStart(2,'0');
                const p1 = parts[1].padStart(2,'0');
                const p2 = parts[2];
                if (p2.length === 4) {
                  // Toujours interpréter comme dd/mm/yyyy
                  date_naissance = `${p2}-${p1}-${p0}`;
                }
              }
            } else if (str.match(/^\d{4}-\d{2}-\d{2}/)) {
              date_naissance = str.substring(0, 10);
            } else if (str.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
              // dd-mm-yyyy
              const parts = str.split('-');
              date_naissance = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
            } else if (/^\d+$/.test(str)) {
              // Nombre Excel serial (ex: 40179 = 01/01/2010)
              const num = parseInt(str);
              const d = new Date((num - 25569) * 86400 * 1000);
              if (!isNaN(d.getTime())) {
                date_naissance = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
              }
            }
          }
        }
        const lieu_naissance = String(row['LieuNaiss'] || row['Lieunaiss'] || row['lieunaiss'] || row['lieu_naissance'] || row['Lieu_Naissance'] || row['LieuNaissance'] || row['Lieu Naissance'] || row['LIEU_NAISS'] || row['Lieu de naissance'] || '').trim();

        if (!nom || !prenom) continue;

        rows_to_insert.push([matricule, nom, prenom, classe, numero_extrait, sexe, statut, qualite, date_naissance, lieu_naissance, moyenne_t1, moyenne_t2, moyenne_t3, moyenne_generale, decision_fin_annee, nom_parent, telephone1, telephone2]);
      } catch (e) { erreurs.push(e.message); }
    }

    // Insertion en batch par lots de 200 pour éviter le timeout
    const BATCH = 200;
    for (let i = 0; i < rows_to_insert.length; i += BATCH) {
      const lot = rows_to_insert.slice(i, i + BATCH);
      const values = [];
      const params = [];
      let p = 1;
      for (const r of lot) {
        values.push(`($${p},$${p+1},$${p+2},$${p+3},$${p+4},$${p+5},$${p+6},$${p+7},$${p+8},$${p+9},$${p+10},$${p+11},$${p+12},$${p+13},$${p+14},$${p+15},$${p+16},$${p+17})`);
        params.push(...r);
        p += 18;
      }
      try {
        await pool.query(
          `INSERT INTO eleves (matricule, nom, prenom, classe, numero_extrait, sexe, statut, qualite, date_naissance, lieu_naissance, moyenne_t1, moyenne_t2, moyenne_t3, moyenne_generale, decision_fin_annee, nom_parent, telephone1, telephone2)
           VALUES ${values.join(',')}
           ON CONFLICT (matricule) DO UPDATE SET
             nom=EXCLUDED.nom, prenom=EXCLUDED.prenom, classe=EXCLUDED.classe,
             numero_extrait=EXCLUDED.numero_extrait,
             sexe=EXCLUDED.sexe, statut=EXCLUDED.statut, qualite=EXCLUDED.qualite,
             date_naissance=EXCLUDED.date_naissance, lieu_naissance=EXCLUDED.lieu_naissance,
             nom_parent=EXCLUDED.nom_parent, telephone1=EXCLUDED.telephone1, telephone2=EXCLUDED.telephone2`,
          params
        );
        importes += lot.length;
      } catch (e) { erreurs.push(`Lot ${i}-${i+BATCH}: ${e.message}`); }
    }
    res.json({ importes, erreurs });
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
    res.json({ mis_a_jour, erreurs });
  } catch (err) { res.status(500).json({ erreur: err.message }); }
});

module.exports = router;
