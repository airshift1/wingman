const $=s=>document.querySelector(s);
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const CATS=[["Confidence","Confidence"],["Conversation skills","Convo"],["Social awareness","Aware"],["Humor","Humor"],["Supportiveness","Support"],["Creativity","Creative"],["Teamwork","Teamwork"],["Overall performance","Overall"]];
const RX=["Legend","Funny","Respect"],SITS=["Party","Date","Friendship","Support","Work","Other"];
const D={pr:{},posts:[],rat:[],cm:[],cl:[],rx:[],rq:[],nf:[],loaded:false,slow:false};
const S={lb:"overall",open:new Set(),reply:{},drafts:{},rate:{},tags:new Set(),edit:false,err:"",info:"",mode:"login",recovery:false};
let sb=null,uid=null,authReady=false,SEEN=0;
const ago=t=>{const m=(Date.now()-t)/6e4;return m<1?"now":m<60?Math.round(m)+"m":m<1440?Math.round(m/60)+"h":Math.round(m/1440)+"d"};
const nm=u=>D.pr[u]?D.pr[u].name:"Someone",hn=u=>D.pr[u]?D.pr[u].handle:"";
const byHandle=h=>Object.keys(D.pr).find(k=>D.pr[k].handle===h);
const hue=s=>[...String(s)].reduce((a,c)=>(a*31+c.charCodeAt(0))%360,7);
const av=(u,z=40)=>`<span class="av" style="width:${z}px;height:${z}px;font-size:${Math.round(z*.37)}px;background:hsl(${hue(u)} 16% 26%)">${esc(nm(u).trim().split(/\s+/).map(x=>x[0]).slice(0,2).join("").toUpperCase())}</span>`;
const toast=m=>{const t=$("#toast");t.textContent=m;t.classList.add("on");clearTimeout(toast.k);toast.k=setTimeout(()=>t.classList.remove("on"),2200)};
const fr=()=>D.rq.filter(r=>r.s==="ok"&&(r.f===uid||r.t===uid)).map(r=>r.f===uid?r.t:r.f);
const inc=()=>D.rq.filter(r=>r.s==="p"&&r.t===uid),out=()=>D.rq.filter(r=>r.s==="p"&&r.f===uid);
const rts=pid=>{const p=D.posts.find(x=>x.id===pid);return D.rat.filter(r=>r.pid===pid&&p&&r.u!==p.u)};
const mean=l=>CATS.map((_,i)=>l.length?l.reduce((a,r)=>a+r.v[i],0)/l.length:0);
const tot=a=>a.reduce((x,y)=>x+y,0)/a.length;
const uRat=u=>{const ids=new Set(D.posts.filter(p=>p.u===u).map(p=>p.id));return D.rat.filter(r=>ids.has(r.pid)&&r.u!==u)};
const mention=t=>esc(t).replace(/@([a-z0-9]{3,20})/g,'<span class="men">@$1</span>');
function radar(v,z=240){const c=z/2,R=c-44,pt=(i,r)=>{const a=-Math.PI/2+i*Math.PI/4;return[(c+Math.cos(a)*R*r).toFixed(1),(c+Math.sin(a)*R*r).toFixed(1)]};const pl=r=>CATS.map((_,i)=>pt(i,r).join(",")).join(" ");
return `<svg viewBox="0 0 ${z} ${z}" class="radar">${[.33,.66,1].map(r=>`<polygon points="${pl(r)}" fill="none" stroke="#2a2a30"/>`).join("")}<polygon points="${v.map((x,i)=>pt(i,x/10).join(",")).join(" ")}" fill="rgba(141,155,255,.18)" stroke="#8d9bff" stroke-width="1.5"/>${CATS.map((q,i)=>{const[x,y]=pt(i,1.25);return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-size="9" fill="#8c8c96">${q[1]}</text>`}).join("")}</svg>`}
const bar=(l,v)=>`<div class="br"><span>${l}</span><i><u style="width:${v*10}%"></u></i><b>${v.toFixed(1)}</b></div>`;
function cmt(c,p,rep){const l=D.cl.filter(x=>x.c===c.id).map(x=>x.u);return `<div class="cm ${rep?"rps":""}">${av(c.u,rep?26:32)}<div><div><b>${esc(nm(c.u))}</b><span class="t">${ago(c.ts)}</span></div><p>${mention(c.t)}</p><div style="margin-left:-8px"><button class="lk ${l.includes(uid)?"on":""}" data-a="like" data-k="${c.id}">Like${l.length?" · "+l.length:""}</button>${rep?"":`<button class="lk" data-a="reply" data-k="${p.id}" data-j="${c.id}">Reply</button>`}</div></div></div>${rep?"":D.cm.filter(x=>x.par===c.id).sort((a,b)=>a.ts-b.ts).map(x=>cmt(x,p,1)).join("")}`}
function detail(p,rl,mine){
 const n=rl.length,d=S.rate[p.id]||(S.rate[p.id]=mine?mine.v.slice():CATS.map(()=>7)),a=mean(rl),cs=D.cm.filter(c=>c.pid===p.id&&!c.par).sort((a,b)=>a.ts-b.ts),rc=S.reply[p.id]&&D.cm.find(c=>c.id===S.reply[p.id]);
 return `<div class="dt">${n?CATS.map((c,i)=>bar(c[0],a[i])).join(""):`<p class="nt2">Nobody has rated this report yet.</p>`}
 <h4>${p.u===uid?"Rating form preview":mine?"Update your rating":"Rate this wingman"}</h4>${p.u===uid?`<p class="nt2">This is what friends see. You can’t rate your own report, and nothing here is saved.</p>`:""}${CATS.map((c,i)=>`<label class="sl"><span>${c[0]}</span><input type="range" min="1" max="10" value="${d[i]}" data-rate="${p.id}|${i}"><output>${d[i]}</output></label>`).join("")}<textarea class="inp" data-draft="r${p.id}" placeholder="Add a note (optional)" style="min-height:70px;margin:8px 0 10px"></textarea><button class="btn s" data-a="submitrate" data-k="${p.id}" ${p.u===uid?"disabled":""}>${mine?"Update":"Submit"} rating</button>
 ${rl.filter(r=>r.x).length?`<h4>Rating notes</h4>`+rl.filter(r=>r.x).map(r=>`<p class="nt2"><b style="color:var(--tx)">${esc(nm(r.u))}</b> · ${tot(r.v).toFixed(1)} · ${esc(r.x)}</p>`).join(""):""}
 <h4>${D.cm.filter(c=>c.pid===p.id).length} comments</h4>${cs.map(c=>cmt(c,p)).join("")}
 ${rc?`<div class="rt">Replying to ${esc(nm(rc.u))} <button class="lk" data-a="cancel" data-k="${p.id}">Cancel</button></div>`:""}
 <div class="cmp"><input class="inp" data-draft="c${p.id}" data-k="${p.id}" placeholder="Write a comment" maxlength="400"><button class="btn" data-a="comment" data-k="${p.id}">Post</button></div></div>`}
function post(p){
 const o=S.open.has(p.id),rl=rts(p.id),n=rl.length,s=n?tot(mean(rl)):0,cc=D.cm.filter(c=>c.pid===p.id).length,mine=rl.find(r=>r.u===uid),rx=D.rx.filter(r=>r.pid===p.id);
 const tg=(p.tags||[]).filter(t=>D.pr[t]).map(nm);
 return `<article class="post"><a href="#profile-${hn(p.u)}">${av(p.u,40)}</a><div class="pb"><div class="pt"><a href="#profile-${hn(p.u)}"><b>${esc(nm(p.u))}</b></a><span>@${esc(hn(p.u))} · ${ago(p.ts)}</span></div>
 <h3>${esc(p.title)}</h3><p class="bd ${o?"":"cl"}">${esc(p.body)}</p>
 <div class="mt">${esc(p.cat)}${p.w&&D.pr[p.w]?` · helped ${esc(nm(p.w))}`:""}${tg.length?` · with ${esc(tg.join(", "))}`:""}</div>
 <div class="sc">${n?`<b>${s.toFixed(1)}</b><i><u style="width:${s*10}%"></u></i><span>${n} rating${n>1?"s":""}</span>`:`<span>No ratings yet</span>`}</div>
 <div class="ac">${RX.map(e=>{const c=rx.filter(r=>r.e===e).length,m=rx.some(r=>r.u===uid&&r.e===e);return `<button class="lk ${m?"on":""}" data-a="react" data-k="${p.id}" data-j="${e}">${e}${c?" "+c:""}</button>`}).join("")}<span class="sp"></span><button class="lk" data-a="toggle" data-k="${p.id}">${cc?cc+(cc>1?" comments":" comment"):"Comment"} · ${o?"Close":p.u===uid?"Details":"Rate"}</button></div>${o?detail(p,rl,mine):""}</div></article>`}
const empty=(h,t,b="")=>`<div class="empty"><h2>${h}</h2><p>${t}</p>${b}</div>`;
function vFeed(){const f=fr(),ps=D.posts.filter(p=>p.u===uid||f.includes(p.u)).sort((a,b)=>b.ts-a.ts);
 return `<h1>Feed</h1><p class="sub">Reports from you and your friends</p>`+(ps.length?ps.map(post).join(""):f.length?empty("No reports yet","When you or a friend posts a wingman report, it will show up here.",`<a class="btn" href="#create">Write a report</a>`):empty(`Welcome, ${esc(nm(uid).split(" ")[0])}`,"Wingman is where you and your friends share how you helped each other out and rate it. Add a friend or write your first report to get started.",`<div class="row"><a class="btn" href="#friends">Find friends</a><a class="btn o" href="#create">Write a report</a></div>`))}
function vCreate(){const f=fr(),g=k=>S.drafts[k]||"";
 return `<h1>New report</h1><p class="sub">Only your friends will see it.</p><div class="f"><label>Title</label><input class="inp" data-draft="ft" maxlength="90"></div><div class="f"><label>What happened</label><textarea class="inp" data-draft="fb"></textarea></div><div class="f"><label>Situation</label><select class="inp" data-draft="fc">${SITS.map(x=>`<option>${x}</option>`).join("")}</select></div>${f.length?`<div class="f"><label>Who did you help? (optional)</label><select class="inp" data-draft="fw"><option value="">Nobody in particular</option>${f.map(k=>`<option value="${k}">${esc(nm(k))}</option>`).join("")}</select></div><div class="f"><label>Tag friends (optional)</label><div class="chips">${f.map(k=>`<button class="chip ${S.tags.has(k)?"on":""}" data-a="tag" data-k="${k}">${esc(nm(k))}</button>`).join("")}</div></div>`:`<p class="nt2">Add friends to tag them or say who you helped.</p>`}<div class="err">${esc(S.err)}</div><button class="btn" data-a="publish">Publish</button>`}
function flist(){const q=(S.drafts.q||"").toLowerCase(),m=k=>!q||(nm(k)+hn(k)).toLowerCase().includes(q),ids=Object.keys(D.pr),f=fr().filter(m);
 const row=(k,b)=>`<div><a href="#profile-${hn(k)}">${av(k,40)}</a><div class="pm"><b>${esc(nm(k))}${k===uid?" (you)":""}</b><small>@${esc(hn(k))}</small></div>${b}</div>`;
 const ri=inc().filter(r=>m(r.f)),ot=out().map(r=>r.t),rest=[...(q&&m(uid)?[uid]:[]),...ids.filter(k=>k!==uid&&!fr().includes(k)&&!ri.some(r=>r.f===k)&&m(k))];
 return (ri.length?`<div class="sec">Requests</div><div class="list">${ri.map(r=>row(r.f,`<button class="btn s" data-a="accept" data-k="${r.id}">Accept</button><button class="btn s o" data-a="reject" data-k="${r.id}">Decline</button>`)).join("")}</div>`:"")+
 `<div class="sec">Your friends</div>`+(f.length?`<div class="list">${f.map(k=>row(k,`<button class="btn s o" data-a="remove" data-k="${k}">Remove</button>`)).join("")}</div>`:`<p class="nt2">${q?"No friends match.":"You haven’t added any friends yet."}</p>`)+
 `<div class="sec">People on Wingman</div>`+(rest.length?`<div class="list">${rest.map(k=>row(k,k===uid?`<a class="btn s o" href="#profile-${hn(uid)}">View profile</a>`:ot.includes(k)?`<span class="nt2" style="margin:0">Requested</span>`:`<button class="btn s" data-a="add" data-k="${k}">Add</button>`)).join("")}</div>`:`<p class="nt2">${q?"No one found.":"No one else has joined yet. Share the link with your friends."}</p>`)}
const vFriends=()=>`<h1>Friends</h1><p class="sub">Search for people and manage requests</p><input class="inp" data-draft="q" placeholder="Search by name or username"><div id="fl">${flist()}</div>`;
function vRanks(){const tabs=[["overall","Top wingmen"],["Humor","Funniest"],["Supportiveness","Most supportive"],["Teamwork","Best teamwork"],["post","Top reports"]],ids=[uid,...fr()];
 let rows;if(S.lb==="post")rows=D.posts.filter(p=>ids.includes(p.u)&&rts(p.id).length).map(p=>[p.u,tot(mean(rts(p.id))),p.title]).sort((a,b)=>b[1]-a[1]);
 else{const i=CATS.findIndex(c=>c[0]===S.lb);rows=ids.map(k=>{const l=uRat(k);return l.length?[k,S.lb==="overall"?tot(mean(l)):mean(l)[i],"@"+hn(k)+" · "+l.length+" ratings"]:null}).filter(Boolean).sort((a,b)=>b[1]-a[1])}
 return `<h1>Leaderboard</h1><p class="sub">You and your friends</p><div class="tabs">${tabs.map(t=>`<button class="${S.lb===t[0]?"on":""}" data-a="lb" data-k="${t[0]}">${t[1]}</button>`).join("")}</div>`+(rows.length?`<div class="list">${rows.map((r,i)=>`<div><span class="rk">${i+1}</span>${av(r[0],36)}<div class="pm"><b>${esc(nm(r[0]))}</b><small>${esc(r[2])}</small></div><b>${r[1].toFixed(1)}</b></div>`).join("")}</div>`:empty("Nothing to rank yet","Rankings appear once you or your friends have received ratings."))}
const TXT={req:"sent you a friend request",ok:"accepted your friend request",post:"shared a new report",rate:"rated your report",comment:"commented on your report",reply:"replied to your comment"};
function vAlerts(){const l=D.nf.filter(n=>n.to===uid).sort((a,b)=>b.ts-a.ts).slice(0,60);
 return `<h1>Notifications</h1><p class="sub"> </p>`+(l.length?l.map(n=>`<a class="nt ${n.ts>SEEN?"un":""}" href="${n.k==="req"||n.k==="ok"?"#friends":"#feed"}" ${n.pid?`data-a="gopost" data-k="${n.pid}"`:""}><b style="font-weight:500">${esc(nm(n.f))}</b> ${TXT[n.k]||""}<small>${ago(n.ts)}</small></a>`).join(""):empty("You’re all caught up","Friend requests, ratings and comments will show up here."))}
