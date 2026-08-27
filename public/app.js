const toast = document.querySelector('#toast');
let toastTimer;
let pendingAuthAction = null;
let pendingIssue = '';
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 4200);
}

document.querySelector('#joinCase')?.addEventListener('click', (event) => {
  const caseNumber = document.querySelector('#caseNumber');
  if (!caseNumber || !caseNumber.value.trim()) {
    showToast('Enter the case number before adding your support.');
    caseNumber?.focus();
    return;
  }
  pendingAuthAction = 'support';
  openAuth('signin');
  showToast('Confirm your mobile number to add your name.');
});

document.querySelector('#reportForm')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const issue = document.querySelector('#issue').value.trim();
  if (!issue) { showToast('Please describe what happened first.'); return; }
  pendingIssue = issue;
  /* The grievance goes through sessionStorage, never the URL. A URL lands in browser
     history, server access logs and referrer headers, and this text is personal data. */
  try { sessionStorage.setItem('ekawaaz.handoff', issue); } catch (e) {}
  window.location.href = '/report';
});

/* The speak-instead control is built by voice.js and owns its own clicks. This used to bind
   '.voice-button', which no longer exists, and the resulting null threw here — silently
   aborting the rest of app.js, including openAuth(). */

const authOverlay = document.querySelector('#authOverlay');
const signInForm = document.querySelector('#signInForm');
const signUpForm = document.querySelector('#signUpForm');
document.querySelector('.auth-tabs').style.display = 'none';
signInForm.innerHTML = '<div class="form-section-title">Mobile verification</div><label for="loginMobile">Mobile number</label><input id="loginMobile" type="tel" inputmode="tel" placeholder="Enter your mobile number" required /><p class="auth-note">We use your mobile number to verify access and send case updates. No password is required.</p><button class="button primary" type="submit">Send OTP <span>→</span></button>';
signUpForm.innerHTML = '<div class="form-section-title">Mobile verification</div><label for="signupMobile">Mobile number</label><input id="signupMobile" type="tel" inputmode="tel" placeholder="Enter your mobile number" required /><p class="auth-note">We use your number for OTP verification and case updates. No password, name, gender, or address is required to create an account.</p><button class="button primary" type="submit">Send mobile OTP <span>→</span></button>';
function openAuth(mode = 'signin') {
  authOverlay.classList.add('open');
  authOverlay.setAttribute('aria-hidden', 'false');
  (mode === 'signup' ? document.querySelector('#signUpTab') : document.querySelector('#signInTab')).click();
}
function closeAuth() { authOverlay.classList.remove('open', 'signup-mode'); authOverlay.setAttribute('aria-hidden', 'true'); }

const routingRules = [
  { keywords: ['road', 'pothole', 'street', 'drain', 'village'], office: 'Block Development Officer, Rajnagar block', route: 'A village road is the Panchayat’s job, so this does not go to Delhi.', remedy: '34 households have already reported this road — add your name instead of filing a new case.' },
  { keywords: ['pf', 'provident', 'epf', 'uan', 'pension', 'employer'], office: 'EPFO grievance officer', route: 'EPFiGMS → regional PF office', remedy: 'If unresolved, the EPF escalation and appeal route may apply.' },
  { keywords: ['bank', 'debit', 'transaction', 'upi', 'fraud', 'account', 'loan'], office: 'Bank nodal officer', route: 'Bank complaint → RBI Ombudsman after 30 days', remedy: 'The RBI Integrated Ombudsman Scheme may be a stronger next remedy.' },
  { keywords: ['ration', 'food', 'pds', 'wheat', 'rice'], office: 'District Grievance Redressal Officer', route: 'State ration department → food law grievance officer', remedy: 'The food law gives you a district officer who must answer.' }
];

function analyseIssue(text) {
  const lower = text.toLowerCase();
  const matches = routingRules.map((rule) => ({ rule, hits: rule.keywords.filter((keyword) => lower.includes(keyword)) })).filter((item) => item.hits.length).sort((a, b) => b.hits.length - a.hits.length);
  return matches[0] || { rule: { office: 'District grievance office', route: 'Location-based routing', remedy: 'We need one more detail to identify the strongest route.' }, hits: [] };
}

