import { useState } from 'react'
import { supabase } from '../supabase'

const ORANGE = '#C9A84C'
const BLEU   = '#0C447C'

const MODULES = [
  {
    icon: '🗓',
    title: 'Agenda',
    desc: 'Planifiez vos séances semaine par semaine. Cliquez sur un créneau pour créer un RDV en 10 secondes.',
    color: '#185FA5',
    bg: '#EBF2F9',
  },
  {
    icon: '👤',
    title: 'Patients',
    desc: 'Dossier complet pour chaque patient : infos, séances, notes cliniques et historique.',
    color: '#1D9E75',
    bg: '#E8F5EE',
  },
  {
    icon: '📋',
    title: 'Bilans',
    desc: '7 templates cliniques prêts à l\'emploi : TSA, Dyslexie, Bégaiement, Aphasie et plus.',
    color: '#7B5EA7',
    bg: '#F7F0FB',
  },
  {
    icon: '💶',
    title: 'Facturation',
    desc: 'Créez et suivez vos factures. Export PDF en un clic pour vos patients et votre comptabilité.',
    color: ORANGE,
    bg: '#FEF3E2',
  },
  {
    icon: '📊',
    title: 'Statistiques',
    desc: 'Visualisez l\'activité de votre cabinet : revenus, séances, patients actifs par période.',
    color: '#C0392B',
    bg: '#FCEBEB',
  },
]

