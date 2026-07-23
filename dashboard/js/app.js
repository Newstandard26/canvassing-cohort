/**
 * NSR Ramp Cohort Dashboard — main application controller.
 * Loads data (live sheet or demo fallback), renders all four sections, and
 * wires up tabs, table sorting/filtering, detail drill-down and refresh.
 */

/* global SheetsAPI, Charts */

(function () {
  'use strict';

  var state = {
    data: null,
    sortKey: 'name',
    sortDir: 1,
    phaseFilter: '',
    search: '',
    autoTimer: null
  };

  var $ = function (id) { return document.getElementById(id); };

  // ---------- formatting ----------

  var fmtMoney = function (v) { return v === null || v === undefined ? '—' : '$' + Math.round(v).toLocaleString('en-US'); };
  var fmtPct = function (v, digits) { return v === null || v === undefined ? '—' : (v * 100).toFixed(digits === undefined ? 1 : digits) + '%'; };
  var fmtInt = function (v) { return v === null || v === undefined ? '—' : Math.round(v).toLocaleString('en-US'); };
  var fmtDate = function (d) {
    return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
  };
  var fmtDateFull = function (d) {
    return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  };
  var esc = function (s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  function addDays(d, n) { var x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; }

  // ---------- derived data ----------
  // Every rep ramps on their own clock: their Day 1 is their own start date.

  function todayMidnight() {
    var t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }

  /** Per-rep ramp state, derived from their start date on the Phase Gates tab. */
  function repInfo(name) {
    var g = state.data.gates.find(function (r) { return r.name === name; }) || {};
    var start = g.startDate || null;
    var rampDay = null, daysUntilStart = null;
    if (start) {
      var diff = Math.round((todayMidnight() - start) / 86400000);
      if (diff < 0) daysUntilStart = -diff;
      else rampDay = Math.min(45, diff + 1); // start date = Day 1
    }
    return {
      start: start,
      gate1: g.gate1Date || (start ? addDays(start, 21) : null),
      gate2: g.gate2Date || (start ? addDays(start, 45) : null),
      rampDay: rampDay,             // null if not started yet
      daysUntilStart: daysUntilStart,
      phase: phaseOf(name)
    };
  }

  /** Days of ramp week `w` that rep has actually worked (for avg doors/day). */
  function daysInWeek(w, name) {
    var info = repInfo(name);
    var rampDay = info.rampDay || 45; // finished or unknown → full weeks
    var startDay = (w - 1) * 7;
    return Math.max(1, Math.min(7, 45 - startDay, rampDay - startDay));
  }

  function canvasserNames() {
    var names = [];
    state.data.gates.forEach(function (g) { if (names.indexOf(g.name) < 0) names.push(g.name); });
    state.data.weekly.forEach(function (r) { if (names.indexOf(r.name) < 0) names.push(r.name); });
    return names;
  }

  function activeCanvassers() {
    return canvasserNames().filter(function (n) { return phaseOf(n) !== 'Washed Out'; });
  }

  /** Effective phase label for a canvasser: gate decisions win over weekly rows. */
  function phaseOf(name) {
    var g = state.data.gates.find(function (r) { return r.name === name; });
    if (g) {
      if (g.finalDecision === 'GRADUATE' || g.phase2Status === 'GRADUATE') return 'Graduated';
      if (g.finalDecision === 'WASHOUT' || g.phase1Status === 'WASHOUT' || g.phase2Status === 'WASHOUT') return 'Washed Out';
    }
    var rows = state.data.weekly.filter(function (r) { return r.name === name; });
    if (rows.length) return rows[rows.length - 1].phase || 'Phase 1';
    return 'Phase 1';
  }

  /** One table row per canvasser: their own latest ramp week with data. */
  function tableRows() {
    return canvasserNames().map(function (name) {
      var rows = state.data.weekly.filter(function (r) { return r.name === name; });
      var row = rows[rows.length - 1] || null;
      return {
        name: name,
        phase: phaseOf(name),
        week: row ? row.week : null,
        doors: row ? row.doors : null,
        conversion: row ? row.conversion : null,
        quality: row ? row.quality : null,
        earnings: row ? row.earnings : null,
        status: row ? row.status : '—',
        redFlag: row ? row.redFlag : ''
      };
    });
  }

  // ---------- Section 1: Cohort Overview ----------

  function renderOverview() {
    var c = state.data.cohort;
    $('cohort-name').textContent = c.name || '—';

    var badge = $('status-badge');
    badge.textContent = c.status;
    badge.className = 'status-badge ' +
      (c.status === 'ON TRACK' ? 'on-track' : c.status === 'AT RISK' ? 'at-risk' : c.status === 'BEHIND' ? 'behind' : '');

    // Per-rep progress bars — each rep ramps on their own 45-day clock
    var names = canvasserNames();
    $('rep-progress').innerHTML = names.map(function (name) {
      var info = repInfo(name);
      var washed = info.phase === 'Washed Out';
      var day = info.rampDay || 0;
      var pct = (day / 45) * 100;
      var label;
      if (washed) label = 'Washed out';
      else if (info.daysUntilStart !== null) label = 'Starts ' + fmtDate(info.start) + ' (in ' + info.daysUntilStart + 'd)';
      else label = 'Day ' + day + ' of 45';
      return '<div class="rep-progress-row' + (washed ? ' rep-washed' : '') + '">' +
        '<span class="rep-progress-name">' + esc(name) + '</span>' +
        '<div class="progress-track progress-track-sm" aria-hidden="true">' +
          '<div class="progress-zone zone-p1"></div>' +
          '<div class="progress-zone zone-p2"></div>' +
          '<div class="progress-fill" style="width:' + pct + '%"></div>' +
          (day > 0 && !washed ? '<div class="progress-marker" style="left:' + pct + '%"></div>' : '') +
        '</div>' +
        '<span class="rep-progress-label">' + label + '</span>' +
        '</div>';
    }).join('');

    // Nearest upcoming gate across active reps
    var upcoming = gateEvents().filter(function (e) { return e.daysAway >= 0; });
    var countdown = $('gate-countdown');
    if (upcoming.length) {
      var g = upcoming[0];
      countdown.textContent = '⏳ Next gate: ' + g.name + "'s " + g.label + ' on ' +
        fmtDateFull(g.date) + (g.daysAway === 0 ? ' (today)' : ' (in ' + g.daysAway + ' days)');
    } else {
      countdown.textContent = '🏁 All gates have passed — record final decisions.';
    }

    $('stat-started').textContent = fmtInt(c.started);
    $('stat-phases').innerHTML =
      'Phase 1: <strong>' + fmtInt(c.phase1) + '</strong><br>' +
      'Phase 2: <strong>' + fmtInt(c.phase2) + '</strong>';
    $('stat-graduated').textContent = fmtInt(c.graduated);
    $('stat-washed').textContent = fmtInt(c.washedOut);

    // Next action: overdue gate decisions first, then the nearest gate
    var overdue = gateEvents().filter(function (e) { return e.daysAway < 0 && !e.decided; });
    var next;
    if (overdue.length) {
      next = '<strong>Next action:</strong> ' + esc(overdue[0].name) + "'s " + overdue[0].label +
        ' passed on ' + fmtDateFull(overdue[0].date) + ' — record the decision in the Phase Gates tab.';
    } else if (upcoming.length) {
      var u = upcoming[0];
      next = '<strong>Next action:</strong> Continue daily tracking. ' + esc(u.name) + "'s " + u.label +
        ' is on <strong>' + fmtDateFull(u.date) + '</strong>' +
        (u.daysAway === 0 ? ' (today)' : ' (' + u.daysAway + ' days out)') +
        (u.label.indexOf('21') >= 0
          ? ' — doors ≥1,260 cumulative, conversion ≥4%, quality ≥60%.'
          : ' — sustained metrics plus ≥2 supervised closes.');
    } else {
      next = '<strong>Next action:</strong> All ramps complete — close out final decisions and plan the next cohort.';
    }
    $('next-action').innerHTML = next;
  }

  /** All gate events across active reps, sorted by date. daysAway < 0 = past. */
  function gateEvents() {
    var events = [];
    var today = todayMidnight();
    canvasserNames().forEach(function (name) {
      var info = repInfo(name);
      if (info.phase === 'Washed Out' || !info.start) return;
      var g = state.data.gates.find(function (r) { return r.name === name; }) || {};
      [{ date: info.gate1, label: 'Day 21 gate', decided: !!g.phase1Status },
       { date: info.gate2, label: 'Day 45 gate', decided: !!(g.phase2Status || g.finalDecision) }]
        .forEach(function (e) {
          if (!e.date) return;
          events.push({
            name: name,
            label: e.label,
            date: e.date,
            decided: e.decided,
            daysAway: Math.round((e.date - today) / 86400000)
          });
        });
    });
    events.sort(function (a, b) { return a.date - b.date; });
    return events;
  }

  // ---------- Section 2: Metrics Summary ----------

  function statusCellClass(s) {
    if (s === '✓') return 'status-cell-ok';
    if (s === '⚠️') return 'status-cell-warn';
    if (s === '✗') return 'status-cell-bad';
    return '';
  }

  function phasePillClass(p) {
    return 'phase-pill ' + p.toLowerCase().replace(/\s+/g, '-');
  }

  function renderTable() {
    var rows = tableRows();

    if (state.phaseFilter) rows = rows.filter(function (r) { return r.phase === state.phaseFilter; });
    if (state.search) {
      var q = state.search.toLowerCase();
      rows = rows.filter(function (r) { return r.name.toLowerCase().indexOf(q) >= 0; });
    }

    var key = state.sortKey, dir = state.sortDir;
    rows.sort(function (a, b) {
      var av = a[key], bv = b[key];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === 'string') return av.localeCompare(bv) * dir;
      return (av - bv) * dir;
    });

    $('metrics-table-title').textContent = 'Canvasser Metrics — Latest Ramp Week per Rep';

    $('metrics-tbody').innerHTML = rows.map(function (r) {
      return '<tr>' +
        '<td><button class="canvasser-link" data-name="' + esc(r.name) + '">' + esc(r.name) + '</button></td>' +
        '<td><span class="' + phasePillClass(r.phase) + '">' + esc(r.phase) + '</span></td>' +
        '<td>' + (r.week === null ? '—' : r.week) + '</td>' +
        '<td>' + fmtInt(r.doors) + '</td>' +
        '<td>' + fmtPct(r.conversion) + '</td>' +
        '<td>' + fmtPct(r.quality, 0) + '</td>' +
        '<td>' + fmtMoney(r.earnings) + '</td>' +
        '<td class="' + statusCellClass(r.status) + '" title="' + esc(r.redFlag) + '">' + esc(r.status) + '</td>' +
        '</tr>';
    }).join('') || '<tr><td colspan="8">No canvassers match the current filters.</td></tr>';

    // header sort indicators
    document.querySelectorAll('#metrics-table th[data-sort]').forEach(function (th) {
      var active = th.dataset.sort === key;
      th.querySelector('.sort-ind').textContent = active ? (dir === 1 ? '▲' : '▼') : '';
      th.setAttribute('aria-sort', active ? (dir === 1 ? 'ascending' : 'descending') : 'none');
    });

    document.querySelectorAll('.canvasser-link').forEach(function (btn) {
      btn.addEventListener('click', function () { showDetail(btn.dataset.name); });
    });
  }

  /** Latest weekly row for each rep still active (their own current ramp week). */
  function latestRows() {
    return activeCanvassers().map(function (name) {
      var rows = state.data.weekly.filter(function (r) { return r.name === name; });
      return rows[rows.length - 1] || null;
    }).filter(Boolean);
  }

  function renderCohortSummary() {
    var rows = latestRows();
    var avg = function (getter) {
      var vals = rows.map(getter).filter(function (v) { return v !== null && v !== undefined; });
      if (!vals.length) return null;
      return vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
    };
    // Avg doors/day: each rep's latest week normalized by the days they worked
    var perDay = rows.map(function (r) { return r.doors / daysInWeek(r.week, r.name); });
    var avgDoorsDay = perDay.length ? perDay.reduce(function (a, b) { return a + b; }, 0) / perDay.length : null;
    var counts = { '✓': 0, '⚠️': 0, '✗': 0 };
    rows.forEach(function (r) { if (counts[r.status] !== undefined) counts[r.status]++; });
    var total = rows.length;

    $('cohort-summary').innerHTML =
      '<span class="metric">Avg Doors/Day: <strong>' + (avgDoorsDay === null ? '—' : Math.round(avgDoorsDay)) + '</strong></span>' +
      '<span class="metric">Avg Door→Insp: <strong>' + fmtPct(avg(function (r) { return r.conversion; })) + '</strong></span>' +
      '<span class="metric">Avg Lead Quality: <strong>' + fmtPct(avg(function (r) { return r.quality; }), 0) + '</strong></span>' +
      '<span class="metric">On Track: <strong>' + counts['✓'] + '/' + total + '</strong></span>' +
      '<span class="metric">At Risk: <strong>' + counts['⚠️'] + '/' + total + '</strong></span>' +
      '<span class="metric">Off Track: <strong>' + counts['✗'] + '/' + total + '</strong></span>' +
      '<span class="metric">Washed Out: <strong>' + state.data.cohort.washedOut + '/' + state.data.cohort.started + '</strong></span>';
  }

  function showDetail(name) {
    var rows = state.data.weekly.filter(function (r) { return r.name === name; });
    $('detail-title').textContent = name + ' — All Weeks (' + phaseOf(name) + ')';
    $('detail-tbody').innerHTML = rows.map(function (r) {
      return '<tr>' +
        '<td>' + r.week + '</td>' +
        '<td>' + fmtDate(r.start) + ' – ' + fmtDate(r.end) + '</td>' +
        '<td><span class="' + phasePillClass(r.phase || 'Phase 1') + '">' + esc(r.phase) + '</span></td>' +
        '<td>' + fmtInt(r.doors) + '</td>' +
        '<td>' + fmtInt(r.leads) + '</td>' +
        '<td>' + fmtPct(r.conversion) + '</td>' +
        '<td>' + fmtInt(r.inspections) + '</td>' +
        '<td>' + fmtPct(r.quality, 0) + '</td>' +
        '<td>' + fmtMoney(r.earnings) + '</td>' +
        '<td class="' + statusCellClass(r.status) + '">' + esc(r.status) + (r.notes ? ' — ' + esc(r.notes) : '') + '</td>' +
        '</tr>';
    }).join('') || '<tr><td colspan="10">No weekly data recorded yet.</td></tr>';
    $('detail-view').hidden = false;
    $('detail-view').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function renderMetricsCharts() {
    var actives = activeCanvassers();
    Charts.doorsTrend(state.data.weekly, actives, daysInWeek);

    var rows = latestRows();
    Charts.conversionBars(rows);

    var quals = rows.map(function (r) { return r.quality; }).filter(function (v) { return v !== null; });
    var avgQ = quals.length ? quals.reduce(function (a, b) { return a + b; }, 0) / quals.length : 0;
    Charts.qualityGauge(avgQ);
  }

  // ---------- Section 3: Timeline ----------

  function renderTimeline() {
    // One row per rep — each ramps on their own 45-day clock.
    var names = canvasserNames();

    $('timeline-tbody').innerHTML = names.map(function (name) {
      var info = repInfo(name);
      var g = state.data.gates.find(function (r) { return r.name === name; }) || {};
      var washed = info.phase === 'Washed Out';

      var where, cls;
      if (washed) {
        where = '✗ Washed out' + (g.finalNotes ? ' — ' + esc(g.finalNotes) : '');
        cls = '';
      } else if (info.daysUntilStart !== null) {
        where = '□ Starts in ' + info.daysUntilStart + ' day' + (info.daysUntilStart === 1 ? '' : 's');
        cls = '';
      } else if (info.phase === 'Graduated') {
        where = '🎓 Graduated';
        cls = 'timeline-row-p2';
      } else if (info.rampDay <= 21) {
        where = '● Phase 1 — Day ' + info.rampDay + ' of 45';
        cls = 'timeline-row-p1';
      } else {
        where = '● Phase 2 — Day ' + info.rampDay + ' of 45';
        cls = 'timeline-row-p2';
      }

      var gate1 = washed ? '—' :
        fmtDate(info.gate1) + (g.phase1Status ? ' · ' + esc(g.phase1Status) :
          (info.rampDay && info.rampDay >= 21 ? ' · ⚠️ pending' : ''));
      var gate2 = washed ? '—' :
        fmtDate(info.gate2) + (g.phase2Status || g.finalDecision ? ' · ' + esc(g.phase2Status || g.finalDecision) :
          (info.rampDay && info.rampDay >= 45 ? ' · ⚠️ pending' : ''));

      return '<tr class="' + cls + '">' +
        '<td>' + esc(name) + '</td>' +
        '<td>' + fmtDate(info.start) + '</td>' +
        '<td>' + gate1 + '</td>' +
        '<td>' + gate2 + '</td>' +
        '<td>' + where + '</td>' +
        '</tr>';
    }).join('');

    // Upcoming events: every undecided gate across reps, soonest first
    var events = gateEvents().filter(function (e) { return !e.decided; }).map(function (e) {
      var when = e.daysAway < 0 ? Math.abs(e.daysAway) + ' days ago — decision pending' :
        e.daysAway === 0 ? 'today' : 'in ' + e.daysAway + ' days';
      return {
        title: '📅 ' + fmtDateFull(e.date) + ' (' + when + ') — ' + e.name + "'s " + e.label,
        body: e.label.indexOf('21') >= 0
          ? 'Criteria: ≥1,260 cumulative doors (60/day), conversion ≥4%, lead quality ≥60%. Decision: ADVANCE / EXTEND / WASHOUT.'
          : 'Criteria: sustained 60 doors/day, conversion ≥4%, lead quality ≥60%, plus ≥2 supervised closes. Decision: GRADUATE / EXTEND / WASHOUT.'
      };
    });
    if (!events.length) {
      events.push({ title: '🏁 No upcoming gates', body: 'All gate decisions are recorded in the Phase Gates tab.' });
    }
    $('events-panel').innerHTML = events.map(function (ev) {
      return '<details class="event-item"><summary>' + ev.title + '</summary><p>' + ev.body + '</p></details>';
    }).join('');
  }

  // ---------- Section 4: ROI ----------

  function renderRoi() {
    var roi = state.data.roi;
    $('roi-investment').textContent = fmtMoney(roi.investment);
    $('roi-graduates').textContent = fmtInt(roi.graduates);
    $('roi-contribution').textContent = roi.contribution === null ? '—' :
      '$' + (roi.contribution / 1e6).toFixed(2) + 'M';
    $('roi-multiple').textContent = roi.roiMultiple === null ? '—' : roi.roiMultiple.toFixed(1) + 'x';

    var L = roi.byLabel;
    $('assumptions-panel').innerHTML =
      '<div><h3>Training Costs</h3><ul>' +
      '<li>Recruitment: <strong>' + esc(L['Recruitment & Onboarding'] || '—') + '</strong></li>' +
      '<li>PM oversight: <strong>' + esc(L['PM Oversight (45 days)'] || '—') + '</strong></li>' +
      '<li>Materials: <strong>' + esc(L['Materials & Playbooks'] || '—') + '</strong></li>' +
      '<li>Total per canvasser: <strong>' + esc(L['Total Per Canvasser'] || '—') + '</strong></li>' +
      '<li>Total cohort: <strong>' + esc(L['Total Cohort Investment'] || '—') + '</strong></li>' +
      '</ul></div>' +
      '<div><h3>Revenue Assumptions (Per PM, Year 1)</h3><ul>' +
      '<li>Contracts/month: <strong>' + esc(L['Avg Contracts/Month (Year 1)'] || '—') + '</strong></li>' +
      '<li>Avg ticket: <strong>' + esc(L['Avg Ticket Size'] || '—') + '</strong></li>' +
      '<li>GP margin: <strong>' + esc(L['Gross Profit Margin %'] || '—') + '</strong></li>' +
      '<li>Annual revenue: <strong>' + esc(L['Annual Revenue (Year 1)'] || '—') + '</strong></li>' +
      '<li>Annual GP: <strong>' + esc(L['Annual Gross Profit (Year 1)'] || '—') + '</strong></li>' +
      '<li>PM salary: <strong>' + esc(L['PM Salary (All-in)'] || '—') + '</strong></li>' +
      '<li>Net contribution: <strong>' + esc(L['Net Contribution (Year 1)'] || '—') + '</strong></li>' +
      '</ul></div>' +
      '<div><h3>Cohort ROI</h3><ul>' +
      '<li>Graduates: <strong>' + esc(L['Expected Graduates'] || '—') + '</strong></li>' +
      '<li>Investment: <strong>' + esc(L['Training Investment'] || '—') + '</strong></li>' +
      '<li>Year 1 contribution: <strong>' + esc(L['Total Net Contribution (Year 1)'] || '—') + '</strong></li>' +
      '<li>ROI: <strong>' + esc(L['ROI Multiple'] || '—') + '</strong></li>' +
      '<li>Payback: <strong>' + (roi.payback === null ? '—' : roi.payback + ' days') + '</strong></li>' +
      '</ul></div>';

    if (roi.multiYear.length && roi.investment !== null) {
      Charts.roiPayoff(roi.multiYear, roi.investment);
    }

    $('scenario-cards').innerHTML = roi.scenarios.map(function (s) {
      var isBase = s.name === 'Base';
      return '<div class="card scenario-card' + (isBase ? ' scenario-base' : '') + '">' +
        '<h3>' + esc(s.name) + (isBase ? ' ★' : '') + '</h3>' +
        '<div class="scenario-roi">' + esc(s.roi) + '</div>' +
        '<p>Year 1 ROI</p>' +
        '<p>' + esc(s.gradRate) + ' grad rate · ' + esc(s.contractsPerMonth) + ' deals/mo · ' + esc(s.margin) + ' margin</p>' +
        '</div>';
    }).join('');
  }

  // ---------- data loading ----------

  function setBanner(data) {
    var banner = $('banner');
    var note = $('data-source-note');
    if (data.source === 'demo') {
      banner.hidden = false;
      if (data.reason === 'not-configured') {
        banner.className = 'banner';
        banner.textContent = '⚙️ Demo mode — showing sample data. Copy config.example.js to config.js and add your Google Sheet ID + API key to connect the live Master Tracking Sheet.';
      } else {
        banner.className = 'banner banner-error';
        banner.textContent = '⚠️ Could not reach the Google Sheets API (' + data.reason + ') — showing demo data. Check the Sheet ID, API key, and that the sheet is shared "Anyone with the link".';
      }
      note.textContent = 'Currently showing built-in demo data.';
    } else {
      banner.hidden = true;
      note.textContent = 'Connected to the live Master Tracking Sheet.';
    }
  }

  function renderAll() {
    renderOverview();
    renderTable();
    renderCohortSummary();
    renderMetricsCharts();
    renderTimeline();
    renderRoi();
  }

  function refresh() {
    var btn = $('refresh-btn');
    btn.disabled = true;
    btn.textContent = '↻ Loading…';
    return SheetsAPI.fetchAll().then(function (data) {
      state.data = data;
      setBanner(data);
      renderAll();
      $('last-updated').textContent = 'Last updated: ' + new Date().toLocaleTimeString();
    }).catch(function (err) {
      console.error(err);
      var banner = $('banner');
      banner.hidden = false;
      banner.className = 'banner banner-error';
      banner.textContent = '⚠️ Failed to load data: ' + err.message;
    }).finally(function () {
      btn.disabled = false;
      btn.textContent = '↻ Refresh';
    });
  }

  // ---------- wiring ----------

  function initTabs() {
    document.querySelectorAll('.tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        document.querySelectorAll('.tab').forEach(function (t) {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        document.querySelectorAll('.section').forEach(function (s) {
          var active = s.id === 'section-' + tab.dataset.section;
          s.classList.toggle('active', active);
          s.hidden = !active;
        });
      });
    });
  }

  function initControls() {
    $('refresh-btn').addEventListener('click', refresh);

    var cfg = (typeof NSR_CONFIG !== 'undefined') ? NSR_CONFIG : {};
    var minutes = cfg.refreshMinutes || 5;
    var toggle = $('auto-refresh-toggle');
    toggle.parentElement.lastChild.textContent = ' Auto-refresh (' + minutes + ' min)';
    toggle.checked = !!cfg.autoRefresh;

    var applyAuto = function () {
      if (state.autoTimer) { clearInterval(state.autoTimer); state.autoTimer = null; }
      if (toggle.checked) state.autoTimer = setInterval(refresh, minutes * 60 * 1000);
    };
    toggle.addEventListener('change', applyAuto);
    applyAuto();

    document.querySelectorAll('#metrics-table th[data-sort]').forEach(function (th) {
      th.addEventListener('click', function () {
        var key = th.dataset.sort;
        if (state.sortKey === key) state.sortDir = -state.sortDir;
        else { state.sortKey = key; state.sortDir = 1; }
        renderTable();
      });
    });

    $('phase-filter').addEventListener('change', function (e) {
      state.phaseFilter = e.target.value;
      renderTable();
    });
    $('name-search').addEventListener('input', function (e) {
      state.search = e.target.value.trim();
      renderTable();
    });
    $('detail-close').addEventListener('click', function () { $('detail-view').hidden = true; });

    var bindCollapse = function (btnId, panelId) {
      $(btnId).addEventListener('click', function () {
        var panel = $(panelId);
        var open = panel.hidden;
        panel.hidden = !open;
        $(btnId).setAttribute('aria-expanded', String(open));
        $(btnId).querySelector('.chev').textContent = open ? '▾' : '▸';
      });
    };
    bindCollapse('assumptions-toggle', 'assumptions-panel');
    bindCollapse('events-toggle', 'events-panel');
  }

  document.addEventListener('DOMContentLoaded', function () {
    initTabs();
    initControls();
    refresh();
  });
})();