function showAnalysis(text) {
  let overlay = document.querySelector('#analysisOverlay');
  if (!overlay) {
    overlay = document.createElement('section');
    overlay.id = 'analysisOverlay';
    overlay.className = 'analysis-overlay';
    document.body.appendChild(overlay);
  }
  const result = analyseIssue(text);
  overlay.innerHTML = `<div class="analysis-card" role="dialog" aria-modal="true" aria-labelledby="analysisTitle"><button class="analysis-close" type="button" aria-label="Close analysis">×</button><div class="analysis-head"><span class="ai-mark">✦</span><div><p class="eyebrow">Ek Awaaz assistant</p><h2 id="analysisTitle">Let’s find the right route.</h2></div></div><div class="chat-thread"><div class="chat-bubble user-bubble">${text.replace(/[<>]/g, '')}</div><div class="chat-bubble ai-bubble analyzing">Analyzing grievance<span class="analysis-dots">...</span></div><div class="analysis-result hidden"><div class="match-label">Suggested route</div><h3>${result.rule.office}</h3><p>${result.rule.route}</p><div class="route-summary"><span>${result.rule.remedy}</span></div><button class="button primary analysis-submit" type="button">Review and submit <span>→</span></button></div></div></div>`;
  overlay.classList.add('open');
  setTimeout(() => { overlay.querySelector('.analyzing').classList.add('hidden'); overlay.querySelector('.analysis-result').classList.remove('hidden'); }, 1000);
  overlay.querySelector('.analysis-close').addEventListener('click', () => overlay.classList.remove('open'));
  overlay.querySelector('.analysis-submit').addEventListener('click', () => { overlay.classList.remove('open'); pendingAuthAction = 'submit'; openAuth('signin'); });
}

function followupFor(text) {
  const lower = text.toLowerCase();
  if (/road|pothole|street|drain|village|electricity|water/.test(lower)) return { label: 'Location of the issue', question: 'Where is this issue located? Please share the village, ward, town, or district.', placeholder: 'Example: Rajnagar Ward 4, Patna district' };
  if (/aadhaar|aadhar|pan|passport|voter|driving licence|government id|id card/.test(lower)) return { label: 'Document details', question: 'Which government ID or document is affected, and what went wrong?', placeholder: 'Example: Aadhaar address update is pending' };
  if (/irctc|train|rail|pnr|ticket|station/.test(lower)) return { label: 'Journey details', question: 'What is your PNR or train and journey date? This helps us route the railway issue correctly.', placeholder: 'Example: PNR 4123456789, 18 August' };
  if (/tax|income|itr|refund|gst|filing/.test(lower)) return { label: 'Filing details', question: 'Which tax year or filing reference is this about, and when did you file it?', placeholder: 'Example: ITR for FY 2024–25, filed 20 July' };
  if (/bank|debit|upi|transaction|loan|account/.test(lower)) return { label: 'Banking details', question: 'Which bank is involved, and when did you first complain to the bank?', placeholder: 'Example: SBI, complaint raised 34 days ago' };
  return { label: 'A little more detail', question: 'What location, office, date, or reference number would help us understand this issue better?', placeholder: 'Add any useful detail' };
}

function showFollowup(text) {
  try { sessionStorage.setItem('ekawaaz.handoff', text); } catch (e) {}
  window.location.href = '/report';
  return;
  const overlay = document.querySelector('#analysisOverlay');
  const prompt = followupFor(text);
  overlay.innerHTML = `<div class="analysis-card" role="dialog" aria-modal="true" aria-labelledby="followupTitle"><button class="analysis-close" type="button" aria-label="Close assistant">×</button><div class="analysis-head"><span class="ai-mark">✦</span><div><p class="eyebrow">Ek Awaaz assistant</p><h2 id="followupTitle">A couple of details will help.</h2></div></div><div class="chat-thread"><div class="chat-bubble user-bubble">${text.replace(/[<>]/g, '')}</div><div class="chat-bubble ai-bubble"><b>${prompt.label}</b><br />${prompt.question}</div><form class="followup-form"><input aria-label="Your answer" placeholder="${prompt.placeholder}" required /><button class="button primary" type="submit">Continue <span>→</span></button></form></div></div>`;
  overlay.classList.add('open');
  overlay.querySelector('.analysis-close').addEventListener('click', () => overlay.classList.remove('open'));
  overlay.querySelector('.followup-form').addEventListener('submit', (event) => { event.preventDefault(); const answer = event.target.querySelector('input').value.trim(); overlay.classList.remove('open'); showAnalysis(`${text} Additional detail: ${answer}`); });
}

