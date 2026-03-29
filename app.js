// ========== Data & State ==========
const PERIODS = [
    { label: 'Period 1', start: '07:30', end: '08:00' },
    { label: 'Period 2', start: '08:00', end: '08:30' },
    { label: 'Period 3', start: '08:30', end: '09:00' },
    { label: 'Period 4', start: '09:00', end: '09:30' },
    { label: 'Period 5', start: '09:30', end: '10:00' },
    { label: 'Recess', start: '10:00', end: '10:30', isBreak: true },
    { label: 'Period 6', start: '10:30', end: '11:00' },
    { label: 'Period 7', start: '11:00', end: '11:30' },
    { label: 'Period 8', start: '11:30', end: '12:00' },
    { label: 'Period 9', start: '12:00', end: '12:30' },
    { label: 'Period 10', start: '12:30', end: '13:00' },
    { label: 'Period 11', start: '13:00', end: '13:30' },
    { label: 'Period 12', start: '13:30', end: '14:00' },
    { label: 'Period 13', start: '14:00', end: '14:30' },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DAY_MAP = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 };

function loadState() {
    return {
        timetable: JSON.parse(localStorage.getItem('gy_timetable') || '{}'),
        homework: JSON.parse(localStorage.getItem('gy_homework') || '[]'),
        events: JSON.parse(localStorage.getItem('gy_events') || '[]'),
        selectedClass: localStorage.getItem('gy_class') || '',
    };
}

function saveTimetable(tt) { localStorage.setItem('gy_timetable', JSON.stringify(tt)); }
function saveHomework(hw) { localStorage.setItem('gy_homework', JSON.stringify(hw)); }
function saveEvents(ev) { localStorage.setItem('gy_events', JSON.stringify(ev)); }
function saveClass(cls) { localStorage.setItem('gy_class', cls); }

let state = loadState();

// ========== Navigation ==========
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        const page = link.dataset.page;
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById('page-' + page).classList.add('active');
        if (page === 'dashboard') refreshDashboard();
        if (page === 'timetable') renderTimetable();
        if (page === 'homework') renderHomework();
        if (page === 'events') renderEvents();
    });
});

// ========== Helpers ==========
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' });
}

function daysUntil(dateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dateStr + 'T00:00:00');
    return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
}

function getUrgency(dateStr) {
    const d = daysUntil(dateStr);
    if (d < 0) return { label: 'Overdue', class: 'urgency-overdue' };
    if (d === 0) return { label: 'Due Today', class: 'urgency-today' };
    if (d === 1) return { label: 'Tomorrow', class: 'urgency-tomorrow' };
    if (d <= 5) return { label: `${d} days`, class: 'urgency-soon' };
    return { label: `${d} days`, class: 'urgency-later' };
}

function getSubjectClass(subject) {
    return 'subj-' + subject.toLowerCase().replace(/[^a-z]/g, '-').replace(/-+/g, '-');
}

function timeToMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

function getCurrentPeriodIndex() {
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    for (let i = 0; i < PERIODS.length; i++) {
        if (mins >= timeToMinutes(PERIODS[i].start) && mins < timeToMinutes(PERIODS[i].end)) {
            return i;
        }
    }
    return -1;
}

