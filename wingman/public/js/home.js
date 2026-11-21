const CATS=[["confidence","Confidence boost"],["convo","Conversation help"],["style","Style & vibe"],["timing","Timing & moves"],["recommend","Would recommend"]];
const TAGS=["Opening lines","Texting help","Outfit advice","Dating profile","Pep talk","Great timing","Funny","Honest","Got the date","Wish I listened"];
const state={score:0,cats:{},tags:new Set()};
let reviews=[],sb=null,session=null,mine=null;
const $=id=>document.getElementById(id);
function el(t,c,txt){const e=document.createElement(t);if(c)e.className=c;if(txt!=null)e.textContent=txt;return e}

// marquee
const mq=$("marq");
for(let k=0;k<2;k++)TAGS.forEach(t=>mq.appendChild(el("span","",t)));

// router
function route(){
  const h=(location.hash||"#home").slice(1);
  const v=h==="rate"?"rate":"home";
  document.querySelectorAll(".view").forEach(x=>x.classList.toggle("on",x.id==="v-"+v));
  document.querySelectorAll("[data-nav]").forEach(a=>a.classList.toggle("act",a.dataset.nav===v));
  if(h==="how"){setTimeout(()=>$("how").scrollIntoView(),30)}else window.scrollTo(0,0);
  observe();
}
addEventListener("hashchange",route);

// reveal on scroll
let io;
function observe(){
  const els=document.querySelectorAll(".view.on .reveal:not(.in)");
  if(!("IntersectionObserver" in window)){els.forEach(e=>e.classList.add("in"));return}
  io=io||new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}}),{threshold:.12});
  els.forEach(e=>io.observe(e));
}

// rate form
const sc=$("scores");
for(let i=1;i<=10;i++){const b=el("button","",String(i));b.type="button";b.onclick=()=>{state.score=i;[...sc.children].forEach((x,j)=>x.classList.toggle("on",j===i-1));gate()};sc.appendChild(b)}
CATS.forEach(([k,label])=>{
  const row=el("div","cat");row.appendChild(el("span","",label));
  const st=el("div","stars");
  for(let i=1;i<=5;i++){const b=el("button","","★");b.type="button";b.setAttribute("aria-label",label+" "+i+" stars");
    b.onclick=()=>{state.cats[k]=i;[...st.children].forEach((x,j)=>x.classList.toggle("on",j<i))};st.appendChild(b)}
  row.appendChild(st);$("cats").appendChild(row);
});
TAGS.forEach(t=>{const b=el("button","",t);b.type="button";b.onclick=()=>{state.tags.has(t)?state.tags.delete(t):state.tags.add(t);b.classList.toggle("on")};$("chips").appendChild(b)});

// counters
function countTo(node,val,dec,suffix){
  const reduce=matchMedia("(prefers-reduced-motion:reduce)").matches;
  if(reduce){node.textContent=val.toFixed(dec)+suffix;return}
  const t0=performance.now(),d=900;
  (function f(t){const p=Math.min(1,(t-t0)/d),e=1-Math.pow(1-p,3);node.textContent=(val*e).toFixed(dec)+suffix;if(p<1)requestAnimationFrame(f)})(t0);
}

function reviewCard(r,big){
  const d=el("div",big?"card":"rev");
  if(big){d.appendChild(el("p","quote","“"+(r.comment||"Great wingman!")+"”"));
    const w=el("div","who");w.appendChild(el("span","",r.name||"Anonymous"));w.appendChild(el("span","pill",r.score+"/10"));d.appendChild(w);return d}
  const h=el("div","rh");h.appendChild(el("b","",r.name||"Anonymous"));h.appendChild(el("span","pill",r.score+"/10"));d.appendChild(h);
  if(r.comment)d.appendChild(el("p","",r.comment));
  if(r.tags&&r.tags.length){const t=el("div","tags");r.tags.forEach(x=>t.appendChild(el("span","",x)));d.appendChild(t)}
  d.appendChild(el("div","date",new Date(r.ts).toLocaleDateString()));
  return d;
}