const myGrievances = document.createElement('button');
myGrievances.type = 'button';
myGrievances.className = 'my-grievances';
myGrievances.textContent = 'My grievances';
myGrievances.addEventListener('click', () => openAuth('signin'));
document.querySelector('.account-actions').prepend(myGrievances);

const caseNumberField = document.createElement('div');
caseNumberField.className = 'case-number-field';
caseNumberField.innerHTML = '<label for="caseNumber">Already have a case?</label><span class="case-number-help">Enter the public grievance number to join it and show your support.</span><input id="caseNumber" type="text" placeholder="Enter public grievance number" /><span>One public case, many voices. Your identity stays protected.</span>';
document.querySelector('#joinCase').before(caseNumberField);
document.querySelector('#signIn')?.addEventListener('click', () => openAuth('signin'));
document.querySelector('#signUp')?.addEventListener('click', () => openAuth('signup'));
document.querySelector('#authClose')?.addEventListener('click', closeAuth);
authOverlay.addEventListener('click', (event) => { if (event.target === authOverlay) closeAuth(); });
document.querySelector('#signInTab')?.addEventListener('click', () => {
  authOverlay.classList.remove('signup-mode');
  document.querySelector('#signInTab').classList.add('active'); document.querySelector('#signUpTab').classList.remove('active');
  signInForm.classList.remove('hidden'); signUpForm.classList.add('hidden'); document.querySelector('#authTitle').textContent = 'Verify your mobile number'; document.querySelector('.auth-subtitle').textContent = 'Use a one-time password to access your grievances.';
});
document.querySelector('#signUpTab')?.addEventListener('click', () => {
  authOverlay.classList.add('signup-mode');
  document.querySelector('#signUpTab').classList.add('active'); document.querySelector('#signInTab').classList.remove('active');
  signUpForm.classList.remove('hidden'); signInForm.classList.add('hidden'); document.querySelector('#authTitle').textContent = 'Create your account';
});
signInForm.addEventListener('submit', (event) => { event.preventDefault(); if (!signInForm.querySelector('#loginOtp')) { signInForm.innerHTML = '<div class="form-section-title">Enter verification code</div><label for="loginOtp">Mobile OTP</label><input id="loginOtp" type="text" inputmode="numeric" placeholder="Enter the 6-digit OTP" required /><p class="auth-note">This is a simulated OTP for the prototype.</p><button class="button primary" type="submit">Verify mobile <span>→</span></button>'; return; } const action = pendingAuthAction; pendingAuthAction = null; closeAuth(); if (action === 'submit') { showFollowup(pendingIssue); } else if (action === 'support') { showToast('Mobile verified. Your support can now be added to the case.'); } else { window.location.href = '/my-cases'; } });
signUpForm.addEventListener('submit', (event) => { event.preventDefault(); if (!signUpForm.querySelector('#signupOtp')) { signUpForm.innerHTML = '<div class="form-section-title">Enter verification code</div><label for="signupOtp">Mobile OTP</label><input id="signupOtp" type="text" inputmode="numeric" placeholder="Enter the 6-digit OTP" required /><p class="auth-note">This is a simulated OTP for the prototype.</p><button class="button primary" type="submit">Verify and continue <span>→</span></button>'; return; } const action = pendingAuthAction; pendingAuthAction = null; closeAuth(); if (action === 'submit') showFollowup(pendingIssue); else showToast('Account verified.'); });
document.querySelector('#forgotPassword')?.addEventListener('click', () => showToast('Password recovery will send a mobile verification code.'));

document.querySelectorAll('.category-card').forEach((card) => {
  card.addEventListener('click', (event) => {
    if (event.target.closest('a')) return;
    document.querySelectorAll('.category-card').forEach((other) => { if (other !== card) other.classList.remove('expanded'); });
    card.classList.toggle('expanded');
  });
});

/* The metric carousel is optional. It was read without a null check, and one absent
   element there used to throw and silently kill every handler declared below it. */
