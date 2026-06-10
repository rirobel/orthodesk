import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import './Dashboard.css'

const WA_NUMBER = "212667740093";
const WA_LINK = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Bonjour, je souhaite essayer OrthoDesk gratuitement 🙂")}`;

// ── Palette & tokens ────────────────────────────────────────────────
const C = {
  teal:      "#0C447C",
  tealDark:  "#0A3660",
  tealLight: "#F0F4F9",
  navy:      "#0C447C",
  navyMid:   "#0C447C",
  sand:      "#F0F4F9",
  white:     "#FFFFFF",
  text:      "#1A2E3B",
  muted:     "#6B8796",
  accent:    "#C9A84C",
  border:    "#DCE8EC",
};

const font = {
  display: "'Georgia', 'Times New Roman', serif",
  body:    "'DM Sans', system-ui, sans-serif",
};

// ── Keyframe style injection ─────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { font-family: ${font.body}; color: ${C.text}; background: ${C.white}; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(28px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; } to { opacity: 1; }
  }
  @keyframes pulse-dot {
    0%, 100% { transform: scale(1); opacity: 1; }
    50%       { transform: scale(1.4); opacity: 0.7; }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-8px); }
  }
  @keyframes shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }

  .anim-fade-up   { animation: fadeUp 0.65s ease both; }
  .anim-fade-in   { animation: fadeIn 0.5s ease both; }
  .anim-float     { animation: float 4s ease-in-out infinite; }

  .btn-primary {
    display: inline-flex; align-items: center; gap: 8px;
    background: ${C.navy}; color: ${C.white};
    padding: 14px 28px; border-radius: 12px;
    font-family: ${font.body}; font-weight: 600; font-size: 15px;
    border: none; cursor: pointer; text-decoration: none;
    transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
    box-shadow: 0 4px 18px rgba(12,68,124,0.25);
  }
  .btn-primary:hover {
    background: ${C.tealDark};
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(12,68,124,0.30);
  }

  .btn-outline {
    display: inline-flex; align-items: center; gap: 8px;
    background: transparent; color: ${C.navy};
    padding: 13px 26px; border-radius: 12px;
    font-family: ${font.body}; font-weight: 600; font-size: 15px;
    border: 2px solid ${C.navy}; cursor: pointer; text-decoration: none;
    transition: all 0.2s;
  }
  .btn-outline:hover {
    background: ${C.sand};
    transform: translateY(-2px);
  }

  .btn-ghost {
    display: inline-flex; align-items: center; gap: 6px;
    background: transparent; color: ${C.navy};
    padding: 10px 18px; border-radius: 10px;
    font-family: ${font.body}; font-weight: 500; font-size: 14px;
    border: none; cursor: pointer; text-decoration: none;
    transition: color 0.2s, background 0.2s;
  }
  .btn-ghost:hover { color: ${C.teal}; background: ${C.sand}; }

  .card-feature {
    background: ${C.white};
    border: 1px solid ${C.border};
    border-radius: 20px;
    padding: 32px 28px;
    transition: transform 0.25s, box-shadow 0.25s, border-color 0.25s;
  }
  .card-feature:hover {
    transform: translateY(-6px);
    box-shadow: 0 20px 48px rgba(13,43,62,0.10);
    border-color: ${C.teal};
  }

  .landing-body {
    flex: 1;
    overflow-y: auto;
    background: #F0F4F9;
    width: 100%;
    display: flex;
    flex-direction: column;
  }

  .landing-section {
    width: 100%;
    min-height: auto;
  }

  .hero-section {
    padding: clamp(60px, 10vw, 120px) 5%;
  }

  .features-section {
    padding: clamp(60px, 10vw, 90px) 5%;
  }

  .footer-section {
    margin-top: auto;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 32px;
    text-align: center;
    max-width: 900px;
    margin: 0 auto;
    width: 100%;
  }

  @media (max-width: 1024px) {
    .hero-grid {
      gap: 40px !important;
    }
    .feat-grid {
      grid-template-columns: repeat(2, 1fr) !important;
      gap: 20px !important;
    }
    .stats-grid {
      grid-template-columns: repeat(2, 1fr) !important;
      gap: 24px !important;
    }
  }

  @media (max-width: 768px) {
    .hero-grid  { 
      grid-template-columns: 1fr !important; 
      gap: 30px !important; 
    }
    .feat-grid  { 
      grid-template-columns: 1fr !important; 
      gap: 16px !important; 
    }
    .stats-grid {
      grid-template-columns: 1fr !important;
      gap: 16px !important;
    }
    .steps-grid { 
      grid-template-columns: 1fr !important; 
    }
    .cta-btns   { 
      flex-direction: column !important; 
      align-items: stretch !important; 
    }
    .card-feature {
      padding: 20px 16px !important;
    }
    .hero-section {
      padding: 40px 4% !important;
    }
    .features-section {
      padding: 40px 4% !important;
    }
  }

  @media (max-width: 480px) {
    .hero-section {
      padding: 24px 3% !important;
    }
    .features-section {
      padding: 24px 3% !important;
    }
    .btn-primary, .btn-outline {
      padding: 10px 16px !important;
      font-size: 13px !important;
    }
  }
