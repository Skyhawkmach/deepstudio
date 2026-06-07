
"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Storage (localStorage) ───────────────────────────────────────────────────
const KEYS = { mixes: "dh-mixes-v1", calendars: "dh-calendars-v1" };

function sGet(key) {
  try { return JSON.parse(localStorage.getItem(key) || "[]"); }
  catch { return []; }
}
function sSet(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { }
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((msg, type = "ok") => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 2600);
  }, []);
  return { toasts, show };
}

function Toasts({ items }) {
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
      {items.map(t => (
        <div key={t.id} style={{
          background: t.type === "err" ? "#140808" : "#080E14",
          border: `1px solid ${t.type === "err" ? "rgba(255,80,80,.4)" : "rgba(100,180,255,.35)"}`,
          color: t.type === "err" ? "#FF6666" : "#64B4FF",
          fontFamily: "'Space Mono',monospace", fontSize: "11px",
          padding: "10px 16px", letterSpacing: ".5px",
          animation: "fadeUp .2s ease",
        }}>{t.msg}</div>
      ))}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skelly({ count = 3, h = 130 }) {
  return (
    <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 10 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          height: h, background: "#0A0A10", border: "1px solid #14141E",
          animation: `pulse 1.5s ease ${i * 0.12}s infinite`
        }} />
      ))}
    </div>
  );
}

// ─── Copy Button ──────────────────────────────────────────────────────────────
function CopyBtn({ text, label = "Copy", onCopy }) {
  const [done, setDone] = useState(false);
  const go = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setDone(true); onCopy?.();
      setTimeout(() => setDone(false), 1800);
    } catch { }
  };
  return (
    <button onClick={go} style={{
      background: "transparent",
      border: `1px solid ${done ? "rgba(100,180,255,.3)" : "#1E1E2A"}`,
      color: done ? "#64B4FF" : "#3A3A4A",
      fontFamily: "'Space Mono',monospace", fontSize: "9px",
      padding: "4px 9px", cursor: "pointer",
      textTransform: "uppercase", letterSpacing: ".5px",
      transition: "all .15s", whiteSpace: "nowrap",
    }}>{done ? "✓ Copied" : label}</button>
  );
}

// ─── Error Block ──────────────────────────────────────────────────────────────
function ErrBlock({ msg, onRetry }) {
  return (
    <div style={{ marginTop: 20, background: "#100808", border: "1px solid #2A1212", borderLeft: "3px solid #FF4444", padding: "14px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <p style={{ fontSize: "13px", color: "#FF6666" }}>
          <strong style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px" }}>Error: </strong>{msg}
        </p>
        <button className="btn-g" onClick={onRetry} style={{ fontSize: "9px", flexShrink: 0 }}>Retry</button>
      </div>
    </div>
  );
}

// ─── Waveform ─────────────────────────────────────────────────────────────────
function Waveform({ color = "#64B4FF", opacity = 0.18 }) {
  const bars = Array.from({ length: 32 }, (_, i) =>
    6 + Math.abs(Math.sin(i * 0.8) * 20 + Math.cos(i * 1.3) * 14)
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, height: 32, opacity }}>
      {bars.map((h, i) => (
        <div key={i} style={{ width: 3, height: h, background: color, borderRadius: 1, flexShrink: 0 }} />
      ))}
    </div>
  );
}