function vProfile(h){const k=h?byHandle(h):uid;if(!k)return empty("Profile not found","That person hasn’t joined Wingman.");
 const me=k===uid,isf=fr().includes(k),l=uRat(k),ps=D.posts.filter(p=>p.u===k).sort((a,b)=>b.ts-a.ts),a=mean(l),rq=D.rq.find(r=>r.s==="p"&&((r.f===uid&&r.t===k)||(r.f===k&&r.t===uid)));
 const act=me?`<div class="row"><button class="btn s o" data-a="edit">${S.edit?"Cancel":"Edit profile"}</button><button class="btn s o" data-a="signout">Sign out</button></div>`:isf?`<button class="btn s o" data-a="remove" data-k="${k}">Remove friend</button>`:rq?(rq.f===uid?`<span class="nt2" style="margin:0">Requested</span>`:`<button class="btn s" data-a="accept" data-k="${rq.id}">Accept request</button>`):`<button class="btn s" data-a="add" data-k="${k}">Add friend</button>`;
 const mf=me?fr():[];
 return `<div class="ph">${av(k,72)}<div style="flex:1;min-width:0"><h1>${esc(nm(k))}</h1><div class="mt" style="margin:0">@${esc(hn(k))}</div></div>${act}</div>
 ${S.edit&&me?`<div class="f"><label>Name</label><input class="inp" data-draft="en" maxlength="40"></div><div class="f"><label>Bio</label><textarea class="inp" data-draft="eb" maxlength="160" style="min-height:70px"></textarea></div><button class="btn" data-a="saveedit">Save</button>`:D.pr[k].bio?`<p class="bd">${esc(D.pr[k].bio)}</p>`:me?`<p class="nt2">You haven’t added a bio.</p>`:""}
 ${me||isf?`<div class="fig"><div><b>${ps.length}</b><span>Reports</span></div><div><b>${l.length?tot(a).toFixed(1):"–"}</b><span>Average score</span></div><div><b>${l.length}</b><span>Ratings received</span></div>${me?`<div><b>${mf.length}</b><span>Friends</span></div>`:""}</div>
 ${l.length?`<div class="rd">${radar(a)}<div>${CATS.map((c,i)=>bar(c[1],a[i])).join("")}</div></div>`:`<p class="nt2">No ratings received yet.</p>`}
 <div class="sec">Reports</div>${ps.length?`<div class="list">${ps.map(p=>{const r=rts(p.id);return `<div><div class="pm"><b>${esc(p.title)}</b><small>${ago(p.ts)} ago · ${r.length?r.length+" rating"+(r.length>1?"s":""):"no ratings yet"}</small></div><b>${r.length?tot(mean(r)).toFixed(1):""}</b></div>`}).join("")}</div>`:`<p class="nt2">No reports yet.</p>`}`:`<p class="nt2" style="margin-top:20px">Reports and ratings are visible to friends only.</p>`}`}
