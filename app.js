let program;
let programs = [];
let currentFile = localStorage.getItem('programFile') || '';
const legacyFile = currentFile;
const legacyWeek = +(localStorage.getItem('week') || 0);
let legacyWeekAvailable = true;
let week = 0;
let weekAnchor;
const dayMap = {1: 0, 3: 1, 5: 2};
const dow = new Date().getDay();
let day = dow in dayMap ? dayMap[dow] : +(localStorage.getItem('day') || 0);

let pendingFile = null;

// Use local calendar dates, so daylight-saving changes do not shift the rollover.
function calendarWeekStart(date = new Date()) {
  const daysSinceMonday = (date.getDay() + 6) % 7;
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate() - daysSinceMonday) / 86400000;
}

function maxWeeks() {
  return program?.days[0]?.exercises[0]?.weeks.length || 6;
}

function restoreWeek() {
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(`${currentFile}-progress`));
  } catch {
    // Fall back to the current week if stored progress is damaged.
  }
  week = Number.isInteger(saved?.week) && saved.week >= 0
    ? saved.week
    : legacyWeekAvailable && (!legacyFile || currentFile === legacyFile) && Number.isInteger(legacyWeek) && legacyWeek >= 0 ? legacyWeek : 0;
  weekAnchor = Number.isInteger(saved?.weekAnchor) ? saved.weekAnchor : calendarWeekStart();
  legacyWeekAvailable = false;
  localStorage.removeItem('week');
}

function syncWeek() {
  const today = calendarWeekStart();
  const elapsed = Math.max(0, Math.floor((today - weekAnchor) / 7));
  week = Math.max(0, Math.min(maxWeeks() - 1, week + elapsed));
  if (elapsed > 0) weekAnchor = today;
  localStorage.setItem(`${currentFile}-progress`, JSON.stringify({ week, weekAnchor }));
}

fetch('programs.json?v=' + Date.now())
  .then(r => r.json())
  .then(list => {
    programs = list;
    if (!currentFile || !list.find(p => p.file === currentFile)) currentFile = list[0].file;
    pendingFile = currentFile;
    renderProgramList();
    loadProgram(currentFile);
  });

function renderProgramList() {
  document.getElementById('programList').innerHTML = programs.map(p =>
    `<button class="list-group-item list-group-item-action ${p.file === pendingFile ? 'list-group-item-dark' : ''}" onclick="selectProgram('${p.file}')">${p.name}</button>`
  ).join('');
}

function selectProgram(file) {
  pendingFile = file;
  renderProgramList();
}

function confirmProgram() {
  loadProgram(pendingFile);
  bootstrap.Modal.getInstance(document.getElementById('settingsModal')).hide();
}

function loadProgram(file) {
  fetch(file + '?v=' + Date.now())
    .then(r => r.json())
    .then(data => {
      currentFile = file;
      localStorage.setItem('programFile', file);
      program = data;
      restoreWeek();
      render();
    });
}

document.getElementById('settingsModal').addEventListener('show.bs.modal', () => { pendingFile = currentFile; renderProgramList(); });

function change(type, delta) {
  if (!program) return;
  syncWeek();
  if (type === 'week') {
    week = Math.max(0, Math.min(maxWeeks() - 1, week + delta));
    weekAnchor = calendarWeekStart();
  }
  else day = Math.max(0, Math.min((program?.days.length || 3) - 1, day + delta));
  render();
}

function toggle(i, checked) {
  // Refresh first if this checkbox belongs to a week that just ended.
  const displayedWeek = week;
  syncWeek();
  if (displayedWeek !== week) { render(); return; }
  localStorage.setItem(`${currentFile}-${day}-${week}-${i}`, checked ? '1' : '0');
  render();
}

function render() {
  if (!program) return;
  syncWeek();
  const weekCount = maxWeeks();
  const maxDays = program.days.length;
  if (day >= maxDays) day = maxDays - 1;
  localStorage.setItem('day', day);

  // Nav labels
  document.getElementById('weekText').textContent = `Week ${week + 1}`;
  const dayName = (program.days[day]?.name || `Day ${day + 1}`).replace(/ - (Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) /, ' - ').replace(/[()]/g, '');
  document.getElementById('dayText').textContent = dayName;

  // Disable nav buttons at boundaries
  document.getElementById('weekPrev').disabled = week === 0;
  document.getElementById('weekNext').disabled = week === weekCount - 1;
  document.getElementById('dayPrev').disabled = day === 0;
  document.getElementById('dayNext').disabled = day === maxDays - 1;

  // Exercises
  const exercises = program.days[day].exercises;
  const rows = exercises.map((e, i) => {
    const val = e.weeks[week];
    if (val === '-') return `<tr class="rest-row"><td>${e.name}</td><td colspan="2">Rest</td><td></td></tr>`;
    const [s, r] = val.split('x');
    const key = `${currentFile}-${day}-${week}-${i}`;
    const checked = localStorage.getItem(key) === '1';
    return `<tr class="${checked ? 'table-success' : ''}"><td>${e.name}</td><td>${s}</td><td>${r}</td><td><input type="checkbox" class="form-check-input" ${checked ? 'checked' : ''} onchange="toggle(${i}, this.checked)"></td></tr>`;
  }).join('');
  document.getElementById('exercises').innerHTML = rows;
}

function confirmReset() {
  new bootstrap.Modal(document.getElementById('confirmModal')).show();
}

function resetProgress() {
  const target = pendingFile || currentFile;
  Object.keys(localStorage).filter(k => k.startsWith(target + '-')).forEach(k => localStorage.removeItem(k));
  if (target === currentFile) {
    week = 0;
    weekAnchor = calendarWeekStart();
  }
  bootstrap.Modal.getInstance(document.getElementById('confirmModal')).hide();
  bootstrap.Modal.getInstance(document.getElementById('settingsModal')).hide();
  render();
}

// Also advance when the app stays open or returns from the background.
setInterval(() => { if (program) render(); }, 60000);
window.addEventListener('focus', () => { if (program) render(); });
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && program) render();
});
