/**
 * LearnSpark — script.js
 * Loads all data from events.json at startup.
 * Tasks marked as "done" are correctly persisted, reflected
 * in the live counter, progress bar, status badge, and profile summary.
 *
 * Best additions in this version:
 *  • Data loaded from events.json (single source of truth)
 *  • Task completion timestamp shown under done tasks
 *  • Auto-save on page close / tab switch (visibilitychange + beforeunload)
 *  • Course-linked preset tasks auto-mark as done when quiz is passed
 *  • XP counter updates live when task toggled
 *  • Profile task summary also reflects changes without full page reload
 */
'use strict';

// ═══════════════════════════════════════════════════════════
// APP DATA  — populated from events.json after fetch
// ═══════════════════════════════════════════════════════════
let STUDENTS      = [];
let COURSES       = [];
let QUIZ_DATA     = {};
let PRESET_TASKS  = [];
let ACHIEVEMENTS_DEF = [];
let AI_FEEDBACK   = {};

// ═══════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════
let currentUser    = null;
let allData        = {};
let currentCourseId = null;
let quizState      = { questions:[], current:0, score:0, answers:[], timer:null, timeLeft:30 };
let darkMode       = false;
let pinBuffer      = '';
let loginAttempts  = 0;
let newPinBuffer   = '';
const MAX_ATTEMPTS = 5;
let userTaskFilter = 'all';
let selectedTaskCat = '📖 Study';
let regEmojiSelected = '🎓';
let regPinFirst = '';
let regConfirmPin = '';

const EMOJIS = ['🌟','💎','⚡','🔥','🚀','🎯','🦋','🐉','🌈','🎮','🧠','👑','🎪','🏄','🌊','🤖','🦊','🐬','🐺','🦁'];
const AVATAR_COLORS = [
  'linear-gradient(135deg,#f6ad55,#f687b3)','linear-gradient(135deg,#b794f4,#63b3ed)',
  'linear-gradient(135deg,#63b3ed,#68d391)','linear-gradient(135deg,#fc8181,#f6ad55)',
  'linear-gradient(135deg,#68d391,#b794f4)','linear-gradient(135deg,#f687b3,#b794f4)',
  'linear-gradient(135deg,#63b3ed,#fc8181)','linear-gradient(135deg,#f6ad55,#68d391)',
  'linear-gradient(135deg,#68d391,#f687b3)','linear-gradient(135deg,#b794f4,#f6ad55)'
];

// ═══════════════════════════════════════════════════════════
// LOAD events.json — called once at startup
// ═══════════════════════════════════════════════════════════
async function loadEventsJSON() {
  try {
    const res  = await fetch('./events.json');
    const data = await res.json();
    STUDENTS         = data.students        || [];
    COURSES          = data.courses         || [];
    QUIZ_DATA        = data.quizzes         || {};
    PRESET_TASKS     = data.presetTasks     || [];
    ACHIEVEMENTS_DEF = data.achievements    || [];
    AI_FEEDBACK      = data.aiFeedback      || {};
  } catch (e) {
    console.warn('events.json not found — using fallback inline data.', e);
    loadFallbackData();
  }
}

// Fallback if fetch fails (e.g. opened as a local file)
function loadFallbackData() {
  STUDENTS = [
    {name:'ANU',    emoji:'🌟',color:'linear-gradient(135deg,#f6ad55,#f687b3)',defaultPin:'1111'},
    {name:'ANAMIKA',emoji:'💎',color:'linear-gradient(135deg,#b794f4,#63b3ed)',defaultPin:'2222'},
    {name:'ADHI',   emoji:'⚡',color:'linear-gradient(135deg,#63b3ed,#68d391)',defaultPin:'3333'},
    {name:'KRISHNA',emoji:'🔥',color:'linear-gradient(135deg,#fc8181,#f6ad55)',defaultPin:'4444'},
    {name:'VARUN',  emoji:'🚀',color:'linear-gradient(135deg,#68d391,#b794f4)',defaultPin:'5555'}
  ];
  COURSES = [
    {id:'html',title:'HTML Fundamentals',tag:'Foundation',emoji:'🌐',color:'linear-gradient(135deg,#f6ad55,#fc8181)',accent:'#f6ad55',desc:'Master the structure of the web with HTML5.',duration:'45 min',level:'Beginner',videoId:'qz0aGYrrlhU',topics:['HTML Structure','Tags & Elements','Forms & Inputs','Semantic HTML','Links & Images']},
    {id:'css', title:'CSS Styling & Design',tag:'Styling',emoji:'🎨',color:'linear-gradient(135deg,#63b3ed,#b794f4)',accent:'#63b3ed',desc:'Transform plain HTML into beautiful interfaces with CSS3.',duration:'60 min',level:'Beginner',videoId:'yfoY53QXEnI',topics:['Selectors & Properties','Box Model','Flexbox','CSS Grid','Animations']},
    {id:'js',  title:'JavaScript Programming',tag:'Logic',emoji:'⚡',color:'linear-gradient(135deg,#68d391,#63b3ed)',accent:'#68d391',desc:'Bring your pages to life with JavaScript.',duration:'75 min',level:'Intermediate',videoId:'hdI2bqOjy3c',topics:['Variables & Types','Functions','Arrays & Objects','DOM Manipulation','Events & APIs']}
  ];
  QUIZ_DATA = {
    html:[{q:'What does HTML stand for?',options:['Hyper Text Markup Language','High Text Machine Language','Hyper Transfer Markup Language','Home Tool Markup Language'],ans:0},{q:'Which tag is used for the largest heading?',options:['<h6>','<heading>','<h1>','<head>'],ans:2},{q:'Which HTML element defines the title of a document?',options:['<meta>','<title>','<head>','<header>'],ans:1},{q:'What is the correct HTML element for a line break?',options:['<lb>','<break>','<br>','<newline>'],ans:2},{q:'Which attribute specifies alternate text for an image?',options:['src','title','alt','href'],ans:2}],
    css: [{q:'What does CSS stand for?',options:['Cascading Style Sheets','Creative Style System','Computer Style Sheets','Colorful Style Sheets'],ans:0},{q:'Which property changes background color?',options:['color','bg-color','background-color','bgcolor'],ans:2},{q:'How do you select an element with id="demo"?',options:['.demo','#demo','*demo','demo'],ans:1},{q:'Which property is used to change font size?',options:['text-size','font-style','font-size','text-font'],ans:2},{q:'How do you make text bold in CSS?',options:['font-weight: bold','font: bold','text-weight: bold','style: bold'],ans:0}],
    js:  [{q:'Which keyword declares a variable in JavaScript?',options:['int','var','string','dim'],ans:1},{q:'How do you show "Hello World" in an alert box?',options:['alertBox("Hello World")','msg("Hello World")','alert("Hello World")','msgBox("Hello World")'],ans:2},{q:'How do you create a function in JavaScript?',options:['function = myFunc()','function myFunc()','create function myFunc()','def myFunc()'],ans:1},{q:'How do you write a single-line comment in JavaScript?',options:['<!-- comment -->','** comment **','// comment','## comment'],ans:2},{q:'Which method adds an element at the end of an array?',options:['push()','add()','append()','insert()'],ans:0}]
  };
  PRESET_TASKS = [
    {title:'🌐 Learn HTML Course',                 category:'📖 Study',    icon:'🌐',tic:'tic-course',   courseId:'html'},
    {title:'🎨 Learn CSS Course',                  category:'📖 Study',    icon:'🎨',tic:'tic-course',   courseId:'css'},
    {title:'⚡ Learn JavaScript Course',           category:'📖 Study',    icon:'⚡',tic:'tic-course',   courseId:'js'},
    {title:'🎯 Complete Quiz',                     category:'📖 Study',    icon:'🎯',tic:'tic-study',    courseId:null},
    {title:'📝 Make Notes of Learning',            category:'🌱 Personal', icon:'📝',tic:'tic-personal', courseId:null},
    {title:'🚀 Make New Student-Friendly Project', category:'💼 Work',     icon:'🚀',tic:'tic-work',     courseId:null}
  ];
  ACHIEVEMENTS_DEF = [
    {id:'first_login', icon:'🚀',name:'Launchpad',    desc:'Logged in for the first time'},
    {id:'first_video', icon:'📺',name:'First Watch',  desc:'Watched your first lesson'},
    {id:'first_quiz',  icon:'🎯',name:'Quiz Rookie',  desc:'Completed your first quiz'},
    {id:'first_cert',  icon:'🏆',name:'Graduate',     desc:'Earned your first certificate'},
    {id:'all_videos',  icon:'🎬',name:'Binge Watcher',desc:'Watched all course videos'},
    {id:'all_courses', icon:'🌟',name:'Web Master',   desc:'Completed all 3 courses'},
    {id:'perfect',     icon:'💯',name:'Perfectionist',desc:'Scored 100% on any quiz'},
    {id:'task_5',      icon:'✅',name:'Task Star',    desc:'Complete 5+ personal activities'},
    {id:'task_all',    icon:'🎉',name:'Task Master',  desc:'Complete ALL 6 preset tasks'},
    {id:'on_fire',     icon:'🔥',name:'On Fire!',     desc:'Complete 3+ activities'}
  ];
  AI_FEEDBACK = {
    '100':['Outstanding! Perfect score. 🏆 Exceptional understanding of all concepts.'],
    '80': ['Excellent work! Strong grasp of fundamentals. A little more practice will make you unstoppable!'],
    '60': ['Good effort! You have the foundation — review the material and try again!'],
    '0':  ['Keep going! Every expert was once a beginner. Review the videos and come back stronger!']
  };
}