function vSetup(){return `<div style="padding:12vh 0 40px"><div class="wm">Wingman</div><h1>Set up your profile</h1><p class="sub">This is how your friends will find you.</p><div class="f"><label>Name</label><input class="inp" data-draft="sn" maxlength="40" autocomplete="off"></div><div class="f"><label>Username</label><input class="inp" data-draft="sh" maxlength="20" placeholder="letters and numbers, 3–20" autocomplete="off" autocapitalize="none"></div><div class="f"><label>Bio (optional)</label><textarea class="inp" data-draft="sb" maxlength="160" style="min-height:70px"></textarea></div><div class="err">${esc(S.err)}</div><button class="btn" data-a="setup" style="width:100%">Continue</button><p class="nt2" style="margin-top:16px;text-align:center"><button class="lk" data-a="signout">Sign out</button></p></div>`}
function vAuth(){const su=S.mode==="signup";
 return `<div style="padding:12vh 0 40px"><div class="wm">Wingman</div><h1>${su?"Create your account":"Welcome back"}</h1><p class="sub">${su?"Join to find friends and rate each other.":"Sign in to your Wingman account."}</p><div class="f"><label>Email</label><input class="inp" type="email" data-draft="ae" autocomplete="email" autocapitalize="none" maxlength="254"></div><div class="f"><label>Password</label><input class="inp" type="password" data-draft="ap" autocomplete="${su?"new-password":"current-password"}" maxlength="72" ${su?'placeholder="At least 8 characters"':""}></div>${S.info?`<p class="nt2">${esc(S.info)}</p>`:""}<div class="err">${esc(S.err)}</div><button class="btn" data-a="${su?"signup":"login"}" style="width:100%">${su?"Create account":"Sign in"}</button><p class="nt2" style="margin-top:16px;text-align:center">${su?`Already have an account? <button class="lk" data-a="mode" data-k="login">Sign in</button>`:`New here? <button class="lk" data-a="mode" data-k="signup">Create an account</button> · <button class="lk" data-a="reset">Forgot password</button>`}</p></div>`}
