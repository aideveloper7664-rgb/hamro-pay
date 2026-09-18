import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function Lanyard3D() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = containerRef.current;
    if (!wrapper) return;

    let isDisposed = false;
    let animId: number | null = null;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // --- Offscreen Canvas Texture Builders ---
    function roundRect(
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      r: number
    ) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    function drawChip(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
      const g = ctx.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, '#f9e8a8');
      g.addColorStop(0.35, '#dcb757');
      g.addColorStop(0.7, '#b88c2b');
      g.addColorStop(1, '#7d5a12');
      ctx.fillStyle = g;
      roundRect(ctx, x, y, w, h, 9);
      ctx.fill();

      ctx.strokeStyle = 'rgba(90,65,15,0.7)';
      ctx.lineWidth = 1.4;
      const rowH = h / 3;
      ctx.beginPath();
      ctx.moveTo(x, y + rowH); ctx.lineTo(x + w, y + rowH);
      ctx.moveTo(x, y + rowH * 2); ctx.lineTo(x + w, y + rowH * 2);
      ctx.moveTo(x + w * 0.33, y); ctx.lineTo(x + w * 0.33, y + rowH);
      ctx.moveTo(x + w * 0.66, y); ctx.lineTo(x + w * 0.66, y + rowH);
      ctx.moveTo(x + w * 0.33, y + rowH * 2); ctx.lineTo(x + w * 0.33, y + h);
      ctx.moveTo(x + w * 0.66, y + rowH * 2); ctx.lineTo(x + w * 0.66, y + h);
      ctx.stroke();

      ctx.fillStyle = 'rgba(90,65,15,0.32)';
      ctx.fillRect(x + w * 0.33, y + rowH, w * 0.34, rowH);
    }

    function drawHologram(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
      ctx.save();
      const g = ctx.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, 'rgba(255,255,255,0.7)');
      g.addColorStop(0.25, 'rgba(255,200,220,0.6)');
      g.addColorStop(0.5, 'rgba(200,220,255,0.65)');
      g.addColorStop(0.75, 'rgba(255,235,180,0.6)');
      g.addColorStop(1, 'rgba(255,200,220,0.65)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      for (let i = 0; i < 34; i++) {
        const px = x + (i / 34) * w;
        ctx.beginPath();
        ctx.moveTo(px, y);
        ctx.lineTo(px + 12, y + h);
        ctx.stroke();
      }
      ctx.restore();
    }

    function makeCardFront(): HTMLCanvasElement {
      const c = document.createElement('canvas');
      c.width = 640;
      c.height = 920;
      const ctx = c.getContext('2d')!;

      const g = ctx.createLinearGradient(0, 0, 640, 920);
      g.addColorStop(0, '#5c0418');
      g.addColorStop(0.4, '#3a0815');
      g.addColorStop(1, '#0e0206');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 640, 920);

      const rg = ctx.createRadialGradient(520, 100, 0, 520, 100, 500);
      rg.addColorStop(0, 'rgba(255,80,110,0.22)');
      rg.addColorStop(1, 'rgba(255,80,110,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, 640, 920);

      const rg2 = ctx.createRadialGradient(100, 820, 0, 100, 820, 400);
      rg2.addColorStop(0, 'rgba(255,30,75,0.16)');
      rg2.addColorStop(1, 'rgba(255,30,75,0)');
      ctx.fillStyle = rg2;
      ctx.fillRect(0, 0, 640, 920);

      ctx.globalAlpha = 0.035;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      for (let i = -920; i < 640; i += 16) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + 920, 920);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      ctx.strokeStyle = 'rgba(255, 80, 110, 0.35)';
      ctx.lineWidth = 5;
      ctx.strokeRect(3, 3, 634, 914);

      ctx.font = '900 40px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#fff2f4';
      ctx.fillText('Hamro', 48, 90);
      const w1 = ctx.measureText('Hamro').width;
      ctx.fillStyle = '#ff4d6d';
      ctx.fillText('Pay', 48 + w1, 90);

      ctx.strokeStyle = 'rgba(255,235,240,0.85)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.arc(560, 78, 10 + k * 9, -Math.PI / 2.6, Math.PI / 2.6);
        ctx.stroke();
      }

      const bx = 320, by = 300, br = 130;

      const ringG = ctx.createLinearGradient(bx - br, by - br, bx + br, by + br);
      ringG.addColorStop(0, 'rgba(255, 80, 110, 0.85)');
      ringG.addColorStop(0.5, 'rgba(255, 30, 75, 0.35)');
      ringG.addColorStop(1, 'rgba(255, 80, 110, 0.85)');
      ctx.strokeStyle = ringG;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.stroke();

      const innerG = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      innerG.addColorStop(0, 'rgba(255, 60, 95, 0.22)');
      innerG.addColorStop(1, 'rgba(255, 30, 75, 0.04)');
      ctx.fillStyle = innerG;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fff2f4';
      ctx.shadowColor = 'rgba(255, 80, 110, 0.7)';
      ctx.shadowBlur = 26;

      ctx.beginPath();
      ctx.arc(bx, by - 32, 40, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(bx - 74, by + 82);
      ctx.quadraticCurveTo(bx - 74, by + 22, bx - 36, by + 22);
      ctx.lineTo(bx + 36, by + 22);
      ctx.quadraticCurveTo(bx + 74, by + 22, bx + 74, by + 82);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.textAlign = 'center';
      ctx.font = '700 22px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255, 180, 200, 0.8)';
      if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '9px';
      ctx.fillText('MERCHANT ID', bx, 520);
      if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '0px';

      ctx.font = '900 60px "SF Mono", "Courier New", ui-monospace, monospace';
      ctx.fillStyle = '#fff5f7';
      ctx.shadowColor = 'rgba(255, 120, 140, 0.6)';
      ctx.shadowBlur = 16;
      ctx.fillText('HP-2026-8824', bx, 596);
      ctx.shadowBlur = 0;

      ctx.font = '800 16px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(43, 242, 154, 0.85)';
      if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '5px';
      ctx.fillText('\u2713  VERIFIED MERCHANT', bx, 646);
      if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '0px';
      ctx.textAlign = 'left';

      drawChip(ctx, 48, 700, 100, 74);
      drawHologram(ctx, 480, 702, 112, 76);

      ctx.font = '700 14px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255, 180, 200, 0.55)';
      if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '4px';
      ctx.fillText('HAMROPAY MERCHANT SERVICES', 48, 856);
      if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '0px';

      return c;
    }

    function makeCardBack(): HTMLCanvasElement {
      const c = document.createElement('canvas');
      c.width = 640;
      c.height = 920;
      const ctx = c.getContext('2d')!;

      const g = ctx.createLinearGradient(0, 0, 640, 920);
      g.addColorStop(0, '#3a0815');
      g.addColorStop(1, '#0e0206');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 640, 920);

      ctx.fillStyle = '#0a0204';
      ctx.fillRect(0, 110, 640, 110);

      ctx.fillStyle = '#e8dcd8';
      ctx.fillRect(50, 320, 540, 90);

      ctx.fillStyle = '#4a3035';
      ctx.font = 'italic 700 40px "Brush Script MT", cursive, serif';
      ctx.fillText('HamroPay Merchant', 76, 380);

      ctx.font = '700 14px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,200,210,0.7)';
      if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '3px';
      ctx.fillText('CVV', 470, 470);
      if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '0px';
      ctx.font = '700 28px "Courier New", monospace';
      ctx.fillStyle = '#fff2f4';
      ctx.fillText('824', 470, 508);

      ctx.font = '500 13px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,200,210,0.6)';
      [
        'This merchant card is issued by HamroPay Inc.',
        'pursuant to a license from VISA. Use is subject',
        'to the merchant agreement. If found, please',
        'return to any HamroPay branch or call 1-800-HAMROPAY.'
      ].forEach((line, i) => {
        ctx.fillText(line, 50, 590 + i * 24);
      });

      ctx.font = '900 30px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#fff2f4';
      ctx.fillText('Hamro', 50, 800);
      const w = ctx.measureText('Hamro').width;
      ctx.fillStyle = '#ff4d6d';
      ctx.fillText('Pay', 50 + w, 800);

      ctx.strokeStyle = 'rgba(255, 80, 110, 0.3)';
      ctx.lineWidth = 5;
      ctx.strokeRect(3, 3, 634, 914);

      return c;
    }

    // --- Scene Setup ---
    const initialW = wrapper.clientWidth || 1100;
    const initialH = wrapper.clientHeight || 1100;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, initialW / initialH, 0.1, 100);
    camera.position.set(0, 0.1, 16.5);
    camera.lookAt(0, -0.75, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(initialW, initialH);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    wrapper.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(2, 6, 6);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xff3a5c, 1.8);
    rimLight.position.set(-3, 1, -3);
    scene.add(rimLight);
    const fillLight = new THREE.DirectionalLight(0x8aa0ff, 0.65);
    fillLight.position.set(0, -3, 3);
    scene.add(fillLight);
    const backLight = new THREE.DirectionalLight(0xffffff, 0.9);
    backLight.position.set(0, 2, -5);
    scene.add(backLight);

    // Rope Physics
    const ANCHOR = new THREE.Vector3(0, 4.2, 0);
    const NUM_POINTS = 10;
    const ROPE_LEN = 2.6;
    const SEG_LEN = ROPE_LEN / (NUM_POINTS - 1);
    const GRAVITY = -14;
    const DAMP = 0.982;

    const points: THREE.Vector3[] = [];
    const prevPoints: THREE.Vector3[] = [];
    for (let i = 0; i < NUM_POINTS; i++) {
      const p = new THREE.Vector3(ANCHOR.x, ANCHOR.y - i * SEG_LEN, 0);
      points.push(p);
      prevPoints.push(p.clone());
    }

    // Band Curve & Tube Geometry
    const bandCurve = new THREE.CatmullRomCurve3(points.map((p) => p.clone()));
    bandCurve.curveType = 'chordal';
    bandCurve.tension = 0.5;

    const TUBULAR_SEGMENTS = 26;
    const RADIAL_SEGMENTS = 8;
    const TUBE_RADIUS = 0.088;

    const bandMat = new THREE.MeshStandardMaterial({
      color: 0xd4002e,
      roughness: 0.65,
      metalness: 0.05,
      emissive: 0x330004,
      emissiveIntensity: 0.5
    });

    let bandGeometry = new THREE.TubeGeometry(
      bandCurve,
      TUBULAR_SEGMENTS,
      TUBE_RADIUS,
      RADIAL_SEGMENTS,
      false
    );
    const bandMesh = new THREE.Mesh(bandGeometry, bandMat);
    scene.add(bandMesh);

    // Cap at anchor
    const capGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.22, 16);
    const capMat = new THREE.MeshStandardMaterial({ color: 0x2a0308, roughness: 0.4, metalness: 0.7 });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.copy(ANCHOR);
    scene.add(cap);

    // 3D Card
    const CARD_W = 2.15;
    const CARD_H = 3.05;
    const CARD_D = 0.075;

    const frontCanvas = makeCardFront();
    const backCanvas = makeCardBack();

    const frontTex = new THREE.CanvasTexture(frontCanvas);
    frontTex.colorSpace = THREE.SRGBColorSpace;
    frontTex.generateMipmaps = true;

    const backTex = new THREE.CanvasTexture(backCanvas);
    backTex.colorSpace = THREE.SRGBColorSpace;
    backTex.generateMipmaps = true;

    const sideMat = new THREE.MeshPhysicalMaterial({
      color: 0x1a0409,
      roughness: 0.5,
      metalness: 0.3
    });
    const frontMat = new THREE.MeshPhysicalMaterial({
      map: frontTex,
      roughness: 0.32,
      metalness: 0.15,
      clearcoat: 0.9,
      clearcoatRoughness: 0.15
    });
    const backMat = new THREE.MeshPhysicalMaterial({
      map: backTex,
      roughness: 0.55,
      metalness: 0.05
    });

    const cardGeo = new THREE.BoxGeometry(CARD_W, CARD_H, CARD_D);
    const cardMesh = new THREE.Mesh(cardGeo, [
      sideMat,
      sideMat,
      sideMat,
      sideMat,
      frontMat,
      backMat
    ]);

    const cardGroup = new THREE.Group();
    cardGroup.add(cardMesh);
    scene.add(cardGroup);

    const clipGeo = new THREE.BoxGeometry(0.27, 0.14, 0.16);
    const clipMat = new THREE.MeshStandardMaterial({ color: 0x2a0308, roughness: 0.4, metalness: 0.7 });
    const clip = new THREE.Mesh(clipGeo, clipMat);
    clip.position.set(0, CARD_H / 2 + 0.05, 0);
    cardGroup.add(clip);

    // Card orientation math
    const cardQuat = new THREE.Quaternion();
    const tmpUp = new THREE.Vector3(0, 1, 0);
    const tmpRopeDir = new THREE.Vector3();
    const tmpTarget = new THREE.Vector3();
    const tmpQuat = new THREE.Quaternion();
    const clipLocal = new THREE.Vector3(0, CARD_H / 2, 0);
    const clipWorldOffset = new THREE.Vector3();

    // Interaction state
    let dragging = false;
    const dragTarget = new THREE.Vector3();
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const raycaster = new THREE.Raycaster();
    const pointerNDC = new THREE.Vector2();
    let lastHover = false;
    let hoverRAF: number | null = null;

    wrapper.style.pointerEvents = 'none';

    function updateNDC(clientX: number, clientY: number) {
      const rect = wrapper!.getBoundingClientRect();
      pointerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    }

    function intersectsCard(clientX: number, clientY: number): boolean {
      updateNDC(clientX, clientY);
      raycaster.setFromCamera(pointerNDC, camera);
      return raycaster.intersectObject(cardMesh).length > 0;
    }

    const onPointerMoveDoc = (e: PointerEvent) => {
      if (dragging) return;
      const rect = wrapper.getBoundingClientRect();
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        if (lastHover) {
          lastHover = false;
          wrapper.style.pointerEvents = 'none';
          wrapper.style.cursor = 'default';
        }
        return;
      }

      if (hoverRAF) cancelAnimationFrame(hoverRAF);
      hoverRAF = requestAnimationFrame(() => {
        const hover = intersectsCard(e.clientX, e.clientY);
        if (hover !== lastHover) {
          lastHover = hover;
          wrapper.style.pointerEvents = hover ? 'auto' : 'none';
          wrapper.style.cursor = hover ? 'grab' : 'default';
        }
      });
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!intersectsCard(e.clientX, e.clientY)) return;
      dragging = true;
      wrapper.classList.add('grabbing');
      try {
        wrapper.setPointerCapture(e.pointerId);
      } catch {}
      raycaster.setFromCamera(pointerNDC, camera);
      raycaster.ray.intersectPlane(dragPlane, dragTarget);
      e.preventDefault();
    };

    const onPointerMoveWrapper = (e: PointerEvent) => {
      if (!dragging) return;
      updateNDC(e.clientX, e.clientY);
      raycaster.setFromCamera(pointerNDC, camera);
      raycaster.ray.intersectPlane(dragPlane, dragTarget);
    };

    const onPointerUp = () => {
      if (!dragging) return;
      dragging = false;
      wrapper.classList.remove('grabbing');
      wrapper.style.cursor = 'grab';
    };

    document.addEventListener('pointermove', onPointerMoveDoc, { passive: true });
    wrapper.addEventListener('pointerdown', onPointerDown);
    wrapper.addEventListener('pointermove', onPointerMoveWrapper);
    wrapper.addEventListener('pointerup', onPointerUp);
    wrapper.addEventListener('pointercancel', onPointerUp);

    // Resize Handler
    const onResize = () => {
      if (isDisposed || !wrapper) return;
      const nw = wrapper.clientWidth || 1100;
      const nh = wrapper.clientHeight || 1100;
      renderer.setSize(nw, nh, false);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    // Tube vertex update in-place for ZERO LAG (no allocation per frame)
    const normalVec = new THREE.Vector3();
    const PVec = new THREE.Vector3();

    function updateTubeInPlace() {
      // Update the CatmullRom control points
      for (let i = 0; i < NUM_POINTS; i++) {
        bandCurve.points[i].copy(points[i]);
      }

      const frames = bandCurve.computeFrenetFrames(TUBULAR_SEGMENTS, false);
      const posAttr = bandMesh.geometry.attributes.position;
      let idx = 0;

      for (let i = 0; i <= TUBULAR_SEGMENTS; i++) {
        const u = i / TUBULAR_SEGMENTS;
        bandCurve.getPointAt(u, PVec);
        const N = frames.normals[i];
        const B = frames.binormals[i];

        for (let j = 0; j <= RADIAL_SEGMENTS; j++) {
          const v = (j / RADIAL_SEGMENTS) * Math.PI * 2;
          const sin = Math.sin(v);
          const cos = -Math.cos(v);

          normalVec.x = cos * N.x + sin * B.x;
          normalVec.y = cos * N.y + sin * B.y;
          normalVec.z = cos * N.z + sin * B.z;
          normalVec.normalize();

          posAttr.setXYZ(
            idx,
            PVec.x + TUBE_RADIUS * normalVec.x,
            PVec.y + TUBE_RADIUS * normalVec.y,
            PVec.z + TUBE_RADIUS * normalVec.z
          );
          idx++;
        }
      }

      posAttr.needsUpdate = true;
      bandMesh.geometry.computeVertexNormals();
    }

    // Physics Engine
    function updatePhysics(dt: number) {
      if (prefersReducedMotion) {
        for (let i = 0; i < NUM_POINTS; i++) {
          points[i].set(ANCHOR.x, ANCHOR.y - i * SEG_LEN, 0);
        }
        return;
      }

      for (let i = 1; i < NUM_POINTS; i++) {
        const p = points[i];
        const pr = prevPoints[i];
        const vx = (p.x - pr.x) * DAMP;
        const vy = (p.y - pr.y) * DAMP;
        const vz = (p.z - pr.z) * DAMP;
        pr.copy(p);
        p.x += vx;
        p.y += vy + GRAVITY * dt * dt;
        p.z += vz;
      }

      if (dragging) {
        const last = points[NUM_POINTS - 1];
        const lastPrev = prevPoints[NUM_POINTS - 1];
        lastPrev.copy(last);
        last.lerp(dragTarget, 0.45);
      }

      points[0].copy(ANCHOR);
      const iters = prefersReducedMotion ? 2 : 10;
      for (let it = 0; it < iters; it++) {
        for (let s = 0; s < NUM_POINTS - 1; s++) {
          const a = points[s];
          const b = points[s + 1];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dz = b.z - a.z;
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (d < 1e-6) continue;
          const diff = (d - SEG_LEN) / d;
          if (s > 0) {
            a.x += dx * diff * 0.5;
            a.y += dy * diff * 0.5;
            a.z += dz * diff * 0.5;
          }
          b.x -= dx * diff * 0.5;
          b.y -= dy * diff * 0.5;
          b.z -= dz * diff * 0.5;
        }
        points[0].copy(ANCHOR);
      }
    }

    function updateCard() {
      const clipPos = points[NUM_POINTS - 1];

      tmpRopeDir.subVectors(points[NUM_POINTS - 1], points[NUM_POINTS - 2]);
      if (tmpRopeDir.lengthSq() < 1e-8) tmpRopeDir.set(0, -1, 0);
      tmpRopeDir.normalize();

      tmpTarget.copy(tmpRopeDir).negate();
      tmpQuat.setFromUnitVectors(tmpUp, tmpTarget);

      if (prefersReducedMotion) {
        cardQuat.copy(tmpQuat);
      } else {
        cardQuat.slerp(tmpQuat, 0.22);
      }

      clipWorldOffset.copy(clipLocal).applyQuaternion(cardQuat);
      cardGroup.position.copy(clipPos).sub(clipWorldOffset);
      cardGroup.quaternion.copy(cardQuat);
    }

    // Visibility Observer to save GPU/battery when offscreen
    let isVisible = true;
    const observer = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.05 }
    );
    observer.observe(wrapper);

    // Initial nudge for natural swing
    points[NUM_POINTS - 1].x += 0.22;

    const clock = new THREE.Clock();

    function renderLoop() {
      if (isDisposed) return;
      animId = requestAnimationFrame(renderLoop);

      if (!isVisible) return; // Zero GPU work when off-screen

      const dt = Math.min(clock.getDelta(), 0.033);

      updatePhysics(dt);
      updateCard();
      updateTubeInPlace();

      renderer.render(scene, camera);
    }

    renderLoop();

    return () => {
      isDisposed = true;
      observer.disconnect();
      if (animId) cancelAnimationFrame(animId);
      if (hoverRAF) cancelAnimationFrame(hoverRAF);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('pointermove', onPointerMoveDoc);
      wrapper.removeEventListener('pointerdown', onPointerDown);
      wrapper.removeEventListener('pointermove', onPointerMoveWrapper);
      wrapper.removeEventListener('pointerup', onPointerUp);
      wrapper.removeEventListener('pointercancel', onPointerUp);

      // Clean up Three resources
      renderer.dispose();
      bandGeometry.dispose();
      bandMat.dispose();
      capGeo.dispose();
      capMat.dispose();
      cardGeo.dispose();
      clipGeo.dispose();
      clipMat.dispose();
      frontTex.dispose();
      backTex.dispose();
      frontMat.dispose();
      backMat.dispose();
      sideMat.dispose();

      if (renderer.domElement.parentNode === wrapper) {
        wrapper.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="lanyard-wrapper"
      id="lanyardWrap"
      aria-label="HamroPay merchant card on lanyard"
    />
  );
}
