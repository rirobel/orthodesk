import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

// ── Export PDF via jsPDF (chargé dynamiquement, pas besoin d'installer) ──────
async function exportFacturePDF(fac, userId) {
  // 1. Récupérer le profil de l'ortho depuis Supabase
  const { data: profil } = await supabase
    .from('profiles')
    .select('prenom, nom, nom_cabinet, telephone, adresse, ville, code_postal, pays')
    .eq('id', userId)
    .single()

  const nomOrtho   = profil ? `${profil.prenom || ''} ${profil.nom || ''}`.trim() : ''
  const nomCabinet = profil?.nom_cabinet || ''
  const telephone  = profil?.telephone || ''
  const ligneAdresse = [
    profil?.adresse,
    [profil?.code_postal, profil?.ville].filter(Boolean).join(' '),
    profil?.pays && profil.pays !== 'Maroc' ? profil.pays : '',
  ].filter(Boolean).join(' — ')

  // 2. Charger jsPDF
  if (!window.jspdf) {
  // Chargement dynamique de jsPDF depuis CDN
  if (!window.jspdf) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
      script.onload = resolve
      script.onerror = reject
      document.head.appendChild(script)
    })
  }
}

  const { jsPDF } = window.jspdf
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const BLEU       = [12, 68, 124]
  const BLEU_LIGHT = [235, 242, 249]
  const GRIS       = [138, 155, 176]
  const NOIR       = [26, 39, 68]
  const BLANC      = [255, 255, 255]

  const STATUT_LABEL = { impayé: 'Impayé', payé: 'Payé', annulé: 'Annulé' }
  const STATUT_COLOR = {
    impayé: [139, 90, 0],
    payé:   [29, 122, 90],
    annulé: [136, 136, 136],
  }

  const W = 210

  // ── Bande en-tête bleue ────────────────────────────────────────────────────
  doc.setFillColor(...BLEU)
  doc.rect(0, 0, W, 42, 'F')

  doc.setTextColor(...BLANC)

  // Nom du cabinet (grand) ou nom de l'ortho si pas de cabinet
  const titreHaut = nomCabinet || nomOrtho || 'Cabinet d\'orthophonie'
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(titreHaut, 15, 16)

  // Si cabinet + nom ortho : nom de l'ortho en dessous
  let ligne2Y = 24
  if (nomCabinet && nomOrtho) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(nomOrtho, 15, 24)
    ligne2Y = 31
  }

  // Adresse et téléphone
  const infosContact = [ligneAdresse, telephone ? `Tél : ${telephone}` : ''].filter(Boolean).join('   |   ')
  if (infosContact) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.text(infosContact, 15, ligne2Y + (nomCabinet && nomOrtho ? 0 : -2))
  }

  // Référence + date à droite
  const ref = 'REF-' + (fac.id || '').toString().slice(0, 8).toUpperCase()
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(ref, W - 15, 16, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.text('Reçu de séance orthophonique', W - 15, 24, { align: 'right' })
  doc.text('Généré le ' + new Date().toLocaleDateString('fr-FR'), W - 15, 31, { align: 'right' })

  // ── Bloc patient ───────────────────────────────────────────────────────────
  doc.setFillColor(...BLEU_LIGHT)
  doc.roundedRect(15, 50, W - 30, 28, 4, 4, 'F')

  doc.setTextColor(...GRIS)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('PATIENT', 22, 59)

  doc.setTextColor(...NOIR)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text(fac.patient_nom || '—', 22, 68)

  // ── Ligne de séparation ────────────────────────────────────────────────────
  doc.setDrawColor(...BLEU_LIGHT)
  doc.setLineWidth(0.5)
  doc.line(15, 86, W - 15, 86)

  // ── Détails de la séance ───────────────────────────────────────────────────
  const detailsY = 94

  function field(label, value, x, y) {
    doc.setTextColor(...GRIS)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.text(label.toUpperCase(), x, y)
    doc.setTextColor(...NOIR)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.text(value || '—', x, y + 7)
  }

  field('Type d\'acte',     fac.type_seance || '—',               15,  detailsY)
  field('Date de séance',   fmtDate(fac.date_seance),              15,  detailsY + 20)
  field('Mode de paiement', fac.moyen_paiement || 'Non renseigné', 105, detailsY)

  // Statut coloré
  doc.setTextColor(...GRIS)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.text('STATUT', 105, detailsY + 20)
  const sc = STATUT_COLOR[fac.statut_paiement] || STATUT_COLOR.annulé
  doc.setTextColor(...sc)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(STATUT_LABEL[fac.statut_paiement] || '—', 105, detailsY + 27)

  // ── Grand bloc montant ─────────────────────────────────────────────────────
  doc.setFillColor(...BLEU)
  doc.roundedRect(15, 148, W - 30, 38, 4, 4, 'F')

  doc.setTextColor(...BLANC)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('MONTANT TOTAL', W / 2, 160, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(26)
  doc.text(
    Number(fac.montant).toLocaleString('fr-MA', { minimumFractionDigits: 2 }) + ' MAD',
    W / 2, 176, { align: 'center' }
  )

  // ── Notes ─────────────────────────────────────────────────────────────────
  if (fac.notes_paiement) {
    doc.setFillColor(240, 244, 249)
    doc.roundedRect(15, 196, W - 30, 30, 4, 4, 'F')

    doc.setTextColor(...GRIS)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.text('NOTES', 22, 205)

    doc.setTextColor(...NOIR)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    const lines = doc.splitTextToSize(fac.notes_paiement, W - 50)
    doc.text(lines, 22, 213)
  }

  // ── Pied de page bleu ─────────────────────────────────────────────────────
  doc.setFillColor(...BLEU)
  doc.rect(0, 282, W, 15, 'F')

  // Coordonnées de l'ortho en pied de page
  const piedTexte = [nomOrtho, telephone, ligneAdresse].filter(Boolean).join('   ·   ')
  if (piedTexte) {
    doc.setTextColor(...BLANC)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.text(piedTexte, W / 2, 291, { align: 'center', maxWidth: W - 20 })
  }

  // ── Téléchargement ────────────────────────────────────────────────────────
  const nomFichier = `Recu_${(fac.patient_nom || 'patient').replace(/\s+/g, '_')}_${fac.date_seance || 'date'}.pdf`
  doc.save(nomFichier)
}

const TYPES_ACTE = [
  'Bilan initial', 'Bilan de renouvellement', 'Séance de rééducation',
  'Séance de suivi', 'Téléconsultation', 'Compte-rendu', 'Autre'
]
const MODES_PAIEMENT = ['Espèces', 'Virement', 'Chèque', 'Mutuelle / CNSS', 'Carte bancaire']
const STATUTS = { impayé: 'Impayé', payé: 'Payé', annulé: 'Annulé' }
const STATUT_COLORS = {
  impayé: { bg: '#FEF3E2', color: '#8B5A00' },
  payé:   { bg: '#E8F5EE', color: '#1D7A5A' },
  annulé: { bg: '#F1EFE8', color: '#888' },
}

const EMPTY_FORM = {
  patient_nom: '', patient_id: '', date_seance: new Date().toISOString().slice(0, 10),
  type_seance: '', montant: '', statut_paiement: 'impayé', moyen_paiement: '', notes_paiement: ''
}

const PAGE_SIZE = 5

function fmt(n) {
  return Number(n).toLocaleString('fr-MA', { minimumFractionDigits: 2 }) + ' MAD'
}

function fmtDate(d) {
  if (!d) return '—'
  const dt = new Date(d)
  return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Hook responsive simple
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 700)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 700)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

