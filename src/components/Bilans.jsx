import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}
const COLORS = ['#185FA5','#1D9E75','#E89020','#7B5EA7','#C0392B','#0C447C','#D4884A']
function patColor(id) { return COLORS[(id || 0) % COLORS.length] }
function initials(nom) {
  const p = (nom || '').split(' ')
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase()
}

const STATUT_COLORS = {
  brouillon:  { bg: '#FEF3E2', color: '#8B5A00' },
  finalisé:   { bg: '#E8F5EE', color: '#1D7A5A' },
}

// ─── Rendu d'un champ selon son type ─────────────────────────────────────────
function ChampField({ champ, value, onChange }) {
  const v = value ?? ''

  if (champ.type === 'textarea') return (
    <textarea style={{ ...S.fi, minHeight: 64, resize: 'vertical' }}
      value={v} onChange={e => onChange(e.target.value)}
      placeholder={champ.label + '…'} />
  )

  if (champ.type === 'text' || champ.type === 'number') return (
    <input style={S.fi} type={champ.type} value={v}
      onChange={e => onChange(e.target.value)}
      placeholder={champ.label + '…'} />
  )

  if (champ.type === 'select') return (
    <select style={S.fi} value={v} onChange={e => onChange(e.target.value)}>
      <option value="">—</option>
      {(champ.options || []).map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )

  if (champ.type === 'oui_non') return (
    <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
      {['Oui', 'Non'].map(opt => (
        <button key={opt} onClick={() => onChange(opt)}
          style={{
            padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', border: '1.5px solid',
            borderColor: v === opt ? (opt === 'Oui' ? '#1D7A5A' : '#C0392B') : '#DDE5EF',
            background:  v === opt ? (opt === 'Oui' ? '#E8F5EE' : '#FCEBEB') : '#F0F4F9',
            color:       v === opt ? (opt === 'Oui' ? '#1D7A5A' : '#C0392B') : '#8A9BB0',
          }}>
          {opt}
        </button>
      ))}
    </div>
  )

  if (champ.type === 'checkboxes') return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
      {(champ.options || []).map(opt => {
        const checked = Array.isArray(v) ? v.includes(opt) : false
        return (
          <button key={opt} onClick={() => {
            const arr = Array.isArray(v) ? [...v] : []
            onChange(checked ? arr.filter(x => x !== opt) : [...arr, opt])
          }}
            style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', border: '1.5px solid',
              borderColor: checked ? '#0C447C' : '#DDE5EF',
              background:  checked ? '#EBF2F9' : '#F0F4F9',
              color:       checked ? '#0C447C' : '#8A9BB0',
            }}>
            {opt}
          </button>
        )
      })}
    </div>
  )

  return null
}

