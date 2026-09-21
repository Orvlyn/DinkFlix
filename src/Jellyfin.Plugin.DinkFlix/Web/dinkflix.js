/* DINKFLIX Web 4.2 — Jellyfin 12.1 desktop frontend. */
(() => {
  'use strict';
  if (window.__DINKFLIX_WEB_42__) return;
  window.__DINKFLIX_WEB_42__ = true;

  const VERSION = '4.2.0';
  const state = {
    user: null, userId: null, serverId: '', views: [],
    shell: null, nav: null, menuRoot: null, toastRoot: null,
    renderKey: '', custom: false, route: null,
    heroItems: [], heroIndex: 0, heroTimer: null, heroPaused: false,
    observer: null, observerTimer: null, navScrollBound: false, clickBound: false,
    config: { accentColor:'#00FFC6', heroRotationSeconds:14, showRatings:true, showMediaBadges:true, showMyList:true, showRequests:true, showBookmarks:true }
  };

  const esc = (v) => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const humanMinutes = (ticks) => { const n=Number(ticks||0); if(!n) return ''; const m=Math.round(n/600000000); if(m<60) return `${m} min`; const h=Math.floor(m/60), r=m%60; return r ? `${h}h ${r}m` : `${h}h`; };
  const fmtDate = (iso) => { try { return new Intl.DateTimeFormat(undefined,{year:'numeric'}).format(new Date(iso)); } catch { return ''; } };
  const percent = (item) => { const ticks=Number(item?.UserData?.PlaybackPositionTicks||0), total=Number(item?.RunTimeTicks||0); return total ? Math.max(0,Math.min(100,(ticks/total)*100)) : 0; };

  function credentials() {
    try {
      const raw = localStorage.getItem('jellyfin_credentials');
      if(!raw) return null;
      const p = JSON.parse(raw); const servers=Array.isArray(p?.Servers)?p.Servers:[]; const origin=location.origin;
      const match=servers.find(s=>['ManualAddress','RemoteAddress','LocalAddress'].some(k=>{try{return s?.[k]&&new URL(s[k]).origin===origin}catch{return false}}));
      return match || servers[servers.length-1] || null;
    } catch { return null; }
  }
  function token(){ return credentials()?.AccessToken || ''; }
  function userId(){ return credentials()?.UserId || window.ApiClient?.getCurrentUserId?.() || null; }
  function serverId(){ return credentials()?.Id || window.ApiClient?.serverId?.() || ''; }
  function baseUrl(){
    const p=location.pathname; const i=p.toLowerCase().indexOf('/web/');
    if(i>=0) return location.origin+p.slice(0,i);
    if(p.toLowerCase().endsWith('/web')) return location.origin+p.slice(0,-4);
    return location.origin;
  }
  function auth(){ const t=token(); return t ? {Authorization:`MediaBrowser Client="DINKFLIX Web", Device="Browser", DeviceId="dinkflix-web", Version="${VERSION}", Token="${t}"`} : {}; }
  async function api(path, options={}) {
    const r=await fetch(`${baseUrl()}${path}`, {credentials:'include', cache:options.cache||'no-store', method:options.method||'GET', headers:{Accept:'application/json',...auth(),...(options.headers||{})}, body:options.body});
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    const text=await r.text(); return text?JSON.parse(text):null;
  }
  function image(item, type='Primary', maxWidth=720) {
    if(!item?.Id) return '';
    const tag=item?.ImageTags?.[type]; const p=new URLSearchParams({maxWidth:String(maxWidth),quality:'86'}); if(tag) p.set('tag',tag); const t=token(); if(t) p.set('ApiKey',t);
    return `${baseUrl()}/Items/${encodeURIComponent(item.Id)}/Images/${encodeURIComponent(type)}?${p}`;
  }
  function backdrop(item, maxWidth=1800) {
    if(!item?.Id) return '';
    const type=['Backdrop','Primary','Thumb'].find(x=>item?.ImageTags?.[x]); if(!type) return '';
    const tag=item?.ImageTags?.[type]; const p=new URLSearchParams({maxWidth:String(maxWidth),quality:'84'}); if(tag)p.set('tag',tag); const t=token(); if(t)p.set('ApiKey',t);
    return `${baseUrl()}/Items/${encodeURIComponent(item.Id)}/Images/${encodeURIComponent(type)}/0?${p}`;
  }

  function parseHash(){
    const raw=decodeURIComponent(location.hash.replace(/^#/,'')||'/home');
    const [path,q='']=raw.split('?'); const params=new URLSearchParams(q); return {path:path||'/home',params};
  }
  function route(){
    const {path,params}=parseHash();
    const df=params.get('df');
    if(path==='/home' && df==='library') return {type:'library',viewId:params.get('viewId')};
    if(path==='/home' && df==='item') return {type:'item',id:params.get('id')};
    if(path==='/home' && df==='list') return {type:'list'};
    if(path==='/home' && df==='about') return {type:'about'};
    if(path==='/home' && df==='search') return {type:'search',q:params.get('q')||''};
    if(path==='/home' && !params.get('tab')) return {type:'home'};
    if(path==='/search') return {type:'search',q:params.get('query')||params.get('q')||''};
    if(path==='/movies' || path==='/tv' || path==='/tvshows') return {type:'library-native',viewId:params.get('topParentId'),collectionType:params.get('collectionType')};
    if(path==='/details' && params.get('id') && !params.get('dfnative')) return {type:'item',id:params.get('id')};
    if(path==='/video' || path==='/playback' || path==='/nowplaying' || path==='/fullscreen') return {type:'playback'};
    if(path==='/home' && params.get('tab')) return {type:'native', reason:'home-tab'};
    if(path==='/dashboard' || path==='/login.html' || path.includes('login')) return {type:'admin'};
    return {type:'native'};
  }

  function setHash(path, params={}) {
    const p=new URLSearchParams(); Object.entries(params).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=='')p.set(k,String(v))});
    const next=`#${path}${p.toString()?`?${p}`:''}`; if(location.hash===next){handleRoute();return;} location.hash=next;
  }
  function nativeHash(path, params={}) { setHash(path, params); }

  function isAdmin(){ return !!state.user?.Policy?.IsAdministrator; }
  function publicNative(r){ return ['native'].includes(r.type); }

  async function loadUser(){
    state.userId=userId(); state.serverId=serverId();
    if(!state.userId) return;
    try { state.user=await api(`/Users/${encodeURIComponent(state.userId)}`); } catch {}
  }
  async function loadViews(){
    if(!state.userId) return;
    try { state.views=await api(`/Users/${encodeURIComponent(state.userId)}/Views`) || []; } catch { state.views=[]; }
  }
  async function loadConfig(){
    try {
      const r=await api('/Plugins/DinkFlixWeb/Client/Configuration'); state.config={...state.config,...r};
      if(/^#[\da-f]{6}$/i.test(state.config.accentColor)) document.documentElement.style.setProperty('--df-accent',state.config.accentColor);
    } catch {}
  }

  function visibleViews(){
    const excluded=new Set(['playlists','livetv','boxsets','channels','folders']);
    return state.views.filter(v=>v?.Id && !excluded.has(String(v.CollectionType||'').toLowerCase()));
  }
  function viewLabel(v){
    const c=String(v.CollectionType||'').toLowerCase(); if(c==='movies') return 'Movies'; if(c==='tvshows') return 'TV Shows'; return v.Name || 'Library';
  }
  function viewHref(v){
    const c=String(v.CollectionType||'').toLowerCase();
    const collection=c || 'folders';
    return `#/movies?topParentId=${encodeURIComponent(v.Id)}&collectionType=${encodeURIComponent(collection)}`;
  }

  function svg(name){
    const m={
      home:'<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-5h5v5"/>',
      movie:'<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="m8 3.5 3 4h4l-3-4M8 20.5l3-4h4l-3 4M5 9h14M5 15h14"/>',
      tv:'<rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h4"/>',
      list:'<path d="M6 3.5h12v17l-6-3-6 3z"/><path d="M12 8v5M9.5 10.5h5"/>',
      search:'<circle cx="10.8" cy="10.8" r="6.2"/><path d="m16 16 5 5"/>',
      user:'<circle cx="12" cy="8" r="3.1"/><path d="M5.5 20c.5-3.4 3.1-5.4 6.5-5.4s6 2 6.5 5.4"/>',
      tools:'<path d="m14.2 6.1 3.7 3.7M5 19l5.7-5.7M15.8 3.9a4 4 0 0 0-5.1 5.1l-6.2 6.2a2.1 2.1 0 1 0 3 3l6.2-6.2a4 4 0 0 0 5.1-5.1l-2.2 2.2-2.2-2.2z"/>',
      close:'<path d="m6 6 12 12M18 6 6 18"/>',
      dots:'<circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.3" fill="currentColor" stroke="none"/>',
      play:'<path d="m8 5 11 7-11 7z" fill="currentColor" stroke="none"/>',
      plus:'<path d="M12 5v14M5 12h14"/>',
      info:'<circle cx="12" cy="12" r="8.5"/><path d="M12 10.4v5M12 7.6h.01"/>',
      download:'<path d="M12 4v10M8 11l4 4 4-4M5 20h14"/>',
      trash:'<path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13"/>',
      edit:'<path d="m5 19 3.4-.7L18.7 8a2 2 0 0 0-2.8-2.8L5.6 15.5z"/>',
      image:'<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.3"/><path d="m5 17 4.5-4 3.3 2.6 2.5-2.3 3.7 3.7"/>',
      refresh:'<path d="M19 8a7.5 7.5 0 1 0 1 6M19 4v4h-4"/>',
      copy:'<rect x="8" y="8" width="11" height="12" rx="2"/><path d="M5 16V6a2 2 0 0 1 2-2h8"/>',
      collection:'<path d="M5 7h10M5 12h10M5 17h7"/><path d="M18 6v8M14 10h8"/>',
      playlist:'<path d="M5 7h10M5 12h8M5 17h6"/><path d="M18 14v5M15.5 16.5H20"/>',
      dice:'<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="8" cy="8" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="16" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="8" r="1" fill="currentColor" stroke="none"/><circle cx="8" cy="16" r="1" fill="currentColor" stroke="none"/>',
    }; return `<svg viewBox="0 0 24 24" aria-hidden="true">${m[name]||m.info}</svg>`;
  }

  function makeNav(){
    let nav=document.getElementById('dinkflix-nav'); if(nav) return nav;
    nav=document.createElement('nav'); nav.id='dinkflix-nav'; nav.setAttribute('aria-label','DINKFLIX navigation');
    nav.innerHTML=`<div class="df-nav-inner"><a href="#/home" class="df-brand" data-df-action="home" aria-label="DINKFLIX home"><span>DINK</span><span>FLIX</span></a><div class="df-nav-links" id="df-nav-links"></div><div class="df-nav-spacer"></div><div class="df-nav-tools"><button class="df-icon-btn" id="df-random-btn" aria-label="Surprise me" title="Surprise me">${svg('dice')}</button><button class="df-icon-btn" id="df-search-btn" aria-label="Search" title="Search">${svg('search')}</button><button class="df-icon-btn" id="df-tools-btn" aria-label="Playback & tools" title="Playback & tools">${svg('tools')}</button><button class="df-icon-btn" id="df-user-btn" aria-label="User menu" title="User menu"><span class="df-avatar" id="df-avatar">?</span></button></div></div>`;
    document.body.appendChild(nav); state.nav=nav;
    nav.querySelector('#df-random-btn').addEventListener('click',randomTitle);
    nav.querySelector('#df-search-btn').addEventListener('click',()=>setHash('/search'));
    nav.querySelector('#df-tools-btn').addEventListener('click',(e)=>openToolsMenu(e.currentTarget));
    nav.querySelector('#df-user-btn').addEventListener('click',(e)=>openUserMenu(e.currentTarget));
    return nav;
  }
  function updateNav(){
    const holder=state.nav?.querySelector('#df-nav-links'); if(!holder) return;
    const r=route();
    const views=visibleViews();
    const sorted=[...views].sort((a,b)=>{
      const ac=String(a.CollectionType||'').toLowerCase(), bc=String(b.CollectionType||'').toLowerCase();
      const wa=ac==='movies'?0:ac==='tvshows'?1:2, wb=bc==='movies'?0:bc==='tvshows'?1:2;
      return wa-wb || String(a.Name).localeCompare(String(b.Name));
    });
    const primary=sorted.slice(0,5); const extra=sorted.slice(5);
    let html=`<a class="df-nav-link ${r.type==='home'?'df-active':''}" data-nav="home" href="#/home">Home</a>`;
    primary.forEach(v=>{
      const active=(r.type==='library-native'&&r.viewId===v.Id)||(r.type==='library'&&r.viewId===v.Id);
      html+=`<a class="df-nav-link ${active?'df-active':''}" data-nav-view="${esc(v.Id)}" href="${viewHref(v)}">${esc(viewLabel(v))}</a>`;
    });
    html+=state.config.showMyList?`<a class="df-nav-link ${r.type==='list'?'df-active':''}" data-nav="list" href="#/home?df=list">My List</a>`:'';
    if(extra.length) html+=`<button class="df-nav-link" id="df-more-libraries" type="button">More</button>`;
    if(state.config.showRequests !== false) html+=`<a class="df-nav-link df-native-nav ${r.type==='native' && r.reason==='home-tab' && parseHash().params.get('tab')==='2'?'df-active':''}" href="#/home?tab=2">Requests</a>`;
    if(state.config.showBookmarks !== false) html+=`<a class="df-nav-link df-native-nav ${r.type==='native' && r.reason==='home-tab' && parseHash().params.get('tab')==='3'?'df-active':''}" href="#/home?tab=3">Bookmarks</a>`;
    holder.innerHTML=html;
    holder.querySelector('[data-nav="home"]')?.addEventListener('click',(e)=>{e.preventDefault(); setHash('/home');});
    holder.querySelector('[data-nav="list"]')?.addEventListener('click',(e)=>{e.preventDefault(); setHash('/home',{df:'list'});});
    holder.querySelector('#df-more-libraries')?.addEventListener('click',(e)=>openLibrariesMenu(e.currentTarget,extra));
  }
  function navigateToView(v){
    const href=viewHref(v);
    if(href.startsWith('#')){ location.hash=href.slice(1); }
  }
  function discoverNativeLinks(){
    const anchors=[...document.querySelectorAll('a[href]')]; let requests=false,bookmarks=false;
    anchors.forEach(a=>{const h=a.getAttribute('href')||''; if(/tab=2/.test(h)||/request/i.test(a.textContent||'')) requests=true; if(/tab=3/.test(h)||/bookmark/i.test(a.textContent||'')) bookmarks=true;});
    return {requests,bookmarks};
  }
  function avatar(){
    const el=document.getElementById('df-avatar'); if(!el) return;
    const tag=state.user?.PrimaryImageTag;
    if(tag){ const p=new URLSearchParams({tag,maxWidth:'72'}); const t=token(); if(t)p.set('ApiKey',t); el.innerHTML=`<img alt="" src="${esc(`${baseUrl()}/Users/${encodeURIComponent(state.userId)}/Images/Primary?${p}`)}">`; }
    else el.textContent=(String(state.user?.Name||'?').trim()[0]||'?').toUpperCase();
  }
  function scrollNav(){ const n=state.nav; if(!n)return; n.classList.toggle('df-scrolled',window.scrollY>18); }

  function ensureShell(){ if(state.shell)return state.shell; const s=document.createElement('main'); s.id='dinkflix-app-shell'; document.body.appendChild(s); state.shell=s; return s; }
  function ensureMenuRoot(){ if(state.menuRoot)return state.menuRoot; const d=document.createElement('div'); d.id='dinkflix-menu-root'; document.body.appendChild(d); state.menuRoot=d; return d; }
  function ensureToastRoot(){ if(state.toastRoot)return state.toastRoot; const d=document.createElement('div'); d.id='dinkflix-toasts'; document.body.appendChild(d); state.toastRoot=d; return d; }
  function toast(msg){ const r=ensureToastRoot(), d=document.createElement('div'); d.className='df-toast'; d.textContent=msg; r.appendChild(d); setTimeout(()=>d.remove(),2600); }

  function closeMenus(){ ensureMenuRoot().replaceChildren(); }
  function positionMenu(menu, anchor, align='right'){
    document.body.appendChild(menu); const rect=anchor.getBoundingClientRect(); const mw=menu.offsetWidth||250; const mh=menu.offsetHeight||300;
    let left=align==='right'?rect.right-mw:rect.left; let top=rect.bottom+7;
    left=Math.max(10,Math.min(left,innerWidth-mw-10)); if(top+mh>innerHeight-10) top=Math.max(10,rect.top-mh-7); menu.style.left=`${left}px`; menu.style.top=`${top}px`;
  }
  function menuButton(label, icon, fn, cls=''){ const b=document.createElement('button'); b.className=`df-menu-item ${cls}`; b.innerHTML=`${svg(icon)}<span>${esc(label)}</span>`; b.addEventListener('click',()=>{closeMenus(); fn();}); return b; }
  function menuSep(){ const d=document.createElement('div'); d.className='df-menu-sep'; return d; }

  function openLibrariesMenu(anchor, views){
    closeMenus(); const m=document.createElement('div'); m.className='df-more-menu'; views.forEach(v=>m.append(menuButton(viewLabel(v),'movie',()=>navigateToView(v)))); positionMenu(m,anchor); ensureMenuRoot().appendChild(m);
  }
  function openToolsMenu(anchor){
    closeMenus(); const m=document.createElement('div'); m.className='df-user-menu';
    m.append(menuButton('Surprise me','dice',randomTitle));
    m.append(menuButton('Sync Play','plus',()=>nativeAction(/sync play/i)));
    m.append(menuButton('Cast to device','tv',()=>nativeAction(/cast|play to/i)));
    ensureMenuRoot().appendChild(m); positionMenu(m,anchor);
  }
  function openUserMenu(anchor){
    closeMenus(); const m=document.createElement('div'); m.className='df-user-menu';
    m.append(menuButton('Profile','user',()=>nativeHash('/userprofile',{userId:state.userId})));
    m.append(menuButton('Preferences','tools',()=>nativeHash('/mypreferencesmenu')));
    m.append(menuSep());
    m.append(menuButton('Requests','plus',()=>nativeHash('/home',{tab:2})));
    m.append(menuButton('Bookmarks','list',()=>nativeHash('/home',{tab:3})));
    m.append(menuButton('Calendar','list',()=>nativeHash('/userpluginsettings.html',{pageUrl:'/JellyfinEnhanced/calendarPage'})));
    if(isAdmin()) m.append(menuButton('Dashboard','tools',()=>nativeHash('/dashboard')));
    m.append(menuButton('About DINKFLIX','info',()=>setHash('/home',{df:'about'})));
    m.append(menuSep());
    m.append(menuButton('Quick Connect','plus',()=>nativeAction(/quick connect/i)));
    m.append(menuButton('Sign out','close',()=>nativeAction(/sign out|logout/i),'danger'));
    ensureMenuRoot().appendChild(m); positionMenu(m,anchor);
  }
  function nativeAction(regex){
    const find=()=>[...document.querySelectorAll('button,a,[role="button"]')].filter(e=>!e.closest('#dinkflix-nav,#dinkflix-menu-root')).find(e=>regex.test(`${e.textContent||''} ${e.getAttribute('aria-label')||''} ${e.getAttribute('title')||''}`));
    let found=find();
    if(found){found.click();return true;}
    if(/quick connect|sign out|logout/i.test(String(regex))){
      const userToggle=[...document.querySelectorAll('button,a,[role="button"]')].find(e=>/user|profile|account/i.test(`${e.getAttribute('aria-label')||''} ${e.getAttribute('title')||''}`)&&!e.closest('#dinkflix-nav,#dinkflix-menu-root'));
      if(userToggle){userToggle.click(); setTimeout(()=>find()?.click(),60); return true;}
    }
    toast('That Jellyfin action is not available here.'); return false;
  }
  async function randomTitle(){
    try{const items=await getItems({IncludeItemTypes:'Movie,Series',Limit:100,SortBy:'Random'}); if(items.length)setHash('/home',{df:'item',id:items[Math.floor(Math.random()*items.length)].Id});}
    catch{toast('Could not choose a random title.');}
  }

  function badgeHtml(item){
    const b=[];
    const rating=Number(item?.CommunityRating||0); if(state.config.showRatings&&rating) b.push(`<span class="df-badge rating">★ ${rating.toFixed(1)}</span>`);
    const w=Number(item?.Width||0), h=Number(item?.Height||0); if(state.config.showMediaBadges && (h>=2000||w>=3500)) b.push('<span class="df-badge quality">4K</span>'); else if(state.config.showMediaBadges && (h>=1080||w>=1900)) b.push('<span class="df-badge quality">1080p</span>');
    if(state.config.showMediaBadges && (item?.VideoRange || /hdr/i.test(item?.VideoRangeType||''))) b.push('<span class="df-badge hdr">HDR</span>');
    if(item?.OfficialRating) b.push(`<span class="df-badge age">${esc(item.OfficialRating)}</span>`);
    return b.join('');
  }
  function tagHtml(item){ return (item?.Tags||[]).slice(0,2).map(t=>`<span class="df-badge tag">${esc(t)}</span>`).join(''); }
  function card(item){
    const id=item.Id, title=esc(item.Name), src=image(item,'Primary',840), p=percent(item);
    const playable=item.Type==='Movie'||item.Type==='Episode'||item.Type==='Video';
    const meta=[fmtDate(item.ProductionYear||item.DateCreated||item.PremiereDate), humanMinutes(item.RunTimeTicks)].filter(Boolean);
    return `<article class="df-card" data-id="${esc(id)}" data-kind="${esc(item.Type||'')}" tabindex="-1"><div class="df-card-media"><a class="df-card-link" href="#/home?df=item&id=${encodeURIComponent(id)}" data-df-item="${esc(id)}" aria-label="Open ${title}"></a><img loading="lazy" src="${esc(src)}" alt="${title}" onerror="this.style.display='none'"><div class="df-card-shade"></div>${playable?`<button class="df-card-play-btn" data-df-play="${esc(id)}" aria-label="Play ${title}" title="Play">${svg('play')}</button>`:''}<button class="df-card-menu-btn" data-df-menu="${esc(id)}" aria-label="More actions for ${title}" title="More actions">${svg('dots')}</button>${p>0?`<div class="df-progress"><span style="width:${p}%"></span></div>`:''}</div><div class="df-card-content"><div class="df-card-title">${title}</div><div class="df-card-meta">${meta.map((x,i)=>`${i?'<span class=\"df-meta-dot\">•</span>':''}<span>${esc(x)}</span>`).join('')}</div><div class="df-card-badges">${badgeHtml(item)}${tagHtml(item)}</div></div></article>`;
  }
  async function getItems(options={}){
    const defaults={UserId:state.userId,Recursive:true,EnableUserData:true,IncludeItemTypes:'Movie,Series',Fields:'PrimaryImageAspectRatio,Overview,Genres,Tags,People,MediaSources,ProviderIds,UserData,OfficialRating,CommunityRating,ProductionYear,RunTimeTicks,Width,Height,VideoRange,VideoRangeType,DateCreated,DatePlayed,ChildCount',Limit:24,StartIndex:0,SortBy:'SortName',SortOrder:'Ascending'};
    const p=new URLSearchParams(); Object.entries({...defaults,...options}).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=='')p.set(k,String(v))});
    const r=await api(`/Users/${encodeURIComponent(state.userId)}/Items?${p}`); return Array.isArray(r?.Items)?r.Items:[];
  }
  async function getItem(id){ return api(`/Users/${encodeURIComponent(state.userId)}/Items/${encodeURIComponent(id)}?Fields=PrimaryImageAspectRatio,Overview,Genres,Tags,People,MediaSources,ProviderIds,UserData,OfficialRating,CommunityRating,ProductionYear,RunTimeTicks,Width,Height,VideoRange,VideoRangeType,DateCreated,DatePlayed,ChildCount,SortName`); }

  function section(title,items,viewHref=''){
    if(!items?.length) return '';
    return `<section class="df-section"><div class="df-section-head"><h2 class="df-section-title">${esc(title)}</h2>${viewHref?`<a class="df-section-link" href="${viewHref}">View all →</a>`:''}</div><div class="df-row">${items.map(card).join('')}</div></section>`;
  }
  function bindCardActions(root){
    root.querySelectorAll('[data-df-item]').forEach(a=>{
      if(a.dataset.dfBound)return; a.dataset.dfBound='1';
      a.addEventListener('click',e=>{e.preventDefault();e.stopPropagation(); setHash('/home',{df:'item',id:a.dataset.dfItem});});
    });
    root.querySelectorAll('[data-df-menu]').forEach(b=>{
      if(b.dataset.dfBound)return; b.dataset.dfBound='1';
      b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation(); openCardMenu(b,b.dataset.dfMenu);});
    });
    root.querySelectorAll('[data-df-play]').forEach(b=>{
      if(b.dataset.dfBound)return; b.dataset.dfBound='1';
      b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation(); const item=cardData.get(b.dataset.dfPlay); if(item) playItem(item);});
    });
  }
  const cardData=new Map();
  function setCardData(items){ (items||[]).forEach(i=>cardData.set(i.Id,i)); }
  async function openPicker(title, items, onChoose){
    closeMenus();
    const root=ensureMenuRoot();
    const m=document.createElement('div'); m.className='df-modal-backdrop';
    m.innerHTML=`<section class="df-modal df-picker-modal" role="dialog" aria-modal="true"><header class="df-modal-head"><div><h2 class="df-modal-title">${esc(title)}</h2><div class="df-picker-subtitle">Choose where to put this title.</div></div><button class="df-icon-btn" data-close aria-label="Close">${svg('close')}</button></header><div class="df-modal-body"><div class="df-picker-list" data-picker-list><div class="df-empty">Loading…</div></div></div></section>`;
    const list=m.querySelector('[data-picker-list]');
    m.querySelector('[data-close]').onclick=()=>m.remove();
    m.addEventListener('click',e=>{if(e.target===m)m.remove();});
    root.appendChild(m);
    const choices=items||[];
    list.innerHTML=choices.length?choices.map(x=>`<button class="df-picker-option" data-picker-id="${esc(x.Id)}"><span>${esc(x.Name)}</span><span class="df-picker-arrow">›</span></button>`).join(''):'<div class="df-empty">Nothing available yet.</div>';
    list.querySelectorAll('[data-picker-id]').forEach(b=>b.onclick=async()=>{try{await onChoose(b.dataset.pickerId);m.remove();}catch{toast('That action could not be completed.');}});
  }
  async function chooseCollection(item){
    const collections=await getItems({IncludeItemTypes:'BoxSet',Limit:120,SortBy:'SortName',SortOrder:'Ascending'}).catch(()=>[]);
    await openPicker('Add to collection',collections,async collectionId=>{await api(`/Collections/${encodeURIComponent(collectionId)}/Items?Ids=${encodeURIComponent(item.Id)}`,{method:'POST'});toast(`Added to collection.`);});
  }
  async function choosePlaylist(item){
    const playlists=await getItems({IncludeItemTypes:'Playlist',Limit:120,SortBy:'SortName',SortOrder:'Ascending'}).catch(()=>[]);
    await openPicker('Add to playlist',playlists,async playlistId=>{await api(`/Playlists/${encodeURIComponent(playlistId)}/Items?Ids=${encodeURIComponent(item.Id)}&UserId=${encodeURIComponent(state.userId)}`,{method:'POST'});toast(`Added to playlist.`);});
  }

  async function openCardMenu(anchor,id){
    closeMenus(); const item=cardData.get(id)||await getItem(id).catch(()=>null); if(!item){toast('Unable to load this title.');return;}
    const m=document.createElement('div'); m.className='df-context-menu';
    m.append(menuButton('Play','play',()=>playItem(item)));
    m.append(menuButton('Play all from here','play',()=>playFromHere(item)));
    m.append(menuSep());
    m.append(menuButton('Select','list',()=>nativeAction(/select/i)));
    m.append(menuButton(item.UserData?.IsFavorite?'Remove from My List':'Add to My List','plus',()=>toggleFavorite(item)));
    m.append(menuButton('Add to collection','collection',()=>chooseCollection(item)));
    m.append(menuButton('Add to playlist','playlist',()=>choosePlaylist(item)));
    if(item.Type==='Movie'||item.Type==='Video'||item.Type==='Episode') {
      m.append(menuButton('Download','download',()=>downloadItem(item)));
      m.append(menuButton('Copy Stream URL','copy',()=>copyStreamUrl(item)));
    }
    if(isAdmin()) {
      m.append(menuButton('Delete media','trash',()=>deleteMedia(item),'danger'));
      m.append(menuSep());
      m.append(menuButton('Edit metadata','edit',()=>openNativeFallback(item,'metadata')));
      m.append(menuButton('Edit images','image',()=>openNativeFallback(item,'images')));
      m.append(menuButton('Edit subtitles','edit',()=>openNativeFallback(item,'subtitles')));
      m.append(menuButton('Identify','edit',()=>openNativeFallback(item,'identify')));
      m.append(menuButton('Media Info','info',()=>showMediaInfo(item)));
      m.append(menuButton('Refresh metadata','refresh',()=>refreshMetadata(item)));
    } else {
      m.append(menuSep()); m.append(menuButton('Media Info','info',()=>showMediaInfo(item)));
    }
    ensureMenuRoot().appendChild(m); positionMenu(m,anchor);
  }
  function openNativeFallback(item){ nativeHash('/details',{id:item.Id,serverId:state.serverId,dfnative:1}); }
  async function toggleFavorite(item){
    const fav=!!item.UserData?.IsFavorite; await api(`/Users/${encodeURIComponent(state.userId)}/FavoriteItems/${encodeURIComponent(item.Id)}`,{method:fav?'DELETE':'POST'});
    item.UserData=item.UserData||{}; item.UserData.IsFavorite=!fav; cardData.set(item.Id,item);
    toast(fav?'Removed from My List':'Added to My List');
    return !fav;
  }
  function downloadItem(item){ const p=new URLSearchParams(); const t=token();if(t)p.set('ApiKey',t); window.open(`${baseUrl()}/Items/${encodeURIComponent(item.Id)}/Download${p.toString()?`?${p}`:''}`,'_blank','noopener'); }
  async function copyStreamUrl(item){
    const p=new URLSearchParams({Static:'true'}); const t=token(); if(t)p.set('ApiKey',t); const url=`${baseUrl()}/Videos/${encodeURIComponent(item.Id)}/stream?${p}`;
    try{await navigator.clipboard.writeText(url);toast('Stream URL copied.');}catch{toast('Could not copy the stream URL.');}
  }
  async function deleteMedia(item){
    if(!confirm(`Delete “${item.Name}” from Jellyfin?\n\nThis removes the media from the server library.`)) return;
    try{await api(`/Items/${encodeURIComponent(item.Id)}`,{method:'DELETE'});toast('Media deleted.');setTimeout(handleRoute,200);}catch{toast('Delete failed.');}
  }
  async function refreshMetadata(item){ try{await api(`/Items/${encodeURIComponent(item.Id)}/Refresh`,{method:'POST'});toast('Metadata refresh started.');}catch{toast('Could not refresh metadata.');} }
  function showMediaInfo(item){
    closeMenus(); const m=document.createElement('div');m.className='df-modal-backdrop';m.innerHTML=`<section class="df-modal" role="dialog" aria-modal="true"><header class="df-modal-head"><h2 class="df-modal-title">Media Info · ${esc(item.Name)}</h2><button class="df-icon-btn" data-close>${svg('close')}</button></header><div class="df-modal-body"><table class="df-info-table"><tbody><tr><td>Type</td><td>${esc(item.Type||'')}</td></tr><tr><td>Resolution</td><td>${item.Width&&item.Height?`${item.Width} × ${item.Height}`:'—'}</td></tr><tr><td>Video range</td><td>${esc(item.VideoRange||item.VideoRangeType||'—')}</td></tr><tr><td>Official rating</td><td>${esc(item.OfficialRating||'—')}</td></tr><tr><td>Community rating</td><td>${item.CommunityRating?Number(item.CommunityRating).toFixed(1):'—'}</td></tr><tr><td>Genres</td><td>${esc((item.Genres||[]).join(', ')||'—')}</td></tr><tr><td>Tags</td><td>${esc((item.Tags||[]).join(', ')||'—')}</td></tr></tbody></table></div></section>`;m.querySelector('[data-close]').onclick=()=>m.remove();m.addEventListener('click',e=>{if(e.target===m)m.remove();});ensureMenuRoot().appendChild(m);
  }

  async function playFromHere(item){
    if(item.Type==='Series'){
      try{const eps=await getItems({ParentId:item.Id,IncludeItemTypes:'Episode',Limit:100,SortBy:'ParentIndexNumber,IndexNumber',SortOrder:'Ascending',Fields:'UserData,RunTimeTicks,MediaSources'}); const next=eps.find(e=>!e.UserData?.Played)||eps[0]; if(next)return playItem(next);}catch{}
    }
    playItem(item);
  }
  async function getPlaybackManager(){
    if(window.playbackManager) return window.playbackManager;
    if(typeof window.require==='function') return new Promise(resolve=>{try{window.require(['playbackManager'],m=>resolve(m),()=>resolve(null));}catch{resolve(null)}});
    return null;
  }
  async function playItem(item){
    const pm=await getPlaybackManager();
    if(pm?.play){
      try{await pm.play({items:[item],fullscreen:true,enableRemotePlayers:true}); return;}catch{}
    }
    sessionStorage.setItem('dinkflix-autoplay',item.Id); nativeHash('/details',{id:item.Id,serverId:state.serverId,dfnative:1});
  }
  function autoPlayFallback(){
    const id=sessionStorage.getItem('dinkflix-autoplay'); if(!id)return;
    let n=0; const timer=setInterval(()=>{n++; const els=[...document.querySelectorAll('button,a')].filter(e=>!e.closest('#dinkflix-nav')); const b=els.find(e=>/^(resume|play)$/i.test((e.textContent||'').trim())); if(b){sessionStorage.removeItem('dinkflix-autoplay');clearInterval(timer);b.click();} if(n>20)clearInterval(timer);},500);
  }

  function ensurePlaybackOverlay(){
    let el=document.getElementById('dinkflix-playback-overlay');
    if(el)return el;
    el=document.createElement('div'); el.id='dinkflix-playback-overlay';
    el.innerHTML=`<div class="df-playback-brand"><span>DINK</span><span>FLIX</span></div><button class="df-playback-back" type="button" aria-label="Back to DINKFLIX">${svg('close')}<span>Back</span></button>`;
    el.querySelector('.df-playback-back').onclick=()=>history.length>1?history.back():setHash('/home');
    document.body.appendChild(el); return el;
  }

  function setBody(route){
    const custom=['home','library','library-native','item','search','list','about'].includes(route.type);
    const playback=route.type==='playback'; const admin=route.type==='admin';
    state.custom=custom;
    document.body.classList.toggle('df-df-active',custom);
    document.body.classList.toggle('df-df-native-public',!custom&&!admin);
    document.body.classList.toggle('df-df-native-playback',playback);
    document.body.classList.toggle('df-df-admin',admin);
    if(!custom){ state.shell?.replaceChildren(); }
    if(playback) ensurePlaybackOverlay(); else document.getElementById('dinkflix-playback-overlay')?.remove();
  }

  async function renderHome(){
    const s=ensureShell(); s.innerHTML='<div class="df-home-loading"></div>';
    try{
      const [recent,resume,played,favs,recentMovies,recentShows]=await Promise.all([
        getItems({IncludeItemTypes:'Movie,Series',SortBy:'DateCreated',SortOrder:'Descending',Limit:24}),
        getItems({IncludeItemTypes:'Movie,Episode',IsResumable:true,SortBy:'DatePlayed',SortOrder:'Descending',Limit:16}),
        getItems({IncludeItemTypes:'Movie,Series',IsPlayed:true,SortBy:'DatePlayed',SortOrder:'Descending',Limit:16}),
        state.config.showMyList?getItems({IncludeItemTypes:'Movie,Series',IsFavorite:true,SortBy:'DatePlayed,SortName',SortOrder:'Descending',Limit:16}):[],
        getItems({IncludeItemTypes:'Movie',SortBy:'DateCreated',SortOrder:'Descending',Limit:16}),
        getItems({IncludeItemTypes:'Series',SortBy:'DateCreated',SortOrder:'Descending',Limit:16})
      ]);
      setCardData([...recent,...resume,...played,...favs,...recentMovies,...recentShows]); const hero=recent.filter(x=>x.ImageTags?.Backdrop||x.ImageTags?.Primary).slice(0,8); state.heroItems=hero;
      const movieView=visibleViews().find(v=>String(v.CollectionType||'').toLowerCase()==='movies');
      const tvView=visibleViews().find(v=>String(v.CollectionType||'').toLowerCase()==='tvshows');
      const movieHref=movieView?viewHref(movieView):''; const tvHref=tvView?viewHref(tvView):'';
      s.innerHTML=`<div class="df-hero" id="df-hero"><div class="df-hero-media" id="df-hero-media"></div><div class="df-hero-overlay"></div><div class="df-hero-content" id="df-hero-content"></div><div class="df-hero-dots" id="df-hero-dots"></div></div><div class="df-page">${section('Continue Watching',resume)} ${section('Recently Played',played)} ${section('Recently Added',recent)} ${section('Movies',recentMovies,movieHref)} ${section('TV Shows',recentShows,tvHref)}${state.config.showMyList?section('My List',favs,'#/home?df=list'):''}</div>`;
      bindCardActions(s); if(hero.length)showHero(0); else s.querySelector('#df-hero').remove();
    }catch(err){s.innerHTML=`<div class="df-page"><div class="df-empty">DINKFLIX couldn't load your library. Check the browser console for the server response.</div></div>`; console.error('[DINKFLIX]',err);}
  }
  function showHero(idx){
    const item=state.heroItems[idx]; if(!item)return; state.heroIndex=idx; const hero=document.getElementById('df-hero'); const media=document.getElementById('df-hero-media'); const c=document.getElementById('df-hero-content'); const dots=document.getElementById('df-hero-dots'); if(!hero||!media||!c)return;
    media.style.backgroundImage=`url("${backdrop(item,2000)}")`; hero.classList.add('df-ready'); c.innerHTML=`<div class="df-hero-eyebrow">Recently added</div><h1 class="df-hero-title">${esc(item.Name)}</h1><div class="df-hero-meta"><span>${esc(fmtDate(item.PremiereDate||item.DateCreated))}</span>${humanMinutes(item.RunTimeTicks)?`<span>•</span><span>${humanMinutes(item.RunTimeTicks)}</span>`:''}<span>•</span><span>${esc(item.Type==='Series'?'TV Series':'Movie')}</span>${badgeHtml(item)}</div><p class="df-hero-overview">${esc(item.Overview||'')}</p><div class="df-actions"><button class="df-button df-button-primary" id="df-hero-play">${svg('play')} Play</button><button class="df-button df-button-secondary" id="df-hero-info">More info</button><button class="df-button df-button-secondary" id="df-hero-list">${item.UserData?.IsFavorite?'✓ In My List':'＋ My List'}</button></div>`;
    dots.innerHTML=state.heroItems.map((_,i)=>`<button class="df-hero-dot ${i===idx?'df-current':''}" data-i="${i}" aria-label="Hero ${i+1}"></button>`).join(''); dots.querySelectorAll('button').forEach(b=>b.onclick=()=>{stopHero();showHero(Number(b.dataset.i));startHero();});
    c.querySelector('#df-hero-play').onclick=()=>playItem(item); c.querySelector('#df-hero-info').onclick=()=>setHash('/home',{df:'item',id:item.Id}); c.querySelector('#df-hero-list').onclick=async()=>{await toggleFavorite(item);showHero(idx);};
    const root=hero; root.onmouseenter=()=>state.heroPaused=true; root.onmouseleave=()=>state.heroPaused=false; root.onfocusin=()=>state.heroPaused=true; root.onfocusout=()=>state.heroPaused=false;
  }
  function startHero(){stopHero(); const sec=Math.max(8,Number(state.config.heroRotationSeconds)||14); if(state.heroItems.length>1)state.heroTimer=setInterval(()=>{if(!state.heroPaused&&!document.hidden)showHero((state.heroIndex+1)%state.heroItems.length)},sec*1000);}
  function stopHero(){if(state.heroTimer){clearInterval(state.heroTimer);state.heroTimer=null;}}

  async function renderLibrary(kind){
    const s=ensureShell(); let view=state.views.find(v=>v.Id===kind?.viewId); if(!view && kind?.type==='library-native'&&kind.viewId)view=state.views.find(v=>v.Id===kind.viewId);
    const viewId=view?.Id || kind?.viewId; const title=view?viewLabel(view):(kind?.collectionType==='tvshows'?'TV Shows':'Movies');
    s.innerHTML=`<div class="df-page"><header class="df-page-header"><div><div class="df-kicker">Library</div><h1 class="df-title">${esc(title)}</h1></div></header><div class="df-library-toolbar"><input class="df-input df-grow" id="df-lib-search" type="search" placeholder="Search this library…"><select class="df-select" id="df-lib-sort"><option value="SortName">A–Z</option><option value="DateCreated">Recently added</option><option value="CommunityRating">Rating</option><option value="ProductionYear">Year</option></select><button class="df-chip df-selected" data-filter="all">All</button><button class="df-chip" data-filter="quality">4K</button><button class="df-chip" data-filter="hdr">HDR</button></div><div class="df-grid" id="df-lib-grid"><div class="df-empty" style="grid-column:1/-1">Loading…</div></div></div>`;
    let items=[]; try{ const type=String(view?.CollectionType||kind?.collectionType||'').toLowerCase(); const include=({movies:'Movie',tvshows:'Series',music:'MusicAlbum',books:'Book',photos:'Photo',homevideos:'Video'}[type])||'Movie,Series,Video,Audio,Book,Photo,MusicAlbum'; items=await getItems({ParentId:viewId,IncludeItemTypes:include,Limit:180,SortBy:'SortName',SortOrder:'Ascending'});}catch{}
    setCardData(items); renderLibraryGrid(items,s); s.querySelector('#df-lib-search').oninput=()=>renderLibraryGrid(items,s); s.querySelector('#df-lib-sort').onchange=()=>renderLibraryGrid(items,s); s.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{s.querySelectorAll('[data-filter]').forEach(x=>x.classList.remove('df-selected'));b.classList.add('df-selected');b.dataset.active='1';renderLibraryGrid(items,s,b.dataset.filter)});
    bindCardActions(s);
  }
  function renderLibraryGrid(all,s,filter='all'){
    const q=(s.querySelector('#df-lib-search')?.value||'').trim().toLowerCase(); const sort=s.querySelector('#df-lib-sort')?.value||'SortName'; let a=all.filter(i=>!q||[i.Name,...(i.Genres||[]),...(i.Tags||[])].some(x=>String(x).toLowerCase().includes(q)));
    if(filter==='quality') a=a.filter(i=>Number(i.Height)>=2000||Number(i.Width)>=3500); if(filter==='hdr') a=a.filter(i=>i.VideoRange||/hdr/i.test(i.VideoRangeType||''));
    a.sort((x,y)=>{if(sort==='CommunityRating')return Number(y.CommunityRating||0)-Number(x.CommunityRating||0); if(sort==='ProductionYear')return Number(y.ProductionYear||0)-Number(x.ProductionYear||0); if(sort==='DateCreated')return String(y.DateCreated||'').localeCompare(String(x.DateCreated||'')); return String(x.SortName||x.Name).localeCompare(String(y.SortName||y.Name));});
    const grid=s.querySelector('#df-lib-grid'); if(grid)grid.innerHTML=a.length?a.map(card).join(''):'<div class="df-empty" style="grid-column:1/-1">Nothing matched that filter.</div>'; if(grid)bindCardActions(grid);
  }

  async function renderItem(id){
    const s=ensureShell(); s.innerHTML='<div class="df-page"><div class="df-empty">Loading title…</div></div>';
    let item; try{item=await getItem(id);}catch{}
    if(!item){s.innerHTML='<div class="df-page"><div class="df-empty">This title could not be loaded.</div></div>';return;}
    setCardData([item]);
    const bg=backdrop(item,2400), poster=image(item,'Primary',840), cast=(item.People||[]).filter(p=>p?.PersonId).slice(0,12);
    let childItems=[];
    if(item.Type==='Series') childItems=await getItems({ParentId:item.Id,IncludeItemTypes:'Season',Limit:50,SortBy:'IndexNumber',SortOrder:'Ascending',Fields:'PrimaryImageAspectRatio,Overview,UserData,ProductionYear,PremiereDate,IndexNumber,ChildCount,ImageTags'}).catch(()=>[]);
    if(item.Type==='Season') childItems=await getItems({ParentId:item.Id,IncludeItemTypes:'Episode',Limit:100,SortBy:'IndexNumber',SortOrder:'Ascending',Fields:'PrimaryImageAspectRatio,Overview,UserData,ProductionYear,PremiereDate,IndexNumber,ParentIndexNumber,RunTimeTicks,ImageTags,Width,Height,VideoRange,VideoRangeType,CommunityRating,OfficialRating,Tags,Genres'}).catch(()=>[]);
    setCardData(childItems);
    const kind=item.Type==='Series'?'TV Series':item.Type==='Season'?'Season':item.Type==='Episode'?'Episode':'Movie';
    const childSection=item.Type==='Series' ? `<section class="df-detail-section"><div class="df-section-head"><h2 class="df-section-title">Seasons</h2></div><div class="df-row">${childItems.map(card).join('')}</div></section>` : item.Type==='Season' ? `<section class="df-detail-section"><div class="df-section-head"><h2 class="df-section-title">Episodes</h2></div><div class="df-detail-episodes">${childItems.map(e=>`<button class="df-episode-row" data-df-play="${esc(e.Id)}"><span class="df-episode-number">${esc(String(e.IndexNumber??'' ).padStart(2,'0'))}</span><span class="df-episode-copy"><strong>${esc(e.Name||'Episode')}</strong><small>${esc(e.Overview||'')}</small></span><span class="df-episode-time">${esc(humanMinutes(e.RunTimeTicks)||'')}</span></button>`).join('')}</div></section>` : '';
    s.innerHTML=`<article class="df-detail"><div class="df-detail-bg" style="background-image:url('${esc(bg)}')"></div><div class="df-detail-vignette"></div><div class="df-detail-content"><div class="df-detail-poster"><img src="${esc(poster)}" alt="${esc(item.Name)}"></div><div><div class="df-kicker">${esc(kind)}</div><h1 class="df-detail-title">${esc(item.Name)}</h1><div class="df-detail-meta"><span>${esc(fmtDate(item.ProductionYear||item.PremiereDate||item.DateCreated))}</span>${humanMinutes(item.RunTimeTicks)?`<span>•</span><span>${humanMinutes(item.RunTimeTicks)}</span>`:''}${badgeHtml(item)}</div><div class="df-detail-tags">${(item.Genres||[]).slice(0,5).map(g=>`<span class="df-badge tag">${esc(g)}</span>`).join('')}${tagHtml(item)}</div><p class="df-detail-overview">${esc(item.Overview||'No overview available.')}</p><div class="df-actions"><button class="df-button df-button-primary" id="df-detail-play">${svg('play')} ${item.UserData?.PlaybackPositionTicks?'Resume':'Play'}</button><button class="df-button df-button-secondary" id="df-detail-list">${item.UserData?.IsFavorite?'✓ In My List':'＋ My List'}</button><button class="df-button df-button-secondary" id="df-detail-more">${svg('dots')} More</button></div>${childSection}${cast.length?`<div class="df-detail-cast"><h3>Cast</h3><div class="df-cast-row">${cast.map(p=>`<div class="df-cast"><img loading="lazy" src="${esc(p.PrimaryImageTag?`${baseUrl()}/Persons/${encodeURIComponent(p.PersonId)}/Images/Primary?tag=${encodeURIComponent(p.PrimaryImageTag)}&maxWidth=168`: '')}" alt="${esc(p.Name||'')}"><div class="df-cast-name">${esc(p.Name||'')}</div></div>`).join('')}</div></div>`:''}</div></div></article>`;
    const playBtn=s.querySelector('#df-detail-play'); if(playBtn)playBtn.onclick=()=>playItem(item);
    s.querySelector('#df-detail-list')?.addEventListener('click',async()=>{await toggleFavorite(item); const n=await getItem(item.Id); renderItem(n.Id);});
    s.querySelector('#df-detail-more')?.addEventListener('click',e=>openCardMenu(e.currentTarget,item.Id));
    s.querySelectorAll('.df-episode-row').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();const ep=cardData.get(b.dataset.dfPlay);if(ep)playItem(ep);}));
    bindCardActions(s);
  }

  async function renderList(){
    const s=ensureShell(); s.innerHTML=`<div class="df-page"><header class="df-page-header"><div><div class="df-kicker">Your list</div><h1 class="df-title">My List</h1></div></header><div class="df-grid" id="df-list-grid"><div class="df-empty" style="grid-column:1/-1">Loading…</div></div></div>`;
    const items=await getItems({IncludeItemTypes:'Movie,Series',IsFavorite:true,SortBy:'DatePlayed,SortName',SortOrder:'Descending',Limit:120}).catch(()=>[]); setCardData(items); s.querySelector('#df-list-grid').innerHTML=items.length?items.map(card).join(''):'<div class="df-empty" style="grid-column:1/-1">Your list is empty.</div>';bindCardActions(s);
  }

  async function renderSearch(q){
    const s=ensureShell(); s.innerHTML=`<div class="df-page df-search"><header class="df-page-header"><div><div class="df-kicker">Search</div><h1 class="df-title">Find something to watch</h1></div></header><form class="df-search-bar" id="df-search-form"><input class="df-input df-grow" id="df-search-input" value="${esc(q)}" placeholder="Title, genre or tag…" autofocus><button class="df-button df-button-primary" type="submit">Search</button></form><p id="df-search-note" class="df-copy"></p><div class="df-grid" id="df-search-grid" style="margin-top:24px"></div></div>`;
    const form=s.querySelector('#df-search-form'), input=s.querySelector('#df-search-input'); const run=async()=>{const term=input.value.trim();if(!term){return;}const items=await getItems({SearchTerm:term,IncludeItemTypes:'Movie,Series',Limit:120,SortBy:'SortName'}).catch(()=>[]);setCardData(items);s.querySelector('#df-search-note').textContent=`${items.length} result${items.length===1?'':'s'} for “${term}”`;s.querySelector('#df-search-grid').innerHTML=items.length?items.map(card).join(''):'<div class="df-empty" style="grid-column:1/-1">No titles matched that search.</div>';bindCardActions(s);};form.onsubmit=e=>{e.preventDefault();setHash('/search',{q:input.value.trim()})};if(q)await run();
  }

  function renderNativeAbout(){
    const s=ensureShell(); s.innerHTML=`<div class="df-page"><header class="df-page-header"><div><div class="df-kicker">The project</div><h1 class="df-title">About DINKFLIX</h1><p class="df-copy">A personal Jellyfin experience built for the people who use the server: friends, family and anyone who wants to sit down, find something good and press play.</p></div></header><section class="df-about-grid"><div class="df-empty" style="min-height:360px;display:grid;place-items:center">DINKFLIX image slot<br><small>Replace assets/about/ placeholders in the repository.</small></div><div><h2>Why it exists</h2><p class="df-copy">DINKFLIX takes the power of Jellyfin and gives the web client a calmer, more considered interface. The aim is simple: less software-looking chrome, better discovery, clear actions and a visual identity that feels like a product rather than a skin.</p><p class="df-copy">Fast over flashy. Clear over clever. Familiar enough for guests, distinctive enough to feel like DINKFLIX.</p></div></section></div>`;
  }

  function handleRoute(){
    const r=route(); const key=location.hash;
    const alreadyRendered=state.renderKey===key && state.custom && document.body.classList.contains('df-df-active') && !!state.shell?.childElementCount;
    if(alreadyRendered && !['native','playback'].includes(r.type)) return;
    state.renderKey=key; state.route=r; setBody(r); makeNav(); updateNav(); avatar(); stopHero(); closeMenus();
    if(r.type==='home')renderHome(); else if(r.type==='library')renderLibrary(r); else if(r.type==='library-native')renderLibrary(r); else if(r.type==='item')renderItem(r.id); else if(r.type==='list')renderList(); else if(r.type==='search')renderSearch(r.q); else if(r.type==='about')renderNativeAbout(); else if(r.type==='native'){} else if(r.type==='playback'){autoPlayFallback();}
  }

  function bindGlobal(){
    if(!state.navScrollBound){window.addEventListener('scroll',scrollNav,{passive:true});document.addEventListener('click',e=>{if(!e.target.closest('#dinkflix-menu-root,#dinkflix-nav'))closeMenus();});state.navScrollBound=true;}
    if(!state.clickBound){window.addEventListener('hashchange',()=>setTimeout(handleRoute,25));window.addEventListener('popstate',()=>setTimeout(handleRoute,25));document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenus()});state.clickBound=true;}
  }
  function migrateLegacyQuery(){
    const q=new URLSearchParams(location.search); const legacy=q.get('df'); if(!legacy) return;
    const isHomeHash=!location.hash || /^#\/home(?:\?|$)/.test(location.hash);
    q.delete('df');
    history.replaceState(history.state,'',location.pathname+(q.toString()?`?${q}`:'')+location.hash);
    if(!isHomeHash)return;
    if(legacy==='movies'){const v=visibleViews().find(x=>String(x.CollectionType||'').toLowerCase()==='movies'); if(v) navigateToView(v);}
    else if(legacy==='shows'){const v=visibleViews().find(x=>String(x.CollectionType||'').toLowerCase()==='tvshows'); if(v) navigateToView(v);}
    else if(legacy==='list') setHash('/home',{df:'list'});
    else if(legacy==='search') setHash('/search');
  }

  async function boot(){
    await loadUser(); if(!state.userId){setTimeout(boot,600);return;} await Promise.all([loadViews(),loadConfig()]); migrateLegacyQuery(); makeNav();bindGlobal();handleRoute();
    setInterval(async()=>{await loadViews();updateNav();},30000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else setTimeout(boot,80);
})();