// ═══════════════════════════════════════════════════════════
// ACHIEVEMENT UNLOCK LOGIC  (uses loaded COURSES / PRESET_TASKS)
// ═══════════════════════════════════════════════════════════
function getAchievementUnlocker(id) {
  const unlocks = {
    first_login: u => true,
    first_video: u => Object.values(u.progress||{}).some(p => p.videoWatched),
    first_quiz:  u => Object.values(u.progress||{}).some(p => p.quizScore !== null),
    first_cert:  u => Object.values(u.progress||{}).some(p => p.completed),
    all_videos:  u => COURSES.every(c => (u.progress||{})[c.id]?.videoWatched),
    all_courses: u => COURSES.every(c => (u.progress||{})[c.id]?.completed),
    perfect:     u => Object.values(u.progress||{}).some(p => p.quizScore === 100),
    task_5:      u => (u.tasks||[]).filter(t => t.status === 'done').length >= 5,
    task_all:    u => PRESET_TASKS.every(pt => (u.tasks||[]).find(t => t.title === pt.title && t.status === 'done')),
    on_fire:     u => (u.activities||[]).length >= 3
  };
  return unlocks[id] || (() => false);
}

// ═══════════════════════════════════════════════════════════
// CANVAS BACKGROUND
// ═══════════════════════════════════════════════════════════
(function () {
  const c = document.getElementById('bg'), ctx = c.getContext('2d');
  let stars = [], W, H;
  function init() {
    W = c.width = innerWidth; H = c.height = innerHeight; stars = [];
    for (let i = 0; i < 200; i++) stars.push({ x: Math.random()*W, y: Math.random()*H, r: Math.random()*1.5+.3, sp: Math.random()*.3+.05, p: Math.random()*Math.PI*2 });
  }
  function draw() {
    ctx.clearRect(0,0,W,H); const t = Date.now()/1000;
    stars.forEach(s => { s.y -= s.sp; if (s.y < 0) s.y = H; ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fillStyle = `rgba(99,179,237,${.3+.4*Math.sin(s.p+t)})`; ctx.fill(); });
    ctx.strokeStyle = 'rgba(99,179,237,0.03)'; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
    requestAnimationFrame(draw);
  }
  addEventListener('resize', init); init(); draw();
})();

// ═══════════════════════════════════════════════════════════
// FIREWORKS
// ═══════════════════════════════════════════════════════════
const fwC = document.getElementById('fireworks-canvas'), fwX = fwC.getContext('2d');
let fwP = [], fwA = false;
function launchFireworks() {
  if (document.getElementById('fw-sw') && !document.getElementById('fw-sw').checked) return;
  fwC.width = innerWidth; fwC.height = innerHeight; fwC.style.display = 'block'; fwA = true;
  let n = 0;
  const iv = setInterval(() => { explode(Math.random()*fwC.width, Math.random()*fwC.height*.6+100); if (++n > 12) clearInterval(iv); }, 400);
  setTimeout(() => { fwA = false; fwC.style.display = 'none'; }, 6000);
  animFW();
}
function explode(x, y) {
  const cols = ['#63b3ed','#b794f4','#f6ad55','#68d391','#fc8181','#f687b3','#fff'];
  for (let i = 0; i < 80; i++) { const a = Math.random()*Math.PI*2, sp = Math.random()*8+2; fwP.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:1,decay:Math.random()*.02+.01,sz:Math.random()*3+1,col:cols[~~(Math.random()*cols.length)]}); }
}
function animFW() {
  if (!fwA) { fwP = []; return; }
  fwX.clearRect(0,0,fwC.width,fwC.height); fwP = fwP.filter(p => p.life > 0);
  fwP.forEach(p => { p.x+=p.vx; p.y+=p.vy; p.vy+=.15; p.life-=p.decay; fwX.globalAlpha=p.life; fwX.fillStyle=p.col; fwX.beginPath(); fwX.arc(p.x,p.y,p.sz,0,Math.PI*2); fwX.fill(); });
  fwX.globalAlpha = 1; requestAnimationFrame(animFW);
}

// ═══════════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════════
function loadData()  { try { allData = JSON.parse(localStorage.getItem('ls_v4') || '{}'); } catch (e) { allData = {}; } }
function saveData()  { localStorage.setItem('ls_v4', JSON.stringify(allData)); }
function getUser() {
  if (!allData[currentUser]) allData[currentUser] = { progress:{}, activities:[], calData:{}, profile:{}, pins:{}, tasks:[] };
  const u = allData[currentUser];
  if (!u.tasks) u.tasks = [];
  return u;
}
function getProgress(cid) {
  const u = getUser();
  return u.progress[cid] || (u.progress[cid] = { videoWatched:false, quizScore:null, completed:false, attempts:0 });
}
function getPin(name) {
  if (allData[name]?.pins?.current) return allData[name].pins.current;
  return getAllStudents().find(s => s.name === name)?.defaultPin || '0000';
}
function setPin(name, pin) {
  if (!allData[name]) allData[name] = { progress:{}, activities:[], calData:{}, profile:{}, pins:{}, tasks:[] };
  if (!allData[name].pins) allData[name].pins = {};
  allData[name].pins.current = pin;
}

// Auto-save on tab hide / page unload (Best addition #1)
document.addEventListener('visibilitychange', () => { if (document.hidden && currentUser) saveData(); });
window.addEventListener('beforeunload', () => { if (currentUser) saveData(); });

// ═══════════════════════════════════════════════════════════
// STUDENT HELPERS
// ═══════════════════════════════════════════════════════════
function getCustomStudents() { try { return JSON.parse(localStorage.getItem('ls_custom_students') || '[]'); } catch (e) { return []; } }
function saveCustomStudents(arr) { localStorage.setItem('ls_custom_students', JSON.stringify(arr)); }
function getAllStudents() { return [...STUDENTS, ...getCustomStudents()]; }
function getStudentMeta(name) { return getAllStudents().find(s => s.name === name) || { name, emoji:'🎓', color:'linear-gradient(135deg,#63b3ed,#b794f4)', isCustom:true }; }

// ═══════════════════════════════════════════════════════════
// TASK SEEDING — seeds preset tasks for new/existing users
// ═══════════════════════════════════════════════════════════
function seedPresetTasks() {
  const u = getUser();
  PRESET_TASKS.forEach(pt => {
    if (!u.tasks.find(t => t.title === pt.title)) {
      u.tasks.push({
        id: Date.now() + Math.random(),
        title: pt.title,
        category: pt.category,
        icon: pt.icon,
        tic: pt.tic,
        courseId: pt.courseId || null,
        status: 'pending',
        preset: true,
        createdAt: new Date().toISOString(),
        doneAt: null
      });
    }
  });
  // Best addition #2: auto-mark course tasks done if quiz already passed
  autoMarkCourseTasks();
}

/**
 * Best addition #2: Sync preset course tasks with quiz completion.
 * If a user already passed HTML/CSS/JS quiz, their preset task is marked done.
 */
function autoMarkCourseTasks() {
  const u = getUser();
  u.tasks.forEach(task => {
    if (task.preset && task.courseId) {
      const p = (u.progress || {})[task.courseId];
      if (p && p.completed && task.status !== 'done') {
        task.status = 'done';
        task.doneAt = task.doneAt || new Date().toISOString();
      }
    }
  });
  // Also auto-mark "Complete Quiz" if any quiz is done
  const quizTask = u.tasks.find(t => t.title === '🎯 Complete Quiz' && t.preset);
  if (quizTask && quizTask.status !== 'done') {
    const anyQuiz = Object.values(u.progress || {}).some(p => p.quizScore !== null);
    if (anyQuiz) { quizTask.status = 'done'; quizTask.doneAt = quizTask.doneAt || new Date().toISOString(); }
  }
}

// ═══════════════════════════════════════════════════════════
// PIN PAD
// ═══════════════════════════════════════════════════════════
function buildPinPad(padId, handler) {
  const pad = document.getElementById(padId); if (!pad) return; pad.innerHTML = '';
  [1,2,3,4,5,6,7,8,9,'⌫',0,'✓'].forEach(k => {
    const btn = document.createElement('button');
    btn.className = 'pin-key' + (k==='⌫'?' del':k==='✓'?' ok-key':'');
    if (k === 0) btn.style.gridColumn = '2';
    btn.textContent = k;
    btn.onclick = () => handler(k==='⌫'?'del':k==='✓'?'ok':Number(k));
    pad.appendChild(btn);
  });
}
function updateDots(prefix, count, err) {
  for (let i = 0; i < 4; i++) {
    const d = document.getElementById(prefix + i); if (!d) continue;
    d.className = 'pin-dot' + (i < count ? ' filled' : '') + (err ? ' error' : '');
  }
}

