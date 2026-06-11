import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
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

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword]         = useState('')
  const [confirm, setConfirm]           = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm]   = useState(false)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [done, setDone]                 = useState(false)
  const [validSession, setValidSession] = useState(false)

  useEffect(() => {
    // Supabase injecte la session automatiquement depuis le lien email
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setValidSession(true)
      }
    })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setError('Erreur : ' + error.message)
    } else {
      setDone(true)
      setTimeout(() => navigate('/'), 3000)
    }
  }

  return (
    <div className="page">
      <div className="card">

        <div className="logoRow">
          <div className="logoMark">
            <img src="/favicon.svg" alt="Logo OrthoDesk" width="22" height="22" />
          </div>
          <span className="logoText">
            <span style={{ color:'#0C447C' }}>Ortho</span>
            <span style={{ color:'#C9A84C' }}>Desk</span>
          </span>
        </div>

        {done ? (
          <div style={{ textAlign:'center', padding:'24px 0', display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
            <div style={{ width:60, height:60, borderRadius:'50%', background:'#E8F5EE', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>
              ✅
            </div>
            <div style={{ fontFamily:'Georgia, serif', fontSize:18, color:'#0C447C' }}>
              Mot de passe mis à jour !
            </div>
            <div style={{ fontSize:13, color:'#4A6080', lineHeight:1.7 }}>
              Vous allez être redirigée vers votre cabinet dans quelques secondes…
            </div>
          </div>
        ) : (
          <>
            <h2 className="title">Nouveau mot de passe</h2>
            <p className="subtitle">Choisissez un mot de passe sécurisé (8 caractères minimum).</p>

            <form onSubmit={handleSubmit} className="form">
              <div className="fg">
                <label className="label">Nouveau mot de passe</label>
                <div className="inputWithIcon">
                  <input className="input" type={showPassword ? 'text' : 'password'}
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required autoFocus />
                  <button type="button" className="eyeBtn" onClick={() => setShowPassword(!showPassword)}>
                    <EyeIcon show={showPassword} size={18} />
                  </button>
                </div>
              </div>

              <div className="fg">
                <label className="label">Confirmer le mot de passe</label>
                <div className="inputWithIcon">
                  <input className="input" type={showConfirm ? 'text' : 'password'}
                    value={confirm} onChange={e => setConfirm(e.target.value)}
                    placeholder="••••••••" required />
                  <button type="button" className="eyeBtn" onClick={() => setShowConfirm(!showConfirm)}>
                    <EyeIcon show={showConfirm} size={18} />
                  </button>
                </div>
              </div>

              {/* Indicateur force mot de passe */}
              {password.length > 0 && (
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  {[
                    { ok: password.length >= 8,           label:'8 car.' },
                    { ok: /[A-Z]/.test(password),         label:'Majuscule' },
                    { ok: /[0-9]/.test(password),         label:'Chiffre' },
                    { ok: /[^A-Za-z0-9]/.test(password),  label:'Symbole' },
                  ].map(({ ok, label }) => (
                    <span key={label} style={{ fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:20,
                      background: ok ? '#E8F5EE' : '#F0F4F9',
                      color: ok ? '#1D7A5A' : '#8A9BB0' }}>
                      {ok ? '✓' : '·'} {label}
                    </span>
                  ))}
                </div>
              )}

              {error && <div className="error">{error}</div>}

              <button className="btn" type="submit" disabled={loading}>
                {loading ? 'Mise à jour…' : 'Enregistrer le nouveau mot de passe'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}