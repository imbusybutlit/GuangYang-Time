// ========================================================
// guangyang time — app.js
// ========================================================

// -- periods --
const PERIODS = [
  { i: 0,  label: '0',  start: '07:30', end: '08:00' },
  { i: 1,  label: '1',  start: '08:00', end: '08:30' },
  { i: 2,  label: '2',  start: '08:30', end: '09:00' },
  { i: 3,  label: '3',  start: '09:00', end: '09:30' },
  { i: 4,  label: '4',  start: '09:30', end: '10:00' },
  { i: 5,  label: '5',  start: '10:00', end: '10:30', isBreak: true },
  { i: 6,  label: '6',  start: '10:30', end: '11:00' },
  { i: 7,  label: '7',  start: '11:00', end: '11:30' },
  { i: 8,  label: '8',  start: '11:30', end: '12:00' },
  { i: 9,  label: '9',  start: '12:00', end: '12:30' },
  { i: 10, label: '10', start: '12:30', end: '13:00' },
  { i: 11, label: '11', start: '13:00', end: '13:30' },
  { i: 12, label: '12', start: '13:30', end: '14:00' },
  { i: 13, label: '13', start: '14:00', end: '14:30' },
  { i: 14, label: '14', start: '14:30', end: '15:00' },
  { i: 15, label: '15', start: '15:00', end: '15:30' },
  { i: 16, label: '16', start: '15:30', end: '16:00' },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DAY_SHORT = ['mon', 'tue', 'wed', 'thu', 'fri'];
const DAY_IDX = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 };

const DIFF_LABELS = ['', 'easy ~15m', 'medium ~30m', 'hard ~1h', 'very hard ~2h'];
const DIFF_MINS = [0, 15, 30, 60, 120];

const CLASSES = [
  '1-1','1-2','1-3','1-4','1-5','1-6','1-7',
  '2-1','2-2','2-3','2-4','2-5','2-6','2-7',
  '3-1','3-2','3-3','3-4','3-5','3-6',
  '4E1','4E2','4E3','4N1','4N2','4N3','4T1','5N1'
];

// -- state --
let ttData = {};
let state = loadState();

// -- load timetable data --
fetch('timetable-data.json')
  .then(r => r.json())
  .then(d => { ttData = d; init(); })
  .catch(() => { init(); });

function loadState() {
  return {
    selectedClass: localStorage.getItem('gy_class') || '',
    weekType: localStorage.getItem('gy_week') || '5day',
    ttOverrides: JSON.parse(localStorage.getItem('gy_tt_overrides') || '{}'),
    homework: JSON.parse(localStorage.getItem('gy_homework') || '[]'),
    events: JSON.parse(localStorage.getItem('gy_events') || '[]'),
  };
}
function save(key, val) { localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val)); }

// -- helpers --
function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function toMins(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }

function fmtDate(d) {
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' }).toLowerCase();
}

function daysUntil(d) {
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.ceil((new Date(d + 'T00:00:00') - today) / 86400000);
}

function urgencyLabel(d) {
  const n = daysUntil(d);
  if (n < 0) return 'overdue';
  if (n === 0) return 'due today';
  if (n === 1) return 'tomorrow';
  return n + ' days';
}

function currentPeriodIdx() {
  const now = new Date();
  const m = now.getHours() * 60 + now.getMinutes();
  for (let i = 0; i < PERIODS.length; i++) {
    if (m >= toMins(PERIODS[i].start) && m < toMins(PERIODS[i].end)) return i;
  }
  return -1;
}

function getTT(cls, week) {
  const base = (ttData[cls] && ttData[cls][week]) || {};
  const overKey = cls + '_' + week;
  const over = state.ttOverrides[overKey] || {};
  // merge: overrides take priority
  const merged = {};
  for (const day of DAYS) {
    const baseArr = base[day] || [];
    const overArr = over[day] || [];
    merged[day] = [];
    for (let i = 0; i < 17; i++) {
      merged[day][i] = (overArr[i] !== undefined && overArr[i] !== '') ? overArr[i] : (baseArr[i] || '');
    }
  }
  return merged;
}

