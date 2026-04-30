// ========== ADMIN.JS ==========
// GitHub API-based admin panel for portfolio management

const GITHUB_API = 'https://api.github.com';
let githubToken = '';
let githubRepo = '';  // "owner/repo"
let data = {};
let dataSHA = '';      // SHA of data.json for updates
let pendingImages = {}; // { hero: File, about: File, project: File }

// ========== AUTH ==========
function handleLogin() {
  const repo = document.getElementById('loginRepo').value.trim();
  const token = document.getElementById('loginToken').value.trim();
  const errorEl = document.getElementById('loginError');
  const btnText = document.getElementById('loginBtnText');
  const spinner = document.getElementById('loginSpinner');

  if (!repo || !token) {
    errorEl.textContent = 'Please fill in both fields';
    return;
  }
  if (!repo.includes('/')) {
    errorEl.textContent = 'Repo format should be: username/repo-name';
    return;
  }

  errorEl.textContent = '';
  btnText.style.display = 'none';
  spinner.style.display = '';

  // Validate token by checking repo access
  fetch(`${GITHUB_API}/repos/${repo}`, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  })
  .then(resp => {
    if (!resp.ok) throw new Error(resp.status === 401 ? 'Invalid token' : resp.status === 404 ? 'Repository not found' : 'Access denied');
    return resp.json();
  })
  .then(repoData => {
    if (!repoData.permissions || !repoData.permissions.push) {
      throw new Error('Token does not have write access to this repo');
    }

    // Auth success
    githubToken = token;
    githubRepo = repo;
    sessionStorage.setItem('gh_token', token);
    sessionStorage.setItem('gh_repo', repo);

    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminApp').style.display = 'flex';
    document.getElementById('repoBadge').textContent = repo;

    loadDataFromRepo();
  })
  .catch(err => {
    errorEl.textContent = '❌ ' + err.message;
    btnText.style.display = '';
    spinner.style.display = 'none';
  });
}

function handleLogout() {
  sessionStorage.removeItem('gh_token');
  sessionStorage.removeItem('gh_repo');
  githubToken = '';
  githubRepo = '';
  document.getElementById('adminApp').style.display = 'none';
  document.getElementById('loginScreen').style.display = '';
  document.getElementById('loginToken').value = '';
  document.getElementById('loginError').textContent = '';
}

// Check session on load
(function checkSession() {
  const token = sessionStorage.getItem('gh_token');
  const repo = sessionStorage.getItem('gh_repo');
  if (token && repo) {
    githubToken = token;
    githubRepo = repo;
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminApp').style.display = 'flex';
    document.getElementById('repoBadge').textContent = repo;
    loadDataFromRepo();
  }
})();

// Toggle password visibility
document.getElementById('togglePassword').addEventListener('click', () => {
  const input = document.getElementById('loginToken');
  input.type = input.type === 'password' ? 'text' : 'password';
});

// Enter key to login
document.getElementById('loginToken').addEventListener('keydown', e => {
  if (e.key === 'Enter') handleLogin();
});
document.getElementById('loginRepo').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('loginToken').focus();
});

