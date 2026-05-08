import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

const MOTIFS = ['Aphasie post-AVC','Bégaiement','Retard de langage','Trisomie 21','Dyslexie / Dysorthographie','TSA (Autisme)','Dysphagie','Dysphonie','Autre']
const STATUTS = { actif:'Actif', bilan:'En bilan', pause:'Pause', archive:'Archivé' }
const STATUT_COLORS = {
  actif:   { bg:'#E8F5EE', color:'#1D7A5A' },
  bilan:   { bg:'#EBF2F9', color:'#185FA5' },
  pause:   { bg:'#FEF3E2', color:'#8B5A00' },
  archive: { bg:'#F1EFE8', color:'#888' },
}
const COLORS = ['#185FA5','#1D9E75','#E89020','#7B5EA7','#C0392B','#0C447C','#D4884A']

const PAGE_SIZE = 5

function initials(prenom, nom) {
  return ((prenom?.[0]||'') + (nom?.[0]||'')).toUpperCase()
}
function patColor(id) { return COLORS[id % COLORS.length] }
function calcAge(dob) {
  if (!dob) return null
  const d = new Date(dob), now = new Date()
  let a = now.getFullYear() - d.getFullYear()
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) a--
  return a
}

const EMPTY_FORM = {
  prenom:'', nom:'', dob:'', sexe:'', cin:'',
  tel:'', email:'', adresse:'',
  motif:'', statut:'actif', medecin:'', mutuelle:'',
  notes:'', urgnom:'', urgtel:''
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

export default function Patients({ session }) {
  const [patients, setPatients]     = useState([])
  const [rdvs, setRdvs]             = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filter, setFilter]         = useState('tous')
  const [selectedId, setSelectedId] = useState(null)
  const [modal, setModal]           = useState(false)
  const [editPat, setEditPat]       = useState(null)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [saving, setSaving]         = useState(false)
  const [page, setPage]             = useState(1)
  const [showDetail, setShowDetail] = useState(false)

  const isMobile = useIsMobile()

  useEffect(() => { fetchPatients(); fetchRdvs() }, [])
  useEffect(() => { setPage(1) }, [search, filter])

  async function fetchPatients() {
    setLoading(true)
    const { data } = await supabase.from('patients').select('*').order('nom')
    setPatients(data || [])
    setLoading(false)
  }

  async function fetchRdvs() {
    const { data } = await supabase
      .from('rendez_vous').select('*').order('date', { ascending: false })
    setRdvs(data || [])
  }

  async function savePatient() {
    if (!form.prenom || !form.nom) { alert('Prénom et nom sont obligatoires.'); return }
    setSaving(true)
    const payload = { ...form, user_id: session.user.id }
    if (editPat) {
      await supabase.from('patients').update(payload).eq('id', editPat.id)
    } else {
      await supabase.from('patients').insert(payload)
    }
    setSaving(false)
    setModal(false)
    setEditPat(null)
    setForm(EMPTY_FORM)
    await fetchPatients()
    if (editPat) setSelectedId(editPat.id)
  }

  async function deletePatient() {
    if (!confirm('Supprimer ce patient et toutes ses données ?')) return
    await supabase.from('patients').delete().eq('id', editPat.id)
    setModal(false)
    setSelectedId(null)
    setEditPat(null)
    setShowDetail(false)
    fetchPatients()
  }

  function openNew() {
    setEditPat(null)
    setForm(EMPTY_FORM)
    setModal(true)
  }

  function openEdit(p) {
    setEditPat(p)
    setForm({
      prenom: p.prenom||'', nom: p.nom||'', dob: p.dob||'', sexe: p.sexe||'', cin: p.cin||'',
      tel: p.tel||'', email: p.email||'', adresse: p.adresse||'',
      motif: p.motif||'', statut: p.statut||'actif', medecin: p.medecin||'', mutuelle: p.mutuelle||'',
      notes: p.notes||'', urgnom: p.urgnom||'', urgtel: p.urgtel||''
    })
    setModal(true)
  }

  function selectPatient(id) {
    setSelectedId(id)
    if (isMobile) setShowDetail(true)
  }

  // Filtrage
  let filtered = patients
  if (search) filtered = filtered.filter(p =>
    (p.prenom+' '+p.nom).toLowerCase().includes(search.toLowerCase()) ||
    (p.motif||'').toLowerCase().includes(search.toLowerCase())
  )
  if (filter !== 'tous') filtered = filtered.filter(p => p.statut === filter)

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const selected = patients.find(p => p.id === selectedId)
  const patRdvs  = selected
    ? rdvs.filter(r => r.patient_nom === selected.prenom+' '+selected.nom)
    : []

  const TYPES_LABEL = { bilan:'Bilan initial', reeducation:'Rééducation', suivi:'Suivi', tele:'Téléconsultation' }
  const TYPES_COLOR = { bilan:'#185FA5', reeducation:'#1D9E75', suivi:'#E89020', tele:'#7B5EA7' }

  // ─── PANNEAU LISTE ──────────────────────────────────────────────────────────
  const listPanel = (
    <div style={{ ...S.listPanel, width: isMobile ? '100%' : 320 }}>
      <div style={S.listHeader}>
        <input style={S.search} type="text" placeholder="Rechercher…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <div style={S.filters}>
          {['tous','actif','bilan','pause','archive'].map(f => (
            <button key={f} style={{...S.filterBtn, ...(filter===f ? S.filterActive : {})}}
              onClick={() => setFilter(f)}>
              {f === 'tous' ? 'Tous' : STATUTS[f]}
            </button>
          ))}
        </div>
      </div>

      <div style={S.listCount}>{filtered.length} patient{filtered.length > 1 ? 's' : ''}</div>

      <div style={S.list}>
        {loading && <div style={S.emptyMsg}>Chargement…</div>}
        {!loading && filtered.length === 0 && (
          <div style={S.emptyMsg}>Aucun patient trouvé</div>
        )}
        {paginated.map(p => {
          const col = patColor(p.id)
          const sc  = STATUT_COLORS[p.statut] || STATUT_COLORS.archive
          const age = calcAge(p.dob)
          const rdvCount = rdvs.filter(r => r.patient_nom === p.prenom+' '+p.nom).length
          return (
            <div key={p.id}
              style={{...S.patCard, ...(selectedId===p.id ? S.patCardSel : {})}}
              onClick={() => selectPatient(p.id)}>
              <div style={{...S.patAv, background: col+'22', color: col}}>
                {initials(p.prenom, p.nom)}
              </div>
              <div style={S.patInfo}>
                <div style={S.patName}>{p.prenom} {p.nom}</div>
                <div style={S.patMeta}>{age ? age+' ans · ' : ''}{p.motif || '—'}</div>
                <div style={S.patMeta}>{rdvCount} séance{rdvCount > 1 ? 's' : ''}</div>
              </div>
              <span style={{...S.statBadge, background: sc.bg, color: sc.color}}>
                {STATUTS[p.statut]}
              </span>
            </div>
          )
        })}
      </div>

      {/* ── PAGINATION ── */}
      {totalPages > 1 && (
        <div style={S.pagination}>
          <button style={S.pageBtn} disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p}
              style={{ ...S.pageBtn, ...(page === p ? S.pageBtnActive : {}) }}
              onClick={() => setPage(p)}>
              {p}
            </button>
          ))}
          <button style={S.pageBtn} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
        </div>
      )}

      {/* Bouton nouveau patient (mobile) */}
      {isMobile && (
        <div style={{ padding: '10px 12px', borderTop: '1px solid #DDE5EF' }}>
          <button style={{ ...S.addBtn, width: '100%', justifyContent: 'center' }} onClick={openNew}>
            + Nouveau patient
          </button>
        </div>
      )}
    </div>
  )

  // ─── PANNEAU DÉTAIL ─────────────────────────────────────────────────────────
  const detailPanel = (
    <div style={S.detail}>
      {isMobile && showDetail && (
        <button style={S.backBtn} onClick={() => setShowDetail(false)}>← Retour</button>
      )}
      {!selected ? (
        <div style={S.emptyDetail}>
          <div style={{fontSize:48, opacity:.25}}>👤</div>
          <div style={{fontSize:15, fontWeight:600, color:'#4A6080'}}>Sélectionnez un patient</div>
          <div style={{fontSize:12, color:'#8A9BB0'}}>pour voir son dossier complet</div>
          {!isMobile && (
            <button style={{...S.addBtn, marginTop:16}} onClick={openNew}>+ Nouveau patient</button>
          )}
        </div>
      ) : (
        <div style={S.detailInner}>

          {/* Header patient */}
          <div style={{ ...S.pdHeader, flexWrap: 'wrap', gap: 12 }}>
            <div style={{...S.pdAvBig, background: patColor(selected.id)+'22', color: patColor(selected.id)}}>
              {initials(selected.prenom, selected.nom)}
            </div>
            <div style={{flex:1, minWidth: 160}}>
              <div style={S.pdName}>{selected.prenom} {selected.nom}</div>
              <div style={S.pdMeta}>
                {calcAge(selected.dob) ? calcAge(selected.dob)+' ans · ' : ''}
                {selected.sexe === 'F' ? 'Féminin' : selected.sexe === 'M' ? 'Masculin' : ''}
                {selected.dob ? ' · Né(e) le '+selected.dob : ''}
              </div>
              <div style={S.pdTags}>
                {selected.statut && (
                  <span style={{...S.pdTag, background: STATUT_COLORS[selected.statut]?.bg, color: STATUT_COLORS[selected.statut]?.color}}>
                    {STATUTS[selected.statut]}
                  </span>
                )}
                {selected.motif && (
                  <span style={{...S.pdTag, background:'#EBF2F9', color:'#185FA5'}}>{selected.motif}</span>
                )}
              </div>
            </div>
            <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
              <button style={S.editBtn} onClick={() => openEdit(selected)}>✏️ Modifier</button>
              {!isMobile && (
                <button style={S.addBtn} onClick={openNew}>+ Nouveau patient</button>
              )}
            </div>
          </div>

          {/* Grille infos */}
          <div style={{ ...S.pdGrid, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
            <div style={S.pdCard}>
              <div style={S.pdCardTitle}>Contact</div>
              {[
                ['Téléphone', selected.tel],
                ['Email', selected.email],
                ['Adresse', selected.adresse],
                ['Contact urgence', selected.urgnom ? selected.urgnom+(selected.urgtel?' · '+selected.urgtel:'') : null],
              ].map(([l,v]) => (
                <div key={l} style={S.pdField}>
                  <div style={S.pdFl}>{l}</div>
                  <div style={{...S.pdFv, ...(v ? {} : {color:'#8A9BB0', fontStyle:'italic'})}}>{v || 'Non renseigné'}</div>
                </div>
              ))}
            </div>
            <div style={S.pdCard}>
              <div style={S.pdCardTitle}>Informations cliniques</div>
              {[
                ['Motif principal', selected.motif],
                ['Médecin référent', selected.medecin],
                ['Mutuelle / Assurance', selected.mutuelle],
                ['N° dossier / CIN', selected.cin],
              ].map(([l,v]) => (
                <div key={l} style={S.pdField}>
                  <div style={S.pdFl}>{l}</div>
                  <div style={{...S.pdFv, ...(v ? {} : {color:'#8A9BB0', fontStyle:'italic'})}}>{v || 'Non renseigné'}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {selected.notes && (
            <div style={{...S.pdCard, marginBottom:0}}>
              <div style={S.pdCardTitle}>Antécédents & Notes cliniques</div>
              <div style={{fontSize:13, color:'#1A2744', lineHeight:1.7}}>{selected.notes}</div>
            </div>
          )}

          {/* Historique RDV */}
          <div style={S.pdCard}>
            <div style={S.pdCardTitle}>Historique des séances ({patRdvs.length})</div>
            {patRdvs.length === 0 ? (
              <div style={{fontSize:12, color:'#8A9BB0', fontStyle:'italic'}}>Aucune séance enregistrée</div>
            ) : (
              <div style={{display:'flex', flexDirection:'column', gap:8}}>
                {patRdvs.map(r => (
                  <div key={r.id} style={{...S.rdvItem, borderLeftColor: TYPES_COLOR[r.type]||'#185FA5'}}>
                    <div style={S.rdvDate}>{r.date}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12, fontWeight:700, color: TYPES_COLOR[r.type]||'#185FA5'}}>
                        {TYPES_LABEL[r.type]||r.type}
                      </div>
                      <div style={{fontSize:11, color:'#8A9BB0'}}>{r.motif||'—'}</div>
                      {r.notes && (
                        <div style={{fontSize:11, color:'#4A6080', marginTop:3, fontStyle:'italic', lineHeight:1.5}}>
                          📝 {r.notes}
                        </div>
                      )}
                    </div>
                    <div style={{fontSize:11, color:'#8A9BB0', flexShrink:0}}>{r.duree} min</div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )

  return (
    <div style={S.wrap}>

      {/* RESPONSIVE : mobile = une vue à la fois */}
      {isMobile ? (
        showDetail ? detailPanel : listPanel
      ) : (
        <>
          {listPanel}
          {detailPanel}
        </>
      )}

      {/* MODAL PATIENT */}
      {modal && (
        <div style={S.overlay} onClick={() => setModal(false)}>
          <div style={{
            ...S.modalBox,
            maxWidth: isMobile ? '100%' : 580,
            borderRadius: isMobile ? '16px 16px 0 0' : 16,
          }} onClick={e => e.stopPropagation()}>
            <div style={S.modalHead}>
              <span style={S.modalTitle}>{editPat ? 'Modifier le patient' : 'Nouveau patient'}</span>
              <button style={S.closeBtn} onClick={() => setModal(false)}>✕</button>
            </div>
            <div style={S.modalBody}>

              {/* Identité */}
              <div style={S.sectionLabel}>Identité</div>
              <div style={{ ...S.frow, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
                <div style={S.fg}><label style={S.fl}>Prénom *</label>
                  <input style={S.fi} value={form.prenom} onChange={e => setForm({...form, prenom: e.target.value})} placeholder="Prénom…" /></div>
                <div style={S.fg}><label style={S.fl}>Nom *</label>
                  <input style={S.fi} value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} placeholder="Nom…" /></div>
              </div>
              <div style={{ ...S.frow3, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr' }}>
                <div style={S.fg}><label style={S.fl}>Date de naissance</label>
                  <input style={S.fi} type="date" value={form.dob} onChange={e => setForm({...form, dob: e.target.value})} /></div>
                <div style={S.fg}><label style={S.fl}>Sexe</label>
                  <select style={S.fi} value={form.sexe} onChange={e => setForm({...form, sexe: e.target.value})}>
                    <option value="">—</option>
                    <option value="F">Féminin</option>
                    <option value="M">Masculin</option>
                  </select></div>
                <div style={S.fg}><label style={S.fl}>N° dossier / CIN</label>
                  <input style={S.fi} value={form.cin} onChange={e => setForm({...form, cin: e.target.value})} placeholder="Référence…" /></div>
              </div>

              {/* Contact */}
              <div style={S.sectionLabel}>Contact</div>
              <div style={{ ...S.frow, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
                <div style={S.fg}><label style={S.fl}>Téléphone</label>
                  <input style={S.fi} value={form.tel} onChange={e => setForm({...form, tel: e.target.value})} placeholder="+212…" /></div>
                <div style={S.fg}><label style={S.fl}>Email</label>
                  <input style={S.fi} type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="email@…" /></div>
              </div>
              <div style={S.fg}><label style={S.fl}>Adresse</label>
                <input style={S.fi} value={form.adresse} onChange={e => setForm({...form, adresse: e.target.value})} placeholder="Adresse…" /></div>

              {/* Clinique */}
              <div style={S.sectionLabel}>Informations cliniques</div>
              <div style={{ ...S.frow, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
                <div style={S.fg}><label style={S.fl}>Motif principal</label>
                  <select style={S.fi} value={form.motif} onChange={e => setForm({...form, motif: e.target.value})}>
                    <option value="">Sélectionner…</option>
                    {MOTIFS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select></div>
                <div style={S.fg}><label style={S.fl}>Statut</label>
                  <select style={S.fi} value={form.statut} onChange={e => setForm({...form, statut: e.target.value})}>
                    {Object.entries(STATUTS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                  </select></div>
              </div>
              <div style={{ ...S.frow, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
                <div style={S.fg}><label style={S.fl}>Médecin référent</label>
                  <input style={S.fi} value={form.medecin} onChange={e => setForm({...form, medecin: e.target.value})} placeholder="Dr. …" /></div>
                <div style={S.fg}><label style={S.fl}>Mutuelle / Assurance</label>
                  <input style={S.fi} value={form.mutuelle} onChange={e => setForm({...form, mutuelle: e.target.value})} placeholder="CNSS, CNOPS…" /></div>
              </div>
              <div style={S.fg}><label style={S.fl}>Antécédents & Notes cliniques</label>
                <textarea style={{...S.fi, minHeight:70, resize:'vertical'}}
                  value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                  placeholder="Antécédents médicaux, notes importantes…" /></div>

              {/* Urgence */}
              <div style={S.sectionLabel}>Contact d'urgence</div>
              <div style={{ ...S.frow, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
                <div style={S.fg}><label style={S.fl}>Nom & lien de parenté</label>
                  <input style={S.fi} value={form.urgnom} onChange={e => setForm({...form, urgnom: e.target.value})} placeholder="Prénom Nom (mère, époux…)" /></div>
                <div style={S.fg}><label style={S.fl}>Téléphone urgence</label>
                  <input style={S.fi} value={form.urgtel} onChange={e => setForm({...form, urgtel: e.target.value})} placeholder="+212…" /></div>
              </div>

            </div>
            <div style={S.modalFoot}>
              {editPat && (
                <button style={S.dangerBtn} onClick={deletePatient}>Supprimer</button>
              )}
              <button style={S.cancelBtn} onClick={() => setModal(false)}>Annuler</button>
              <button style={S.saveBtn} onClick={savePatient} disabled={saving}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const S = {
  wrap:        { flex:1, display:'flex', overflow:'hidden' },
  listPanel:   { borderRight:'1px solid #DDE5EF', background:'#fff', display:'flex', flexDirection:'column', flexShrink:0 },
  listHeader:  { padding:'14px 16px 10px', borderBottom:'1px solid #DDE5EF' },
  search:      { width:'100%', padding:'8px 12px', border:'1.5px solid #DDE5EF', borderRadius:8, fontSize:13, fontFamily:'DM Sans, sans-serif', outline:'none', boxSizing:'border-box' },
  filters:     { display:'flex', gap:5, marginTop:8, flexWrap:'wrap' },
  filterBtn:   { padding:'3px 9px', borderRadius:20, fontSize:11, fontWeight:600, border:'1.5px solid #DDE5EF', background:'none', cursor:'pointer', color:'#8A9BB0', fontFamily:'DM Sans, sans-serif' },
  filterActive:{ borderColor:'#0C447C', background:'#0C447C', color:'#fff' },
  listCount:   { fontSize:11, color:'#8A9BB0', padding:'6px 16px', fontStyle:'italic' },
  list:        { flex:1, overflowY:'auto', padding:'6px 8px' },
  emptyMsg:    { padding:'20px', textAlign:'center', color:'#8A9BB0', fontSize:13 },
  patCard:     { display:'flex', alignItems:'center', gap:10, padding:'9px 10px', borderRadius:10, cursor:'pointer', border:'1.5px solid transparent', marginBottom:4, transition:'all .12s' },
  patCardSel:  { background:'#EBF2F9', borderColor:'#3B82C4' },
  patAv:       { width:36, height:36, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0 },
  patInfo:     { flex:1, minWidth:0 },
  patName:     { fontSize:13, fontWeight:600, color:'#1A2744' },
  patMeta:     { fontSize:11, color:'#8A9BB0', marginTop:1 },
  statBadge:   { fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, whiteSpace:'nowrap' },
  // Pagination
  pagination:  { display:'flex', alignItems:'center', justifyContent:'center', gap:4, padding:'10px 12px', borderTop:'1px solid #DDE5EF', flexShrink:0 },
  pageBtn:     { minWidth:30, height:30, borderRadius:6, border:'1.5px solid #DDE5EF', background:'#fff', color:'#4A6080', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans, sans-serif', display:'flex', alignItems:'center', justifyContent:'center' },
  pageBtnActive:{ background:'#0C447C', color:'#fff', borderColor:'#0C447C' },
  // Détail
  detail:      { flex:1, overflowY:'auto', background:'#F0F4F9', padding:20 },
  emptyDetail: { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:10, color:'#8A9BB0' },
  detailInner: { display:'flex', flexDirection:'column', gap:14 },
  pdHeader:    { background:'#fff', borderRadius:12, padding:20, display:'flex', alignItems:'flex-start', gap:16, boxShadow:'0 2px 12px rgba(12,68,124,0.08)' },
  pdAvBig:     { width:56, height:56, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:700, flexShrink:0 },
  pdName:      { fontFamily:'Georgia, serif', fontSize:22, color:'#0C447C' },
  pdMeta:      { fontSize:12, color:'#8A9BB0', marginTop:3 },
  pdTags:      { display:'flex', gap:6, marginTop:7, flexWrap:'wrap' },
  pdTag:       { fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20 },
  editBtn:     { padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:600, border:'1.5px solid #DDE5EF', background:'#fff', color:'#0C447C', cursor:'pointer' },
  addBtn:      { padding:'8px 14px', background:'#0C447C', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:4 },
  pdGrid:      { display:'grid', gap:14 },
  pdCard:      { background:'#fff', borderRadius:12, padding:16, boxShadow:'0 2px 12px rgba(12,68,124,0.08)' },
  pdCardTitle: { fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#8A9BB0', marginBottom:10 },
  pdField:     { marginBottom:9 },
  pdFl:        { fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'#8A9BB0' },
  pdFv:        { fontSize:13, color:'#1A2744', fontWeight:500, marginTop:1 },
  rdvItem:     { display:'flex', alignItems:'center', gap:10, padding:'8px 10px', background:'#F0F4F9', borderRadius:7, borderLeft:'3px solid transparent' },
  rdvDate:     { fontSize:11, fontWeight:700, color:'#4A6080', width:80, flexShrink:0 },
  // Modal
  overlay:     { position:'fixed', inset:0, background:'rgba(10,30,60,0.45)', zIndex:100, display:'flex', alignItems:'flex-end', justifyContent:'center', padding:0 },
  modalBox:    { background:'#fff', width:'100%', boxShadow:'0 8px 32px rgba(12,68,124,0.18)', display:'flex', flexDirection:'column', maxHeight:'92vh' },
  modalHead:   { padding:'18px 22px 14px', borderBottom:'1px solid #DDE5EF', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 },
  modalTitle:  { fontFamily:'Georgia, serif', fontSize:19, color:'#0C447C' },
  closeBtn:    { width:28, height:28, background:'#F0F4F9', border:'none', borderRadius:6, cursor:'pointer', fontSize:14, color:'#8A9BB0' },
  modalBody:   { padding:'18px 22px', display:'flex', flexDirection:'column', gap:11, overflowY:'auto' },
  modalFoot:   { padding:'12px 22px 16px', display:'flex', gap:8, justifyContent:'flex-end', borderTop:'1px solid #DDE5EF', flexShrink:0 },
  sectionLabel:{ fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#8A9BB0', marginTop:4, marginBottom:2 },
  fg:          { display:'flex', flexDirection:'column', gap:4 },
  fl:          { fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'#4A6080' },
  fi:          { padding:'8px 12px', border:'1.5px solid #DDE5EF', borderRadius:8, fontSize:13, fontFamily:'DM Sans, sans-serif', outline:'none', width:'100%', boxSizing:'border-box' },
  frow:        { display:'grid', gap:12 },
  frow3:       { display:'grid', gap:12 },
  dangerBtn:   { padding:'8px 14px', background:'#FCEBEB', color:'#C0392B', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', marginRight:'auto' },
  cancelBtn:   { padding:'8px 14px', background:'#F0F4F9', border:'none', borderRadius:8, fontSize:13, fontWeight:500, color:'#4A6080', cursor:'pointer' },
  saveBtn:     { padding:'8px 18px', background:'#0C447C', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' },
  backBtn:     { display:'inline-flex', alignItems:'center', gap:6, marginBottom:14, padding:'6px 12px', background:'#fff', border:'1.5px solid #DDE5EF', borderRadius:8, fontSize:13, fontWeight:600, color:'#0C447C', cursor:'pointer' },
}