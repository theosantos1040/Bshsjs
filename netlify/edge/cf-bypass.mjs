const rand = (n) => Array(n).fill(0).map(() => '0123456789abcdef'[Math.floor(Math.random()*16)]).join('');
const randIP = () => `${1+Math.floor(Math.random()*223)}.${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*256)}.${1+Math.floor(Math.random()*254)}`;

export default async () => {
  return new Response(JSON.stringify({
    tokens: { turnstile: '0.'+rand(120)+'.'+rand(32), cf_clearance: rand(40), uam: 'uam_'+rand(64), ray: rand(16) },
    headers: { 'CF-Visitor': '{"scheme":"https"}', 'X-Forwarded-Proto': 'https', 'sec-ch-ua': '"Not.A/Brand";v="99"', 'sec-ch-ua-mobile': '?0' },
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    ip: randIP()
  }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
};
