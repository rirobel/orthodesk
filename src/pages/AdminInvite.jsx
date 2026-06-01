import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

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

    // Utilise l'API Supabase Admin via fetch
    // Nécessite que tu ajoutes une Edge Function OU qu'on utilise
    // la méthode signUp avec email_confirm: true via service_role
    // Solution simple : on utilise supabase.auth.admin via une edge function
    // Pour l'instant : invite via l'API REST Supabase Admin
    try {
     const res = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ email }),
  }
)
      const data = await res.json()

      if (!res.ok) {
        // Erreur connue : utilisateur déjà invité
        if (data?.msg?.includes('already') || data?.error_description?.includes('already')) {
          setError('Cet email a déjà été invité ou est déjà inscrit.')
        } else {
          setError(data?.msg || data?.error_description || 'Erreur lors de l\'invitation.')
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
    <div style={{
      minHeight: '100vh',
      background: '#f4f7fb',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '2rem 1rem',
      fontFamily: 'DM Sans, sans-serif',
    }}>

      {/* Header */}
      <div style={{
        width: '100%',
        maxWidth: 560,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '2rem',
      }}>
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
      <div style={{
        width: '100%',
        maxWidth: 560,
        background: '#fff',
        borderRadius: 16,
        padding: '2rem',
        boxShadow: '0 2px 16px rgba(12,68,124,0.08)',
        marginBottom: '1.5rem',
      }}>
        <h2 style={{ margin: '0 0 0.4rem', color: '#0C447C', fontSize: '1.25rem' }}>
          Inviter une orthophoniste
        </h2>
        <p style={{ margin: '0 0 1.5rem', color: '#888', fontSize: '0.9rem' }}>
          Elle recevra un email avec un lien pour définir son mot de passe.
        </p>

        <form onSubmit={handleInvite} style={{ display: 'flex', gap: 10 }}>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="email@orthophoniste.com"
            required
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 10,
              border: '1.5px solid #dce3ef',
              fontSize: '0.95rem',
              outline: 'none',
              fontFamily: 'DM Sans, sans-serif',
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              background: '#0C447C',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '10px 20px',
              fontWeight: 600,
              fontSize: '0.92rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              whiteSpace: 'nowrap',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            {loading ? 'Envoi...' : 'Envoyer l\'invitation'}
          </button>
        </form>

        {msg   && <div style={{ marginTop: '1rem', color: '#2e7d32', background: '#f0fdf4', borderRadius: 8, padding: '10px 14px', fontSize: '0.9rem' }}>{msg}</div>}
        {error && <div style={{ marginTop: '1rem', color: '#c62828', background: '#fff5f5', borderRadius: 8, padding: '10px 14px', fontSize: '0.9rem' }}>{error}</div>}
      </div>

      {/* Liste utilisateurs inscrits */}
      <div style={{
        width: '100%',
        maxWidth: 560,
        background: '#fff',
        borderRadius: 16,
        padding: '2rem',
        boxShadow: '0 2px 16px rgba(12,68,124,0.08)',
      }}>
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