`;

// ── Helper components ────────────────────────────────────────────────

function Icon({ name, size = 22, color = C.teal }) {
  const icons = {
    calendar: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
    users: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    fileText: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
    creditCard: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
      </svg>
    ),
    shield: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    brain: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
      </svg>
    ),
    check: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
    whatsapp: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
      </svg>
    ),
    arrow: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
      </svg>
    ),
    clock: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    pdf: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15v-4"/><path d="M12 15v-6"/><path d="M15 15v-2"/>
      </svg>
    ),
    star: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
  };
  return icons[name] || null;
}

// ── Dashboard mockup ─────────────────────────────────────────────────
function DashboardMockup() {
  return (
    <div className="anim-float" style={{
      background: C.white,
      borderRadius: 20,
      boxShadow: "0 32px 80px rgba(13,43,62,0.18), 0 8px 24px rgba(43,191,170,0.12)",
      overflow: "hidden",
      border: `1px solid ${C.border}`,
      maxWidth: 480,
      width: "100%",
    }}>
      {/* Top bar */}
      <div style={{ background: C.navy, padding: "12px 20px", display: "flex", alignItems: "center", gap: 8 }}>
        {["#FF5F57","#FFBD2E","#28CA41"].map(c => (
          <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
        ))}
        <div style={{ flex: 1, textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: 11, fontFamily: font.body }}>
          orthodesk.vercel.app
        </div>
      </div>

      {/* Nav */}
      <div style={{ background: C.navyMid, padding: "10px 20px", display: "flex", gap: 20 }}>
        {["Agenda","Patients","Bilans","Facturation"].map((t, i) => (
          <span key={t} style={{
            color: i === 2 ? C.teal : "rgba(255,255,255,0.55)",
            fontSize: 12, fontFamily: font.body, fontWeight: i === 2 ? 600 : 400,
            borderBottom: i === 2 ? `2px solid ${C.teal}` : "none",
            paddingBottom: 4, cursor: "pointer",
          }}>{t}</span>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: 24 }}>
        {/* Bilan header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: font.display, color: C.navy }}>
              Bilan — Dyslexie
            </div>
            <div style={{ fontSize: 12, color: C.muted, fontFamily: font.body, marginTop: 2 }}>
              Yassine M. · 8 ans
            </div>
          </div>
          <div style={{
            background: C.tealLight, color: C.tealDark,
            borderRadius: 20, padding: "4px 12px",
            fontSize: 11, fontWeight: 600, fontFamily: font.body
          }}>En cours</div>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: C.muted, fontFamily: font.body }}>Progression</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.teal, fontFamily: font.body }}>4/6 sections</span>
          </div>
          <div style={{ height: 6, background: C.border, borderRadius: 10, overflow: "hidden" }}>
            <div style={{ width: "66%", height: "100%", background: `linear-gradient(90deg, ${C.teal}, ${C.tealDark})`, borderRadius: 10 }} />
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{
                width: 28, height: 28, borderRadius: "50%",
                background: i <= 4 ? C.teal : C.border,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, color: i <= 4 ? C.white : C.muted, fontWeight: 600,
                fontFamily: font.body,
              }}>{i}</div>
            ))}
          </div>
        </div>

        {/* Section active */}
        <div style={{ background: C.sand, borderRadius: 14, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.navy, fontFamily: font.body, marginBottom: 12 }}>
            Lecture — Vitesse & Précision
          </div>
          {[
            { label: "Lecture de mots", val: "85 mots/min", ok: true },
            { label: "Erreurs phonologiques", val: "12%", ok: false },
            { label: "Compréhension écrite", val: "Correcte", ok: true },
          ].map(r => (
            <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: C.muted, fontFamily: font.body }}>{r.label}</span>
              <span style={{
                fontSize: 11, fontWeight: 600, fontFamily: font.body,
                color: r.ok ? C.tealDark : C.accent,
              }}>{r.val}</span>
            </div>
          ))}
        </div>

        {/* Export button */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          background: C.navy, borderRadius: 10, padding: "10px 0",
          cursor: "pointer",
        }}>
          <Icon name="pdf" size={14} color={C.teal} />
          <span style={{ fontSize: 12, fontWeight: 600, color: C.white, fontFamily: font.body }}>
            Exporter le bilan PDF
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Stats bar ────────────────────────────────────────────────────────
function StatsBadge({ value, label }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 32, fontWeight: 700, fontFamily: font.display, color: C.teal, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: C.muted, fontFamily: font.body, marginTop: 4 }}>
        {label}
      </div>
    </div>
  );
}

// ── Feature card ─────────────────────────────────────────────────────
function FeatureCard({ icon, title, desc, items, delay = 0 }) {
  return (
    <div className="card-feature anim-fade-up" style={{ animationDelay: `${delay}s` }}>
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: C.tealLight,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 18,
      }}>
        <Icon name={icon} size={24} color={C.teal} />
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, fontFamily: font.display, color: C.navy, marginBottom: 8 }}>
        {title}
      </div>
      <div style={{ fontSize: 14, color: C.muted, fontFamily: font.body, lineHeight: 1.6, marginBottom: 16 }}>
        {desc}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map(item => (
          <div key={item} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flexShrink: 0 }}>
              <Icon name="check" size={15} color={C.teal} />
            </div>
            <span style={{ fontSize: 13, color: C.text, fontFamily: font.body }}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Template pill ────────────────────────────────────────────────────
function TemplatePill({ label, color }) {
  return (
    <div style={{
      background: color + "15", border: `1px solid ${color}30`,
      borderRadius: 100, padding: "6px 14px",
      fontSize: 13, fontWeight: 500, color: color,
      fontFamily: font.body, whiteSpace: "nowrap",
    }}>
      {label}
    </div>
  );
}

// ── Testimonial card ─────────────────────────────────────────────────
function TestiCard({ quote, name, role, city, delay = 0 }) {
  return (
    <div className="anim-fade-up" style={{
      animationDelay: `${delay}s`,
      background: C.white,
      border: `1px solid ${C.border}`,
      borderRadius: 18,
      padding: "28px 24px",
    }}>
      <div style={{ display: "flex", gap: 2, marginBottom: 14 }}>
        {[1,2,3,4,5].map(i => <Icon key={i} name="star" size={14} color={C.teal} />)}
      </div>
      <p style={{ fontSize: 14, color: C.text, fontFamily: font.body, lineHeight: 1.7, fontStyle: "italic", marginBottom: 18 }}>
        "{quote}"
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          background: `linear-gradient(135deg, ${C.teal}, ${C.navyMid})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: C.white, fontWeight: 700, fontSize: 14, fontFamily: font.body,
        }}>{name[0]}</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.navy, fontFamily: font.body }}>{name}</div>
          <div style={{ fontSize: 12, color: C.muted, fontFamily: font.body }}>{role} · {city}</div>
        </div>
      </div>
    </div>
  );
}

