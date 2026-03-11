import React, { useState } from 'react';

const API = 'https://webscool.onrender.com/api';
const MOT_DE_PASSE = 'dsps2024';

export default function App() {
  const [connecte, setConnecte] = useState(false);
  const [mdp, setMdp] = useState('');
  if (!connecte) {
    return (
      <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh'}}>
        <div>
          <h2>WebScool</h2>
          <input type="password" placeholder="Mot de passe" value={mdp} onChange={e=>setMdp(e.target.value)} />
          <button onClick={()=>{ if(mdp===MOT_DE_PASSE) setConnecte(true); }}>Connexion</button>
        </div>
      </div>
    );
  }
  return <div>Connecté! API: {API}</div>;
}
