import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'https://webscool.onrender.com/api';
const MOT_DE_PASSE = 'dsps2024';

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
  const [formulaire, setFormulaire] = useState({
    matricule: '', nom: '', prenom: '', classe: '', numero_extrait: '',
    moyenne_t1: '', moyenne_t2: '', moyenne_t3: '', moyenne_generale: '',
    decision_fin_annee: '', nom_parent: '', telephone1: '', telephone2: ''
  });
  const [modeFormulaire, setModeFormulaire] = useState('ajouter');
  const [messageFormulaire, setMessageFormulaire] = useState('');useEffect(() => {
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

  const importerExcel = async () => {
    if (!fichierExcel) { setImportStatus('⚠️ Choisissez un fichier Excel'); return; }
    setImportEnCours(true); setImportStatus('⏳ Import en cours...');
    const formData = new FormData();
    formData.append('fichier', fichierExcel);
    try {
      const res = await axios.post(`${API}/import/excel`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000
      });
      setImportStatus(`✅ ${res.data.importes} élèves importés ! (${res.data.erreurs} erreurs)`);
      chargerEleves(); chargerClasses();
    } catch (err) {
      const msg = err.response?.data?.erreur || err.message || 'Erreur inconnue';
      setImportStatus('❌ Erreur: ' + JSON.stringify(msg));
    }
    setImportEnCours(false);
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
  };if (!connecte) {
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

  return (
    <div style={styles.app}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={{fontSize:'1.8rem'}}>🎓</span>
          <div>
            <div style={styles.headerTitre}>WebScool</div>
            <div style={styles.headerSous}>{eleves.length} élèves enregistrés</div>
          </div>
        </div>
        <button onClick={()=>setConnecte(false)} style={styles.btnDeconnecter}>Déconnexion</button>
      </div>

      <div style={styles.nav}>
        {[['liste','📋 Élèves'],['formulaire','➕ Ajouter'],['importer','📥 Importer']].map(([id,label])=>(
          <button key={id} onClick={()=>{setOnglet(id);if(id==='formulaire')ouvrirFormulaire();}}
            style={onglet===id?styles.navBtnActif:styles.navBtn}>{label}</button>
        ))}
      </div>

      {onglet==='liste' && (
        <div style={styles.contenu}>
          <div style={styles.filtres}>
            <input placeholder="🔍 Rechercher..." value={recherche}
              onChange={e=>rechercherEleves(e.target.value)} style={styles.inputRecherche} />
            <select value={classeFiltre} onChange={e=>filtrerParClasse(e.target.value)} style={styles.selectClasse}>
              <option value="">Toutes les classes</option>
              {classes.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <p style={styles.compteur}>{eleves.length} élève(s)</p>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead style={styles.tableHead}>
                <tr>
                  {['Matricule','Nom','Prénom','Classe','Parent','Téléphone','Moy.','Actions'].map(h=>(
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {eleves.map((e,i)=>(
                  <tr key={e.id} style={i%2===0?styles.trPair:styles.trImpair}>
                    <td style={styles.td}>{e.matricule}</td>
                    <td style={styles.td}>{e.nom}</td>
                    <td style={styles.td}>{e.prenom}</td>
                    <td style={styles.td}><span style={styles.badgeClasse}>{e.classe}</span></td>
                    <td style={styles.td}>{e.nom_parent}</td>
                    <td style={styles.td}>
                      {e.telephone1&&<a href={`tel:${e.telephone1}`} style={styles.telLink}>📞 {e.telephone1}</a>}
                    </td>
                    <td style={styles.td}>{e.moyenne_generale||'-'}</td>
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
                <p style={styles.ficheClasse}>Classe: {eleveSelectionne.classe}</p>
                <p style={styles.ficheMatricule}>Matricule: {eleveSelectionne.matricule}</p>
              </div>
            </div>
            <div style={styles.ficheGrid}>
              <div style={styles.ficheSection}>
                <h3 style={styles.sectionTitre}>👪 Contact parent</h3>
                <p><strong>Nom:</strong> {eleveSelectionne.nom_parent||'-'}</p>
                <p><strong>Tél 1:</strong> {eleveSelectionne.telephone1
                  ?<a href={`tel:${eleveSelectionne.telephone1}`} style={styles.telLink}>{eleveSelectionne.telephone1}</a>:'-'}</p>
                <p><strong>Tél 2:</strong> {eleveSelectionne.telephone2
                  ?<a href={`tel:${eleveSelectionne.telephone2}`} style={styles.telLink}>{eleveSelectionne.telephone2}</a>:'-'}</p>
              </div>
              <div style={styles.ficheSection}>
                <h3 style={styles.sectionTitre}>📊 Résultats</h3>
                <p><strong>T1:</strong> {eleveSelectionne.moyenne_t1||'-'}</p>
                <p><strong>T2:</strong> {eleveSelectionne.moyenne_t2||'-'}</p>
                <p><strong>T3:</strong> {eleveSelectionne.moyenne_t3||'-'}</p>
                <p><strong>Moy. générale:</strong> {eleveSelectionne.moyenne_generale||'-'}</p>
                <p><strong>Décision:</strong> {eleveSelectionne.decision_fin_annee||'-'}</p>
              </div>
            </div>
          </div>
        </div>
      )}{onglet==='formulaire' && (
        <div style={styles.contenu}>
          <h2 style={styles.titrePage}>{modeFormulaire==='ajouter'?'➕ Ajouter un élève':'✏️ Modifier l\'élève'}</h2>
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
              <div><label style={styles.label}>Nom parent *</label>
                <input value={formulaire.nom_parent} onChange={e=>setFormulaire({...formulaire,nom_parent:e.target.value})} style={styles.input}/></div>
              <div><label style={styles.label}>Téléphone 1 *</label>
                <input value={formulaire.telephone1} onChange={e=>setFormulaire({...formulaire,telephone1:e.target.value})} style={styles.input} type="tel"/></div>
              <div><label style={styles.label}>Téléphone 2</label>
                <input value={formulaire.telephone2} onChange={e=>setFormulaire({...formulaire,telephone2:e.target.value})} style={styles.input} type="tel"/></div>
            </div>
            <h3 style={{...styles.sectionTitre,marginTop:'1.5rem'}}>📊 Résultats scolaires</h3>
            <div style={styles.formGrid}>
              <div><label style={styles.label}>Moy. T1</label>
                <input value={formulaire.moyenne_t1} onChange={e=>setFormulaire({...formulaire,moyenne_t1:e.target.value})} style={styles.input} type="number" step="0.01"/></div>
              <div><label style={styles.label}>Moy. T2</label>
                <input value={formulaire.moyenne_t2} onChange={e=>setFormulaire({...formulaire,moyenne_t2:e.target.value})} style={styles.input} type="number" step="0.01"/></div>
              <div><label style={styles.label}>Moy. T3</label>
                <input value={formulaire.moyenne_t3} onChange={e=>setFormulaire({...formulaire,moyenne_t3:e.target.value})} style={styles.input} type="number" step="0.01"/></div>
              <div><label style={styles.label}>Moy. Générale</label>
                <input value={formulaire.moyenne_generale} onChange={e=>setFormulaire({...formulaire,moyenne_generale:e.target.value})} style={styles.input} type="number" step="0.01"/></div>
              <div><label style={styles.label}>Décision</label>
                <select value={formulaire.decision_fin_annee} onChange={e=>setFormulaire({...formulaire,decision_fin_annee:e.target.value})} style={styles.input}>
                  <option value="">-- Choisir --</option>
                  <option value="Admis">Admis</option>
                  <option value="Redoublant">Redoublant</option>
                  <option value="Exclu">Exclu</option>
                </select></div>
            </div>
            {messageFormulaire&&<p style={messageFormulaire.includes('✅')?styles.succes:styles.erreur}>{messageFormulaire}</p>}
            <button onClick={sauvegarderEleve} style={styles.btnSauvegarder}>
              {modeFormulaire==='ajouter'?'+ Ajouter':'💾 Sauvegarder'}
            </button>
          </div>
        </div>
      )}

      {onglet==='importer' && (
        <div style={styles.contenu}>
          <h2 style={styles.titrePage}>📥 Importer des élèves</h2>
          <div style={styles.importCard}>
            <p style={styles.importInfo}>📌 Colonnes requises :</p>
            <p style={styles.colonnes}>Matricule | Nom | Prenom | Classe | N° Extrait | Moy_T1 | Moy_T2 | Moy_T3 | Moy_Gen | Decision | Nom_Parent | Telephone1 | Telephone2</p>
            <input type="file" accept=".xlsx,.xls" onChange={e=>setFichierExcel(e.target.files[0])} style={{margin:'1rem 0'}}/>
            <br/>
            <button onClick={importerExcel} disabled={importEnCours} style={styles.btnImportExcel}>
              {importEnCours?'⏳ Import en cours...':'📥 Importer'}
            </button>
            {importStatus&&<p style={importStatus.includes('✅')?styles.succes:styles.erreur}>{importStatus}</p>}
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
  headerSous:{fontSize:'0.85rem',opacity:0.85},
  btnDeconnecter:{background:'rgba(255,255,255,0.2)',color:'white',border:'1px solid rgba(255,255,255,0.4)',borderRadius:'8px',padding:'0.4rem 0.9rem',cursor:'pointer'},
  nav:{background:'white',padding:'0.75rem 1.5rem',display:'flex',gap:'0.5rem',borderBottom:'1px solid #e2e8f0'},
  navBtn:{padding:'0.5rem 1.1rem',border:'2px solid #e2e8f0',borderRadius:'8px',background:'white',cursor:'pointer',fontWeight:'500'},
  navBtnActif:{padding:'0.5rem 1.1rem',border:'2px solid #2563eb',borderRadius:'8px',background:'#2563eb',color:'white',cursor:'pointer',fontWeight:'500'},
  contenu:{padding:'1.5rem',maxWidth:'1100px',margin:'0 auto'},
  filtres:{display:'flex',gap:'0.75rem',marginBottom:'0.75rem',flexWrap:'wrap'},
  inputRecherche:{flex:1,minWidth:'200px',padding:'0.6rem 1rem',border:'2px solid #e2e8f0',borderRadius:'8px',fontSize:'0.95rem'},
  selectClasse:{padding:'0.6rem 1rem',border:'2px solid #e2e8f0',borderRadius:'8px',fontSize:'0.95rem'},
  compteur:{color:'#64748b',fontSize:'0.9rem',marginBottom:'0.5rem'},
  tableWrap:{overflowX:'auto'},
  table:{width:'100%',borderCollapse:'collapse',background:'white',borderRadius:'10px',overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,0.07)'},
  tableHead:{background:'#1e3a5f'},
  th:{padding:'0.75rem 1rem',color:'white',textAlign:'left',fontWeight:'600',fontSize:'0.88rem'},
  td:{padding:'0.65rem 1rem',fontSize:'0.9rem',borderBottom:'1px solid #f0f4f8'},
  trPair:{background:'white'},
  trImpair:{background:'#f8fafc'},
  badgeClasse:{background:'#dbeafe',color:'#1e40af',padding:'2px 8px',borderRadius:'12px',fontSize:'0.8rem',fontWeight:'600'},
  telLink:{color:'#2563eb',textDecoration:'none'},
  btnVoir:{background:'#2563eb',color:'white',border:'none',borderRadius:'6px',padding:'4px 10px',cursor:'pointer',marginRight:'4px',fontSize:'0.82rem'},
  btnModifier:{background:'#f59e0b',color:'white',border:'none',borderRadius:'6px',padding:'4px 8px',cursor:'pointer',marginRight:'4px',fontSize:'0.82rem'},
  btnSupprimer:{background:'#ef4444',color:'white',border:'none',borderRadius:'6px',padding:'4px 8px',cursor:'pointer',fontSize:'0.82rem'},
  btnRetour:{background:'#64748b',color:'white',border:'none',borderRadius:'8px',padding:'0.5rem 1rem',cursor:'pointer',marginRight:'0.5rem'},
  btnImprimer:{background:'#2563eb',color:'white',border:'none',borderRadius:'8px',padding:'0.5rem 1rem',cursor:'pointer',marginRight:'0.5rem'},
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
  importInfo:{fontWeight:'600',color:'#1e3a5f'},
  colonnes:{background:'#f0f4f8',padding:'0.75rem',borderRadius:'8px',fontSize:'0.85rem',color:'#374151'},
  btnImportExcel:{background:'#2563eb',color:'white',border:'none',borderRadius:'8px',padding:'0.75rem 1.5rem',cursor:'pointer',fontSize:'1rem',fontWeight:'600'},
  succes:{color:'green',fontWeight:'600',marginTop:'0.75rem'},
  erreur:{color:'red',fontWeight:'600',marginTop:'0.75rem'},
};