// ========== Dashboard ==========
function refreshDashboard() {
    state = loadState();
    // Current date/time
    const now = new Date();
    document.getElementById('current-datetime').textContent =
        now.toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) +
        ' \u2022 ' + now.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' });

    // Current period
    const dayIdx = DAY_MAP[now.getDay()];
    const periodIdx = getCurrentPeriodIndex();
    const cpName = document.getElementById('current-period-name');
    const cpTime = document.getElementById('current-period-time');
    const npName = document.getElementById('next-period-name');

    if (dayIdx === undefined) {
        cpName.textContent = 'Weekend';
        cpTime.textContent = 'No school today';
        npName.textContent = '--';
    } else if (periodIdx === -1) {
        const mins = now.getHours() * 60 + now.getMinutes();
        if (mins < timeToMinutes(PERIODS[0].start)) {
            cpName.textContent = 'Before School';
            cpTime.textContent = 'School starts at ' + PERIODS[0].start;
        } else {
            cpName.textContent = 'After School';
            cpTime.textContent = 'School has ended';
        }
        npName.textContent = '--';
    } else {
        const period = PERIODS[periodIdx];
        const subject = period.isBreak ? 'Recess' :
            (state.timetable[dayIdx] && state.timetable[dayIdx][periodIdx]) || period.label;
        cpName.textContent = subject;
        cpTime.textContent = period.start + ' - ' + period.end;
        if (periodIdx + 1 < PERIODS.length) {
            const next = PERIODS[periodIdx + 1];
            const nextSubj = next.isBreak ? 'Recess' :
                (state.timetable[dayIdx] && state.timetable[dayIdx][periodIdx + 1]) || next.label;
            npName.textContent = nextSubj + ' (' + next.start + ')';
        } else {
            npName.textContent = 'End of school';
        }
    }

    // Urgent homework
    const urgentContainer = document.getElementById('urgent-homework-list');
    const pending = state.homework.filter(h => !h.completed).sort((a, b) => daysUntil(a.due) - daysUntil(b.due));
    if (pending.length === 0) {
        urgentContainer.innerHTML = '<p class="empty-state">No pending homework!</p>';
    } else {
        const top = pending.slice(0, 4);
        urgentContainer.innerHTML = top.map(h => {
            const u = getUrgency(h.due);
            return `<div class="schedule-item">
                <span><strong>${h.subject}</strong>: ${h.title}</span>
                <span class="hw-urgency ${u.class}">${u.label}</span>
            </div>`;
        }).join('');
    }

    // Today's schedule
    const schedContainer = document.getElementById('today-schedule-list');
    if (dayIdx === undefined) {
        schedContainer.innerHTML = '<p class="empty-state">No school today</p>';
    } else {
        const dayTT = state.timetable[dayIdx] || {};
        const items = PERIODS.map((p, i) => {
            const subj = p.isBreak ? 'Recess' : (dayTT[i] || '--');
            const isCurrent = i === periodIdx;
            return `<div class="schedule-item ${isCurrent ? 'now' : ''}">
                <span>${subj}</span>
                <span class="time">${p.start} - ${p.end}</span>
            </div>`;
        });
        schedContainer.innerHTML = items.join('');
    }

    // Upcoming events
    const evtContainer = document.getElementById('upcoming-events-list');
    const upcoming = state.events
        .filter(e => daysUntil(e.date) >= 0)
        .sort((a, b) => daysUntil(a.date) - daysUntil(b.date))
        .slice(0, 4);
    if (upcoming.length === 0) {
        evtContainer.innerHTML = '<p class="empty-state">No upcoming events</p>';
    } else {
        evtContainer.innerHTML = upcoming.map(e =>
            `<div class="schedule-item">
                <span><strong>${e.title}</strong></span>
                <span class="time">${formatDate(e.date)}</span>
            </div>`
        ).join('');
    }
}

// ========== Timetable ==========
function renderTimetable() {
    state = loadState();
    const classSelect = document.getElementById('class-select');
    classSelect.value = state.selectedClass;

    const tbody = document.getElementById('timetable-body');
    const now = new Date();
    const dayIdx = DAY_MAP[now.getDay()];
    const periodIdx = getCurrentPeriodIndex();

    tbody.innerHTML = PERIODS.map((p, i) => {
        const cells = DAYS.map((_, di) => {
            if (p.isBreak) return `<td class="recess-row">Recess</td>`;
            const subj = (state.timetable[di] && state.timetable[di][i]) || '--';
            const isCurrent = di === dayIdx && i === periodIdx;
            return `<td class="${isCurrent ? 'current-slot' : ''}">${subj}</td>`;
        }).join('');
        return `<tr>
            <td style="font-weight:600; background:var(--bg); white-space:nowrap;">${p.label}<br><small style="color:var(--text-secondary)">${p.start}-${p.end}</small></td>
            ${cells}
        </tr>`;
    }).join('');
}

