import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import './Agenda.css'

const TYPES = {
  bilan:       { label:'Bilan initial',     bg:'#EBF2F9', border:'#185FA5', bb:'#185FA5' },
  reeducation: { label:'Rééducation',       bg:'#E8F5EE', border:'#1D9E75', bb:'#1D9E75' },
  suivi:       { label:'Suivi',             bg:'#FEF3E2', border:'#E89020', bb:'#E89020' },
  tele:        { label:'Téléconsultation',  bg:'#F7F0FB', border:'#7B5EA7', bb:'#7B5EA7' },
}
const HOURS  = ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00']
const DAYS   = ['Lun','Mar','Mer','Jeu','Ven','Sam']
const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const MOTIFS = ['Aphasie post-AVC','Bégaiement','Retard de langage','Trisomie 21','Dyslexie / Dysorthographie','TSA (Autisme)','Dysphagie','Dysphonie','Autre']

function fmt(d){ return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate()) }
function p2(n){ return String(n).padStart(2,'0') }
function addDays(d,n){ let x=new Date(d); x.setDate(x.getDate()+n); return x }
function getMonday(d){ let dt=new Date(d),day=dt.getDay(),diff=day===0?-6:1-day; dt.setDate(dt.getDate()+diff); dt.setHours(0,0,0,0); return dt }
function t2m(t){ const [h,m]=t.split(':').map(Number); return h*60+m }

function formatDateFr(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  const mois = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre']
  return `${parseInt(d)} ${mois[parseInt(m)-1]} ${y}`
}

function cleanPhone(tel) {
  if (!tel) return null
  // Normalise le numéro : supprime espaces, tirets, parenthèses
  let n = tel.replace(/[\s\-().]/g, '')
  // Maroc : 06XXXXXXXX → 2126XXXXXXXX
  if (n.startsWith('0') && n.length === 10) n = '212' + n.slice(1)
  // +212... → 212...
  if (n.startsWith('+')) n = n.slice(1)
  return n
}

function buildWhatsAppLink(rdv, patients) {
  // Cherche le patient par nom pour récupérer son téléphone
  const patient = patients.find(p =>
    `${p.prenom} ${p.nom}`.toLowerCase() === rdv.patient_nom?.toLowerCase()
  )
  const phone = cleanPhone(patient?.tel)

  const dateFr  = formatDateFr(rdv.date)
  const typeLabel = (TYPES[rdv.type] || TYPES.bilan).label

  const message = `Bonjour ${rdv.patient_nom},\n\nVotre séance d'orthophonie (${typeLabel}) est prévue le *${dateFr}* à *${rdv.heure}* pour une durée de *${rdv.duree} min*.\n\nMerci de confirmer votre présence ou de nous contacter en cas d'empêchement.\n\nCordialement,`

  const encoded = encodeURIComponent(message)

  if (phone) {
    return `https://wa.me/${phone}?text=${encoded}`
  } else {
    // Pas de numéro → ouvre WhatsApp sans destinataire (l'ortho choisit)
    return `https://wa.me/?text=${encoded}`
  }
}

