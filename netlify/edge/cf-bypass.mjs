// NOVA CF Bypass v10.1 — Tokens limpos sem caracteres especiais

function randHex(n) {
  const c = "0123456789abcdef";
  let s = "";
  for (let i = 0; i < n; i++) s += c[Math.floor(Math.random() * 16)];
  return s;
}

function randIP() {
  return (1 + Math.floor(Math.random() * 223)) + "." + 
         Math.floor(Math.random() * 256) + "." + 
         Math.floor(Math.random() * 256) + "." + 
         (1 + Math.floor(Math.random() * 254));
}

export default async () => {
  return new Response(JSON.stringify({
    status: "ready",
    tokens: {
      turnstile: "0." + randHex(120) + "." + randHex(32),
      cf_clearance: randHex(40),
      uam: "uam_" + randHex(64),
      ray: randHex(16)
    },
    headers: {
      "CF-Visitor": '{"scheme":"https"}',
      "X-Forwarded-Proto": "https",
      "sec-ch-ua": '"Not.A/Brand";v="99"',
      "sec-ch-ua-mobile": "?0"
    },
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    ip: randIP()
  }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
};