// ═══════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════
function buildLogin() {
  const grid = document.getElementById('student-grid'); if (!grid) return; grid.innerHTML = '';
  getAllStudents().forEach(s => {
    const d = document.createElement('div'); d.className = 'student-card';
    const hasCustomPin = allData[s.name]?.pins?.current;
    const isCustom = !!s.isCustom;
    d.innerHTML = `
      <div class="student-avatar" style="background:${s.color};">${s.emoji}</div>
      <div class="student-name">${s.name}</div>
      ${isCustom
        ? `<span class="new-badge">REGISTERED</span><button class="del-btn" onclick="deleteCustomStudent(event,'${s.name}')">✕</button>`
        : `<div class="student-hint">${hasCustomPin ? 'Custom PIN set' : 'PIN: '+s.defaultPin}</div>`
      }`;
    d.onclick = () => selectStudent(s.name);
    grid.appendChild(d);
  });
  document.getElementById('pin-section').style.display = 'none';
  buildPinPad('pin-pad', handleLoginPin);
  buildRegEmojiGrid();
  buildPinPad('reg-pin-pad', handleRegPin);
  buildPinPad('reg-confirm-pad', handleRegConfirm);
}

function deleteCustomStudent(e, name) {
  e.stopPropagation();
  if (!confirm(`Remove student "${name}"?\nThis also deletes all their progress.`)) return;
  saveCustomStudents(getCustomStudents().filter(s => s.name !== name));
  loadData(); delete allData[name]; saveData();
  buildLogin(); showToast(`🗑️ ${name} removed`, '#fc8181');
}

function switchLoginTab(tab) {
  document.getElementById('tab-login').classList.toggle('active', tab==='login');
  document.getElementById('tab-register').classList.toggle('active', tab==='register');
  document.getElementById('panel-login').classList.toggle('active', tab==='login');
  document.getElementById('panel-register').classList.toggle('active', tab==='register');
  if (tab === 'register') resetRegister();
  else { document.getElementById('pin-section').style.display = 'none'; currentUser = null; pinBuffer = ''; }
}

function selectStudent(name) {
  document.querySelectorAll('.student-card').forEach(c => c.classList.remove('selected'));
  document.querySelectorAll('.student-card').forEach(c => { if (c.querySelector('.student-name')?.textContent === name) c.classList.add('selected'); });
  currentUser = name; pinBuffer = ''; loginAttempts = 0;
  updateDots('pd', 0, false);
  document.getElementById('pin-err').textContent = '';
  const hasCustomPin = allData[name]?.pins?.current;
  const meta = getAllStudents().find(s => s.name === name);
  let hint = 'Enter your PIN to continue';
  if (!hasCustomPin && meta?.defaultPin) hint = `Default PIN: ${meta.defaultPin}`;
  document.getElementById('pin-hint-txt').textContent = hint;
  document.getElementById('pin-section').style.display = 'block';
  document.querySelectorAll('#pin-pad .pin-key').forEach(k => k.disabled = false);
}

// ── Register ──────────────────────────────────────────────
function buildRegEmojiGrid() {
  const g = document.getElementById('reg-emoji-grid'); if (!g) return;
  g.innerHTML = EMOJIS.map(e => `<div class="reg-emoji-opt${e===regEmojiSelected?' sel':''}" data-emoji="${e}">${e}</div>`).join('');
  g.querySelectorAll('.reg-emoji-opt').forEach(el => {
    el.addEventListener('click', () => { g.querySelectorAll('.reg-emoji-opt').forEach(x => x.classList.remove('sel')); el.classList.add('sel'); regEmojiSelected = el.dataset.emoji; });
  });
}

function regNext1() {
  const name = document.getElementById('reg-name').value.trim().toUpperCase();
  const errEl = document.getElementById('reg-name-err');
  if (!name || name.length < 2)   { errEl.textContent = '⚠️ Please enter at least 2 characters'; return; }
  if (name.length > 16)           { errEl.textContent = '⚠️ Max 16 characters'; return; }
  if (getAllStudents().some(s => s.name === name)) { errEl.textContent = '⚠️ Name already exists — please login instead'; return; }
  if (!/^[A-Z0-9\s]+$/.test(name)) { errEl.textContent = '⚠️ Letters and numbers only'; return; }
  errEl.textContent = ''; regPinFirst = ''; updateDots('rpd', 0, false); goRegStep(2);
}

function handleRegPin(key) {
  if (key === 'del') regPinFirst = regPinFirst.slice(0,-1);
  else if (key === 'ok') { if (regPinFirst.length === 4) confirmRegStep2(); return; }
  else if (typeof key === 'number' && regPinFirst.length < 4) regPinFirst += String(key);
  updateDots('rpd', regPinFirst.length, false);
  if (regPinFirst.length === 4) setTimeout(confirmRegStep2, 180);
}
function confirmRegStep2() {
  if (regPinFirst.length < 4) return;
  updateDots('rcp', 0, false);
  document.getElementById('reg-pin-err').textContent = '';
  goRegStep(3);
}

function handleRegConfirm(key) {
  if (key === 'del') regConfirmPin = regConfirmPin.slice(0,-1);
  else if (key === 'ok') { if (regConfirmPin.length === 4) finishRegister(); return; }
  else if (typeof key === 'number' && regConfirmPin.length < 4) regConfirmPin += String(key);
  updateDots('rcp', regConfirmPin.length, false);
  if (regConfirmPin.length === 4) setTimeout(finishRegister, 180);
}

function finishRegister() {
  if (regConfirmPin !== regPinFirst) {
    updateDots('rcp', 0, true); regConfirmPin = '';
    document.getElementById('reg-pin-err').textContent = '❌ PINs do not match — try again';
    return;
  }
  const name = document.getElementById('reg-name').value.trim().toUpperCase();
  const emoji = regEmojiSelected;
  const color = AVATAR_COLORS[getCustomStudents().length % AVATAR_COLORS.length];
  const custom = getCustomStudents(); custom.push({name, emoji, color, isCustom:true}); saveCustomStudents(custom);
  loadData(); setPin(name, regPinFirst);
  currentUser = name; getUser(); seedPresetTasks(); saveData(); currentUser = null;
  showToast(`🎉 Welcome, ${name}! Account created!`, '#68d391');
  switchLoginTab('login'); buildLogin();
  setTimeout(() => selectStudent(name), 350);
}

function goRegStep(n) {
  [1,2,3].forEach(i => {
    document.getElementById(`reg-step-${i}`).classList.toggle('active', i===n);
    const dot = document.getElementById(`rdot${i-1}`);
    if (dot) dot.className = 'reg-step-dot' + (i<n?' done':i===n?' active':'');
  });
  if (n === 2) buildPinPad('reg-pin-pad', handleRegPin);
  if (n === 3) { regConfirmPin = ''; buildPinPad('reg-confirm-pad', handleRegConfirm); }
}
function regBack(toStep) { goRegStep(toStep); }
function resetRegister() {
  document.getElementById('reg-name').value = '';
  document.getElementById('reg-name-err').textContent = '';
  document.getElementById('reg-pin-err').textContent = '';
  regPinFirst = ''; regConfirmPin = ''; regEmojiSelected = '🎓';
  buildRegEmojiGrid(); goRegStep(1);
}

function handleLoginPin(key) {
  if (loginAttempts >= MAX_ATTEMPTS) return;
  if (key === 'del') pinBuffer = pinBuffer.slice(0,-1);
  else if (key === 'ok') { checkPin(); return; }
  else if (typeof key === 'number' && pinBuffer.length < 4) pinBuffer += String(key);
  updateDots('pd', pinBuffer.length, false);
  if (pinBuffer.length === 4) setTimeout(checkPin, 180);
}
function checkPin() {
  loadData(); const correct = getPin(currentUser);
  if (pinBuffer === correct) {
    document.getElementById('pin-err').textContent = ''; enterApp();
  } else {
    loginAttempts++; pinBuffer = ''; updateDots('pd', 0, true);
    const left = MAX_ATTEMPTS - loginAttempts;
    document.getElementById('pin-err').textContent = left > 0 ? `❌ Wrong PIN! ${left} attempt${left!==1?'s':''} left` : '🔒 Too many attempts. Wait 30s.';
    const ps = document.getElementById('pin-section'); ps.style.animation = 'none'; void ps.offsetWidth; ps.style.animation = 'shake .4s ease';
    if (loginAttempts >= MAX_ATTEMPTS) lockPad();
  }
}
function lockPad() {
  document.querySelectorAll('#pin-pad .pin-key').forEach(k => k.disabled = true);
  let t = 30;
  const iv = setInterval(() => {
    document.getElementById('pin-err').textContent = `🔒 Wait ${--t}s...`;
    if (t <= 0) { clearInterval(iv); loginAttempts = 0; pinBuffer = ''; updateDots('pd',0,false); document.getElementById('pin-err').textContent = ''; document.querySelectorAll('#pin-pad .pin-key').forEach(k => k.disabled = false); }
  }, 1000);
}