function WhatsAppBtn({ rdv, patients, style = {} }) {
  const link = buildWhatsAppLink(rdv, patients)
  const patient = patients.find(p =>
    `${p.prenom} ${p.nom}`.toLowerCase() === rdv.patient_nom?.toLowerCase()
  )
  const hasPhone = !!cleanPhone(patient?.tel)

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      title={hasPhone ? `Envoyer un rappel WhatsApp à ${rdv.patient_nom}` : 'Numéro absent — WhatsApp s\'ouvrira sans destinataire'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '7px 13px',
        background: hasPhone ? '#25D366' : '#8A9BB0',
        color: '#fff',
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 700,
        textDecoration: 'none',
        fontFamily: 'DM Sans, sans-serif',
        whiteSpace: 'nowrap',
        ...style,
      }}
      onClick={e => e.stopPropagation()}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
      {hasPhone ? 'Rappel WhatsApp' : 'WhatsApp (sans n°)'}
    </a>
  )
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
  const [newPatModal, setNewPatModal] = useState(false)
  const [newPatForm, setNewPatForm]   = useState({ prenom:'', nom:'', dob:'', sexe:'', motif:'' })
  const [savingPat, setSavingPat]     = useState(false)

  const isMobile = useIsMobile()

  useEffect(() => { fetchRdvs(); fetchPatients() }, [])

  async function fetchRdvs() {
    setLoading(true)
    const { data } = await supabase.from('rendez_vous').select('*').order('date').order('heure')
    setRdvs(data || [])
    setLoading(false)
  }

  async function fetchPatients() {
    // On récupère aussi le téléphone pour générer les liens WhatsApp
    const { data } = await supabase.from('patients').select('id, prenom, nom, tel')
    setPatients(data || [])
  }

  async function createNewPatient() {
    if (!newPatForm.prenom && !newPatForm.nom) return
    setSavingPat(true)
    const { data } = await supabase.from('patients').insert({
      prenom:  newPatForm.prenom,
      nom:     newPatForm.nom,
      dob:     newPatForm.dob   || null,
      sexe:    newPatForm.sexe  || null,
      motif:   newPatForm.motif || null,
      statut:  'actif',
      user_id: session.user.id,
    }).select().single()
    if (data) {
      await fetchPatients()
      setForm(f => ({ ...f, patient_nom: `${data.prenom} ${data.nom}` }))
    }
    setSavingPat(false)
    setNewPatModal(false)
    setNewPatForm({ prenom:'', nom:'', dob:'', sexe:'', motif:'' })
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

  const weekDays = Array.from({length:6}, (_,i) => addDays(weekStart,i))
  const weekEnd  = addDays(weekStart,5)
  const todayStr = fmt(new Date())
  const weekRdvs = rdvs.filter(r => r.date >= fmt(weekStart) && r.date <= fmt(weekEnd))

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
              <div className={ds===todayStr ? "whToday" : "whNum"}>{d.getDate()}</div>
              {cnt > 0 && <div className="whCnt">{cnt}</div>}
            </div>
          )
        })}
      </div>

      {/* GRID */}
      <div className="gridWrap">
        <div className="grid">
          <div className="timeCol">
            {HOURS.map(h => <div key={h} className="tSlot">{h.endsWith(':00') ? h : ''}</div>)}
          </div>
          {weekDays.map((d,i) => {
            const ds = fmt(d)
            const dayRdvs = rdvs.filter(r => r.date === ds)
            return (
              <div key={i} className="dayCol">
                {HOURS.map(h => (
                  <div key={h} className="dSlot" style={h.endsWith(':30') ? {borderBottom:'1px dashed rgba(0,0,0,0.05)'} : {}}
                    onClick={e => { e.stopPropagation(); openNew(ds, h) }} />
                ))}
                {dayRdvs.map(rdv => {
                  const top = ((t2m(rdv.heure) - 480) / 30) * 56
                  const ht  = Math.max((rdv.duree / 30) * 56 - 4, 22)
                  const t   = TYPES[rdv.type] || TYPES.bilan
                  return (
                    <div key={rdv.id} className="rdvCard"
                      style={{top, height:ht, background:t.bg, borderLeftColor:t.border}}
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
          <div className="popupBadge" style={{background:(TYPES[popup.type]||TYPES.bilan).bb}}>
            {(TYPES[popup.type]||TYPES.bilan).label}
          </div>
          <div className="popupName">{popup.patient_nom}</div>
          <div className="popupMeta">🕐 {popup.heure} · {popup.duree} min</div>
          <div className="popupMeta">📅 {formatDateFr(popup.date)}</div>
          <div className="popupMeta">📋 {popup.motif || '—'}</div>
          {popup.notes && <div className="popupMeta">📝 {popup.notes}</div>}
          <div className="popupActions">
            <button className="popupEdit" onClick={() => openEdit(popup)}>✏️ Modifier</button>
            <button className="popupDel"  onClick={() => deleteRdv(popup.id)}>🗑 Supprimer</button>
          </div>
          {/* Bouton WhatsApp dans le popup */}
          <div style={{marginTop:10, borderTop:'1px solid rgba(0,0,0,0.08)', paddingTop:10}}>
            <WhatsAppBtn rdv={popup} patients={patients} style={{width:'100%', justifyContent:'center'}} />
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

              {/* Patient */}
              <div className="fg">
                <label className="fl">Patient</label>
                <div style={{display:'flex', gap:8}}>
                  <input className="fi" value={form.patient_nom} list="pat-list"
                    onChange={e => setForm({...form, patient_nom: e.target.value})}
                    placeholder="Rechercher un patient…"
                    style={{flex:1}} />
                  <button type="button"
                    onClick={() => { setModal(false); setNewPatModal(true) }}
                    style={{
                      padding:'0 14px', background:'rgb(201,168,76)', color:'#fff',
                      border:'none', borderRadius:8, fontSize:12, fontWeight:700,
                      cursor:'pointer', whiteSpace:'nowrap', flexShrink:0
                    }}>
                    + Nouveau patient
                  </button>
                </div>
                <datalist id="pat-list">
                  {patients.map(p => <option key={p.id} value={`${p.prenom} ${p.nom}`} />)}
                </datalist>
              </div>

              <div className="frow">
                <div className="fg">
                  <label className="fl">Date</label>
                  <input className="fi" type="date" value={form.date} onChange={e => setForm({...form, date:e.target.value})} />
                </div>
                <div className="fg">
                  <label className="fl">Heure</label>
                  <input className="fi" type="time" value={form.heure} onChange={e => setForm({...form, heure:e.target.value})} />
                </div>
              </div>
              <div className="frow">
                <div className="fg">
                  <label className="fl">Durée</label>
                  <select className="fi" value={form.duree} onChange={e => setForm({...form, duree:parseInt(e.target.value)})}>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>1h</option>
                    <option value={90}>1h30</option>
                  </select>
                </div>
                <div className="fg">
                  <label className="fl">Motif</label>
                  <input className="fi" value={form.motif} onChange={e => setForm({...form, motif:e.target.value})} placeholder="Motif…" />
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
                <input className="fi" value={form.notes} onChange={e => setForm({...form, notes:e.target.value})} placeholder="Notes…" />
              </div>

              {/* Bouton WhatsApp dans le modal édition */}
              {editRdv && form.patient_nom && form.date && (
                <div style={{padding:'10px 0 2px', borderTop:'1px solid #DDE5EF'}}>
                  <div style={{fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'#8A9BB0', marginBottom:8}}>
                    Rappel patient
                  </div>
                  <WhatsAppBtn
                    rdv={{ ...editRdv, ...form, type: selType }}
                    patients={patients}
                  />
                  {!cleanPhone(patients.find(p => `${p.prenom} ${p.nom}`.toLowerCase() === form.patient_nom.toLowerCase())?.tel) && (
                    <div style={{fontSize:11, color:'#8A9BB0', marginTop:5, fontStyle:'italic'}}>
                      💡 Ajoutez un téléphone dans la fiche patient pour envoyer directement.
                    </div>
                  )}
                </div>
              )}

            </div>
            <div className="modalFoot">
              {editRdv && <button className="dangerBtn" onClick={() => deleteRdv(editRdv.id)}>Supprimer</button>}
              <button className="cancelBtn" onClick={() => setModal(false)}>Annuler</button>
              <button className="saveBtn" onClick={saveRdv}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOUVEAU PATIENT */}
      {newPatModal && (
        <div className="overlay" onClick={() => { setNewPatModal(false); setModal(true) }}>
          <div className="modalBox" onClick={e => e.stopPropagation()} style={{maxWidth:440}}>
            <div className="modalHead">
              <span className="modalTitle">Nouveau patient</span>
              <button className="closeBtn" onClick={() => { setNewPatModal(false); setModal(true) }}>✕</button>
            </div>
            <div className="modalBody">
              <div className="frow">
                <div className="fg">
                  <label className="fl">Prénom *</label>
                  <input className="fi" value={newPatForm.prenom} autoFocus
                    onChange={e => setNewPatForm({...newPatForm, prenom:e.target.value})}
                    placeholder="Prénom…" />
                </div>
                <div className="fg">
                  <label className="fl">Nom *</label>
                  <input className="fi" value={newPatForm.nom}
                    onChange={e => setNewPatForm({...newPatForm, nom:e.target.value})}
                    placeholder="Nom…" />
                </div>
              </div>
              <div className="frow">
                <div className="fg">
                  <label className="fl">Date de naissance</label>
                  <input className="fi" type="date" value={newPatForm.dob}
                    onChange={e => setNewPatForm({...newPatForm, dob:e.target.value})} />
                </div>
                <div className="fg">
                  <label className="fl">Sexe</label>
                  <select className="fi" value={newPatForm.sexe}
                    onChange={e => setNewPatForm({...newPatForm, sexe:e.target.value})}>
                    <option value="">—</option>
                    <option value="F">Féminin</option>
                    <option value="M">Masculin</option>
                  </select>
                </div>
              </div>
              <div className="fg">
                <label className="fl">Motif principal</label>
                <select className="fi" value={newPatForm.motif}
                  onChange={e => setNewPatForm({...newPatForm, motif:e.target.value})}>
                  <option value="">Sélectionner…</option>
                  {MOTIFS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div style={{fontSize:11, color:'#8A9BB0', fontStyle:'italic'}}>
                * Champs obligatoires. Les autres informations peuvent être complétées depuis le module Patients.
              </div>
            </div>
            <div className="modalFoot">
              <button className="cancelBtn" onClick={() => { setNewPatModal(false); setModal(true) }}>
                ← Retour au RDV
              </button>
              <button className="saveBtn"
                onClick={createNewPatient}
                disabled={savingPat || (!newPatForm.prenom && !newPatForm.nom)}>
                {savingPat ? 'Création…' : 'Créer le patient'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}