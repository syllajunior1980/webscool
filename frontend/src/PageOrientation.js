import React, { useState } from 'react';
import axios from 'axios';

const API = 'https://webscool.onrender.com/api';
const ETABLISSEMENT = 'COLLÈGE MODERNE BOUAKÉ DAR ES SALAM';

export default function PageOrientation() {
  const [matricule, setMatricule] = useState('');
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [eleve, setEleve] = useState(null);
  const [notes, setNotes] = useState({ math_bepc: '', cf_bepc: '', phch_bepc: '', ang_oral_bepc: '', ang_ecrit_bepc: '' });
  const [enregistrement, setEnregistrement] = useState(false);
  const [messageSauvegarde, setMessageSauvegarde] = useState('');

  const rechercher = async () => {
    const mat = matricule.trim();
    if (!mat) { setErreur('Veuillez saisir un matricule'); return; }
    setChargement(true);
    setErreur('');
    setEleve(null);
    setMessageSauvegarde('');
    try {
      const res = await axios.get(`${API}/moyenne-orientation/${encodeURIComponent(mat)}`);
      setEleve(res.data);
      setNotes({
        math_bepc: res.data.notes_bepc.math ?? '',
        cf_bepc: res.data.notes_bepc.composition_francaise ?? '',
        phch_bepc: res.data.notes_bepc.sciences_physiques ?? '',
        ang_oral_bepc: res.data.notes_bepc.anglais_oral ?? '',
        ang_ecrit_bepc: res.data.notes_bepc.anglais_ecrit ?? ''
      });
    } catch (err) {
      setErreur(err.response?.data?.error || 'Élève introuvable. Vérifiez le matricule.');
    }
    setChargement(false);
  };

  const enregistrerNotes = async () => {
    setEnregistrement(true);
    setMessageSauvegarde('');
    try {
      const res = await axios.put(`${API}/moyenne-orientation/${encodeURIComponent(eleve.matricule)}/notes`, notes);
      setEleve(prev => ({ ...prev, complet: res.data.complet, moyenne_orientation: res.data.moyenne_orientation, detail: res.data.detail }));
      setMessageSauvegarde('✅ Notes enregistrées avec succès');
    } catch (err) {
      setMessageSauvegarde('❌ Erreur : ' + (err.response?.data?.error || err.message));
    }
    setEnregistrement(false);
  };

  const champBepc = (label, cle) => (
    <div style={st.champ}>
      <label style={st.label}>{label}</label>
      <input
        type="number" step="0.01" min="0" max="20"
        value={notes[cle]}
        onChange={e => setNotes({ ...notes, [cle]: e.target.value })}
        style={st.inputBepc}
        placeholder="/ 20"
      />
    </div>
  );

  const champMga = (label, valeur) => (
    <div style={st.champ}>
      <label style={st.label}>{label}</label>
      <div style={st.inputMga}>
        <span>{valeur !== null && valeur !== undefined ? valeur : '—'}</span>
        <span style={st.cadenas}>🔒</span>
      </div>
    </div>
  );

  return (
    <div style={st.page}>
      <div style={st.header}>
        <h1 style={st.titre}>🎓 Moyenne d'Orientation — 3ème</h1>
        <p style={st.sousTitre}>{ETABLISSEMENT}</p>
      </div>

      <div style={st.recherche}>
        <input
          type="text"
          placeholder="Entrez le matricule de l'élève"
          value={matricule}
          onChange={e => setMatricule(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && rechercher()}
          style={st.inputRecherche}
        />
        <button onClick={rechercher} disabled={chargement} style={st.btnRecherche}>
          {chargement ? '⏳ Recherche...' : '🔍 Rechercher'}
        </button>
      </div>

      {erreur && <p style={st.erreur}>{erreur}</p>}

      {eleve && (
        <div style={st.carte}>
          <div style={st.entete}>
            {eleve.photo_url ? (
              <img src={eleve.photo_url} alt={eleve.nom} style={st.photo} />
            ) : (
              <div style={st.photoVide}>👤</div>
            )}
            <div>
              <h2 style={st.nomEleve}>{eleve.nom} {eleve.prenoms}</h2>
              <p style={st.matriculeTxt}>Matricule : {eleve.matricule}</p>
              <p style={st.classeTxt}>Classe : {eleve.classe || '—'}</p>
            </div>
          </div>

          <h3 style={st.sectionTitre}>📘 Moyennes annuelles (MGA) — non modifiables</h3>
          <div style={st.grille}>
            {champMga('Mathématiques', eleve.mga.math)}
            {champMga('Composition Française', eleve.mga.composition_francaise)}
            {champMga('Sciences Physiques', eleve.mga.sciences_physiques)}
            {champMga('Anglais', eleve.mga.anglais)}
          </div>

          <h3 style={st.sectionTitre}>📝 Notes obtenues à l'examen du BEPC</h3>
          <div style={st.grille}>
            {champBepc('Mathématiques', 'math_bepc')}
            {champBepc('Composition Française', 'cf_bepc')}
            {champBepc('Sciences Physiques', 'phch_bepc')}
            {champBepc('Anglais Oral', 'ang_oral_bepc')}
            {champBepc('Anglais Écrit', 'ang_ecrit_bepc')}
          </div>

          <button onClick={enregistrerNotes} disabled={enregistrement} style={st.btnEnregistrer}>
            {enregistrement ? '⏳ Enregistrement...' : '💾 Enregistrer les notes'}
          </button>

          {messageSauvegarde && <p style={messageSauvegarde.includes('✅') ? st.succes : st.erreur}>{messageSauvegarde}</p>}

          {eleve.complet && eleve.moyenne_orientation !== null && (
            <div style={st.resultat}>
              <h3 style={st.resultatTitre}>🎯 Moyenne d'Orientation</h3>
              <div style={st.moyenneFinale}>{eleve.moyenne_orientation} / 20</div>
              {eleve.detail && (
                <div style={st.detail}>
                  <p>Mathématiques : <strong>{eleve.detail.math}</strong></p>
                  <p>Composition Française : <strong>{eleve.detail.composition_francaise}</strong></p>
                  <p>Sciences Physiques : <strong>{eleve.detail.sciences_physiques}</strong></p>
                  <p>Anglais : <strong>{eleve.detail.anglais}</strong> (moyenne oral/écrit BEPC : {eleve.detail.note_anglais_bepc_moyenne})</p>
                </div>
              )}
            </div>
          )}

          {!eleve.complet && (
            <p style={st.attente}>⏳ Renseignez les 5 notes BEPC pour calculer la moyenne d'orientation.</p>
          )}
        </div>
      )}
    </div>
  );
}

const st = {
  page: { minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 60%, #0ea5e9 100%)', fontFamily: 'Segoe UI, Arial, sans-serif', padding: '2rem 1rem' },
  header: { textAlign: 'center', color: 'white', marginBottom: '1.5rem' },
  titre: { margin: '0 0 0.25rem', fontSize: '1.8rem', fontWeight: '800' },
  sousTitre: { margin: 0, fontSize: '0.9rem', opacity: 0.9 },
  recherche: { display: 'flex', gap: '0.5rem', maxWidth: '500px', margin: '0 auto 1.5rem' },
  inputRecherche: { flex: 1, padding: '0.8rem 1rem', borderRadius: '10px', border: 'none', fontSize: '1rem' },
  btnRecherche: { background: '#16a34a', color: 'white', border: 'none', borderRadius: '10px', padding: '0.8rem 1.4rem', fontWeight: '700', cursor: 'pointer', fontSize: '0.95rem' },
  erreur: { color: '#fee2e2', background: '#b91c1c', maxWidth: '500px', margin: '0 auto', padding: '0.6rem 1rem', borderRadius: '8px', textAlign: 'center', fontWeight: '600' },
  succes: { color: 'green', fontWeight: '700', textAlign: 'center', marginTop: '0.5rem' },
  carte: { background: 'white', borderRadius: '18px', maxWidth: '700px', margin: '0 auto', padding: '1.5rem 2rem', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
  entete: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.2rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '1.2rem' },
  photo: { width: '80px', height: '80px', objectFit: 'cover', borderRadius: '10px', border: '2px solid #2563eb' },
  photoVide: { width: '80px', height: '80px', borderRadius: '10px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: '#94a3b8' },
  nomEleve: { margin: '0 0 0.2rem', color: '#1e3a5f', fontSize: '1.2rem' },
  matriculeTxt: { margin: '0 0 0.1rem', color: '#475569', fontSize: '0.85rem' },
  classeTxt: { margin: 0, color: '#475569', fontSize: '0.85rem' },
  sectionTitre: { color: '#1e3a5f', fontSize: '1rem', marginBottom: '0.6rem', marginTop: '1.2rem' },
  grille: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.8rem' },
  champ: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: '0.78rem', color: '#475569', marginBottom: '0.25rem', fontWeight: '600' },
  inputMga: { background: '#f0f0f0', color: '#444', padding: '0.6rem 0.7rem', borderRadius: '8px', fontWeight: '700', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #d1d5db' },
  cadenas: { fontSize: '0.8rem', opacity: 0.6 },
  inputBepc: { padding: '0.6rem 0.7rem', borderRadius: '8px', border: '2px solid #2563eb', fontSize: '0.95rem', fontWeight: '600' },
  btnEnregistrer: { marginTop: '1.2rem', width: '100%', background: '#2563eb', color: 'white', border: 'none', borderRadius: '10px', padding: '0.8rem', fontWeight: '700', cursor: 'pointer', fontSize: '0.95rem' },
  resultat: { marginTop: '1.5rem', background: '#dcfce7', borderRadius: '12px', padding: '1.2rem', textAlign: 'center' },
  resultatTitre: { margin: '0 0 0.5rem', color: '#166534' },
  moyenneFinale: { fontSize: '2.2rem', fontWeight: '800', color: '#166534', marginBottom: '0.8rem' },
  detail: { textAlign: 'left', fontSize: '0.85rem', color: '#166534', background: 'white', borderRadius: '8px', padding: '0.8rem 1rem' },
  attente: { marginTop: '1rem', textAlign: 'center', color: '#92400e', background: '#fef3c7', borderRadius: '8px', padding: '0.6rem' }
};
