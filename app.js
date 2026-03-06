let program;
let week = +(localStorage.getItem('week') || 0);
let day = +(localStorage.getItem('day') || 0);

fetch('program.json')
  .then(r => r.json())
  .then(data => { program = data; render(); });

function change(type, delta) {
  if (type === 'week') week = Math.max(0, Math.min(5, week + delta));
  else day = Math.max(0, Math.min(3, day + delta));
  render();
}

function toggle(i, checked) {
  localStorage.setItem(`${day}-${week}-${i}`, checked ? '1' : '0');
  render();
}

function render() {
  if (!program) return;
  localStorage.setItem('week', week);
  localStorage.setItem('day', day);
  document.getElementById('weekText').textContent = `Week ${week + 1}`;
  document.getElementById('dayText').textContent = program.days[day].name;
  document.getElementById('exercises').innerHTML = program.days[day].exercises
    .map((e, i) => { const [s,r] = e.weeks[week].split('x'); const key = `${day}-${week}-${i}`; const checked = localStorage.getItem(key) === '1'; return `<tr class="${checked ? 'table-success' : ''}"><td>${e.name}</td><td>${s}</td><td>${r}</td><td><input type="checkbox" class="form-check-input" ${checked ? 'checked' : ''} onchange="toggle(${i}, this.checked)"></td></tr>`; }).join('');
}

function resetProgress() {
  Object.keys(localStorage).filter(k => /^\d+-\d+-\d+$/.test(k)).forEach(k => localStorage.removeItem(k));
  bootstrap.Modal.getInstance(document.getElementById('settingsModal')).hide();
  render();
}