function vRecover(){return `<div style="padding:12vh 0 40px"><div class="wm">Wingman</div><h1>Choose a new password</h1><p class="sub">Use at least 8 characters.</p><div class="f"><label>New password</label><input class="inp" type="password" data-draft="np" autocomplete="new-password" maxlength="72"></div><div class="err">${esc(S.err)}</div><button class="btn" data-a="newpw" style="width:100%">Update password</button></div>`}
const NAV=[["feed","Feed"],["friends","Friends"],["create","New report"],["leaders","Leaderboard"],["alerts","Notifications"],["profile","Profile"]];
const unread=()=>D.nf.filter(n=>n.to===uid&&n.ts>SEEN).length+inc().length*0;
function chrome(v){const u=unread();
 $("#side").innerHTML=`<div class="wm">Wingman</div>`+NAV.map(n=>`<a class="nv ${v===n[0]?"on":""}" href="#${n[0]}">${n[1]}${n[0]==="alerts"&&u?`<em>${u}</em>`:""}</a>`).join("")+`<a class="who" href="#profile">${av(uid,34)}<div><b style="font-weight:500">${esc(nm(uid))}</b><small>@${esc(hn(uid))}</small></div></a>`;
 $("#top").innerHTML=`<a href="#feed"><b>Wingman</b></a><a href="#alerts">Notifications${u?` <em>${u}</em>`:""}</a>`;
 $("#bnav").innerHTML=[["feed","Feed"],["friends","Friends"],["create","Post"],["leaders","Ranks"],["profile","Me"]].map(n=>`<a class="${v===n[0]?"on":""}" href="#${n[0]}">${n[1]}</a>`).join("")}
