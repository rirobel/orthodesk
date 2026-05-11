import { useState } from 'react'
import { supabase } from '../supabase'
import { RGPDModal } from '../components/RGPD'
import './Login.css'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [msg, setMsg]           = useState('')
  const [rgpdOk, setRgpdOk]     = useState(false)
  const [showRGPD, setShowRGPD] = useState(false)

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
    <div className="page">
      <div className="card">

        {/* Logo */}
        <div className="logoRow">
          <div className="logoMark">
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
              <ellipse cx="10" cy="10" rx="7" ry="6" stroke="#0C447C" strokeWidth="1.5"/>
              <path d="M10 4Q13 6 13 10Q13 14 10 16" stroke="#0C447C" strokeWidth="1.2" strokeLinecap="round"/>
              <path d="M7 5Q5 8 6 11Q7 14 9 15" stroke="#0C447C" strokeWidth="1" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="logoText">Ortho<span style={{ color: '#C9A84C' }}>Desk</span></span>
        </div>

        <h2 className="title">{isSignup ? 'Créer un compte' : 'Connexion'}</h2>
        <p className="subtitle">
          {isSignup
            ? "Rejoignez OrthoDesk en tant qu'orthophoniste"
            : 'Bienvenue sur votre espace cabinet'}
        </p>

        <form onSubmit={handleSubmit} className="form">
          <div className="fg">
            <label className="label">Email professionnel</label>
            <input className="input" type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="votre@email.com" required />
          </div>

          <div className="fg">
            <label className="label">Mot de passe</label>
            <input className="input" type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required />
          </div>

          {/* Case RGPD — uniquement à l'inscription */}
          {isSignup && (
            <div className="rgpdRow">
              <input
                id="rgpd"
                type="checkbox"
                checked={rgpdOk}
                onChange={e => setRgpdOk(e.target.checked)}
                style={{ marginTop: 2, cursor: 'pointer', flexShrink: 0 }}
              />
              <label htmlFor="rgpd" className="rgpdLabel">
                J'accepte la{' '}
                <span className="rgpdLink" onClick={e => { e.preventDefault(); setShowRGPD(true) }}>
                  politique de confidentialité
                </span>
                {' '}et le traitement de mes données conformément au RGPD.
              </label>
            </div>
          )}

          {error && <div className="error">{error}</div>}
          {msg   && <div className="success">{msg}</div>}

          <button
            className="btn"
            style={{
              opacity: isSignup && !rgpdOk ? 0.5 : 1,
              cursor:  isSignup && !rgpdOk ? 'not-allowed' : 'pointer',
            }}
            type="submit"
            disabled={loading || (isSignup && !rgpdOk)}
          >
            {loading ? 'Chargement...' : isSignup ? 'Créer mon compte' : 'Se connecter'}
          </button>
        </form>

        <p className="toggle">
          {isSignup ? 'Déjà un compte ? ' : 'Pas encore de compte ? '}
          <span className="link"
            onClick={() => { setIsSignup(!isSignup); setError(''); setMsg(''); setRgpdOk(false) }}>
            {isSignup ? 'Se connecter' : "S'inscrire gratuitement"}
          </span>
        </p>

        {/* Lien RGPD discret en bas */}
        <div className="rgpdFooter">
          <span className="rgpdFooterLink" onClick={() => setShowRGPD(true)}>
            🔒 Confidentialité & RGPD
          </span>
        </div>

      </div>

      {/* Modal RGPD */}
      {showRGPD && <RGPDModal onClose={() => setShowRGPD(false)} />}
    </div>
  )
}