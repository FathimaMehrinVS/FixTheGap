function goTo(page) {
  const current = window.location.pathname || '/';
  const base = current.endsWith('/') ? current : current.substring(0, current.lastIndexOf('/') + 1);
  window.location.assign(`${base}${page}.html`);
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
  // Keep this hook for future inline validation; do not block submit.
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
  return (role || '').trim();
}

function mapGenderToBackend(gender) {
  return (gender || '').toLowerCase() === 'female' ? 'female' : 'male';
}

function mapLocationToBackend(location) {
  if (!location) return 'US';
  // Prefer direct ISO-2 country codes from dropdown values.
  if (/^[A-Z]{2}$/.test(location)) return location;
  const codeMatch = location.match(/\(([A-Z]{2})\)$/);
  if (codeMatch) return codeMatch[1];
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

function safeSetSession(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`sessionStorage write failed for ${key}:`, e);
  }
}

async function runSimulation() {
  const role = document.getElementById('fRole')?.value?.trim() || '';
  const locationRaw = document.getElementById('fLocation')?.value?.trim() || '';
  const industry = document.getElementById('fIndustry')?.value?.trim() || '';
  const experience = document.getElementById('fExp')?.value?.trim() || '';
  const gender = document.getElementById('fGender')?.value?.trim() || '';
  const actualSalaryRaw = document.getElementById('fActualSalary')?.value?.trim() || '';
  const actualSalaryNum = Number(actualSalaryRaw);
  const actualSalary = Number.isFinite(actualSalaryNum) && actualSalaryNum > 0 ? actualSalaryNum : null;
  const location = mapLocationToBackend(locationRaw);

  if (!role || !locationRaw || !industry) {
    safeSetSession('ftgResults', { error: 'Please select Job Role, Location, and Industry.' });
    safeSetSession('ftgForm', {
      role,
      location: locationRaw || location,
      industry,
      experience,
      gender,
      actualSalary
    });
    goTo('results');
    return;
  }

  const params = new URLSearchParams({
    gender: mapGenderToBackend(gender),
    role,
    experience,
    location
  });

  try {
    setSubmitting(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(`${API_BASE}/predict?${params.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();

    if (data.error) {
      console.error('Backend error:', data.error);
      safeSetSession('ftgResults', { error: String(data.error) });
      safeSetSession('ftgForm', {
        role,
        location: locationRaw || location,
        industry,
        experience,
        gender,
        actualSalary
      });
      goTo('results');
      return;
    }

    // Store full backend response exactly as requested.
    safeSetSession('ftgResults', data);
    // Store form context separately for results page labels/context line.
    safeSetSession('ftgForm', {
      role,
      location: locationRaw || location,
      industry,
      experience,
      gender,
      actualSalary
    });

    goTo('results');
  } catch (err) {
    console.error('runSimulation network/timeout error:', err);
    safeSetSession('ftgResults', { error: 'Could not reach backend. Please try again.' });
    safeSetSession('ftgForm', {
      role,
      location: locationRaw || location,
      industry,
      experience,
      gender,
      actualSalary
    });
    goTo('results');
  } finally {
    setSubmitting(false);
    // Last-resort redirect guard: if still on simulation, push to results.
    if (window.location.pathname.toLowerCase().includes('simulation')) {
      setTimeout(() => {
        if (window.location.pathname.toLowerCase().includes('simulation')) {
          goTo('results');
        }
      }, 50);
    }
  }
}

let resultsData = null;

function renderResults(role, location, industry, experience, r, isDemo, apiSource, actualSalary) {
  const safe = {
    market: Number(r?.market) || 0,
    adjusted: Number(r?.adjusted) || 0,
    diff: Number(r?.diff) || 0,
    gapPct: r?.gapPct ?? '0.0',
    gapPctDisplay: r?.gapPctDisplay ?? null,
    gapSubText: r?.gapSubText ?? null
  };
  resultsData = safe;
  document.getElementById('demoTag').style.display = isDemo ? 'inline-block' : 'none';
  const ctx = apiSource ? `${role} - ${location} - ${experience} yrs - ${industry} - Source: ${apiSource}` : `${role} - ${location} - ${experience} yrs - ${industry}`;
  document.getElementById('resCtx').textContent = ctx;
  document.getElementById('rMarket').textContent = fmt(safe.market);
  document.getElementById('rAdjusted').textContent = fmt(safe.adjusted);

  const hasGap = safe.diff > 2000;
  if (hasGap) {
    document.getElementById('rGap').textContent = safe.gapPctDisplay || `-${safe.gapPct}%`;
    document.getElementById('rGapSub').textContent = safe.gapSubText || `~ ${fmt(safe.diff)} less/yr`;
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
    ? `Based on your role, location, and ${experience} years of experience, you may be earning approximately ${fmt(safe.diff)} less per year than your male counterpart in ${location}.`
    : 'Your estimated salary aligns with market benchmarks for your role and location.';
  document.getElementById('alertBody').className = `al-body ${hasGap ? 'warn' : 'ok'}`;

  document.getElementById('cMarket').textContent = fmt(safe.market);
  document.getElementById('cAdjusted').textContent = fmt(safe.adjusted);
  document.getElementById('cGap').textContent = fmt(safe.diff);
  document.getElementById('gapBarRow').style.display = hasGap ? 'flex' : 'none';
  document.getElementById('sEntry').textContent = fmt(Math.round(safe.market * 0.66));
  document.getElementById('sMedian').textContent = fmt(Math.round(safe.market * 0.85));
  document.getElementById('sMarket').textContent = fmt(safe.market);
  const actualRow = document.getElementById('sActualRow');
  const actualVal = Number(actualSalary);
  if (actualRow && Number.isFinite(actualVal) && actualVal > 0) {
    actualRow.style.display = 'flex';
    document.getElementById('sActual').textContent = fmt(actualVal);
  } else if (actualRow) {
    actualRow.style.display = 'none';
  }
  document.getElementById('sSenior').textContent = fmt(Math.round(safe.market * 1.38));
  document.getElementById('tipsCard').style.display = hasGap ? 'block' : 'none';
  const adjPct = safe.market > 0 ? Math.round((safe.adjusted / safe.market) * 100) : 0;
  const pctile = Math.round(adjPct * 0.6);
  document.getElementById('pctLabel').textContent = safe.market > 0 ? `You ~ ${pctile}th percentile` : 'You ~ N/A percentile';
}

function animateResults() {
  if (!resultsData) return;
  const r = resultsData;
  const adjPct = r.market > 0 ? Math.round((r.adjusted / r.market) * 100) : 0;
  const gapPct = r.market > 0 ? Math.round((r.diff / r.market) * 100) : 0;
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
  if (!range || !expVal || !submit) return;
  submit.type = 'button';
  submit.disabled = false;
  range.addEventListener('input', () => {
    expVal.textContent = range.value;
  });
  ['fRole', 'fLocation', 'fIndustry'].forEach((id) =>
    document.getElementById(id).addEventListener('change', checkForm)
  );
  if (!submit.dataset.bound) {
    submit.dataset.bound = '1';
    submit.addEventListener('click', (e) => {
      e.preventDefault();
      runSimulation();
    });
  }
}

function initResults() {
  const stored = sessionStorage.getItem('ftgResults');
  if (stored) {
    const data = JSON.parse(stored);
    const storedForm = sessionStorage.getItem('ftgForm');
    const form = storedForm
      ? JSON.parse(storedForm)
      : { role: 'Role', location: 'Location', industry: 'Industry', experience: 0 };

    // Explicit error payload path from simulation API.
    if (Object.prototype.hasOwnProperty.call(data, 'error')) {
      const fallback = { market: 0, adjusted: 0, diff: 0, gapPct: '0.0' };
      renderResults(
        form.role,
        form.location,
        form.industry,
        form.experience,
        fallback,
        false,
        'API',
        form.actualSalary
      );
      document.getElementById('alertTitle').textContent = 'Prediction Error';
      document.getElementById('alertBody').textContent = String(data.error);
      return;
    }

    // Support full backend response format.
    if (Object.prototype.hasOwnProperty.call(data, 'predicted_salary')) {
      const predicted = Number(data.predicted_salary) || 0;
      const adjusted = Number(data.gender_adjusted_salary) || predicted;
      const payGap = Number(data.pay_gap);
      const fallbackDiff = Number.isFinite(payGap) ? payGap : Math.max(predicted - adjusted, 0);
      const marketFromApi = Number(data?.tavily_data?.average_salary);
      const market = Number.isFinite(marketFromApi) && marketFromApi > 0 ? marketFromApi : predicted;
      const actualSalary = Number(form?.actualSalary);
      let diff = fallbackDiff;
      let gapPct = predicted > 0 ? ((diff / predicted) * 100).toFixed(1) : '0.0';
      let gapPctDisplay = null;
      let gapSubText = null;

      // If user provided actual salary, use actual-vs-predicted pay gap.
      if (Number.isFinite(actualSalary) && actualSalary > 0 && predicted > 0) {
        const pctActual = ((actualSalary - predicted) / predicted) * 100;
        const diffActual = actualSalary - predicted;
        diff = Math.abs(diffActual);
        gapPct = Math.abs(pctActual).toFixed(1);
        gapPctDisplay = `${pctActual.toFixed(1)}%`;
        gapSubText = `~ ${fmt(Math.abs(diffActual))} ${diffActual < 0 ? 'below' : 'above'} predicted`;
      }

      const normalized = { market, adjusted, diff, gapPct, gapPctDisplay, gapSubText };
      renderResults(
        form.role,
        form.location,
        form.industry,
        form.experience,
        normalized,
        false,
        data?.tavily_data?.source || 'API',
        form.actualSalary
      );
    } else {
      // Backward compatibility with earlier payload format.
      renderResults(
        data.role,
        data.location,
        data.industry,
        data.experience,
        data.result,
        false,
        data.apiSource,
        form.actualSalary
      );
    }
  } else {
    renderResults(
      'Senior Software Engineer',
      'San Francisco, CA',
      'Tech / Software',
      7,
      { market: 195000, adjusted: 167000, diff: 28000, gapPct: '14.4' },
      true,
      null,
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