function draw(){
 const[h,...r]=(location.hash.slice(1)||"feed").split("-"),v=NAV.some(n=>n[0]===h)?h:"feed";
 const ae=document.activeElement,fk=ae&&ae.dataset&&ae.dataset.draft,pos=fk&&ae.selectionStart;
 let html,solo=true;
 if(!sb)html=empty("Wingman is unavailable","This site isn’t configured yet. Please try again later.");
 else if(!authReady)html=`<p class="nt2" style="padding-top:20vh">Loading…</p>`;
 else if(!uid)html=vAuth();
 else if(S.recovery)html=vRecover();
 else if(!D.loaded)html=D.slow?empty("Couldn’t load","Check your connection and reload the page."):`<p class="nt2" style="padding-top:20vh">Loading…</p>`;
 else if(!D.pr[uid])html=vSetup();
 else{solo=false;html={feed:vFeed,create:vCreate,friends:vFriends,leaders:vRanks,alerts:vAlerts,profile:()=>vProfile(r.join("-"))}[v]()}
 document.body.className=solo?"solo":"";
 $("#main").innerHTML=html;
 document.querySelectorAll("[data-draft]").forEach(e=>{const k=e.dataset.draft;if(k in S.drafts)e.value=S.drafts[k];else if(k==="en")e.value=S.drafts.en=nm(uid);else if(k==="eb")e.value=S.drafts.eb=D.pr[uid].bio||""});
 if(fk){const n=document.querySelector(`[data-draft="${fk}"]`);if(n){n.focus();try{n.setSelectionRange(pos,pos)}catch(e){}}}
 if(!solo){chrome(v);if(v==="alerts"&&D.nf.some(n=>n.to===uid&&n.ts>SEEN)){const t=Date.now();setTimeout(()=>{const t2=Math.max(...D.nf.filter(n=>n.to===uid).map(n=>n.ts));if(t2>SEEN){SEEN=t2;markSeen(t2)}chrome("alerts")},1500)}}}
