
const APP = { data: [], filtered: [], meta: {} };

function toNum(v){
  if(v===null || v===undefined || v==="") return null;
  const x = (typeof v==="number") ? v : Number(v);
  return Number.isFinite(x) ? x : null;
}
function uniq(arr){ return Array.from(new Set(arr)).sort(); }

function quantile(sorted, q){
  const n = sorted.length;
  if(n===0) return null;
  const pos = (n-1)*q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if(sorted[base+1] !== undefined){
    return sorted[base] + rest*(sorted[base+1]-sorted[base]);
  }
  return sorted[base];
}

async function loadDataset(){
  const badge = document.getElementById("badge");
  try{
    const res = await fetch("data/dataset.csv?v="+Date.now());
    if(!res.ok) throw new Error(`HTTP ${res.status} while fetching data/dataset.csv`);
    const txt = await res.text();
    const parsed = Papa.parse(txt, {header:true, dynamicTyping:true, skipEmptyLines:true});
    const rows = parsed.data || [];
    if(!rows.length) throw new Error("Parsed 0 rows. Check CSV header and content.");

    const data = rows.map(r=>({
      step: toNum(r.step) ?? null,
      env_type: (r.env_type ?? "Unknown") + "",
      vehicular_traffic: (r.vehicular_traffic ?? "Unknown") + "",
      noise_level: (r.noise_level ?? "Unknown") + "",
      co2_ppm: toNum(r.co2_ppm),
      landmark: (r.landmark ?? "") + "",
      time: (r.time ?? "") + ""
    })).filter(r=>r.step!==null).sort((a,b)=>a.step-b.step);

    APP.data = data;
    APP.meta.minStep = Math.min(...data.map(d=>d.step));
    APP.meta.maxStep = Math.max(...data.map(d=>d.step));
    if(badge) badge.textContent = `Loaded ${data.length} rows • steps ${APP.meta.minStep}–${APP.meta.maxStep}`;
    return data;
  }catch(err){
    if(badge) badge.textContent = "Dataset load failed";
    const box = document.getElementById("errorBox");
    if(box){
      box.style.display="block";
      box.innerHTML = `❌ <b>Could not load dataset</b><br>${err.message}<br><span class="code">Expected: data/dataset.csv</span>`;
    }
    throw err;
  }
}

function applyFilters({env="All", traffic="All", s=null, e=null}){
  const start = (s===null)? APP.meta.minStep : s;
  const end = (e===null)? APP.meta.maxStep : e;
  APP.filtered = APP.data.filter(d =>
    d.step>=start && d.step<=end &&
    (env==="All" || d.env_type===env) &&
    (traffic==="All" || d.vehicular_traffic===traffic)
  );
  return APP.filtered;
}

function downloadCSV(rows, filename="filtered.csv"){
  const headers = ["step","landmark","time","env_type","vehicular_traffic","noise_level","co2_ppm"];
  const csv = [headers.join(",")].concat(rows.map(r => headers.map(h=>{
    const v = (r[h] ?? "");
    const s = (""+v).replace(/"/g,'""');
    return (s.includes(",") || s.includes("\n")) ? `"${s}"` : s;
  }).join(","))).join("\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
