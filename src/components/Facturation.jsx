import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

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
  patient_nom: '', patient_id: '', date: new Date().toISOString().slice(0, 10),
  type_acte: '', montant: '', statut: 'impayé', mode_paiement: '', notes: ''
}

function fmt(n) {
  return Number(n).toLocaleString('fr-MA', { minimumFractionDigits: 2 }) + ' MAD'
}

export default function Facturation({ session }) {
  const [factures, setFactures]   = useState([])
  const [patients, setPatients]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState('tous')
  const [selectedId, setSelectedId] = useState(null)
  const [modal, setModal]         = useState(false)
  const [editFac, setEditFac]     = useState(null)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [patSearch, setPatSearch] = useState('')
  const [patDropdown, setPatDropdown] = useState(false)

  useEffect(() => { fetchFactures(); fetchPatients() }, [])

  async function fetchFactures() {
    setLoading(true)
    const { data } = await supabase.from('factures').select('*').order('date', { ascending: false })
    setFactures(data || [])
    setLoading(false)
  }

  async function fetchPatients() {
    const { data } = await supabase.from('patients').select('id, prenom, nom').order('nom')
    setPatients(data || [])
  }

  async function saveFacture() {
    if (!form.patient_nom || !form.montant || !form.type_acte) {
      alert('Patient, type d\'acte et montant sont obligatoires.')
      return
    }
    setSaving(true)
    const payload = { ...form, user_id: session.user.id, montant: parseFloat(form.montant) }
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
    fetchFactures()
  }

  async function toggleStatut(fac) {
    const next = fac.statut === 'impayé' ? 'payé' : fac.statut === 'payé' ? 'annulé' : 'impayé'
    await supabase.from('factures').update({ statut: next }).eq('id', fac.id)
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
      patient_nom: f.patient_nom || '', patient_id: f.patient_id || '',
      date: f.date || '', type_acte: f.type_acte || '',
      montant: f.montant || '', statut: f.statut || 'impayé',
      mode_paiement: f.mode_paiement || '', notes: f.notes || ''
    })
    setPatSearch(f.patient_nom || '')
    setModal(true)
  }

  // Stats
  const total    = factures.reduce((s, f) => s + Number(f.montant), 0)
  const encaisse = factures.filter(f => f.statut === 'payé').reduce((s, f) => s + Number(f.montant), 0)
  const impaye   = factures.filter(f => f.statut === 'impayé').reduce((s, f) => s + Number(f.montant), 0)
  const nbFactures = factures.length

  // Filtrage
  let filtered = factures
  if (search) filtered = filtered.filter(f =>
    f.patient_nom.toLowerCase().includes(search.toLowerCase()) ||
    (f.type_acte || '').toLowerCase().includes(search.toLowerCase())
  )
  if (filter !== 'tous') filtered = filtered.filter(f => f.statut === filter)

  const selected = factures.find(f => f.id === selectedId)

  // Autocomplete patients
  const patSuggestions = patients.filter(p =>
    (p.prenom + ' ' + p.nom).toLowerCase().includes(patSearch.toLowerCase())
  ).slice(0, 6)

  return (
    <div style={S.wrap}>

      {/* LISTE GAUCHE */}
      <div style={S.listPanel}>

        {/* Stats mini */}
        <div style={S.statsBar}>
          <div style={S.statItem}>
            <div style={S.statVal}>{nbFactures}</div>
            <div style={S.statLbl}>Factures</div>
          </div>
          <div style={S.statDivider} />
          <div style={S.statItem}>
            <div style={{...S.statVal, color:'#1D7A5A'}}>{fmt(encaisse)}</div>
            <div style={S.statLbl}>Encaissé</div>
          </div>
          <div style={S.statDivider} />
          <div style={S.statItem}>
            <div style={{...S.statVal, color:'#8B5A00'}}>{fmt(impaye)}</div>
            <div style={S.statLbl}>Impayé</div>
          </div>
        </div>

        <div style={S.listHeader}>
          <input style={S.search} type="text" placeholder="Rechercher patient, acte…"
            value={search} onChange={e => setSearch(e.target.value)} />
          <div style={S.filters}>
            {['tous', 'impayé', 'payé', 'annulé'].map(f => (
              <button key={f} style={{ ...S.filterBtn, ...(filter === f ? S.filterActive : {}) }}
                onClick={() => setFilter(f)}>
                {f === 'tous' ? 'Tous' : STATUTS[f]}
              </button>
            ))}
          </div>
        </div>
        <div style={S.listCount}>{filtered.length} facture{filtered.length > 1 ? 's' : ''}</div>

        <div style={S.list}>
          {loading && <div style={S.emptyMsg}>Chargement…</div>}
          {!loading && filtered.length === 0 && (
            <div style={S.emptyMsg}>Aucune facture trouvée</div>
          )}
          {filtered.map(f => {
            const sc = STATUT_COLORS[f.statut] || STATUT_COLORS.annulé
            return (
              <div key={f.id}
                style={{ ...S.facCard, ...(selectedId === f.id ? S.facCardSel : {}) }}
                onClick={() => setSelectedId(f.id)}>
                <div style={S.facLeft}>
                  <div style={S.facPatient}>{f.patient_nom}</div>
                  <div style={S.facMeta}>{f.type_acte}</div>
                  <div style={S.facDate}>{f.date}</div>
                </div>
                <div style={S.facRight}>
                  <div style={S.facMontant}>{fmt(f.montant)}</div>
                  <span style={{ ...S.statBadge, background: sc.bg, color: sc.color }}>
                    {STATUTS[f.statut]}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* DETAIL DROIT */}
      <div style={S.detail}>
        {!selected ? (
          <div style={S.emptyDetail}>
            <div style={{ fontSize: 48, opacity: .25 }}>🧾</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#4A6080' }}>Sélectionnez une facture</div>
            <div style={{ fontSize: 12, color: '#8A9BB0' }}>pour voir le détail</div>
            <button style={{ ...S.addBtn, marginTop: 16 }} onClick={openNew}>+ Nouvelle facture</button>
          </div>
        ) : (
          <div style={S.detailInner}>

            {/* Header facture */}
            <div style={S.pdHeader}>
              <div style={S.facIcon}>🧾</div>
              <div style={{ flex: 1 }}>
                <div style={S.pdName}>{selected.patient_nom}</div>
                <div style={S.pdMeta}>{selected.type_acte} · {selected.date}</div>
                <div style={S.pdTags}>
                  <span style={{
                    ...S.pdTag,
                    background: STATUT_COLORS[selected.statut]?.bg,
                    color: STATUT_COLORS[selected.statut]?.color
                  }}>
                    {STATUTS[selected.statut]}
                  </span>
                  {selected.mode_paiement && (
                    <span style={{ ...S.pdTag, background: '#EBF2F9', color: '#185FA5' }}>
                      {selected.mode_paiement}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                <div style={S.bigMontant}>{fmt(selected.montant)}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={S.editBtn} onClick={() => openEdit(selected)}>✏️ Modifier</button>
                  <button style={S.addBtn} onClick={openNew}>+ Nouvelle facture</button>
                </div>
              </div>
            </div>

            {/* Infos détail */}
            <div style={S.pdGrid}>
              <div style={S.pdCard}>
                <div style={S.pdCardTitle}>Détails de la facture</div>
                {[
                  ['Patient', selected.patient_nom],
                  ['Type d\'acte', selected.type_acte],
                  ['Date', selected.date],
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
                  ['Statut', STATUTS[selected.statut]],
                  ['Mode de paiement', selected.mode_paiement],
                ].map(([l, v]) => (
                  <div key={l} style={S.pdField}>
                    <div style={S.pdFl}>{l}</div>
                    <div style={{ ...S.pdFv, ...(v ? {} : { color: '#8A9BB0', fontStyle: 'italic' }) }}>{v || 'Non renseigné'}</div>
                  </div>
                ))}
                {/* Bouton changement statut rapide */}
                <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {['impayé', 'payé', 'annulé'].map(s => (
                    <button key={s}
                      style={{
                        ...S.statQuickBtn,
                        background: selected.statut === s ? STATUT_COLORS[s].bg : '#F0F4F9',
                        color: selected.statut === s ? STATUT_COLORS[s].color : '#8A9BB0',
                        border: selected.statut === s ? `1.5px solid ${STATUT_COLORS[s].color}` : '1.5px solid #DDE5EF',
                        fontWeight: selected.statut === s ? 700 : 500,
                      }}
                      onClick={async () => {
                        await supabase.from('factures').update({ statut: s }).eq('id', selected.id)
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
            {selected.notes && (
              <div style={{ ...S.pdCard, marginBottom: 0 }}>
                <div style={S.pdCardTitle}>Notes</div>
                <div style={{ fontSize: 13, color: '#1A2744', lineHeight: 1.7 }}>{selected.notes}</div>
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
                      const sc = STATUT_COLORS[f.statut] || STATUT_COLORS.annulé
                      return (
                        <div key={f.id} style={S.autreItem} onClick={() => setSelectedId(f.id)}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#4A6080', width: 80 }}>{f.date}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#1A2744' }}>{f.type_acte}</div>
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#0C447C' }}>{fmt(f.montant)}</div>
                          <span style={{ ...S.statBadge, background: sc.bg, color: sc.color, marginLeft: 8 }}>
                            {STATUTS[f.statut]}
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

      {/* MODAL FACTURE */}
      {modal && (
        <div style={S.overlay} onClick={() => setModal(false)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <div style={S.modalHead}>
              <span style={S.modalTitle}>{editFac ? 'Modifier la facture' : 'Nouvelle facture'}</span>
              <button style={S.closeBtn} onClick={() => setModal(false)}>✕</button>
            </div>
            <div style={S.modalBody}>

              {/* Patient autocomplete */}
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
              <div style={S.frow}>
                <div style={S.fg}>
                  <label style={S.fl}>Type d'acte *</label>
                  <select style={S.fi} value={form.type_acte} onChange={e => setForm({ ...form, type_acte: e.target.value })}>
                    <option value="">Sélectionner…</option>
                    {TYPES_ACTE.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={S.fg}>
                  <label style={S.fl}>Date *</label>
                  <input style={S.fi} type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
              </div>

              {/* Montant + Mode */}
              <div style={S.sectionLabel}>Paiement</div>
              <div style={S.frow}>
                <div style={S.fg}>
                  <label style={S.fl}>Montant (MAD) *</label>
                  <input style={S.fi} type="number" min="0" step="0.01"
                    value={form.montant} onChange={e => setForm({ ...form, montant: e.target.value })}
                    placeholder="Ex: 300.00" />
                </div>
                <div style={S.fg}>
                  <label style={S.fl}>Mode de paiement</label>
                  <select style={S.fi} value={form.mode_paiement} onChange={e => setForm({ ...form, mode_paiement: e.target.value })}>
                    <option value="">—</option>
                    {MODES_PAIEMENT.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div style={S.fg}>
                <label style={S.fl}>Statut</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  {['impayé', 'payé', 'annulé'].map(s => (
                    <button key={s}
                      style={{
                        ...S.statQuickBtn,
                        background: form.statut === s ? STATUT_COLORS[s].bg : '#F0F4F9',
                        color: form.statut === s ? STATUT_COLORS[s].color : '#8A9BB0',
                        border: form.statut === s ? `1.5px solid ${STATUT_COLORS[s].color}` : '1.5px solid #DDE5EF',
                        fontWeight: form.statut === s ? 700 : 500,
                      }}
                      onClick={() => setForm({ ...form, statut: s })}>
                      {STATUTS[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div style={S.sectionLabel}>Notes</div>
              <div style={S.fg}>
                <textarea style={{ ...S.fi, minHeight: 60, resize: 'vertical' }}
                  value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
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
  listPanel:    { width: 340, borderRight: '1px solid #DDE5EF', background: '#fff', display: 'flex', flexDirection: 'column', flexShrink: 0 },
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
  facLeft:      { display: 'flex', flexDirection: 'column', gap: 2 },
  facRight:     { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 },
  facPatient:   { fontSize: 13, fontWeight: 600, color: '#1A2744' },
  facMeta:      { fontSize: 11, color: '#8A9BB0' },
  facDate:      { fontSize: 10, color: '#B0BBCC' },
  facMontant:   { fontSize: 13, fontWeight: 700, color: '#0C447C' },
  statBadge:    { fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' },
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
  addBtn:       { padding: '8px 14px', background: '#0C447C', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  pdGrid:       { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  pdCard:       { background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 12px rgba(12,68,124,0.08)' },
  pdCardTitle:  { fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A9BB0', marginBottom: 10 },
  pdField:      { marginBottom: 9 },
  pdFl:         { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8A9BB0' },
  pdFv:         { fontSize: 13, color: '#1A2744', fontWeight: 500, marginTop: 1 },
  statQuickBtn: { padding: '5px 12px', borderRadius: 20, fontSize: 11, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' },
  autreItem:    { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#F0F4F9', borderRadius: 7, cursor: 'pointer' },
  overlay:      { position: 'fixed', inset: 0, background: 'rgba(10,30,60,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalBox:     { background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560, boxShadow: '0 8px 32px rgba(12,68,124,0.18)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' },
  modalHead:    { padding: '18px 22px 14px', borderBottom: '1px solid #DDE5EF', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
  modalTitle:   { fontFamily: 'Georgia, serif', fontSize: 19, color: '#0C447C' },
  closeBtn:     { width: 28, height: 28, background: '#F0F4F9', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, color: '#8A9BB0' },
  modalBody:    { padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 11, overflowY: 'auto' },
  modalFoot:    { padding: '12px 22px 16px', display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid #DDE5EF', flexShrink: 0 },
  sectionLabel: { fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A9BB0', marginTop: 4, marginBottom: 2 },
  fg:           { display: 'flex', flexDirection: 'column', gap: 4 },
  fl:           { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#4A6080' },
  fi:           { padding: '8px 12px', border: '1.5px solid #DDE5EF', borderRadius: 8, fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box' },
  frow:         { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  patDrop:      { position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid #DDE5EF', borderRadius: 8, zIndex: 10, boxShadow: '0 4px 16px rgba(12,68,124,0.10)', overflow: 'hidden' },
  patDropItem:  { padding: '9px 14px', fontSize: 13, cursor: 'pointer', color: '#1A2744', borderBottom: '1px solid #F0F4F9' },
  dangerBtn:    { padding: '8px 14px', background: '#FCEBEB', color: '#C0392B', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginRight: 'auto' },
  cancelBtn:    { padding: '8px 14px', background: '#F0F4F9', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#4A6080', cursor: 'pointer' },
  saveBtn:      { padding: '8px 18px', background: '#0C447C', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
}