function enterApp() {
  getUser(); seedPresetTasks();
  addActivity('Logged into LearnSpark', null, 'login', '🚀');
  updateCalendar(); saveData();
  document.getElementById('page-login').style.display = 'none';
  showProfilePage();
}

// ═══════════════════════════════════════════════════════════
// PROFILE PAGE
// ═══════════════════════════════════════════════════════════
function showProfilePage() {
  document.getElementById('page-app').style.display = 'none';
  document.getElementById('page-profile').style.display = 'block';
  document.getElementById('page-profile').classList.add('active');
  buildProfilePage();
}
function buildProfilePage() {
  const u = getUser(), s = getStudentMeta(currentUser), pr = u.profile || {};
  const emoji = pr.emoji || s.emoji, dname = pr.displayName || currentUser, bio = pr.bio || 'Aspiring Web Developer · LearnSpark Student';
  const av = document.getElementById('prof-avatar');
  av.style.background = s.color; av.textContent = emoji;
  document.getElementById('prof-name').textContent = dname;
  document.getElementById('prof-username').textContent = `@${currentUser.toLowerCase()} · LearnSpark Student`;
  document.getElementById('prof-bio').textContent = bio;
  buildChips(); buildStatCards(); buildCourseProgress(); buildAllCourses(); buildAchievements(); buildProfileTasksSummary();
}
function buildChips() {
  const u = getUser(); let chips = [], completed = 0, hasPerfect = false;
  COURSES.forEach(c => { const p = getProgress(c.id); if (p.completed) completed++; if (p.quizScore === 100) hasPerfect = true; });
  const tasksDone = (u.tasks||[]).filter(t => t.status === 'done').length;
  chips.push({l:'🚀 Learner', c:'var(--cyan)', b:'rgba(99,179,237,0.2)'});
  if (completed > 0)   chips.push({l:'🏆 Graduate',     c:'var(--green)',  b:'rgba(104,211,145,0.2)'});
  if (completed === 3) chips.push({l:'🌟 Web Master',   c:'var(--orange)', b:'rgba(246,173,85,0.2)'});
  if (hasPerfect)      chips.push({l:'💯 Perfectionist',c:'var(--purple)', b:'rgba(183,148,244,0.2)'});
  if (tasksDone >= 5)  chips.push({l:'✅ Task Star',    c:'var(--green)',  b:'rgba(104,211,145,0.2)'});
  if ((u.activities||[]).length >= 5) chips.push({l:'🔥 Active', c:'var(--red)', b:'rgba(252,129,129,0.2)'});
  document.getElementById('prof-chips').innerHTML = chips.map(c => `<span class="profile-chip" style="color:${c.c};border-color:${c.b};background:${c.b};">${c.l}</span>`).join('');
}
function buildStatCards() {
  let comp = 0, quizzes = 0, watched = 0, total = 0, cnt = 0;
  COURSES.forEach(c => { const p = getProgress(c.id); if (p.completed) comp++; if (p.quizScore!==null){quizzes++;total+=p.quizScore;cnt++;} if (p.videoWatched) watched++; });
  const avg = cnt ? Math.round(total/cnt) : 0;
  const tasksDone = (getUser().tasks||[]).filter(t => t.status === 'done').length;
  const xp = comp*100 + quizzes*50 + watched*10 + tasksDone*20;
  document.getElementById('prof-stats').innerHTML = `
    <div class="sc"><div class="sc-bar" style="background:var(--cyan)"></div><div class="sc-icon">📚</div><div class="sc-val" style="color:var(--cyan)">${comp}</div><div class="sc-lbl">Completed</div></div>
    <div class="sc"><div class="sc-bar" style="background:var(--green)"></div><div class="sc-icon">✅</div><div class="sc-val" style="color:var(--green)">${tasksDone}</div><div class="sc-lbl">Tasks Done</div></div>
    <div class="sc"><div class="sc-bar" style="background:var(--orange)"></div><div class="sc-icon">🏆</div><div class="sc-val" style="color:var(--orange)">${xp}</div><div class="sc-lbl">Total XP</div></div>
    <div class="sc"><div class="sc-bar" style="background:var(--purple)"></div><div class="sc-icon">🎯</div><div class="sc-val" style="color:var(--purple)">${avg?avg+'%':'—'}</div><div class="sc-lbl">Avg Score</div></div>`;
}
function buildCourseProgress() {
  document.getElementById('prof-progress').innerHTML = COURSES.map(c => {
    const p = getProgress(c.id); let pct = 0; if (p.videoWatched) pct = 50; if (p.quizScore!==null) pct = 75; if (p.completed) pct = 100;
    const st = p.completed ? '✅ Complete' : p.videoWatched ? '⏳ In Progress' : '🔒 Not Started';
    return `<div class="cp-row" onclick="goToCourseFromProfile('${c.id}')">
      <div class="cp-emoji">${c.emoji}</div>
      <div class="cp-details">
        <div class="cp-title">${c.title}</div>
        <div class="cp-pbar"><div class="cp-pfill" style="width:${pct}%;background:${c.color}"></div></div>
        <div class="cp-meta"><span>${st}</span><span>${pct}%${p.quizScore!==null?' · Score: '+p.quizScore+'%':''}</span></div>
      </div>
      <button class="btn btn-outline" style="padding:.35rem .8rem;font-size:.8rem;flex-shrink:0">${p.completed?'Review':'Go →'}</button>
    </div>`;
  }).join('');
}
function buildAllCourses() {
  document.getElementById('prof-all-courses').innerHTML = COURSES.map(c => {
    const p = getProgress(c.id); let pct = 0; if (p.videoWatched) pct = 50; if (p.quizScore!==null) pct = 75; if (p.completed) pct = 100;
    return `<div class="cp-row" onclick="goToCourseFromProfile('${c.id}')">
      <div class="cp-emoji">${c.emoji}</div>
      <div class="cp-details">
        <div class="cp-title">${c.title} <span style="color:var(--muted);font-size:.8rem">· ${c.tag} · ${c.level}</span></div>
        <div style="color:var(--muted);font-size:.82rem;margin-bottom:.5rem">${c.desc}</div>
        <div class="cp-pbar"><div class="cp-pfill" style="width:${pct}%;background:${c.color}"></div></div>
        <div class="cp-meta"><span>${c.duration}</span><span>${p.quizScore!==null?'Score: '+p.quizScore+'%':pct+'% complete'}</span></div>
      </div>
    </div>`;
  }).join('');
}
function buildAchievements() {
  const u = getUser();
  document.getElementById('ach-grid').innerHTML = ACHIEVEMENTS_DEF.map(a => {
    const ok = getAchievementUnlocker(a.id)(u);
    return `<div class="ach-card ${ok?'unlocked':'locked'}">
      <div class="ach-icon">${a.icon}</div>
      <div class="ach-name">${a.name}</div>
      <div class="ach-desc">${a.desc}</div>
      <div class="ach-status" style="color:${ok?'var(--green)':'var(--muted)'};">${ok?'✅ Unlocked':'🔒 Locked'}</div>
    </div>`;
  }).join('');
}

/**
 * ✅ FIXED: Profile task summary — correctly reflects done/pending status
 * in real-time after any toggle, showing the accurate "X out of Y" count
 */
