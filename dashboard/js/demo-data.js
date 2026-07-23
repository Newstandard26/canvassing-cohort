/**
 * Built-in demo data for the NSR Ramp Cohort Dashboard.
 *
 * Shaped exactly like the Google Sheets API `values` responses for each tab,
 * so the same parsers run against demo data and live data. The dashboard falls
 * back to this snapshot when config.js is missing or the API is unreachable.
 *
 * Reps ramp on individual clocks, so the demo generates staggered start dates
 * relative to today — the snapshot always looks mid-ramp:
 *   Alex   day 18 · Bailey day 15 · Casey washed out (day 14 of 18)
 *   Dakota day 11 · Emerson day 8
 */

var DEMO_DATA = (function () {
  'use strict';

  function iso(d) {
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  // startDaysAgo = N means today is that rep's ramp day N+1
  function startOf(daysAgo) {
    var d = new Date(today.getTime());
    d.setDate(d.getDate() - daysAgo);
    return d;
  }
  function plus(d, n) {
    var x = new Date(d.getTime());
    x.setDate(x.getDate() + n);
    return x;
  }

  var reps = {
    alex: startOf(17),    // day 18
    bailey: startOf(14),  // day 15
    casey: startOf(17),   // washed out on their day 14
    dakota: startOf(10),  // day 11
    emerson: startOf(7)   // day 8
  };

  // Weekly Summary row: ramp week w for a rep (their week 1 = their days 1–7)
  function week(w, start, name, phase, doors, leads, conv, insp, qual, earn, status, flag, notes) {
    return [String(w), iso(plus(start, (w - 1) * 7)), iso(plus(start, Math.min(w * 7, 45) - 1)),
      name, phase, String(doors), String(leads), conv, String(insp), qual, earn, '0', status, flag, notes];
  }

  function gates(name, start, p1Status, p1Doors, p1Conv, p1Qual, p1Result, p1Notes, finalDecision, finalNotes) {
    return [name, iso(start), iso(plus(start, 21)), p1Status, p1Doors, p1Conv, p1Qual, p1Result, p1Notes,
      finalDecision === 'WASHOUT' ? '' : iso(plus(start, 45)), '', '', '', '', '0', '', '', finalDecision, finalNotes];
  }

  return {
    'Cohort Overview': [
      ['Cohort Name', 'First Start Date', "Today's Date", 'First Phase 1 Gate', 'Last Phase 2 Gate',
       'Days Elapsed (First Rep)', 'Days Remaining (Last Rep)', 'Total Canvassers Started', 'Phase 1 Currently',
       'Phase 2 Currently', 'Graduated', 'Washed Out', 'Cohort Status',
       'Day 21 Decision', 'Day 21 Decision Date', 'Day 45 Decision', 'Day 45 Decision Date'],
      ['Cohort #1 — July 2026', iso(reps.alex), iso(today), iso(plus(reps.alex, 21)), iso(plus(reps.emerson, 45)),
       '17', '38', '5', '4', '0', '0', '1', 'AT RISK', '', '', '', '']
    ],

    'Weekly Summary': [
      ['Week #', 'Week Start Date', 'Week End Date', 'Canvasser Name', 'Phase',
       'Doors (Week)', 'Leads (Week)', 'Conversion % (Week)', 'Completed Inspections',
       'Lead Quality %', 'Weekly Earnings', 'Supervised Closes (Ph2)', 'Status',
       'Red Flag Reason', 'PM Notes'],
      week(1, reps.alex, 'Alex Rodriguez', 'Phase 1', 380, 16, '4.2%', 12, '75%', '$900', '✓', '', 'Strong start'),
      week(2, reps.alex, 'Alex Rodriguez', 'Phase 1', 420, 19, '4.5%', 14, '74%', '$975', '✓', '', 'Best week so far'),
      week(3, reps.alex, 'Alex Rodriguez', 'Phase 1', 250, 11, '4.4%', 8, '73%', '$775', '✓', '', 'Partial week (their Day 18)'),
      week(1, reps.bailey, 'Bailey Torres', 'Phase 1', 350, 14, '4.0%', 9, '64%', '$850', '✓', '', 'Solid first week'),
      week(2, reps.bailey, 'Bailey Torres', 'Phase 1', 400, 17, '4.3%', 11, '65%', '$925', '✓', '', 'Consistent'),
      week(3, reps.bailey, 'Bailey Torres', 'Phase 1', 60, 3, '5.0%', 1, '33%', '$575', '⚠️', 'Quality <60%', 'One day in — small sample'),
      week(1, reps.casey, 'Casey Martinez', 'Phase 1', 240, 6, '2.5%', 3, '50%', '$650', '✗', 'Conversion <3%', 'Coaching on pitch'),
      week(2, reps.casey, 'Casey Martinez', 'Phase 1', 180, 4, '2.2%', 2, '50%', '$600', '✗', 'Doors + conversion low', 'Washed out their Day 14'),
      week(1, reps.dakota, 'Dakota Lee', 'Phase 1', 340, 14, '4.1%', 8, '57%', '$850', '⚠️', 'Quality <60%', 'Qualifying too loosely'),
      week(2, reps.dakota, 'Dakota Lee', 'Phase 1', 220, 9, '4.1%', 5, '56%', '$725', '⚠️', 'Quality <60%', 'Watch quality at gate'),
      week(1, reps.emerson, 'Emerson Cruz', 'Phase 1', 365, 15, '4.1%', 10, '67%', '$875', '✓', '', 'Good energy'),
      week(2, reps.emerson, 'Emerson Cruz', 'Phase 1', 60, 3, '5.0%', 2, '67%', '$575', '✓', '', 'Day 8'),
      [],
      ['', '', '', 'COHORT AVERAGES', '', '272', '', '4.0%', '', '61%', '', '', '', '', ''],
      ['', '', '', 'On Track (✓)', '', '7', '', '', '', '', '', '', '', '', ''],
      ['', '', '', 'At Risk (⚠️)', '', '3', '', '', '', '', '', '', '', '', ''],
      ['', '', '', 'Off Track (✗)', '', '2', '', '', '', '', '', '', '', '', '']
    ],

    'Phase Gates': [
      ['Canvasser Name', 'Start Date', 'Phase 1 Gate Date', 'Phase 1 Status',
       'Phase 1 Door Count', 'Phase 1 Conversion %', 'Phase 1 Lead Quality %',
       'Phase 1 Gate Result', 'Phase 1 Notes', 'Phase 2 Gate Date', 'Phase 2 Status',
       'Phase 2 Door Count', 'Phase 2 Conversion %', 'Phase 2 Lead Quality %',
       'Supervised Closes', 'Close Ability Assessment', 'Phase 2 Gate Result',
       'Final Decision', 'Final Notes'],
      gates('Alex Rodriguez', reps.alex, '', '1,050', '4.4%', '74%', '', 'Pacing to pass', '', ''),
      gates('Bailey Torres', reps.bailey, '', '810', '4.2%', '63%', '', 'On pace', '', ''),
      gates('Casey Martinez', reps.casey, 'WASHOUT', '420', '2.4%', '50%', 'FAIL', 'Terminated their Day 14 — low doors + conversion', 'WASHOUT', 'Did not respond to coaching'),
      gates('Dakota Lee', reps.dakota, '', '560', '4.1%', '57%', '', 'Quality below floor — watch at gate', '', ''),
      gates('Emerson Cruz', reps.emerson, '', '425', '4.2%', '67%', '', 'Strong start', '', '')
    ],

    'ROI Projection': [
      ['ASSUMPTIONS & TRAINING COSTS', '', ''],
      ['Recruitment & Onboarding', '$1,500', 'Per canvasser'],
      ['PM Oversight (45 days)', '$3,000', '~12 hrs/week × $50/hr'],
      ['Sales Manager Coordination', '$2,000', 'Cohort-wide'],
      ['Materials & Playbooks', '$200', 'Per canvasser'],
      ['Total Per Canvasser', '$4,700', ''],
      ['Total Cohort Investment', '$23,500', ''],
      [],
      ['REVENUE & PROFIT ASSUMPTIONS (Per Graduated PM)', '', ''],
      ['Avg Contracts/Month (Year 1)', '5', 'Conservative starter pace'],
      ['Avg Ticket Size', '$27,000', 'NSR standard'],
      ['Gross Profit Margin %', '40%', 'GP / Revenue'],
      ['Annual Revenue (Year 1)', '$1,620,000', ''],
      ['Annual Gross Profit (Year 1)', '$648,000', ''],
      ['PM Salary (All-in)', '$65,000', 'Salary + taxes + benefits'],
      ['Net Contribution (Year 1)', '$583,000', 'Per PM'],
      [],
      ['COHORT ROI CALCULATION', '', ''],
      ['Canvassers Started', '5', 'From Cohort Overview'],
      ['Expected Graduates', '2', '40% graduation rate'],
      ['Training Investment', '$23,500', ''],
      ['Total Year 1 Revenue (All Grads)', '$3,240,000', ''],
      ['Total Year 1 GP', '$1,296,000', ''],
      ['Total Year 1 PM Salary Costs', '$130,000', ''],
      ['Total Net Contribution (Year 1)', '$1,166,000', ''],
      ['ROI Multiple', '49.6x', ''],
      ['Payback Period (Days)', '7', ''],
      [],
      ['MULTI-YEAR PROJECTION', '', ''],
      ['Year', 'Graduates (Cumulative)', 'Net Contribution'],
      ['Year 1', '2', '$1,166,000'],
      ['Year 2', '4', '$2,332,000'],
      ['Year 3', '6', '$3,498,000'],
      [],
      ['SCENARIO ANALYSIS', '', ''],
      ['Scenario', 'Conservative', 'Base', 'Optimistic'],
      ['Grad Rate', '30%', '40%', '50%'],
      ['Contracts/Mo', '4', '5', '6'],
      ['Margin', '35%', '40%', '42%'],
      ['Year 1 ROI', '33.1x', '49.6x', '95.9x']
    ]
  };
})();
