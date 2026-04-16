import { useState } from "react";

const OM_NAVY = "#0d1f2d";
const OM_BLUE = "#3ab5e6";

const STAGES = ["TOFU", "MOFU", "BOFU"];
const STAGE_META = {
  TOFU: { sub: "Awareness", bg: "#e8f7fd", text: "#0e7daa", dot: "#3ab5e6" },
  MOFU: { sub: "Consideration", bg: "#eaf0f6", text: "#1a3f5c", dot: "#2a6496" },
  BOFU: { sub: "Decision", bg: "#162635", text: "#3ab5e6", dot: "#3ab5e6" },
};

function loadFromStorage() {
  try { return JSON.parse(localStorage.getItem("omcc3_data") || "null"); } catch(e) { return null; }
}
function saveToStorage(data) {
  try { localStorage.setItem("omcc3_data", JSON.stringify(data)); } catch(e) {}
}

const DEFAULT_DATA = {
  practices: ["Your Digital Smile", "Bright Smiles LA"],
  clusters: []
};

async function callClaude(messages, maxTokens) {
  var res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: maxTokens || 1000, messages: messages })
  });
  var data = await res.json();
  return (data.content && data.content[0] && data.content[0].text) || "";
}

async function generatePost(post, cluster) {
  var others = (cluster.posts || []).filter(function(p) { return p.id !== post.id; }).map(function(p) { return p.title; }).join(", ");
  var prompt = "Write a full SEO-optimized blog post for a dental practice.\n" +
    "Title: " + post.title + "\nTarget keyword: " + post.targetKeyword + "\nStage: " + post.stage +
    "\nLocation: " + cluster.location + "\nPillar page URL: " + cluster.pillarPage +
    "\nKeyword category: " + cluster.keywordCategory +
    "\nWrite 900-1100 words. Include 2-3 internal links to pillar page and siblings: " + (others || "N/A") +
    ". End with a 3-question FAQ. Include a CTA. Output clean WordPress-ready HTML using h2,h3,p,ul,strong,a tags only. No html/head/body wrappers. Start with two HTML comments: meta title (60 chars max) and meta description (155 chars max).";
  return await callClaude([{ role: "user", content: prompt }], 4000);
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractMeta(html) {
  var titleMatch = html.match(/<!--\s*meta title[:\s]*(.+?)-->/i);
  var descMatch = html.match(/<!--\s*meta description[:\s]*(.+?)-->/i);
  return {
    metaTitle: titleMatch ? titleMatch[1].trim() : "",
    metaDesc: descMatch ? descMatch[1].trim() : ""
  };
}

function Badge(props) {
  var m = STAGE_META[props.stage] || STAGE_META.TOFU;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, letterSpacing: ".04em", padding: "3px 10px", borderRadius: 20, background: m.bg, color: m.text }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: m.dot, display: "inline-block" }} />
      {props.stage} · {m.sub}
    </span>
  );
}

function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid " + OM_BLUE, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>M</span>
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#fff", letterSpacing: ".06em" }}>PERFORMANCE</div>
        <div style={{ fontSize: 12, fontWeight: 800, color: OM_BLUE, letterSpacing: ".06em" }}>MARKETING</div>
      </div>
    </div>
  );
}

function PrimaryBtn(props) {
  return (
    <button onClick={props.onClick} disabled={props.disabled} style={Object.assign({ padding: "10px 22px", borderRadius: 8, border: "none", background: props.disabled ? "#b0c4d4" : OM_BLUE, color: props.disabled ? "#fff" : OM_NAVY, fontWeight: 600, fontSize: 14, cursor: props.disabled ? "default" : "pointer", fontFamily: "inherit" }, props.style || {})}>
      {props.children}
    </button>
  );
}

function GhostBtn(props) {
  return (
    <button onClick={props.onClick} style={Object.assign({ padding: "8px 16px", borderRadius: 8, border: "1px solid #d0d8e0", background: "#fff", color: OM_NAVY, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }, props.style || {})}>
      {props.children}
    </button>
  );
}

function ProgressBar(props) {
  var pct = props.max ? Math.round((props.value / props.max) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: "#e4eaf0" }}>
        <div style={{ width: pct + "%", height: "100%", borderRadius: 3, background: OM_BLUE, transition: "width .4s" }} />
      </div>
      <span style={{ fontSize: 12, color: "#7a96aa", minWidth: 36 }}>{props.value}/{props.max}</span>
    </div>
  );
}

function DeleteModal(props) {
  if (!props.show) return null;
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(13,31,45,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: "2rem", maxWidth: 380, width: "90%" }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#fdecea", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#c0392b", marginBottom: 16 }}>!</div>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: OM_NAVY, marginBottom: 8 }}>
          {props.step === 1 ? props.title1 : props.title2}
        </h3>
        <p style={{ fontSize: 14, color: "#7a96aa", marginBottom: 20, lineHeight: 1.6 }}>
          {props.step === 1 ? props.body1 : props.body2}
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={props.onCancel} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #e4eaf0", background: "#fff", color: OM_NAVY, fontWeight: 500, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={props.onConfirm} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: props.step === 2 ? "#c0392b" : "#e74c3c", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
            {props.step === 1 ? props.btn1 : props.btn2}
          </button>
        </div>
      </div>
    </div>
  );
}

