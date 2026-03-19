import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API = 'https://webscool.onrender.com/api';
const MOT_DE_PASSE = 'dares2026';
const ETABLISSEMENT = 'COLLÈGE MODERNE BOUAKÉ DAR ES SALAM';
const ANNEE_SCOLAIRE = '2025-2026';
const MONTANT_INSCRIPTION = 1000;

export default function App() {
  const [connecte, setConnecte] = useState(false);
  const [appChargee, setAppChargee] = useState(false);
  const [progressChargement, setProgressChargement] = useState(0);
  const [messageChargement, setMessageChargement] = useState('Connexion au serveur...');
  const [mdp, setMdp] = useState('');
  const [erreurMdp, setErreurMdp] = useState('');
  const [onglet, setOnglet] = useState('liste');
  const [eleves, setEleves] = useState([]);
  const [recherche, setRecherche] = useState('');
  const [classeFiltre, setClasseFiltre] = useState('');
  const [classes, setClasses] = useState([]);
  const [eleveSelectionne, setEleveSelectionne] = useState(null);
  const [fichierExcel, setFichierExcel] = useState(null);
  const [importStatus, setImportStatus] = useState('');
  const [importEnCours, setImportEnCours] = useState(false);
  const [trimestreActif, setTrimestreActif] = useState('T1');
  const [calcEnCours, setCalcEnCours] = useState(false);
  const [calcStatus, setCalcStatus] = useState('');
  const [formulaire, setFormulaire] = useState({
    matricule:'',nom:'',prenom:'',classe:'',numero_extrait:'',
    moyenne_t1:'',moyenne_t2:'',moyenne_t3:'',moyenne_generale:'',
    decision_fin_annee:'',nom_parent:'',telephone1:'',telephone2:''
  });
  const [modeFormulaire, setModeFormulaire] = useState('ajouter');
  const [messageFormulaire, setMessageFormulaire] = useState('');
  const [rechercheInscription, setRechercheInscription] = useState('');
  const [classeFiltreInscription, setClasseFiltreInscription] = useState('');
  const [elevesInscription, setElevesInscription] = useState([]);
  const [paiements, setPaiements] = useState({});
  const [messageInscription, setMessageInscription] = useState('');
  const [dateBilan, setDateBilan] = useState(new Date().toISOString().split('T')[0]);
  const [sousOngletInscription, setSousOngletInscription] = useState('encaissement');

  // Photos
  const [uploadEnCours, setUploadEnCours] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [recherchePhoto, setRecherchePhoto] = useState('');
  const [eleveRecherchePhoto, setEleveRecherchePhoto] = useState(null);
  const [classeTrombi, setClasseTrombi] = useState('');
  const [sousOngletPhotos, setSousOngletPhotos] = useState('import');
  const fileInputRef = useRef(null);

  // ===== ÉDUCATEURS =====
  const DOCUMENTS_EDUCATEURS = [
    { key: 'extrait_naissance', label: 'Extrait de naissance' },
    { key: 'chemise_cartonnee', label: 'Chemise cartonnée' },
    { key: 'photos', label: 'Photos' },
    { key: 'fiche_inscription', label: "Fiche d'inscription" },
    { key: 'fiche_bonne_conduite', label: 'Fiche de bonne conduite' },
    { key: 'recu_economat', label: 'Reçu économat' },
    { key: 'fiche_renseignement', label: 'Fiche de renseignement' },
    { key: 'bulletin_transfert', label: 'Bulletin (cas transfert)' },
    { key: 'photocopie_diplome', label: 'Photocopie diplôme (nouveaux affectés)' },
    { key: 'enveloppe_timbree', label: 'Enveloppe timbrée' },
  ];
  const [inscriptionsEducateurs, setInscriptionsEducateurs] = useState({});
  const [rechercheEducateur, setRechercheEducateur] = useState('');
  const [classeFiltreEducateur, setClasseFiltreEducateur] = useState('');
  const [elevesEducateur, setElevesEducateur] = useState([]);
  const [messageEducateur, setMessageEducateur] = useState('');
  const [sousOngletEducateur, setSousOngletEducateur] = useState('saisie');
  const [sauvegardeEnCours, setSauvegardeEnCours] = useState({});

  // Wake-up du serveur au chargement initial
  useEffect(() => {
    const wakeUpServeur = async () => {
      const messages = [
        'Connexion au serveur...',
        'Réveil du serveur en cours...',
        'Chargement de WebScool...',
        'Presque prêt...',
      ];
      let step = 0;
      // Simuler la progression pendant l'attente
      const interval = setInterval(() => {
        step++;
        const progress = Math.min(step * 8, 90);
        setProgressChargement(progress);
        setMessageChargement(messages[Math.min(Math.floor(step / 4), messages.length - 1)]);
      }, 500);
      try {
        await axios.get(`${API.replace('/api','')}/`, { timeout: 180000 });
      } catch (e) { /* serveur peut répondre avec erreur mais c'est réveillé */ }
      clearInterval(interval);
      setProgressChargement(100);
      setMessageChargement(' WebScool est prêt !');
      setTimeout(() => setAppChargee(true), 600);
    };
    wakeUpServeur();
  }, []);

  useEffect(() => {
    if (connecte) { chargerEleves(); chargerClasses(); chargerPaiements(); chargerInscriptionsEducateurs(); }
  }, [connecte]);

  const seConnecter = () => {
    if (mdp === MOT_DE_PASSE) { setConnecte(true); setErreurMdp(''); }
    else { setErreurMdp('❌ Mot de passe incorrect'); }
  };

  const chargerEleves = async () => {
    try { const res = await axios.get(`${API}/eleves`); setEleves(res.data); setElevesInscription(res.data); }
    catch (err) { console.error('Erreur:', err); }
  };
  const chargerClasses = async () => {
    try { const res = await axios.get(`${API}/eleves/classes`); setClasses(res.data.map(r => r.classe)); }
    catch (err) { console.error(err); }
  };
  const chargerPaiements = async () => {
    try {
      const res = await axios.get(`${API}/inscriptions`);
      const map = {};
      res.data.forEach(p => { map[p.eleve_id] = p; });
      setPaiements(map);
    } catch (err) { console.error('Paiements:', err); }
  };
  const chargerInscriptionsEducateurs = async () => {
    try {
      const res = await axios.get(`${API}/educateurs`);
      const map = {};
      res.data.forEach(r => { map[r.eleve_id] = r; });
      setInscriptionsEducateurs(map);
      setElevesEducateur(eleves);
    } catch (err) { console.error('Educateurs:', err); }
  };

  const sauvegarderDocuments = async (eleve, docs) => {
    setSauvegardeEnCours(prev => ({...prev, [eleve.id]: true}));
    try {
      await axios.post(`${API}/educateurs`, { eleve_id: eleve.id, ...docs });
      setInscriptionsEducateurs(prev => ({...prev, [eleve.id]: { eleve_id: eleve.id, ...docs }}));
      setMessageEducateur(` Documents de ${eleve.nom} ${eleve.prenom} sauvegardés`);
      setTimeout(() => setMessageEducateur(''), 3000);
    } catch (err) { setMessageEducateur(' Erreur: ' + err.message); }
    setSauvegardeEnCours(prev => ({...prev, [eleve.id]: false}));
  };

  const toggleDocument = async (eleve, docKey) => {
    const actuel = inscriptionsEducateurs[eleve.id] || {};
    const newDocs = { ...actuel, [docKey]: !actuel[docKey] };
    // Enlever champs non-docs
    const docsOnly = {};
    ['extrait_naissance','chemise_cartonnee','photos','fiche_inscription',
     'fiche_bonne_conduite','recu_economat','fiche_renseignement',
     'bulletin_transfert','photocopie_diplome','enveloppe_timbree','observations'].forEach(k => {
      docsOnly[k] = newDocs[k] || false;
    });
    await sauvegarderDocuments(eleve, docsOnly);
  };

  const filtrerEducateurParClasse = async (classe) => {
    setClasseFiltreEducateur(classe); setRechercheEducateur('');
    if (!classe) { setElevesEducateur(eleves); return; }
    try { const res = await axios.get(`${API}/eleves/classe/${classe}`); setElevesEducateur(res.data); }
    catch (err) { console.error(err); }
  };

  const rechercherEleveEducateur = async (val) => {
    setRechercheEducateur(val); setClasseFiltreEducateur('');
    if (val.length < 2) { setElevesEducateur(eleves); return; }
    try { const res = await axios.get(`${API}/eleves/recherche?q=${val}`); setElevesEducateur(res.data); }
    catch (err) { console.error(err); }
  };

  const compterDocsEleve = (eleveId) => {
    const ie = inscriptionsEducateurs[eleveId];
    if (!ie) return 0;
    return ['extrait_naissance','chemise_cartonnee','photos','fiche_inscription',
      'fiche_bonne_conduite','recu_economat','fiche_renseignement',
      'bulletin_transfert','photocopie_diplome','enveloppe_timbree'].filter(k => ie[k]).length;
  };

  const estInscritEducateur = (eleveId) => {
    const ie = inscriptionsEducateurs[eleveId];
    if (!ie) return false;
    // Au moins reçu économat coché = inscrit
    return ie.recu_economat === true;
  };

  const imprimerBilanEducateurs = () => {
    const inscrits = eleves.filter(e => estInscritEducateur(e.id)).sort((a,b) => (a.nom||'').localeCompare(b.nom||''));
    const nonInscrits = eleves.filter(e => !estInscritEducateur(e.id)).sort((a,b) => (a.nom||'').localeCompare(b.nom||''));
    const lignesInscrits = inscrits.map((e,i) => {
      const ie = inscriptionsEducateurs[e.id] || {};
      const nb = compterDocsEleve(e.id);
      return `<tr><td style="padding:4px 6px;border:1px solid #ccc;text-align:center;">${i+1}</td>
      <td style="padding:4px 6px;border:1px solid #ccc;">${e.matricule||''}</td>
      <td style="padding:4px 6px;border:1px solid #ccc;font-weight:bold;">${e.nom}</td>
      <td style="padding:4px 6px;border:1px solid #ccc;">${e.prenom}</td>
      <td style="padding:4px 6px;border:1px solid #ccc;text-align:center;">${e.classe||''}</td>
      <td style="padding:4px 6px;border:1px solid #ccc;text-align:center;color:green;font-weight:bold;">${nb}/10</td></tr>`;
    }).join('');
    const lignesNonInscrits = nonInscrits.map((e,i) => `<tr>
      <td style="padding:4px 6px;border:1px solid #ccc;text-align:center;">${i+1}</td>
      <td style="padding:4px 6px;border:1px solid #ccc;">${e.matricule||''}</td>
      <td style="padding:4px 6px;border:1px solid #ccc;font-weight:bold;color:red;">${e.nom}</td>
      <td style="padding:4px 6px;border:1px solid #ccc;">${e.prenom}</td>
      <td style="padding:4px 6px;border:1px solid #ccc;text-align:center;">${e.classe||''}</td>
      <td style="padding:4px 6px;border:1px solid #ccc;">${e.nom_parent||''}</td>
      <td style="padding:4px 6px;border:1px solid #ccc;">${e.telephone1||''}</td></tr>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Bilan Éducateurs</title>
    <style>body{font-family:Arial,sans-serif;margin:20px;font-size:12px;}
    .entete{text-align:center;margin-bottom:20px;border-bottom:2px solid #000;padding-bottom:10px;}
    table{width:100%;border-collapse:collapse;margin-bottom:20px;}
    thead{background-color:#1e3a5f;color:white;}
    thead th{padding:7px 4px;border:1px solid #ccc;font-size:11px;}
    h2{color:#1e3a5f;margin:15px 0 8px;}
    .stats{background:#f0f4f8;padding:12px;border-radius:6px;margin-bottom:15px;display:flex;gap:20px;flex-wrap:wrap;}
    .footer{margin-top:30px;display:flex;justify-content:space-between;font-size:11px;}</style></head><body>
    <div class="entete"><h2>${ETABLISSEMENT}</h2><h1>BILAN INSCRIPTIONS  ÉDUCATEURS</h1>
    <p>Année scolaire : ${ANNEE_SCOLAIRE}  Imprimé le ${new Date().toLocaleDateString('fr-FR')}</p></div>
    <div class="stats">
      <span> <strong>Total élèves :</strong> ${eleves.length}</span>
      <span style="color:green;"> <strong>Inscrits :</strong> ${inscrits.length}</span>
      <span style="color:red;"> <strong>Non inscrits :</strong> ${nonInscrits.length}</span>
      <span> <strong>Taux :</strong> ${eleves.length > 0 ? Math.round(inscrits.length/eleves.length*100) : 0}%</span>
    </div>
    <h2> ÉLÈVES INSCRITS (${inscrits.length})</h2>
    <table><thead><tr><th>N</th><th>Matricule</th><th>Nom</th><th>Prénom</th><th>Classe</th><th>Docs</th></tr></thead>
    <tbody>${lignesInscrits}</tbody></table>
    <h2 style="color:red;"> ÉLÈVES NON INSCRITS (${nonInscrits.length})</h2>
    <table><thead><tr><th>N</th><th>Matricule</th><th>Nom</th><th>Prénom</th><th>Classe</th><th>Parent</th><th>Téléphone</th></tr></thead>
    <tbody>${lignesNonInscrits}</tbody></table>
    <div class="footer"><span>L'Éducateur : ________________</span><span>Le Directeur : ________________</span></div>
    <script>window.onload=function(){window.print();}</script></body></html>`;
    const f = window.open('','_blank'); f.document.write(html); f.document.close();
  };

  const imprimerBilanControle = () => {
    const inscritsEco = new Set(Object.keys(paiements).map(id => parseInt(id)));
    const inscritsEdu = new Set(eleves.filter(e => estInscritEducateur(e.id)).map(e => e.id));
    const deuxListes = eleves.filter(e => inscritsEco.has(e.id) && inscritsEdu.has(e.id)).sort((a,b) => (a.nom||'').localeCompare(b.nom||''));
    const ecoSeul = eleves.filter(e => inscritsEco.has(e.id) && !inscritsEdu.has(e.id)).sort((a,b) => (a.nom||'').localeCompare(b.nom||''));
    const eduSeul = eleves.filter(e => !inscritsEco.has(e.id) && inscritsEdu.has(e.id)).sort((a,b) => (a.nom||'').localeCompare(b.nom||''));
    const aucun = eleves.filter(e => !inscritsEco.has(e.id) && !inscritsEdu.has(e.id)).sort((a,b) => (a.nom||'').localeCompare(b.nom||''));
    const mkTable = (liste, couleurNom='black') => liste.map((e,i) => `<tr>
      <td style="padding:4px 6px;border:1px solid #ccc;text-align:center;">${i+1}</td>
      <td style="padding:4px 6px;border:1px solid #ccc;">${e.matricule||''}</td>
      <td style="padding:4px 6px;border:1px solid #ccc;font-weight:bold;color:${couleurNom};">${e.nom}</td>
      <td style="padding:4px 6px;border:1px solid #ccc;">${e.prenom}</td>
      <td style="padding:4px 6px;border:1px solid #ccc;text-align:center;">${e.classe||''}</td>
      <td style="padding:4px 6px;border:1px solid #ccc;">${e.nom_parent||''}</td>
      <td style="padding:4px 6px;border:1px solid #ccc;">${e.telephone1||''}</td></tr>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Contrôle inscriptions</title>
    <style>body{font-family:Arial,sans-serif;margin:20px;font-size:11px;}
    .entete{text-align:center;margin-bottom:20px;border-bottom:2px solid #000;padding-bottom:10px;}
    table{width:100%;border-collapse:collapse;margin-bottom:20px;}
    thead{background-color:#1e3a5f;color:white;}
    thead th{padding:6px 4px;border:1px solid #ccc;font-size:10px;}
    h2{font-size:13px;margin:12px 0 6px;padding:6px 10px;border-radius:4px;}
    .stats{background:#f0f4f8;padding:10px;border-radius:6px;margin-bottom:12px;display:flex;gap:15px;flex-wrap:wrap;font-size:12px;}
    .footer{margin-top:30px;display:flex;justify-content:space-between;font-size:11px;}</style></head><body>
    <div class="entete"><h2>${ETABLISSEMENT}</h2><h1>CONTRÔLE CROISÉ DES INSCRIPTIONS</h1>
    <p>Année scolaire : ${ANNEE_SCOLAIRE}  ${new Date().toLocaleDateString('fr-FR')}</p></div>
    <div class="stats">
      <span> Total : <strong>${eleves.length}</strong></span>
      <span style="color:green;"> Inscrits aux 2 : <strong>${deuxListes.length}</strong></span>
      <span style="color:orange;">! Économat seul : <strong>${ecoSeul.length}</strong></span>
      <span style="color:purple;">! Éducateurs seul : <strong>${eduSeul.length}</strong></span>
      <span style="color:red;"> Aucun : <strong>${aucun.length}</strong></span>
    </div>
    <h2 style="background:#dcfce7;color:#166534;"> INSCRITS AUX DEUX (${deuxListes.length})</h2>
    <table><thead><tr><th>N</th><th>Matricule</th><th>Nom</th><th>Prénom</th><th>Classe</th><th>Parent</th><th>Téléphone</th></tr></thead>
    <tbody>${mkTable(deuxListes,'#166534')}</tbody></table>
    <h2 style="background:#fef3c7;color:#92400e;">! INSCRITS ÉCONOMAT SEULEMENT (${ecoSeul.length})</h2>
    <table><thead><tr><th>N</th><th>Matricule</th><th>Nom</th><th>Prénom</th><th>Classe</th><th>Parent</th><th>Téléphone</th></tr></thead>
    <tbody>${mkTable(ecoSeul,'#92400e')}</tbody></table>
    <h2 style="background:#ede9fe;color:#5b21b6;">! INSCRITS ÉDUCATEURS SEULEMENT (${eduSeul.length})</h2>
    <table><thead><tr><th>N</th><th>Matricule</th><th>Nom</th><th>Prénom</th><th>Classe</th><th>Parent</th><th>Téléphone</th></tr></thead>
    <tbody>${mkTable(eduSeul,'#5b21b6')}</tbody></table>
    <h2 style="background:#fee2e2;color:#991b1b;"> NON INSCRITS DU TOUT (${aucun.length})</h2>
    <table><thead><tr><th>N</th><th>Matricule</th><th>Nom</th><th>Prénom</th><th>Classe</th><th>Parent</th><th>Téléphone</th></tr></thead>
    <tbody>${mkTable(aucun,'#991b1b')}</tbody></table>
    <div class="footer"><span>L'Éducateur : ________________</span><span>L'Économe : ________________</span><span>Le Directeur : ________________</span></div>
    <script>window.onload=function(){window.print();}</script></body></html>`;
    const f = window.open('','_blank'); f.document.write(html); f.document.close();
  };

  const rechercherEleves = async (val) => {
    setRecherche(val);
    if (val.length < 2) { chargerEleves(); return; }
    try { const res = await axios.get(`${API}/eleves/recherche?q=${val}`); setEleves(res.data); }
    catch (err) { console.error(err); }
  };
  const filtrerParClasse = async (classe) => {
    setClasseFiltre(classe); setRecherche('');
    if (!classe) { chargerEleves(); return; }
    try { const res = await axios.get(`${API}/eleves/classe/${classe}`); setEleves(res.data); }
    catch (err) { console.error(err); }
  };
  const rechercherInscription = async (val) => {
    setRechercheInscription(val); setClasseFiltreInscription('');
    if (val.length < 2) { setElevesInscription(eleves); return; }
    try { const res = await axios.get(`${API}/eleves/recherche?q=${val}`); setElevesInscription(res.data); }
    catch (err) { console.error(err); }
  };
  const filtrerInscriptionParClasse = async (classe) => {
    setClasseFiltreInscription(classe); setRechercheInscription('');
    if (!classe) { setElevesInscription(eleves); return; }
    try { const res = await axios.get(`${API}/eleves/classe/${classe}`); setElevesInscription(res.data); }
    catch (err) { console.error(err); }
  };
  const togglePaiement = async (eleve) => {
    const estPaye = !!paiements[eleve.id];
    try {
      if (estPaye) {
        await axios.delete(`${API}/inscriptions/${eleve.id}`);
        const newP = {...paiements}; delete newP[eleve.id]; setPaiements(newP);
        setMessageInscription(`❌ Paiement annulé pour ${eleve.nom} ${eleve.prenom}`);
      } else {
        const res = await axios.post(`${API}/inscriptions`, {
          eleve_id: eleve.id, montant: MONTANT_INSCRIPTION,
          date_paiement: new Date().toISOString().split('T')[0]
        });
        setPaiements({...paiements, [eleve.id]: res.data});
        setMessageInscription(` Paiement enregistré pour ${eleve.nom} ${eleve.prenom}`);
      }
      setTimeout(() => setMessageInscription(''), 3000);
    } catch (err) { setMessageInscription('? Erreur: ' + (err.response?.data?.erreur || err.message)); }
  };

  // ===== PHOTOS =====
  const importerPhotosGroupees = async (fichiers) => {
    if (!fichiers || fichiers.length === 0) return;
    setUploadEnCours(true);
    setUploadProgress(0);
    setUploadStatus(` Préparation de ${fichiers.length} photos...`);

    const BATCH = 20;
    let total = 0; let erreurs = 0;
    const tabFichiers = Array.from(fichiers);

    for (let i = 0; i < tabFichiers.length; i += BATCH) {
      const lot = tabFichiers.slice(i, i + BATCH);
      const formData = new FormData();
      lot.forEach(f => formData.append('photos', f));
      try {
        const res = await axios.post(`${API}/photos/upload-multiple`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }, timeout: 300000
        });
        total += res.data.uploaded;
        erreurs += res.data.erreurs;
      } catch (err) { erreurs += lot.length; }
      const progress = Math.round(((i + BATCH) / tabFichiers.length) * 100);
      setUploadProgress(Math.min(progress, 100));
      setUploadStatus(` ${Math.min(i + BATCH, tabFichiers.length)} / ${tabFichiers.length} photos traitées...`);
    }

    setUploadStatus(` ${total} photos importées ! ${erreurs > 0 ? `? ${erreurs} erreurs` : ''}`);
    setUploadEnCours(false);
    chargerEleves();
  };

  const rechercherElevePhoto = async (val) => {
    setRecherchePhoto(val);
    setEleveRecherchePhoto(null);
    if (val.length < 2) return;
    try {
      const res = await axios.get(`${API}/eleves/recherche?q=${val}`);
      if (res.data.length > 0) setEleveRecherchePhoto(res.data[0]);
    } catch (err) { console.error(err); }
  };

  const importerTrimestre = async () => {
    if (!fichierExcel) { setImportStatus('❌ Choisissez un fichier Excel'); return; }
    setImportEnCours(true); setImportStatus(` Import ${trimestreActif} en cours...`);
    const formData = new FormData();
    formData.append('fichier', fichierExcel); formData.append('trimestre', trimestreActif);
    try {
      const res = await axios.post(`${API}/import/trimestre`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000
      });
      setImportStatus(` ${res.data.mis_a_jour} élèves mis à jour pour ${trimestreActif} !`);
      chargerEleves();
    } catch (err) {
      setImportStatus('? Erreur: ' + JSON.stringify(err.response?.data?.erreur || err.message));
    }
    setImportEnCours(false);
  };
  const calculerMoyennesAnnuelles = async () => {
    if (!window.confirm('Calculer MGA et DFA pour tous les élèves ?')) return;
    setCalcEnCours(true); setCalcStatus(' Calcul en cours...');
    try {
      const res = await axios.post(`${API}/eleves/calculer-moyennes`);
      setCalcStatus(` ${res.data.mis_a_jour} élèves mis à jour ! (Admis: ${res.data.admis}, Redoublants: ${res.data.redoublants}, Exclus: ${res.data.exclus})`);
      chargerEleves();
    } catch (err) { setCalcStatus('? Erreur: ' + (err.response?.data?.erreur || err.message)); }
    setCalcEnCours(false);
  };
  const ouvrirFiche = (eleve) => { setEleveSelectionne(eleve); setOnglet('fiche'); };
  const ouvrirFormulaire = (eleve = null) => {
    if (eleve) {
      setFormulaire({
        matricule:eleve.matricule||'',nom:eleve.nom||'',prenom:eleve.prenom||'',
        classe:eleve.classe||'',numero_extrait:eleve.numero_extrait||'',
        moyenne_t1:eleve.moyenne_t1||'',moyenne_t2:eleve.moyenne_t2||'',
        moyenne_t3:eleve.moyenne_t3||'',moyenne_generale:eleve.moyenne_generale||'',
        decision_fin_annee:eleve.decision_fin_annee||'',nom_parent:eleve.nom_parent||'',
        telephone1:eleve.telephone1||'',telephone2:eleve.telephone2||''
      });
      setModeFormulaire('modifier');
    } else {
      setFormulaire({matricule:'',nom:'',prenom:'',classe:'',numero_extrait:'',
        moyenne_t1:'',moyenne_t2:'',moyenne_t3:'',moyenne_generale:'',
        decision_fin_annee:'',nom_parent:'',telephone1:'',telephone2:''});
      setModeFormulaire('ajouter');
    }
    setMessageFormulaire(''); setOnglet('formulaire');
  };
  const sauvegarderEleve = async () => {
    if (!formulaire.nom || !formulaire.prenom || !formulaire.classe) {
      setMessageFormulaire('❌ Nom, prénom et classe sont obligatoires'); return;
    }
    try {
      if (modeFormulaire === 'ajouter') {
        await axios.post(`${API}/eleves`, formulaire);
        setMessageFormulaire('✅ Élève ajouté !');
      } else {
        await axios.put(`${API}/eleves/${eleveSelectionne.id}`, formulaire);
        setMessageFormulaire('✅ Élève modifié !');
      }
      chargerEleves(); chargerClasses();
    } catch (err) { setMessageFormulaire('? Erreur: ' + (err.response?.data?.erreur || err.message)); }
  };
  const supprimerEleve = async (id) => {
    if (!window.confirm('Supprimer cet élève ?')) return;
    try { await axios.delete(`${API}/eleves/${id}`); chargerEleves(); }
    catch (err) { alert('Erreur suppression'); }
  };

  const imprimerListeClasse = () => {
    if (!classeFiltre) { alert("Veuillez sélectionner une classe d'abord !"); return; }
    const elevesAImprimer = eleves.slice().sort((a,b) => (a.nom||'').localeCompare(b.nom||''));
    const admis = elevesAImprimer.filter(e => e.decision_fin_annee === 'Admis').length;
    const redoublants = elevesAImprimer.filter(e => e.decision_fin_annee === 'Redoublant').length;
    const exclus = elevesAImprimer.filter(e => e.decision_fin_annee === 'Exclu').length;
    const moyennesValides = elevesAImprimer.filter(e => e.moyenne_generale && parseFloat(e.moyenne_generale) > 0);
    const moyenneClasse = moyennesValides.length > 0
      ? (moyennesValides.reduce((s,e) => s + parseFloat(e.moyenne_generale), 0) / moyennesValides.length).toFixed(2) : '-';
    const lignes = elevesAImprimer.map((e, i) => `
      <tr><td style="padding:5px 4px;text-align:center;border:1px solid #ccc;">${i+1}</td>
      <td style="padding:5px 4px;border:1px solid #ccc;">${e.matricule||''}</td>
      <td style="padding:5px 4px;font-weight:bold;border:1px solid #ccc;">${e.nom||''}</td>
      <td style="padding:5px 4px;border:1px solid #ccc;">${e.prenom||''}</td>
      <td style="padding:5px 4px;text-align:center;border:1px solid #ccc;">${e.moyenne_t1||'-'}</td>
      <td style="padding:5px 4px;text-align:center;border:1px solid #ccc;">${e.moyenne_t2||'-'}</td>
      <td style="padding:5px 4px;text-align:center;border:1px solid #ccc;">${e.moyenne_t3||'-'}</td>
      <td style="padding:5px 4px;text-align:center;font-weight:bold;border:1px solid #ccc;">${e.moyenne_generale||'-'}</td>
      <td style="padding:5px 4px;text-align:center;border:1px solid #ccc;color:${e.decision_fin_annee==='Admis'?'green':e.decision_fin_annee==='Redoublant'?'orange':'red'};font-weight:bold;">${e.decision_fin_annee||'-'}</td></tr>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Liste ${classeFiltre}</title>
      <style>body{font-family:Arial,sans-serif;margin:20px;font-size:12px;}@media print{body{margin:10px;}}
      .entete{text-align:center;margin-bottom:20px;border-bottom:2px solid #000;padding-bottom:10px;}
      table{width:100%;border-collapse:collapse;}thead{background-color:#1e3a5f;color:white;}
      thead th{padding:7px 4px;border:1px solid #ccc;font-size:11px;}
      .stats{display:flex;gap:20px;margin-top:15px;padding:10px;background:#f0f4f8;border-radius:6px;flex-wrap:wrap;}
      .footer{margin-top:30px;display:flex;justify-content:space-between;font-size:11px;}</style></head><body>
      <div class="entete"><h2>${ETABLISSEMENT}</h2><h1>LISTE DES ÉLÈVES DE ${classeFiltre.toUpperCase()}</h1>
      <p>Année scolaire : ${ANNEE_SCOLAIRE}</p></div>
      <table><thead><tr><th>N</th><th>Matricule</th><th>Nom</th><th>Prénom</th><th>T1</th><th>T2</th><th>T3</th><th>MGA</th><th>Décision</th></tr></thead>
      <tbody>${lignes}</tbody></table>
      <div class="stats"><span> <strong>Total :</strong> ${elevesAImprimer.length}</span>
      <span>Moyenne classe :</strong> ${moyenneClasse}</span>
      <span style="color:green;"> <strong>Admis :</strong> ${admis}</span>
      <span style="color:orange;">Redoublants :</strong> ${redoublants}</span>
      <span style="color:red;"> <strong>Exclus :</strong> ${exclus}</span>
      <span>Taux :</strong> ${elevesAImprimer.length > 0 ? Math.round(admis/elevesAImprimer.length*100) : 0}%</span></div>
      <div class="footer"><span>Imprimé le : ${new Date().toLocaleDateString('fr-FR')}</span>
      <span>Signature du Directeur : ________________</span></div>
      <script>window.onload=function(){window.print();}</script></body></html>`;
    const f = window.open('','_blank'); f.document.write(html); f.document.close();
  };

  const imprimerListeBEPC = () => {
    const classes3eme = classes.filter(c => c.toLowerCase().startsWith('3'));
    const admisBepc = eleves.filter(e => classes3eme.some(c => c === e.classe) && e.decision_fin_annee === 'Admis')
      .sort((a,b) => (parseFloat(b.moyenne_generale)||0)-(parseFloat(a.moyenne_generale)||0));
    const lignes = admisBepc.map((e,i) => `
      <tr><td style="padding:5px 4px;text-align:center;border:1px solid #ccc;">${i+1}</td>
      <td style="padding:5px 4px;border:1px solid #ccc;">${e.matricule||''}</td>
      <td style="padding:5px 4px;font-weight:bold;border:1px solid #ccc;">${e.nom||''}</td>
      <td style="padding:5px 4px;border:1px solid #ccc;">${e.prenom||''}</td>
      <td style="padding:5px 4px;text-align:center;border:1px solid #ccc;">${e.classe||''}</td>
      <td style="padding:5px 4px;text-align:center;font-weight:bold;color:green;border:1px solid #ccc;">${e.moyenne_generale||'-'}</td>
      <td style="padding:5px 4px;border:1px solid #ccc;">${e.nom_parent||''}</td>
      <td style="padding:5px 4px;border:1px solid #ccc;">${e.telephone1||''}</td></tr>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Admis BEPC</title>
      <style>body{font-family:Arial,sans-serif;margin:20px;font-size:12px;}
      .entete{text-align:center;margin-bottom:20px;border-bottom:2px solid #000;padding-bottom:10px;}
      table{width:100%;border-collapse:collapse;}thead{background-color:#166534;color:white;}
      thead th{padding:7px 4px;border:1px solid #ccc;font-size:11px;}
      .stats{margin-top:15px;padding:10px;background:#dcfce7;border-radius:6px;}
      .footer{margin-top:30px;display:flex;justify-content:space-between;font-size:11px;}</style></head><body>
      <div class="entete"><h2>${ETABLISSEMENT}</h2><h1>LISTE DES ADMIS AU BEPC</h1>
      <p>Année scolaire : ${ANNEE_SCOLAIRE}</p></div>
      <table><thead><tr><th>N</th><th>Matricule</th><th>Nom</th><th>Prénom</th><th>Classe</th><th>MGA</th><th>Parent</th><th>Téléphone</th></tr></thead>
      <tbody>${lignes}</tbody></table>
      <div class="stats"> <strong>Total admis au BEPC : ${admisBepc.length} élèves</strong></div>
      <div class="footer"><span>Imprimé le : ${new Date().toLocaleDateString('fr-FR')}</span>
      <span>Signature : ________________</span></div>
      <script>window.onload=function(){window.print();}</script></body></html>`;
    const f = window.open('','_blank'); f.document.write(html); f.document.close();
  };

  const imprimerListePayes = () => {
    const filtre = classeFiltreInscription;
    const liste = elevesInscription.filter(e => paiements[e.id]).sort((a,b) => (a.nom||'').localeCompare(b.nom||''));
    const lignes = liste.map((e,i) => `
      <tr><td style="padding:5px 4px;text-align:center;border:1px solid #ccc;">${i+1}</td>
      <td style="padding:5px 4px;border:1px solid #ccc;">${e.matricule||''}</td>
      <td style="padding:5px 4px;font-weight:bold;border:1px solid #ccc;">${e.nom||''}</td>
      <td style="padding:5px 4px;border:1px solid #ccc;">${e.prenom||''}</td>
      <td style="padding:5px 4px;text-align:center;border:1px solid #ccc;">${e.classe||''}</td>
      <td style="padding:5px 4px;text-align:center;border:1px solid #ccc;">${(()=>{const d=paiements[e.id]?.date_paiement;if(!d)return'-';const p=(d.split('T')[0]||d.split(' ')[0]).split('-');return p.length===3?new Date(+p[0],+p[1]-1,+p[2]).toLocaleDateString('fr-FR'):'-';})()}</td>
      <td style="padding:5px 4px;text-align:center;font-weight:bold;color:green;border:1px solid #ccc;">${MONTANT_INSCRIPTION} FCFA</td></tr>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Liste paiements</title>
      <style>body{font-family:Arial,sans-serif;margin:20px;font-size:12px;}
      table{width:100%;border-collapse:collapse;}thead{background-color:#1e3a5f;color:white;}
      thead th{padding:7px 4px;border:1px solid #ccc;}
      .stats{margin-top:15px;padding:10px;background:#dcfce7;border-radius:6px;display:flex;gap:30px;}
      .footer{margin-top:30px;display:flex;justify-content:space-between;font-size:11px;}</style></head><body>
      <div style="text-align:center;margin-bottom:20px;border-bottom:2px solid #000;padding-bottom:10px;">
      <h2>${ETABLISSEMENT}</h2><h1>LISTE DES ÉLÈVES AYANT PAYÉ LES DROITS D'INSCRIPTION</h1>
      <p>Année scolaire : ${ANNEE_SCOLAIRE}${filtre?'  Classe : '+filtre:'  Toutes classes'}</p></div>
      <table><thead><tr><th>N</th><th>Matricule</th><th>Nom</th><th>Prénom</th><th>Classe</th><th>Date paiement</th><th>Montant</th></tr></thead>
      <tbody>${lignes}</tbody></table>
      <div class="stats"><span> <strong>Total payés :</strong> ${liste.length}</span>
      <span> <strong>Total encaissé :</strong> ${liste.length * MONTANT_INSCRIPTION} FCFA</span></div>
      <div class="footer"><span>Imprimé le : ${new Date().toLocaleDateString('fr-FR')}</span>
      <span>Signature de l'Économe : ________________</span></div>
      <script>window.onload=function(){window.print();}</script></body></html>`;
    const f = window.open('','_blank'); f.document.write(html); f.document.close();
  };

  const imprimerBilanJournalier = () => {
    const elevesDuJour = Object.values(paiements).filter(p => p.date_paiement && p.date_paiement.split('T')[0] === dateBilan);
    const idsPayesDuJour = new Set(elevesDuJour.map(p => p.eleve_id));
    const liste = eleves.filter(e => idsPayesDuJour.has(e.id)).sort((a,b) => (a.nom||'').localeCompare(b.nom||''));
    const dateAffichee = new Date(dateBilan+'T00:00:00').toLocaleDateString('fr-FR',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
    const lignes = liste.map((e,i) => `
      <tr><td style="padding:6px 5px;text-align:center;border:1px solid #ccc;">${i+1}</td>
      <td style="padding:6px 5px;border:1px solid #ccc;">${e.matricule||''}</td>
      <td style="padding:6px 5px;font-weight:bold;border:1px solid #ccc;">${e.nom||''}</td>
      <td style="padding:6px 5px;border:1px solid #ccc;">${e.prenom||''}</td>
      <td style="padding:6px 5px;text-align:center;border:1px solid #ccc;">${e.classe||''}</td>
      <td style="padding:6px 5px;text-align:center;font-weight:bold;color:green;border:1px solid #ccc;">${MONTANT_INSCRIPTION} FCFA</td></tr>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Bilan ${dateBilan}</title>
      <style>body{font-family:Arial,sans-serif;margin:20px;font-size:12px;}
      .entete{text-align:center;margin-bottom:20px;border-bottom:2px solid #000;padding-bottom:12px;}
      table{width:100%;border-collapse:collapse;margin-top:10px;}thead{background-color:#1e3a5f;color:white;}
      thead th{padding:8px 5px;border:1px solid #ccc;font-size:11px;}
      .recap{margin-top:20px;padding:12px 16px;background:#f0fdf4;border:2px solid #16a34a;border-radius:8px;}
      .signatures{margin-top:40px;display:flex;justify-content:space-between;}
      .sig-box{text-align:center;width:45%;}.sig-line{border-bottom:1px solid #000;height:50px;margin-top:8px;}</style></head><body>
      <div class="entete"><h2>${ETABLISSEMENT}</h2><h1>BILAN JOURNALIER DES DROITS D'INSCRIPTION</h1>
      <div style="font-size:13px;font-weight:bold;">Journée du : ${dateAffichee}</div>
      <p style="font-size:11px;color:#555;">Année scolaire : ${ANNEE_SCOLAIRE}</p></div>
      ${liste.length===0?'<p style="text-align:center;color:#9ca3af;">Aucun paiement ce jour.</p>':
      `<table><thead><tr><th>N</th><th>Matricule</th><th>Nom</th><th>Prénom</th><th>Classe</th><th>Montant</th></tr></thead>
      <tbody>${lignes}</tbody></table>`}
      <div class="recap"><div style="font-size:13px;font-weight:bold;color:#166534;margin-bottom:8px;">RÉCAPITULATIF DE LA JOURNÉE</div>
      <div style="display:flex;justify-content:space-between;"><span>Nombre d'élèves :</span><span><strong>${liste.length}</strong></span></div>
      <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:bold;color:#166534;margin-top:8px;padding-top:8px;border-top:2px solid #16a34a;">
      <span>TOTAL ENCAISS? CE JOUR :</span><span>${(liste.length*MONTANT_INSCRIPTION).toLocaleString()} FCFA</span></div></div>
      <div class="signatures">
      <div class="sig-box"><p style="font-weight:bold;">L'Économe / Responsable Financier</p><div class="sig-line"></div></div>
      <div class="sig-box"><p style="font-weight:bold;">Le Directeur</p><div class="sig-line"></div></div></div>
      <p style="text-align:right;font-size:10px;color:#9ca3af;margin-top:20px;">Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
      <script>window.onload=function(){window.print();}</script></body></html>`;
    const f = window.open('','_blank'); f.document.write(html); f.document.close();
  };

  const imprimerRecuPaiement = (eleve) => {
    const paiement = paiements[eleve.id];
    const formatDate = (dateStr) => {
      if (!dateStr) return new Date().toLocaleDateString('fr-FR', {day:'2-digit',month:'long',year:'numeric'});
      // Extraire uniquement la partie YYYY-MM-DD (avant le T ou l'espace)
      const dateOnly = dateStr.split('T')[0].split(' ')[0];
      const [year, month, day] = dateOnly.split('-');
      if (!year || !month || !day) return new Date().toLocaleDateString('fr-FR', {day:'2-digit',month:'long',year:'numeric'});
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        .toLocaleDateString('fr-FR', {day:'2-digit', month:'long', year:'numeric'});
    };
    const datePaiement = formatDate(paiement?.date_paiement);
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Reçu ${eleve.matricule}</title>
    <style>
      body{font-family:Arial,sans-serif;margin:0;padding:0;background:#f0f4f8;}
      .page{width:148mm;min-height:105mm;margin:10mm auto;background:white;border:2px solid #1e3a5f;border-radius:8px;padding:0;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.15);}
      .entete{background:linear-gradient(135deg,#1e3a5f,#2563eb);color:white;padding:10px 16px;display:flex;align-items:center;gap:12px;}
      .entete-texte h2{margin:0;font-size:11px;font-weight:bold;}
      .entete-texte p{margin:2px 0 0;font-size:9px;opacity:0.85;}
      .titre-recu{text-align:center;background:#e8f0fe;padding:6px;font-size:12px;font-weight:bold;color:#1e3a5f;letter-spacing:1px;border-bottom:2px solid #1e3a5f;}
      .corps{display:flex;gap:16px;padding:14px 16px;align-items:flex-start;}
      .photo{width:70px;height:90px;object-fit:cover;border-radius:6px;border:2px solid #1e3a5f;flex-shrink:0;}
      .photo-placeholder{width:70px;height:90px;background:#e2e8f0;border-radius:6px;border:2px solid #1e3a5f;display:flex;align-items:center;justify-content:center;font-size:2rem;flex-shrink:0;}
      .infos{flex:1;}
      .nom{font-size:14px;font-weight:bold;color:#1e3a5f;margin:0 0 2px;}
      .classe{font-size:11px;color:#2563eb;font-weight:600;margin:0 0 8px;}
      .ligne{display:flex;justify-content:space-between;font-size:10px;margin:3px 0;padding:3px 0;border-bottom:1px dashed #e2e8f0;}
      .ligne span:first-child{color:#64748b;}
      .ligne span:last-child{font-weight:600;color:#1e3a5f;}
      .montant-box{background:#dcfce7;border:2px solid #16a34a;border-radius:8px;padding:8px 12px;margin:10px 16px;display:flex;justify-content:space-between;align-items:center;}
      .montant-label{font-size:11px;color:#166534;font-weight:600;}
      .montant-val{font-size:18px;font-weight:bold;color:#166534;}
      .phrase{font-size:9px;color:#374151;font-style:italic;text-align:center;padding:6px 16px;line-height:1.5;background:#f8fafc;border-top:1px solid #e2e8f0;}
      .signatures{display:flex;justify-content:space-between;padding:8px 24px 10px;border-top:1px solid #e2e8f0;}
      .sig{text-align:center;font-size:9px;color:#374151;}
      .sig-line{border-bottom:1px solid #374151;height:28px;margin-top:4px;width:80px;}
      .badge-ok{display:inline-block;background:#dcfce7;color:#166534;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:bold;}
      @media print{body{background:white;}.page{box-shadow:none;border:2px solid #1e3a5f;margin:5mm auto;}}
    </style></head><body>
    <div class="page">
      <div class="entete">
        <div style="font-size:1.8rem;"></div>
        <div class="entete-texte">
          <h2>${ETABLISSEMENT}</h2>
          <p>Année scolaire : ${ANNEE_SCOLAIRE}</p>
        </div>
      </div>
      <div class="titre-recu"> REÇU DE PAIEMENT  DROITS D'INSCRIPTION</div>
      <div class="corps">
        ${eleve.photo_url
          ? `<img src="${eleve.photo_url}" class="photo" onerror="this.style.display='none'"/>`
          : `<div class="photo-placeholder"></div>`}
        <div class="infos">
          <div class="nom">${eleve.nom} ${eleve.prenom}</div>
          <div class="classe">Classe : ${eleve.classe}</div>
          <div class="ligne"><span>Matricule :</span><span>${eleve.matricule||'-'}</span></div>
          <div class="ligne"><span>Date de paiement :</span><span>${datePaiement}</span></div>
          <div class="ligne"><span>Statut :</span><span><span class="badge-ok"> PAYÉ</span></span></div>
        </div>
      </div>
      <div class="montant-box">
        <span class="montant-label"> Montant reçu :</span>
        <span class="montant-val">${MONTANT_INSCRIPTION.toLocaleString()} FCFA</span>
      </div>
      <div class="phrase">
        Le présent reçu certifie que l'élève <strong>${eleve.nom} ${eleve.prenom}</strong> s'est acquitté du droit d'inscription pour l'année scolaire <strong>${ANNEE_SCOLAIRE}</strong>.<br/>
        Ce document fait foi auprès de l'administration scolaire et des parents ou tuteurs légaux.
      </div>
      <div class="signatures">
        <div class="sig"><div>L'Économe</div><div class="sig-line"></div></div>
        <div class="sig" style="text-align:center;font-size:9px;color:#9ca3af;">N : ${eleve.id}-${new Date().getFullYear()}</div>
        <div class="sig"><div>Le Directeur</div><div class="sig-line"></div></div>
      </div>
    </div>
    <script>window.onload=function(){window.print();}</script></body></html>`;
    const f = window.open('','_blank'); f.document.write(html); f.document.close();
  };

  const imprimerTrombinoscope = () => {
    const elevesClasse = classeTrombi
      ? eleves.filter(e => e.classe === classeTrombi && e.photo_url)
      : eleves.filter(e => e.photo_url);
    const cartes = elevesClasse.map(e => `
      <div style="display:inline-block;width:130px;margin:8px;text-align:center;vertical-align:top;border:1px solid #ddd;border-radius:8px;padding:8px;background:white;">
        <img src="${e.photo_url}" style="width:110px;height:140px;object-fit:cover;border-radius:6px;" onerror="this.style.display='none'"/>
        <div style="margin-top:6px;font-weight:bold;font-size:11px;">${e.nom}</div>
        <div style="font-size:10px;color:#555;">${e.prenom}</div>
        <div style="font-size:10px;color:#2563eb;font-weight:600;">${e.classe}</div>
      </div>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Trombinoscope</title>
      <style>body{font-family:Arial,sans-serif;margin:20px;}@media print{body{margin:10px;}}
      .entete{text-align:center;margin-bottom:20px;border-bottom:2px solid #000;padding-bottom:10px;}</style></head><body>
      <div class="entete"><h2>${ETABLISSEMENT}</h2><h1>TROMBINOSCOPE${classeTrombi?'  '+classeTrombi:''}</h1>
      <p>Année scolaire : ${ANNEE_SCOLAIRE}  ${elevesClasse.length} élève(s)</p></div>
      <div>${cartes}</div>
      <script>window.onload=function(){window.print();}</script></body></html>`;
    const f = window.open('','_blank'); f.document.write(html); f.document.close();
  };

  // Écran de chargement initial
  if (!appChargee) {
    return (
      <div style={{
        minHeight:'100vh',
        background:'linear-gradient(135deg, #1e3a5f 0%, #2563eb 60%, #0ea5e9 100%)',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontFamily:'Segoe UI, Arial, sans-serif'
      }}>
        <div style={{
          background:'white', borderRadius:'24px', padding:'3rem 3.5rem',
          textAlign:'center', width:'360px',
          boxShadow:'0 20px 60px rgba(0,0,0,0.3)'
        }}>
          {/* Logo animé */}
          <div style={{
            fontSize:'4rem', marginBottom:'0.5rem',
            animation:'pulse 1.5s ease-in-out infinite'
          }}></div>
          <h1 style={{
            margin:'0 0 0.25rem', color:'#1e3a5f',
            fontSize:'2rem', fontWeight:'800', letterSpacing:'1px'
          }}>WebScool</h1>
          <p style={{
            color:'#64748b', fontSize:'0.85rem',
            margin:'0 0 2rem'
          }}>Collège Moderne Bouaké Dar Es Salam</p>

          {/* Barre de progression */}
          <div style={{
            background:'#e2e8f0', borderRadius:'999px',
            height:'12px', overflow:'hidden', marginBottom:'1rem'
          }}>
            <div style={{
              background:'linear-gradient(90deg, #2563eb, #0ea5e9)',
              height:'100%',
              width:`${progressChargement}%`,
              borderRadius:'999px',
              transition:'width 0.4s ease',
              boxShadow:'0 0 8px rgba(37,99,235,0.5)'
            }}/>
          </div>

          {/* Pourcentage */}
          <div style={{
            fontSize:'1.5rem', fontWeight:'bold',
            color:'#2563eb', marginBottom:'0.5rem'
          }}>{progressChargement}%</div>

          {/* Message */}
          <p style={{
            color: messageChargement.includes('') ? '#166534' : '#475569',
            fontSize:'0.9rem', fontWeight:'600',
            margin:'0',
            minHeight:'1.5rem'
          }}>{messageChargement}</p>

          {/* Points d'animation */}
          {!messageChargement.includes('') && (
            <div style={{marginTop:'1.5rem', display:'flex', justifyContent:'center', gap:'6px'}}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width:'8px', height:'8px',
                  borderRadius:'50%', background:'#2563eb',
                  animation:`bounce 1.2s ease-in-out ${i*0.2}s infinite`
                }}/>
              ))}
            </div>
          )}

          <p style={{
            color:'#94a3b8', fontSize:'0.75rem',
            marginTop:'1.5rem', marginBottom:'0'
          }}>
             Le serveur se réveille, merci de patienter...
          </p>
        </div>

        {/* Styles d'animation inline */}
        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.15); }
          }
          @keyframes bounce {
            0%, 80%, 100% { transform: translateY(0); opacity:0.4; }
            40% { transform: translateY(-8px); opacity:1; }
          }
        `}</style>
      </div>
    );
  }

  if (!connecte) {
    return (
      <div style={s.loginPage}>
        <div style={s.loginBox}>
          <div style={{fontSize:'3rem',marginBottom:'0.5rem'}}></div>
          <h1 style={s.loginTitre}>WebScool</h1>
          <p style={{color:'#666',marginBottom:'1.5rem',fontSize:'0.9rem'}}>Gestion des élèves</p>
          <input type="password" placeholder="Mot de passe" value={mdp}
            onChange={e=>setMdp(e.target.value)} onKeyPress={e=>e.key==='Enter'&&seConnecter()}
            style={s.loginInput} />
          {erreurMdp && <p style={{color:'red',fontSize:'0.85rem'}}>{erreurMdp}</p>}
          <button onClick={seConnecter} style={s.loginBtn}>Connexion</button>
        </div>
      </div>
    );
  }

  const elevesClasse = classeFiltre ? eleves : [];
  const moyenneClasseFiltre = elevesClasse.length > 0
    ? (() => { const v=elevesClasse.filter(e=>e.moyenne_generale&&parseFloat(e.moyenne_generale)>0);
        return v.length>0?(v.reduce((s,e)=>s+parseFloat(e.moyenne_generale),0)/v.length).toFixed(2):'-'; })() : '-';
  const classes3eme = classes.filter(c => c.toLowerCase().startsWith('3'));
  const totalAdmisBepc = eleves.filter(e => classes3eme.some(c=>c===e.classe) && e.decision_fin_annee==='Admis').length;
  const totalPayes = Object.keys(paiements).length;
  const totalNonPayes = eleves.length - totalPayes;
  const montantTotal = totalPayes * MONTANT_INSCRIPTION;
  const elevesAffichesInscription = elevesInscription;
  const payesDansVue = elevesAffichesInscription.filter(e=>paiements[e.id]).length;
  const nonPayesDansVue = elevesAffichesInscription.length - payesDansVue;
  const elevesDuJourIds = new Set(Object.values(paiements).filter(p=>p.date_paiement&&p.date_paiement.split('T')[0]===dateBilan).map(p=>p.eleve_id));
  const nbPayesDuJour = elevesDuJourIds.size;
  const montantDuJour = nbPayesDuJour * MONTANT_INSCRIPTION;

  // Trombinoscope data
  const elevesTrombi = classeTrombi ? eleves.filter(e=>e.classe===classeTrombi) : eleves;
  const avecPhoto = elevesTrombi.filter(e=>e.photo_url).length;

  return (
    <div style={s.app}>
      <div style={s.header}>
        <div style={s.headerLeft}>
          <span style={{fontSize:'1.8rem'}}></span>
          <div>
            <div style={s.headerTitre}>WebScool</div>
            <div style={s.headerSous}>{eleves.length} élèves  {ETABLISSEMENT}</div>
          </div>
        </div>
        <button onClick={()=>setConnecte(false)} style={s.btnDeconnecter}>Déconnexion</button>
      </div>

      <div style={s.nav}>
        {[['liste','Eleves'],['formulaire','Ajouter'],['importer','Importer'],
          ['bepc','BEPC'],['inscription','Inscription'],['photos','Photos'],['educateurs',' Éducateurs'],['controle',' Contrôle']].map(([id,label])=>(
          <button key={id} onClick={()=>{setOnglet(id);if(id==='formulaire')ouvrirFormulaire();}}
            style={onglet===id?s.navBtnActif:s.navBtn}>{label}</button>
        ))}
      </div>

      {/* ===== LISTE ===== */}
      {onglet==='liste' && (
        <div style={s.contenu}>
          <div style={s.filtres}>
            <input placeholder=" Rechercher par nom ou matricule..." value={recherche}
              onChange={e=>rechercherEleves(e.target.value)} style={s.inputRecherche} />
            <select value={classeFiltre} onChange={e=>filtrerParClasse(e.target.value)} style={s.selectClasse}>
              <option value="">Toutes les classes</option>
              {classes.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            {classeFiltre && <button onClick={imprimerListeClasse} style={s.btnImprimerClasse}> Imprimer</button>}
          </div>
          {classeFiltre && elevesClasse.length > 0 && (
            <div style={s.statsClasse}>
              <span>{classeFiltre}</strong></span>
              <span> Total : <strong>{elevesClasse.length}</strong></span>
              <span>Moy. : <strong>{moyenneClasseFiltre}</strong></span>
              <span style={{color:'#166534'}}> Admis : <strong>{elevesClasse.filter(e=>e.decision_fin_annee==='Admis').length}</strong></span>
              <span style={{color:'#92400e'}}>Redoublants : <strong>{elevesClasse.filter(e=>e.decision_fin_annee==='Redoublant').length}</strong></span>
              <span style={{color:'#991b1b'}}<strong>❌ Exclus : <strong>{elevesClasse.filter(e=>e.decision_fin_annee==='Exclu').length}</strong></span>
              <span>Taux : <strong>{Math.round(elevesClasse.filter(e=>e.decision_fin_annee==='Admis').length/elevesClasse.length*100)}%</strong></span>
            </div>
          )}
          <p style={s.compteur}>{eleves.length} élève(s){classeFiltre?` en ${classeFiltre}`:''}</p>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead style={s.tableHead}>
                <tr>{['#','Photo','Matricule','Nom','Prénom','Classe','Parent','Téléphone','T1','T2','T3','MGA','Décision','Actions'].map(h=>(
                  <th key={h} style={s.th}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {eleves.map((e,i)=>(
                  <tr key={e.id} style={i%2===0?s.trPair:s.trImpair}>
                    <td style={s.td}>{i+1}</td>
                    <td style={s.td}>
                      {e.photo_url
                        ? <img src={e.photo_url} alt="" style={{width:'36px',height:'45px',objectFit:'cover',borderRadius:'4px',border:'1px solid #ddd'}}/>
                        : <div style={{width:'36px',height:'45px',background:'#e2e8f0',borderRadius:'4px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem'}}></div>
                      }
                    </td>
                    <td style={s.td}>{e.matricule}</td>
                    <td style={s.td}><strong>{e.nom}</strong></td>
                    <td style={s.td}>{e.prenom}</td>
                    <td style={s.td}><span style={s.badgeClasse}>{e.classe}</span></td>
                    <td style={s.td}>{e.nom_parent}</td>
                    <td style={s.td}>{e.telephone1&&<a href={`tel:${e.telephone1}`} style={s.telLink}>Tel: {e.telephone1}</a>}</td>
                    <td style={s.td}>{e.moyenne_t1||'-'}</td>
                    <td style={s.td}>{e.moyenne_t2||'-'}</td>
                    <td style={s.td}>{e.moyenne_t3||'-'}</td>
                    <td style={s.td}><strong>{e.moyenne_generale||'-'}</strong></td>
                    <td style={s.td}>
                      <span style={e.decision_fin_annee==='Admis'?s.badgeAdmis:e.decision_fin_annee==='Redoublant'?s.badgeRedoublant:e.decision_fin_annee==='Exclu'?s.badgeExclu:{}}>
                        {e.decision_fin_annee||'-'}
                      </span>
                    </td>
                    <td style={s.td}>
                      <button onClick={()=>ouvrirFiche(e)} style={s.btnVoir}></button>
                      <button onClick={()=>{setEleveSelectionne(e);ouvrirFormulaire(e);}} style={s.btnModifier}>✏️</button>
                      <button onClick={()=>supprimerEleve(e.id)} style={s.btnSupprimer}>Sup</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== FICHE ===== */}
      {onglet==='fiche' && eleveSelectionne && (
        <div style={s.contenu}>
          <div style={{marginBottom:'1rem'}}>
            <button onClick={()=>setOnglet('liste')} style={s.btnRetour}>← Retour</button>
            <button onClick={()=>ouvrirFormulaire(eleveSelectionne)} style={s.btnModifier2}>✏️ Modifier</button>
          </div>
          <div style={s.ficheCard}>
            <div style={s.ficheHeader}>
              <div style={s.ficheAvatar}>
                {eleveSelectionne.photo_url
                  ? <img src={eleveSelectionne.photo_url} alt="" style={{width:'100px',height:'130px',objectFit:'cover',borderRadius:'8px',border:'3px solid #dbeafe'}}/>
                  : <span style={{fontSize:'3rem'}}></span>
                }
              </div>
              <div>
                <h2 style={s.ficheNom}>{eleveSelectionne.nom} {eleveSelectionne.prenom}</h2>
                <p style={s.ficheClasse}>Classe : {eleveSelectionne.classe}</p>
                <p style={s.ficheMatricule}>Matricule : {eleveSelectionne.matricule}</p>
                <p style={{margin:'4px 0'}}>Inscription : {paiements[eleveSelectionne.id]
                  ? <span style={s.badgeAdmis}> Payé</span>
                  : <span style={s.badgeExclu}>❌ Non payé</span>}</p>
                {paiements[eleveSelectionne.id] && (
                  <button onClick={()=>imprimerRecuPaiement(eleveSelectionne)} style={{marginTop:'8px',background:'#0f766e',color:'white',border:'none',borderRadius:'8px',padding:'6px 14px',cursor:'pointer',fontWeight:'600',fontSize:'0.9rem'}}>
                    ? Imprimer le reçu
                  </button>
                )}
              </div>
            </div>
            <div style={s.ficheGrid}>
              <div style={s.ficheSection}>
                <h3 style={s.sectionTitre}> Contact parent</h3>
                <p><strong>Nom :</strong> {eleveSelectionne.nom_parent||'-'}</p>
                <p><strong>Tél 1 :</strong> {eleveSelectionne.telephone1?<a href={`tel:${eleveSelectionne.telephone1}`} style={s.telLink}>{eleveSelectionne.telephone1}</a>:'-'}</p>
                <p><strong>Tél 2 :</strong> {eleveSelectionne.telephone2?<a href={`tel:${eleveSelectionne.telephone2}`} style={s.telLink}>{eleveSelectionne.telephone2}</a>:'-'}</p>
              </div>
              <div style={s.ficheSection}>
                <h3 style={s.sectionTitre}>Résultats scolaires</h3>
                <p><strong>T1 :</strong> {eleveSelectionne.moyenne_t1||'-'}</p>
                <p><strong>T2 :</strong> {eleveSelectionne.moyenne_t2||'-'}</p>
                <p><strong>T3 :</strong> {eleveSelectionne.moyenne_t3||'-'}</p>
                <p><strong>MGA :</strong> <span style={{fontWeight:'bold',fontSize:'1.1rem'}}>{eleveSelectionne.moyenne_generale||'-'}</span></p>
                <p><strong>Décision :</strong> <span style={eleveSelectionne.decision_fin_annee==='Admis'?s.badgeAdmis:eleveSelectionne.decision_fin_annee==='Redoublant'?s.badgeRedoublant:s.badgeExclu}>{eleveSelectionne.decision_fin_annee||'-'}</span></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== FORMULAIRE ===== */}
      {onglet==='formulaire' && (
        <div style={s.contenu}>
          <h2 style={s.titrePage}>{modeFormulaire==='ajouter'?'Ajouter un élève':'? Modifier un élève'}</h2>
          <div style={s.formCard}>
            <h3 style={s.sectionTitre}>Informations générales</h3>
            <div style={s.formGrid}>
              <div><label style={s.label}>Matricule</label><input value={formulaire.matricule} onChange={e=>setFormulaire({...formulaire,matricule:e.target.value})} style={s.input}/></div>
              <div><label style={s.label}>Nom *</label><input value={formulaire.nom} onChange={e=>setFormulaire({...formulaire,nom:e.target.value})} style={s.input}/></div>
              <div><label style={s.label}>Prénom *</label><input value={formulaire.prenom} onChange={e=>setFormulaire({...formulaire,prenom:e.target.value})} style={s.input}/></div>
              <div><label style={s.label}>Classe *</label>
                <input value={formulaire.classe} onChange={e=>setFormulaire({...formulaire,classe:e.target.value})} style={s.input} list="liste-classes"/>
                <datalist id="liste-classes">{classes.map(c=><option key={c} value={c}/>)}</datalist></div>
            </div>
            <h3 style={{...s.sectionTitre,marginTop:'1.5rem'}}> Contact parent</h3>
            <div style={s.formGrid}>
              <div><label style={s.label}>Nom parent</label><input value={formulaire.nom_parent} onChange={e=>setFormulaire({...formulaire,nom_parent:e.target.value})} style={s.input}/></div>
              <div><label style={s.label}>Téléphone 1</label><input value={formulaire.telephone1} onChange={e=>setFormulaire({...formulaire,telephone1:e.target.value})} style={s.input} type="tel"/></div>
              <div><label style={s.label}>Téléphone 2</label><input value={formulaire.telephone2} onChange={e=>setFormulaire({...formulaire,telephone2:e.target.value})} style={s.input} type="tel"/></div>
            </div>
            {messageFormulaire&&<p style={messageFormulaire.includes('')?s.succes:s.erreur}>{messageFormulaire}</p>}
            <button onClick={sauvegarderEleve} style={s.btnSauvegarder}>{modeFormulaire==='ajouter'?'Ajouter':' Sauvegarder'}</button>
          </div>
        </div>
      )}

      {/* ===== IMPORTER ===== */}
      {onglet==='importer' && (
        <div style={s.contenu}>
          <h2 style={s.titrePage}> Import des moyennes trimestrielles</h2>
          <div style={s.importCard}>
            <div style={s.trimestreBtns}>
              {['T1','T2','T3'].map(t=>(
                <button key={t} onClick={()=>setTrimestreActif(t)} style={trimestreActif===t?s.trimestreBtnActif:s.trimestreBtn}>Trimestre {t}</button>
              ))}
            </div>
            <p style={s.importInfo}>Fichier Excel pour <strong>{trimestreActif}</strong></p>
            <input type="file" accept=".xlsx,.xls" onChange={e=>setFichierExcel(e.target.files[0])} style={{margin:'1rem 0'}}/>
            <br/>
            <button onClick={importerTrimestre} disabled={importEnCours} style={s.btnImportExcel}>
              {importEnCours?` Import ${trimestreActif}...`:`Importer ${trimestreActif}`}
            </button>
            {importStatus&&<p style={importStatus.includes('')?s.succes:s.erreur}>{importStatus}</p>}
            <hr style={{margin:'2rem 0',border:'none',borderTop:'2px solid #e2e8f0'}}/>
            <h3 style={s.sectionTitre}>⚙️ Calcul automatique MGA + DFA</h3>
            <button onClick={calculerMoyennesAnnuelles} disabled={calcEnCours} style={s.btnCalculer}>
              {calcEnCours?' Calcul...':'⚙️ Calculer MGA + DFA'}
            </button>
            {calcStatus&&<p style={calcStatus.includes('')?s.succes:s.erreur}>{calcStatus}</p>}
          </div>
        </div>
      )}

      {/* ===== BEPC ===== */}
      {onglet==='bepc' && (
        <div style={s.contenu}>
          <h2 style={s.titrePage}> Liste des Admis au BEPC</h2>
          <div style={s.importCard}>
            <div style={s.bepcInfo}>
              <p>Classes 3ème : <strong>{classes3eme.join(', ')||'Aucune'}</strong></p>
              <p style={{fontSize:'1.3rem',fontWeight:'bold',color:'#166534'}}> Total : {totalAdmisBepc} admis</p>
            </div>
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead style={{...s.tableHead,background:'#166534'}}>
                  <tr>{['#','Matricule','Nom','Prénom','Classe','MGA','Parent','Téléphone'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {eleves.filter(e=>classes3eme.some(c=>c===e.classe)&&e.decision_fin_annee==='Admis')
                    .sort((a,b)=>(parseFloat(b.moyenne_generale)||0)-(parseFloat(a.moyenne_generale)||0))
                    .map((e,i)=>(
                    <tr key={e.id} style={i%2===0?s.trPair:s.trImpair}>
                      <td style={s.td}>{i+1}</td><td style={s.td}>{e.matricule}</td>
                      <td style={s.td}><strong>{e.nom}</strong></td><td style={s.td}>{e.prenom}</td>
                      <td style={s.td}><span style={s.badgeClasse}>{e.classe}</span></td>
                      <td style={s.td}><strong style={{color:'green'}}>{e.moyenne_generale||'-'}</strong></td>
                      <td style={s.td}>{e.nom_parent||'-'}</td>
                      <td style={s.td}>{e.telephone1?<a href={`tel:${e.telephone1}`} style={s.telLink}>Tel: {e.telephone1}</a>:'-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <br/>
            <button onClick={imprimerListeBEPC} style={{...s.btnCalculer,background:'#166534'}}> Imprimer liste BEPC</button>
          </div>
        </div>
      )}

      {/* ===== INSCRIPTION ===== */}
      {onglet==='inscription' && (
        <div style={s.contenu}>
          <h2 style={s.titrePage}> Droits d'inscription  {ANNEE_SCOLAIRE}</h2>
          <div style={s.sousNav}>
            <button onClick={()=>setSousOngletInscription('encaissement')} style={sousOngletInscription==='encaissement'?s.sousNavActif:s.sousNavBtn}> Encaissement</button>
            <button onClick={()=>setSousOngletInscription('bilan')} style={sousOngletInscription==='bilan'?s.sousNavActif:s.sousNavBtn}>Bilan journalier</button>
          </div>
          {sousOngletInscription==='encaissement' && (
            <>
              <div style={s.statsInscription}>
                <div style={s.statBox}><div style={s.statNum}>{totalPayes}</div><div style={s.statLabel}> Ont payé</div></div>
                <div style={{...s.statBox,background:'#fee2e2'}}><div style={{...s.statNum,color:'#991b1b'}}>{totalNonPayes}</div><div style={s.statLabel}>❌ Non payés</div></div>
                <div style={{...s.statBox,background:'#dcfce7'}}><div style={{...s.statNum,color:'#166534'}}>{montantTotal.toLocaleString()}</div><div style={s.statLabel}> FCFA encaissés</div></div>
                <div style={{...s.statBox,background:'#fef3c7'}}><div style={{...s.statNum,color:'#92400e'}}>{(totalNonPayes*MONTANT_INSCRIPTION).toLocaleString()}</div><div style={s.statLabel}> FCFA restants</div></div>
              </div>
              <div style={s.filtres}>
                <input placeholder=" Rechercher..." value={rechercheInscription} onChange={e=>rechercherInscription(e.target.value)} style={s.inputRecherche}/>
                <select value={classeFiltreInscription} onChange={e=>filtrerInscriptionParClasse(e.target.value)} style={s.selectClasse}>
                  <option value="">Toutes les classes</option>
                  {classes.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={imprimerListePayes} style={s.btnImprimerClasse}> Imprimer liste des payés</button>
              </div>
              {messageInscription&&<div style={messageInscription.includes('')?s.alertSucces:s.alertErreur}>{messageInscription}</div>}
              <p style={s.compteur}>{elevesAffichesInscription.length} élève(s)   {payesDansVue} | ? {nonPayesDansVue}</p>
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead style={s.tableHead}>
                    <tr>{['#','Matricule','Nom','Prénom','Classe','Parent','Statut','Action'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {elevesAffichesInscription.map((e,i)=>(
                      <tr key={e.id} style={i%2===0?s.trPair:s.trImpair}>
                        <td style={s.td}>{i+1}</td><td style={s.td}>{e.matricule}</td>
                        <td style={s.td}><strong>{e.nom}</strong></td><td style={s.td}>{e.prenom}</td>
                        <td style={s.td}><span style={s.badgeClasse}>{e.classe}</span></td>
                        <td style={s.td}>{e.nom_parent||'-'}</td>
                        <td style={s.td}>{paiements[e.id]?<span style={s.badgeAdmis}> Payé  {paiements[e.id].date_paiement?new Date(paiements[e.id].date_paiement).toLocaleDateString('fr-FR'):''}</span>:<span style={s.badgeExclu}>❌ Non payé</span>}</td>
                        <td style={s.td}>
                          <button onClick={()=>togglePaiement(e)} style={paiements[e.id]?s.btnAnnulerPaiement:s.btnPayer}>{paiements[e.id]?'❌ Annuler':' Encaisser'}</button>
                          {paiements[e.id] && <button onClick={()=>imprimerRecuPaiement(e)} style={{...s.btnVoir,marginLeft:'4px',background:'#0f766e'}}>? Reçu</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {sousOngletInscription==='bilan' && (
            <div style={s.bilanCard}>
              <h3 style={s.sectionTitre}>Bilan financier journalier</h3>
              <div style={s.bilanDateRow}>
                <label style={{fontWeight:'600',color:'#1e3a5f'}}>Date :</label>
                <input type="date" value={dateBilan} onChange={e=>setDateBilan(e.target.value)} style={s.inputDate}/>
              </div>
              <div style={s.bilanResume}>
                <div style={s.bilanResumeItem}><div style={s.bilanResumeNum}>{nbPayesDuJour}</div><div style={s.bilanResumeLabel}>élève(s) payé(s)</div></div>
                <div style={{...s.bilanResumeItem,background:'#dcfce7',borderColor:'#16a34a'}}><div style={{...s.bilanResumeNum,color:'#166534'}}>{montantDuJour.toLocaleString()}</div><div style={s.bilanResumeLabel}>FCFA encaissés</div></div>
              </div>
              {nbPayesDuJour===0?<div style={s.bilanVide}><p>Aucun paiement ce jour</p></div>:(
                <div style={s.tableWrap}>
                  <table style={s.table}>
                    <thead style={{...s.tableHead,background:'#0f766e'}}>
                      <tr>{['#','Matricule','Nom','Prénom','Classe','Montant'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {eleves.filter(e=>elevesDuJourIds.has(e.id)).sort((a,b)=>(a.nom||'').localeCompare(b.nom||'')).map((e,i)=>(
                        <tr key={e.id} style={i%2===0?s.trPair:s.trImpair}>
                          <td style={s.td}>{i+1}</td><td style={s.td}>{e.matricule}</td>
                          <td style={s.td}><strong>{e.nom}</strong></td><td style={s.td}>{e.prenom}</td>
                          <td style={s.td}><span style={s.badgeClasse}>{e.classe}</span></td>
                          <td style={s.td}><strong style={{color:'#166534'}}>{MONTANT_INSCRIPTION} FCFA</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <br/>
              <button onClick={imprimerBilanJournalier} style={s.btnBilanImprimer}> Imprimer le bilan journalier</button>
            </div>
          )}
        </div>
      )}

      {/* ===== PHOTOS ===== */}
      {onglet==='photos' && (
        <div style={s.contenu}>
          <h2 style={s.titrePage}> Gestion des photos</h2>
          <div style={s.sousNav}>
            <button onClick={()=>setSousOngletPhotos('import')} style={sousOngletPhotos==='import'?{...s.sousNavActif,background:'#7c3aed',borderColor:'#7c3aed'}:s.sousNavBtn}> Import groupé</button>
            <button onClick={()=>setSousOngletPhotos('trombi')} style={sousOngletPhotos==='trombi'?{...s.sousNavActif,background:'#7c3aed',borderColor:'#7c3aed'}:s.sousNavBtn}> Trombinoscope</button>
            <button onClick={()=>setSousOngletPhotos('recherche')} style={sousOngletPhotos==='recherche'?{...s.sousNavActif,background:'#7c3aed',borderColor:'#7c3aed'}:s.sousNavBtn}> Recherche photo</button>
          </div>

          {/* IMPORT GROUPÉ */}
          {sousOngletPhotos==='import' && (
            <div style={s.importCard}>
              <h3 style={s.sectionTitre}> Import groupé de photos</h3>
              <div style={{background:'#faf5ff',border:'2px dashed #7c3aed',borderRadius:'12px',padding:'2rem',textAlign:'center',marginBottom:'1.5rem'}}>
                <div style={{fontSize:'3rem',marginBottom:'0.5rem'}}></div>
                <p style={{fontWeight:'600',color:'#5b21b6',marginBottom:'0.5rem'}}>Sélectionnez toutes vos photos d'un coup</p>
                <p style={{color:'#7c3aed',fontSize:'0.85rem',marginBottom:'1rem'}}>Les fichiers doivent être nommés avec le matricule : <strong>21421986V.JPG</strong></p>
                <input ref={fileInputRef} type="file" accept="image/*" multiple
                  onChange={e=>importerPhotosGroupees(e.target.files)}
                  style={{display:'none'}}/>
                <button onClick={()=>fileInputRef.current.click()} disabled={uploadEnCours}
                  style={{background:'#7c3aed',color:'white',border:'none',borderRadius:'8px',padding:'0.75rem 2rem',cursor:'pointer',fontSize:'1rem',fontWeight:'600'}}>
                  {uploadEnCours?' Upload en cours...':'Choisir les photos'}
                </button>
              </div>
              {uploadEnCours && (
                <div style={{marginBottom:'1rem'}}>
                  <div style={{background:'#e9d5ff',borderRadius:'8px',height:'12px',overflow:'hidden'}}>
                    <div style={{background:'#7c3aed',height:'100%',width:`${uploadProgress}%`,transition:'width 0.3s'}}></div>
                  </div>
                  <p style={{textAlign:'center',color:'#5b21b6',marginTop:'0.5rem'}}>{uploadProgress}%</p>
                </div>
              )}
              {uploadStatus && <p style={uploadStatus.includes('')?s.succes:uploadStatus.includes('')?{color:'#5b21b6',fontWeight:'600'}:s.erreur}>{uploadStatus}</p>}
              <div style={{background:'#f0fdf4',borderRadius:'8px',padding:'1rem',marginTop:'1rem'}}>
                <p style={{fontWeight:'600',color:'#166534',margin:'0 0 0.5rem'}}>Statistiques photos :</p>
                <p style={{margin:'0',color:'#374151'}}> ?lèves avec photo : <strong>{eleves.filter(e=>e.photo_url).length}</strong> / {eleves.length}</p>
                <p style={{margin:'4px 0 0',color:'#374151'}}>? Sans photo : <strong>{eleves.filter(e=>!e.photo_url).length}</strong></p>
              </div>
            </div>
          )}

          {/* TROMBINOSCOPE */}
          {sousOngletPhotos==='trombi' && (
            <div style={s.importCard}>
              <h3 style={s.sectionTitre}> Trombinoscope</h3>
              <div style={{display:'flex',gap:'1rem',marginBottom:'1.5rem',alignItems:'center',flexWrap:'wrap'}}>
                <select value={classeTrombi} onChange={e=>setClasseTrombi(e.target.value)} style={{...s.selectClasse,fontSize:'1rem',padding:'0.6rem 1rem'}}>
                  <option value="">Toutes les classes</option>
                  {classes.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
                <span style={{color:'#64748b',fontSize:'0.9rem'}}>{avecPhoto} photo(s) sur {elevesTrombi.length} élève(s)</span>
                <button onClick={imprimerTrombinoscope} style={{background:'#7c3aed',color:'white',border:'none',borderRadius:'8px',padding:'0.6rem 1.2rem',cursor:'pointer',fontWeight:'600'}}>
                   Imprimer trombinoscope
                </button>
              </div>
              <div style={{display:'flex',flexWrap:'wrap',gap:'12px'}}>
                {elevesTrombi.map(e => (
                  <div key={e.id} style={{width:'130px',textAlign:'center',border:'1px solid #e2e8f0',borderRadius:'10px',padding:'10px',background:'white',boxShadow:'0 2px 6px rgba(0,0,0,0.06)'}}>
                    {e.photo_url
                      ? <img src={e.photo_url} alt="" style={{width:'110px',height:'140px',objectFit:'cover',borderRadius:'6px',border:'2px solid #dbeafe'}}/>
                      : <div style={{width:'110px',height:'140px',background:'#f1f5f9',borderRadius:'6px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'2.5rem',margin:'0 auto'}}></div>
                    }
                    <div style={{marginTop:'6px',fontWeight:'bold',fontSize:'0.78rem',color:'#1e3a5f'}}>{e.nom}</div>
                    <div style={{fontSize:'0.72rem',color:'#64748b'}}>{e.prenom}</div>
                    <span style={{...s.badgeClasse,fontSize:'0.68rem'}}>{e.classe}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RECHERCHE PHOTO */}
          {sousOngletPhotos==='recherche' && (
            <div style={s.importCard}>
              <h3 style={s.sectionTitre}> Recherche rapide d'un élève</h3>
              <input placeholder=" Tapez le nom ou matricule de l'élève..." value={recherchePhoto}
                onChange={e=>rechercherElevePhoto(e.target.value)}
                style={{...s.inputRecherche,width:'100%',fontSize:'1.1rem',padding:'0.85rem 1rem',marginBottom:'1.5rem',boxSizing:'border-box'}}/>
              {eleveRecherchePhoto && (
                <div style={{display:'flex',gap:'2rem',background:'white',borderRadius:'16px',padding:'2rem',boxShadow:'0 4px 16px rgba(0,0,0,0.1)',flexWrap:'wrap',alignItems:'flex-start'}}>
                  <div style={{textAlign:'center'}}>
                    {eleveRecherchePhoto.photo_url
                      ? <img src={eleveRecherchePhoto.photo_url} alt="" style={{width:'180px',height:'220px',objectFit:'cover',borderRadius:'12px',border:'4px solid #7c3aed',boxShadow:'0 4px 16px rgba(124,58,237,0.3)'}}/>
                      : <div style={{width:'180px',height:'220px',background:'#f1f5f9',borderRadius:'12px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'5rem',border:'4px solid #e2e8f0'}}></div>
                    }
                  </div>
                  <div style={{flex:1,minWidth:'200px'}}>
                    <h2 style={{color:'#1e3a5f',fontSize:'1.8rem',margin:'0 0 0.5rem'}}>{eleveRecherchePhoto.nom}</h2>
                    <h3 style={{color:'#2563eb',fontSize:'1.3rem',margin:'0 0 1.5rem',fontWeight:'400'}}>{eleveRecherchePhoto.prenom}</h3>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem'}}>
                      <div style={{background:'#dbeafe',borderRadius:'8px',padding:'0.75rem'}}>
                        <div style={{fontSize:'0.75rem',color:'#64748b'}}>MATRICULE</div>
                        <div style={{fontWeight:'bold',color:'#1e3a5f',fontSize:'1rem'}}>{eleveRecherchePhoto.matricule||'-'}</div>
                      </div>
                      <div style={{background:'#dbeafe',borderRadius:'8px',padding:'0.75rem'}}>
                        <div style={{fontSize:'0.75rem',color:'#64748b'}}>CLASSE</div>
                        <div style={{fontWeight:'bold',color:'#1e3a5f',fontSize:'1rem'}}>{eleveRecherchePhoto.classe||'-'}</div>
                      </div>
                      <div style={{background:'#f0fdf4',borderRadius:'8px',padding:'0.75rem'}}>
                        <div style={{fontSize:'0.75rem',color:'#64748b'}}>TÉLÉPHONE</div>
                        <div style={{fontWeight:'bold',color:'#166534',fontSize:'1rem'}}>{eleveRecherchePhoto.telephone1||'-'}</div>
                      </div>
                      <div style={{background:'#f0fdf4',borderRadius:'8px',padding:'0.75rem'}}>
                        <div style={{fontSize:'0.75rem',color:'#64748b'}}>MGA</div>
                        <div style={{fontWeight:'bold',color:'#166534',fontSize:'1rem'}}>{eleveRecherchePhoto.moyenne_generale||'-'}</div>
                      </div>
                    </div>
                    <div style={{marginTop:'1rem',background:'#f8fafc',borderRadius:'8px',padding:'0.75rem'}}>
                      <div style={{fontSize:'0.75rem',color:'#64748b'}}>PARENT</div>
                      <div style={{fontWeight:'600',color:'#374151'}}>{eleveRecherchePhoto.nom_parent||'-'}</div>
                    </div>
                    <div style={{marginTop:'0.75rem'}}>
                      <span style={eleveRecherchePhoto.decision_fin_annee==='Admis'?s.badgeAdmis:eleveRecherchePhoto.decision_fin_annee==='Redoublant'?s.badgeRedoublant:s.badgeExclu}>
                        {eleveRecherchePhoto.decision_fin_annee||'Décision non disponible'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {recherchePhoto.length >= 2 && !eleveRecherchePhoto && (
                <div style={s.bilanVide}><p>Aucun élève trouvé pour "{recherchePhoto}"</p></div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===== ÉDUCATEURS ===== */}
      {onglet==='educateurs' && (
        <div style={s.contenu}>
          <h2 style={s.titrePage}> Inscriptions  Éducateurs</h2>
          <div style={s.sousNav}>
            <button onClick={()=>setSousOngletEducateur('saisie')} style={sousOngletEducateur==='saisie'?{...s.sousNavActif,background:'#0369a1',borderColor:'#0369a1'}:s.sousNavBtn}>Saisie documents</button>
            <button onClick={()=>setSousOngletEducateur('bilan')} style={sousOngletEducateur==='bilan'?{...s.sousNavActif,background:'#0369a1',borderColor:'#0369a1'}:s.sousNavBtn}> Bilan</button>
          </div>

          {sousOngletEducateur==='saisie' && (
            <>
              <div style={s.filtres}>
                <input placeholder=" Rechercher un élève..." value={rechercheEducateur}
                  onChange={e=>rechercherEleveEducateur(e.target.value)} style={s.inputRecherche}/>
                <select value={classeFiltreEducateur} onChange={e=>filtrerEducateurParClasse(e.target.value)} style={s.selectClasse}>
                  <option value="">Toutes les classes</option>
                  {classes.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {messageEducateur && <div style={messageEducateur.includes('')?s.alertSucces:s.alertErreur}>{messageEducateur}</div>}
              <p style={s.compteur}>{elevesEducateur.length} élève(s)   {elevesEducateur.filter(e=>estInscritEducateur(e.id)).length} inscrits |  {elevesEducateur.filter(e=>!estInscritEducateur(e.id)).length} non inscrits</p>
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead style={{...s.tableHead,background:'#0369a1'}}>
                    <tr>
                      <th style={s.th}>#</th>
                      <th style={s.th}>Élève</th>
                      <th style={s.th}>Classe</th>
                      {DOCUMENTS_EDUCATEURS.map(d=><th key={d.key} style={{...s.th,fontSize:'0.72rem',maxWidth:'70px'}}>{d.label}</th>)}
                      <th style={s.th}>Docs</th>
                      <th style={s.th}>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {elevesEducateur.map((e,i)=>{
                      const ie = inscriptionsEducateurs[e.id] || {};
                      const nb = compterDocsEleve(e.id);
                      const inscrit = estInscritEducateur(e.id);
                      return (
                        <tr key={e.id} style={i%2===0?s.trPair:s.trImpair}>
                          <td style={s.td}>{i+1}</td>
                          <td style={s.td}><strong>{e.nom}</strong> {e.prenom}<br/><span style={{fontSize:'0.75rem',color:'#64748b'}}>{e.matricule}</span></td>
                          <td style={s.td}><span style={s.badgeClasse}>{e.classe}</span></td>
                          {DOCUMENTS_EDUCATEURS.map(d=>(
                            <td key={d.key} style={{...s.td,textAlign:'center'}}>
                              <input type="checkbox"
                                checked={!!ie[d.key]}
                                onChange={()=>toggleDocument(e, d.key)}
                                style={{width:'18px',height:'18px',cursor:'pointer',accentColor:'#0369a1'}}
                              />
                            </td>
                          ))}
                          <td style={{...s.td,textAlign:'center'}}>
                            <span style={{fontWeight:'bold',color: nb===10?'#166534': nb>=5?'#92400e':'#991b1b'}}>{nb}/10</span>
                          </td>
                          <td style={s.td}>
                            {inscrit
                              ? <span style={s.badgeAdmis}> Inscrit</span>
                              : <span style={s.badgeExclu}> Non inscrit</span>
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {sousOngletEducateur==='bilan' && (
            <div style={s.importCard}>
              <h3 style={s.sectionTitre}> Bilan des inscriptions éducateurs</h3>
              <div style={s.statsInscription}>
                <div style={s.statBox}><div style={s.statNum}>{eleves.filter(e=>estInscritEducateur(e.id)).length}</div><div style={s.statLabel}> Inscrits</div></div>
                <div style={{...s.statBox,background:'#fee2e2'}}><div style={{...s.statNum,color:'#991b1b'}}>{eleves.filter(e=>!estInscritEducateur(e.id)).length}</div><div style={s.statLabel}> Non inscrits</div></div>
                <div style={{...s.statBox,background:'#dbeafe'}}><div style={{...s.statNum,color:'#1e3a5f'}}>{eleves.length}</div><div style={s.statLabel}> Total élèves</div></div>
                <div style={{...s.statBox,background:'#dcfce7'}}><div style={{...s.statNum,color:'#166534'}}>{eleves.length>0?Math.round(eleves.filter(e=>estInscritEducateur(e.id)).length/eleves.length*100):0}%</div><div style={s.statLabel}> Taux inscription</div></div>
              </div>
              <h4 style={{color:'#0369a1',marginBottom:'0.75rem'}}>Documents par élève :</h4>
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead style={{...s.tableHead,background:'#0369a1'}}>
                    <tr>
                      <th style={s.th}>#</th>
                      <th style={s.th}>Nom</th>
                      <th style={s.th}>Prénom</th>
                      <th style={s.th}>Classe</th>
                      {DOCUMENTS_EDUCATEURS.map(d=><th key={d.key} style={{...s.th,fontSize:'0.7rem'}}>{d.label}</th>)}
                      <th style={s.th}>Total</th>
                      <th style={s.th}>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eleves.slice().sort((a,b)=>(a.nom||'').localeCompare(b.nom||'')).map((e,i)=>{
                      const ie = inscriptionsEducateurs[e.id] || {};
                      const nb = compterDocsEleve(e.id);
                      return (
                        <tr key={e.id} style={i%2===0?s.trPair:s.trImpair}>
                          <td style={s.td}>{i+1}</td>
                          <td style={s.td}><strong>{e.nom}</strong></td>
                          <td style={s.td}>{e.prenom}</td>
                          <td style={s.td}><span style={s.badgeClasse}>{e.classe}</span></td>
                          {DOCUMENTS_EDUCATEURS.map(d=>(
                            <td key={d.key} style={{...s.td,textAlign:'center'}}>
                              {ie[d.key] ? '' : ''}
                            </td>
                          ))}
                          <td style={{...s.td,textAlign:'center',fontWeight:'bold',color:nb===10?'#166534':nb>=5?'#92400e':'#991b1b'}}>{nb}/10</td>
                          <td style={s.td}>{estInscritEducateur(e.id)?<span style={s.badgeAdmis}> Inscrit</span>:<span style={s.badgeExclu}> Manquant</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <br/>
              <button onClick={imprimerBilanEducateurs} style={{...s.btnCalculer,background:'#0369a1'}}> Imprimer le bilan</button>
            </div>
          )}
        </div>
      )}

      {/* ===== CONTRÔLE ===== */}
      {onglet==='controle' && (
        <div style={s.contenu}>
          <h2 style={s.titrePage}> Contrôle croisé des inscriptions</h2>
          {(()=>{
            const inscritsEco = new Set(Object.keys(paiements).map(id => parseInt(id)));
            const inscritsEdu = new Set(eleves.filter(e => estInscritEducateur(e.id)).map(e => e.id));
            const deuxListes = eleves.filter(e => inscritsEco.has(e.id) && inscritsEdu.has(e.id));
            const ecoSeul = eleves.filter(e => inscritsEco.has(e.id) && !inscritsEdu.has(e.id));
            const eduSeul = eleves.filter(e => !inscritsEco.has(e.id) && inscritsEdu.has(e.id));
            const aucun = eleves.filter(e => !inscritsEco.has(e.id) && !inscritsEdu.has(e.id));
            const TableControle = ({liste, couleur, titre, badge}) => (
              <div style={{marginBottom:'2rem'}}>
                <h3 style={{color:couleur,background:couleur+'22',padding:'0.6rem 1rem',borderRadius:'8px',marginBottom:'0.75rem'}}>{titre}  {liste.length} élève(s)</h3>
                {liste.length===0
                  ? <div style={{...s.bilanVide,padding:'1rem'}}>Aucun élève dans cette catégorie </div>
                  : <div style={s.tableWrap}><table style={s.table}>
                    <thead style={{...s.tableHead,background:couleur}}>
                      <tr>{['#','Matricule','Nom','Prénom','Classe','Parent','Téléphone'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
                    </thead>
                    <tbody>{liste.sort((a,b)=>(a.nom||'').localeCompare(b.nom||'')).map((e,i)=>(
                      <tr key={e.id} style={i%2===0?s.trPair:s.trImpair}>
                        <td style={s.td}>{i+1}</td>
                        <td style={s.td}>{e.matricule}</td>
                        <td style={s.td}><strong>{e.nom}</strong></td>
                        <td style={s.td}>{e.prenom}</td>
                        <td style={s.td}><span style={s.badgeClasse}>{e.classe}</span></td>
                        <td style={s.td}>{e.nom_parent||'-'}</td>
                        <td style={s.td}>{e.telephone1?<a href={'tel:'+e.telephone1} style={s.telLink}> {e.telephone1}</a>:'-'}</td>
                      </tr>
                    ))}</tbody>
                  </table></div>
                }
              </div>
            );
            return (
              <>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'1rem',marginBottom:'1.5rem'}}>
                  <div style={{...s.statBox,background:'#dcfce7',border:'2px solid #16a34a'}}><div style={{...s.statNum,color:'#166534'}}>{deuxListes.length}</div><div style={s.statLabel}> Inscrits aux 2</div></div>
                  <div style={{...s.statBox,background:'#fef3c7',border:'2px solid #d97706'}}><div style={{...s.statNum,color:'#92400e'}}>{ecoSeul.length}</div><div style={s.statLabel}>$ Économat seul</div></div>
                  <div style={{...s.statBox,background:'#ede9fe',border:'2px solid #7c3aed'}}><div style={{...s.statNum,color:'#5b21b6'}}>{eduSeul.length}</div><div style={s.statLabel}> Éducateurs seul</div></div>
                  <div style={{...s.statBox,background:'#fee2e2',border:'2px solid #ef4444'}}><div style={{...s.statNum,color:'#991b1b'}}>{aucun.length}</div><div style={s.statLabel}> Non inscrits</div></div>
                </div>
                <div style={{marginBottom:'1rem'}}>
                  <button onClick={imprimerBilanControle} style={{...s.btnCalculer,background:'#1e3a5f'}}> Imprimer rapport de contrôle complet</button>
                </div>
                <TableControle liste={deuxListes} couleur="#16a34a" titre=" Inscrits aux deux (Économat + Éducateurs)"/>
                <TableControle liste={ecoSeul} couleur="#d97706" titre="! Inscrits à l'Économat SEULEMENT (manquent chez éducateurs)"/>
                <TableControle liste={eduSeul} couleur="#7c3aed" titre="! Inscrits chez les Éducateurs SEULEMENT (manquent à l'Économat)"/>
                <TableControle liste={aucun} couleur="#ef4444" titre=" Non inscrits du tout"/>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

const s = {
  app:{fontFamily:'Segoe UI, Arial, sans-serif',minHeight:'100vh',backgroundColor:'#f0f4f8'},
  loginPage:{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg, #1e3a5f, #2563eb)'},
  loginBox:{background:'white',padding:'2.5rem',borderRadius:'16px',textAlign:'center',width:'320px',boxShadow:'0 8px 32px rgba(0,0,0,0.2)'},
  loginTitre:{margin:'0 0 0.3rem',color:'#1e3a5f',fontSize:'1.8rem'},
  loginInput:{width:'100%',padding:'0.75rem',border:'2px solid #e2e8f0',borderRadius:'8px',fontSize:'1rem',boxSizing:'border-box',marginBottom:'0.5rem'},
  loginBtn:{width:'100%',padding:'0.75rem',background:'#2563eb',color:'white',border:'none',borderRadius:'8px',fontSize:'1rem',cursor:'pointer',marginTop:'0.5rem'},
  header:{background:'linear-gradient(135deg, #1e3a5f, #2563eb)',color:'white',padding:'1rem 1.5rem',display:'flex',justifyContent:'space-between',alignItems:'center'},
  headerLeft:{display:'flex',alignItems:'center',gap:'0.75rem'},
  headerTitre:{fontWeight:'bold',fontSize:'1.3rem'},
  headerSous:{fontSize:'0.75rem',opacity:0.85},
  btnDeconnecter:{background:'rgba(255,255,255,0.2)',color:'white',border:'1px solid rgba(255,255,255,0.4)',borderRadius:'8px',padding:'0.4rem 0.9rem',cursor:'pointer'},
  nav:{background:'white',padding:'0.75rem 1.5rem',display:'flex',gap:'0.5rem',borderBottom:'1px solid #e2e8f0',flexWrap:'wrap'},
  navBtn:{padding:'0.5rem 1.1rem',border:'2px solid #e2e8f0',borderRadius:'8px',background:'white',cursor:'pointer',fontWeight:'500'},
  navBtnActif:{padding:'0.5rem 1.1rem',border:'2px solid #2563eb',borderRadius:'8px',background:'#2563eb',color:'white',cursor:'pointer',fontWeight:'500'},
  sousNav:{display:'flex',gap:'0.5rem',marginBottom:'1.5rem',borderBottom:'2px solid #e2e8f0',paddingBottom:'0.5rem'},
  sousNavBtn:{padding:'0.5rem 1.2rem',border:'2px solid #e2e8f0',borderRadius:'8px 8px 0 0',background:'white',cursor:'pointer',fontWeight:'500',fontSize:'0.9rem'},
  sousNavActif:{padding:'0.5rem 1.2rem',border:'2px solid #0f766e',borderBottom:'2px solid white',borderRadius:'8px 8px 0 0',background:'#0f766e',color:'white',cursor:'pointer',fontWeight:'600',fontSize:'0.9rem'},
  contenu:{padding:'1.5rem',maxWidth:'1400px',margin:'0 auto'},
  filtres:{display:'flex',gap:'0.75rem',marginBottom:'0.75rem',flexWrap:'wrap',alignItems:'center'},
  inputRecherche:{flex:1,minWidth:'200px',padding:'0.6rem 1rem',border:'2px solid #e2e8f0',borderRadius:'8px',fontSize:'0.95rem'},
  selectClasse:{padding:'0.6rem 1rem',border:'2px solid #e2e8f0',borderRadius:'8px',fontSize:'0.95rem'},
  statsClasse:{display:'flex',gap:'1rem',background:'#dbeafe',padding:'0.75rem 1rem',borderRadius:'8px',marginBottom:'0.75rem',flexWrap:'wrap',fontSize:'0.88rem'},
  statsInscription:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'1rem',marginBottom:'1.5rem'},
  statBox:{background:'#dbeafe',borderRadius:'12px',padding:'1rem',textAlign:'center'},
  statNum:{fontSize:'2rem',fontWeight:'bold',color:'#1e3a5f'},
  statLabel:{fontSize:'0.85rem',color:'#475569',marginTop:'0.25rem'},
  alertSucces:{background:'#dcfce7',color:'#166534',padding:'0.75rem 1rem',borderRadius:'8px',marginBottom:'0.75rem',fontWeight:'600'},
  alertErreur:{background:'#fee2e2',color:'#991b1b',padding:'0.75rem 1rem',borderRadius:'8px',marginBottom:'0.75rem',fontWeight:'600'},
  compteur:{color:'#64748b',fontSize:'0.9rem',marginBottom:'0.5rem'},
  tableWrap:{overflowX:'auto'},
  table:{width:'100%',borderCollapse:'collapse',background:'white',borderRadius:'10px',overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,0.07)'},
  tableHead:{background:'#1e3a5f'},
  th:{padding:'0.75rem 0.5rem',color:'white',textAlign:'left',fontWeight:'600',fontSize:'0.82rem'},
  td:{padding:'0.55rem 0.5rem',fontSize:'0.85rem',borderBottom:'1px solid #f0f4f8'},
  trPair:{background:'white'},trImpair:{background:'#f8fafc'},
  badgeClasse:{background:'#dbeafe',color:'#1e40af',padding:'2px 8px',borderRadius:'12px',fontSize:'0.8rem',fontWeight:'600'},
  badgeAdmis:{background:'#dcfce7',color:'#166534',padding:'2px 8px',borderRadius:'12px',fontSize:'0.8rem',fontWeight:'600'},
  badgeRedoublant:{background:'#fef3c7',color:'#92400e',padding:'2px 8px',borderRadius:'12px',fontSize:'0.8rem',fontWeight:'600'},
  badgeExclu:{background:'#fee2e2',color:'#991b1b',padding:'2px 8px',borderRadius:'12px',fontSize:'0.8rem',fontWeight:'600'},
  telLink:{color:'#2563eb',textDecoration:'none'},
  btnVoir:{background:'#2563eb',color:'white',border:'none',borderRadius:'6px',padding:'4px 8px',cursor:'pointer',marginRight:'3px',fontSize:'0.8rem'},
  btnModifier:{background:'#f59e0b',color:'white',border:'none',borderRadius:'6px',padding:'4px 8px',cursor:'pointer',marginRight:'3px',fontSize:'0.8rem'},
  btnSupprimer:{background:'#ef4444',color:'white',border:'none',borderRadius:'6px',padding:'4px 8px',cursor:'pointer',fontSize:'0.8rem'},
  btnPayer:{background:'#16a34a',color:'white',border:'none',borderRadius:'6px',padding:'5px 10px',cursor:'pointer',fontSize:'0.82rem',fontWeight:'600'},
  btnAnnulerPaiement:{background:'#94a3b8',color:'white',border:'none',borderRadius:'6px',padding:'5px 10px',cursor:'pointer',fontSize:'0.82rem'},
  btnRetour:{background:'#64748b',color:'white',border:'none',borderRadius:'8px',padding:'0.5rem 1rem',cursor:'pointer',marginRight:'0.5rem'},
  btnImprimerClasse:{background:'#1e3a5f',color:'white',border:'none',borderRadius:'8px',padding:'0.5rem 1rem',cursor:'pointer',fontWeight:'600'},
  btnModifier2:{background:'#f59e0b',color:'white',border:'none',borderRadius:'8px',padding:'0.5rem 1rem',cursor:'pointer'},
  ficheCard:{background:'white',borderRadius:'12px',padding:'2rem',boxShadow:'0 2px 8px rgba(0,0,0,0.08)'},
  ficheHeader:{display:'flex',alignItems:'flex-start',gap:'1.5rem',marginBottom:'1.5rem',borderBottom:'2px solid #e2e8f0',paddingBottom:'1.5rem'},
  ficheAvatar:{width:'110px',height:'140px',borderRadius:'8px',background:'#dbeafe',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'},
  ficheNom:{margin:'0 0 0.3rem',color:'#1e3a5f',fontSize:'1.5rem'},
  ficheClasse:{margin:'0',color:'#2563eb',fontWeight:'600'},
  ficheMatricule:{margin:'0',color:'#64748b',fontSize:'0.9rem'},
  ficheGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(250px, 1fr))',gap:'1.5rem'},
  ficheSection:{background:'#f8fafc',borderRadius:'8px',padding:'1rem'},
  sectionTitre:{margin:'0 0 0.75rem',color:'#1e3a5f',fontSize:'1rem',borderBottom:'1px solid #e2e8f0',paddingBottom:'0.5rem'},
  titrePage:{color:'#1e3a5f',marginBottom:'1rem'},
  formCard:{background:'white',borderRadius:'12px',padding:'1.5rem',boxShadow:'0 2px 8px rgba(0,0,0,0.07)'},
  formGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))',gap:'1rem'},
  label:{display:'block',marginBottom:'0.3rem',fontWeight:'600',fontSize:'0.88rem',color:'#374151'},
  input:{width:'100%',padding:'0.6rem',border:'2px solid #e2e8f0',borderRadius:'8px',fontSize:'0.95rem',boxSizing:'border-box'},
  btnSauvegarder:{marginTop:'1.5rem',background:'#2563eb',color:'white',border:'none',borderRadius:'8px',padding:'0.75rem 2rem',cursor:'pointer',fontSize:'1rem',fontWeight:'600'},
  importCard:{background:'white',borderRadius:'12px',padding:'1.5rem',boxShadow:'0 2px 8px rgba(0,0,0,0.07)'},
  trimestreBtns:{display:'flex',gap:'1rem',marginBottom:'1.5rem',flexWrap:'wrap'},
  trimestreBtn:{padding:'0.75rem 1.5rem',border:'2px solid #e2e8f0',borderRadius:'8px',background:'white',cursor:'pointer',fontWeight:'600',fontSize:'1rem'},
  trimestreBtnActif:{padding:'0.75rem 1.5rem',border:'2px solid #2563eb',borderRadius:'8px',background:'#2563eb',color:'white',cursor:'pointer',fontWeight:'600',fontSize:'1rem'},
  importInfo:{fontWeight:'600',color:'#1e3a5f'},
  btnImportExcel:{background:'#2563eb',color:'white',border:'none',borderRadius:'8px',padding:'0.75rem 1.5rem',cursor:'pointer',fontSize:'1rem',fontWeight:'600'},
  btnCalculer:{background:'#7c3aed',color:'white',border:'none',borderRadius:'8px',padding:'0.75rem 1.5rem',cursor:'pointer',fontSize:'1rem',fontWeight:'600',marginTop:'0.5rem'},
  bepcInfo:{background:'#dcfce7',borderRadius:'8px',padding:'1rem',marginBottom:'1.5rem'},
  bilanCard:{background:'white',borderRadius:'12px',padding:'1.5rem',boxShadow:'0 2px 8px rgba(0,0,0,0.07)'},
  bilanDateRow:{display:'flex',alignItems:'center',gap:'1rem',marginBottom:'1.5rem'},
  inputDate:{padding:'0.6rem 1rem',border:'2px solid #0f766e',borderRadius:'8px',fontSize:'1rem',color:'#1e3a5f',fontWeight:'600'},
  bilanResume:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem',marginBottom:'1.5rem'},
  bilanResumeItem:{background:'#dbeafe',border:'2px solid #2563eb',borderRadius:'12px',padding:'1.2rem',textAlign:'center'},
  bilanResumeNum:{fontSize:'2.2rem',fontWeight:'bold',color:'#1e3a5f'},
  bilanResumeLabel:{fontSize:'0.9rem',color:'#475569',marginTop:'0.3rem'},
  bilanVide:{background:'#f8fafc',borderRadius:'8px',padding:'2rem',textAlign:'center',color:'#9ca3af'},
  btnBilanImprimer:{background:'#0f766e',color:'white',border:'none',borderRadius:'8px',padding:'0.8rem 1.8rem',cursor:'pointer',fontSize:'1rem',fontWeight:'600'},
  succes:{color:'green',fontWeight:'600',marginTop:'0.75rem'},
  erreur:{color:'red',fontWeight:'600',marginTop:'0.75rem'},
  eduDocTh:{padding:'6px 4px',color:'white',textAlign:'center',fontWeight:'600',fontSize:'0.7rem',maxWidth:'65px',wordBreak:'break-word'},
};