// ========== GITHUB API HELPERS ==========
function githubHeaders() {
  return {
    'Authorization': `token ${githubToken}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  };
}

async function getFileFromRepo(path) {
  const resp = await fetch(`${GITHUB_API}/repos/${githubRepo}/contents/${path}`, {
    headers: githubHeaders()
  });
  if (resp.status === 404) return null;
  if (!resp.ok) throw new Error(`Failed to fetch ${path}: ${resp.status}`);
  return resp.json();
}

async function putFileToRepo(path, content, message, sha = null) {
  const body = {
    message: message,
    content: btoa(unescape(encodeURIComponent(content))),
    branch: 'main'
  };
  if (sha) body.sha = sha;

  const resp = await fetch(`${GITHUB_API}/repos/${githubRepo}/contents/${path}`, {
    method: 'PUT',
    headers: githubHeaders(),
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    // Try 'master' branch if 'main' fails
    body.branch = 'master';
    const resp2 = await fetch(`${GITHUB_API}/repos/${githubRepo}/contents/${path}`, {
      method: 'PUT',
      headers: githubHeaders(),
      body: JSON.stringify(body)
    });
    if (!resp2.ok) throw new Error(`Failed to save ${path}: ${resp2.status}`);
    return resp2.json();
  }
  return resp.json();
}

async function putBinaryFileToRepo(path, base64Content, message) {
  // Check if file exists to get SHA
  let sha = null;
  try {
    const existing = await getFileFromRepo(path);
    if (existing && existing.sha) sha = existing.sha;
  } catch (e) { /* file doesn't exist */ }

  const body = {
    message: message,
    content: base64Content,
    branch: 'main'
  };
  if (sha) body.sha = sha;

  const resp = await fetch(`${GITHUB_API}/repos/${githubRepo}/contents/${path}`, {
    method: 'PUT',
    headers: githubHeaders(),
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    body.branch = 'master';
    const resp2 = await fetch(`${GITHUB_API}/repos/${githubRepo}/contents/${path}`, {
      method: 'PUT',
      headers: githubHeaders(),
      body: JSON.stringify(body)
    });
    if (!resp2.ok) throw new Error(`Failed to upload ${path}: ${resp2.status}`);
    return resp2.json();
  }
  return resp.json();
}

// ========== LOAD DATA ==========
async function loadDataFromRepo() {
  try {
    const file = await getFileFromRepo('data.json');
    if (file) {
      dataSHA = file.sha;
      const content = decodeURIComponent(escape(atob(file.content.replace(/\n/g, ''))));
      data = JSON.parse(content);
    } else {
      // No data.json yet — use defaults
      data = getDefaultData();
      dataSHA = '';
    }
    populateAdmin();
    showToast('✅ Data loaded from repository', 'success');
  } catch (e) {
    console.error('Error loading data:', e);
    data = getDefaultData();
    populateAdmin();
    showToast('⚠ Could not load data.json — using defaults', 'error');
  }
}

function getDefaultData() {
  return {
    hero: { name: 'Your Name', roles: ['Developer'], desc: '', statYears: '0+', statProjects: '0+', statClients: '0+', heroImage: '', aboutImage: '' },
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

// ========== SAVE DATA ==========
async function saveDataToRepo() {
  try {
    const content = JSON.stringify(data, null, 2);

    // Get latest SHA to avoid conflicts
    const existing = await getFileFromRepo('data.json');
    if (existing) dataSHA = existing.sha;

    const result = await putFileToRepo('data.json', content, '📝 Update portfolio data via admin panel', dataSHA || undefined);
    dataSHA = result.content.sha;
    return true;
  } catch (e) {
    console.error('Save error:', e);
    showToast('❌ Failed to save: ' + e.message, 'error');
    return false;
  }
}

// ========== IMAGE HANDLING ==========
function handleImageSelect(type, input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  pendingImages[type] = file;

  // Show preview
  const reader = new FileReader();
  reader.onload = (e) => {
    if (type === 'hero') {
      document.getElementById('heroImagePreview').innerHTML = `<img src="${e.target.result}" alt="Hero preview">`;
    } else if (type === 'about') {
      document.getElementById('aboutImagePreview').innerHTML = `<img src="${e.target.result}" alt="About preview">`;
    }
  };
  reader.readAsDataURL(file);
  showToast(`📁 ${file.name} selected — click Upload to save`);
}

async function uploadImage(type) {
  const file = pendingImages[type];
  if (!file) {
    showToast('⚠ Please select a file first', 'error');
    return;
  }

  showToast('⬆ Uploading image...', 'success');

  try {
    const base64 = await fileToBase64(file);
    const ext = file.name.split('.').pop().toLowerCase();
    const timestamp = Date.now();
    let path = '';

    if (type === 'hero') {
      path = `images/hero_${timestamp}.${ext}`;
    } else if (type === 'about') {
      path = `images/about_${timestamp}.${ext}`;
    } else if (type === 'project') {
      path = `images/project_${timestamp}.${ext}`;
    }

    await putBinaryFileToRepo(path, base64, `🖼 Upload ${type} image via admin`);

    // Build raw URL
    const rawUrl = `https://raw.githubusercontent.com/${githubRepo}/main/${path}`;

    if (type === 'hero') {
      data.hero.heroImage = rawUrl;
      document.getElementById('heroImageUrl').value = rawUrl;
    } else if (type === 'about') {
      data.hero.aboutImage = rawUrl;
      document.getElementById('aboutImageUrl').value = rawUrl;
    } else if (type === 'project') {
      const idx = document.getElementById('projectImageTarget').value;
      if (idx !== '' && data.projects[idx]) {
        data.projects[idx].image = rawUrl;
      }
    }

    await saveDataToRepo();
    delete pendingImages[type];
    showToast('✅ Image uploaded & saved!', 'success');
  } catch (e) {
    console.error('Upload error:', e);
    // Try master branch URL
    showToast('❌ Upload failed: ' + e.message, 'error');
  }
}

