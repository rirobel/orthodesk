import { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabase'

const EMPTY_PROFIL = {
  prenom:             '',
  nom:                '',
  nom_cabinet:        '',
  telephone:          '',
  adresse:            '',
  ville:              '',
  code_postal:        '',
  pays:               'Maroc',
  site_web:           '',
  bio:                '',
  couleur_principale: '#0C447C',
  couleur_texte:      '#FFFFFF',
  logo_url:           '',
}

const COULEURS_BG = [
  { label:'Bleu OrthoDesk', value:'#0C447C' },
  { label:'Orange',         value:'#E89020' },
  { label:'Vert',           value:'#1D9E75' },
  { label:'Violet',         value:'#7B5EA7' },
  { label:'Rouge',          value:'#C0392B' },
  { label:'Bleu ciel',      value:'#185FA5' },
  { label:'Ardoise',        value:'#4A6080' },
  { label:'Noir',           value:'#1A2744' },
]

const COULEURS_TEXTE = [
  { label:'Blanc',        value:'#FFFFFF' },
  { label:'Noir',         value:'#1A2744' },
  { label:'Gris clair',   value:'#F0F4F9' },
  { label:'Or',           value:'#F5D78E' },
]

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 700)
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 700)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return isMobile
}

export default function Profil({ session }) {
  const [profil, setProfil]               = useState(EMPTY_PROFIL)
  const [loading, setLoading]             = useState(true)
  const [saving, setSaving]               = useState(false)
  const [saved, setSaved]                 = useState(false)
  const [error, setError]                 = useState('')
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoPreview, setLogoPreview]     = useState(null)
  const [customBg, setCustomBg]           = useState(false)
  const [customTxt, setCustomTxt]         = useState(false)
  const fileInputRef = useRef(null)
  const isMobile = useIsMobile()

  // Changement mot de passe
  const [pwModal, setPwModal]     = useState(false)
  const [pwForm, setPwForm]       = useState({ newPw:'', confirmPw:'' })
  const [pwSaving, setPwSaving]   = useState(false)
  const [pwError, setPwError]     = useState('')
  const [pwDone, setPwDone]       = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfPw, setShowConfPw] = useState(false)

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
        couleur_texte:      data.couleur_texte      || '#FFFFFF',
        logo_url:           data.logo_url           || '',
      }
      setProfil(p)
      setLogoPreview(p.logo_url || null)
      if (!COULEURS_BG.some(c => c.value === p.couleur_principale))  setCustomBg(true)
      if (!COULEURS_TEXTE.some(c => c.value === p.couleur_texte))    setCustomTxt(true)
    }
    setLoading(false)
  }

  async function uploadLogo(file) {
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setError('Logo trop lourd (max 2 Mo).'); return }
    if (!['image/png','image/jpeg','image/svg+xml','image/webp'].includes(file.type)) {
      setError('Format accepté : PNG, JPG, SVG ou WebP.'); return
    }
    setLogoUploading(true)
    setError('')
    const ext  = file.name.split('.').pop()
    const path = `${session.user.id}/logo.${ext}`
    const { error: upErr } = await supabase.storage
      .from('logos').upload(path, file, { upsert: true, contentType: file.type })
    if (upErr) { setError('Erreur upload : ' + upErr.message); setLogoUploading(false); return }
    const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path)
    const publicUrl = urlData.publicUrl + '?t=' + Date.now()
    set('logo_url', publicUrl)
    setLogoPreview(publicUrl)
    setLogoUploading(false)
  }

  async function saveProfil() {
    setError('')
    if (!profil.prenom || !profil.nom) { setError('Le prénom et le nom sont obligatoires.'); return }
    setSaving(true)
    const payload = {
      prenom:             profil.prenom,
      nom:                profil.nom,
      nom_cabinet:        profil.nom_cabinet,
      telephone:          profil.telephone,
      adresse:            profil.adresse,
      ville:              profil.ville,
      code_postal:        profil.code_postal,
      pays:               profil.pays,
      site_web:           profil.site_web,
      bio:                profil.bio,
      couleur_principale: profil.couleur_principale,
      couleur_texte:      profil.couleur_texte,
      logo_url:           profil.logo_url,
      updated_at:         new Date().toISOString(),
    }
    const { error: err } = await supabase
      .from('profiles').update(payload).eq('id', session.user.id)
    setSaving(false)
    if (err) { setError('Erreur : ' + err.message) }
    else { setSaved(true); setTimeout(() => setSaved(false), 3000) }
  }

  async function changePassword() {
    setPwError('')
    if (pwForm.newPw.length < 8) { setPwError('Minimum 8 caractères.'); return }
    if (pwForm.newPw !== pwForm.confirmPw) { setPwError('Les mots de passe ne correspondent pas.'); return }
    setPwSaving(true)
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPw })
    setPwSaving(false)
    if (error) { setPwError('Erreur : ' + error.message) }
    else { setPwDone(true); setPwForm({ newPw:'', confirmPw:'' }); setTimeout(() => { setPwModal(false); setPwDone(false) }, 2500) }
  }

  function set(key, val) { setProfil(p => ({ ...p, [key]: val })); setSaved(false) }

  const initiales = ((profil.prenom?.[0]||'')+(profil.nom?.[0]||'')).toUpperCase() || '?'
  const couleurBg  = profil.couleur_principale || '#0C447C'
  const couleurTxt = profil.couleur_texte      || '#FFFFFF'

  if (loading) return (
    <div style={S.centerWrap}><div style={S.loadingMsg}>Chargement du profil…</div></div>
  )

  return (
    <div style={S.wrap}>
      <div style={{ ...S.inner, maxWidth:isMobile?'100%':680, padding:isMobile?'16px 12px':'28px 24px' }}>

        {/* ── En-tête ─────────────────────────────────────────────────── */}
        <div style={S.header}>
          {logoPreview ? (
            <img src={logoPreview} alt="Logo"
              style={{ width:58, height:58, borderRadius:10, objectFit:'contain', border:'1.5px solid #DDE5EF', background:'#F8FAFD', flexShrink:0 }}/>
          ) : (
            <div style={{ ...S.avatar, background:couleurBg, color:couleurTxt }}>{initiales}</div>
          )}
          <div>
            <div style={{ ...S.headerName, color:couleurBg }}>
              {profil.prenom||profil.nom ? `${profil.prenom} ${profil.nom}`.trim() : 'Mon profil'}
            </div>
            <div style={S.headerEmail}>{session.user.email}</div>
            {profil.nom_cabinet && <div style={S.headerCabinet}>🏥 {profil.nom_cabinet}</div>}
          </div>
        </div>

        {error && <div style={S.alertError}>{error}</div>}
        {saved && <div style={S.alertSuccess}>✓ Profil sauvegardé avec succès</div>}

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
          <div style={{fontSize:12,color:'#8A9BB0'}}>
            Apparaîtra sur vos factures et exports PDF. PNG, JPG ou SVG recommandé. Max 2 Mo.
          </div>
          {logoPreview ? (
            <div style={{display:'flex',alignItems:'center',gap:16,padding:'8px 0'}}>
              <img src={logoPreview} alt="Logo"
                style={{width:72,height:72,objectFit:'contain',borderRadius:10,border:'1.5px solid #DDE5EF',background:'#F8FAFD'}}/>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <div style={{fontSize:12,color:'#1D7A5A',fontWeight:600}}>✓ Logo chargé</div>
                <button style={S.logoChangeBtn} onClick={()=>fileInputRef.current?.click()} disabled={logoUploading}>
                  {logoUploading?'⏳ Upload…':'🔄 Changer'}
                </button>
                <button style={S.logoRemoveBtn} onClick={()=>{ set('logo_url',''); setLogoPreview(null) }}>
                  🗑 Supprimer
                </button>
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
            onChange={e=>{ if(e.target.files?.[0]) uploadLogo(e.target.files[0]); e.target.value='' }}/>
        </div>

        {/* ── Couleurs PDF ─────────────────────────────────────────────── */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Couleurs — PDF & exports</div>

          {/* Aperçu */}
          <div style={{...S.colorPreview, background:couleurBg}}>
            <div style={{fontSize:11,fontWeight:700,color:couleurTxt,opacity:.8,textTransform:'uppercase',letterSpacing:'0.06em'}}>Aperçu en-tête PDF</div>
            <div style={{fontSize:15,fontWeight:700,color:couleurTxt}}>
              {profil.nom_cabinet || `${profil.prenom} ${profil.nom}`.trim() || 'Cabinet d\'orthophonie'}
            </div>
            <div style={{fontSize:11,color:couleurTxt,opacity:.75}}>
              {profil.ville||'Ville'} · {profil.telephone||'Téléphone'}
            </div>
          </div>

          {/* Couleur fond */}
          <div style={S.fg}>
            <label style={S.fl}>Couleur de fond (en-tête)</label>
            <div style={S.colorGrid}>
              {COULEURS_BG.map(c=>(
                <button key={c.value} title={c.label} style={{
                  ...S.colorDot, background:c.value,
                  border: couleurBg===c.value?'3px solid #1A2744':'3px solid transparent',
                  transform: couleurBg===c.value?'scale(1.2)':'scale(1)',
                }} onClick={()=>{ set('couleur_principale',c.value); setCustomBg(false) }}/>
              ))}
              <div style={{position:'relative'}}>
                <button title="Couleur personnalisée" style={{
                  ...S.colorDot,
                  background: customBg ? couleurBg : 'conic-gradient(red,yellow,lime,aqua,blue,magenta,red)',
                  border: customBg?'3px solid #1A2744':'3px solid transparent',
                  transform: customBg?'scale(1.2)':'scale(1)',
                }} onClick={()=>{ setCustomBg(true); setTimeout(()=>document.getElementById('bgPicker')?.click(),50) }}/>
                <input id="bgPicker" type="color" value={couleurBg}
                  style={{position:'absolute',opacity:0,width:0,height:0,pointerEvents:customBg?'auto':'none'}}
                  onChange={e=>{ set('couleur_principale',e.target.value); setCustomBg(true) }}/>
              </div>
            </div>
            {customBg && (
              <div style={{display:'flex',alignItems:'center',gap:10,marginTop:4}}>
                <input type="color" value={couleurBg} onChange={e=>set('couleur_principale',e.target.value)}
                  style={{width:36,height:36,borderRadius:8,border:'1.5px solid #DDE5EF',cursor:'pointer',padding:2}}/>
                <input style={{...S.fi,width:110,fontFamily:'monospace',fontSize:13}} value={couleurBg}
                  onChange={e=>{ if(/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) set('couleur_principale',e.target.value) }}
                  placeholder="#0C447C"/>
                <span style={{fontSize:12,color:'#8A9BB0'}}>Hex</span>
              </div>
            )}
          </div>

          {/* Couleur texte */}
          <div style={S.fg}>
            <label style={S.fl}>Couleur du texte (en-tête)</label>
            <div style={S.colorGrid}>
              {COULEURS_TEXTE.map(c=>(
                <button key={c.value} title={c.label} style={{
                  ...S.colorDot, background:c.value,
                  border: couleurTxt===c.value?'3px solid #E89020':'3px solid #DDE5EF',
                  transform: couleurTxt===c.value?'scale(1.2)':'scale(1)',
                }} onClick={()=>{ set('couleur_texte',c.value); setCustomTxt(false) }}/>
              ))}
              <div style={{position:'relative'}}>
                <button title="Couleur personnalisée" style={{
                  ...S.colorDot,
                  background: customTxt ? couleurTxt : 'conic-gradient(red,yellow,lime,aqua,blue,magenta,red)',
                  border: customTxt?'3px solid #E89020':'3px solid #DDE5EF',
                  transform: customTxt?'scale(1.2)':'scale(1)',
                }} onClick={()=>{ setCustomTxt(true); setTimeout(()=>document.getElementById('txtPicker')?.click(),50) }}/>
                <input id="txtPicker" type="color" value={couleurTxt}
                  style={{position:'absolute',opacity:0,width:0,height:0,pointerEvents:customTxt?'auto':'none'}}
                  onChange={e=>{ set('couleur_texte',e.target.value); setCustomTxt(true) }}/>
              </div>
            </div>
            {customTxt && (
              <div style={{display:'flex',alignItems:'center',gap:10,marginTop:4}}>
                <input type="color" value={couleurTxt} onChange={e=>set('couleur_texte',e.target.value)}
                  style={{width:36,height:36,borderRadius:8,border:'1.5px solid #DDE5EF',cursor:'pointer',padding:2}}/>
                <input style={{...S.fi,width:110,fontFamily:'monospace',fontSize:13}} value={couleurTxt}
                  onChange={e=>{ if(/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) set('couleur_texte',e.target.value) }}
                  placeholder="#FFFFFF"/>
                <span style={{fontSize:12,color:'#8A9BB0'}}>Hex</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Bio ─────────────────────────────────────────────────────── */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Présentation</div>
          <div style={S.fg}><label style={S.fl}>Bio / présentation courte</label>
            <textarea style={{...S.fi,minHeight:80,resize:'vertical',lineHeight:1.6}}
              value={profil.bio} onChange={e=>set('bio',e.target.value)}
              placeholder="Quelques mots sur votre pratique, vos spécialités…"/></div>
        </div>

        {/* ── Sécurité ────────────────────────────────────────────────── */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Sécurité</div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:'#1A2744'}}>Mot de passe</div>
              <div style={{fontSize:12,color:'#8A9BB0',marginTop:2}}>Modifiez votre mot de passe de connexion.</div>
            </div>
            <button style={{padding:'8px 16px',background:'#F0F4F9',color:'#0C447C',border:'1.5px solid #DDE5EF',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'DM Sans, sans-serif'}}
              onClick={()=>{ setPwModal(true); setPwError(''); setPwDone(false) }}>
              🔑 Changer le mot de passe
            </button>
          </div>
        </div>

        {/* ── Bouton sauvegarder ───────────────────────────────────────── */}
        <div style={S.footer}>
          <button style={{...S.saveBtn, background:couleurBg, opacity:saving?0.7:1}}
            onClick={saveProfil} disabled={saving}>
            {saving ? 'Enregistrement…' : '💾 Enregistrer le profil'}
          </button>
        </div>

      </div>

      {/* MODAL MOT DE PASSE */}
      {pwModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(10,30,60,0.45)',zIndex:200,display:'flex',alignItems:'flex-end',justifyContent:'center'}}
          onClick={()=>setPwModal(false)}>
          <div style={{background:'#fff',width:'100%',maxWidth:460,borderRadius:isMobile?'16px 16px 0 0':16,boxShadow:'0 8px 32px rgba(12,68,124,0.18)',display:'flex',flexDirection:'column',maxHeight:'92vh'}}
            onClick={e=>e.stopPropagation()}>
            <div style={{padding:'18px 22px 14px',borderBottom:'1px solid #DDE5EF',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontFamily:'Georgia, serif',fontSize:18,color:'#0C447C'}}>Changer le mot de passe</span>
              <button style={{width:28,height:28,background:'#F0F4F9',border:'none',borderRadius:6,cursor:'pointer',fontSize:14,color:'#8A9BB0'}} onClick={()=>setPwModal(false)}>✕</button>
            </div>
            <div style={{padding:'18px 22px',display:'flex',flexDirection:'column',gap:14,overflowY:'auto'}}>
              {pwDone ? (
                <div style={{textAlign:'center',padding:'16px 0',display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
                  <div style={{width:52,height:52,borderRadius:'50%',background:'#E8F5EE',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>✅</div>
                  <div style={{fontFamily:'Georgia, serif',fontSize:16,color:'#0C447C'}}>Mot de passe mis à jour !</div>
                </div>
              ) : (
                <>
                  <div style={S.fg}>
                    <label style={S.fl}>Nouveau mot de passe</label>
                    <div style={{position:'relative'}}>
                      <input style={{...S.fi,paddingRight:40}} type={showNewPw?'text':'password'}
                        value={pwForm.newPw} onChange={e=>setPwForm({...pwForm,newPw:e.target.value})}
                        placeholder="Minimum 8 caractères…" autoFocus/>
                      <button type="button" style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:16,color:'#8A9BB0'}}
                        onClick={()=>setShowNewPw(!showNewPw)}>{showNewPw?'🙈':'👁'}</button>
                    </div>
                  </div>
                  <div style={S.fg}>
                    <label style={S.fl}>Confirmer le mot de passe</label>
                    <div style={{position:'relative'}}>
                      <input style={{...S.fi,paddingRight:40}} type={showConfPw?'text':'password'}
                        value={pwForm.confirmPw} onChange={e=>setPwForm({...pwForm,confirmPw:e.target.value})}
                        placeholder="Répétez le mot de passe…"/>
                      <button type="button" style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:16,color:'#8A9BB0'}}
                        onClick={()=>setShowConfPw(!showConfPw)}>{showConfPw?'🙈':'👁'}</button>
                    </div>
                  </div>
                  {pwForm.newPw.length > 0 && (
                    <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                      {[{ok:pwForm.newPw.length>=8,label:'8 car.'},{ok:/[A-Z]/.test(pwForm.newPw),label:'Majuscule'},{ok:/[0-9]/.test(pwForm.newPw),label:'Chiffre'},{ok:/[^A-Za-z0-9]/.test(pwForm.newPw),label:'Symbole'}].map(({ok,label})=>(
                        <span key={label} style={{fontSize:10,fontWeight:600,padding:'2px 7px',borderRadius:20,background:ok?'#E8F5EE':'#F0F4F9',color:ok?'#1D7A5A':'#8A9BB0'}}>{ok?'✓':'·'} {label}</span>
                      ))}
                    </div>
                  )}
                  {pwError && <div style={{background:'#FCEBEB',color:'#C0392B',borderRadius:8,padding:'8px 12px',fontSize:12,fontWeight:600}}>{pwError}</div>}
                </>
              )}
            </div>
            {!pwDone && (
              <div style={{padding:'12px 22px 16px',display:'flex',gap:8,justifyContent:'flex-end',borderTop:'1px solid #DDE5EF'}}>
                <button style={{padding:'8px 14px',background:'#F0F4F9',border:'none',borderRadius:8,fontSize:13,color:'#4A6080',cursor:'pointer',fontFamily:'DM Sans, sans-serif'}} onClick={()=>setPwModal(false)}>Annuler</button>
                <button style={{padding:'8px 18px',background:couleurBg,color:couleurTxt,border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'DM Sans, sans-serif'}} onClick={changePassword} disabled={pwSaving}>{pwSaving?'Mise à jour…':'Enregistrer'}</button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

const S = {
  wrap:          { flex:1, overflowY:'auto', background:'#F0F4F9', display:'flex', justifyContent:'center' },
  inner:         { width:'100%', display:'flex', flexDirection:'column', gap:20 },
  centerWrap:    { flex:1, display:'flex', alignItems:'center', justifyContent:'center' },
  loadingMsg:    { fontSize:14, color:'#8A9BB0' },
  header:        { background:'#fff', borderRadius:14, padding:'20px 24px', display:'flex', alignItems:'center', gap:18, boxShadow:'0 2px 12px rgba(12,68,124,0.08)' },
  avatar:        { width:58, height:58, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:700, fontFamily:'Georgia, serif', flexShrink:0 },
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
  logoDropZone:  { border:'2px dashed #DDE5EF', borderRadius:12, padding:'28px 20px', textAlign:'center', cursor:'pointer', background:'#F8FAFD' },
  logoChangeBtn: { padding:'6px 12px', background:'#EBF2F9', color:'#0C447C', border:'none', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans, sans-serif' },
  logoRemoveBtn: { padding:'6px 12px', background:'#FFF5F5', color:'#C0392B', border:'none', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans, sans-serif' },
  colorPreview:  { borderRadius:10, padding:'14px 18px', display:'flex', flexDirection:'column', gap:4, marginBottom:4 },
  colorGrid:     { display:'flex', flexWrap:'wrap', gap:10, alignItems:'center', marginTop:4 },
  colorDot:      { width:32, height:32, borderRadius:'50%', cursor:'pointer', transition:'all .15s', flexShrink:0, padding:0 },
  footer:        { display:'flex', justifyContent:'flex-end', paddingBottom:24 },
  saveBtn:       { padding:'10px 24px', color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'DM Sans, sans-serif' },
}