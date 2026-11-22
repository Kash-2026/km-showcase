// 4D Drone Airspace Deconfliction — interactive demo.
// Mirrors gig_DEEP_UTM_4D/model.py (AirspaceDeconflictor) so the browser
// computation matches the certified Python engine exactly.
document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  class VisualizerDeconflictor {
    constructor(safetyRadiusM, timeStepS) {
      this.safetyRadiusM = safetyRadiusM;
      this.timeStepS = timeStepS;
      this.noFlyZones = [];
      this.flights = {};
    }
    addNoFlyZone(zone) {
      this.noFlyZones.push(zone);
    }
    interpolate(waypoints, t) {
      const w0 = waypoints[0];
      const wn = waypoints[waypoints.length - 1];
      if (t <= w0.t) return { x: w0.x, y: w0.y, z: w0.z };
      if (t >= wn.t) return { x: wn.x, y: wn.y, z: wn.z };
      for (let i = 0; i < waypoints.length - 1; i++) {
        const w1 = waypoints[i];
        const w2 = waypoints[i + 1];
        if (w1.t <= t && t <= w2.t) {
          const ratio = w2.t > w1.t ? (t - w1.t) / (w2.t - w1.t) : 0.0;
          return {
            x: w1.x + ratio * (w2.x - w1.x),
            y: w1.y + ratio * (w2.y - w1.y),
            z: w1.z + ratio * (w2.z - w1.z),
          };
        }
      }
      return { x: wn.x, y: wn.y, z: wn.z };
    }
    registerFlight(flightId, waypoints) {
      const tStart = waypoints[0].t;
      const tEnd = waypoints[waypoints.length - 1].t;
      const sampleTimesSet = new Set();
      for (const w of waypoints) sampleTimesSet.add(Math.round(w.t * 1e6) / 1e6);
      for (let ct = tStart; ct <= tEnd + 1e-9; ct += this.timeStepS) {
        sampleTimesSet.add(Math.round(ct * 1e6) / 1e6);
      }
      const sampleTimes = [...sampleTimesSet].sort((a, b) => a - b);
      const conflicts = [];
      const zoneSeen = new Set();
      for (const t of sampleTimes) {
        const p = this.interpolate(waypoints, t);
        for (const zone of this.noFlyZones) {
          if (!zoneSeen.has(zone.zoneId)) {
            const horizDist = Math.hypot(p.x - zone.cx, p.y - zone.cy);
            if (horizDist <= zone.radiusM && p.z >= zone.minZ && p.z <= zone.maxZ) {
              conflicts.push({ otherId: zone.zoneId, t, distanceM: 0.0, reason: 'no_fly_zone' });
              zoneSeen.add(zone.zoneId);
            }
          }
        }
      }
      const flightSeen = new Set();
      for (const otherId of Object.keys(this.flights)) {
        const other = this.flights[otherId];
        const oStart = other[0].t;
        const oEnd = other[other.length - 1].t;
        const overlapStart = Math.max(tStart, oStart);
        const overlapEnd = Math.min(tEnd, oEnd);
        if (overlapStart <= overlapEnd) {
          const samples = sampleTimes.filter(t => t >= overlapStart - 1e-9 && t <= overlapEnd + 1e-9);
          for (const w of other) {
            if (w.t >= overlapStart - 1e-9 && w.t <= overlapEnd + 1e-9) {
              const tr = Math.round(w.t * 1e6) / 1e6;
              if (!samples.includes(tr)) samples.push(tr);
            }
          }
          samples.sort((a, b) => a - b);
          for (const t of samples) {
            if (flightSeen.has(otherId)) break;
            const a = this.interpolate(waypoints, t);
            const b = this.interpolate(other, t);
            const dist = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
            if (dist < this.safetyRadiusM) {
              conflicts.push({ otherId, t, distanceM: Math.round(dist * 100) / 100, reason: 'separation_breach' });
              flightSeen.add(otherId);
            }
          }
        }
      }
      if (conflicts.length === 0) {
        this.flights[flightId] = waypoints;
      }
      return conflicts;
    }
  }

  // Preset no-fly zone so the demo shows a real deconfliction result.
  // Zone centered on (50, 50), radius 30m, altitude band 0..100m.
  // DRONE-02 (50,0,50,0)->(50,100,50,10) passes through it -> 1 NFZ conflict.
  const deconflictor = new VisualizerDeconflictor(25.0, 1.0);
  deconflictor.addNoFlyZone({
    zoneId: 'NFZ-01',
    cx: 50,
    cy: 50,
    radiusM: 30.0,
    minZ: 0.0,
    maxZ: 100.0,
  });

  function parseCoord(str) {
    const parts = str.split(',').map(s => parseFloat(s.trim()));
    if (parts.length !== 4 || parts.some(isNaN)) {
      throw new Error('Coordinates must be "X, Y, Z, T" (4 numbers)');
    }
    return { x: parts[0], y: parts[1], z: parts[2], t: parts[3] };
  }

  function drawRadar(waypoints, conflicts) {
    const canvas = document.getElementById('radarCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#070d19';
    ctx.fillRect(0, 0, W, H);
    const pad = 40;
    const xs = waypoints.map(w => w.x);
    const ys = waypoints.map(w => w.y);
    const minX = Math.min(...xs, 20), maxX = Math.max(...xs, 80);
    const minY = Math.min(...ys, 0), maxY = Math.max(...ys, 100);
    const sx = (W - 2 * pad) / (maxX - minX || 1);
    const sy = (H - 2 * pad) / (maxY - minY || 1);
    const px = x => pad + (x - minX) * sx;
    const py = y => H - pad - (y - minY) * sy;
    // no-fly zone
    const zone = deconflictor.noFlyZones[0];
    ctx.beginPath();
    ctx.arc(px(zone.cx), py(zone.cy), zone.radiusM * sx, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(239,68,68,0.15)';
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.stroke();
    // grid
    ctx.strokeStyle = 'rgba(56,189,248,0.12)';
    for (let i = 1; i < 5; i++) {
      ctx.beginPath(); ctx.moveTo(pad, (H - 2 * pad) * i / 5 + pad); ctx.lineTo(W - pad, (H - 2 * pad) * i / 5 + pad); ctx.stroke();
      ctx.beginPath(); ctx.moveTo((W - 2 * pad) * i / 5 + pad, pad); ctx.lineTo((W - 2 * pad) * i / 5 + pad, H - pad); ctx.stroke();
    }
    // trajectory
    ctx.beginPath();
    waypoints.forEach((w, i) => { if (i === 0) ctx.moveTo(px(w.x), py(w.y)); else ctx.lineTo(px(w.x), py(w.y)); });
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();
    waypoints.forEach(w => {
      ctx.beginPath();
      ctx.arc(px(w.x), py(w.y), 4, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();
    });
  }

  const btn = document.getElementById('registerBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const status = document.getElementById('statusResult');
    const log = document.getElementById('conflictLogs');
    try {
      const flightId = (document.getElementById('flightId').value || 'DRONE-02').trim();
      const start = parseCoord(document.getElementById('startCoord').value);
      const end = parseCoord(document.getElementById('endCoord').value);
      if (end.t <= start.t) throw new Error('End time must be after start time');
      const waypoints = [start, end];
      const conflicts = deconflictor.registerFlight(flightId, waypoints);
      if (status) {
        if (conflicts.length === 0) {
          status.innerHTML = '<span class="status-ok">FLIGHT CLEARED — no conflicts detected</span>';
        } else {
          status.innerHTML = '<span class="status-conflict">CONFLICTS: ' + conflicts.length + ' detected</span>';
        }
      }
      if (log) {
        log.innerHTML = '';
        if (conflicts.length === 0) {
          const li = document.createElement('li');
          li.textContent = '✓ ' + flightId + ' registered safely (no conflicts)';
          log.appendChild(li);
        } else {
          conflicts.forEach(c => {
            const li = document.createElement('li');
            const reason = c.reason === 'no_fly_zone'
              ? 'entered no-fly zone ' + c.otherId
              : 'separation breach with ' + c.otherId + ' at ' + c.distanceM + 'm';
            li.textContent = '⚠ t=' + c.t.toFixed(1) + 's: ' + reason;
            log.appendChild(li);
          });
        }
      }
      drawRadar(waypoints, conflicts);
    } catch (e) {
      if (status) status.innerHTML = '<span class="status-conflict">' + e.message + '</span>';
    }
  });

  // Initial render
  try {
    const start = parseCoord(document.getElementById('startCoord').value);
    const end = parseCoord(document.getElementById('endCoord').value);
    drawRadar([start, end], []);
  } catch (e) { /* ignore initial */ }
});