export default function Facturation({ session }) {
  const [factures, setFactures]     = useState([])
  const [patients, setPatients]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filter, setFilter]         = useState('tous')
  const [selectedId, setSelectedId] = useState(null)
  const [modal, setModal]           = useState(false)
  const [editFac, setEditFac]       = useState(null)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [saving, setSaving]         = useState(false)
  const [patSearch, setPatSearch]   = useState('')
  const [patDropdown, setPatDropdown] = useState(false)
  const [page, setPage]             = useState(1)
  const [showDetail, setShowDetail] = useState(false) // mobile: toggle entre liste et détail

  const isMobile = useIsMobile()

  useEffect(() => { fetchFactures(); fetchPatients() }, [])

  // Reset page quand search/filter change
  useEffect(() => { setPage(1) }, [search, filter])

  async function fetchFactures() {
    setLoading(true)
    const { data } = await supabase.from('factures').select('*').order('date_seance', { ascending: false })
    setFactures(data || [])
    setLoading(false)
  }

  async function fetchPatients() {
    const { data } = await supabase.from('patients').select('id, prenom, nom').order('nom')
    setPatients(data || [])
  }

  async function saveFacture() {
    if (!form.patient_nom || !form.montant || !form.type_seance) {
      alert('Patient, type d\'acte et montant sont obligatoires.')
      return
    }
    setSaving(true)
    const payload = {
      ...form,
      orthophoniste_id: session.user.id,
      montant: parseFloat(form.montant || 0)
    }
    if (!payload.patient_id) delete payload.patient_id
    if (editFac) {
      await supabase.from('factures').update(payload).eq('id', editFac.id)
    } else {
      await supabase.from('factures').insert(payload)
    }
    setSaving(false)
    setModal(false)
    setEditFac(null)
    setForm(EMPTY_FORM)
    setPatSearch('')
    await fetchFactures()
    if (editFac) setSelectedId(editFac.id)
  }

  async function deleteFacture() {
    if (!confirm('Supprimer cette facture ?')) return
    await supabase.from('factures').delete().eq('id', editFac.id)
    setModal(false)
    setSelectedId(null)
    setEditFac(null)
    setShowDetail(false)
    fetchFactures()
  }

  function openNew() {
    setEditFac(null)
    setForm(EMPTY_FORM)
    setPatSearch('')
    setModal(true)
  }

  function openEdit(f) {
    setEditFac(f)
    setForm({
      patient_nom: f.patient_nom || '',
      patient_id: f.patient_id || '',
      date_seance: f.date_seance || '',
      type_seance: f.type_seance || '',
      montant: f.montant || '',
      statut_paiement: f.statut_paiement || 'impayé',
      moyen_paiement: f.moyen_paiement || '',
      notes_paiement: f.notes_paiement || ''
    })
    setPatSearch(f.patient_nom || '')
    setModal(true)
  }

  function selectFacture(id) {
    setSelectedId(id)
    if (isMobile) setShowDetail(true)
  }

  // Stats
  const total      = factures.reduce((s, f) => s + Number(f.montant), 0)
  const encaisse   = factures.filter(f => f.statut_paiement === 'payé').reduce((s, f) => s + Number(f.montant), 0)
  const impaye     = factures.filter(f => f.statut_paiement === 'impayé').reduce((s, f) => s + Number(f.montant), 0)
  const nbFactures = factures.length

  // Filtrage
  let filtered = factures
  if (search) filtered = filtered.filter(f =>
    (f.patient_nom || '').toLowerCase().includes(search.toLowerCase()) ||
    (f.type_seance || '').toLowerCase().includes(search.toLowerCase())
  )
  if (filter !== 'tous') filtered = filtered.filter(f => f.statut_paiement === filter)

  // Pagination
  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const selected    = factures.find(f => f.id === selectedId)

  // Autocomplete patients
  const patSuggestions = patients.filter(p =>
    (p.prenom + ' ' + p.nom).toLowerCase().includes(patSearch.toLowerCase())
  ).slice(0, 6)

  // ─── RENDU ───────────────────────────────────────────────────────────────────

  const listPanel = (
    <div style={{ ...S.listPanel, width: isMobile ? '100%' : 340 }}>

      {/* Stats mini */}
      <div style={S.statsBar}>
        <div style={S.statItem}>
          <div style={S.statVal}>{nbFactures}</div>
          <div style={S.statLbl}>Factures</div>
        </div>
        <div style={S.statDivider} />
        <div style={S.statItem}>
          <div style={{ ...S.statVal, color: '#1D7A5A' }}>{fmt(encaisse)}</div>
          <div style={S.statLbl}>Encaissé</div>
        </div>
        <div style={S.statDivider} />
        <div style={S.statItem}>
          <div style={{ ...S.statVal, color: '#8B5A00' }}>{fmt(impaye)}</div>
          <div style={S.statLbl}>Impayé</div>
        </div>
      </div>

      {/* Recherche + filtres */}
      <div style={S.listHeader}>
        <input style={S.search} type="text" placeholder="Rechercher patient, acte…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <div style={S.filters}>
          {['tous', 'impayé', 'payé', 'annulé'].map(f => (
            <button key={f}
              style={{ ...S.filterBtn, ...(filter === f ? S.filterActive : {}) }}
              onClick={() => setFilter(f)}>
              {f === 'tous' ? 'Tous' : STATUTS[f]}
            </button>
          ))}
        </div>
      </div>

      <div style={S.listCount}>{filtered.length} facture{filtered.length > 1 ? 's' : ''}</div>

      {/* Liste paginée */}
      <div style={S.list}>
        {loading && <div style={S.emptyMsg}>Chargement…</div>}
        {!loading && filtered.length === 0 && (
          <div style={S.emptyMsg}>Aucune facture trouvée</div>
        )}
        {paginated.map(f => {
          const sc = STATUT_COLORS[f.statut_paiement] || STATUT_COLORS.annulé
          return (
            <div key={f.id}
              style={{ ...S.facCard, ...(selectedId === f.id ? S.facCardSel : {}) }}
              onClick={() => selectFacture(f.id)}>
              <div style={S.facLeft}>
                <div style={S.facPatient}>{f.patient_nom}</div>
                <div style={S.facMeta}>{f.type_seance}</div>
                {/* ── DATE VISIBLE ── */}
                <div style={S.facDate}>📅 {fmtDate(f.date_seance)}</div>
              </div>
              <div style={S.facRight}>
                <div style={S.facMontant}>{fmt(f.montant)}</div>
                <span style={{ ...S.statBadge, background: sc.bg, color: sc.color }}>
                  {STATUTS[f.statut_paiement]}
                </span>
              </div>
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

      {/* Bouton nouvelle facture (mobile) */}
      {isMobile && (
        <div style={{ padding: '10px 12px', borderTop: '1px solid #DDE5EF' }}>
          <button style={{ ...S.addBtn, width: '100%', justifyContent: 'center' }} onClick={openNew}>
            + Nouvelle facture
          </button>
        </div>
      )}
    </div>
  )

  const detailPanel = (
    <div style={S.detail}>
      {isMobile && showDetail && (
        <button style={S.backBtn} onClick={() => setShowDetail(false)}>← Retour</button>
      )}
      {!selected ? (
        <div style={S.emptyDetail}>
          <div style={{ fontSize: 48, opacity: .25 }}>🧾</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#4A6080' }}>Sélectionnez une facture</div>
          <div style={{ fontSize: 12, color: '#8A9BB0' }}>pour voir le détail</div>
          {!isMobile && (
            <button style={{ ...S.addBtn, marginTop: 16 }} onClick={openNew}>+ Nouvelle facture</button>
          )}
        </div>
      ) : (
        <div style={S.detailInner}>

          {/* Header */}
          <div style={{ ...S.pdHeader, flexWrap: 'wrap', gap: 12 }}>
            <div style={S.facIcon}>🧾</div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={S.pdName}>{selected.patient_nom}</div>
              <div style={S.pdMeta}>{selected.type_seance} · {fmtDate(selected.date_seance)}</div>
              <div style={S.pdTags}>
                <span style={{
                  ...S.pdTag,
                  background: STATUT_COLORS[selected.statut_paiement]?.bg,
                  color: STATUT_COLORS[selected.statut_paiement]?.color
                }}>
                  {STATUTS[selected.statut_paiement]}
                </span>
                {selected.moyen_paiement && (
                  <span style={{ ...S.pdTag, background: '#EBF2F9', color: '#185FA5' }}>
                    {selected.moyen_paiement}
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'flex-start' : 'flex-end', gap: 8 }}>
              <div style={S.bigMontant}>{fmt(selected.montant)}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button style={S.editBtn} onClick={() => openEdit(selected)}>✏️ Modifier</button>
                <button style={S.pdfBtn} onClick={() => exportFacturePDF(selected, session.user.id)}>⬇ PDF</button>
                {!isMobile && (
                  <button style={S.addBtn} onClick={openNew}>+ Nouvelle facture</button>
                )}
              </div>
            </div>
          </div>

          {/* Détails */}
          <div style={{ ...S.pdGrid, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
            <div style={S.pdCard}>
              <div style={S.pdCardTitle}>Détails de la facture</div>
              {[
                ['Patient', selected.patient_nom],
                ['Type d\'acte', selected.type_seance],
                ['Date de séance', fmtDate(selected.date_seance)],
                ['Montant', fmt(selected.montant)],
              ].map(([l, v]) => (
                <div key={l} style={S.pdField}>
                  <div style={S.pdFl}>{l}</div>
                  <div style={{ ...S.pdFv, ...(v ? {} : { color: '#8A9BB0', fontStyle: 'italic' }) }}>{v || 'Non renseigné'}</div>
                </div>
              ))}
            </div>
            <div style={S.pdCard}>
              <div style={S.pdCardTitle}>Paiement</div>
              {[
                ['Statut', STATUTS[selected.statut_paiement]],
                ['Mode de paiement', selected.moyen_paiement],
              ].map(([l, v]) => (
                <div key={l} style={S.pdField}>
                  <div style={S.pdFl}>{l}</div>
                  <div style={{ ...S.pdFv, ...(v ? {} : { color: '#8A9BB0', fontStyle: 'italic' }) }}>{v || 'Non renseigné'}</div>
                </div>
              ))}
              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['impayé', 'payé', 'annulé'].map(s => (
                  <button key={s}
                    style={{
                      ...S.statQuickBtn,
                      background: selected.statut_paiement === s ? STATUT_COLORS[s].bg : '#F0F4F9',
                      color: selected.statut_paiement === s ? STATUT_COLORS[s].color : '#8A9BB0',
                      border: selected.statut_paiement === s ? `1.5px solid ${STATUT_COLORS[s].color}` : '1.5px solid #DDE5EF',
                      fontWeight: selected.statut_paiement === s ? 700 : 500,
                    }}
                    onClick={async () => {
                      await supabase.from('factures').update({ statut_paiement: s }).eq('id', selected.id)
                      await fetchFactures()
                      setSelectedId(selected.id)
                    }}>
                    {STATUTS[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          {selected.notes_paiement && (
            <div style={{ ...S.pdCard, marginBottom: 0 }}>
              <div style={S.pdCardTitle}>Notes</div>
              <div style={{ fontSize: 13, color: '#1A2744', lineHeight: 1.7 }}>{selected.notes_paiement}</div>
            </div>
          )}

          {/* Autres factures du même patient */}
          {(() => {
            const autres = factures.filter(f => f.patient_nom === selected.patient_nom && f.id !== selected.id)
            if (autres.length === 0) return null
            return (
              <div style={S.pdCard}>
                <div style={S.pdCardTitle}>Autres factures — {selected.patient_nom} ({autres.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {autres.map(f => {
                    const sc = STATUT_COLORS[f.statut_paiement] || STATUT_COLORS.annulé
                    return (
                      <div key={f.id} style={S.autreItem} onClick={() => setSelectedId(f.id)}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#4A6080', width: 90, flexShrink: 0 }}>{fmtDate(f.date_seance)}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#1A2744' }}>{f.type_seance}</div>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#0C447C' }}>{fmt(f.montant)}</div>
                        <span style={{ ...S.statBadge, background: sc.bg, color: sc.color, marginLeft: 8 }}>
                          {STATUTS[f.statut_paiement]}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}

        </div>
      )}
    </div>
  )

  return (
    <div style={S.wrap}>

      {/* RESPONSIVE : mobile = une vue à la fois, desktop = côte à côte */}
      {isMobile ? (
        showDetail ? detailPanel : listPanel
      ) : (
        <>
          {listPanel}
          {detailPanel}
        </>
      )}

      {/* MODAL */}
      {modal && (
        <div style={S.overlay} onClick={() => setModal(false)}>
          <div style={{ ...S.modalBox, maxWidth: isMobile ? '100%' : 560, margin: isMobile ? 0 : 'auto', borderRadius: isMobile ? '16px 16px 0 0' : 16 }}
            onClick={e => e.stopPropagation()}>
            <div style={S.modalHead}>
              <span style={S.modalTitle}>{editFac ? 'Modifier la facture' : 'Nouvelle facture'}</span>
              <button style={S.closeBtn} onClick={() => setModal(false)}>✕</button>
            </div>
            <div style={S.modalBody}>

              {/* Patient */}
              <div style={S.sectionLabel}>Patient</div>
              <div style={{ position: 'relative' }}>
                <input style={S.fi} placeholder="Rechercher un patient…"
                  value={patSearch}
                  onChange={e => {
                    setPatSearch(e.target.value)
                    setForm({ ...form, patient_nom: e.target.value, patient_id: '' })
                    setPatDropdown(true)
                  }}
                  onFocus={() => setPatDropdown(true)}
                />
                {patDropdown && patSearch.length > 0 && patSuggestions.length > 0 && (
                  <div style={S.patDrop}>
                    {patSuggestions.map(p => (
                      <div key={p.id} style={S.patDropItem}
                        onMouseDown={() => {
                          const nom = p.prenom + ' ' + p.nom
                          setPatSearch(nom)
                          setForm({ ...form, patient_nom: nom, patient_id: p.id })
                          setPatDropdown(false)
                        }}>
                        {p.prenom} {p.nom}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Acte + Date */}
              <div style={S.sectionLabel}>Acte</div>
              <div style={{ ...S.frow, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
                <div style={S.fg}>
                  <label style={S.fl}>Type d'acte *</label>
                  <select style={S.fi} value={form.type_seance} onChange={e => setForm({ ...form, type_seance: e.target.value })}>
                    <option value="">Sélectionner…</option>
                    {TYPES_ACTE.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={S.fg}>
                  <label style={S.fl}>Date *</label>
                  <input style={S.fi} type="date" value={form.date_seance} onChange={e => setForm({ ...form, date_seance: e.target.value })} />
                </div>
              </div>

              {/* Montant + Mode */}
              <div style={S.sectionLabel}>Paiement</div>
              <div style={{ ...S.frow, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
                <div style={S.fg}>
                  <label style={S.fl}>Montant (MAD) *</label>
                  <input style={S.fi} type="number" min="0" step="0.01"
                    value={form.montant} onChange={e => setForm({ ...form, montant: e.target.value })}
                    placeholder="Ex: 300.00" />
                </div>
                <div style={S.fg}>
                  <label style={S.fl}>Mode de paiement</label>
                  <select style={S.fi} value={form.moyen_paiement} onChange={e => setForm({ ...form, moyen_paiement: e.target.value })}>
                    <option value="">—</option>
                    {MODES_PAIEMENT.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div style={S.fg}>
                <label style={S.fl}>Statut</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                  {['impayé', 'payé', 'annulé'].map(s => (
                    <button key={s}
                      style={{
                        ...S.statQuickBtn,
                        background: form.statut_paiement === s ? STATUT_COLORS[s].bg : '#F0F4F9',
                        color: form.statut_paiement === s ? STATUT_COLORS[s].color : '#8A9BB0',
                        border: form.statut_paiement === s ? `1.5px solid ${STATUT_COLORS[s].color}` : '1.5px solid #DDE5EF',
                        fontWeight: form.statut_paiement === s ? 700 : 500,
                      }}
                      onClick={() => setForm({ ...form, statut_paiement: s })}>
                      {STATUTS[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div style={S.sectionLabel}>Notes</div>
              <div style={S.fg}>
                <textarea style={{ ...S.fi, minHeight: 60, resize: 'vertical' }}
                  value={form.notes_paiement} onChange={e => setForm({ ...form, notes_paiement: e.target.value })}
                  placeholder="Remarques, références, informations complémentaires…" />
              </div>

            </div>
            <div style={S.modalFoot}>
              {editFac && (
                <button style={S.dangerBtn} onClick={deleteFacture}>Supprimer</button>
              )}
              <button style={S.cancelBtn} onClick={() => setModal(false)}>Annuler</button>
              <button style={S.saveBtn} onClick={saveFacture} disabled={saving}>
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
  wrap:         { flex: 1, display: 'flex', overflow: 'hidden' },
  listPanel:    { borderRight: '1px solid #DDE5EF', background: '#fff', display: 'flex', flexDirection: 'column', flexShrink: 0 },
  statsBar:     { display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #DDE5EF', gap: 4 },
  statItem:     { flex: 1, textAlign: 'center' },
  statVal:      { fontSize: 13, fontWeight: 700, color: '#0C447C' },
  statLbl:      { fontSize: 10, color: '#8A9BB0', marginTop: 1 },
  statDivider:  { width: 1, height: 28, background: '#DDE5EF' },
  listHeader:   { padding: '12px 16px 10px', borderBottom: '1px solid #DDE5EF' },
  search:       { width: '100%', padding: '8px 12px', border: '1.5px solid #DDE5EF', borderRadius: 8, fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box' },
  filters:      { display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' },
  filterBtn:    { padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, border: '1.5px solid #DDE5EF', background: 'none', cursor: 'pointer', color: '#8A9BB0', fontFamily: 'DM Sans, sans-serif' },
  filterActive: { borderColor: '#0C447C', background: '#0C447C', color: '#fff' },
  listCount:    { fontSize: 11, color: '#8A9BB0', padding: '6px 16px', fontStyle: 'italic' },
  list:         { flex: 1, overflowY: 'auto', padding: '6px 8px' },
  emptyMsg:     { padding: '20px', textAlign: 'center', color: '#8A9BB0', fontSize: 13 },
  facCard:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, cursor: 'pointer', border: '1.5px solid transparent', marginBottom: 4, transition: 'all .12s' },
  facCardSel:   { background: '#EBF2F9', borderColor: '#3B82C4' },
  facLeft:      { display: 'flex', flexDirection: 'column', gap: 3 },
  facRight:     { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 },
  facPatient:   { fontSize: 13, fontWeight: 600, color: '#1A2744' },
  facMeta:      { fontSize: 11, color: '#8A9BB0' },
  facDate:      { fontSize: 11, color: '#6B7FA0', fontWeight: 500 },   // ← date visible, plus lisible
  facMontant:   { fontSize: 13, fontWeight: 700, color: '#0C447C' },
  statBadge:    { fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' },
  // Pagination
  pagination:   { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '10px 12px', borderTop: '1px solid #DDE5EF', flexShrink: 0 },
  pageBtn:      { minWidth: 30, height: 30, borderRadius: 6, border: '1.5px solid #DDE5EF', background: '#fff', color: '#4A6080', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  pageBtnActive:{ background: '#0C447C', color: '#fff', borderColor: '#0C447C' },
  // Détail
  detail:       { flex: 1, overflowY: 'auto', background: '#F0F4F9', padding: 20 },
  emptyDetail:  { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, color: '#8A9BB0' },
  detailInner:  { display: 'flex', flexDirection: 'column', gap: 14 },
  pdHeader:     { background: '#fff', borderRadius: 12, padding: 20, display: 'flex', alignItems: 'flex-start', gap: 16, boxShadow: '0 2px 12px rgba(12,68,124,0.08)' },
  facIcon:      { fontSize: 40, lineHeight: 1 },
  pdName:       { fontFamily: 'Georgia, serif', fontSize: 22, color: '#0C447C' },
  pdMeta:       { fontSize: 12, color: '#8A9BB0', marginTop: 3 },
  pdTags:       { display: 'flex', gap: 6, marginTop: 7, flexWrap: 'wrap' },
  pdTag:        { fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 },
  bigMontant:   { fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 700, color: '#0C447C' },
  editBtn:      { padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: '1.5px solid #DDE5EF', background: '#fff', color: '#0C447C', cursor: 'pointer' },
  pdfBtn:       { padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: '1.5px solid #1D7A5A', background: '#E8F5EE', color: '#1D7A5A', cursor: 'pointer' },
  addBtn:       { padding: '8px 14px', background: '#0C447C', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 },
  pdGrid:       { display: 'grid', gap: 14 },
  pdCard:       { background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 12px rgba(12,68,124,0.08)' },
  pdCardTitle:  { fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A9BB0', marginBottom: 10 },
  pdField:      { marginBottom: 9 },
  pdFl:         { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8A9BB0' },
  pdFv:         { fontSize: 13, color: '#1A2744', fontWeight: 500, marginTop: 1 },
  statQuickBtn: { padding: '5px 12px', borderRadius: 20, fontSize: 11, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' },
  autreItem:    { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#F0F4F9', borderRadius: 7, cursor: 'pointer', flexWrap: 'wrap' },
  // Modal
  overlay:      { position: 'fixed', inset: 0, background: 'rgba(10,30,60,0.45)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 0 },
  modalBox:     { background: '#fff', width: '100%', boxShadow: '0 8px 32px rgba(12,68,124,0.18)', display: 'flex', flexDirection: 'column', maxHeight: '92vh' },
  modalHead:    { padding: '18px 22px 14px', borderBottom: '1px solid #DDE5EF', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
  modalTitle:   { fontFamily: 'Georgia, serif', fontSize: 19, color: '#0C447C' },
  closeBtn:     { width: 28, height: 28, background: '#F0F4F9', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, color: '#8A9BB0' },
  modalBody:    { padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 11, overflowY: 'auto' },
  modalFoot:    { padding: '12px 22px 16px', display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid #DDE5EF', flexShrink: 0 },
  sectionLabel: { fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A9BB0', marginTop: 4, marginBottom: 2 },
  fg:           { display: 'flex', flexDirection: 'column', gap: 4 },
  fl:           { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#4A6080' },
  fi:           { padding: '8px 12px', border: '1.5px solid #DDE5EF', borderRadius: 8, fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box' },
  frow:         { display: 'grid', gap: 12 },
  patDrop:      { position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid #DDE5EF', borderRadius: 8, zIndex: 10, boxShadow: '0 4px 16px rgba(12,68,124,0.10)', overflow: 'hidden' },
  patDropItem:  { padding: '9px 14px', fontSize: 13, cursor: 'pointer', color: '#1A2744', borderBottom: '1px solid #F0F4F9' },
  dangerBtn:    { padding: '8px 14px', background: '#FCEBEB', color: '#C0392B', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginRight: 'auto' },
  cancelBtn:    { padding: '8px 14px', background: '#F0F4F9', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#4A6080', cursor: 'pointer' },
  saveBtn:      { padding: '8px 18px', background: '#0C447C', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  backBtn:      { display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 14, padding: '6px 12px', background: '#fff', border: '1.5px solid #DDE5EF', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#0C447C', cursor: 'pointer' },
}