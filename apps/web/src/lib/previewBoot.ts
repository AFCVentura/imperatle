// Dev only: lets /dev/visual show the real pages with other outline widths,
// text weights and colours side by side. Reads ?pv=box:1,pill:1,div:1,fw:500,
// muted:new,line:2,blank:new,theme:light (kept in sessionStorage so links
// inside the frame keep it) and sets the matching CSS variables on <html>.
// The layout only renders it outside production.
export const PREVIEW_BOOT_SCRIPT = `(function(){
var K="imperatle:pv",raw=new URLSearchParams(location.search).get("pv");
try{if(raw!==null)sessionStorage.setItem(K,raw);else raw=sessionStorage.getItem(K);}catch(e){}
if(!raw)return;
var o={};raw.split(",").forEach(function(p){var i=p.indexOf(":");if(i>0)o[p.slice(0,i)]=p.slice(i+1);});
var h=document.documentElement,s=h.style;
if(o.theme==="light"||o.theme==="dark")h.dataset.theme=o.theme;
var W={main:[400,400,500,600],"500":[500,500,600,700],"600":[600,600,700,700],"700":[700,700,700,700]};
function apply(){
  var dark=h.dataset.theme==="dark";
  ["box","pill","div"].forEach(function(k){if(o[k])s.setProperty("--bw-"+k,o[k]+"px");});
  var w=W[o.fw];if(w){s.setProperty("--fw-body",w[0]);s.setProperty("--fw-normal",w[1]);s.setProperty("--fw-medium",w[2]);s.setProperty("--fw-semibold",w[3]);}
  if(o.muted)s.setProperty("--muted",o.muted==="old"?(dark?"#bb9457":"#99582a"):(dark?"#c9a263":"#8a4d23"));
  if(o.line){var L=dark?[0.14,0.18,0.22,0.26]:[0.3,0.35,0.45,0.55],a=L[+o.line];if(a!==undefined)s.setProperty("--line",dark?"rgb(255 230 167 / "+a+")":"rgb(153 88 42 / "+a+")");}
  if(o.blank)s.setProperty("--map-blank",dark||o.blank==="old"?"var(--map)":"var(--map-ocean)");
}
apply();window.addEventListener("imperatle:theme",apply);
})();`;
