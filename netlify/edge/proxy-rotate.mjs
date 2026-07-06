// NOVA Proxy Rotate v10.1 — Validação robusta de URL

const APIS = {
  proxyscrape: "https://api.proxyscrape.com/v4/free-proxy-list/get?request=display_proxies&proxy_format=protocolipport&format=text",
  geonode: "https://proxylist.geonode.com/api/proxy-list?limit=500&sort_by=responseTime&sort_type=asc",
  proxifly: "https://api.proxifly.dev/get-proxy"
};

function isValidProxy(str) {
  if (!str || typeof str !== "string") return false;
  try {
    const url = new URL(str.trim());
    return (url.protocol === "http:" || url.protocol === "https:") && url.port && url.port !== "0";
  } catch {
    return false;
  }
}

export default async () => {
  const results = { proxyscrape: [], geonode: [], proxifly: [], errors: [] };
  
  try {
    const c = new AbortController();
    setTimeout(() => c.abort(), 8000);
    const r = await fetch(APIS.proxyscrape, { signal: c.signal });
    const text = await r.text();
    results.proxyscrape = text.split("\n")
      .map(l => l.trim())
      .filter(l => l.includes("://"))
      .filter(isValidProxy);
  } catch (e) {
    results.errors.push("proxyscrape: " + e.message);
  }
  
  try {
    const c = new AbortController();
    setTimeout(() => c.abort(), 8000);
    const r = await fetch(APIS.geonode, { signal: c.signal });
    const d = await r.json();
    if (d.data && Array.isArray(d.data)) {
      for (const p of d.data) {
        const proto = Array.isArray(p.protocols) ? p.protocols[0] : "http";
        if (p.ip && p.port) {
          const url = `${proto}://${p.ip}:${p.port}`;
          if (isValidProxy(url)) results.geonode.push(url);
        }
      }
    }
  } catch (e) {
    results.errors.push("geonode: " + e.message);
  }
  
  try {
    const c = new AbortController();
    setTimeout(() => c.abort(), 8000);
    const r = await fetch(APIS.proxifly, { signal: c.signal });
    const d = await r.json();
    const entries = Array.isArray(d) ? d : [d];
    for (const e of entries) {
      if (e && typeof e === "object") {
        const ip = e.ip || (e.proxy ? e.proxy.split(":")[0] : "");
        const port = e.port || (e.proxy ? e.proxy.split(":")[1] : "");
        const proto = e.protocol || "http";
        if (ip && port) {
          const url = `${proto}://${ip}:${port}`;
          if (isValidProxy(url)) results.proxifly.push(url);
        }
      }
    }
  } catch (e) {
    results.errors.push("proxifly: " + e.message);
  }
  
  const all = [...new Set([...results.proxyscrape, ...results.geonode, ...results.proxifly])];
  
  return new Response(JSON.stringify({
    status: "ready",
    total: all.length,
    proxies: all,
    sources: {
      proxyscrape: results.proxyscrape.length,
      geonode: results.geonode.length,
      proxifly: results.proxifly.length
    },
    errors: results.errors
  }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
};
