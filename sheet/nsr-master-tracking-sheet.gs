/**
 * NSR Canvasser Ramp — Master Tracking Sheet Generator
 * =====================================================
 * Google Apps Script that builds the complete 6-tab Master Tracking Sheet
 * described in the NSR Sales System spec (v1.0, 2026-07-23).
 *
 * HOW TO RUN
 * ----------
 * 1. Go to https://script.google.com and create a new project.
 * 2. Paste this entire file into Code.gs.
 * 3. Run the function `buildMasterTrackingSheet` (authorize when prompted).
 * 4. Open the "Execution log" — it prints the URL and Sheet ID of the new
 *    spreadsheet. Put that Sheet ID in the dashboard's config.js.
 * 5. Share the spreadsheet: "Anyone with the link" → Viewer (required for the
 *    dashboard to read it with an API key).
 *
 * The script creates a brand-new spreadsheet each run — it never touches an
 * existing file. Sample data for Cohort #1 (5 canvassers, start 2026-08-01)
 * is seeded so every formula and the dashboard can be verified immediately.
 * Delete or overwrite the sample rows when the real cohort begins.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

var CFG = {
  fileName: 'NSR Canvasser Ramp — Master Tracking Sheet',
  cohortName: 'Cohort #1 — July 2026',
  startDate: '2026-08-01',      // Day 1
  rampDays: 45,
  phase1Days: 21,
  canvassers: ['Alex Rodriguez', 'Bailey Torres', 'Casey Martinez', 'Dakota Lee', 'Emerson Cruz'],
  // Compensation / gate constants (mirrored in Settings & Reference tab)
  perLead: 25,
  weeklyDraw: 500,
  doorMinDaily: 60,
  conversionFloor: 0.04,
  qualityFloor: 0.60,
  closesMin: 2,
  // Branding
  darkBlue: '#1A3A52',
  orange: '#FF6B35',
  lightGray: '#F5F5F5',
  phase1Bg: '#E3F2FD',
  phase2Bg: '#BBDEFB'
};

// Layout constants for the Canvasser Daily Tracking tab.
// Each canvasser occupies a 14-row block (13 data rows + 1 blank separator).
var DAILY_BLOCK_ROWS = 15;   // rows per canvasser block (incl. separator)
var DAILY_FIRST_COL = 3;     // column C = Day 1
var DAILY_ROW_LABELS = [
  'Canvasser Name & Phase',       // block row 1
  'Date',                         // block row 2
  'Doors Knocked (Daily)',        // block row 3  (manual entry)
  'Leads to Inspection (Daily)',  // block row 4  (manual entry)
  'Conversion % (Daily)',         // block row 5  (formula)
  'Completed Inspections',        // block row 6  (manual entry)
  'Lead Quality % (Daily)',       // block row 7  (formula)
  'Daily Earnings',               // block row 8  (formula)
  'Cumulative Doors',             // block row 9  (formula)
  'Cumulative Leads',             // block row 10 (formula)
  'Cumulative Earnings',          // block row 11 (formula)
  'Red Flag',                     // block row 12 (formula)
  'Notes'                         // block row 13 (manual entry)
];

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function buildMasterTrackingSheet() {
  var ss = SpreadsheetApp.create(CFG.fileName);

  buildCohortOverview(ss);
  buildDailyTracking(ss);
  buildWeeklySummary(ss);
  buildPhaseGates(ss);
  buildRoiProjection(ss);
  buildSettingsReference(ss);

  // Remove the default "Sheet1"
  var def = ss.getSheetByName('Sheet1');
  if (def) ss.deleteSheet(def);

  Logger.log('DONE');
  Logger.log('URL:      ' + ss.getUrl());
  Logger.log('Sheet ID: ' + ss.getId());
  Logger.log('Next: File → Share → "Anyone with the link" (Viewer), then put the Sheet ID in dashboard/config.js');
}

// ---------------------------------------------------------------------------
// Tab 1: Cohort Overview
// ---------------------------------------------------------------------------

function buildCohortOverview(ss) {
  var sh = ss.insertSheet('Cohort Overview');
  var headers = [
    'Cohort Name', 'Start Date', "Today's Date", 'Phase 1 Gate Date', 'Phase 2 Gate Date',
    'Days Elapsed', 'Days Remaining', 'Total Canvassers Started', 'Phase 1 Currently',
    'Phase 2 Currently', 'Graduated', 'Washed Out', 'Cohort Status',
    'Day 21 Decision', 'Day 21 Decision Date', 'Day 45 Decision', 'Day 45 Decision Date'
  ];
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);

  sh.getRange('A2').setValue(CFG.cohortName);
  sh.getRange('B2').setValue(CFG.startDate);
  sh.getRange('C2').setFormula('=TODAY()');
  sh.getRange('D2').setFormula('=B2+' + CFG.phase1Days);
  sh.getRange('E2').setFormula('=B2+' + CFG.rampDays);
  sh.getRange('F2').setFormula('=MAX(0, MIN(' + CFG.rampDays + ', C2-B2))');
  sh.getRange('G2').setFormula('=' + CFG.rampDays + '-F2');
  sh.getRange('H2').setValue(CFG.canvassers.length);
  sh.getRange('I2').setValue(CFG.canvassers.length);  // all start in Phase 1
  sh.getRange('J2').setValue(0);
  sh.getRange('K2').setValue(0);
  sh.getRange('L2').setValue(0);
  // ON TRACK while headcount reconciles and no one has washed out beyond plan;
  // AT RISK if any washouts; BEHIND if headcount doesn't reconcile.
  sh.getRange('M2').setFormula(
    '=IF(I2+J2+K2+L2<>H2, "BEHIND", IF(L2=0, "ON TRACK", IF(L2<=H2*0.4, "AT RISK", "BEHIND")))'
  );

  sh.getRange('B2:E2').setNumberFormat('yyyy-mm-dd');
  sh.getRange('O2').setNumberFormat('yyyy-mm-dd');
  sh.getRange('Q2').setNumberFormat('yyyy-mm-dd');

  styleHeaderRow(sh, headers.length);
  sh.setFrozenRows(1);
  sh.autoResizeColumns(1, headers.length);
}

// ---------------------------------------------------------------------------
// Tab 2: Canvasser Daily Tracking
// ---------------------------------------------------------------------------

function buildDailyTracking(ss) {
  var sh = ss.insertSheet('Canvasser Daily Tracking');
  var start = new Date(CFG.startDate + 'T00:00:00');

  CFG.canvassers.forEach(function (name, i) {
    var top = 1 + i * DAILY_BLOCK_ROWS; // first row of this canvasser's block

    // Column A labels
    var labels = DAILY_ROW_LABELS.map(function (l) { return [l]; });
    sh.getRange(top, 1, labels.length, 1).setValues(labels);

    // Column B: canvasser name on the block's first row
    sh.getRange(top, 2).setValue(name + ' (Phase 1)').setFontWeight('bold');

    // Date row: Day 1..45 across columns C..AQ
    var dates = [];
    for (var d = 0; d < CFG.rampDays; d++) {
      var dt = new Date(start.getTime());
      dt.setDate(dt.getDate() + d);
      dates.push(dt);
    }
    sh.getRange(top + 1, DAILY_FIRST_COL, 1, CFG.rampDays)
      .setValues([dates]).setNumberFormat('mm/dd');

    // Formula rows (R1C1 so they fill across all 45 day-columns)
    var r = function (offset) { return top + offset; }; // offset from block top
    var range45 = function (row) { return sh.getRange(row, DAILY_FIRST_COL, 1, CFG.rampDays); };

    // Conversion % = leads / doors
    range45(r(4)).setFormulaR1C1('=IF(R[-2]C>0, R[-1]C/R[-2]C, "")').setNumberFormat('0.0%');
    // Lead Quality % = inspections / leads
    range45(r(6)).setFormulaR1C1('=IF(R[-3]C>0, R[-1]C/R[-3]C, "")').setNumberFormat('0%');
    // Daily Earnings = leads × $25 (the $500 weekly draw is added in Weekly Summary)
    range45(r(7)).setFormulaR1C1('=IF(R[-4]C="", "", R[-4]C*' + CFG.perLead + ')').setNumberFormat('$#,##0');
    // Cumulative Doors / Leads / Earnings (running totals)
    range45(r(8)).setFormulaR1C1('=IF(R[-6]C="", "", SUM(R[-6]C3:R[-6]C))').setNumberFormat('#,##0');
    range45(r(9)).setFormulaR1C1('=IF(R[-6]C="", "", SUM(R[-6]C3:R[-6]C))').setNumberFormat('#,##0');
    range45(r(10)).setFormulaR1C1('=IF(R[-3]C="", "", SUM(R[-3]C3:R[-3]C))').setNumberFormat('$#,##0');
    // Red Flag: doors below daily minimum, conversion below floor, or quality below floor
    range45(r(11)).setFormulaR1C1(
      '=IF(R[-9]C="", "", IF(R[-9]C<' + CFG.doorMinDaily + ', "⚠️ Doors", ' +
      'IF(AND(R[-7]C<>"", R[-7]C<' + CFG.conversionFloor + '), "⚠️ Conv", ' +
      'IF(AND(R[-5]C<>"", R[-5]C<' + CFG.qualityFloor + '), "⚠️ Quality", ""))))'
    );

    // Block header styling
    sh.getRange(top, 1, 1, 2).setBackground(CFG.darkBlue).setFontColor('#FFFFFF').setFontWeight('bold');
    sh.getRange(top + 1, 1, 1, 2 + CFG.rampDays).setBackground(CFG.lightGray).setFontWeight('bold');
  });

  // Seed sample data: first 3 days for the first canvasser (matches the spec example)
  sh.getRange(3, DAILY_FIRST_COL, 1, 3).setValues([[65, 62, 58]]);   // doors
  sh.getRange(4, DAILY_FIRST_COL, 1, 3).setValues([[2, 3, 2]]);      // leads
  sh.getRange(6, DAILY_FIRST_COL, 1, 3).setValues([[2, 3, 2]]);      // inspections
  sh.getRange(13, DAILY_FIRST_COL, 1, 3).setValues([['Strong start', 'Great day', 'Slightly low']]);

  sh.setColumnWidth(1, 190);
  sh.setColumnWidth(2, 170);
  sh.setFrozenColumns(2);
}

// ---------------------------------------------------------------------------
// Tab 3: Weekly Summary
// ---------------------------------------------------------------------------

function buildWeeklySummary(ss) {
  var sh = ss.insertSheet('Weekly Summary');
  var headers = [
    'Week #', 'Week Start Date', 'Week End Date', 'Canvasser Name', 'Phase',
    'Doors (Week)', 'Leads (Week)', 'Conversion % (Week)', 'Completed Inspections',
    'Lead Quality %', 'Weekly Earnings', 'Supervised Closes (Ph2)', 'Status',
    'Red Flag Reason', 'PM Notes'
  ];
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);

  var daily = "'Canvasser Daily Tracking'!";
  var weeks = Math.ceil(CFG.rampDays / 7); // 45 days → weeks 1–7 (week 7 is 3 days)
  var row = 2;

  for (var w = 1; w <= weeks; w++) {
    // Day range for this week, as day-column offsets on the Daily Tracking tab
    var firstDay = (w - 1) * 7 + 1;
    var lastDay = Math.min(w * 7, CFG.rampDays);
    var c1 = colLetter(DAILY_FIRST_COL + firstDay - 1);
    var c2 = colLetter(DAILY_FIRST_COL + lastDay - 1);

    CFG.canvassers.forEach(function (name, i) {
      var top = 1 + i * DAILY_BLOCK_ROWS;
      var doorsRow = top + 2, leadsRow = top + 3, inspRow = top + 5;

      sh.getRange(row, 1).setValue(w);
      sh.getRange(row, 2).setFormula("='Cohort Overview'!$B$2+" + ((w - 1) * 7));
      sh.getRange(row, 3).setFormula("='Cohort Overview'!$B$2+" + (lastDay - 1));
      sh.getRange(row, 4).setValue(name);
      sh.getRange(row, 5).setValue(w <= 3 ? 'Phase 1' : 'Phase 2');
      sh.getRange(row, 6).setFormula('=SUM(' + daily + c1 + doorsRow + ':' + c2 + doorsRow + ')');
      sh.getRange(row, 7).setFormula('=SUM(' + daily + c1 + leadsRow + ':' + c2 + leadsRow + ')');
      sh.getRange(row, 8).setFormula('=IF(F' + row + '>0, G' + row + '/F' + row + ', "")');
      sh.getRange(row, 9).setFormula('=SUM(' + daily + c1 + inspRow + ':' + c2 + inspRow + ')');
      sh.getRange(row, 10).setFormula('=IF(G' + row + '>0, I' + row + '/G' + row + ', "")');
      // Weekly earnings = leads × $25 + weekly draw
      sh.getRange(row, 11).setFormula('=G' + row + '*' + CFG.perLead + '+' + CFG.weeklyDraw);
      sh.getRange(row, 12).setValue(0);
      // Status: ✓ conversion ≥4% and quality ≥60%; ⚠️ conversion ok but quality low; ✗ conversion low
      sh.getRange(row, 13).setFormula(
        '=IF(F' + row + '=0, "", IF(H' + row + '>=' + CFG.conversionFloor +
        ', IF(J' + row + '>=' + CFG.qualityFloor + ', "✓", "⚠️"), "✗"))'
      );
      row++;
    });
  }

  // Cohort aggregate block
  var lastData = row - 1;
  row++;
  sh.getRange(row, 4).setValue('COHORT AVERAGES').setFontWeight('bold');
  sh.getRange(row, 6).setFormula('=IFERROR(AVERAGEIF(F2:F' + lastData + ', ">0"), 0)');
  sh.getRange(row, 8).setFormula('=IFERROR(AVERAGE(H2:H' + lastData + '), "")');
  sh.getRange(row, 10).setFormula('=IFERROR(AVERAGE(J2:J' + lastData + '), "")');
  row++;
  sh.getRange(row, 4).setValue('On Track (✓)').setFontWeight('bold');
  sh.getRange(row, 6).setFormula('=COUNTIF(M2:M' + lastData + ', "✓")');
  row++;
  sh.getRange(row, 4).setValue('At Risk (⚠️)').setFontWeight('bold');
  sh.getRange(row, 6).setFormula('=COUNTIF(M2:M' + lastData + ', "⚠️")');
  row++;
  sh.getRange(row, 4).setValue('Off Track (✗)').setFontWeight('bold');
  sh.getRange(row, 6).setFormula('=COUNTIF(M2:M' + lastData + ', "✗")');

  sh.getRange('B2:C').setNumberFormat('yyyy-mm-dd');
  sh.getRange('H2:H').setNumberFormat('0.0%');
  sh.getRange('J2:J').setNumberFormat('0%');
  sh.getRange('K2:K').setNumberFormat('$#,##0');

  styleHeaderRow(sh, headers.length);
  sh.setFrozenRows(1);
  sh.autoResizeColumns(1, headers.length);
}

// ---------------------------------------------------------------------------
// Tab 4: Phase Gates
// ---------------------------------------------------------------------------

function buildPhaseGates(ss) {
  var sh = ss.insertSheet('Phase Gates');
  var headers = [
    'Canvasser Name', 'Start Date', 'Phase 1 Gate Date', 'Phase 1 Status',
    'Phase 1 Door Count', 'Phase 1 Conversion %', 'Phase 1 Lead Quality %',
    'Phase 1 Gate Result', 'Phase 1 Notes', 'Phase 2 Gate Date', 'Phase 2 Status',
    'Phase 2 Door Count', 'Phase 2 Conversion %', 'Phase 2 Lead Quality %',
    'Supervised Closes', 'Close Ability Assessment', 'Phase 2 Gate Result',
    'Final Decision', 'Final Notes'
  ];
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);

  var doorMinCum = CFG.doorMinDaily * CFG.phase1Days; // 1,260

  CFG.canvassers.forEach(function (name, i) {
    var row = 2 + i;
    var top = 1 + i * DAILY_BLOCK_ROWS;
    var daily = "'Canvasser Daily Tracking'!";
    // Day-21 column on the daily tab
    var d21 = colLetter(DAILY_FIRST_COL + CFG.phase1Days - 1);
    var d45 = colLetter(DAILY_FIRST_COL + CFG.rampDays - 1);
    var cumDoorsRow = top + 8, cumLeadsRow = top + 9, doorsRow = top + 2,
        leadsRow = top + 3, inspRow = top + 5;
    var c1 = colLetter(DAILY_FIRST_COL);

    sh.getRange(row, 1).setValue(name);
    sh.getRange(row, 2).setFormula("='Cohort Overview'!$B$2");
    sh.getRange(row, 3).setFormula('=B' + row + '+' + CFG.phase1Days);
    // Phase 1 metrics pulled from Daily Tracking (cumulative through day 21)
    sh.getRange(row, 5).setFormula('=SUM(' + daily + c1 + doorsRow + ':' + d21 + doorsRow + ')');
    sh.getRange(row, 6).setFormula(
      '=IF(E' + row + '>0, SUM(' + daily + c1 + leadsRow + ':' + d21 + leadsRow + ')/E' + row + ', "")');
    sh.getRange(row, 7).setFormula(
      '=IF(SUM(' + daily + c1 + leadsRow + ':' + d21 + leadsRow + ')>0, ' +
      'SUM(' + daily + c1 + inspRow + ':' + d21 + inspRow + ')/SUM(' + daily + c1 + leadsRow + ':' + d21 + leadsRow + '), "")');
    sh.getRange(row, 8).setFormula(
      '=IF(E' + row + '="", "", IF(AND(E' + row + '>=' + doorMinCum +
      ', F' + row + '>=' + CFG.conversionFloor + ', G' + row + '>=' + CFG.qualityFloor + '), "PASS", "FAIL"))');
    sh.getRange(row, 10).setFormula('=B' + row + '+' + CFG.rampDays);
    // Phase 2 metrics (cumulative through day 45)
    sh.getRange(row, 12).setFormula('=SUM(' + daily + c1 + doorsRow + ':' + d45 + doorsRow + ')');
    sh.getRange(row, 13).setFormula(
      '=IF(L' + row + '>0, SUM(' + daily + c1 + leadsRow + ':' + d45 + leadsRow + ')/L' + row + ', "")');
    sh.getRange(row, 14).setFormula(
      '=IF(SUM(' + daily + c1 + leadsRow + ':' + d45 + leadsRow + ')>0, ' +
      'SUM(' + daily + c1 + inspRow + ':' + d45 + inspRow + ')/SUM(' + daily + c1 + leadsRow + ':' + d45 + leadsRow + '), "")');
    sh.getRange(row, 15).setValue(0);
    sh.getRange(row, 17).setFormula(
      '=IF(L' + row + '="", "", IF(AND(L' + row + '>=' + doorMinCum +
      ', M' + row + '>=' + CFG.conversionFloor + ', O' + row + '>=' + CFG.closesMin + '), "PASS", "FAIL"))');
  });

  sh.getRange('B2:C').setNumberFormat('yyyy-mm-dd');
  sh.getRange('J2:J').setNumberFormat('yyyy-mm-dd');
  sh.getRange('F2:G').setNumberFormat('0.0%');
  sh.getRange('M2:N').setNumberFormat('0.0%');

  styleHeaderRow(sh, headers.length);
  sh.setFrozenRows(1);
  sh.setFrozenColumns(1);
  sh.autoResizeColumns(1, headers.length);
}

// ---------------------------------------------------------------------------
// Tab 5: ROI Projection
// ---------------------------------------------------------------------------

function buildRoiProjection(ss) {
  var sh = ss.insertSheet('ROI Projection');

  var rows = [
    ['ASSUMPTIONS & TRAINING COSTS', '', ''],
    ['Recruitment & Onboarding', 1500, 'Per canvasser'],
    ['PM Oversight (45 days)', 3000, '~12 hrs/week × $50/hr'],
    ['Sales Manager Coordination', 2000, 'Cohort-wide, split by headcount (not in per-canvasser total)'],
    ['Materials & Playbooks', 200, 'Per canvasser'],
    ['Total Per Canvasser', '=B2+B3+B5', 'Recruitment + PM oversight + materials = $4,700'],
    ['Total Cohort Investment', "=B6*'Cohort Overview'!H2", ''],
    ['', '', ''],
    ['REVENUE & PROFIT ASSUMPTIONS (Per Graduated PM)', '', ''],
    ['Avg Contracts/Month (Year 1)', 5, 'Conservative starter pace'],
    ['Avg Ticket Size', 27000, 'NSR standard'],
    ['Gross Profit Margin %', 0.4, 'GP / Revenue'],
    ['Annual Revenue (Year 1)', '=B10*12*B11', ''],
    ['Annual Gross Profit (Year 1)', '=B13*B12', ''],
    ['PM Salary (All-in)', 65000, 'Salary + taxes + benefits'],
    ['Net Contribution (Year 1)', '=B14-B15', 'Per PM'],
    ['', '', ''],
    ['COHORT ROI CALCULATION', '', ''],
    ['Canvassers Started', "='Cohort Overview'!H2", 'From Cohort Overview'],
    ['Expected Graduates', '=ROUND(B19*0.4, 0)', '40% graduation rate'],
    ['Training Investment', '=B7', ''],
    ['Total Year 1 Revenue (All Grads)', '=B20*B13', ''],
    ['Total Year 1 GP', '=B20*B14', ''],
    ['Total Year 1 PM Salary Costs', '=B20*B15', ''],
    ['Total Net Contribution (Year 1)', '=B23-B24', ''],
    ['ROI Multiple', '=IF(B21>0, B25/B21, "")', ''],
    ['Payback Period (Days)', '=IF(B25>0, ROUND(B21/B25*365, 0), "")', ''],
    ['', '', ''],
    ['MULTI-YEAR PROJECTION', '', ''],
    ['Year', 'Graduates (Cumulative)', 'Net Contribution'],
    ['Year 1', '=B20', '=B31*(B14-B15)'],
    ['Year 2', '=B20*2', '=B32*(B14-B15)'],
    ['Year 3', '=B20*3', '=B33*(B14-B15)'],
    ['', '', ''],
    ['SCENARIO ANALYSIS', '', ''],
    ['Scenario', 'Conservative', 'Base'],   // extended to col D below
    ['Grad Rate', 0.3, 0.4],
    ['Contracts/Mo', 4, 5],
    ['Margin', 0.35, 0.4],
    ['Year 1 ROI',
      '=ROUND((ROUND(B19*B38,0)*(B39*12*B11*B40-B15))/B21, 1)',
      '=ROUND((ROUND(B19*C38,0)*(C39*12*B11*C40-B15))/B21, 1)']
  ];

  rows.forEach(function (r, i) {
    r.forEach(function (v, j) {
      if (v === '' || v === null) return;
      var cell = sh.getRange(i + 1, j + 1);
      if (typeof v === 'string' && v.charAt(0) === '=') cell.setFormula(v);
      else cell.setValue(v);
    });
  });

  // Scenario table column D (Optimistic)
  sh.getRange('D37').setValue('Optimistic');
  sh.getRange('D38').setValue(0.5);
  sh.getRange('D39').setValue(6);
  sh.getRange('D40').setValue(0.42);
  sh.getRange('D41').setFormula('=ROUND((ROUND(B19*D38,0)*(D39*12*B11*D40-B15))/B21, 1)');

  // Formatting
  ['A1', 'A9', 'A18', 'A29', 'A36'].forEach(function (a1) {
    sh.getRange(a1).setFontWeight('bold').setBackground(CFG.darkBlue).setFontColor('#FFFFFF');
  });
  sh.getRange('B2:B7').setNumberFormat('$#,##0');
  sh.getRange('B11').setNumberFormat('$#,##0');
  sh.getRange('B12').setNumberFormat('0%');
  sh.getRange('B13:B16').setNumberFormat('$#,##0');
  sh.getRange('B21:B25').setNumberFormat('$#,##0');
  sh.getRange('B26').setNumberFormat('0.0"x"');
  sh.getRange('C31:C33').setNumberFormat('$#,##0');
  sh.getRange('B38:D38').setNumberFormat('0%');
  sh.getRange('B40:D40').setNumberFormat('0%');
  sh.getRange('B41:D41').setNumberFormat('0.0"x"');

  sh.setColumnWidth(1, 280);
  sh.autoResizeColumns(2, 3);
}

// ---------------------------------------------------------------------------
// Tab 6: Settings & Reference
// ---------------------------------------------------------------------------

function buildSettingsReference(ss) {
  var sh = ss.insertSheet('Settings & Reference');
  var rows = [
    ['RAMP STRUCTURE', '', ''],
    ['Total Ramp Days', CFG.rampDays, 'Fixed'],
    ['Phase 1 Duration (Days)', CFG.phase1Days, 'Fixed'],
    ['Phase 2 Duration (Days)', CFG.rampDays - CFG.phase1Days, 'Fixed (45 - 21)'],
    ['', '', ''],
    ['DAY 21 GATE TARGETS', '', ''],
    ['Door Minimum (Per Day)', CFG.doorMinDaily, 'Target daily door knock rate'],
    ['Door Minimum (Cumulative)', CFG.doorMinDaily * CFG.phase1Days, '=60 × 21'],
    ['Conversion Floor %', CFG.conversionFloor, 'Door-to-inspection minimum'],
    ['Lead Quality Floor %', CFG.qualityFloor, '% of leads reaching inspection'],
    ['', '', ''],
    ['DAY 45 GATE TARGETS', '', ''],
    ['Door Minimum (Sustained)', CFG.doorMinDaily, 'Continue Phase 1 pace'],
    ['Conversion Floor %', CFG.conversionFloor, 'Sustained through Day 45'],
    ['Lead Quality Floor %', CFG.qualityFloor, 'Sustained through Day 45'],
    ['Supervised Closes Minimum', CFG.closesMin, 'Demonstrated closes required'],
    ['', '', ''],
    ['COMPENSATION STRUCTURE', '', ''],
    ['Weekly Draw', CFG.weeklyDraw, 'All weeks, all phases'],
    ['$25 Per Lead', CFG.perLead, 'Paid when form submitted'],
    ['5% GP (Phase 2+)', 0.05, 'After job build & collection'],
    ['', '', ''],
    ['DASHBOARD DISPLAY SETTINGS', '', ''],
    ['Refresh Interval', 5, 'Minutes (auto-refresh)'],
    ['API Key Restriction', 'Sheets', 'Google Sheets API only'],
    ['Public Access', 'Yes', 'No login required (read-only)']
  ];
  sh.getRange(1, 1, rows.length, 3).setValues(rows);

  [1, 6, 12, 18, 23].forEach(function (row) {
    sh.getRange(row, 1, 1, 3).setFontWeight('bold').setBackground(CFG.darkBlue).setFontColor('#FFFFFF');
  });
  sh.getRange('B9').setNumberFormat('0%');
  sh.getRange('B10').setNumberFormat('0%');
  sh.getRange('B14:B15').setNumberFormat('0%');
  sh.getRange('B21').setNumberFormat('0%');
  sh.getRange('B19:B20').setNumberFormat('$#,##0');

  sh.setColumnWidth(1, 240);
  sh.setColumnWidth(3, 320);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function styleHeaderRow(sh, numCols) {
  sh.getRange(1, 1, 1, numCols)
    .setFontWeight('bold')
    .setBackground(CFG.darkBlue)
    .setFontColor('#FFFFFF')
    .setWrap(true);
}

/** 1-based column index → A1 letter(s), e.g. 3 → "C", 43 → "AQ". */
function colLetter(n) {
  var s = '';
  while (n > 0) {
    var m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}
