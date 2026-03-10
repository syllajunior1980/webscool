import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'https://webscool.onrender.com/api';
const MOT_DE_PASSE = 'dsps2024';
const ETABLISSEMENT = 'COLLÈGE MODERNE BOUAKÉ DAR ES SALAM';
const ANNEE_SCOLAIRE = '2025-2026';

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
    matricule: '', nom: '', prenom: '', classe: '', numero_extrait: '',
    moyenne_t1: '', moyenne_t2: '', moyenne_t3: '', moyenne_generale: '',
    decision_fin_annee: '', nom_parent: '', telephone1: '', telephone2: ''
  });
  const [modeFormulaire, setModeFormulaire] = useState('ajouter');
  const [messageFormulaire, setMessageFormulaire] = useState('');

  useEffect(() => {
    if (connecte) { chargerEleves(); chargerClasses(); }
  }, [connecte]);

  const seConnecter = () => {
    if (mdp === MOT_DE_PASSE) { setConnecte(true); setErreurMdp(''); }
    else { setErreurMdp('❌ Mot de passe incorrect'); }
  };

  const chargerEleves = async () => {
    try { const res = await axios.get(`${API}/eleves`); setEleves(res.data); }
    catch (err) { console.error('Erreur:', err); }
  };

  const chargerClasses = async () => {
    try { const res = await axios.get(`${API}/eleves/classes`); setClasses(res.data.map(r => r.classe)); }
    catch (err) { console.error(err); }
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

  const importerTrimestre = async () => {
    if (!fichierExcel) { setImportStatus('⚠️ Choisissez un fichier Excel'); return; }
    setImportEnCours(true);
    setImportStatus(`⏳ Import ${trimestreActif} en cours...`);
    const formData = new FormData();
    formData.append('fichier', fichierExcel);
    formData.append('trimestre', trimestreActif);
    try {
      const res = await axios.post(`${API}/import/trimestre`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000
      });
      setImportStatus(`✅ ${res.data.mis_a_jour} élèves mis à jour pour ${trimestreActif} !`);
      chargerEleves();
    } catch (err) {
      const msg = err.response?.data?.erreur || err.message || 'Erreur inconnue';
      setImportStatus('❌ Erreur: ' + JSON.stringify(msg));
    }
    setImportEnCours(false);
  };

  const calculerMoyennesAnnuelles = async () => {
    if (!window.confirm('Calculer MGA et DFA pour tous les élèves ayant T1, T2 et T3 ?')) return;
    setCalcEnCours(true); setCalcStatus('⏳ Calcul en cours...');
    try {
      const res = await axios.post(`${API}/eleves/calculer-moyennes`);
      setCalcStatus(`✅ ${res.data.mis_a_jour} élèves mis à jour ! (Admis: ${res.data.admis}, Redoublants: ${res.data.redoublants}, Exclus: ${res.data.exclus})`);
      chargerEleves();
    } catch (err) {
      setCalcStatus('❌ Erreur: ' + (err.response?.data?.erreur || err.message));
    }
    setCalcEnCours(false);
  };

  const ouvrirFiche = (eleve) => { setEleveSelectionne(eleve); setOnglet('fiche'); };

  const ouvrirFormulaire = (eleve = null) => {
    if (eleve) {
      setFormulaire({
        matricule: eleve.matricule||'', nom: eleve.nom||'', prenom: eleve.prenom||'',
        classe: eleve.classe||'', numero_extrait: eleve.numero_extrait||'',
        moyenne_t1: eleve.moyenne_t1||'', moyenne_t2: eleve.moyenne_t2||'',
        moyenne_t3: eleve.moyenne_t3||'', moyenne_generale: eleve.moyenne_generale||'',
        decision_fin_annee: eleve.decision_fin_annee||'', nom_parent: eleve.nom_parent||'',
        telephone1: eleve.telephone1||'', telephone2: eleve.telephone2||''
      });
      setModeFormulaire('modifier');
    } else {
      setFormulaire({ matricule:'', nom:'', prenom:'', classe:'', numero_extrait:'',
        moyenne_t1:'', moyenne_t2:'', moyenne_t3:'', moyenne_generale:'',
        decision_fin_annee:'', nom_parent:'', telephone1:'', telephone2:'' });
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
    } catch (err) { setMessageFormulaire('❌ Erreur: ' + (err.response?.data?.erreur || err.message)); }
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
      ? (moyennesValides.reduce((s,e) => s + parseFloat(e.moyenne_generale), 0) / moyennesValides.length).toFixed(2)
      : '-';

    const lignes = elevesAImprimer.map((e, i) => `
      <tr>
        <td style="padding:5px 4px;text-align:center;border:1px solid #ccc;">${i+1}</td>
        <td style="padding:5px 4px;border:1px solid #ccc;">${e.matricule||''}</td>
        <td style="padding:5px 4px;font-weight:bold;border:1px solid #ccc;">${e.nom||''}</td>
        <td style="padding:5px 4px;border:1px solid #ccc;">${e.prenom||''}</td>
        <td style="padding:5px 4px;text-align:center;border:1px solid #ccc;">${e.moyenne_t1||'-'}</td>
        <td style="padding:5px 4px;text-align:center;border:1px solid #ccc;">${e.moyenne_t2||'-'}</td>
        <td style="padding:5px 4px;text-align:center;border:1px solid #ccc;">${e.moyenne_t3||'-'}</td>
        <td style="padding:5px 4px;text-align:center;font-weight:bold;border:1px solid #ccc;">${e.moyenne_generale||'-'}</td>
        <td style="padding:5px 4px;text-align:center;border:1px solid #ccc;color:${e.decision_fin_annee==='Admis'?'green':e.decision_fin_annee==='Redoublant'?'orange':'red'};font-weight:bold;">${e.decision_fin_annee||'-'}</td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Liste ${classeFiltre}</title>
      <style>
        body{font-family:Arial,sans-serif;margin:20px;font-size:12px;}
        @media print{body{margin:10px;}}
        .entete{text-align:center;margin-bottom:20px;border-bottom:2px solid #000;padding-bottom:10px;}
        .entete h2{margin:0;font-size:14px;text-transform:uppercase;}
        .entete h1{margin:5px 0;font-size:18px;text-transform:uppercase;color:#1e3a5f;}
        .entete p{margin:2px 0;font-size:11px;color:#555;}
        table{width:100%;border-collapse:collapse;margin-top:10px;}
        thead{background-color:#1e3a5f;color:white;}
        thead th{padding:7px 4px;border:1px solid #ccc;font-size:11px;}
        .stats{display:flex;gap:20px;margin-top:15px;padding:10px;background:#f0f4f8;border-radius:6px;flex-wrap:wrap;}
        .footer{margin-top:30px;display:flex;justify-content:space-between;font-size:11px;}
      </style></head><body>
      <div class="entete">
        <h2>${ETABLISSEMENT}</h2>
        <h1>LISTE DES ÉLÈVES DE ${classeFiltre.toUpperCase()}</h1>
        <p>Année scolaire : ${ANNEE_SCOLAIRE}</p>
      </div>
      <table>
        <thead><tr>
          <th>N°</th><th>Matricule</th><th>Nom</th><th>Prénom</th>
          <th>T1</th><th>T2</th><th>T3</th><th>MGA</th><th>Décision</th>
        </tr></thead>
        <tbody>${lignes}</tbody>
      </table>
      <div class="stats">
        <span>👥 <strong>Total :</strong> ${elevesAImprimer.length}</span>
        <span>📈 <strong>Moy. classe :</strong> ${moyenneClasse}</span>
        <span style="color:green;">✅ <strong>Admis :</strong> ${admis}</span>
        <span style="color:orange;">🔄 <strong>Redoublants :</strong> ${redoublants}</span>
        <span style="color:red;">❌ <strong>Exclus :</strong> ${exclus}</span>
        <span>📊 <strong>Taux réussite :</strong> ${elevesAImprimer.length > 0 ? Math.round(admis/elevesAImprimer.length*100) : 0}%</span>
      </div>
      <div class="footer">
        <span>Imprimé le : ${new Date().toLocaleDateString('fr-FR')}</span>
        <span>Signature du Directeur : ________________</span>
      </div>
      <script>window.onload=function(){window.print();}</script>
      </body></html>`;

    const fenetre = window.open('', '_blank');
    fenetre.document.write(html);
    fenetre.document.close();
  };

  const imprimerListeBEPC = () => {
    const classes3eme = classes.filter(c => c.toLowerCase().startsWith('3'));
    const admisBepc = eleves.filter(e =>
      classes3eme.some(c => c === e.classe) && e.decision_fin_annee === 'Admis'
    ).sort((a,b) => (parseFloat(b.moyenne_generale)||0) - (parseFloat(a.moyenne_generale)||0));

    const lignes = admisBepc.map((e, i) => `
      <tr>
        <td style="padding:5px 4px;text-align:center;border:1px solid #ccc;">${i+1}</td>
        <td style="padding:5px 4px;border:1px solid #ccc;">${e.matricule||''}</td>
        <td style="padding:5px 4px;font-weight:bold;border:1px solid #ccc;">${e.nom||''}</td>
        <td style="padding:5px 4px;border:1px solid #ccc;">${e.prenom||''}</td>
        <td style="padding:5px 4px;text-align:center;border:1px solid #ccc;">${e.classe||''}</td>
        <td style="padding:5px 4px;text-align:center;font-weight:bold;color:green;border:1px solid #ccc;">${e.moyenne_generale||'-'}</td>
        <td style="padding:5px 4px;border:1px solid #ccc;">${e.nom_parent||''}</td>
        <td style="padding:5px 4px;border:1px solid #ccc;">${e.telephone1||''}</td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Admis BEPC</title>
      <style>
        body{font-family:Arial,sans-serif;margin:20px;font-size:12px;}
        @media print{body{margin:10px;}}
        .entete{text-align:center;margin-bottom:20px;border-bottom:2px solid #000;padding-bottom:10px;}
        .entete h2{margin:0;font-size:14px;text-transform:uppercase;}
        .entete h1{margin:5px 0;font-size:18px;text-transform:uppercase;color:#166534;}
        .entete p{margin:2px 0;font-size:11px;color:#555;}
        table{width:100%;border-collapse:collapse;margin-top:10px;}
        thead{background-color:#166534;color:white;}
        thead th{padding:7px 4px;border:1px solid #ccc;font-size:11px;}
        .stats{margin-top:15px;padding:10px;background:#dcfce7;border-radius:6px;font-size:13px;}
        .footer{margin-top:30px;display:flex;justify-content:space-between;font-size:11px;}
      </style></head><body>
      <div class="entete">
        <h2>${ETABLISSEMENT}</h2>
        <h1>LISTE DES ADMIS AU BEPC</h1>
        <p>Année scolaire : ${ANNEE_SCOLAIRE} — Élèves de 3ème</p>
      </div>
      <table>
        <thead><tr>
          <th>N°</th><th>Matricule</th><th>Nom</th><th>Prénom</th>
          <th>Classe</th><th>MGA</th><th>Parent</th><th>Téléphone</th>
        </tr></thead>
        <tbody>${lignes}</tbody>
      </table>
      <div class="stats">✅ <strong>Total admis au BEPC : ${admisBepc.length} élèves</strong></div>
      <div class="footer">
        <span>Imprimé le : ${new Date().toLocaleDateString('fr-FR')}</span>
        <span>Signature du Chef de service : ________________</span>
      </div>
      <script>window.onload=function(){window.print();}</script>
      </body></html>`;

    const fenetre = window.open('', '_blank');
    fenetre.document.write(html);
    fenetre.document.close();
  };

  if (!connecte) {
    return (
      <div style={styles.loginPage}>
        <div style={styles.loginBox}>
          <div style={styles.loginLogo}>🎓</div>
          <h1 style={styles.loginTitre}>WebScool</h1>
          <p style={styles.loginSousTitre}>Gestion des élèves</p>
          <input type="password" placeholder="Mot de passe" value={mdp}
            onChange={e=>setMdp(e.target.value)}
            onKeyPress={e=>e.key==='Enter'&&seConnecter()}
            style={styles.loginInput} />
          {erreurMdp && <p style={{color:'red',fontSize:'0.85rem'}}>{erreurMdp}</p>}
          <button onClick={seConnecter} style={styles.loginBtn}>Connexion</button>
        </div>
      </div>
    );
  }

  const elevesClasse = classeFiltre ? eleves : [];
  const moyenneClasseFiltre = elevesClasse.length > 0
    ? (() => {
        const valides = elevesClasse.filter(e=>e.moyenne_generale&&parseFloat(e.moyenne_generale)>0);
        return valides.length > 0
          ? (valides.reduce((s,e)=>s+parseFloat(e.moyenne_generale),0)/valides.length).toFixed(2)
          : '-';
      })()
    : '-';

  const classes3eme = classes.filter(c => c.toLowerCase().startsWith('3'));
  const totalAdmisBepc = eleves.filter(e =>
    classes3eme.some(c => c === e.classe) && e.decision_fin_annee === 'Admis'
  ).length;

  return (
    <div style={styles.app}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={{fontSize:'1.8rem'}}>🎓</span>
          <div>
            <div style={styles.headerTitre}>WebScool</div>
            <div style={styles.headerSous}>{eleves.length} élèves — {ETABLISSEMENT}</div>
          </div>
        </div>
        <button onClick={()=>setConnecte(false)} style={styles.btnDeconnecter}>Déconnexion</button>
      </div>

      <div style={styles.nav}>
        {[['liste','📋 Élèves'],['formulaire','➕ Ajouter'],['importer','📥 Importer'],['bepc','🏆 BEPC']].map(([id,label])=>(
          <button key={id} onClick={()=>{setOnglet(id);if(id==='formulaire')ouvrirFormulaire();}}
            style={onglet===id?styles.navBtnActif:styles.navBtn}>{label}</button>
        ))}
      </div>

      {onglet==='liste' && (
        <div style={styles.contenu}>
          <div style={styles.filtres}>
            <input placeholder="🔍 Rechercher par nom ou matricule..." value={recherche}
              onChange={e=>rechercherEleves(e.target.value)} style={styles.inputRecherche} />
            <select value={classeFiltre} onChange={e=>filtrerParClasse(e.target.value)} style={styles.selectClasse}>
              <option value="">Toutes les classes</option>
              {classes.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            {classeFiltre && (
              <button onClick={imprimerListeClasse} style={styles.btnImprimerClasse}>
                🖨️ Imprimer la liste
              </button>
            )}
          </div>

          {classeFiltre && elevesClasse.length > 0 && (
            <div style={styles.statsClasse}>
              <span>📊 Classe : <strong>{classeFiltre}</strong></span>
              <span>👥 Total : <strong>{elevesClasse.length}</strong></span>
              <span>📈 Moy. : <strong>{moyenneClasseFiltre}</strong></span>
              <span style={{color:'#166534'}}>✅ Admis : <strong>{elevesClasse.filter(e=>e.decision_fin_annee==='Admis').length}</strong></span>
              <span style={{color:'#92400e'}}>🔄 Redoublants : <strong>{elevesClasse.filter(e=>e.decision_fin_annee==='Redoublant').length}</strong></span>
              <span style={{color:'#991b1b'}}>❌ Exclus : <strong>{elevesClasse.filter(e=>e.decision_fin_annee==='Exclu').length}</strong></span>
              <span>📊 Taux réussite : <strong>{Math.round(elevesClasse.filter(e=>e.decision_fin_annee==='Admis').length/elevesClasse.length*100)}%</strong></span>
            </div>
          )}

          <p style={styles.compteur}>{eleves.length} élève(s){classeFiltre?` en ${classeFiltre}`:''}</p>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead style={styles.tableHead}>
                <tr>
                  {['#','Matricule','Nom','Prénom','Classe','Parent','Téléphone','T1','T2','T3','MGA','Décision','Actions'].map(h=>(
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {eleves.map((e,i)=>(
                  <tr key={e.id} style={i%2===0?styles.trPair:styles.trImpair}>
                    <td style={styles.td}>{i+1}</td>
                    <td style={styles.td}>{e.matricule}</td>
                    <td style={styles.td}><strong>{e.nom}</strong></td>
                    <td style={styles.td}>{e.prenom}</td>
                    <td style={styles.td}><span style={styles.badgeClasse}>{e.classe}</span></td>
                    <td style={styles.td}>{e.nom_parent}</td>
                    <td style={styles.td}>
                      {e.telephone1&&<a href={`tel:${e.telephone1}`} style={styles.telLink}>📞 {e.telephone1}</a>}
                    </td>
                    <td style={styles.td}>{e.moyenne_t1||'-'}</td>
                    <td style={styles.td}>{e.moyenne_t2||'-'}</td>
                    <td style={styles.td}>{e.moyenne_t3||'-'}</td>
                    <td style={styles.td}><strong>{e.moyenne_generale||'-'}</strong></td>
                    <td style={styles.td}>
                      <span style={e.decision_fin_annee==='Admis'?styles.badgeAdmis:e.decision_fin_annee==='Redoublant'?styles.badgeRedoublant:e.decision_fin_annee==='Exclu'?styles.badgeExclu:{}}>
                        {e.decision_fin_annee||'-'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button onClick={()=>ouvrirFiche(e)} style={styles.btnVoir}>👁️</button>
                      <button onClick={()=>{setEleveSelectionne(e);ouvrirFormulaire(e);}} style={styles.btnModifier}>✏️</button>
                      <button onClick={()=>supprimerEleve(e.id)} style={styles.btnSupprimer}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {onglet==='fiche' && eleveSelectionne && (
        <div style={styles.contenu}>
          <div style={{marginBottom:'1rem'}}>
            <button onClick={()=>setOnglet('liste')} style={styles.btnRetour}>← Retour</button>
            <button onClick={()=>window.print()} style={styles.btnImprimer}>🖨️ Imprimer</button>
            <button onClick={()=>ouvrirFormulaire(eleveSelectionne)} style={styles.btnModifier2}>✏️ Modifier</button>
          </div>
          <div style={styles.ficheCard}>
            <div style={styles.ficheHeader}>
              <div style={styles.ficheAvatar}>
                {eleveSelectionne.photo
                  ? <img src={eleveSelectionne.photo} alt="" style={styles.fichePhoto}/>
                  : <span style={{fontSize:'2.5rem'}}>👤</span>}
              </div>
              <div>
                <h2 style={styles.ficheNom}>{eleveSelectionne.nom} {eleveSelectionne.prenom}</h2>
                <p style={styles.ficheClasse}>Classe : {eleveSelectionne.classe}</p>
                <p style={styles.ficheMatricule}>Matricule : {eleveSelectionne.matricule}</p>
              </div>
            </div>
            <div style={styles.ficheGrid}>
              <div style={styles.ficheSection}>
                <h3 style={styles.sectionTitre}>👪 Contact parent</h3>
                <p><strong>Nom :</strong> {eleveSelectionne.nom_parent||'-'}</p>
                <p><strong>Tél 1 :</strong> {eleveSelectionne.telephone1?<a href={`tel:${eleveSelectionne.telephone1}`} style={styles.telLink}>{eleveSelectionne.telephone1}</a>:'-'}</p>
                <p><strong>Tél 2 :</strong> {eleveSelectionne.telephone2?<a href={`tel:${eleveSelectionne.telephone2}`} style={styles.telLink}>{eleveSelectionne.telephone2}</a>:'-'}</p>
              </div>
              <div style={styles.ficheSection}>
                <h3 style={styles.sectionTitre}>📊 Résultats scolaires</h3>
                <p><strong>T1 :</strong> {eleveSelectionne.moyenne_t1||'-'}</p>
                <p><strong>T2 :</strong> {eleveSelectionne.moyenne_t2||'-'}</p>
                <p><strong>T3 :</strong> {eleveSelectionne.moyenne_t3||'-'}</p>
                <p><strong>MGA :</strong> <span style={{fontWeight:'bold',fontSize:'1.1rem'}}>{eleveSelectionne.moyenne_generale||'-'}</span></p>
                <p><strong>Décision :</strong> <span style={eleveSelectionne.decision_fin_annee==='Admis'?styles.badgeAdmis:eleveSelectionne.decision_fin_annee==='Redoublant'?styles.badgeRedoublant:styles.badgeExclu}>{eleveSelectionne.decision_fin_annee||'-'}</span></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {onglet==='formulaire' && (
        <div style={styles.contenu}>
          <h2 style={styles.titrePage}>{modeFormulaire==='ajouter'?'➕ Ajouter un élève':'✏️ Modifier un élève'}</h2>
          <div style={styles.formCard}>
            <h3 style={styles.sectionTitre}>📋 Informations générales</h3>
            <div style={styles.formGrid}>
              <div><label style={styles.label}>Matricule</label>
                <input value={formulaire.matricule} onChange={e=>setFormulaire({...formulaire,matricule:e.target.value})} style={styles.input}/></div>
              <div><label style={styles.label}>Nom *</label>
                <input value={formulaire.nom} onChange={e=>setFormulaire({...formulaire,nom:e.target.value})} style={styles.input}/></div>
              <div><label style={styles.label}>Prénom *</label>
                <input value={formulaire.prenom} onChange={e=>setFormulaire({...formulaire,prenom:e.target.value})} style={styles.input}/></div>
              <div><label style={styles.label}>Classe *</label>
                <input value={formulaire.classe} onChange={e=>setFormulaire({...formulaire,classe:e.target.value})} style={styles.input} list="liste-classes"/>
                <datalist id="liste-classes">{classes.map(c=><option key={c} value={c}/>)}</datalist></div>
              <div><label style={styles.label}>N° Extrait</label>
                <input value={formulaire.numero_extrait} onChange={e=>setFormulaire({...formulaire,numero_extrait:e.target.value})} style={styles.input}/></div>
            </div>
            <h3 style={{...styles.sectionTitre,marginTop:'1.5rem'}}>👪 Contact parent</h3>
            <div style={styles.formGrid}>
              <div><label style={styles.label}>Nom parent</label>
                <input value={formulaire.nom_parent} onChange={e=>setFormulaire({...formulaire,nom_parent:e.target.value})} style={styles.input}/></div>
              <div><label style={styles.label}>Téléphone 1</label>
                <input value={formulaire.telephone1} onChange={e=>setFormulaire({...formulaire,telephone1:e.target.value})} style={styles.input} type="tel"/></div>
              <div><label style={styles.label}>Téléphone 2</label>
                <input value={formulaire.telephone2} onChange={e=>setFormulaire({...formulaire,telephone2:e.target.value})} style={styles.input} type="tel"/></div>
            </div>
            {messageFormulaire&&<p style={messageFormulaire.includes('✅')?styles.succes:styles.erreur}>{messageFormulaire}</p>}
            <button onClick={sauvegarderEleve} style={styles.btnSauvegarder}>
              {modeFormulaire==='ajouter'?'➕ Ajouter':'💾 Sauvegarder'}
            </button>
          </div>
        </div>
      )}

      {onglet==='importer' && (
        <div style={styles.contenu}>
          <h2 style={styles.titrePage}>📥 Import des moyennes trimestrielles</h2>
          <div style={styles.importCard}>
            <div style={styles.trimestreBtns}>
              {['T1','T2','T3'].map(t=>(
                <button key={t} onClick={()=>setTrimestreActif(t)}
                  style={trimestreActif===t?styles.trimestreBtnActif:styles.trimestreBtn}>
                  📊 Trimestre {t}
                </button>
              ))}
            </div>
            <p style={styles.importInfo}>📌 Fichier Excel pour <strong>{trimestreActif}</strong> — colonnes requises :</p>
            <p style={styles.colonnes}>Matricule | Moyenne_{trimestreActif}</p>
            <input type="file" accept=".xlsx,.xls" onChange={e=>setFichierExcel(e.target.files[0])} style={{margin:'1rem 0'}}/>
            <br/>
            <button onClick={importerTrimestre} disabled={importEnCours} style={styles.btnImportExcel}>
              {importEnCours?`⏳ Import ${trimestreActif}...`:`📥 Importer ${trimestreActif}`}
            </button>
            {importStatus&&<p style={importStatus.includes('✅')?styles.succes:styles.erreur}>{importStatus}</p>}

            <hr style={{margin:'2rem 0',border:'none',borderTop:'2px solid #e2e8f0'}}/>
            <h3 style={styles.sectionTitre}>🧮 Calcul automatique MGA + DFA</h3>
            <p style={{color:'#64748b',fontSize:'0.9rem'}}>
              Après avoir importé T1, T2 et T3 :<br/>
              MGA &lt; 8.5 → <strong style={{color:'red'}}>Exclu</strong> | 8.5 ≤ MGA &lt; 10 → <strong style={{color:'orange'}}>Redoublant</strong> | MGA ≥ 10 → <strong style={{color:'green'}}>Admis</strong>
            </p>
            <button onClick={calculerMoyennesAnnuelles} disabled={calcEnCours} style={styles.btnCalculer}>
              {calcEnCours?'⏳ Calcul...':'🧮 Calculer MGA + DFA'}
            </button>
            {calcStatus&&<p style={calcStatus.includes('✅')?styles.succes:styles.erreur}>{calcStatus}</p>}
          </div>
        </div>
      )}

      {onglet==='bepc' && (
        <div style={styles.contenu}>
          <h2 style={styles.titrePage}>🏆 Liste des Admis au BEPC</h2>
          <div style={styles.importCard}>
            <div style={styles.bepcInfo}>
              <p>📌 Liste automatique des élèves de <strong>3ème</strong> avec décision <strong style={{color:'green'}}>Admis</strong>.</p>
              <p>Classes 3ème détectées : <strong>{classes3eme.length > 0 ? classes3eme.join(', ') : 'Aucune'}</strong></p>
              <p style={{fontSize:'1.3rem',fontWeight:'bold',color:'#166534'}}>✅ Total admis au BEPC : {totalAdmisBepc} élèves</p>
            </div>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead style={{...styles.tableHead, background:'#166534'}}>
                  <tr>
                    {['#','Matricule','Nom','Prénom','Classe','MGA','Parent','Téléphone'].map(h=>(
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {eleves.filter(e => classes3eme.some(c=>c===e.classe) && e.decision_fin_annee==='Admis')
                    .sort((a,b)=>(parseFloat(b.moyenne_generale)||0)-(parseFloat(a.moyenne_generale)||0))
                    .map((e,i)=>(
                    <tr key={e.id} style={i%2===0?styles.trPair:styles.trImpair}>
                      <td style={styles.td}>{i+1}</td>
                      <td style={styles.td}>{e.matricule}</td>
                      <td style={styles.td}><strong>{e.nom}</strong></td>
                      <td style={styles.td}>{e.prenom}</td>
                      <td style={styles.td}><span style={styles.badgeClasse}>{e.classe}</span></td>
                      <td style={styles.td}><strong style={{color:'green'}}>{e.moyenne_generale||'-'}</strong></td>
                      <td style={styles.td}>{e.nom_parent||'-'}</td>
                      <td style={styles.td}>{e.telephone1?<a href={`tel:${e.telephone1}`} style={styles.telLink}>📞 {e.telephone1}</a>:'-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <br/>
            <button onClick={imprimerListeBEPC} style={{...styles.btnCalculer, background:'#166534'}}>
              🖨️ Imprimer la liste des admis BEPC
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  app:{fontFamily:'Segoe UI, Arial, sans-serif',minHeight:'100vh',backgroundColor:'#f0f4f8'},
  loginPage:{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg, #1e3a5f, #2563eb)'},
  loginBox:{background:'white',padding:'2.5rem',borderRadius:'16px',textAlign:'center',width:'320px',boxShadow:'0 8px 32px rgba(0,0,0,0.2)'},
  loginLogo:{fontSize:'3rem',marginBottom:'0.5rem'},
  loginTitre:{margin:'0 0 0.3rem',color:'#1e3a5f',fontSize:'1.8rem'},
  loginSousTitre:{color:'#666',marginBottom:'1.5rem',fontSize:'0.9rem'},
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
  contenu:{padding:'1.5rem',maxWidth:'1200px',margin:'0 auto'},
  filtres:{display:'flex',gap:'0.75rem',marginBottom:'0.75rem',flexWrap:'wrap',alignItems:'center'},
  inputRecherche:{flex:1,minWidth:'200px',padding:'0.6rem 1rem',border:'2px solid #e2e8f0',borderRadius:'8px',fontSize:'0.95rem'},
  selectClasse:{padding:'0.6rem 1rem',border:'2px solid #e2e8f0',borderRadius:'8px',fontSize:'0.95rem'},
  statsClasse:{display:'flex',gap:'1rem',background:'#dbeafe',padding:'0.75rem 1rem',borderRadius:'8px',marginBottom:'0.75rem',flexWrap:'wrap',fontSize:'0.88rem'},
  compteur:{color:'#64748b',fontSize:'0.9rem',marginBottom:'0.5rem'},
  tableWrap:{overflowX:'auto'},
  table:{width:'100%',borderCollapse:'collapse',background:'white',borderRadius:'10px',overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,0.07)'},
  tableHead:{background:'#1e3a5f'},
  th:{padding:'0.75rem 0.5rem',color:'white',textAlign:'left',fontWeight:'600',fontSize:'0.82rem'},
  td:{padding:'0.55rem 0.5rem',fontSize:'0.85rem',borderBottom:'1px solid #f0f4f8'},
  trPair:{background:'white'},
  trImpair:{background:'#f8fafc'},
  badgeClasse:{background:'#dbeafe',color:'#1e40af',padding:'2px 8px',borderRadius:'12px',fontSize:'0.8rem',fontWeight:'600'},
  badgeAdmis:{background:'#dcfce7',color:'#166534',padding:'2px 8px',borderRadius:'12px',fontSize:'0.8rem',fontWeight:'600'},
  badgeRedoublant:{background:'#fef3c7',color:'#92400e',padding:'2px 8px',borderRadius:'12px',fontSize:'0.8rem',fontWeight:'600'},
  badgeExclu:{background:'#fee2e2',color:'#991b1b',padding:'2px 8px',borderRadius:'12px',fontSize:'0.8rem',fontWeight:'600'},
  telLink:{color:'#2563eb',textDecoration:'none'},
  btnVoir:{background:'#2563eb',color:'white',border:'none',borderRadius:'6px',padding:'4px 8px',cursor:'pointer',marginRight:'3px',fontSize:'0.8rem'},
  btnModifier:{background:'#f59e0b',color:'white',border:'none',borderRadius:'6px',padding:'4px 8px',cursor:'pointer',marginRight:'3px',fontSize:'0.8rem'},
  btnSupprimer:{background:'#ef4444',color:'white',border:'none',borderRadius:'6px',padding:'4px 8px',cursor:'pointer',fontSize:'0.8rem'},
  btnRetour:{background:'#64748b',color:'white',border:'none',borderRadius:'8px',padding:'0.5rem 1rem',cursor:'pointer',marginRight:'0.5rem'},
  btnImprimer:{background:'#2563eb',color:'white',border:'none',borderRadius:'8px',padding:'0.5rem 1rem',cursor:'pointer',marginRight:'0.5rem'},
  btnImprimerClasse:{background:'#1e3a5f',color:'white',border:'none',borderRadius:'8px',padding:'0.5rem 1rem',cursor:'pointer',fontWeight:'600'},
  btnModifier2:{background:'#f59e0b',color:'white',border:'none',borderRadius:'8px',padding:'0.5rem 1rem',cursor:'pointer'},
  ficheCard:{background:'white',borderRadius:'12px',padding:'2rem',boxShadow:'0 2px 8px rgba(0,0,0,0.08)'},
  ficheHeader:{display:'flex',alignItems:'center',gap:'1.5rem',marginBottom:'1.5rem',borderBottom:'2px solid #e2e8f0',paddingBottom:'1.5rem'},
  ficheAvatar:{width:'80px',height:'80px',borderRadius:'50%',background:'#dbeafe',display:'flex',alignItems:'center',justifyContent:'center'},
  fichePhoto:{width:'80px',height:'80px',objectFit:'cover'},
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
  colonnes:{background:'#f0f4f8',padding:'0.75rem',borderRadius:'8px',fontSize:'0.85rem',color:'#374151'},
  btnImportExcel:{background:'#2563eb',color:'white',border:'none',borderRadius:'8px',padding:'0.75rem 1.5rem',cursor:'pointer',fontSize:'1rem',fontWeight:'600'},
  btnCalculer:{background:'#7c3aed',color:'white',border:'none',borderRadius:'8px',padding:'0.75rem 1.5rem',cursor:'pointer',fontSize:'1rem',fontWeight:'600',marginTop:'0.5rem'},
  bepcInfo:{background:'#dcfce7',borderRadius:'8px',padding:'1rem',marginBottom:'1.5rem'},
  succes:{color:'green',fontWeight:'600',marginTop:'0.75rem'},
  erreur:{color:'red',fontWeight:'600',marginTop:'0.75rem'},
};