let lastN=-1;
function render(){
  const all=reviews,n=all.length;
  const avg=n?all.reduce((a,r)=>a+r.score,0)/n:0;
  const rec=all.filter(r=>r.cats&&r.cats.recommend);
  const recPct=rec.length?Math.round(rec.filter(r=>r.cats.recommend>=4).length/rec.length*100):null;
  $("count").textContent=n+(n===1?" rating":" ratings");
  $("avg").textContent=n?avg.toFixed(1):"–";
  if(n!==lastN){
    n?countTo($("h-avg"),avg,1,""):($("h-avg").textContent="–");
    countTo($("h-n"),n,0,"");
    recPct!=null?countTo($("h-rec"),recPct,0,"%"):($("h-rec").textContent="–");
    lastN=n;
  }
  const bars=$("bars");bars.textContent="";
  CATS.forEach(([k,label])=>{
    const vals=all.map(r=>r.cats&&r.cats[k]).filter(Boolean);
    const a=vals.length?vals.reduce((x,y)=>x+y,0)/vals.length:0;
    const row=el("div","bar");row.appendChild(el("span","",label));
    const tr=el("div","track"),f=el("div","fill");f.style.width=(a/5*100)+"%";tr.appendChild(f);row.appendChild(tr);
    row.appendChild(el("span","",a?a.toFixed(1):"–"));bars.appendChild(row);
  });
  const sorted=[...all].sort((a,b)=>b.ts-a.ts);
  const list=$("list");list.textContent="";
  if(!n)list.appendChild(el("div","empty","No ratings yet. Be the first!"));
  sorted.forEach(r=>list.appendChild(reviewCard(r,false)));
  const ht=$("h-testi");ht.textContent="";
  const top=sorted.filter(r=>r.comment).slice(0,3);
  if(!top.length)ht.appendChild(el("div","empty","No ratings yet. Be the first!")).style.gridColumn="1/-1";
  top.forEach(r=>ht.appendChild(reviewCard(r,true)));
}

function gate(){const ok=!!session;$("gate").hidden=ok;$("submit").disabled=!ok||!state.score}

function fill(r){
  $("name").value=r.name||"";$("comment").value=r.comment||"";
  state.score=r.score;[...sc.children].forEach((x,j)=>x.classList.toggle("on",j===r.score-1));
  const rows=$("cats").children;
  CATS.forEach(([k],i)=>{const n=(r.cats||{})[k]||0;if(n){state.cats[k]=n;[...rows[i].querySelector(".stars").children].forEach((x,j)=>x.classList.toggle("on",j<n))}});
  state.tags=new Set(r.tags||[]);
  [...$("chips").children].forEach(b=>b.classList.toggle("on",state.tags.has(b.textContent)));
}

async function loadReviews(){
  if(!sb)return;
  const r=await sb.from("public_reviews").select("id,name,score,cats,tags,comment,created_at").order("created_at",{ascending:false}).limit(1000);
  if(r.error){console.error(r.error);return}
  reviews=r.data.map(x=>({name:x.name,score:x.score,cats:x.cats||{},tags:x.tags||[],comment:x.comment,ts:Date.parse(x.created_at)}));
  render();
}

async function afterAuth(){
  mine=null;gate();
  if(!session)return;
  const r=await sb.from("site_reviews").select("*").eq("user_id",session.user.id).maybeSingle();
  if(r.data){mine=r.data;fill(mine);gate();$("msg").className="msg";$("msg").textContent="You've already rated Wingman. Submitting again updates your rating."}
}

$("submit").onclick=async()=>{
  const btn=$("submit"),msg=$("msg");
  if(!sb||!session){gate();return}
  const rev={name:$("name").value.trim().slice(0,40),score:state.score,cats:{...state.cats},tags:[...state.tags],comment:$("comment").value.trim().slice(0,600)};
  btn.disabled=true;msg.className="msg";msg.textContent="Sending...";
  try{
    const r=mine?await sb.from("site_reviews").update(rev).eq("id",mine.id).select("*").single()
                :await sb.from("site_reviews").insert({...rev,user_id:session.user.id}).select("*").single();
    if(r.error)throw r.error;
    const was=!!mine;mine=r.data;
    msg.className="msg ok";msg.textContent=was?"Updated! Your rating has been changed.":"Thanks! Your rating is in.";
    await loadReviews();
  }catch(e){
    console.error(e);
    msg.textContent=e&&e.code==="23505"?"You've already rated. Reload the page to edit your rating.":"Couldn't save that. Try again in a moment.";
  }
  gate();
};

route();render();
(async()=>{
  const C=window.WINGMAN_CONFIG;
  if(!C||!C.supabaseUrl||!C.supabaseAnonKey||!window.supabase){$("msg").textContent="Ratings are temporarily unavailable.";$("submit").disabled=true;return}
  sb=window.supabase.createClient(C.supabaseUrl,C.supabaseAnonKey);
  try{const g=await sb.auth.getSession();session=g.data.session}catch(e){session=null}
  sb.auth.onAuthStateChange((ev,s)=>{const prev=session&&session.user.id;session=s;if((s&&s.user.id)!==prev)setTimeout(afterAuth,0)});
  gate();loadReviews();afterAuth();
  setInterval(()=>{if(!document.hidden)loadReviews()},30000);
})();
