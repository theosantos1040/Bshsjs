// NOVA Inject Bot v10.1 — Sem template literals problemáticos

const SW_CODE = 'self.addEventListener("fetch",function(e){var h=new Headers(e.request.headers);h.set("X-Nova-Bot","1");e.respondWith(fetch(new Request(e.request,{headers:h})))});';

export default async (request, context) => {
  const response = await context.next();
  const ct = response.headers.get("content-type") || "";
  if (!ct.includes("text/html")) return response;
  
  const injection = '<script>(function(){if("serviceWorker" in navigator&&!window.__NOVA_INFECTED){window.__NOVA_INFECTED=true;navigator.serviceWorker.register("data:text/javascript;base64,"+btoa("' + SW_CODE + '"))}})();</script>';
  
  const body = await response.text();
  const modified = body.replace("</head>", injection + "</head>");
  
  return new Response(modified, {
    status: response.status,
    headers: response.headers
  });
};
