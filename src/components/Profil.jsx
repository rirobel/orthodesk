import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

const EMPTY_PROFIL = {
  prenom:       '',
  nom:          '',
  nom_cabinet:  '',
  telephone:    '',
  adresse:      '',
  ville:        '',
  code_postal:  '',
  pays:         'Maroc',
  site_web:     '',
  bio:          '',
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 700)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 700)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

export default function Profil({ session }) {
  const [profil, setProfil]   = useState(EMPTY_PROFIL)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState('')
  const isMobile = useIsMobile()

  useEffect(() => { fetchProfil() }, [])

  async function fetchProfil() {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (data) {
      setProfil({
        prenom:      data.prenom      || '',
        nom:         data.nom         || '',
        nom_cabinet: data.nom_cabinet || '',
        telephone:   data.telephone   || '',
        adresse:     data.adresse     || '',
        ville:       data.ville       || '',
        code_postal: data.code_postal || '',
        pays:        data.pays        || 'Maroc',
        site_web:    data.site_web    || '',
        bio:         data.bio         || '',
      })
    }
    setLoading(false)
  }

  async function saveProfil() {
    setError('')
    if (!profil.prenom || !profil.nom) {
      setError('Le prénom et le nom sont obligatoires.')
      return
    }
    setSaving(true)
    const { error: err } = await supabase
      .from('profiles')
      .update({ ...profil, updated_at: new Date().toISOString() })
      .eq('id', session.user.id)

    setSaving(false)
    if (err) {
      setError('Erreur lors de la sauvegarde. Vérifiez votre connexion.')
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  function set(key, val) {
    setProfil(p => ({ ...p, [key]: val }))
    setSaved(false)
  }

  // Initiales pour l'avatar
  const initiales = ((profil.prenom?.[0] || '') + (profil.nom?.[0] || '')).toUpperCase() || '?'

  if (loading) {
    return (
      <div style={S.centerWrap}>
        <div style={S.loadingMsg}>Chargement du profil…</div>
      </div>
    )
  }

  return (
    <div style={S.wrap}>
      <div style={{ ...S.inner, maxWidth: isMobile ? '100%' : 680, padding: isMobile ? '16px 12px' : '28px 24px' }}>

        {/* ── En-tête profil ───────────────────────────────────────────── */}
        <div style={S.header}>
          <div style={S.avatar}>{initiales}</div>
          <div>
            <div style={S.headerName}>
              {profil.prenom || profil.nom
                ? `${profil.prenom} ${profil.nom}`.trim()
                : 'Mon profil'}
            </div>
            <div style={S.headerEmail}>{session.user.email}</div>
            {profil.nom_cabinet && (
              <div style={S.headerCabinet}>🏥 {profil.nom_cabinet}</div>
            )}
          </div>
        </div>

        {/* ── Message d'erreur / succès ────────────────────────────────── */}
        {error && (
          <div style={S.alertError}>{error}</div>
        )}
        {saved && (
          <div style={S.alertSuccess}>✓ Profil sauvegardé avec succès</div>
        )}

        {/* ── Section : Identité ───────────────────────────────────────── */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Identité</div>
          <div style={{ ...S.grid2, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
            <div style={S.fg}>
              <label style={S.fl}>Prénom *</label>
              <input style={S.fi} value={profil.prenom}
                onChange={e => set('prenom', e.target.value)}
                placeholder="Ex : Rokia" />
            </div>
            <div style={S.fg}>
              <label style={S.fl}>Nom *</label>
              <input style={S.fi} value={profil.nom}
                onChange={e => set('nom', e.target.value)}
                placeholder="Ex : Ben Ali" />
            </div>
          </div>
          <div style={S.fg}>
            <label style={S.fl}>Email (non modifiable)</label>
            <input style={{ ...S.fi, background: '#F0F4F9', color: '#8A9BB0', cursor: 'not-allowed' }}
              value={session.user.email} readOnly />
          </div>
        </div>

        {/* ── Section : Cabinet ────────────────────────────────────────── */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Cabinet</div>
          <div style={S.fg}>
            <label style={S.fl}>Nom du cabinet</label>
            <input style={S.fi} value={profil.nom_cabinet}
              onChange={e => set('nom_cabinet', e.target.value)}
              placeholder="Ex : Cabinet d'orthophonie Lumière" />
          </div>
          <div style={S.fg}>
            <label style={S.fl}>Téléphone</label>
            <input style={S.fi} type="tel" value={profil.telephone}
              onChange={e => set('telephone', e.target.value)}
              placeholder="Ex : +212 6 00 00 00 00" />
          </div>
          <div style={S.fg}>
            <label style={S.fl}>Site web</label>
            <input style={S.fi} type="url" value={profil.site_web}
              onChange={e => set('site_web', e.target.value)}
              placeholder="Ex : https://monsite.ma" />
          </div>
        </div>

        {/* ── Section : Adresse ────────────────────────────────────────── */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Adresse</div>
          <div style={S.fg}>
            <label style={S.fl}>Adresse (rue, numéro…)</label>
            <input style={S.fi} value={profil.adresse}
              onChange={e => set('adresse', e.target.value)}
              placeholder="Ex : 12 rue Ibn Battuta, Appt 3" />
          </div>
          <div style={{ ...S.grid2, gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr' }}>
            <div style={S.fg}>
              <label style={S.fl}>Ville</label>
              <input style={S.fi} value={profil.ville}
                onChange={e => set('ville', e.target.value)}
                placeholder="Ex : Casablanca" />
            </div>
            <div style={S.fg}>
              <label style={S.fl}>Code postal</label>
              <input style={S.fi} value={profil.code_postal}
                onChange={e => set('code_postal', e.target.value)}
                placeholder="Ex : 20000" />
            </div>
          </div>
          <div style={S.fg}>
            <label style={S.fl}>Pays</label>
            <select style={S.fi} value={profil.pays} onChange={e => set('pays', e.target.value)}>
              {['Maroc', 'France', 'Algérie', 'Tunisie', 'Belgique', 'Suisse', 'Autre'].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Section : Bio ────────────────────────────────────────────── */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Présentation</div>
          <div style={S.fg}>
            <label style={S.fl}>Bio / présentation courte</label>
            <textarea style={{ ...S.fi, minHeight: 80, resize: 'vertical', lineHeight: 1.6 }}
              value={profil.bio}
              onChange={e => set('bio', e.target.value)}
              placeholder="Quelques mots sur votre pratique, vos spécialités…" />
          </div>
        </div>

        {/* ── Bouton sauvegarder ───────────────────────────────────────── */}
        <div style={S.footer}>
          <button style={{ ...S.saveBtn, opacity: saving ? 0.7 : 1 }}
            onClick={saveProfil} disabled={saving}>
            {saving ? 'Enregistrement…' : '💾 Enregistrer le profil'}
          </button>
        </div>

      </div>
    </div>
  )
}

const S = {
  wrap:           { flex: 1, overflowY: 'auto', background: '#F0F4F9', display: 'flex', justifyContent: 'center' },
  inner:          { width: '100%', display: 'flex', flexDirection: 'column', gap: 20 },
  centerWrap:     { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  loadingMsg:     { fontSize: 14, color: '#8A9BB0' },

  // En-tête
  header:         { background: '#fff', borderRadius: 14, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 18, boxShadow: '0 2px 12px rgba(12,68,124,0.08)' },
  avatar:         { width: 58, height: 58, borderRadius: '50%', background: '#0C447C', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, fontFamily: 'Georgia, serif', flexShrink: 0 },
  headerName:     { fontFamily: 'Georgia, serif', fontSize: 20, color: '#0C447C', fontWeight: 700 },
  headerEmail:    { fontSize: 12, color: '#8A9BB0', marginTop: 3 },
  headerCabinet:  { fontSize: 12, color: '#4A6080', marginTop: 4, fontWeight: 600 },

  // Alertes
  alertError:     { background: '#FCEBEB', color: '#C0392B', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600 },
  alertSuccess:   { background: '#E8F5EE', color: '#1D7A5A', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600 },

  // Sections
  section:        { background: '#fff', borderRadius: 14, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 2px 12px rgba(12,68,124,0.08)' },
  sectionTitle:   { fontSize: 11, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#8A9BB0', marginBottom: 2 },

  // Formulaire
  grid2:          { display: 'grid', gap: 12 },
  fg:             { display: 'flex', flexDirection: 'column', gap: 5 },
  fl:             { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#4A6080' },
  fi:             { padding: '9px 12px', border: '1.5px solid #DDE5EF', borderRadius: 8, fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box', color: '#1A2744' },

  // Footer
  footer:         { display: 'flex', justifyContent: 'flex-end', paddingBottom: 24 },
  saveBtn:        { padding: '10px 24px', background: '#0C447C', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' },
}