let q=0;const sched=()=>{if(!q)q=requestAnimationFrame(()=>{q=0;draw()})};
const g=k=>(S.drafts[k]||"").trim();
const chk=r=>{if(r.error)throw r.error;return r};
const TS=s=>Date.parse(s);
const LD={
profiles:async()=>{const r=chk(await sb.from("profiles").select("id,name,handle,bio,notifs_seen_at").order("created_at").limit(1000)),m={};r.data.forEach(p=>m[p.id]={name:p.name,handle:p.handle,bio:p.bio||"",seen:TS(p.notifs_seen_at)});D.pr=m;if(m[uid])SEEN=Math.max(SEEN,m[uid].seen)},
posts:async()=>{const r=chk(await sb.from("posts").select("id,user_id,title,body,cat,helped_id,tags,created_at").order("created_at",{ascending:false}).limit(500));D.posts=r.data.map(p=>({id:p.id,u:p.user_id,title:p.title,body:p.body,cat:p.cat,w:p.helped_id||"",tags:p.tags||[],ts:TS(p.created_at)}))},
ratings:async()=>{const r=chk(await sb.from("ratings").select("id,post_id,user_id,v,note,created_at").limit(1000));D.rat=r.data.map(x=>({id:x.id,pid:x.post_id,u:x.user_id,v:x.v.map(Number),x:x.note||"",ts:TS(x.created_at)}))},
comments:async()=>{const r=chk(await sb.from("comments").select("id,post_id,user_id,parent_id,body,created_at").order("created_at").limit(1000));D.cm=r.data.map(c=>({id:c.id,pid:c.post_id,u:c.user_id,t:c.body,par:c.parent_id||"",ts:TS(c.created_at)}))},
comment_likes:async()=>{const r=chk(await sb.from("comment_likes").select("comment_id,user_id").limit(1000));D.cl=r.data.map(x=>({c:x.comment_id,u:x.user_id}))},
reactions:async()=>{const r=chk(await sb.from("reactions").select("id,post_id,user_id,emoji").limit(1000));D.rx=r.data.map(x=>({id:x.id,pid:x.post_id,u:x.user_id,e:x.emoji}))},
friend_requests:async()=>{const r=chk(await sb.from("friend_requests").select("id,from_id,to_id,status").limit(1000));D.rq=r.data.map(x=>({id:x.id,f:x.from_id,t:x.to_id,s:x.status==="accepted"?"ok":"p"}))},
notifications:async()=>{const r=chk(await sb.from("notifications").select("id,to_id,from_id,kind,post_id,created_at").order("created_at",{ascending:false}).limit(100));D.nf=r.data.map(n=>({id:n.id,to:n.to_id,f:n.from_id,k:n.kind,pid:n.post_id||"",ts:TS(n.created_at)}))}
};
const reload=(...t)=>Promise.all(t.map(n=>LD[n]()));
const markSeen=t=>{sb.from("profiles").update({notifs_seen_at:new Date(t).toISOString()}).eq("id",uid).then(()=>{})};
const okMail=e=>/^\S+@\S+\.\S+$/.test(e);
const A={
toggle:k=>{S.open.has(k)?S.open.delete(k):S.open.add(k)},
gopost:k=>{S.open.add(k)},
mode:k=>{S.mode=k;S.err="";S.info=""},
login:async()=>{const email=g("ae"),pw=S.drafts.ap||"";if(!email||!pw){S.err="Enter your email and password.";return}S.err="";S.info="";const{error}=await sb.auth.signInWithPassword({email,password:pw});if(error){S.err=/confirm/i.test(error.message)?"Please confirm your email first, then sign in.":"Email or password is incorrect.";return}delete S.drafts.ap},
signup:async()=>{const email=g("ae"),pw=S.drafts.ap||"";if(!okMail(email)){S.err="Enter a valid email address.";return}if(pw.length<8){S.err="Use a password with at least 8 characters.";return}S.err="";S.info="";const{data,error}=await sb.auth.signUp({email,password:pw,options:{emailRedirectTo:location.origin+"/app.html"+location.search}});if(error){S.err=error.message;return}delete S.drafts.ap;if(!data.session){S.mode="login";S.info="Check your email for a confirmation link, then sign in."}},
reset:async()=>{const email=g("ae");if(!okMail(email)){S.err="Enter your email above first.";return}S.err="";const{error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+"/app.html"});if(error){S.err=error.message;return}S.info="If an account exists for that email, a reset link is on its way."},
newpw:async()=>{const pw=S.drafts.np||"";if(pw.length<8){S.err="Use at least 8 characters.";return}const{error}=await sb.auth.updateUser({password:pw});if(error){S.err=error.message;return}S.err="";delete S.drafts.np;S.recovery=false;toast("Password updated")},
signout:async()=>{await sb.auth.signOut();location.hash=""},
react:async(k,b)=>{const e=b.dataset.j,c=D.rx.find(r=>r.pid===k&&r.u===uid);
 if(c&&c.e===e)chk(await sb.from("reactions").delete().eq("id",c.id));
 else if(c)chk(await sb.from("reactions").update({emoji:e}).eq("id",c.id));
 else chk(await sb.from("reactions").insert({post_id:k,user_id:uid,emoji:e}));
 await reload("reactions")},
