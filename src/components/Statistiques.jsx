import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(n || 0)
}
function fmtMAD(n) { return fmt(n) + ' MAD' }
function monthKey(d) {
  const dt = new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
}
function monthLabel(k) {
  const [y, m] = k.split('-')
  return new Date(y, m - 1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
}
function fmtDate(value) {
  if (!value) return ''
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}
function calcAge(dob) {
  if (!dob) return null
  const d = new Date(dob), now = new Date()
  let a = now.getFullYear() - d.getFullYear()
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) a--
  return a
}

const PALETTE = ['#7BA39D','#5B6268','#1D9E75','#E89020','#7B5EA7','#C0392B','#707A82','#D4884A']
const MOTIF_COLORS = {
  'Aphasie post-AVC':          '#C0392B',
  'Bégaiement':                '#E89020',
  'Retard de langage':         '#1D9E75',
  'Trisomie 21':               '#7B5EA7',
  'Dyslexie / Dysorthographie':'#5B6268',
  'TSA (Autisme)':             '#7BA39D',
  'Dysphagie':                 '#D4884A',
  'Dysphonie':                 '#707A82',
  'Autre':                     '#8A9BB0',
}

// ─── Mini graphe barres ───────────────────────────────────────────────────────
function BarChart({ data, color = '#7BA39D', height = 120, valueFormatter = fmt }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height, paddingTop: 20, position: 'relative' }}>
      {data.map((d, i) => {
        const pct = (d.value / max) * (height - 28)
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: 9, color: '#8A9BB0', fontWeight: 600, height: 14, display: 'flex', alignItems: 'center' }}>
              {d.value > 0 ? valueFormatter(d.value) : ''}
            </div>
            <div style={{
              width: '100%', borderRadius: '4px 4px 0 0',
              background: d.value > 0
                ? `linear-gradient(180deg, ${color}CC, ${color})`
                : '#EEF2F7',
              height: Math.max(pct, d.value > 0 ? 4 : 0),
              transition: 'height .4s ease',
              cursor: 'default',
            }} title={`${d.label} : ${valueFormatter(d.value)}`} />
            <div style={{ fontSize: 9, color: '#B0BBCC', fontWeight: 600, whiteSpace: 'nowrap' }}>{d.label}</div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Donut chart ──────────────────────────────────────────────────────────────
function DonutChart({ segments, size = 120 }) {
  const total = segments.reduce((s, sg) => s + sg.value, 0) || 1
  let offset = 0
  const r = 40, cx = 60, cy = 60, stroke = 14
  const circ = 2 * Math.PI * r

  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#EEF2F7" strokeWidth={stroke} />
      {segments.map((sg, i) => {
        const dash = (sg.value / total) * circ
        const gap  = circ - dash
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={sg.color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset}
            strokeLinecap="butt"
            style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px' }}
          />
        )
        offset += dash
        return el
      })}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="18" fontWeight="700" fill="#7BA39D" fontFamily="Georgia, serif">
        {total}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="9" fill="#8A9BB0" fontFamily="DM Sans, sans-serif">
        total
      </text>
    </svg>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPI({ label, value, sub, color = '#7BA39D', icon, trend }) {
  return (
    <div style={S.kpiCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: 20, lineHeight: 1 }}>{icon}</div>
        {trend !== undefined && (
          <div style={{
            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
            background: trend >= 0 ? '#E8F5EE' : '#FCEBEB',
            color: trend >= 0 ? '#1D7A5A' : '#C0392B',
          }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div style={{ fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 700, color, marginTop: 10, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8A9BB0', marginTop: 5 }}>
        {label}
      </div>
      {sub && <div style={{ fontSize: 11, color: '#B0BBCC', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

// ─── Section titre ────────────────────────────────────────────────────────────
function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8A9BB0', marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid #EEF2F7' }}>
      {children}
    </div>
  )
}

const S = {
  wrap:            { flex: 1, overflowY: 'auto', background: 'var(--page-bg)', fontFamily: 'DM Sans, sans-serif' },
  pageHeader:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0', flexWrap: 'wrap', gap: 12 },
  pageTitle:       { fontSize: 22, color: '#343A40', fontWeight: 750 },
  pageSub:         { fontSize: 12, color: '#8A9BB0', marginTop: 2 },
  pageEyebrow:     { color: '#68737A', fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', marginBottom: 5 },
  periodeBar:      { display: 'flex', gap: 4, background: '#fff', padding: 4, borderRadius: 10, boxShadow: '0 1px 6px rgba(52,58,64,0.08)' },
  periodeBtn:      { padding: '5px 14px', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'none', color: '#8A9BB0', fontFamily: 'DM Sans, sans-serif' },
  periodeBtnActive:{ background: '#7BA39D', color: '#fff' },
  content:         { padding: '16px 24px 32px', display: 'flex', flexDirection: 'column', gap: 16 },
  kpiGrid:         { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 4 },
  activityKpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 12 },
  kpiCard:         { background: '#fff', border: '1px solid var(--line)', borderRadius: 9, padding: '16px 18px' },
  chartCard:       { background: '#fff', border: '1px solid var(--line)', borderRadius: 9, padding: '16px 18px' },
  activitySectionHeader:{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 },
  activitySectionTitle:{ margin: 0, color: '#343A40', fontSize: 15, fontWeight: 750 },
  activitySectionSub:{ margin: '4px 0 0', color: '#7B858B', fontSize: 11 },
  activitySectionCount:{ padding: '5px 8px', borderRadius: 6, background: '#EDF4F1', color: '#567771', fontSize: 10, fontWeight: 750 },
  activityTableWrap:{ width: '100%', overflowX: 'auto' },
  activityTable:{ width: '100%', minWidth: 650, borderCollapse: 'collapse', textAlign: 'left' },
  activityTh:{ padding: '9px 10px', color: '#707A82', fontSize: 10, fontWeight: 750, textTransform: 'uppercase', borderBottom: '1px solid #E8ECEE', whiteSpace: 'nowrap' },
  activityTd:{ padding: '11px 10px', color: '#555B60', fontSize: 11, borderBottom: '1px solid #EEF1F2', whiteSpace: 'nowrap' },
  activityPatientCell:{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', borderBottom: '1px solid #EEF1F2' },
  activityAvatar:{ width: 30, height: 30, flex: '0 0 30px', display: 'grid', placeItems: 'center', borderRadius: '50%', background: '#EDF4F1', color: '#567771', fontSize: 10, fontWeight: 750 },
  activityPatientName:{ display: 'block', color: '#343A40', fontSize: 11, fontWeight: 700 },
  activityPatientStatus:{ display: 'block', marginTop: 2, color: '#7B858B', fontSize: 10 },
  activityEmpty:{ padding: '20px 10px', color: '#7B858B', fontSize: 12, textAlign: 'center' },
  activityTimeline:{ display: 'flex', flexDirection: 'column' },
  activityEvent:{ display: 'grid', gridTemplateColumns: '9px minmax(0,1fr) auto', alignItems: 'center', gap: 11, minHeight: 52, borderBottom: '1px solid #EEF1F2' },
  activityDot:{ width: 8, height: 8, borderRadius: '50%' },
  activityEventBody:{ minWidth: 0 },
  activityTime:{ color: '#7B858B', fontSize: 10, whiteSpace: 'nowrap' },
  empty:           { fontSize: 12, color: '#B0BBCC', fontStyle: 'italic', padding: '12px 0' },
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function Statistiques({ session }) {
  const [patients, setPatients]   = useState([])
  const [rdvs, setRdvs]           = useState([])
  const [factures, setFactures]   = useState([])
  const [bilans, setBilans]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [periode, setPeriode]     = useState('mois')

  function useIsMobile() {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 700)
    useEffect(() => {
      const handler = () => setIsMobile(window.innerWidth < 700)
      window.addEventListener('resize', handler)
      return () => window.removeEventListener('resize', handler)
    }, [])
    return isMobile
  }

  const isMobile = useIsMobile()
  const styles = {
    ...S,
    chartsGrid: { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 },
    activityKpiGrid: { ...S.activityKpiGrid, gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,minmax(0,1fr))' },
  }

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: p }, { data: r }, { data: f }, { data: b }] = await Promise.all([
      supabase.from('patients').select('*'),
      supabase.from('rendez_vous').select('*').order('date'),
      supabase.from('factures').select('*').order('date_seance'),
      supabase.from('bilans').select('*, bilan_templates(pathologie)').order('date'),
    ])
    setPatients(p || [])
    setRdvs(r || [])
    setFactures(f || [])
    setBilans(b || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // ── Fenêtre temporelle ──────────────────────────────────────────────────────
  const now = new Date()
  const cutoff = new Date(now)
  if (periode === 'semaine') {
    const day = now.getDay()
    cutoff.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
    cutoff.setHours(0, 0, 0, 0)
  }
  if (periode === 'mois') cutoff.setDate(1)
  if (periode === '6m') cutoff.setMonth(now.getMonth() - 6)
  if (periode === 'all') cutoff.setFullYear(2000)

  const rdvsFilt     = rdvs.filter(r => new Date(r.date) >= cutoff)
  const facturesFilt = factures.filter(f => new Date(f.date_seance || f.date) >= cutoff)
  const bilansFilt   = bilans.filter(b => new Date(b.date) >= cutoff)

  // ── KPIs patients ───────────────────────────────────────────────────────────
  const nbPatients   = patients.length
  const nbActifs     = patients.filter(p => p.statut === 'actif').length
  const nbEnBilan    = patients.filter(p => p.statut === 'bilan').length
  const nbArchives   = patients.filter(p => p.statut === 'archive').length

  // ── KPIs séances ───────────────────────────────────────────────────────────
  const nbSeances    = rdvsFilt.length
  const nbBilans     = rdvsFilt.filter(r => r.type === 'bilan').length
  const nbReeduc     = rdvsFilt.filter(r => r.type === 'reeducation').length
  const nbSuivi      = rdvsFilt.filter(r => r.type === 'suivi').length
  const nbTele       = rdvsFilt.filter(r => r.type === 'tele').length

  // ── KPIs financiers ────────────────────────────────────────────────────────
  const revTotal     = facturesFilt.filter(f => f.statut_paiement === 'payé').reduce((s, f) => s + (f.montant || 0), 0)
  const revImpaye    = facturesFilt.filter(f => f.statut_paiement === 'impayé').reduce((s, f) => s + (f.montant || 0), 0)
  const moisCur      = monthKey(now)
  const revMoisCur   = factures.filter(f => monthKey(f.date_seance || f.date) === moisCur && f.statut_paiement === 'payé').reduce((s, f) => s + (f.montant || 0), 0)
  const moisPrec     = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1))
  const revMoisPrec  = factures.filter(f => monthKey(f.date_seance || f.date) === moisPrec && f.statut_paiement === 'payé').reduce((s, f) => s + (f.montant || 0), 0)
  const trendRev     = revMoisPrec > 0 ? Math.round(((revMoisCur - revMoisPrec) / revMoisPrec) * 100) : null

  // ── Graphe séances par mois ─────────────────────────────────────────────────
  const nbMois = periode === '6m' ? 6 : 12
  const moisListe = []
  for (let i = nbMois - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    moisListe.push(monthKey(d))
  }
  const seancesParMois = moisListe.map(mk => ({
    label: monthLabel(mk),
    value: rdvs.filter(r => monthKey(r.date) === mk).length,
  }))
  const revenusParMois = moisListe.map(mk => ({
    label: monthLabel(mk),
    value: factures.filter(f => monthKey(f.date_seance || f.date) === mk && f.statut_paiement === 'payé')
      .reduce((s, f) => s + (f.montant || 0), 0),
  }))

  // ── Répartition par type de séance ─────────────────────────────────────────
  const typesSeances = [
    { label: 'Bilan',         value: nbBilans,  color: '#5B6268' },
    { label: 'Rééducation',   value: nbReeduc,  color: '#1D9E75' },
    { label: 'Suivi',         value: nbSuivi,   color: '#E89020' },
    { label: 'Téléconsult.',  value: nbTele,    color: '#7B5EA7' },
  ].filter(t => t.value > 0)

  // ── Répartition patients par motif ──────────────────────────────────────────
  const motifCount = {}
  patients.forEach(p => {
    const m = p.motif || 'Autre'
    motifCount[m] = (motifCount[m] || 0) + 1
  })
  const motifsData = Object.entries(motifCount)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value, color: MOTIF_COLORS[label] || '#8A9BB0' }))

  // ── Répartition par statut patient ─────────────────────────────────────────
  const statutsData = [
    { label: 'Actif',    value: nbActifs,   color: '#1D7A5A' },
    { label: 'En bilan', value: nbEnBilan,  color: '#5B6268' },
    { label: 'Pause',    value: patients.filter(p => p.statut === 'pause').length,   color: '#E89020' },
    { label: 'Archivé',  value: nbArchives, color: '#B0BBCC' },
  ].filter(s => s.value > 0)

  // ── Âges patients ───────────────────────────────────────────────────────────
  const ages = patients.map(p => calcAge(p.dob)).filter(Boolean)
  const ageMoyen = ages.length ? Math.round(ages.reduce((s, a) => s + a, 0) / ages.length) : null
  const ageMin   = ages.length ? Math.min(...ages) : null
  const ageMax   = ages.length ? Math.max(...ages) : null
  const tranches = [
    { label: '0-5',  value: ages.filter(a => a <= 5).length },
    { label: '6-12', value: ages.filter(a => a >= 6 && a <= 12).length },
    { label: '13-17',value: ages.filter(a => a >= 13 && a <= 17).length },
    { label: '18-40',value: ages.filter(a => a >= 18 && a <= 40).length },
    { label: '41-60',value: ages.filter(a => a >= 41 && a <= 60).length },
    { label: '60+',  value: ages.filter(a => a > 60).length },
  ]

  // ── Top patients (nb séances) ───────────────────────────────────────────────
  const seancesParPatient = {}
  rdvsFilt.forEach(r => {
    const n = r.patient_nom || '—'
    seancesParPatient[n] = (seancesParPatient[n] || 0) + 1
  })
  const topPatients = Object.entries(seancesParPatient)
    .sort((a, b) => b[1] - a[1]).slice(0, 6)

  // ── Bilans par pathologie ───────────────────────────────────────────────────
  const bilansParPatho = {}
  bilansFilt.forEach(b => {
    const p = b.bilan_templates?.pathologie || 'Autre'
    bilansParPatho[p] = (bilansParPatho[p] || 0) + 1
  })
  const bilansData = Object.entries(bilansParPatho).sort((a, b) => b[1] - a[1])

  const suiviPatients = patients.map(patient => {
    const patientName = `${patient.prenom || ''} ${patient.nom || ''}`.trim()
    const patientInvoices = facturesFilt.filter(invoice => String(invoice.patient_id || '') === String(patient.id))
      .filter(invoice => invoice.statut_paiement !== 'annulé')
    const totalFacture = patientInvoices.reduce((sum, invoice) => sum + Number(invoice.montant || 0), 0)
    const totalPaye = patientInvoices.filter(invoice => invoice.statut_paiement === 'payé')
      .reduce((sum, invoice) => sum + Number(invoice.montant || 0), 0)

    return {
      ...patient,
      patientName,
      seances: rdvsFilt.filter(rdv => rdv.patient_nom?.trim().toLowerCase() === patientName.toLowerCase()).length,
      bilans: bilansFilt.filter(bilan => String(bilan.patient_id) === String(patient.id)).length,
      totalFacture,
      totalPaye,
      reste: Math.max(totalFacture - totalPaye, 0),
    }
  }).filter(patient => patient.seances || patient.bilans || patient.totalFacture)
    .sort((a, b) => b.reste - a.reste || b.seances - a.seances)
    .slice(0, 8)

  const recentActivity = [
    ...rdvsFilt.map(rdv => ({
      key: `rdv-${rdv.id}`,
      date: rdv.date,
      heure: rdv.heure,
      patient: rdv.patient_nom || 'Patient',
      title: 'Séance planifiée',
      detail: `${rdv.duree || 60} min · ${({ bilan:'Bilan initial', reeducation:'Rééducation', suivi:'Suivi', tele:'Téléconsultation' })[rdv.type] || 'Séance'}`,
      color: '#7BA39D',
    })),
    ...bilansFilt.map(bilan => ({
      key: `bilan-${bilan.id}`,
      date: bilan.date,
      patient: patients.find(item => String(item.id) === String(bilan.patient_id))
        ? `${patients.find(item => String(item.id) === String(bilan.patient_id)).prenom || ''} ${patients.find(item => String(item.id) === String(bilan.patient_id)).nom || ''}`.trim()
        : 'Patient',
      title: bilan.statut_avancement === 'termine' ? 'Bilan finalisé' : 'Bilan mis à jour',
      detail: bilan.bilan_templates?.pathologie || 'Bilan clinique',
      color: bilan.statut_avancement === 'termine' ? '#1D7A5A' : '#5B6268',
    })),
    ...facturesFilt.map(facture => ({
      key: `facture-${facture.id}`,
      date: facture.date_seance || facture.date,
      patient: facture.patient_id
        ? patients.find(item => String(item.id) === String(facture.patient_id))
          ? `${patients.find(item => String(item.id) === String(facture.patient_id)).prenom || ''} ${patients.find(item => String(item.id) === String(facture.patient_id)).nom || ''}`.trim()
          : 'Patient'
        : 'Patient',
      title: facture.statut_paiement === 'payé' ? 'Facture réglée' : 'Facture enregistrée',
      detail: fmtMAD(facture.montant),
      color: facture.statut_paiement === 'payé' ? '#1D7A5A' : '#E89020',
    })),
  ].filter(item => item.date)
    .sort((a, b) => `${b.date} ${b.heure || ''}`.localeCompare(`${a.date} ${a.heure || ''}`))
    .slice(0, 8)

  // ── Taux occupation (séances / jours ouvrés) ────────────────────────────────
  const joursOuvres = nbMois * 22
  const tauxOccup = nbSeances > 0 ? Math.min(Math.round((nbSeances / joursOuvres) * 100), 100) : 0
  const heuresPlanifiees = Math.round(rdvsFilt.reduce((sum, rdv) => sum + Number(rdv.duree || 0), 0) / 60 * 10) / 10
  const bilansFinalises = bilansFilt.filter(b => b.statut_avancement === 'termine').length

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8A9BB0', fontSize: 14, fontFamily: 'DM Sans, sans-serif' }}>
      Chargement des statistiques…
    </div>
  )

  return (
    <div style={S.wrap}>

      {/* ── HEADER ── */}
      <div style={S.pageHeader}>
        <div>
          <div style={S.pageEyebrow}>ESPACE CABINET · PILOTAGE</div>
          <h1 style={S.pageTitle}>Activité</h1>
          <div style={S.pageSub}>Aperçu des séances, bilans et honoraires du cabinet.</div>
        </div>
        <div style={S.periodeBar}>
          {[['semaine','Semaine'],['mois','Mois'],['6m','6 mois'],['all','Tout']].map(([k, l]) => (
            <button key={k}
              style={{ ...S.periodeBtn, ...(periode === k ? S.periodeBtnActive : {}) }}
              onClick={() => setPeriode(k)}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div style={S.content}>

        <div style={S.activityKpiGrid}>
          <KPI icon="◷" label="Heures planifiées" value={`${heuresPlanifiees} h`} color="#7BA39D" sub={`${nbSeances} séances sur la période`} />
          <KPI icon="▤" label="Bilans enregistrés" value={bilansFilt.length} color="#5B6268" sub={`${bilansFinalises} finalisés`} />
          <KPI icon="↗" label="Honoraires encaissés" value={fmtMAD(revTotal)} color="#1D7A5A" sub={`${fmtMAD(revImpaye)} en attente`} />
        </div>

        <div style={styles.chartsGrid}>
          <div style={S.chartCard}>
            <SectionTitle>Répartition des séances</SectionTitle>
            {typesSeances.length === 0 ? <div style={S.empty}>Aucune séance sur la période</div> : (
              <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                <DonutChart segments={typesSeances} size={120} />
                <div style={{ flex: 1, minWidth: 150, display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {typesSeances.map((type, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: type.color, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 12, color: '#5B6268' }}>{type.label}</span>
                      <strong style={{ fontSize: 12, color: '#343A40' }}>{type.value}</strong>
                      <span style={{ width: 34, color: '#8A9BB0', fontSize: 10, textAlign: 'right' }}>
                        {nbSeances ? `${Math.round((type.value / nbSeances) * 100)}%` : '0%'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={S.chartCard}>
            <SectionTitle>Honoraires encaissés (MAD)</SectionTitle>
            <div style={{ color: '#7B858B', fontSize: 11, marginTop: -8, marginBottom: 2 }}>
              Évolution mensuelle · {fmtMAD(revTotal)} sur la période
            </div>
            <BarChart data={revenusParMois} color="#7BA39D" height={132} valueFormatter={n => n > 0 ? fmt(n) : ''} />
          </div>
        </div>

        <section style={S.chartCard}>
          <div style={S.activitySectionHeader}>
            <div>
              <h2 style={S.activitySectionTitle}>Suivi financier et thérapeutique</h2>
              <p style={S.activitySectionSub}>Séances, bilans et règlements associés aux dossiers patients.</p>
            </div>
            <span style={S.activitySectionCount}>{suiviPatients.length} dossiers</span>
          </div>
          <div style={S.activityTableWrap}>
            <table style={S.activityTable}>
              <thead>
                <tr>
                  {['Patient', 'Séances / bilans', 'Honoraires', 'Encaissé', 'Reste'].map(label => (
                    <th key={label} style={S.activityTh}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {suiviPatients.length ? suiviPatients.map(patient => (
                  <tr key={patient.id}>
                    <td style={S.activityPatientCell}>
                      <span style={S.activityAvatar}>{`${patient.prenom?.[0] || ''}${patient.nom?.[0] || ''}`.toUpperCase()}</span>
                      <span>
                        <strong style={S.activityPatientName}>{patient.patientName}</strong>
                        <small style={S.activityPatientStatus}>{patient.statut || 'Patient'}</small>
                      </span>
                    </td>
                    <td style={S.activityTd}>{patient.seances} séances · {patient.bilans} bilans</td>
                    <td style={S.activityTd}>{fmtMAD(patient.totalFacture)}</td>
                    <td style={S.activityTd}>{fmtMAD(patient.totalPaye)}</td>
                    <td style={{...S.activityTd, color:patient.reste>0?'#B36B12':'#1D7A5A', fontWeight:700}}>{fmtMAD(patient.reste)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} style={S.activityEmpty}>Aucune donnée de séance ou de facturation pour cette période.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section style={S.chartCard}>
          <div style={S.activitySectionHeader}>
            <div>
              <h2 style={S.activitySectionTitle}>Journal d’activité</h2>
              <p style={S.activitySectionSub}>Rendez-vous, bilans et factures enregistrés sur la période.</p>
            </div>
            <span style={S.activitySectionCount}>{recentActivity.length} événements</span>
          </div>
          {recentActivity.length ? (
            <div style={S.activityTimeline}>
              {recentActivity.map(item => (
                <div key={item.key} style={S.activityEvent}>
                  <span style={{...S.activityDot, background:item.color}} />
                  <div style={S.activityEventBody}>
                    <strong style={S.activityPatientName}>{item.title} · {item.patient}</strong>
                    <span style={S.activityPatientStatus}>{item.detail}</span>
                  </div>
                  <time style={S.activityTime}>{item.heure ? `${item.heure} · ` : ''}{fmtDate(item.date)}</time>
                </div>
              ))}
            </div>
          ) : <div style={S.empty}>Aucune activité sur cette période</div>}
        </section>

        <SectionTitle>Analyses complémentaires</SectionTitle>

        {/* ── MOTIFS + ÂGES ── */}
        <div style={styles.chartsGrid}>

          {/* Motifs principaux */}
          <div style={S.chartCard}>
            <SectionTitle>Motifs de consultation</SectionTitle>
            {motifsData.length === 0
              ? <div style={S.empty}>Aucun motif renseigné</div>
              : motifsData.map((m, i) => {
                const pct = Math.round((m.value / nbPatients) * 100)
                return (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 12, color: '#343A40', fontWeight: 600 }}>{m.label}</span>
                      <span style={{ fontSize: 12, color: '#8A9BB0' }}>{m.value} · {pct}%</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: '#EEF2F7', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 3, background: m.color, width: `${pct}%`, transition: 'width .5s ease' }} />
                    </div>
                  </div>
                )
              })
            }
          </div>

          {/* Tranches d'âge */}
          <div style={S.chartCard}>
            <SectionTitle>Tranches d'âge des patients</SectionTitle>
            {ages.length === 0
              ? <div style={S.empty}>Aucune date de naissance renseignée</div>
              : <>
                <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                  {[['Âge moyen', ageMoyen+' ans'], ['Min', ageMin+' ans'], ['Max', ageMax+' ans']].map(([l, v]) => (
                    <div key={l} style={{ flex: 1, textAlign: 'center', background: '#F0F4F9', borderRadius: 8, padding: '8px 4px' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#7BA39D' }}>{v}</div>
                      <div style={{ fontSize: 10, color: '#8A9BB0', marginTop: 2 }}>{l}</div>
                    </div>
                  ))}
                </div>
                <BarChart data={tranches} color="#7B5EA7" height={100} />
              </>
            }
          </div>

        </div>

        {/* ── TOP PATIENTS + BILANS ── */}
        <div style={styles.chartsGrid}>

          {/* Top patients */}
          <div style={S.chartCard}>
            <SectionTitle>Top patients — séances</SectionTitle>
            {topPatients.length === 0
              ? <div style={S.empty}>Aucune séance sur la période</div>
              : topPatients.map(([nom, nb], i) => {
                const maxNb = topPatients[0][1]
                return (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: '50%',
                          background: PALETTE[i % PALETTE.length] + '22',
                          color: PALETTE[i % PALETTE.length],
                          fontSize: 9, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {nom.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span style={{ fontSize: 12, color: '#343A40', fontWeight: 600 }}>{nom}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#7BA39D' }}>{nb} séances</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: '#EEF2F7' }}>
                      <div style={{ height: '100%', borderRadius: 2, background: PALETTE[i % PALETTE.length], width: `${Math.round((nb / maxNb) * 100)}%` }} />
                    </div>
                  </div>
                )
              })
            }
          </div>

          {/* Bilans par pathologie */}
          <div style={S.chartCard}>
            <SectionTitle>Bilans par pathologie</SectionTitle>
            {bilansData.length === 0
              ? <div style={S.empty}>Aucun bilan sur la période</div>
              : bilansData.map(([patho, nb], i) => {
                const maxNb = bilansData[0][1]
                const col = MOTIF_COLORS[patho] || PALETTE[i % PALETTE.length]
                return (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 12, color: '#343A40', fontWeight: 600 }}>{patho}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: col }}>{nb}</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: '#EEF2F7' }}>
                      <div style={{ height: '100%', borderRadius: 2, background: col, width: `${Math.round((nb / maxNb) * 100)}%` }} />
                    </div>
                  </div>
                )
              })
            }
          </div>

        </div>

        {/* ── TAUX D'OCCUPATION ── */}
        <div style={{ ...S.chartCard, marginTop: 4 }}>
          <SectionTitle>Taux d'occupation du cabinet</SectionTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: '#5B6268' }}>{nbSeances} séances / {joursOuvres} jours ouvrés estimés</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#7BA39D' }}>{tauxOccup}%</span>
              </div>
              <div style={{ height: 10, borderRadius: 5, background: '#EEF2F7', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 5, transition: 'width .6s ease',
                  background: tauxOccup >= 80 ? 'linear-gradient(90deg,#1D9E75,#1D7A5A)'
                    : tauxOccup >= 50 ? 'linear-gradient(90deg,#B6CCC5,#7BA39D)'
                    : 'linear-gradient(90deg,#E89020,#C9A84C)',
                  width: `${tauxOccup}%`,
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                <span style={{ fontSize: 10, color: '#B0BBCC' }}>0%</span>
                <span style={{ fontSize: 10, color: tauxOccup >= 50 ? '#1D7A5A' : '#E89020' }}>
                  {tauxOccup >= 80 ? '🟢 Cabinet bien rempli'
                    : tauxOccup >= 50 ? '🔵 Activité correcte'
                    : '🟡 Capacité disponible'}
                </span>
                <span style={{ fontSize: 10, color: '#B0BBCC' }}>100%</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}