function buildProfileTasksSummary() {
  const u = getUser(), tasks = u.tasks || [];
  const done = tasks.filter(t => t.status === 'done').length, total = tasks.length;
  const pct  = total > 0 ? Math.round(done/total*100) : 0;
  const el   = document.getElementById('prof-tasks-summary'); if (!el) return;
  el.innerHTML = `
    <div style="background:rgba(99,179,237,.06);border:1px solid rgba(99,179,237,.2);border-radius:14px;padding:1.3rem;margin-bottom:1.2rem;">
      <div style="display:flex;justify-content:space-between;font-size:.82rem;color:var(--muted);margin-bottom:.5rem;">
        <span>${done} completed</span><span>${pct}%</span>
      </div>
      <div style="background:rgba(255,255,255,.08);border-radius:50px;height:9px;overflow:hidden;">
        <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,var(--cyan),var(--purple));border-radius:50px;transition:width .7s;"></div>
      </div>
      <p style="color:var(--cyan);font-family:'Orbitron',monospace;font-size:.85rem;font-weight:700;margin-top:.7rem;">${done} out of ${total} activities completed</p>
    </div>
    ${tasks.map(t => {
      const isDone = t.status === 'done';
      const doneTime = isDone && t.doneAt ? `<span class="task-done-at">✓ ${new Date(t.doneAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span>` : '';
      return `<div style="background:var(--glass);border:1px solid ${isDone?'rgba(104,211,145,.25)':'var(--border)'};border-radius:11px;padding:.85rem 1rem;margin-bottom:.6rem;display:flex;align-items:center;gap:.8rem;">
        <div style="width:22px;height:22px;border-radius:7px;background:${isDone?'linear-gradient(135deg,var(--green),var(--cyan))':'transparent'};border:2px solid ${isDone?'var(--green)':'var(--border2)'};display:flex;align-items:center;justify-content:center;font-size:.75rem;flex-shrink:0;">${isDone?'✓':''}</div>
        <div style="flex:1">
          <span style="font-weight:600;${isDone?'text-decoration:line-through;color:var(--muted);':''}">${esc(t.title)}</span>
          ${doneTime ? `<div style="margin-top:.2rem">${doneTime}</div>` : ''}
        </div>
        ${t.preset?'<span style="font-size:.6rem;color:#f6e05e;background:rgba(246,224,94,.12);border:1px solid rgba(246,224,94,.3);border-radius:50px;padding:.1rem .4rem">⭐ Preset</span>':''}
        <span style="font-size:.7rem;padding:.15rem .6rem;border-radius:50px;${isDone?'background:rgba(104,211,145,.12);color:var(--green);border:1px solid rgba(104,211,145,.3)':'background:rgba(246,173,85,.12);color:var(--orange);border:1px solid rgba(246,173,85,.3)'}">
          ${isDone?'✅ Done':'⏳ Pending'}
        </span>
      </div>`;
    }).join('')}
    <div style="margin-top:1rem;text-align:center;">
      <button class="btn btn-primary" onclick="goToCourses();showSection('tasks')" style="padding:.5rem 1.2rem">Open Task Tracker →</button>
    </div>`;
}

function switchPTab(name, btn) {
  document.querySelectorAll('.p-tab').forEach(t => t.classList.remove('active')); btn.classList.add('active');
  document.querySelectorAll('.ptab').forEach(t => t.classList.remove('active'));
  document.getElementById('ptab-'+name).classList.add('active');
  if (name === 'tasks') buildProfileTasksSummary();
}
function goToCourseFromProfile(id) { goToCourses(); setTimeout(() => openCourse(id), 80); }
function goToCourses() {
  document.getElementById('page-profile').style.display = 'none'; document.getElementById('page-profile').classList.remove('active');
  document.getElementById('page-app').style.display = 'block';
  const s = getStudentMeta(currentUser), u = getUser(), pr = u.profile || {};
  const emoji = pr.emoji || s.emoji, dname = pr.displayName || currentUser;
  document.getElementById('nav-name').textContent = dname;
  document.getElementById('nav-avatar').textContent = emoji;
  document.getElementById('nav-avatar').style.background = s.color;
  showSection('home');
}
function goToProfile() { document.getElementById('page-app').style.display = 'none'; showProfilePage(); }

// ═══════════════════════════════════════════════════════════
// SECTIONS
// ═══════════════════════════════════════════════════════════
function showSection(name) {
  document.querySelectorAll('.section-content').forEach(s => s.style.display = 'none');
  const el = document.getElementById('section-'+name); if (el) el.style.display = 'block';
  document.querySelectorAll('.nav-btn').forEach(b => { b.classList.remove('active'); if (b.textContent.toLowerCase().includes(name)) b.classList.add('active'); });
  if (name === 'home')        buildHome();
  if (name === 'tasks')       renderTasksSection();
  if (name === 'activity')    buildActivity();
  if (name === 'leaderboard') buildLeaderboard();
  if (name === 'calendar')    buildCalendar();
}

// ═══════════════════════════════════════════════════════════
// HOME
// ═══════════════════════════════════════════════════════════
function buildHome() {
  const s = getStudentMeta(currentUser), u = getUser(), pr = u.profile || {};
  const dname = pr.displayName || currentUser, emoji = pr.emoji || s.emoji;
  const tasksDone = (u.tasks||[]).filter(t => t.status === 'done').length;
  document.getElementById('hero-sub-text').textContent = `Welcome back, ${dname}! ${emoji} Ready to level up?`;
  let comp = 0, inp = 0, total = 0, cnt = 0;
  COURSES.forEach(c => { const p = getProgress(c.id); if (p.completed) comp++; else if (p.videoWatched||p.quizScore!==null) inp++; if (p.quizScore!==null){total+=p.quizScore;cnt++;} });
  const avg = cnt ? Math.round(total/cnt) : 0;
  document.getElementById('hero-stats').innerHTML = `
    <div class="stat-pill">📚 <span>${comp}</span>/${COURSES.length} Courses</div>
    <div class="stat-pill">✅ <span>${tasksDone}</span> Tasks Done</div>
    <div class="stat-pill">🎯 Avg <span>${avg}%</span></div>
    <div class="stat-pill">🏆 <span>${comp*100+avg+tasksDone*20}</span> XP</div>`;
  const grid = document.getElementById('courses-grid'); grid.innerHTML = '';
  COURSES.forEach(c => {
    const p = getProgress(c.id); let pct = 0; if (p.videoWatched) pct = 50; if (p.quizScore!==null) pct = 75; if (p.completed) pct = 100;
    const sb = p.completed ? `<span class="badge badge-complete">✅ Done</span>` : pct>0 ? `<span class="badge badge-pending">⏳ Progress</span>` : `<span class="badge badge-locked">🔒 Start</span>`;
    const div = document.createElement('div'); div.className = 'course-card';
    div.innerHTML = `<div class="course-thumb" style="background:${c.color}">${c.emoji}</div>
      <div class="course-body">
        <div class="course-tag" style="background:rgba(255,255,255,0.1);color:#fff">${c.tag}</div>
        <div class="course-title">${c.title}</div>
        <div class="course-desc">${c.desc}</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${c.color}"></div></div>
        <div class="course-meta">${sb}<span>${p.quizScore!==null?'Score: '+p.quizScore+'%':c.duration+' · '+c.level}</span></div>
      </div>`;
    div.onclick = () => openCourse(c.id); grid.appendChild(div);
  });
}

// ═══════════════════════════════════════════════════════════
// COURSE DETAIL
// ═══════════════════════════════════════════════════════════
function openCourse(id) {
  currentCourseId = id; const c = COURSES.find(x => x.id===id), p = getProgress(id);
  showSection('course');
  document.getElementById('course-detail-content').innerHTML = `
    <div style="background:${c.color};padding:1.5rem;border-radius:16px;margin-bottom:1.5rem;display:flex;align-items:center;gap:1rem">
      <div style="font-size:3rem">${c.emoji}</div>
      <div><div style="font-family:'Orbitron',monospace;font-size:1.5rem;font-weight:900">${c.title}</div><div style="opacity:.8;margin-top:.3rem">${c.desc}</div></div>
    </div>
    <div class="course-info-grid">
      <div class="info-box"><div class="label">DURATION</div><div class="value">⏱ ${c.duration}</div></div>
      <div class="info-box"><div class="label">LEVEL</div><div class="value">📊 ${c.level}</div></div>
    </div>
    <div class="video-wrapper" id="vid-wrap-${id}" onclick="loadVideo('${c.videoId}',this)" style="cursor:pointer;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 50%,rgba(15,23,42,.9),rgba(2,8,23,1))">
      <div style="text-align:center"><div style="font-size:5rem">${c.emoji}</div><div style="font-size:3rem;margin:.5rem">▶</div><p style="color:var(--muted)">Click to play lesson</p></div>
    </div>
    <div class="section-title" style="margin-top:1.5rem">📋 Topics Covered</div>
    <div style="display:flex;flex-wrap:wrap;gap:.6rem;margin-bottom:1.5rem">${c.topics.map(t=>`<span style="background:var(--glass);border:1px solid var(--border);padding:.3rem .8rem;border-radius:50px;font-size:.85rem">${t}</span>`).join('')}</div>
    ${p.videoWatched ? `<button class="btn btn-primary" onclick="startQuiz('${id}')" style="margin-right:.8rem">🎯 Take Quiz →</button>` : ''}
    ${p.quizScore!==null && !p.completed ? `<button class="btn btn-success" onclick="viewCertificate('${id}')">🏆 View Certificate</button>` : ''}
    ${p.completed ? `<div style="background:rgba(104,211,145,.1);border:1px solid rgba(104,211,145,.3);border-radius:12px;padding:1rem;margin-top:1rem;color:var(--green);font-weight:700">✅ Completed! Score: ${p.quizScore}%</div>` : ''}`;
}

function loadVideo(videoId, wrapper) {
  wrapper.style.cursor = 'default';
  wrapper.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1" style="width:100%;height:100%;border:none;border-radius:16px" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  const p = getProgress(currentCourseId);
  if (!p.videoWatched) {
    p.videoWatched = true;
    addActivity(`Watched ${COURSES.find(c=>c.id===currentCourseId)?.title}`, currentCourseId, 'watched', '📺');
    updateCalendar(); saveData();
    showToast('🎬 Video watched! +10 XP', '#63b3ed');
  }
}

// ═══════════════════════════════════════════════════════════
// QUIZ
// ═══════════════════════════════════════════════════════════
function startQuiz(id) {
  currentCourseId = id;
  quizState = { questions: QUIZ_DATA[id], current:0, score:0, answers:[], timer:null, timeLeft:30 };
  showSection('quiz');
  document.getElementById('quiz-title').textContent = COURSES.find(x=>x.id===id).title.toUpperCase() + ' QUIZ';
  renderQuestion();
}
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function renderQuestion() {
  const q = quizState.questions[quizState.current];
  document.getElementById('q-progress').innerHTML = quizState.questions.map((_,i) =>
    `<div class="q-dot${i<quizState.current?(quizState.answers[i]===quizState.questions[i].ans?' done':' wrong'):i===quizState.current?' current':''}"></div>`
  ).join('');
  document.getElementById('quiz-content').innerHTML = `
    <div class="question-box">
      <div class="q-num">Question ${quizState.current+1} of ${quizState.questions.length}</div>
      <div class="q-text">${esc(q.q)}</div>
    </div>
    <div class="options-grid">${q.options.map((o,i)=>`<button class="option-btn" id="opt-${i}" onclick="selectAnswer(${i})"><span class="option-letter">${'ABCD'[i]}</span><span>${esc(o)}</span></button>`).join('')}</div>`;
  startTimer();
}
function startTimer() {
  clearInterval(quizState.timer); quizState.timeLeft = 30; updateTimerUI();
  quizState.timer = setInterval(() => { if (--quizState.timeLeft <= 0) { clearInterval(quizState.timer); selectAnswer(-1); } updateTimerUI(); }, 1000);
}
function updateTimerUI() {
  const t = quizState.timeLeft, c = t<=10?'#fc8181':t<=20?'#f6ad55':'#63b3ed';
  document.getElementById('timer-num').textContent = t; document.getElementById('timer-num').style.color = c;
  document.getElementById('timer-ring-path').style.strokeDasharray = `${(t/30)*188} 188`;
  document.getElementById('timer-ring-path').style.stroke = c;
}
function selectAnswer(idx) {
  clearInterval(quizState.timer);
  const q = quizState.questions[quizState.current]; quizState.answers.push(idx);
  if (idx === q.ans) quizState.score++;
  document.querySelectorAll('.option-btn').forEach((b,i) => { b.disabled = true; if (i===q.ans) b.classList.add('correct'); else if (i===idx) b.classList.add('wrong'); });
  setTimeout(() => { quizState.current++; quizState.current < quizState.questions.length ? renderQuestion() : finishQuiz(); }, 1000);
}
function finishQuiz() {
  const pct = Math.round((quizState.score/quizState.questions.length)*100), p = getProgress(currentCourseId);
  p.quizScore = pct; p.attempts = (p.attempts||0) + 1; if (pct >= 60) p.completed = true;
  const c = COURSES.find(x => x.id===currentCourseId);
  addActivity(`Completed ${c.title} quiz — ${pct}%`, currentCourseId, 'quiz', '🎯');
  if (p.completed) {
    addActivity(`🏆 Earned certificate for ${c.title}!`, currentCourseId, 'cert', '🏅');
    // ✅ FIXED: auto-mark course preset task + quiz task as done
    autoMarkCourseTasks();
  }
  updateCalendar(); saveData(); showResult(pct, p.completed);
}
function showResult(score, passed) {
  showSection('result');
  const col = score>=80?'var(--green)':score>=60?'var(--cyan)':score>=40?'var(--orange)':'var(--red)';
  const fb = score===100 ? AI_FEEDBACK['100'] : score>=80 ? AI_FEEDBACK['80'] : score>=60 ? AI_FEEDBACK['60'] : AI_FEEDBACK['0'];
  const circ = 440, fill = (score/100)*circ;
  document.getElementById('result-content').innerHTML = `
    <div class="score-ring">
      <svg width="160" height="160" viewBox="0 0 160 160"><circle class="sr-track" cx="80" cy="80" r="70"/><circle class="sr-fill" id="sr-fill" cx="80" cy="80" r="70" style="stroke:${col};stroke-dasharray:0 ${circ}"/></svg>
      <div class="score-center"><div class="score-num" style="color:${col}">${score}%</div><div class="score-label">${quizState.score}/${quizState.questions.length} correct</div></div>
    </div>
    <div class="result-title">${passed?'🎉 Congratulations!':'Keep Learning!'}</div>
    <div class="result-stars">${score===100?'⭐⭐⭐':score>=80?'⭐⭐':score>=60?'⭐':'—'}</div>
    <p style="color:var(--muted);margin-bottom:1rem">${passed?'You passed and earned your certificate!':'Score 60%+ to earn your certificate'}</p>
    <div class="ai-feedback"><div class="ai-label">🤖 AI Coach Feedback</div><div class="ai-text">${(fb||['Great effort!'])[~~(Math.random()*(fb||['Great effort!']).length)]}</div></div>
    <div style="display:flex;gap:1rem;flex-wrap:wrap;justify-content:center;margin-top:1.5rem">
      <button class="btn btn-outline" onclick="startQuiz('${currentCourseId}')">🔄 Retake</button>
      ${passed?`<button class="btn btn-success" onclick="viewCertificate('${currentCourseId}')">🏆 Certificate</button>`:''}
      <button class="btn btn-primary" onclick="showSection('home')">🏠 Home</button>
    </div>`;
  setTimeout(() => { const el = document.getElementById('sr-fill'); if (el) el.style.strokeDasharray = `${fill} ${circ}`; }, 100);
  if (passed && score === 100) setTimeout(launchFireworks, 500);
}

// ═══════════════════════════════════════════════════════════
// CERTIFICATE
// ═══════════════════════════════════════════════════════════
function viewCertificate(id) {
  if (id) currentCourseId = id;
  const c = COURSES.find(x=>x.id===currentCourseId), p = getProgress(currentCourseId);
  if (!p.completed) { showToast('⚠️ Complete the quiz first!','#f6ad55'); return; }
  const u = getUser(), pr = u.profile||{}, dname = pr.displayName||currentUser;
  const today = new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
  const cid = 'LS-'+currentUser.slice(0,3).toUpperCase()+'-'+currentCourseId.toUpperCase()+'-'+Date.now().toString().slice(-6);
  showSection('certificate');
  document.getElementById('certificate').innerHTML = `
    <div class="cert-border">
      <div class="cert-badge">🏆</div>
      <div class="cert-org">⚡ LearnSpark Academy</div>
      <div class="cert-heading">Certificate of Completion</div>
      <div style="color:var(--muted);margin-bottom:.5rem">This certificate is proudly awarded to</div>
      <div class="cert-name">${dname}</div>
      <div style="font-size:1.1rem;color:var(--text)">for successfully completing</div>
      <div style="margin:.5rem 0"><strong style="font-family:'Orbitron',monospace;color:var(--orange);font-size:1.3rem">${c.emoji} ${c.title}</strong></div>
      <div class="cert-divider"></div>
      <div class="cert-details">
        <div class="cert-detail"><div class="dl">Score</div><div class="dv" style="color:var(--green)">${p.quizScore}%</div></div>
        <div class="cert-detail"><div class="dl">Date</div><div class="dv">${today}</div></div>
        <div class="cert-detail"><div class="dl">ID</div><div class="dv" style="font-size:.78rem;font-family:'Space Mono',monospace">${cid}</div></div>
        <div class="cert-detail"><div class="dl">Level</div><div class="dv">${c.level}</div></div>
      </div>
      <div class="cert-seal">LearnSpark<br>Verified<br>⭐⭐⭐</div>
    </div>`;
  if (p.quizScore === 100) setTimeout(launchFireworks, 300);
}

function downloadCertificate() {
  const {jsPDF} = window.jspdf, doc = new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
  const W = 297, H = 210, c = COURSES.find(x=>x.id===currentCourseId), p = getProgress(currentCourseId);
  const u = getUser(), pr = u.profile||{}, dname = pr.displayName||currentUser;
  doc.setFillColor(2,8,23); doc.rect(0,0,W,H,'F');
  doc.setDrawColor(99,179,237); doc.setLineWidth(1.5); doc.rect(10,10,W-20,H-20,'S');
  doc.setTextColor(99,179,237); doc.setFontSize(10); doc.text('LEARNSPARK ACADEMY',W/2,28,{align:'center'});
  doc.setTextColor(255,255,255); doc.setFontSize(26); doc.setFont('helvetica','bold'); doc.text('CERTIFICATE OF COMPLETION',W/2,48,{align:'center'});
  doc.setFontSize(12); doc.setFont('helvetica','normal'); doc.setTextColor(148,163,184); doc.text('This certificate is proudly awarded to',W/2,65,{align:'center'});
  doc.setFontSize(38); doc.setFont('helvetica','bold'); doc.setTextColor(99,179,237); doc.text(dname,W/2,86,{align:'center'});
  doc.setFontSize(12); doc.setTextColor(255,255,255); doc.setFont('helvetica','normal'); doc.text('for successfully completing',W/2,102,{align:'center'});
  doc.setFontSize(18); doc.setTextColor(246,173,85); doc.setFont('helvetica','bold'); doc.text(c.title.toUpperCase(),W/2,116,{align:'center'});
  doc.setDrawColor(99,179,237); doc.setLineWidth(.5); doc.line(30,126,W-30,126);
  const today = new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
  doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.setTextColor(148,163,184);
  doc.text(`Score: ${p.quizScore}%`,70,140,{align:'center'}); doc.text(`Date: ${today}`,W/2,140,{align:'center'}); doc.text(`Level: ${c.level}`,W-70,140,{align:'center'});
  doc.setFontSize(8); doc.setTextColor(71,85,105); doc.text('Verified by LearnSpark Academy',W/2,H-16,{align:'center'});
  doc.save(`LearnSpark_${dname}_${c.id.toUpperCase()}.pdf`);
  showToast('📥 Certificate downloaded!','#68d391');
}

// ═══════════════════════════════════════════════════════════
// ✅ TASK TRACKER
// ═══════════════════════════════════════════════════════════
function catIconClass(cat) {
  const m = {'📖 Study':'tic-study','🏋️ Exercise':'tic-exercise','🥗 Health':'tic-health','🌱 Personal':'tic-personal','💼 Work':'tic-work'};
  return m[cat] || 'tic-study';
}
function pickTaskCat(btn) {
  document.querySelectorAll('.task-cat-pill').forEach(p => p.classList.remove('active')); btn.classList.add('active'); selectedTaskCat = btn.dataset.cat;
}
function setTaskFilter(f, btn) {
  userTaskFilter = f; document.querySelectorAll('.task-filter-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); renderTaskList();
}
function addUserTask() {
  const inp = document.getElementById('new-task-input');
  const title = (inp?.value || '').trim();
  if (!title) { showToast('⚠️ Please enter an activity name!', '#f6ad55'); inp?.focus(); return; }
  const u = getUser();
  u.tasks.unshift({ id: Date.now()+Math.random(), title, category: selectedTaskCat, icon: selectedTaskCat.split(' ')[0], tic: catIconClass(selectedTaskCat), status: 'pending', preset: false, createdAt: new Date().toISOString(), doneAt: null });
  addActivity(`Added task: "${title}"`, null, 'task', '📝');
  saveData(); if (inp) inp.value = '';
  showToast('✅ Activity added!', '#68d391');
  renderTasksSection();
}

/**
 * ✅ FIXED: Toggle task done/pending.
 * - Sets status + doneAt timestamp
 * - Calls renderTasksSection() for instant UI update (no reload)
 * - Also syncs profile summary via buildProfileTasksSummary()
 */
function toggleUserTask(taskId) {
  const u = getUser();
  const task = u.tasks.find(t => t.id === taskId); if (!task) return;
  if (task.status === 'pending') {
    task.status = 'done';
    task.doneAt = new Date().toISOString();
    addActivity(`Completed: "${task.title}"`, null, 'task', '✅');
    saveData();
    showToast('⚡ Activity completed! +20 XP', '#68d391');
  } else {
    task.status = 'pending';
    task.doneAt = null;
    saveData();
    showToast('↩ Marked as pending again', '#f6ad55');
  }
  renderTasksSection();
  // Also refresh profile summary if it's visible
  if (document.getElementById('ptab-tasks')?.classList.contains('active')) buildProfileTasksSummary();
}

function deleteUserTask(taskId) {
  const u = getUser(); u.tasks = u.tasks.filter(t => t.id !== taskId); saveData();
  showToast('🗑️ Task removed', '#fc8181'); renderTasksSection();
}

/** Master render: update counter + list */
function renderTasksSection() { updateTaskProgressUI(); renderTaskList(); }

/**
 * ✅ FIXED: Updates "X out of Y activities completed" counter,
 * progress bar percentage, and all-done banner — all in sync.
 */
function updateTaskProgressUI() {
  const tasks = getUser().tasks || [];
  const total = tasks.length, done = tasks.filter(t => t.status === 'done').length;
  const pct = total > 0 ? Math.round(done/total*100) : 0;
  const lc = document.getElementById('tasks-live-count');       if (lc) lc.textContent = `${done} out of ${total} activities completed`;
  const fill = document.getElementById('tpbar-fill');            if (fill) fill.style.width = pct + '%';
  const dl = document.getElementById('tpbar-done-label');        if (dl) dl.textContent = `${done} completed`;
  const pl = document.getElementById('tpbar-pct-label');         if (pl) pl.textContent = `${pct}%`;
  const banner = document.getElementById('all-tasks-done');
  if (banner) { total > 0 && done === total ? banner.classList.remove('hidden') : banner.classList.add('hidden'); }
}

/**
 * ✅ FIXED: Renders task list with correct status badge, done styling,
 * and completion timestamp — all driven directly from the data array.
 */
function renderTaskList() {
  const el = document.getElementById('tasks-list-container'); if (!el) return;
  const tasks = getUser().tasks || [];
  let filtered = userTaskFilter === 'pending' ? tasks.filter(t => t.status==='pending') :
                 userTaskFilter === 'done'    ? tasks.filter(t => t.status==='done') : tasks;
  if (filtered.length === 0) {
    const msgs = { all:'No activities yet. Add your first one above! 📝', pending:'🎉 No pending activities — all done!', done:'No completed activities yet. Start checking them off!' };
    el.innerHTML = `<div class="tasks-empty-state"><div class="ei">${userTaskFilter==='pending'?'🎉':'📋'}</div><p>${msgs[userTaskFilter]}</p></div>`;
    return;
  }
  el.innerHTML = filtered.map(task => {
    const isDone = task.status === 'done';
    const tic = task.tic || catIconClass(task.category);
    const date = new Date(task.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short'});
    // ✅ Completion timestamp shown under done tasks (Best addition #3)
    const doneAt = isDone && task.doneAt ? `<span class="task-done-at">✓ Done ${new Date(task.doneAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span>` : '';
    return `
      <div class="task-item${isDone?' task-done':''}" id="task-${task.id}">
        <div class="task-chk" onclick="toggleUserTask(${task.id})" title="${isDone?'Mark as pending':'Mark as done'}">${isDone?'✓':''}</div>
        <div class="task-ico ${tic}">${task.icon||'📌'}</div>
        <div class="task-item-body">
          <div class="task-item-title">${esc(task.title)}</div>
          <div class="task-item-meta">
            <span class="task-cat-tag">${task.category}</span>
            <span class="task-item-date">Added ${date}</span>
            ${task.preset ? '<span class="task-preset-chip">⭐ Course Task</span>' : ''}
            ${doneAt}
          </div>
        </div>
        <span class="task-status-badge ${isDone?'tsb-done':'tsb-pending'}">${isDone?'✅ DONE':'⏳ PENDING'}</span>
        <button class="task-del-btn" onclick="deleteUserTask(${task.id})" title="Delete">🗑</button>
      </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════
// ACTIVITY FEED
// ═══════════════════════════════════════════════════════════
function addActivity(msg, cid, type, icon) {
  const u = getUser();
  u.activities.unshift({msg, cid, type, icon, time: new Date().toISOString()});
  if (u.activities.length > 50) u.activities = u.activities.slice(0,50);
}
function buildActivity() {
  const u = getUser(); let comp = 0, quizzes = 0, watched = 0;
  COURSES.forEach(c => { const p = getProgress(c.id); if (p.completed) comp++; if (p.quizScore!==null) quizzes++; if (p.videoWatched) watched++; });
  const tasksDone = (u.tasks||[]).filter(t => t.status === 'done').length;
  document.getElementById('daily-stats').innerHTML = `
    <div class="glass" style="padding:1.2rem;border-radius:12px;text-align:center"><div style="font-size:2rem">📚</div><div style="font-family:'Orbitron',monospace;font-size:1.5rem;color:var(--cyan)">${comp}</div><div style="color:var(--muted);font-size:.85rem">Courses Done</div></div>
    <div class="glass" style="padding:1.2rem;border-radius:12px;text-align:center"><div style="font-size:2rem">✅</div><div style="font-family:'Orbitron',monospace;font-size:1.5rem;color:var(--green)">${tasksDone}</div><div style="color:var(--muted);font-size:.85rem">Tasks Done</div></div>
    <div class="glass" style="padding:1.2rem;border-radius:12px;text-align:center"><div style="font-size:2rem">🎯</div><div style="font-family:'Orbitron',monospace;font-size:1.5rem;color:var(--orange)">${quizzes}</div><div style="color:var(--muted);font-size:.85rem">Quizzes</div></div>
    <div class="glass" style="padding:1.2rem;border-radius:12px;text-align:center"><div style="font-size:2rem">🏆</div><div style="font-family:'Orbitron',monospace;font-size:1.5rem;color:var(--purple)">${comp*100+tasksDone*20}</div><div style="color:var(--muted);font-size:.85rem">XP</div></div>`;
  const list = document.getElementById('activity-list');
  if (!u.activities?.length) { list.innerHTML = `<div class="glass" style="padding:3rem;text-align:center;color:var(--muted)"><div style="font-size:3rem;margin-bottom:1rem">📋</div>No activity yet.</div>`; return; }
  list.innerHTML = u.activities.map(a => {
    const d = new Date(a.time), ts = d.toLocaleDateString()+' '+d.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
    const col = a.type==='cert'?'var(--orange)':a.type==='quiz'?'var(--green)':a.type==='watched'?'var(--cyan)':a.type==='task'?'var(--purple)':'var(--muted)';
    return `<div class="activity-item">
      <div class="activity-icon" style="background:${col}22;color:${col}">${a.icon}</div>
      <div style="flex:1"><div style="font-weight:700">${a.msg}</div><div style="color:var(--muted);font-size:.82rem">${currentUser}'s journey</div></div>
      <div style="color:var(--muted);font-size:.75rem;white-space:nowrap">${ts}</div>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════
// LEADERBOARD
// ═══════════════════════════════════════════════════════════
function buildLeaderboard() {
  const scores = getAllStudents().map(s => {
    const d = allData[s.name]||{}; let xp = 0, comp = 0;
    COURSES.forEach(c => { const p = (d.progress||{})[c.id]||{}; if (p.completed){xp+=100;comp++;} if (p.quizScore) xp+=~~(p.quizScore*.5); if (p.videoWatched) xp+=10; });
    xp += ((d.tasks||[]).filter(t => t.status==='done').length) * 20;
    return {name:s.name, emoji:s.emoji, color:s.color, xp, comp};
  }).sort((a,b) => b.xp-a.xp);
  const M = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
  document.getElementById('leaderboard-list').innerHTML = `
    <div style="margin-bottom:2rem">${scores.slice(0,3).map((s,i)=>`
      <div class="lb-item rank-${i+1}">
        <div class="lb-rank" style="color:${i===0?'#f6ad55':i===1?'#94a3b8':'#cd7f32'}">${M[i]}</div>
        <div class="lb-avatar" style="background:${s.color}">${s.emoji}</div>
        <div class="lb-info"><div class="lb-name">${s.name}${s.name===currentUser?' (You)':''}</div><div class="lb-score">${s.comp}/3 courses</div></div>
        <div class="lb-points">${s.xp} XP</div>
      </div>`).join('')}
    </div>
    <div class="section-title">All Students</div>
    ${scores.map((s,i)=>`
      <div class="lb-item">
        <div class="lb-rank" style="color:var(--muted)">${M[i]||String(i+1)}</div>
        <div class="lb-avatar" style="background:${s.color}">${s.emoji}</div>
        <div class="lb-info"><div class="lb-name">${s.name}${s.name===currentUser?' 👈':''}</div>
          <div class="progress-bar" style="margin:.3rem 0 0"><div class="progress-fill" style="width:${Math.min(100,(s.xp/300)*100)}%;background:${s.color}"></div></div></div>
        <div class="lb-points">${s.xp} XP</div>
      </div>`).join('')}`;
}

// ═══════════════════════════════════════════════════════════
// CALENDAR
// ═══════════════════════════════════════════════════════════
function updateCalendar() { const u = getUser(), t = new Date().toISOString().split('T')[0]; u.calData = u.calData||{}; u.calData[t] = (u.calData[t]||0)+1; }
function buildCalendar() {
  const u = getUser(), cd = u.calData||{}, grid = document.getElementById('cal-grid'), today = new Date();
  grid.innerHTML = '';
  for (let w = 51; w >= 0; w--) for (let d = 0; d < 7; d++) {
    const dt = new Date(today); dt.setDate(dt.getDate()-(w*7+d)); const k = dt.toISOString().split('T')[0], v = cd[k]||0;
    const el = document.createElement('div'); el.className = 'cal-cell'+(v===0?'':v===1?' a1':v===2?' a2':' a3');
    el.title = `${k}: ${v} activities`; grid.appendChild(el);
  }
}

// ═══════════════════════════════════════════════════════════
// PROFILE EDIT / SETTINGS / UTILS
// ═══════════════════════════════════════════════════════════
function openEditModal() {
  const u = getUser(), pr = u.profile||{};
  document.getElementById('edit-name').value = pr.displayName || currentUser;
  document.getElementById('edit-bio').value  = pr.bio || '';
  const ep = document.getElementById('emoji-pick');
  ep.innerHTML = EMOJIS.map(e => `<div class="emoji-opt${pr.emoji===e?' sel':''}" onclick="selEmoji(this,'${e}')">${e}</div>`).join('');
  openModal('modal-edit');
}
function selEmoji(el, e) { document.querySelectorAll('.emoji-opt').forEach(x => x.classList.remove('sel')); el.classList.add('sel'); el.dataset.e = e; }
function saveEditProfile() {
  const u = getUser(); if (!u.profile) u.profile = {};
  u.profile.displayName = document.getElementById('edit-name').value.trim() || currentUser;
  u.profile.bio         = document.getElementById('edit-bio').value.trim() || '';
  const sel = document.querySelector('.emoji-opt.sel'); if (sel) u.profile.emoji = sel.textContent;
  saveData(); closeModal('modal-edit'); buildProfilePage(); showToast('✅ Profile updated!','#68d391');
}
function buildNewPinPad() { newPinBuffer = ''; updateDots('npd',0,false); document.getElementById('new-pin-err').textContent = ''; buildPinPad('new-pin-pad', handleNewPin); }
function handleNewPin(key) {
  if (key === 'del') newPinBuffer = newPinBuffer.slice(0,-1);
  else if (key === 'ok') { confirmNewPin(); return; }
  else if (typeof key === 'number' && newPinBuffer.length < 4) newPinBuffer += String(key);
  updateDots('npd', newPinBuffer.length, false);
  if (newPinBuffer.length === 4) setTimeout(confirmNewPin, 180);
}
function confirmNewPin() {
  if (newPinBuffer.length < 4) { document.getElementById('new-pin-err').textContent = 'Enter 4 digits'; return; }
  setPin(currentUser, newPinBuffer); saveData(); closeModal('modal-pin'); newPinBuffer = '';
  showToast('🔐 PIN changed!','#68d391');
}
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function doReset() {
  if (!confirm(`⚠️ Reset all progress for ${currentUser}?\nThis cannot be undone.`)) return;
  const u = getUser(); u.progress = {}; u.activities = []; u.calData = {}; u.tasks = [];
  seedPresetTasks();
  saveData(); buildProfilePage(); showToast('🔄 Progress reset!','#f6ad55');
}
function logout() {
  saveData(); currentUser = null; pinBuffer = ''; loginAttempts = 0; regPinFirst = ''; regConfirmPin = '';
  document.getElementById('page-login').style.display = 'flex';
  document.getElementById('page-app').style.display    = 'none';
  document.getElementById('page-profile').style.display = 'none';
  document.getElementById('page-profile').classList.remove('active');
  switchLoginTab('login'); buildLogin();
}
function toggleDark() {
  darkMode = !darkMode; document.body.classList.toggle('light-mode', darkMode);
  document.querySelectorAll('.dark-toggle').forEach(b => b.textContent = darkMode ? '☀️' : '🌙');
  const sw = document.getElementById('dark-sw'); if (sw) sw.checked = darkMode;
}
let _toastTimer;
function showToast(msg, color='#63b3ed') {
  const t = document.getElementById('toast'); t.innerHTML = `<span>${msg}</span>`;
  t.style.display = 'flex'; t.style.borderColor = color; t.style.color = color;
  clearTimeout(_toastTimer); _toastTimer = setTimeout(() => t.style.display = 'none', 3000);
}

// ═══════════════════════════════════════════════════════════
// INIT — fetch events.json first, then boot UI
// ═══════════════════════════════════════════════════════════
async function init() {
  await loadEventsJSON();   // load data from events.json (or fallback)
  loadData();               // load user state from localStorage
  buildLogin();

  document.getElementById('tab-login').addEventListener('click',    () => switchLoginTab('login'));
  document.getElementById('tab-register').addEventListener('click', () => switchLoginTab('register'));
  document.getElementById('reg-next-btn').addEventListener('click', regNext1);
  document.getElementById('reg-back-2').addEventListener('click',   () => regBack(1));
  document.getElementById('reg-back-3').addEventListener('click',   () => regBack(2));

  const ti = document.getElementById('new-task-input');
  if (ti) ti.addEventListener('keydown', e => { if (e.key === 'Enter') addUserTask(); });
}

document.addEventListener('DOMContentLoaded', init);
