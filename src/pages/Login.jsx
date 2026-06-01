import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { RGPDModal } from '../components/RGPD'
import './Login.css'

function EyeIcon({ show, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#0C447C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {show ? (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </>
      ) : (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        </>
      )}
    </svg>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [showRGPD, setShowRGPD] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Email ou mot de passe incorrect.')
    setLoading(false)
  }

  return (
    <div className="page">
      <div className="card">

        <button type="button" className="backBtnPrimary" onClick={() => navigate('/')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
          Retour
        </button>

        <div className="logoRow">
          <div className="logoMark">
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
              <ellipse cx="10" cy="10" rx="7" ry="6" stroke="#0C447C" strokeWidth="1.5"/>
              <path d="M10 4Q13 6 13 10Q13 14 10 16" stroke="#0C447C" strokeWidth="1.2" strokeLinecap="round"/>
              <path d="M7 5Q5 8 6 11Q7 14 9 15" stroke="#0C447C" strokeWidth="1" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="logoText">
            <span style={{ color: '#0C447C' }}>Ortho</span>
            <span style={{ color: '#C9A84C' }}>Desk</span>
          </span>
        </div>

        <h2 className="title">Connexion</h2>
        <p className="subtitle">Bienvenue sur votre espace cabinet</p>

        <form onSubmit={handleSubmit} className="form">
          <div className="fg">
            <label className="label">Email professionnel</label>
            <input className="input" type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="votre@email.com" required />
          </div>

          <div className="fg">
            <label className="label">Mot de passe</label>
            <div className="inputWithIcon">
              <input className="input" type={showPassword ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required />
              <button type="button" className="eyeBtn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Masquer' : 'Afficher'}>
                <EyeIcon show={showPassword} size={18} />
              </button>
            </div>
          </div>

          {error && <div className="error">{error}</div>}

          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        {/* Message discret — accès sur invitation */}
        <p style={{ textAlign: 'center', marginTop: '1.2rem', fontSize: '0.82rem', color: '#888' }}>
          L'accès à OrthoDesk se fait sur invitation.<br/>
          <a href="/#contact" style={{ color: '#0C447C', textDecoration: 'underline' }}>
            Contactez-nous pour rejoindre la beta.
          </a>
        </p>

        <div className="rgpdFooter">
          <span className="rgpdFooterLink" onClick={() => setShowRGPD(true)}>
            🔒 Confidentialité & RGPD
          </span>
        </div>

      </div>

      {showRGPD && <RGPDModal onClose={() => setShowRGPD(false)} />}
    </div>
  )
}