like:async k=>{const m=D.cl.some(x=>x.c===k&&x.u===uid);
 chk(m?await sb.from("comment_likes").delete().eq("comment_id",k).eq("user_id",uid):await sb.from("comment_likes").insert({comment_id:k,user_id:uid}));
 await reload("comment_likes")},
reply:(k,b)=>{S.reply[k]=b.dataset.j},
cancel:k=>{S.reply[k]=""},
comment:async k=>{const t=g("c"+k);if(!t)return;const par=S.reply[k]||"";
 chk(await sb.from("comments").insert({post_id:k,user_id:uid,body:t,parent_id:par||null}));
 S.drafts["c"+k]="";S.reply[k]="";await reload("comments")},
submitrate:async k=>{const p=D.posts.find(x=>x.id===k);if(!p||p.u===uid){toast("You can’t rate your own report");return}
 const mine=D.rat.find(r=>r.pid===k&&r.u===uid),row={v:S.rate[k],note:g("r"+k)};
 try{chk(mine?await sb.from("ratings").update(row).eq("id",mine.id):await sb.from("ratings").insert({...row,post_id:k,user_id:uid}))}
 catch(e){if(e.code==="23505"){await reload("ratings");toast("You’ve already rated this report");return}throw e}
 S.drafts["r"+k]="";await reload("ratings");toast(mine?"Rating updated":"Rating saved")},
tag:k=>{S.tags.has(k)?S.tags.delete(k):S.tags.add(k)},
publish:async()=>{const title=g("ft"),body=g("fb");if(!title||!body){S.err="Add a title and a description.";return}S.err="";
 const r=chk(await sb.from("posts").insert({user_id:uid,title,body,cat:S.drafts.fc||SITS[0],helped_id:S.drafts.fw||null,tags:[...S.tags]}).select("id").single());
 ["ft","fb","fc","fw"].forEach(k=>delete S.drafts[k]);S.tags.clear();S.open.add(r.data.id);await reload("posts");location.hash="feed";toast("Published")},
lb:k=>{S.lb=k},
add:async k=>{if(k===uid)return;
 try{chk(await sb.from("friend_requests").insert({from_id:uid,to_id:k}))}
 catch(e){if(e.code==="23505"){await reload("friend_requests");toast("A request already exists with this person");return}throw e}
 await reload("friend_requests");toast("Request sent")},
