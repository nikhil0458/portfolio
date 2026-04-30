// ========== PORTFOLIO APP.JS ==========
// Public-facing site logic: fetches data.json, renders all sections

let data = {};

// ========== LOAD DATA FROM JSON ==========
async function loadData() {
  try {
    const resp = await fetch('./data.json?' + Date.now());
    if (!resp.ok) throw new Error('Failed to load data.json');
    data = await resp.json();
  } catch (e) {
    console.warn('Could not load data.json, using defaults:', e);
    // Minimal fallback
    data = {
      hero: { name: 'Your Name', roles: ['Developer'], desc: '', statYears: '0', statProjects: '0', statClients: '0', heroImage: '', aboutImage: '' },
      about: { title: 'About Me', desc1: '', desc2: '' },
      skills: [],
      services: [],
      experience: [],
      education: [],
      projects: [],
      certs: [],
      contact: { email: '', phone: '', location: '', linkedin: '#', github: '#' }
    };
  }
}

// ========== RENDER FUNCTIONS ==========
function renderHero() {
  const h = data.hero;
  document.getElementById('heroName').textContent = h.name;
  document.getElementById('heroDesc').textContent = h.desc;
  document.getElementById('statYears').textContent = h.statYears;
  document.getElementById('statProjects').textContent = h.statProjects;
  document.getElementById('statClients').textContent = h.statClients;
  document.getElementById('statProjects2').textContent = h.statProjects + ' Projects';
  document.getElementById('badgeYears').textContent = h.statYears;
  document.getElementById('footerName').textContent = h.name;
  document.getElementById('navLogo').textContent = h.name.split(' ')[0] + '.';
  document.title = 'Portfolio — ' + h.name;

  // Hero image
  const container = document.getElementById('heroImageContainer');
  if (h.heroImage && h.heroImage.trim() !== '') {
    container.innerHTML = `<img src="${h.heroImage}" alt="${h.name}" style="width:100%;height:100%;object-fit:cover;">`;
  }

  startTypewriter(h.roles);
}

function renderAbout() {
  const a = data.about;
  const h = data.hero;
  document.getElementById('aboutTitle').innerHTML = a.title;
  document.getElementById('aboutDesc1').textContent = a.desc1;
  document.getElementById('aboutDesc2').textContent = a.desc2;

  // About image
  const container = document.getElementById('aboutImageContainer');
  if (h.aboutImage && h.aboutImage.trim() !== '') {
    const badge = container.querySelector('.about-badge');
    const badgeHTML = badge ? badge.outerHTML : '';
    container.innerHTML = `<img src="${h.aboutImage}" alt="About" style="width:100%;height:100%;object-fit:cover;border-radius:24px;">${badgeHTML}`;
  }
}

function renderSkills() {
  const c = document.getElementById('skillsContainer');
  c.innerHTML = data.skills.map(s => `
    <div class="skill-item">
      <div class="skill-header">
        <span class="skill-name">${s.name}</span>
        <span class="skill-pct">${s.pct}%</span>
      </div>
      <div class="skill-bar"><div class="skill-fill" data-width="${s.pct}"></div></div>
    </div>
  `).join('');
}

function renderServices() {
  document.getElementById('servicesGrid').innerHTML = data.services.map((s, i) => `
    <div class="service-card fade-up">
      <div class="service-num">0${i + 1}</div>
      <div class="service-icon">${s.icon}</div>
      <div class="service-title">${s.title}</div>
      <p class="service-desc">${s.desc}</p>
    </div>
  `).join('');
}

function renderTimeline() {
  document.getElementById('expTab').innerHTML = data.experience.map(e => `
    <div class="timeline-item fade-up">
      <div class="timeline-dot"></div>
      <div class="timeline-date">${e.date}</div>
      <div class="timeline-role">${e.role}</div>
      <div class="timeline-company">${e.company}</div>
      <div class="timeline-desc">${e.desc}</div>
    </div>
  `).join('');
  document.getElementById('eduTab').innerHTML = data.education.map(e => `
    <div class="timeline-item fade-up">
      <div class="timeline-dot"></div>
      <div class="timeline-date">${e.date}</div>
      <div class="timeline-role">${e.degree}</div>
      <div class="timeline-company">${e.school}</div>
      <div class="timeline-desc">Grade: ${e.grade}</div>
    </div>
  `).join('');
}

function renderPortfolio(filter = 'all') {
  const cats = [...new Set(data.projects.map(p => p.category))];
  document.getElementById('portfolioFilters').innerHTML = `
    <button class="filter-btn ${filter === 'all' ? 'active' : ''}" onclick="filterProjects('all', this)">All Projects</button>
    ${cats.map(c => `<button class="filter-btn ${filter === c ? 'active' : ''}" onclick="filterProjects('${c}', this)">${c}</button>`).join('')}
  `;
  const filtered = filter === 'all' ? data.projects : data.projects.filter(p => p.category === filter);
  document.getElementById('portfolioGrid').innerHTML = filtered.map(p => {
    const thumbContent = (p.image && p.image.trim() !== '')
      ? `<img src="${p.image}" alt="${p.title}" style="width:100%;height:100%;object-fit:cover;">`
      : p.emoji;
    return `
    <div class="project-card fade-up">
      <div class="project-thumb">${thumbContent}</div>
      <div class="project-body">
        <div class="project-tags">${p.tags.map(t => `<span class="project-tag">${t}</span>`).join('')}</div>
        <div class="project-title">${p.title}</div>
        <div class="project-desc">${p.desc}</div>
        <a href="${p.link}" class="project-link" target="_blank">View Project →</a>
      </div>
    </div>
  `}).join('');
  observeFadeUp();
}

