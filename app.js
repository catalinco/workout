let program;
let programs = [];
let currentFile = localStorage.getItem('programFile') || '';
let week = +(localStorage.getItem('week') || 0);
const dayMap = {1: 0, 3: 1, 5: 2};
const dow = new Date().getDay();
let day = dow in dayMap ? dayMap[dow] : +(localStorage.getItem('day') || 0);

fetch('programs.json?v=' + Date.now())
  .then(r => r.json())
  .then(list => {
    programs = list;
    if (!currentFile || !list.find(p => p.file === currentFile)) currentFile = list[0].file;
    const sel = document.getElementById('programSelect');
    sel.innerHTML = list.map(p => `<option value="${p.file}" ${p.file === currentFile ? 'selected' : ''}>${p.name}</option>`).join('');
    loadProgram(currentFile);
  });

function loadProgram(file) {
  currentFile = file;
  localStorage.setItem('programFile', file);
  fetch(file + '?v=' + Date.now())
    .then(r => r.json())
    .then(data => { program = data; render(); });
}

function selectProgram(file) {
  loadProgram(file);
}

function change(type, delta) {
  if (type === 'week') week = Math.max(0, Math.min((program?.days[0]?.exercises[0]?.weeks.length || 6) - 1, week + delta));
  else day = Math.max(0, Math.min((program?.days.length || 3) - 1, day + delta));
  render();
}

function toggle(i, checked) {
  localStorage.setItem(`${currentFile}-${day}-${week}-${i}`, checked ? '1' : '0');
  render();
}

function render() {
  if (!program) return;
  localStorage.setItem('week', week);
  localStorage.setItem('day', day);
  const maxWeeks = program.days[0]?.exercises[0]?.weeks.length || 6;
  const maxDays = program.days.length;
  if (week >= maxWeeks) week = maxWeeks - 1;
  if (day >= maxDays) day = maxDays - 1;
  document.getElementById('weekText').textContent = `Week ${week + 1}`;
  const dayName = (program.days[day]?.name || `Day ${day + 1}`).replace(/ - (Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) /,' - ').replace(/[()]/g,'');
  document.getElementById('dayText').textContent = dayName;
  document.getElementById('exercises').innerHTML = program.days[day].exercises
    .map((e, i) => { const [s,r] = e.weeks[week].split('x'); const key = `${currentFile}-${day}-${week}-${i}`; const checked = localStorage.getItem(key) === '1'; return `<tr class="${checked ? 'table-success' : ''}"><td>${e.name}</td><td>${s}</td><td>${r}</td><td><input type="checkbox" class="form-check-input" ${checked ? 'checked' : ''} onchange="toggle(${i}, this.checked)"></td></tr>`; }).join('');
}

function resetProgress() {
  Object.keys(localStorage).filter(k => k.startsWith(currentFile + '-')).forEach(k => localStorage.removeItem(k));
  bootstrap.Modal.getInstance(document.getElementById('settingsModal')).hide();
  render();
}
