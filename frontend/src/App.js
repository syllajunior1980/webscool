import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API = 'https://webscool.onrender.com/api';
const MOT_DE_PASSE = 'dares2026';
const ETABLISSEMENT = 'COLLÈGE MODERNE BOUAKÉ DAR ES SALAM';
const ANNEE_SCOLAIRE = '2025-2026';
const MONTANT_INSCRIPTION = 1000;

const STATUTS = ['Non affecté', 'Affecté', 'Transféré'];
const QUALITES = ['', 'Nouveau', 'Ancien', 'Redoublant', 'Transféré entrant', 'Transféré sortant'];

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
  const [statutFiltre, setStatutFiltre] = useState('');
  const [sexeFiltre, setSexeFiltre] = useState('');
  const [classes, setClasses] = useState([]);
  const [eleveSelectionne, setEleveSelectionne] = useState(null);
  const [fichierExcel, setFichierExcel] = useState(null);
  const [importStatus, setImportStatus] = useState('');
  const [importEnCours, setImportEnCours] = useState(false);
  const [trimestreActif, setTrimestreActif] = useState('T1');
  const [fichierImportEleves, setFichierImportEleves] = useState(null);
  const [importElevesStatus, setImportElevesStatus] = useState('');
  const [importElevesEnCours, setImportElevesEnCours] = useState(false);
  const [calcEnCours, setCalcEnCours] = useState(false);
  const [calcStatus, setCalcStatus] = useState('');
  const [formulaire, setFormulaire] = useState({
    matricule:'',nom:'',prenom:'',classe:'',numero_extrait:'',
    sexe:'',statut:'Non affecté',qualite:'',
    date_naissance:'',lieu_naissance:'',
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
    { key: 'extrait', label: 'Extrait' },
    { key: 'chemise_rabat', label: 'Chemise à rabat' },
    { key: 'enveloppe_timbree', label: 'Enveloppe timbrée' },
    { key: 'bulletin', label: 'Bulletin' },
    { key: 'photos_identite', label: "Photos d'identité" },
    { key: 'fiche_renseignement', label: 'Fiche de renseignement' },
    { key: 'fiche_inscription_ligne', label: 'Fiche inscription en ligne' },
    { key: 'carnet_correspondance', label: 'Carnet de correspondance' },
    { key: 'livret_scolaire', label: 'Livret scolaire' },
    { key: 'diplome', label: 'Diplôme' },
  ];
  const [inscriptionsEducateurs, setInscriptionsEducateurs] = useState({});
  const [rechercheEducateur, setRechercheEducateur] = useState('');
  const [classeFiltreEducateur, setClasseFiltreEducateur] = useState('');
  const [elevesEducateur, setElevesEducateur] = useState([]);
  const [messageEducateur, setMessageEducateur] = useState('');
  const [sousOngletEducateur, setSousOngletEducateur] = useState('saisie');
  const [sauvegardeEnCours, setSauvegardeEnCours] = useState({});

  // Import Excel aperçu
  const [aperçuImport, setAperçuImport] = useState([]);
  const [colonnesDetectees, setColonnesDetectees] = useState([]);
  const [afficherAperçu, setAfficherAperçu] = useState(false);

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
      setMessageChargement('✅ WebScool est prêt !');
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
      setMessageEducateur(`✅ Documents de ${eleve.nom} ${eleve.prenom} sauvegardés`);
      setTimeout(() => setMessageEducateur(''), 3000);
    } catch (err) { setMessageEducateur('❌ Erreur: ' + err.message); }
    setSauvegardeEnCours(prev => ({...prev, [eleve.id]: false}));
  };

  const toggleDocument = async (eleve, docKey) => {
    const actuel = inscriptionsEducateurs[eleve.id] || {};
    const newDocs = { ...actuel, [docKey]: !actuel[docKey] };
    const docsOnly = {};
    ['extrait','chemise_rabat','enveloppe_timbree','bulletin',
     'photos_identite','fiche_renseignement','fiche_inscription_ligne',
     'carnet_correspondance','livret_scolaire','diplome','observations'].forEach(k => {
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
    return ['extrait','chemise_rabat','enveloppe_timbree','bulletin',
      'photos_identite','fiche_renseignement','fiche_inscription_ligne',
      'carnet_correspondance','livret_scolaire','diplome'].filter(k => ie[k]).length;
  };

  const estInscritEducateur = (eleveId) => {
    const ie = inscriptionsEducateurs[eleveId];
    if (!ie) return false;
    return compterDocsEleve(eleveId) > 0;
  };

  // ===== FILTRAGE LISTE =====
  const elevesFiltres = eleves.filter(e => {
    if (statutFiltre && e.statut !== statutFiltre) return false;
    if (sexeFiltre && e.sexe !== sexeFiltre) return false;
    return true;
  });

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
        setMessageInscription(`⚠️ Paiement annulé pour ${eleve.nom} ${eleve.prenom}`);
      } else {
        const res = await axios.post(`${API}/inscriptions`, {
          eleve_id: eleve.id, montant: MONTANT_INSCRIPTION,
          date_paiement: new Date().toISOString().split('T')[0]
        });
        setPaiements({...paiements, [eleve.id]: res.data});
        setMessageInscription(`✅ Paiement enregistré pour ${eleve.nom} ${eleve.prenom}`);
      }
      setTimeout(() => setMessageInscription(''), 3000);
    } catch (err) { setMessageInscription('❌ Erreur: ' + (err.response?.data?.erreur || err.message)); }
  };

  // ===== PHOTOS =====
  const importerPhotosGroupees = async (fichiers) => {
    if (!fichiers || fichiers.length === 0) return;
    setUploadEnCours(true);
    setUploadProgress(0);
    setUploadStatus(`⏳ Préparation de ${fichiers.length} photos...`);
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
      setUploadStatus(`⏳ ${Math.min(i + BATCH, tabFichiers.length)} / ${tabFichiers.length} photos traitées...`);
    }
    setUploadStatus(`✅ ${total} photos importées ! ${erreurs > 0 ? `⚠️ ${erreurs} erreurs` : ''}`);
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

  // ===== IMPORT ELEVES EXCEL =====
  const lireAperçuExcel = (fichier) => {
    if (!fichier) return;
    // On lit juste les premières lignes via FileReader pour aperçu visuel
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        // Détection basique des colonnes CSV/TSV
        const text = e.target.result;
        const lignes = text.split('\n').filter(l => l.trim());
        if (lignes.length > 0) {
          const sep = lignes[0].includes('\t') ? '\t' : ',';
          const cols = lignes[0].split(sep).map(c => c.trim().replace(/"/g, ''));
          setColonnesDetectees(cols);
          const aperçu = lignes.slice(1, 6).map(l =>
            l.split(sep).map(c => c.trim().replace(/"/g, ''))
          );
          setAperçuImport(aperçu);
          setAfficherAperçu(true);
        }
      } catch(e) {
        setColonnesDetectees([]);
        setAperçuImport([]);
      }
    };
    reader.readAsText(fichier, 'UTF-8');
  };

  const importerEleves = async () => {
    if (!fichierImportEleves) { setImportElevesStatus('⚠️ Choisissez un fichier Excel'); return; }
    setImportElevesEnCours(true);
    setImportElevesStatus('⏳ Lecture du fichier...');

    const text = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Lecture fichier impossible'));
      reader.readAsText(fichierImportEleves, 'UTF-8');
    });

    const cleanText = text.replace(/^\uFEFF/, '');
    const lines = cleanText.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) {
      setImportElevesStatus('❌ Fichier vide ou invalide');
      setImportElevesEnCours(false);
      return;
    }
    const firstLine = lines[0];
    const sep = firstLine.includes(';') ? ';' : ',';
    const headers = firstLine.split(sep).map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(sep).map(v => v.trim().replace(/^"|"$/g, ''));
      if (vals.length < 2) continue;
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = vals[idx] || ''; });
      rows.push(obj);
    }

    const total = rows.length;
    const TAILLE_LOT = 100;
    const nbLots = Math.ceil(total / TAILLE_LOT);
    let totalImportes = 0;
    let totalErreurs = [];
    let totalDoublonsMatricule = [];
    let totalDoublonsNom = [];

    for (let i = 0; i < nbLots; i++) {
      const lot = rows.slice(i * TAILLE_LOT, (i + 1) * TAILLE_LOT);
      setImportElevesStatus(`⏳ Lot ${i + 1}/${nbLots} — ${Math.min((i+1)*TAILLE_LOT, total)}/${total} élèves...`);
      try {
        const res = await axios.post(`${API}/import/json`, { rows: lot }, {
          headers: { 'Content-Type': 'application/json' }, timeout: 60000
        });
        totalImportes += res.data.importes || 0;
        if (res.data.erreurs?.length > 0) totalErreurs.push(...res.data.erreurs);
        if (res.data.doublons_matricule?.length > 0) totalDoublonsMatricule.push(...res.data.doublons_matricule);
        if (res.data.doublons_nom?.length > 0) totalDoublonsNom.push(...res.data.doublons_nom);
      } catch (err) {
        totalErreurs.push(`Lot ${i+1}: ${err.response?.data?.erreur || err.message}`);
      }
    }

    // Alertes doublons AVANT le message de statut
    if (totalDoublonsNom.length > 0) {
      const liste = totalDoublonsNom.map(d =>
        `• ${d.nom_complet}  (matricule Excel: ${d.matricule_excel} / matricule base: ${d.matricule_base})`
      ).join('\n');
      alert(
        `⚠️ ${totalDoublonsNom.length} DOUBLON(S) DE NOM DÉTECTÉ(S)\nCes élèves N'ONT PAS été importés :\n\n${liste}\n\nVérifiez et corrigez le fichier Excel.`
      );
    }
    if (totalDoublonsMatricule.length > 0) {
      const liste = totalDoublonsMatricule.map(d =>
        `• ${d.nom_complet}  — matricule ${d.matricule}  (classe: ${d.classe})`
      ).join('\n');
      alert(
        `ℹ️ ${totalDoublonsMatricule.length} DOUBLON(S) DE MATRICULE\nCes élèves ont été MIS À JOUR (pas re-créés) :\n\n${liste}`
      );
    }

    setImportElevesStatus(
      `✅ ${totalImportes} élèves importés sur ${total} !` +
      (totalDoublonsNom.length > 0 ? ` ⛔ ${totalDoublonsNom.length} doublon(s) nom ignoré(s).` : '') +
      (totalDoublonsMatricule.length > 0 ? ` ℹ️ ${totalDoublonsMatricule.length} doublon(s) matricule mis à jour.` : '') +
      (totalErreurs.length > 0 ? ` ⚠️ ${totalErreurs.length} erreur(s).` : '')
    );
    chargerEleves();
    chargerClasses();
    setAfficherAperçu(false);
    setImportElevesEnCours(false);
  };

  const telechargerModele = (trimestre) => {
    const num = trimestre.replace('T','');
    const lignes = [
      ['matricule', `moy_trim${num}`],
      ['21421986V', 12.5],['23666672E', 14.0],['23654577C', 9.75],
    ];
    const contenu = lignes.map(r => r.join('\t')).join('\n');
    const blob = new Blob(['\uFEFF' + contenu], { type: 'text/tab-separated-values;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `modele_import_${trimestre}.xls`; a.click();
    URL.revokeObjectURL(url);
  };

  const telechargerModeleEleves = () => {
    const entetes = ['Matricule','Nom','Prenom','DateNaiss','LieuNaiss','Sexe','Statut','Qualite','Classe','nom_parent','telephone1','telephone2'];
    const exemples = [
      ['21421986V','ABDON','GRACE EMMANUELA','21/06/2009','SAOUNDI','Feminin','Affecte','Redoublant','6eme6','ABDON PAUL','0759109875',''],
      ['23666672E','ABDON','MELEDJE BEST','23/12/2013','SAOUNDI','Feminin','Affecte','NRedoublant','5eme4','ABDON PAUL','0759109875',''],
      ['23654577C','KONE','AMINATA FATOUMATA','21/03/2012','SAOUNDI','Feminin','Affecte','NRedoublant','5eme2','KONE IBRAHIM','0707123456',''],
    ];

    // Générer CSV avec séparateur point-virgule (standard Excel français → colonnes séparées automatiquement)
    const lignes = [entetes, ...exemples];
    const csvContent = lignes.map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';')
    ).join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'modele_import_eleves.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  // ===== RÉPARTITION CLASSES =====
  const [sousOngletRepartition, setSousOngletRepartition] = useState('repartition');
  const [classeSource, setClasseSource] = useState('');
  const [classeCible, setClasseCible] = useState('');
  const [elevesSelectionnesRepartition, setElevesSelectionnesRepartition] = useState([]);
  const [messageRepartition, setMessageRepartition] = useState('');

  // ===== ARCHIVES =====
  const [anneesArchives, setAnneesArchives] = useState([]);
  const [anneeSelectionnee, setAnneeSelectionnee] = useState(null);
  const [elevesArchive, setElevesArchive] = useState([]);
  const [rechercheArchive, setRechercheArchive] = useState('');
  const [classeArchive, setClasseArchive] = useState('');
  const [anneeAArchiver, setAnneeAArchiver] = useState(ANNEE_SCOLAIRE);
  const [archivageEnCours, setArchivageEnCours] = useState(false);
  const [messageArchive, setMessageArchive] = useState('');
  const [eleveArchiveSelectionne, setEleveArchiveSelectionne] = useState(null);
  const [sousOngletArchive, setSousOngletArchive] = useState('liste');
  const [rechercheGlobale, setRechercheGlobale] = useState('');
  const [resultatsGlobaux, setResultatsGlobaux] = useState([]);

  const toggleSelectionEleve = (eleveId) => {
    setElevesSelectionnesRepartition(prev =>
      prev.includes(eleveId) ? prev.filter(id => id !== eleveId) : [...prev, eleveId]
    );
  };

  const affecterClasseCible = async () => {
  if (!classeCible) { setMessageRepartition('Veuillez sélectionner une classe de destination'); return; }
  if (elevesSelectionnesRepartition.length === 0) { setMessageRepartition('Veuillez sélectionner au moins un élève'); return; }
  
  try {
    const res = await axios.get(`${API}/eleves/classe/${classeCible}`);
    const elevesDestination = res.data;
    
    const doublons = [];
    const aAffecter = [];
    
    for (const eleveId of elevesSelectionnesRepartition) {
      const eleve = eleves.find(e => e.id === eleveId);
      if (!eleve) continue;
      
      const existeDeja = elevesDestination.some(e => 
        e.nom.trim().toUpperCase() === eleve.nom.trim().toUpperCase() && 
        e.prenom.trim().toUpperCase() === eleve.prenom.trim().toUpperCase()
      );
      
      if (existeDeja) {
        doublons.push(`${eleve.nom} ${eleve.prenom}`);
      } else {
        aAffecter.push(eleveId);
      }
    }
    
    if (doublons.length > 0) {
      const continuer = window.confirm(
        `⚠️ Ces élèves existent déjà dans ${classeCible} :\n\n${doublons.join('\n')}\n\nIls ne seront PAS déplacés. Continuer pour les autres ?`
      );
      if (!continuer) return;
    }
    
    if (aAffecter.length > 0) {
      for (const eleveId of aAffecter) {
        await axios.put(`${API}/eleves/${eleveId}`, { classe: classeCible });
      }
      setMessageRepartition(`✅ ${aAffecter.length} élève(s) affecté(s) en ${classeCible} !${doublons.length > 0 ? ` ⚠️ ${doublons.length} doublon(s) ignoré(s).` : ''}`);
    } else {
      setMessageRepartition(`⚠️ Aucun élève affecté — tous existent déjà dans ${classeCible}.`);
    }
    
    setElevesSelectionnesRepartition([]);
    chargerEleves();
    setTimeout(() => setMessageRepartition(''), 6000);
  } catch (err) { 
    setMessageRepartition('❌ Erreur: ' + err.message); 
  }
};

  const reinitialiserAnnee = async () => {
    if (!window.confirm('⚠️ ATTENTION ! Cette action va effacer TOUT : tous les élèves, moyennes, inscriptions économat et éducateurs. Cette action est IRRÉVERSIBLE. Confirmer ?')) return;
    if (!window.confirm('🔴 DERNIÈRE CONFIRMATION : TOUS les élèves seront supprimés définitivement. Êtes-vous absolument sûr ?')) return;
    try {
      // 1. Appel au serveur et attente de la réponse complète
      const res = await axios.post(`${API}/eleves/reinitialiser-annee`);

      // 2. Vérifier que le serveur confirme le succès
      if (res.data && res.data.succes === false) {
        alert('❌ Réinitialisation incomplète : ' + res.data.message);
        return;
      }

      // 3. Vider l'affichage local SEULEMENT après confirmation serveur
      setEleves([]);
      setElevesInscription([]);
      setElevesEducateur([]);
      setPaiements({});
      setInscriptionsEducateurs({});
      setClasses([]);

      // 4. Recharger depuis le serveur pour confirmer que c'est vide
      await chargerEleves();
      await chargerPaiements();
      await chargerInscriptionsEducateurs();
      await chargerClasses();

      const nb = res.data?.eleves_supprimes || 0;
      setMessageFormulaire('✅ Réinitialisation complète ! Tous les élèves supprimés.');
      alert(`✅ Réinitialisation terminée !\n${nb} élève(s) supprimé(s).\nNouvelle année prête.`);
    } catch (err) {
      alert('❌ Erreur lors de la réinitialisation : ' + (err.response?.data?.message || err.message));
    }
  };

  const importerTrimestre = async () => {
    if (!fichierExcel) { setImportStatus('⚠️ Choisissez un fichier Excel'); return; }
    setImportEnCours(true); setImportStatus(`⏳ Import ${trimestreActif} en cours...`);
    const formData = new FormData();
    formData.append('fichier', fichierExcel); formData.append('trimestre', trimestreActif);
    try {
      const res = await axios.post(`${API}/import/trimestre`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }, timeout: 300000
      });
      setImportStatus(`✅ ${res.data.mis_a_jour} élèves mis à jour pour ${trimestreActif} !`);
      chargerEleves();
    } catch (err) {
      setImportStatus('❌ Erreur: ' + JSON.stringify(err.response?.data?.erreur || err.message));
    }
    setImportEnCours(false);
  };

  const calculerMoyennesAnnuelles = async () => {
    if (!window.confirm('Calculer MGA et DFA pour tous les élèves ?')) return;
    setCalcEnCours(true); setCalcStatus('⏳ Calcul en cours...');
    try {
      const res = await axios.post(`${API}/eleves/calculer-moyennes`);
      setCalcStatus(`✅ ${res.data.mis_a_jour} élèves mis à jour ! (Admis: ${res.data.admis}, Redoublants: ${res.data.redoublants}, Exclus: ${res.data.exclus})`);
      chargerEleves();
    } catch (err) { setCalcStatus('❌ Erreur: ' + (err.response?.data?.erreur || err.message)); }
    setCalcEnCours(false);
  };

  const ouvrirFiche = (eleve) => { setEleveSelectionne(eleve); setOnglet('fiche'); };
  const ouvrirFormulaire = (eleve = null) => {
    if (eleve) {
      setFormulaire({
        matricule:eleve.matricule||'',nom:eleve.nom||'',prenom:eleve.prenom||'',
        classe:eleve.classe||'',numero_extrait:eleve.numero_extrait||'',
        sexe:eleve.sexe||'',statut:eleve.statut||'Non affecté',qualite:eleve.qualite||'',
        date_naissance:eleve.date_naissance?eleve.date_naissance.split('T')[0]:'',
        lieu_naissance:eleve.lieu_naissance||'',
        moyenne_t1:eleve.moyenne_t1||'',moyenne_t2:eleve.moyenne_t2||'',
        moyenne_t3:eleve.moyenne_t3||'',moyenne_generale:eleve.moyenne_generale||'',
        decision_fin_annee:eleve.decision_fin_annee||'',nom_parent:eleve.nom_parent||'',
        telephone1:eleve.telephone1||'',telephone2:eleve.telephone2||''
      });
      setModeFormulaire('modifier');
    } else {
      setFormulaire({matricule:'',nom:'',prenom:'',classe:'',numero_extrait:'',
        sexe:'',statut:'Non affecté',qualite:'',
        date_naissance:'',lieu_naissance:'',
        moyenne_t1:'',moyenne_t2:'',moyenne_t3:'',moyenne_generale:'',
        decision_fin_annee:'',nom_parent:'',telephone1:'',telephone2:''});
      setModeFormulaire('ajouter');
    }
    setMessageFormulaire(''); setOnglet('formulaire');
  };

  const sauvegarderEleve = async () => {
    if (!formulaire.nom || !formulaire.prenom || !formulaire.classe) {
      setMessageFormulaire('⚠️ Nom, prénom et classe sont obligatoires'); return;
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
    } catch (err) { setMessageFormulaire('❌ Erreur: ' + (err.response?.data?.erreur || err.message)); }
  };

  const supprimerEleve = async (id) => {
    if (!window.confirm('Supprimer cet élève ?')) return;
    try { await axios.delete(`${API}/eleves/${id}`); chargerEleves(); }
    catch (err) { alert('Erreur suppression'); }
  };

  // ===== IMPRESSIONS =====
  const imprimerListeClasse = () => {
    if (!classeFiltre) { alert("Veuillez sélectionner une classe d'abord !"); return; }
    const elevesAImprimer = elevesFiltres.slice().sort((a,b) => (a.nom||'').localeCompare(b.nom||''));
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
      <td style="padding:5px 4px;text-align:center;border:1px solid #ccc;">${e.sexe||'-'}</td>
      <td style="padding:5px 4px;text-align:center;border:1px solid #ccc;">${e.statut||'-'}</td>
      <td style="padding:5px 4px;text-align:center;border:1px solid #ccc;">${e.moyenne_t1||'-'}</td>
      <td style="padding:5px 4px;text-align:center;border:1px solid #ccc;">${e.moyenne_t2||'-'}</td>
      <td style="padding:5px 4px;text-align:center;border:1px solid #ccc;">${e.moyenne_t3||'-'}</td>
      <td style="padding:5px 4px;text-align:center;font-weight:bold;border:1px solid #ccc;">${e.moyenne_generale||'-'}</td>
      <td style="padding:5px 4px;text-align:center;border:1px solid #ccc;color:${e.decision_fin_annee==='Admis'?'green':e.decision_fin_annee==='Redoublant'?'orange':'red'};font-weight:bold;">${e.decision_fin_annee||'-'}</td></tr>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Liste ${classeFiltre}</title>
      <style>body{font-family:Arial,sans-serif;margin:20px;font-size:12px;}
      .entete{text-align:center;margin-bottom:20px;border-bottom:2px solid #000;padding-bottom:10px;}
      table{width:100%;border-collapse:collapse;}thead{background-color:#1e3a5f;color:white;}
      thead th{padding:7px 4px;border:1px solid #ccc;font-size:11px;}
      .stats{display:flex;gap:20px;margin-top:15px;padding:10px;background:#f0f4f8;border-radius:6px;flex-wrap:wrap;}
      .footer{margin-top:30px;display:flex;justify-content:space-between;font-size:11px;}</style></head><body>
      <div class="entete"><h2>${ETABLISSEMENT}</h2><h1>LISTE DES ÉLÈVES DE ${classeFiltre.toUpperCase()}</h1>
      <p>Année scolaire : ${ANNEE_SCOLAIRE}</p></div>
      <table><thead><tr><th>N°</th><th>Matricule</th><th>Nom</th><th>Prénom</th><th>Sexe</th><th>Statut</th><th>T1</th><th>T2</th><th>T3</th><th>MGA</th><th>Décision</th></tr></thead>
      <tbody>${lignes}</tbody></table>
      <div class="stats"><span>Total : <strong>${elevesAImprimer.length}</strong></span>
      <span>Garçons : <strong>${elevesAImprimer.filter(e=>e.sexe==='M').length}</strong></span>
      <span>Filles : <strong>${elevesAImprimer.filter(e=>e.sexe==='F').length}</strong></span>
      <span>Moy. classe : <strong>${moyenneClasse}</strong></span>
      <span style="color:green;">Admis : <strong>${admis}</strong></span>
      <span style="color:orange;">Redoublants : <strong>${redoublants}</strong></span>
      <span style="color:red;">Exclus : <strong>${exclus}</strong></span>
      <span>Taux : <strong>${elevesAImprimer.length > 0 ? Math.round(admis/elevesAImprimer.length*100) : 0}%</strong></span></div>
      <div class="footer"><span>Imprimé le : ${new Date().toLocaleDateString('fr-FR')}</span>
      <span>Signature du Directeur : ________________</span></div>
      <script>window.onload=function(){window.print();}</script></body></html>`;
    const f = window.open('','_blank'); f.document.write(html); f.document.close();
  };

  const imprimerBilanEducateurs = () => {
    const inscrits = eleves.filter(e => estInscritEducateur(e.id)).sort((a,b) => (a.nom||'').localeCompare(b.nom||''));
    const nonInscrits = eleves.filter(e => !estInscritEducateur(e.id)).sort((a,b) => (a.nom||'').localeCompare(b.nom||''));
    const lignesInscrits = inscrits.map((e,i) => {
      const nb = compterDocsEleve(e.id);
      return `<tr><td style="padding:4px 6px;border:1px solid #ccc;text-align:center;">${i+1}</td>
      <td style="padding:4px 6px;border:1px solid #ccc;">${e.matricule||''}</td>
      <td style="padding:4px 6px;border:1px solid #ccc;font-weight:bold;">${e.nom}</td>
      <td style="padding:4px 6px;border:1px solid #ccc;">${e.prenom}</td>
      <td style="padding:4px 6px;border:1px solid #ccc;text-align:center;">${e.sexe||''}</td>
      <td style="padding:4px 6px;border:1px solid #ccc;text-align:center;">${e.classe||''}</td>
      <td style="padding:4px 6px;border:1px solid #ccc;text-align:center;color:green;font-weight:bold;">${nb}/10</td></tr>`;
    }).join('');
    const lignesNonInscrits = nonInscrits.map((e,i) => `<tr>
      <td style="padding:4px 6px;border:1px solid #ccc;text-align:center;">${i+1}</td>
      <td style="padding:4px 6px;border:1px solid #ccc;">${e.matricule||''}</td>
      <td style="padding:4px 6px;border:1px solid #ccc;font-weight:bold;color:red;">${e.nom}</td>
      <td style="padding:4px 6px;border:1px solid #ccc;">${e.prenom}</td>
      <td style="padding:4px 6px;border:1px solid #ccc;text-align:center;">${e.sexe||''}</td>
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
    <div class="entete"><h2>${ETABLISSEMENT}</h2><h1>BILAN INSCRIPTIONS ÉDUCATEURS</h1>
    <p>Année scolaire : ${ANNEE_SCOLAIRE}  Imprimé le ${new Date().toLocaleDateString('fr-FR')}</p></div>
    <div class="stats">
      <span><strong>Total élèves :</strong> ${eleves.length}</span>
      <span style="color:green;"><strong>Inscrits :</strong> ${inscrits.length}</span>
      <span style="color:red;"><strong>Non inscrits :</strong> ${nonInscrits.length}</span>
      <span><strong>Taux :</strong> ${eleves.length > 0 ? Math.round(inscrits.length/eleves.length*100) : 0}%</span>
    </div>
    <h2>✅ ÉLÈVES INSCRITS (${inscrits.length})</h2>
    <table><thead><tr><th>N°</th><th>Matricule</th><th>Nom</th><th>Prénom</th><th>Sexe</th><th>Classe</th><th>Docs</th></tr></thead>
    <tbody>${lignesInscrits}</tbody></table>
    <h2 style="color:red;">❌ ÉLÈVES NON INSCRITS (${nonInscrits.length})</h2>
    <table><thead><tr><th>N°</th><th>Matricule</th><th>Nom</th><th>Prénom</th><th>Sexe</th><th>Classe</th><th>Parent</th><th>Téléphone</th></tr></thead>
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
      <td style="padding:4px 6px;border:1px solid #ccc;text-align:center;">${e.sexe||''}</td>
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
    <p>Année scolaire : ${ANNEE_SCOLAIRE} — ${new Date().toLocaleDateString('fr-FR')}</p></div>
    <div class="stats">
      <span>Total : <strong>${eleves.length}</strong></span>
      <span style="color:green;">Inscrits aux 2 : <strong>${deuxListes.length}</strong></span>
      <span style="color:orange;">Économat seul : <strong>${ecoSeul.length}</strong></span>
      <span style="color:purple;">Éducateurs seul : <strong>${eduSeul.length}</strong></span>
      <span style="color:red;">Aucun : <strong>${aucun.length}</strong></span>
    </div>
    <h2 style="background:#dcfce7;color:#166534;">✅ INSCRITS AUX DEUX (${deuxListes.length})</h2>
    <table><thead><tr><th>N°</th><th>Matricule</th><th>Nom</th><th>Prénom</th><th>Sexe</th><th>Classe</th><th>Parent</th><th>Téléphone</th></tr></thead>
    <tbody>${mkTable(deuxListes,'#166534')}</tbody></table>
    <h2 style="background:#fef3c7;color:#92400e;">⚠️ ÉCONOMAT SEULEMENT (${ecoSeul.length})</h2>
    <table><thead><tr><th>N°</th><th>Matricule</th><th>Nom</th><th>Prénom</th><th>Sexe</th><th>Classe</th><th>Parent</th><th>Téléphone</th></tr></thead>
    <tbody>${mkTable(ecoSeul,'#92400e')}</tbody></table>
    <h2 style="background:#ede9fe;color:#5b21b6;">⚠️ ÉDUCATEURS SEULEMENT (${eduSeul.length})</h2>
    <table><thead><tr><th>N°</th><th>Matricule</th><th>Nom</th><th>Prénom</th><th>Sexe</th><th>Classe</th><th>Parent</th><th>Téléphone</th></tr></thead>
    <tbody>${mkTable(eduSeul,'#5b21b6')}</tbody></table>
    <h2 style="background:#fee2e2;color:#991b1b;">❌ NON INSCRITS DU TOUT (${aucun.length})</h2>
    <table><thead><tr><th>N°</th><th>Matricule</th><th>Nom</th><th>Prénom</th><th>Sexe</th><th>Classe</th><th>Parent</th><th>Téléphone</th></tr></thead>
    <tbody>${mkTable(aucun,'#991b1b')}</tbody></table>
    <div class="footer"><span>L'Éducateur : ________________</span><span>L'Économe : ________________</span><span>Le Directeur : ________________</span></div>
    <script>window.onload=function(){window.print();}</script></body></html>`;
    const f = window.open('','_blank'); f.document.write(html); f.document.close();
  };

  const imprimerListeBEPC = () => {
    const classes3eme = classes.filter(c => c.toLowerCase().startsWith('3'));
    const admisBepc = eleves.filter(e => classes3eme.some(c => c === e.classe) && e.resultat_bepc === 'Admis')
      .sort((a,b) => (parseFloat(b.moyenne_generale)||0)-(parseFloat(a.moyenne_generale)||0));
    const lignes = admisBepc.map((e,i) => `
      <tr><td style="padding:5px 4px;text-align:center;border:1px solid #ccc;">${i+1}</td>
      <td style="padding:5px 4px;border:1px solid #ccc;">${e.matricule||''}</td>
      <td style="padding:5px 4px;font-weight:bold;border:1px solid #ccc;">${e.nom||''}</td>
      <td style="padding:5px 4px;border:1px solid #ccc;">${e.prenom||''}</td>
      <td style="padding:5px 4px;text-align:center;border:1px solid #ccc;">${e.sexe||'-'}</td>
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
      <table><thead><tr><th>N°</th><th>Matricule</th><th>Nom</th><th>Prénom</th><th>Sexe</th><th>Classe</th><th>MGA</th><th>Parent</th><th>Téléphone</th></tr></thead>
      <tbody>${lignes}</tbody></table>
      <div class="stats">✅ <strong>Total admis au BEPC : ${admisBepc.length} élèves</strong>
      (Garçons : ${admisBepc.filter(e=>e.sexe==='M').length} — Filles : ${admisBepc.filter(e=>e.sexe==='F').length})</div>
      <div class="footer"><span>Imprimé le : ${new Date().toLocaleDateString('fr-FR')}</span>
      <span>Signature : ________________</span></div>
      <script>window.onload=function(){window.print();}</script></body></html>`;
    const f = window.open('','_blank'); f.document.write(html); f.document.close();
  };

  // ===== BEPC : modifier résultat manuellement =====
  const modifierResultatBepc = async (id, valeur) => {
    try {
      await axios.put(`${API}/eleves/bepc/${id}`, { resultat_bepc: valeur });
      setEleves(prev => prev.map(e => e.id === id ? { ...e, resultat_bepc: valeur } : e));
    } catch (err) { alert('Erreur: ' + err.message); }
  };

  // ===== ORIENTATION 2NDE : modifier manuellement =====
  const modifierOrientation = async (id, valeur) => {
    try {
      await axios.put(`${API}/eleves/orientation/${id}`, { orientation_seconde: valeur });
      setEleves(prev => prev.map(e => e.id === id ? { ...e, orientation_seconde: valeur } : e));
    } catch (err) { alert('Erreur: ' + err.message); }
  };

  const imprimerListePayes = () => {
    const filtre = classeFiltreInscription;
    const liste = elevesInscription.filter(e => paiements[e.id]).sort((a,b) => (a.nom||'').localeCompare(b.nom||''));
    const lignes = liste.map((e,i) => `
      <tr><td style="padding:5px 4px;text-align:center;border:1px solid #ccc;">${i+1}</td>
      <td style="padding:5px 4px;border:1px solid #ccc;">${e.matricule||''}</td>
      <td style="padding:5px 4px;font-weight:bold;border:1px solid #ccc;">${e.nom||''}</td>
      <td style="padding:5px 4px;border:1px solid #ccc;">${e.prenom||''}</td>
      <td style="padding:5px 4px;text-align:center;border:1px solid #ccc;">${e.sexe||'-'}</td>
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
      <p>Année scolaire : ${ANNEE_SCOLAIRE}${filtre?' — Classe : '+filtre:' — Toutes classes'}</p></div>
      <table><thead><tr><th>N°</th><th>Matricule</th><th>Nom</th><th>Prénom</th><th>Sexe</th><th>Classe</th><th>Date paiement</th><th>Montant</th></tr></thead>
      <tbody>${lignes}</tbody></table>
      <div class="stats"><span>✅ <strong>Total payés :</strong> ${liste.length}</span>
      <span>💰 <strong>Total encaissé :</strong> ${liste.length * MONTANT_INSCRIPTION} FCFA</span></div>
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
      `<table><thead><tr><th>N°</th><th>Matricule</th><th>Nom</th><th>Prénom</th><th>Classe</th><th>Montant</th></tr></thead>
      <tbody>${lignes}</tbody></table>`}
      <div class="recap"><div style="font-size:13px;font-weight:bold;color:#166534;margin-bottom:8px;">RÉCAPITULATIF DE LA JOURNÉE</div>
      <div style="display:flex;justify-content:space-between;"><span>Nombre d'élèves :</span><span><strong>${liste.length}</strong></span></div>
      <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:bold;color:#166534;margin-top:8px;padding-top:8px;border-top:2px solid #16a34a;">
      <span>TOTAL ENCAISSÉ CE JOUR :</span><span>${(liste.length*MONTANT_INSCRIPTION).toLocaleString()} FCFA</span></div></div>
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
        <div style="font-size:1.8rem;">🏫</div>
        <div class="entete-texte">
          <h2>${ETABLISSEMENT}</h2>
          <p>Année scolaire : ${ANNEE_SCOLAIRE}</p>
        </div>
      </div>
      <div class="titre-recu">📄 REÇU DE PAIEMENT — DROITS D'INSCRIPTION</div>
      <div class="corps">
        ${eleve.photo_url
          ? `<img src="${eleve.photo_url}" class="photo" onerror="this.style.display='none'"/>`
          : `<div class="photo-placeholder">👤</div>`}
        <div class="infos">
          <div class="nom">${eleve.nom} ${eleve.prenom}</div>
          <div class="classe">Classe : ${eleve.classe}${eleve.sexe ? ' — ' + (eleve.sexe==='M'?'Garçon':'Fille') : ''}</div>
          <div class="ligne"><span>Matricule :</span><span>${eleve.matricule||'-'}</span></div>
          <div class="ligne"><span>Statut :</span><span>${eleve.statut||'-'}</span></div>
          <div class="ligne"><span>Date de paiement :</span><span>${datePaiement}</span></div>
          <div class="ligne"><span>Inscription :</span><span><span class="badge-ok">✅ PAYÉ</span></span></div>
        </div>
      </div>
      <div class="montant-box">
        <span class="montant-label">💰 Montant reçu :</span>
        <span class="montant-val">${MONTANT_INSCRIPTION.toLocaleString()} FCFA</span>
      </div>
      <div class="phrase">
        Le présent reçu certifie que l'élève <strong>${eleve.nom} ${eleve.prenom}</strong> s'est acquitté du droit d'inscription pour l'année scolaire <strong>${ANNEE_SCOLAIRE}</strong>.<br/>
        Ce document fait foi auprès de l'administration scolaire et des parents ou tuteurs légaux.
      </div>
      <div class="signatures">
        <div class="sig"><div>L'Économe</div><div class="sig-line"></div></div>
        <div class="sig" style="text-align:center;font-size:9px;color:#9ca3af;">N° : ${eleve.id}-${new Date().getFullYear()}</div>
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
      <div class="entete"><h2>${ETABLISSEMENT}</h2><h1>TROMBINOSCOPE${classeTrombi?' — '+classeTrombi:''}</h1>
      <p>Année scolaire : ${ANNEE_SCOLAIRE} — ${elevesClasse.length} élève(s)</p></div>
      <div>${cartes}</div>
      <script>window.onload=function(){window.print();}</script></body></html>`;
    const f = window.open('','_blank'); f.document.write(html); f.document.close();
  };

  // ========= DONNÉES CALCULÉES =========
  const elevesClasse = classeFiltre ? elevesFiltres : elevesFiltres;
  const moyenneClasseFiltre = classeFiltre && elevesClasse.length > 0
    ? (() => { const v=elevesClasse.filter(e=>e.moyenne_generale&&parseFloat(e.moyenne_generale)>0);
        return v.length>0?(v.reduce((s,e)=>s+parseFloat(e.moyenne_generale),0)/v.length).toFixed(2):'-'; })() : '-';
  const classes3eme = classes.filter(c => c.toLowerCase().startsWith('3'));
  const totalAdmisBepc = eleves.filter(e => classes3eme.some(c=>c===e.classe) && e.resultat_bepc==='Admis').length;
  const totalOrientes = eleves.filter(e => classes3eme.some(c=>c===e.classe) && e.orientation_seconde==='Orienté').length;
  const eleves3eme = eleves.filter(e => classes3eme.some(c=>c===e.classe));
  const total3eme = eleves3eme.length;
  const garcons3eme = eleves3eme.filter(e=>e.sexe==='M').length;
  const filles3eme = eleves3eme.filter(e=>e.sexe==='F').length;
  const admisGarcons = eleves3eme.filter(e=>e.resultat_bepc==='Admis'&&e.sexe==='M').length;
  const admisFilles = eleves3eme.filter(e=>e.resultat_bepc==='Admis'&&e.sexe==='F').length;
  const pctAdmisGarcons = garcons3eme>0 ? Math.round(admisGarcons/garcons3eme*100) : 0;
  const pctAdmisFilles = filles3eme>0 ? Math.round(admisFilles/filles3eme*100) : 0;
  const pctAdmisTotal = total3eme>0 ? Math.round(totalAdmisBepc/total3eme*100) : 0;
  const totalPayes = Object.keys(paiements).length;
  const totalNonPayes = eleves.length - totalPayes;
  const montantTotal = totalPayes * MONTANT_INSCRIPTION;
  const elevesAffichesInscription = elevesInscription;
  const payesDansVue = elevesAffichesInscription.filter(e=>paiements[e.id]).length;
  const nonPayesDansVue = elevesAffichesInscription.length - payesDansVue;
  const elevesDuJourIds = new Set(Object.values(paiements).filter(p=>p.date_paiement&&p.date_paiement.split('T')[0]===dateBilan).map(p=>p.eleve_id));
  const nbPayesDuJour = elevesDuJourIds.size;
  const montantDuJour = nbPayesDuJour * MONTANT_INSCRIPTION;
  const elevesTrombi = classeTrombi ? eleves.filter(e=>e.classe===classeTrombi) : eleves;
  const avecPhoto = elevesTrombi.filter(e=>e.photo_url).length;

  // Stats sexe pour la liste
  const nbGarcons = elevesFiltres.filter(e=>e.sexe==='M').length;
  const nbFilles = elevesFiltres.filter(e=>e.sexe==='F').length;

  // ===== ÉCRAN CHARGEMENT =====

  const chargerAnneesArchives = async () => {
    try {
      const res = await axios.get(`${API}/archives/annees`);
      setAnneesArchives(res.data);
    } catch (err) { console.error(err); }
  };

  const chargerElevesArchive = async (annee) => {
    try {
      const res = await axios.get(`${API}/archives/${annee}`);
      setElevesArchive(res.data);
    } catch (err) { console.error(err); }
  };

  const rechercherDansArchive = async (annee, q) => {
    if (!q || q.length < 2) { chargerElevesArchive(annee); return; }
    try {
      const res = await axios.get(`${API}/archives/${annee}/recherche?q=${q}`);
      setElevesArchive(res.data);
    } catch (err) { console.error(err); }
  };

  const rechercherGlobal = async (q) => {
    setRechercheGlobale(q);
    if (!q || q.length < 2) { setResultatsGlobaux([]); return; }
    try {
      const res = await axios.get(`${API}/archives/recherche/global?q=${q}`);
      setResultatsGlobaux(res.data);
    } catch (err) { console.error(err); }
  };

  const archiverAnnee = async () => {
    if (!anneeAArchiver) { setMessageArchive('⚠️ Saisissez l\'année scolaire'); return; }
    if (!window.confirm(`Archiver toute l'année ${anneeAArchiver} ? (${eleves.length} élèves)`)) return;
    setArchivageEnCours(true); setMessageArchive('');
    try {
      const res = await axios.post(`${API}/archives/archiver`, { annee_scolaire: anneeAArchiver });
      setMessageArchive(`✅ ${res.data.message}`);
      chargerAnneesArchives();
      setTimeout(() => setMessageArchive(''), 5000);
    } catch (err) {
      setMessageArchive('❌ Erreur: ' + (err.response?.data?.erreur || err.message));
    }
    setArchivageEnCours(false);
  };

  // Charger archives quand on va sur l'onglet
  const allerArchives = () => {
    setOnglet('archives');
    chargerAnneesArchives();
  };


  if (!appChargee) {



    return (
      <div style={{minHeight:'100vh',background:'linear-gradient(135deg, #1e3a5f 0%, #2563eb 60%, #0ea5e9 100%)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Segoe UI, Arial, sans-serif'}}>
        <div style={{background:'white',borderRadius:'24px',padding:'3rem 3.5rem',textAlign:'center',width:'360px',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
          <div style={{fontSize:'4rem',marginBottom:'0.5rem'}}>🏫</div>
          <h1 style={{margin:'0 0 0.25rem',color:'#1e3a5f',fontSize:'2rem',fontWeight:'800',letterSpacing:'1px'}}>WebScool</h1>
          <p style={{color:'#64748b',fontSize:'0.85rem',margin:'0 0 2rem'}}>Collège Moderne Bouaké Dar Es Salam</p>
          <div style={{background:'#e2e8f0',borderRadius:'999px',height:'12px',overflow:'hidden',marginBottom:'1rem'}}>
            <div style={{background:'linear-gradient(90deg, #2563eb, #0ea5e9)',height:'100%',width:`${progressChargement}%`,borderRadius:'999px',transition:'width 0.4s ease',boxShadow:'0 0 8px rgba(37,99,235,0.5)'}}/>
          </div>
          <div style={{fontSize:'1.5rem',fontWeight:'bold',color:'#2563eb',marginBottom:'0.5rem'}}>{progressChargement}%</div>
          <p style={{color:messageChargement.includes('✅')?'#166534':'#475569',fontSize:'0.9rem',fontWeight:'600',margin:'0',minHeight:'1.5rem'}}>{messageChargement}</p>
          {!messageChargement.includes('✅') && (
            <div style={{marginTop:'1.5rem',display:'flex',justifyContent:'center',gap:'6px'}}>
              {[0,1,2].map(i=>(<div key={i} style={{width:'8px',height:'8px',borderRadius:'50%',background:'#2563eb',animation:`bounce 1.2s ease-in-out ${i*0.2}s infinite`}}/>))}
            </div>
          )}
          <p style={{color:'#94a3b8',fontSize:'0.75rem',marginTop:'1.5rem',marginBottom:'0'}}>🔄 Le serveur se réveille, merci de patienter...</p>
        </div>
        <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0);opacity:0.4;}40%{transform:translateY(-8px);opacity:1;}}`}</style>
      </div>
    );
  }

  if (!connecte) {
    return (
      <div style={s.loginPage}>
        <div style={s.loginBox}>
          <div style={{fontSize:'3rem',marginBottom:'0.5rem'}}>🏫</div>
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

  return (
    <div style={s.app}>
      <div style={s.header}>
        <div style={s.headerLeft}>
          <span style={{fontSize:'1.8rem'}}>🏫</span>
          <div>
            <div style={s.headerTitre}>WebScool</div>
            <div style={s.headerSous}>{eleves.length} élèves — {ETABLISSEMENT}</div>
          </div>
        </div>
        <button onClick={()=>setConnecte(false)} style={s.btnDeconnecter}>Déconnexion</button>
      </div>

      <div style={s.nav}>
        {[['liste','👥 Élèves'],['formulaire','➕ Ajouter'],['importer','📤 Importer'],
          ['bepc','🎓 BEPC'],['inscription','💰 Inscription'],['photos','📷 Photos'],
          ['educateurs','📋 Éducateurs'],['controle','🔍 Contrôle'],['repartition','🏫 Répartition'],['archives','🗂️ Archives']].map(([id,label])=>(
          <button key={id} onClick={()=>{if(id==='archives'){allerArchives();}else{setOnglet(id);if(id==='formulaire')ouvrirFormulaire();}}}
            style={onglet===id?s.navBtnActif:s.navBtn}>{label}</button>
        ))}
      </div>

      {/* ===== LISTE ===== */}
      {onglet==='liste' && (
        <div style={s.contenu}>
          <div style={s.filtres}>
            <input placeholder="🔍 Rechercher par nom ou matricule..." value={recherche}
              onChange={e=>rechercherEleves(e.target.value)} style={s.inputRecherche} />
            <select value={classeFiltre} onChange={e=>filtrerParClasse(e.target.value)} style={s.selectClasse}>
              <option value="">Toutes les classes</option>
              {classes.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <select value={sexeFiltre} onChange={e=>setSexeFiltre(e.target.value)} style={s.selectClasse}>
              <option value="">Tous (Sexe)</option>
              <option value="M">👦 Garçons</option>
              <option value="F">👧 Filles</option>
            </select>
            <select value={statutFiltre} onChange={e=>setStatutFiltre(e.target.value)} style={s.selectClasse}>
              <option value="">Tous (Statut)</option>
              {STATUTS.map(st=><option key={st} value={st}>{st}</option>)}
            </select>
            {classeFiltre && <button onClick={imprimerListeClasse} style={s.btnImprimerClasse}>🖨️ Imprimer</button>}
          </div>

          {/* Stats rapides */}
          <div style={{display:'flex',gap:'0.75rem',marginBottom:'0.75rem',flexWrap:'wrap',fontSize:'0.85rem'}}>
            <span style={s.statPill}>👥 Total : <strong>{elevesFiltres.length}</strong></span>
            <span style={{...s.statPill,background:'#dbeafe'}}>👦 Garçons : <strong>{nbGarcons}</strong></span>
            <span style={{...s.statPill,background:'#fce7f3'}}>👧 Filles : <strong>{nbFilles}</strong></span>
            {classeFiltre && <span style={{...s.statPill,background:'#dcfce7'}}>Moy. : <strong>{moyenneClasseFiltre}</strong></span>}
            {classeFiltre && <span style={{...s.statPill,background:'#dcfce7'}}>✅ Admis : <strong>{elevesClasse.filter(e=>e.decision_fin_annee==='Admis').length}</strong></span>}
            {classeFiltre && <span style={{...s.statPill,background:'#fef3c7'}}>🔄 Redoublants : <strong>{elevesClasse.filter(e=>e.decision_fin_annee==='Redoublant').length}</strong></span>}
          </div>

          <div style={s.tableWrap}>
            <table style={{...s.table, fontSize:'0.8rem', tableLayout:'fixed', width:'100%'}}>
              <colgroup>
                <col style={{width:'32px'}}/>
                <col style={{width:'36px'}}/>
                <col style={{width:'90px'}}/>
                <col style={{width:'160px'}}/>
                <col style={{width:'110px'}}/>
                <col style={{width:'60px'}}/>
                <col style={{width:'80px'}}/>
                <col style={{width:'130px'}}/>
                <col style={{width:'42px'}}/>
                <col style={{width:'42px'}}/>
                <col style={{width:'42px'}}/>
                <col style={{width:'50px'}}/>
                <col style={{width:'80px'}}/>
                <col style={{width:'80px'}}/>
              </colgroup>
              <thead style={s.tableHead}>
                <tr>
                  <th style={{...s.th, padding:'0.5rem 3px'}}>#</th>
                  <th style={{...s.th, padding:'0.5rem 3px'}}>📷</th>
                  <th style={{...s.th, padding:'0.5rem 4px'}}>Matricule</th>
                  <th style={{...s.th, padding:'0.5rem 4px'}}>Nom &amp; Prénom</th>
                  <th style={{...s.th, padding:'0.5rem 4px'}}>Naissance</th>
                  <th style={{...s.th, padding:'0.5rem 4px'}}>Sexe</th>
                  <th style={{...s.th, padding:'0.5rem 4px'}}>Statut / Qualité</th>
                  <th style={{...s.th, padding:'0.5rem 4px'}}>Parent / Tél.</th>
                  <th style={{...s.th, textAlign:'center', background:'#1a4a8a', padding:'0.5rem 3px'}}>T1</th>
                  <th style={{...s.th, textAlign:'center', background:'#1a4a8a', padding:'0.5rem 3px'}}>T2</th>
                  <th style={{...s.th, textAlign:'center', background:'#1a4a8a', padding:'0.5rem 3px'}}>T3</th>
                  <th style={{...s.th, textAlign:'center', background:'#0f3460', padding:'0.5rem 3px'}}>MGA</th>
                  <th style={{...s.th, background:'#0f3460', padding:'0.5rem 4px'}}>Décision</th>
                  <th style={{...s.th, padding:'0.5rem 4px'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {elevesFiltres.map((e,i)=>(
                  <tr key={e.id} style={i%2===0?s.trPair:s.trImpair}>
                    <td style={{...s.td, textAlign:'center', color:'#94a3b8', fontSize:'0.72rem', padding:'4px 3px'}}>{i+1}</td>
                    <td style={{...s.td, padding:'3px 2px'}}>
                      {e.photo_url
                        ? <img src={e.photo_url} alt="" style={{width:'28px',height:'35px',objectFit:'cover',borderRadius:'3px',border:'1px solid #ddd'}}/>
                        : <div style={{width:'28px',height:'35px',background:'#e2e8f0',borderRadius:'3px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.9rem'}}>👤</div>
                      }
                    </td>
                    <td style={{...s.td, fontFamily:'monospace', fontSize:'0.73rem', padding:'4px'}}>{e.matricule}</td>
                    <td style={{...s.td, padding:'4px'}}>
                      <div style={{fontWeight:'700', fontSize:'0.8rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{e.nom}</div>
                      <div style={{fontSize:'0.75rem', color:'#475569', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{e.prenom}</div>
                      <span style={{...s.badgeClasse, fontSize:'0.68rem', padding:'1px 5px'}}>{e.classe}</span>
                    </td>
                    <td style={{...s.td, fontSize:'0.75rem', padding:'4px'}}>
                      {e.date_naissance ? new Date(e.date_naissance).toLocaleDateString('fr-FR') : '-'}
                      {e.lieu_naissance ? <div style={{color:'#94a3b8', fontSize:'0.7rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{e.lieu_naissance}</div> : null}
                    </td>
                    <td style={{...s.td, textAlign:'center', padding:'4px'}}>
                      <span style={e.sexe==='M'?s.badgeGarcon:e.sexe==='F'?s.badgeFille:{}}>
                        {e.sexe==='M'?'M':e.sexe==='F'?'F':'-'}
                      </span>
                    </td>
                    <td style={{...s.td, padding:'4px'}}>
                      <span style={{...(e.statut==='Affecté'?s.badgeAdmis:e.statut==='Transféré'?s.badgeRedoublant:s.badgeStatutNeutral), fontSize:'0.68rem', padding:'1px 5px', display:'block', marginBottom:'2px', textAlign:'center'}}>
                        {e.statut||'-'}
                      </span>
                      <div style={{fontSize:'0.7rem', color:'#64748b', textAlign:'center', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{e.qualite||''}</div>
                    </td>
                    <td style={{...s.td, padding:'4px'}}>
                      <div style={{fontSize:'0.75rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{e.nom_parent||'-'}</div>
                      {e.telephone1 && <a href={`tel:${e.telephone1}`} style={{...s.telLink, fontSize:'0.72rem'}}>📞 {e.telephone1}</a>}
                    </td>
                    <td style={{...s.td, textAlign:'center', fontWeight:'600', padding:'4px 3px', color: e.moyenne_t1 ? (parseFloat(e.moyenne_t1)>=10?'#166534':'#991b1b') : '#94a3b8'}}>
                      {e.moyenne_t1||'-'}
                    </td>
                    <td style={{...s.td, textAlign:'center', fontWeight:'600', padding:'4px 3px', color: e.moyenne_t2 ? (parseFloat(e.moyenne_t2)>=10?'#166534':'#991b1b') : '#94a3b8'}}>
                      {e.moyenne_t2||'-'}
                    </td>
                    <td style={{...s.td, textAlign:'center', fontWeight:'600', padding:'4px 3px', color: e.moyenne_t3 ? (parseFloat(e.moyenne_t3)>=10?'#166534':'#991b1b') : '#94a3b8'}}>
                      {e.moyenne_t3||'-'}
                    </td>
                    <td style={{...s.td, textAlign:'center', padding:'4px 3px'}}>
                      <strong style={{fontSize:'0.85rem', color: e.moyenne_generale ? (parseFloat(e.moyenne_generale)>=10?'#166534':'#991b1b') : '#94a3b8'}}>
                        {e.moyenne_generale||'-'}
                      </strong>
                    </td>
                    <td style={{...s.td, padding:'4px'}}>
                      <span style={{...(e.decision_fin_annee==='Admis'?s.badgeAdmis:e.decision_fin_annee==='Redoublant'?s.badgeRedoublant:e.decision_fin_annee==='Exclu'?s.badgeExclu:{}), fontSize:'0.68rem', padding:'1px 5px', whiteSpace:'nowrap'}}>
                        {e.decision_fin_annee||'-'}
                      </span>
                    </td>
                    <td style={{...s.td, whiteSpace:'nowrap', padding:'4px 3px'}}>
                      <button onClick={()=>ouvrirFiche(e)} style={{...s.btnVoir, padding:'3px 6px', marginRight:'2px'}}>👁️</button>
                      <button onClick={()=>{setEleveSelectionne(e);ouvrirFormulaire(e);}} style={{...s.btnModifier, padding:'3px 6px', marginRight:'2px'}}>✏️</button>
                      <button onClick={()=>supprimerEleve(e.id)} style={{...s.btnSupprimer, padding:'3px 6px'}}>🗑️</button>
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
                  : <span style={{fontSize:'3rem'}}>👤</span>
                }
              </div>
              <div>
                <h2 style={s.ficheNom}>{eleveSelectionne.nom} {eleveSelectionne.prenom}</h2>
                <p style={s.ficheClasse}>Classe : {eleveSelectionne.classe}</p>
                <p style={s.ficheMatricule}>Matricule : {eleveSelectionne.matricule}</p>
                <div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap',marginTop:'0.5rem'}}>
                  {eleveSelectionne.sexe && <span style={eleveSelectionne.sexe==='M'?s.badgeGarcon:s.badgeFille}>{eleveSelectionne.sexe==='M'?'👦 Garçon':'👧 Fille'}</span>}
                  {eleveSelectionne.statut && <span style={eleveSelectionne.statut==='Affecté'?s.badgeAdmis:eleveSelectionne.statut==='Transféré'?s.badgeRedoublant:s.badgeStatutNeutral}>{eleveSelectionne.statut}</span>}
                  {eleveSelectionne.qualite && <span style={{background:'#f0fdf4',color:'#166534',padding:'2px 8px',borderRadius:'12px',fontSize:'0.8rem'}}>{eleveSelectionne.qualite}</span>}
                </div>
                <p style={{margin:'8px 0 4px'}}>Inscription : {paiements[eleveSelectionne.id]
                  ? <span style={s.badgeAdmis}>✅ Payé</span>
                  : <span style={s.badgeExclu}>❌ Non payé</span>}</p>
                {paiements[eleveSelectionne.id] && (
                  <button onClick={()=>imprimerRecuPaiement(eleveSelectionne)} style={{marginTop:'8px',background:'#0f766e',color:'white',border:'none',borderRadius:'8px',padding:'6px 14px',cursor:'pointer',fontWeight:'600',fontSize:'0.9rem'}}>
                    🖨️ Imprimer le reçu
                  </button>
                )}
              </div>
            </div>
            <div style={s.ficheGrid}>
              <div style={s.ficheSection}>
                <h3 style={s.sectionTitre}>👨‍👩‍👧 Contact parent</h3>
                <p><strong>Nom :</strong> {eleveSelectionne.nom_parent||'-'}</p>
                <p><strong>Tél 1 :</strong> {eleveSelectionne.telephone1?<a href={`tel:${eleveSelectionne.telephone1}`} style={s.telLink}>{eleveSelectionne.telephone1}</a>:'-'}</p>
                <p><strong>Tél 2 :</strong> {eleveSelectionne.telephone2?<a href={`tel:${eleveSelectionne.telephone2}`} style={s.telLink}>{eleveSelectionne.telephone2}</a>:'-'}</p>
              </div>
              <div style={s.ficheSection}>
                <h3 style={s.sectionTitre}>📅 Naissance</h3>
                <p><strong>Date :</strong> {eleveSelectionne.date_naissance ? new Date(eleveSelectionne.date_naissance).toLocaleDateString('fr-FR') : '-'}</p>
                <p><strong>Lieu :</strong> {eleveSelectionne.lieu_naissance||'-'}</p>
              </div>
              <div style={s.ficheSection}>
                <h3 style={s.sectionTitre}>📊 Résultats scolaires</h3>
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
          <h2 style={s.titrePage}>{modeFormulaire==='ajouter'?'➕ Ajouter un élève':'✏️ Modifier un élève'}</h2>
          <div style={s.formCard}>
            <h3 style={s.sectionTitre}>📋 Informations générales</h3>
            <div style={s.formGrid}>
              <div><label style={s.label}>Matricule</label><input value={formulaire.matricule} onChange={e=>setFormulaire({...formulaire,matricule:e.target.value})} style={s.input}/></div>
              <div><label style={s.label}>Nom *</label><input value={formulaire.nom} onChange={e=>setFormulaire({...formulaire,nom:e.target.value})} style={s.input}/></div>
              <div><label style={s.label}>Prénom *</label><input value={formulaire.prenom} onChange={e=>setFormulaire({...formulaire,prenom:e.target.value})} style={s.input}/></div>
              <div><label style={s.label}>📅 Date de naissance</label><input type="date" value={formulaire.date_naissance} onChange={e=>setFormulaire({...formulaire,date_naissance:e.target.value})} style={s.input}/></div>
              <div><label style={s.label}>📍 Lieu de naissance</label><input value={formulaire.lieu_naissance} onChange={e=>setFormulaire({...formulaire,lieu_naissance:e.target.value})} style={s.input} placeholder="ex: Bouaké"/></div>
              <div><label style={s.label}>Classe *</label>
                <input value={formulaire.classe} onChange={e=>setFormulaire({...formulaire,classe:e.target.value})} style={s.input} list="liste-classes"/>
                <datalist id="liste-classes">{classes.map(c=><option key={c} value={c}/>)}</datalist>
              </div>
            </div>

            {/* Nouvelles colonnes */}
            <h3 style={{...s.sectionTitre,marginTop:'1.5rem'}}>👤 Identité & Statut</h3>
            <div style={s.formGrid}>
              <div>
                <label style={s.label}>Sexe</label>
                <select value={formulaire.sexe} onChange={e=>setFormulaire({...formulaire,sexe:e.target.value})} style={s.input}>
                  <option value="">-- Choisir --</option>
                  <option value="M">👦 Masculin (M)</option>
                  <option value="F">👧 Féminin (F)</option>
                </select>
              </div>
              <div>
                <label style={s.label}>Statut</label>
                <select value={formulaire.statut} onChange={e=>setFormulaire({...formulaire,statut:e.target.value})} style={s.input}>
                  {STATUTS.map(st=><option key={st} value={st}>{st}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Qualité</label>
                <select value={formulaire.qualite} onChange={e=>setFormulaire({...formulaire,qualite:e.target.value})} style={s.input}>
                  {QUALITES.map(q=><option key={q} value={q}>{q||'-- Choisir --'}</option>)}
                </select>
              </div>
              <div><label style={s.label}>N° Extrait</label><input value={formulaire.numero_extrait} onChange={e=>setFormulaire({...formulaire,numero_extrait:e.target.value})} style={s.input}/></div>
            </div>

            <h3 style={{...s.sectionTitre,marginTop:'1.5rem'}}>👨‍👩‍👧 Contact parent</h3>
            <div style={s.formGrid}>
              <div><label style={s.label}>Nom parent</label><input value={formulaire.nom_parent} onChange={e=>setFormulaire({...formulaire,nom_parent:e.target.value})} style={s.input}/></div>
              <div><label style={s.label}>Téléphone 1</label><input value={formulaire.telephone1} onChange={e=>setFormulaire({...formulaire,telephone1:e.target.value})} style={s.input} type="tel"/></div>
              <div><label style={s.label}>Téléphone 2</label><input value={formulaire.telephone2} onChange={e=>setFormulaire({...formulaire,telephone2:e.target.value})} style={s.input} type="tel"/></div>
            </div>

            {messageFormulaire&&<p style={messageFormulaire.includes('✅')?s.succes:s.erreur}>{messageFormulaire}</p>}
            <button onClick={sauvegarderEleve} style={s.btnSauvegarder}>{modeFormulaire==='ajouter'?'➕ Ajouter':'✅ Sauvegarder'}</button>
          </div>
        </div>
      )}

      {/* ===== IMPORTER ===== */}
      {onglet==='importer' && (
        <div style={s.contenu}>
          <h2 style={s.titrePage}>📤 Import des données</h2>

          {/* ---- Import liste élèves ---- */}
          <div style={{background:'#eff6ff',border:'2px solid #3b82f6',borderRadius:'12px',padding:'1.25rem',marginBottom:'1.5rem'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:'0.75rem',marginBottom:'0.75rem'}}>
              <div>
                <p style={{fontWeight:'700',color:'#1e40af',margin:'0 0 4px',fontSize:'1rem'}}>👥 Import liste des élèves (Excel)</p>
                <p style={{fontSize:'0.8rem',color:'#475569',margin:0}}>
                  Colonnes supportées :
                  {['matricule','nom','prenom','classe','sexe','statut','qualite','DateNaiss','LieuNaiss','nom_parent','telephone1','telephone2'].map(c=>(
                    <span key={c} style={{fontFamily:'monospace',background:'#dbeafe',padding:'1px 5px',borderRadius:'4px',marginLeft:'4px',fontSize:'0.78rem'}}>{c}</span>
                  ))}
                </p>
              </div>
              <button onClick={telechargerModeleEleves}
                style={{background:'#2563eb',color:'white',border:'none',borderRadius:'8px',padding:'0.55rem 1.2rem',cursor:'pointer',fontWeight:'600',fontSize:'0.88rem',whiteSpace:'nowrap'}}>
                ⬇️ Télécharger modèle (.xls)
              </button>
            </div>

            {/* Zone de dépôt du fichier */}
            <div style={{background:'white',border:'2px dashed #93c5fd',borderRadius:'10px',padding:'1.25rem',marginBottom:'0.75rem'}}>
              <div style={{display:'flex',alignItems:'center',gap:'1rem',flexWrap:'wrap'}}>
                <label style={{cursor:'pointer',background:'#2563eb',color:'white',padding:'0.55rem 1.2rem',borderRadius:'8px',fontWeight:'600',fontSize:'0.9rem',display:'inline-block'}}>
                  📂 Choisir le fichier Excel
                  <input type="file" accept=".xlsx,.xls,.csv" style={{display:'none'}}
                    onChange={e=>{
                      const f=e.target.files[0];
                      setFichierImportEleves(f);
                      setImportElevesStatus('');
                      setAfficherAperçu(false);
                      if(f) lireAperçuExcel(f);
                    }}/>
                </label>
                {fichierImportEleves && (
                  <span style={{color:'#1e40af',fontWeight:'600',fontSize:'0.9rem'}}>
                    📄 {fichierImportEleves.name}
                  </span>
                )}
              </div>

              {/* Aperçu du fichier */}
              {afficherAperçu && colonnesDetectees.length > 0 && (
                <div style={{marginTop:'1rem'}}>
                  <p style={{fontWeight:'600',color:'#1e3a5f',fontSize:'0.85rem',margin:'0 0 0.5rem'}}>
                    👁️ Aperçu — Colonnes détectées : {colonnesDetectees.join(', ')}
                  </p>
                  <div style={{overflowX:'auto'}}>
                    <table style={{borderCollapse:'collapse',fontSize:'0.78rem',width:'100%'}}>
                      <thead>
                        <tr>{colonnesDetectees.map(c=>(
                          <th key={c} style={{background:'#1e3a5f',color:'white',padding:'4px 8px',border:'1px solid #ccc',fontWeight:'600'}}>{c}</th>
                        ))}</tr>
                      </thead>
                      <tbody>
                        {aperçuImport.map((ligne,i)=>(
                          <tr key={i} style={{background:i%2===0?'white':'#f8fafc'}}>
                            {ligne.map((cell,j)=>(
                              <td key={j} style={{padding:'4px 8px',border:'1px solid #e2e8f0'}}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p style={{fontSize:'0.75rem',color:'#9ca3af',margin:'4px 0 0'}}>Affichage des 5 premières lignes</p>
                  </div>
                </div>
              )}
            </div>

            <button onClick={importerEleves} disabled={importElevesEnCours || !fichierImportEleves}
              style={{background: !fichierImportEleves ?'#94a3b8':'#16a34a',color:'white',border:'none',borderRadius:'8px',padding:'0.65rem 1.5rem',cursor:!fichierImportEleves?'not-allowed':'pointer',fontWeight:'700',fontSize:'0.95rem'}}>
              {importElevesEnCours?'⏳ Import en cours...':'📥 Lancer l\'import des élèves'}
            </button>
            {importElevesStatus && <p style={importElevesStatus.includes('✅')?s.succes:s.erreur}>{importElevesStatus}</p>}
          </div>

          {/* ---- Import moyennes ---- */}
          <div style={s.importCard}>
            <h3 style={s.sectionTitre}>📊 Import des moyennes trimestrielles</h3>
            <div style={s.trimestreBtns}>
              {['T1','T2','T3'].map(t=>(
                <button key={t} onClick={()=>setTrimestreActif(t)} style={trimestreActif===t?s.trimestreBtnActif:s.trimestreBtn}>Trimestre {t}</button>
              ))}
            </div>
            <div style={{background:'#f0fdf4',border:'1.5px solid #86efac',borderRadius:'10px',padding:'1rem',marginBottom:'1.25rem'}}>
              <p style={{fontWeight:'700',color:'#166534',marginBottom:'4px',fontSize:'0.9rem'}}>📥 Modèle pour {trimestreActif}</p>
              <p style={{fontSize:'0.8rem',color:'#475569',marginBottom:'0.75rem'}}>
                2 colonnes requises :
                <span style={{fontFamily:'monospace',background:'#dcfce7',padding:'2px 6px',borderRadius:'4px',marginLeft:'6px',fontWeight:'700'}}>matricule</span>
                <span style={{fontFamily:'monospace',background:'#dcfce7',padding:'2px 6px',borderRadius:'4px',marginLeft:'6px',fontWeight:'700'}}>moy_trim{trimestreActif.replace('T','')}</span>
              </p>
              <button onClick={()=>telechargerModele(trimestreActif)}
                style={{background:'#16a34a',color:'white',border:'none',borderRadius:'8px',padding:'0.55rem 1.2rem',cursor:'pointer',fontWeight:'600',fontSize:'0.88rem'}}>
                ⬇️ Télécharger modèle {trimestreActif} (.xls)
              </button>
            </div>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={e=>setFichierExcel(e.target.files[0])} style={{margin:'0.75rem 0'}}/>
            <br/>
            <button onClick={importerTrimestre} disabled={importEnCours} style={s.btnImportExcel}>
              {importEnCours?`⏳ Import ${trimestreActif}...`:`📥 Importer ${trimestreActif}`}
            </button>
            {importStatus&&<p style={importStatus.includes('✅')?s.succes:s.erreur}>{importStatus}</p>}

            <hr style={{margin:'2rem 0',border:'none',borderTop:'2px solid #e2e8f0'}}/>
            <h3 style={s.sectionTitre}>📊 Calcul automatique MGA + DFA</h3>
            <button onClick={calculerMoyennesAnnuelles} disabled={calcEnCours} style={s.btnCalculer}>
              {calcEnCours?'⏳ Calcul...':'📊 Calculer MGA + DFA'}
            </button>
            {calcStatus&&<p style={calcStatus.includes('✅')?s.succes:s.erreur}>{calcStatus}</p>}

            <hr style={{margin:'2rem 0',border:'none',borderTop:'2px solid #e2e8f0'}}/>
            <h3 style={{...s.sectionTitre,color:'#991b1b'}}>🔄 Réinitialisation nouvelle année</h3>
            <p style={{fontSize:'0.85rem',color:'#64748b',marginBottom:'0.75rem'}}>
              Efface les moyennes, inscriptions économat et éducateurs,Les élèves et photos.
            </p>
            <button onClick={reinitialiserAnnee}
              style={{background:'#dc2626',color:'white',border:'none',borderRadius:'8px',padding:'0.75rem 1.5rem',cursor:'pointer',fontSize:'1rem',fontWeight:'600'}}>
              🔄 Réinitialiser pour nouvelle année
            </button>
          </div>
        </div>
      )}

      {/* ===== BEPC ===== */}
      {onglet==='bepc' && (
        <div style={s.contenu}>
          <h2 style={s.titrePage}>🎓 Liste des Admis au BEPC</h2>

          {/* --- Tableau récap stats --- */}
          <div style={s.bepcInfo}>
            <p style={{marginBottom:'0.75rem'}}>Classes 3ème : <strong>{classes3eme.join(', ')||'Aucune'}</strong></p>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.9rem',marginBottom:'0.5rem'}}>
              <thead>
                <tr style={{background:'#166534',color:'white'}}>
                  {['','Garçons','Filles','Total','% Garçons','% Filles','% Total'].map(h=>(
                    <th key={h} style={{padding:'8px 12px',textAlign:'center',fontWeight:'bold'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={{background:'#f0fdf4'}}>
                  <td style={{padding:'7px 12px',fontWeight:'bold',color:'#374151'}}>👥 Inscrits 3ème</td>
                  <td style={{padding:'7px 12px',textAlign:'center',fontWeight:'bold',color:'#1d4ed8'}}>{garcons3eme}</td>
                  <td style={{padding:'7px 12px',textAlign:'center',fontWeight:'bold',color:'#be185d'}}>{filles3eme}</td>
                  <td style={{padding:'7px 12px',textAlign:'center',fontWeight:'bold'}}>{total3eme}</td>
                  <td style={{padding:'7px 12px',textAlign:'center',color:'#6b7280'}}>-</td>
                  <td style={{padding:'7px 12px',textAlign:'center',color:'#6b7280'}}>-</td>
                  <td style={{padding:'7px 12px',textAlign:'center',color:'#6b7280'}}>-</td>
                </tr>
                <tr style={{background:'#dcfce7'}}>
                  <td style={{padding:'7px 12px',fontWeight:'bold',color:'#166534'}}>✅ Admis BEPC</td>
                  <td style={{padding:'7px 12px',textAlign:'center',fontWeight:'bold',color:'#1d4ed8'}}>{admisGarcons}</td>
                  <td style={{padding:'7px 12px',textAlign:'center',fontWeight:'bold',color:'#be185d'}}>{admisFilles}</td>
                  <td style={{padding:'7px 12px',textAlign:'center',fontWeight:'bold',color:'#166534',fontSize:'1.05rem'}}>{totalAdmisBepc}</td>
                  <td style={{padding:'7px 12px',textAlign:'center',color:'#1d4ed8',fontWeight:'bold'}}>{pctAdmisGarcons}%</td>
                  <td style={{padding:'7px 12px',textAlign:'center',color:'#be185d',fontWeight:'bold'}}>{pctAdmisFilles}%</td>
                  <td style={{padding:'7px 12px',textAlign:'center',color:'#166534',fontWeight:'bold'}}>{pctAdmisTotal}%</td>
                </tr>
                <tr style={{background:'#dbeafe'}}>
                  <td style={{padding:'7px 12px',fontWeight:'bold',color:'#1d4ed8'}}>🎓 Orientés 2nde</td>
                  <td style={{padding:'7px 12px',textAlign:'center',fontWeight:'bold',color:'#1d4ed8'}}>{eleves3eme.filter(e=>e.orientation_seconde==='Orienté'&&e.sexe==='M').length}</td>
                  <td style={{padding:'7px 12px',textAlign:'center',fontWeight:'bold',color:'#be185d'}}>{eleves3eme.filter(e=>e.orientation_seconde==='Orienté'&&e.sexe==='F').length}</td>
                  <td style={{padding:'7px 12px',textAlign:'center',fontWeight:'bold',color:'#1d4ed8',fontSize:'1.05rem'}}>{totalOrientes}</td>
                  <td style={{padding:'7px 12px',textAlign:'center',color:'#6b7280'}}>-</td>
                  <td style={{padding:'7px 12px',textAlign:'center',color:'#6b7280'}}>-</td>
                  <td style={{padding:'7px 12px',textAlign:'center',color:'#6b7280'}}>-</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* --- Tableau de saisie des résultats BEPC --- */}
          <div style={s.importCard}>
            <h3 style={{margin:'0 0 1rem',color:'#1e3a5f'}}>📝 Saisir les résultats BEPC par élève</h3>
            <p style={{color:'#64748b',marginBottom:'1rem',fontSize:'0.9rem'}}>
              Cochez le résultat BEPC de chaque élève de 3ème indépendamment de sa DFA de classe.
            </p>
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead style={{...s.tableHead,background:'#1e3a5f'}}>
                  <tr>
                    {['#','Matricule','Nom & Prénom','Sexe','Classe','MGA','DFA classe','Résultat BEPC','Orienté 2nde'].map(h=><th key={h} style={s.th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {eleves.filter(e=>classes3eme.some(c=>c===e.classe))
                    .sort((a,b)=>(a.classe||'').localeCompare(b.classe||'')||(a.nom||'').localeCompare(b.nom||''))
                    .map((e,i)=>(
                    <tr key={e.id} style={i%2===0?s.trPair:s.trImpair}>
                      <td style={s.td}>{i+1}</td>
                      <td style={s.td}>{e.matricule}</td>
                      <td style={s.td}><strong>{e.nom}</strong> {e.prenom}</td>
                      <td style={{...s.td,textAlign:'center'}}>
                        <span style={e.sexe==='M'?s.badgeGarcon:e.sexe==='F'?s.badgeFille:{padding:'3px 8px',borderRadius:'12px',background:'#e5e7eb',color:'#6b7280',fontSize:'0.8rem'}}>
                          {e.sexe||'-'}
                        </span>
                      </td>
                      <td style={s.td}><span style={s.badgeClasse}>{e.classe}</span></td>
                      <td style={s.td}><strong style={{color:'#2563eb'}}>{e.moyenne_generale||'-'}</strong></td>
                      <td style={s.td}>
                        <span style={e.decision_fin_annee==='Admis'?s.badgeAdmis:e.decision_fin_annee==='Redoublant'?s.badgeRedoublant:s.badgeExclu}>
                          {e.decision_fin_annee||'-'}
                        </span>
                      </td>
                      <td style={{...s.td,textAlign:'center'}}>
                        <select
                          value={e.resultat_bepc||''}
                          onChange={ev=>modifierResultatBepc(e.id, ev.target.value)}
                          style={{padding:'4px 8px',borderRadius:'6px',border:'1px solid #cbd5e1',fontSize:'0.85rem',
                            background: e.resultat_bepc==='Admis'?'#dcfce7':e.resultat_bepc==='Échoué'?'#fee2e2':e.resultat_bepc==='Absent'?'#fef9c3':'white',
                            fontWeight:'bold',color:e.resultat_bepc==='Admis'?'#166534':e.resultat_bepc==='Échoué'?'#991b1b':e.resultat_bepc==='Absent'?'#92400e':'#64748b'
                          }}
                        >
                          <option value="">— Non saisi —</option>
                          <option value="Admis">✅ Admis</option>
                          <option value="Échoué">❌ Échoué</option>
                          <option value="Absent">⚠️ Absent</option>
                        </select>
                      </td>
                      <td style={{...s.td,textAlign:'center'}}>
                        <select
                          value={e.orientation_seconde||''}
                          onChange={ev=>modifierOrientation(e.id, ev.target.value)}
                          style={{padding:'4px 8px',borderRadius:'6px',border:'1px solid #cbd5e1',fontSize:'0.85rem',
                            background: e.orientation_seconde==='Orienté'?'#dbeafe':e.orientation_seconde==='Non orienté'?'#fee2e2':'white',
                            fontWeight:'bold',color:e.orientation_seconde==='Orienté'?'#1e40af':e.orientation_seconde==='Non orienté'?'#991b1b':'#64748b'
                          }}
                        >
                          <option value="">— Non saisi —</option>
                          <option value="Orienté">🎓 Orienté</option>
                          <option value="Non orienté">❌ Non orienté</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* --- Liste officielle des admis --- */}
          <div style={{...s.importCard,marginTop:'1.5rem'}}>
            <h3 style={{margin:'0 0 1rem',color:'#166534'}}>✅ Liste officielle des admis au BEPC ({totalAdmisBepc})</h3>
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead style={{...s.tableHead,background:'#166534'}}>
                  <tr>{['#','Matricule','Nom','Prénom','Sexe','Classe','MGA','Parent','Téléphone'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {eleves.filter(e=>classes3eme.some(c=>c===e.classe)&&e.resultat_bepc==='Admis')
                    .sort((a,b)=>(parseFloat(b.moyenne_generale)||0)-(parseFloat(a.moyenne_generale)||0))
                    .map((e,i)=>(
                    <tr key={e.id} style={i%2===0?s.trPair:s.trImpair}>
                      <td style={s.td}>{i+1}</td><td style={s.td}>{e.matricule}</td>
                      <td style={s.td}><strong>{e.nom}</strong></td><td style={s.td}>{e.prenom}</td>
                      <td style={s.td}><span style={e.sexe==='M'?s.badgeGarcon:e.sexe==='F'?s.badgeFille:{}}>{e.sexe||'-'}</span></td>
                      <td style={s.td}><span style={s.badgeClasse}>{e.classe}</span></td>
                      <td style={s.td}><strong style={{color:'green'}}>{e.moyenne_generale||'-'}</strong></td>
                      <td style={s.td}>{e.nom_parent||'-'}</td>
                      <td style={s.td}>{e.telephone1?<a href={`tel:${e.telephone1}`} style={s.telLink}>📞 {e.telephone1}</a>:'-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <br/>
            <button onClick={imprimerListeBEPC} style={{...s.btnCalculer,background:'#166534'}}>🖨️ Imprimer liste BEPC</button>
          </div>
        </div>
      )}

      {/* ===== INSCRIPTION ===== */}
      {onglet==='inscription' && (
        <div style={s.contenu}>
          <h2 style={s.titrePage}>💰 Droits d'inscription — {ANNEE_SCOLAIRE}</h2>
          <div style={s.sousNav}>
            <button onClick={()=>setSousOngletInscription('encaissement')} style={sousOngletInscription==='encaissement'?s.sousNavActif:s.sousNavBtn}>💰 Encaissement</button>
            <button onClick={()=>setSousOngletInscription('bilan')} style={sousOngletInscription==='bilan'?s.sousNavActif:s.sousNavBtn}>📅 Bilan journalier</button>
          </div>
          {sousOngletInscription==='encaissement' && (
            <>
              <div style={s.statsInscription}>
                <div style={s.statBox}><div style={s.statNum}>{totalPayes}</div><div style={s.statLabel}>✅ Ont payé</div></div>
                <div style={{...s.statBox,background:'#fee2e2'}}><div style={{...s.statNum,color:'#991b1b'}}>{totalNonPayes}</div><div style={s.statLabel}>❌ Non payés</div></div>
                <div style={{...s.statBox,background:'#dcfce7'}}><div style={{...s.statNum,color:'#166534'}}>{montantTotal.toLocaleString()}</div><div style={s.statLabel}>💰 FCFA encaissés</div></div>
                <div style={{...s.statBox,background:'#fef3c7'}}><div style={{...s.statNum,color:'#92400e'}}>{(totalNonPayes*MONTANT_INSCRIPTION).toLocaleString()}</div><div style={s.statLabel}>⏳ FCFA restants</div></div>
              </div>
              <div style={s.filtres}>
                <input placeholder="🔍 Rechercher..." value={rechercheInscription} onChange={e=>rechercherInscription(e.target.value)} style={s.inputRecherche}/>
                <select value={classeFiltreInscription} onChange={e=>filtrerInscriptionParClasse(e.target.value)} style={s.selectClasse}>
                  <option value="">Toutes les classes</option>
                  {classes.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={imprimerListePayes} style={s.btnImprimerClasse}>🖨️ Imprimer liste des payés</button>
              </div>
              {messageInscription&&<div style={messageInscription.includes('✅')?s.alertSucces:s.alertErreur}>{messageInscription}</div>}
              <p style={s.compteur}>{elevesAffichesInscription.length} élève(s) — ✅ {payesDansVue} | ❌ {nonPayesDansVue}</p>
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead style={s.tableHead}>
                    <tr>{['#','Matricule','Nom','Prénom','Sexe','Classe','Parent','Statut','Action'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {elevesAffichesInscription.map((e,i)=>(
                      <tr key={e.id} style={i%2===0?s.trPair:s.trImpair}>
                        <td style={s.td}>{i+1}</td><td style={s.td}>{e.matricule}</td>
                        <td style={s.td}><strong>{e.nom}</strong></td><td style={s.td}>{e.prenom}</td>
                        <td style={s.td}><span style={e.sexe==='M'?s.badgeGarcon:e.sexe==='F'?s.badgeFille:{}}>{e.sexe||'-'}</span></td>
                        <td style={s.td}><span style={s.badgeClasse}>{e.classe}</span></td>
                        <td style={s.td}>{e.nom_parent||'-'}</td>
                        <td style={s.td}>{paiements[e.id]?<span style={s.badgeAdmis}>✅ Payé {paiements[e.id].date_paiement?new Date(paiements[e.id].date_paiement).toLocaleDateString('fr-FR'):''}</span>:<span style={s.badgeExclu}>❌ Non payé</span>}</td>
                        <td style={s.td}>
                          <button onClick={()=>togglePaiement(e)} style={paiements[e.id]?s.btnAnnulerPaiement:s.btnPayer}>{paiements[e.id]?'❌ Annuler':'✅ Encaisser'}</button>
                          {paiements[e.id] && <button onClick={()=>imprimerRecuPaiement(e)} style={{...s.btnVoir,marginLeft:'4px',background:'#0f766e'}}>🖨️ Reçu</button>}
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
              <button onClick={imprimerBilanJournalier} style={s.btnBilanImprimer}>🖨️ Imprimer le bilan journalier</button>
            </div>
          )}
        </div>
      )}

      {/* ===== PHOTOS ===== */}
      {onglet==='photos' && (
        <div style={s.contenu}>
          <h2 style={s.titrePage}>📷 Gestion des photos</h2>
          <div style={s.sousNav}>
            <button onClick={()=>setSousOngletPhotos('import')} style={sousOngletPhotos==='import'?{...s.sousNavActif,background:'#7c3aed',borderColor:'#7c3aed'}:s.sousNavBtn}>📤 Import groupé</button>
            <button onClick={()=>setSousOngletPhotos('trombi')} style={sousOngletPhotos==='trombi'?{...s.sousNavActif,background:'#7c3aed',borderColor:'#7c3aed'}:s.sousNavBtn}>🖼️ Trombinoscope</button>
            <button onClick={()=>setSousOngletPhotos('recherche')} style={sousOngletPhotos==='recherche'?{...s.sousNavActif,background:'#7c3aed',borderColor:'#7c3aed'}:s.sousNavBtn}>🔍 Recherche photo</button>
          </div>
          {sousOngletPhotos==='import' && (
            <div style={s.importCard}>
              <h3 style={s.sectionTitre}>📤 Import groupé de photos</h3>
              <div style={{background:'#faf5ff',border:'2px dashed #7c3aed',borderRadius:'12px',padding:'2rem',textAlign:'center',marginBottom:'1.5rem'}}>
                <div style={{fontSize:'3rem',marginBottom:'0.5rem'}}>📷</div>
                <p style={{fontWeight:'600',color:'#5b21b6',marginBottom:'0.5rem'}}>Sélectionnez toutes vos photos d'un coup</p>
                <p style={{color:'#7c3aed',fontSize:'0.85rem',marginBottom:'1rem'}}>Les fichiers doivent être nommés avec le matricule : <strong>21421986V.JPG</strong></p>
                <input ref={fileInputRef} type="file" accept="image/*" multiple
                  onChange={e=>importerPhotosGroupees(e.target.files)}
                  style={{display:'none'}}/>
                <button onClick={()=>fileInputRef.current.click()} disabled={uploadEnCours}
                  style={{background:'#7c3aed',color:'white',border:'none',borderRadius:'8px',padding:'0.75rem 2rem',cursor:'pointer',fontSize:'1rem',fontWeight:'600'}}>
                  {uploadEnCours?'⏳ Upload en cours...':'📂 Choisir les photos'}
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
              {uploadStatus && <p style={uploadStatus.includes('✅')?s.succes:uploadStatus.includes('⏳')?{color:'#5b21b6',fontWeight:'600'}:s.erreur}>{uploadStatus}</p>}
              <div style={{background:'#f0fdf4',borderRadius:'8px',padding:'1rem',marginTop:'1rem'}}>
                <p style={{fontWeight:'600',color:'#166534',margin:'0 0 0.5rem'}}>📊 Statistiques photos :</p>
                <p style={{margin:'0',color:'#374151'}}>✅ Élèves avec photo : <strong>{eleves.filter(e=>e.photo_url).length}</strong> / {eleves.length}</p>
                <p style={{margin:'4px 0 0',color:'#374151'}}>❌ Sans photo : <strong>{eleves.filter(e=>!e.photo_url).length}</strong></p>
              </div>
            </div>
          )}
          {sousOngletPhotos==='trombi' && (
            <div style={s.importCard}>
              <h3 style={s.sectionTitre}>🖼️ Trombinoscope</h3>
              <div style={{display:'flex',gap:'1rem',marginBottom:'1.5rem',alignItems:'center',flexWrap:'wrap'}}>
                <select value={classeTrombi} onChange={e=>setClasseTrombi(e.target.value)} style={{...s.selectClasse,fontSize:'1rem',padding:'0.6rem 1rem'}}>
                  <option value="">Toutes les classes</option>
                  {classes.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
                <span style={{color:'#64748b',fontSize:'0.9rem'}}>{avecPhoto} photo(s) sur {elevesTrombi.length} élève(s)</span>
                <button onClick={imprimerTrombinoscope} style={{background:'#7c3aed',color:'white',border:'none',borderRadius:'8px',padding:'0.6rem 1.2rem',cursor:'pointer',fontWeight:'600'}}>
                  🖨️ Imprimer trombinoscope
                </button>
              </div>
              <div style={{display:'flex',flexWrap:'wrap',gap:'12px'}}>
                {elevesTrombi.map(e => (
                  <div key={e.id} style={{width:'130px',textAlign:'center',border:'1px solid #e2e8f0',borderRadius:'10px',padding:'10px',background:'white',boxShadow:'0 2px 6px rgba(0,0,0,0.06)'}}>
                    {e.photo_url
                      ? <img src={e.photo_url} alt="" style={{width:'110px',height:'140px',objectFit:'cover',borderRadius:'6px',border:'2px solid #dbeafe'}}/>
                      : <div style={{width:'110px',height:'140px',background:'#f1f5f9',borderRadius:'6px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'2.5rem',margin:'0 auto'}}>👤</div>
                    }
                    <div style={{marginTop:'6px',fontWeight:'bold',fontSize:'0.78rem',color:'#1e3a5f'}}>{e.nom}</div>
                    <div style={{fontSize:'0.72rem',color:'#64748b'}}>{e.prenom}</div>
                    <span style={{...s.badgeClasse,fontSize:'0.68rem'}}>{e.classe}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {sousOngletPhotos==='recherche' && (
            <div style={s.importCard}>
              <h3 style={s.sectionTitre}>🔍 Recherche rapide d'un élève</h3>
              <input placeholder="🔍 Tapez le nom ou matricule de l'élève..." value={recherchePhoto}
                onChange={e=>rechercherElevePhoto(e.target.value)}
                style={{...s.inputRecherche,width:'100%',fontSize:'1.1rem',padding:'0.85rem 1rem',marginBottom:'1.5rem',boxSizing:'border-box'}}/>
              {eleveRecherchePhoto && (
                <div style={{display:'flex',gap:'2rem',background:'white',borderRadius:'16px',padding:'2rem',boxShadow:'0 4px 16px rgba(0,0,0,0.1)',flexWrap:'wrap',alignItems:'flex-start'}}>
                  <div style={{textAlign:'center'}}>
                    {eleveRecherchePhoto.photo_url
                      ? <img src={eleveRecherchePhoto.photo_url} alt="" style={{width:'180px',height:'220px',objectFit:'cover',borderRadius:'12px',border:'4px solid #7c3aed',boxShadow:'0 4px 16px rgba(124,58,237,0.3)'}}/>
                      : <div style={{width:'180px',height:'220px',background:'#f1f5f9',borderRadius:'12px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'5rem',border:'4px solid #e2e8f0'}}>👤</div>
                    }
                  </div>
                  <div style={{flex:1,minWidth:'200px'}}>
                    <h2 style={{color:'#1e3a5f',fontSize:'1.8rem',margin:'0 0 0.5rem'}}>{eleveRecherchePhoto.nom}</h2>
                    <h3 style={{color:'#2563eb',fontSize:'1.3rem',margin:'0 0 1.5rem',fontWeight:'400'}}>{eleveRecherchePhoto.prenom}</h3>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem'}}>
                      <div style={{background:'#dbeafe',borderRadius:'8px',padding:'0.75rem'}}><div style={{fontSize:'0.75rem',color:'#64748b'}}>MATRICULE</div><div style={{fontWeight:'bold',color:'#1e3a5f',fontSize:'1rem'}}>{eleveRecherchePhoto.matricule||'-'}</div></div>
                      <div style={{background:'#dbeafe',borderRadius:'8px',padding:'0.75rem'}}><div style={{fontSize:'0.75rem',color:'#64748b'}}>CLASSE</div><div style={{fontWeight:'bold',color:'#1e3a5f',fontSize:'1rem'}}>{eleveRecherchePhoto.classe||'-'}</div></div>
                      <div style={{background:'#fce7f3',borderRadius:'8px',padding:'0.75rem'}}><div style={{fontSize:'0.75rem',color:'#64748b'}}>SEXE</div><div style={{fontWeight:'bold',color:'#be185d',fontSize:'1rem'}}>{eleveRecherchePhoto.sexe==='M'?'👦 Garçon':eleveRecherchePhoto.sexe==='F'?'👧 Fille':'-'}</div></div>
                      <div style={{background:'#f0fdf4',borderRadius:'8px',padding:'0.75rem'}}><div style={{fontSize:'0.75rem',color:'#64748b'}}>STATUT</div><div style={{fontWeight:'bold',color:'#166534',fontSize:'0.9rem'}}>{eleveRecherchePhoto.statut||'-'}</div></div>
                      <div style={{background:'#f0fdf4',borderRadius:'8px',padding:'0.75rem'}}><div style={{fontSize:'0.75rem',color:'#64748b'}}>TÉLÉPHONE</div><div style={{fontWeight:'bold',color:'#166534',fontSize:'1rem'}}>{eleveRecherchePhoto.telephone1||'-'}</div></div>
                      <div style={{background:'#f0fdf4',borderRadius:'8px',padding:'0.75rem'}}><div style={{fontSize:'0.75rem',color:'#64748b'}}>MGA</div><div style={{fontWeight:'bold',color:'#166534',fontSize:'1rem'}}>{eleveRecherchePhoto.moyenne_generale||'-'}</div></div>
                    </div>
                    <div style={{marginTop:'1rem',background:'#f8fafc',borderRadius:'8px',padding:'0.75rem'}}><div style={{fontSize:'0.75rem',color:'#64748b'}}>PARENT</div><div style={{fontWeight:'600',color:'#374151'}}>{eleveRecherchePhoto.nom_parent||'-'}</div></div>
                    <div style={{marginTop:'0.75rem'}}><span style={eleveRecherchePhoto.decision_fin_annee==='Admis'?s.badgeAdmis:eleveRecherchePhoto.decision_fin_annee==='Redoublant'?s.badgeRedoublant:s.badgeExclu}>{eleveRecherchePhoto.decision_fin_annee||'Décision non disponible'}</span></div>
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
          <h2 style={s.titrePage}>📋 Inscriptions Éducateurs</h2>
          <div style={s.sousNav}>
            <button onClick={()=>setSousOngletEducateur('saisie')} style={sousOngletEducateur==='saisie'?{...s.sousNavActif,background:'#0369a1',borderColor:'#0369a1'}:s.sousNavBtn}>✏️ Saisie documents</button>
            <button onClick={()=>setSousOngletEducateur('liste')} style={sousOngletEducateur==='liste'?{...s.sousNavActif,background:'#0369a1',borderColor:'#0369a1'}:s.sousNavBtn}>📋 Liste inscrits</button>
            <button onClick={()=>setSousOngletEducateur('bilan')} style={sousOngletEducateur==='bilan'?{...s.sousNavActif,background:'#0369a1',borderColor:'#0369a1'}:s.sousNavBtn}>📊 Bilan</button>
          </div>
          {sousOngletEducateur==='saisie' && (
            <>
              <div style={s.filtres}>
                <input placeholder="🔍 Rechercher un élève..." value={rechercheEducateur}
                  onChange={e=>rechercherEleveEducateur(e.target.value)} style={s.inputRecherche}/>
                <select value={classeFiltreEducateur} onChange={e=>filtrerEducateurParClasse(e.target.value)} style={s.selectClasse}>
                  <option value="">Toutes les classes</option>
                  {classes.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {messageEducateur && <div style={messageEducateur.includes('✅')?s.alertSucces:s.alertErreur}>{messageEducateur}</div>}
              <p style={s.compteur}>{elevesEducateur.length} élève(s) — ✅ {elevesEducateur.filter(e=>estInscritEducateur(e.id)).length} inscrits | ❌ {elevesEducateur.filter(e=>!estInscritEducateur(e.id)).length} non inscrits</p>
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead style={{...s.tableHead,background:'#0369a1'}}>
                    <tr>
                      <th style={s.th}>#</th>
                      <th style={s.th}>Élève</th>
                      <th style={s.th}>Sexe</th>
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
                          <td style={s.td}><span style={e.sexe==='M'?s.badgeGarcon:e.sexe==='F'?s.badgeFille:{}}>{e.sexe||'-'}</span></td>
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
                              ? <span style={s.badgeAdmis}>✅ Inscrit</span>
                              : <span style={s.badgeExclu}>❌ Non inscrit</span>
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
          {sousOngletEducateur==='liste' && (
            <div style={s.importCard}>
              <div style={s.statsInscription}>
                <div style={s.statBox}><div style={s.statNum}>{eleves.filter(e=>estInscritEducateur(e.id)).length}</div><div style={s.statLabel}>✅ Inscrits</div></div>
                <div style={{...s.statBox,background:'#fee2e2'}}><div style={{...s.statNum,color:'#991b1b'}}>{eleves.filter(e=>!estInscritEducateur(e.id)).length}</div><div style={s.statLabel}>❌ Non inscrits</div></div>
              </div>
              <h3 style={{color:'#0369a1',marginBottom:'0.75rem'}}>✅ Élèves inscrits ({eleves.filter(e=>estInscritEducateur(e.id)).length})</h3>
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead style={{...s.tableHead,background:'#0369a1'}}>
                    <tr>{['#','Matricule','Nom','Prénom','Sexe','Classe','Docs','Économat'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {eleves.filter(e=>estInscritEducateur(e.id)).sort((a,b)=>(a.nom||'').localeCompare(b.nom||'')).map((e,i)=>(
                      <tr key={e.id} style={i%2===0?s.trPair:s.trImpair}>
                        <td style={s.td}>{i+1}</td><td style={s.td}>{e.matricule}</td>
                        <td style={s.td}><strong>{e.nom}</strong></td><td style={s.td}>{e.prenom}</td>
                        <td style={s.td}><span style={e.sexe==='M'?s.badgeGarcon:e.sexe==='F'?s.badgeFille:{}}>{e.sexe||'-'}</span></td>
                        <td style={s.td}><span style={s.badgeClasse}>{e.classe}</span></td>
                        <td style={{...s.td,textAlign:'center',fontWeight:'bold',color:'#0369a1'}}>{compterDocsEleve(e.id)}/10</td>
                        <td style={s.td}>{paiements[e.id]?<span style={s.badgeAdmis}>✅ Payé</span>:<span style={s.badgeExclu}>❌ Non payé</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <h3 style={{color:'#991b1b',marginTop:'1.5rem',marginBottom:'0.75rem'}}>❌ Élèves non inscrits ({eleves.filter(e=>!estInscritEducateur(e.id)).length})</h3>
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead style={{...s.tableHead,background:'#991b1b'}}>
                    <tr>{['#','Matricule','Nom','Prénom','Sexe','Classe','Parent','Téléphone'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {eleves.filter(e=>!estInscritEducateur(e.id)).sort((a,b)=>(a.nom||'').localeCompare(b.nom||'')).map((e,i)=>(
                      <tr key={e.id} style={i%2===0?s.trPair:s.trImpair}>
                        <td style={s.td}>{i+1}</td><td style={s.td}>{e.matricule}</td>
                        <td style={s.td}><strong style={{color:'#991b1b'}}>{e.nom}</strong></td><td style={s.td}>{e.prenom}</td>
                        <td style={s.td}><span style={e.sexe==='M'?s.badgeGarcon:e.sexe==='F'?s.badgeFille:{}}>{e.sexe||'-'}</span></td>
                        <td style={s.td}><span style={s.badgeClasse}>{e.classe}</span></td>
                        <td style={s.td}>{e.nom_parent||'-'}</td>
                        <td style={s.td}>{e.telephone1?<a href={`tel:${e.telephone1}`} style={s.telLink}>📞 {e.telephone1}</a>:'-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {sousOngletEducateur==='bilan' && (
            <div style={s.importCard}>
              <h3 style={s.sectionTitre}>📊 Bilan des inscriptions éducateurs</h3>
              <div style={s.statsInscription}>
                <div style={s.statBox}><div style={s.statNum}>{eleves.filter(e=>estInscritEducateur(e.id)).length}</div><div style={s.statLabel}>✅ Inscrits</div></div>
                <div style={{...s.statBox,background:'#fee2e2'}}><div style={{...s.statNum,color:'#991b1b'}}>{eleves.filter(e=>!estInscritEducateur(e.id)).length}</div><div style={s.statLabel}>❌ Non inscrits</div></div>
                <div style={{...s.statBox,background:'#dbeafe'}}><div style={{...s.statNum,color:'#1e3a5f'}}>{eleves.length}</div><div style={s.statLabel}>👥 Total élèves</div></div>
                <div style={{...s.statBox,background:'#dcfce7'}}><div style={{...s.statNum,color:'#166534'}}>{eleves.length>0?Math.round(eleves.filter(e=>estInscritEducateur(e.id)).length/eleves.length*100):0}%</div><div style={s.statLabel}>📈 Taux inscription</div></div>
              </div>
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead style={{...s.tableHead,background:'#0369a1'}}>
                    <tr>
                      <th style={s.th}>#</th><th style={s.th}>Nom</th><th style={s.th}>Prénom</th>
                      <th style={s.th}>Sexe</th><th style={s.th}>Classe</th>
                      {DOCUMENTS_EDUCATEURS.map(d=><th key={d.key} style={{...s.th,fontSize:'0.7rem'}}>{d.label}</th>)}
                      <th style={s.th}>Total</th><th style={s.th}>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eleves.slice().sort((a,b)=>(a.nom||'').localeCompare(b.nom||'')).map((e,i)=>{
                      const ie = inscriptionsEducateurs[e.id] || {};
                      const nb = compterDocsEleve(e.id);
                      return (
                        <tr key={e.id} style={i%2===0?s.trPair:s.trImpair}>
                          <td style={s.td}>{i+1}</td>
                          <td style={s.td}><strong>{e.nom}</strong></td><td style={s.td}>{e.prenom}</td>
                          <td style={s.td}><span style={e.sexe==='M'?s.badgeGarcon:e.sexe==='F'?s.badgeFille:{}}>{e.sexe||'-'}</span></td>
                          <td style={s.td}><span style={s.badgeClasse}>{e.classe}</span></td>
                          {DOCUMENTS_EDUCATEURS.map(d=>(
                            <td key={d.key} style={{...s.td,textAlign:'center'}}>{ie[d.key] ? '✅' : '❌'}</td>
                          ))}
                          <td style={{...s.td,textAlign:'center',fontWeight:'bold',color:nb===10?'#166534':nb>=5?'#92400e':'#991b1b'}}>{nb}/10</td>
                          <td style={s.td}>{estInscritEducateur(e.id)?<span style={s.badgeAdmis}>✅ Inscrit</span>:<span style={s.badgeExclu}>❌ Manquant</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <br/>
              <button onClick={imprimerBilanEducateurs} style={{...s.btnCalculer,background:'#0369a1'}}>🖨️ Imprimer le bilan</button>
            </div>
          )}
        </div>
      )}

      {/* ===== CONTRÔLE ===== */}
      {onglet==='controle' && (
        <div style={s.contenu}>
          <h2 style={s.titrePage}>🔍 Contrôle croisé des inscriptions</h2>
          {(()=>{
            const inscritsEco = new Set(Object.keys(paiements).map(id => parseInt(id)));
            const inscritsEdu = new Set(eleves.filter(e => estInscritEducateur(e.id)).map(e => e.id));
            const deuxListes = eleves.filter(e => inscritsEco.has(e.id) && inscritsEdu.has(e.id));
            const ecoSeul = eleves.filter(e => inscritsEco.has(e.id) && !inscritsEdu.has(e.id));
            const eduSeul = eleves.filter(e => !inscritsEco.has(e.id) && inscritsEdu.has(e.id));
            const aucun = eleves.filter(e => !inscritsEco.has(e.id) && !inscritsEdu.has(e.id));
            const TableControle = ({liste, couleur, titre}) => (
              <div style={{marginBottom:'2rem'}}>
                <h3 style={{color:couleur,background:couleur+'22',padding:'0.6rem 1rem',borderRadius:'8px',marginBottom:'0.75rem'}}>{titre} — {liste.length} élève(s)</h3>
                {liste.length===0
                  ? <div style={{...s.bilanVide,padding:'1rem'}}>Aucun élève dans cette catégorie</div>
                  : <div style={s.tableWrap}><table style={s.table}>
                    <thead style={{...s.tableHead,background:couleur}}>
                      <tr>{['#','Matricule','Nom','Prénom','Sexe','Classe','Parent','Téléphone'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
                    </thead>
                    <tbody>{liste.sort((a,b)=>(a.nom||'').localeCompare(b.nom||'')).map((e,i)=>(
                      <tr key={e.id} style={i%2===0?s.trPair:s.trImpair}>
                        <td style={s.td}>{i+1}</td><td style={s.td}>{e.matricule}</td>
                        <td style={s.td}><strong>{e.nom}</strong></td><td style={s.td}>{e.prenom}</td>
                        <td style={s.td}><span style={e.sexe==='M'?s.badgeGarcon:e.sexe==='F'?s.badgeFille:{}}>{e.sexe||'-'}</span></td>
                        <td style={s.td}><span style={s.badgeClasse}>{e.classe}</span></td>
                        <td style={s.td}>{e.nom_parent||'-'}</td>
                        <td style={s.td}>{e.telephone1?<a href={'tel:'+e.telephone1} style={s.telLink}>📞 {e.telephone1}</a>:'-'}</td>
                      </tr>
                    ))}</tbody>
                  </table></div>
                }
              </div>
            );
            return (
              <>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'1rem',marginBottom:'1.5rem'}}>
                  <div style={{...s.statBox,background:'#dcfce7',border:'2px solid #16a34a'}}><div style={{...s.statNum,color:'#166534'}}>{deuxListes.length}</div><div style={s.statLabel}>✅ Inscrits aux 2</div></div>
                  <div style={{...s.statBox,background:'#fef3c7',border:'2px solid #d97706'}}><div style={{...s.statNum,color:'#92400e'}}>{ecoSeul.length}</div><div style={s.statLabel}>💰 Économat seul</div></div>
                  <div style={{...s.statBox,background:'#ede9fe',border:'2px solid #7c3aed'}}><div style={{...s.statNum,color:'#5b21b6'}}>{eduSeul.length}</div><div style={s.statLabel}>📋 Éducateurs seul</div></div>
                  <div style={{...s.statBox,background:'#fee2e2',border:'2px solid #ef4444'}}><div style={{...s.statNum,color:'#991b1b'}}>{aucun.length}</div><div style={s.statLabel}>❌ Non inscrits</div></div>
                </div>
                <div style={{marginBottom:'1rem'}}>
                  <button onClick={imprimerBilanControle} style={{...s.btnCalculer,background:'#1e3a5f'}}>🖨️ Imprimer rapport de contrôle complet</button>
                </div>
                <TableControle liste={deuxListes} couleur="#16a34a" titre="✅ Inscrits aux deux (Économat + Éducateurs)"/>
                <TableControle liste={ecoSeul} couleur="#d97706" titre="⚠️ Inscrits à l'Économat SEULEMENT"/>
                <TableControle liste={eduSeul} couleur="#7c3aed" titre="⚠️ Inscrits chez les Éducateurs SEULEMENT"/>
                <TableControle liste={aucun} couleur="#ef4444" titre="❌ Non inscrits du tout"/>
              </>
            );
          })()}
        </div>
      )}

      {/* ===== RÉPARTITION ===== */}
      {onglet==='repartition' && (
        <div style={s.contenu}>
          <h2 style={s.titrePage}>🏫 Répartition des classes — Nouvelle année</h2>
          <div style={{background:'#fef3c7',border:'1.5px solid #fcd34d',borderRadius:'10px',padding:'1rem',marginBottom:'1.25rem'}}>
            <p style={{fontWeight:'700',color:'#92400e',fontSize:'0.9rem',marginBottom:'4px'}}>ℹ️ Comment ça marche</p>
            <p style={{fontSize:'0.82rem',color:'#64748b'}}>1. Choisissez la classe source → 2. Cochez les élèves Admis → 3. Choisissez la classe de destination → 4. Cliquez "Affecter"</p>
          </div>
          <div style={s.importCard}>
            <div style={{display:'flex',gap:'1rem',marginBottom:'1rem',flexWrap:'wrap',alignItems:'center'}}>
              <div>
                <label style={{...s.label,marginBottom:'4px'}}>Classe source (actuelle)</label>
                <select value={classeSource} onChange={e=>{setClasseSource(e.target.value);setElevesSelectionnesRepartition([]);}} style={s.selectClasse}>
                  <option value="">-- Choisir --</option>
                  {classes.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{fontSize:'1.5rem',marginTop:'1.2rem'}}>→</div>
              <div>
                <label style={{...s.label,marginBottom:'4px'}}>Classe destination (nouvelle)</label>
                <select value={classeCible} onChange={e=>setClasseCible(e.target.value)} style={s.selectClasse}>
                  <option value="">-- Choisir --</option>
                  {classes.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{marginTop:'1.2rem'}}>
                <button onClick={affecterClasseCible}
                  style={{background:'#1e3a5f',color:'white',border:'none',borderRadius:'8px',padding:'0.6rem 1.2rem',cursor:'pointer',fontWeight:'700',fontSize:'0.9rem'}}>
                  ✅ Affecter ({elevesSelectionnesRepartition.length} sélectionné{elevesSelectionnesRepartition.length>1?'s':''})
                </button>
              </div>
            </div>
            {messageRepartition && <div style={messageRepartition.includes('✅')?s.alertSucces:s.alertErreur}>{messageRepartition}</div>}
            {classeSource && (
              <>
                <div style={{display:'flex',gap:'0.5rem',marginBottom:'0.75rem',alignItems:'center',flexWrap:'wrap'}}>
                  <button onClick={()=>{
                    const admis = eleves.filter(e=>e.classe===classeSource && e.decision_fin_annee==='Admis').map(e=>e.id);
                    setElevesSelectionnesRepartition(admis);
                  }} style={{...s.btnSecondaire,fontSize:'0.8rem',background:'#e8f5e9',color:'#1b5e20',borderColor:'#2e7d32'}}>✅ Sélectionner tous les Admis ({eleves.filter(e=>e.classe===classeSource && e.decision_fin_annee==='Admis').length})</button>
                  <button onClick={()=>{
                    const redoublants = eleves.filter(e=>e.classe===classeSource && e.decision_fin_annee==='Redoublant').map(e=>e.id);
                    setElevesSelectionnesRepartition(redoublants);
                  }} style={{...s.btnSecondaire,fontSize:'0.8rem',background:'#fff3e0',color:'#e65100',borderColor:'#ef6c00'}}>🔄 Sélectionner tous les Redoublants ({eleves.filter(e=>e.classe===classeSource && e.decision_fin_annee==='Redoublant').length})</button>
                  <button onClick={()=>{
                    const exclus = eleves.filter(e=>e.classe===classeSource && e.decision_fin_annee==='Exclu').map(e=>e.id);
                    setElevesSelectionnesRepartition(exclus);
                  }} style={{...s.btnSecondaire,fontSize:'0.8rem',background:'#ffebee',color:'#b71c1c',borderColor:'#c62828'}}>⛔ Sélectionner tous les Exclus ({eleves.filter(e=>e.classe===classeSource && e.decision_fin_annee==='Exclu').length})</button>
                  <button onClick={()=>setElevesSelectionnesRepartition([])}
                    style={{...s.btnSecondaire,fontSize:'0.8rem',color:'#64748b',borderColor:'#64748b'}}>✖ Désélectionner tout</button>
                </div>
                <div style={s.tableWrap}>
                  <table style={s.table}>
                    <thead style={s.tableHead}>
                      <tr>
                        <th style={s.th}>☑</th><th style={s.th}>Matricule</th><th style={s.th}>Nom</th>
                        <th style={s.th}>Prénom</th><th style={s.th}>Sexe</th><th style={s.th}>Classe</th>
                        <th style={s.th}>MGA</th><th style={s.th}>Décision</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eleves.filter(e=>e.classe===classeSource).sort((a,b)=>(a.nom||'').localeCompare(b.nom||'')).map((e,i)=>(
                        <tr key={e.id} style={{...(i%2===0?s.trPair:s.trImpair),cursor:'pointer'}}
                          onClick={()=>toggleSelectionEleve(e.id)}>
                          <td style={s.td}><input type="checkbox" checked={elevesSelectionnesRepartition.includes(e.id)} onChange={()=>toggleSelectionEleve(e.id)} style={{width:'16px',height:'16px',cursor:'pointer'}}/></td>
                          <td style={s.td}>{e.matricule}</td>
                          <td style={s.td}><strong>{e.nom}</strong></td><td style={s.td}>{e.prenom}</td>
                          <td style={s.td}><span style={e.sexe==='M'?s.badgeGarcon:e.sexe==='F'?s.badgeFille:{}}>{e.sexe||'-'}</span></td>
                          <td style={s.td}><span style={s.badgeClasse}>{e.classe}</span></td>
                          <td style={s.td}><strong>{e.moyenne_generale||'-'}</strong></td>
                          <td style={s.td}><span style={e.decision_fin_annee==='Admis'?s.badgeAdmis:e.decision_fin_annee==='Redoublant'?s.badgeRedoublant:s.badgeExclu}>{e.decision_fin_annee||'-'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {!classeSource && <div style={s.bilanVide}><p>Sélectionnez une classe source pour voir les élèves</p></div>}
          </div>
        </div>
      )}

      {/* ===== ARCHIVES ===== */}
      {onglet==='archives' && (
        <div style={s.contenu}>
          <h2 style={s.titrePage}>🗂️ Archives — Années scolaires</h2>
          <div style={s.sousNav}>
            <button onClick={()=>setSousOngletArchive('liste')} style={sousOngletArchive==='liste'?{...s.sousNavActif,background:'#7c2d12',borderColor:'#7c2d12'}:s.sousNavBtn}>📋 Années archivées</button>
            <button onClick={()=>setSousOngletArchive('archiver')} style={sousOngletArchive==='archiver'?{...s.sousNavActif,background:'#7c2d12',borderColor:'#7c2d12'}:s.sousNavBtn}>💾 Archiver l'année</button>
            <button onClick={()=>setSousOngletArchive('global')} style={sousOngletArchive==='global'?{...s.sousNavActif,background:'#7c2d12',borderColor:'#7c2d12'}:s.sousNavBtn}>🔍 Recherche globale</button>
          </div>

          {/* ── LISTE DES ANNÉES ── */}
          {sousOngletArchive==='liste' && (
            <div>
              {!anneeSelectionnee ? (
                <div>
                  {anneesArchives.length === 0 ? (
                    <div style={s.bilanVide}>
                      <p style={{fontSize:'3rem',margin:'0 0 1rem'}}>🗂️</p>
                      <p style={{fontWeight:'600',color:'#64748b'}}>Aucune archive disponible</p>
                      <p style={{color:'#9ca3af',fontSize:'0.85rem'}}>Utilisez l'onglet "Archiver l'année" pour créer la première archive.</p>
                    </div>
                  ) : (
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:'1.25rem'}}>
                      {anneesArchives.map(a => (
                        <div key={a.annee_scolaire} onClick={()=>{setAnneeSelectionnee(a.annee_scolaire);chargerElevesArchive(a.annee_scolaire);setRechercheArchive('');setClasseArchive('');setEleveArchiveSelectionne(null);}}
                          style={{background:'white',borderRadius:'14px',padding:'1.5rem',boxShadow:'0 2px 12px rgba(0,0,0,0.08)',cursor:'pointer',border:'2px solid #e2e8f0',transition:'all 0.2s',':hover':{borderColor:'#7c2d12'}}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1rem'}}>
                            <div style={{fontSize:'1.5rem',fontWeight:'bold',color:'#7c2d12'}}>📅 {a.annee_scolaire}</div>
                            <span style={{background:'#fef3c7',color:'#92400e',padding:'3px 10px',borderRadius:'20px',fontSize:'0.8rem',fontWeight:'600'}}>{a.nb_eleves} élèves</span>
                          </div>
                          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'0.5rem',marginBottom:'0.75rem'}}>
                            <div style={{background:'#dcfce7',borderRadius:'8px',padding:'0.5rem',textAlign:'center'}}>
                              <div style={{fontWeight:'bold',color:'#166534',fontSize:'1.1rem'}}>{a.admis}</div>
                              <div style={{fontSize:'0.72rem',color:'#166534'}}>Admis</div>
                            </div>
                            <div style={{background:'#fef3c7',borderRadius:'8px',padding:'0.5rem',textAlign:'center'}}>
                              <div style={{fontWeight:'bold',color:'#92400e',fontSize:'1.1rem'}}>{a.redoublants}</div>
                              <div style={{fontSize:'0.72rem',color:'#92400e'}}>Redoublants</div>
                            </div>
                            <div style={{background:'#fee2e2',borderRadius:'8px',padding:'0.5rem',textAlign:'center'}}>
                              <div style={{fontWeight:'bold',color:'#991b1b',fontSize:'1.1rem'}}>{a.exclus}</div>
                              <div style={{fontSize:'0.72rem',color:'#991b1b'}}>Exclus</div>
                            </div>
                          </div>
                          <div style={{fontSize:'0.78rem',color:'#9ca3af'}}>
                            Archivé le {new Date(a.date_archivage).toLocaleDateString('fr-FR')}
                          </div>
                          <div style={{marginTop:'0.75rem',background:'#7c2d12',color:'white',borderRadius:'8px',padding:'0.5rem',textAlign:'center',fontWeight:'600',fontSize:'0.88rem'}}>
                            👁️ Consulter cette année
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* ── VUE DÉTAILLÉE D'UNE ANNÉE ── */
                <div>
                  <div style={{display:'flex',gap:'0.75rem',marginBottom:'1rem',alignItems:'center',flexWrap:'wrap'}}>
                    <button onClick={()=>{setAnneeSelectionnee(null);setEleveArchiveSelectionne(null);}} style={s.btnRetour}>← Retour aux années</button>
                    <h3 style={{margin:0,color:'#7c2d12',fontSize:'1.2rem'}}>📅 Année {anneeSelectionnee} — {elevesArchive.length} élèves</h3>
                  </div>

                  {eleveArchiveSelectionne ? (
                    /* Fiche élève archivé */
                    <div>
                      <button onClick={()=>setEleveArchiveSelectionne(null)} style={s.btnRetour}>← Retour à la liste</button>
                      <div style={{...s.ficheCard,marginTop:'1rem'}}>
                        <div style={s.ficheHeader}>
                          <div style={s.ficheAvatar}>
                            {eleveArchiveSelectionne.photo_url
                              ? <img src={eleveArchiveSelectionne.photo_url} alt="" style={{width:'100px',height:'130px',objectFit:'cover',borderRadius:'8px'}}/>
                              : <span style={{fontSize:'3rem'}}>👤</span>}
                          </div>
                          <div>
                            <h2 style={s.ficheNom}>{eleveArchiveSelectionne.nom} {eleveArchiveSelectionne.prenom}</h2>
                            <p style={s.ficheClasse}>Classe : {eleveArchiveSelectionne.classe}</p>
                            <p style={s.ficheMatricule}>Matricule : {eleveArchiveSelectionne.matricule}</p>
                            <p style={{margin:'4px 0',fontSize:'0.85rem',color:'#64748b'}}>Année : <strong style={{color:'#7c2d12'}}>{anneeSelectionnee}</strong></p>
                            <div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap',marginTop:'0.5rem'}}>
                              {eleveArchiveSelectionne.sexe && <span style={eleveArchiveSelectionne.sexe==='M'?s.badgeGarcon:s.badgeFille}>{eleveArchiveSelectionne.sexe==='M'?'👦 Garçon':'👧 Fille'}</span>}
                              <span style={eleveArchiveSelectionne.decision_fin_annee==='Admis'?s.badgeAdmis:eleveArchiveSelectionne.decision_fin_annee==='Redoublant'?s.badgeRedoublant:s.badgeExclu}>{eleveArchiveSelectionne.decision_fin_annee||'-'}</span>
                            </div>
                          </div>
                        </div>
                        <div style={s.ficheGrid}>
                          <div style={s.ficheSection}>
                            <h3 style={s.sectionTitre}>📊 Résultats</h3>
                            <p><strong>T1 :</strong> {eleveArchiveSelectionne.moyenne_t1||'-'}</p>
                            <p><strong>T2 :</strong> {eleveArchiveSelectionne.moyenne_t2||'-'}</p>
                            <p><strong>T3 :</strong> {eleveArchiveSelectionne.moyenne_t3||'-'}</p>
                            <p><strong>MGA :</strong> <span style={{fontWeight:'bold',fontSize:'1.2rem'}}>{eleveArchiveSelectionne.moyenne_generale||'-'}</span></p>
                          </div>
                          <div style={s.ficheSection}>
                            <h3 style={s.sectionTitre}>👨‍👩‍👧 Parent</h3>
                            <p><strong>Nom :</strong> {eleveArchiveSelectionne.nom_parent||'-'}</p>
                            <p><strong>Tél :</strong> {eleveArchiveSelectionne.telephone1||'-'}</p>
                          </div>
                          <div style={s.ficheSection}>
                            <h3 style={s.sectionTitre}>💰 Inscriptions</h3>
                            <p>Économat : {eleveArchiveSelectionne.inscrit_economatf?<span style={s.badgeAdmis}>✅ Payé</span>:<span style={s.badgeExclu}>❌ Non payé</span>}</p>
                            <p>Éducateurs : {eleveArchiveSelectionne.inscrit_educateur?<span style={s.badgeAdmis}>✅ Inscrit</span>:<span style={s.badgeExclu}>❌ Non inscrit</span>}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Liste des élèves archivés */
                    <div>
                      <div style={s.filtres}>
                        <input placeholder="🔍 Nom, prénom ou matricule..." value={rechercheArchive}
                          onChange={e=>{setRechercheArchive(e.target.value);rechercherDansArchive(anneeSelectionnee,e.target.value);}}
                          style={s.inputRecherche}/>
                        <select value={classeArchive} onChange={e=>{setClasseArchive(e.target.value);}}
                          style={s.selectClasse}>
                          <option value="">Toutes les classes</option>
                          {[...new Set(elevesArchive.map(e=>e.classe))].sort().map(c=>(
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div style={s.tableWrap}>
                        <table style={s.table}>
                          <thead style={{...s.tableHead,background:'#7c2d12'}}>
                            <tr>
                              <th style={s.th}>#</th>
                              <th style={s.th}>📷</th>
                              <th style={s.th}>Matricule</th>
                              <th style={s.th}>Nom & Prénom</th>
                              <th style={s.th}>Sexe</th>
                              <th style={s.th}>Classe</th>
                              <th style={s.th}>MGA</th>
                              <th style={s.th}>Décision</th>
                              <th style={s.th}>Économat</th>
                            </tr>
                          </thead>
                          <tbody>
                            {elevesArchive.filter(e=>!classeArchive||e.classe===classeArchive).map((e,i)=>(
                              <tr key={e.id} style={{...(i%2===0?s.trPair:s.trImpair),cursor:'pointer'}}
                                onClick={()=>setEleveArchiveSelectionne(e)}>
                                <td style={s.td}>{i+1}</td>
                                <td style={s.td}>
                                  {e.photo_url
                                    ? <img src={e.photo_url} alt="" style={{width:'28px',height:'35px',objectFit:'cover',borderRadius:'3px'}}/>
                                    : <div style={{width:'28px',height:'35px',background:'#e2e8f0',borderRadius:'3px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.9rem'}}>👤</div>}
                                </td>
                                <td style={{...s.td,fontFamily:'monospace',fontSize:'0.78rem'}}>{e.matricule}</td>
                                <td style={s.td}><strong>{e.nom}</strong> {e.prenom}</td>
                                <td style={s.td}><span style={e.sexe==='M'?s.badgeGarcon:e.sexe==='F'?s.badgeFille:{}}>{e.sexe||'-'}</span></td>
                                <td style={s.td}><span style={s.badgeClasse}>{e.classe}</span></td>
                                <td style={{...s.td,textAlign:'center',fontWeight:'bold',color:e.moyenne_generale?(parseFloat(e.moyenne_generale)>=10?'#166534':'#991b1b'):'#9ca3af'}}>{e.moyenne_generale||'-'}</td>
                                <td style={s.td}><span style={e.decision_fin_annee==='Admis'?s.badgeAdmis:e.decision_fin_annee==='Redoublant'?s.badgeRedoublant:e.decision_fin_annee==='Exclu'?s.badgeExclu:{}}>{e.decision_fin_annee||'-'}</span></td>
                                <td style={s.td}>{e.inscrit_economatf?<span style={s.badgeAdmis}>✅</span>:<span style={s.badgeExclu}>❌</span>}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── ARCHIVER L'ANNÉE ── */}
          {sousOngletArchive==='archiver' && (
            <div style={s.importCard}>
              <h3 style={s.sectionTitre}>💾 Archiver l'année scolaire courante</h3>
              <div style={{background:'#fef3c7',border:'2px solid #fcd34d',borderRadius:'12px',padding:'1.25rem',marginBottom:'1.5rem'}}>
                <p style={{fontWeight:'700',color:'#92400e',margin:'0 0 0.5rem'}}>ℹ️ Comment ça marche</p>
                <p style={{fontSize:'0.85rem',color:'#64748b',margin:0}}>
                  Tous les élèves actuels ({eleves.length} élèves) avec leurs moyennes, décisions et inscriptions seront copiés dans les archives.
                  Vous pourrez ensuite consulter ces données à tout moment, même après la réinitialisation pour la nouvelle année.
                </p>
              </div>
              <div style={{display:'flex',gap:'1rem',alignItems:'flex-end',flexWrap:'wrap',marginBottom:'1.5rem'}}>
                <div>
                  <label style={{...s.label,marginBottom:'6px'}}>Année scolaire à archiver</label>
                  <input value={anneeAArchiver} onChange={e=>setAnneeAArchiver(e.target.value)}
                    placeholder="ex: 2024-2025"
                    style={{...s.input,width:'200px',fontWeight:'bold',fontSize:'1.1rem',color:'#7c2d12'}}/>
                </div>
                <button onClick={archiverAnnee} disabled={archivageEnCours||eleves.length===0}
                  style={{background:archivageEnCours||eleves.length===0?'#94a3b8':'#7c2d12',color:'white',border:'none',borderRadius:'10px',padding:'0.75rem 2rem',cursor:archivageEnCours?'wait':'pointer',fontWeight:'700',fontSize:'1rem'}}>
                  {archivageEnCours?'⏳ Archivage en cours...':'💾 Archiver maintenant'}
                </button>
              </div>
              {messageArchive && <div style={messageArchive.includes('✅')?s.alertSucces:s.alertErreur}>{messageArchive}</div>}
              <div style={{background:'#f0fdf4',borderRadius:'10px',padding:'1rem',marginTop:'1rem'}}>
                <p style={{fontWeight:'600',color:'#166534',margin:'0 0 0.5rem'}}>📊 Données qui seront archivées :</p>
                <p style={{margin:'4px 0',color:'#374151'}}>👥 Élèves : <strong>{eleves.length}</strong></p>
                <p style={{margin:'4px 0',color:'#374151'}}>💰 Inscriptions économat : <strong>{Object.keys(paiements).length}</strong></p>
              </div>
              <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:'10px',padding:'1rem',marginTop:'1rem'}}>
                <p style={{fontWeight:'600',color:'#c2410c',margin:'0 0 0.25rem'}}>⚠️ Important</p>
                <p style={{fontSize:'0.85rem',color:'#64748b',margin:0}}>L'archivage ne supprime PAS les données actuelles. Pour vider la base pour la nouvelle année, utilisez le bouton "Réinitialiser" dans l'onglet Importer.</p>
              </div>
            </div>
          )}

          {/* ── RECHERCHE GLOBALE ── */}
          {sousOngletArchive==='global' && (
            <div style={s.importCard}>
              <h3 style={s.sectionTitre}>🔍 Recherche globale dans toutes les archives</h3>
              <input placeholder="🔍 Tapez un nom, prénom ou matricule..."
                value={rechercheGlobale}
                onChange={e=>rechercherGlobal(e.target.value)}
                style={{...s.inputRecherche,width:'100%',fontSize:'1.1rem',padding:'0.85rem 1rem',marginBottom:'1.5rem',boxSizing:'border-box'}}/>
              {rechercheGlobale.length >= 2 && (
                resultatsGlobaux.length === 0
                  ? <div style={s.bilanVide}><p>Aucun résultat dans les archives pour "{rechercheGlobale}"</p></div>
                  : <div style={s.tableWrap}>
                      <p style={{color:'#64748b',marginBottom:'0.5rem'}}>{resultatsGlobaux.length} résultat(s) trouvé(s)</p>
                      <table style={s.table}>
                        <thead style={{...s.tableHead,background:'#7c2d12'}}>
                          <tr>
                            <th style={s.th}>Année</th>
                            <th style={s.th}>📷</th>
                            <th style={s.th}>Matricule</th>
                            <th style={s.th}>Nom & Prénom</th>
                            <th style={s.th}>Classe</th>
                            <th style={s.th}>MGA</th>
                            <th style={s.th}>Décision</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resultatsGlobaux.map((e,i)=>(
                            <tr key={e.id} style={i%2===0?s.trPair:s.trImpair}>
                              <td style={s.td}><span style={{background:'#fef3c7',color:'#92400e',padding:'2px 8px',borderRadius:'10px',fontSize:'0.8rem',fontWeight:'600'}}>{e.annee_scolaire}</span></td>
                              <td style={s.td}>
                                {e.photo_url
                                  ? <img src={e.photo_url} alt="" style={{width:'28px',height:'35px',objectFit:'cover',borderRadius:'3px'}}/>
                                  : <span style={{fontSize:'1.2rem'}}>👤</span>}
                              </td>
                              <td style={{...s.td,fontFamily:'monospace',fontSize:'0.78rem'}}>{e.matricule}</td>
                              <td style={s.td}><strong>{e.nom}</strong> {e.prenom}</td>
                              <td style={s.td}><span style={s.badgeClasse}>{e.classe}</span></td>
                              <td style={{...s.td,textAlign:'center',fontWeight:'bold'}}>{e.moyenne_generale||'-'}</td>
                              <td style={s.td}><span style={e.decision_fin_annee==='Admis'?s.badgeAdmis:e.decision_fin_annee==='Redoublant'?s.badgeRedoublant:e.decision_fin_annee==='Exclu'?s.badgeExclu:{}}>{e.decision_fin_annee||'-'}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
              )}
              {rechercheGlobale.length < 2 && rechercheGlobale.length > 0 && (
                <p style={{color:'#9ca3af',textAlign:'center'}}>Tapez au moins 2 caractères pour rechercher</p>
              )}
            </div>
          )}
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
  navBtn:{padding:'0.5rem 1.1rem',border:'2px solid #e2e8f0',borderRadius:'8px',background:'white',cursor:'pointer',fontWeight:'500',fontSize:'0.88rem'},
  navBtnActif:{padding:'0.5rem 1.1rem',border:'2px solid #2563eb',borderRadius:'8px',background:'#2563eb',color:'white',cursor:'pointer',fontWeight:'500',fontSize:'0.88rem'},
  sousNav:{display:'flex',gap:'0.5rem',marginBottom:'1.5rem',borderBottom:'2px solid #e2e8f0',paddingBottom:'0.5rem',flexWrap:'wrap'},
  sousNavBtn:{padding:'0.5rem 1.2rem',border:'2px solid #e2e8f0',borderRadius:'8px 8px 0 0',background:'white',cursor:'pointer',fontWeight:'500',fontSize:'0.9rem'},
  sousNavActif:{padding:'0.5rem 1.2rem',border:'2px solid #0f766e',borderBottom:'2px solid white',borderRadius:'8px 8px 0 0',background:'#0f766e',color:'white',cursor:'pointer',fontWeight:'600',fontSize:'0.9rem'},
  contenu:{padding:'1rem 1.2rem',maxWidth:'100%',margin:'0 auto'},
  filtres:{display:'flex',gap:'0.75rem',marginBottom:'0.75rem',flexWrap:'wrap',alignItems:'center'},
  inputRecherche:{flex:1,minWidth:'200px',padding:'0.6rem 1rem',border:'2px solid #e2e8f0',borderRadius:'8px',fontSize:'0.95rem'},
  selectClasse:{padding:'0.6rem 1rem',border:'2px solid #e2e8f0',borderRadius:'8px',fontSize:'0.95rem'},
  statPill:{background:'#f0f4f8',padding:'4px 12px',borderRadius:'20px',border:'1px solid #e2e8f0'},
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
  badgeGarcon:{background:'#dbeafe',color:'#1e40af',padding:'2px 8px',borderRadius:'12px',fontSize:'0.8rem',fontWeight:'600'},
  badgeFille:{background:'#fce7f3',color:'#be185d',padding:'2px 8px',borderRadius:'12px',fontSize:'0.8rem',fontWeight:'600'},
  badgeStatutNeutral:{background:'#f1f5f9',color:'#475569',padding:'2px 8px',borderRadius:'12px',fontSize:'0.8rem',fontWeight:'600'},
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
  ficheHeader:{display:'flex',alignItems:'flex-start',gap:'1.5rem',marginBottom:'1.5rem',borderBottom:'2px solid #e2e8f0',paddingBottom:'1.5rem',flexWrap:'wrap'},
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
  btnSauvegarder:{background:'#2563eb',color:'white',border:'none',borderRadius:'8px',padding:'0.75rem 2rem',cursor:'pointer',fontSize:'1rem',fontWeight:'700',marginTop:'1rem'},
  btnSecondaire:{padding:'0.5rem 1rem',background:'white',color:'#1e3a5f',border:'1.5px solid #1e3a5f',borderRadius:'8px',cursor:'pointer',fontSize:'0.88rem'},
  importCard:{background:'white',borderRadius:'12px',padding:'1.5rem',boxShadow:'0 2px 8px rgba(0,0,0,0.07)'},
  trimestreBtns:{display:'flex',gap:'1rem',marginBottom:'1.5rem',flexWrap:'wrap'},
  trimestreBtn:{padding:'0.75rem 1.5rem',border:'2px solid #e2e8f0',borderRadius:'8px',background:'white',cursor:'pointer',fontWeight:'600',fontSize:'1rem'},
  trimestreBtnActif:{padding:'0.75rem 1.5rem',border:'2px solid #2563eb',borderRadius:'8px',background:'#2563eb',color:'white',cursor:'pointer',fontWeight:'600',fontSize:'1rem'},
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
};