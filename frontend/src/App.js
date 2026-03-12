import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API = 'https://webscool.onrender.com/api';
const MOT_DE_PASSE = 'dsps2024';
const ETABLISSEMENT = 'COLLÃˆGE MODERNE BOUAKÃ‰ DAR ES SALAM';
const ANNEE_SCOLAIRE = '2025-2026';
const MONTANT_INSCRIPTION = 1000;

export default function App() {
  const [connecte, setConnecte] = useState(false);
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

  useEffect(() => {
    if (connecte) { chargerEleves(); chargerClasses(); chargerPaiements(); }
  }, [connecte]);

  const seConnecter = () => {
    if (mdp === MOT_DE_PASSE) { setConnecte(true); setErreurMdp(''); }
    else { setErreurMdp('âŒ Mot de passe incorrect'); }
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
        setMessageInscription(`âŒ Paiement annulÃ© pour ${eleve.nom} ${eleve.prenom}`);
      } else {
        const res = await axios.post(`${API}/inscriptions`, {
          eleve_id: eleve.id, montant: MONTANT_INSCRIPTION,
          date_paiement: new Date().toISOString().split('T')[0]
        });
        setPaiements({...paiements, [eleve.id]: res.data});
        setMessageInscription(`âœ… Paiement enregistrÃ© pour ${eleve.nom} ${eleve.prenom}`);
      }
      setTimeout(() => setMessageInscription(''), 3000);
    } catch (err) { setMessageInscription('âŒ Erreur: ' + (err.response?.data?.erreur || err.message)); }
  };

  // ===== PHOTOS =====
  const importerPhotosGroupees = async (fichiers) => {
    if (!fichiers || fichiers.length === 0) return;
    setUploadEnCours(true);
    setUploadProgress(0);
    setUploadStatus(`â³ PrÃ©paration de ${fichiers.length} photos...`);

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
      setUploadStatus(`â³ ${Math.min(i + BATCH, tabFichiers.length)} / ${tabFichiers.length} photos traitÃ©es...`);
    }

    setUploadStatus(`âœ… ${total} photos importÃ©es ! ${erreurs > 0 ? `âš ï¸ ${erreurs} erreurs` : ''}`);
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
    if (!fichierExcel) { setImportStatus('âš ï¸ Choisissez un fichier Excel'); return; }
    setImportEnCours(true); setImportStatus(`â³ Import ${trimestreActif} en cours...`);
    const formData = new FormData();
    formData.append('fichier', fichierExcel); formData.append('trimestre', trimestreActif);
    try {
      const res = await axios.post(`${API}/import/trimestre`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000
      });
      setImportStatus(`âœ… ${res.data.mis_a_jour} Ã©lÃ¨ves mis Ã  jour pour ${trimestreActif} !`);
      chargerEleves();
    } catch (err) {
      setImportStatus('âŒ Erreur: ' + JSON.stringify(err.response?.data?.erreur || err.message));
    }
    setImportEnCours(false);
  };
  const calculerMoyennesAnnuelles = async () => {
    if (!window.confirm('Calculer MGA et DFA pour tous les Ã©lÃ¨ves ?')) return;
    setCalcEnCours(true); setCalcStatus('â³ Calcul en cours...');
    try {
      const res = await axios.post(`${API}/eleves/calculer-moyennes`);
      setCalcStatus(`âœ… ${res.data.mis_a_jour} Ã©lÃ¨ves mis Ã  jour ! (Admis: ${res.data.admis}, Redoublants: ${res.data.redoublants}, Exclus: ${res.data.exclus})`);
      chargerEleves();
    } catch (err) { setCalcStatus('âŒ Erreur: ' + (err.response?.data?.erreur || err.message)); }
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
      setMessageFormulaire('âŒ Nom, prÃ©nom et classe sont obligatoires'); return;
    }
    try {
      if (modeFormulaire === 'ajouter') {
        await axios.post(`${API}/eleves`, formulaire);
        setMessageFormulaire('âœ… Ã‰lÃ¨ve ajoutÃ© !');
      } else {
        await axios.put(`${API}/eleves/${eleveSelectionne.id}`, formulaire);
        setMessageFormulaire('âœ… Ã‰lÃ¨ve modifiÃ© !');
      }
      chargerEleves(); chargerClasses();
    } catch (err) { setMessageFormulaire('âŒ Erreur: ' + (err.response?.data?.erreur || err.message)); }
  };
  const supprimerEleve = async (id) => {
    if (!window.confirm('Supprimer cet Ã©lÃ¨ve ?')) return;
    try { await axios.delete(`${API}/eleves/${id}`); chargerEleves(); }
    catch (err) { alert('Erreur suppression'); }
  };

  const imprimerListeClasse = () => {
    if (!classeFiltre) { alert("Veuillez sÃ©lectionner une classe d'abord !"); return; }
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
      <div class="entete"><h2>${ETABLISSEMENT}</h2><h1>LISTE DES Ã‰LÃˆVES DE ${classeFiltre.toUpperCase()}</h1>
      <p>AnnÃ©e scolaire : ${ANNEE_SCOLAIRE}</p></div>
      <table><thead><tr><th>NÂ°</th><th>Matricule</th><th>Nom</th><th>PrÃ©nom</th><th>T1</th><th>T2</th><th>T3</th><th>MGA</th><th>DÃ©cision</th></tr></thead>
      <tbody>${lignes}</tbody></table>
      <div class="stats"><span>ðŸ‘¥ <strong>Total :</strong> ${elevesAImprimer.length}</span>
      <span>ðŸ“ˆ <strong>Moy. classe :</strong> ${moyenneClasse}</span>
      <span style="color:green;">âœ… <strong>Admis :</strong> ${admis}</span>
      <span style="color:orange;">ðŸ”„ <strong>Redoublants :</strong> ${redoublants}</span>
      <span style="color:red;">âŒ <strong>Exclus :</strong> ${exclus}</span>
      <span>ðŸ“Š <strong>Taux :</strong> ${elevesAImprimer.length > 0 ? Math.round(admis/elevesAImprimer.length*100) : 0}%</span></div>
      <div class="footer"><span>ImprimÃ© le : ${new Date().toLocaleDateString('fr-FR')}</span>
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
      <p>AnnÃ©e scolaire : ${ANNEE_SCOLAIRE}</p></div>
      <table><thead><tr><th>NÂ°</th><th>Matricule</th><th>Nom</th><th>PrÃ©nom</th><th>Classe</th><th>MGA</th><th>Parent</th><th>TÃ©lÃ©phone</th></tr></thead>
      <tbody>${lignes}</tbody></table>
      <div class="stats">âœ… <strong>Total admis au BEPC : ${admisBepc.length} Ã©lÃ¨ves</strong></div>
      <div class="footer"><span>ImprimÃ© le : ${new Date().toLocaleDateString('fr-FR')}</span>
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
      <td style="padding:5px 4px;text-align:center;border:1px solid #ccc;">${paiements[e.id]?.date_paiement?new Date(paiements[e.id].date_paiement).toLocaleDateString('fr-FR'):'-'}</td>
      <td style="padding:5px 4px;text-align:center;font-weight:bold;color:green;border:1px solid #ccc;">${MONTANT_INSCRIPTION} FCFA</td></tr>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Liste paiements</title>
      <style>body{font-family:Arial,sans-serif;margin:20px;font-size:12px;}
      table{width:100%;border-collapse:collapse;}thead{background-color:#1e3a5f;color:white;}
      thead th{padding:7px 4px;border:1px solid #ccc;}
      .stats{margin-top:15px;padding:10px;background:#dcfce7;border-radius:6px;display:flex;gap:30px;}
      .footer{margin-top:30px;display:flex;justify-content:space-between;font-size:11px;}</style></head><body>
      <div style="text-align:center;margin-bottom:20px;border-bottom:2px solid #000;padding-bottom:10px;">
      <h2>${ETABLISSEMENT}</h2><h1>LISTE DES Ã‰LÃˆVES AYANT PAYÃ‰ LES DROITS D'INSCRIPTION</h1>
      <p>AnnÃ©e scolaire : ${ANNEE_SCOLAIRE}${filtre?' â€” Classe : '+filtre:' â€” Toutes classes'}</p></div>
      <table><thead><tr><th>NÂ°</th><th>Matricule</th><th>Nom</th><th>PrÃ©nom</th><th>Classe</th><th>Date paiement</th><th>Montant</th></tr></thead>
      <tbody>${lignes}</tbody></table>
      <div class="stats"><span>ðŸ‘¥ <strong>Total payÃ©s :</strong> ${liste.length}</span>
      <span>ðŸ’° <strong>Total encaissÃ© :</strong> ${liste.length * MONTANT_INSCRIPTION} FCFA</span></div>
      <div class="footer"><span>ImprimÃ© le : ${new Date().toLocaleDateString('fr-FR')}</span>
      <span>Signature de l'Ã‰conome : ________________</span></div>
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
      <div style="font-size:13px;font-weight:bold;">JournÃ©e du : ${dateAffichee}</div>
      <p style="font-size:11px;color:#555;">AnnÃ©e scolaire : ${ANNEE_SCOLAIRE}</p></div>
      ${liste.length===0?'<p style="text-align:center;color:#9ca3af;">Aucun paiement ce jour.</p>':
      `<table><thead><tr><th>NÂ°</th><th>Matricule</th><th>Nom</th><th>PrÃ©nom</th><th>Classe</th><th>Montant</th></tr></thead>
      <tbody>${lignes}</tbody></table>`}
      <div class="recap"><div style="font-size:13px;font-weight:bold;color:#166534;margin-bottom:8px;">RÃ‰CAPITULATIF DE LA JOURNÃ‰E</div>
      <div style="display:flex;justify-content:space-between;"><span>Nombre d'Ã©lÃ¨ves :</span><span><strong>${liste.length}</strong></span></div>
      <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:bold;color:#166534;margin-top:8px;padding-top:8px;border-top:2px solid #16a34a;">
      <span>TOTAL ENCAISSÃ‰ CE JOUR :</span><span>${(liste.length*MONTANT_INSCRIPTION).toLocaleString()} FCFA</span></div></div>
      <div class="signatures">
      <div class="sig-box"><p style="font-weight:bold;">L'Ã‰conome / Responsable Financier</p><div class="sig-line"></div></div>
      <div class="sig-box"><p style="font-weight:bold;">Le Directeur</p><div class="sig-line"></div></div></div>
      <p style="text-align:right;font-size:10px;color:#9ca3af;margin-top:20px;">Document gÃ©nÃ©rÃ© le ${new Date().toLocaleDateString('fr-FR')} Ã  ${new Date().toLocaleTimeString('fr-FR')}</p>
      <script>window.onload=function(){window.print();}</script></body></html>`;
    const f = window.open('','_blank'); f.document.write(html); f.document.close();
  };

  const imprimerRecuPaiement = (eleve) => {
    const paiement = paiements[eleve.id];
    const datePaiement = paiement?.date_paiement
      ? new Date(paiement.date_paiement + 'T00:00:00').toLocaleDateString('fr-FR', {day:'2-digit',month:'long',year:'numeric'})
      : new Date().toLocaleDateString('fr-FR', {day:'2-digit',month:'long',year:'numeric'});
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>ReÃ§u ${eleve.matricule}</title>
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
        <div style="font-size:1.8rem;">ðŸŽ“</div>
        <div class="entete-texte">
          <h2>${ETABLISSEMENT}</h2>
          <p>AnnÃ©e scolaire : ${ANNEE_SCOLAIRE}</p>
        </div>
      </div>
      <div class="titre-recu">âœ… REÃ‡U DE PAIEMENT â€” DROITS D'INSCRIPTION</div>
      <div class="corps">
        ${eleve.photo_url
          ? `<img src="${eleve.photo_url}" class="photo" onerror="this.style.display='none'"/>`
          : `<div class="photo-placeholder">ðŸ‘¤</div>`}
        <div class="infos">
          <div class="nom">${eleve.nom} ${eleve.prenom}</div>
          <div class="classe">Classe : ${eleve.classe}</div>
          <div class="ligne"><span>Matricule :</span><span>${eleve.matricule||'-'}</span></div>
          <div class="ligne"><span>Date de paiement :</span><span>${datePaiement}</span></div>
          <div class="ligne"><span>Statut :</span><span><span class="badge-ok">âœ… PAYÃ‰</span></span></div>
        </div>
      </div>
      <div class="montant-box">
        <span class="montant-label">ðŸ’° Montant reÃ§u :</span>
        <span class="montant-val">${MONTANT_INSCRIPTION.toLocaleString()} FCFA</span>
      </div>
      <div class="phrase">
        Le prÃ©sent reÃ§u certifie que l'Ã©lÃ¨ve <strong>${eleve.nom} ${eleve.prenom}</strong> a rÃ©guliÃ¨rement acquittÃ© ses droits d'inscription pour l'annÃ©e scolaire <strong>${ANNEE_SCOLAIRE}</strong>.<br/>
        Ce document fait foi auprÃ¨s de l'administration scolaire et des parents ou tuteurs lÃ©gaux.
      </div>
      <div class="signatures">
        <div class="sig"><div>L'Ã‰conome</div><div class="sig-line"></div></div>
        <div class="sig" style="text-align:center;font-size:9px;color:#9ca3af;">NÂ° : ${eleve.id}-${new Date().getFullYear()}</div>
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
      <div class="entete"><h2>${ETABLISSEMENT}</h2><h1>TROMBINOSCOPE${classeTrombi?' â€” '+classeTrombi:''}</h1>
      <p>AnnÃ©e scolaire : ${ANNEE_SCOLAIRE} â€” ${elevesClasse.length} Ã©lÃ¨ve(s)</p></div>
      <div>${cartes}</div>
      <script>window.onload=function(){window.print();}</script></body></html>`;
    const f = window.open('','_blank'); f.document.write(html); f.document.close();
  };

  if (!connecte) {
    return (
      <div style={s.loginPage}>
        <div style={s.loginBox}>
          <div style={{fontSize:'3rem',marginBottom:'0.5rem'}}>ðŸŽ“</div>
          <h1 style={s.loginTitre}>WebScool</h1>
          <p style={{color:'#666',marginBottom:'1.5rem',fontSize:'0.9rem'}}>Gestion des Ã©lÃ¨ves</p>
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
          <span style={{fontSize:'1.8rem'}}>ðŸŽ“</span>
          <div>
            <div style={s.headerTitre}>WebScool</div>
            <div style={s.headerSous}>{eleves.length} Ã©lÃ¨ves â€” {ETABLISSEMENT}</div>
          </div>
        </div>
        <button onClick={()=>setConnecte(false)} style={s.btnDeconnecter}>DÃ©connexion</button>
      </div>

      <div style={s.nav}>
        {[['liste','ðŸ“‹ Ã‰lÃ¨ves'],['formulaire','âž• Ajouter'],['importer','ðŸ“¥ Importer'],
          ['bepc','ðŸ† BEPC'],['inscription','ðŸ’° Inscription'],['photos','ðŸ“¸ Photos']].map(([id,label])=>(
          <button key={id} onClick={()=>{setOnglet(id);if(id==='formulaire')ouvrirFormulaire();}}
            style={onglet===id?s.navBtnActif:s.navBtn}>{label}</button>
        ))}
      </div>

      {/* ===== LISTE ===== */}
      {onglet==='liste' && (
        <div style={s.contenu}>
          <div style={s.filtres}>
            <input placeholder="ðŸ” Rechercher par nom ou matricule..." value={recherche}
              onChange={e=>rechercherEleves(e.target.value)} style={s.inputRecherche} />
            <select value={classeFiltre} onChange={e=>filtrerParClasse(e.target.value)} style={s.selectClasse}>
              <option value="">Toutes les classes</option>
              {classes.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            {classeFiltre && <button onClick={imprimerListeClasse} style={s.btnImprimerClasse}>ðŸ–¨ï¸ Imprimer</button>}
          </div>
          {classeFiltre && elevesClasse.length > 0 && (
            <div style={s.statsClasse}>
              <span>ðŸ“Š <strong>{classeFiltre}</strong></span>
              <span>ðŸ‘¥ Total : <strong>{elevesClasse.length}</strong></span>
              <span>ðŸ“ˆ Moy. : <strong>{moyenneClasseFiltre}</strong></span>
              <span style={{color:'#166534'}}>âœ… Admis : <strong>{elevesClasse.filter(e=>e.decision_fin_annee==='Admis').length}</strong></span>
              <span style={{color:'#92400e'}}>ðŸ”„ Redoublants : <strong>{elevesClasse.filter(e=>e.decision_fin_annee==='Redoublant').length}</strong></span>
              <span style={{color:'#991b1b'}}>âŒ Exclus : <strong>{elevesClasse.filter(e=>e.decision_fin_annee==='Exclu').length}</strong></span>
              <span>ðŸ“Š Taux : <strong>{Math.round(elevesClasse.filter(e=>e.decision_fin_annee==='Admis').length/elevesClasse.length*100)}%</strong></span>
            </div>
          )}
          <p style={s.compteur}>{eleves.length} Ã©lÃ¨ve(s){classeFiltre?` en ${classeFiltre}`:''}</p>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead style={s.tableHead}>
                <tr>{['#','Photo','Matricule','Nom','PrÃ©nom','Classe','Parent','TÃ©lÃ©phone','T1','T2','T3','MGA','DÃ©cision','Actions'].map(h=>(
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
                        : <div style={{width:'36px',height:'45px',background:'#e2e8f0',borderRadius:'4px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem'}}>ðŸ‘¤</div>
                      }
                    </td>
                    <td style={s.td}>{e.matricule}</td>
                    <td style={s.td}><strong>{e.nom}</strong></td>
                    <td style={s.td}>{e.prenom}</td>
                    <td style={s.td}><span style={s.badgeClasse}>{e.classe}</span></td>
                    <td style={s.td}>{e.nom_parent}</td>
                    <td style={s.td}>{e.telephone1&&<a href={`tel:${e.telephone1}`} style={s.telLink}>ðŸ“ž {e.telephone1}</a>}</td>
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
                      <button onClick={()=>ouvrirFiche(e)} style={s.btnVoir}>ðŸ‘ï¸</button>
                      <button onClick={()=>{setEleveSelectionne(e);ouvrirFormulaire(e);}} style={s.btnModifier}>âœï¸</button>
                      <button onClick={()=>supprimerEleve(e.id)} style={s.btnSupprimer}>ðŸ—‘ï¸</button>
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
            <button onClick={()=>setOnglet('liste')} style={s.btnRetour}>â† Retour</button>
            <button onClick={()=>ouvrirFormulaire(eleveSelectionne)} style={s.btnModifier2}>âœï¸ Modifier</button>
          </div>
          <div style={s.ficheCard}>
            <div style={s.ficheHeader}>
              <div style={s.ficheAvatar}>
                {eleveSelectionne.photo_url
                  ? <img src={eleveSelectionne.photo_url} alt="" style={{width:'100px',height:'130px',objectFit:'cover',borderRadius:'8px',border:'3px solid #dbeafe'}}/>
                  : <span style={{fontSize:'3rem'}}>ðŸ‘¤</span>
                }
              </div>
              <div>
                <h2 style={s.ficheNom}>{eleveSelectionne.nom} {eleveSelectionne.prenom}</h2>
                <p style={s.ficheClasse}>Classe : {eleveSelectionne.classe}</p>
                <p style={s.ficheMatricule}>Matricule : {eleveSelectionne.matricule}</p>
                <p style={{margin:'4px 0'}}>Inscription : {paiements[eleveSelectionne.id]
                  ? <span style={s.badgeAdmis}>âœ… PayÃ©</span>
                  : <span style={s.badgeExclu}>âŒ Non payÃ©</span>}</p>
                {paiements[eleveSelectionne.id] && (
                  <button onClick={()=>imprimerRecuPaiement(eleveSelectionne)} style={{marginTop:'8px',background:'#0f766e',color:'white',border:'none',borderRadius:'8px',padding:'6px 14px',cursor:'pointer',fontWeight:'600',fontSize:'0.9rem'}}>
                    ðŸ§¾ Imprimer le reÃ§u
                  </button>
                )}
              </div>
            </div>
            <div style={s.ficheGrid}>
              <div style={s.ficheSection}>
                <h3 style={s.sectionTitre}>ðŸ‘ª Contact parent</h3>
                <p><strong>Nom :</strong> {eleveSelectionne.nom_parent||'-'}</p>
                <p><strong>TÃ©l 1 :</strong> {eleveSelectionne.telephone1?<a href={`tel:${eleveSelectionne.telephone1}`} style={s.telLink}>{eleveSelectionne.telephone1}</a>:'-'}</p>
                <p><strong>TÃ©l 2 :</strong> {eleveSelectionne.telephone2?<a href={`tel:${eleveSelectionne.telephone2}`} style={s.telLink}>{eleveSelectionne.telephone2}</a>:'-'}</p>
              </div>
              <div style={s.ficheSection}>
                <h3 style={s.sectionTitre}>ðŸ“Š RÃ©sultats scolaires</h3>
                <p><strong>T1 :</strong> {eleveSelectionne.moyenne_t1||'-'}</p>
                <p><strong>T2 :</strong> {eleveSelectionne.moyenne_t2||'-'}</p>
                <p><strong>T3 :</strong> {eleveSelectionne.moyenne_t3||'-'}</p>
                <p><strong>MGA :</strong> <span style={{fontWeight:'bold',fontSize:'1.1rem'}}>{eleveSelectionne.moyenne_generale||'-'}</span></p>
                <p><strong>DÃ©cision :</strong> <span style={eleveSelectionne.decision_fin_annee==='Admis'?s.badgeAdmis:eleveSelectionne.decision_fin_annee==='Redoublant'?s.badgeRedoublant:s.badgeExclu}>{eleveSelectionne.decision_fin_annee||'-'}</span></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== FORMULAIRE ===== */}
      {onglet==='formulaire' && (
        <div style={s.contenu}>
          <h2 style={s.titrePage}>{modeFormulaire==='ajouter'?'âž• Ajouter un Ã©lÃ¨ve':'âœï¸ Modifier un Ã©lÃ¨ve'}</h2>
          <div style={s.formCard}>
            <h3 style={s.sectionTitre}>ðŸ“‹ Informations gÃ©nÃ©rales</h3>
            <div style={s.formGrid}>
              <div><label style={s.label}>Matricule</label><input value={formulaire.matricule} onChange={e=>setFormulaire({...formulaire,matricule:e.target.value})} style={s.input}/></div>
              <div><label style={s.label}>Nom *</label><input value={formulaire.nom} onChange={e=>setFormulaire({...formulaire,nom:e.target.value})} style={s.input}/></div>
              <div><label style={s.label}>PrÃ©nom *</label><input value={formulaire.prenom} onChange={e=>setFormulaire({...formulaire,prenom:e.target.value})} style={s.input}/></div>
              <div><label style={s.label}>Classe *</label>
                <input value={formulaire.classe} onChange={e=>setFormulaire({...formulaire,classe:e.target.value})} style={s.input} list="liste-classes"/>
                <datalist id="liste-classes">{classes.map(c=><option key={c} value={c}/>)}</datalist></div>
            </div>
            <h3 style={{...s.sectionTitre,marginTop:'1.5rem'}}>ðŸ‘ª Contact parent</h3>
            <div style={s.formGrid}>
              <div><label style={s.label}>Nom parent</label><input value={formulaire.nom_parent} onChange={e=>setFormulaire({...formulaire,nom_parent:e.target.value})} style={s.input}/></div>
              <div><label style={s.label}>TÃ©lÃ©phone 1</label><input value={formulaire.telephone1} onChange={e=>setFormulaire({...formulaire,telephone1:e.target.value})} style={s.input} type="tel"/></div>
              <div><label style={s.label}>TÃ©lÃ©phone 2</label><input value={formulaire.telephone2} onChange={e=>setFormulaire({...formulaire,telephone2:e.target.value})} style={s.input} type="tel"/></div>
            </div>
            {messageFormulaire&&<p style={messageFormulaire.includes('âœ…')?s.succes:s.erreur}>{messageFormulaire}</p>}
            <button onClick={sauvegarderEleve} style={s.btnSauvegarder}>{modeFormulaire==='ajouter'?'âž• Ajouter':'ðŸ’¾ Sauvegarder'}</button>
          </div>
        </div>
      )}

      {/* ===== IMPORTER ===== */}
      {onglet==='importer' && (
        <div style={s.contenu}>
          <h2 style={s.titrePage}>ðŸ“¥ Import des moyennes trimestrielles</h2>
          <div style={s.importCard}>
            <div style={s.trimestreBtns}>
              {['T1','T2','T3'].map(t=>(
                <button key={t} onClick={()=>setTrimestreActif(t)} style={trimestreActif===t?s.trimestreBtnActif:s.trimestreBtn}>ðŸ“Š Trimestre {t}</button>
              ))}
            </div>
            <p style={s.importInfo}>ðŸ“Œ Fichier Excel pour <strong>{trimestreActif}</strong></p>
            <input type="file" accept=".xlsx,.xls" onChange={e=>setFichierExcel(e.target.files[0])} style={{margin:'1rem 0'}}/>
            <br/>
            <button onClick={importerTrimestre} disabled={importEnCours} style={s.btnImportExcel}>
              {importEnCours?`â³ Import ${trimestreActif}...`:`ðŸ“¥ Importer ${trimestreActif}`}
            </button>
            {importStatus&&<p style={importStatus.includes('âœ…')?s.succes:s.erreur}>{importStatus}</p>}
            <hr style={{margin:'2rem 0',border:'none',borderTop:'2px solid #e2e8f0'}}/>
            <h3 style={s.sectionTitre}>ðŸ§® Calcul automatique MGA + DFA</h3>
            <button onClick={calculerMoyennesAnnuelles} disabled={calcEnCours} style={s.btnCalculer}>
              {calcEnCours?'â³ Calcul...':'ðŸ§® Calculer MGA + DFA'}
            </button>
            {calcStatus&&<p style={calcStatus.includes('âœ…')?s.succes:s.erreur}>{calcStatus}</p>}
          </div>
        </div>
      )}

      {/* ===== BEPC ===== */}
      {onglet==='bepc' && (
        <div style={s.contenu}>
          <h2 style={s.titrePage}>ðŸ† Liste des Admis au BEPC</h2>
          <div style={s.importCard}>
            <div style={s.bepcInfo}>
              <p>Classes 3Ã¨me : <strong>{classes3eme.join(', ')||'Aucune'}</strong></p>
              <p style={{fontSize:'1.3rem',fontWeight:'bold',color:'#166534'}}>âœ… Total : {totalAdmisBepc} admis</p>
            </div>
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead style={{...s.tableHead,background:'#166534'}}>
                  <tr>{['#','Matricule','Nom','PrÃ©nom','Classe','MGA','Parent','TÃ©lÃ©phone'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
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
                      <td style={s.td}>{e.telephone1?<a href={`tel:${e.telephone1}`} style={s.telLink}>ðŸ“ž {e.telephone1}</a>:'-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <br/>
            <button onClick={imprimerListeBEPC} style={{...s.btnCalculer,background:'#166534'}}>ðŸ–¨ï¸ Imprimer liste BEPC</button>
          </div>
        </div>
      )}

      {/* ===== INSCRIPTION ===== */}
      {onglet==='inscription' && (
        <div style={s.contenu}>
          <h2 style={s.titrePage}>ðŸ’° Droits d'inscription â€” {ANNEE_SCOLAIRE}</h2>
          <div style={s.sousNav}>
            <button onClick={()=>setSousOngletInscription('encaissement')} style={sousOngletInscription==='encaissement'?s.sousNavActif:s.sousNavBtn}>ðŸ’° Encaissement</button>
            <button onClick={()=>setSousOngletInscription('bilan')} style={sousOngletInscription==='bilan'?s.sousNavActif:s.sousNavBtn}>ðŸ“Š Bilan journalier</button>
          </div>
          {sousOngletInscription==='encaissement' && (
            <>
              <div style={s.statsInscription}>
                <div style={s.statBox}><div style={s.statNum}>{totalPayes}</div><div style={s.statLabel}>âœ… Ont payÃ©</div></div>
                <div style={{...s.statBox,background:'#fee2e2'}}><div style={{...s.statNum,color:'#991b1b'}}>{totalNonPayes}</div><div style={s.statLabel}>âŒ Non payÃ©s</div></div>
                <div style={{...s.statBox,background:'#dcfce7'}}><div style={{...s.statNum,color:'#166534'}}>{montantTotal.toLocaleString()}</div><div style={s.statLabel}>ðŸ’µ FCFA encaissÃ©s</div></div>
                <div style={{...s.statBox,background:'#fef3c7'}}><div style={{...s.statNum,color:'#92400e'}}>{(totalNonPayes*MONTANT_INSCRIPTION).toLocaleString()}</div><div style={s.statLabel}>â³ FCFA restants</div></div>
              </div>
              <div style={s.filtres}>
                <input placeholder="ðŸ” Rechercher..." value={rechercheInscription} onChange={e=>rechercherInscription(e.target.value)} style={s.inputRecherche}/>
                <select value={classeFiltreInscription} onChange={e=>filtrerInscriptionParClasse(e.target.value)} style={s.selectClasse}>
                  <option value="">Toutes les classes</option>
                  {classes.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={imprimerListePayes} style={s.btnImprimerClasse}>ðŸ–¨ï¸ Imprimer liste des payÃ©s</button>
              </div>
              {messageInscription&&<div style={messageInscription.includes('âœ…')?s.alertSucces:s.alertErreur}>{messageInscription}</div>}
              <p style={s.compteur}>{elevesAffichesInscription.length} Ã©lÃ¨ve(s) â€” âœ… {payesDansVue} | âŒ {nonPayesDansVue}</p>
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead style={s.tableHead}>
                    <tr>{['#','Matricule','Nom','PrÃ©nom','Classe','Parent','Statut','Action'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {elevesAffichesInscription.map((e,i)=>(
                      <tr key={e.id} style={i%2===0?s.trPair:s.trImpair}>
                        <td style={s.td}>{i+1}</td><td style={s.td}>{e.matricule}</td>
                        <td style={s.td}><strong>{e.nom}</strong></td><td style={s.td}>{e.prenom}</td>
                        <td style={s.td}><span style={s.badgeClasse}>{e.classe}</span></td>
                        <td style={s.td}>{e.nom_parent||'-'}</td>
                        <td style={s.td}>{paiements[e.id]?<span style={s.badgeAdmis}>âœ… PayÃ© â€” {paiements[e.id].date_paiement?new Date(paiements[e.id].date_paiement).toLocaleDateString('fr-FR'):''}</span>:<span style={s.badgeExclu}>âŒ Non payÃ©</span>}</td>
                        <td style={s.td}>
                          <button onClick={()=>togglePaiement(e)} style={paiements[e.id]?s.btnAnnulerPaiement:s.btnPayer}>{paiements[e.id]?'â†©ï¸ Annuler':'ðŸ’° Encaisser'}</button>
                          {paiements[e.id] && <button onClick={()=>imprimerRecuPaiement(e)} style={{...s.btnVoir,marginLeft:'4px',background:'#0f766e'}}>ðŸ§¾ ReÃ§u</button>}
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
              <h3 style={s.sectionTitre}>ðŸ“Š Bilan financier journalier</h3>
              <div style={s.bilanDateRow}>
                <label style={{fontWeight:'600',color:'#1e3a5f'}}>ðŸ“… Date :</label>
                <input type="date" value={dateBilan} onChange={e=>setDateBilan(e.target.value)} style={s.inputDate}/>
              </div>
              <div style={s.bilanResume}>
                <div style={s.bilanResumeItem}><div style={s.bilanResumeNum}>{nbPayesDuJour}</div><div style={s.bilanResumeLabel}>Ã©lÃ¨ve(s) payÃ©(s)</div></div>
                <div style={{...s.bilanResumeItem,background:'#dcfce7',borderColor:'#16a34a'}}><div style={{...s.bilanResumeNum,color:'#166534'}}>{montantDuJour.toLocaleString()}</div><div style={s.bilanResumeLabel}>FCFA encaissÃ©s</div></div>
              </div>
              {nbPayesDuJour===0?<div style={s.bilanVide}><p>ðŸ˜” Aucun paiement ce jour</p></div>:(
                <div style={s.tableWrap}>
                  <table style={s.table}>
                    <thead style={{...s.tableHead,background:'#0f766e'}}>
                      <tr>{['#','Matricule','Nom','PrÃ©nom','Classe','Montant'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
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
              <button onClick={imprimerBilanJournalier} style={s.btnBilanImprimer}>ðŸ–¨ï¸ Imprimer le bilan journalier</button>
            </div>
          )}
        </div>
      )}

      {/* ===== PHOTOS ===== */}
      {onglet==='photos' && (
        <div style={s.contenu}>
          <h2 style={s.titrePage}>ðŸ“¸ Gestion des photos</h2>
          <div style={s.sousNav}>
            <button onClick={()=>setSousOngletPhotos('import')} style={sousOngletPhotos==='import'?{...s.sousNavActif,background:'#7c3aed',borderColor:'#7c3aed'}:s.sousNavBtn}>ðŸ“¤ Import groupÃ©</button>
            <button onClick={()=>setSousOngletPhotos('trombi')} style={sousOngletPhotos==='trombi'?{...s.sousNavActif,background:'#7c3aed',borderColor:'#7c3aed'}:s.sousNavBtn}>ðŸ–¼ï¸ Trombinoscope</button>
            <button onClick={()=>setSousOngletPhotos('recherche')} style={sousOngletPhotos==='recherche'?{...s.sousNavActif,background:'#7c3aed',borderColor:'#7c3aed'}:s.sousNavBtn}>ðŸ” Recherche photo</button>
          </div>

          {/* IMPORT GROUPÃ‰ */}
          {sousOngletPhotos==='import' && (
            <div style={s.importCard}>
              <h3 style={s.sectionTitre}>ðŸ“¤ Import groupÃ© de photos</h3>
              <div style={{background:'#faf5ff',border:'2px dashed #7c3aed',borderRadius:'12px',padding:'2rem',textAlign:'center',marginBottom:'1.5rem'}}>
                <div style={{fontSize:'3rem',marginBottom:'0.5rem'}}>ðŸ“</div>
                <p style={{fontWeight:'600',color:'#5b21b6',marginBottom:'0.5rem'}}>SÃ©lectionnez toutes vos photos d'un coup</p>
                <p style={{color:'#7c3aed',fontSize:'0.85rem',marginBottom:'1rem'}}>Les fichiers doivent Ãªtre nommÃ©s avec le matricule : <strong>21421986V.JPG</strong></p>
                <input ref={fileInputRef} type="file" accept="image/*" multiple
                  onChange={e=>importerPhotosGroupees(e.target.files)}
                  style={{display:'none'}}/>
                <button onClick={()=>fileInputRef.current.click()} disabled={uploadEnCours}
                  style={{background:'#7c3aed',color:'white',border:'none',borderRadius:'8px',padding:'0.75rem 2rem',cursor:'pointer',fontSize:'1rem',fontWeight:'600'}}>
                  {uploadEnCours?'â³ Upload en cours...':'ðŸ“‚ Choisir les photos'}
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
              {uploadStatus && <p style={uploadStatus.includes('âœ…')?s.succes:uploadStatus.includes('â³')?{color:'#5b21b6',fontWeight:'600'}:s.erreur}>{uploadStatus}</p>}
              <div style={{background:'#f0fdf4',borderRadius:'8px',padding:'1rem',marginTop:'1rem'}}>
                <p style={{fontWeight:'600',color:'#166534',margin:'0 0 0.5rem'}}>ðŸ“Š Statistiques photos :</p>
                <p style={{margin:'0',color:'#374151'}}>ðŸ“¸ Ã‰lÃ¨ves avec photo : <strong>{eleves.filter(e=>e.photo_url).length}</strong> / {eleves.length}</p>
                <p style={{margin:'4px 0 0',color:'#374151'}}>âŒ Sans photo : <strong>{eleves.filter(e=>!e.photo_url).length}</strong></p>
              </div>
            </div>
          )}

          {/* TROMBINOSCOPE */}
          {sousOngletPhotos==='trombi' && (
            <div style={s.importCard}>
              <h3 style={s.sectionTitre}>ðŸ–¼ï¸ Trombinoscope</h3>
              <div style={{display:'flex',gap:'1rem',marginBottom:'1.5rem',alignItems:'center',flexWrap:'wrap'}}>
                <select value={classeTrombi} onChange={e=>setClasseTrombi(e.target.value)} style={{...s.selectClasse,fontSize:'1rem',padding:'0.6rem 1rem'}}>
                  <option value="">Toutes les classes</option>
                  {classes.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
                <span style={{color:'#64748b',fontSize:'0.9rem'}}>{avecPhoto} photo(s) sur {elevesTrombi.length} Ã©lÃ¨ve(s)</span>
                <button onClick={imprimerTrombinoscope} style={{background:'#7c3aed',color:'white',border:'none',borderRadius:'8px',padding:'0.6rem 1.2rem',cursor:'pointer',fontWeight:'600'}}>
                  ðŸ–¨ï¸ Imprimer trombinoscope
                </button>
              </div>
              <div style={{display:'flex',flexWrap:'wrap',gap:'12px'}}>
                {elevesTrombi.map(e => (
                  <div key={e.id} style={{width:'130px',textAlign:'center',border:'1px solid #e2e8f0',borderRadius:'10px',padding:'10px',background:'white',boxShadow:'0 2px 6px rgba(0,0,0,0.06)'}}>
                    {e.photo_url
                      ? <img src={e.photo_url} alt="" style={{width:'110px',height:'140px',objectFit:'cover',borderRadius:'6px',border:'2px solid #dbeafe'}}/>
                      : <div style={{width:'110px',height:'140px',background:'#f1f5f9',borderRadius:'6px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'2.5rem',margin:'0 auto'}}>ðŸ‘¤</div>
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
              <h3 style={s.sectionTitre}>ðŸ” Recherche rapide d'un Ã©lÃ¨ve</h3>
              <input placeholder="ðŸ” Tapez le nom ou matricule de l'Ã©lÃ¨ve..." value={recherchePhoto}
                onChange={e=>rechercherElevePhoto(e.target.value)}
                style={{...s.inputRecherche,width:'100%',fontSize:'1.1rem',padding:'0.85rem 1rem',marginBottom:'1.5rem',boxSizing:'border-box'}}/>
              {eleveRecherchePhoto && (
                <div style={{display:'flex',gap:'2rem',background:'white',borderRadius:'16px',padding:'2rem',boxShadow:'0 4px 16px rgba(0,0,0,0.1)',flexWrap:'wrap',alignItems:'flex-start'}}>
                  <div style={{textAlign:'center'}}>
                    {eleveRecherchePhoto.photo_url
                      ? <img src={eleveRecherchePhoto.photo_url} alt="" style={{width:'180px',height:'220px',objectFit:'cover',borderRadius:'12px',border:'4px solid #7c3aed',boxShadow:'0 4px 16px rgba(124,58,237,0.3)'}}/>
                      : <div style={{width:'180px',height:'220px',background:'#f1f5f9',borderRadius:'12px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'5rem',border:'4px solid #e2e8f0'}}>ðŸ‘¤</div>
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
                        <div style={{fontSize:'0.75rem',color:'#64748b'}}>TÃ‰LÃ‰PHONE</div>
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
                        {eleveRecherchePhoto.decision_fin_annee||'DÃ©cision non disponible'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {recherchePhoto.length >= 2 && !eleveRecherchePhoto && (
                <div style={s.bilanVide}><p>ðŸ˜” Aucun Ã©lÃ¨ve trouvÃ© pour "{recherchePhoto}"</p></div>
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
};

