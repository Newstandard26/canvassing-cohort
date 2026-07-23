/**
 * Chart rendering for the NSR Ramp Cohort Dashboard (Chart.js v4).
 *
 * Categorical series palette: fixed slot order, validated for adjacent-pair
 * color-vision-deficiency separation on a white surface. Identity is never
 * color-alone: the trend chart carries a legend, and the metrics table is the
 * text/table view of the same data.
 */

/* global Chart */

var Charts = (function () {
  'use strict';

  // Graceful no-op fallback if Chart.js failed to load — the tables and cards
  // still render, only the canvases stay empty.
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js not loaded — charts disabled.');
    var noop = function () {};
    return { doorsTrend: noop, conversionBars: noop, qualityGauge: noop, roiPayoff: noop };
  }

  // Fixed categorical slot order — assign by canvasser index, never re-cycle.
  var SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'];

  var STATUS = { good: '#4CAF50', warn: '#FFC107', bad: '#F44336' };
  var INK = '#424242', MUTED = '#898781', GRID = '#E1E0D9';
  var TARGET_ORANGE = '#FF6B35';

  Chart.defaults.font.family = "'Roboto', system-ui, sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.color = INK;

  var instances = {};

  function destroy(id) {
    if (instances[id]) { instances[id].destroy(); delete instances[id]; }
  }

  function make(id, cfg) {
    destroy(id);
    var ctx = document.getElementById(id);
    if (!ctx) return null;
    instances[id] = new Chart(ctx, cfg);
    return instances[id];
  }

  /** Draws a dashed horizontal target line with a small label. */
  var targetLinePlugin = {
    id: 'targetLine',
    afterDatasetsDraw: function (chart, args, opts) {
      if (!opts || opts.value === undefined) return;
      var yScale = chart.scales.y;
      var y = yScale.getPixelForValue(opts.value);
      if (y < chart.chartArea.top || y > chart.chartArea.bottom) return;
      var c = chart.ctx;
      c.save();
      c.strokeStyle = opts.color || TARGET_ORANGE;
      c.setLineDash([6, 4]);
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(chart.chartArea.left, y);
      c.lineTo(chart.chartArea.right, y);
      c.stroke();
      c.setLineDash([]);
      c.fillStyle = opts.color || TARGET_ORANGE;
      c.font = "500 11px 'Roboto', sans-serif";
      c.textAlign = 'right';
      c.fillText(opts.label || '', chart.chartArea.right - 4, y - 5);
      c.restore();
    }
  };

  /** Draws a value label above/below each bar (used on the ROI chart). */
  var barValueLabels = {
    id: 'barValueLabels',
    afterDatasetsDraw: function (chart, args, opts) {
      if (!opts || !opts.enabled) return;
      var c = chart.ctx;
      c.save();
      c.font = "700 11px 'Roboto', sans-serif";
      c.textAlign = 'center';
      chart.data.datasets.forEach(function (ds, di) {
        var meta = chart.getDatasetMeta(di);
        if (meta.hidden) return;
        meta.data.forEach(function (bar, i) {
          var v = ds.data[i];
          if (v === null || v === undefined) return;
          c.fillStyle = INK;
          var label = (opts.format ? opts.format(v) : v);
          var yPos = v >= 0 ? bar.y - 6 : bar.y + 14;
          c.fillText(label, bar.x, yPos);
        });
      });
      c.restore();
    }
  };

  /** Gauge needle for the half-doughnut lead-quality gauge. */
  var gaugeNeedle = {
    id: 'gaugeNeedle',
    afterDatasetsDraw: function (chart, args, opts) {
      if (!opts || opts.value === undefined) return;
      var meta = chart.getDatasetMeta(0);
      if (!meta.data.length) return;
      var arc = meta.data[0];
      var cx = arc.x, cy = arc.y;
      var r = arc.outerRadius * 0.92;
      // 0% → 180° (left), 100% → 360° (right)
      var angle = Math.PI + (Math.min(Math.max(opts.value, 0), 1) * Math.PI);
      var c = chart.ctx;
      c.save();
      c.translate(cx, cy);
      c.rotate(angle);
      c.beginPath();
      c.moveTo(0, -4);
      c.lineTo(r, 0);
      c.lineTo(0, 4);
      c.fillStyle = '#1A3A52';
      c.fill();
      c.rotate(-angle);
      c.beginPath();
      c.arc(0, 0, 7, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
  };

  Chart.register(targetLinePlugin, barValueLabels, gaugeNeedle);

  var pctFmt = function (v) { return (v * 100).toFixed(1) + '%'; };

  // -------------------------------------------------------------------------
  // Chart 1: Avg Doors/Day by week — one line per canvasser + 60/day target
  // -------------------------------------------------------------------------
  function doorsTrend(weeklyRows, canvassers, daysInWeek) {
    var weeks = [];
    weeklyRows.forEach(function (r) { if (weeks.indexOf(r.week) < 0) weeks.push(r.week); });
    weeks.sort(function (a, b) { return a - b; });

    var datasets = canvassers.map(function (name, i) {
      var data = weeks.map(function (w) {
        var row = weeklyRows.find(function (r) { return r.name === name && r.week === w; });
        if (!row) return null;
        var days = daysInWeek(w, name); // per-rep: their own days worked in that ramp week
        return days > 0 ? Math.round(row.doors / days) : null;
      });
      return {
        label: name,
        data: data,
        borderColor: SERIES[i % SERIES.length],
        backgroundColor: SERIES[i % SERIES.length],
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 6,
        spanGaps: false,
        tension: 0.15
      };
    });

    make('chart-doors', {
      type: 'line',
      data: { labels: weeks.map(function (w) { return 'Ramp Week ' + w; }), datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } },
          targetLine: { value: 60, label: 'Target: 60/day' },
          tooltip: {
            callbacks: {
              label: function (c) { return c.dataset.label + ': ' + c.parsed.y + ' doors/day'; }
            }
          }
        },
        scales: {
          y: { beginAtZero: true, suggestedMax: 80, grid: { color: GRID }, ticks: { color: MUTED } },
          x: { grid: { display: false }, ticks: { color: MUTED } }
        }
      }
    });
  }

  // -------------------------------------------------------------------------
  // Chart 2: Door→Inspection % per canvasser (current week), status-colored
  // -------------------------------------------------------------------------
  function conversionBars(rows) {
    var colors = rows.map(function (r) {
      if (r.conversion === null) return STATUS.bad;
      if (r.conversion < 0.03) return STATUS.bad;
      if (r.conversion < 0.04) return STATUS.warn;
      return STATUS.good;
    });

    make('chart-conversion', {
      type: 'bar',
      data: {
        labels: rows.map(function (r) { return r.name; }),
        datasets: [{
          label: 'Door→Insp %',
          data: rows.map(function (r) { return r.conversion !== null ? +(r.conversion * 100).toFixed(1) : null; }),
          backgroundColor: colors,
          borderRadius: 4,
          maxBarThickness: 48
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          targetLine: { value: 4, label: 'Target: 4%', color: '#F44336' },
          tooltip: {
            callbacks: {
              label: function (c) {
                var v = c.parsed.y;
                var band = v < 3 ? 'Below floor (✗)' : (v < 4 ? 'Near floor (⚠️)' : 'On target (✓)');
                return v + '% — ' + band;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true, max: 10, grid: { color: GRID },
            ticks: { color: MUTED, callback: function (v) { return v + '%'; } }
          },
          x: { grid: { display: false }, ticks: { color: MUTED } }
        }
      }
    });
  }

  // -------------------------------------------------------------------------
  // Chart 3: Cohort lead-quality gauge (half doughnut + needle)
  // -------------------------------------------------------------------------
  function qualityGauge(avgQuality) {
    make('chart-quality', {
      type: 'doughnut',
      data: {
        labels: ['0–50% (below floor)', '50–60% (warning)', '≥60% (target)'],
        datasets: [{
          data: [50, 10, 40],
          backgroundColor: [STATUS.bad, STATUS.warn, STATUS.good],
          borderColor: '#FFFFFF',
          borderWidth: 2,
          circumference: 180,
          rotation: 270,
          cutout: '65%'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } },
          gaugeNeedle: { value: avgQuality },
          tooltip: { enabled: false }
        }
      }
    });

    var label = document.getElementById('quality-gauge-label');
    if (label) label.textContent = (avgQuality * 100).toFixed(1) + '% (Target: ≥60%)';
  }

  // -------------------------------------------------------------------------
  // Chart 4: Multi-year payoff — investment (negative) vs net contribution
  // -------------------------------------------------------------------------
  function roiPayoff(multiYear, investment) {
    var money = function (v) {
      var a = Math.abs(v);
      var s = a >= 1e6 ? '$' + (a / 1e6).toFixed(2) + 'M' : '$' + Math.round(a / 1e3) + 'k';
      return (v < 0 ? '−' : '+') + s;
    };

    make('chart-roi', {
      type: 'bar',
      data: {
        labels: multiYear.map(function (y) { return y.year; }),
        datasets: [
          {
            label: 'Training Investment',
            data: multiYear.map(function () { return -investment; }),
            backgroundColor: STATUS.bad,
            borderRadius: 4,
            maxBarThickness: 64
          },
          {
            label: 'Net Contribution',
            data: multiYear.map(function (y) { return y.contribution; }),
            backgroundColor: STATUS.good,
            borderRadius: 4,
            maxBarThickness: 64
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } },
          barValueLabels: { enabled: true, format: money },
          tooltip: {
            callbacks: {
              label: function (c) { return c.dataset.label + ': ' + money(c.parsed.y); }
            }
          }
        },
        scales: {
          y: {
            grid: { color: GRID },
            ticks: {
              color: MUTED,
              callback: function (v) { return v === 0 ? '0' : (v > 0 ? '+' : '−') + '$' + Math.abs(v / 1e6).toFixed(1) + 'M'; }
            }
          },
          x: { stacked: false, grid: { display: false }, ticks: { color: MUTED } }
        }
      }
    });
  }

  return {
    doorsTrend: doorsTrend,
    conversionBars: conversionBars,
    qualityGauge: qualityGauge,
    roiPayoff: roiPayoff,
    pctFmt: pctFmt
  };
})();