// ─── Section grille OUI/NON ───────────────────────────────────────────────────
function GrilleOuiNon({ champs, donnees, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {champs.map((c, i) => {
        const v = donnees[c.id] ?? ''
        return (
          <div key={c.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 12px', background: i % 2 === 0 ? '#F8FAFC' : '#fff',
            borderRadius: i === 0 ? '8px 8px 0 0' : i === champs.length - 1 ? '0 0 8px 8px' : 0,
            borderBottom: i < champs.length - 1 ? '1px solid #EEF2F7' : 'none',
          }}>
            <span style={{ fontSize: 13, color: '#1A2744' }}>{c.label}</span>
            <div style={{ display: 'flex', gap: 5 }}>
              {['Oui', 'Non'].map(opt => (
                <button key={opt} onClick={() => onChange(c.id, opt)}
                  style={{
                    padding: '3px 11px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', border: '1.5px solid',
                    borderColor: v === opt ? (opt === 'Oui' ? '#1D7A5A' : '#C0392B') : '#DDE5EF',
                    background:  v === opt ? (opt === 'Oui' ? '#E8F5EE' : '#FCEBEB') : '#fff',
                    color:       v === opt ? (opt === 'Oui' ? '#1D7A5A' : '#C0392B') : '#B0BBCC',
                  }}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Section tableau phonèmes ─────────────────────────────────────────────────
function TableauPhonemes({ champs, donnees, onChange, deuxColonnes = false }) {
  const cols = deuxColonnes
    ? ['Avec lecture labiale', 'Sans lecture labiale']
    : ['+', '-']

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#F0F4F9' }}>
            <th style={{ ...S.th, textAlign: 'left' }}>Phonème</th>
            {cols.map(c => <th key={c} style={S.th}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {champs.map((c, i) => {
            const row = donnees[c.id] || {}
            return (
              <tr key={c.id} style={{ background: i % 2 === 0 ? '#F8FAFC' : '#fff' }}>
                <td style={{ ...S.td, fontWeight: 700, color: '#0C447C', width: 60 }}>{c.label}</td>
                {deuxColonnes
                  ? ['avec', 'sans'].map(k => (
                    <td key={k} style={{ ...S.td, textAlign: 'center' }}>
                      <select style={{ ...S.fiSm }}
                        value={row[k] || ''} onChange={e => onChange(c.id, { ...row, [k]: e.target.value })}>
                        <option value="">—</option>
                        {['+', '-', 'Ø', 'S (substitution)', 'D (distorsion)'].map(o =>
                          <option key={o} value={o}>{o}</option>)}
                      </select>
                    </td>
                  ))
                  : ['+', '-'].map(k => (
                    <td key={k} style={{ ...S.td, textAlign: 'center' }}>
                      <button onClick={() => onChange(c.id, row['+'] === k || row['-'] === k ? {} : k === '+' ? { '+': '+' } : { '-': '-' })}
                        style={{
                          width: 28, height: 28, borderRadius: '50%', border: '1.5px solid',
                          cursor: 'pointer', fontSize: 13, fontWeight: 700,
                          borderColor: (k === '+' ? row['+'] : row['-']) ? (k === '+' ? '#1D7A5A' : '#C0392B') : '#DDE5EF',
                          background:  (k === '+' ? row['+'] : row['-']) ? (k === '+' ? '#E8F5EE' : '#FCEBEB') : '#fff',
                          color:       (k === '+' ? row['+'] : row['-']) ? (k === '+' ? '#1D7A5A' : '#C0392B') : '#B0BBCC',
                        }}>
                        {k}
                      </button>
                    </td>
                  ))
                }
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Formulaire bilan (stepper par section) ───────────────────────────────────
function BilanForm({ templates, patients, bilan, session, onSave, onClose }) {
  const [step, setStep]       = useState(0)
  const [templateId, setTemplateId] = useState(bilan?.template_id || '')
  const [patientId, setPatientId]   = useState(bilan?.patient_id || '')
  const [date, setDate]       = useState(bilan?.date || new Date().toISOString().slice(0, 10))
  const [statut, setStatut]   = useState(bilan?.statut || 'brouillon')
  const [donnees, setDonnees] = useState(bilan?.donnees || {})
  const [conclusion, setConclusion] = useState(bilan?.conclusion || '')
  const [saving, setSaving]   = useState(false)

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

  const template = templates.find(t => t.id === Number(templateId))
  const sections = template?.sections || []
  const totalSteps = sections.length + 2 // 0=config, 1..n=sections, n+1=conclusion

  function setChamp(id, val) {
    setDonnees(d => ({ ...d, [id]: val }))
  }

  async function handleSave(statutFinal) {
    if (!patientId || !templateId) { alert('Sélectionnez un patient et un type de bilan.'); return }
    setSaving(true)
    const payload = {
      user_id: session.user.id,
      patient_id: Number(patientId),
      template_id: Number(templateId),
      date, statut: statutFinal || statut,
      donnees, conclusion,
    }
    if (bilan?.id) {
      await supabase.from('bilans').update(payload).eq('id', bilan.id)
    } else {
      await supabase.from('bilans').insert(payload)
    }
    setSaving(false)
    onSave()
  }

  const currentSection = step === 0 ? null
    : step === totalSteps - 1 ? 'conclusion'
    : sections[step - 1]

  const progress = Math.round((step / (totalSteps - 1)) * 100)

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{ ...S.modalBox, maxWidth: isMobile ? '100%' : 680 }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={S.modalHead}>
          <div>
            <span style={S.modalTitle}>
              {bilan ? 'Modifier le bilan' : 'Nouveau bilan'}
            </span>
            {template && (
              <div style={{ fontSize: 11, color: '#8A9BB0', marginTop: 3 }}>
                {template.nom} — étape {step + 1}/{totalSteps}
              </div>
            )}
          </div>
          <button style={S.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Barre de progression */}
        {template && (
          <div style={{ height: 3, background: '#DDE5EF', flexShrink: 0 }}>
            <div style={{ height: '100%', background: '#0C447C', width: `${progress}%`, transition: 'width .3s ease' }} />
          </div>
        )}

        {/* Corps */}
        <div style={S.modalBody}>

          {/* Étape 0 — config */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={S.sectionLabel}>Configuration du bilan</div>

              <div style={S.fg}>
                <label style={S.fl}>Patient *</label>
                <select style={S.fi} value={patientId} onChange={e => setPatientId(e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>)}
                </select>
              </div>

              <div style={S.fg}>
                <label style={S.fl}>Type de bilan *</label>
                <select style={S.fi} value={templateId} onChange={e => { setTemplateId(e.target.value); setDonnees({}) }}>
                  <option value="">— Sélectionner —</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.nom}</option>)}
                </select>
              </div>

              <div style={S.frow}>
                <div style={S.fg}>
                  <label style={S.fl}>Date du bilan</label>
                  <input style={S.fi} type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div style={S.fg}>
                  <label style={S.fl}>Statut</label>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    {['brouillon', 'finalisé'].map(s => (
                      <button key={s} onClick={() => setStatut(s)}
                        style={{
                          padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                          cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', border: '1.5px solid',
                          borderColor: statut === s ? STATUT_COLORS[s].color : '#DDE5EF',
                          background:  statut === s ? STATUT_COLORS[s].bg    : '#F0F4F9',
                          color:       statut === s ? STATUT_COLORS[s].color : '#8A9BB0',
                        }}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Étapes sections */}
          {currentSection && currentSection !== 'conclusion' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={S.sectionLabel}>{currentSection.titre}</div>

              {currentSection.description && (
                <div style={{ fontSize: 12, color: '#8A9BB0', fontStyle: 'italic', background: '#F0F4F9', padding: '8px 12px', borderRadius: 8 }}>
                  {currentSection.description}
                </div>
              )}

              {/* Grille OUI/NON */}
              {currentSection.type_section === 'grille_oui_non' && (
                <GrilleOuiNon
                  champs={currentSection.champs}
                  donnees={donnees}
                  onChange={(id, val) => setChamp(id, val)}
                />
              )}

              {/* Tableau phonèmes T21 */}
              {currentSection.type_section === 'tableau_phonemes' && (
                <TableauPhonemes
                  champs={currentSection.champs}
                  donnees={donnees}
                  onChange={(id, val) => setChamp(id, val)}
                  deuxColonnes={false}
                />
              )}

              {/* Tableau phonèmes TSA (avec/sans lecture labiale) */}
              {currentSection.type_section === 'tableau_phonemes_tsa' && (
                <TableauPhonemes
                  champs={currentSection.champs}
                  donnees={donnees}
                  onChange={(id, val) => setChamp(id, val)}
                  deuxColonnes={true}
                />
              )}

              {/* Champs standard */}
              {!currentSection.type_section && currentSection.champs.map(c => (
                <div key={c.id} style={S.fg}>
                  <label style={S.fl}>{c.label}</label>
                  <ChampField
                    champ={c}
                    value={donnees[c.id]}
                    onChange={val => setChamp(c.id, val)}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Étape conclusion */}
          {currentSection === 'conclusion' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={S.sectionLabel}>Conclusion du bilan</div>
              <div style={{ fontSize: 12, color: '#8A9BB0', fontStyle: 'italic' }}>
                Synthèse clinique, axes de rééducation, préconisations.
              </div>
              <textarea style={{ ...S.fi, minHeight: 180, resize: 'vertical' }}
                value={conclusion} onChange={e => setConclusion(e.target.value)}
                placeholder="Rédigez ici la conclusion du bilan…" />
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button style={{
                  ...S.saveBtn, background: '#F0F4F9', color: '#0C447C',
                  border: '1.5px solid #0C447C', flex: 1
                }}
                  onClick={() => handleSave('brouillon')} disabled={saving}>
                  💾 Enregistrer brouillon
                </button>
                <button style={{ ...S.saveBtn, flex: 1 }}
                  onClick={() => handleSave('finalisé')} disabled={saving}>
                  ✓ Finaliser le bilan
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div style={{ ...S.modalFoot, justifyContent: 'space-between' }}>
          <button style={S.cancelBtn}
            onClick={() => step === 0 ? onClose() : setStep(s => s - 1)}>
            {step === 0 ? 'Annuler' : '← Précédent'}
          </button>

          {/* Indicateurs section */}
          {template && (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div key={i} onClick={() => setStep(i)}
                  style={{
                    width: i === step ? 20 : 6, height: 6, borderRadius: 3,
                    background: i === step ? '#0C447C' : i < step ? '#3B82C4' : '#DDE5EF',
                    cursor: 'pointer', transition: 'all .2s',
                  }} />
              ))}
            </div>
          )}

          {currentSection !== 'conclusion' && (
            <button style={S.saveBtn}
              onClick={() => {
                if (step === 0 && (!patientId || !templateId)) {
                  alert('Sélectionnez un patient et un type de bilan.')
                  return
                }
                if (step < totalSteps - 1) setStep(s => s + 1)
              }}>
              {step === totalSteps - 2 ? 'Conclusion →' : 'Suivant →'}
            </button>
          )}
          {currentSection === 'conclusion' && (
            <div style={{ width: 80 }} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function Bilans({ session }) {
  const [bilans, setBilans]       = useState([])
  const [templates, setTemplates] = useState([])
  const [patients, setPatients]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState('tous')
  const [selectedId, setSelectedId] = useState(null)
  const [modal, setModal]         = useState(false)
  const [editBilan, setEditBilan] = useState(null)

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

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: b }, { data: t }, { data: p }] = await Promise.all([
      supabase.from('bilans').select('*, patients(prenom, nom), bilan_templates(nom, pathologie)')
        .order('date', { ascending: false }),
      supabase.from('bilan_templates').select('*').order('pathologie'),
      supabase.from('patients').select('id, prenom, nom').order('nom'),
    ])
    setBilans(b || [])
    setTemplates(t || [])
    setPatients(p || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function deleteBilan(id) {
    if (!confirm('Supprimer ce bilan ?')) return
    await supabase.from('bilans').delete().eq('id', id)
    setSelectedId(null)
    load()
  }

  async function toggleStatut(b) {
    const next = b.statut === 'brouillon' ? 'finalisé' : 'brouillon'
    await supabase.from('bilans').update({ statut: next }).eq('id', b.id)
    load()
  }

  // ─── Export PDF (jsPDF + AutoTable) ────────────────────────────────────────
  async function exportPDF(bilan) {
    // Chargement jsPDF depuis CDN si pas encore présent
    if (!window.jspdf) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
        script.onload = resolve
        script.onerror = reject
        document.head.appendChild(script)
      })
    }
    // Chargement autoTable depuis CDN
    if (!window.jspdf?.jsPDF?.API?.autoTable) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'
        script.onload = resolve
        script.onerror = reject
        document.head.appendChild(script)
      })
    }

    const { jsPDF } = window.jspdf
    const template   = templates.find(t => t.id === bilan.template_id)
    const patient    = bilan.patients
    const patNom     = patient ? `${patient.prenom} ${patient.nom}` : '—'
    const sections   = template?.sections || []
    const donnees    = bilan.donnees || {}
    const orthoEmail = session?.user?.email || ''

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const PW = 210  // largeur page A4
    const ML = 14   // marge gauche
    const MR = 14   // marge droite
    const CW = PW - ML - MR  // largeur contenu
    let y = 14

    // Couleurs
    const BLEU    = [12, 68, 124]
    const GRIS    = [138, 155, 176]
    const NOIR    = [26, 39, 68]
    const VERT    = [29, 122, 90]
    const ROUGE   = [192, 57, 43]
    const BGGRIS  = [240, 244, 249]

    // ── En-tête ──────────────────────────────────────────────
    // Barre bleue top
    doc.setFillColor(...BLEU)
    doc.rect(0, 0, PW, 1.5, 'F')

    // Titre gauche
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(...BLEU)
    doc.text('Bilan Orthophonique', ML, y + 6)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...GRIS)
    doc.text(template?.nom || '', ML, y + 11)

    // Infos ortho à droite
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...BLEU)
    doc.text('Awale Cure', PW - MR, y + 4, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRIS)
    doc.text(orthoEmail, PW - MR, y + 8, { align: 'right' })
    doc.text('orthodesk.vercel.app', PW - MR, y + 12, { align: 'right' })

    y += 16
    // Ligne séparatrice
    doc.setDrawColor(...BLEU)
    doc.setLineWidth(0.4)
    doc.line(ML, y, PW - MR, y)
    y += 5

    // ── Bloc patient ──────────────────────────────────────────
    doc.setFillColor(...BGGRIS)
    doc.roundedRect(ML, y, CW, 18, 2, 2, 'F')

    const cols4 = CW / 4
    const labels = ['Patient', 'Pathologie', 'Date du bilan', 'Statut']
    const vals   = [patNom, template?.pathologie || '—', fmtDate(bilan.date), bilan.statut]

    labels.forEach((lbl, i) => {
      const x = ML + i * cols4 + 3
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(...GRIS)
      doc.text(lbl.toUpperCase(), x, y + 5)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(...NOIR)
      // Tronquer si trop long
      const maxW = cols4 - 4
      const txt  = doc.splitTextToSize(vals[i], maxW)[0]
      doc.text(txt, x, y + 11)
    })
    y += 23

    // ── Sections ──────────────────────────────────────────────
    sections.forEach(section => {
      const champs = section.champs || []

      // Vérifier s'il y a des données dans cette section
      const hasDonnees = champs.some(c => {
        const v = donnees[c.id]
        return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length)
      })
      if (!hasDonnees) return

      // Saut de page si nécessaire (laisser 30mm en bas)
      if (y > 260) { doc.addPage(); y = 14 }

      // Titre section
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(...GRIS)
      doc.text(section.titre.toUpperCase(), ML, y)
      doc.setDrawColor(...GRIS)
      doc.setLineWidth(0.2)
      doc.line(ML, y + 1, PW - MR, y + 1)
      y += 5

      // ── Grille OUI/NON ────────────────────────────────────
      if (section.type_section === 'grille_oui_non') {
        const rows = []
        champs.forEach(c => {
          const v = donnees[c.id]
          if (!v) return
          rows.push([c.label, v])
        })
        if (!rows.length) return

        doc.autoTable({
          startY: y,
          margin: { left: ML, right: MR },
          head: [],
          body: rows,
          columnStyles: {
            0: { cellWidth: CW * 0.78, fontSize: 9, textColor: NOIR },
            1: { cellWidth: CW * 0.22, fontSize: 9, fontStyle: 'bold', halign: 'center' },
          },
          didParseCell(data) {
            if (data.column.index === 1) {
              const v = data.cell.raw
              data.cell.styles.textColor = v === 'Oui' ? VERT : ROUGE
            }
          },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          styles: { cellPadding: 2.5, lineColor: [240, 244, 249], lineWidth: 0.1 },
          theme: 'grid',
        })
        y = doc.lastAutoTable.finalY + 6

      // ── Tableau phonèmes ──────────────────────────────────
      } else if (section.type_section === 'tableau_phonemes' || section.type_section === 'tableau_phonemes_tsa') {
        const deuxCols = section.type_section === 'tableau_phonemes_tsa'
        const colH = deuxCols ? ['Phonème', 'Avec lecture labiale', 'Sans lecture labiale'] : ['Phonème', '+', '−']
        const rows = []

        champs.forEach(c => {
          const v = donnees[c.id]
          if (!v || (typeof v === 'object' && !Object.values(v).some(Boolean))) return
          if (deuxCols) {
            rows.push([c.label, (v && v.avec) || '—', (v && v.sans) || '—'])
          } else {
            rows.push([c.label, (v && v['+']) ? '+' : '—', (v && v['-']) ? '−' : '—'])
          }
        })
        if (!rows.length) return

        // Afficher en 3 colonnes côte à côte pour gagner de la place
        const chunk = 12
        for (let i = 0; i < rows.length; i += chunk * 3) {
          const part1 = rows.slice(i, i + chunk)
          const part2 = rows.slice(i + chunk, i + chunk * 2)
          const part3 = rows.slice(i + chunk * 2, i + chunk * 3)
          const maxLen = Math.max(part1.length, part2.length, part3.length)
          const merged = []
          for (let j = 0; j < maxLen; j++) {
            const r1 = part1[j] || ['', '', '']
            const r2 = part2[j] || ['', '', '']
            const r3 = part3[j] || ['', '', '']
            merged.push([r1[0], r1[1], r1[2], r2[0], r2[1], r2[2], r3[0], r3[1], r3[2]])
          }
          const cw = CW / 3
          doc.autoTable({
            startY: y,
            margin: { left: ML, right: MR },
            head: [[colH[0], colH[1], colH[2], colH[0], colH[1], colH[2], colH[0], colH[1], colH[2]]],
            body: merged,
            headStyles: { fillColor: BGGRIS, textColor: GRIS, fontSize: 7, fontStyle: 'bold' },
            columnStyles: {
              0: { cellWidth: cw * 0.4, fontSize: 9, fontStyle: 'bold', textColor: BLEU },
              1: { cellWidth: cw * 0.3, fontSize: 9, halign: 'center' },
              2: { cellWidth: cw * 0.3, fontSize: 9, halign: 'center' },
              3: { cellWidth: cw * 0.4, fontSize: 9, fontStyle: 'bold', textColor: BLEU },
              4: { cellWidth: cw * 0.3, fontSize: 9, halign: 'center' },
              5: { cellWidth: cw * 0.3, fontSize: 9, halign: 'center' },
              6: { cellWidth: cw * 0.4, fontSize: 9, fontStyle: 'bold', textColor: BLEU },
              7: { cellWidth: cw * 0.3, fontSize: 9, halign: 'center' },
              8: { cellWidth: cw * 0.3, fontSize: 9, halign: 'center' },
            },
            didParseCell(data) {
              const col = data.column.index
              if ([1, 2, 4, 5, 7, 8].includes(col)) {
                const v = data.cell.raw
                if (v === '+') data.cell.styles.textColor = VERT
                else if (v === '−') data.cell.styles.textColor = ROUGE
              }
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            styles: { cellPadding: 2, lineColor: [240, 244, 249], lineWidth: 0.1 },
            theme: 'grid',
          })
          y = doc.lastAutoTable.finalY + 4
        }
        y += 2

      // ── Champs standard ───────────────────────────────────
      } else {
        champs.forEach(c => {
          const v = donnees[c.id]
          if (v === undefined || v === null || v === '') return
          const display = Array.isArray(v) ? v.join(', ') : String(v)

          if (y > 270) { doc.addPage(); y = 14 }

          // Label
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(7.5)
          doc.setTextColor(...GRIS)
          doc.text(c.label.toUpperCase(), ML, y)
          y += 3.5

          // Valeur (multiligne si textarea)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(9.5)
          doc.setTextColor(...NOIR)
          const lines = doc.splitTextToSize(display, CW)
          lines.forEach(line => {
            if (y > 275) { doc.addPage(); y = 14 }
            doc.text(line, ML, y)
            y += 4.5
          })
          y += 2
        })
        y += 2
      }
    })

    // ── Conclusion ────────────────────────────────────────────
    if (bilan.conclusion) {
      if (y > 240) { doc.addPage(); y = 14 }

      // Barre latérale bleue
      doc.setFillColor(...BLEU)
      const concluLines = doc.splitTextToSize(bilan.conclusion, CW - 6)
      const concluH = concluLines.length * 5 + 14
      doc.rect(ML, y - 2, 1.5, concluH, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(...GRIS)
      doc.text('CONCLUSION', ML + 5, y + 2)

      doc.setDrawColor(...GRIS)
      doc.setLineWidth(0.2)
      doc.line(ML + 5, y + 3, PW - MR, y + 3)
      y += 7

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      doc.setTextColor(...NOIR)
      concluLines.forEach(line => {
        if (y > 278) { doc.addPage(); y = 14 }
        doc.text(line, ML + 5, y)
        y += 5
      })
    }

    // ── Pied de page sur toutes les pages ─────────────────────
    const nbPages = doc.getNumberOfPages()
    for (let i = 1; i <= nbPages; i++) {
      doc.setPage(i)
      doc.setFillColor(...BLEU)
      doc.rect(0, 290, PW, 7, 'F')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(255, 255, 255)
      doc.text(`OrthoDesk · Généré le ${new Date().toLocaleDateString('fr-FR')}`, ML, 294.5)
      doc.text(`${patNom} · ${template?.pathologie || ''} · Page ${i}/${nbPages}`, PW - MR, 294.5, { align: 'right' })
    }

    // ── Téléchargement ────────────────────────────────────────
    const filename = `Bilan_${patNom.replace(/ /g, '_')}_${bilan.date}.pdf`
    doc.save(filename)
  }

  // Filtrage
  let filtered = bilans
  if (search) filtered = filtered.filter(b => {
    const nom = b.patients ? `${b.patients.prenom} ${b.patients.nom}`.toLowerCase() : ''
    return nom.includes(search.toLowerCase()) ||
      (b.bilan_templates?.pathologie || '').toLowerCase().includes(search.toLowerCase())
  })
  if (filter !== 'tous') filtered = filtered.filter(b => b.statut === filter)

  const selected = bilans.find(b => b.id === selectedId)
  const selTemplate = selected ? templates.find(t => t.id === selected.template_id) : null

  return (
    <div style={S.wrap}>

      {/* ── LISTE GAUCHE ── */}
      <div style={S.listPanel}>

        {/* Stats mini */}
        <div style={S.statsBar}>
          <div style={S.statItem}>
            <div style={S.statVal}>{bilans.length}</div>
            <div style={S.statLbl}>Bilans</div>
          </div>
          <div style={S.statDiv} />
          <div style={S.statItem}>
            <div style={{ ...S.statVal, color: '#1D7A5A' }}>
              {bilans.filter(b => b.statut === 'finalisé').length}
            </div>
            <div style={S.statLbl}>Finalisés</div>
          </div>
          <div style={S.statDiv} />
          <div style={S.statItem}>
            <div style={{ ...S.statVal, color: '#8B5A00' }}>
              {bilans.filter(b => b.statut === 'brouillon').length}
            </div>
            <div style={S.statLbl}>Brouillons</div>
          </div>
        </div>

        <div style={S.listHeader}>
          <input style={S.search} type="text" placeholder="Rechercher patient, pathologie…"
            value={search} onChange={e => setSearch(e.target.value)} />
          <div style={S.filters}>
            {['tous', 'brouillon', 'finalisé'].map(f => (
              <button key={f} style={{ ...S.filterBtn, ...(filter === f ? S.filterActive : {}) }}
                onClick={() => setFilter(f)}>
                {f === 'tous' ? 'Tous' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div style={S.listCount}>{filtered.length} bilan{filtered.length > 1 ? 's' : ''}</div>

        <div style={S.list}>
          {loading && <div style={S.emptyMsg}>Chargement…</div>}
          {!loading && filtered.length === 0 && <div style={S.emptyMsg}>Aucun bilan trouvé</div>}
          {filtered.map(b => {
            const nom = b.patients ? `${b.patients.prenom} ${b.patients.nom}` : '—'
            const col = patColor(b.patient_id)
            const sc  = STATUT_COLORS[b.statut] || STATUT_COLORS.brouillon
            return (
              <div key={b.id}
                style={{ ...S.bilanCard, ...(selectedId === b.id ? S.bilanCardSel : {}) }}
                onClick={() => setSelectedId(b.id)}>
                <div style={{ ...S.patAv, background: col + '22', color: col }}>
                  {initials(nom)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={S.bilanPatient}>{nom}</div>
                  <div style={S.bilanMeta}>{b.bilan_templates?.pathologie || '—'}</div>
                  <div style={S.bilanDate}>{fmtDate(b.date)}</div>
                </div>
                <span style={{ ...S.statBadge, background: sc.bg, color: sc.color }}>
                  {b.statut}
                </span>
              </div>
            )
          })}
        </div>

        <div style={S.addBtnWrap}>
          <button style={S.addBtnFull} onClick={() => { setEditBilan(null); setModal(true) }}>
            + Nouveau bilan
          </button>
        </div>
      </div>

      {/* ── DETAIL DROIT ── */}
      <div style={S.detail}>
        {!selected ? (
          <div style={S.emptyDetail}>
            <div style={{ fontSize: 48, opacity: .25 }}>📋</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#4A6080' }}>Sélectionnez un bilan</div>
            <div style={{ fontSize: 12, color: '#8A9BB0' }}>pour voir le contenu</div>
            <button style={{ ...S.addBtn, marginTop: 16 }} onClick={() => { setEditBilan(null); setModal(true) }}>
              + Nouveau bilan
            </button>
          </div>
        ) : (
          <div style={S.detailInner}>

            {/* Header */}
            <div style={S.pdHeader}>
              <div style={{ fontSize: 40, lineHeight: 1 }}>📋</div>
              <div style={{ flex: 1 }}>
                <div style={S.pdName}>
                  {selected.patients ? `${selected.patients.prenom} ${selected.patients.nom}` : '—'}
                </div>
                <div style={S.pdMeta}>
                  {selected.bilan_templates?.nom} · {fmtDate(selected.date)}
                </div>
                <div style={S.pdTags}>
                  <span style={{
                    ...S.pdTag,
                    background: STATUT_COLORS[selected.statut]?.bg,
                    color: STATUT_COLORS[selected.statut]?.color,
                  }}>
                    {selected.statut}
                  </span>
                  {selected.bilan_templates?.pathologie && (
                    <span style={{ ...S.pdTag, background: '#EBF2F9', color: '#185FA5' }}>
                      {selected.bilan_templates.pathologie}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <button style={S.editBtn}
                    onClick={() => { setEditBilan(selected); setModal(true) }}>
                    ✏️ Modifier
                  </button>
                  <button style={{
                    ...S.editBtn,
                    background: STATUT_COLORS[selected.statut === 'brouillon' ? 'finalisé' : 'brouillon'].bg,
                    color: STATUT_COLORS[selected.statut === 'brouillon' ? 'finalisé' : 'brouillon'].color,
                    borderColor: STATUT_COLORS[selected.statut === 'brouillon' ? 'finalisé' : 'brouillon'].color,
                  }}
                    onClick={() => toggleStatut(selected)}>
                    {selected.statut === 'brouillon' ? '✓ Finaliser' : '↩ Brouillon'}
                  </button>
                  <button style={{
                    ...S.editBtn,
                    background: '#0C447C', color: '#fff',
                    border: 'none', fontWeight: 700,
                  }}
                    onClick={() => exportPDF(selected)}>
                    ⬇ Export PDF
                  </button>
                </div>
                <button style={{ ...S.dangerBtn, fontSize: 11, padding: '4px 10px' }}
                  onClick={() => deleteBilan(selected.id)}>
                  Supprimer
                </button>
              </div>
            </div>

            {/* Contenu sections */}
            {selTemplate && (selTemplate.sections || []).map((section, si) => {
              const champsRenseignes = (section.champs || []).filter(c => {
                const v = selected.donnees?.[c.id]
                return v !== undefined && v !== '' && v !== null &&
                  !(Array.isArray(v) && v.length === 0)
              })
              if (champsRenseignes.length === 0 && !section.type_section) return null

              return (
                <div key={si} style={S.pdCard}>
                  <div style={S.pdCardTitle}>{section.titre}</div>

                  {section.type_section === 'grille_oui_non' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {(section.champs || []).map(c => {
                        const v = selected.donnees?.[c.id]
                        if (!v) return null
                        return (
                          <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', borderBottom: '1px solid #F0F4F9' }}>
                            <span style={{ color: '#4A6080' }}>{c.label}</span>
                            <span style={{
                              fontWeight: 700,
                              color: v === 'Oui' ? '#1D7A5A' : '#C0392B'
                            }}>{v}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {(section.type_section === 'tableau_phonemes' || section.type_section === 'tableau_phonemes_tsa') && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(section.champs || []).map(c => {
                        const v = selected.donnees?.[c.id]
                        if (!v || (typeof v === 'object' && !v['+'] && !v['-'] && !v.avec && !v.sans)) return null
                        const display = typeof v === 'object'
                          ? Object.entries(v).filter(([, val]) => val).map(([k, val]) => `${k}: ${val}`).join(' | ')
                          : v
                        return (
                          <span key={c.id} style={{
                            fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                            background: '#F0F4F9', color: '#0C447C',
                          }}>
                            {c.label} {display}
                          </span>
                        )
                      })}
                    </div>
                  )}

                  {!section.type_section && champsRenseignes.map(c => {
                    const v = selected.donnees?.[c.id]
                    const display = Array.isArray(v) ? v.join(', ') : v
                    return (
                      <div key={c.id} style={S.pdField}>
                        <div style={S.pdFl}>{c.label}</div>
                        <div style={S.pdFv}>{display}</div>
                      </div>
                    )
                  })}
                </div>
              )
            })}

            {/* Conclusion */}
            {selected.conclusion && (
              <div style={S.pdCard}>
                <div style={S.pdCardTitle}>Conclusion</div>
                <div style={{ fontSize: 13, color: '#1A2744', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                  {selected.conclusion}
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* ── MODAL ── */}
      {modal && (
        <BilanForm
          templates={templates}
          patients={patients}
          bilan={editBilan}
          session={session}
          onSave={() => { setModal(false); setEditBilan(null); load() }}
          onClose={() => { setModal(false); setEditBilan(null) }}
        />
      )}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  wrap:         { flex: 1, display: 'flex', overflow: 'hidden', fontFamily: 'DM Sans, sans-serif' },
  listPanel:    { width: 320, minWidth: 280, borderRight: '1px solid #DDE5EF', background: '#fff', display: 'flex', flexDirection: 'column', flexShrink: 0 },
  statsBar:     { display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid #DDE5EF', gap: 4 },
  statItem:     { flex: 1, textAlign: 'center' },
  statVal:      { fontSize: 12, fontWeight: 700, color: '#0C447C' },
  statLbl:      { fontSize: 10, color: '#8A9BB0', marginTop: 1 },
  statDiv:      { width: 1, height: 26, background: '#DDE5EF' },
  listHeader:   { padding: '12px 14px 8px', borderBottom: '1px solid #DDE5EF' },
  search:       { width: '100%', padding: '8px 12px', border: '1.5px solid #DDE5EF', borderRadius: 8, fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box' },
  filters:      { display: 'flex', gap: 4, marginTop: 7, flexWrap: 'wrap' },
  filterBtn:    { padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, border: '1.5px solid #DDE5EF', background: 'none', cursor: 'pointer', color: '#8A9BB0', fontFamily: 'DM Sans, sans-serif' },
  filterActive: { borderColor: '#0C447C', background: '#0C447C', color: '#fff' },
  listCount:    { fontSize: 11, color: '#8A9BB0', padding: '5px 14px', fontStyle: 'italic' },
  list:         { flex: 1, overflowY: 'auto', padding: '6px 6px' },
  emptyMsg:     { padding: '24px', textAlign: 'center', color: '#8A9BB0', fontSize: 13 },
  bilanCard:    { display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', borderRadius: 10, cursor: 'pointer', border: '1.5px solid transparent', marginBottom: 4 },
  bilanCardSel: { background: '#EBF2F9', borderColor: '#3B82C4' },
  patAv:        { width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 },
  bilanPatient: { fontSize: 13, fontWeight: 600, color: '#1A2744' },
  bilanMeta:    { fontSize: 11, color: '#8A9BB0', marginTop: 1 },
  bilanDate:    { fontSize: 10, color: '#B0BBCC', marginTop: 1 },
  statBadge:    { fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, whiteSpace: 'nowrap' },
  addBtnWrap:   { padding: '10px 10px', borderTop: '1px solid #DDE5EF' },
  addBtnFull:   { width: '100%', padding: '9px', background: '#0C447C', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  detail:       { flex: 1, overflowY: 'auto', background: '#F0F4F9', padding: 20 },
  emptyDetail:  { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, color: '#8A9BB0' },
  detailInner:  { display: 'flex', flexDirection: 'column', gap: 14 },
  pdHeader:     { background: '#fff', borderRadius: 12, padding: 20, display: 'flex', alignItems: 'flex-start', gap: 16, boxShadow: '0 2px 12px rgba(12,68,124,0.08)', flexWrap: 'wrap' },
  pdName:       { fontFamily: 'Georgia, serif', fontSize: 22, color: '#0C447C' },
  pdMeta:       { fontSize: 12, color: '#8A9BB0', marginTop: 3 },
  pdTags:       { display: 'flex', gap: 6, marginTop: 7, flexWrap: 'wrap' },
  pdTag:        { fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 },
  editBtn:      { padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: '1.5px solid #DDE5EF', background: '#fff', color: '#0C447C', cursor: 'pointer' },
  addBtn:       { padding: '8px 14px', background: '#0C447C', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  pdCard:       { background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 12px rgba(12,68,124,0.08)' },
  pdCardTitle:  { fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A9BB0', marginBottom: 12 },
  pdField:      { marginBottom: 9 },
  pdFl:         { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8A9BB0' },
  pdFv:         { fontSize: 13, color: '#1A2744', fontWeight: 500, marginTop: 1 },
  overlay:      { position: 'fixed', inset: 0, background: 'rgba(10,30,60,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalBox:     { background: '#fff', borderRadius: 16, width: '100%', boxShadow: '0 8px 32px rgba(12,68,124,0.18)', display: 'flex', flexDirection: 'column', maxHeight: '92vh' },
  modalHead:    { padding: '18px 22px 14px', borderBottom: '1px solid #DDE5EF', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
  modalTitle:   { fontFamily: 'Georgia, serif', fontSize: 19, color: '#0C447C' },
  closeBtn:     { width: 28, height: 28, background: '#F0F4F9', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, color: '#8A9BB0' },
  modalBody:    { padding: '20px 22px', overflowY: 'auto', flex: 1 },
  modalFoot:    { padding: '12px 22px 16px', display: 'flex', gap: 8, alignItems: 'center', borderTop: '1px solid #DDE5EF', flexShrink: 0 },
  sectionLabel: { fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A9BB0', marginBottom: 4 },
  fg:           { display: 'flex', flexDirection: 'column', gap: 4 },
  fl:           { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#4A6080' },
  fi:           { padding: '8px 12px', border: '1.5px solid #DDE5EF', borderRadius: 8, fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box' },
  fiSm:         { padding: '4px 8px', border: '1.5px solid #DDE5EF', borderRadius: 6, fontSize: 12, fontFamily: 'DM Sans, sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box' },
  frow:         { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  th:           { padding: '8px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8A9BB0', textAlign: 'center' },
  td:           { padding: '6px 10px', fontSize: 13, color: '#1A2744' },
  dangerBtn:    { padding: '8px 14px', background: '#FCEBEB', color: '#C0392B', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  cancelBtn:    { padding: '8px 14px', background: '#F0F4F9', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#4A6080', cursor: 'pointer' },
  saveBtn:      { padding: '8px 18px', background: '#0C447C', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
}