// ── Step ─────────────────────────────────────────────────────────────
function Step({ num, title, desc }) {
  return (
    <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
      <div style={{
        width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
        background: C.teal, color: C.white,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 700, fontSize: 16, fontFamily: font.display,
        boxShadow: `0 4px 14px rgba(43,191,170,0.35)`,
      }}>{num}</div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, fontFamily: font.display, color: C.navy, marginBottom: 4 }}>
          {title}
        </div>
        <div style={{ fontSize: 14, color: C.muted, fontFamily: font.body, lineHeight: 1.6 }}>
          {desc}
        </div>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const styleEl = document.createElement("style");
    styleEl.textContent = GLOBAL_CSS;
    document.head.appendChild(styleEl);
    return () => document.head.removeChild(styleEl);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const templates = [
    { label: "Trisomie 21",         color: "#9B59B6" },
    { label: "TSA verbal",          color: "#2BBFAA" },
    { label: "Bégaiement",          color: "#E67E22" },
    { label: "Retard de langage",   color: "#3498DB" },
    { label: "Dyslexie",            color: "#E74C3C" },
    { label: "Aphasie post-AVC",    color: "#1A9688" },
    { label: "Dysphagie",           color: "#27AE60" },
  ];

  return (
    <div className="app">
      {/* NAV */}
      <nav className="nav">
        <div className="logo">
          <div className="logoMark">
            <img src="/favicon.svg" alt="Logo OrthoDesk" width="20" height="20" />
          </div>
          <span className="logoText">Ortho<span style={{color:'#C9A84C'}}>Desk</span></span>
        </div>

        <button className={`hamburgerBtn ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(!menuOpen)} aria-label="Ouvrir le menu">
          ☰
        </button>

        <div className={`navTabs ${menuOpen ? 'mobileOpen' : ''}`}>
          <a href="#fonctionnalites" className="navTab" onClick={() => setMenuOpen(false)}>Fonctionnalités</a>
          <a href="#bilans" className="navTab" onClick={() => setMenuOpen(false)}>Bilans</a>
          <a href="#temoignages" className="navTab" onClick={() => setMenuOpen(false)}>Témoignages</a>
        </div>

        <div className={`navRight ${menuOpen ? 'mobileOpen' : ''}`}>
          <button className="logoutBtn" onClick={() => { setMenuOpen(false); navigate("/login") }}>Connexion</button>
          <a href={WA_LINK} target="_blank" rel="noreferrer" className="logoutBtn" style={{ background: '#C9A84C', color: '#0C447C' }} onClick={() => setMenuOpen(false)}>
            Essai gratuit
          </a>
        </div>
      </nav>

      {/* CONTENU */}
      <div className="landing-body">
      <section style={{
        padding: "120px 5% 80px",
        background: `linear-gradient(160deg, #F0F4F9 0%, #FAFBFC 55%, #F5F7FA 100%)`,
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Background decoration */}
        <div style={{
          position: "absolute", top: -80, right: -80,
          width: 500, height: 500, borderRadius: "50%",
          background: `radial-gradient(circle, rgba(12,68,124,0.08) 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: -100, left: "30%",
          width: 300, height: 300, borderRadius: "50%",
          background: `radial-gradient(circle, rgba(12,68,124,0.05) 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />

        <div className="hero-grid" style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: 60, alignItems: "center", maxWidth: 1200, margin: "0 auto",
        }}>
          {/* Left */}
          <div>
            <div className="anim-fade-up" style={{ animationDelay: "0s" }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "rgba(12,68,124,0.10)", border: "1px solid rgba(12,68,124,0.2)",
                borderRadius: 100, padding: "6px 14px", marginBottom: 24,
              }}>
                <div style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: C.accent, animation: "pulse-dot 2s ease-in-out infinite"
                }} />
                <span style={{ fontSize: 12, color: C.navy, fontWeight: 600, fontFamily: font.body }}>
                  Beta gratuite — Maroc 2025
                </span>
              </div>
            </div>

            <h1 className="anim-fade-up" style={{
              animationDelay: "0.1s",
              fontSize: "clamp(32px, 4vw, 52px)",
              fontFamily: font.display,
              fontWeight: 700,
              color: C.navy,
              lineHeight: 1.15,
              marginBottom: 20,
            }}>
              Gérez votre cabinet<br />
              <span style={{ color: C.accent }}>orthophonique</span><br />
              sans paperasse
            </h1>

            <p className="anim-fade-up" style={{
              animationDelay: "0.2s",
              fontSize: 17,
              color: C.muted,
              fontFamily: font.body,
              lineHeight: 1.7,
              marginBottom: 36,
              maxWidth: 460,
            }}>
              Agenda, dossiers patients, bilans cliniques complets et facturation —
              conçu spécialement pour les orthophonistes au Maroc.
            </p>

            <div className="anim-fade-up cta-btns" style={{
              animationDelay: "0.3s",
              display: "flex", gap: 14, flexWrap: "wrap",
            }}>
              <a href={WA_LINK} target="_blank" rel="noreferrer" className="btn-primary" style={{ fontSize: 15 }}>
                <Icon name="whatsapp" size={18} color={C.white} />
                Démarrer gratuitement
              </a>
              <button className="btn-outline" onClick={() => navigate("/login")} style={{
                borderColor: C.navy, color: C.navy,
                fontSize: 15,
              }}>
                Se connecter
                <Icon name="arrow" size={16} color={C.navy} />
              </button>
            </div>

            <div className="anim-fade-up" style={{
              animationDelay: "0.4s",
              display: "flex", gap: 24, marginTop: 36,
            }}>
              {[
                { icon: "clock", text: "Prêt en 5 minutes" },
                { icon: "shield", text: "Données sécurisées" },
              ].map(({ icon, text }) => (
                <div key={text} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon name={icon} size={15} color={C.navy} />
                  <span style={{ fontSize: 13, color: C.muted, fontFamily: font.body }}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — mockup */}
          <div className="anim-fade-up" style={{ animationDelay: "0.25s", display: "flex", justifyContent: "center" }}>
            <DashboardMockup />
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section style={{
        background: C.white,
        borderBottom: `1px solid ${C.border}`,
        padding: "40px 5%",
      }}>
        <div className="stats-grid">
          <StatsBadge value="7" label="Templates de bilans cliniques" />
          <StatsBadge value="100%" label="Spécialisé orthophonie" />
          <StatsBadge value="PDF" label="Export bilans & factures" />
          <StatsBadge value="RLS" label="Données isolées & sécurisées" />
        </div>
      </section>

      {/* ── Fonctionnalités ── */}
      <section id="fonctionnalites" style={{ padding: "90px 5%", background: C.sand }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2 className="anim-fade-up" style={{
              fontSize: "clamp(26px, 3vw, 40px)",
              fontFamily: font.display,
              fontWeight: 700, color: C.navy, marginBottom: 14,
            }}>
              Tout ce dont vous avez besoin,<br />rien de superflu
            </h2>
            <p style={{ fontSize: 16, color: C.muted, fontFamily: font.body, maxWidth: 520, margin: "0 auto" }}>
              Une plateforme pensée pour la réalité du cabinet orthophonique au Maroc.
            </p>
          </div>

          <div className="feat-grid" style={{
            display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24,
          }}>
            <FeatureCard
              icon="calendar" title="Agenda & Rendez-vous" delay={0}
              desc="Vue semaine complète, navigation fluide, 4 types de séances codés par couleur."
              items={["Bilan / Rééducation / Suivi / Téléconsultation", "Popup détail au clic", "Autocomplétion patients", "Stats de séances en temps réel"]}
            />
            <FeatureCard
              icon="users" title="Dossiers Patients" delay={0.1}
              desc="Fiches complètes avec toutes les informations cliniques et administratives."
              items={["Identité, contact, CIN", "Motif, statut, médecin référent", "Notes cliniques & antécédents", "Historique des séances intégré"]}
            />
            <FeatureCard
              icon="brain" title="Bilans Cliniques" delay={0.2}
              desc="7 templates fidèles aux protocoles orthophoniques réels, générés en PDF."
              items={["Stepper par sections avec progression", "Grilles OUI/NON, tableaux phonèmes", "Export PDF professionnel", "Statuts brouillon / finalisé"]}
            />
            <FeatureCard
              icon="creditCard" title="Facturation" delay={0.3}
              desc="Suivi des paiements, factures et tableau de bord des revenus."
              items={["Factures payées / impayées / en attente", "Dashboard revenus mensuels", "Export PDF des factures", "Tarifs configurables par défaut"]}
            />
            <FeatureCard
              icon="fileText" title="Comptes Rendus" delay={0.4}
              desc="Rédigez et archivez vos comptes rendus de séance directement dans l'app."
              items={["Lié à chaque séance de l'agenda", "Historique complet par patient", "Accessible depuis la fiche patient", "Sauvegarde temps réel Supabase"]}
            />
            <FeatureCard
              icon="shield" title="Sécurité & Confidentialité" delay={0.5}
              desc="Chaque orthophoniste voit uniquement ses propres données. Jamais celles des autres."
              items={["Row Level Security Supabase", "Chiffrement des données", "Connexion email sécurisée", "Données isolées par cabinet"]}
            />
          </div>
        </div>
      </section>

      {/* ── Bilans section ── */}
      <section id="bilans" style={{ padding: "90px 5%", background: C.white }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
          <div>
            <div style={{
              display: "inline-block",
              background: C.tealLight, color: C.tealDark,
              borderRadius: 100, padding: "5px 14px",
              fontSize: 12, fontWeight: 600, fontFamily: font.body,
              marginBottom: 20,
            }}>
              ✦ Fonctionnalité exclusive
            </div>
            <h2 style={{
              fontSize: "clamp(24px, 3vw, 38px)",
              fontFamily: font.display, fontWeight: 700,
              color: C.navy, marginBottom: 16, lineHeight: 1.25,
            }}>
              7 templates de bilans<br />cliniques intégrés
            </h2>
            <p style={{
              fontSize: 15, color: C.muted, fontFamily: font.body,
              lineHeight: 1.7, marginBottom: 28,
            }}>
              Fidèles aux protocoles orthophoniques réels. Aucun concurrent
              ne propose ce niveau de détail clinique. Remplissez, finalisez
              et exportez en PDF en quelques minutes.
            </p>

            {/* Template pills */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 32 }}>
              {templates.map(t => (
                <TemplatePill key={t.label} label={t.label} color={t.color} />
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                "Stepper par sections avec barre de progression",
                "Grilles OUI/NON cliquables et tableaux de phonèmes",
                "Tableau TSA : avec / sans lecture labiale",
                "Export PDF avec en-tête ortho, sections et conclusion",
              ].map(item => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flexShrink: 0, width: 20, height: 20, borderRadius: "50%", background: C.tealLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="check" size={12} color={C.teal} />
                  </div>
                  <span style={{ fontSize: 14, color: C.text, fontFamily: font.body }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right side — visual */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Mini bilan card */}
            {[
              { pathologie: "Dyslexie / Dysorthographie", sections: 6, statut: "Finalisé", color: C.teal },
              { pathologie: "TSA verbal", sections: 5, statut: "Brouillon", color: C.accent },
              { pathologie: "Bégaiement — SSI-4", sections: 8, statut: "Finalisé", color: "#9B59B6" },
            ].map((b, i) => (
              <div key={b.pathologie} className="anim-fade-up" style={{
                animationDelay: `${i * 0.12}s`,
                background: i === 0 ? C.navy : C.sand,
                borderRadius: 16, padding: "18px 20px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                border: `1px solid ${i === 0 ? "transparent" : C.border}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: b.color + (i === 0 ? "30" : "15"),
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon name="fileText" size={18} color={b.color} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, fontFamily: font.body, color: i === 0 ? C.white : C.navy }}>
                      {b.pathologie}
                    </div>
                    <div style={{ fontSize: 12, color: i === 0 ? "rgba(255,255,255,0.5)" : C.muted, fontFamily: font.body }}>
                      {b.sections} sections
                    </div>
                  </div>
                </div>
                <div style={{
                  background: b.color + "20", color: b.color,
                  borderRadius: 20, padding: "3px 10px",
                  fontSize: 11, fontWeight: 600, fontFamily: font.body,
                }}>
                  {b.statut}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comment ça marche ── */}
      <section style={{ padding: "80px 5%", background: C.sand }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <h2 style={{
            fontSize: "clamp(24px, 3vw, 36px)",
            fontFamily: font.display, fontWeight: 700,
            color: C.navy, textAlign: "center", marginBottom: 52,
          }}>
            Opérationnel en 3 étapes
          </h2>
          <div className="steps-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 32 }}>
            <Step num="1" title="Créez votre compte" desc="Inscription en 2 minutes via email. Aucune carte bancaire requise pendant la beta." />
            <Step num="2" title="Ajoutez vos patients" desc="Importez ou créez vos dossiers patients. L'interface est intuitive, pas de formation nécessaire." />
            <Step num="3" title="Commencez à travailler" desc="Agenda, bilans, facturation — tout est là. Vos données sauvegardées en temps réel." />
          </div>
        </div>
      </section>

      {/* ── Témoignages ── */}
      <section id="temoignages" style={{ padding: "90px 5%", background: C.white }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h2 style={{
            fontSize: "clamp(24px, 3vw, 36px)",
            fontFamily: font.display, fontWeight: 700,
            color: C.navy, textAlign: "center", marginBottom: 48,
          }}>
            Ce qu'en disent les beta-testeuses
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            <TestiCard
              delay={0}
              quote="Enfin un logiciel pensé pour les orthos au Maroc. Les templates de bilans m'ont fait gagner des heures chaque semaine."
              name="Salma R." role="Orthophoniste" city="Casablanca"
            />
            <TestiCard
              delay={0.1}
              quote="L'export PDF des bilans est vraiment professionnel. Je l'envoie directement aux familles et aux médecins référents."
              name="Nadia B." role="Orthophoniste" city="Rabat"
            />
            <TestiCard
              delay={0.2}
              quote="Simple, rapide, tout centralisé. Je n'utilise plus de fichiers Excel ni de cahiers papier pour suivre mes patients."
              name="Houda M." role="Orthophoniste" city="Marrakech"
            />
          </div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section style={{
        padding: "90px 5%",
        background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyMid} 100%)`,
        textAlign: "center",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 600, height: 600, borderRadius: "50%",
          background: `radial-gradient(circle, rgba(43,191,170,0.10) 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />
        <div style={{ position: "relative", maxWidth: 580, margin: "0 auto" }}>
          <h2 style={{
            fontSize: "clamp(26px, 3.5vw, 44px)",
            fontFamily: font.display, fontWeight: 700,
            color: C.white, marginBottom: 16, lineHeight: 1.2,
          }}>
            Prête à transformer<br />votre cabinet ?
          </h2>
          <p style={{
            fontSize: 16, color: "rgba(255,255,255,0.65)",
            fontFamily: font.body, marginBottom: 40, lineHeight: 1.6,
          }}>
            Rejoignez les orthophonistes au Maroc qui utilisent OrthoDesk.<br />
            Beta gratuite — aucune carte bancaire requise.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <a href={WA_LINK} target="_blank" rel="noreferrer" className="btn-primary" style={{ 
  fontSize: 16, 
  padding: "16px 32px",
  background: "#C9A84C",        // ← orange du logo
  color: "#0C447C",              // ← texte bleu marine
  boxShadow: "0 4px 18px rgba(201,168,76,0.35)",
}}>
  <Icon name="whatsapp" size={20} color="#0C447C" />
  Démarrer gratuitement
</a>
            <button className="btn-outline" onClick={() => navigate("/login")} style={{
  borderColor: "#C9A84C",        // ← bordure orange
  color: "#C9A84C",              // ← texte orange
  fontSize: 16, 
  padding: "15px 30px"
}}>
  Se connecter
</button>
          </div>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.40)", fontFamily: font.body, marginTop: 20 }}>
            Sans engagement · Données sécurisées · Support WhatsApp inclus
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        background: "#07191F",
        padding: "32px 5%",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: `linear-gradient(135deg, ${C.teal}, ${C.navyMid})`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: C.white, fontWeight: 800, fontSize: 13, fontFamily: font.display }}>O</span>
          </div>
          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, fontFamily: font.body }}>
            OrthoDesk · par Awale Cure · Mai 2026
          </span>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          {["Fonctionnalités", "Bilans", "Témoignages"].map(l => (
            <a key={l} href={`#${l.toLowerCase()}`} style={{
              color: "rgba(255,255,255,0.45)", fontSize: 13,
              fontFamily: font.body, textDecoration: "none",
              transition: "color 0.2s",
            }}
            onMouseEnter={e => e.target.style.color = C.teal}
            onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.45)"}
            >{l}</a>
          ))}
        </div>
      </footer>

    </div>
    </div>
  );
}