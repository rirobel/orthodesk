import { useState } from 'react'
import { supabase } from '../supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMsg('')
    if (isSignup) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setMsg('Compte créé ! Vérifie ton email pour confirmer.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError('Email ou mot de passe incorrect.')
    }
    setLoading(false)
  }

  return ( 
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoRow}>
          <div style={styles.logoMark}>
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
              <ellipse cx="10" cy="10" rx="7" ry="6" stroke="#0C447C" strokeWidth="1.5"/>
              <path d="M10 4Q13 6 13 10Q13 14 10 16" stroke="#0C447C" strokeWidth="1.2" strokeLinecap="round"/>
              <path d="M7 5Q5 8 6 11Q7 14 9 15" stroke="#0C447C" strokeWidth="1" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={styles.logoText}>Ortho<span style={{color:'#C9A84C'}}>Desk</span></span>
        </div>
        <h2 style={styles.title}>{isSignup ? 'Créer un compte' : 'Connexion'}</h2>
        <p style={styles.subtitle}>
          {isSignup ? 'Rejoignez OrthoDesk en tant qu\'orthophoniste' : 'Bienvenue sur votre espace cabinet'}
        </p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.fg}>
            <label style={styles.label}>Email professionnel</label>
            <input style={styles.input} type="email" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="votre@email.com" required />
          </div>
          <div style={styles.fg}>
            <label style={styles.label}>Mot de passe</label>
            <input style={styles.input} type="password" value={password}
              onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          {error && <div style={styles.error}>{error}</div>}
          {msg && <div style={styles.success}>{msg}</div>}
          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? 'Chargement...' : isSignup ? 'Créer mon compte' : 'Se connecter'}
          </button>
        </form>
        <p style={styles.toggle}>
          {isSignup ? 'Déjà un compte ? ' : 'Pas encore de compte ? '}
          <span style={styles.link} onClick={() => { setIsSignup(!isSignup); setError(''); setMsg(''); }}>
            {isSignup ? 'Se connecter' : 'S\'inscrire gratuitement'}
          </span>
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight:'100vh', background:'#F0F4F9', display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' },
  card: { background:'#fff', borderRadius:'16px', padding:'40px 36px', width:'100%', maxWidth:'420px', boxShadow:'0 8px 32px rgba(12,68,124,0.12)' },
  logoRow: { display:'flex', alignItems:'center', gap:'10px', marginBottom:'28px', justifyContent:'center' },
  logoMark: { width:'38px', height:'38px', background:'#C9A84C', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center' },
  logoText: { fontFamily:'Georgia, serif', fontSize:'22px', color:'#0C447C', fontWeight:'400' },
  title: { fontFamily:'Georgia, serif', fontSize:'22px', color:'#0C447C', marginBottom:'6px', textAlign:'center' },
  subtitle: { fontSize:'13px', color:'#8A9BB0', marginBottom:'24px', textAlign:'center' },
  form: { display:'flex', flexDirection:'column', gap:'14px' },
  fg: { display:'flex', flexDirection:'column', gap:'5px' },
  label: { fontSize:'11px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', color:'#4A6080' },
  input: { padding:'10px 14px', border:'1.5px solid #DDE5EF', borderRadius:'8px', fontSize:'14px', fontFamily:'DM Sans, sans-serif', outline:'none' },
  btn: { padding:'12px', background:'#0C447C', color:'#fff', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:'700', cursor:'pointer', marginTop:'4px' },
  error: { background:'#FCEBEB', color:'#C0392B', padding:'10px 14px', borderRadius:'8px', fontSize:'13px' },
  success: { background:'#E8F5EE', color:'#1D7A5A', padding:'10px 14px', borderRadius:'8px', fontSize:'13px' },
  toggle: { textAlign:'center', marginTop:'20px', fontSize:'13px', color:'#8A9BB0' },
  link: { color:'#0C447C', fontWeight:'600', cursor:'pointer' },
}