// ─── API helper ───────────────────────────────────────────────────────────────
async function callAPI(body) {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content.map(x => x.text || "").join("");
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function DeepStudio() {
  const [tab, setTab] = useState("mixes");
  const { toasts, show: toast } = useToast();

  // Mix generator
  const [cfg, setCfg] = useState({ vibe: "chill", length: "2", theme: "nature", count: "6" });
  const [mixes, setMixes] = useState([]);
  const [genMixes, setGenMixes] = useState(false);
  const [mixesErr, setMixesErr] = useState(null);
  const [savedMixes, setSavedMixes] = useState([]);

  // Calendar
  const [calCfg, setCalCfg] = useState({ perWeek: "2", weeks: "4", strategy: "variety" });
  const [calendar, setCalendar] = useState(null);
  const [genCal, setGenCal] = useState(false);
  const [calErr, setCalErr] = useState(null);
  const [savedCalendars, setSavedCalendars] = useState([]);

  // Saved sub-tab
  const [svdTab, setSvdTab] = useState("mixes");

  useEffect(() => {
    setSavedMixes(sGet(KEYS.mixes));
    setSavedCalendars(sGet(KEYS.calendars));
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const isMixSaved = (title) => savedMixes.some(s => s.title === title);

  const toggleMix = (mix) => {
    const exists = isMixSaved(mix.title);
    const updated = exists
      ? savedMixes.filter(s => s.title !== mix.title)
      : [{ ...mix, savedAt: Date.now() }, ...savedMixes];
    setSavedMixes(updated); sSet(KEYS.mixes, updated);
    toast(exists ? "Mix removed" : "Mix saved ✓");
  };

  const saveCalendar = () => {
    if (!calendar) return;
    const entry = { calendar, config: { ...calCfg }, savedAt: Date.now() };
    const updated = [entry, ...savedCalendars.slice(0, 9)];
    setSavedCalendars(updated); sSet(KEYS.calendars, updated);
    toast("Calendar saved ✓");
  };

  const removeCalendar = (savedAt) => {
    const updated = savedCalendars.filter(c => c.savedAt !== savedAt);
    setSavedCalendars(updated); sSet(KEYS.calendars, updated);
    toast("Removed");
  };

  const vibeLabels = {
    chill: "Chill & Melodic Deep House",
    latenight: "Late Night Underground",
    afro: "Afro House & Organic Deep",
    morning: "Morning & Sunrise Vibes",
    sunset: "Sunset Sessions",
    dark: "Dark & Hypnotic Tech-House",
  };
  const themeLabels = {
    nature: "nature landscapes — forests, mountains, open sky",
    ocean: "ocean and coastal — waves, beaches, sunset water",
    city: "urban and city — night streets, neon reflections, rooftops",
    abstract: "abstract and minimal — geometric visuals, dark gradients",
    travel: "travel and wanderlust — roads, airports, world cities",
  };
  const strategyLabels = {
    variety: "a variety of vibes and themes to test different audiences",
    series: "a themed series with consistent branding (e.g. 'Midnight Sessions Vol. X')",
    single: "one consistent vibe/brand throughout to build a signature sound",
  };

  const vibeColor = {
    chill:     { color: "#64B4FF", bg: "rgba(100,180,255,.07)", border: "rgba(100,180,255,.15)" },
    latenight: { color: "#B464FF", bg: "rgba(180,100,255,.07)", border: "rgba(180,100,255,.15)" },
    afro:      { color: "#FF9646", bg: "rgba(255,150,70,.07)",  border: "rgba(255,150,70,.15)"  },
    morning:   { color: "#FFD764", bg: "rgba(255,215,100,.07)", border: "rgba(255,215,100,.15)" },
    sunset:    { color: "#FF6496", bg: "rgba(255,100,150,.07)", border: "rgba(255,100,150,.15)" },
    dark:      { color: "#9E9E9E", bg: "rgba(158,158,158,.07)", border: "rgba(158,158,158,.15)" },
  };
  const vc = (v) => vibeColor[v] || vibeColor.chill;

  // ── Generate Mixes ─────────────────────────────────────────────────────────
  const doMixes = async () => {
    setGenMixes(true); setMixes([]); setMixesErr(null);
    const prompt = `You are a YouTube music channel strategist specializing in deep house music. Generate ${cfg.count} compelling deep house YouTube mix concepts.

Vibe/Subgenre: ${vibeLabels[cfg.vibe]}
Mix Length: ~${cfg.length} hour${cfg.length !== "1" ? "s" : ""}
Visual Theme: ${themeLabels[cfg.theme]}

For each mix concept provide:
- title: compelling YouTube title (e.g. "Moonlit Deep House Mix 2026 | 2 Hours of Chill Vibes")
- series: optional series/volume name or null
- mood: 1-sentence mood description
- visual: specific visual direction (footage, colors, atmosphere)
- thumbnail: thumbnail overlay text (4-6 words, evocative)
- bestDay: best day of week to post
- bestTime: best time to post (e.g. "6 PM EST Friday")
- tags: array of 6 highly searchable YouTube tags
- trackVibe: description of musical character — tempo, energy, instruments, artists to look for
- estimatedViews: realistic first-month view range for a new channel (e.g. "800–2,400")

Respond ONLY with a valid JSON array. No markdown, no backticks, no preamble.`;
    try {
      const raw = await callAPI({
        model: "claude-sonnet-4-6-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      });
      setMixes(JSON.parse(raw.replace(/```json|```/g, "").trim()));
    } catch (e) {
      setMixesErr(e.message || "Generation failed — please try again.");
    } finally {
      setGenMixes(false);
    }
  };

  // ── Generate Calendar ──────────────────────────────────────────────────────
  const doCalendar = async () => {
    setGenCal(true); setCalendar(null); setCalErr(null);
    const prompt = `You are a YouTube channel strategist for deep house music channels. Create a ${calCfg.weeks}-week content upload calendar.

Uploads per week: ${calCfg.perWeek}
Content strategy: ${strategyLabels[calCfg.strategy]}
Channel focus: Deep house music mixes — long-form content (1–3 hours)

Generate a calendar with this exact JSON structure:
{
  "strategy": "brief 1-sentence strategy description",
  "weeks": [
    {
      "week": 1,
      "theme": "optional week theme or null",
      "uploads": [
        {
          "day": "Tuesday",
          "title": "compelling YouTube title",
          "vibe": "chill",
          "length": "2hr",
          "visual": "brief visual direction",
          "thumbnail": "thumbnail text (4-6 words)",
          "bestTime": "6 PM EST",
          "note": "brief strategic note"
        }
      ]
    }
  ]
}

vibe must be one of: chill | latenight | afro | morning | sunset | dark
Best posting days for music: Thursday–Sunday. Vary times strategically.
ONLY valid JSON. No markdown, no backticks.`;
    try {
      const raw = await callAPI({
        model: "claude-sonnet-4-6-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      });
      setCalendar(JSON.parse(raw.replace(/```json|```/g, "").trim()));
    } catch (e) {
      setCalErr(e.message || "Calendar generation failed — please try again.");
    } finally {
      setGenCal(false);
    }
  };

  const totalSaved = savedMixes.length + savedCalendars.length;

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", background: "#080810", minHeight: "100vh", color: "#E0E0F0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=Syne:wght@700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes pulse { 0%,100%{opacity:.6} 50%{opacity:.15} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .blue { color: #64B4FF; }
        .tag { font-family:'Space Mono',monospace; font-size:10px; background:rgba(100,180,255,.07); color:#64B4FF; padding:3px 9px; border:1px solid rgba(100,180,255,.2); text-transform:uppercase; letter-spacing:1px; }
        .btn-p { background:#64B4FF; color:#080810; border:none; padding:12px 24px; font-family:'Space Mono',monospace; font-size:11px; font-weight:700; letter-spacing:1px; text-transform:uppercase; cursor:pointer; transition:all .15s; display:inline-flex; align-items:center; gap:7px; }
        .btn-p:hover:not(:disabled) { background:#88CCFF; transform:translateY(-1px); }
        .btn-p:disabled { opacity:.28; cursor:not-allowed; transform:none; }
        .btn-g { background:transparent; color:#404050; border:1px solid #1A1A28; padding:9px 16px; font-family:'Space Mono',monospace; font-size:10px; cursor:pointer; transition:all .15s; text-transform:uppercase; letter-spacing:.5px; display:inline-flex; align-items:center; gap:6px; }
        .btn-g:hover { border-color:#64B4FF; color:#64B4FF; }
        .btn-g.red:hover { border-color:rgba(255,80,80,.5); color:#FF6666; }
        .btn-g.on { border-color:rgba(100,180,255,.35); color:#64B4FF; }
        .inp { background:#0A0A14; border:1px solid #18182A; color:#E0E0F0; padding:11px 13px; font-family:'DM Sans',sans-serif; font-size:14px; width:100%; outline:none; transition:border-color .15s; -webkit-appearance:none; }
        .inp:focus { border-color:rgba(100,180,255,.5); }
        .inp::placeholder { color:#252535; }
        select.inp { cursor:pointer; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='5'%3E%3Cpath d='M0 0l4.5 5L9 0z' fill='%23303044'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 13px center; }
        .card { background:#0A0A14; border:1px solid #14142A; padding:20px; transition:border-color .15s, background .15s; }
        .card:hover { border-color:#20203A; background:#0C0C18; }
        .t { background:transparent; border:none; font-family:'Space Mono',monospace; font-size:10px; text-transform:uppercase; letter-spacing:1px; padding:14px 20px; cursor:pointer; transition:all .15s; border-bottom:2px solid transparent; color:#2A2A40; }
        .t.on { color:#64B4FF; border-bottom-color:#64B4FF; }
        .t:not(.on):hover { color:#505070; }
        .lbl { font-family:'Space Mono',monospace; font-size:10px; color:#2E2E44; text-transform:uppercase; letter-spacing:1px; display:block; margin-bottom:8px; }
        .empty { text-align:center; margin-top:64px; }
        .empty p { font-family:'Space Mono',monospace; font-size:10px; color:#18182A; text-transform:uppercase; letter-spacing:2px; }
        .empty span { color:#222238; font-size:12px; margin-top:8px; display:block; }
        ::-webkit-scrollbar { width:3px; }
        ::-webkit-scrollbar-track { background:#080810; }
        ::-webkit-scrollbar-thumb { background:#1A1A2A; }
      `}</style>

      <Toasts items={toasts} />

      {/* ── Header ── */}
      <div style={{ borderBottom: "1px solid #101020", padding: "18px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontFamily: "'Syne',sans-serif", fontSize: "20px", fontWeight: 800, letterSpacing: "-.5px" }}>
            DEEP<span className="blue">STUDIO</span>
          </span>
          <span className="tag">Channel Planner</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Waveform color="#64B4FF" opacity={0.18} />
          {totalSaved > 0 && (
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", color: "#64B4FF", background: "rgba(100,180,255,.06)", border: "1px solid rgba(100,180,255,.15)", padding: "3px 9px" }}>
              {totalSaved} saved
            </span>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ borderBottom: "1px solid #101020", padding: "0 32px", display: "flex" }}>
        <button className={`t${tab === "mixes" ? " on" : ""}`} onClick={() => setTab("mixes")}>01 / Mix Generator</button>
        <button className={`t${tab === "calendar" ? " on" : ""}`} onClick={() => setTab("calendar")}>02 / Upload Calendar</button>
        <button className={`t${tab === "saved" ? " on" : ""}`} onClick={() => setTab("saved")}>
          03 / Saved{totalSaved > 0 ? ` (${totalSaved})` : ""}
        </button>
      </div>

      <div style={{ padding: "36px 32px", maxWidth: 900, margin: "0 auto" }}>

        {/* ══════════════ MIX GENERATOR ══════════════ */}
        {tab === "mixes" && (
          <div style={{ animation: "fadeIn .2s ease" }}>
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: "24px", fontWeight: 800, marginBottom: 5 }}>
                Mix <span className="blue">Generator</span>
              </h2>
              <p style={{ color: "#252535", fontSize: "13px" }}>AI-generated deep house mix concepts — click ★ to save</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label className="lbl">Vibe / Subgenre</label>
                <select className="inp" value={cfg.vibe} onChange={e => setCfg(p => ({ ...p, vibe: e.target.value }))}>
                  <option value="chill">Chill & Melodic</option>
                  <option value="latenight">Late Night Underground</option>
                  <option value="afro">Afro House & Organic Deep</option>
                  <option value="morning">Morning & Sunrise Vibes</option>
                  <option value="sunset">Sunset Sessions</option>
                  <option value="dark">Dark & Hypnotic Tech-House</option>
                </select>
              </div>
              <div>
                <label className="lbl">Visual Theme</label>
                <select className="inp" value={cfg.theme} onChange={e => setCfg(p => ({ ...p, theme: e.target.value }))}>
                  <option value="nature">Nature & Landscapes</option>
                  <option value="ocean">Ocean & Coastal</option>
                  <option value="city">Urban & City</option>
                  <option value="abstract">Abstract & Minimal</option>
                  <option value="travel">Travel & Wanderlust</option>
                </select>
              </div>
              <div>
                <label className="lbl">Mix Length</label>
                <select className="inp" value={cfg.length} onChange={e => setCfg(p => ({ ...p, length: e.target.value }))}>
                  <option value="1">~1 Hour</option>
                  <option value="2">~2 Hours</option>
                  <option value="3">~3 Hours</option>
                </select>
              </div>
              <div>
                <label className="lbl">Concepts to Generate</label>
                <select className="inp" value={cfg.count} onChange={e => setCfg(p => ({ ...p, count: e.target.value }))}>
                  <option value="4">4 Concepts</option>
                  <option value="6">6 Concepts</option>
                  <option value="8">8 Concepts</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button className="btn-p" onClick={doMixes} disabled={genMixes}>
                {genMixes ? "⟳  Generating..." : "Generate Mixes →"}
              </button>
              {mixes.length > 0 && !genMixes && <button className="btn-g" onClick={doMixes}>Regenerate</button>}
              {mixes.length > 0 && !genMixes && (
                <CopyBtn text={mixes.map(m => m.title).join("\n")} label="Copy All Titles" onCopy={() => toast("Titles copied ✓")} />
              )}
            </div>

            {mixesErr && <ErrBlock msg={mixesErr} onRetry={doMixes} />}
            {genMixes && <Skelly count={Number(cfg.count) > 5 ? 4 : 3} h={130} />}

            {mixes.length > 0 && !genMixes && (
              <div style={{ marginTop: 28 }}>
                <span className="lbl" style={{ marginBottom: 14, display: "block" }}>{mixes.length} concepts generated</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {mixes.map((mix, i) => {
                    const v = vc(mix.vibe || "chill");
                    return (
                      <div key={i} className="card" style={{ animation: `fadeIn ${.1 + i * .05}s ease` }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 14 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", color: "#1E1E2E" }}>#{String(i + 1).padStart(2, "0")}</span>
                              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "9px", padding: "2px 8px", textTransform: "uppercase", letterSpacing: ".8px", background: v.bg, color: v.color, border: `1px solid ${v.border}` }}>
                                {mix.vibe || cfg.vibe}
                              </span>
                              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "9px", color: "#2A2A3A" }}>{mix.length || cfg.length + "hr"}</span>
                              {mix.estimatedViews && (
                                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", color: "#64B4FF" }}>~{mix.estimatedViews} views/mo</span>
                              )}
                            </div>
                            <h3 style={{ fontSize: "15px", fontWeight: 600, lineHeight: 1.4, marginBottom: 6 }}>{mix.title}</h3>
                            {mix.series && (
                              <p style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", color: "#64B4FF", marginBottom: 8 }}>{mix.series}</p>
                            )}
                            <p style={{ fontSize: "13px", color: "#404055", lineHeight: 1.65, marginBottom: 10 }}>{mix.mood}</p>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 7, flexShrink: 0 }}>
                            <CopyBtn text={mix.title} label="Title" onCopy={() => toast("Title copied ✓")} />
                            <button onClick={() => toggleMix(mix)} style={{
                              background: "transparent",
                              border: `1px solid ${isMixSaved(mix.title) ? "rgba(100,180,255,.3)" : "#1A1A2A"}`,
                              color: isMixSaved(mix.title) ? "#64B4FF" : "#2A2A3A",
                              fontFamily: "'Space Mono',monospace", fontSize: "12px",
                              padding: "4px 10px", cursor: "pointer", transition: "all .15s", textAlign: "center"
                            }}>{isMixSaved(mix.title) ? "★" : "☆"}</button>
                          </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                          <div style={{ background: "#0C0C18", border: "1px solid #14142A", padding: "12px 14px" }}>
                            <span className="lbl" style={{ fontSize: "9px", marginBottom: 5 }}>Visual Direction</span>
                            <p style={{ fontSize: "12px", color: "#505065", lineHeight: 1.6 }}>{mix.visual}</p>
                          </div>
                          <div style={{ background: "#0C0C18", border: "1px solid #14142A", padding: "12px 14px" }}>
                            <span className="lbl" style={{ fontSize: "9px", marginBottom: 5 }}>Track Vibe</span>
                            <p style={{ fontSize: "12px", color: "#505065", lineHeight: 1.6 }}>{mix.trackVibe}</p>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                            {mix.thumbnail && (
                              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "9px", color: "#202030", textTransform: "uppercase" }}>Thumb:</span>
                                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px", color: "#64B4FF" }}>{mix.thumbnail}</span>
                              </div>
                            )}
                            {mix.bestTime && (
                              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "9px", color: "#202030", textTransform: "uppercase" }}>Post:</span>
                                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", color: "#505065" }}>{mix.bestTime}</span>
                              </div>
                            )}
                          </div>
                          {mix.tags && (
                            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                              {mix.tags.slice(0, 4).map((tag, j) => (
                                <span key={j} style={{ fontFamily: "'Space Mono',monospace", fontSize: "9px", color: "#303045", border: "1px solid #18182A", padding: "2px 7px" }}>#{tag}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!genMixes && !mixesErr && mixes.length === 0 && (
              <div className="empty"><p>Configure above and hit Generate →</p></div>
            )}
          </div>
        )}

        {/* ══════════════ CALENDAR ══════════════ */}
        {tab === "calendar" && (
          <div style={{ animation: "fadeIn .2s ease" }}>
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: "24px", fontWeight: 800, marginBottom: 5 }}>
                Upload <span className="blue">Calendar</span>
              </h2>
              <p style={{ color: "#252535", fontSize: "13px" }}>AI-generated content schedule optimised for YouTube growth</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
              <div>
                <label className="lbl">Uploads Per Week</label>
                <select className="inp" value={calCfg.perWeek} onChange={e => setCalCfg(p => ({ ...p, perWeek: e.target.value }))}>
                  <option value="1">1x / Week</option>
                  <option value="2">2x / Week</option>
                  <option value="3">3x / Week</option>
                </select>
              </div>
              <div>
                <label className="lbl">Planning Horizon</label>
                <select className="inp" value={calCfg.weeks} onChange={e => setCalCfg(p => ({ ...p, weeks: e.target.value }))}>
                  <option value="4">4 Weeks</option>
                  <option value="6">6 Weeks</option>
                  <option value="8">8 Weeks</option>
                </select>
              </div>
              <div>
                <label className="lbl">Content Strategy</label>
                <select className="inp" value={calCfg.strategy} onChange={e => setCalCfg(p => ({ ...p, strategy: e.target.value }))}>
                  <option value="variety">Variety (test audience)</option>
                  <option value="series">Themed Series</option>
                  <option value="single">Single Signature Vibe</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button className="btn-p" onClick={doCalendar} disabled={genCal}>
                {genCal ? "⟳  Building..." : "Build Calendar →"}
              </button>
              {calendar && !genCal && (
                <>
                  <button className="btn-g" onClick={doCalendar}>Regenerate</button>
                  <button className="btn-g" onClick={saveCalendar}>Save Calendar</button>
                  <CopyBtn
                    text={calendar.weeks?.flatMap(w => w.uploads.map(u => `Week ${w.week} ${u.day}: ${u.title}`)).join("\n") || ""}
                    label="Copy All"
                    onCopy={() => toast("Calendar copied ✓")}
                  />
                </>
              )}
            </div>

            {calErr && <ErrBlock msg={calErr} onRetry={doCalendar} />}
            {genCal && <Skelly count={3} h={160} />}

            {calendar && !genCal && (
              <div style={{ marginTop: 32 }}>
                {calendar.strategy && (
                  <div style={{ background: "rgba(100,180,255,.04)", border: "1px solid rgba(100,180,255,.1)", padding: "12px 16px", marginBottom: 20, borderLeft: "3px solid #64B4FF" }}>
                    <span className="lbl" style={{ marginBottom: 5 }}>Strategy</span>
                    <p style={{ fontSize: "13px", color: "#505065", lineHeight: 1.6 }}>{calendar.strategy}</p>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {calendar.weeks?.map((week, wi) => (
                    <div key={wi} style={{ animation: `fadeIn ${.1 + wi * .06}s ease` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                        <span style={{ fontFamily: "'Syne',sans-serif", fontSize: "14px", fontWeight: 800, color: "#64B4FF" }}>Week {week.week}</span>
                        {week.theme && <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", color: "#2A2A3A" }}>— {week.theme}</span>}
                        <div style={{ flex: 1, height: 1, background: "#12122A" }} />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {week.uploads?.map((upload, ui) => {
                          const v = vc(upload.vibe || "chill");
                          return (
                            <div key={ui} style={{ background: "#0A0A14", border: "1px solid #14142A", padding: "16px 18px", display: "flex", alignItems: "flex-start", gap: 16 }}>
                              <div style={{ flexShrink: 0, textAlign: "center", minWidth: 64 }}>
                                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: "16px", fontWeight: 800, color: "#E0E0F0", lineHeight: 1 }}>{upload.day?.slice(0, 3)}</div>
                                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "9px", color: "#2A2A3A", marginTop: 4 }}>{upload.bestTime || "—"}</div>
                              </div>
                              <div style={{ width: 1, background: "#14142A", alignSelf: "stretch", flexShrink: 0 }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7, flexWrap: "wrap" }}>
                                  <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "9px", padding: "2px 7px", textTransform: "uppercase", letterSpacing: ".8px", background: v.bg, color: v.color, border: `1px solid ${v.border}` }}>
                                    {upload.vibe}
                                  </span>
                                  <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "9px", color: "#2A2A3A" }}>{upload.length}</span>
                                </div>
                                <p style={{ fontSize: "14px", fontWeight: 600, lineHeight: 1.4, marginBottom: 6 }}>{upload.title}</p>
                                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                                  {upload.thumbnail && (
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "9px", color: "#1A1A2A", textTransform: "uppercase" }}>Thumb:</span>
                                      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", color: "#64B4FF" }}>{upload.thumbnail}</span>
                                    </div>
                                  )}
                                  {upload.note && <p style={{ fontSize: "12px", color: "#303045", fontStyle: "italic" }}>{upload.note}</p>}
                                </div>
                              </div>
                              <CopyBtn text={upload.title} onCopy={() => toast("Title copied ✓")} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!genCal && !calErr && !calendar && (
              <div className="empty"><p>Configure above and hit Build Calendar →</p></div>
            )}
          </div>
        )}

        {/* ══════════════ SAVED ══════════════ */}
        {tab === "saved" && (
          <div style={{ animation: "fadeIn .2s ease" }}>
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: "24px", fontWeight: 800, marginBottom: 5 }}>
                Saved <span className="blue">Content</span>
              </h2>
              <p style={{ color: "#252535", fontSize: "13px" }}>Your mix concepts and calendars, persisted in localStorage</p>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              <button className={`btn-g${svdTab === "mixes" ? " on" : ""}`} onClick={() => setSvdTab("mixes")}>Mixes ({savedMixes.length})</button>
              <button className={`btn-g${svdTab === "calendars" ? " on" : ""}`} onClick={() => setSvdTab("calendars")}>Calendars ({savedCalendars.length})</button>
            </div>

            {svdTab === "mixes" && (
              savedMixes.length === 0
                ? <div className="empty"><p>No saved mixes yet</p><span>Star mix concepts from the generator to save them</span></div>
                : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {savedMixes.map((mix, i) => {
                      const v = vc(mix.vibe || "chill");
                      return (
                        <div key={i} className="card">
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "9px", padding: "2px 8px", textTransform: "uppercase", letterSpacing: ".8px", background: v.bg, color: v.color, border: `1px solid ${v.border}` }}>{mix.vibe}</span>
                                {mix.estimatedViews && <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", color: "#64B4FF" }}>~{mix.estimatedViews} views/mo</span>}
                                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "9px", color: "#1E1E2E" }}>
                                  {new Date(mix.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </span>
                              </div>
                              <h3 style={{ fontSize: "14px", fontWeight: 600, lineHeight: 1.45, marginBottom: 5 }}>{mix.title}</h3>
                              <p style={{ fontSize: "12px", color: "#353545", lineHeight: 1.6 }}>{mix.mood}</p>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 7, flexShrink: 0 }}>
                              <CopyBtn text={mix.title} label="Copy" onCopy={() => toast("Copied ✓")} />
                              <button className="btn-g red" onClick={() => toggleMix(mix)} style={{ fontSize: "9px" }}>Remove</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
            )}

            {svdTab === "calendars" && (
              savedCalendars.length === 0
                ? <div className="empty"><p>No saved calendars yet</p><span>Generate a calendar and hit Save to keep it here</span></div>
                : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {savedCalendars.map((entry, i) => (
                      <div key={i} className="card">
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "9px", color: "#64B4FF", background: "rgba(100,180,255,.07)", border: "1px solid rgba(100,180,255,.14)", padding: "2px 8px", textTransform: "uppercase" }}>
                                {entry.config?.weeks}wk · {entry.config?.perWeek}x/wk
                              </span>
                              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "9px", color: "#1E1E2E" }}>
                                {new Date(entry.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </span>
                            </div>
                            <p style={{ fontSize: "14px", fontWeight: 600, marginBottom: 5 }}>
                              {entry.calendar?.weeks?.length}-Week Content Plan
                            </p>
                            <p style={{ fontSize: "12px", color: "#353545", lineHeight: 1.55 }}>{entry.calendar?.strategy}</p>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 7, flexShrink: 0 }}>
                            <button className="btn-g" onClick={() => { setCalendar(entry.calendar); setCalCfg(entry.config || calCfg); setTab("calendar"); }} style={{ fontSize: "9px" }}>Open →</button>
                            <button className="btn-g red" onClick={() => removeCalendar(entry.savedAt)} style={{ fontSize: "9px" }}>Remove</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}