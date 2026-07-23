/**
 * Google Sheets API access + parsing for the NSR Ramp Cohort Dashboard.
 *
 * Reads the four tabs the dashboard needs in one batchGet call, then parses
 * the raw 2-D string arrays into typed objects. The parsers are also run
 * against DEMO_DATA (same shape) when no live sheet is configured.
 */

/* global DEMO_DATA */

var SheetsAPI = (function () {
  'use strict';

  var RANGES = {
    cohort: 'Cohort Overview!A1:Q5',
    weekly: 'Weekly Summary!A1:O120',
    gates: 'Phase Gates!A1:S25',
    roi: 'ROI Projection!A1:D45'
  };

  // ---------- primitive parsers (handle the API's formatted strings) ----------

  function num(v) {
    if (v === undefined || v === null || v === '') return null;
    var n = parseFloat(String(v).replace(/[$,%\s,]/g, '').replace(/,/g, ''));
    return isNaN(n) ? null : n;
  }

  function pct(v) {
    if (v === undefined || v === null || v === '') return null;
    var s = String(v).trim();
    var n = num(s);
    if (n === null) return null;
    // "4.1%" → 0.041 ; a raw sheet fraction like "0.041" stays as-is
    return s.indexOf('%') >= 0 ? n / 100 : (n > 1 ? n / 100 : n);
  }

  function date(v) {
    if (!v) return null;
    var d = new Date(String(v).indexOf('T') >= 0 ? v : v + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
  }

  function cell(row, i) { return (row && row[i] !== undefined) ? String(row[i]).trim() : ''; }

  // ---------- tab parsers ----------

  function parseCohort(values) {
    var r = (values && values[1]) || [];
    return {
      name: cell(r, 0),
      startDate: date(cell(r, 1)),
      todayDate: date(cell(r, 2)),
      gate1Date: date(cell(r, 3)),
      gate2Date: date(cell(r, 4)),
      daysElapsed: num(cell(r, 5)) || 0,
      daysRemaining: num(cell(r, 6)) || 0,
      started: num(cell(r, 7)) || 0,
      phase1: num(cell(r, 8)) || 0,
      phase2: num(cell(r, 9)) || 0,
      graduated: num(cell(r, 10)) || 0,
      washedOut: num(cell(r, 11)) || 0,
      status: cell(r, 12) || 'UNKNOWN',
      day21Decision: cell(r, 13),
      day21DecisionDate: cell(r, 14),
      day45Decision: cell(r, 15),
      day45DecisionDate: cell(r, 16)
    };
  }

  function parseWeekly(values) {
    var rows = [];
    if (!values) return rows;
    for (var i = 1; i < values.length; i++) {
      var r = values[i];
      var week = num(cell(r, 0));
      var name = cell(r, 3);
      // Skip aggregate/blank rows — data rows have a numeric week # and a name
      if (week === null || !name) continue;
      var doors = num(cell(r, 5));
      if (doors === null || doors === 0) continue; // week not started yet
      rows.push({
        week: week,
        start: date(cell(r, 1)),
        end: date(cell(r, 2)),
        name: name,
        phase: cell(r, 4),
        doors: doors,
        leads: num(cell(r, 6)) || 0,
        conversion: pct(cell(r, 7)),
        inspections: num(cell(r, 8)) || 0,
        quality: pct(cell(r, 9)),
        earnings: num(cell(r, 10)) || 0,
        closes: num(cell(r, 11)) || 0,
        status: cell(r, 12),
        redFlag: cell(r, 13),
        notes: cell(r, 14)
      });
    }
    return rows;
  }

  function parseGates(values) {
    var rows = [];
    if (!values) return rows;
    for (var i = 1; i < values.length; i++) {
      var r = values[i];
      var name = cell(r, 0);
      if (!name) continue;
      rows.push({
        name: name,
        startDate: date(cell(r, 1)),
        gate1Date: date(cell(r, 2)),
        phase1Status: cell(r, 3),
        phase1Doors: num(cell(r, 4)),
        phase1Conversion: pct(cell(r, 5)),
        phase1Quality: pct(cell(r, 6)),
        phase1Result: cell(r, 7),
        phase1Notes: cell(r, 8),
        gate2Date: date(cell(r, 9)),
        phase2Status: cell(r, 10),
        phase2Doors: num(cell(r, 11)),
        phase2Conversion: pct(cell(r, 12)),
        phase2Quality: pct(cell(r, 13)),
        closes: num(cell(r, 14)),
        closeAssessment: cell(r, 15),
        phase2Result: cell(r, 16),
        finalDecision: cell(r, 17),
        finalNotes: cell(r, 18)
      });
    }
    return rows;
  }

  function parseRoi(values) {
    var byLabel = {};
    var multiYear = [];
    var scenarios = null;
    if (!values) return { byLabel: byLabel, multiYear: multiYear, scenarios: [] };

    for (var i = 0; i < values.length; i++) {
      var r = values[i];
      var label = cell(r, 0);
      if (!label) continue;
      byLabel[label] = cell(r, 1);

      if (/^Year \d$/.test(label)) {
        multiYear.push({
          year: label,
          graduates: num(cell(r, 1)),
          contribution: num(cell(r, 2))
        });
      }
      if (label === 'Scenario') scenarios = i; // header row of the scenario table
    }

    var scen = [];
    if (scenarios !== null) {
      var head = values[scenarios];
      var findRow = function (name) {
        for (var j = scenarios; j < values.length; j++) {
          if (cell(values[j], 0) === name) return values[j];
        }
        return [];
      };
      var gradRow = findRow('Grad Rate'), contrRow = findRow('Contracts/Mo'),
          marginRow = findRow('Margin'), roiRow = findRow('Year 1 ROI');
      for (var c = 1; c < head.length; c++) {
        if (!cell(head, c)) continue;
        scen.push({
          name: cell(head, c),
          gradRate: cell(gradRow, c),
          contractsPerMonth: cell(contrRow, c),
          margin: cell(marginRow, c),
          roi: cell(roiRow, c)
        });
      }
    }

    return {
      byLabel: byLabel,
      investment: num(byLabel['Total Cohort Investment'] || byLabel['Training Investment']),
      perCanvasser: num(byLabel['Total Per Canvasser']),
      graduates: num(byLabel['Expected Graduates']),
      contribution: num(byLabel['Total Net Contribution (Year 1)']),
      roiMultiple: num(byLabel['ROI Multiple']),
      payback: num(byLabel['Payback Period (Days)']),
      multiYear: multiYear,
      scenarios: scen
    };
  }

  // ---------- fetch ----------

  function hasConfig() {
    return typeof NSR_CONFIG !== 'undefined' && NSR_CONFIG.sheetId && NSR_CONFIG.apiKey &&
      NSR_CONFIG.sheetId.indexOf('YOUR_') !== 0 && NSR_CONFIG.apiKey.indexOf('YOUR_') !== 0;
  }

  function fetchLive() {
    var base = 'https://sheets.googleapis.com/v4/spreadsheets/' +
      encodeURIComponent(NSR_CONFIG.sheetId) + '/values:batchGet?key=' +
      encodeURIComponent(NSR_CONFIG.apiKey);
    var url = base + Object.keys(RANGES).map(function (k) {
      return '&ranges=' + encodeURIComponent(RANGES[k]);
    }).join('');

    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error('Sheets API HTTP ' + res.status);
      return res.json();
    }).then(function (data) {
      var vr = data.valueRanges || [];
      return {
        cohort: parseCohort(vr[0] && vr[0].values),
        weekly: parseWeekly(vr[1] && vr[1].values),
        gates: parseGates(vr[2] && vr[2].values),
        roi: parseRoi(vr[3] && vr[3].values),
        source: 'live'
      };
    });
  }

  function fetchDemo() {
    return Promise.resolve({
      cohort: parseCohort(DEMO_DATA['Cohort Overview']),
      weekly: parseWeekly(DEMO_DATA['Weekly Summary']),
      gates: parseGates(DEMO_DATA['Phase Gates']),
      roi: parseRoi(DEMO_DATA['ROI Projection']),
      source: 'demo'
    });
  }

  /** Fetch all dashboard data; falls back to demo data if not configured or on error. */
  function fetchAll() {
    if (!hasConfig()) {
      return fetchDemo().then(function (d) { d.reason = 'not-configured'; return d; });
    }
    return fetchLive().catch(function (err) {
      console.error('Live fetch failed, falling back to demo data:', err);
      return fetchDemo().then(function (d) { d.reason = String(err.message || err); return d; });
    });
  }

  return { fetchAll: fetchAll, _parsers: { num: num, pct: pct } };
})();
