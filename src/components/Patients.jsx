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
const COLORS = ['#185FA5','#1D9E75','#C9A84C','#7B5EA7','#C0392B','#0C447C','#D4884A']
const ORANGE = '#C9A84C'

const HUMEURS = [
  { value:'très bien',     label:'😊 Très bien',      color:'#1D7A5A', bg:'#E8F5EE' },
  { value:'bien',          label:'🙂 Bien',            color:'#185FA5', bg:'#EBF2F9' },
  { value:'difficile',     label:'😐 Difficile',       color:'#8B5A00', bg:'#FEF3E2' },
  { value:'très difficile',label:'😔 Très difficile',  color:'#C0392B', bg:'#FCEBEB' },
]

const TYPES_LABEL = { bilan:'Bilan initial', reeducation:'Rééducation', suivi:'Suivi', tele:'Téléconsultation' }
const TYPES_COLOR = { bilan:'#185FA5', reeducation:'#1D9E75', suivi:'#C9A84C', tele:'#7B5EA7' }
const FACTURE_TYPES = ['Bilan initial', 'Suivi', 'Téléconsultation', 'Autre']
const SESSION_TARIFFS = [200, 250, 300]

const PAGE_SIZE  = 5
const EMPTY_NOTE = { observations:'', exercices:'', humeur:'', objectifs_prochaine:'', paye:false, date_seance:'', tarif: 200 }
const EMPTY_FORM = {
  prenom:'', nom:'', dob:'', sexe:'', cin:'',
  tel:'', email:'', adresse:'',
  motif:[], motif_autre:'', statut:'actif', medecin:'', mutuelle:'',
  notes:'', urgnom:'', urgtel:''
}
const EMPTY_PAYMENT = { montant:'', date:new Date().toISOString().slice(0,10), mode:'cash', note:'', note_seance_id:'' }

function formatMoney(value) {
  const num = Number(value || 0)
  return `${num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD`
}

function parseMotifs(value) {
  if (!value) return []
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean)
  return String(value).split(',').map(v => v.trim()).filter(Boolean)
}

function parseMotifsForForm(value) {
  const list = parseMotifs(value)
  const known = list.filter(item => MOTIFS.includes(item))
  const custom = list.filter(item => !MOTIFS.includes(item)).join(', ')
  return { selected: known, custom }
}

function formatMotifs(value) {
  return parseMotifs(value).join(', ')
}

function buildMotifValue(selected, custom) {
  const cleaned = Array.isArray(selected) ? selected.filter(Boolean) : []
  const customValues = String(custom || '').split(',').map(v => v.trim()).filter(Boolean)
  const values = customValues.length > 0
    ? [...cleaned.filter(item => item !== 'Autre'), ...customValues]
    : [...cleaned]
  if (!values.length) return ''
  return values.join(', ')
}

function initials(prenom, nom) { return ((prenom?.[0]||'')+(nom?.[0]||'')).toUpperCase() }
function patColor(id) { return COLORS[id % COLORS.length] }
function calcAge(dob) {
  if (!dob) return null
  const d=new Date(dob), now=new Date()
  let a=now.getFullYear()-d.getFullYear()
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) a--
  return a
}
function formatDateFr(dateStr) {
  if (!dateStr) return ''
  const mois=['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc']
  const [y,m,d]=dateStr.split('-')
  return `${parseInt(d)} ${mois[parseInt(m)-1]} ${y}`
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 700)
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 700)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return isMobile
}

