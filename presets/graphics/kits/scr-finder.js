// scr-finder.js (worker scr-setup, video 14): a coded macOS Finder window, drawn like the Finder in Artem's own screen
// recordings (macOS 26: floating sidebar panel, glass toolbar pills, blue folders; measured on recording 14.25.40 at
// 16-29 s, where 1.6 capture px = 1 pt). Everything is a pure function of t on top of eg.js: no timers, no transitions.
// Demo: graphics/scr-finder-demo/index.html (open it in a browser; it loops).
//
// USAGE
//   <script src="../_lib/eg.js"></script><script src="../_lib/scr-finder.js"></script>
//   const fin = FINDER.make(stageEl, {
//     w: 600, h: 380,            // window size in pt
//     s: 2,                      // stage px per pt (text is 12-13 pt: s 2 makes it 24-26 px on the 1080 stage)
//     start: 'home',             // the folder shown first
//     folders: { home: {title: 'testeditor', side: 'testeditor', items: ['desktop', 'documents']},   // side = sidebar row it lights
//                ve:   {title: 'video-editor', items: []} },
//     items: { desktop: {name: 'Desktop', kind: 'folder', glyph: 'desktop'},
//              foot: {name: '2026-11-06_12-26-37.mp4', kind: 'video', thumb: 'foot.jpg', ar: 16/9, info: '51:16'} },
//       // kind: folder | video | image (thumb + ar = width/height) | pdf | font | md | zip | doc;  info = the grey-blue line
//       // under the name (Finder's "Show item info": a video's length, a folder's item count);  open: a folder id to enter
//     sidebar: FINDER.SIDEBAR('testeditor'),     // or your own [{title?, items: [[label, icon]]}]
//   });
//   fin.script([ {t: 1.0, do: 'move', to: {item: 'desktop'}, dur: .5}, {t: 1.6, do: 'dbl'}, ... ]);   // see VERBS below
//   EG.run(DUR, t => { fin.place(x, y); EG.mat(fin.el, t, .1); fin.draw(t); });
//   fin.place(x, y, s?)  puts the window's top-left at stage (x, y), optionally at another scale (a camera move = the page
//   animating x, y, s).  fin.slot(i) = [x, y] centre of grid place i, fin.pt(target, t) = where a target is at time t,
//   both in window pt; fin.stage(x, y) turns window pt into stage px.  fin.cues() = the script's clicks and keys as sound
//   cues [{t, kind, note}] in page seconds (add the graphic's timeline start).
//   Showing and hiding: animate fin.el (EG.mat(fin.el, t, tIn, {exit})); to keep it off screen set fin.el.style.opacity = 0
//   (its parts follow the window's visibility). Several windows on one page = several FINDER.make() instances.
//   Used by: graphics/scr-s3a (new folder, rename, sidebar, files dropped in), graphics/scr-s3b/s3b.js (column view).
//   The Windows sister is _lib/scr-explorer.js (demo: graphics/scr-finder-demo/explorer.html).
//
// VERBS (each event is {t, do, ...}; t = page seconds; events are replayed in order for every frame)
//   go      {folder}                      the window shows that folder (title, content, sidebar highlight)
//   move    {to, dur=.5}                  the pointer travels to a target, eased. Targets: [x, y] in window pt, {item: id},
//                                         {slot: i}, {side: rowId}, {menu: i}, {col: [column, id]}, each with optional dx, dy
//   cur     {on}                          pointer shown / hidden (it starts hidden)
//   click / dbl / rclick                  press and release where the pointer is (the black "show clicks" ring)
//   press / release                       the two halves, for a drag
//   sel     {id|null}                     selection (grey tile behind the icon, blue name)
//   menu    {items, at?}                  context menu at the pointer: items = ['New Folder', '-', {label, sub: true}, ...]
//   hover   {i}  pick {i}  menuoff        highlight a row, choose it (one blink, then the menu closes), or just close
//   mk      {id, name='untitled folder', kind='folder', folder?, index?, edit=true}   a new item, its name being edited
//   edit    {id}                          start renaming an item that exists
//   type    {id, text, dur}               typed over the selected name, one character after another
//   commit  {id}                          Return: the name is set, the item stays selected
//   sort    {folder?}                     re-sort by name, items glide to their places
//   add     {id, folder?, index?}  rm {id}   an item arrives in / leaves a folder (dropped in, deleted)
//   grab    {id}  drop {}                 press on an item and carry its ghost with the pointer; let go
//   carry   {ids}  drop {}                the pointer arrives already carrying files from outside the window
//   sidegap {group, index, on}            the blue insertion line in the sidebar while a folder hovers there
//   sideadd {id, label, icon='folder', group, index}   a new sidebar row (the rows below make room)
//   sidesel {id|null}                     sidebar highlight by hand (go sets it by itself)
//   view    {mode: 'icons'|'cols', cols?: [{folder, sel?}, ...]}     column view: each column lists a folder, sel = its
//                                         highlighted row (the last column's is blue, the others grey)
//   colsel  {col, id}                     change a column's highlighted row (and what the next column lists: pass cols again)
//   ring    {target, on}                  an Everygen-blue light-up around a target (pointing at something), on = true/false
//   title   {text}                        override the title
window.FINDER=(()=>{
const C=EG.clamp,L=EG.lerp,X=EG.E.expo,Q=EG.E.quart;
const io=u=>u<.5?4*u*u*u:1-Math.pow(-2*u+2,3)/2;
const css=`
.fdr{position:absolute;left:0;top:0}
.fdr-in{position:absolute;left:0;top:0;transform-origin:0 0;font-family:-apple-system,"SF Pro Text",system-ui,"Helvetica Neue",sans-serif;color:#1d1d1f;-webkit-font-smoothing:antialiased;letter-spacing:-.005em;line-height:1.2;font-weight:400}
.fdr-sh{position:absolute;inset:0;border-radius:26px;box-shadow:0 22px 50px rgba(16,48,94,.26),0 5px 14px rgba(16,48,94,.13),0 0 0 .5px rgba(0,0,0,.22)}
.fdr-win{position:absolute;inset:0;border-radius:26px;background:#fff;overflow:hidden}
.fdr-sb{position:absolute;left:6px;top:6px;bottom:6px;width:141px;border-radius:20px;background:#f3f3f5;box-shadow:0 0 0 .5px rgba(0,0,0,.075),0 1px 4px rgba(0,0,0,.06);overflow:hidden}
.fdr-tl{position:absolute;top:10px;width:14px;height:14px;border-radius:50%;box-shadow:inset 0 0 0 .5px rgba(0,0,0,.14)}
.fdr-row{position:absolute;left:8px;right:8px;height:28px;border-radius:8px;font-size:13px;white-space:nowrap;transform-origin:20px 50%}
.fdr-row svg{position:absolute;left:10px;top:5.5px;width:17px;height:17px}
.fdr-row span{position:absolute;left:33.5px;top:0;line-height:28px}
.fdr-row.sel{background:rgba(0,0,0,.088)}
.fdr-hd{position:absolute;left:15px;font-size:11px;font-weight:700;color:#8a8a8f;line-height:14px}
.fdr-gap{position:absolute;left:14px;right:12px;height:2px;border-radius:1px;background:#2f7bf6}
.fdr-gap::before{content:"";position:absolute;left:-5px;top:-2.5px;width:5px;height:5px;border-radius:50%;border:1.5px solid #2f7bf6;background:#f3f3f5;box-sizing:content-box}
.fdr-pill{position:absolute;top:7.5px;height:31px;border-radius:16px;background:#fff;box-shadow:0 0 0 .5px rgba(0,0,0,.07),0 1px 4px rgba(0,0,0,.10),0 5px 16px rgba(0,0,0,.07)}
.fdr-pill svg{position:absolute;top:6.5px;width:18px;height:18px}
.fdr-pill u{position:absolute;top:2.5px;width:26px;height:26px;border-radius:50%;background:#e6e6e8}
.fdr-pill s{position:absolute;top:8px;width:1px;height:15px;background:#dcdcdf}
.fdr-ttl{position:absolute;left:230px;top:0;height:46px;line-height:46px;font-size:14px;font-weight:700;white-space:nowrap;letter-spacing:-.01em}
.fdr-ct{position:absolute;left:147px;top:0;right:0;bottom:0}
.fdr-it{position:absolute;width:94px;height:0;margin-left:-47px;text-align:center}
.fdr-ic{position:absolute;left:15px;top:-32px;width:64px;height:64px;border-radius:8px;display:flex;align-items:center;justify-content:center}
.fdr-it.sel .fdr-ic{background:rgba(0,0,0,.10)}
.fdr-ic svg{display:block}
.fdr-th{display:block;border-radius:3px;box-shadow:0 0 0 .5px rgba(0,0,0,.20),0 1px 3px rgba(0,0,0,.28);object-fit:cover}
.fdr-nm{position:absolute;left:0;right:0;top:36px;font-size:12px;line-height:14.5px;overflow-wrap:anywhere}
.fdr-nm span{padding:1px 3.5px;border-radius:4px;-webkit-box-decoration-break:clone;box-decoration-break:clone}
.fdr-it.sel .fdr-nm span{background:#2a6ff0;color:#fff}
.fdr-inf{display:block;font-size:11px;line-height:14px;color:#3f85f5;margin-top:1px}
.fdr-ed{display:inline-block;padding:1px 3.5px;border-radius:4px;background:#fff;box-shadow:0 0 0 2.5px rgba(58,130,247,.62);white-space:nowrap;color:#1d1d1f}
.fdr-ed b{font-weight:400;background:#b3d4fd;border-radius:1px}
.fdr-ed i{display:inline-block;width:1px;height:13px;background:#111;vertical-align:-2.5px;margin-left:.5px}
.fdr-fx{position:absolute;inset:0;pointer-events:none}
.fdr-menu{position:absolute;min-width:186px;padding:5px;border-radius:11px;background:rgba(246,246,247,.975);box-shadow:0 0 0 .5px rgba(0,0,0,.24),0 12px 34px rgba(0,0,0,.24),0 2px 6px rgba(0,0,0,.10);font-size:13px;transform-origin:0 0}
.fdr-mi{height:24px;border-radius:6.5px;display:flex;align-items:center;padding:0 9px 0 8px;white-space:nowrap}
.fdr-mi svg{width:15px;height:15px;flex:none;margin-right:7px}
.fdr-mi.hi{background:#2f7bf6;color:#fff}
.fdr-mi em{font-style:normal;margin-left:auto;padding-left:22px;opacity:.5;font-size:11px}
.fdr-ms{height:1px;margin:5px 9px;background:rgba(0,0,0,.11)}
.fdr-cur{position:absolute;width:15px;height:22px;margin:-2px 0 0 -2px;filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.35))}
.fdr-rg{position:absolute;border-radius:50%;border:1.3px solid #151515;box-sizing:border-box}
.fdr-gh{position:absolute;left:0;top:0}
.fdr-bd{position:absolute;min-width:18px;height:18px;border-radius:9px;background:#ff3b30;color:#fff;font-size:11px;font-weight:600;line-height:18px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.3)}
.fdr-hl{position:absolute;border-radius:10px;box-sizing:border-box;border:1.6px solid #0075FD;background:rgba(0,117,253,.10);box-shadow:0 0 12px rgba(0,117,253,.45)}
.fdr-hl i{position:absolute;inset:-1.6px;border:1.3px solid #0075FD;border-radius:10px}
.fdr-col{position:absolute;top:46px;bottom:0;width:150px;border-right:1px solid #e4e4e8}
.fdr-cr{position:absolute;left:5px;right:5px;height:20px;border-radius:5px;font-size:12px;white-space:nowrap;line-height:20px}
.fdr-cr svg{position:absolute;left:5px;top:3px;width:17px;height:14px}
.fdr-cr span{position:absolute;left:27px}
.fdr-cr em{position:absolute;right:6px;font-style:normal;opacity:.42;font-size:9.5px}
.fdr-cr.sel{background:#2a6ff0;color:#fff}.fdr-cr.sel2{background:#dddde1}`;
let styled=false;const style=()=>{if(styled)return;styled=true;const s=document.createElement('style');s.textContent=css;document.head.appendChild(s)};
// ---- icons: 24-box line icons in the style of the system's (stroke 1.6) ----
const sv=(p,c='#1d1d1f',w=1.6,vb='0 0 24 24')=>`<svg viewBox="${vb}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const I={
 clock:'<circle cx="12" cy="12" r="8.6"/><path d="M12 7.2V12l3.2 2"/>',
 shared:'<path d="M3 8.2V17a2.2 2.2 0 0 0 2.2 2.2h8.3M3 8.2V7a2.2 2.2 0 0 1 2.2-2.2h3.6l2 2.4H18A2.2 2.2 0 0 1 20.2 9.4v1.2"/><circle cx="18.2" cy="14.6" r="1.9"/><path d="M14.6 20.6a3.7 3.7 0 0 1 7.2 0"/>',
 apps:'<path d="M12.6 4.2L5.4 17.8M11.4 4.2l7.2 13.6M3.6 17.8h6.2M14.2 17.8h6.2M8.2 12.6h7.6"/>',
 desktop:'<rect x="3.2" y="5.4" width="17.6" height="13.2" rx="2.6"/><rect x="6.6" y="13.6" width="10.8" height="2.4" rx="1" fill="#1d1d1f" stroke="none"/>',
 doc:'<path d="M7.2 3.6h6.4l4.4 4.5v10.5a1.9 1.9 0 0 1-1.9 1.9H7.2a1.9 1.9 0 0 1-1.9-1.9V5.5a1.9 1.9 0 0 1 1.9-1.9z"/><path d="M13.4 3.8v4.4h4.4"/>',
 down:'<circle cx="12" cy="12" r="8.6"/><path d="M12 7.6v8.4M8.6 12.8L12 16.2l3.4-3.4"/>',
 cloud:'<path d="M7 18.2a4.2 4.2 0 0 1-.6-8.36 5.6 5.6 0 0 1 10.8-1.3A4.9 4.9 0 0 1 17.4 18.2z"/>',
 house:'<path d="M3.6 11.2L12 4.2l8.4 7M5.8 9.6v9.2h12.4V9.6"/><path d="M10 18.8v-5h4v5"/>',
 folder:'<path d="M3.2 7.4A2.2 2.2 0 0 1 5.4 5.2h3.7l2 2.3h7.5a2.2 2.2 0 0 1 2.2 2.2v7.1A2.2 2.2 0 0 1 18.6 19H5.4a2.2 2.2 0 0 1-2.2-2.2z"/>',
 drive:'<path d="M5.4 13.2l1.9-6.3a1.9 1.9 0 0 1 1.8-1.3h5.8a1.9 1.9 0 0 1 1.8 1.3l1.9 6.3"/><rect x="3.6" y="13.2" width="16.8" height="5.4" rx="1.8"/><circle cx="16.8" cy="15.9" r=".7" fill="#1d1d1f"/>',
 back:'<path d="M14.4 5.6L8 12l6.4 6.4"/>',fwd:'<path d="M9.6 5.6L16 12l-6.4 6.4"/>',
 grid:'<rect x="4.4" y="4.4" width="6.2" height="6.2" rx="1.4"/><rect x="13.4" y="4.4" width="6.2" height="6.2" rx="1.4"/><rect x="4.4" y="13.4" width="6.2" height="6.2" rx="1.4"/><rect x="13.4" y="13.4" width="6.2" height="6.2" rx="1.4"/>',
 list:'<path d="M9 6.6h11M9 12h11M9 17.4h11"/><circle cx="4.8" cy="6.6" r=".8" fill="#1d1d1f"/><circle cx="4.8" cy="12" r=".8" fill="#1d1d1f"/><circle cx="4.8" cy="17.4" r=".8" fill="#1d1d1f"/>',
 cols:'<rect x="3.4" y="5" width="17.2" height="14" rx="2.4"/><path d="M9.2 5v14M14.8 5v14"/>',
 gal:'<rect x="3.4" y="4.6" width="17.2" height="10" rx="2.2"/><path d="M4.4 18.6h1.6M8.6 18.6h1.6M12.8 18.6h1.6M17 18.6h1.6" stroke-width="2.2"/>',
 group:'<rect x="3" y="5" width="4" height="3.6" rx=".9"/><rect x="9" y="5" width="4" height="3.6" rx=".9"/><rect x="15" y="5" width="4" height="3.6" rx=".9"/><rect x="3" y="11.4" width="4" height="3.6" rx=".9"/><rect x="9" y="11.4" width="4" height="3.6" rx=".9"/><rect x="15" y="11.4" width="4" height="3.6" rx=".9"/><path d="M3 18.6h16"/>',
 chev:'<path d="M8 10l4 4 4-4"/>',
 share:'<path d="M12 14.4V4M8.4 7.2L12 3.6l3.6 3.6M7.6 10.4H6.9A1.9 1.9 0 0 0 5 12.3v6.2a1.9 1.9 0 0 0 1.9 1.9h10.2a1.9 1.9 0 0 0 1.9-1.9v-6.2a1.9 1.9 0 0 0-1.9-1.9h-.7"/>',
 tag:'<path d="M4 12.2V5.9A1.9 1.9 0 0 1 5.9 4h6.3a2 2 0 0 1 1.4.6l6.2 6.2a1.9 1.9 0 0 1 0 2.7l-6.3 6.3a1.9 1.9 0 0 1-2.7 0l-6.2-6.2a2 2 0 0 1-.6-1.4z"/><circle cx="8.4" cy="8.4" r="1" fill="#1d1d1f"/>',
 more:'<circle cx="5.6" cy="12" r="1.3" fill="#1d1d1f" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="#1d1d1f" stroke="none"/><circle cx="18.4" cy="12" r="1.3" fill="#1d1d1f" stroke="none"/>',
 search:'<circle cx="10.6" cy="10.6" r="6.2"/><path d="M15.2 15.2l4.6 4.6"/>',
 newf:'<path d="M3.2 7.4A2.2 2.2 0 0 1 5.4 5.2h3.7l2 2.3h7.5a2.2 2.2 0 0 1 2.2 2.2v2.2M12 19H5.4a2.2 2.2 0 0 1-2.2-2.2V7.4"/><path d="M18 14.4v6M15 17.4h6"/>',
 info:'<circle cx="12" cy="12" r="8.6"/><path d="M12 11v5.4"/><circle cx="12" cy="7.8" r=".7" fill="#1d1d1f"/>',
 sort:'<path d="M7.4 5v14M4.2 15.8L7.4 19l3.2-3.2M16.6 19V5M13.4 8.2L16.6 5l3.2 3.2"/>',
 gear:'<circle cx="12" cy="12" r="3"/><path d="M12 3.6v2.2M12 18.2v2.2M3.6 12h2.2M18.2 12h2.2M6.1 6.1l1.5 1.5M16.4 16.4l1.5 1.5M6.1 17.9l1.5-1.5M16.4 7.6l1.5-1.5"/>',
 film:'<rect x="3.6" y="5.4" width="16.8" height="13.2" rx="2.2"/><path d="M8 5.4v13.2M16 5.4v13.2M3.6 12h16.8"/>',
 note:'<path d="M9.4 17.6V6.8l9-2v10.6"/><circle cx="7" cy="17.6" r="2.4"/><circle cx="16" cy="15.4" r="2.4"/>',
 photo:'<rect x="3.6" y="5" width="16.8" height="14" rx="2.4"/><circle cx="8.8" cy="10" r="1.6"/><path d="M4 16.6l4.6-3.8 3.2 2.6 3.6-3.6 5 4.6"/>',
 person:'<circle cx="12" cy="8.4" r="3.4"/><path d="M5.2 19.4a6.8 6.8 0 0 1 13.6 0"/>',
};
const ic=(k,c,w)=>sv(I[k]||I.folder,c,w);
// the folder (54 x 44 pt), with an optional engraved glyph like the home folder's own folders
const FOLDER=(g,w=54)=>`<svg viewBox="0 0 54 44" width="${w}" height="${(w*44/54).toFixed(2)}" style="filter:drop-shadow(0 1px 1.2px rgba(20,60,110,.28))"><defs><linearGradient id="fdrB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#46A6EE"/><stop offset="1" stop-color="#3B98E3"/></linearGradient><linearGradient id="fdrF" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#82CEFA"/><stop offset="1" stop-color="#5DB7F3"/></linearGradient></defs><path d="M1.5 6.6A4.6 4.6 0 0 1 6.1 2h11.6c1.7 0 2.7.6 3.8 1.9l1.5 1.7c.8.9 1.6 1.3 2.9 1.3h22a4.6 4.6 0 0 1 4.6 4.6v25.9A4.6 4.6 0 0 1 47.9 42H6.1a4.6 4.6 0 0 1-4.6-4.6z" fill="url(#fdrB)"/><path d="M1.5 15.1a4.3 4.3 0 0 1 4.3-4.3h42.4a4.3 4.3 0 0 1 4.3 4.3v22.3A4.6 4.6 0 0 1 47.9 42H6.1a4.6 4.6 0 0 1-4.6-4.6z" fill="url(#fdrF)"/><path d="M2 15.1a3.8 3.8 0 0 1 3.8-3.8h42.4a3.8 3.8 0 0 1 3.8 3.8" fill="none" stroke="rgba(255,255,255,.62)" stroke-width="1"/>${g?`<g transform="translate(17 16.2) scale(.84)" fill="none" stroke="rgba(22,104,190,.50)" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${I[g].replace(/#1d1d1f/g,'rgba(22,104,190,.50)')}</g>`:''}</svg>`;
// a document (40 x 50 pt box): pdf | font | md | zip | doc
const DOC=(k,w=40)=>{const body={pdf:'<rect x="6" y="27" width="22" height="11" rx="2.4" fill="#E5484D"/><text x="17" y="35.4" font-size="7.6" font-weight="700" fill="#fff" text-anchor="middle" font-family="-apple-system,system-ui">PDF</text><path d="M9 12h13M9 16.5h17M9 21h11" stroke="#c9c9ce" stroke-width="1.6" stroke-linecap="round"/>',
  font:'<text x="18.6" y="31" font-size="17" font-weight="600" fill="#3a3a3f" text-anchor="middle" font-family="-apple-system,system-ui">Aa</text>',
  md:'<path d="M9 14h10M9 19h17M9 24h17M9 29h13M9 34h16" stroke="#b9b9c0" stroke-width="1.6" stroke-linecap="round"/><path d="M9 14h10" stroke="#55555c" stroke-width="2" stroke-linecap="round"/>',
  zip:'<path d="M18.5 6v3M18.5 12v3M18.5 18v3M18.5 24v3" stroke="#9a9aa2" stroke-width="2.4"/><rect x="15.4" y="29" width="6.2" height="8" rx="1.4" fill="none" stroke="#9a9aa2" stroke-width="1.6"/>',
  doc:'<path d="M9 16h17M9 21h17M9 26h17M9 31h11" stroke="#c4c4ca" stroke-width="1.6" stroke-linecap="round"/>'}[k]||'';
 return `<svg viewBox="0 0 37 47" width="${w*.92}" height="${(w*.92*47/37).toFixed(2)}" style="filter:drop-shadow(0 1px 1.6px rgba(0,0,0,.26))"><path d="M4.4 2.5h19.4l9.7 9.9v29.2a3 3 0 0 1-3 3H4.4a3 3 0 0 1-3-3V5.5a3 3 0 0 1 3-3z" fill="#fff" stroke="#d2d2d8" stroke-width=".8"/><path d="M23.8 2.5v7a2.9 2.9 0 0 0 2.9 2.9h6.8z" fill="#ececf0" stroke="#d2d2d8" stroke-width=".8" stroke-linejoin="round"/>${body}</svg>`};
const CURSOR='<svg viewBox="0 0 15 22"><path d="M2 2v15.4l3.9-3.5 2.8 6.3 2.4-1.05-2.75-6.2h5.2z" fill="#111" stroke="#fff" stroke-width="1.25" stroke-linejoin="round" paint-order="stroke"/></svg>';
const SIDEBAR=home=>[{items:[['Recents','clock'],['Shared','shared']]},
 {title:'Favourites',items:[['Applications','apps'],['Desktop','desktop'],['Documents','doc'],['Downloads','down']]},
 {title:'Locations',items:[['iCloud Drive','cloud'],[home,'house']]}];
const MENU_BG=[{label:'New Folder',icon:'newf'},'-',{label:'Get Info',icon:'info'},'-',{label:'View',icon:'grid',sub:true},{label:'Use Groups',icon:'group'},{label:'Sort By',icon:'sort',sub:true},{label:'Show View Options',icon:'gear'}];
const HOME={folders:{items:['desktop','documents','downloads','movies','music','pictures','public']},
 items:{desktop:{name:'Desktop',kind:'folder',glyph:'desktop'},documents:{name:'Documents',kind:'folder',glyph:'doc'},downloads:{name:'Downloads',kind:'folder',glyph:'down'},
  movies:{name:'Movies',kind:'folder',glyph:'film'},music:{name:'Music',kind:'folder',glyph:'note'},pictures:{name:'Pictures',kind:'folder',glyph:'photo'},public:{name:'Public',kind:'folder',glyph:'person'}}};
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
const h=(tag,cls,par,html)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;if(par)par.appendChild(e);return e};

function make(parent,o){style();
 const W=o.w||600,H=o.h||380;let S=o.s||2;
 const G={x0:54.5,dx:o.dx||92.5,y0:89,dy:o.dy||105};const NC=o.cols||Math.max(1,Math.floor((W-147-G.x0-40)/G.dx)+1);
 const el=h('div','fdr',parent),inn=h('div','fdr-in',el);Object.assign(inn.style,{width:W+'px',height:H+'px'});
 h('div','fdr-sh',inn);const win=h('div','fdr-win',inn),sb=h('div','fdr-sb',win);
 ['#ff5f57','#febc2e','#28c840'].forEach((c,i)=>{const d=h('div','fdr-tl',sb);d.style.left=(10+i*20.5)+'px';d.style.background=c});
 // toolbar
 const nav=h('div','fdr-pill',win,ic('back')+ic('fwd','#b9b9be'));Object.assign(nav.style,{left:'155px',width:'64px'});nav.children[0].style.left='7px';nav.children[1].style.left='38px';
 const ttl=h('div','fdr-ttl',win);
 const vw=h('div','fdr-pill',win,'<u></u>'+ic('grid')+ic('list')+ic('cols')+ic('gal')+'<s></s>');Object.assign(vw.style,{right:'104px',width:'131px'});
 [8.5,40,72,104].forEach((x,i)=>vw.children[i+1].style.left=x+'px');vw.lastChild.style.left='65px';const vwSel=vw.firstChild;
 const mo=h('div','fdr-pill',win,ic('more'));Object.assign(mo.style,{right:'49px',width:'44px'});mo.firstChild.style.left='13px';
 const se=h('div','fdr-pill',win,ic('search'));Object.assign(se.style,{right:'7.5px',width:'31px'});se.firstChild.style.left='6.5px';
 const ct=h('div','fdr-ct',win),fx=h('div','fdr-fx',inn);
 const menuEl=h('div','fdr-menu',fx),ghEl=h('div','fdr-gh',fx),rgWrap=h('div','',fx),curEl=h('div','fdr-cur',fx,CURSOR);
 const folders=JSON.parse(JSON.stringify(o.folders||{})),items=Object.assign({},o.items||{});
 // ---- item elements (made up front so thumbnails are decoded before the first frame) ----
 const itEl={};
 const iconHTML=(d,w)=>{const k=d.kind||'folder';
  if(k==='folder')return FOLDER(d.glyph,w||54);
  if((k==='video'||k==='image')&&d.thumb){const ar=d.ar||16/9,m=(w||54)*.96,tw=ar>=1?m:m*ar,th=ar>=1?m/ar:m;return `<img class="fdr-th" src="${d.thumb}" style="width:${tw.toFixed(1)}px;height:${th.toFixed(1)}px">`}
  return DOC(k==='video'||k==='image'?'doc':k,w?w*.74:40)};
 const mkEl=id=>{if(itEl[id])return itEl[id];const d=items[id],e=h('div','fdr-it',ct,`<div class="fdr-ic">${iconHTML(d)}</div><div class="fdr-nm"></div>`);e.style.visibility='hidden';e._nm='';return itEl[id]=e};
 Object.keys(items).forEach(mkEl);
 // ---- sidebar model: rows with a y per group layout ----
 const SBG=(o.sidebar||SIDEBAR(o.home||'testeditor')).map(g=>({title:g.title,items:g.items.map(r=>({id:r[2]||r[0],label:r[0],icon:r[1]}))}));
 const sideLay=groups=>{let y=54.6;const out={rows:[],heads:[]};groups.forEach((g,gi)=>{if(g.title){y+=gi?7:0;out.heads.push({gi,title:g.title,y:y+1});y+=21.6}
   g.items.forEach((r,ri)=>{out.rows.push({id:r.id,gi,ri,y});y+=28.4});});return out};
 const rowEl={},headEl=[];const gapEl=h('div','fdr-gap',sb);
 const mkRow=r=>{if(rowEl[r.id])return rowEl[r.id];const e=h('div','fdr-row',sb,ic(r.icon)+`<span>${esc(r.label)}</span>`);return rowEl[r.id]=e};
 SBG.forEach((g,gi)=>{g.items.forEach(mkRow);if(g.title)headEl[gi]=h('div','fdr-hd',sb,esc(g.title))});
 const hlEls=[];const colEls=[];
 let SCR=[];
 // ---- targets (window pt) ----
 const slot=i=>[147+G.x0+(i%NC)*G.dx,G.y0+Math.floor(i/NC)*G.dy];
 const COLX=c=>147+c*150;
 function target(st,to,t){if(Array.isArray(to))return to;const dx=to.dx||0,dy=to.dy||0;let p=[W/2,H/2];
  if(to.item!=null){const it=st.it[to.item];p=it?[EG.spring(t,it.t0,it.fx,it.tx,12),EG.spring(t,it.t0,it.fy,it.ty,12)+2]:p}
  else if(to.slot!=null)p=slot(to.slot);
  else if(to.side!=null){const r=st.side[to.side];p=r?[6+70,6+EG.spring(t,r.t0,r.fy,r.ty,12)+14]:p}
  else if(to.menu!=null&&st.menu){let y=5;const m=st.menu;for(let i=0;i<m.items.length;i++){const sep=m.items[i]==='-';if(i===to.menu){y+=sep?5:12;break}y+=sep?11:24}p=[m.x+70,m.y+y]}
  else if(to.col){const[c,id]=to.col,cl=st.cols[c],k=cl?st.lists[cl.folder].indexOf(id):0;p=[COLX(c)+60,46+8+Math.max(0,k)*20+10]}
  return [p[0]+dx,p[1]+dy]}
 // ---- replay: the state after every event up to t ----
 function replay(t){
  const st={folder:o.start||Object.keys(folders)[0],goT:-9,lists:{},it:{},side:{},sideG:SBG.map(g=>({title:g.title,items:g.items.slice()})),sideSel:undefined,sideAuto:true,gap:null,
   menu:null,cur:{x0:W*.62,y0:H*.6,x1:W*.62,y1:H*.6,t0:-9,d:.5},curOn:[],rings:[],ghost:null,sel:null,view:o.view||'icons',cols:o.colsInit||[],viewT:-9,hl:[],title:null,selT:-9};
  for(const k in folders)st.lists[k]=folders[k].items.slice();
  const place=(f,T,first)=>{st.lists[f].forEach((id,i)=>{const[x,y]=slot(i),it=st.it[id]||(st.it[id]={fx:x,fy:y,tx:x,ty:y,t0:-9,born:first?-9:T,dead:null,edit:null,name:items[id].name,folder:f});
    if(it.tx!==x||it.ty!==y||it.folder!==f){if(it.folder!==f){it.fx=x;it.fy=y}else{it.fx=EG.spring(T,it.t0,it.fx,it.tx,12);it.fy=EG.spring(T,it.t0,it.fy,it.ty,12)}it.tx=x;it.ty=y;it.t0=T;it.folder=f}})};
  for(const k in st.lists)place(k,-9,true);
  const sidePlace=(T,first)=>{const lay=sideLay(st.sideG);st.heads=lay.heads.map(hd=>{const p=st.headY&&st.headY[hd.gi];const o2={gi:hd.gi,fy:p?EG.spring(T,p.t0,p.fy,p.ty,12):hd.y,ty:hd.y,t0:T};return o2});
   st.headY={};st.heads.forEach(x=>st.headY[x.gi]=x);
   lay.rows.forEach(r=>{const s=st.side[r.id];if(!s)st.side[r.id]={fy:r.y,ty:r.y,t0:first?-9:T,born:first?-9:T};else if(s.ty!==r.y){s.fy=EG.spring(T,s.t0,s.fy,s.ty,12);s.ty=r.y;s.t0=T}})};
  sidePlace(-9,true);
  const curAt=T=>{const c=st.cur,u=io(C((T-c.t0)/c.d));return[L(c.x0,c.x1,u),L(c.y0,c.y1,u)]};
  for(const ev of SCR){if(ev.t>t)break;const T=ev.t;
   switch(ev.do){
    case'go':st.prev=st.folder;st.folder=ev.folder;st.goT=T;st.sel=null;st.sideAuto=true;break;
    case'move':{const[x,y]=curAt(T),[tx,ty]=target(st,ev.to,T+(ev.dur??.5));st.cur={x0:x,y0:y,x1:tx,y1:ty,t0:T,d:ev.dur??.5};break}
    case'cur':st.curOn.push([T,ev.on?1:0]);break;
    case'press':st.rings.push({t0:T,t1:null});break;
    case'release':{const r=st.rings[st.rings.length-1];if(r&&r.t1==null)r.t1=T;break}
    case'sel':st.sel=ev.id;st.selT=T;break;
    case'menu':{const[x,y]=ev.at||curAt(T);st.menu={x:x+1,y:y+1,items:ev.items||MENU_BG,hover:-1,t0:T,close:null,pick:null};break}
    case'hover':if(st.menu)st.menu.hover=ev.i;break;
    case'pick':if(st.menu){st.menu.hover=ev.i;st.menu.pick=T;st.menu.close=T+.16}break;
    case'menuoff':if(st.menu)st.menu.close=T;break;
    case'mk':{const f=ev.folder||st.folder;if(!items[ev.id]){items[ev.id]={name:ev.name||'untitled folder',kind:ev.kind||'folder'}}
      const l=st.lists[f];l.splice(ev.index==null?l.length:ev.index,0,ev.id);place(f,T);const it=st.it[ev.id];it.born=T;it.name=ev.name||items[ev.id].name;
      if(ev.edit!==false){it.edit={text:it.name,all:true,t0:T};st.sel=null}break}
    case'edit':{const it=st.it[ev.id];if(it)it.edit={text:it.name,all:true,t0:T};break}
    case'type':{const it=st.it[ev.id];if(it&&it.edit){it.edit.type={t0:T,d:ev.dur||.8,text:ev.text}}break}
    case'commit':{const it=st.it[ev.id];if(it&&it.edit){it.name=it.edit.type?it.edit.type.text:it.edit.text;it.edit=null;st.sel=ev.id;st.selT=T}break}
    case'sort':{const f=ev.folder||st.folder;st.lists[f].sort((a,b)=>st.it[a].name.toLowerCase()<st.it[b].name.toLowerCase()?-1:1);place(f,T);break}
    case'add':{const f=ev.folder||st.folder,l=st.lists[f];for(const k in st.lists){const i=st.lists[k].indexOf(ev.id);if(i>=0){st.lists[k].splice(i,1);place(k,T)}}
      l.splice(ev.index==null?l.length:ev.index,0,ev.id);if(st.it[ev.id])st.it[ev.id].folder=null;place(f,T);st.it[ev.id].born=T;st.it[ev.id].dead=null;break}
    case'rm':{const it=st.it[ev.id];if(it){it.dead=T;const l=st.lists[it.folder],i=l.indexOf(ev.id);if(i>=0)l.splice(i,1);st.gone=st.gone||{};st.gone[ev.id]=it.folder;place(it.folder,T);if(st.sel===ev.id)st.sel=null}break}
    case'grab':{st.rings.push({t0:T,t1:null});const[x,y]=curAt(T),it=st.it[ev.id];st.ghost={ids:[ev.id],t0:T,t1:null,ox:it?EG.spring(T,it.t0,it.fx,it.tx,12)-x:0,oy:it?EG.spring(T,it.t0,it.fy,it.ty,12)-y:0};st.sel=ev.id;st.selT=T;break}
    case'carry':st.rings.push({t0:T,t1:null,quiet:true});st.ghost={ids:ev.ids,t0:T-9,t1:null,ox:10,oy:18};break;
    case'drop':{const r=st.rings[st.rings.length-1];if(r&&r.t1==null)r.t1=T;if(st.ghost)st.ghost.t1=T;break}
    case'sidegap':st.gap=ev.on===false?(st.gap?Object.assign(st.gap,{off:T}):null):{group:ev.group,index:ev.index,t0:T,off:null};break;
    case'sideadd':{const g=st.sideG[ev.group];g.items.splice(ev.index==null?g.items.length:ev.index,0,{id:ev.id,label:ev.label,icon:ev.icon||'folder'});if(st.gap)st.gap.off=T;sidePlace(T);st.side[ev.id].born=T;break}
    case'sidesel':st.sideSel=ev.id;st.sideAuto=false;break;
    case'view':st.view=ev.mode;if(ev.cols)st.cols=ev.cols.map(c=>Object.assign({},c));st.viewT=T;break;
    case'colsel':{if(ev.cols)st.cols=ev.cols.map(c=>Object.assign({},c));else if(st.cols[ev.col])st.cols[ev.col].sel=ev.id;st.colT=T;break}
    case'ring':{const k=JSON.stringify(ev.target);let r=st.hl.find(x=>x.k===k&&x.off==null);if(ev.on===false){if(r)r.off=T}else if(!r)st.hl.push({k,target:ev.target,t0:T,off:null,pad:ev.pad});break}
    case'title':st.title=ev.text;break;
   }}
  st.curXY=curAt(t);return st}
 // ---- draw ----
 const nameHTML=(it,d,t)=>{if(it.edit){const e=it.edit;if(e.type&&t>=e.type.t0){const n=Math.min(e.type.text.length,1+Math.floor((t-e.type.t0)/e.type.d*(e.type.text.length-1)+1e-6));return `<span class="fdr-ed">${esc(e.type.text.slice(0,n))}<i></i></span>`}
   return `<span class="fdr-ed"><b>${esc(e.text)}</b></span>`}
  return `<span>${esc(it.name)}</span>`+(d.info?`<span class="fdr-inf" style="padding:0;background:none;color:#3f85f5">${esc(d.info)}</span>`:'')};
 function rectOf(st,tg,t){if(tg.rect)return tg.rect;
  if(tg.item!=null){const it=st.it[tg.item];if(!it)return null;const x=EG.spring(t,it.t0,it.fx,it.tx,12),y=EG.spring(t,it.t0,it.fy,it.ty,12);return[x-46,y-36,92,tg.tall?106:92]}
  if(tg.side!=null){const r=st.side[tg.side];if(!r)return null;return[6+6,6+EG.spring(t,r.t0,r.fy,r.ty,12)-1,141-12,30]}
  if(tg.col){const[c,id]=tg.col,cl=st.cols[c];if(!cl)return null;const k=st.lists[cl.folder].indexOf(id);return[COLX(c)+3,46+8+k*20-2,144,24]}
  if(tg.title)return[222,9,(tg.w||110),28];return null}
 function draw(t){const st=replay(t);
  const f=folders[st.folder]||{};ttl.textContent=st.title||f.title||'';
  // sidebar
  const sideSel=st.sideAuto?(f.side||null):st.sideSel;
  st.sideG.forEach(g=>g.items.forEach(mkRow));
  for(const id in rowEl){const e=rowEl[id],r=st.side[id];if(!r){e.style.visibility='hidden';continue}
   const a=C((t-r.born)/.2),y=EG.spring(t,r.t0,r.fy,r.ty,12);e.style.visibility=a<=0?'hidden':'inherit';e.style.top=y.toFixed(2)+'px';e.style.opacity=a.toFixed(3);
   e.style.transform=r.born>-1?`scale(${(.86+.14*X(C((t-r.born)/.3))).toFixed(4)})`:'none';e.classList.toggle('sel',id===sideSel)}
  st.sideG.forEach((g,gi)=>{if(!g.title)return;if(!headEl[gi])headEl[gi]=h('div','fdr-hd',sb,esc(g.title));const p=st.headY[gi];headEl[gi].style.top=EG.spring(t,p.t0,p.fy,p.ty,12).toFixed(2)+'px'});
  if(st.gap&&(st.gap.off==null||t<st.gap.off+.1)){const g=st.sideG[st.gap.group],lay=sideLay(st.sideG),rows=lay.rows.filter(r=>r.gi===st.gap.group);
   const y=st.gap.index<rows.length?rows[st.gap.index].y-.5:(rows.length?rows[rows.length-1].y+28:60);gapEl.style.visibility='inherit';gapEl.style.top=(y-1).toFixed(2)+'px';
   gapEl.style.opacity=(C((t-st.gap.t0)/.08)*(st.gap.off==null?1:1-C((t-st.gap.off)/.1))).toFixed(3)}else gapEl.style.visibility='hidden';
  // view switcher
  vwSel.style.left=(st.view==='cols'?68:4.5)+'px';
  // content
  const icons=st.view==='icons',fade=C((t-Math.max(st.goT,st.viewT))/.12);
  for(const id in items){const e=mkEl(id),it=st.it[id];const here=icons&&it&&(it.folder===st.folder&&st.lists[st.folder].includes(id)||(it.dead!=null&&st.gone&&st.gone[id]===st.folder&&t<it.dead+.16));
   if(!here){e.style.visibility='hidden';continue}
   const x=EG.spring(t,it.t0,it.fx,it.tx,12),y=EG.spring(t,it.t0,it.fy,it.ty,12);let a=fade,sc=1;
   if(it.born>-1){const u=C((t-it.born)/.22);a*=C((t-it.born)/.1);sc=.72+.28*X(u)+.05*Math.sin(Math.PI*C((t-it.born)/.3))}
   if(it.dead!=null&&t>=it.dead){const u=C((t-it.dead)/.16);a*=1-u;sc*=1-.25*u}
   const gh=st.ghost&&st.ghost.ids.includes(id)&&st.ghost.t1==null&&st.ghost.t0>-1;
   Object.assign(e.style,{visibility:a<=.001?'hidden':'inherit',left:(x-147).toFixed(2)+'px',top:y.toFixed(2)+'px',opacity:(a*(gh?.45:1)).toFixed(3),transform:`scale(${sc.toFixed(4)})`,zIndex:it.edit?3:1});
   e.classList.toggle('sel',st.sel===id&&!it.edit);const nh=nameHTML(it,items[id],t);if(e._nm!==nh){e._nm=nh;e.lastChild.innerHTML=nh}}
  // columns
  const nc=icons?0:st.cols.length;while(colEls.length<nc)colEls.push(h('div','fdr-col',win));
  colEls.forEach((ce,c)=>{if(c>=nc){ce.style.visibility='hidden';return}ce.style.visibility='inherit';ce.style.left=COLX(c)+'px';ce.style.opacity=fade.toFixed(3);
   const cl=st.cols[c],ids=st.lists[cl.folder]||[];const key=cl.folder+'|'+ids.join(',');
   if(ce._k!==key){ce._k=key;ce.innerHTML=ids.map(id=>{const d=items[id],fo=(d.kind||'folder')==='folder';return `<div class="fdr-cr">${fo?FOLDER(null,17):DOC(d.kind==='md'?'md':'doc',13.5)}<span>${esc(st.it[id]?st.it[id].name:d.name)}</span>${fo?'<em>&#x203A;</em>':''}</div>`}).join('')}
   [...ce.children].forEach((re,k)=>{const id=ids[k],it=st.it[id];re.style.top=(8+k*20)+'px';re.className='fdr-cr'+(cl.sel===id?(c===nc-1||!st.cols[c+1]||st.cols[c+1].sel==null?' sel':' sel2'):'');
    let a=1,sc=1;if(it&&it.born>-1){a=C((t-it.born)/.12);sc=.8+.2*X(C((t-it.born)/.25))}re.style.opacity=a.toFixed(3);re.style.transform=`scale(${sc.toFixed(4)})`;re.style.transformOrigin='20px 50%'})});
  // Everygen-blue rings
  while(hlEls.length<st.hl.length)hlEls.push(h('div','fdr-hl',fx,'<i></i>'));
  hlEls.forEach((e,i)=>{const r=st.hl[i];if(!r||(r.off!=null&&t>=r.off+.2)){e.style.visibility='hidden';return}const R=rectOf(st,r.target,t);if(!R){e.style.visibility='hidden';return}
   const u=t-r.t0,p=Q(C(u/.28)),bump=1+.10*Math.sin(Math.PI*C(u/.27)),rp=X(C(u/.6)),out=r.off==null?0:C((t-r.off)/.2),pad=r.pad||0;
   Object.assign(e.style,{visibility:'inherit',left:(R[0]-pad)+'px',top:(R[1]-pad)+'px',width:(R[2]+2*pad)+'px',height:(R[3]+2*pad)+'px',opacity:(C(u/.1)*(1-out)).toFixed(3),transform:`scale(${((.92+.08*p)*bump).toFixed(4)})`});
   Object.assign(e.firstChild.style,{transform:`scale(${(1+.16*rp).toFixed(4)})`,opacity:(.55*(1-rp)).toFixed(3)})});
  // menu
  const m=st.menu;if(m&&(m.close==null||t<m.close+.14)){const key=JSON.stringify(m.items);if(menuEl._k!==key){menuEl._k=key;menuEl.innerHTML=m.items.map(x=>x==='-'?'<div class="fdr-ms"></div>':`<div class="fdr-mi">${typeof x==='object'&&x.icon?ic(x.icon):''}${esc(typeof x==='object'?x.label:x)}${typeof x==='object'&&x.sub?'<em>&#x203A;</em>':''}</div>`).join('')}
   const a=C((t-m.t0)/.07)*(m.close==null?1:1-C((t-m.close)/.14));const blink=m.pick!=null&&t>=m.pick+.05&&t<m.pick+.10;
   Object.assign(menuEl.style,{visibility:'inherit',left:m.x+'px',top:m.y+'px',opacity:a.toFixed(3),transform:`scale(${(.96+.04*X(C((t-m.t0)/.12))).toFixed(4)})`});
   [...menuEl.children].forEach((re,i)=>{const on=i===m.hover&&!blink;if(re.classList.contains('fdr-mi')){re.classList.toggle('hi',on);const s=re.querySelector('svg');if(s)s.style.stroke=on?'#fff':'#1d1d1f';
     if(s)s.querySelectorAll('[fill="#1d1d1f"]').forEach(n=>n.style.fill=on?'#fff':'#1d1d1f')}})}
  else menuEl.style.visibility='hidden';
  // pointer, rings, ghost
  let cv=0;for(const[T,on]of st.curOn){if(t<T)break;cv=on?C((t-T)/.12):1-C((t-T)/.12)}
  const[cx,cy]=st.curXY;Object.assign(curEl.style,{left:cx.toFixed(2)+'px',top:cy.toFixed(2)+'px',opacity:cv.toFixed(3),visibility:cv<=.001?'hidden':'inherit'});
  const rs=st.rings.filter(r=>!r.quiet&&(r.t1==null||t<r.t1+.24));while(rgWrap.children.length<rs.length)h('div','fdr-rg',rgWrap);
  [...rgWrap.children].forEach((e,i)=>{const r=rs[i];if(!r){e.style.visibility='hidden';return}const up=r.t1==null?0:C((t-r.t1)/.24),rad=(o.ring||20)*(.82+.18*X(C((t-r.t0)/.1)))*(1+.35*X(up));
   Object.assign(e.style,{visibility:'inherit',left:(cx-rad).toFixed(2)+'px',top:(cy-rad).toFixed(2)+'px',width:(2*rad).toFixed(2)+'px',height:(2*rad).toFixed(2)+'px',opacity:(C((t-r.t0)/.05)*(1-up)*cv).toFixed(3)})});
  const g=st.ghost;if(g&&(g.t1==null||t<g.t1+.12)){const key=g.ids.map(id=>id+':'+(st.it[id]?st.it[id].name:'')).join(',');if(ghEl._k!==key){ghEl._k=key;ghEl.innerHTML=g.ids.slice(0,4).map((id,i)=>{const d=items[id];
     return `<div class="fdr-it" style="left:${i*7}px;top:${-i*5}px;z-index:${9-i};transform:rotate(${[0,4,-5,7][i]}deg)"><div class="fdr-ic">${iconHTML(d)}</div>${i===0&&g.ids.length===1?`<div class="fdr-nm"><span>${esc(st.it[id]?st.it[id].name:d.name)}</span></div>`:''}</div>`}).join('')+(g.ids.length>1?`<div class="fdr-bd" style="left:18px;top:-40px">${g.ids.length}</div>`:'')}
   const a=(g.t1==null?1:1-C((t-g.t1)/.12))*C((t-g.t0)/.1);Object.assign(ghEl.style,{visibility:'inherit',left:(cx+g.ox).toFixed(2)+'px',top:(cy+g.oy).toFixed(2)+'px',opacity:(.82*a).toFixed(3)})}
  else ghEl.style.visibility='hidden';
  return st}
 const api={el,inn,W,H,get s(){return S},slot,items,folders,
  place(x,y,s){if(s!=null)S=s;Object.assign(el.style,{left:x.toFixed(2)+'px',top:y.toFixed(2)+'px',width:(W*S).toFixed(2)+'px',height:(H*S).toFixed(2)+'px'});inn.style.transform=`scale(${S})`;api.x=x;api.y=y;return api},
  stage(x,y){return[(api.x||0)+x*S,(api.y||0)+y*S]},
  script(evs){const out=[];evs.forEach(e=>{const d=e.do;
    if(d==='click'||d==='rclick'){out.push({t:e.t,do:'press',btn:d==='rclick'?'r':'l',note:e.note},{t:e.t+(e.hold||.10),do:'release'})}
    else if(d==='dbl'){out.push({t:e.t,do:'press',note:e.note,dbl:true},{t:e.t+.07,do:'release'},{t:e.t+.15,do:'press',quiet:true},{t:e.t+.22,do:'release'})}
    else out.push(e)});
   SCR=out.map((e,i)=>[e,i]).sort((a,b)=>a[0].t-b[0].t||a[1]-b[1]).map(x=>x[0]);return api},
  draw,state:replay,pt(to,t){return target(replay(t),to,t)},
  cues(){const out=[];SCR.forEach(e=>{if(e.quiet)return;
    if(e.do==='press')out.push({t:e.t,kind:'mouse-click',note:(e.note||(e.btn==='r'?'right-click':'click'))+(e.dbl?' (double-click)':'')});
    if(e.do==='grab')out.push({t:e.t,kind:'mouse-click',note:(e.note||'press: picks up '+e.id)});
    if(e.do==='drop'&&e.note!==false)out.push({t:e.t,kind:'mouse-click',note:(e.note||'release: drops it')});
    if(e.do==='type')out.push({t:e.t,end:e.t+(e.dur||.8),kind:'type',note:e.note||('typing '+e.text)});
    if(e.do==='commit')out.push({t:e.t,kind:'key',note:e.note||'Return: the name is set'})});return out}};
 return api.place(0,0)}
return {make,SIDEBAR,MENU_BG,HOME,FOLDER,DOC,CURSOR,ic,I};
})();