document.getElementById('class-select').addEventListener('change', e => {
    state.selectedClass = e.target.value;
    saveClass(e.target.value);
});

// Timetable editing
document.getElementById('edit-timetable-btn').addEventListener('click', () => {
    state = loadState();
    const tbody = document.getElementById('timetable-edit-body');
    tbody.innerHTML = PERIODS.map((p, i) => {
        if (p.isBreak) {
            return `<tr>
                <td class="period-label">${p.label}</td>
                <td class="period-label">${p.start}-${p.end}</td>
                ${DAYS.map(() => '<td class="recess-row">Recess</td>').join('')}
            </tr>`;
        }
        const cells = DAYS.map((_, di) => {
            const val = (state.timetable[di] && state.timetable[di][i]) || '';
            return `<td><input type="text" value="${val}" data-day="${di}" data-period="${i}" placeholder="--"></td>`;
        }).join('');
        return `<tr>
            <td class="period-label">${p.label}</td>
            <td class="period-label">${p.start}-${p.end}</td>
            ${cells}
        </tr>`;
    }).join('');

    openModal('timetable-modal');
});

document.getElementById('save-timetable-btn').addEventListener('click', () => {
    const inputs = document.querySelectorAll('#timetable-edit-body input');
    const tt = { ...state.timetable };
    inputs.forEach(inp => {
        const day = inp.dataset.day;
        const period = inp.dataset.period;
        if (!tt[day]) tt[day] = {};
        tt[day][period] = inp.value.trim();
    });
    state.timetable = tt;
    saveTimetable(tt);
    closeModal('timetable-modal');
    renderTimetable();
});

// ========== Homework ==========
let hwFilter = 'all';

function renderHomework() {
    state = loadState();
    const container = document.getElementById('homework-list');
    let items = [...state.homework];

    // Filter
    switch (hwFilter) {
        case 'overdue': items = items.filter(h => !h.completed && daysUntil(h.due) < 0); break;
        case 'today': items = items.filter(h => !h.completed && daysUntil(h.due) === 0); break;
        case 'tomorrow': items = items.filter(h => !h.completed && daysUntil(h.due) === 1); break;
        case 'week': items = items.filter(h => !h.completed && daysUntil(h.due) >= 0 && daysUntil(h.due) <= 7); break;
        case 'completed': items = items.filter(h => h.completed); break;
        default: items = items.filter(h => !h.completed);
    }

    // Sort by due date
    items.sort((a, b) => daysUntil(a.due) - daysUntil(b.due));

    if (items.length === 0) {
        container.innerHTML = `<p class="empty-state">${hwFilter === 'all' ? 'No pending homework. Nice!' : 'Nothing here.'}</p>`;
        return;
    }

    container.innerHTML = items.map(h => {
        const u = getUrgency(h.due);
        const diffLabels = ['', 'Easy', 'Medium', 'Hard', 'Very Hard'];
        return `<div class="hw-item ${h.completed ? 'completed' : ''}">
            <div class="hw-checkbox ${h.completed ? 'checked' : ''}" data-id="${h.id}">${h.completed ? '\u2713' : ''}</div>
            <div class="hw-info">
                <span class="hw-subject ${getSubjectClass(h.subject)}">${h.subject}</span>
                <div class="hw-title">${h.title}</div>
                <div class="hw-meta">${formatDate(h.due)} \u2022 ${diffLabels[h.difficulty]}${h.notes ? ' \u2022 ' + h.notes : ''}</div>
            </div>
            <span class="hw-urgency ${u.class}">${u.label}</span>
            <div class="hw-actions">
                <button class="btn btn-sm btn-ghost hw-edit-btn" data-id="${h.id}">Edit</button>
                <button class="btn btn-sm btn-ghost hw-delete-btn" data-id="${h.id}" style="color:var(--danger)">Del</button>
            </div>
        </div>`;
    }).join('');

    // Event listeners
    container.querySelectorAll('.hw-checkbox').forEach(cb => {
        cb.addEventListener('click', () => toggleHomework(cb.dataset.id));
    });
    container.querySelectorAll('.hw-edit-btn').forEach(btn => {
        btn.addEventListener('click', () => editHomework(btn.dataset.id));
    });
    container.querySelectorAll('.hw-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteHomework(btn.dataset.id));
    });
}

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        hwFilter = btn.dataset.filter;
        renderHomework();
    });
});

