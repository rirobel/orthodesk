import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import './Agenda.css'

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
      <div className="toolbar">
        <button className="arr" onClick={() => setWeekStart(addDays(weekStart,-7))}>‹</button>
        <button className="todayBtn" onClick={() => setWeekStart(getMonday(new Date()))}>Aujourd'hui</button>
        <button className="arr" onClick={() => setWeekStart(addDays(weekStart,7))}>›</button>
        <span className="weekLbl">{weekStart.getDate()} — {weekEnd.getDate()} {MONTHS[weekEnd.getMonth()]} {weekEnd.getFullYear()}</span>
        <button className="addBtn" onClick={() => openNew(todayStr)}>+ Nouveau RDV</button>
      </div>

      {/* WEEK HEADER */}
      <div className="weekHeader">
        <div className="timeCorner"></div>
        {weekDays.map((d,i) => {
          const ds = fmt(d), cnt = weekRdvs.filter(r=>r.date===ds).length
          return (
            <div key={i} className="whCell">
              <div className="whDay">{DAYS[i]}</div>
              <div className={ds === todayStr ? "whToday" : "whNum"}>{d.getDate()}</div>
              {cnt > 0 && <div className="whCnt">{cnt}</div>}
            </div>
          )
        })}
      </div>

      {/* GRID */}
      <div className="gridWrap">
        <div className="grid">
          {/* Time col */}
          <div className="timeCol">
            {HOURS.map(h => <div key={h} className="tSlot">{h.endsWith(':00') ? h : ''}</div>)}
          </div>
          {/* Day cols */}
          {weekDays.map((d,i) => {
            const ds = fmt(d)
            const dayRdvs = rdvs.filter(r => r.date === ds)
            return (
              <div key={i} className="dayCol">
                {HOURS.map(h => (
                  <div key={h} className="dSlot" style={h.endsWith(':30') ? { borderBottom: '1px dashed rgba(0,0,0,0.05)' } : {}}
                    onClick={e => { e.stopPropagation(); openNew(ds, h) }} />
                ))}
                {dayRdvs.map(rdv => {
                  const top  = ((t2m(rdv.heure) - 480) / 30) * 56
                  const ht   = Math.max((rdv.duree / 30) * 56 - 4, 22)
                  const t    = TYPES[rdv.type] || TYPES.bilan
                  return (
                    <div key={rdv.id} className="rdvCard" style={{ top, height: ht, background: t.bg, borderLeftColor: t.border }}
                      onClick={e => { e.stopPropagation(); setPopup(rdv) }}>
                      <div className="rcTime">{rdv.heure}</div>
                      <div className="rcName">{rdv.patient_nom}</div>
                      <div className="rcType">{rdv.motif || t.label}</div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* STATS */}
      <div className="statsBar">
        <span className="stat">📅 {weekRdvs.length} RDV cette semaine</span>
        <span className="stat">🟢 {weekRdvs.filter(r=>r.type==='reeducation').length} rééducation</span>
        <span className="stat">🔵 {weekRdvs.filter(r=>r.type==='bilan').length} bilans</span>
        <span className="stat" style={{marginLeft:'auto', color:'#8A9BB0'}}>Clic sur créneau = nouveau RDV</span>
      </div>

      {/* POPUP DETAIL */}
      {popup && (
        <div className="popup" onClick={e => e.stopPropagation()}>
          <div className="popupBadge" style={{background: (TYPES[popup.type]||TYPES.bilan).bb}}>{(TYPES[popup.type]||TYPES.bilan).label}</div>
          <div className="popupName">{popup.patient_nom}</div>
          <div className="popupMeta">🕐 {popup.heure} · {popup.duree} min</div>
          <div className="popupMeta">📋 {popup.motif || '—'}</div>
          {popup.notes && <div className="popupMeta">📝 {popup.notes}</div>}
          <div className="popupActions">
            <button className="popupEdit" onClick={() => openEdit(popup)}>✏️ Modifier</button>
            <button className="popupDel"  onClick={() => deleteRdv(popup.id)}>🗑 Supprimer</button>
          </div>
        </div>
      )}

      {/* MODAL RDV */}
      {modal && (
        <div className="overlay" onClick={() => setModal(false)}>
          <div className="modalBox" onClick={e => e.stopPropagation()}>
            <div className="modalHead">
              <span className="modalTitle">{editRdv ? 'Modifier le RDV' : 'Nouveau rendez-vous'}</span>
              <button className="closeBtn" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modalBody">
              <div className="fg">
                <label className="fl">Patient</label>
                <input className="fi" value={form.patient_nom} list="pat-list"
                  onChange={e => setForm({...form, patient_nom: e.target.value})} placeholder="Nom du patient…" />
                <datalist id="pat-list">
                  {patients.map(p => <option key={p.id} value={`${p.prenom} ${p.nom}`} />)}
                </datalist>
              </div>
              <div className="frow">
                <div className="fg">
                  <label className="fl">Date</label>
                  <input className="fi" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                </div>
                <div className="fg">
                  <label className="fl">Heure</label>
                  <input className="fi" type="time" value={form.heure} onChange={e => setForm({...form, heure: e.target.value})} />
                </div>
              </div>
              <div className="frow">
                <div className="fg">
                  <label className="fl">Durée</label>
                  <select className="fi" value={form.duree} onChange={e => setForm({...form, duree: parseInt(e.target.value)})}>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>1h</option>
                    <option value={90}>1h30</option>
                  </select>
                </div>
                <div className="fg">
                  <label className="fl">Motif</label>
                  <input className="fi" value={form.motif} onChange={e => setForm({...form, motif: e.target.value})} placeholder="Motif…" />
                </div>
              </div>
              <div className="fg">
                <label className="fl">Type</label>
                <div className="typeGrid">
                  {Object.entries(TYPES).map(([k,v]) => (
                    <div key={k} className={selType===k ? "typeOpt typeOptSel" : "typeOpt"} onClick={() => setSelType(k)}>
                      <div style={{width:9, height:9, borderRadius:'50%', background:v.border, flexShrink:0}}></div>
                      {v.label}
                    </div>
                  ))}
                </div>
              </div>
              <div className="fg">
                <label className="fl">Notes</label>
                <input className="fi" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Notes…" />
              </div>
            </div>
            <div className="modalFoot">
              {editRdv && <button className="dangerBtn" onClick={() => deleteRdv(editRdv.id)}>Supprimer</button>}
              <button className="cancelBtn" onClick={() => setModal(false)}>Annuler</button>
              <button className="saveBtn" onClick={saveRdv}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}