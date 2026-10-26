import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import './AdminInvite.css'

export default function AdminInvite({ session }) {
  const navigate = useNavigate()
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]         = useState('')
  const [error, setError]     = useState('')
  const [users, setUsers]     = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)

  // Charger la liste des profils inscrits
  useEffect(() => {
    async function fetchUsers() {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, created_at')
        .order('created_at', { ascending: false })
      if (!error && data) setUsers(data)
      setLoadingUsers(false)
    }
    fetchUsers()
  }, [msg]) // Recharger après invitation

  async function handleInvite(e) {
    e.preventDefault()
    setLoading(true)
    setMsg('')
    setError('')

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email: email.trim(),
          }),
        }
      )
      const data = await res.json()

      if (!res.ok) {
        const errorMessage = data?.error || data?.msg || data?.error_description || ''
        if (/already|registered|exists|inscrit|invité/i.test(errorMessage)) {
          setError('Cet email existe déjà dans Supabase Auth, même si son profil a été supprimé. Vérifie Authentication → Users.')
        } else {
          setError(errorMessage || 'Erreur lors de l\'invitation.')
        }
      } else {
        setMsg(`✅ Invitation envoyée à ${email}`)
        setEmail('')
      }
    } catch (err) {
      setError('Erreur réseau. Réessaie.')
    }
    setLoading(false)
  }

  return (
    <div className="adminPage">

      {/* Header */}
      <div className="adminHeader">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
            <ellipse cx="10" cy="10" rx="7" ry="6" stroke="#0C447C" strokeWidth="1.5"/>
            <path d="M10 4Q13 6 13 10Q13 14 10 16" stroke="#0C447C" strokeWidth="1.2" strokeLinecap="round"/>
            <path d="M7 5Q5 8 6 11Q7 14 9 15" stroke="#0C447C" strokeWidth="1" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: '1.15rem', fontWeight: 700 }}>
            <span style={{ color: '#0C447C' }}>Ortho</span>
            <span style={{ color: '#C9A84C' }}>Desk</span>
            <span style={{ color: '#888', fontWeight: 400, fontSize: '0.85rem', marginLeft: 8 }}>Admin</span>
          </span>
        </div>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none', border: '1px solid #ddd', borderRadius: 8,
            padding: '6px 14px', cursor: 'pointer', fontSize: '0.85rem', color: '#555',
          }}
        >
          ← Tableau de bord
        </button>
      </div>

      {/* Carte invitation */}
      <div className="adminCard">
        <h2 style={{ margin: '0 0 0.4rem', color: '#0C447C', fontSize: '1.25rem' }}>
          Inviter une orthophoniste
        </h2>
        <p style={{ margin: '0 0 1.5rem', color: '#888', fontSize: '0.9rem' }}>
          Elle recevra un email avec un lien pour définir son mot de passe.
        </p>

        <form onSubmit={handleInvite} className="adminInviteForm">
          <input
            className="adminInviteEmail"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="email@orthophoniste.com"
            required
          />
          <button
            className="adminInviteSubmit"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Envoi...' : 'Envoyer l\'invitation'}
          </button>
        </form>

        {msg   && <div style={{ marginTop: '1rem', color: '#2e7d32', background: '#f0fdf4', borderRadius: 8, padding: '10px 14px', fontSize: '0.9rem' }}>{msg}</div>}
        {error && <div style={{ marginTop: '1rem', color: '#c62828', background: '#fff5f5', borderRadius: 8, padding: '10px 14px', fontSize: '0.9rem' }}>{error}</div>}
      </div>

      {/* Liste utilisateurs inscrits */}
      <div className="adminCard adminUsersCard">
        <h3 style={{ margin: '0 0 1.2rem', color: '#0C447C', fontSize: '1.05rem' }}>
          Orthophonistes inscrites ({users.length})
        </h3>

        {loadingUsers ? (
          <p style={{ color: '#aaa', fontSize: '0.9rem' }}>Chargement...</p>
        ) : users.length === 0 ? (
          <p style={{ color: '#aaa', fontSize: '0.9rem' }}>Aucune orthophoniste inscrite pour l'instant.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {users.map(u => (
              <div key={u.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: 10,
                background: '#f8fafd',
                border: '1px solid #eef1f7',
              }}>
                <span style={{ fontSize: '0.9rem', color: '#333' }}>
                  {u.email || '—'}
                </span>
                <span style={{ fontSize: '0.78rem', color: '#aaa' }}>
                  {u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}