document.getElementById('add-homework-btn').addEventListener('click', () => {
    document.getElementById('homework-modal-title').textContent = 'Add Homework';
    document.getElementById('homework-form').reset();
    document.getElementById('hw-edit-id').value = '';
    document.getElementById('hw-due').valueAsDate = new Date();
    openModal('homework-modal');
});

document.getElementById('homework-form').addEventListener('submit', e => {
    e.preventDefault();
    const editId = document.getElementById('hw-edit-id').value;
    const hw = {
        id: editId || genId(),
        subject: document.getElementById('hw-subject').value,
        title: document.getElementById('hw-title').value,
        due: document.getElementById('hw-due').value,
        difficulty: parseInt(document.getElementById('hw-difficulty').value),
        notes: document.getElementById('hw-notes').value,
        completed: false,
    };

    state = loadState();
    if (editId) {
        const idx = state.homework.findIndex(h => h.id === editId);
        if (idx !== -1) { hw.completed = state.homework[idx].completed; state.homework[idx] = hw; }
    } else {
        state.homework.push(hw);
    }
    saveHomework(state.homework);
    closeModal('homework-modal');
    renderHomework();
});

function toggleHomework(id) {
    state = loadState();
    const hw = state.homework.find(h => h.id === id);
    if (hw) { hw.completed = !hw.completed; saveHomework(state.homework); renderHomework(); }
}

function editHomework(id) {
    state = loadState();
    const hw = state.homework.find(h => h.id === id);
    if (!hw) return;
    document.getElementById('homework-modal-title').textContent = 'Edit Homework';
    document.getElementById('hw-edit-id').value = hw.id;
    document.getElementById('hw-subject').value = hw.subject;
    document.getElementById('hw-title').value = hw.title;
    document.getElementById('hw-due').value = hw.due;
    document.getElementById('hw-difficulty').value = hw.difficulty;
    document.getElementById('hw-notes').value = hw.notes || '';
    openModal('homework-modal');
}

function deleteHomework(id) {
    if (!confirm('Delete this homework?')) return;
    state = loadState();
    state.homework = state.homework.filter(h => h.id !== id);
    saveHomework(state.homework);
    renderHomework();
}

// ========== Events ==========
let calendarDate = new Date();

function renderEvents() {
    state = loadState();
    renderCalendar();
    renderEventsList();
}

function renderCalendar() {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    document.getElementById('calendar-month-year').textContent =
        new Date(year, month).toLocaleDateString('en-SG', { month: 'long', year: 'numeric' });

    const grid = document.getElementById('calendar-grid');
    const dayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    let html = dayHeaders.map(d => `<div class="calendar-day-header">${d}</div>`).join('');

    const firstDay = new Date(year, month, 1);
    let startDay = firstDay.getDay() - 1;
    if (startDay < 0) startDay = 6;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();
    const today = new Date();

    // Previous month padding
    for (let i = startDay - 1; i >= 0; i--) {
        html += `<div class="calendar-day other-month"><div class="day-number">${daysInPrev - i}</div></div>`;
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
        const dayEvents = state.events.filter(e => e.date === dateStr);
        const dots = dayEvents.map(e => `<span class="event-dot ${e.type}"></span>`).join('');
        html += `<div class="calendar-day ${isToday ? 'today' : ''}">
            <div class="day-number">${d}</div>${dots}
        </div>`;
    }

    // Next month padding
    const totalCells = startDay + daysInMonth;
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
        html += `<div class="calendar-day other-month"><div class="day-number">${i}</div></div>`;
    }

    grid.innerHTML = html;
}

