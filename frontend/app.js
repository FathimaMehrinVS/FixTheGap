function goTo(page) {
  window.location.href = page + '.html';
}

function initNav(activePage) {
  const logo = document.querySelector('.nav-logo');
  if (logo) logo.addEventListener('click', () => goTo('home'));
  document.querySelectorAll('.nav-link').forEach((el) => {
    const page = el.dataset.page;
    el.classList.toggle('active', page === activePage);
    el.addEventListener('click', () => goTo(page));
  });
  const cta = document.querySelector('.nav-cta');
  if (cta) cta.addEventListener('click', () => goTo('simulation'));
}

function animateHome() {
  const b1 = document.getElementById('demoBar1');
  const b2 = document.getElementById('demoBar2');
  if (!b1 || !b2) return;
  setTimeout(() => {
    b1.style.width = '100%';
    b2.style.width = '83%';
  }, 200);
}

function checkForm() {
  const role = document.getElementById('fRole')?.value;
  const location = document.getElementById('fLocation')?.value;
  const industry = document.getElementById('fIndustry')?.value;
  const btn = document.getElementById('submitBtn');
  if (btn) btn.disabled = !(role && location && industry);
}

function computeSalary(role, location, experience, gender) {
  const bases = {
    'Software Engineer': 120000,
    'Senior Software Engineer': 160000,
    'Staff Engineer': 195000,
    'Principal Engineer': 230000,
    'Product Manager': 135000,
    'Senior PM': 170000,
    'Data Scientist': 145000,
    'ML Engineer': 175000,
    'UX Designer': 110000,
    'Engineering Manager': 185000,
    'Director of Engineering': 235000,
    'CTO / VP Engineering': 285000
  };
  const locMult = {
    'San Francisco, CA': 1.25,
    'New York, NY': 1.2,
    'Seattle, WA': 1.18,
    'Austin, TX': 1.04,
    'Boston, MA': 1.12,
    'Chicago, IL': 1.06,
    'Los Angeles, CA': 1.14,
    'Denver, CO': 1.05,
    'Remote (US)': 1.0
  };
  const base = bases[role] || 140000;
  const mult = locMult[location] || 1;
  const market = Math.round((base * mult + Number(experience) * 2000) / 500) * 500;
  const gapMap = {
    Female: 0.12 + Math.random() * 0.07,
    Male: 0.005,
    'Non-binary': 0.07 + Math.random() * 0.05,
    '': 0.005
  };
  const gapPct = gapMap[gender] ?? 0.005;
  const adjusted = Math.round((market * (1 - gapPct)) / 500) * 500;
  return { market, adjusted, diff: market - adjusted, gapPct: (gapPct * 100).toFixed(1) };
}

const fmt = (n) => '$' + Number(n).toLocaleString();
const API_BASE = window.FTG_API_BASE || 'http://127.0.0.1:8000';

function mapRoleToBackend(role) {
  const r = (role || '').toLowerCase();
  if (r.includes('data scientist')) return 'Data Scientist';
  if (r.includes('ml') || r.includes('machine learning')) return 'Machine Learning Engineer';
  if (r.includes('data')) return 'Data Analyst';
  return 'Data Analyst';
}

function mapGenderToBackend(gender) {
  return (gender || '').toLowerCase() === 'female' ? 'female' : 'male';
}

function mapLocationToBackend(location) {
  if (!location) return 'US';
  if (location.includes('(US)')) return 'US';
  return 'US';
}

async function fetchPrediction(payload) {
  const params = new URLSearchParams({
    gender: mapGenderToBackend(payload.gender),
    role: mapRoleToBackend(payload.role),
    experience: String(payload.experience),
    location: mapLocationToBackend(payload.location)
  });

  const res = await fetch(`${API_BASE}/predict?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' }
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status}`);
  }

  const data = await res.json();
  if (data.error) {
    throw new Error(data.error);
  }

  const predicted = Number(data.predicted_salary) || 0;
  const adjusted = Number(data.gender_adjusted_salary) || predicted;
  const payGap = Number(data.pay_gap);
  const diff = Number.isFinite(payGap) ? payGap : Math.max(predicted - adjusted, 0);
  const marketFromApi = Number(data?.tavily_data?.average_salary);
  const market = Number.isFinite(marketFromApi) && marketFromApi > 0 ? marketFromApi : predicted;
  const gapPct = predicted > 0 ? ((diff / predicted) * 100).toFixed(1) : '0.0';

  return {
    result: {
      market,
      adjusted,
      diff,
      gapPct,
      predicted
    },
    source: data?.tavily_data?.source || 'API',
    backendRole: mapRoleToBackend(payload.role)
  };
}

function setSubmitting(isSubmitting) {
  const submit = document.getElementById('submitBtn');
  if (!submit) return;
  submit.disabled = isSubmitting;
  submit.textContent = isSubmitting ? 'Calculating...' : 'Calculate My Worth ↗';
}

async function runSimulation() {
  const payload = {
    role: document.getElementById('fRole').value,
    location: document.getElementById('fLocation').value,
    industry: document.getElementById('fIndustry').value,
    experience: document.getElementById('fExp').value,
    gender: document.getElementById('fGender').value
  };

  try {
    setSubmitting(true);
    const apiData = await fetchPrediction(payload);
    payload.result = apiData.result;
    payload.apiSource = apiData.source;
    payload.backendRole = apiData.backendRole;
  } catch (err) {
    payload.result = computeSalary(payload.role, payload.location, payload.experience, payload.gender);
    payload.apiSource = 'Local fallback';
    payload.backendRole = null;
    console.error('Simulation API call failed, used fallback:', err);
  } finally {
    setSubmitting(false);
  }

  sessionStorage.setItem('ftgResults', JSON.stringify(payload));
  goTo('results');
}