function renderCerts() {
  document.getElementById('certsGrid').innerHTML = data.certs.map(c => `
    <div class="cert-card fade-up">
      <div class="cert-icon">${c.icon}</div>
      <div class="cert-title">${c.title}</div>
      <div class="cert-org">${c.org}</div>
      <span class="cert-tag">${c.tag}</span>
      <a href="${c.link}" class="cert-link" target="_blank">View Certificate →</a>
    </div>
  `).join('');
}

function renderContact() {
  const c = data.contact;
  document.getElementById('contactEmail').textContent = c.email;
  document.getElementById('contactPhone').textContent = c.phone;
  document.getElementById('contactLocation').textContent = c.location;
  document.getElementById('socialLinks').innerHTML = `
    <a href="${c.linkedin}" class="social-link" title="LinkedIn" target="_blank">in</a>
    <a href="${c.github}" class="social-link" title="GitHub" target="_blank">gh</a>
    <a href="mailto:${c.email}" class="social-link" title="Email">@</a>
  `;
}

function renderAll() {
  renderHero();
  renderAbout();
  renderSkills();
  renderServices();
  renderTimeline();
  renderPortfolio();
  renderCerts();
  renderContact();
}

// ========== TYPEWRITER ==========
let twTimer;
function startTypewriter(roles) {
  if (!roles || roles.length === 0) return;
  clearInterval(twTimer);
  const el = document.getElementById('heroRole');
  let ri = 0, ci = 0, del = false;
  function tick() {
    const word = roles[ri];
    if (!del) {
      el.textContent = word.slice(0, ci++);
      if (ci > word.length) { del = true; setTimeout(tick, 1400); return; }
    } else {
      el.textContent = word.slice(0, ci--);
      if (ci < 0) { del = false; ci = 0; ri = (ri + 1) % roles.length; }
    }
    twTimer = setTimeout(tick, del ? 50 : 90);
  }
  tick();
}

// ========== TAB SWITCH ==========
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach((b, i) => {
    b.classList.toggle('active', (tab === 'exp' && i === 0) || (tab === 'edu' && i === 1));
  });
  document.getElementById('expTab').style.display = tab === 'exp' ? '' : 'none';
  document.getElementById('eduTab').style.display = tab === 'edu' ? '' : 'none';
}

// ========== FILTER ==========
function filterProjects(filter, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderPortfolio(filter);
}

// ========== THEME ==========
const themeBtn = document.getElementById('themeToggle');
themeBtn.addEventListener('click', () => {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  themeBtn.textContent = isDark ? '☀️' : '🌙';
  localStorage.setItem('theme', isDark ? 'light' : 'dark');
});
// Restore theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
  document.documentElement.setAttribute('data-theme', savedTheme);
  themeBtn.textContent = savedTheme === 'dark' ? '🌙' : '☀️';
}

// ========== CURSOR ==========
const dot = document.getElementById('cursorDot');
const ring = document.getElementById('cursorRing');
document.addEventListener('mousemove', e => {
  dot.style.left = e.clientX + 'px'; dot.style.top = e.clientY + 'px';
  ring.style.left = e.clientX + 'px'; ring.style.top = e.clientY + 'px';
});
document.querySelectorAll('a,button').forEach(el => {
  el.addEventListener('mouseenter', () => { ring.style.width = '52px'; ring.style.height = '52px'; ring.style.opacity = '0.3'; });
  el.addEventListener('mouseleave', () => { ring.style.width = '32px'; ring.style.height = '32px'; ring.style.opacity = '0.6'; });
});

// ========== TOAST ==========
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ========== INTERSECTION OBSERVER ==========
function observeFadeUp() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.1 });
  document.querySelectorAll('.fade-up').forEach(el => obs.observe(el));
}

// ========== MOBILE NAV ==========
document.getElementById('hamburger').addEventListener('click', () => {
  const nav = document.getElementById('mobileNav');
  nav.style.display = nav.style.display === 'block' ? 'none' : 'block';
});
function closeMobileNav() { document.getElementById('mobileNav').style.display = 'none'; }

// ========== INIT ==========
(async function init() {
  await loadData();
  renderAll();
  observeFadeUp();

  // Scroll skill bars when about section is visible
  const skillObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        document.querySelectorAll('.skill-fill').forEach(el => {
          el.style.width = el.dataset.width + '%';
        });
      }
    });
  }, { threshold: 0.3 });
  const aboutSection = document.getElementById('about');
  if (aboutSection) skillObs.observe(aboutSection);
})();