function PracticeManager(props) {
  var [newName, setNewName] = useState("");
  var [editIdx, setEditIdx] = useState(null);
  var [editVal, setEditVal] = useState("");
  var [deleteIdx, setDeleteIdx] = useState(null);
  var [deleteStep, setDeleteStep] = useState(0);

  function addPractice() {
    var name = newName.trim();
    if (!name || props.practices.indexOf(name) !== -1) return;
    props.onUpdate(props.practices.concat([name]));
    setNewName("");
  }

  function startEdit(i) { setEditIdx(i); setEditVal(props.practices[i]); }

  function saveEdit(i) {
    var val = editVal.trim();
    if (!val) { setEditIdx(null); return; }
    var updated = props.practices.slice();
    var old = updated[i];
    updated[i] = val;
    props.onUpdate(updated);
    props.onRename(old, val);
    setEditIdx(null);
  }

  function requestDelete(i) { setDeleteIdx(i); setDeleteStep(1); }
  function confirmDelete() {
    if (deleteStep === 1) { setDeleteStep(2); return; }
    var name = props.practices[deleteIdx];
    var updated = props.practices.filter(function(_, i) { return i !== deleteIdx; });
    props.onUpdate(updated);
    props.onRemove(name);
    setDeleteIdx(null);
    setDeleteStep(0);
  }

  return (
    <div style={{ padding: "2rem 1.5rem", maxWidth: 560, margin: "0 auto" }}>
      <button onClick={props.onBack} style={{ background: "none", border: "none", color: "#7a96aa", fontSize: 13, marginBottom: "1.5rem", padding: 0, cursor: "pointer", fontFamily: "inherit" }}>← Back</button>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: OM_NAVY, marginBottom: 4 }}>Manage practices</h1>
      <p style={{ fontSize: 14, color: "#7a96aa", marginBottom: "1.5rem" }}>Add, rename, or remove dental practices from your account.</p>

      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e4eaf0", marginBottom: "1.5rem" }}>
        {props.practices.length === 0 && (
          <div style={{ padding: "1.5rem", fontSize: 14, color: "#7a96aa", textAlign: "center" }}>No practices yet. Add one below.</div>
        )}
        {props.practices.map(function(name, i) {
          var clusterCount = props.clusters.filter(function(c) { return c.practice === name; }).length;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: i < props.practices.length - 1 ? "1px solid #f0f4f8" : "none", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#e8f7fd", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: OM_BLUE, flexShrink: 0 }}>
                {name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {editIdx === i ? (
                  <input value={editVal} onChange={function(e) { setEditVal(e.target.value); }} onKeyDown={function(e) { if (e.key === "Enter") saveEdit(i); if (e.key === "Escape") setEditIdx(null); }} autoFocus style={{ fontFamily: "inherit", fontSize: 14, color: OM_NAVY, background: "#fff", border: "1px solid " + OM_BLUE, borderRadius: 6, padding: "5px 8px", width: "100%", boxSizing: "border-box" }} />
                ) : (
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: OM_NAVY }}>{name}</div>
                    <div style={{ fontSize: 12, color: "#7a96aa" }}>{clusterCount} cluster{clusterCount !== 1 ? "s" : ""}</div>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                {editIdx === i ? (
                  <button onClick={function() { saveEdit(i); }} style={{ fontSize: 12, padding: "5px 12px", borderRadius: 6, border: "none", background: OM_BLUE, color: OM_NAVY, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Save</button>
                ) : (
                  <button onClick={function() { startEdit(i); }} style={{ fontSize: 12, padding: "5px 12px", borderRadius: 6, border: "1px solid #e4eaf0", background: "#f8fafc", color: "#7a96aa", cursor: "pointer", fontFamily: "inherit" }}>Rename</button>
                )}
                <button onClick={function() { requestDelete(i); }} style={{ fontSize: 12, padding: "5px 12px", borderRadius: 6, border: "1px solid #f0c0bb", background: "#fdf3f2", color: "#c0392b", cursor: "pointer", fontFamily: "inherit" }}>Remove</button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e4eaf0", padding: "1.25rem" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: OM_NAVY, marginBottom: 10 }}>Add new practice</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={newName} onChange={function(e) { setNewName(e.target.value); }} onKeyDown={function(e) { if (e.key === "Enter") addPractice(); }} placeholder="Practice name" style={{ flex: 1, fontFamily: "inherit", fontSize: 14, color: OM_NAVY, background: "#fff", border: "1px solid #d0d8e0", borderRadius: 8, padding: "9px 12px" }} />
          <PrimaryBtn onClick={addPractice}>Add</PrimaryBtn>
        </div>
      </div>

      <DeleteModal
        show={deleteStep > 0} step={deleteStep}
        title1="Remove this practice?" title2="Are you absolutely sure?"
        body1={"Removing \"" + (deleteIdx !== null ? props.practices[deleteIdx] : "") + "\" will not delete its clusters, but they will no longer be associated with a practice."}
        body2="This cannot be undone. The practice will be permanently removed."
        btn1="Yes, remove" btn2="Remove forever"
        onConfirm={confirmDelete} onCancel={function() { setDeleteIdx(null); setDeleteStep(0); }}
      />
    </div>
  );
}

function Sidebar(props) {
  var filtered = props.filter === "All Practices"
    ? props.clusters
    : props.clusters.filter(function(c) { return c.practice === props.filter; });

  return (
    <div style={{ width: 240, minWidth: 240, background: OM_NAVY, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <div onClick={props.onHome} style={{ padding: "20px 16px 16px", borderBottom: "1px solid rgba(255,255,255,.08)", cursor: "pointer" }}>
        <Logo />
      </div>
      <div style={{ padding: "12px 8px 4px" }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 6, paddingLeft: 4 }}>Practice</div>
        <select value={props.filter} onChange={function(e) { props.onFilter(e.target.value); }} style={{ width: "100%", background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", color: "#fff", borderRadius: 8, padding: "7px 10px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
          <option value="All Practices" style={{ background: OM_NAVY }}>All Practices</option>
          {props.practices.map(function(p) { return <option key={p} value={p} style={{ background: OM_NAVY }}>{p}</option>; })}
        </select>
      </div>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", letterSpacing: ".06em", textTransform: "uppercase", padding: "10px 12px 4px" }}>Clusters</div>
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px" }}>
        {filtered.length === 0 && <div style={{ fontSize: 12, color: "rgba(255,255,255,.3)", padding: "10px 4px" }}>No clusters found.</div>}
        {filtered.map(function(c) {
          var isActive = props.activeid === c.id;
          return (
            <div key={c.id} onClick={function() { props.onSelect(c); }} style={{ padding: "9px 12px", borderRadius: 8, marginBottom: 4, cursor: "pointer", background: isActive ? "rgba(58,181,230,.15)" : "transparent", borderLeft: isActive ? "3px solid " + OM_BLUE : "3px solid transparent" }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: isActive ? OM_BLUE : "rgba(255,255,255,.8)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.keywordCategory}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginTop: 2 }}>{c.practice}</div>
              <div style={{ marginTop: 5, display: "flex", gap: 3 }}>
                {(c.posts || []).map(function(p, i) {
                  return <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: p.status === "written" ? OM_BLUE : "rgba(255,255,255,.2)" }} />;
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ padding: "8px 8px 4px", borderTop: "1px solid rgba(255,255,255,.08)" }}>
        <button onClick={props.onNew} style={{ width: "100%", padding: "9px", borderRadius: 8, border: "1px solid rgba(58,181,230,.4)", background: "transparent", color: OM_BLUE, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", marginBottom: 6 }}>+ New cluster</button>
        <button onClick={props.onManagePractices} style={{ width: "100%", padding: "9px", borderRadius: 8, border: "1px solid rgba(255,255,255,.1)", background: "transparent", color: "rgba(255,255,255,.5)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Manage practices</button>
      </div>
    </div>
  );
}

function Dashboard(props) {
  var totalClusters = props.clusters.length;
  var totalPosts = props.clusters.reduce(function(acc, c) { return acc + (c.posts ? c.posts.length : 0); }, 0);
  var totalWritten = props.clusters.reduce(function(acc, c) { return acc + (c.posts ? c.posts.filter(function(p) { return p.status === "written"; }).length : 0); }, 0);

  var byPractice = {};
  props.clusters.forEach(function(c) {
    var p = c.practice || "Unassigned";
    if (!byPractice[p]) byPractice[p] = [];
    byPractice[p].push(c);
  });

  return (
    <div style={{ padding: "2rem 1.5rem", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: OM_BLUE, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 4 }}>OM Performance Marketing</div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: OM_NAVY, marginBottom: 4 }}>Content Dashboard</h1>
        <p style={{ fontSize: 14, color: "#7a96aa" }}>Overview of all your content clusters and posts.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: "2rem" }}>
        {[["Practices", props.practices.length], ["Clusters", totalClusters], ["Posts written", totalWritten + "/" + totalPosts]].map(function(item) {
          return (
            <div key={item[0]} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e4eaf0", padding: "1.25rem" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#7a96aa", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 8 }}>{item[0]}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: OM_NAVY }}>{item[1]}</div>
            </div>
          );
        })}
      </div>

      {totalClusters === 0 && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e4eaf0", padding: "4rem 2rem", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12, color: OM_BLUE }}>+</div>
          <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8, color: OM_NAVY }}>No clusters yet</div>
          <div style={{ fontSize: 14, color: "#7a96aa", marginBottom: 20 }}>Create your first content cluster to get started.</div>
          <PrimaryBtn onClick={props.onNew}>+ New cluster</PrimaryBtn>
        </div>
      )}

      {Object.keys(byPractice).map(function(practice) {
        return (
          <div key={practice} style={{ marginBottom: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: OM_NAVY, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#e8f7fd", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, color: OM_BLUE }}>{practice.charAt(0)}</div>
                {practice}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
              {byPractice[practice].map(function(c) {
                var written = (c.posts || []).filter(function(p) { return p.status === "written"; }).length;
                var total = (c.posts || []).length;
                var pct = total ? Math.round((written / total) * 100) : 0;
                return (
                  <div key={c.id} onClick={function() { props.onOpen(c); }} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e4eaf0", padding: "1.25rem", cursor: "pointer", transition: "border .15s" }}>
                    <div style={{ marginBottom: 6 }}><Badge stage={written === total && total > 0 ? "BOFU" : written > 0 ? "MOFU" : "TOFU"} /></div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: OM_NAVY, marginBottom: 4 }}>{c.keywordCategory}</div>
                    <div style={{ fontSize: 12, color: "#7a96aa", marginBottom: 12 }}>{c.location}</div>
                    <ProgressBar value={written} max={total} />
                    <div style={{ marginTop: 12, display: "flex", gap: 3 }}>
                      {(c.posts || []).map(function(p, i) {
                        return <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: p.status === "written" ? OM_BLUE : "#e4eaf0" }} />;
                      })}
                    </div>
                  </div>
                );
              })}
              <div onClick={props.onNew} style={{ background: "#fafbfc", borderRadius: 12, border: "2px dashed #e4eaf0", padding: "1.25rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#7a96aa", fontSize: 14, fontWeight: 500, minHeight: 120 }}>
                <span style={{ fontSize: 20 }}>+</span> New cluster
              </div>
            </div>
          </div>
        );
      })}

      {totalClusters > 0 && (
        <PrimaryBtn onClick={props.onNew} style={{ marginTop: "1rem" }}>+ New cluster</PrimaryBtn>
      )}
    </div>
  );
}

function NewCluster(props) {
  var [step, setStep] = useState("form");
  var [form, setForm] = useState({ practice: props.practices[0] || "", website: "", location: "", keywordCategory: "", pillarPage: "", postCount: 6 });
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState("");
  var [keywords, setKeywords] = useState([]);
  var [selectedKws, setSelectedKws] = useState([]);
  var [titles, setTitles] = useState([]);

  function setF(k, v) { setForm(function(f) { return Object.assign({}, f, { [k]: v }); }); }

  var stepLabels = ["Setup", "Keywords", "Plan"];
  var stepIdx = step === "form" ? 0 : step === "keywords" ? 1 : 2;

  async function researchKeywords() {
    if (!form.website || !form.location || !form.keywordCategory || !form.pillarPage) { setError("Please fill all fields."); return; }
    setError(""); setLoading(true);
    var txt = await callClaude([{ role: "user", content: "Generate 12 high-intent local SEO keywords for a dental practice. Location: " + form.location + ". Category: " + form.keywordCategory + ". Website: " + form.website + ". Return ONLY a JSON array: [{\"keyword\":\"...\",\"intent\":\"TOFU|MOFU|BOFU\",\"volume\":\"low|medium|high\"}]. No extra text or markdown." }], 1000);
    setLoading(false);
    try { setKeywords(JSON.parse(txt.replace(/```json/g, "").replace(/```/g, "").trim())); setStep("keywords"); }
    catch(e) { setError("Keyword generation failed. Please try again."); }
  }

  async function generateTitles() {
    setLoading(true);
    var kwList = (selectedKws.length ? selectedKws : keywords.slice(0, 6)).map(function(k) { return k.keyword; }).join(", ");
    var txt = await callClaude([{ role: "user", content: "Create exactly " + form.postCount + " blog post titles for a dental practice content cluster. Location: " + form.location + ". Pillar: " + form.pillarPage + ". Keywords: " + kwList + ". Category: " + form.keywordCategory + ". Distribute across TOFU, MOFU, BOFU. Return ONLY a JSON array: [{\"title\":\"...\",\"stage\":\"TOFU|MOFU|BOFU\",\"targetKeyword\":\"...\"}]. No extra text." }], 1000);
    setLoading(false);
    try { setTitles(JSON.parse(txt.replace(/```json/g, "").replace(/```/g, "").trim())); setStep("titles"); }
    catch(e) { setError("Title generation failed. Please try again."); }
  }

  function finalize() {
    var posts = titles.map(function(t, i) { return Object.assign({}, t, { id: i, status: "planned", content: "" }); });
    props.onSave(Object.assign({}, { id: Date.now() }, form, { posts: posts, createdAt: new Date().toISOString() }));
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <button onClick={props.onCancel} style={{ background: "none", border: "none", color: "#7a96aa", fontSize: 13, marginBottom: "1.5rem", padding: 0, cursor: "pointer", fontFamily: "inherit" }}>← Back</button>
      <div style={{ display: "flex", alignItems: "center", marginBottom: "2rem" }}>
        {stepLabels.map(function(s, i) {
          return (
            <div key={s} style={{ display: "flex", alignItems: "center", flex: i < stepLabels.length - 1 ? 1 : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, background: i < stepIdx ? OM_BLUE : i === stepIdx ? OM_NAVY : "#e4eaf0", color: i < stepIdx ? OM_NAVY : i === stepIdx ? "#fff" : "#7a96aa" }}>
                  {i < stepIdx ? "✓" : i + 1}
                </div>
                <span style={{ fontSize: 13, fontWeight: i === stepIdx ? 600 : 400, color: i === stepIdx ? OM_NAVY : "#7a96aa" }}>{s}</span>
              </div>
              {i < stepLabels.length - 1 && <div style={{ flex: 1, height: 1, background: i < stepIdx ? OM_BLUE : "#e4eaf0", margin: "0 12px" }} />}
            </div>
          );
        })}
      </div>
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e4eaf0", padding: "1.75rem" }}>
        {step === "form" && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: "1.25rem", color: OM_NAVY }}>Cluster setup</h2>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#7a96aa", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".04em" }}>Practice</label>
              {props.practices.length === 0 ? (
                <div style={{ fontSize: 13, color: "#c0392b", padding: "8px 0" }}>No practices yet. <button onClick={props.onManagePractices} style={{ background: "none", border: "none", color: OM_BLUE, cursor: "pointer", fontFamily: "inherit", fontSize: 13, padding: 0 }}>Add one first →</button></div>
              ) : (
                <select value={form.practice} onChange={function(e) { setF("practice", e.target.value); }} style={{ width: "100%", fontFamily: "inherit", fontSize: 14, color: OM_NAVY, background: "#fff", border: "1px solid #d0d8e0", borderRadius: 8, padding: "9px 12px" }}>
                  {props.practices.map(function(p) { return <option key={p}>{p}</option>; })}
                </select>
              )}
            </div>
            {[["website","Practice website","https://yourdigitalsmile.com"],["location","Location (city, state)","San Pedro, California"],["keywordCategory","Keyword category","Cosmetic Dentistry"],["pillarPage","Pillar page URL","https://yourdigitalsmile.com/cosmetic-dentistry/"]].map(function(item) {
              return (
                <div key={item[0]} style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#7a96aa", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".04em" }}>{item[1]}</label>
                  <input value={form[item[0]]} onChange={function(e) { setF(item[0], e.target.value); }} placeholder={item[2]} style={{ width: "100%", boxSizing: "border-box", fontFamily: "inherit", fontSize: 14, color: OM_NAVY, background: "#fff", border: "1px solid #d0d8e0", borderRadius: 8, padding: "9px 12px" }} />
                </div>
              );
            })}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#7a96aa", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".04em" }}>Number of posts</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[4, 6, 8].map(function(n) {
                  return <button key={n} onClick={function() { setF("postCount", n); }} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "2px solid " + (form.postCount === n ? OM_BLUE : "#e4eaf0"), background: form.postCount === n ? "#e8f7fd" : "#fff", color: form.postCount === n ? OM_NAVY : "#7a96aa", fontWeight: form.postCount === n ? 700 : 400, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>{n}</button>;
                })}
              </div>
            </div>
            {error && <p style={{ color: "#c0392b", fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <PrimaryBtn onClick={researchKeywords} disabled={loading || props.practices.length === 0} style={{ width: "100%" }}>{loading ? "Researching keywords…" : "Research keywords →"}</PrimaryBtn>
          </div>
        )}
        {step === "keywords" && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4, color: OM_NAVY }}>Select keywords</h2>
            <p style={{ fontSize: 13, color: "#7a96aa", marginBottom: "1.25rem" }}>Choose the best keywords, or skip to use all.</p>
            <div style={{ display: "grid", gap: 8, marginBottom: "1.25rem" }}>
              {keywords.map(function(kw, i) {
                var sel = selectedKws.find(function(s) { return s.keyword === kw.keyword; });
                return (
                  <div key={i} onClick={function() { setSelectedKws(function(s) { return sel ? s.filter(function(x) { return x.keyword !== kw.keyword; }) : s.concat([kw]); }); }} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 8, border: "2px solid " + (sel ? OM_BLUE : "#e4eaf0"), background: sel ? "#e8f7fd" : "#fafbfc", cursor: "pointer" }}>
                    <span style={{ fontSize: 14, fontWeight: sel ? 500 : 400, color: OM_NAVY }}>{kw.keyword}</span>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <Badge stage={kw.intent} />
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#f0f4f8", color: "#7a96aa", fontWeight: 500 }}>{kw.volume}</span>
                      <span style={{ color: sel ? OM_BLUE : "#d0d8e0", fontWeight: 700, fontSize: 16 }}>{sel ? "✓" : "+"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {error && <p style={{ color: "#c0392b", fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <PrimaryBtn onClick={generateTitles} disabled={loading} style={{ width: "100%" }}>{loading ? "Generating titles…" : "Generate " + form.postCount + " post titles →"}</PrimaryBtn>
          </div>
        )}
        {step === "titles" && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4, color: OM_NAVY }}>Review content plan</h2>
            <p style={{ fontSize: 13, color: "#7a96aa", marginBottom: "1.25rem" }}>Edit titles as needed before saving.</p>
            {STAGES.map(function(stage) {
              var sp = titles.filter(function(t) { return t.stage === stage; });
              if (!sp.length) return null;
              return (
                <div key={stage} style={{ marginBottom: "1.25rem" }}>
                  <div style={{ marginBottom: 8 }}><Badge stage={stage} /></div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {sp.map(function(t) {
                      var ri = titles.indexOf(t);
                      return (
                        <div key={ri} style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #e4eaf0", background: "#fafbfc" }}>
                          <input value={t.title} onChange={function(e) { var v = e.target.value; setTitles(function(ts) { return ts.map(function(x, j) { return j === ri ? Object.assign({}, x, { title: v }) : x; }); }); }} style={{ width: "100%", boxSizing: "border-box", fontFamily: "inherit", fontSize: 14, color: OM_NAVY, background: "#fff", border: "1px solid #d0d8e0", borderRadius: 8, padding: "8px 12px", marginBottom: 6, fontWeight: 500 }} />
                          <div style={{ fontSize: 12, color: "#7a96aa" }}>Target: {t.targetKeyword}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <PrimaryBtn onClick={finalize} style={{ width: "100%" }}>Save cluster →</PrimaryBtn>
          </div>
        )}
      </div>
    </div>
  );
}

function ClusterView(props) {
  var cluster = props.cluster;
  var [writingAll, setWritingAll] = useState(false);
  var written = (cluster.posts || []).filter(function(p) { return p.status === "written"; }).length;

  async function writeAll() {
    setWritingAll(true);
    var updated = Object.assign({}, cluster, { posts: cluster.posts.slice() });
    var unwritten = updated.posts.filter(function(p) { return p.status !== "written"; });
    for (var i = 0; i < unwritten.length; i++) {
      var post = unwritten[i];
      var idx = updated.posts.findIndex(function(p) { return p.id === post.id; });
      updated.posts[idx] = Object.assign({}, updated.posts[idx], { status: "writing" });
      props.onUpdate(Object.assign({}, updated));
      var content = await generatePost(post, updated);
      updated.posts[idx] = Object.assign({}, updated.posts[idx], { status: "written", content: content });
      props.onUpdate(Object.assign({}, updated));
    }
    setWritingAll(false);
  }

  return (
    <div style={{ padding: "2rem 1.5rem", maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: OM_BLUE, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 4 }}>{cluster.practice}</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: OM_NAVY, marginBottom: 4 }}>{cluster.keywordCategory}</h1>
          <div style={{ fontSize: 13, color: "#7a96aa" }}>{cluster.location} · <a href={cluster.pillarPage} target="_blank" rel="noreferrer" style={{ color: OM_BLUE }}>{cluster.pillarPage}</a></div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {written < (cluster.posts || []).length && <PrimaryBtn onClick={writeAll} disabled={writingAll}>{writingAll ? "Writing…" : "Write all posts"}</PrimaryBtn>}
          <GhostBtn onClick={props.onDelete} style={{ color: "#c0392b", borderColor: "#f0c0bb" }}>Delete</GhostBtn>
        </div>
      </div>
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e4eaf0", padding: "1rem 1.25rem", marginBottom: "1.5rem" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#7a96aa", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".04em" }}>Progress</div>
        <ProgressBar value={written} max={(cluster.posts || []).length} />
      </div>
      {STAGES.map(function(stage) {
        var posts = (cluster.posts || []).filter(function(p) { return p.stage === stage; });
        if (!posts.length) return null;
        var sw = posts.filter(function(p) { return p.status === "written"; }).length;
        return (
          <div key={stage} style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <Badge stage={stage} />
              <span style={{ fontSize: 13, color: "#7a96aa" }}>· {sw}/{posts.length} written</span>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {posts.map(function(post) {
                var idx = cluster.posts.findIndex(function(p) { return p.id === post.id; });
                return (
                  <PostCard key={post.id} post={post} onClick={function() { props.onOpenPost(idx); }} onWrite={async function() {
                    var content = await generatePost(post, cluster);
                    props.onUpdate(Object.assign({}, cluster, { posts: cluster.posts.map(function(p) { return p.id === post.id ? Object.assign({}, p, { status: "written", content: content }) : p; }) }));
                  }} />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PostCard(props) {
  var post = props.post;
  var [writing, setWriting] = useState(false);
  var isWritten = post.status === "written";
  var isWriting = post.status === "writing" || writing;
  async function handleWrite(e) { e.stopPropagation(); setWriting(true); await props.onWrite(); setWriting(false); }
  return (
    <div onClick={props.onClick} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderRadius: 10, border: "1px solid " + (isWritten ? "#c5e8c5" : "#e4eaf0"), background: isWritten ? "#f6fef6" : "#fff", cursor: "pointer", gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: OM_NAVY, marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{post.title}</div>
        <div style={{ fontSize: 12, color: "#7a96aa" }}>Target: {post.targetKeyword}</div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
        {isWritten && <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "#d4edda", color: "#1a6e2e", fontWeight: 600 }}>Written</span>}
        {isWriting && <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "#fff3cd", color: "#7a5a00", fontWeight: 600 }}>Writing…</span>}
        {!isWritten && !isWriting && <button onClick={handleWrite} style={{ fontSize: 12, padding: "5px 12px", borderRadius: 6, border: "1px solid " + OM_BLUE, background: "#e8f7fd", color: OM_NAVY, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Write</button>}
        <span style={{ color: "#b0c4d4", fontSize: 18 }}>›</span>
      </div>
    </div>
  );
}

function PostView(props) {
  var post = props.cluster.posts[props.postIdx];
  var [writing, setWriting] = useState(false);
  var [tab, setTab] = useState("preview");
  var [copiedHtml, setCopiedHtml] = useState(false);
  var [copiedText, setCopiedText] = useState(false);
  var [imagePrompt, setImagePrompt] = useState(post.title + " dental practice professional");
  var [imageSearches, setImageSearches] = useState([]);
  var [loadingImage, setLoadingImage] = useState(false);

  async function write() {
    setWriting(true);
    var content = await generatePost(post, props.cluster);
    props.onUpdate(Object.assign({}, props.cluster, { posts: props.cluster.posts.map(function(p, i) { return i === props.postIdx ? Object.assign({}, p, { status: "written", content: content }) : p; }) }));
    setWriting(false); setTab("preview");
  }

  function copyHtml() { navigator.clipboard.writeText(post.content || ""); setCopiedHtml(true); setTimeout(function() { setCopiedHtml(false); }, 2000); }
  function copyText() { navigator.clipboard.writeText(stripHtml(post.content || "")); setCopiedText(true); setTimeout(function() { setCopiedText(false); }, 2000); }

  async function suggestImages() {
    if (!imagePrompt.trim()) return;
    setLoadingImage(true);
    var txt = await callClaude([{ role: "user", content: "For a dental blog post titled \"" + post.title + "\", suggest 4 specific image search queries a marketer could use to find great stock photos or prompts for AI image generation. Return ONLY a JSON array of objects: [{\"query\":\"...\",\"type\":\"stock|ai-generate\",\"tip\":\"one sentence why this works\"}]. No extra text." }], 500);
    setLoadingImage(false);
    try { setImageSearches(JSON.parse(txt.replace(/```json/g, "").replace(/```/g, "").trim())); }
    catch(e) { setImageSearches([]); }
  }

  var meta = post.content ? extractMeta(post.content) : {};

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <button onClick={props.onBack} style={{ background: "none", border: "none", color: "#7a96aa", fontSize: 13, marginBottom: "1.5rem", padding: 0, cursor: "pointer", fontFamily: "inherit" }}>← Back to cluster</button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ marginBottom: 8 }}><Badge stage={post.stage} /></div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: OM_NAVY, marginBottom: 4 }}>{post.title}</h1>
          <div style={{ fontSize: 13, color: "#7a96aa" }}>Target: <strong style={{ color: OM_NAVY }}>{post.targetKeyword}</strong></div>
        </div>
        <PrimaryBtn onClick={write} disabled={writing}>{writing ? "Writing…" : post.content ? "Regenerate" : "Write post"}</PrimaryBtn>
      </div>

      {post.content && meta.metaTitle && (
        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e4eaf0", padding: "12px 16px", marginBottom: "1.25rem", display: "grid", gap: 6 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#7a96aa", textTransform: "uppercase", letterSpacing: ".04em", minWidth: 90 }}>Meta title</span>
            <span style={{ fontSize: 13, color: OM_NAVY }}>{meta.metaTitle}</span>
          </div>
          {meta.metaDesc && (
            <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#7a96aa", textTransform: "uppercase", letterSpacing: ".04em", minWidth: 90 }}>Meta desc</span>
              <span style={{ fontSize: 13, color: "#7a96aa" }}>{meta.metaDesc}</span>
            </div>
          )}
        </div>
      )}

      {!post.content && !writing && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e4eaf0", padding: "4rem 2rem", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12, color: OM_BLUE }}>+</div>
          <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8, color: OM_NAVY }}>Ready to write</div>
          <div style={{ fontSize: 14, color: "#7a96aa", marginBottom: 20 }}>Generate your 900–1,100 word WordPress-ready article.</div>
          <PrimaryBtn onClick={write}>Write post</PrimaryBtn>
        </div>
      )}

      {writing && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e4eaf0", padding: "4rem 2rem", textAlign: "center" }}>
          <div style={{ fontSize: 14, color: "#7a96aa" }}>Writing your article — usually takes about 15 seconds…</div>
        </div>
      )}

      {post.content && !writing && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", gap: 4, background: "#f0f4f8", padding: 4, borderRadius: 8 }}>
              {[["preview","Preview"],["html","HTML"],["image","Image"]].map(function(t) {
                return <button key={t[0]} onClick={function() { setTab(t[0]); }} style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: tab === t[0] ? "#fff" : "transparent", color: tab === t[0] ? OM_NAVY : "#7a96aa", fontWeight: tab === t[0] ? 600 : 400, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>{t[1]}</button>;
              })}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={copyText} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #d0d8e0", background: "#fff", color: OM_NAVY, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>{copiedText ? "Copied!" : "Copy text"}</button>
              <button onClick={copyHtml} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid " + OM_BLUE, background: "#e8f7fd", color: OM_NAVY, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{copiedHtml ? "Copied!" : "Copy HTML"}</button>
            </div>
          </div>

          {tab === "preview" && (
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e4eaf0", overflow: "hidden" }}>
              <div style={{ background: "#f8fafc", borderBottom: "1px solid #e4eaf0", padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex", gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ffc3bc" }} />
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ffe19a" }} />
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#aaebb4" }} />
                </div>
                <div style={{ flex: 1, background: "#eef1f5", borderRadius: 6, padding: "4px 10px", fontSize: 11, color: "#7a96aa" }}>{props.cluster.pillarPage}</div>
              </div>
              <div style={{ padding: "2.5rem 3rem", maxWidth: 680, margin: "0 auto" }}>
                <div style={{ marginBottom: "1.5rem" }}>
                  <div style={{ display: "inline-block", background: "#e8f7fd", color: "#0e7daa", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, marginBottom: 14, letterSpacing: ".04em", textTransform: "uppercase" }}>{post.stage} · {STAGE_META[post.stage] ? STAGE_META[post.stage].sub : ""}</div>
                  <h1 style={{ fontSize: 26, fontWeight: 800, color: OM_NAVY, lineHeight: 1.3, marginBottom: 12 }}>{post.title}</h1>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#7a96aa", paddingBottom: 16, borderBottom: "1px solid #f0f4f8" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: OM_NAVY, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>OM</div>
                    <span>{props.cluster.practice}</span>
                    <span>·</span>
                    <span>{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                  </div>
                </div>
                <div style={{ fontSize: 15, lineHeight: 1.85, color: "#2d3748" }} dangerouslySetInnerHTML={{ __html: post.content.replace(/<!--[\s\S]*?-->/g, "") }} />
              </div>
            </div>
          )}

          {tab === "html" && (
            <textarea readOnly value={post.content} style={{ width: "100%", boxSizing: "border-box", height: 520, fontFamily: "monospace", fontSize: 12, lineHeight: 1.6, resize: "vertical", borderRadius: 12, border: "1px solid #e4eaf0", padding: "1rem", background: "#fafbfc", color: OM_NAVY }} />
          )}

          {tab === "image" && (
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e4eaf0", padding: "1.75rem" }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: OM_NAVY, marginBottom: 4 }}>Image suggestions</h2>
              <p style={{ fontSize: 13, color: "#7a96aa", marginBottom: "1.25rem" }}>Get search queries for stock photos or prompts for AI image generators like Midjourney or DALL-E.</p>
              <div style={{ display: "flex", gap: 8, marginBottom: "1.25rem" }}>
                <input value={imagePrompt} onChange={function(e) { setImagePrompt(e.target.value); }} placeholder={"e.g. " + post.title} style={{ flex: 1, fontFamily: "inherit", fontSize: 14, color: OM_NAVY, background: "#fff", border: "1px solid #d0d8e0", borderRadius: 8, padding: "9px 12px" }} />
                <PrimaryBtn onClick={suggestImages} disabled={loadingImage}>{loadingImage ? "Thinking…" : "Suggest"}</PrimaryBtn>
              </div>
              {imageSearches.length > 0 && (
                <div style={{ display: "grid", gap: 10 }}>
                  {imageSearches.map(function(s, i) {
                    return (
                      <div key={i} style={{ padding: "14px 16px", borderRadius: 10, border: "1px solid #e4eaf0", background: "#fafbfc" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: OM_NAVY, flex: 1 }}>"{s.query}"</div>
                          <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 20, background: s.type === "stock" ? "#eaf0f6" : "#e8f7fd", color: s.type === "stock" ? "#1a3f5c" : "#0e7daa", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>{s.type === "stock" ? "Stock photo" : "AI generate"}</span>
                        </div>
                        <div style={{ fontSize: 12, color: "#7a96aa", marginBottom: 10 }}>{s.tip}</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {s.type === "stock" && (
                            <>
                              <a href={"https://unsplash.com/s/photos/" + encodeURIComponent(s.query)} target="_blank" rel="noreferrer" style={{ fontSize: 12, padding: "4px 12px", borderRadius: 6, border: "1px solid #e4eaf0", background: "#fff", color: OM_NAVY, textDecoration: "none", fontWeight: 500 }}>Unsplash</a>
                              <a href={"https://www.pexels.com/search/" + encodeURIComponent(s.query)} target="_blank" rel="noreferrer" style={{ fontSize: 12, padding: "4px 12px", borderRadius: 6, border: "1px solid #e4eaf0", background: "#fff", color: OM_NAVY, textDecoration: "none", fontWeight: 500 }}>Pexels</a>
                              <a href={"https://stock.adobe.com/search?k=" + encodeURIComponent(s.query)} target="_blank" rel="noreferrer" style={{ fontSize: 12, padding: "4px 12px", borderRadius: 6, border: "1px solid #e4eaf0", background: "#fff", color: OM_NAVY, textDecoration: "none", fontWeight: 500 }}>Adobe Stock</a>
                            </>
                          )}
                          {s.type === "ai-generate" && (
                            <>
                              <a href={"https://www.bing.com/images/create?q=" + encodeURIComponent(s.query)} target="_blank" rel="noreferrer" style={{ fontSize: 12, padding: "4px 12px", borderRadius: 6, border: "1px solid #e4eaf0", background: "#fff", color: OM_NAVY, textDecoration: "none", fontWeight: 500 }}>DALL-E (Bing)</a>
                              <button onClick={function() { navigator.clipboard.writeText(s.query); }} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 6, border: "1px solid " + OM_BLUE, background: "#e8f7fd", color: OM_NAVY, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Copy prompt</button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {imageSearches.length === 0 && !loadingImage && (
                <div style={{ textAlign: "center", padding: "2rem", color: "#7a96aa", fontSize: 14, background: "#fafbfc", borderRadius: 10, border: "1px solid #f0f4f8" }}>
                  Click "Suggest" to get image ideas for this post.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  var stored = loadFromStorage();
  var [practices, setPractices] = useState((stored && stored.practices) || DEFAULT_DATA.practices);
  var [clusters, setClusters] = useState((stored && stored.clusters) || DEFAULT_DATA.clusters);
  var [view, setView] = useState("dashboard");
  var [activeCluster, setActiveCluster] = useState(null);
  var [activePostIdx, setActivePostIdx] = useState(null);
  var [filter, setFilter] = useState("All Practices");
  var [deleteStep, setDeleteStep] = useState(0);

  function save(newPractices, newClusters) {
    var p = newPractices !== undefined ? newPractices : practices;
    var c = newClusters !== undefined ? newClusters : clusters;
    setPractices(p); setClusters(c);
    saveToStorage({ practices: p, clusters: c });
  }

  function updateClusters(newClusters) { save(undefined, newClusters); }
  function updatePractices(newPractices) { save(newPractices, undefined); }

  function selectCluster(c) { setActiveCluster(c); setActivePostIdx(null); setView("cluster"); }
  function updateCluster(updated) {
    var next = clusters.map(function(c) { return c.id === updated.id ? updated : c; });
    updateClusters(next); setActiveCluster(updated);
  }
  function requestDelete() { setDeleteStep(1); }
  function confirmDelete() {
    if (deleteStep === 1) { setDeleteStep(2); return; }
    var next = clusters.filter(function(c) { return c.id !== activeCluster.id; });
    updateClusters(next);
    setActiveCluster(next[0] || null);
    setView(next.length ? "cluster" : "dashboard");
    setDeleteStep(0);
  }

  function mainContent() {
    if (view === "practices") return (
      <PracticeManager
        practices={practices}
        clusters={clusters}
        onBack={function() { setView(clusters.length ? "cluster" : "dashboard"); }}
        onUpdate={updatePractices}
        onRename={function(old, next) {
          var updated = clusters.map(function(c) { return c.practice === old ? Object.assign({}, c, { practice: next }) : c; });
          updateClusters(updated);
          if (activeCluster && activeCluster.practice === old) setActiveCluster(Object.assign({}, activeCluster, { practice: next }));
        }}
        onRemove={function(name) {
          if (filter === name) setFilter("All Practices");
        }}
      />
    );
    if (view === "new") return <NewCluster practices={practices} onManagePractices={function() { setView("practices"); }} onSave={function(c) { var next = clusters.concat([c]); updateClusters(next); setActiveCluster(c); setView("cluster"); }} onCancel={function() { setView(clusters.length ? "cluster" : "dashboard"); }} />;
    if (view === "post" && activeCluster && activePostIdx !== null) return <PostView cluster={activeCluster} postIdx={activePostIdx} onBack={function() { setView("cluster"); }} onUpdate={updateCluster} />;
    if (view === "cluster" && activeCluster) return <ClusterView cluster={activeCluster} onUpdate={updateCluster} onDelete={requestDelete} onOpenPost={function(idx) { setActivePostIdx(idx); setView("post"); }} />;
    return <Dashboard clusters={clusters} practices={practices} onOpen={selectCluster} onNew={function() { setView("new"); }} />;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f4f6f8", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <Sidebar
        clusters={clusters} activeid={activeCluster && activeCluster.id}
        onSelect={selectCluster} onNew={function() { setView("new"); }}
        filter={filter} onFilter={setFilter}
        practices={practices}
        onManagePractices={function() { setView("practices"); }}
        onHome={function() { setView("dashboard"); }}

      />
      <div style={{ flex: 1, overflowY: "auto" }}>{mainContent()}</div>
      <DeleteModal
        show={deleteStep > 0} step={deleteStep}
        title1="Delete this cluster?" title2="Are you absolutely sure?"
        body1="This will permanently delete the cluster and all its written content. This cannot be undone."
        body2="Final confirmation. All posts and keyword research in this cluster will be lost forever."
        btn1="Yes, delete" btn2="Delete forever"
        onConfirm={confirmDelete} onCancel={function() { setDeleteStep(0); }}
      />
    </div>
  );
}
