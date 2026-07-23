/**
 * Built-in demo data for the NSR Ramp Cohort Dashboard.
 *
 * Shaped exactly like the Google Sheets API `values` responses for each tab,
 * so the same parsers run against demo data and live data. The dashboard falls
 * back to this snapshot when config.js is missing or the API is unreachable.
 *
 * Snapshot: Cohort #1, Day 18 of 45 (mid-Phase-1, Day 21 gate approaching).
 */

var DEMO_DATA = {
  'Cohort Overview': [
    ['Cohort Name', 'Start Date', "Today's Date", 'Phase 1 Gate Date', 'Phase 2 Gate Date',
     'Days Elapsed', 'Days Remaining', 'Total Canvassers Started', 'Phase 1 Currently',
     'Phase 2 Currently', 'Graduated', 'Washed Out', 'Cohort Status',
     'Day 21 Decision', 'Day 21 Decision Date', 'Day 45 Decision', 'Day 45 Decision Date'],
    ['Cohort #1 — July 2026', '2026-08-01', '2026-08-18', '2026-08-22', '2026-09-15',
     '18', '27', '5', '4', '0', '0', '1', 'AT RISK', '', '', '', '']
  ],

  'Weekly Summary': [
    ['Week #', 'Week Start Date', 'Week End Date', 'Canvasser Name', 'Phase',
     'Doors (Week)', 'Leads (Week)', 'Conversion % (Week)', 'Completed Inspections',
     'Lead Quality %', 'Weekly Earnings', 'Supervised Closes (Ph2)', 'Status',
     'Red Flag Reason', 'PM Notes'],
    ['1', '2026-08-01', '2026-08-07', 'Alex Rodriguez', 'Phase 1', '380', '16', '4.2%', '12', '75%', '$900', '0', '✓', '', 'Strong start'],
    ['1', '2026-08-01', '2026-08-07', 'Bailey Torres', 'Phase 1', '350', '14', '4.0%', '9', '64%', '$850', '0', '✓', '', 'Solid first week'],
    ['1', '2026-08-01', '2026-08-07', 'Casey Martinez', 'Phase 1', '240', '6', '2.5%', '3', '50%', '$650', '0', '✗', 'Conversion <3%', 'Coaching on pitch'],
    ['1', '2026-08-01', '2026-08-07', 'Dakota Lee', 'Phase 1', '340', '14', '4.1%', '8', '57%', '$850', '0', '⚠️', 'Quality <60%', 'Qualifying too loosely'],
    ['1', '2026-08-01', '2026-08-07', 'Emerson Cruz', 'Phase 1', '365', '15', '4.1%', '10', '67%', '$875', '0', '✓', '', 'Good energy'],
    ['2', '2026-08-08', '2026-08-14', 'Alex Rodriguez', 'Phase 1', '420', '19', '4.5%', '14', '74%', '$975', '0', '✓', '', 'Best week so far'],
    ['2', '2026-08-08', '2026-08-14', 'Bailey Torres', 'Phase 1', '400', '17', '4.3%', '11', '65%', '$925', '0', '✓', '', 'Consistent'],
    ['2', '2026-08-08', '2026-08-14', 'Casey Martinez', 'Phase 1', '180', '4', '2.2%', '2', '50%', '$600', '0', '✗', 'Doors + conversion low', 'Washed out 8/14'],
    ['2', '2026-08-08', '2026-08-14', 'Dakota Lee', 'Phase 1', '355', '15', '4.2%', '9', '60%', '$875', '0', '✓', '', 'Quality improving'],
    ['2', '2026-08-08', '2026-08-14', 'Emerson Cruz', 'Phase 1', '390', '16', '4.1%', '10', '63%', '$900', '0', '✓', '', 'Steady'],
    ['3', '2026-08-15', '2026-08-21', 'Alex Rodriguez', 'Phase 1', '250', '11', '4.4%', '8', '73%', '$775', '0', '✓', '', 'Partial week (Day 18)'],
    ['3', '2026-08-15', '2026-08-21', 'Bailey Torres', 'Phase 1', '230', '10', '4.3%', '6', '60%', '$750', '0', '✓', '', 'Partial week (Day 18)'],
    ['3', '2026-08-15', '2026-08-21', 'Dakota Lee', 'Phase 1', '220', '9', '4.1%', '5', '56%', '$725', '0', '⚠️', 'Quality <60%', 'Watch quality at gate'],
    ['3', '2026-08-15', '2026-08-21', 'Emerson Cruz', 'Phase 1', '240', '10', '4.2%', '6', '60%', '$750', '0', '✓', '', 'Partial week (Day 18)'],
    [],
    ['', '', '', 'COHORT AVERAGES', '', '319', '', '3.9%', '', '63%', '', '', '', '', ''],
    ['', '', '', 'On Track (✓)', '', '9', '', '', '', '', '', '', '', '', ''],
    ['', '', '', 'At Risk (⚠️)', '', '2', '', '', '', '', '', '', '', '', ''],
    ['', '', '', 'Off Track (✗)', '', '2', '', '', '', '', '', '', '', '', '']
  ],

  'Phase Gates': [
    ['Canvasser Name', 'Start Date', 'Phase 1 Gate Date', 'Phase 1 Status',
     'Phase 1 Door Count', 'Phase 1 Conversion %', 'Phase 1 Lead Quality %',
     'Phase 1 Gate Result', 'Phase 1 Notes', 'Phase 2 Gate Date', 'Phase 2 Status',
     'Phase 2 Door Count', 'Phase 2 Conversion %', 'Phase 2 Lead Quality %',
     'Supervised Closes', 'Close Ability Assessment', 'Phase 2 Gate Result',
     'Final Decision', 'Final Notes'],
    ['Alex Rodriguez', '2026-08-01', '2026-08-22', '', '1,050', '4.4%', '74%', '', 'Pacing to pass', '2026-09-15', '', '', '', '', '0', '', '', '', ''],
    ['Bailey Torres', '2026-08-01', '2026-08-22', '', '980', '4.2%', '63%', '', 'On pace', '2026-09-15', '', '', '', '', '0', '', '', '', ''],
    ['Casey Martinez', '2026-08-01', '2026-08-22', 'WASHOUT', '420', '2.4%', '50%', 'FAIL', 'Terminated Day 14 — low doors + conversion', '', '', '', '', '', '', '', '', 'WASHOUT', 'Did not respond to coaching'],
    ['Dakota Lee', '2026-08-01', '2026-08-22', '', '915', '4.2%', '58%', '', 'Quality below floor — watch at gate', '2026-09-15', '', '', '', '', '0', '', '', '', ''],
    ['Emerson Cruz', '2026-08-01', '2026-08-22', '', '995', '4.1%', '63%', '', 'On pace', '2026-09-15', '', '', '', '', '0', '', '', '', '']
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
