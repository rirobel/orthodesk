import { useState } from 'react'
import { supabase } from '../supabase'
import Agenda from '../components/Agenda'
import Patients from '../components/Patients'
import Facturation from '../components/Facturation'
import Profil from '../components/Profil'
import Bilans from '../components/Bilans'
import { RGPDModal } from '../components/RGPD'
import Statistiques from '../components/Statistiques'




export default function Dashboard({ session }) {
  const [activePage, setActivePage] = useState('agenda')
  const [showRGPD, setShowRGPD] = useState(false)
  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <div style={styles.app}>
      {/* NAV */}
      <nav style={styles.nav}>
        <div style={styles.logo}>
          <div style={styles.logoMark}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <ellipse cx="10" cy="10" rx="7" ry="6" stroke="#0C447C" strokeWidth="1.5"/>
              <path d="M10 4Q13 6 13 10Q13 14 10 16" stroke="#0C447C" strokeWidth="1.2" strokeLinecap="round"/>
              <path d="M7 5Q5 8 6 11Q7 14 9 15" stroke="#0C447C" strokeWidth="1" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={styles.logoText}>Ortho<span style={{color:'#C9A84C'}}>Desk</span></span>
        </div>

        <div style={styles.navTabs}>
          {['agenda','patients','bilans','facturation','profil','stats'].map(page => (
            <button key={page} style={{...styles.navTab, ...(activePage===page ? styles.navTabActive : {})}}
              onClick={() => setActivePage(page)}>
              {page.charAt(0).toUpperCase() + page.slice(1)}
            </button>
          ))}
        </div>

        <div style={styles.navRight}>
          <span style={styles.userEmail}>{session.user.email}</span>
         
          <span style={{ fontSize:11, color:'#B0BBCC', cursor:'pointer', textDecoration:'underline' }}
            onClick={() => setShowRGPD(true)}>
            Confidentialité & RGPD            
          </span>          
          {showRGPD && <RGPDModal onClose={() => setShowRGPD(false)} />}
          <button style={styles.logoutBtn} onClick={handleLogout}>Déconnexion</button>
        </div>
      </nav>

      {/* CONTENU */}
      <div style={styles.body}>
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

const styles = {
  app: { height:'100vh', display:'flex', flexDirection:'column', background:'#F0F4F9' },
  nav: { background:'#0C447C', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 24px', height:'58px', flexShrink:0 },
  logo: { display:'flex', alignItems:'center', gap:'10px' },
  logoMark: { width:'34px', height:'34px', background:'#C9A84C', borderRadius:'9px', display:'flex', alignItems:'center', justifyContent:'center' },
  logoText: { fontFamily:'Georgia, serif', fontSize:'18px', color:'#fff' },
  navTabs: { display:'flex', gap:'2px' },
  navTab: { padding:'6px 14px', borderRadius:'7px', fontSize:'13px', fontWeight:'500', color:'rgba(255,255,255,0.6)', cursor:'pointer', border:'none', background:'none', fontFamily:'DM Sans, sans-serif', transition:'all .15s' },
  navTabActive: { color:'#0C447C', background:'#C9A84C' },
  navRight: { display:'flex', alignItems:'center', gap:'12px' },
  userEmail: { fontSize:'12px', color:'rgba(255,255,255,0.6)' },
  logoutBtn: { padding:'5px 12px', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:'7px', color:'#fff', fontSize:'12px', cursor:'pointer', fontFamily:'DM Sans, sans-serif' },
  body: { flex:1, overflow:'hidden', display:'flex' },
}