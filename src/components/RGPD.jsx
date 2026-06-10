// ─── RGPD.jsx ─────────────────────────────────────────────────────────────────
// Utilisé dans Login.jsx (case à cocher) et Dashboard.jsx (lien "Confidentialité")
// Usage : <RGPDModal onClose={() => setShowRGPD(false)} />

export function RGPDModal({ onClose }) {
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.box} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={S.header}>
          <div>
            <div style={S.headerTitle}>Politique de confidentialité</div>
            <div style={S.headerSub}>OrthoDesk · Données & RGPD · Mai 2026</div>
          </div>
          <button style={S.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Corps */}
        <div style={S.body}>

          <Section icon="🔒" title="Qui sommes-nous ?">
            OrthoDesk est une application de gestion de cabinet orthophonique développée
            par Awale Cure, orthophoniste (Maroc). L'application est accessible à l'adresse{' '}
            <a href="https://orthodesk.vercel.app" style={S.link} target="_blank" rel="noreferrer">
              orthodesk.vercel.app
            </a>.
          </Section>

          <Section icon="📋" title="Quelles données sont collectées ?">
            <ul style={S.ul}>
              <li><b>Données du compte :</b> adresse e-mail, nom, prénom, nom du cabinet, téléphone.</li>
              <li><b>Données patients :</b> identité, coordonnées, informations cliniques, bilans orthophoniques, rendez-vous et factures. Ces données sont saisies exclusivement par l'orthophoniste.</li>
            </ul>
            <div style={S.note}>
              ⚠️ OrthoDesk ne collecte <b>aucune donnée de santé directement auprès des patients</b>.
              C'est l'orthophoniste, en tant que professionnel de santé, qui est responsable
              des données saisies dans l'application.
            </div>
          </Section>

          <Section icon="🌍" title="Où sont stockées les données ?">
            Les données sont hébergées sur <b>Supabase</b> (infrastructure AWS, région
            {' '}<b>Europe — Frankfurt, Allemagne</b>), conforme au RGPD.
            <ul style={S.ul}>
              <li>Toutes les communications sont <b>chiffrées en transit (HTTPS/TLS)</b>.</li>
              <li>Les données sont <b>chiffrées au repos (AES-256)</b>.</li>
              <li>Chaque compte est <b>strictement isolé</b> via Row Level Security (RLS) :
                une orthophoniste ne peut jamais accéder aux données d'une autre.</li>
              <li>Supabase est certifié <b>SOC 2 Type II</b> et conforme RGPD.</li>
            </ul>
          </Section>

          <Section icon="🎯" title="Pourquoi ces données sont-elles utilisées ?">
            <ul style={S.ul}>
              <li>Gestion du cabinet : agenda, dossiers patients, bilans, facturation.</li>
              <li>Authentification et sécurité du compte.</li>
              <li>Aucune donnée n'est utilisée à des fins publicitaires ou commerciales.</li>
              <li>Aucune donnée n'est vendue ou partagée avec des tiers.</li>
            </ul>
          </Section>

          <Section icon="👤" title="Vos droits">
            Conformément au Règlement Général sur la Protection des Données (UE 2016/679)
            et à la <b>loi marocaine 09-08</b> relative à la protection des données personnelles
            (sous le contrôle de la <b>CNDP</b>), vous disposez des droits suivants :
            <ul style={S.ul}>
              <li><b>Droit d'accès :</b> obtenir une copie de vos données.</li>
              <li><b>Droit de rectification :</b> corriger des données inexactes.</li>
              <li><b>Droit à l'effacement :</b> demander la suppression de votre compte
                et de toutes les données associées.</li>
              <li><b>Droit à la portabilité :</b> recevoir vos données dans un format
                lisible (CSV / JSON).</li>
            </ul>
            Pour exercer ces droits, contactez :{' '}
            <a href="mailto:robel.maroc@gmail.com" style={S.link}>robel.maroc@gmail.com</a>
          </Section>

          <Section icon="🍪" title="Cookies">
            OrthoDesk utilise uniquement des cookies techniques nécessaires au
            fonctionnement de l'authentification (session utilisateur). Aucun cookie
            publicitaire ou de tracking n'est utilisé.
          </Section>

          <Section icon="🔐" title="Sécurité">
            <ul style={S.ul}>
              <li>Authentification sécurisée par e-mail + mot de passe (Supabase Auth).</li>
              <li>Isolation totale des données par compte (RLS PostgreSQL).</li>
              <li>Clé de service Supabase jamais exposée côté client.</li>
              <li>Déploiement via Vercel avec HTTPS forcé.</li>
            </ul>
          </Section>

          <Section icon="📅" title="Durée de conservation">
            Les données sont conservées tant que le compte est actif. En cas de suppression
            du compte, toutes les données associées sont définitivement supprimées dans un
            délai de <b>30 jours</b>.
          </Section>

          <Section icon="✏️" title="Modifications de cette politique">
            Cette politique peut être mise à jour. En cas de modification substantielle,
            les utilisateurs seront notifiés par e-mail. Dernière mise à jour : <b>Mai 2026</b>.
          </Section>

        </div>

        {/* Footer */}
        <div style={S.footer}>
          <span style={{ fontSize: 11, color: '#8A9BB0' }}>
            OrthoDesk · par Awale Cure · orthodesk.vercel.app
          </span>
          <button style={S.okBtn} onClick={onClose}>J'ai compris</button>
        </div>

      </div>
    </div>
  )
}

// ─── Sous-composant Section ───────────────────────────────────────────────────
function Section({ icon, title, children }) {
  return (
    <div style={S.section}>
      <div style={S.sectionTitle}>
        <span style={{ marginRight: 8 }}>{icon}</span>{title}
      </div>
      <div style={S.sectionBody}>{children}</div>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  overlay:      { position: 'fixed', inset: 0, background: 'rgba(10,30,60,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  box:          { background: '#fff', borderRadius: 16, width: '100%', maxWidth: 620, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 40px rgba(12,68,124,0.2)', fontFamily: 'DM Sans, sans-serif' },
  header:       { padding: '20px 24px 16px', borderBottom: '1px solid #DDE5EF', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 },
  headerTitle:  { fontFamily: 'Georgia, serif', fontSize: 20, color: '#0C447C', fontWeight: 700 },
  headerSub:    { fontSize: 11, color: '#8A9BB0', marginTop: 3 },
  closeBtn:     { width: 30, height: 30, background: '#F0F4F9', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, color: '#8A9BB0', flexShrink: 0 },
  body:         { overflowY: 'auto', padding: '16px 24px', flex: 1 },
  section:      { marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #F0F4F9' },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: '#0C447C', marginBottom: 8, display: 'flex', alignItems: 'center' },
  sectionBody:  { fontSize: 13, color: '#333', lineHeight: 1.7 },
  ul:           { margin: '6px 0 0 0', paddingLeft: 20, lineHeight: 1.9 },
  note:         { marginTop: 10, padding: '10px 14px', background: '#FEF3E2', borderRadius: 8, fontSize: 12, color: '#8B5A00', borderLeft: '3px solid #E89020' },
  link:         { color: '#185FA5', textDecoration: 'underline' },
  footer:       { padding: '12px 24px 16px', borderTop: '1px solid #DDE5EF', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
  okBtn:        { padding: '8px 22px', background: '#0C447C', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
}