if (document.querySelector('#metricsCarousel')) {
  const metricsCarousel = document.querySelector('#metricsCarousel');
  const metricTrack = metricsCarousel.querySelector('.metric-track');
  const metricStatus = document.querySelector('#metricStatus');
  const metricPages = metricTrack.querySelectorAll('.metric-page');
  const N = metricPages.length;
  metricTrack.appendChild(metricPages[0].cloneNode(true));
  metricTrack.style.transition = 'none';
  metricTrack.style.willChange = 'transform';

  let pos = 0;
  let aim = 0;
  let scrubbing = false;
  let idleAt = 0;
  let autoAt = performance.now() - 4201;
  let lastY = window.scrollY;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  function resetAutoClock() { autoAt = performance.now(); }

  document.querySelector('#metricPrev')?.addEventListener('click', () => { aim = clamp(Math.round(aim) - 1, 0, N); scrubbing = false; resetAutoClock(); });
  document.querySelector('#metricNext')?.addEventListener('click', () => { aim = clamp(Math.round(aim) + 1, 0, N); scrubbing = false; resetAutoClock(); });

  function animateMetrics(now) {
    const dy = window.scrollY - lastY;
    lastY = window.scrollY;

    if (Math.abs(dy) > 0.5) {
      aim = clamp(aim + dy * 0.0014, 0, N);
      scrubbing = true;
      idleAt = now;
      autoAt = now;
    } else if (scrubbing && now - idleAt > 420) {
      aim = Math.round(aim);
      scrubbing = false;
      autoAt = now;
    } else if (!scrubbing && now - autoAt > 4200) {
      aim = clamp(Math.round(aim) + 1, 0, N);
      autoAt = now;
    }

    pos += (aim - pos) * 0.032;

    if (aim >= N && Math.abs(aim - pos) < 0.002) {
      aim -= N;
      pos -= N;
    }

    metricTrack.style.transform = `translate3d(${-pos * (100 / (N + 1))}%, 0, 0)`;
    metricStatus.textContent = `${Math.min(N, Math.round(pos) + 1)} of ${N}`;
    requestAnimationFrame(animateMetrics);
  }

  requestAnimationFrame(animateMetrics);
}

// Category cards: droplet ripple from the click point.
document.querySelectorAll('.category-card').forEach((card) => {
  card.addEventListener('pointerdown', (event) => {
    const box = card.getBoundingClientRect();
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    [0, 150, 300].forEach((delay) => {
      const drop = document.createElement('span');
      drop.className = 'cat-ripple';
      drop.style.left = x + 'px';
      drop.style.top = y + 'px';
      drop.style.animationDelay = delay + 'ms';
      card.appendChild(drop);
      drop.addEventListener('animationend', () => drop.remove());
    });
  });
});

// Concerns carousel: page size follows the breakpoint (3 / 2 / 1 cards).
const concernTrack = document.querySelector('#concernTrack');
if (concernTrack) {
  const concernCards = concernTrack.querySelectorAll('.category-card').length;
  const concernPrev = document.querySelector('#concernPrev'), concernNext = document.querySelector('#concernNext'), concernStatus = document.querySelector('#concernStatus');
  let concernAt = 0;
  const perPage = () => window.matchMedia('(max-width: 640px)').matches ? 1 : window.matchMedia('(max-width: 1000px)').matches ? 2 : 3;
  const gap = () => window.matchMedia('(max-width: 1000px)').matches ? 16 : 20;
  function renderConcerns() {
    const pages = Math.ceil(concernCards / perPage());
    concernAt = Math.min(concernAt, pages - 1);
    concernTrack.style.transform = 'translate3d(calc(' + (-concernAt) + ' * (100% + ' + gap() + 'px)), 0, 0)';
    concernStatus.textContent = (concernAt + 1) + ' / ' + pages;
    concernPrev.disabled = concernAt === 0;
    concernNext.disabled = concernAt >= pages - 1;
  }
  concernPrev.addEventListener('click', () => { concernAt = Math.max(0, concernAt - 1); renderConcerns(); });
  concernNext.addEventListener('click', () => { concernAt = concernAt + 1; renderConcerns(); });
  window.addEventListener('resize', renderConcerns);
  renderConcerns();
}
