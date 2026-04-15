// ===== Organization Chart App =====
(function () {
  'use strict';

  // ===== Data Model =====
  const state = {
    persons: [],
    regions: [],
    roles: [],
    connectors: [],
    textAnnotations: [],
    viewMode: 'square', // 'square' | 'quarter'
    tool: 'select',     // 'select' | 'region' | 'connector' | 'text'
    selectedId: null,
    selectedType: null,  // 'person' | 'region' | 'connector' | 'text'
    dragging: null,
    regionDraw: null,
    connectorDraw: null, // { fromRegionId, fromSide, currentX, currentY }
    rangeSelect: null,
    multiSelection: { personIds: [], regionIds: [] },
    shiftHeld: false,
    prevTool: null, // for shift-key temp connector mode
    addingWaypoints: false, // show "+" handles for adding waypoints
    searchQuery: '',
    nextId: 1,
    gridSize: 40,
    canvasOffset: { x: 0, y: 0 },
    zoom: 1.0,
    zoomMin: 0.25,
    zoomMax: 3.0,
    undoStack: [],
    redoStack: [],
    undoMax: 50,
  };

  // ===== DOM References =====
  const canvas = document.getElementById('main-canvas');
  const ctx = canvas.getContext('2d');
  const container = document.getElementById('canvas-container');
  const personListEl = document.getElementById('person-list');

  const btnAddPerson = document.getElementById('btn-add-person');
  const btnSquareView = document.getElementById('btn-square-view');
  const btnQuarterView = document.getElementById('btn-quarter-view');
  const btnToolSelect = document.getElementById('btn-tool-select');
  const btnToolRegion = document.getElementById('btn-tool-region');
  const btnToolConnector = document.getElementById('btn-tool-connector');
  const btnDelete = document.getElementById('btn-delete');
  const btnBulkCreate = document.getElementById('btn-bulk-create');
  const btnRoleManage = document.getElementById('btn-role-manage');
  const btnZoomReset = document.getElementById('btn-zoom-reset');
  const zoomLabel = document.getElementById('zoom-label');
  const btnUndo = document.getElementById('btn-undo');
  const btnRedo = document.getElementById('btn-redo');
  const btnAlignTop = document.getElementById('btn-align-top');
  const btnAlignBottom = document.getElementById('btn-align-bottom');
  const btnAlignLeft = document.getElementById('btn-align-left');
  const btnAlignRight = document.getElementById('btn-align-right');
  const btnAlignCenterH = document.getElementById('btn-align-center-h');
  const btnAlignCenterV = document.getElementById('btn-align-center-v');

  // New feature buttons
  const btnExportPng = document.getElementById('btn-export-png');
  const btnImportCsv = document.getElementById('btn-import-csv');
  const csvImportInput = document.getElementById('csv-import-input');
  const btnPrint = document.getElementById('btn-print');
  const btnDarkMode = document.getElementById('btn-dark-mode');
  const btnShareUrl = document.getElementById('btn-share-url');
  const btnToolText = document.getElementById('btn-tool-text');
  const personSearch = document.getElementById('person-search');

  const connectorProps = document.getElementById('connector-props');
  const propConnectorLabel = document.getElementById('prop-connector-label');
  const propConnectorDirection = document.getElementById('prop-connector-direction');

  const noSelectionMsg = document.getElementById('no-selection-msg');
  const personProps = document.getElementById('person-props');
  const regionProps = document.getElementById('region-props');
  const textProps = document.getElementById('text-props');

  const propName = document.getElementById('prop-name');
  const propRole = document.getElementById('prop-role');
  const propAffiliation = document.getElementById('prop-affiliation');
  const propColor = document.getElementById('prop-color');
  const propEmail = document.getElementById('prop-email');
  const propPhone = document.getElementById('prop-phone');
  const propJoindate = document.getElementById('prop-joindate');
  const propEffectiveDate = document.getElementById('prop-effective-date');
  const propPhotoUrl = document.getElementById('prop-photo-url');
  const propRegionName = document.getElementById('prop-region-name');
  const propRegionColor = document.getElementById('prop-region-color');
  const propRegionFontsize = document.getElementById('prop-region-fontsize');
  const propRegionTextalign = document.getElementById('prop-region-textalign');
  const propRolesContainer = document.getElementById('prop-roles-container');
  const propTextContent = document.getElementById('prop-text-content');
  const propTextFontsize = document.getElementById('prop-text-fontsize');
  const propTextColor = document.getElementById('prop-text-color');

  // Z-order buttons
  const btnZFront = document.getElementById('btn-z-front');
  const btnZForward = document.getElementById('btn-z-forward');
  const btnZBackward = document.getElementById('btn-z-backward');
  const btnZBack = document.getElementById('btn-z-back');

  // Bulk modal
  const bulkModal = document.getElementById('bulk-modal');
  const bulkTextarea = document.getElementById('bulk-textarea');
  const bulkBtnCreate = document.getElementById('bulk-btn-create');
  const bulkBtnCancel = document.getElementById('bulk-btn-cancel');
  const testPersonCount = document.getElementById('test-person-count');
  const testOrgCount = document.getElementById('test-org-count');
  const testBtnGenerate = document.getElementById('test-btn-generate');

  // Role modal
  const roleModal = document.getElementById('role-modal');
  const roleBtnClose = document.getElementById('role-btn-close');
  const roleList = document.getElementById('role-list');
  const roleAddName = document.getElementById('role-add-name');
  const roleAddColor = document.getElementById('role-add-color');
  const roleAddIcon = document.getElementById('role-add-icon');
  const roleBtnAdd = document.getElementById('role-btn-add');

  // ===== Isometric Helpers =====
  function toIso(x, y) {
    return {
      x: (x - y) * 0.866,
      y: (x + y) * 0.5,
    };
  }

  function fromIso(ix, iy) {
    return {
      x: ix / 0.866 / 2 + iy,
      y: iy - ix / 0.866 / 2,
    };
  }

  function worldToScreen(wx, wy) {
    const cx = canvas.width / 2 + state.canvasOffset.x;
    const cy = canvas.height / 3 + state.canvasOffset.y;
    const z = state.zoom;
    if (state.viewMode === 'quarter') {
      const iso = toIso(wx, wy);
      return { x: iso.x * z + cx, y: iso.y * z + cy };
    }
    return { x: wx * z + cx, y: wy * z + cy };
  }

  function screenToWorld(sx, sy) {
    const cx = canvas.width / 2 + state.canvasOffset.x;
    const cy = canvas.height / 3 + state.canvasOffset.y;
    const z = state.zoom;
    if (state.viewMode === 'quarter') {
      return fromIso((sx - cx) / z, (sy - cy) / z);
    }
    return { x: (sx - cx) / z, y: (sy - cy) / z };
  }

  // ===== Canvas Resize =====
  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    render();
  }

  // ===== Drawing =====
  function render() {
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, w, h);
    drawGrid(w, h);
    drawConnectors();
    drawRegions();
    drawRegionPreview();
    drawTextAnnotations();
    drawPersons();
    drawConnectorPreview();
    drawConnectionPoints();
    drawRangeSelect();
  }

  function drawTextAnnotations() {
    state.textAnnotations.forEach(t => {
      const s = worldToScreen(t.x, t.y);
      const isSelected = state.selectedType === 'text' && state.selectedId === t.id;
      const fontSize = (t.fontSize || 9) * state.zoom;
      ctx.font = `${fontSize}px "Segoe UI", "Meiryo", sans-serif`;
      ctx.fillStyle = t.color || '#2c3e50';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const lines = (t.text || '').split('\n');
      lines.forEach((line, i) => {
        ctx.fillText(line, s.x, s.y + i * fontSize * 1.3);
      });
      if (isSelected) {
        const maxW = Math.max(...lines.map(l => ctx.measureText(l).width), 20);
        const totalH = lines.length * fontSize * 1.3;
        ctx.strokeStyle = '#4a8acf';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(s.x - 2, s.y - 2, maxW + 4, totalH + 4);
        ctx.setLineDash([]);
      }
    });
  }

  // ===== Connector Helpers =====
  function getConnectionPoint(region, side) {
    const s = worldToScreen(region.x, region.y);
    const e = worldToScreen(region.x + region.w, region.y + region.h);
    const cx = (s.x + e.x) / 2;
    const cy = (s.y + e.y) / 2;
    switch (side) {
      case 'top': return { x: cx, y: s.y };
      case 'bottom': return { x: cx, y: e.y };
      case 'left': return { x: s.x, y: cy };
      case 'right': return { x: e.x, y: cy };
    }
    return { x: cx, y: cy };
  }

  function getConnectionPointWorld(region, side) {
    const cx = region.x + region.w / 2;
    const cy = region.y + region.h / 2;
    switch (side) {
      case 'top': return { x: cx, y: region.y };
      case 'bottom': return { x: cx, y: region.y + region.h };
      case 'left': return { x: region.x, y: cy };
      case 'right': return { x: region.x + region.w, y: cy };
    }
    return { x: cx, y: cy };
  }

  function routeConnector(from, to, fromSide, toSide, waypoints) {
    // If waypoints provided, route through them with right-angle segments
    if (waypoints && waypoints.length > 0) {
      const points = [from];
      let prev = from;
      for (const wp of waypoints) {
        // Route each segment as horizontal then vertical
        points.push({ x: wp.x, y: prev.y });
        points.push({ x: wp.x, y: wp.y });
        prev = wp;
      }
      // Final leg to destination
      points.push({ x: to.x, y: prev.y });
      points.push(to);
      return points;
    }

    // Auto-route: build waypoints for a right-angle connector
    const points = [from];
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    const offset = 30;

    if ((fromSide === 'right' && toSide === 'left') || (fromSide === 'left' && toSide === 'right')) {
      points.push({ x: midX, y: from.y });
      points.push({ x: midX, y: to.y });
    } else if ((fromSide === 'top' && toSide === 'bottom') || (fromSide === 'bottom' && toSide === 'top')) {
      points.push({ x: from.x, y: midY });
      points.push({ x: to.x, y: midY });
    } else if (fromSide === 'right' && toSide === 'right') {
      const x = Math.max(from.x, to.x) + offset;
      points.push({ x, y: from.y });
      points.push({ x, y: to.y });
    } else if (fromSide === 'left' && toSide === 'left') {
      const x = Math.min(from.x, to.x) - offset;
      points.push({ x, y: from.y });
      points.push({ x, y: to.y });
    } else if (fromSide === 'top' && toSide === 'top') {
      const y = Math.min(from.y, to.y) - offset;
      points.push({ x: from.x, y });
      points.push({ x: to.x, y });
    } else if (fromSide === 'bottom' && toSide === 'bottom') {
      const y = Math.max(from.y, to.y) + offset;
      points.push({ x: from.x, y });
      points.push({ x: to.x, y });
    } else {
      // Mixed: e.g. right→top, left→bottom etc
      if (fromSide === 'right' || fromSide === 'left') {
        points.push({ x: to.x, y: from.y });
      } else {
        points.push({ x: from.x, y: to.y });
      }
    }
    points.push(to);
    return points;
  }

  function drawRoundedPolyline(points, radius) {
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];
      const r = Math.min(radius, Math.hypot(curr.x - prev.x, curr.y - prev.y) / 2,
        Math.hypot(next.x - curr.x, next.y - curr.y) / 2);
      ctx.arcTo(curr.x, curr.y, next.x, next.y, r);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.stroke();
  }

  function drawArrowHead(tipX, tipY, fromX, fromY, size) {
    const angle = Math.atan2(tipY - fromY, tipX - fromX);
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX - size * Math.cos(angle - Math.PI / 6), tipY - size * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(tipX - size * Math.cos(angle + Math.PI / 6), tipY - size * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  }

  function getConnectorPoints(c) {
    const fromRegion = state.regions.find(r => r.id === c.fromRegionId);
    const toRegion = state.regions.find(r => r.id === c.toRegionId);
    if (!fromRegion || !toRegion) return null;
    // Route entirely in world coordinates
    const from = getConnectionPointWorld(fromRegion, c.fromSide);
    const to = getConnectionPointWorld(toRegion, c.toSide);
    const worldPoints = routeConnector(from, to, c.fromSide, c.toSide, c.waypoints || []);
    // Transform all points to screen coordinates
    return worldPoints.map(p => worldToScreen(p.x, p.y));
  }

  function drawConnectors() {
    state.connectors.forEach(c => {
      const points = getConnectorPoints(c);
      if (!points) return;
      const isSelected = state.selectedType === 'connector' && state.selectedId === c.id;

      ctx.strokeStyle = isSelected ? '#e06c75' : '#5a9fd4';
      ctx.lineWidth = isSelected ? 2.5 : 1.8;
      ctx.fillStyle = ctx.strokeStyle;
      drawRoundedPolyline(points, 8);

      // Arrows
      const arrowSize = 8;
      if (c.direction === 'forward' || c.direction === 'both') {
        const last = points[points.length - 1];
        const prev = points[points.length - 2];
        drawArrowHead(last.x, last.y, prev.x, prev.y, arrowSize);
      }
      if (c.direction === 'backward' || c.direction === 'both') {
        const first = points[0];
        const second = points[1];
        drawArrowHead(first.x, first.y, second.x, second.y, arrowSize);
      }

      // Label
      if (c.label) {
        let totalLen = 0;
        const segments = [];
        for (let i = 1; i < points.length; i++) {
          const len = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
          segments.push(len);
          totalLen += len;
        }
        let target = totalLen / 2;
        let mx = points[0].x, my = points[0].y;
        for (let i = 0; i < segments.length; i++) {
          if (target <= segments[i]) {
            const t = target / segments[i];
            mx = points[i].x + (points[i + 1].x - points[i].x) * t;
            my = points[i].y + (points[i + 1].y - points[i].y) * t;
            break;
          }
          target -= segments[i];
        }
        ctx.save();
        ctx.font = '9px "Segoe UI", "Meiryo", sans-serif';
        const tw = ctx.measureText(c.label).width;
        ctx.fillStyle = '#fff';
        ctx.fillRect(mx - tw / 2 - 4, my - 8, tw + 8, 16);
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(mx - tw / 2 - 4, my - 8, tw + 8, 16);
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(c.label, mx, my);
        ctx.restore();
      }

      // Draw waypoint handles and midpoint add handles when selected
      if (isSelected) {
        // Existing waypoint handles (draggable)
        (c.waypoints || []).forEach(wp => {
          const s = worldToScreen(wp.x, wp.y);
          ctx.fillStyle = '#e06c75';
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(s.x, s.y, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });

        // Midpoint "+" handles to add new waypoints (only in addingWaypoints mode)
        if (state.addingWaypoints && (c.waypoints || []).length < 12) {
          for (let i = 1; i < points.length; i++) {
            const mx = (points[i - 1].x + points[i].x) / 2;
            const my = (points[i - 1].y + points[i].y) / 2;
            const segLen = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
            if (segLen < 20) continue; // skip tiny segments
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = '#5a9fd4';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(mx, my, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Draw "+" sign
            ctx.strokeStyle = '#5a9fd4';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(mx - 3, my);
            ctx.lineTo(mx + 3, my);
            ctx.moveTo(mx, my - 3);
            ctx.lineTo(mx, my + 3);
            ctx.stroke();
          }
        }
      }
    });
  }

  function drawConnectionPoints() {
    if (state.tool !== 'connector' && !state.connectorDraw) return;
    const sides = ['top', 'bottom', 'left', 'right'];
    state.regions.forEach(r => {
      sides.forEach(side => {
        const pt = getConnectionPoint(r, side);
        ctx.fillStyle = '#5a9fd4';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    });
  }

  function drawConnectorPreview() {
    if (!state.connectorDraw) return;
    const cd = state.connectorDraw;
    const fromRegion = state.regions.find(r => r.id === cd.fromRegionId);
    if (!fromRegion) return;
    const from = getConnectionPoint(fromRegion, cd.fromSide);
    ctx.strokeStyle = 'rgba(90,159,212,0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(cd.currentX, cd.currentY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function hitTestConnectionPoint(sx, sy) {
    if (state.tool !== 'connector' && !state.shiftHeld) return null;
    const sides = ['top', 'bottom', 'left', 'right'];
    const threshold = 10;
    for (const r of state.regions) {
      for (const side of sides) {
        const pt = getConnectionPoint(r, side);
        if (Math.abs(sx - pt.x) < threshold && Math.abs(sy - pt.y) < threshold) {
          return { region: r, side };
        }
      }
    }
    return null;
  }

  function hitTestConnector(sx, sy) {
    const threshold = 8;
    for (const c of state.connectors) {
      const points = getConnectorPoints(c);
      if (!points) continue;
      for (let i = 1; i < points.length; i++) {
        const dist = distToSegment(sx, sy, points[i - 1].x, points[i - 1].y, points[i].x, points[i].y);
        if (dist < threshold) return c;
      }
    }
    return null;
  }

  // Hit-test on existing waypoint handle (returns { connector, wpIndex })
  function hitTestWaypointHandle(sx, sy) {
    const threshold = 8;
    for (const c of state.connectors) {
      if (!c.waypoints) continue;
      for (let i = 0; i < c.waypoints.length; i++) {
        const s = worldToScreen(c.waypoints[i].x, c.waypoints[i].y);
        if (Math.hypot(sx - s.x, sy - s.y) < threshold) {
          return { connector: c, wpIndex: i };
        }
      }
    }
    return null;
  }

  // Hit-test on midpoint "+" handle (returns { connector, segIndex, worldPos })
  function hitTestMidpointHandle(sx, sy) {
    if (!state.addingWaypoints) return null;
    const threshold = 10;
    for (const c of state.connectors) {
      if (state.selectedType !== 'connector' || state.selectedId !== c.id) continue;
      if ((c.waypoints || []).length >= 12) continue;
      const points = getConnectorPoints(c);
      if (!points) continue;
      for (let i = 1; i < points.length; i++) {
        const mx = (points[i - 1].x + points[i].x) / 2;
        const my = (points[i - 1].y + points[i].y) / 2;
        const segLen = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
        if (segLen < 20) continue;
        if (Math.hypot(sx - mx, sy - my) < threshold) {
          const worldPos = screenToWorld(mx, my);
          return { connector: c, segIndex: i - 1, worldPos };
        }
      }
    }
    return null;
  }

  function distToSegment(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - ax, py - ay);
    let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }

  function drawGrid(w, h) {
    const g = state.gridSize;
    ctx.lineWidth = 0.5;

    if (state.viewMode === 'square') {
      ctx.strokeStyle = 'rgba(160,195,235,0.3)';
      // Calculate grid offset based on canvas offset so grid covers entire visible area
      const ox = state.canvasOffset.x;
      const oy = state.canvasOffset.y;
      const startX = ((w / 2 + ox) % (g * state.zoom) + (g * state.zoom)) % (g * state.zoom);
      const startY = ((h / 3 + oy) % (g * state.zoom) + (g * state.zoom)) % (g * state.zoom);
      for (let x = startX; x < w; x += g * state.zoom) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = startY; y < h; y += g * state.zoom) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = 'rgba(160,195,235,0.25)';
      // Compute range from ALL 4 screen corners to cover entire canvas in iso view
      const c1 = screenToWorld(0, 0);
      const c2 = screenToWorld(w, 0);
      const c3 = screenToWorld(w, h);
      const c4 = screenToWorld(0, h);
      const allX = [c1.x, c2.x, c3.x, c4.x];
      const allY = [c1.y, c2.y, c3.y, c4.y];
      const margin = g * 4;
      const minX = Math.floor((Math.min(...allX) - margin) / g) * g;
      const maxX = Math.ceil((Math.max(...allX) + margin) / g) * g;
      const minY = Math.floor((Math.min(...allY) - margin) / g) * g;
      const maxY = Math.ceil((Math.max(...allY) + margin) / g) * g;
      const step = g;
      for (let i = minX; i <= maxX; i += step) {
        const p1 = worldToScreen(i, minY);
        const p2 = worldToScreen(i, maxY);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      for (let i = minY; i <= maxY; i += step) {
        const p3 = worldToScreen(minX, i);
        const p4 = worldToScreen(maxX, i);
        ctx.beginPath();
        ctx.moveTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.stroke();
      }
    }
  }

  function drawRegions() {
    state.regions.forEach(r => {
      const isSelected = (state.selectedType === 'region' && state.selectedId === r.id) || state.multiSelection.regionIds.includes(r.id);
      const rc = r.color || '#4a8acf';

      if (state.viewMode === 'square') {
        const s = worldToScreen(r.x, r.y);
        const e = worldToScreen(r.x + r.w, r.y + r.h);
        // Parse region color for rgba
        const hexToRgba = (hex, a) => {
          const bigint = parseInt(hex.replace('#', ''), 16);
          return `rgba(${(bigint >> 16) & 255},${(bigint >> 8) & 255},${bigint & 255},${a})`;
        };
        ctx.fillStyle = isSelected ? hexToRgba(rc, 0.1) : hexToRgba(rc, 0.05);
        ctx.fillRect(s.x, s.y, e.x - s.x, e.y - s.y);
        ctx.strokeStyle = isSelected ? rc : hexToRgba(rc, 0.6);
        ctx.lineWidth = isSelected ? 2 : 1.5;
        ctx.setLineDash(isSelected ? [] : [6, 3]);
        ctx.strokeRect(s.x, s.y, e.x - s.x, e.y - s.y);
        ctx.setLineDash([]);

        if (r.name) {
          ctx.fillStyle = rc;
          const rFontSize = r.fontSize || 13;
          ctx.font = `${rFontSize}px "Segoe UI", "Meiryo", sans-serif`;
          const rAlign = r.textAlign || 'left';
          ctx.textAlign = rAlign;
          ctx.textBaseline = 'bottom';
          let labelX = s.x + 4;
          if (rAlign === 'center') labelX = (s.x + e.x) / 2;
          else if (rAlign === 'right') labelX = e.x - 4;
          ctx.fillText(r.name, labelX, s.y - 3);
        }

        // Resize handles
        if (isSelected) {
          drawResizeHandles(s.x, s.y, e.x - s.x, e.y - s.y);
        }
      } else {
        const corners = [
          worldToScreen(r.x, r.y),
          worldToScreen(r.x + r.w, r.y),
          worldToScreen(r.x + r.w, r.y + r.h),
          worldToScreen(r.x, r.y + r.h),
        ];
        const hexToRgba = (hex, a) => {
          const bigint = parseInt(hex.replace('#', ''), 16);
          return `rgba(${(bigint >> 16) & 255},${(bigint >> 8) & 255},${bigint & 255},${a})`;
        };
        ctx.fillStyle = isSelected ? hexToRgba(rc, 0.1) : hexToRgba(rc, 0.05);
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        for (let i = 1; i < 4; i++) ctx.lineTo(corners[i].x, corners[i].y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = isSelected ? rc : hexToRgba(rc, 0.6);
        ctx.lineWidth = isSelected ? 2 : 1.5;
        ctx.setLineDash(isSelected ? [] : [6, 3]);
        ctx.stroke();
        ctx.setLineDash([]);

        if (r.name) {
          const top = corners[0];
          ctx.fillStyle = rc;
          ctx.font = '13px "Segoe UI", "Meiryo", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(r.name, top.x, top.y - 4);
        }

        // Resize handles in iso
        if (isSelected) {
          corners.forEach(c => {
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = '#4a8acf';
            ctx.lineWidth = 1.5;
            ctx.fillRect(c.x - 4, c.y - 4, 8, 8);
            ctx.strokeRect(c.x - 4, c.y - 4, 8, 8);
          });
          // midpoints
          for (let i = 0; i < 4; i++) {
            const j = (i + 1) % 4;
            const mx = (corners[i].x + corners[j].x) / 2;
            const my = (corners[i].y + corners[j].y) / 2;
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = '#4a8acf';
            ctx.fillRect(mx - 3, my - 3, 6, 6);
            ctx.strokeRect(mx - 3, my - 3, 6, 6);
          }
        }
      }
    });
  }

  const HANDLE_SIZE = 5;
  function drawResizeHandles(sx, sy, sw, sh) {
    const handles = getResizeHandlePositions(sx, sy, sw, sh);
    handles.forEach(h => {
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#4a8acf';
      ctx.lineWidth = 1.5;
      ctx.fillRect(h.x - HANDLE_SIZE, h.y - HANDLE_SIZE, HANDLE_SIZE * 2, HANDLE_SIZE * 2);
      ctx.strokeRect(h.x - HANDLE_SIZE, h.y - HANDLE_SIZE, HANDLE_SIZE * 2, HANDLE_SIZE * 2);
    });
  }

  function getResizeHandlePositions(sx, sy, sw, sh) {
    return [
      { x: sx, y: sy, dir: 'nw' },
      { x: sx + sw / 2, y: sy, dir: 'n' },
      { x: sx + sw, y: sy, dir: 'ne' },
      { x: sx + sw, y: sy + sh / 2, dir: 'e' },
      { x: sx + sw, y: sy + sh, dir: 'se' },
      { x: sx + sw / 2, y: sy + sh, dir: 's' },
      { x: sx, y: sy + sh, dir: 'sw' },
      { x: sx, y: sy + sh / 2, dir: 'w' },
    ];
  }

  function drawRegionPreview() {
    if (!state.regionDraw) return;
    const rd = state.regionDraw;
    const x = Math.min(rd.startX, rd.currentX);
    const y = Math.min(rd.startY, rd.currentY);
    const w = Math.abs(rd.currentX - rd.startX);
    const h = Math.abs(rd.currentY - rd.startY);

    if (state.viewMode === 'square') {
      const s = worldToScreen(x, y);
      const e = worldToScreen(x + w, y + h);
      ctx.strokeStyle = '#4a8acf';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(s.x, s.y, e.x - s.x, e.y - s.y);
      ctx.setLineDash([]);
    } else {
      const corners = [
        worldToScreen(x, y),
        worldToScreen(x + w, y),
        worldToScreen(x + w, y + h),
        worldToScreen(x, y + h),
      ];
      ctx.strokeStyle = '#4a8acf';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < 4; i++) ctx.lineTo(corners[i].x, corners[i].y);
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function drawRangeSelect() {
    if (!state.rangeSelect) return;
    const rs = state.rangeSelect;
    const x = Math.min(rs.startX, rs.currentX);
    const y = Math.min(rs.startY, rs.currentY);
    const w = Math.abs(rs.currentX - rs.startX);
    const h = Math.abs(rs.currentY - rs.startY);
    ctx.fillStyle = 'rgba(220,80,80,0.1)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#dc5050';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
  }

  function drawPersons() {
    const sorted = [...state.persons].sort((a, b) => a.y - b.y);
    sorted.forEach(p => {
      const s = worldToScreen(p.x, p.y);
      const isSelected = state.selectedType === 'person' && state.selectedId === p.id;
      const isMultiSelected = state.multiSelection.personIds.includes(p.id);
      const personRoles = (p.roleIds || []).map(rid => state.roles.find(r => r.id === rid)).filter(Boolean);
      drawPersonIcon(s.x, s.y, p.color, isSelected || isMultiSelected, p.name, personRoles);
    });
  }

  function drawPersonIcon(cx, cy, color, selected, name, roles) {
    const isQuarter = state.viewMode === 'quarter';
    const bodyH = isQuarter ? 28 : 24;
    const headR = isQuarter ? 10 : 9;
    const bodyW = isQuarter ? 20 : 18;

    ctx.save();
    // Shadow
    if (isQuarter) {
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.beginPath();
      ctx.ellipse(cx + 2, cy + 4, bodyW * 0.6, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Body (cone/triangle) — overlaps head by half
    const bodyTop = cy - bodyH * 0.35;
    const bodyBottom = cy + bodyH * 0.5;
    const gradient = ctx.createLinearGradient(cx - bodyW / 2, bodyTop, cx + bodyW / 2, bodyBottom);
    gradient.addColorStop(0, lightenColor(color, 25));
    gradient.addColorStop(0.5, color);
    gradient.addColorStop(1, darkenColor(color, 25));

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(cx, bodyTop);
    ctx.lineTo(cx + bodyW / 2, bodyBottom);
    ctx.lineTo(cx - bodyW / 2, bodyBottom);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = darkenColor(color, 35);
    ctx.lineWidth = 1;
    ctx.stroke();

    // Head — deeply embedded into body cone
    const headCY = bodyTop + headR * 0.5;
    const headGrad = ctx.createRadialGradient(cx - 2, headCY - 2, 1, cx, headCY, headR);
    headGrad.addColorStop(0, lightenColor(color, 40));
    headGrad.addColorStop(0.7, color);
    headGrad.addColorStop(1, darkenColor(color, 20));

    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(cx, headCY, headR, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = darkenColor(color, 35);
    ctx.lineWidth = 1;
    ctx.stroke();

    // Selection highlight
    if (selected) {
      ctx.strokeStyle = '#4a8acf';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      const selR = Math.max(bodyW / 2, headR) + 6;
      const selCY = (headCY + bodyBottom) / 2;
      ctx.ellipse(cx, selCY, selR, (bodyBottom - headCY + headR) / 2 + 6, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Name label
    let labelY = bodyBottom + 4;
    if (name) {
      ctx.fillStyle = '#2c3e50';
      ctx.font = '13px "Segoe UI", "Meiryo", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(name, cx, labelY);
      labelY += 16;
    }

    // Role badges
    if (roles && roles.length > 0) {
      ctx.font = '10px "Segoe UI", "Meiryo", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      roles.forEach(role => {
        const label = (role.icon ? role.icon + ' ' : '') + role.name;
        const tw = ctx.measureText(label).width;
        const bw = tw + 8;
        const bh = 14;
        const bx = cx - bw / 2;

        // Badge background
        ctx.fillStyle = role.color || '#888';
        ctx.globalAlpha = 0.18;
        roundRect(ctx, bx, labelY, bw, bh, 3);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Badge border
        ctx.strokeStyle = role.color || '#888';
        ctx.lineWidth = 0.8;
        roundRect(ctx, bx, labelY, bw, bh, 3);
        ctx.stroke();

        // Badge text
        ctx.fillStyle = darkenColor(role.color || '#888', 15);
        ctx.fillText(label, cx, labelY + 2);
        labelY += 16;
      });
    }

    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ===== Color Helpers =====
  function hexToHSL(hex) {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => {
      const k = (n + h / 30) % 12;
      const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * c).toString(16).padStart(2, '0');
    };
    return '#' + f(0) + f(8) + f(4);
  }

  function lightenColor(hex, amount) {
    const hsl = hexToHSL(hex);
    return hslToHex(hsl.h, hsl.s, Math.min(100, hsl.l + amount));
  }

  function darkenColor(hex, amount) {
    const hsl = hexToHSL(hex);
    return hslToHex(hsl.h, hsl.s, Math.max(0, hsl.l - amount));
  }

  // ===== Undo / Redo =====
  function getSnapshot() {
    return JSON.parse(JSON.stringify({
      persons: state.persons,
      regions: state.regions,
      roles: state.roles,
      connectors: state.connectors,
      textAnnotations: state.textAnnotations,
      nextId: state.nextId,
    }));
  }

  function restoreSnapshot(snap) {
    state.persons = snap.persons;
    state.regions = snap.regions;
    state.roles = snap.roles;
    state.connectors = snap.connectors || [];
    state.textAnnotations = snap.textAnnotations || [];
    state.nextId = snap.nextId;
    state.persons.forEach(p => { if (!p.roleIds) p.roleIds = []; });
    clearSelection();
    state.multiSelection = { personIds: [], regionIds: [] };
    renderPersonList();
    saveState();
    render();
  }

  function pushUndo() {
    state.undoStack.push(getSnapshot());
    if (state.undoStack.length > state.undoMax) state.undoStack.shift();
    state.redoStack = [];
  }

  function undo() {
    if (state.undoStack.length === 0) return;
    state.redoStack.push(getSnapshot());
    restoreSnapshot(state.undoStack.pop());
  }

  function redo() {
    if (state.redoStack.length === 0) return;
    state.undoStack.push(getSnapshot());
    restoreSnapshot(state.redoStack.pop());
  }

  // ===== Person Management =====
  const defaultColors = ['#4a8acf', '#e06c75', '#98c379', '#e5c07b', '#c678dd', '#56b6c2', '#be5046'];

  function addPerson(name, opts) {
    const p = {
      id: state.nextId++,
      name: name || '新しい人物',
      role: (opts && opts.role) || '',
      affiliation: (opts && opts.affiliation) || '',
      color: (opts && opts.color) || defaultColors[state.persons.length % defaultColors.length],
      x: (opts && opts.x !== undefined) ? opts.x : (Math.random() - 0.5) * 200,
      y: (opts && opts.y !== undefined) ? opts.y : (Math.random() - 0.5) * 200,
      roleIds: (opts && opts.roleIds) || [],
      email: (opts && opts.email) || '',
      phone: (opts && opts.phone) || '',
      joinDate: (opts && opts.joinDate) || '',
      effectiveDate: (opts && opts.effectiveDate) || '',
      photoUrl: (opts && opts.photoUrl) || '',
    };
    state.persons.push(p);
    return p;
  }

  function deletePerson(id) {
    state.persons = state.persons.filter(p => p.id !== id);
    if (state.selectedId === id && state.selectedType === 'person') {
      clearSelection();
    }
    renderPersonList();
    saveState();
    render();
  }

  function deleteRegion(id) {
    state.regions = state.regions.filter(r => r.id !== id);
    if (state.selectedId === id && state.selectedType === 'region') {
      clearSelection();
    }
    saveState();
    render();
  }

  // ===== Selection =====
  function selectItem(type, id) {
    state.selectedType = type;
    state.selectedId = id;
    state.addingWaypoints = false;
    updatePropsPanel();
    renderPersonList();
    render();
  }

  function clearSelection() {
    state.selectedType = null;
    state.selectedId = null;
    state.addingWaypoints = false;
    updatePropsPanel();
    renderPersonList();
    render();
  }

  function updatePropsPanel() {
    noSelectionMsg.style.display = 'none';
    personProps.style.display = 'none';
    regionProps.style.display = 'none';
    if (connectorProps) connectorProps.style.display = 'none';
    if (textProps) textProps.style.display = 'none';

    if (state.selectedType === 'person') {
      const p = state.persons.find(p => p.id === state.selectedId);
      if (!p) return;
      personProps.style.display = 'block';
      propName.value = p.name;
      propRole.value = p.role;
      propAffiliation.value = p.affiliation;
      propColor.value = p.color;
      if (propEmail) propEmail.value = p.email || '';
      if (propPhone) propPhone.value = p.phone || '';
      if (propJoindate) propJoindate.value = p.joinDate || '';
      if (propEffectiveDate) propEffectiveDate.value = p.effectiveDate || '';
      if (propPhotoUrl) propPhotoUrl.value = p.photoUrl || '';
      renderRoleCheckboxes(p);
    } else if (state.selectedType === 'region') {
      const r = state.regions.find(r => r.id === state.selectedId);
      if (!r) return;
      regionProps.style.display = 'block';
      propRegionName.value = r.name || '';
      if (propRegionColor) propRegionColor.value = r.color || '#4a8acf';
      if (propRegionFontsize) propRegionFontsize.value = r.fontSize || 13;
      if (propRegionTextalign) propRegionTextalign.value = r.textAlign || 'left';
    } else if (state.selectedType === 'connector') {
      const c = state.connectors.find(c => c.id === state.selectedId);
      if (!c || !connectorProps) return;
      connectorProps.style.display = 'block';
      if (propConnectorLabel) propConnectorLabel.value = c.label || '';
      if (propConnectorDirection) propConnectorDirection.value = c.direction || 'none';
    } else if (state.selectedType === 'text') {
      const t = state.textAnnotations.find(t => t.id === state.selectedId);
      if (!t || !textProps) return;
      textProps.style.display = 'block';
      if (propTextContent) propTextContent.value = t.text || '';
      if (propTextFontsize) propTextFontsize.value = t.fontSize || 9;
      if (propTextColor) propTextColor.value = t.color || '#2c3e50';
    } else if (state.multiSelection.personIds.length > 0) {
      // Multi-selection: show color picker for batch color change
      personProps.style.display = 'block';
      const firstP = state.persons.find(p => p.id === state.multiSelection.personIds[0]);
      propName.value = '(複数選択)';
      propRole.value = '';
      propAffiliation.value = '';
      propColor.value = firstP ? firstP.color : '#4a90d9';
    } else {
      noSelectionMsg.style.display = 'block';
    }
  }

  function renderRoleCheckboxes(person) {
    propRolesContainer.innerHTML = '';
    if (state.roles.length === 0) {
      propRolesContainer.innerHTML = '<div style="color:#999;font-size:11px;">役割なし（役割管理で追加）</div>';
      return;
    }
    state.roles.forEach(role => {
      const label = document.createElement('label');
      label.className = 'role-checkbox-item';
      const checked = (person.roleIds || []).includes(role.id);
      label.innerHTML = `<input type="checkbox" ${checked ? 'checked' : ''} data-role-id="${role.id}">
        <span class="role-badge-mini" style="background:${role.color}20;border-color:${role.color};color:${darkenColor(role.color, 10)}">${role.icon ? role.icon + ' ' : ''}${role.name}</span>`;
      label.querySelector('input').addEventListener('change', (e) => {
        if (!person.roleIds) person.roleIds = [];
        if (e.target.checked) {
          if (!person.roleIds.includes(role.id)) person.roleIds.push(role.id);
        } else {
          person.roleIds = person.roleIds.filter(rid => rid !== role.id);
        }
        renderPersonList();
        saveState();
        render();
      });
      propRolesContainer.appendChild(label);
    });
  }

  // ===== Person List Sidebar (Tree Structure) =====
  function renderPersonList() {
    personListEl.innerHTML = '';

    // 1. Build region hierarchy: find parent for each region
    //    Parent = smallest region that fully contains this region
    const regionParent = {};  // regionId -> parentRegionId or null
    state.regions.forEach(r => {
      let bestParent = null;
      let bestArea = Infinity;
      state.regions.forEach(candidate => {
        if (candidate.id === r.id) return;
        if (candidate.x <= r.x && candidate.y <= r.y &&
          candidate.x + candidate.w >= r.x + r.w &&
          candidate.y + candidate.h >= r.y + r.h) {
          const area = candidate.w * candidate.h;
          if (area < bestArea) {
            bestArea = area;
            bestParent = candidate.id;
          }
        }
      });
      regionParent[r.id] = bestParent;
    });

    // 2. Find each person's home region (smallest containing region)
    const personRegion = {};  // personId -> regionId or null
    state.persons.forEach(p => {
      let bestRegion = null;
      let bestArea = Infinity;
      state.regions.forEach(r => {
        if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) {
          const area = r.w * r.h;
          if (area < bestArea) {
            bestArea = area;
            bestRegion = r.id;
          }
        }
      });
      personRegion[p.id] = bestRegion;
    });

    // 3. Get children of a given parent region (null = root)
    function getChildRegions(parentId) {
      return state.regions.filter(r => regionParent[r.id] === parentId);
    }
    function getPersonsInRegion(regionId) {
      return state.persons.filter(p => personRegion[p.id] === regionId);
    }

    // 4. Render tree recursively
    function renderBranch(parentRegionId, container) {
      const childRegions = getChildRegions(parentRegionId);
      const persons = getPersonsInRegion(parentRegionId);

      // Sort regions by name
      childRegions.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      childRegions.forEach(region => {
        // Region header
        const header = document.createElement('div');
        header.className = 'region-tree-header';
        header.innerHTML = `<span class="tree-icon">▼</span><span>📁 ${region.name || '(無名領域)'}</span>`;
        container.appendChild(header);

        // Children container
        const childrenDiv = document.createElement('div');
        childrenDiv.className = 'tree-children';
        container.appendChild(childrenDiv);

        // Toggle collapse/expand
        header.addEventListener('click', () => {
          const isHidden = childrenDiv.style.display === 'none';
          childrenDiv.style.display = isHidden ? '' : 'none';
          header.querySelector('.tree-icon').textContent = isHidden ? '▼' : '▶';
        });

        // Recurse into this region
        renderBranch(region.id, childrenDiv);
      });

      // Persons in this region
      persons.forEach(p => {
        const div = document.createElement('div');
        const isMatch = state.searchQuery && p.name.toLowerCase().includes(state.searchQuery);
        div.className = 'person-item' + (state.selectedType === 'person' && state.selectedId === p.id ? ' selected' : '') + (isMatch ? ' search-highlight' : '');
        if (state.searchQuery && !isMatch) div.style.display = 'none';
        const roleNames = (p.roleIds || []).map(rid => { const r = state.roles.find(r => r.id === rid); return r ? r.name : ''; }).filter(Boolean);
        const roleStr = roleNames.length > 0 ? ' (' + roleNames.join(', ') + ')' : '';
        div.innerHTML = `<span class="color-dot" style="background:${p.color}"></span><span>${p.name}${roleStr}</span>`;
        div.addEventListener('click', () => selectItem('person', p.id));
        container.appendChild(div);
      });
    }

    // Render root-level regions only (persons at root handled separately)
    const rootRegions = getChildRegions(null);
    rootRegions.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    rootRegions.forEach(region => {
      const header = document.createElement('div');
      header.className = 'region-tree-header';
      header.innerHTML = `<span class="tree-icon">▼</span><span>📁 ${region.name || '(無名領域)'}</span>`;
      personListEl.appendChild(header);
      const childrenDiv = document.createElement('div');
      childrenDiv.className = 'tree-children';
      personListEl.appendChild(childrenDiv);
      header.addEventListener('click', () => {
        const isHidden = childrenDiv.style.display === 'none';
        childrenDiv.style.display = isHidden ? '' : 'none';
        header.querySelector('.tree-icon').textContent = isHidden ? '▼' : '▶';
      });
      renderBranch(region.id, childrenDiv);
    });

    // Unaffiliated persons (not in any region)
    const unaffiliated = state.persons.filter(p => personRegion[p.id] === null);
    if (unaffiliated.length > 0 && state.regions.length > 0) {
      const uaHeader = document.createElement('div');
      uaHeader.className = 'tree-unaffiliated-header';
      uaHeader.textContent = '（所属なし）';
      personListEl.appendChild(uaHeader);
    }
    unaffiliated.forEach(p => {
      const div = document.createElement('div');
      const isMatch = state.searchQuery && p.name.toLowerCase().includes(state.searchQuery);
      div.className = 'person-item' + (state.selectedType === 'person' && state.selectedId === p.id ? ' selected' : '') + (isMatch ? ' search-highlight' : '');
      if (state.searchQuery && !isMatch) div.style.display = 'none';
      const roleNames = (p.roleIds || []).map(rid => { const r = state.roles.find(r => r.id === rid); return r ? r.name : ''; }).filter(Boolean);
      const roleStr = roleNames.length > 0 ? ' (' + roleNames.join(', ') + ')' : '';
      div.innerHTML = `<span class="color-dot" style="background:${p.color}"></span><span>${p.name}${roleStr}</span>`;
      div.addEventListener('click', () => selectItem('person', p.id));
      personListEl.appendChild(div);
    });
  }

  // ===== Hit Testing =====
  function hitTestPerson(sx, sy) {
    for (let i = state.persons.length - 1; i >= 0; i--) {
      const p = state.persons[i];
      const s = worldToScreen(p.x, p.y);
      const dx = sx - s.x;
      const dy = sy - s.y;
      if (Math.abs(dx) < 18 && dy > -30 && dy < 20) {
        return p;
      }
    }
    return null;
  }

  function hitTestRegion(sx, sy) {
    const w = screenToWorld(sx, sy);
    for (let i = state.regions.length - 1; i >= 0; i--) {
      const r = state.regions[i];
      if (w.x >= r.x && w.x <= r.x + r.w && w.y >= r.y && w.y <= r.y + r.h) {
        return r;
      }
    }
    return null;
  }

  function hitTestTextAnnotation(sx, sy) {
    for (let i = state.textAnnotations.length - 1; i >= 0; i--) {
      const t = state.textAnnotations[i];
      const s = worldToScreen(t.x, t.y);
      const fontSize = (t.fontSize || 9) * state.zoom;
      const lines = (t.text || '').split('\n');
      ctx.font = `${fontSize}px "Segoe UI", "Meiryo", sans-serif`;
      const maxW = Math.max(...lines.map(l => ctx.measureText(l).width), 20);
      const totalH = lines.length * fontSize * 1.3;
      if (sx >= s.x - 2 && sx <= s.x + maxW + 4 && sy >= s.y - 2 && sy <= s.y + totalH + 4) {
        return t;
      }
    }
    return null;
  }

  // ===== Resize Handle Hit Test =====
  function hitTestResizeHandle(sx, sy) {
    if (state.selectedType !== 'region') return null;
    const r = state.regions.find(r => r.id === state.selectedId);
    if (!r) return null;

    if (state.viewMode === 'square') {
      const s = worldToScreen(r.x, r.y);
      const e = worldToScreen(r.x + r.w, r.y + r.h);
      const handles = getResizeHandlePositions(s.x, s.y, e.x - s.x, e.y - s.y);
      for (const h of handles) {
        if (Math.abs(sx - h.x) <= HANDLE_SIZE + 2 && Math.abs(sy - h.y) <= HANDLE_SIZE + 2) {
          return { region: r, dir: h.dir };
        }
      }
    } else {
      // Quarter view: corners and midpoints
      const corners = [
        { p: worldToScreen(r.x, r.y), dir: 'nw' },
        { p: worldToScreen(r.x + r.w, r.y), dir: 'ne' },
        { p: worldToScreen(r.x + r.w, r.y + r.h), dir: 'se' },
        { p: worldToScreen(r.x, r.y + r.h), dir: 'sw' },
      ];
      const mids = [
        { p: midPoint(corners[0].p, corners[1].p), dir: 'n' },
        { p: midPoint(corners[1].p, corners[2].p), dir: 'e' },
        { p: midPoint(corners[2].p, corners[3].p), dir: 's' },
        { p: midPoint(corners[3].p, corners[0].p), dir: 'w' },
      ];
      const all = [...corners, ...mids];
      for (const h of all) {
        if (Math.abs(sx - h.p.x) <= 6 && Math.abs(sy - h.p.y) <= 6) {
          return { region: r, dir: h.dir };
        }
      }
    }
    return null;
  }

  function midPoint(a, b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  const resizeCursors = {
    nw: 'nwse-resize', se: 'nwse-resize',
    ne: 'nesw-resize', sw: 'nesw-resize',
    n: 'ns-resize', s: 'ns-resize',
    e: 'ew-resize', w: 'ew-resize',
  };

  // ===== Canvas Mouse Events =====
  function getCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  canvas.addEventListener('mousedown', (e) => {
    const pos = getCanvasPos(e);

    // Right-click
    if (e.button === 2) {
      // Check if right-clicking on a waypoint handle -> show delete menu
      if (state.tool === 'select') {
        const wpHit = hitTestWaypointHandle(pos.x, pos.y);
        if (wpHit) {
          showWaypointContextMenu(e.clientX, e.clientY, wpHit.connector, wpHit.wpIndex);
          return;
        }
      }
      // Check if right-clicking on a connector in select mode -> show context menu
      if (state.tool === 'select') {
        const connector = hitTestConnector(pos.x, pos.y);
        if (connector) {
          selectItem('connector', connector.id);
          state.multiSelection = { personIds: [], regionIds: [] };
          showConnectorContextMenu(e.clientX, e.clientY, connector);
          return;
        }
      }
      // Otherwise pan
      state.dragging = {
        type: 'pan',
        startX: pos.x,
        startY: pos.y,
        origOffsetX: state.canvasOffset.x,
        origOffsetY: state.canvasOffset.y,
      };
      container.style.cursor = 'grabbing';
      return;
    }

    if (e.button !== 0) return;

    if (state.tool === 'select') {
      // Check resize handles first
      const handle = hitTestResizeHandle(pos.x, pos.y);
      if (handle) {
        pushUndo();
        state.dragging = {
          type: 'resize',
          id: handle.region.id,
          dir: handle.dir,
          origX: handle.region.x,
          origY: handle.region.y,
          origW: handle.region.w,
          origH: handle.region.h,
          startPos: screenToWorld(pos.x, pos.y),
        };
        container.style.cursor = resizeCursors[handle.dir] || 'default';
        return;
      }

      // Check if clicking on any multi-selected item (person or region)
      const hasMultiSelection = state.multiSelection.personIds.length > 0 || state.multiSelection.regionIds.length > 0;

      const person = hitTestPerson(pos.x, pos.y);
      if (person) {
        // Ctrl+Click: toggle in multi-selection
        if (e.ctrlKey) {
          const idx = state.multiSelection.personIds.indexOf(person.id);
          if (idx >= 0) {
            state.multiSelection.personIds.splice(idx, 1);
          } else {
            state.multiSelection.personIds.push(person.id);
          }
          updatePropsPanel();
          renderPersonList();
          render();
          return;
        }
        // Multi-selection group drag (person is in multi-selection)
        if (state.multiSelection.personIds.includes(person.id)) {
          pushUndo();
          const startWorld = screenToWorld(pos.x, pos.y);
          state.dragging = { type: 'multi', lastWorld: startWorld };
          container.style.cursor = 'grabbing';
          return;
        }
        // Person is not in multi-selection, but is inside a multi-selected region
        if (hasMultiSelection) {
          const inSelectedRegion = state.multiSelection.regionIds.some(rid => {
            const r = state.regions.find(r => r.id === rid);
            return r && person.x >= r.x && person.x <= r.x + r.w && person.y >= r.y && person.y <= r.y + r.h;
          });
          if (inSelectedRegion) {
            pushUndo();
            const startWorld = screenToWorld(pos.x, pos.y);
            state.dragging = { type: 'multi', lastWorld: startWorld };
            container.style.cursor = 'grabbing';
            return;
          }
        }
        selectItem('person', person.id);
        state.multiSelection = { personIds: [], regionIds: [] };
        pushUndo();
        state.dragging = {
          type: 'person',
          id: person.id,
          offsetX: pos.x - worldToScreen(person.x, person.y).x,
          offsetY: pos.y - worldToScreen(person.x, person.y).y,
        };
        container.style.cursor = 'grabbing';
        return;
      }

      const region = hitTestRegion(pos.x, pos.y);
      if (region) {
        // Ctrl+Click: toggle in multi-selection
        if (e.ctrlKey) {
          const idx = state.multiSelection.regionIds.indexOf(region.id);
          if (idx >= 0) {
            state.multiSelection.regionIds.splice(idx, 1);
          } else {
            state.multiSelection.regionIds.push(region.id);
          }
          updatePropsPanel();
          renderPersonList();
          render();
          return;
        }
        // Multi-selection group drag
        if (state.multiSelection.regionIds.includes(region.id)) {
          pushUndo();
          const startWorld = screenToWorld(pos.x, pos.y);
          state.dragging = { type: 'multi', lastWorld: startWorld };
          container.style.cursor = 'grabbing';
          return;
        }
        selectItem('region', region.id);
        state.multiSelection = { personIds: [], regionIds: [] };
        const s = worldToScreen(region.x, region.y);
        const childPersonIds = state.persons.filter(p =>
          p.x >= region.x && p.x <= region.x + region.w &&
          p.y >= region.y && p.y <= region.y + region.h
        ).map(p => p.id);
        const childRegionIds = state.regions.filter(r =>
          r.id !== region.id &&
          r.x >= region.x && r.y >= region.y &&
          r.x + r.w <= region.x + region.w && r.y + r.h <= region.y + region.h
        ).map(r => r.id);
        pushUndo();
        state.dragging = {
          type: 'region',
          id: region.id,
          offsetX: pos.x - s.x,
          offsetY: pos.y - s.y,
          origX: region.x,
          origY: region.y,
          childPersonIds: childPersonIds,
          childRegionIds: childRegionIds,
          lastWorld: screenToWorld(s.x, s.y),
        };
        container.style.cursor = 'grabbing';
        return;
      }

      // Check for waypoint handle drag on selected connector
      const wpHit = hitTestWaypointHandle(pos.x, pos.y);
      if (wpHit) {
        pushUndo();
        state.dragging = {
          type: 'waypoint',
          connector: wpHit.connector,
          wpIndex: wpHit.wpIndex,
        };
        container.style.cursor = 'move';
        return;
      }

      // Check for midpoint "+" handle click to add waypoint
      const mpHit = hitTestMidpointHandle(pos.x, pos.y);
      if (mpHit) {
        pushUndo();
        if (!mpHit.connector.waypoints) mpHit.connector.waypoints = [];
        // Determine which user-waypoint index to insert at
        // segIndex is position in the rendered polyline; we need to map to waypoints array
        // For simplicity: count how many waypoints contribute to segments before segIndex
        // Each waypoint contributes 2 segments (horiz + vert), plus auto-route adds segments
        // Simplest: just insert at end if no waypoints, or calculate based on position
        const wps = mpHit.connector.waypoints;
        // Find insertion position by comparing world x/y order
        let insertIdx = wps.length; // default: append
        const fromRegion = state.regions.find(r => r.id === mpHit.connector.fromRegionId);
        if (fromRegion) {
          const fromPt = getConnectionPointWorld(fromRegion, mpHit.connector.fromSide);
          const clickDist = Math.hypot(mpHit.worldPos.x - fromPt.x, mpHit.worldPos.y - fromPt.y);
          for (let i = 0; i < wps.length; i++) {
            const wpDist = Math.hypot(wps[i].x - fromPt.x, wps[i].y - fromPt.y);
            if (clickDist < wpDist) {
              insertIdx = i;
              break;
            }
          }
        }
        wps.splice(insertIdx, 0, { x: mpHit.worldPos.x, y: mpHit.worldPos.y });
        state.dragging = {
          type: 'waypoint',
          connector: mpHit.connector,
          wpIndex: insertIdx,
        };
        container.style.cursor = 'move';
        saveState();
        render();
        return;
      }

      // Check for text annotation click in select mode
      const textAnn = hitTestTextAnnotation(pos.x, pos.y);
      if (textAnn) {
        selectItem('text', textAnn.id);
        state.multiSelection = { personIds: [], regionIds: [] };
        pushUndo();
        state.dragging = {
          type: 'text',
          id: textAnn.id,
          lastWorld: screenToWorld(pos.x, pos.y),
        };
        container.style.cursor = 'grabbing';
        return;
      }

      // Check for connector click in select mode
      const connector = hitTestConnector(pos.x, pos.y);
      if (connector) {
        selectItem('connector', connector.id);
        state.multiSelection = { personIds: [], regionIds: [] };
        render();
        return;
      }

      // Empty space left drag -> range selection
      clearSelection();
      state.multiSelection = { personIds: [], regionIds: [] };
      state.rangeSelect = {
        startX: pos.x,
        startY: pos.y,
        currentX: pos.x,
        currentY: pos.y,
      };
      container.style.cursor = 'crosshair';
      render();
    } else if (state.tool === 'region') {
      pushUndo();
      const world = screenToWorld(pos.x, pos.y);
      state.regionDraw = {
        startX: world.x,
        startY: world.y,
        currentX: world.x,
        currentY: world.y,
      };
    } else if (state.tool === 'connector') {
      const cp = hitTestConnectionPoint(pos.x, pos.y);
      if (cp) {
        state.connectorDraw = {
          fromRegionId: cp.region.id,
          fromSide: cp.side,
          currentX: pos.x,
          currentY: pos.y,
        };
        container.style.cursor = 'crosshair';
        render();
      }
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    const pos = getCanvasPos(e);

    if (state.rangeSelect) {
      state.rangeSelect.currentX = pos.x;
      state.rangeSelect.currentY = pos.y;
      render();
      return;
    }

    if (state.connectorDraw) {
      state.connectorDraw.currentX = pos.x;
      state.connectorDraw.currentY = pos.y;
      render();
      return;
    }

    if (state.dragging) {
      if (state.dragging.type === 'person') {
        const p = state.persons.find(p => p.id === state.dragging.id);
        if (p) {
          const targetScreen = { x: pos.x - state.dragging.offsetX, y: pos.y - state.dragging.offsetY };
          const world = screenToWorld(targetScreen.x, targetScreen.y);
          p.x = world.x;
          p.y = world.y;
          render();
        }
      } else if (state.dragging.type === 'region') {
        const r = state.regions.find(r => r.id === state.dragging.id);
        if (r) {
          const targetScreen = { x: pos.x - state.dragging.offsetX, y: pos.y - state.dragging.offsetY };
          const world = screenToWorld(targetScreen.x, targetScreen.y);
          const dx = world.x - state.dragging.lastWorld.x;
          const dy = world.y - state.dragging.lastWorld.y;
          r.x = world.x;
          r.y = world.y;
          if (state.dragging.childPersonIds) {
            state.dragging.childPersonIds.forEach(pid => {
              const p = state.persons.find(p => p.id === pid);
              if (p) { p.x += dx; p.y += dy; }
            });
          }
          if (state.dragging.childRegionIds) {
            state.dragging.childRegionIds.forEach(crid => {
              const cr = state.regions.find(r => r.id === crid);
              if (cr) { cr.x += dx; cr.y += dy; }
            });
          }
          state.dragging.lastWorld = world;
          render();
        }
      } else if (state.dragging.type === 'multi') {
        const world = screenToWorld(pos.x, pos.y);
        const dx = world.x - state.dragging.lastWorld.x;
        const dy = world.y - state.dragging.lastWorld.y;
        // Track which persons have been moved to prevent double-moves
        const movedPersonIds = new Set();
        // Move explicitly selected persons
        state.multiSelection.personIds.forEach(pid => {
          const p = state.persons.find(p => p.id === pid);
          if (p) { p.x += dx; p.y += dy; movedPersonIds.add(pid); }
        });
        // Move selected regions + their internal persons (avoid double-move)
        state.multiSelection.regionIds.forEach(rid => {
          const r = state.regions.find(r => r.id === rid);
          if (r) {
            // Find persons inside region that haven't been moved yet
            state.persons.forEach(p => {
              if (!movedPersonIds.has(p.id) &&
                p.x >= r.x && p.x <= r.x + r.w &&
                p.y >= r.y && p.y <= r.y + r.h) {
                p.x += dx; p.y += dy;
                movedPersonIds.add(p.id);
              }
            });
            r.x += dx; r.y += dy;
          }
        });
        state.dragging.lastWorld = world;
        render();
      } else if (state.dragging.type === 'pan') {
        const dx = pos.x - state.dragging.startX;
        const dy = pos.y - state.dragging.startY;
        state.canvasOffset.x = state.dragging.origOffsetX + dx;
        state.canvasOffset.y = state.dragging.origOffsetY + dy;
        render();
      } else if (state.dragging.type === 'waypoint') {
        const world = screenToWorld(pos.x, pos.y);
        const wp = state.dragging.connector.waypoints[state.dragging.wpIndex];
        if (wp) {
          wp.x = world.x;
          wp.y = world.y;
          render();
        }
      } else if (state.dragging.type === 'text') {
        const t = state.textAnnotations.find(t => t.id === state.dragging.id);
        if (t) {
          const world = screenToWorld(pos.x, pos.y);
          const dx = world.x - state.dragging.lastWorld.x;
          const dy = world.y - state.dragging.lastWorld.y;
          t.x += dx;
          t.y += dy;
          state.dragging.lastWorld = world;
          render();
        }
      } else if (state.dragging.type === 'resize') {
        const r = state.regions.find(r => r.id === state.dragging.id);
        if (r) {
          const world = screenToWorld(pos.x, pos.y);
          const dx = world.x - state.dragging.startPos.x;
          const dy = world.y - state.dragging.startPos.y;
          const dir = state.dragging.dir;
          const MIN_SIZE = 30;

          let nx = state.dragging.origX;
          let ny = state.dragging.origY;
          let nw = state.dragging.origW;
          let nh = state.dragging.origH;

          if (dir.includes('e')) { nw = Math.max(MIN_SIZE, nw + dx); }
          if (dir.includes('w')) { nx = nx + dx; nw = Math.max(MIN_SIZE, nw - dx); if (nw === MIN_SIZE) nx = state.dragging.origX + state.dragging.origW - MIN_SIZE; }
          if (dir.includes('s')) { nh = Math.max(MIN_SIZE, nh + dy); }
          if (dir.includes('n')) { ny = ny + dy; nh = Math.max(MIN_SIZE, nh - dy); if (nh === MIN_SIZE) ny = state.dragging.origY + state.dragging.origH - MIN_SIZE; }

          r.x = nx; r.y = ny; r.w = nw; r.h = nh;
          render();
        }
      }
      return;
    }

    if (state.regionDraw) {
      const world = screenToWorld(pos.x, pos.y);
      state.regionDraw.currentX = world.x;
      state.regionDraw.currentY = world.y;
      render();
      return;
    }

    // Cursor hints
    if (state.tool === 'select') {
      const handle = hitTestResizeHandle(pos.x, pos.y);
      if (handle) {
        container.style.cursor = resizeCursors[handle.dir] || 'default';
        return;
      }
      const person = hitTestPerson(pos.x, pos.y);
      const region = hitTestRegion(pos.x, pos.y);
      const textAnn = hitTestTextAnnotation(pos.x, pos.y);
      const wpHandle = hitTestWaypointHandle(pos.x, pos.y);
      const mpHandle = hitTestMidpointHandle(pos.x, pos.y);
      const connectorLine = hitTestConnector(pos.x, pos.y);
      container.style.cursor = wpHandle ? 'move' : (mpHandle ? 'pointer' : (person ? 'grab' : (region ? 'move' : (textAnn ? 'grab' : (connectorLine ? 'pointer' : 'default')))));
    } else if (state.tool === 'region') {
      container.style.cursor = 'crosshair';
    } else if (state.tool === 'connector') {
      const cp = hitTestConnectionPoint(pos.x, pos.y);
      container.style.cursor = cp ? 'crosshair' : 'default';
    }
  });

  canvas.addEventListener('mouseup', (e) => {
    // Range select complete
    if (state.rangeSelect) {
      const rs = state.rangeSelect;
      const sx1 = Math.min(rs.startX, rs.currentX);
      const sy1 = Math.min(rs.startY, rs.currentY);
      const sx2 = Math.max(rs.startX, rs.currentX);
      const sy2 = Math.max(rs.startY, rs.currentY);
      const w1 = screenToWorld(sx1, sy1);
      const w2 = screenToWorld(sx2, sy2);
      const wx1 = Math.min(w1.x, w2.x);
      const wy1 = Math.min(w1.y, w2.y);
      const wx2 = Math.max(w1.x, w2.x);
      const wy2 = Math.max(w1.y, w2.y);

      const selectedPersonIds = state.persons.filter(p =>
        p.x >= wx1 && p.x <= wx2 && p.y >= wy1 && p.y <= wy2
      ).map(p => p.id);

      const selectedRegionIds = state.regions.filter(r =>
        r.x >= wx1 && r.x + r.w <= wx2 && r.y >= wy1 && r.y + r.h <= wy2
      ).map(r => r.id);

      state.multiSelection = { personIds: selectedPersonIds, regionIds: selectedRegionIds };
      state.rangeSelect = null;
      container.style.cursor = 'default';
      updatePropsPanel();
      render();
      return;
    }

    if (state.dragging) {
      const wasPan = state.dragging.type === 'pan';
      state.dragging = null;
      container.style.cursor = 'default';
      if (!wasPan) saveState();
      return;
    }

    // Connector draw complete
    if (state.connectorDraw) {
      const pos = getCanvasPos(e);
      const cp = hitTestConnectionPoint(pos.x, pos.y);
      if (cp && cp.region.id !== state.connectorDraw.fromRegionId) {
        pushUndo();
        const fromRegion = state.regions.find(r => r.id === state.connectorDraw.fromRegionId);
        const connector = {
          id: state.nextId++,
          fromRegionId: state.connectorDraw.fromRegionId,
          toRegionId: cp.region.id,
          fromSide: state.connectorDraw.fromSide,
          toSide: cp.side,
          label: '',
          direction: 'none',
          waypoints: [],
        };
        // Auto-populate waypoints from auto-route corners
        if (fromRegion) {
          const from = getConnectionPointWorld(fromRegion, connector.fromSide);
          const to = getConnectionPointWorld(cp.region, connector.toSide);
          const autoPoints = routeConnector(from, to, connector.fromSide, connector.toSide, []);
          // Extract intermediate points (skip first=start, last=end)
          connector.waypoints = autoPoints.slice(1, -1).map(p => ({ x: p.x, y: p.y }));
        }
        state.connectors.push(connector);
        selectItem('connector', connector.id);
        saveState();
      }
      state.connectorDraw = null;
      container.style.cursor = 'default';
      render();
      return;
    }

    if (state.regionDraw) {
      const rd = state.regionDraw;
      const x = Math.min(rd.startX, rd.currentX);
      const y = Math.min(rd.startY, rd.currentY);
      const w = Math.abs(rd.currentX - rd.startX);
      const h = Math.abs(rd.currentY - rd.startY);

      if (w > 10 && h > 10) {
        const region = {
          id: state.nextId++,
          name: '',
          x, y, w, h,
        };
        state.regions.push(region);
        selectItem('region', region.id);
        saveState();
      }

      state.regionDraw = null;
      render();
    }
  });

  // Prevent context menu on canvas (for right-drag pan)
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  canvas.addEventListener('dblclick', (e) => {
    const pos = getCanvasPos(e);
    // Connector label editing
    const connector = hitTestConnector(pos.x, pos.y);
    if (connector) {
      const label = prompt('コネクタラベルを入力してください:', connector.label || '');
      if (label !== null) {
        pushUndo();
        connector.label = label;
        if (state.selectedType === 'connector' && state.selectedId === connector.id) {
          if (propConnectorLabel) propConnectorLabel.value = label;
        }
        saveState();
        render();
      }
      return;
    }
    const region = hitTestRegion(pos.x, pos.y);
    if (region) {
      const name = prompt('領域名を入力してください:', region.name || '');
      if (name !== null) {
        pushUndo();
        region.name = name;
        if (state.selectedType === 'region' && state.selectedId === region.id) {
          propRegionName.value = name;
        }
        saveState();
        render();
      }
    }
  });

  // ===== Mouse Wheel Zoom =====
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const pos = getCanvasPos(e);
    const worldBefore = screenToWorld(pos.x, pos.y);

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    state.zoom = Math.max(state.zoomMin, Math.min(state.zoomMax, state.zoom * delta));

    // Adjust offset so the world point under cursor stays fixed
    const cx = canvas.width / 2 + state.canvasOffset.x;
    const cy = canvas.height / 3 + state.canvasOffset.y;
    let screenAfter;
    if (state.viewMode === 'quarter') {
      const iso = toIso(worldBefore.x, worldBefore.y);
      screenAfter = { x: iso.x * state.zoom + cx, y: iso.y * state.zoom + cy };
    } else {
      screenAfter = { x: worldBefore.x * state.zoom + cx, y: worldBefore.y * state.zoom + cy };
    }
    state.canvasOffset.x += pos.x - screenAfter.x;
    state.canvasOffset.y += pos.y - screenAfter.y;

    updateZoomLabel();
    render();
  }, { passive: false });

  // ===== Toolbar Events =====
  function updateZoomLabel() {
    if (zoomLabel) zoomLabel.textContent = Math.round(state.zoom * 100) + '%';
  }

  btnAddPerson.addEventListener('click', () => {
    pushUndo();
    addPerson();
    renderPersonList();
    selectItem('person', state.persons[state.persons.length - 1].id);
    saveState();
    render();
  });

  if (btnZoomReset) {
    btnZoomReset.addEventListener('click', () => {
      state.zoom = 1.0;
      state.canvasOffset.x = 0;
      state.canvasOffset.y = 0;
      updateZoomLabel();
      render();
    });
  }

  // ===== File Save / Load =====
  const btnSaveFile = document.getElementById('btn-save-file');
  const btnLoadFile = document.getElementById('btn-load-file');
  const fileImportInput = document.getElementById('file-import-input');

  if (btnSaveFile) {
    btnSaveFile.addEventListener('click', () => {
      const data = {
        persons: state.persons,
        regions: state.regions,
        roles: state.roles,
        connectors: state.connectors,
        nextId: state.nextId,
        exportedAt: new Date().toISOString(),
      };
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.href = url;
      a.download = `orgchart_${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  if (btnLoadFile && fileImportInput) {
    btnLoadFile.addEventListener('click', () => {
      fileImportInput.click();
    });
    fileImportInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!confirm('現在のデータを上書きします。よろしいですか？')) {
        fileImportInput.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (data.persons) state.persons = data.persons;
          if (data.regions) state.regions = data.regions;
          if (data.roles) state.roles = data.roles;
          if (data.connectors) state.connectors = data.connectors;
          if (data.nextId) state.nextId = data.nextId;
          clearSelection();
          saveState();
          renderPersonList();
          updatePropsPanel();
          render();
        } catch (err) {
          alert('ファイルの読み込みに失敗しました: ' + err.message);
        }
      };
      reader.readAsText(file);
      fileImportInput.value = '';
    });
  }

  btnSquareView.addEventListener('click', () => {
    state.viewMode = 'square';
    btnSquareView.classList.add('active');
    btnQuarterView.classList.remove('active');
    render();
  });

  btnQuarterView.addEventListener('click', () => {
    state.viewMode = 'quarter';
    btnQuarterView.classList.add('active');
    btnSquareView.classList.remove('active');
    render();
  });

  function setToolActive(tool) {
    state.tool = tool;
    btnToolSelect.classList.toggle('active', tool === 'select');
    btnToolRegion.classList.toggle('active', tool === 'region');
    if (btnToolConnector) btnToolConnector.classList.toggle('active', tool === 'connector');
    if (btnToolText) btnToolText.classList.toggle('active', tool === 'text');
    container.style.cursor = tool === 'select' ? 'default' : 'crosshair';
    render();
  }

  btnToolSelect.addEventListener('click', () => setToolActive('select'));

  btnToolRegion.addEventListener('click', () => setToolActive('region'));

  if (btnToolConnector) {
    btnToolConnector.addEventListener('click', () => setToolActive('connector'));
  }

  function deleteSelected() {
    // Multi-selection delete
    if (state.multiSelection.personIds.length > 0 || state.multiSelection.regionIds.length > 0) {
      pushUndo();
      // Delete multi-selected persons
      state.multiSelection.personIds.forEach(pid => {
        state.persons = state.persons.filter(p => p.id !== pid);
      });
      // Delete multi-selected regions and their connectors
      state.multiSelection.regionIds.forEach(rid => {
        state.connectors = state.connectors.filter(c =>
          c.fromRegionId !== rid && c.toRegionId !== rid
        );
        state.regions = state.regions.filter(r => r.id !== rid);
      });
      state.multiSelection = { personIds: [], regionIds: [] };
      clearSelection();
      renderPersonList();
      saveState();
      render();
      return;
    }
    // Single selection delete
    if (state.selectedType === 'person') {
      pushUndo();
      deletePerson(state.selectedId);
    } else if (state.selectedType === 'region') {
      pushUndo();
      state.connectors = state.connectors.filter(c =>
        c.fromRegionId !== state.selectedId && c.toRegionId !== state.selectedId
      );
      deleteRegion(state.selectedId);
    } else if (state.selectedType === 'connector') {
      pushUndo();
      state.connectors = state.connectors.filter(c => c.id !== state.selectedId);
      clearSelection();
      saveState();
      render();
    } else if (state.selectedType === 'text') {
      pushUndo();
      state.textAnnotations = state.textAnnotations.filter(t => t.id !== state.selectedId);
      clearSelection();
      saveState();
      render();
    }
  }

  btnDelete.addEventListener('click', deleteSelected);

  // ===== Undo/Redo Buttons =====
  if (btnUndo) btnUndo.addEventListener('click', undo);
  if (btnRedo) btnRedo.addEventListener('click', redo);

  // ===== Clipboard for Copy/Paste =====
  let clipboard = { persons: [], regions: [] };

  function copySelected() {
    clipboard = { persons: [], regions: [] };
    // Copy from multi-selection
    if (state.multiSelection.personIds.length > 0) {
      clipboard.persons = state.multiSelection.personIds.map(id =>
        JSON.parse(JSON.stringify(state.persons.find(p => p.id === id)))
      ).filter(Boolean);
    }
    if (state.multiSelection.regionIds.length > 0) {
      clipboard.regions = state.multiSelection.regionIds.map(id =>
        JSON.parse(JSON.stringify(state.regions.find(r => r.id === id)))
      ).filter(Boolean);
    }
    // Copy single selection
    if (clipboard.persons.length === 0 && clipboard.regions.length === 0) {
      if (state.selectedType === 'person') {
        const p = state.persons.find(p => p.id === state.selectedId);
        if (p) clipboard.persons.push(JSON.parse(JSON.stringify(p)));
      } else if (state.selectedType === 'region') {
        const r = state.regions.find(r => r.id === state.selectedId);
        if (r) clipboard.regions.push(JSON.parse(JSON.stringify(r)));
      }
    }
  }

  function pasteClipboard() {
    if (clipboard.persons.length === 0 && clipboard.regions.length === 0) return;
    pushUndo();
    const offset = 30;
    const newPersonIds = [];
    clipboard.persons.forEach(p => {
      const np = addPerson(p.name, {
        role: p.role, affiliation: p.affiliation, color: p.color,
        x: p.x + offset, y: p.y + offset,
        roleIds: p.roleIds || [],
        email: p.email, phone: p.phone, joinDate: p.joinDate,
        effectiveDate: p.effectiveDate, photoUrl: p.photoUrl,
      });
      newPersonIds.push(np.id);
    });
    const newRegionIds = [];
    clipboard.regions.forEach(r => {
      const nr = { id: state.nextId++, name: r.name, x: r.x + offset, y: r.y + offset, w: r.w, h: r.h, color: r.color || '#4a8acf' };
      state.regions.push(nr);
      newRegionIds.push(nr.id);
    });
    state.multiSelection = { personIds: newPersonIds, regionIds: newRegionIds };
    clearSelection();
    renderPersonList();
    saveState();
    render();
  }

  function selectAll() {
    state.multiSelection.personIds = state.persons.map(p => p.id);
    state.multiSelection.regionIds = state.regions.map(r => r.id);
    clearSelection();
    renderPersonList();
    render();
  }

  function nudgeSelected(dx, dy) {
    const items = [];
    if (state.multiSelection.personIds.length > 0 || state.multiSelection.regionIds.length > 0) {
      pushUndo();
      state.multiSelection.personIds.forEach(pid => {
        const p = state.persons.find(p => p.id === pid);
        if (p) { p.x += dx; p.y += dy; }
      });
      state.multiSelection.regionIds.forEach(rid => {
        const r = state.regions.find(r => r.id === rid);
        if (r) { r.x += dx; r.y += dy; }
      });
    } else if (state.selectedType === 'person') {
      pushUndo();
      const p = state.persons.find(p => p.id === state.selectedId);
      if (p) { p.x += dx; p.y += dy; }
    } else if (state.selectedType === 'region') {
      pushUndo();
      const r = state.regions.find(r => r.id === state.selectedId);
      if (r) { r.x += dx; r.y += dy; }
    } else if (state.selectedType === 'text') {
      pushUndo();
      const t = state.textAnnotations.find(t => t.id === state.selectedId);
      if (t) { t.x += dx; t.y += dy; }
    } else {
      return;
    }
    saveState();
    render();
  }

  // ===== Keyboard Shortcuts =====
  document.addEventListener('keydown', (e) => {
    const inInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT';

    // Ctrl+F: focus search (always works)
    if (e.ctrlKey && e.key === 'f') {
      e.preventDefault();
      if (personSearch) personSearch.focus();
      return;
    }

    // Skip other shortcuts when in input fields
    if (inInput) return;

    // Ctrl shortcuts
    if (e.ctrlKey) {
      switch (e.key) {
        case 'z': e.preventDefault(); undo(); return;
        case 'y': e.preventDefault(); redo(); return;
        case 'a': e.preventDefault(); selectAll(); return;
        case 's': e.preventDefault(); if (btnSaveFile) btnSaveFile.click(); return;
        case 'c': e.preventDefault(); copySelected(); return;
        case 'v': e.preventDefault(); pasteClipboard(); return;
        case 'd': e.preventDefault(); copySelected(); pasteClipboard(); return;
        case '=': case '+': e.preventDefault(); state.zoom = Math.min(state.zoomMax, state.zoom * 1.15); updateZoomLabel(); render(); return;
        case '-': e.preventDefault(); state.zoom = Math.max(state.zoomMin, state.zoom / 1.15); updateZoomLabel(); render(); return;
        case '0': e.preventDefault(); state.zoom = 1.0; updateZoomLabel(); render(); return;
      }
    }

    // Non-Ctrl shortcuts
    if (e.key === 'Delete') {
      e.preventDefault();
      deleteSelected();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      clearSelection();
      state.multiSelection = { personIds: [], regionIds: [] };
      if (state.tool !== 'select') setToolActive('select');
      renderPersonList();
      render();
    } else if (e.key === 'Home') {
      e.preventDefault();
      state.canvasOffset.x = 0;
      state.canvasOffset.y = 0;
      state.zoom = 1.0;
      updateZoomLabel();
      render();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const step = e.shiftKey ? state.gridSize * 5 : state.gridSize;
      const dx = e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0;
      const dy = e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0;
      nudgeSelected(dx, dy);
    }

    // Shift key temp connector mode
    if (e.key === 'Shift' && !state.shiftHeld && state.tool !== 'connector') {
      state.shiftHeld = true;
      state.prevTool = state.tool;
      setToolActive('connector');
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.key === 'Shift' && state.shiftHeld) {
      state.shiftHeld = false;
      if (state.connectorDraw) {
        state.connectorDraw = null;
      }
      setToolActive(state.prevTool || 'select');
      state.prevTool = null;
    }
  });

  // ===== Connector Property Events =====
  if (propConnectorLabel) {
    propConnectorLabel.addEventListener('input', () => {
      const c = state.connectors.find(c => c.id === state.selectedId);
      if (c) { c.label = propConnectorLabel.value; saveState(); render(); }
    });
  }
  if (propConnectorDirection) {
    propConnectorDirection.addEventListener('change', () => {
      const c = state.connectors.find(c => c.id === state.selectedId);
      if (c) { c.direction = propConnectorDirection.value; saveState(); render(); }
    });
  }

  // ===== Z-Order Events =====
  function moveRegionZOrder(mode) {
    if (state.selectedType !== 'region') return;
    const idx = state.regions.findIndex(r => r.id === state.selectedId);
    if (idx < 0) return;
    pushUndo();
    const [region] = state.regions.splice(idx, 1);
    switch (mode) {
      case 'front': state.regions.push(region); break;
      case 'back': state.regions.unshift(region); break;
      case 'forward': state.regions.splice(Math.min(idx + 1, state.regions.length), 0, region); break;
      case 'backward': state.regions.splice(Math.max(idx - 1, 0), 0, region); break;
    }
    saveState();
    render();
  }
  if (btnZFront) btnZFront.addEventListener('click', () => moveRegionZOrder('front'));
  if (btnZForward) btnZForward.addEventListener('click', () => moveRegionZOrder('forward'));
  if (btnZBackward) btnZBackward.addEventListener('click', () => moveRegionZOrder('backward'));
  if (btnZBack) btnZBack.addEventListener('click', () => moveRegionZOrder('back'));

  // ===== Alignment =====
  function getMultiSelectedItems() {
    const items = [];
    // Collect selected regions first
    const selectedRegions = [];
    state.multiSelection.regionIds.forEach(rid => {
      const r = state.regions.find(r => r.id === rid);
      if (r) {
        items.push({ type: 'region', obj: r, x: r.x, y: r.y, w: r.w, h: r.h });
        selectedRegions.push(r);
      }
    });
    // Only include persons NOT inside any selected region
    state.multiSelection.personIds.forEach(pid => {
      const p = state.persons.find(p => p.id === pid);
      if (!p) return;
      const insideSelectedRegion = selectedRegions.some(r =>
        p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h
      );
      if (!insideSelectedRegion) {
        items.push({ type: 'person', obj: p, x: p.x, y: p.y, w: 0, h: 0 });
      }
    });
    return items;
  }

  // Helper: move a region (+ its internal persons) or person to new coordinates
  function applyMove(item, newX, newY) {
    if (item.type === 'region') {
      const dx = newX - item.obj.x;
      const dy = newY - item.obj.y;
      // Move persons inside the region
      state.persons.forEach(p => {
        if (p.x >= item.obj.x && p.x <= item.obj.x + item.obj.w &&
          p.y >= item.obj.y && p.y <= item.obj.y + item.obj.h) {
          p.x += dx;
          p.y += dy;
        }
      });
      item.obj.x = newX;
      item.obj.y = newY;
    } else {
      item.obj.x = newX;
      item.obj.y = newY;
    }
  }

  function alignItems(direction) {
    const items = getMultiSelectedItems();
    if (items.length < 2) return;
    pushUndo();

    if (direction === 'top') {
      const minY = Math.min(...items.map(i => i.y));
      items.forEach(i => applyMove(i, i.obj.x, minY));
    } else if (direction === 'bottom') {
      const maxY = Math.max(...items.map(i => i.y + i.h));
      items.forEach(i => applyMove(i, i.obj.x, maxY - i.h));
    } else if (direction === 'left') {
      const minX = Math.min(...items.map(i => i.x));
      items.forEach(i => applyMove(i, minX, i.obj.y));
    } else if (direction === 'right') {
      const maxX = Math.max(...items.map(i => i.x + i.w));
      items.forEach(i => applyMove(i, maxX - i.w, i.obj.y));
    } else if (direction === 'center-h') {
      const minX = Math.min(...items.map(i => i.x));
      const maxX = Math.max(...items.map(i => i.x + i.w));
      const centerX = (minX + maxX) / 2;
      items.forEach(i => applyMove(i, centerX - i.w / 2, i.obj.y));
    } else if (direction === 'center-v') {
      const minY = Math.min(...items.map(i => i.y));
      const maxY = Math.max(...items.map(i => i.y + i.h));
      const centerY = (minY + maxY) / 2;
      items.forEach(i => applyMove(i, i.obj.x, centerY - i.h / 2));
    }

    saveState();
    render();
  }

  if (btnAlignTop) btnAlignTop.addEventListener('click', () => alignItems('top'));
  if (btnAlignBottom) btnAlignBottom.addEventListener('click', () => alignItems('bottom'));
  if (btnAlignLeft) btnAlignLeft.addEventListener('click', () => alignItems('left'));
  if (btnAlignRight) btnAlignRight.addEventListener('click', () => alignItems('right'));
  if (btnAlignCenterH) btnAlignCenterH.addEventListener('click', () => alignItems('center-h'));
  if (btnAlignCenterV) btnAlignCenterV.addEventListener('click', () => alignItems('center-v'));

  // ===== Distribution (Equal Spacing) =====
  const btnDistributeH = document.getElementById('btn-distribute-h');
  const btnDistributeV = document.getElementById('btn-distribute-v');

  function distributeItems(axis) {
    const items = getMultiSelectedItems();
    if (items.length < 3) return; // Need at least 3 items to distribute
    pushUndo();

    if (axis === 'horizontal') {
      // Sort by x position
      items.sort((a, b) => a.x - b.x);
      const first = items[0];
      const last = items[items.length - 1];
      const totalSpan = (last.x + last.w) - first.x;
      const totalItemWidth = items.reduce((sum, i) => sum + i.w, 0);
      const gap = (totalSpan - totalItemWidth) / (items.length - 1);
      let currentX = first.x;
      items.forEach((item, idx) => {
        if (idx === 0) { currentX += item.w + gap; return; }
        applyMove(item, currentX, item.obj.y);
        currentX += item.w + gap;
      });
    } else if (axis === 'vertical') {
      // Sort by y position
      items.sort((a, b) => a.y - b.y);
      const first = items[0];
      const last = items[items.length - 1];
      const totalSpan = (last.y + last.h) - first.y;
      const totalItemHeight = items.reduce((sum, i) => sum + i.h, 0);
      const gap = (totalSpan - totalItemHeight) / (items.length - 1);
      let currentY = first.y;
      items.forEach((item, idx) => {
        if (idx === 0) { currentY += item.h + gap; return; }
        applyMove(item, item.obj.x, currentY);
        currentY += item.h + gap;
      });
    }

    saveState();
    render();
  }

  if (btnDistributeH) btnDistributeH.addEventListener('click', () => distributeItems('horizontal'));
  if (btnDistributeV) btnDistributeV.addEventListener('click', () => distributeItems('vertical'));

  // ===== Property Panel Events =====
  propName.addEventListener('input', () => {
    const p = state.persons.find(p => p.id === state.selectedId);
    if (p) { p.name = propName.value; renderPersonList(); saveState(); render(); }
  });
  propRole.addEventListener('input', () => {
    const p = state.persons.find(p => p.id === state.selectedId);
    if (p) { p.role = propRole.value; renderPersonList(); saveState(); }
  });
  propAffiliation.addEventListener('input', () => {
    const p = state.persons.find(p => p.id === state.selectedId);
    if (p) { p.affiliation = propAffiliation.value; saveState(); }
  });
  propColor.addEventListener('input', () => {
    const p = state.persons.find(p => p.id === state.selectedId);
    if (p) { p.color = propColor.value; }
    // Also apply to all multi-selected persons
    state.multiSelection.personIds.forEach(pid => {
      const mp = state.persons.find(p => p.id === pid);
      if (mp) mp.color = propColor.value;
    });
    renderPersonList(); saveState(); render();
  });
  propRegionName.addEventListener('input', () => {
    const r = state.regions.find(r => r.id === state.selectedId);
    if (r) { r.name = propRegionName.value; saveState(); render(); }
  });

  if (propRegionFontsize) {
    propRegionFontsize.addEventListener('input', () => {
      const r = state.regions.find(r => r.id === state.selectedId);
      if (r) { r.fontSize = parseInt(propRegionFontsize.value) || 13; saveState(); render(); }
    });
  }
  if (propRegionTextalign) {
    propRegionTextalign.addEventListener('change', () => {
      const r = state.regions.find(r => r.id === state.selectedId);
      if (r) { r.textAlign = propRegionTextalign.value; saveState(); render(); }
    });
  }

  // ===== Bulk Create =====
  btnBulkCreate.addEventListener('click', () => {
    bulkTextarea.value = '';
    bulkModal.classList.add('show');
  });

  bulkBtnCancel.addEventListener('click', () => {
    bulkModal.classList.remove('show');
  });

  bulkModal.addEventListener('click', (e) => {
    if (e.target === bulkModal) bulkModal.classList.remove('show');
  });

  bulkBtnCreate.addEventListener('click', () => {
    const text = bulkTextarea.value.trim();
    if (!text) return;
    bulkCreateFromText(text);
    bulkModal.classList.remove('show');
  });

  function parseBulkData(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    return lines.map(line => {
      const parts = line.split('\t');
      if (parts.length >= 2) {
        return { affiliation: parts[0].trim(), name: parts[1].trim() };
      }
      return { affiliation: '', name: parts[0].trim() };
    });
  }

  function bulkCreateFromText(text) {
    const entries = parseBulkData(text);
    if (entries.length === 0) return;

    // Group by affiliation
    const groups = {};
    const groupOrder = [];
    entries.forEach(e => {
      const key = e.affiliation || '（所属なし）';
      if (!groups[key]) {
        groups[key] = [];
        groupOrder.push(key);
      }
      groups[key].push(e.name);
    });

    // Layout constants
    const personSpacingX = 50;
    const personSpacingY = 60;
    const regionPadding = 30;
    const regionGap = 40;
    const maxPersonsPerRow = 5;

    let offsetX = -((groupOrder.length - 1) * 200) / 2; // Center the layout

    groupOrder.forEach((groupName, gi) => {
      const names = groups[groupName];
      const cols = Math.min(names.length, maxPersonsPerRow);
      const rows = Math.ceil(names.length / maxPersonsPerRow);

      const rw = cols * personSpacingX + regionPadding * 2;
      const rh = rows * personSpacingY + regionPadding * 2 + 15;

      // Create region
      const region = {
        id: state.nextId++,
        name: groupName,
        x: offsetX,
        y: -rh / 2,
        w: rw,
        h: rh,
      };
      state.regions.push(region);

      // Place persons in region
      names.forEach((name, i) => {
        const col = i % maxPersonsPerRow;
        const row = Math.floor(i / maxPersonsPerRow);
        const px = offsetX + regionPadding + col * personSpacingX + personSpacingX / 2;
        const py = -rh / 2 + regionPadding + 15 + row * personSpacingY + personSpacingY / 2;
        addPerson(name, {
          affiliation: groupName,
          x: px,
          y: py,
          color: defaultColors[gi % defaultColors.length],
        });
      });

      offsetX += rw + regionGap;
    });

    renderPersonList();
    saveState();
    render();
  }

  // ===== Test Data Generator =====
  const lastNames = ['田中', '佐藤', '鈴木', '高橋', '伊藤', '渡辺', '山本', '中村', '小林', '加藤', '吉田', '山田', '松本', '井上', '木村', '林', '清水', '山口', '阿部', '池田', '橋本', '森', '石川', '前田', '藤田', '後藤', '岡田', '長谷川', '村上', '近藤'];
  const firstNames = ['太郎', '花子', '一郎', '美咲', '健太', 'さくら', '大輔', '陽菜', '翔太', '結衣', '拓海', '葵', '蓮', '凛', '悠斗', '紬', '陸', '芽依', '颯真', '莉子', '大翔', '美月', '樹', '七海', '湊', '楓', '朝陽', '琴音'];
  const deptNames = ['営業部', '開発部', '人事部', '総務部', '経理部', '企画部', 'マーケティング部', '製造部', '品質管理部', '法務部', '広報部', '情報システム部', '海外事業部', '研究部', 'カスタマーサポート部'];

  testBtnGenerate.addEventListener('click', () => {
    const pc = parseInt(testPersonCount.value) || 10;
    const oc = parseInt(testOrgCount.value) || 3;
    const usedDepts = [];
    for (let i = 0; i < oc; i++) {
      const idx = i % deptNames.length;
      usedDepts.push(deptNames[idx]);
    }
    const lines = [];
    for (let i = 0; i < pc; i++) {
      const dept = usedDepts[i % oc];
      const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
      const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
      lines.push(dept + '\t' + ln + fn);
    }
    bulkTextarea.value = lines.join('\n');
  });

  // ===== Role Management =====
  btnRoleManage.addEventListener('click', () => {
    renderRoleList();
    roleModal.classList.add('show');
  });

  roleBtnClose.addEventListener('click', () => {
    roleModal.classList.remove('show');
  });

  roleModal.addEventListener('click', (e) => {
    if (e.target === roleModal) roleModal.classList.remove('show');
  });

  roleBtnAdd.addEventListener('click', () => {
    const name = roleAddName.value.trim();
    if (!name) return;
    const role = {
      id: state.nextId++,
      name: name,
      color: roleAddColor.value,
      icon: roleAddIcon.value,
    };
    state.roles.push(role);
    roleAddName.value = '';
    renderRoleList();
    saveState();
    // Update property panel if person selected
    if (state.selectedType === 'person') updatePropsPanel();
  });

  function renderRoleList() {
    roleList.innerHTML = '';
    if (state.roles.length === 0) {
      roleList.innerHTML = '<div style="color:#999;text-align:center;padding:16px;">役割がありません</div>';
      return;
    }
    state.roles.forEach(role => {
      const div = document.createElement('div');
      div.className = 'role-list-item';
      div.innerHTML = `
        <span class="role-badge-preview" style="background:${role.color}20;border:1px solid ${role.color};color:${darkenColor(role.color, 10)}">${role.icon ? role.icon + ' ' : ''}${role.name}</span>
        <div class="role-item-controls">
          <input type="color" value="${role.color}" class="role-color-edit" title="色を変更">
          <select class="role-icon-edit" title="アイコンを変更">
            <option value="" ${!role.icon ? 'selected' : ''}>なし</option>
            <option value="👑" ${role.icon === '👑' ? 'selected' : ''}>👑</option>
            <option value="⭐" ${role.icon === '⭐' ? 'selected' : ''}>⭐</option>
            <option value="🔧" ${role.icon === '🔧' ? 'selected' : ''}>🔧</option>
            <option value="📊" ${role.icon === '📊' ? 'selected' : ''}>📊</option>
            <option value="🎯" ${role.icon === '🎯' ? 'selected' : ''}>🎯</option>
            <option value="💼" ${role.icon === '💼' ? 'selected' : ''}>💼</option>
            <option value="🛡️" ${role.icon === '🛡️' ? 'selected' : ''}>🛡️</option>
            <option value="📝" ${role.icon === '📝' ? 'selected' : ''}>📝</option>
            <option value="🔬" ${role.icon === '🔬' ? 'selected' : ''}>🔬</option>
            <option value="💡" ${role.icon === '💡' ? 'selected' : ''}>💡</option>
          </select>
          <button class="btn btn-danger btn-icon role-delete-btn" title="削除">✕</button>
        </div>`;
      div.querySelector('.role-color-edit').addEventListener('input', (e) => {
        role.color = e.target.value;
        renderRoleList();
        renderPersonList();
        saveState();
        render();
        if (state.selectedType === 'person') updatePropsPanel();
      });
      div.querySelector('.role-icon-edit').addEventListener('change', (e) => {
        role.icon = e.target.value;
        renderRoleList();
        renderPersonList();
        saveState();
        render();
        if (state.selectedType === 'person') updatePropsPanel();
      });
      div.querySelector('.role-delete-btn').addEventListener('click', () => {
        state.roles = state.roles.filter(r => r.id !== role.id);
        // Remove from all persons
        state.persons.forEach(p => {
          if (p.roleIds) p.roleIds = p.roleIds.filter(rid => rid !== role.id);
        });
        renderRoleList();
        renderPersonList();
        saveState();
        render();
        if (state.selectedType === 'person') updatePropsPanel();
      });
      roleList.appendChild(div);
    });
  }

  // ===== LocalStorage =====
  function saveState() {
    const data = {
      persons: state.persons,
      regions: state.regions,
      roles: state.roles,
      connectors: state.connectors,
      textAnnotations: state.textAnnotations,
      nextId: state.nextId,
    };
    try {
      localStorage.setItem('orgchart-state', JSON.stringify(data));
    } catch (e) { /* ignore */ }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem('orgchart-state');
      if (raw) {
        const data = JSON.parse(raw);
        state.persons = data.persons || [];
        state.regions = data.regions || [];
        state.roles = data.roles || [];
        state.connectors = data.connectors || [];
        state.textAnnotations = data.textAnnotations || [];
        state.nextId = data.nextId || 1;
        // Ensure roleIds on persons
        state.persons.forEach(p => { if (!p.roleIds) p.roleIds = []; });
      }
    } catch (e) { /* ignore */ }
  }

  // ===== Context Menu for Connectors =====
  let ctxMenu = null;
  let ctxMenuJustShown = false;
  function hideContextMenu() {
    if (ctxMenu) { ctxMenu.remove(); ctxMenu = null; }
  }
  function showConnectorContextMenu(clientX, clientY, connector) {
    hideContextMenu();
    ctxMenu = document.createElement('div');
    ctxMenu.style.cssText = 'position:fixed;z-index:9999;background:#fff;border:1px solid #c8d8ec;border-radius:4px;box-shadow:0 4px 12px rgba(0,0,0,0.15);padding:4px 0;min-width:120px;font-size:13px;font-family:var(--font-family);';
    ctxMenu.style.left = clientX + 'px';
    ctxMenu.style.top = clientY + 'px';

    const addWpItem = document.createElement('div');
    addWpItem.textContent = '頂点追加';
    addWpItem.style.cssText = 'padding:6px 16px;cursor:pointer;';
    addWpItem.addEventListener('mouseenter', () => addWpItem.style.background = 'rgba(74,138,207,0.1)');
    addWpItem.addEventListener('mouseleave', () => addWpItem.style.background = '');
    addWpItem.addEventListener('click', () => {
      state.addingWaypoints = true;
      hideContextMenu();
      render();
    });
    ctxMenu.appendChild(addWpItem);

    // Delete waypoints option (if waypoints exist)
    if (connector.waypoints && connector.waypoints.length > 0) {
      const clearWpItem = document.createElement('div');
      clearWpItem.textContent = '頂点をすべて削除';
      clearWpItem.style.cssText = 'padding:6px 16px;cursor:pointer;color:#e74c3c;';
      clearWpItem.addEventListener('mouseenter', () => clearWpItem.style.background = 'rgba(231,76,60,0.08)');
      clearWpItem.addEventListener('mouseleave', () => clearWpItem.style.background = '');
      clearWpItem.addEventListener('click', () => {
        pushUndo();
        connector.waypoints = [];
        hideContextMenu();
        saveState();
        render();
      });
      ctxMenu.appendChild(clearWpItem);
    }

    document.body.appendChild(ctxMenu);
    // Prevent the document mousedown listener from immediately closing the menu
    ctxMenuJustShown = true;
    requestAnimationFrame(() => { ctxMenuJustShown = false; });
  }
  document.addEventListener('mousedown', (e) => {
    if (ctxMenu && !ctxMenuJustShown && !ctxMenu.contains(e.target)) hideContextMenu();
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  function showWaypointContextMenu(clientX, clientY, connector, wpIndex) {
    hideContextMenu();
    ctxMenu = document.createElement('div');
    ctxMenu.style.cssText = 'position:fixed;z-index:9999;background:#fff;border:1px solid #c8d8ec;border-radius:4px;box-shadow:0 4px 12px rgba(0,0,0,0.15);padding:4px 0;min-width:120px;font-size:13px;font-family:var(--font-family);';
    ctxMenu.style.left = clientX + 'px';
    ctxMenu.style.top = clientY + 'px';

    const deleteItem = document.createElement('div');
    deleteItem.textContent = '頂点削除';
    deleteItem.style.cssText = 'padding:6px 16px;cursor:pointer;color:#e74c3c;';
    deleteItem.addEventListener('mouseenter', () => deleteItem.style.background = 'rgba(231,76,60,0.08)');
    deleteItem.addEventListener('mouseleave', () => deleteItem.style.background = '');
    deleteItem.addEventListener('click', () => {
      pushUndo();
      connector.waypoints.splice(wpIndex, 1);
      hideContextMenu();
      saveState();
      render();
    });
    ctxMenu.appendChild(deleteItem);

    document.body.appendChild(ctxMenu);
    ctxMenuJustShown = true;
    requestAnimationFrame(() => { ctxMenuJustShown = false; });
  }

  // ===== Search =====
  if (personSearch) {
    personSearch.addEventListener('input', () => {
      state.searchQuery = personSearch.value.trim().toLowerCase();
      renderPersonList();
      render(); // Re-render to highlight matched persons on canvas
    });
  }

  // ===== Text Annotation Tool =====
  if (btnToolText) {
    btnToolText.addEventListener('click', () => setToolActive('text'));
  }

  // Text annotation click on canvas
  canvas.addEventListener('click', (e) => {
    if (state.tool !== 'text') return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);
    // Check if clicking an existing text annotation
    const existingText = state.textAnnotations.find(t => {
      const s = worldToScreen(t.x, t.y);
      const fontSize = (t.fontSize || 14) * state.zoom;
      const lines = (t.text || '').split('\n');
      const w = 150 * state.zoom;
      const h = lines.length * fontSize * 1.3;
      return sx >= s.x && sx <= s.x + w && sy >= s.y && sy <= s.y + h;
    });
    if (existingText) {
      selectItem('text', existingText.id);
    } else {
      pushUndo();
      const t = {
        id: state.nextId++,
        text: '注釈テキスト',
        x: world.x,
        y: world.y,
        fontSize: 9,
        color: '#2c3e50',
      };
      state.textAnnotations.push(t);
      selectItem('text', t.id);
      saveState();
    }
  });

  // Text annotation property handlers
  if (propTextContent) {
    propTextContent.addEventListener('input', () => {
      const t = state.textAnnotations.find(t => t.id === state.selectedId);
      if (t) { t.text = propTextContent.value; saveState(); render(); }
    });
  }
  if (propTextFontsize) {
    propTextFontsize.addEventListener('input', () => {
      const t = state.textAnnotations.find(t => t.id === state.selectedId);
      if (t) { t.fontSize = parseInt(propTextFontsize.value) || 14; saveState(); render(); }
    });
  }
  if (propTextColor) {
    propTextColor.addEventListener('input', () => {
      const t = state.textAnnotations.find(t => t.id === state.selectedId);
      if (t) { t.color = propTextColor.value; saveState(); render(); }
    });
  }

  // ===== Person Detail Field Handlers =====
  if (propEmail) {
    propEmail.addEventListener('input', () => {
      const p = state.persons.find(p => p.id === state.selectedId);
      if (p) { p.email = propEmail.value; saveState(); }
    });
  }
  if (propPhone) {
    propPhone.addEventListener('input', () => {
      const p = state.persons.find(p => p.id === state.selectedId);
      if (p) { p.phone = propPhone.value; saveState(); }
    });
  }
  if (propJoindate) {
    propJoindate.addEventListener('input', () => {
      const p = state.persons.find(p => p.id === state.selectedId);
      if (p) { p.joinDate = propJoindate.value; saveState(); }
    });
  }
  if (propEffectiveDate) {
    propEffectiveDate.addEventListener('input', () => {
      const p = state.persons.find(p => p.id === state.selectedId);
      if (p) { p.effectiveDate = propEffectiveDate.value; saveState(); }
    });
  }
  if (propPhotoUrl) {
    propPhotoUrl.addEventListener('input', () => {
      const p = state.persons.find(p => p.id === state.selectedId);
      if (p) { p.photoUrl = propPhotoUrl.value; saveState(); }
    });
  }

  // ===== Region Color Handler =====
  if (propRegionColor) {
    propRegionColor.addEventListener('input', () => {
      const r = state.regions.find(r => r.id === state.selectedId);
      if (r) { r.color = propRegionColor.value; saveState(); render(); renderPersonList(); }
    });
  }

  // ===== PNG Export =====
  if (btnExportPng) {
    btnExportPng.addEventListener('click', () => {
      // Create an offscreen canvas with white background
      const offCanvas = document.createElement('canvas');
      const scale = 2; // High-res
      offCanvas.width = canvas.width * scale / (window.devicePixelRatio || 1);
      offCanvas.height = canvas.height * scale / (window.devicePixelRatio || 1);
      const offCtx = offCanvas.getContext('2d');
      offCtx.scale(scale, scale);
      // White background
      offCtx.fillStyle = document.body.classList.contains('dark-mode') ? '#1a1a2e' : '#ffffff';
      offCtx.fillRect(0, 0, offCanvas.width, offCanvas.height);
      // Draw the current canvas content
      offCtx.drawImage(canvas, 0, 0, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));
      // Download
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      link.download = `orgchart_${timestamp}.png`;
      link.href = offCanvas.toDataURL('image/png');
      link.click();
    });
  }

  // ===== CSV Import =====
  if (btnImportCsv && csvImportInput) {
    btnImportCsv.addEventListener('click', () => csvImportInput.click());
    csvImportInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target.result;
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        const sep = text.includes('\t') ? '\t' : ',';
        pushUndo();
        const affMap = {};
        lines.forEach((line, idx) => {
          const parts = line.split(sep).map(s => s.trim().replace(/^["']|["']$/g, ''));
          if (parts.length < 2) return;
          const aff = parts[0];
          const name = parts[1];
          const email = parts[2] || '';
          const phone = parts[3] || '';
          if (!affMap[aff]) {
            const regionW = 250;
            const regionH = 150;
            const col = Object.keys(affMap).length;
            const rx = col * (regionW + 40) - 200;
            const ry = -50;
            const region = { id: state.nextId++, name: aff, x: rx, y: ry, w: regionW, h: regionH, color: '#4a8acf' };
            state.regions.push(region);
            affMap[aff] = { region, count: 0 };
          }
          const info = affMap[aff];
          const px = info.region.x + 30 + (info.count % 5) * 45;
          const py = info.region.y + 40 + Math.floor(info.count / 5) * 55;
          addPerson(name, { affiliation: aff, x: px, y: py, email, phone });
          info.count++;
        });
        renderPersonList();
        saveState();
        render();
      };
      reader.readAsText(file);
      csvImportInput.value = '';
    });
  }

  // ===== Print =====
  if (btnPrint) {
    btnPrint.addEventListener('click', () => window.print());
  }

  // ===== Dark Mode =====
  if (btnDarkMode) {
    // Restore dark mode from localStorage
    if (localStorage.getItem('orgchart-darkmode') === 'true') {
      document.body.classList.add('dark-mode');
      btnDarkMode.textContent = '☀️';
    }
    btnDarkMode.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      const isDark = document.body.classList.contains('dark-mode');
      btnDarkMode.textContent = isDark ? '☀️' : '🌙';
      localStorage.setItem('orgchart-darkmode', isDark);
      render();
    });
  }

  // ===== Share URL =====
  if (btnShareUrl) {
    btnShareUrl.addEventListener('click', () => {
      try {
        const data = {
          persons: state.persons,
          regions: state.regions,
          roles: state.roles,
          connectors: state.connectors,
          textAnnotations: state.textAnnotations,
          nextId: state.nextId,
        };
        const json = JSON.stringify(data);
        const encoded = btoa(unescape(encodeURIComponent(json)));
        const url = window.location.href.split('#')[0] + '#data=' + encoded;
        navigator.clipboard.writeText(url).then(() => {
          alert('共有URLをクリップボードにコピーしました！\n（データサイズが大きいとURLが長くなります）');
        }).catch(() => {
          prompt('共有URLをコピーしてください:', url);
        });
      } catch (e) {
        alert('共有URLの生成に失敗しました: ' + e.message);
      }
    });
  }

  // Load from shared URL on init
  function loadFromUrl() {
    const hash = window.location.hash;
    if (hash.startsWith('#data=')) {
      try {
        const encoded = hash.slice(6);
        const json = decodeURIComponent(escape(atob(encoded)));
        const data = JSON.parse(json);
        if (data.persons) state.persons = data.persons;
        if (data.regions) state.regions = data.regions;
        if (data.roles) state.roles = data.roles;
        if (data.connectors) state.connectors = data.connectors;
        if (data.textAnnotations) state.textAnnotations = data.textAnnotations;
        if (data.nextId) state.nextId = data.nextId;
        state.persons.forEach(p => { if (!p.roleIds) p.roleIds = []; });
        saveState();
        renderPersonList();
        render();
        // Clear hash after loading
        history.replaceState(null, '', window.location.pathname);
      } catch (e) { /* ignore invalid URL data */ }
    }
  }

  // ===== Delete text annotations in deleteSelected =====
  const origDeleteSelected = deleteSelected;
  // Patch deleteSelected to handle text annotations
  // (already handles person/region/connector; need to add text)

  // ===== Init =====
  function init() {
    loadState();
    loadFromUrl();
    resizeCanvas();
    renderPersonList();
    window.addEventListener('resize', resizeCanvas);
  }

  init();
})();