accept:async k=>{chk(await sb.from("friend_requests").update({status:"accepted"}).eq("id",k));await reload("friend_requests")},
reject:async k=>{chk(await sb.from("friend_requests").delete().eq("id",k));await reload("friend_requests")},
remove:async k=>{const r=D.rq.find(x=>x.s==="ok"&&((x.f===uid&&x.t===k)||(x.f===k&&x.t===uid)));if(!r)return;chk(await sb.from("friend_requests").delete().eq("id",r.id));await reload("friend_requests")},
edit:()=>{S.edit=!S.edit;delete S.drafts.en;delete S.drafts.eb},
saveedit:async()=>{const n=g("en");if(!n)return;chk(await sb.from("profiles").update({name:n,bio:g("eb")}).eq("id",uid));S.edit=false;await reload("profiles")},
setup:async()=>{const n=g("sn"),h=g("sh").toLowerCase();if(!n){S.err="Enter your name.";return}if(!/^[a-z0-9]{3,20}$/.test(h)){S.err="Usernames are 3–20 letters or numbers.";return}if(byHandle(h)){S.err="That username is taken.";return}
 const r=await sb.from("profiles").insert({id:uid,name:n,handle:h,bio:g("sb")});
 if(r.error){S.err=r.error.code==="23505"?"That username is taken.":"Couldn’t save your profile. Try again.";return}
 S.err="";["sn","sh","sb"].forEach(k=>delete S.drafts[k]);await reload("profiles")}};
document.addEventListener("click",e=>{const b=e.target.closest("[data-a]");if(!b)return;const a=b.dataset.a;Promise.resolve().then(()=>A[a](b.dataset.k,b)).catch(e=>{console.error(e);toast("Something went wrong. Try again.")}).then(()=>{if(a!=="gopost")sched()})});
document.addEventListener("keydown",e=>{const t=e.target;if(e.key==="Enter"&&t.tagName==="INPUT"&&["ae","ap","np"].includes(t.dataset.draft)){e.preventDefault();const bt=document.querySelector("#main [data-a=login],#main [data-a=signup],#main [data-a=newpw]");if(bt)bt.click();return}if(e.key==="Enter"&&t.tagName==="INPUT"&&t.dataset.draft&&t.dataset.draft[0]==="c"&&t.dataset.k){S.drafts[t.dataset.draft]=t.value;A.comment(t.dataset.k).catch(e=>{console.error(e);toast("Something went wrong. Try again.")}).then(sched)}});
document.addEventListener("input",e=>{const t=e.target;if(t.dataset.rate){const[p,i]=t.dataset.rate.split("|");S.rate[p][i]=+t.value;t.nextElementSibling.textContent=t.value}else if(t.dataset.draft){S.drafts[t.dataset.draft]=t.value;if(t.dataset.draft==="q")$("#fl").innerHTML=flist()}});
addEventListener("hashchange",()=>{S.err="";S.edit=false;draw();scrollTo(0,0)});
let ch=null,rt=null,poll=null;const pend=new Set();
const stop=()=>{if(ch){sb.removeChannel(ch);ch=null}clearInterval(poll);clearTimeout(rt)};
async function flush(){const l=[...pend];pend.clear();try{await reload(...l)}catch(e){console.error(e)}sched()}
async function loadAll(){try{await reload(...Object.keys(LD));D.loaded=true;D.slow=false}catch(e){console.error(e);if(!D.loaded)D.slow=true}sched()}
function start(){
 stop();D.loaded=false;D.slow=false;loadAll();
 ch=sb.channel("wm-"+uid);
 Object.keys(LD).forEach(t=>ch.on("postgres_changes",{event:"*",schema:"public",table:t},()=>{pend.add(t);clearTimeout(rt);rt=setTimeout(flush,200)}));
 ch.subscribe();
 poll=setInterval(()=>{if(!document.hidden)loadAll()},60000);
}
function resetD(){Object.assign(D,{pr:{},posts:[],rat:[],cm:[],cl:[],rx:[],rq:[],nf:[],loaded:false,slow:false});SEEN=0;S.open.clear();S.drafts={};S.rate={};S.reply={};S.tags.clear();S.edit=false}
function setUser(s,ev){
 if(ev==="PASSWORD_RECOVERY")S.recovery=true;
 const nu=s&&s.user?s.user.id:null;
 if(authReady&&nu===uid){sched();return}
 const first=!authReady;authReady=true;
 if(!first||nu){resetD()}
 uid=nu;
 setTimeout(()=>{
  if(uid){start();if(new URLSearchParams(location.search).get("next")==="reviews")location.replace("index.html#rate")}
  else{stop();S.recovery=false;S.mode="login";S.err="";S.info=""}
  sched()},0);
}
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&uid&&D.loaded)loadAll()});
(async()=>{
 const C=window.WINGMAN_CONFIG;
 if(!C||!C.supabaseUrl||!C.supabaseAnonKey||!window.supabase){draw();return}
 sb=window.supabase.createClient(C.supabaseUrl,C.supabaseAnonKey);
 draw();
 sb.auth.onAuthStateChange((ev,s)=>setUser(s,ev));
 try{const{data}=await sb.auth.getSession();setUser(data.session,"INIT")}catch(e){console.error(e);setUser(null,"INIT")}
})();