export default function Patients({ session }) {
  const [patients, setPatients]     = useState([])
  const [rdvs, setRdvs]             = useState([])
  const [bilans, setBilans]         = useState([])
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
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [activeTab, setActiveTab]   = useState('infos')
  const [payments, setPayments] = useState([])
  const [paymentModal, setPaymentModal] = useState(false)
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT)
  const [editingPayment, setEditingPayment] = useState(null)
  const [paymentSaving, setPaymentSaving] = useState(false)
  const [paymentDeleting, setPaymentDeleting] = useState(false)
  const [confirmDeletePayment, setConfirmDeletePayment] = useState(false)
  const [paymentToDelete, setPaymentToDelete] = useState(null)
  const [invoiceModal, setInvoiceModal] = useState(false)
  const [invoiceForm, setInvoiceForm] = useState({
    date_seance: new Date().toISOString().slice(0, 10),
    type_seance: 'Suivi',
    montant: '',
    tarif: 200,
    statut_paiement: 'impayé',
    moyen_paiement: '',
    notes_paiement: ''
  })

  // Notes
  const [notes, setNotes]                   = useState([])
  const [notesLoading, setNotesLoading]     = useState(false)
  const [noteModal, setNoteModal]           = useState(false)
  const [noteValidationModal, setNoteValidationModal] = useState(false)
  const [noteValidationMessage, setNoteValidationMessage] = useState('')
  const [editNote, setEditNote]             = useState(null)
  const [noteForm, setNoteForm]             = useState(EMPTY_NOTE)
  const [noteRdvId, setNoteRdvId]           = useState(null)   // RDV auquel on attache la note
  const [noteSaving, setNoteSaving]         = useState(false)
  const [confirmDeleteNote, setConfirmDeleteNote] = useState(false)
  const [noteToDelete, setNoteToDelete]     = useState(null)

  const isMobile = useIsMobile()

  useEffect(() => { fetchPatients(); fetchRdvs(); fetchBilans() }, [])
  useEffect(() => { setPage(1) }, [search, filter])
  useEffect(() => {
    if (selectedId) {
      fetchNotes(selectedId)
      fetchPayments(selectedId)
    } else {
      setNotes([])
      setPayments([])
    }
  }, [selectedId])

  async function fetchPatients() {
    setLoading(true)
    const { data } = await supabase.from('patients').select('*').order('nom')
    setPatients(data || [])
    setLoading(false)
  }
  async function fetchRdvs() {
    const { data } = await supabase.from('rendez_vous').select('*').order('date', { ascending:false })
    setRdvs(data || [])
  }
  async function fetchBilans() {
    const { data } = await supabase.from('bilans').select('patient_id')
    setBilans(data || [])
  }
  async function fetchNotes(patientId) {
    setNotesLoading(true)
    const { data } = await supabase
      .from('notes_seance').select('*')
      .eq('patient_id', patientId)
      .order('date_seance', { ascending:false })
    setNotes(data || [])
    setNotesLoading(false)
  }

  async function fetchPayments(patientId) {
    const { data } = await supabase
      .from('paiements')
      .select('*')
      .eq('patient_id', patientId)
      .order('date_paiement', { ascending:false })
    setPayments(data || [])
  }

  async function refreshSessionPaymentStatus(noteSessionId) {
    const linkedSession = notes.find(note => String(note.id) === String(noteSessionId))
    if (!linkedSession) return null

    const { data: linkedPayments, error: linkedPaymentsError } = await supabase
      .from('paiements')
      .select('montant')
      .eq('note_seance_id', String(linkedSession.id))

    if (linkedPaymentsError) return linkedPaymentsError

    const paidAmount = linkedPayments.reduce((sum, payment) => sum + Number(payment.montant || 0), 0)
    const { error } = await supabase
      .from('notes_seance')
      .update({ paye: paidAmount >= Number(linkedSession.tarif || 200) })
      .eq('id', linkedSession.id)

    return error
  }

  async function savePayment() {
    if (!selectedId) return
    if (notes.length === 0) {
      alert('Impossible d’enregistrer un paiement sans séance enregistrée pour ce patient.')
      return
    }
    const linkedSession = notes.find(note => String(note.id) === String(paymentForm.note_seance_id))
    if (!linkedSession || String(linkedSession.patient_id) !== String(selectedId)) {
      alert('Sélectionnez une séance enregistrée pour ce patient avant d’ajouter un paiement.')
      return
    }

    const montant = Number(paymentForm.montant)
    if (!paymentForm.date || !montant || montant <= 0) {
      alert('La date et le montant du paiement sont obligatoires.')
      return
    }
    setPaymentSaving(true)
    const payload = {
      patient_id: selectedId,
      user_id: session.user.id,
      montant,
      date_paiement: paymentForm.date,
      mode_paiement: paymentForm.mode,
      note: paymentForm.note || '',
      note_seance_id: String(linkedSession.id),
    }
    const previousSessionId = editingPayment?.note_seance_id
    const result = editingPayment
      ? await supabase
        .from('paiements')
        .update(payload)
        .eq('id', editingPayment.id)
        .eq('patient_id', selectedId)
      : await supabase.from('paiements').insert(payload)
    const { error } = result
    setPaymentSaving(false)
    if (error) {
      console.error(`Erreur ${editingPayment ? 'modification' : 'insertion'} paiement:`, error)
      alert(`Le paiement n’a pas été ${editingPayment ? 'modifié' : 'enregistré'}. Vérifie la table paiements et les règles RLS.\n\n${error.message}`)
      return
    }

    setPaymentModal(false)
    setEditingPayment(null)
    setPaymentForm({ ...EMPTY_PAYMENT, date: new Date().toISOString().slice(0, 10) })
    const affectedSessionIds = new Set([previousSessionId, String(linkedSession.id)].filter(Boolean))
    let sessionUpdateError = null
    for (const noteSessionId of affectedSessionIds) {
      const error = await refreshSessionPaymentStatus(noteSessionId)
      if (error) {
        sessionUpdateError = error
        break
      }
    }

    if (sessionUpdateError) {
      console.error('Erreur de mise à jour du statut de séance:', sessionUpdateError)
      alert(`Paiement ${editingPayment ? 'modifié' : 'enregistré'}, mais le statut de la séance n’a pas pu être actualisé.\n\n${sessionUpdateError.message}`)
    }

    await fetchPayments(selectedId)
    await fetchNotes(selectedId)
  }

  function openEditPayment(payment) {
    setEditingPayment(payment)
    setPaymentForm({
      montant: String(payment.montant ?? ''),
      date: payment.date_paiement || new Date().toISOString().slice(0, 10),
      mode: payment.mode_paiement || 'cash',
      note: payment.note || '',
      note_seance_id: payment.note_seance_id
        ? String(payment.note_seance_id)
        : String(notes.find(note => !note.paye)?.id || notes[0]?.id || ''),
    })
    setPaymentModal(true)
  }

  function closePaymentModal() {
    if (paymentSaving) return
    setPaymentModal(false)
    setEditingPayment(null)
    setPaymentForm({ ...EMPTY_PAYMENT, date: new Date().toISOString().slice(0, 10) })
  }

  async function deletePayment() {
    if (!paymentToDelete) return
    setPaymentDeleting(true)

    const { error } = await supabase
      .from('paiements')
      .delete()
      .eq('id', paymentToDelete.id)

    if (error) {
      setPaymentDeleting(false)
      console.error('Erreur suppression paiement:', error)
      alert(`Le paiement n’a pas été supprimé.\n\n${error.message}`)
      return
    }

    let sessionUpdateError = null
    if (paymentToDelete.note_seance_id) {
      sessionUpdateError = await refreshSessionPaymentStatus(paymentToDelete.note_seance_id)
    }

    setPaymentDeleting(false)
    setConfirmDeletePayment(false)
    setPaymentToDelete(null)
    await fetchPayments(selectedId)
    await fetchNotes(selectedId)

    if (sessionUpdateError) {
      console.error('Erreur de mise à jour du statut de séance après suppression:', sessionUpdateError)
      alert(`Paiement supprimé, mais le statut de la séance n’a pas pu être actualisé.\n\n${sessionUpdateError.message}`)
    }
  }

  function openPaymentModal() {
    if (!selectedId || notes.length === 0) {
      alert('Ajoutez d’abord une séance au dossier de ce patient avant d’enregistrer un paiement.')
      return
    }
    const firstUnpaidSession = notes.find(note => !note.paye)
    setPaymentForm({
      ...EMPTY_PAYMENT,
      date: new Date().toISOString().slice(0, 10),
      note_seance_id: String((firstUnpaidSession || notes[0]).id),
    })
    setEditingPayment(null)
    setPaymentModal(true)
  }

  function openInvoiceModal() {
    if (!selected) return
    const lastNoteTarif = Number(notes.filter(n => Number(n.tarif) > 0).slice(-1)[0]?.tarif || 200)
    const amount = Math.max(Number(resteAPayer || 0), 0)
    setInvoiceForm({
      date_seance: new Date().toISOString().slice(0, 10),
      type_seance: 'Suivi',
      montant: amount > 0 ? String(amount.toFixed(2)) : '',
      tarif: lastNoteTarif,
      statut_paiement: amount > 0 ? 'impayé' : 'payé',
      moyen_paiement: '',
      notes_paiement: amount > 0 ? 'Facture générée depuis le solde patient.' : 'Règlement complet.'
    })
    setInvoiceModal(true)
  }

  async function saveInvoice() {
    if (!selectedId || !selected) return
    const montant = Number(invoiceForm.montant)
    if (!invoiceForm.date_seance || !invoiceForm.type_seance || !montant || montant <= 0) {
      alert('La date, le type d’acte et le montant de la facture sont obligatoires.')
      return
    }

    const payload = {
      orthophoniste_id: session.user.id,
      patient_id: selectedId,
      patient_nom: `${selected.prenom || ''} ${selected.nom || ''}`.trim(),
      date_seance: invoiceForm.date_seance,
      type_seance: invoiceForm.type_seance,
      montant,
      tarif: Number(invoiceForm.tarif || 200),
      statut_paiement: invoiceForm.statut_paiement,
      moyen_paiement: invoiceForm.moyen_paiement || '',
      notes_paiement: invoiceForm.notes_paiement || '',
    }

    await supabase.from('factures').insert(payload)
    setInvoiceModal(false)
    setInvoiceForm({
      date_seance: new Date().toISOString().slice(0, 10),
      type_seance: 'Suivi',
      montant: '',
      tarif: 200,
      statut_paiement: 'impayé',
      moyen_paiement: '',
      notes_paiement: ''
    })
  }

  // ── Notes CRUD ───────────────────────────────────────────────────────────────

  function openNewNote(rdv) {
    const defaultTarif = Number(payments.filter(p => Number(p.tarif) > 0).slice(-1)[0]?.tarif || 200)
    setEditNote(null)
    setNoteRdvId(rdv?.id ?? null)
    setNoteForm({ ...EMPTY_NOTE, paye: false, date_seance: rdv?.date || '', tarif: defaultTarif })
    setNoteModal(true)
  }

  function openEditNote(note) {
    const defaultTarif = Number(payments.filter(p => Number(p.tarif) > 0).slice(-1)[0]?.tarif || 200)
    setEditNote(note)
    setNoteRdvId(note.rendez_vous_id)
    setNoteForm({
      observations:        note.observations || '',
      exercices:           note.exercices || '',
      humeur:              note.humeur || '',
      objectifs_prochaine: note.objectifs_prochaine || '',
      paye:                Boolean(note.paye),
      date_seance:         note.date_seance || '',
      tarif:               Number(note.tarif || defaultTarif || 200),
    })
    setNoteModal(true)
  }

  async function saveNote() {
    const requiredMissing = []
    if (!noteForm.date_seance) requiredMissing.push('Date de séance')
    if (!noteForm.tarif && Number(noteForm.tarif) !== 0) requiredMissing.push('Tarif de séance')
    if (!noteForm.observations?.trim()) requiredMissing.push('Observations')
    if (!noteForm.exercices?.trim()) requiredMissing.push('Exercices réalisés')
    if (!noteForm.objectifs_prochaine?.trim()) requiredMissing.push('Objectifs prochaine séance')
    if (!selectedId) requiredMissing.push('Patient sélectionné')

    if (requiredMissing.length > 0) {
      setNoteValidationMessage(`Veuillez remplir les champs suivants :\n• ${requiredMissing.join('\n• ')}`)
      setNoteValidationModal(true)
      return
    }

    setNoteSaving(true)
    const payload = {
      ...noteForm,
      paye: Boolean(noteForm.paye),
      tarif: Number(noteForm.tarif || 200),
      patient_id: selectedId,
      rendez_vous_id: noteRdvId,
      user_id: session.user.id,
    }

    const legacyPayload = { ...payload }
    delete legacyPayload.tarif
    delete legacyPayload.paye

    let result
    if (editNote) {
      result = await supabase.from('notes_seance').update(payload).eq('id', editNote.id)
      if (result?.error && /tarif|paye|column/i.test(result.error.message)) {
        result = await supabase.from('notes_seance').update(legacyPayload).eq('id', editNote.id)
      }
    } else {
      result = await supabase.from('notes_seance').insert(payload)
      if (result?.error && /tarif|paye|column/i.test(result.error.message)) {
        result = await supabase.from('notes_seance').insert(legacyPayload)
      }
    }

    setNoteSaving(false)

    if (result?.error) {
      console.error('Erreur enregistrement note de séance:', result.error)
      alert(`La note de séance n’a pas été enregistrée.\n\n${result.error.message}`)
      return
    }

    setNoteModal(false)
    setEditNote(null)
    setNoteRdvId(null)
    setNoteForm(EMPTY_NOTE)
    await fetchNotes(selectedId)
    await fetchPayments(selectedId)
  }

  async function deleteNote() {
    if (!noteToDelete) return

    const { error } = await supabase.from('notes_seance').delete().eq('id', noteToDelete.id)
    if (error) {
      console.error('Erreur suppression note:', error)
      alert(`La note n’a pas été supprimée.\n\n${error.message}`)
      return
    }

    setConfirmDeleteNote(false)
    setNoteToDelete(null)
    setNoteRdvId(null)
    await fetchNotes(selectedId)
    await fetchPayments(selectedId)
  }

  // ── Export ───────────────────────────────────────────────────────────────────

  function escapeCsv(v) {
    if (v===null||v===undefined) return ''
    const s=String(v)
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s
  }

  async function exportPatientsCSV() {
    const rows = filtered.map(p => {
      const rdvCount   = rdvs.filter(r=>r.patient_nom===p.prenom+' '+p.nom).length
      const bilanCount = bilans.filter(b=>b.patient_id===p.id).length
      return [p.prenom,p.nom,p.motif||'',STATUTS[p.statut]||'',rdvCount,bilanCount].map(escapeCsv).join(';')
    })
    const header=['Prénom','Nom','Motif','Statut','Séances','Bilans'].map(escapeCsv).join(';')
    const csv='\uFEFF'+[header,...rows].join('\r\n')
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'})
    const url=URL.createObjectURL(blob)
    const a=document.createElement('a'); a.href=url; a.download=`Patients_${new Date().toISOString().slice(0,10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  async function loadJsPDF() {
    if (!window.jspdf) {
      await new Promise((res,rej)=>{ const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'; s.onload=res; s.onerror=rej; document.head.appendChild(s) })
    }
    if (!window.jspdf?.jsPDF?.API?.autoTable) {
      await new Promise((res,rej)=>{ const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'; s.onload=res; s.onerror=rej; document.head.appendChild(s) })
    }
    return window.jspdf.jsPDF
  }

  function hexToRgb(hex, fallback) {
    if (!hex || typeof hex !== 'string') return fallback
    const cleaned = hex.replace('#', '')
    if (![3, 6].includes(cleaned.length)) return fallback
    const normalized = cleaned.length === 3
      ? cleaned.split('').map(c => c + c).join('')
      : cleaned
    const int = parseInt(normalized, 16)
    if (Number.isNaN(int)) return fallback
    return [(int >> 16) & 255, (int >> 8) & 255, int & 255]
  }

  async function loadImageDataUrl(url) {
    if (!url) return null
    return new Promise(resolve => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth || 100
        canvas.height = img.naturalHeight || 100
        const ctx = canvas.getContext('2d')
        if (!ctx) return resolve(null)
        ctx.drawImage(img, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = () => resolve(null)
      img.src = url
    })
  }

  async function exportPatientsPDF() {
    const jsPDF=await loadJsPDF()
    const {data:profil}=await supabase.from('profiles').select('prenom,nom,nom_cabinet,telephone,adresse,ville,code_postal,pays,couleur_principale,couleur_texte,logo_url').eq('id',session.user.id).single()
    const nomOrtho=profil?`${profil.prenom||''} ${profil.nom||''}`.trim():''
    const nomCabinet=profil?.nom_cabinet||''
    const telephone=profil?.telephone||''
    const ligneAdresse=[profil?.adresse,[profil?.code_postal,profil?.ville].filter(Boolean).join(' '),profil?.pays&&profil.pays!=='Maroc'?profil.pays:''].filter(Boolean).join(' — ')
    const doc=new jsPDF({unit:'mm',format:'a4'})
    const W=210,ML=14,MR=14,BLEU=[12,68,124],GRIS=[138,155,176],NOIR=[26,39,68]
    const headerFill=hexToRgb(profil?.couleur_principale||'#0C447C',BLEU)
    const headerText=hexToRgb(profil?.couleur_texte||'#FFFFFF',[255,255,255])
    const logoData=profil?.logo_url?await loadImageDataUrl(profil.logo_url):null
    const logoSize=24
    const titleX=logoData?ML+logoSize+6:ML

    doc.setFillColor(...headerFill); doc.rect(0,0,W,30,'F')
    if(logoData){try{doc.addImage(logoData,'PNG',ML,4,logoSize,logoSize)}catch(e){}}
    doc.setTextColor(...headerText); doc.setFont('helvetica','bold'); doc.setFontSize(18)
    doc.text('Liste des patients',titleX,12,{maxWidth:W-MR-titleX})
    if(nomCabinet||nomOrtho){doc.setFontSize(10);doc.text(nomCabinet||nomOrtho,titleX,21,{maxWidth:W-MR-titleX})}
    doc.setFont('helvetica','normal');doc.setFontSize(9)
    doc.text(`Date : ${new Date().toLocaleDateString('fr-FR')}`,W-MR,12,{align:'right'})
    doc.setTextColor(...headerText);doc.text('Export patients',W-MR,19,{align:'right'})
    const rows=filtered.map(p=>{
      const rdvCount=rdvs.filter(r=>r.patient_nom===p.prenom+' '+p.nom).length
      const bilanCount=bilans.filter(b=>b.patient_id===p.id).length
      return[p.prenom,p.nom,p.motif||'',STATUTS[p.statut]||'',rdvCount,bilanCount]
    })
    doc.autoTable({startY:34,margin:{left:ML,right:MR},head:[['Prénom','Nom','Motif','Statut','Séances','Bilans']],body:rows,theme:'striped',headStyles:{fillColor:headerFill,textColor:headerText,fontStyle:'bold',halign:'center'},styles:{fontSize:9,cellPadding:3,textColor:NOIR},columnStyles:{0:{cellWidth:28},1:{cellWidth:28},2:{cellWidth:52},3:{cellWidth:26,halign:'center'},4:{cellWidth:18,halign:'center'},5:{cellWidth:18,halign:'center'}}})
    const totalPages=doc.getNumberOfPages()
    const footerText=[nomCabinet||nomOrtho,ligneAdresse,telephone].filter(Boolean).join(' · ')
    for(let i=1;i<=totalPages;i++){
      doc.setPage(i);doc.setFillColor(...headerFill);doc.rect(0,290,W,7,'F')
      doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(...headerText)
      if(footerText)doc.text(footerText,ML,294.5)
      doc.text(`Page ${i}/${totalPages}`,W-MR,294.5,{align:'right'})
    }
    doc.save(`Patients_${new Date().toISOString().slice(0,10)}.pdf`)
  }

  // ── Patients CRUD ────────────────────────────────────────────────────────────

  async function savePatient() {
    if (!form.prenom||!form.nom){alert('Prénom et nom sont obligatoires.');return}
    setSaving(true)
    const payload={
      ...form,
      motif: buildMotifValue(form.motif, form.motif_autre),
      user_id:session.user.id,
    }
    delete payload.motif_autre
    if(editPat){await supabase.from('patients').update(payload).eq('id',editPat.id)}
    else{await supabase.from('patients').insert(payload)}
    setSaving(false);setModal(false);setEditPat(null);setForm(EMPTY_FORM)
    await fetchPatients()
    if(editPat)setSelectedId(editPat.id)
  }

  function openNew(){setEditPat(null);setForm(EMPTY_FORM);setModal(true)}
  function openEdit(p){
    const parsed = parseMotifsForForm(p.motif)
    setEditPat(p)
    setForm({prenom:p.prenom||'',nom:p.nom||'',dob:p.dob||'',sexe:p.sexe||'',cin:p.cin||'',tel:p.tel||'',email:p.email||'',adresse:p.adresse||'',motif:parsed.selected, motif_autre:parsed.custom, statut:p.statut||'actif',medecin:p.medecin||'',mutuelle:p.mutuelle||'',notes:p.notes||'',urgnom:p.urgnom||'',urgtel:p.urgtel||''})
    setModal(true)
  }
  function selectPatient(id){setSelectedId(id);setActiveTab('infos');if(isMobile)setShowDetail(true)}

  // Filtrage & pagination
  let filtered=patients
  if(search)filtered=filtered.filter(p=>(p.prenom+' '+p.nom).toLowerCase().includes(search.toLowerCase())||formatMotifs(p.motif).toLowerCase().includes(search.toLowerCase()))
  if(filter!=='tous')filtered=filtered.filter(p=>p.statut===filter)
  const totalPages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE))
  const paginated=filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE)

  const selected   = patients.find(p=>p.id===selectedId)
  const patRdvs    = selected ? rdvs.filter(r=>r.patient_nom===selected.prenom+' '+selected.nom) : []
  const noteDetails = [...notes].sort((a, b) => new Date(b.date_seance || 0) - new Date(a.date_seance || 0))
  const totalSeancesCount = notes.length
  const totalSeances = notes.reduce((sum, note) => sum + Number(note.tarif || 200), 0)
  const totalPaye = payments.reduce((sum, p) => sum + Number(p.montant || 0), 0)
  const resteAPayer = totalSeances - totalPaye
  const paymentStatus = resteAPayer <= 0 ? 'Soldé' : totalPaye > 0 ? 'Partiellement payé' : 'Impayé'

  // Pour chaque RDV, trouver la note liée (par rendez_vous_id)
  function getNoteForRdv(rdvId) {
    return notes.find(n => n.rendez_vous_id === rdvId) || null
  }

  // ─── PANNEAU LISTE ──────────────────────────────────────────────────────────
  const listPanel = (
    <div style={{...S.listPanel, width:isMobile?'100%':320}}>
      <div style={S.listHeader}>
        <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:8,flexWrap:'wrap'}}>
          <input style={{...S.search,marginBottom:0,minWidth:180}} type="text" placeholder="Rechercher…"
            value={search} onChange={e=>setSearch(e.target.value)}/>
          <button style={{...S.addBtn,whiteSpace:'nowrap',flexShrink:0}} onClick={exportPatientsPDF}>⬇ PDF</button>
          <button style={{...S.addBtn,whiteSpace:'nowrap',flexShrink:0}} onClick={exportPatientsCSV}>⬇ CSV</button>
          {isMobile&&<button style={{...S.addBtn,whiteSpace:'nowrap',flexShrink:0}} onClick={openNew}>+ Nouveau</button>}
        </div>
        <div style={S.filters}>
          {['tous','actif','bilan','pause','archive'].map(f=>(
            <button key={f} style={{...S.filterBtn,...(filter===f?S.filterActive:{})}} onClick={()=>setFilter(f)}>
              {f==='tous'?'Tous':STATUTS[f]}
            </button>
          ))}
        </div>
      </div>

      <div style={S.listCount}>{filtered.length} patient{filtered.length>1?'s':''}</div>

      <div style={S.list}>
        {loading&&<div style={S.emptyMsg}>Chargement…</div>}
        {!loading&&filtered.length===0&&<div style={S.emptyMsg}>Aucun patient trouvé</div>}
        {paginated.map(p=>{
          const col=patColor(p.id)
          const sc=STATUT_COLORS[p.statut]||STATUT_COLORS.archive
          const age=calcAge(p.dob)
          const rdvCount=rdvs.filter(r=>r.patient_nom===p.prenom+' '+p.nom).length
          const bilanCount=bilans.filter(b=>b.patient_id===p.id).length
          return(
            <div key={p.id} style={{...S.patCard,...(selectedId===p.id?S.patCardSel:{})}} onClick={()=>selectPatient(p.id)}>
              <div style={{...S.patAv,background:col+'22',color:col}}>{initials(p.prenom,p.nom)}</div>
              <div style={S.patInfo}>
                <div style={S.patName}>{p.prenom} {p.nom}</div>
                <div style={S.patMeta}>{age?age+' ans · ':''}{formatMotifs(p.motif)||'—'}</div>
                <div style={S.patMeta}>{rdvCount} séance{rdvCount>1?'s':''} · {bilanCount} bilan{bilanCount>1?'s':''}</div>
              </div>
              <span style={{...S.statBadge,background:sc.bg,color:sc.color}}>{STATUTS[p.statut]}</span>
            </div>
          )
        })}
      </div>

      {totalPages>1&&(
        <div style={S.pagination}>
          <button style={S.pageBtn} disabled={page===1} onClick={()=>setPage(p=>p-1)}>‹</button>
          {Array.from({length:totalPages},(_,i)=>i+1).map(p=>(
            <button key={p} style={{...S.pageBtn,...(page===p?S.pageBtnActive:{})}} onClick={()=>setPage(p)}>{p}</button>
          ))}
          <button style={S.pageBtn} disabled={page===totalPages} onClick={()=>setPage(p=>p+1)}>›</button>
        </div>
      )}
    </div>
  )

  // ─── ONGLET INFOS ───────────────────────────────────────────────────────────
  const tabInfos = selected && (
    <>
      <div style={{...S.pdGrid,gridTemplateColumns:isMobile?'1fr':'1fr 1fr'}}>
        <div style={S.pdCard}>
          <div style={S.pdCardTitle}>Contact</div>
          {[['Téléphone',selected.tel],['Email',selected.email],['Adresse',selected.adresse],
            ['Contact urgence',selected.urgnom?(selected.urgnom+(selected.urgtel?' · '+selected.urgtel:'')):null],
          ].map(([l,v])=>(
            <div key={l} style={S.pdField}>
              <div style={S.pdFl}>{l}</div>
              <div style={{...S.pdFv,...(v?{}:{color:'#8A9BB0',fontStyle:'italic'})}}>{v||'Non renseigné'}</div>
            </div>
          ))}
        </div>
        <div style={S.pdCard}>
          <div style={S.pdCardTitle}>Informations cliniques</div>
          {(() => {
            const motifs = parseMotifs(selected.motif)
            return [['Motifs de consultation', motifs.length ? motifs.join(', ') : ''],['Médecin référent',selected.medecin],['Mutuelle / Assurance',selected.mutuelle],['N° dossier / CIN',selected.cin]].map(([l,v])=>(
              <div key={l} style={S.pdField}>
                <div style={S.pdFl}>{l}</div>
                <div style={{...S.pdFv,...(v?{}:{color:'#8A9BB0',fontStyle:'italic'})}}>{v||'Non renseigné'}</div>
              </div>
            ))
          })()}
        </div>
      </div>

      <div style={{...S.pdCard, marginTop:14}}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, marginBottom:12, flexWrap:'wrap'}}>
          <div style={S.pdCardTitle}>Paiements</div>
          <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
            <button
              style={{...S.addBtn, opacity:notes.length === 0 ? 0.55 : 1, cursor:notes.length === 0 ? 'not-allowed' : 'pointer'}}
              onClick={openPaymentModal}
              disabled={notes.length === 0}
              title={notes.length === 0 ? 'Ajoutez une séance avant d’enregistrer un paiement' : ''}
            >
              + Paiement
            </button>
            <button style={{...S.addBtn, background:'#1D9E75'}} onClick={openInvoiceModal}>+ Facture</button>
          </div>
        </div>
        {notes.length === 0 && (
          <div style={{marginBottom:12,fontSize:12,color:'#8A5A00',background:'#FEF3E2',borderRadius:8,padding:'9px 12px'}}>
            Enregistrez d’abord une séance dans l’onglet Séances pour pouvoir ajouter un paiement.
          </div>
        )}

        <div style={{display:'grid', gridTemplateColumns:isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap:10}}>
          <div style={S.paymentStat}><span style={S.paymentLabel}>Nb séances</span><strong>{totalSeancesCount}</strong></div>
          <div style={S.paymentStat}><span style={S.paymentLabel}>Total séances</span><strong>{formatMoney(totalSeances)}</strong></div>
          <div style={{...S.paymentStat, borderColor: resteAPayer <= 0 ? '#1D9E75' : '#D9A12B'}}>
            <span style={S.paymentLabel}>Reste</span>
            <strong style={{color: resteAPayer <= 0 ? '#1D9E75' : '#8B5A00'}}>{formatMoney(resteAPayer)}</strong>
          </div>
        </div>

        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:12, gap:10, flexWrap:'wrap'}}>
          <div style={{fontSize:12, color:'#4A6080', fontWeight:700}}>Statut : <span style={{color: resteAPayer <= 0 ? '#1D9E75' : '#8B5A00'}}>{paymentStatus}</span></div>
          <div style={{fontSize:12, color:'#4A6080', fontWeight:700}}>Payé : <strong>{formatMoney(totalPaye)}</strong></div>
        </div>

        {noteDetails.length > 0 && (
          <div style={{marginTop:14, border:'1px solid #DDE5EF', borderRadius:10, background:'#fff', overflow:'hidden'}}>
            <div style={{padding:'10px 12px', borderBottom:'1px solid #DDE5EF', fontSize:12, fontWeight:700, color:'#0C447C'}}>Détail des séances</div>
            <div style={{display:'flex', flexDirection:'column'}}>
              {noteDetails.map(note => (
                <div key={note.id || `${note.date_seance}-${note.tarif}`} style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, padding:'8px 12px', borderBottom:'1px solid #EEF3F8'}}>
                  <div>
                    <div style={{fontSize:12, fontWeight:700, color:'#1A2744'}}>{formatDateFr(note.date_seance) || 'Date non renseignée'}</div>
                    <div style={{fontSize:11, color:'#8A9BB0'}}>{note.observations || 'Aucune observation'}</div>
                  </div>
                  <div style={{fontSize:12, fontWeight:700, color:'#0C447C'}}>{formatMoney(Number(note.tarif || 0))}</div>
                  <div style={{display:'flex',flexDirection:'column',gap:6,alignItems:'flex-end',flex:'0 0 auto'}}>
                    {payments
                      .filter(payment => String(payment.note_seance_id) === String(note.id))
                      .map(payment => (
                        <div key={payment.id} style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:6,flexWrap:'wrap'}}>
                          <span style={{fontSize:11,fontWeight:600,color:'#1D7A5A',marginRight:4}}>
                            Paiement : {formatMoney(payment.montant)}
                          </span>
                          <button
                            type="button"
                            style={S.paymentEditBtn}
                            onClick={() => openEditPayment(payment)}
                            disabled={paymentSaving || paymentDeleting}
                          >
                            ✎ Modifier
                          </button>
                          <button
                            type="button"
                            style={S.paymentDeleteBtn}
                            onClick={() => { setPaymentToDelete(payment); setConfirmDeletePayment(true) }}
                            disabled={paymentDeleting}
                          >
                            🗑 Supprimer
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {payments.length > 0 ? (
          <div style={{marginTop:12, display:'flex', flexDirection:'column', gap:8}}>
            {payments.map(payment => (
              <div key={payment.id} style={S.paymentItem}>
                <div style={{flex:'1 1 180px',minWidth:0}}>
                  <div style={{fontSize:12, fontWeight:700, color:'#0C447C'}}>{formatMoney(payment.montant)}</div>
                  <div style={{fontSize:11, color:'#8A9BB0'}}>{payment.mode_paiement || 'cash'} · {formatDateFr(payment.date_paiement)}</div>
                  {payment.note_seance_id && (
                    <div style={{fontSize:11, color:'#4A6080', marginTop:3}}>
                      Séance du {formatDateFr(notes.find(note => String(note.id) === String(payment.note_seance_id))?.date_seance) || 'date indisponible'}
                    </div>
                  )}
                  {payment.note && <div style={{fontSize:11, color:'#4A6080', marginTop:3, overflowWrap:'anywhere'}}>{payment.note}</div>}
                </div>
                <div style={{display:'flex', alignItems:'center', gap:8, flex:'0 0 auto', flexWrap:'wrap', justifyContent:'flex-end'}}>
                  <button
                    type="button"
                    style={S.paymentEditBtn}
                    onClick={() => openEditPayment(payment)}
                    disabled={paymentSaving || paymentDeleting}
                  >
                    ✎ Modifier
                  </button>
                  <button
                    type="button"
                    style={S.paymentDeleteBtn}
                    onClick={() => { setPaymentToDelete(payment); setConfirmDeletePayment(true) }}
                    disabled={paymentDeleting}
                  >
                    🗑 Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{marginTop:12, fontSize:12, color:'#8A9BB0', fontStyle:'italic'}}>Aucun paiement enregistré.</div>
        )}
      </div>
      {selected.notes&&(
        <div style={{...S.pdCard,marginBottom:0}}>
          <div style={S.pdCardTitle}>Antécédents & Notes cliniques</div>
          <div style={{fontSize:13,color:'#1A2744',lineHeight:1.7}}>{selected.notes}</div>
        </div>
      )}
    </>
  )

  // ─── ONGLET SÉANCES ─────────────────────────────────────────────────────────
  const tabSeances = (
    <div style={S.pdCard}>
      {notesLoading&&<div style={{fontSize:12,color:'#8A9BB0',fontStyle:'italic',padding:'8px 0'}}>Chargement…</div>}

      {!notesLoading && patRdvs.length === 0 && (
        <div style={{textAlign:'center',padding:'28px 0',color:'#8A9BB0'}}>
          <div style={{fontSize:36,marginBottom:8}}>🗓</div>
          <div style={{fontSize:13,fontWeight:600}}>Aucune séance enregistrée</div>
          <div style={{fontSize:12,marginTop:4}}>Les séances apparaissent ici depuis le module Agenda.</div>
        </div>
      )}

      {!notesLoading && patRdvs.length > 0 && (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {patRdvs.map(rdv=>{
            const note = getNoteForRdv(rdv.id)
            const typeColor = TYPES_COLOR[rdv.type]||'#185FA5'
            const typeLabel = TYPES_LABEL[rdv.type]||rdv.type
            const humeurInfo = note ? HUMEURS.find(h=>h.value===note.humeur) : null

            return(
              <div key={rdv.id} style={{...S.seanceBlock, borderLeftColor:typeColor}}>
                {/* En-tête séance */}
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8,marginBottom:note?10:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                    <div style={{fontSize:13,fontWeight:700,color:'#0C447C'}}>{formatDateFr(rdv.date)}</div>
                    <div style={{fontSize:11,fontWeight:700,color:typeColor,background:typeColor+'18',padding:'2px 9px',borderRadius:20}}>
                      {typeLabel}
                    </div>
                    <div style={{fontSize:11,color:'#8A9BB0'}}>{rdv.heure} · {rdv.duree} min</div>
                    {humeurInfo&&(
                      <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,background:humeurInfo.bg,color:humeurInfo.color}}>
                        {humeurInfo.label}
                      </span>
                    )}
                  </div>
                  {/* Bouton ajouter / voir note */}
                  {!note ? (
                    <button type="button" style={S.addNoteBtn} onClick={(e)=>{ e.stopPropagation(); openNewNote(rdv); }}>
                      📝 Ajouter note
                    </button>
                  ) : (
                    <button type="button" style={S.editNoteBtn} onClick={(e)=>{ e.stopPropagation(); openEditNote(note); }}>
                      ✏️ Modifier note
                    </button>
                  )}
                </div>

                {/* Contenu de la note si elle existe */}
                {note && (
                  <div style={S.noteInline}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, marginBottom:8, flexWrap:'wrap'}}>
                      <div style={{fontSize:10, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color: note.paye ? '#1D7A5A' : '#8A9BB0'}}>
                        {note.paye ? 'Payé' : 'Non payé'}
                      </div>
                      <span style={{
                        fontSize:11,
                        fontWeight:700,
                        padding:'2px 8px',
                        borderRadius:20,
                        background: note.paye ? '#E8F5EE' : '#F0F4F9',
                        color: note.paye ? '#1D7A5A' : '#8A9BB0'
                      }}>
                        {note.paye ? '✓ Payé' : '⏳ Non payé'}
                      </span>
                    </div>
                    {note.tarif && (
                      <div style={{marginBottom:6}}>
                        <div style={S.noteFieldLabel}>💰 Tarif séance</div>
                        <div style={S.noteFieldVal}>{Number(note.tarif).toLocaleString('fr-FR')} DH</div>
                      </div>
                    )}
                    {note.observations&&(
                      <div style={{marginBottom:6}}>
                        <div style={S.noteFieldLabel}>🔍 Observations</div>
                        <div style={S.noteFieldVal}>{note.observations}</div>
                      </div>
                    )}
                    {note.exercices&&(
                      <div style={{marginBottom:6}}>
                        <div style={S.noteFieldLabel}>🎯 Exercices réalisés</div>
                        <div style={S.noteFieldVal}>{note.exercices}</div>
                      </div>
                    )}
                    {note.objectifs_prochaine&&(
                      <div>
                        <div style={S.noteFieldLabel}>📌 Objectifs prochaine séance</div>
                        <div style={S.noteFieldVal}>{note.objectifs_prochaine}</div>
                      </div>
                    )}
                    <div style={{marginTop:8,display:'flex',justifyContent:'flex-end'}}>
                      <button style={{...S.noteDeleteBtn}} onClick={()=>{setNoteToDelete(note);setConfirmDeleteNote(true)}}>
                        🗑 Supprimer note
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  // ─── PANNEAU DÉTAIL ─────────────────────────────────────────────────────────
  const detailPanel = (
    <div style={S.detail}>
      {isMobile&&showDetail&&(
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,gap:8}}>
          <button style={{...S.backBtn,marginBottom:0}} onClick={()=>setShowDetail(false)}>← Retour</button>
          <button style={S.addBtn} onClick={openNew}>+ Nouveau patient</button>
        </div>
      )}
      {!selected?(
        <div style={S.emptyDetail}>
          <div style={{fontSize:48,opacity:.25}}>👤</div>
          <div style={{fontSize:15,fontWeight:600,color:'#4A6080'}}>Sélectionnez un patient</div>
          <div style={{fontSize:12,color:'#8A9BB0'}}>pour voir son dossier complet</div>
          {!isMobile&&<button style={{...S.addBtn,marginTop:16}} onClick={openNew}>+ Nouveau patient</button>}
        </div>
      ):(
        <div style={S.detailInner}>

          {/* Header */}
          <div style={{...S.pdHeader,flexWrap:'wrap',gap:12}}>
            <div style={{...S.pdAvBig,background:patColor(selected.id)+'22',color:patColor(selected.id)}}>
              {initials(selected.prenom,selected.nom)}
            </div>
            <div style={{flex:1,minWidth:160}}>
              <div style={S.pdName}>{selected.prenom} {selected.nom}</div>
              <div style={S.pdMeta}>
                {calcAge(selected.dob)?calcAge(selected.dob)+' ans · ':''}
                {selected.sexe==='F'?'Féminin':selected.sexe==='M'?'Masculin':''}
                {selected.dob?' · Né(e) le '+selected.dob:''}
              </div>
              <div style={S.pdTags}>
                {selected.statut&&(
                  <span style={{...S.pdTag,background:STATUT_COLORS[selected.statut]?.bg,color:STATUT_COLORS[selected.statut]?.color}}>
                    {STATUTS[selected.statut]}
                  </span>
                )}
                {parseMotifs(selected.motif).map(m => (
                  <span key={m} style={{...S.pdTag,background:'#EBF2F9',color:'#185FA5'}}>{m}</span>
                ))}
              </div>
            </div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              <button style={S.editBtn} onClick={()=>openEdit(selected)}>✏️ Modifier</button>
              <button style={S.deleteBtn} onClick={()=>setConfirmDelete(true)}>🗑 Supprimer</button>
              {!isMobile&&<button style={S.addBtn} onClick={openNew}>+ Nouveau patient</button>}
            </div>
          </div>

          {/* 2 onglets */}
          <div style={S.tabs}>
            {[
              { key:'infos',   label:'📋 Infos' },
              { key:'seances', label:`🗓 Séances (${patRdvs.length})` },
            ].map(tab=>(
              <button key={tab.key}
                style={{...S.tabBtn,...(activeTab===tab.key?S.tabBtnActive:{})}}
                onClick={()=>setActiveTab(tab.key)}>
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab==='infos'   && tabInfos}
          {activeTab==='seances' && tabSeances}

        </div>
      )}
    </div>
  )

  return (
    <div style={S.wrap}>
      {isMobile?(showDetail?detailPanel:listPanel):(<>{listPanel}{detailPanel}</>)}

      {/* MODAL PATIENT */}
      {modal&&(
        <div style={S.overlay} onClick={()=>setModal(false)}>
          <div style={{...S.modalBox,maxWidth:isMobile?'100%':580,borderRadius:isMobile?'16px 16px 0 0':16}} onClick={e=>e.stopPropagation()}>
            <div style={S.modalHead}>
              <span style={S.modalTitle}>{editPat?'Modifier le patient':'Nouveau patient'}</span>
              <button style={S.closeBtn} onClick={()=>setModal(false)}>✕</button>
            </div>
            <div style={S.modalBody}>
              <div style={S.sectionLabel}>Identité</div>
              <div style={{...S.frow,gridTemplateColumns:isMobile?'1fr':'1fr 1fr'}}>
                <div style={S.fg}><label style={S.fl}>Prénom *</label><input style={S.fi} value={form.prenom} onChange={e=>setForm({...form,prenom:e.target.value})} placeholder="Prénom…"/></div>
                <div style={S.fg}><label style={S.fl}>Nom *</label><input style={S.fi} value={form.nom} onChange={e=>setForm({...form,nom:e.target.value})} placeholder="Nom…"/></div>
              </div>
              <div style={{...S.frow3,gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr'}}>
                <div style={S.fg}><label style={S.fl}>Date de naissance</label><input style={S.fi} type="date" value={form.dob} onChange={e=>setForm({...form,dob:e.target.value})}/></div>
                <div style={S.fg}><label style={S.fl}>Sexe</label><select style={S.fi} value={form.sexe} onChange={e=>setForm({...form,sexe:e.target.value})}><option value="">—</option><option value="F">Féminin</option><option value="M">Masculin</option></select></div>
                <div style={S.fg}><label style={S.fl}>N° dossier / CIN</label><input style={S.fi} value={form.cin} onChange={e=>setForm({...form,cin:e.target.value})} placeholder="Référence…"/></div>
              </div>
              <div style={S.sectionLabel}>Contact</div>
              <div style={{...S.frow,gridTemplateColumns:isMobile?'1fr':'1fr 1fr'}}>
                <div style={S.fg}><label style={S.fl}>Téléphone</label><input style={S.fi} value={form.tel} onChange={e=>setForm({...form,tel:e.target.value})} placeholder="+212…"/></div>
                <div style={S.fg}><label style={S.fl}>Email</label><input style={S.fi} type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="email@…"/></div>
              </div>
              <div style={S.fg}><label style={S.fl}>Adresse</label><input style={S.fi} value={form.adresse} onChange={e=>setForm({...form,adresse:e.target.value})} placeholder="Adresse…"/></div>
              <div style={S.sectionLabel}>Informations cliniques</div>
              <div style={{...S.frow,gridTemplateColumns:isMobile?'1fr':'1fr 1fr'}}>
                <div style={S.fg}><label style={S.fl}>Statut</label><select style={S.fi} value={form.statut} onChange={e=>setForm({...form,statut:e.target.value})}>{Object.entries(STATUTS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
              </div>
              <div style={S.fg}>
                <label style={S.fl}>Motifs de consultation</label>
                <select
                  style={{...S.fi, minHeight:120}}
                  multiple
                  value={form.motif}
                  onChange={e => {
                    const nextValues = Array.from(e.target.selectedOptions).map(o => o.value)
                    setForm({ ...form, motif: nextValues })
                  }}
                >
                  {MOTIFS.map(m => <option key={m} value={m}>{m}</option>)}
                  <option value="Autre">Autre</option>
                </select>
                {form.motif.includes('Autre') && (
                  <input
                    style={{ ...S.fi, marginTop:8 }}
                    value={form.motif_autre || ''}
                    onChange={e => setForm({ ...form, motif_autre: e.target.value })}
                    placeholder="Précisez le motif…"
                  />
                )}
              </div>
              <div style={{...S.frow,gridTemplateColumns:isMobile?'1fr':'1fr 1fr'}}>
                <div style={S.fg}><label style={S.fl}>Médecin référent</label><input style={S.fi} value={form.medecin} onChange={e=>setForm({...form,medecin:e.target.value})} placeholder="Dr. …"/></div>
                <div style={S.fg}><label style={S.fl}>Mutuelle / Assurance</label><input style={S.fi} value={form.mutuelle} onChange={e=>setForm({...form,mutuelle:e.target.value})} placeholder="CNSS, CNOPS…"/></div>
              </div>
              <div style={S.fg}><label style={S.fl}>Antécédents & Notes cliniques</label><textarea style={{...S.fi,minHeight:70,resize:'vertical'}} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Antécédents médicaux, notes importantes…"/></div>
              <div style={S.sectionLabel}>Contact d'urgence</div>
              <div style={{...S.frow,gridTemplateColumns:isMobile?'1fr':'1fr 1fr'}}>
                <div style={S.fg}><label style={S.fl}>Nom & lien de parenté</label><input style={S.fi} value={form.urgnom} onChange={e=>setForm({...form,urgnom:e.target.value})} placeholder="Prénom Nom (mère, époux…)"/></div>
                <div style={S.fg}><label style={S.fl}>Téléphone urgence</label><input style={S.fi} value={form.urgtel} onChange={e=>setForm({...form,urgtel:e.target.value})} placeholder="+212…"/></div>
              </div>
            </div>
            <div style={S.modalFoot}>
              {editPat&&<button style={S.dangerBtn} onClick={()=>{setModal(false);setConfirmDelete(true)}}>Supprimer</button>}
              <button style={S.cancelBtn} onClick={()=>setModal(false)}>Annuler</button>
              <button style={S.saveBtn} onClick={savePatient} disabled={saving}>{saving?'Enregistrement…':'Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PAIEMENT */}
      {paymentModal && selected && (
        <div style={S.overlay} onClick={closePaymentModal}>
          <div style={{...S.modalBox,maxWidth:isMobile?'100%':420,borderRadius:isMobile?'16px 16px 0 0':16}} onClick={e=>e.stopPropagation()}>
            <div style={S.modalHead}>
              <span style={S.modalTitle}>{editingPayment ? 'Modifier le paiement' : 'Ajouter un paiement'}</span>
              <button style={S.closeBtn} onClick={closePaymentModal} disabled={paymentSaving}>✕</button>
            </div>
            <div style={S.modalBody}>
              <div style={S.fg}>
                <label style={S.fl}>Séance concernée *</label>
                <select
                  style={S.fi}
                  value={paymentForm.note_seance_id}
                  onChange={e => setPaymentForm({ ...paymentForm, note_seance_id: e.target.value })}
                  required
                >
                  <option value="">Sélectionner une séance…</option>
                  {noteDetails.map(note => (
                    <option key={note.id} value={String(note.id)}>
                      {formatDateFr(note.date_seance) || 'Date non renseignée'} · {formatMoney(note.tarif || 200)}
                    </option>
                  ))}
                </select>
              </div>
              <div style={S.fg}>
                <label style={S.fl}>Montant *</label>
                <input style={S.fi} type="number" min="0" step="0.01" value={paymentForm.montant} onChange={e => setPaymentForm({ ...paymentForm, montant: e.target.value })} placeholder="Ex: 250" />
              </div>
              <div style={S.fg}>
                <label style={S.fl}>Date *</label>
                <input style={S.fi} type="date" value={paymentForm.date} onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })} />
              </div>
              <div style={S.fg}>
                <label style={S.fl}>Mode de paiement</label>
                <select style={S.fi} value={paymentForm.mode} onChange={e => setPaymentForm({ ...paymentForm, mode: e.target.value })}>
                  <option value="cash">Cash</option>
                  <option value="virement">Virement</option>
                  <option value="carte">Carte</option>
                  <option value="cheque">Chèque</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              <div style={S.fg}>
                <label style={S.fl}>Note</label>
                <textarea style={{...S.fi,minHeight:60,resize:'vertical'}} value={paymentForm.note} onChange={e => setPaymentForm({ ...paymentForm, note: e.target.value })} placeholder="Ex: acompte, solde, versement…" />
              </div>
            </div>
            <div style={S.modalFoot}>
              <button style={S.cancelBtn} onClick={closePaymentModal} disabled={paymentSaving}>Annuler</button>
              <button style={S.saveBtn} onClick={savePayment} disabled={paymentSaving || !paymentForm.note_seance_id}>
                {paymentSaving ? (editingPayment ? 'Modification…' : 'Enregistrement…') : (editingPayment ? 'Enregistrer les modifications' : 'Enregistrer')}
              </button>
            </div>
          </div>
        </div>
      )}

      {invoiceModal && selected && (
        <div style={S.overlay} onClick={()=>setInvoiceModal(false)}>
          <div style={{...S.modalBox,maxWidth:isMobile?'100%':420,borderRadius:isMobile?'16px 16px 0 0':16}} onClick={e=>e.stopPropagation()}>
            <div style={S.modalHead}>
              <span style={S.modalTitle}>Créer une facture</span>
              <button style={S.closeBtn} onClick={()=>setInvoiceModal(false)}>✕</button>
            </div>
            <div style={S.modalBody}>
              <div style={S.fg}>
                <label style={S.fl}>Patient</label>
                <input style={{...S.fi, background:'#F8FAFD'}} value={`${selected.prenom || ''} ${selected.nom || ''}`.trim()} readOnly />
              </div>
              <div style={S.fg}>
                <label style={S.fl}>Type d’acte</label>
                <select style={S.fi} value={invoiceForm.type_seance} onChange={e => setInvoiceForm({ ...invoiceForm, type_seance: e.target.value })}>
                  {FACTURE_TYPES.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div style={S.fg}>
                <label style={S.fl}>Date de séance *</label>
                <input style={S.fi} type="date" value={invoiceForm.date_seance} onChange={e => setInvoiceForm({ ...invoiceForm, date_seance: e.target.value })} />
              </div>
              <div style={S.fg}>
                <label style={S.fl}>Montant (MAD) *</label>
                <input style={S.fi} type="number" min="0" step="0.01" value={invoiceForm.montant} onChange={e => setInvoiceForm({ ...invoiceForm, montant: e.target.value })} placeholder="Ex: 350" />
              </div>
              <div style={S.fg}>
                <label style={S.fl}>Tarif séance</label>
                <select style={S.fi} value={invoiceForm.tarif} onChange={e => setInvoiceForm({ ...invoiceForm, tarif: Number(e.target.value) })}>
                  {SESSION_TARIFFS.map(value => (
                    <option key={value} value={value}>{value} DH</option>
                  ))}
                </select>
              </div>
              <div style={S.fg}>
                <label style={S.fl}>Statut</label>
                <select style={S.fi} value={invoiceForm.statut_paiement} onChange={e => setInvoiceForm({ ...invoiceForm, statut_paiement: e.target.value })}>
                  <option value="impayé">Impayé</option>
                  <option value="payé">Payé</option>
                  <option value="annulé">Annulé</option>
                </select>
              </div>
              <div style={S.fg}>
                <label style={S.fl}>Mode de paiement</label>
                <select style={S.fi} value={invoiceForm.moyen_paiement} onChange={e => setInvoiceForm({ ...invoiceForm, moyen_paiement: e.target.value })}>
                  <option value="">—</option>
                  <option value="Espèces">Espèces</option>
                  <option value="Virement">Virement</option>
                  <option value="Carte bancaire">Carte bancaire</option>
                  <option value="Chèque">Chèque</option>
                  <option value="Mutuelle / CNSS">Mutuelle / CNSS</option>
                </select>
              </div>
              <div style={S.fg}>
                <label style={S.fl}>Notes</label>
                <textarea style={{...S.fi,minHeight:60,resize:'vertical'}} value={invoiceForm.notes_paiement} onChange={e => setInvoiceForm({ ...invoiceForm, notes_paiement: e.target.value })} placeholder="Informations complémentaires…" />
              </div>
            </div>
            <div style={S.modalFoot}>
              <button style={S.cancelBtn} onClick={()=>setInvoiceModal(false)}>Annuler</button>
              <button style={S.saveBtn} onClick={saveInvoice}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOTE DE SÉANCE */}
      {noteValidationModal && (
        <div style={{...S.overlay, zIndex: 2000}} onClick={()=>setNoteValidationModal(false)}>
          <div style={{...S.modalBox,maxWidth:isMobile?'100%':420,borderRadius:isMobile?'16px 16px 0 0':16, zIndex: 2001}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:'28px 24px 12px',display:'flex',flexDirection:'column',alignItems:'center',gap:12,textAlign:'center'}}>
              <div style={{width:52,height:52,borderRadius:'50%',background:'#FCEBEB',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>⚠️</div>
              <div style={{fontFamily:'Georgia, serif',fontSize:20,color:'#0C447C',fontWeight:700}}>Informations incomplètes</div>
              <div style={{fontSize:13,color:'#4A6080',lineHeight:1.7,whiteSpace:'pre-line'}}>{noteValidationMessage}</div>
            </div>
            <div style={{padding:'12px 24px 24px',display:'flex',justifyContent:'center'}}>
              <button style={{...S.saveBtn,minWidth:140}} onClick={()=>setNoteValidationModal(false)}>Compris</button>
            </div>
          </div>
        </div>
      )}

      {noteModal&&(
        <div style={S.overlay} onClick={()=>setNoteModal(false)}>
          <div style={{...S.modalBox,maxWidth:isMobile?'100%':540,borderRadius:isMobile?'16px 16px 0 0':16}} onClick={e=>e.stopPropagation()}>
            <div style={S.modalHead}>
              <span style={S.modalTitle}>{editNote?'Modifier la note':'Note de séance'}</span>
              <button style={S.closeBtn} onClick={()=>setNoteModal(false)}>✕</button>
            </div>
            <div style={S.modalBody}>
              <div style={S.fg}>
                <label style={S.fl}>Date de la séance *</label>
                <input style={S.fi} type="date" value={noteForm.date_seance} onChange={e=>setNoteForm({...noteForm,date_seance:e.target.value})}/>
              </div>
              <div style={S.fg}>
                <label style={S.fl}>Tarif de la séance</label>
                <select style={S.fi} value={noteForm.tarif} onChange={e => setNoteForm({ ...noteForm, tarif: Number(e.target.value) })}>
                  {SESSION_TARIFFS.map(value => (
                    <option key={value} value={value}>{value} DH</option>
                  ))}
                </select>
              </div>
              <div style={S.fg}>
                <label style={S.fl}>Humeur / comportement du patient</label>
                <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:4}}>
                  {HUMEURS.map(h=>(
                    <button key={h.value} style={{padding:'6px 12px',borderRadius:20,fontSize:12,fontWeight:600,cursor:'pointer',border:noteForm.humeur===h.value?`2px solid ${h.color}`:'1.5px solid #DDE5EF',background:noteForm.humeur===h.value?h.bg:'#fff',color:noteForm.humeur===h.value?h.color:'#8A9BB0',fontFamily:'DM Sans, sans-serif'}}
                      onClick={()=>setNoteForm({...noteForm,humeur:noteForm.humeur===h.value?'':h.value})}>
                      {h.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={S.fg}>
                <label style={S.fl}>Paiement de la séance</label>
                <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:4}}>
                  {[
                    { value: true, label: 'Payé', color: '#1D7A5A', bg: '#E8F5EE' },
                    { value: false, label: 'Non payé', color: '#8A9BB0', bg: '#F0F4F9' },
                  ].map(option => (
                    <button
                      key={String(option.value)}
                      style={{
                        padding:'6px 12px',
                        borderRadius:20,
                        fontSize:12,
                        fontWeight:600,
                        cursor:'pointer',
                        border: noteForm.paye === option.value ? `2px solid ${option.color}` : '1.5px solid #DDE5EF',
                        background: noteForm.paye === option.value ? option.bg : '#fff',
                        color: noteForm.paye === option.value ? option.color : '#8A9BB0',
                        fontFamily:'DM Sans, sans-serif'
                      }}
                      onClick={()=>setNoteForm({...noteForm, paye: option.value})}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={S.fg}>
                <label style={S.fl}>🔍 Observations</label>
                <textarea style={{...S.fi,minHeight:75,resize:'vertical'}} value={noteForm.observations} onChange={e=>setNoteForm({...noteForm,observations:e.target.value})} placeholder="Observations cliniques, progrès remarqués…"/>
              </div>
              <div style={S.fg}>
                <label style={S.fl}>🎯 Exercices réalisés</label>
                <textarea style={{...S.fi,minHeight:65,resize:'vertical'}} value={noteForm.exercices} onChange={e=>setNoteForm({...noteForm,exercices:e.target.value})} placeholder="Exercices pratiqués pendant la séance…"/>
              </div>
              <div style={S.fg}>
                <label style={S.fl}>📌 Objectifs prochaine séance</label>
                <textarea style={{...S.fi,minHeight:65,resize:'vertical'}} value={noteForm.objectifs_prochaine} onChange={e=>setNoteForm({...noteForm,objectifs_prochaine:e.target.value})} placeholder="Ce qu'on travaillera la prochaine fois…"/>
              </div>
            </div>
            <div style={S.modalFoot}>
              <button style={S.cancelBtn} onClick={()=>setNoteModal(false)}>Annuler</button>
              <button style={{...S.saveBtn,background:ORANGE}} onClick={saveNote} disabled={noteSaving}>{noteSaving?'Enregistrement…':'Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMATION SUPPRESSION PATIENT */}
      {confirmDelete&&selected&&(
        <div style={S.overlay} onClick={()=>setConfirmDelete(false)}>
          <div style={{...S.modalBox,maxWidth:380,borderRadius:16}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:'28px 24px 12px',display:'flex',flexDirection:'column',alignItems:'center',gap:12,textAlign:'center'}}>
              <div style={{width:52,height:52,borderRadius:'50%',background:'#FCEBEB',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>🗑</div>
              <div style={{fontFamily:'Georgia, serif',fontSize:18,color:'#0C447C'}}>Supprimer ce patient ?</div>
              <div style={{fontSize:13,color:'#4A6080',lineHeight:1.6}}>
                <strong>{selected.prenom} {selected.nom}</strong> sera supprimé définitivement avec toutes ses données. Cette action est irréversible.
              </div>
            </div>
            <div style={{padding:'12px 24px 24px',display:'flex',gap:10,justifyContent:'center'}}>
              <button style={{...S.cancelBtn,minWidth:110}} onClick={()=>setConfirmDelete(false)}>Annuler</button>
              <button style={{...S.dangerBtn,marginRight:0,minWidth:110,background:'#C0392B',color:'#fff'}}
                onClick={async()=>{await supabase.from('patients').delete().eq('id',selected.id);setConfirmDelete(false);setSelectedId(null);setShowDetail(false);fetchPatients()}}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMATION SUPPRESSION PAIEMENT */}
      {confirmDeletePayment&&paymentToDelete&&(
        <div style={S.overlay} onClick={()=>setConfirmDeletePayment(false)}>
          <div style={{...S.modalBox,maxWidth:360,borderRadius:16}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:'28px 24px 12px',display:'flex',flexDirection:'column',alignItems:'center',gap:12,textAlign:'center'}}>
              <div style={{width:52,height:52,borderRadius:'50%',background:'#FCEBEB',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>🗑</div>
              <div style={{fontFamily:'Georgia, serif',fontSize:17,color:'#0C447C'}}>Supprimer ce paiement ?</div>
              <div style={{fontSize:13,color:'#4A6080',lineHeight:1.6}}>
                Le paiement de <strong>{formatMoney(paymentToDelete.montant)}</strong> du <strong>{formatDateFr(paymentToDelete.date_paiement)}</strong> sera supprimé.
              </div>
            </div>
            <div style={{padding:'12px 24px 24px',display:'flex',gap:10,justifyContent:'center'}}>
              <button style={{...S.cancelBtn,minWidth:100}} onClick={()=>setConfirmDeletePayment(false)}>Annuler</button>
              <button style={{...S.dangerBtn,marginRight:0,minWidth:100,background:'#C0392B',color:'#fff',opacity:paymentDeleting?0.7:1}} onClick={deletePayment} disabled={paymentDeleting}>{paymentDeleting?'Suppression…':'Supprimer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMATION SUPPRESSION NOTE */}
      {confirmDeleteNote&&noteToDelete&&(
        <div style={S.overlay} onClick={()=>setConfirmDeleteNote(false)}>
          <div style={{...S.modalBox,maxWidth:360,borderRadius:16}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:'28px 24px 12px',display:'flex',flexDirection:'column',alignItems:'center',gap:12,textAlign:'center'}}>
              <div style={{width:52,height:52,borderRadius:'50%',background:'#FCEBEB',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>🗑</div>
              <div style={{fontFamily:'Georgia, serif',fontSize:17,color:'#0C447C'}}>Supprimer cette note ?</div>
              <div style={{fontSize:13,color:'#4A6080',lineHeight:1.6}}>
                La note du <strong>{formatDateFr(noteToDelete.date_seance)}</strong> sera supprimée définitivement.
              </div>
            </div>
            <div style={{padding:'12px 24px 24px',display:'flex',gap:10,justifyContent:'center'}}>
              <button style={{...S.cancelBtn,minWidth:100}} onClick={()=>setConfirmDeleteNote(false)}>Annuler</button>
              <button style={{...S.dangerBtn,marginRight:0,minWidth:100,background:'#C0392B',color:'#fff'}} onClick={deleteNote}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const S = {
  wrap:         { flex:1, display:'flex', overflow:'hidden' },
  listPanel:    { borderRight:'1px solid #DDE5EF', background:'#fff', display:'flex', flexDirection:'column', flexShrink:0 },
  listHeader:   { padding:'14px 16px 10px', borderBottom:'1px solid #DDE5EF' },
  search:       { width:'100%', padding:'8px 12px', border:'1.5px solid #DDE5EF', borderRadius:8, fontSize:13, fontFamily:'DM Sans, sans-serif', outline:'none', boxSizing:'border-box' },
  filters:      { display:'flex', gap:5, marginTop:8, flexWrap:'wrap' },
  filterBtn:    { padding:'3px 9px', borderRadius:20, fontSize:11, fontWeight:600, border:'1.5px solid #DDE5EF', background:'none', cursor:'pointer', color:'#8A9BB0', fontFamily:'DM Sans, sans-serif' },
  filterActive: { borderColor:'#0C447C', background:'#0C447C', color:'#fff' },
  listCount:    { fontSize:11, color:'#8A9BB0', padding:'6px 16px', fontStyle:'italic' },
  list:         { flex:1, overflowY:'auto', padding:'6px 8px' },
  emptyMsg:     { padding:'20px', textAlign:'center', color:'#8A9BB0', fontSize:13 },
  patCard:      { display:'flex', alignItems:'center', gap:10, padding:'9px 10px', borderRadius:10, cursor:'pointer', border:'1.5px solid transparent', marginBottom:4, transition:'all .12s' },
  patCardSel:   { background:'#EBF2F9', borderColor:'#3B82C4' },
  patAv:        { width:36, height:36, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0 },
  patInfo:      { flex:1, minWidth:0 },
  patName:      { fontSize:13, fontWeight:600, color:'#1A2744' },
  patMeta:      { fontSize:11, color:'#8A9BB0', marginTop:1 },
  statBadge:    { fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, whiteSpace:'nowrap' },
  pagination:   { display:'flex', alignItems:'center', justifyContent:'center', gap:4, padding:'10px 12px', borderTop:'1px solid #DDE5EF', flexShrink:0 },
  pageBtn:      { minWidth:30, height:30, borderRadius:6, border:'1.5px solid #DDE5EF', background:'#fff', color:'#4A6080', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans, sans-serif', display:'flex', alignItems:'center', justifyContent:'center' },
  pageBtnActive:{ background:'#0C447C', color:'#fff', borderColor:'#0C447C' },
  detail:       { flex:1, overflowY:'auto', background:'#F0F4F9', padding:20 },
  emptyDetail:  { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:10, color:'#8A9BB0' },
  detailInner:  { display:'flex', flexDirection:'column', gap:14 },
  pdHeader:     { background:'#fff', borderRadius:12, padding:20, display:'flex', alignItems:'flex-start', gap:16, boxShadow:'0 2px 12px rgba(12,68,124,0.08)' },
  pdAvBig:      { width:56, height:56, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:700, flexShrink:0 },
  pdName:       { fontFamily:'Georgia, serif', fontSize:22, color:'#0C447C' },
  pdMeta:       { fontSize:12, color:'#8A9BB0', marginTop:3 },
  pdTags:       { display:'flex', gap:6, marginTop:7, flexWrap:'wrap' },
  pdTag:        { fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20 },
  editBtn:      { padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:600, border:'1.5px solid #DDE5EF', background:'#fff', color:'#0C447C', cursor:'pointer' },
  deleteBtn:    { padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:600, border:'1.5px solid #FACACA', background:'#FFF5F5', color:'#C0392B', cursor:'pointer' },
  addBtn:       { padding:'8px 14px', background:'#0C447C', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:4 },
  // Onglets — couleur active = ORANGE #C9A84C, texte blanc
  tabs:         { display:'flex', gap:6, background:'#fff', borderRadius:10, padding:6, boxShadow:'0 2px 12px rgba(12,68,124,0.08)' },
  tabBtn:       { flex:1, padding:'9px 10px', borderRadius:7, border:'none', background:'transparent', fontSize:13, fontWeight:600, color:'#8A9BB0', cursor:'pointer', fontFamily:'DM Sans, sans-serif', textAlign:'center', transition:'all .15s' },
  tabBtnActive: { background:'#C9A84C', color:'#fff' },
  // Séances
  seanceBlock:  { background:'#fff', border:'1px solid #DDE5EF', borderLeft:'3px solid #185FA5', borderRadius:10, padding:'12px 14px' },
  addNoteBtn:   { padding:'5px 12px', background:'#C9A84C', color:'#fff', border:'none', borderRadius:7, fontSize:12, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', fontFamily:'DM Sans, sans-serif' },
  editNoteBtn:  { padding:'5px 12px', background:'#F0F4F9', color:'#0C447C', border:'1.5px solid #DDE5EF', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap', fontFamily:'DM Sans, sans-serif' },
  paymentStat:  { background:'#fff', border:'1px solid #DDE5EF', borderRadius:10, padding:'12px 14px', display:'flex', flexDirection:'column', gap:4 },
  paymentLabel: { fontSize:10, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', color:'#8A9BB0' },
  paymentItem:  { display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10, background:'#F8FAFD', border:'1px solid #DDE5EF', borderRadius:8, padding:'12px 14px' },
  paymentEditBtn: { minHeight:34, padding:'6px 12px', borderRadius:8, border:'1.5px solid #C9D8E8', background:'#fff', color:'#0C447C', cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:'DM Sans, sans-serif', whiteSpace:'nowrap' },
  paymentDeleteBtn: { minHeight:34, padding:'6px 12px', borderRadius:8, border:'1.5px solid #FACACA', background:'#FFF5F5', color:'#C0392B', cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:'DM Sans, sans-serif', whiteSpace:'nowrap' },
  noteInline:   { background:'#FEF9F2', border:'1px solid #F5DFB5', borderRadius:8, padding:'10px 12px', marginTop:10 },
  noteFieldLabel:{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'#8A9BB0', marginBottom:3 },
  noteFieldVal: { fontSize:13, color:'#1A2744', lineHeight:1.65, whiteSpace:'pre-wrap' },
  noteDeleteBtn:{ padding:'4px 10px', borderRadius:6, border:'1.5px solid #FACACA', background:'#FFF5F5', color:'#C0392B', cursor:'pointer', fontSize:11, fontWeight:600, fontFamily:'DM Sans, sans-serif' },
  // Grille infos
  pdGrid:       { display:'grid', gap:14 },
  pdCard:       { background:'#fff', borderRadius:12, padding:16, boxShadow:'0 2px 12px rgba(12,68,124,0.08)' },
  pdCardTitle:  { fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#8A9BB0', marginBottom:10 },
  pdField:      { marginBottom:9 },
  pdFl:         { fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'#8A9BB0' },
  pdFv:         { fontSize:13, color:'#1A2744', fontWeight:500, marginTop:1 },
  // Modal
  overlay:      { position:'fixed', inset:0, background:'rgba(10,30,60,0.45)', zIndex:100, display:'flex', alignItems:'flex-end', justifyContent:'center', padding:0 },
  modalBox:     { background:'#fff', width:'100%', boxShadow:'0 8px 32px rgba(12,68,124,0.18)', display:'flex', flexDirection:'column', maxHeight:'92vh' },
  modalHead:    { padding:'18px 22px 14px', borderBottom:'1px solid #DDE5EF', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 },
  modalTitle:   { fontFamily:'Georgia, serif', fontSize:19, color:'#0C447C' },
  closeBtn:     { width:28, height:28, background:'#F0F4F9', border:'none', borderRadius:6, cursor:'pointer', fontSize:14, color:'#8A9BB0' },
  modalBody:    { padding:'18px 22px', display:'flex', flexDirection:'column', gap:11, overflowY:'auto' },
  modalFoot:    { padding:'12px 22px 16px', display:'flex', gap:8, justifyContent:'flex-end', borderTop:'1px solid #DDE5EF', flexShrink:0 },
  sectionLabel: { fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#8A9BB0', marginTop:4, marginBottom:2 },
  fg:           { display:'flex', flexDirection:'column', gap:4 },
  fl:           { fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'#4A6080' },
  fi:           { padding:'8px 12px', border:'1.5px solid #DDE5EF', borderRadius:8, fontSize:13, fontFamily:'DM Sans, sans-serif', outline:'none', width:'100%', boxSizing:'border-box' },
  frow:         { display:'grid', gap:12 },
  frow3:        { display:'grid', gap:12 },
  dangerBtn:    { padding:'8px 14px', background:'#FCEBEB', color:'#C0392B', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', marginRight:'auto' },
  cancelBtn:    { padding:'8px 14px', background:'#F0F4F9', border:'none', borderRadius:8, fontSize:13, fontWeight:500, color:'#4A6080', cursor:'pointer' },
  saveBtn:      { padding:'8px 18px', background:'#0C447C', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' },
  backBtn:      { display:'inline-flex', alignItems:'center', gap:6, marginBottom:14, padding:'6px 12px', background:'#fff', border:'1.5px solid #DDE5EF', borderRadius:8, fontSize:13, fontWeight:600, color:'#0C447C', cursor:'pointer' },
}