// -- clock --
function tickClock() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  $('#header-clock').textContent = hh + ':' + mm;
  $('#header-date').textContent = now.toLocaleDateString('en-SG', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).toLowerCase();
}

// ========================
// navigation
// ========================
$$('.tab').forEach(tab => {
  tab.addEventListener('click', e => {
    e.preventDefault();
    $$('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    $$('.page').forEach(p => p.classList.remove('active'));
    $('#page-' + tab.dataset.page).classList.add('active');
    refreshPage(tab.dataset.page);
  });
});

function refreshPage(name) {
  if (name === 'now') renderNow();
  if (name === 'timetable') renderTimetable();
  if (name === 'homework') renderHomework();
  if (name === 'events') renderEvents();
}

// ========================
// now page
// ========================
function renderNow() {
  state = loadState();
  const now = new Date();
  const dayIdx = DAY_IDX[now.getDay()];
  const pIdx = currentPeriodIdx();
  const tt = getTT(state.selectedClass, state.weekType);

  // hero
  if (dayIdx === undefined) {
    $('#now-subject').textContent = 'weekend';
    $('#now-time').textContent = 'no school today';
    $('#now-next-subject').textContent = '--';
    $('#now-next-time').textContent = '';
  } else if (pIdx === -1) {
    const m = now.getHours() * 60 + now.getMinutes();
    if (m < toMins(PERIODS[0].start)) {
      $('#now-subject').textContent = 'before school';
      $('#now-time').textContent = 'starts at ' + PERIODS[0].start;
    } else {
      $('#now-subject').textContent = 'after school';
      $('#now-time').textContent = 'school has ended';
    }
    $('#now-next-subject').textContent = '--';
    $('#now-next-time').textContent = '';
  } else {
    const p = PERIODS[pIdx];
    const subj = p.isBreak ? 'recess' : (tt[DAYS[dayIdx]][pIdx] || 'period ' + pIdx);
    $('#now-subject').textContent = subj || '--';
    $('#now-time').textContent = p.start + ' – ' + p.end;
    if (pIdx + 1 < PERIODS.length) {
      const np = PERIODS[pIdx + 1];
      const ns = np.isBreak ? 'recess' : (tt[DAYS[dayIdx]][pIdx + 1] || 'period ' + (pIdx + 1));
      $('#now-next-subject').textContent = ns;
      $('#now-next-time').textContent = np.start;
    } else {
      $('#now-next-subject').textContent = 'end of school';
      $('#now-next-time').textContent = '';
    }
  }

  // today's schedule
  const schedEl = $('#now-schedule');
  if (dayIdx === undefined) {
    schedEl.innerHTML = '<div class="empty">no school today</div>';
  } else {
    const dayTT = tt[DAYS[dayIdx]];
    let html = '';
    for (let i = 0; i < PERIODS.length; i++) {
      const p = PERIODS[i];
      const subj = p.isBreak ? 'recess' : (dayTT[i] || '');
      if (!subj) continue;
      const isCurrent = i === pIdx;
      html += `<div class="sched-row ${isCurrent ? 'is-now' : ''}">
        <span class="sched-subj">${subj}</span>
        <span class="sched-time">${p.start}–${p.end}</span>
      </div>`;
    }
    schedEl.innerHTML = html || '<div class="empty">no timetable set</div>';
  }

  // urgent homework
  const urgentEl = $('#now-urgent');
  const pending = state.homework.filter(h => !h.completed).sort((a, b) => daysUntil(a.due) - daysUntil(b.due));
  if (!pending.length) {
    urgentEl.innerHTML = '<div class="empty">no pending homework</div>';
  } else {
    urgentEl.innerHTML = pending.slice(0, 5).map(h => {
      return `<div class="urgent-row">
        <span>${h.subject}: ${h.title}</span>
        <span class="tag">${urgencyLabel(h.due)}</span>
      </div>`;
    }).join('');
  }

  // upcoming events
  const evtEl = $('#now-events');
  const upcoming = state.events.filter(e => daysUntil(e.date) >= 0)
    .sort((a, b) => daysUntil(a.date) - daysUntil(b.date)).slice(0, 4);
  if (!upcoming.length) {
    evtEl.innerHTML = '<div class="empty">no upcoming events</div>';
  } else {
    evtEl.innerHTML = upcoming.map(e =>
      `<div class="urgent-row"><span>${e.title}</span><span class="tag">${fmtDate(e.date)}</span></div>`
    ).join('');
  }
}

// ========================
// timetable page
// ========================
function populateClassSelect() {
  const sel = $('#class-select');
  sel.innerHTML = '<option value="">select class</option>';
  const groups = { 'sec 1': [], 'sec 2': [], 'sec 3': [], 'sec 4 & 5': [] };
  CLASSES.forEach(c => {
    if (c.startsWith('1-')) groups['sec 1'].push(c);
    else if (c.startsWith('2-')) groups['sec 2'].push(c);
    else if (c.startsWith('3-')) groups['sec 3'].push(c);
    else groups['sec 4 & 5'].push(c);
  });
  for (const [g, items] of Object.entries(groups)) {
    const og = document.createElement('optgroup');
    og.label = g;
    items.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; og.appendChild(o); });
    sel.appendChild(og);
  }
  sel.value = state.selectedClass;
}

