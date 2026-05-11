import { useState } from 'react'
import { supabase } from '../supabase'
import Agenda from '../components/Agenda'
import Patients from '../components/Patients'
import Facturation from '../components/Facturation'
import Profil from '../components/Profil'
import Bilans from '../components/Bilans'
import { RGPDModal } from '../components/RGPD'
import Statistiques from '../components/Statistiques'
import './Dashboard.css'




export default function Dashboard({ session }) {
  const [activePage, setActivePage] = useState('agenda')
  const [showRGPD, setShowRGPD] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <div className="app">
      {/* NAV */}
      <nav className="nav">
        <div className="logo">
          <div className="logoMark">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <ellipse cx="10" cy="10" rx="7" ry="6" stroke="#0C447C" strokeWidth="1.5"/>
              <path d="M10 4Q13 6 13 10Q13 14 10 16" stroke="#0C447C" strokeWidth="1.2" strokeLinecap="round"/>
              <path d="M7 5Q5 8 6 11Q7 14 9 15" stroke="#0C447C" strokeWidth="1" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="logoText">Ortho<span style={{color:'#C9A84C'}}>Desk</span></span>
        </div>

        <button className={`hamburgerBtn ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(!menuOpen)} aria-label="Ouvrir le menu">
          ☰
        </button>

        <div className={`navTabs ${menuOpen ? 'mobileOpen' : ''}`}>
          {['agenda','patients','bilans','facturation','profil','stats'].map(page => (
            <button key={page} className={`navTab ${activePage === page ? 'navTabActive' : ''}`}
              onClick={() => { setActivePage(page); setMenuOpen(false) }}>
              {page.charAt(0).toUpperCase() + page.slice(1)}
            </button>
          ))}
        </div>

        <div className={`navRight ${menuOpen ? 'mobileOpen' : ''}`}>
          <span className="userEmail">{session.user.email}</span>
         
          <span style={{ fontSize:11, color:'#B0BBCC', cursor:'pointer', textDecoration:'underline' }}
            onClick={() => { setShowRGPD(true); setMenuOpen(false) }}>
            Confidentialité & RGPD            
          </span>          
          {showRGPD && <RGPDModal onClose={() => setShowRGPD(false)} />}
          <button className="logoutBtn" onClick={() => { setMenuOpen(false); handleLogout() }}>Déconnexion</button>
        </div>
      </nav>

      {/* CONTENU */}
      <div className="body">
        {activePage === 'agenda' && <Agenda session={session} />}
        {activePage === 'patients' && <Patients session={session} />}        
        {activePage === 'facturation' &&  <Facturation session={session} />}
        {activePage === 'profil' && <Profil session={session} />}        
        {activePage === 'bilans' && <Bilans session={session} />}  
        {activePage === 'stats' && <Statistiques session={session} />}
        


      </div>
    </div>
  )
}

function ComingSoon({ title }) {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',flexDirection:'column',gap:'12px',color:'#8A9BB0'}}>
      <div style={{fontSize:'48px'}}>🚧</div>
      <div style={{fontSize:'18px',fontWeight:'600',color:'#0C447C'}}>{title}</div>
      <div style={{fontSize:'13px'}}>Module en cours de développement</div>
    </div>
  )
}