let resultsData = null;

function renderResults(role, location, industry, experience, r, isDemo, apiSource) {
  resultsData = r;
  document.getElementById('demoTag').style.display = isDemo ? 'inline-block' : 'none';
  const ctx = apiSource ? `${role} - ${location} - ${experience} yrs - ${industry} - Source: ${apiSource}` : `${role} - ${location} - ${experience} yrs - ${industry}`;
  document.getElementById('resCtx').textContent = ctx;
  document.getElementById('rMarket').textContent = fmt(r.market);
  document.getElementById('rAdjusted').textContent = fmt(r.adjusted);

  const hasGap = r.diff > 2000;
  if (hasGap) {
    document.getElementById('rGap').textContent = `-${r.gapPct}%`;
    document.getElementById('rGapSub').textContent = `~ ${fmt(r.diff)} less/yr`;
    document.getElementById('rGap').className = 'sal-amt rose';
    document.getElementById('rAdjusted').className = 'sal-amt rose';
  } else {
    document.getElementById('rGap').textContent = '~ None';
    document.getElementById('rGapSub').textContent = 'Aligned with market';
    document.getElementById('rGap').className = 'sal-amt green';
    document.getElementById('rAdjusted').className = 'sal-amt green';
  }

  const alertEl = document.getElementById('resAlert');
  alertEl.className = hasGap ? 'al-warn' : 'al-ok';
  document.getElementById('alertTitle').textContent = hasGap ? `${r.gapPct}% Pay Gap Detected` : 'No Significant Gap Detected';
  document.getElementById('alertTitle').className = `al-title ${hasGap ? 'warn' : 'ok'}`;
  document.getElementById('alertBody').textContent = hasGap
    ? `Based on your role, location, and ${experience} years of experience, you may be earning approximately ${fmt(r.diff)} less per year than your male counterpart in ${location}.`
    : 'Your estimated salary aligns with market benchmarks for your role and location.';
  document.getElementById('alertBody').className = `al-body ${hasGap ? 'warn' : 'ok'}`;

  document.getElementById('cMarket').textContent = fmt(r.market);
  document.getElementById('cAdjusted').textContent = fmt(r.adjusted);
  document.getElementById('cGap').textContent = fmt(r.diff);
  document.getElementById('gapBarRow').style.display = hasGap ? 'flex' : 'none';
  document.getElementById('sEntry').textContent = fmt(Math.round(r.market * 0.66));
  document.getElementById('sMedian').textContent = fmt(Math.round(r.market * 0.85));
  document.getElementById('sMarket').textContent = fmt(r.market);
  document.getElementById('sSenior').textContent = fmt(Math.round(r.market * 1.38));
  document.getElementById('tipsCard').style.display = hasGap ? 'block' : 'none';
  const adjPct = Math.round((r.adjusted / r.market) * 100);
  const pctile = Math.round(adjPct * 0.6);
  document.getElementById('pctLabel').textContent = `You ~ ${pctile}th percentile`;
}

function animateResults() {
  if (!resultsData) return;
  const r = resultsData;
  const adjPct = Math.round((r.adjusted / r.market) * 100);
  const gapPct = Math.round((r.diff / r.market) * 100);
  const pctile = Math.round(adjPct * 0.6);
  setTimeout(() => {
    document.getElementById('cBar1').style.width = '100%';
    document.getElementById('cBar2').style.width = adjPct + '%';
    document.getElementById('cBar3').style.width = gapPct + '%';
    document.getElementById('pctBar').style.width = pctile + '%';
  }, 150);
}

function initSplash() {
  const splashBar = document.getElementById('splashBar');
  let splashProg = 0;
  const splashInterval = setInterval(() => {
    splashProg = Math.min(splashProg + 2, 100);
    splashBar.style.width = splashProg + '%';
    if (splashProg >= 100) clearInterval(splashInterval);
  }, 56);
  setTimeout(() => goTo('home'), 3000);
}

function initSimulation() {
  const range = document.getElementById('fExp');
  const expVal = document.getElementById('expVal');
  const submit = document.getElementById('submitBtn');
  range.addEventListener('input', () => {
    expVal.textContent = range.value;
  });
  ['fRole', 'fLocation', 'fIndustry'].forEach((id) =>
    document.getElementById(id).addEventListener('change', checkForm)
  );
  submit.addEventListener('click', runSimulation);
}

function initResults() {
  const stored = sessionStorage.getItem('ftgResults');
  if (stored) {
    const data = JSON.parse(stored);
    renderResults(data.role, data.location, data.industry, data.experience, data.result, false, data.apiSource);
  } else {
    renderResults(
      'Senior Software Engineer',
      'San Francisco, CA',
      'Tech / Software',
      7,
      { market: 195000, adjusted: 167000, diff: 28000, gapPct: '14.4' },
      true,
      null
    );
  }
  animateResults();
}

document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  if (page !== 'splash') initNav(page);
  if (page === 'splash') initSplash();
  if (page === 'home') animateHome();
  if (page === 'simulation') initSimulation();
  if (page === 'results') initResults();
});