function renderEventsList() {
    const container = document.getElementById('events-list-items');
    const upcoming = state.events
        .filter(e => daysUntil(e.date) >= -1)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (upcoming.length === 0) {
        container.innerHTML = '<p class="empty-state">No events added yet.</p>';
        return;
    }

    container.innerHTML = upcoming.map(e => `
        <div class="event-item">
            <span class="event-type-badge badge-${e.type}">${e.type}</span>
            <div class="event-info">
                <div class="event-title">${e.title}</div>
                <div class="event-date">${formatDate(e.date)}${e.notes ? ' \u2022 ' + e.notes : ''}</div>
            </div>
            <div class="hw-actions">
                <button class="btn btn-sm btn-ghost evt-edit-btn" data-id="${e.id}">Edit</button>
                <button class="btn btn-sm btn-ghost evt-delete-btn" data-id="${e.id}" style="color:var(--danger)">Del</button>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.evt-edit-btn').forEach(btn => {
        btn.addEventListener('click', () => editEvent(btn.dataset.id));
    });
    container.querySelectorAll('.evt-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteEvent(btn.dataset.id));
    });
}

document.getElementById('prev-month').addEventListener('click', () => {
    calendarDate.setMonth(calendarDate.getMonth() - 1);
    renderCalendar();
});
document.getElementById('next-month').addEventListener('click', () => {
    calendarDate.setMonth(calendarDate.getMonth() + 1);
    renderCalendar();
});

document.getElementById('add-event-btn').addEventListener('click', () => {
    document.getElementById('event-modal-title').textContent = 'Add Event';
    document.getElementById('event-form').reset();
    document.getElementById('evt-edit-id').value = '';
    document.getElementById('evt-date').valueAsDate = new Date();
    openModal('event-modal');
});

document.getElementById('event-form').addEventListener('submit', e => {
    e.preventDefault();
    const editId = document.getElementById('evt-edit-id').value;
    const evt = {
        id: editId || genId(),
        title: document.getElementById('evt-title').value,
        date: document.getElementById('evt-date').value,
        type: document.getElementById('evt-type').value,
        notes: document.getElementById('evt-notes').value,
    };

    state = loadState();
    if (editId) {
        const idx = state.events.findIndex(e => e.id === editId);
        if (idx !== -1) state.events[idx] = evt;
    } else {
        state.events.push(evt);
    }
    saveEvents(state.events);
    closeModal('event-modal');
    renderEvents();
});

function editEvent(id) {
    state = loadState();
    const evt = state.events.find(e => e.id === id);
    if (!evt) return;
    document.getElementById('event-modal-title').textContent = 'Edit Event';
    document.getElementById('evt-edit-id').value = evt.id;
    document.getElementById('evt-title').value = evt.title;
    document.getElementById('evt-date').value = evt.date;
    document.getElementById('evt-type').value = evt.type;
    document.getElementById('evt-notes').value = evt.notes || '';
    openModal('event-modal');
}

function deleteEvent(id) {
    if (!confirm('Delete this event?')) return;
    state = loadState();
    state.events = state.events.filter(e => e.id !== id);
    saveEvents(state.events);
    renderEvents();
}

// ========== AI Advisor ==========
document.getElementById('get-ai-advice').addEventListener('click', () => {
    state = loadState();
    const pending = state.homework.filter(h => !h.completed);

    if (pending.length === 0) {
        const output = document.getElementById('ai-advice-output');
        output.style.display = 'block';
        document.getElementById('ai-advice-content').innerHTML =
            '<p class="empty-state">No pending homework to plan! You\'re all caught up.</p>';
        return;
    }

    // Simple AI scoring algorithm
    const scored = pending.map(h => {
        const days = daysUntil(h.due);
        let score = 0;
        let reasons = [];

        // Urgency (most important factor)
        if (days < 0) {
            score += 100;
            reasons.push('OVERDUE - do this immediately');
        } else if (days === 0) {
            score += 90;
            reasons.push('Due today - highest priority');
        } else if (days === 1) {
            score += 70;
            reasons.push('Due tomorrow - very urgent');
        } else if (days <= 3) {
            score += 50;
            reasons.push('Due in ' + days + ' days - start soon');
        } else if (days <= 7) {
            score += 25;
            reasons.push('Due this week');
        } else {
            score += 10;
            reasons.push('Due in ' + days + ' days');
        }

        // Difficulty factor - harder tasks should be started earlier
        const diffWeight = h.difficulty * 8;
        score += diffWeight;
        if (h.difficulty >= 3) {
            reasons.push('High difficulty - needs more time');
        }

        // Subject weighting for examinable subjects
        const coreSubjects = ['Mathematics', 'E Math', 'A Math', 'English', 'Science',
            'Physics', 'Chemistry', 'Biology', 'Mother Tongue', 'Chinese', 'Malay', 'Tamil'];
        if (coreSubjects.includes(h.subject)) {
            score += 5;
            reasons.push('Core/examinable subject');
        }

        // Time efficiency: if two things are due the same day, do the easier one first
        // (quick wins strategy)
        if (days <= 1 && h.difficulty <= 2) {
            score += 15;
            reasons.push('Quick win - finish this first');
        }

        const timeEstimate = ['', '~15 min', '~30 min', '~1 hour', '~2 hours'];

        return { ...h, score, reasons, timeEstimate: timeEstimate[h.difficulty] };
    });

    scored.sort((a, b) => b.score - a.score);

    const output = document.getElementById('ai-advice-output');
    output.style.display = 'block';

    const totalTime = scored.reduce((sum, h) => {
        const mins = [0, 15, 30, 60, 120];
        return sum + mins[h.difficulty];
    }, 0);
    const hours = Math.floor(totalTime / 60);
    const mins = totalTime % 60;

    document.getElementById('ai-advice-content').innerHTML = `
        <p style="margin-bottom:16px; color:var(--text-secondary); font-size:0.9rem;">
            You have <strong>${scored.length} tasks</strong> pending, estimated total:
            <strong>${hours > 0 ? hours + 'h ' : ''}${mins}min</strong>.
            Here's the recommended order:
        </p>
        ${scored.map((h, i) => `
            <div class="ai-task">
                <div class="ai-task-number">${i + 1}</div>
                <div class="ai-task-info">
                    <div class="ai-task-title">${h.subject}: ${h.title}</div>
                    <div class="ai-task-reason">${h.reasons.join(' \u2022 ')}</div>
                    <div class="ai-task-meta">Due: ${formatDate(h.due)} \u2022 Est: ${h.timeEstimate}</div>
                </div>
            </div>
        `).join('')}
        <p style="margin-top:16px; padding:12px; background:var(--primary-light); border-radius:8px; font-size:0.85rem; color:var(--primary-dark);">
            <strong>Tip:</strong> Start with task #1 and work your way down. Take a 5-minute break between tasks.
            If you're feeling stuck, switch to an easier task and come back later.
        </p>
    `;
});

// ========== Modals ==========
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
    btn.addEventListener('click', () => {
        btn.closest('.modal').classList.remove('active');
    });
});

document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', e => {
        if (e.target === modal) modal.classList.remove('active');
    });
});

// ========== Auto-refresh ==========
setInterval(() => {
    if (document.querySelector('#page-dashboard.active')) refreshDashboard();
}, 30000);

// ========== Init ==========
refreshDashboard();
