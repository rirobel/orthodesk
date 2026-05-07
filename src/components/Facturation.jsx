import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase";

// ─── Tarifs par défaut (modifiables par l'ortho) ──────────────────────────────
const TARIFS_DEFAUT = {
  "Bilan initial": 350,
  "Rééducation": 150,
  "Suivi": 120,
  "Téléconsultation": 130,
};

const STATUT_PAIEMENT = {
  payé: { label: "Payé", bg: "#DCFCE7", text: "#15803D", dot: "#22C55E" },
  impayé: { label: "Impayé", bg: "#FEE2E2", text: "#DC2626", dot: "#EF4444" },
  attente: { label: "En attente", bg: "#FEF9C3", text: "#A16207", dot: "#EAB308" },
};

const MOYENS_PAIEMENT = ["Espèces", "Virement", "Carte", "Chèque", "Mobile"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n) {
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0 }).format(n || 0);
}
function fmtDate(d) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}
function monthKey(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(key) {
  const [y, m] = key.split("-");
  return new Date(y, m - 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

// ─── Modal paramètres tarifs ──────────────────────────────────────────────────
function TarifsModal({ tarifs, onSave, onClose }) {
  const [local, setLocal] = useState({ ...tarifs });

  return (
    <div style={overlayStyle}>
      <div style={{ ...modalStyle, maxWidth: 420 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <h2 style={modalTitle}>Tarifs par défaut</h2>
          <button onClick={onClose} style={btnIcon}>✕</button>
        </div>
        <p style={{ fontSize: 13, color: "#64748B", marginBottom: 20 }}>
          Ces tarifs seront pré-remplis à la création d'une facture. Modifiables séance par séance.
        </p>

        {Object.keys(local).map((type) => (
          <div key={type} style={{ marginBottom: 14 }}>
            <label style={labelStyle}>{type}</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="number"
                value={local[type]}
                onChange={(e) => setLocal((t) => ({ ...t, [type]: Number(e.target.value) }))}
                style={{ ...inputStyle, maxWidth: 120 }}
              />
              <span style={{ fontSize: 13, color: "#94A3B8" }}>MAD / séance</span>
            </div>
          </div>
        ))}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
          <button onClick={onClose} style={btnSecondary}>Annuler</button>
          <button onClick={() => { onSave(local); onClose(); }} style={btnPrimary}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal créer / modifier une facture ───────────────────────────────────────
function FactureModal({ facture, patients, tarifs, onSave, onClose }) {
  const empty = {
    patient_id: "",
    date_seance: new Date().toISOString().slice(0, 10),
    type_seance: "Rééducation",
    montant: tarifs["Rééducation"] || 150,
    statut_paiement: "attente",
    moyen_paiement: "",
    notes_paiement: "",
  };
  const [form, setForm] = useState(facture || empty);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleTypeChange = (type) => {
    setForm((f) => ({ ...f, type_seance: type, montant: tarifs[type] || f.montant }));
  };

  const handleSubmit = async () => {
    if (!form.patient_id) return alert("Veuillez sélectionner un patient.");
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload = { ...form, orthophoniste_id: user.id };
    let error;
    if (facture?.id) {
      ({ error } = await supabase.from("factures").update(payload).eq("id", facture.id));
    } else {
      ({ error } = await supabase.from("factures").insert([payload]));
    }
    setLoading(false);
    if (!error) onSave();
    else alert("Erreur : " + error.message);
  };

  return (
    <div style={overlayStyle}>
      <div style={{ ...modalStyle, maxWidth: 520 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <h2 style={modalTitle}>{facture ? "Modifier la facture" : "Nouvelle facture"}</h2>
          <button onClick={onClose} style={btnIcon}>✕</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {/* Patient */}
          <div style={{ gridColumn: "span 2" }}>
            <label style={labelStyle}>Patient</label>
            <select value={form.patient_id} onChange={(e) => set("patient_id", e.target.value)} style={inputStyle}>
              <option value="">— Sélectionner —</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label style={labelStyle}>Date de séance</label>
            <input type="date" value={form.date_seance} onChange={(e) => set("date_seance", e.target.value)} style={inputStyle} />
          </div>

          {/* Type */}
          <div>
            <label style={labelStyle}>Type de séance</label>
            <select value={form.type_seance} onChange={(e) => handleTypeChange(e.target.value)} style={inputStyle}>
              {Object.keys(tarifs).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Montant */}
          <div>
            <label style={labelStyle}>Montant (MAD)</label>
            <input
              type="number"
              value={form.montant}
              onChange={(e) => set("montant", Number(e.target.value))}
              style={inputStyle}
            />
          </div>

          {/* Statut */}
          <div>
            <label style={labelStyle}>Statut du paiement</label>
            <select value={form.statut_paiement} onChange={(e) => set("statut_paiement", e.target.value)} style={inputStyle}>
              {Object.entries(STATUT_PAIEMENT).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          {/* Moyen de paiement */}
          <div style={{ gridColumn: "span 2" }}>
            <label style={labelStyle}>Moyen de paiement</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {MOYENS_PAIEMENT.map((m) => (
                <button
                  key={m}
                  onClick={() => set("moyen_paiement", form.moyen_paiement === m ? "" : m)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 20,
                    border: "1.5px solid",
                    borderColor: form.moyen_paiement === m ? "#6366F1" : "#E2E8F0",
                    background: form.moyen_paiement === m ? "#EEF2FF" : "#FFF",
                    color: form.moyen_paiement === m ? "#4338CA" : "#64748B",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div style={{ gridColumn: "span 2" }}>
            <label style={labelStyle}>Notes</label>
            <textarea
              value={form.notes_paiement}
              onChange={(e) => set("notes_paiement", e.target.value)}
              rows={2}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 22 }}>
          <button onClick={onClose} style={btnSecondary}>Annuler</button>
          <button onClick={handleSubmit} disabled={loading} style={btnPrimary}>
            {loading ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Vue Factures (liste) ─────────────────────────────────────────────────────
function VueFactures({ factures, patients, onEdit, onDelete, onMarkPaye }) {
  const patientMap = Object.fromEntries(patients.map((p) => [p.id, p]));

  const [searchP, setSearchP] = useState("");
  const [filterStatut, setFilterStatut] = useState("tous");

  const filtered = factures.filter((f) => {
    const p = patientMap[f.patient_id];
    const nom = p ? `${p.prenom} ${p.nom}`.toLowerCase() : "";
    const matchSearch = nom.includes(searchP.toLowerCase());
    const matchStatut = filterStatut === "tous" || f.statut_paiement === filterStatut;
    return matchSearch && matchStatut;
  });

  return (
    <>
      {/* Filtres */}
      <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <input
          placeholder="Rechercher un patient…"
          value={searchP}
          onChange={(e) => setSearchP(e.target.value)}
          style={{ ...inputStyle, maxWidth: 260, flex: 1 }}
        />
        <div style={{ display: "flex", gap: 6 }}>
          {["tous", "payé", "impayé", "attente"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatut(s)}
              style={{
                padding: "7px 14px",
                borderRadius: 8,
                border: "none",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                background: filterStatut === s ? "#6366F1" : "#F1F5F9",
                color: filterStatut === s ? "#FFF" : "#475569",
                transition: "all 0.15s",
              }}
            >
              {s === "tous" ? "Toutes" : STATUT_PAIEMENT[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#94A3B8" }}>
          Aucune facture trouvée.
        </div>
      ) : (
        <div style={{ background: "#FFF", borderRadius: 12, border: "1px solid #F1F5F9", overflow: "hidden" }}>
          {/* En-tête */}
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1.2fr 0.8fr 1fr 1fr", gap: 0, background: "#F8FAFC", borderBottom: "1px solid #F1F5F9", padding: "10px 16px" }}>
            {["Patient", "Date", "Type", "Montant", "Statut", "Actions"].map((h) => (
              <div key={h} style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</div>
            ))}
          </div>

          {filtered.map((f, i) => {
            const p = patientMap[f.patient_id];
            const s = STATUT_PAIEMENT[f.statut_paiement] || STATUT_PAIEMENT.attente;
            return (
              <div
                key={f.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.5fr 1fr 1.2fr 0.8fr 1fr 1fr",
                  gap: 0,
                  padding: "12px 16px",
                  borderBottom: i < filtered.length - 1 ? "1px solid #F8FAFC" : "none",
                  alignItems: "center",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#FAFAFA"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <div style={{ fontWeight: 600, color: "#0F172A", fontSize: 14 }}>
                  {p ? `${p.prenom} ${p.nom}` : "—"}
                </div>
                <div style={{ fontSize: 13, color: "#64748B" }}>{fmtDate(f.date_seance)}</div>
                <div style={{ fontSize: 13, color: "#475569" }}>{f.type_seance}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{fmt(f.montant)} MAD</div>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: s.bg, color: s.text }}>
                    {s.label}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {f.statut_paiement !== "payé" && (
                    <button
                      onClick={() => onMarkPaye(f)}
                      title="Marquer payé"
                      style={{ ...btnSmall, background: "#DCFCE7", color: "#15803D", border: "none" }}
                    >
                      ✓
                    </button>
                  )}
                  <button onClick={() => onEdit(f)} style={{ ...btnSmall, background: "#EEF2FF", color: "#4338CA", border: "none" }}>✎</button>
                  <button onClick={() => onDelete(f.id)} style={{ ...btnSmall, background: "#FEE2E2", color: "#DC2626", border: "none" }}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ─── Vue Dashboard revenus ────────────────────────────────────────────────────
function VueDashboard({ factures, patients }) {
  const patientMap = Object.fromEntries(patients.map((p) => [p.id, p]));
  const now = new Date();
  const moisKey = monthKey(now);
  const anneeCur = now.getFullYear();

  const payees = factures.filter((f) => f.statut_paiement === "payé");
  const totalMois = payees
    .filter((f) => monthKey(f.date_seance) === moisKey)
    .reduce((s, f) => s + (f.montant || 0), 0);
  const totalAnnee = payees
    .filter((f) => new Date(f.date_seance).getFullYear() === anneeCur)
    .reduce((s, f) => s + (f.montant || 0), 0);
  const totalImpaye = factures
    .filter((f) => f.statut_paiement === "impayé")
    .reduce((s, f) => s + (f.montant || 0), 0);
  const totalAttente = factures
    .filter((f) => f.statut_paiement === "attente")
    .reduce((s, f) => s + (f.montant || 0), 0);

  // Revenus par mois (6 derniers)
  const moisListe = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    moisListe.push(monthKey(d));
  }
  const revenusMois = moisListe.map((mk) => ({
    label: monthLabel(mk).slice(0, 3),
    total: payees.filter((f) => monthKey(f.date_seance) === mk).reduce((s, f) => s + (f.montant || 0), 0),
  }));
  const maxRev = Math.max(...revenusMois.map((m) => m.total), 1);

  // Top patients (par revenus)
  const revByPatient = {};
  payees.forEach((f) => {
    revByPatient[f.patient_id] = (revByPatient[f.patient_id] || 0) + (f.montant || 0);
  });
  const topPatients = Object.entries(revByPatient)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, total]) => ({ patient: patientMap[id], total }));

  // Répartition par type
  const revByType = {};
  payees.forEach((f) => {
    revByType[f.type_seance] = (revByType[f.type_seance] || 0) + (f.montant || 0);
  });

  const StatCard = ({ label, value, sub, color = "#6366F1" }) => (
    <div style={{ background: "#FFF", borderRadius: 14, padding: "20px 22px", border: "1px solid #F1F5F9", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color, letterSpacing: "-0.02em" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
        <StatCard label="Ce mois" value={`${fmt(totalMois)} MAD`} sub={monthLabel(moisKey)} color="#6366F1" />
        <StatCard label="Cette année" value={`${fmt(totalAnnee)} MAD`} sub={`Année ${anneeCur}`} color="#0EA5E9" />
        <StatCard label="Impayés" value={`${fmt(totalImpaye)} MAD`} sub={`${factures.filter((f) => f.statut_paiement === "impayé").length} séances`} color="#EF4444" />
        <StatCard label="En attente" value={`${fmt(totalAttente)} MAD`} sub={`${factures.filter((f) => f.statut_paiement === "attente").length} séances`} color="#EAB308" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
        {/* Graphique mensuel */}
        <div style={{ background: "#FFF", borderRadius: 14, padding: "20px 22px", border: "1px solid #F1F5F9" }}>
          <h3 style={{ margin: "0 0 18px", fontSize: 14, fontWeight: 700, color: "#0F172A" }}>Revenus mensuels (6 mois)</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 160 }}>
            {revenusMois.map((m) => (
              <div key={m.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#475569" }}>{fmt(m.total)}</div>
                <div
                  style={{
                    width: "100%",
                    background: m.total > 0 ? "linear-gradient(180deg, #818CF8, #6366F1)" : "#F1F5F9",
                    borderRadius: "6px 6px 0 0",
                    height: `${Math.max((m.total / maxRev) * 120, m.total > 0 ? 8 : 0)}px`,
                    transition: "height 0.3s ease",
                  }}
                />
                <div style={{ fontSize: 11, color: "#94A3B8" }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top patients */}
        <div style={{ background: "#FFF", borderRadius: 14, padding: "20px 22px", border: "1px solid #F1F5F9" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "#0F172A" }}>Top patients</h3>
          {topPatients.length === 0 ? (
            <p style={{ color: "#94A3B8", fontSize: 13 }}>Aucune donnée.</p>
          ) : topPatients.map(({ patient: p, total }, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "linear-gradient(135deg, #6366F1, #818CF8)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, color: "#FFF",
                }}>
                  {p ? (p.prenom?.[0] || "") + (p.nom?.[0] || "") : "?"}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#1E293B" }}>
                  {p ? `${p.prenom} ${p.nom}` : "—"}
                </span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#6366F1" }}>{fmt(total)} MAD</span>
            </div>
          ))}
        </div>
      </div>

      {/* Répartition par type */}
      <div style={{ background: "#FFF", borderRadius: 14, padding: "20px 22px", border: "1px solid #F1F5F9" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "#0F172A" }}>Revenus par type de séance</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          {Object.entries(revByType).map(([type, total]) => {
            const pct = Math.round((total / (payees.reduce((s, f) => s + f.montant, 0) || 1)) * 100);
            return (
              <div key={type} style={{ background: "#F8FAFC", borderRadius: 10, padding: "14px 16px", border: "1px solid #F1F5F9" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 6 }}>{type}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#0F172A" }}>{fmt(total)} MAD</div>
                <div style={{ height: 4, borderRadius: 2, background: "#E2E8F0", marginTop: 8 }}>
                  <div style={{ height: "100%", borderRadius: 2, background: "#6366F1", width: `${pct}%` }} />
                </div>
                <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>{pct}% du total</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Module principal Facturation ─────────────────────────────────────────────
export default function Facturation() {
  const [factures, setFactures] = useState([]);
  const [patients, setPatients] = useState([]);
  const [tarifs, setTarifs] = useState(TARIFS_DEFAUT);
  const [onglet, setOnglet] = useState("factures"); // "factures" | "dashboard"
  const [showForm, setShowForm] = useState(false);
  const [showTarifs, setShowTarifs] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: f }, { data: p }] = await Promise.all([
      supabase.from("factures").select("*").order("date_seance", { ascending: false }),
      supabase.from("patients").select("id, prenom, nom").order("nom"),
    ]);
    setFactures(f || []);
    setPatients(p || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Charger tarifs depuis localStorage (persistance légère)
  useEffect(() => {
    const saved = localStorage.getItem("orthodesk_tarifs");
    if (saved) setTarifs(JSON.parse(saved));
  }, []);

  const saveTarifs = (t) => {
    setTarifs(t);
    localStorage.setItem("orthodesk_tarifs", JSON.stringify(t));
  };

  const handleDelete = async (id) => {
    if (!confirm("Supprimer cette facture ?")) return;
    await supabase.from("factures").delete().eq("id", id);
    load();
  };

  const handleMarkPaye = async (f) => {
    await supabase.from("factures").update({ statut_paiement: "payé" }).eq("id", f.id);
    load();
  };

  // Stats rapides en-tête
  const totalMois = factures
    .filter((f) => f.statut_paiement === "payé" && monthKey(f.date_seance) === monthKey(new Date()))
    .reduce((s, f) => s + (f.montant || 0), 0);
  const nbImpaye = factures.filter((f) => f.statut_paiement === "impayé").length;

  return (
    <div style={{ padding: "24px 32px", fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: "#0F172A" }}>Facturation</h1>
          <p style={{ margin: 0, fontSize: 13, color: "#94A3B8" }}>
            {fmt(totalMois)} MAD ce mois
            {nbImpaye > 0 && <span style={{ marginLeft: 10, color: "#EF4444", fontWeight: 600 }}>· {nbImpaye} impayé{nbImpaye > 1 ? "s" : ""}</span>}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowTarifs(true)} style={btnSecondary}>⚙ Tarifs</button>
          <button onClick={() => { setEditing(null); setShowForm(true); }} style={btnPrimary}>+ Nouvelle facture</button>
        </div>
      </div>

      {/* Onglets */}
      <div style={{ display: "flex", gap: 4, marginBottom: 22, borderBottom: "2px solid #F1F5F9", paddingBottom: 0 }}>
        {[["factures", "📋 Factures"], ["dashboard", "📊 Dashboard revenus"]].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setOnglet(k)}
            style={{
              padding: "10px 20px",
              border: "none",
              background: "none",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              color: onglet === k ? "#6366F1" : "#94A3B8",
              borderBottom: onglet === k ? "2px solid #6366F1" : "2px solid transparent",
              marginBottom: -2,
              transition: "all 0.15s",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: "#94A3B8" }}>Chargement…</p>
      ) : onglet === "factures" ? (
        <VueFactures
          factures={factures}
          patients={patients}
          onEdit={(f) => { setEditing(f); setShowForm(true); }}
          onDelete={handleDelete}
          onMarkPaye={handleMarkPaye}
        />
      ) : (
        <VueDashboard factures={factures} patients={patients} />
      )}

      {/* Modales */}
      {showForm && (
        <FactureModal
          facture={editing}
          patients={patients}
          tarifs={tarifs}
          onSave={() => { setShowForm(false); setEditing(null); load(); }}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {showTarifs && (
        <TarifsModal
          tarifs={tarifs}
          onSave={saveTarifs}
          onClose={() => setShowTarifs(false)}
        />
      )}
    </div>
  );
}

// ─── Styles partagés ──────────────────────────────────────────────────────────
const inputStyle = {
  padding: "9px 12px",
  borderRadius: 8,
  border: "1.5px solid #E2E8F0",
  fontSize: 14,
  color: "#1E293B",
  background: "#FAFAFA",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "'DM Sans', sans-serif",
  resize: "vertical",
};

const btnPrimary = {
  padding: "9px 18px",
  borderRadius: 8,
  border: "none",
  background: "#6366F1",
  color: "#FFF",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
};

const btnSecondary = {
  padding: "9px 18px",
  borderRadius: 8,
  border: "1.5px solid #E2E8F0",
  background: "#FFF",
  color: "#475569",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
};

const btnIcon = {
  width: 32, height: 32,
  borderRadius: 8,
  border: "1.5px solid #E2E8F0",
  background: "#FFF",
  color: "#64748B",
  fontSize: 14,
  cursor: "pointer",
};

const btnSmall = {
  width: 28, height: 28,
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const overlayStyle = {
  position: "fixed", inset: 0,
  background: "rgba(15,23,42,0.4)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 1000, padding: 20,
};

const modalStyle = {
  background: "#FFF",
  borderRadius: 16,
  padding: 28,
  width: "100%",
  boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
};

const modalTitle = {
  margin: 0,
  fontSize: 18,
  fontWeight: 800,
  color: "#0F172A",
};

const labelStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: "#64748B",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  display: "block",
  marginBottom: 5,
};