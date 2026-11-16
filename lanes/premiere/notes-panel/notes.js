// Timecode Notes: Frame.io-style notes on the playhead, for pasting into a chat. Nothing is written to the project:
// notes live in this panel's localStorage, one list per sequence. In a plain browser (no CEP) a mock playhead runs,
// so the UI can be tested outside Premiere.
(function () {
  const TPS = 254016000000;
  const inCEP = typeof window.__adobe_cep__ !== "undefined";
  const cs = inCEP ? new CSInterface() : null;
  const $ = (id) => document.getElementById(id);

  // ---- host calls ---------------------------------------------------------------------------------------------
  const STATE_ES = `(function(){try{var p=app.project,s=p?p.activeSequence:null;if(!s)return '{"none":true}';
    var t=s.getPlayerPosition(),tc=null;try{var st=s.getSettings();tc=t.getFormatted(st.videoFrameRate,st.videoDisplayFormat)}catch(e){}
    return JSON.stringify({id:String(s.sequenceID),name:String(s.name),path:String(p.path),tc:tc,ticks:String(t.ticks),tb:String(s.timebase)})}
    catch(e){return JSON.stringify({err:String(e)})}})()`;
  const jumpES = (ticks) => `(function(){try{app.project.activeSequence.setPlayerPosition("${ticks}");return "ok"}catch(e){return String(e)}})()`;

  const mock = { t0: Date.now(), tb: 8475667200 };
  function evalES(script) {
    return new Promise((res) => {
      if (cs) return cs.evalScript(script, (r) => res(r));
      if (script.indexOf("setPlayerPosition") >= 0) { const m = script.match(/"(\d+)"/); mock.t0 = Date.now() - (Number(m[1]) / TPS) * 1000; return res("ok"); }
      const ticks = Math.round(((Date.now() - mock.t0) / 1000) * TPS);
      res(JSON.stringify({ id: "mock", name: "V12 Cut 1 (browser test)", path: "mock", tc: null, ticks: String(ticks), tb: String(mock.tb) }));
    });
  }

  // ---- timecode -------------------------------------------------------------------------------------------------
  const pad = (n) => String(n).padStart(2, "0");
  function fallbackTC(ticks, tb) {   // non-drop HH:MM:SS:FF from ticks, used only when Premiere can't format it
    const fps = Math.round(TPS / tb), f = Math.round(ticks / tb);
    return `${pad(Math.floor(f / (fps * 3600)))}:${pad(Math.floor(f / (fps * 60)) % 60)}:${pad(Math.floor(f / fps) % 60)}:${pad(f % fps)}`;
  }

  // ---- state ----------------------------------------------------------------------------------------------------
  let cur = null;          // latest playhead {ticks, tc}
  let seq = null;          // {key, name}
  let notes = [];          // [{ticks, tc, text}]
  let captured = null;     // playhead taken when typing started

  const storeKey = () => "tcnotes:" + (seq ? seq.key : "none");
  function load() { try { notes = JSON.parse(localStorage.getItem(storeKey()) || "[]"); } catch (e) { notes = []; } render(); }
  function save() { try { localStorage.setItem(storeKey(), JSON.stringify(notes)); } catch (e) {} }

  async function poll() {
    let s;
    try { s = JSON.parse(await evalES(STATE_ES)); } catch (e) { return; }
    if (!s || s.none || s.err) { $("tc").textContent = "--:--:--:--"; $("seq").textContent = s && s.err ? "Premiere error" : "No sequence"; return; }
    const ticks = Number(s.ticks), tb = Number(s.tb);
    cur = { ticks, tc: s.tc || fallbackTC(ticks, tb) };
    $("tc").textContent = cur.tc;
    const key = s.path + "::" + s.id;
    if (!seq || seq.key !== key) { seq = { key, name: s.name }; $("seq").textContent = s.name; $("seq").title = s.name; captured = null; load(); }
    if (!captured) $("atTc").textContent = cur.tc;
  }

  // ---- composer ---------------------------------------------------------------------------------------------------
  const note = $("note");
  note.addEventListener("input", () => {
    if (note.value.trim() && !captured && cur) { captured = { ...cur }; $("atTc").textContent = captured.tc; }
    if (!note.value.trim()) { captured = null; if (cur) $("atTc").textContent = cur.tc; }
  });
  note.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); add(); }
    if (e.key === "Escape") { note.value = ""; captured = null; }
  });
  $("regrab").onclick = () => { if (cur) { captured = { ...cur }; $("atTc").textContent = captured.tc; note.focus(); } };

  function add() {
    const text = note.value.trim(), at = captured || cur;
    if (!text || !at) return;
    notes.push({ ticks: at.ticks, tc: at.tc, text });
    notes.sort((a, b) => a.ticks - b.ticks);
    save(); render(); note.value = ""; captured = null;
  }

  // ---- list ---------------------------------------------------------------------------------------------------------
  function render() {
    const list = $("list"); list.innerHTML = "";
    if (!notes.length) list.innerHTML = '<div id="empty">No notes yet. Park the playhead, start typing, press Enter.</div>';
    notes.forEach((n, i) => {
      const row = document.createElement("div"); row.className = "row";
      const t = document.createElement("span"); t.className = "t"; t.textContent = n.tc; t.title = "Jump here";
      t.onclick = () => evalES(jumpES(n.ticks));
      const x = document.createElement("span"); x.className = "x"; x.textContent = n.text;
      x.ondblclick = () => edit(x, i);
      const d = document.createElement("button"); d.className = "del"; d.textContent = "×"; d.title = "Delete";
      d.onclick = () => { notes.splice(i, 1); save(); render(); };
      row.append(t, x, d); list.appendChild(row);
    });
    $("count").textContent = notes.length ? notes.length + (notes.length === 1 ? " note" : " notes") : "";
    $("copy").disabled = !notes.length;
  }
  function edit(el, i) {
    el.contentEditable = "true"; el.focus();
    const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    const done = (keep) => { el.contentEditable = "false"; const v = el.textContent.trim();
      if (keep && v) notes[i].text = v; else if (keep && !v) notes.splice(i, 1); save(); render(); };
    el.onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); el.onblur = null; done(true); }
                            if (e.key === "Escape") { el.onblur = null; done(false); } };
    el.onblur = () => done(true);
  }

  // ---- copy / clear ---------------------------------------------------------------------------------------------------
  function toast(msg) { const t = $("toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("on"), 1600); }
  $("copy").onclick = () => {
    const text = (seq ? `Notes on ${seq.name}:\n` : "") + notes.map((n) => `${n.tc}  ${n.text}`).join("\n");
    const c = $("clip"); c.value = text; c.select();
    let ok = false; try { ok = document.execCommand("copy"); } catch (e) {}
    if (!ok && navigator.clipboard) navigator.clipboard.writeText(text).then(() => toast("Copied")).catch(() => toast("Copy failed"));
    else toast(ok ? `Copied ${notes.length} note${notes.length === 1 ? "" : "s"}` : "Copy failed");
    note.focus();
  };
  let armed = 0;
  $("clear").onclick = () => {
    if (!notes.length) return;
    if (Date.now() - armed > 2500) { armed = Date.now(); $("clear").textContent = "Sure?"; setTimeout(() => ($("clear").textContent = "Clear"), 2500); return; }
    notes = []; save(); render(); $("clear").textContent = "Clear"; toast("Cleared");
  };

  render();
  poll(); setInterval(poll, 200);
})();