export default function Onboarding({ session, onDone }) {
  const [step, setStep]     = useState(1)
  const [saving, setSaving] = useState(false)
  const [profil, setProfil] = useState({
    nom_cabinet: '',
    telephone:   '',
    adresse:     '',
    ville:       '',
  })

  const totalSteps = 4
  const prenom = session?.user?.user_metadata?.prenom
    || session?.user?.email?.split('@')[0]
    || 'là'

  async function saveProfil() {
    if (!profil.nom_cabinet && !profil.telephone) { nextStep(); return }
    setSaving(true)
    await supabase.from('profiles').update({
      nom_cabinet: profil.nom_cabinet || null,
      telephone:   profil.telephone   || null,
      adresse:     profil.adresse     || null,
      ville:       profil.ville       || null,
    }).eq('id', session.user.id)
    setSaving(false)
    nextStep()
  }

  function nextStep() { setStep(s => s + 1) }
  function prevStep() { setStep(s => s - 1) }

  function finish() {
    localStorage.setItem(`ortho_onboarded_${session.user.id}`, '1')
    onDone()
  }

  return (
    <div style={S.wrap}>
      <div style={S.card}>

        {/* Logo + progression */}
        <div style={S.topBar}>
          <div style={S.logo}>
            <span style={S.logoO}>Ortho</span><span style={S.logoD}>Desk</span>
          </div>
          <div style={S.steps}>
            {Array.from({ length: totalSteps }, (_, i) => (
              <div key={i} style={{
                ...S.stepDot,
                background: i + 1 <= step ? ORANGE : '#DDE5EF',
                width: i + 1 === step ? 24 : 8,
              }} />
            ))}
          </div>
        </div>

        {/* ── ÉTAPE 1 : Bienvenue ──────────────────────────────────── */}
        {step === 1 && (
          <div style={S.body}>
            <div style={S.bigEmoji}>👋</div>
            <h1 style={S.h1}>Bienvenue sur OrthoDesk{prenom ? `, ${prenom}` : ''} !</h1>
            <p style={S.sub}>
              Votre espace de gestion de cabinet est prêt. En 2 minutes, on configure l'essentiel pour que vous puissiez commencer à travailler.
            </p>
            <div style={S.featureList}>
              {['Agenda hebdomadaire', 'Dossiers patients', 'Bilans cliniques', 'Facturation', 'Statistiques cabinet'].map(f => (
                <div key={f} style={S.featureItem}>
                  <span style={{ color: ORANGE, fontWeight: 700 }}>✓</span> {f}
                </div>
              ))}
            </div>
            <button style={S.btnPrimary} onClick={nextStep}>
              Commencer la configuration →
            </button>
            <button style={S.btnSkip} onClick={finish}>
              Passer et accéder directement
            </button>
          </div>
        )}

        {/* ── ÉTAPE 2 : Profil cabinet ─────────────────────────────── */}
        {step === 2 && (
          <div style={S.body}>
            <div style={S.bigEmoji}>🏥</div>
            <h1 style={S.h1}>Votre cabinet</h1>
            <p style={S.sub}>
              Ces informations apparaîtront sur vos factures et exports PDF.
            </p>
            <div style={S.formGrid}>
              <div style={S.fg}>
                <label style={S.fl}>Nom du cabinet</label>
                <input style={S.fi} value={profil.nom_cabinet}
                  onChange={e => setProfil({ ...profil, nom_cabinet: e.target.value })}
                  placeholder="Cabinet d'orthophonie…" />
              </div>
              <div style={S.fg}>
                <label style={S.fl}>Téléphone</label>
                <input style={S.fi} value={profil.telephone}
                  onChange={e => setProfil({ ...profil, telephone: e.target.value })}
                  placeholder="+212 6XX XXX XXX" />
              </div>
              <div style={S.fg}>
                <label style={S.fl}>Adresse</label>
                <input style={S.fi} value={profil.adresse}
                  onChange={e => setProfil({ ...profil, adresse: e.target.value })}
                  placeholder="Rue, quartier…" />
              </div>
              <div style={S.fg}>
                <label style={S.fl}>Ville</label>
                <input style={S.fi} value={profil.ville}
                  onChange={e => setProfil({ ...profil, ville: e.target.value })}
                  placeholder="Casablanca, Rabat…" />
              </div>
            </div>
            <div style={S.hint}>
              💡 Vous pourrez modifier ces informations à tout moment dans les Paramètres.
            </div>
            <div style={S.btnRow}>
              <button style={S.btnSecondary} onClick={prevStep}>← Retour</button>
              <button style={S.btnPrimary} onClick={saveProfil} disabled={saving}>
                {saving ? 'Enregistrement…' : 'Enregistrer et continuer →'}
              </button>
            </div>
            <button style={S.btnSkip} onClick={nextStep}>Passer cette étape</button>
          </div>
        )}

        {/* ── ÉTAPE 3 : Visite guidée ──────────────────────────────── */}
        {step === 3 && (
          <div style={S.body}>
            <div style={S.bigEmoji}>🗺️</div>
            <h1 style={S.h1}>Vos outils en un coup d'œil</h1>
            <p style={S.sub}>
              OrthoDesk regroupe tout ce dont vous avez besoin au quotidien.
            </p>
            <div style={S.modulesGrid}>
              {MODULES.map(m => (
                <div key={m.title} style={{ ...S.moduleCard, borderLeftColor: m.color }}>
                  <div style={{ ...S.moduleIcon, background: m.bg, color: m.color }}>
                    {m.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ ...S.moduleTitle, color: m.color }}>{m.title}</div>
                    <div style={S.moduleDesc}>{m.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={S.btnRow}>
              <button style={S.btnSecondary} onClick={prevStep}>← Retour</button>
              <button style={S.btnPrimary} onClick={nextStep}>Continuer →</button>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 4 : C'est parti ────────────────────────────────── */}
        {step === 4 && (
          <div style={{ ...S.body, alignItems: 'center', textAlign: 'center' }}>
            <div style={S.successCircle}>🎉</div>
            <h1 style={S.h1}>Tout est prêt !</h1>
            <p style={S.sub}>
              Votre cabinet OrthoDesk est configuré. Commencez par ajouter votre premier patient ou planifier une séance dans l'agenda.
            </p>
            <div style={S.suggestionRow}>
              <div style={S.suggestionCard}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>👤</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: BLEU }}>Ajouter un patient</div>
                <div style={{ fontSize: 11, color: '#8A9BB0', marginTop: 4 }}>Module Patients</div>
              </div>
              <div style={S.suggestionCard}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🗓</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: BLEU }}>Créer un RDV</div>
                <div style={{ fontSize: 11, color: '#8A9BB0', marginTop: 4 }}>Module Agenda</div>
              </div>
            </div>
            <button style={{ ...S.btnPrimary, fontSize: 15, padding: '14px 40px', marginTop: 8 }} onClick={finish}>
              Accéder à mon cabinet →
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

const S = {
  wrap: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #EBF2F9 0%, #F0F4F9 60%, #FEF3E2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px 16px',
    fontFamily: 'DM Sans, sans-serif',
  },
  card: {
    background: '#fff',
    borderRadius: 20,
    boxShadow: '0 8px 40px rgba(12,68,124,0.13)',
    width: '100%',
    maxWidth: 560,
    overflow: 'hidden',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 28px 0',
  },
  logo: { display: 'flex', alignItems: 'baseline', gap: 1 },
  logoO: { fontFamily: 'Georgia, serif', fontSize: 20, color: BLEU, fontWeight: 700 },
  logoD: { fontFamily: 'Georgia, serif', fontSize: 20, color: ORANGE, fontWeight: 700 },
  steps: { display: 'flex', alignItems: 'center', gap: 5 },
  stepDot: { height: 8, borderRadius: 4, transition: 'all .3s' },
  body: {
    padding: '28px 28px 32px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  bigEmoji: { fontSize: 48, lineHeight: 1 },
  successCircle: {
    width: 80, height: 80, borderRadius: '50%',
    background: '#FEF3E2',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 40, margin: '0 auto',
  },
  h1: {
    fontFamily: 'Georgia, serif',
    fontSize: 26,
    color: BLEU,
    margin: 0,
    lineHeight: 1.25,
  },
  sub: {
    fontSize: 14,
    color: '#4A6080',
    lineHeight: 1.7,
    margin: 0,
  },
  featureList: { display: 'flex', flexDirection: 'column', gap: 8, margin: '4px 0' },
  featureItem: { fontSize: 13, color: '#1A2744', display: 'flex', alignItems: 'center', gap: 10 },
  formGrid: { display: 'flex', flexDirection: 'column', gap: 12 },
  fg: { display: 'flex', flexDirection: 'column', gap: 4 },
  fl: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#4A6080' },
  fi: {
    padding: '9px 13px',
    border: '1.5px solid #DDE5EF',
    borderRadius: 8,
    fontSize: 13,
    fontFamily: 'DM Sans, sans-serif',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  hint: {
    fontSize: 12,
    color: '#8A9BB0',
    background: '#F8FAFD',
    border: '1px solid #DDE5EF',
    borderRadius: 8,
    padding: '9px 12px',
  },
  modulesGrid: { display: 'flex', flexDirection: 'column', gap: 10 },
  moduleCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '11px 13px',
    background: '#F8FAFD',
    borderRadius: 10,
    borderLeft: '3px solid #185FA5',
  },
  moduleIcon: {
    width: 36, height: 36, borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 18, flexShrink: 0,
  },
  moduleTitle: { fontSize: 13, fontWeight: 700, marginBottom: 2 },
  moduleDesc:  { fontSize: 12, color: '#4A6080', lineHeight: 1.5 },
  suggestionRow: {
    display: 'flex', gap: 12, width: '100%',
  },
  suggestionCard: {
    flex: 1,
    background: '#F8FAFD',
    border: '1.5px solid #DDE5EF',
    borderRadius: 12,
    padding: '16px 12px',
    textAlign: 'center',
  },
  btnRow: { display: 'flex', gap: 10, marginTop: 4 },
  btnPrimary: {
    flex: 1,
    padding: '12px 20px',
    background: ORANGE,
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'DM Sans, sans-serif',
  },
  btnSecondary: {
    padding: '12px 16px',
    background: '#F0F4F9',
    color: '#4A6080',
    border: 'none',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'DM Sans, sans-serif',
  },
  btnSkip: {
    background: 'none',
    border: 'none',
    color: '#8A9BB0',
    fontSize: 12,
    cursor: 'pointer',
    textDecoration: 'underline',
    fontFamily: 'DM Sans, sans-serif',
    padding: '4px 0',
    alignSelf: 'center',
  },
}