function renderTimetable() {
  state = loadState();
  const tt = getTT(state.selectedClass, state.weekType);
  const now = new Date();
  const dayIdx = DAY_IDX[now.getDay()];
  const pIdx = currentPeriodIdx();

  const grid = $('#tt-grid');
  let html = '<table><thead><tr><th></th>';
  DAY_SHORT.forEach(d => html += `<th>${d}</th>`);
  html += '</tr></thead><tbody>';

  for (const p of PERIODS) {
    const isCurrent = p.i === pIdx;
    const cls = (p.isBreak ? ' is-break' : '') + (isCurrent ? ' is-now' : '');
    html += `<tr class="${cls}"><td class="time-col">${p.start}</td>`;
    for (let di = 0; di < 5; di++) {
      const subj = p.isBreak ? 'recess' : (tt[DAYS[di]][p.i] || '');
      html += `<td>${subj}</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  grid.innerHTML = html;
}

$('#class-select').addEventListener('change', e => {
  state.selectedClass = e.target.value;
  save('gy_class', e.target.value);
  renderTimetable();
});

$('#week-select').addEventListener('change', e => {
  state.weekType = e.target.value;
  save('gy_week', e.target.value);
  renderTimetable();
});

// timetable edit
$('#edit-tt-btn').addEventListener('click', () => {
  state = loadState();
  const tt = getTT(state.selectedClass, state.weekType);
  const tbody = $('#tt-edit-body');
  let html = '';
  for (const p of PERIODS) {
    if (p.isBreak) {
      html += `<tr><td class="td-label">${p.label}</td><td class="td-label">${p.start}</td>`;
      for (let d = 0; d < 5; d++) html += '<td class="td-label">recess</td>';
      html += '</tr>';
      continue;
    }
    html += `<tr><td class="td-label">${p.label}</td><td class="td-label">${p.start}</td>`;
    for (let d = 0; d < 5; d++) {
      const val = tt[DAYS[d]][p.i] || '';
      html += `<td><input type="text" value="${val}" data-day="${d}" data-period="${p.i}"></td>`;
    }
    html += '</tr>';
  }
  tbody.innerHTML = html;
  openModal('tt-modal');
});

$('#save-tt-btn').addEventListener('click', () => {
  const inputs = $$('#tt-edit-body input');
  const overKey = state.selectedClass + '_' + state.weekType;
  if (!state.ttOverrides[overKey]) state.ttOverrides[overKey] = {};
  const over = state.ttOverrides[overKey];
  inputs.forEach(inp => {
    const d = DAYS[inp.dataset.day];
    const p = parseInt(inp.dataset.period);
    if (!over[d]) over[d] = [];
    over[d][p] = inp.value.trim().toLowerCase();
  });
  save('gy_tt_overrides', state.ttOverrides);
  closeModal('tt-modal');
  renderTimetable();
});

// ========================
// homework page
// ========================
let hwFilter = 'pending';

function renderHomework() {
  state = loadState();
  let items = [...state.homework];

  switch (hwFilter) {
    case 'overdue': items = items.filter(h => !h.completed && daysUntil(h.due) < 0); break;
    case 'today': items = items.filter(h => !h.completed && daysUntil(h.due) === 0); break;
    case 'week': items = items.filter(h => !h.completed && daysUntil(h.due) >= 0 && daysUntil(h.due) <= 7); break;
    case 'done': items = items.filter(h => h.completed); break;
    default: items = items.filter(h => !h.completed); break;
  }

  items.sort((a, b) => daysUntil(a.due) - daysUntil(b.due));

  const el = $('#hw-list');
  if (!items.length) {
    el.innerHTML = '<div class="empty">' + (hwFilter === 'pending' ? 'no pending homework' : 'nothing here') + '</div>';
    return;
  }

  el.innerHTML = items.map(h => {
    const done = h.completed ? ' is-done' : '';
    return `<div class="hw-item${done}" data-id="${h.id}">
      <div class="hw-item-top">
        <div class="hw-item-left">
          <div class="hw-check${h.completed ? ' checked' : ''}" data-id="${h.id}">${h.completed ? 'x' : ''}</div>
          <div class="hw-info">
            <div class="hw-task">${h.subject}: ${h.title}</div>
            <div class="hw-meta">
              <span class="tag">${urgencyLabel(h.due)}</span>
              <span>${fmtDate(h.due)}</span>
              <span>${DIFF_LABELS[h.difficulty]}</span>
            </div>
          </div>
        </div>
        <div class="hw-actions">
          <button class="text-btn hw-edit" data-id="${h.id}">edit</button>
          <button class="text-btn hw-del" data-id="${h.id}">del</button>
        </div>
      </div>
      ${h.notes ? `<div class="hw-expanded"><div class="hw-notes-text">${h.notes}</div></div>` : ''}
    </div>`;
  }).join('');

  // listeners
  el.querySelectorAll('.hw-check').forEach(c => c.addEventListener('click', e => {
    e.stopPropagation();
    toggleHw(c.dataset.id);
  }));
  el.querySelectorAll('.hw-edit').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    editHw(b.dataset.id);
  }));
  el.querySelectorAll('.hw-del').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    deleteHw(b.dataset.id);
  }));
  el.querySelectorAll('.hw-item').forEach(item => {
    item.addEventListener('click', () => item.classList.toggle('open'));
  });
}

$$('#hw-filters .pill').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('#hw-filters .pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    hwFilter = btn.dataset.filter;
    renderHomework();
  });
});

$('#add-hw-btn').addEventListener('click', () => {
  $('#hw-modal-title').textContent = 'add homework';
  $('#hw-form').reset();
  $('#hw-edit-id').value = '';
  $('#hw-due').valueAsDate = new Date();
  $('#hw-diff').value = 2;
  updateDiffLabel();
  openModal('hw-modal');
});

$('#hw-diff').addEventListener('input', updateDiffLabel);
function updateDiffLabel() {
  $('#hw-diff-label').textContent = DIFF_LABELS[$('#hw-diff').value];
}

$('#hw-form').addEventListener('submit', e => {
  e.preventDefault();
  state = loadState();
  const editId = $('#hw-edit-id').value;
  const hw = {
    id: editId || genId(),
    subject: $('#hw-subject').value,
    title: $('#hw-title').value,
    due: $('#hw-due').value,
    difficulty: parseInt($('#hw-diff').value),
    notes: $('#hw-notes').value,
    completed: false,
  };
  if (editId) {
    const idx = state.homework.findIndex(h => h.id === editId);
    if (idx !== -1) { hw.completed = state.homework[idx].completed; state.homework[idx] = hw; }
  } else {
    state.homework.push(hw);
  }
  save('gy_homework', state.homework);
  closeModal('hw-modal');
  renderHomework();
});

function toggleHw(id) {
  state = loadState();
  const h = state.homework.find(x => x.id === id);
  if (h) { h.completed = !h.completed; save('gy_homework', state.homework); renderHomework(); }
}

function editHw(id) {
  state = loadState();
  const h = state.homework.find(x => x.id === id);
  if (!h) return;
  $('#hw-modal-title').textContent = 'edit homework';
  $('#hw-edit-id').value = h.id;
  $('#hw-subject').value = h.subject;
  $('#hw-title').value = h.title;
  $('#hw-due').value = h.due;
  $('#hw-diff').value = h.difficulty;
  $('#hw-notes').value = h.notes || '';
  updateDiffLabel();
  openModal('hw-modal');
}

function deleteHw(id) {
  if (!confirm('delete this homework?')) return;
  state = loadState();
  state.homework = state.homework.filter(h => h.id !== id);
  save('gy_homework', state.homework);
  renderHomework();
}

// ========================
// events page
// ========================
let calDate = new Date();

function renderEvents() {
  state = loadState();
  renderCalendar();
  renderEventsList();
}

function renderCalendar() {
  const y = calDate.getFullYear(), m = calDate.getMonth();
  $('#cal-month-label').textContent = new Date(y, m).toLocaleDateString('en-SG', { month: 'long', year: 'numeric' }).toLowerCase();

  const grid = $('#cal-grid');
  let html = ['mon','tue','wed','thu','fri','sat','sun'].map(d => `<div class="cal-head">${d}</div>`).join('');

  const first = new Date(y, m, 1);
  let start = first.getDay() - 1; if (start < 0) start = 6;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const prevDays = new Date(y, m, 0).getDate();
  const today = new Date();

  for (let i = start - 1; i >= 0; i--) {
    html += `<div class="cal-day other">${prevDays - i}</div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = today.getFullYear() === y && today.getMonth() === m && today.getDate() === d;
    const dayEvts = state.events.filter(e => e.date === ds);
    const dots = dayEvts.length ? `<div class="evt-dots">${dayEvts.map(() => '<span class="evt-dot"></span>').join('')}</div>` : '';
    html += `<div class="cal-day${isToday ? ' today' : ''}">${d}${dots}</div>`;
  }

  const total = start + daysInMonth;
  const rem = (7 - (total % 7)) % 7;
  for (let i = 1; i <= rem; i++) {
    html += `<div class="cal-day other">${i}</div>`;
  }

  grid.innerHTML = html;
}

function renderEventsList() {
  const el = $('#evt-list');
  const upcoming = state.events.filter(e => daysUntil(e.date) >= -1)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (!upcoming.length) {
    el.innerHTML = '<div class="empty">no events added yet</div>';
    return;
  }

  el.innerHTML = upcoming.map(e => `
    <div class="evt-item">
      <div class="evt-item-left">
        <span class="evt-date-col">${fmtDate(e.date)}</span>
        <span>${e.title}</span>
        <span class="tag">${e.type}</span>
      </div>
      <div class="evt-actions">
        <button class="text-btn evt-edit" data-id="${e.id}">edit</button>
        <button class="text-btn evt-del" data-id="${e.id}">del</button>
      </div>
    </div>
  `).join('');

  el.querySelectorAll('.evt-edit').forEach(b => b.addEventListener('click', () => editEvt(b.dataset.id)));
  el.querySelectorAll('.evt-del').forEach(b => b.addEventListener('click', () => deleteEvt(b.dataset.id)));
}

$('#prev-month').addEventListener('click', () => { calDate.setMonth(calDate.getMonth() - 1); renderCalendar(); });
$('#next-month').addEventListener('click', () => { calDate.setMonth(calDate.getMonth() + 1); renderCalendar(); });

$('#add-evt-btn').addEventListener('click', () => {
  $('#evt-modal-title').textContent = 'add event';
  $('#evt-form').reset();
  $('#evt-edit-id').value = '';
  $('#evt-date').valueAsDate = new Date();
  openModal('evt-modal');
});

$('#evt-form').addEventListener('submit', e => {
  e.preventDefault();
  state = loadState();
  const editId = $('#evt-edit-id').value;
  const evt = {
    id: editId || genId(),
    title: $('#evt-title').value.toLowerCase(),
    date: $('#evt-date').value,
    type: $('#evt-type').value,
    notes: $('#evt-notes').value,
  };
  if (editId) {
    const idx = state.events.findIndex(x => x.id === editId);
    if (idx !== -1) state.events[idx] = evt;
  } else {
    state.events.push(evt);
  }
  save('gy_events', state.events);
  closeModal('evt-modal');
  renderEvents();
});

function editEvt(id) {
  state = loadState();
  const e = state.events.find(x => x.id === id);
  if (!e) return;
  $('#evt-modal-title').textContent = 'edit event';
  $('#evt-edit-id').value = e.id;
  $('#evt-title').value = e.title;
  $('#evt-date').value = e.date;
  $('#evt-type').value = e.type;
  $('#evt-notes').value = e.notes || '';
  openModal('evt-modal');
}

function deleteEvt(id) {
  if (!confirm('delete this event?')) return;
  state = loadState();
  state.events = state.events.filter(x => x.id !== id);
  save('gy_events', state.events);
  renderEvents();
}

// ========================
// plan (ai advisor)
// ========================
$('#gen-plan-btn').addEventListener('click', () => {
  state = loadState();
  const pending = state.homework.filter(h => !h.completed);
  const out = $('#plan-output');

  if (!pending.length) {
    out.innerHTML = '<div class="empty">no pending homework to plan. you\'re all caught up.</div>';
    return;
  }

  const scored = pending.map(h => {
    const days = daysUntil(h.due);
    let score = 0;
    const reasons = [];

    // urgency
    if (days < 0)       { score += 100; reasons.push('overdue — do this immediately'); }
    else if (days === 0) { score += 90;  reasons.push('due today — highest priority'); }
    else if (days === 1) { score += 70;  reasons.push('due tomorrow — very urgent'); }
    else if (days <= 3)  { score += 50;  reasons.push('due in ' + days + ' days — start soon'); }
    else if (days <= 7)  { score += 25;  reasons.push('due this week'); }
    else                 { score += 10;  reasons.push('due in ' + days + ' days'); }

    // difficulty
    score += h.difficulty * 8;
    if (h.difficulty >= 3) reasons.push('high difficulty — needs more time');

    // core subjects
    const core = ['math','english','science','physics','chemistry','biology','a math','e math','mtl','chinese','malay','tamil'];
    if (core.includes(h.subject)) { score += 5; reasons.push('core subject'); }

    // quick win
    if (days <= 1 && h.difficulty <= 2) { score += 15; reasons.push('quick win — finish this first'); }

    return { ...h, score, reasons };
  });

  scored.sort((a, b) => b.score - a.score);

  const total = scored.reduce((s, h) => s + DIFF_MINS[h.difficulty], 0);
  const hrs = Math.floor(total / 60);
  const mins = total % 60;

  let html = `<div class="plan-summary">${scored.length} tasks pending. estimated total: ${hrs > 0 ? hrs + 'h ' : ''}${mins}m</div>`;

  html += scored.map((h, i) => `
    <div class="plan-item">
      <div class="plan-num">${i + 1}</div>
      <div class="plan-detail">
        <div class="plan-task">${h.subject}: ${h.title}</div>
        <div class="plan-reason">${h.reasons.join(' / ')} / est: ${DIFF_LABELS[h.difficulty]}</div>
      </div>
    </div>
  `).join('');

  html += '<div class="plan-tip">start with #1 and work down. take a 5-minute break between tasks. if you get stuck, switch to an easier one and come back.</div>';

  out.innerHTML = html;
});

// ========================
// modals
// ========================
function openModal(id) { $('#' + id).classList.add('active'); }
function closeModal(id) { $('#' + id).classList.remove('active'); }

$$('.modal-x, .modal-cancel').forEach(btn => {
  btn.addEventListener('click', () => btn.closest('.modal').classList.remove('active'));
});
$$('.modal').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('active'); });
});

// ========================
// init
// ========================
function init() {
  tickClock();
  setInterval(tickClock, 10000);
  populateClassSelect();
  $('#class-select').value = state.selectedClass;
  $('#week-select').value = state.weekType;
  renderNow();
  // auto refresh now page
  setInterval(() => {
    if ($('#page-now.active')) renderNow();
  }, 30000);
}