function setImageUrl(type) {
  if (type === 'hero') {
    const url = document.getElementById('heroImageUrl').value.trim();
    if (!url) return;
    data.hero.heroImage = url;
    document.getElementById('heroImagePreview').innerHTML = `<img src="${url}" alt="Hero">`;
    saveDataToRepo().then(() => showToast('✅ Hero image URL saved!', 'success'));
  } else if (type === 'about') {
    const url = document.getElementById('aboutImageUrl').value.trim();
    if (!url) return;
    data.hero.aboutImage = url;
    document.getElementById('aboutImagePreview').innerHTML = `<img src="${url}" alt="About">`;
    saveDataToRepo().then(() => showToast('✅ About image URL saved!', 'success'));
  } else if (type === 'project') {
    const url = document.getElementById('projectImageUrl').value.trim();
    const idx = document.getElementById('projectImageTarget').value;
    if (!url || idx === '') return;
    data.projects[idx].image = url;
    saveDataToRepo().then(() => showToast('✅ Project image URL saved!', 'success'));
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ========== ADMIN NAVIGATION ==========
function adminNav(section, el) {
  document.querySelectorAll('.admin-nav-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  document.getElementById('admin-' + section).classList.add('active');

  // Refresh project dropdown when entering images
  if (section === 'images') {
    populateProjectDropdown();
    refreshImagePreviews();
  }
}

// ========== POPULATE ADMIN ==========
function populateAdmin() {
  const h = data.hero;
  document.getElementById('aHeroName').value = h.name || '';
  document.getElementById('aHeroRoles').value = (h.roles || []).join(', ');
  document.getElementById('aHeroDesc').value = h.desc || '';
  document.getElementById('aStatYears').value = h.statYears || '';
  document.getElementById('aStatProjects').value = h.statProjects || '';
  document.getElementById('aStatClients').value = h.statClients || '';

  const a = data.about || {};
  document.getElementById('aAboutTitle').value = (a.title || '').replace(/<[^>]*>/g, '');
  document.getElementById('aAboutDesc1').value = a.desc1 || '';
  document.getElementById('aAboutDesc2').value = a.desc2 || '';

  renderSkillsAdmin();
  renderServicesAdmin();
  renderExpAdmin();
  renderEduAdmin();
  renderProjectsAdmin();
  renderCertsAdmin();

  const c = data.contact || {};
  document.getElementById('aEmail').value = c.email || '';
  document.getElementById('aPhone').value = c.phone || '';
  document.getElementById('aLocation').value = c.location || '';
  document.getElementById('aLinkedin').value = c.linkedin || '';
  document.getElementById('aGithub').value = c.github || '';

  populateProjectDropdown();
  refreshImagePreviews();
}

function populateProjectDropdown() {
  const select = document.getElementById('projectImageTarget');
  if (!select) return;
  select.innerHTML = (data.projects || []).map((p, i) =>
    `<option value="${i}">${p.emoji || ''} ${p.title}</option>`
  ).join('');
}

function refreshImagePreviews() {
  const h = data.hero || {};
  if (h.heroImage) {
    document.getElementById('heroImagePreview').innerHTML = `<img src="${h.heroImage}" alt="Hero">`;
    document.getElementById('heroImageUrl').value = h.heroImage;
  }
  if (h.aboutImage) {
    document.getElementById('aboutImagePreview').innerHTML = `<img src="${h.aboutImage}" alt="About">`;
    document.getElementById('aboutImageUrl').value = h.aboutImage;
  }
}

// ========== SAVE FUNCTIONS ==========
async function saveHero() {
  data.hero = {
    ...data.hero,
    name: document.getElementById('aHeroName').value,
    roles: document.getElementById('aHeroRoles').value.split(',').map(s => s.trim()).filter(Boolean),
    desc: document.getElementById('aHeroDesc').value,
    statYears: document.getElementById('aStatYears').value,
    statProjects: document.getElementById('aStatProjects').value,
    statClients: document.getElementById('aStatClients').value
  };
  if (await saveDataToRepo()) showToast('✅ Hero section saved!', 'success');
}

async function saveAbout() {
  data.about = {
    title: document.getElementById('aAboutTitle').value,
    desc1: document.getElementById('aAboutDesc1').value,
    desc2: document.getElementById('aAboutDesc2').value
  };
  if (await saveDataToRepo()) showToast('✅ About section saved!', 'success');
}

// SKILLS
function renderSkillsAdmin() {
  document.getElementById('skillsList').innerHTML = (data.skills || []).map((s, i) => `
    <div class="admin-card-item">
      <div>
        <div class="aci-title">${s.name}</div>
        <div class="aci-sub">${s.pct}%</div>
      </div>
      <input type="range" min="0" max="100" value="${s.pct}" style="flex:1;accent-color:var(--accent)" oninput="data.skills[${i}].pct=+this.value;this.parentElement.querySelector('.aci-sub').textContent=this.value+'%'">
      <button class="aci-del" onclick="data.skills.splice(${i},1);renderSkillsAdmin()">✕</button>
    </div>
  `).join('');
}
function addSkill() {
  const name = prompt('Skill name?');
  if (!name) return;
  if (!data.skills) data.skills = [];
  data.skills.push({ name, pct: 80 });
  renderSkillsAdmin();
}
async function saveSkills() {
  if (await saveDataToRepo()) showToast('✅ Skills saved!', 'success');
}

// SERVICES
function renderServicesAdmin() {
  document.getElementById('servicesList').innerHTML = (data.services || []).map((s, i) => `
    <div class="admin-card-item" style="flex-direction:column;align-items:stretch">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
        <div class="aci-title">${s.icon} ${s.title}</div>
        <button class="aci-del" onclick="data.services.splice(${i},1);renderServicesAdmin()">✕</button>
      </div>
      <input class="admin-input" value="${s.icon}" placeholder="Emoji" oninput="data.services[${i}].icon=this.value">
      <input class="admin-input" style="margin-top:0.4rem" value="${s.title}" placeholder="Title" oninput="data.services[${i}].title=this.value">
      <textarea class="admin-textarea" style="margin-top:0.4rem;min-height:60px" oninput="data.services[${i}].desc=this.value">${s.desc}</textarea>
    </div>
  `).join('');
}
function addService() {
  if (!data.services) data.services = [];
  data.services.push({ icon: '✨', title: 'New Service', desc: 'Service description' });
  renderServicesAdmin();
}
async function saveServices() {
  if (await saveDataToRepo()) showToast('✅ Services saved!', 'success');
}

// EXPERIENCE
function renderExpAdmin() {
  document.getElementById('expList').innerHTML = (data.experience || []).map((e, i) => `
    <div class="admin-card-item" style="flex-direction:column;align-items:stretch">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
        <div class="aci-title">${e.role}</div>
        <button class="aci-del" onclick="data.experience.splice(${i},1);renderExpAdmin()">✕</button>
      </div>
      <input class="admin-input" placeholder="Date" value="${e.date}" oninput="data.experience[${i}].date=this.value">
      <input class="admin-input" style="margin-top:0.4rem" placeholder="Role" value="${e.role}" oninput="data.experience[${i}].role=this.value">
      <input class="admin-input" style="margin-top:0.4rem" placeholder="Company" value="${e.company}" oninput="data.experience[${i}].company=this.value">
      <textarea class="admin-textarea" style="margin-top:0.4rem;min-height:60px" oninput="data.experience[${i}].desc=this.value">${e.desc}</textarea>
    </div>
  `).join('');
}
function addExp() {
  if (!data.experience) data.experience = [];
  data.experience.unshift({ date: 'Year – Year', role: 'Job Title', company: 'Company', desc: 'Description' });
  renderExpAdmin();
}
async function saveExp() {
  if (await saveDataToRepo()) showToast('✅ Experience saved!', 'success');
}

// EDUCATION
function renderEduAdmin() {
  document.getElementById('eduList').innerHTML = (data.education || []).map((e, i) => `
    <div class="admin-card-item" style="flex-direction:column;align-items:stretch">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
        <div class="aci-title">${e.degree}</div>
        <button class="aci-del" onclick="data.education.splice(${i},1);renderEduAdmin()">✕</button>
      </div>
      <input class="admin-input" placeholder="Date" value="${e.date}" oninput="data.education[${i}].date=this.value">
      <input class="admin-input" style="margin-top:0.4rem" placeholder="Degree" value="${e.degree}" oninput="data.education[${i}].degree=this.value">
      <input class="admin-input" style="margin-top:0.4rem" placeholder="School" value="${e.school}" oninput="data.education[${i}].school=this.value">
      <input class="admin-input" style="margin-top:0.4rem" placeholder="Grade" value="${e.grade}" oninput="data.education[${i}].grade=this.value">
    </div>
  `).join('');
}
function addEdu() {
  if (!data.education) data.education = [];
  data.education.unshift({ date: 'Year – Year', degree: 'Degree Name', school: 'School Name', grade: '0.0' });
  renderEduAdmin();
}
async function saveEdu() {
  if (await saveDataToRepo()) showToast('✅ Education saved!', 'success');
}

// PROJECTS
function renderProjectsAdmin() {
  document.getElementById('projectsList').innerHTML = (data.projects || []).map((p, i) => `
    <div class="admin-card-item" style="flex-direction:column;align-items:stretch">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
        <div class="aci-title">${p.emoji} ${p.title}</div>
        <button class="aci-del" onclick="data.projects.splice(${i},1);renderProjectsAdmin()">✕</button>
      </div>
      <input class="admin-input" placeholder="Emoji" value="${p.emoji}" oninput="data.projects[${i}].emoji=this.value">
      <input class="admin-input" style="margin-top:0.4rem" placeholder="Title" value="${p.title}" oninput="data.projects[${i}].title=this.value">
      <input class="admin-input" style="margin-top:0.4rem" placeholder="Tags (comma separated)" value="${(p.tags || []).join(', ')}" oninput="data.projects[${i}].tags=this.value.split(',').map(s=>s.trim())">
      <input class="admin-input" style="margin-top:0.4rem" placeholder="Category" value="${p.category}" oninput="data.projects[${i}].category=this.value">
      <textarea class="admin-textarea" style="margin-top:0.4rem;min-height:60px" oninput="data.projects[${i}].desc=this.value">${p.desc}</textarea>
      <input class="admin-input" style="margin-top:0.4rem" placeholder="Link URL" value="${p.link}" oninput="data.projects[${i}].link=this.value">
      <input class="admin-input" style="margin-top:0.4rem" placeholder="Image URL (optional)" value="${p.image || ''}" oninput="data.projects[${i}].image=this.value">
    </div>
  `).join('');
}
function addProject() {
  if (!data.projects) data.projects = [];
  data.projects.push({ emoji: '🚀', title: 'New Project', tags: ['Tag'], category: 'Other', desc: 'Project description', link: '#', image: '' });
  renderProjectsAdmin();
}
async function saveProjects() {
  if (await saveDataToRepo()) showToast('✅ Projects saved!', 'success');
}

// CERTS
function renderCertsAdmin() {
  document.getElementById('certsList').innerHTML = (data.certs || []).map((c, i) => `
    <div class="admin-card-item" style="flex-direction:column;align-items:stretch">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
        <div class="aci-title">${c.icon} ${c.title}</div>
        <button class="aci-del" onclick="data.certs.splice(${i},1);renderCertsAdmin()">✕</button>
      </div>
      <input class="admin-input" placeholder="Emoji" value="${c.icon}" oninput="data.certs[${i}].icon=this.value">
      <input class="admin-input" style="margin-top:0.4rem" placeholder="Title" value="${c.title}" oninput="data.certs[${i}].title=this.value">
      <input class="admin-input" style="margin-top:0.4rem" placeholder="Organization" value="${c.org}" oninput="data.certs[${i}].org=this.value">
      <input class="admin-input" style="margin-top:0.4rem" placeholder="Tag" value="${c.tag}" oninput="data.certs[${i}].tag=this.value">
      <input class="admin-input" style="margin-top:0.4rem" placeholder="Certificate URL" value="${c.link}" oninput="data.certs[${i}].link=this.value">
    </div>
  `).join('');
}
function addCert() {
  if (!data.certs) data.certs = [];
  data.certs.push({ icon: '🏅', title: 'New Certificate', org: 'Issuer', tag: 'Field', link: '#' });
  renderCertsAdmin();
}
async function saveCerts() {
  if (await saveDataToRepo()) showToast('✅ Certifications saved!', 'success');
}

// CONTACT
async function saveContact() {
  data.contact = {
    email: document.getElementById('aEmail').value,
    phone: document.getElementById('aPhone').value,
    location: document.getElementById('aLocation').value,
    linkedin: document.getElementById('aLinkedin').value,
    github: document.getElementById('aGithub').value
  };
  if (await saveDataToRepo()) showToast('✅ Contact details saved!', 'success');
}

// ========== TOAST ==========
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (type ? ' ' + type : '');
  setTimeout(() => { t.className = 'toast'; }, 3500);
}
