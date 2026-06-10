import { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabase'

const EMPTY_PROFIL = {
  prenom:            '',
  nom:               '',
  nom_cabinet:       '',
  telephone:         '',
  adresse:           '',
  ville:             '',
  code_postal:       '',
  pays:              'Maroc',
  site_web:          '',
  bio:               '',
  couleur_principale: '#0C447C',
  logo_url:          '',
}

const COULEURS_PRESET = [
  { label: 'Bleu OrthoDesk', value: '#0C447C' },
  { label: 'Orange',         value: '#E89020' },
  { label: 'Vert',           value: '#1D9E75' },
  { label: 'Violet',         value: '#7B5EA7' },
  { label: 'Rouge',          value: '#C0392B' },
  { label: 'Bleu ciel',      value: '#185FA5' },
  { label: 'Ardoise',        value: '#4A6080' },
  { label: 'Noir',           value: '#1A2744' },
]

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
  const [profil, setProfil]       = useState(EMPTY_PROFIL)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [error, setError]         = useState('')
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoPreview, setLogoPreview]     = useState(null)
  const [customColor, setCustomColor]     = useState(false)
  const fileInputRef = useRef(null)
  const isMobile = useIsMobile()

  useEffect(() => { fetchProfil() }, [])

  async function fetchProfil() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles').select('*').eq('id', session.user.id).single()
    if (data) {
      const p = {
        prenom:             data.prenom             || '',
        nom:                data.nom                || '',
        nom_cabinet:        data.nom_cabinet        || '',
        telephone:          data.telephone          || '',
        adresse:            data.adresse            || '',
        ville:              data.ville              || '',
        code_postal:        data.code_postal        || '',
        pays:               data.pays               || 'Maroc',
        site_web:           data.site_web           || '',
        bio:                data.bio                || '',
        couleur_principale: data.couleur_principale || '#0C447C',
        logo_url:           data.logo_url           || '',
      }
      setProfil(p)
      setLogoPreview(p.logo_url || null)
      // Si la couleur n'est pas dans les presets → mode custom
      const isPreset = COULEURS_PRESET.some(c => c.value === p.couleur_principale)
      if (!isPreset) setCustomColor(true)
    }
    setLoading(false)
  }

  async function uploadLogo(file) {
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo trop lourd (max 2 Mo).')
      return
    }
    if (!['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'].includes(file.type)) {
      setError('Format accepté : PNG, JPG, SVG ou WebP.')
      return
    }
    setLogoUploading(true)
    setError('')

    const ext  = file.name.split('.').pop()
    const path = `${session.user.id}/logo.${ext}`

    const { error: upErr } = await supabase.storage
      .from('logos')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (upErr) {
      setError('Erreur upload : ' + upErr.message)
      setLogoUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path)
    const publicUrl = urlData.publicUrl + '?t=' + Date.now() // cache-bust

    setProfil(p => ({ ...p, logo_url: publicUrl }))
    setLogoPreview(publicUrl)
    setLogoUploading(false)
  }

  async function removeLogo() {
    setProfil(p => ({ ...p, logo_url: '' }))
    setLogoPreview(null)
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

  const initiales = ((profil.prenom?.[0]||'')+(profil.nom?.[0]||'')).toUpperCase() || '?'
  const couleur   = profil.couleur_principale || '#0C447C'

  if (loading) return (
    <div style={S.centerWrap}>
      <div style={S.loadingMsg}>Chargement du profil…</div>
    </div>
  )

  return (
    <div style={S.wrap}>
      <div style={{ ...S.inner, maxWidth:isMobile?'100%':680, padding:isMobile?'16px 12px':'28px 24px' }}>

        {/* ── En-tête ─────────────────────────────────────────────────── */}
        <div style={S.header}>
          {logoPreview ? (
            <img src={logoPreview} alt="Logo cabinet"
              style={{ width:58, height:58, borderRadius:10, objectFit:'contain', border:'1.5px solid #DDE5EF', background:'#F8FAFD', flexShrink:0 }} />
          ) : (
            <div style={{ ...S.avatar, background: couleur }}>{initiales}</div>
          )}
          <div>
            <div style={{ ...S.headerName, color: couleur }}>
              {profil.prenom||profil.nom ? `${profil.prenom} ${profil.nom}`.trim() : 'Mon profil'}
            </div>
            <div style={S.headerEmail}>{session.user.email}</div>
            {profil.nom_cabinet && <div style={S.headerCabinet}>🏥 {profil.nom_cabinet}</div>}
          </div>
        </div>

        {/* Alertes */}
        {error  && <div style={S.alertError}>{error}</div>}
        {saved  && <div style={S.alertSuccess}>✓ Profil sauvegardé avec succès</div>}

        {/* ── Identité ────────────────────────────────────────────────── */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Identité</div>
          <div style={{ ...S.grid2, gridTemplateColumns:isMobile?'1fr':'1fr 1fr' }}>
            <div style={S.fg}><label style={S.fl}>Prénom *</label>
              <input style={S.fi} value={profil.prenom} onChange={e=>set('prenom',e.target.value)} placeholder="Ex : Rokia"/></div>
            <div style={S.fg}><label style={S.fl}>Nom *</label>
              <input style={S.fi} value={profil.nom} onChange={e=>set('nom',e.target.value)} placeholder="Ex : Ben Ali"/></div>
          </div>
          <div style={S.fg}><label style={S.fl}>Email (non modifiable)</label>
            <input style={{...S.fi,background:'#F0F4F9',color:'#8A9BB0',cursor:'not-allowed'}} value={session.user.email} readOnly/></div>
        </div>

        {/* ── Cabinet ─────────────────────────────────────────────────── */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Cabinet</div>
          <div style={S.fg}><label style={S.fl}>Nom du cabinet</label>
            <input style={S.fi} value={profil.nom_cabinet} onChange={e=>set('nom_cabinet',e.target.value)} placeholder="Cabinet d'orthophonie…"/></div>
          <div style={S.fg}><label style={S.fl}>Téléphone</label>
            <input style={S.fi} type="tel" value={profil.telephone} onChange={e=>set('telephone',e.target.value)} placeholder="+212 6 00 00 00 00"/></div>
          <div style={S.fg}><label style={S.fl}>Site web</label>
            <input style={S.fi} type="url" value={profil.site_web} onChange={e=>set('site_web',e.target.value)} placeholder="https://monsite.ma"/></div>
        </div>

        {/* ── Adresse ─────────────────────────────────────────────────── */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Adresse</div>
          <div style={S.fg}><label style={S.fl}>Adresse</label>
            <input style={S.fi} value={profil.adresse} onChange={e=>set('adresse',e.target.value)} placeholder="Rue, numéro…"/></div>
          <div style={{...S.grid2,gridTemplateColumns:isMobile?'1fr':'2fr 1fr'}}>
            <div style={S.fg}><label style={S.fl}>Ville</label>
              <input style={S.fi} value={profil.ville} onChange={e=>set('ville',e.target.value)} placeholder="Casablanca"/></div>
            <div style={S.fg}><label style={S.fl}>Code postal</label>
              <input style={S.fi} value={profil.code_postal} onChange={e=>set('code_postal',e.target.value)} placeholder="20000"/></div>
          </div>
          <div style={S.fg}><label style={S.fl}>Pays</label>
            <select style={S.fi} value={profil.pays} onChange={e=>set('pays',e.target.value)}>
              {['Maroc','France','Algérie','Tunisie','Belgique','Suisse','Autre'].map(p=>(
                <option key={p} value={p}>{p}</option>
              ))}
            </select></div>
        </div>

        {/* ── Logo ────────────────────────────────────────────────────── */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Logo du cabinet</div>
          <div style={{fontSize:12,color:'#8A9BB0',marginBottom:4}}>
            Apparaîtra sur vos factures et exports PDF. Format PNG, JPG ou SVG recommandé. Max 2 Mo.
          </div>

          {logoPreview ? (
            <div style={S.logoPreviewWrap}>
              <img src={logoPreview} alt="Logo" style={S.logoPreviewImg}/>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <div style={{fontSize:12,color:'#1D7A5A',fontWeight:600}}>✓ Logo chargé</div>
                <button style={S.logoChangeBtn} onClick={()=>fileInputRef.current?.click()} disabled={logoUploading}>
                  {logoUploading ? '⏳ Upload…' : '🔄 Changer le logo'}
                </button>
                <button style={S.logoRemoveBtn} onClick={removeLogo}>🗑 Supprimer</button>
              </div>
            </div>
          ) : (
            <div style={S.logoDropZone} onClick={()=>fileInputRef.current?.click()}>
              {logoUploading ? (
                <div style={{color:'#8A9BB0',fontSize:13}}>⏳ Upload en cours…</div>
              ) : (
                <>
                  <div style={{fontSize:36,marginBottom:8}}>🖼️</div>
                  <div style={{fontSize:13,fontWeight:600,color:'#0C447C'}}>Cliquer pour ajouter un logo</div>
                  <div style={{fontSize:11,color:'#8A9BB0',marginTop:4}}>PNG · JPG · SVG · WebP — max 2 Mo</div>
                </>
              )}
            </div>
          )}

          <input ref={fileInputRef} type="file" accept="image/*" style={{display:'none'}}
            onChange={e => { if (e.target.files?.[0]) uploadLogo(e.target.files[0]); e.target.value='' }}/>
        </div>

        {/* ── Couleur PDF ─────────────────────────────────────────────── */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Couleur principale — PDF & exports</div>
          <div style={{fontSize:12,color:'#8A9BB0',marginBottom:4}}>
            Utilisée pour l'en-tête et le pied de page de vos factures, bilans et listes exportés.
          </div>

          {/* Aperçu */}
          <div style={{...S.colorPreview, background: couleur}}>
            <div style={{fontSize:12,fontWeight:700,color:'#fff',opacity:.85}}>Aperçu en-tête PDF</div>
            <div style={{fontSize:14,fontWeight:700,color:'#fff'}}>
              {profil.nom_cabinet || profil.prenom+' '+profil.nom || 'Cabinet d\'orthophonie'}
            </div>
            <div style={{fontSize:10,color:'#fff',opacity:.75}}>
              {profil.ville || 'Ville'} · {profil.telephone || 'Téléphone'}
            </div>
          </div>

          {/* Couleurs preset */}
          <div style={S.colorGrid}>
            {COULEURS_PRESET.map(c => (
              <button key={c.value}
                title={c.label}
                style={{
                  ...S.colorDot,
                  background: c.value,
                  border: couleur===c.value ? '3px solid #1A2744' : '3px solid transparent',
                  transform: couleur===c.value ? 'scale(1.18)' : 'scale(1)',
                }}
                onClick={() => { set('couleur_principale', c.value); setCustomColor(false) }}
              />
            ))}

            {/* Bouton couleur personnalisée */}
            <div style={{position:'relative'}}>
              <button
                title="Couleur personnalisée"
                style={{
                  ...S.colorDot,
                  background: customColor ? couleur : 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
                  border: customColor ? '3px solid #1A2744' : '3px solid transparent',
                  transform: customColor ? 'scale(1.18)' : 'scale(1)',
                  overflow: 'hidden',
                }}
                onClick={() => { setCustomColor(true); setTimeout(()=>document.getElementById('customColorPicker')?.click(),50) }}
              />
              <input id="customColorPicker" type="color" value={couleur}
                style={{position:'absolute',opacity:0,width:0,height:0,top:0,left:0,pointerEvents: customColor?'auto':'none'}}
                onChange={e => { set('couleur_principale', e.target.value); setCustomColor(true) }}/>
            </div>
          </div>

          {customColor && (
            <div style={{display:'flex',alignItems:'center',gap:10,marginTop:4}}>
              <input type="color" value={couleur} onChange={e=>set('couleur_principale',e.target.value)}
                style={{width:36,height:36,borderRadius:8,border:'1.5px solid #DDE5EF',cursor:'pointer',padding:2}}/>
              <input style={{...S.fi,width:110,fontFamily:'monospace',fontSize:13}} value={couleur}
                onChange={e=>{ if(/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) set('couleur_principale',e.target.value) }}
                placeholder="#0C447C"/>
              <span style={{fontSize:12,color:'#8A9BB0'}}>Code hexadécimal</span>
            </div>
          )}
        </div>

        {/* ── Bio ─────────────────────────────────────────────────────── */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Présentation</div>
          <div style={S.fg}><label style={S.fl}>Bio / présentation courte</label>
            <textarea style={{...S.fi,minHeight:80,resize:'vertical',lineHeight:1.6}}
              value={profil.bio} onChange={e=>set('bio',e.target.value)}
              placeholder="Quelques mots sur votre pratique, vos spécialités…"/></div>
        </div>

        {/* ── Bouton sauvegarder ───────────────────────────────────────── */}
        <div style={S.footer}>
          <button style={{...S.saveBtn,background:couleur,opacity:saving?.7:1}}
            onClick={saveProfil} disabled={saving}>
            {saving ? 'Enregistrement…' : '💾 Enregistrer le profil'}
          </button>
        </div>

      </div>
    </div>
  )
}

const S = {
  wrap:          { flex:1, overflowY:'auto', background:'#F0F4F9', display:'flex', justifyContent:'center' },
  inner:         { width:'100%', display:'flex', flexDirection:'column', gap:20 },
  centerWrap:    { flex:1, display:'flex', alignItems:'center', justifyContent:'center' },
  loadingMsg:    { fontSize:14, color:'#8A9BB0' },
  header:        { background:'#fff', borderRadius:14, padding:'20px 24px', display:'flex', alignItems:'center', gap:18, boxShadow:'0 2px 12px rgba(12,68,124,0.08)' },
  avatar:        { width:58, height:58, borderRadius:'50%', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:700, fontFamily:'Georgia, serif', flexShrink:0 },
  headerName:    { fontFamily:'Georgia, serif', fontSize:20, fontWeight:700 },
  headerEmail:   { fontSize:12, color:'#8A9BB0', marginTop:3 },
  headerCabinet: { fontSize:12, color:'#4A6080', marginTop:4, fontWeight:600 },
  alertError:    { background:'#FCEBEB', color:'#C0392B', borderRadius:10, padding:'10px 16px', fontSize:13, fontWeight:600 },
  alertSuccess:  { background:'#E8F5EE', color:'#1D7A5A', borderRadius:10, padding:'10px 16px', fontSize:13, fontWeight:600 },
  section:       { background:'#fff', borderRadius:14, padding:'18px 20px', display:'flex', flexDirection:'column', gap:12, boxShadow:'0 2px 12px rgba(12,68,124,0.08)' },
  sectionTitle:  { fontSize:11, fontWeight:700, letterSpacing:'0.09em', textTransform:'uppercase', color:'#8A9BB0', marginBottom:2 },
  grid2:         { display:'grid', gap:12 },
  fg:            { display:'flex', flexDirection:'column', gap:5 },
  fl:            { fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'#4A6080' },
  fi:            { padding:'9px 12px', border:'1.5px solid #DDE5EF', borderRadius:8, fontSize:13, fontFamily:'DM Sans, sans-serif', outline:'none', width:'100%', boxSizing:'border-box', color:'#1A2744' },
  // Logo
  logoDropZone:  { border:'2px dashed #DDE5EF', borderRadius:12, padding:'28px 20px', textAlign:'center', cursor:'pointer', background:'#F8FAFD', transition:'border-color .15s' },
  logoPreviewWrap:{ display:'flex', alignItems:'center', gap:16, padding:'12px 0' },
  logoPreviewImg: { width:72, height:72, objectFit:'contain', borderRadius:10, border:'1.5px solid #DDE5EF', background:'#F8FAFD' },
  logoChangeBtn: { padding:'6px 12px', background:'#EBF2F9', color:'#0C447C', border:'none', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans, sans-serif' },
  logoRemoveBtn: { padding:'6px 12px', background:'#FFF5F5', color:'#C0392B', border:'none', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans, sans-serif' },
  // Couleur
  colorPreview:  { borderRadius:10, padding:'14px 18px', display:'flex', flexDirection:'column', gap:4, marginBottom:4 },
  colorGrid:     { display:'flex', flexWrap:'wrap', gap:10, alignItems:'center' },
  colorDot:      { width:32, height:32, borderRadius:'50%', cursor:'pointer', transition:'all .15s', flexShrink:0 },
  // Footer
  footer:        { display:'flex', justifyContent:'flex-end', paddingBottom:24 },
  saveBtn:       { padding:'10px 24px', color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'DM Sans, sans-serif' },
}