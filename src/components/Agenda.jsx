import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

const TYPES = {
  bilan:       { label:'Bilan initial',     bg:'#EBF2F9', border:'#185FA5', bb:'#185FA5' },
  reeducation: { label:'Rééducation',       bg:'#E8F5EE', border:'#1D9E75', bb:'#1D9E75' },
  suivi:       { label:'Suivi',             bg:'#FEF3E2', border:'#E89020', bb:'#E89020' },
  tele:        { label:'Téléconsultation',  bg:'#F7F0FB', border:'#7B5EA7', bb:'#7B5EA7' },
}
const HOURS = ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00']
const DAYS  = ['Lun','Mar','Mer','Jeu','Ven','Sam']
const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

function fmt(d){ return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate()) }
function p2(n){ return String(n).padStart(2,'0') }
function addDays(d,n){ let x=new Date(d); x.setDate(x.getDate()+n); return x }
function getMonday(d){ let dt=new Date(d),day=dt.getDay(),diff=day===0?-6:1-day; dt.setDate(dt.getDate()+diff); dt.setHours(0,0,0,0); return dt }
function t2m(t){ const [h,m]=t.split(':').map(Number); return h*60+m }

export default function Agenda({ session }) {
  const [rdvs, setRdvs]           = useState([])
  const [patients, setPatients]   = useState([])
  const [weekStart, setWeekStart] = useState(getMonday(new Date()))
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(false)
  const [editRdv, setEditRdv]     = useState(null)
  const [form, setForm]           = useState({ patient_nom:'', date:'', heure:'09:00', duree:60, type:'bilan', motif:'', notes:'' })
  const [selType, setSelType]     = useState('bilan')
  const [popup, setPopup]         = useState(null)

  useEffect(() => { fetchRdvs(); fetchPatients() }, [])

  async function fetchRdvs() {
    setLoading(true)
    const { data } = await supabase.from('rendez_vous').select('*').order('date').order('heure')
    setRdvs(data || [])
    setLoading(false)
  }

  async function fetchPatients() {
    const { data } = await supabase.from('patients').select('id, prenom, nom')
    setPatients(data || [])
  }

  async function saveRdv() {
    if (!form.patient_nom || !form.date || !form.heure) { alert('Patient, date et heure obligatoires.'); return }
    const payload = { ...form, type: selType, user_id: session.user.id }
    if (editRdv) {
      await supabase.from('rendez_vous').update(payload).eq('id', editRdv.id)
    } else {
      await supabase.from('rendez_vous').insert(payload)
    }
    setModal(false); setEditRdv(null)
    setForm({ patient_nom:'', date:'', heure:'09:00', duree:60, type:'bilan', motif:'', notes:'' })
    fetchRdvs()
  }

  async function deleteRdv(id) {
    if (!confirm('Supprimer ce rendez-vous ?')) return
    await supabase.from('rendez_vous').delete().eq('id', id)
    setPopup(null); setModal(false); fetchRdvs()
  }

  function openNew(date='', heure='') {
    setEditRdv(null)
    setForm({ patient_nom:'', date, heure: heure||'09:00', duree:60, type:'bilan', motif:'', notes:'' })
    setSelType('bilan')
    setModal(true)
  }

  function openEdit(rdv) {
    setEditRdv(rdv)
    setForm({ patient_nom: rdv.patient_nom, date: rdv.date, heure: rdv.heure, duree: rdv.duree, type: rdv.type, motif: rdv.motif||'', notes: rdv.notes||'' })
    setSelType(rdv.type)
    setPopup(null)
    setModal(true)
  }

  const weekDays  = Array.from({length:6}, (_,i) => addDays(weekStart,i))
  const weekEnd   = addDays(weekStart,5)
  const todayStr  = fmt(new Date())
  const weekRdvs  = rdvs.filter(r => r.date >= fmt(weekStart) && r.date <= fmt(weekEnd))

  return (
    <div style={{flex:1, display:'flex', flexDirection:'column', overflow:'hidden'}} onClick={() => setPopup(null)}>

      {/* TOOLBAR */}
      <div style={S.toolbar}>
        <button style={S.arr} onClick={() => setWeekStart(addDays(weekStart,-7))}>‹</button>
        <button style={S.todayBtn} onClick={() => setWeekStart(getMonday(new Date()))}>Aujourd'hui</button>
        <button style={S.arr} onClick={() => setWeekStart(addDays(weekStart,7))}>›</button>
        <span style={S.weekLbl}>{weekStart.getDate()} — {weekEnd.getDate()} {MONTHS[weekEnd.getMonth()]} {weekEnd.getFullYear()}</span>
        <button style={S.addBtn} onClick={() => openNew(todayStr)}>+ Nouveau RDV</button>
      </div>

      {/* WEEK HEADER */}
      <div style={S.weekHeader}>
        <div style={S.timeCorner}></div>
        {weekDays.map((d,i) => {
          const ds = fmt(d), cnt = weekRdvs.filter(r=>r.date===ds).length
          return (
            <div key={i} style={S.whCell}>
              <div style={S.whDay}>{DAYS[i]}</div>
              <div style={{...S.whNum, ...(ds===todayStr ? S.whToday : {})}}>{d.getDate()}</div>
              {cnt > 0 && <div style={S.whCnt}>{cnt} RDV</div>}
            </div>
          )
        })}
      </div>

      {/* GRID */}
      <div style={S.gridWrap}>
        <div style={S.grid}>
          {/* Time col */}
          <div style={S.timeCol}>
            {HOURS.map(h => <div key={h} style={S.tSlot}>{h.endsWith(':00') ? h : ''}</div>)}
          </div>
          {/* Day cols */}
          {weekDays.map((d,i) => {
            const ds = fmt(d)
            const dayRdvs = rdvs.filter(r => r.date === ds)
            return (
              <div key={i} style={S.dayCol}>
                {HOURS.map(h => (
                  <div key={h} style={{...S.dSlot, ...(h.endsWith(':30')?{borderBottom:'1px dashed rgba(0,0,0,0.05)'}:{})}}
                    onClick={e => { e.stopPropagation(); openNew(ds, h) }} />
                ))}
                {dayRdvs.map(rdv => {
                  const top  = ((t2m(rdv.heure) - 480) / 30) * 56
                  const ht   = Math.max((rdv.duree / 30) * 56 - 4, 22)
                  const t    = TYPES[rdv.type] || TYPES.bilan
                  return (
                    <div key={rdv.id} style={{...S.rdvCard, top, height:ht, background:t.bg, borderLeftColor:t.border}}
                      onClick={e => { e.stopPropagation(); setPopup(rdv) }}>
                      <div style={S.rcTime}>{rdv.heure}</div>
                      <div style={S.rcName}>{rdv.patient_nom}</div>
                      <div style={S.rcType}>{rdv.motif || t.label}</div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* STATS */}
      <div style={S.statsBar}>
        <span style={S.stat}>📅 {weekRdvs.length} RDV cette semaine</span>
        <span style={S.stat}>🟢 {weekRdvs.filter(r=>r.type==='reeducation').length} rééducation</span>
        <span style={S.stat}>🔵 {weekRdvs.filter(r=>r.type==='bilan').length} bilans</span>
        <span style={{...S.stat, marginLeft:'auto', color:'#8A9BB0'}}>Clic sur créneau = nouveau RDV</span>
      </div>

      {/* POPUP DETAIL */}
      {popup && (
        <div style={S.popup} onClick={e => e.stopPropagation()}>
          <div style={{...S.popupBadge, background: (TYPES[popup.type]||TYPES.bilan).bb}}>{(TYPES[popup.type]||TYPES.bilan).label}</div>
          <div style={S.popupName}>{popup.patient_nom}</div>
          <div style={S.popupMeta}>🕐 {popup.heure} · {popup.duree} min</div>
          <div style={S.popupMeta}>📋 {popup.motif || '—'}</div>
          {popup.notes && <div style={S.popupMeta}>📝 {popup.notes}</div>}
          <div style={S.popupActions}>
            <button style={S.popupEdit} onClick={() => openEdit(popup)}>✏️ Modifier</button>
            <button style={S.popupDel}  onClick={() => deleteRdv(popup.id)}>🗑 Supprimer</button>
          </div>
        </div>
      )}

      {/* MODAL RDV */}
      {modal && (
        <div style={S.overlay} onClick={() => setModal(false)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <div style={S.modalHead}>
              <span style={S.modalTitle}>{editRdv ? 'Modifier le RDV' : 'Nouveau rendez-vous'}</span>
              <button style={S.closeBtn} onClick={() => setModal(false)}>✕</button>
            </div>
            <div style={S.modalBody}>
              <div style={S.fg}>
                <label style={S.fl}>Patient</label>
                <input style={S.fi} value={form.patient_nom} list="pat-list"
                  onChange={e => setForm({...form, patient_nom: e.target.value})} placeholder="Nom du patient…" />
                <datalist id="pat-list">
                  {patients.map(p => <option key={p.id} value={`${p.prenom} ${p.nom}`} />)}
                </datalist>
              </div>
              <div style={S.frow}>
                <div style={S.fg}>
                  <label style={S.fl}>Date</label>
                  <input style={S.fi} type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                </div>
                <div style={S.fg}>
                  <label style={S.fl}>Heure</label>
                  <input style={S.fi} type="time" value={form.heure} onChange={e => setForm({...form, heure: e.target.value})} />
                </div>
              </div>
              <div style={S.frow}>
                <div style={S.fg}>
                  <label style={S.fl}>Durée</label>
                  <select style={S.fi} value={form.duree} onChange={e => setForm({...form, duree: parseInt(e.target.value)})}>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>1h</option>
                    <option value={90}>1h30</option>
                  </select>
                </div>
                <div style={S.fg}>
                  <label style={S.fl}>Motif</label>
                  <input style={S.fi} value={form.motif} onChange={e => setForm({...form, motif: e.target.value})} placeholder="Motif…" />
                </div>
              </div>
              <div style={S.fg}>
                <label style={S.fl}>Type</label>
                <div style={S.typeGrid}>
                  {Object.entries(TYPES).map(([k,v]) => (
                    <div key={k} style={{...S.typeOpt, ...(selType===k ? S.typeOptSel : {})}} onClick={() => setSelType(k)}>
                      <div style={{width:9, height:9, borderRadius:'50%', background:v.border, flexShrink:0}}></div>
                      {v.label}
                    </div>
                  ))}
                </div>
              </div>
              <div style={S.fg}>
                <label style={S.fl}>Notes</label>
                <input style={S.fi} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Notes…" />
              </div>
            </div>
            <div style={S.modalFoot}>
              {editRdv && <button style={S.dangerBtn} onClick={() => deleteRdv(editRdv.id)}>Supprimer</button>}
              <button style={S.cancelBtn} onClick={() => setModal(false)}>Annuler</button>
              <button style={S.saveBtn} onClick={saveRdv}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const S = {
  toolbar:    { background:'#fff', borderBottom:'1px solid #DDE5EF', padding:'10px 20px', display:'flex', alignItems:'center', gap:'10px', flexShrink:0 },
  arr:        { width:30, height:30, background:'#F0F4F9', border:'none', borderRadius:7, cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' },
  todayBtn:   { padding:'5px 12px', background:'none', border:'1.5px solid #DDE5EF', borderRadius:7, fontSize:12, fontWeight:500, color:'#4A6080', cursor:'pointer' },
  weekLbl:    { fontFamily:'Georgia, serif', fontSize:17, color:'#1A2744', flex:1 },
  addBtn:     { padding:'8px 16px', background:'#0C447C', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' },
  weekHeader: { display:'grid', gridTemplateColumns:'52px repeat(6, 1fr)', borderBottom:'1px solid #DDE5EF', background:'#fff', flexShrink:0 },
  timeCorner: { },
  whCell:     { padding:'8px 6px', textAlign:'center', borderLeft:'1px solid #DDE5EF' },
  whDay:      { fontSize:10, color:'#8A9BB0', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' },
  whNum:      { fontSize:19, fontWeight:600, color:'#4A6080', fontFamily:'Georgia, serif', lineHeight:1.1, marginTop:2 },
  whToday:    { background:'#0C447C', color:'#fff', width:32, height:32, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'2px auto 0', fontSize:16 },
  whCnt:      { fontSize:10, color:'#C9A84C', fontWeight:700, marginTop:1 },
  gridWrap:   { flex:1, overflowY:'auto' },
  grid:       { display:'grid', gridTemplateColumns:'52px repeat(6, 1fr)', background:'#fff' },
  timeCol:    { display:'flex', flexDirection:'column' },
  tSlot:      { height:56, display:'flex', alignItems:'flex-start', padding:'3px 6px 0', fontSize:10, color:'#8A9BB0', borderBottom:'1px solid #DDE5EF', fontWeight:600 },
  dayCol:     { borderLeft:'1px solid #DDE5EF', position:'relative' },
  dSlot:      { height:56, borderBottom:'1px solid #DDE5EF', cursor:'pointer' },
  rdvCard:    { position:'absolute', left:3, right:3, borderRadius:7, padding:'3px 7px', cursor:'pointer', overflow:'hidden', borderLeft:'3px solid transparent', zIndex:2 },
  rcTime:     { fontSize:9, fontWeight:700, opacity:0.7 },
  rcName:     { fontSize:11, fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
  rcType:     { fontSize:10, opacity:0.8, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
  statsBar:   { background:'#fff', borderTop:'1px solid #DDE5EF', padding:'8px 20px', display:'flex', gap:20, alignItems:'center', flexShrink:0 },
  stat:       { fontSize:12, color:'#4A6080', fontWeight:500 },
  popup:      { position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', background:'#fff', borderRadius:13, boxShadow:'0 8px 32px rgba(12,68,124,0.18)', width:270, zIndex:50, border:'1px solid #DDE5EF', padding:'14px 16px' },
  popupBadge: { fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, color:'#fff', display:'inline-block', marginBottom:6 },
  popupName:  { fontSize:15, fontWeight:700, color:'#1A2744', marginBottom:4 },
  popupMeta:  { fontSize:12, color:'#4A6080', marginBottom:3 },
  popupActions:{ display:'flex', gap:8, marginTop:10 },
  popupEdit:  { flex:1, padding:'6px', borderRadius:7, background:'#F0F4F9', color:'#0C447C', border:'none', fontSize:12, fontWeight:700, cursor:'pointer' },
  popupDel:   { flex:1, padding:'6px', borderRadius:7, background:'#FCEBEB', color:'#C0392B', border:'none', fontSize:12, fontWeight:700, cursor:'pointer' },
  overlay:    { position:'fixed', inset:0, background:'rgba(10,30,60,0.45)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:16 },
  modalBox:   { background:'#fff', borderRadius:16, width:'100%', maxWidth:460, boxShadow:'0 8px 32px rgba(12,68,124,0.18)', display:'flex', flexDirection:'column', maxHeight:'90vh' },
  modalHead:  { padding:'18px 22px 14px', borderBottom:'1px solid #DDE5EF', display:'flex', alignItems:'center', justifyContent:'space-between' },
  modalTitle: { fontFamily:'Georgia, serif', fontSize:19, color:'#0C447C' },
  closeBtn:   { width:28, height:28, background:'#F0F4F9', border:'none', borderRadius:6, cursor:'pointer', fontSize:14, color:'#8A9BB0' },
  modalBody:  { padding:'18px 22px', display:'flex', flexDirection:'column', gap:12, overflowY:'auto' },
  modalFoot:  { padding:'12px 22px 16px', display:'flex', gap:8, justifyContent:'flex-end', borderTop:'1px solid #DDE5EF' },
  fg:         { display:'flex', flexDirection:'column', gap:4 },
  fl:         { fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'#4A6080' },
  fi:         { padding:'8px 12px', border:'1.5px solid #DDE5EF', borderRadius:8, fontSize:13, fontFamily:'DM Sans, sans-serif', outline:'none', width:'100%' },
  frow:       { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 },
  typeGrid:   { display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 },
  typeOpt:    { padding:'8px 12px', border:'1.5px solid #DDE5EF', borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', gap:8, fontSize:12, fontWeight:600, color:'#4A6080' },
  typeOptSel: { borderColor:'#0C447C', background:'#EBF2F9', color:'#0C447C' },
  dangerBtn:  { padding:'8px 14px', background:'#FCEBEB', color:'#C0392B', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', marginRight:'auto' },
  cancelBtn:  { padding:'8px 14px', background:'#F0F4F9', border:'none', borderRadius:8, fontSize:13, fontWeight:500, color:'#4A6080', cursor:'pointer' },
  saveBtn:    { padding:'8px 18px', background:'#0C447C', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' },
}