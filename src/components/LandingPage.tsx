import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import Lanyard3D from './Lanyard3D';
import RollingCounter from './RollingCounter';

interface LandingPageProps {
  onOpenAuth: (mode?: 'login' | 'signup') => void;
}

export default function LandingPage({ onOpenAuth }: LandingPageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const brandLoopRef = useRef<HTMLDivElement>(null);
  const bubbleMenuRef = useRef<HTMLDivElement>(null);

  // --- 1. TextLoop Wave Ribbon Animation ---
  useEffect(() => {
    if (!brandLoopRef.current) return;
    const root = brandLoopRef.current;
    root.innerHTML = '';

    const SVG_NS = 'http://www.w3.org/2000/svg';
    const XLINK_NS = 'http://www.w3.org/1999/xlink';
    const VIEW_W = 1200, VIEW_H = 520;
    const CX = VIEW_W / 2, CY = VIEW_H / 2;

    const curviness = 55;
    const a = curviness * 2.2;
    const pathD = `M -320 ${CY} Q -160 ${CY - a} 0 ${CY} T 320 ${CY} T 640 ${CY} T 960 ${CY} T 1280 ${CY} T ${VIEW_W + 320} ${CY}`;

    const uid = 'brand-wave-' + Math.random().toString(36).slice(2, 8);

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'text-loop-svg');
    svg.setAttribute('viewBox', `0 0 ${VIEW_W} ${VIEW_H}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'HamroPay Payments Made Simple');

    const pathEl = document.createElementNS(SVG_NS, 'path');
    pathEl.setAttribute('id', uid);
    pathEl.setAttribute('d', pathD);
    pathEl.setAttribute('fill', 'none');
    pathEl.setAttribute('stroke', '#ff1e4b');
    pathEl.setAttribute('stroke-width', '88');
    pathEl.setAttribute('stroke-linecap', 'round');
    pathEl.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(pathEl);

    const textStyleStr = 'font-size:42px;font-weight:800;letter-spacing:5px;word-spacing:8px;font-family:Inter,system-ui,-apple-system,sans-serif;';
    const measureEl = document.createElementNS(SVG_NS, 'text');
    measureEl.setAttribute('class', 'text-loop-measure');
    measureEl.setAttribute('aria-hidden', 'true');
    measureEl.setAttribute('style', textStyleStr);
    svg.appendChild(measureEl);

    function makeTextNode() {
      const t = document.createElementNS(SVG_NS, 'text');
      t.setAttribute('class', 'text-loop-text');
      t.setAttribute('style', textStyleStr);
      t.setAttribute('fill', '#fff2f4');
      t.setAttribute('dominant-baseline', 'central');
      t.setAttribute('aria-hidden', 'true');
      t.setAttribute('lengthAdjust', 'spacing');
      const tp = document.createElementNS(SVG_NS, 'textPath');
      tp.setAttribute('href', '#' + uid);
      tp.setAttributeNS(XLINK_NS, 'xlink:href', '#' + uid);
      tp.setAttribute('startOffset', '0');
      t.appendChild(tp);
      svg.appendChild(t);
      return { text: t, tp };
    }

    const head = makeTextNode();
    const tail = makeTextNode();
    root.appendChild(svg);

    // Generous gap between words and wide separator between phrase repetitions
    const separator = '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0✦\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0';
    const unit = 'HAMROPAY \u00A0PAYMENTS \u00A0MADE \u00A0SIMPLE' + separator;
    measureEl.textContent = unit;

    let len = 0;
    let tween: gsap.core.Tween | null = null;
    const state = { offset: 0 };

    function apply(offset: number) {
      const partner = offset >= 0 ? offset - len : offset + len;
      head.tp.setAttribute('startOffset', String(offset));
      tail.tp.setAttribute('startOffset', String(partner));
    }

    function layout() {
      try {
        len = pathEl.getTotalLength();
        const unitWidth = measureEl.getComputedTextLength();
        if (!len || !unitWidth) return;
        // Exact number of whole repetitions along path length to avoid squashing
        const reps = Math.max(1, Math.round(len / unitWidth));
        const loopText = unit.repeat(reps);
        head.tp.textContent = loopText;
        tail.tp.textContent = loopText;
        head.text.setAttribute('textLength', String(len));
        tail.text.setAttribute('textLength', String(len));
        head.text.setAttribute('lengthAdjust', 'spacing');
        tail.text.setAttribute('lengthAdjust', 'spacing');
        apply(0);

        if (tween) tween.kill();
        state.offset = 0;
        tween = gsap.to(state, {
          offset: len,
          duration: len / 95,
          ease: 'none',
          repeat: -1,
          onUpdate: () => apply(state.offset)
        });
      } catch (e) {
        // SVG geometry not ready
      }
    }

    layout();
    const timer = setTimeout(layout, 150);
    window.addEventListener('resize', layout);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', layout);
      if (tween) tween.kill();
    };
  }, []);

  // --- 2. BubbleMenu Navigation ---
  useEffect(() => {
    if (!bubbleMenuRef.current) return;
    const root = bubbleMenuRef.current;
    root.innerHTML = '';

    const HP_ITEMS = [
      { label: 'Home', href: '#home', rotation: -6, hoverBg: 'rgba(255, 30, 75, 0.18)', hoverColor: '#ff94a7' },
      { label: 'Features', href: '#features', rotation: 6, hoverBg: 'rgba(255, 30, 75, 0.18)', hoverColor: '#ff94a7' },
      { label: 'Pricing', href: '#stats', rotation: 6, hoverBg: 'rgba(255, 30, 75, 0.18)', hoverColor: '#ff94a7' },
      { label: 'Developers', href: '#developers', rotation: -6, hoverBg: 'rgba(255, 30, 75, 0.18)', hoverColor: '#ff94a7' },
      { label: 'Docs', href: '#docs', rotation: 6, hoverBg: 'rgba(255, 30, 75, 0.18)', hoverColor: '#ff94a7' }
    ];

    let isOpen = false;
    const bubbles: HTMLElement[] = [];
    const labels: HTMLElement[] = [];

    const nav = document.createElement('nav');
    nav.className = 'bubble-menu hp-bubble-menu fixed';
    nav.setAttribute('aria-label', 'Quick navigation');

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'bubble toggle-bubble menu-btn';
    toggle.setAttribute('aria-label', 'Toggle quick navigation');
    const line1 = document.createElement('span');
    line1.className = 'menu-line';
    const line2 = document.createElement('span');
    line2.className = 'menu-line short';
    toggle.appendChild(line1);
    toggle.appendChild(line2);
    nav.appendChild(toggle);
    root.appendChild(nav);

    const overlay = document.createElement('div');
    overlay.className = 'bubble-menu-items hp-bubble-menu-items fixed';
    overlay.style.display = 'none';

    const ul = document.createElement('ul');
    ul.className = 'pill-list';

    HP_ITEMS.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'pill-col';

      const a = document.createElement('a');
      a.className = 'pill-link';
      a.href = item.href;
      a.style.setProperty('--item-rot', item.rotation + 'deg');
      a.style.setProperty('--pill-bg', 'rgba(22, 6, 9, 0.9)');
      a.style.setProperty('--pill-color', '#fff2f4');
      a.style.setProperty('--hover-bg', item.hoverBg);
      a.style.setProperty('--hover-color', item.hoverColor);

      const label = document.createElement('span');
      label.className = 'pill-label';
      label.textContent = item.label;
      a.appendChild(label);
      li.appendChild(a);
      ul.appendChild(li);
      bubbles.push(a);
      labels.push(label);
    });
    overlay.appendChild(ul);
    root.appendChild(overlay);

    function openMenu() {
      isOpen = true;
      overlay.style.display = 'flex';
      toggle.classList.add('open');
      gsap.killTweensOf([...bubbles, ...labels]);
      gsap.set(bubbles, { scale: 0, transformOrigin: '50% 50%' });
      gsap.set(labels, { y: 24, autoAlpha: 0 });
      bubbles.forEach((bubble, i) => {
        const delay = i * 0.08 + (Math.random() * 0.06 - 0.03);
        const tl = gsap.timeline({ delay });
        tl.to(bubble, { scale: 1, duration: 0.5, ease: 'back.out(1.5)' });
        if (labels[i]) {
          tl.to(labels[i], { y: 0, autoAlpha: 1, duration: 0.45, ease: 'power3.out' }, '-=0.4');
        }
      });
    }

    function closeMenu() {
      isOpen = false;
      toggle.classList.remove('open');
      gsap.killTweensOf([...bubbles, ...labels]);
      gsap.to(labels, { y: 24, autoAlpha: 0, duration: 0.2, ease: 'power3.in' });
      gsap.to(bubbles, {
        scale: 0,
        duration: 0.2,
        ease: 'power3.in',
        onComplete: () => {
          overlay.style.display = 'none';
        }
      });
    }

    toggle.addEventListener('click', () => {
      if (isOpen) closeMenu();
      else openMenu();
    });

    bubbles.forEach((b) => {
      b.addEventListener('click', () => {
        setTimeout(closeMenu, 180);
      });
    });

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) closeMenu();
    };
    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  return (
    <div className="hamropay-landing-wrapper selection:bg-rose-600 selection:text-white">
      {/* Scoped CSS styling for exact landing page clone */}
      <style>{`
        :root {
          --bg: #0b0204;
          --bg-card: rgba(22, 6, 9, 0.75);
          --card-border: rgba(255, 45, 85, 0.2);
          --card-border-hover: rgba(255, 60, 95, 0.55);
          --text: #fff2f4;
          --muted: #b89fa5;
          --red-primary: #ff1e4b;
          --red-glow: rgba(255, 30, 75, 0.4);
          --red-light: #ff4d6d;
          --red-dark: #380a13;
          --gold: #ffb834;
          --green: #2bf29a;
          --radius: 20px;
        }

        .hamropay-landing-wrapper {
          background: 
            radial-gradient(circle at 85% 15%, rgba(255, 30, 75, 0.16), transparent 28%),
            radial-gradient(circle at 15% 30%, rgba(180, 10, 40, 0.15), transparent 25%),
            linear-gradient(180deg, #070102 0%, #0d0305 45%, #120306 100%);
          color: var(--text);
          min-height: 100vh;
          font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          position: relative;
          overflow-x: hidden;
        }

        .container { width: min(1200px, 92%); margin: auto; }

        /* Ambient Glows */
        .glow {
          position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.35; pointer-events: none; z-index: 0;
        }
        .g1 { width: 360px; height: 360px; background: #ff1e4b; right: 0%; top: 60px; }
        .g2 { width: 300px; height: 300px; background: #8b0021; left: -80px; top: 280px; }

        /* Header & Nav */
        .hp-header {
          position: sticky; top: 0; z-index: 100;
          width: 100%; max-width: 100%;
          box-sizing: border-box;
          background: rgba(11, 2, 4, 0.88);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--card-border);
        }
        .hp-nav {
          height: 70px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          width: 100%;
          box-sizing: border-box;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          z-index: 2;
          text-decoration: none;
          color: inherit;
          flex-shrink: 0;
          min-width: max-content;
        }
        .brand-logo {
          width: 38px; height: 38px;
          object-fit: contain; border-radius: 10px;
          background: rgba(255,255,255,0.04); padding: 2px;
          border: 1px solid rgba(255,45,85,0.3);
          box-shadow: 0 0 15px rgba(255,30,75,0.25);
          flex-shrink: 0;
        }
        .brand-text {
          display: flex;
          flex-direction: column;
          justify-content: center;
          flex-shrink: 0;
        }
        .brand-text strong {
          font-size: 22px;
          font-weight: 900;
          letter-spacing: -0.4px;
          white-space: nowrap;
          line-height: 1.1;
          display: block;
          flex-shrink: 0;
          color: #fff;
        }
        .brand-text span {
          display: block;
          font-size: 8.5px;
          letter-spacing: 2.2px;
          color: var(--muted);
          font-weight: 600;
          white-space: nowrap;
          line-height: 1.2;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .brand-text b { color: var(--red-primary); }

        .links { display: flex; gap: 32px; font-size: 14px; color: #d8c3c7; font-weight: 500; align-items: center; flex-shrink: 1; }
        .links a { transition: color .2s ease; text-decoration: none; color: inherit; white-space: nowrap; }
        .links a:hover, .links a.active { color: #ff5e7e; }

        .nav-btn {
          padding: 10px 18px; border-radius: 999px;
          background: linear-gradient(135deg, #ff1e4b 0%, #d8002f 100%);
          color: #fff; font-weight: 700; font-size: 13px;
          line-height: 1;
          box-shadow: 0 0 24px rgba(255, 30, 75, 0.4);
          transition: transform .2s ease, box-shadow .2s ease;
          border: none; cursor: pointer; text-decoration: none;
          display: inline-flex; align-items: center; justify-content: center;
          white-space: nowrap; flex-shrink: 0;
        }
        .nav-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 0 32px rgba(255, 30, 75, 0.6);
        }
        .nav-signin-btn {
          padding: 8px 16px; border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 45, 85, 0.3);
          color: #fff; font-size: 13px; font-weight: 700;
          line-height: 1;
          cursor: pointer; transition: all .2s ease;
          white-space: nowrap; flex-shrink: 0;
        }
        .nav-signin-btn:hover {
          background: rgba(255, 30, 75, 0.15); border-color: #ff3b64;
        }
        .menu-btn-mobile {
          display: none; background: #1a070a; border: 1px solid var(--card-border);
          color: #fff; padding: 8px 12px; border-radius: 10px; cursor: pointer;
          white-space: nowrap; flex-shrink: 0; line-height: 1;
        }

        /* Hero Section */
        .hero { position: relative; padding: 80px 0 50px; }
        .hero-grid { display: grid; grid-template-columns: 1.05fr 1fr; gap: 45px; align-items: center; }
        
        .eyebrow {
          display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 999px;
          background: rgba(255, 30, 75, 0.08); border: 1px solid rgba(255, 45, 85, 0.3);
          color: #ff94a7; font-size: 13px; font-weight: 600; margin-bottom: 24px;
        }
        .dot { width: 8px; height: 8px; border-radius: 50%; background: #ff2853; box-shadow: 0 0 12px #ff1e4b; animation: pulseDot 2s infinite; }
        @keyframes pulseDot { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

        .hero h1 {
          font-size: clamp(38px, 5.2vw, 68px);
          line-height: 1.15;
          letter-spacing: -1.5px;
          font-weight: 900;
          margin-bottom: 20px;
          color: #fff;
        }
        .hero h1 .grad {
          background: linear-gradient(90deg, #ff2e59 0%, #ff7350 50%, #ffa463 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          display: inline-block;
        }
        
        .hero p {
          color: var(--muted);
          font-size: 17px;
          line-height: 1.7;
          max-width: 540px;
          margin-bottom: 34px;
        }

        .actions { display: flex; gap: 15px; flex-wrap: wrap; }
        .btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 15px 26px; border-radius: 14px; font-weight: 800; font-size: 14px;
          transition: all .25s ease; cursor: pointer; border: none; text-decoration: none;
        }
        .btn.primary {
          background: linear-gradient(135deg, #ff1e4b, #d90429);
          box-shadow: 0 8px 30px rgba(255, 30, 75, 0.35);
          color: #fff;
        }
        .btn.primary:hover { transform: translateY(-2px); box-shadow: 0 10px 38px rgba(255,30,75,.5); }
        .btn.ghost {
          background: rgba(28, 8, 12, 0.7);
          border: 1px solid var(--card-border);
          color: #ffd6dc;
        }
        .btn.ghost:hover { background: rgba(48,12,19,0.9); border-color: #ff3b64; }

        /* Hero Art & Interactive Elements */
        .hero-art {
          position: relative;
          min-height: 700px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: visible;
        }

        .dash {
          width: 100%;
          max-width: 530px;
          background: linear-gradient(160deg, rgba(35, 9, 14, 0.94), rgba(16, 3, 6, 0.96));
          border: 1px solid rgba(255, 50, 90, 0.28);
          border-radius: 26px;
          padding: 22px;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(255, 30, 75, 0.12);
          backdrop-filter: blur(14px);
          position: relative;
          z-index: 1;
        }
        .dash-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
        .mini-brand { font-weight: 900; font-size: 15px; display: flex; align-items: center; gap: 7px; }
        .mini-brand b { color: var(--red-primary); }
        .status {
          font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: 999px;
          background: rgba(43,242,154,0.12); color: #2bf29a; border: 1px solid rgba(43,242,154,0.3);
        }

        .dash-grid { display: grid; grid-template-columns: 1.08fr 0.92fr; gap: 14px; }
        .panel {
          background: rgba(14, 3, 6, 0.85);
          border: 1px solid rgba(255, 45, 85, 0.16);
          border-radius: 18px; padding: 16px;
        }
        .label { font-size: 11px; color: var(--muted); font-weight: 600; }
        .balance { font-size: 27px; font-weight: 900; margin-top: 5px; letter-spacing: -0.5px; color: #fff; }
        .rise { font-size: 11px; color: var(--green); font-weight: 700; margin-top: 6px; }
        
        .chart { height: 105px; margin-top: 10px; position: relative; overflow: hidden; }
        .chart svg { width: 100%; height: 100%; }

        .tx-title { font-size: 12px; font-weight: 800; margin-bottom: 12px; color: #fce4e8; }
        .tx { display: flex; align-items: center; justify-content: space-between; gap: 10px; border-top: 1px solid rgba(255,255,255,0.05); padding: 10px 0; }
        .tx:first-of-type { border-top: 0; padding-top: 0; }
        .tx-left { display: flex; gap: 10px; align-items: center; }
        .tx-icon { width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; background: rgba(255,30,75,0.15); color: #ff4d6d; font-weight: 900; font-size: 12px; }
        .tx-left small { display: block; color: var(--muted); font-size: 9px; margin-top: 2px; }
        .tx-left b { font-size: 11px; }
        .success { color: #2bf29a; font-size: 10px; font-weight: 800; }

        /* ============ LANYARD 3D ============ */
        .lanyard-wrapper {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 1100px;
          height: 1100px;
          pointer-events: auto;
          z-index: 10;
          cursor: grab;
          user-select: none;
        }
        .lanyard-wrapper canvas {
          display: block;
          width: 100% !important;
          height: 100% !important;
          pointer-events: auto;
        }
        .lanyard-wrapper.grabbing {
          cursor: grabbing;
        }

        .success-card {
          position: absolute; right: 0px; bottom: -15px; width: 240px; padding: 15px; border-radius: 18px;
          background: rgba(22, 6, 9, 0.96);
          border: 1px solid rgba(43, 242, 154, 0.45);
          box-shadow: 0 15px 35px rgba(0,0,0,0.6);
          display: flex; align-items: center; gap: 12px;
          z-index: 6;
        }
        .check {
          width: 34px; height: 34px; border-radius: 50%; background: rgba(43,242,154,0.15);
          color: #2bf29a; display: grid; place-items: center; font-weight: 900; font-size: 16px; flex-shrink: 0;
        }
        .success-card b { font-size: 12px; display: block; color: #fff; }
        .success-card .label { font-size: 10px; margin-top: 1px; }

        .qr-card {
          position: absolute; right: -15px; top: 20px; width: 125px; padding: 12px; border-radius: 16px;
          background: rgba(22, 6, 9, 0.96);
          border: 1px solid rgba(255, 50, 90, 0.35);
          text-align: center; box-shadow: 0 15px 35px rgba(0,0,0,0.6);
          z-index: 5;
        }
        .qr-card b { font-size: 10px; font-weight: 700; color: #fff; }
        .qr {
          aspect-ratio: 1; margin: 6px 0;
          background:
            linear-gradient(90deg, #ff2a55 10px, transparent 10px 16px, #ff2a55 16px 24px, transparent 24px 32px, #ff2a55 32px 44px, transparent 44px),
            linear-gradient(#ff2a55 10px, transparent 10px 16px, #ff2a55 16px 24px, transparent 24px 32px, #ff2a55 32px 44px, transparent 44px);
          background-size: 44px 44px; border-radius: 6px; filter: contrast(1.3);
        }

        /* Trustbar */
        .trustbar {
          margin: 30px 0 20px;
          border: 1px solid var(--card-border);
          border-radius: 22px;
          padding: 18px;
          background: rgba(20, 5, 8, 0.6);
          display: grid;
          grid-template-columns: repeat(4, 1fr);
        }
        .trust { display: flex; align-items: center; gap: 14px; padding: 6px 20px; border-right: 1px solid rgba(255,255,255,0.06); }
        .trust:last-child { border-right: 0; }
        .trust-icon { font-size: 24px; }
        .trust b { font-size: 14px; color: #fff; }
        .trust span { display: block; font-size: 11px; color: var(--muted); margin-top: 3px; }

        /* Sections Headings */
        section { padding: 80px 0; }
        .section-head { text-align: center; max-width: 700px; margin: 0 auto 45px; }
        .kicker { color: var(--red-primary); font-size: 12px; text-transform: uppercase; letter-spacing: 2.5px; font-weight: 900; }
        .section-head h2 { font-size: clamp(30px,4vw,44px); margin-top: 12px; letter-spacing: -1px; line-height: 1.2; color: #fff; }
        .section-head p { color: var(--muted); line-height: 1.7; margin-top: 14px; font-size: 15px; }

        /* Feature Cards */
        .features { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; }
        .feature {
          position: relative; padding: 26px 22px; border-radius: 20px;
          background: linear-gradient(180deg, rgba(28, 7, 12, 0.8), rgba(16, 3, 6, 0.95));
          border: 1px solid var(--card-border);
          transition: all .3s ease;
        }
        .feature:hover {
          transform: translateY(-5px);
          border-color: var(--card-border-hover);
          box-shadow: 0 16px 35px rgba(255, 30, 75, 0.12);
        }
        .icon {
          width: 46px; height: 46px; border-radius: 12px; display: grid; place-items: center;
          margin-bottom: 20px; font-size: 20px; font-weight: 900;
          background: rgba(255, 30, 75, 0.12);
          color: var(--red-light);
          border: 1px solid rgba(255, 30, 75, 0.25);
        }
        .feature h3 { font-size: 18px; margin-bottom: 10px; color: #fff; }
        .feature p { font-size: 13px; color: var(--muted); line-height: 1.6; }
        .feature a { display: inline-block; margin-top: 18px; color: #ff5274; font-size: 12px; font-weight: 800; cursor: pointer; text-decoration: none; }

        /* Stats — Animated Rolling Counter */
        .stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin-top: 35px; }
        .stat {
          padding: 24px; border-radius: 20px;
          border: 1px solid var(--card-border);
          background: rgba(20,5,8,0.55);
          text-align: center;
          overflow: hidden;
        }
        .stat > span:last-child {
          font-size: 12px;
          color: var(--muted);
          margin-top: 6px;
          display: block;
        }
        .stat-value {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          font-size: 34px;
          font-weight: 900;
          letter-spacing: -1px;
          color: #fff;
          line-height: 1;
          white-space: nowrap;
        }
        .stat-pre, .stat-post {
          display: inline-block;
          font-weight: 900;
          letter-spacing: -1px;
          color: #fff;
        }
        .stat-pre { margin-right: 2px; }

        .counter-container { position: relative; display: inline-block; vertical-align: middle; }
        .counter-counter { display: flex; overflow: hidden; line-height: 1; align-items: center; }
        .counter-digit { position: relative; width: 1ch; font-variant-numeric: tabular-nums; overflow: hidden; }
        .counter-number {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          display: flex; align-items: center; justify-content: center; will-change: transform;
        }
        .gradient-container { pointer-events: none; position: absolute; inset: 0; }
        .top-gradient { position: absolute; top: 0; width: 100%; }
        .bottom-gradient { position: absolute; bottom: 0; width: 100%; }

        /* CTA Section */
        .cta {
          border: 1px solid rgba(255, 45, 85, 0.45);
          border-radius: 24px;
          background: 
            radial-gradient(circle at 10% 20%, rgba(255, 30, 75, 0.25), transparent 40%),
            radial-gradient(circle at 90% 80%, rgba(160, 10, 35, 0.25), transparent 40%),
            rgba(20, 4, 7, 0.95);
          padding: 35px 40px; display: flex; align-items: center; justify-content: space-between; gap: 25px;
          box-shadow: 0 0 50px rgba(255, 30, 75, 0.15);
        }
        .cta-brand { display: flex; align-items: center; gap: 16px; }
        .cta h3 { font-size: 22px; line-height: 1.3; color: #fff; }
        .cta p { color: var(--muted); font-size: 13px; margin-top: 5px; }

        /* Footer */
        .hp-footer { margin-top: 40px; border-top: 1px solid var(--card-border); padding: 38px 0; }
        .footer-grid { display: flex; align-items: center; justify-content: space-between; gap: 25px; }
        .footer-links { display: flex; gap: 24px; color: var(--muted); font-size: 13px; }
        .footer-links a { color: inherit; text-decoration: none; }
        .footer-links a:hover { color: #fff; }
        .copy { color: #83686e; font-size: 12px; }

        /* TextLoop Wave Ribbon */
        .text-loop { position: relative; width: 100%; overflow: hidden; }
        .text-loop-svg { display: block; width: 100%; height: auto; }
        .text-loop-text { user-select: none; }
        .text-loop-measure { visibility: hidden; pointer-events: none; }

        .loop-band { position: relative; padding: 22px 0 0; margin: 6px 0 -10px; }
        .loop-wrap { position: relative; max-width: 880px; margin: 0 auto; }
        .loop-wrap::before {
          content: ""; position: absolute; inset: -50px -70px;
          background: radial-gradient(circle at 50% 50%, rgba(255,30,75,0.20), transparent 65%);
          filter: blur(38px); pointer-events: none; z-index: 0;
        }
        .loop-band .text-loop {
          position: relative; z-index: 1;
          -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 11%, #000 89%, transparent 100%);
          mask-image: linear-gradient(90deg, transparent 0%, #000 11%, #000 89%, transparent 100%);
        }

        /* BubbleMenu Component */
        .bubble-menu.hp-bubble-menu {
          position: fixed; bottom: 26px; right: 26px; z-index: 200;
          display: flex; align-items: center; justify-content: flex-end;
        }
        .hp-bubble-menu .bubble {
          width: 58px; height: 58px; border-radius: 50%;
          background: linear-gradient(135deg, #ff1e4b 0%, #c2002a 100%);
          box-shadow: 0 12px 34px rgba(255, 30, 75, 0.45), 0 0 0 1px rgba(255, 80, 110, 0.35) inset;
          border: none; cursor: pointer; display: flex; flex-direction: column;
          align-items: center; justify-content: center; position: relative;
          transition: box-shadow .25s ease, transform .2s ease;
        }
        .hp-bubble-menu .bubble:hover {
          box-shadow: 0 16px 44px rgba(255, 30, 75, 0.68), 0 0 0 1px rgba(255, 80, 110, 0.55) inset;
          transform: translateY(-2px);
        }
        .hp-bubble-menu .menu-line {
          background: #fff; width: 24px; height: 2.5px; border-radius: 2px;
          display: block; transition: transform 0.3s ease, opacity 0.3s ease;
        }
        .hp-bubble-menu .menu-line + .menu-line { margin-top: 6px; }
        .hp-bubble-menu .menu-btn.open .menu-line:first-child { transform: translateY(4.25px) rotate(45deg); }
        .hp-bubble-menu .menu-btn.open .menu-line:last-child { transform: translateY(-4.25px) rotate(-45deg); }
        
        .hp-bubble-menu .toggle-bubble::after {
          content: ""; position: absolute; inset: -6px; border-radius: 50%;
          border: 1px solid rgba(255, 30, 75, 0.55);
          animation: hpPulse 2.6s ease-out infinite; pointer-events: none;
        }
        @keyframes hpPulse {
          0%   { transform: scale(0.9); opacity: 0.9; }
          100% { transform: scale(1.55); opacity: 0; }
        }

        .bubble-menu-items.hp-bubble-menu-items {
          position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
          background:
            radial-gradient(circle at 25% 25%, rgba(255, 30, 75, 0.16), transparent 45%),
            radial-gradient(circle at 75% 75%, rgba(160, 10, 35, 0.16), transparent 45%),
            rgba(8, 1, 3, 0.92);
          backdrop-filter: blur(28px); -webkit-backdrop-filter: blur(28px);
          z-index: 199;
        }
        .pill-list {
          list-style: none; margin: 0; padding: 0 24px;
          display: flex; flex-wrap: wrap; row-gap: 4px; width: 100%; max-width: 1400px;
          justify-content: center;
        }
        .pill-col { flex: 0 0 calc(100% / 3); display: flex; justify-content: center; }
        .pill-link {
          width: 100%; min-height: 120px; font-size: clamp(1.5rem, 3.5vw, 3rem);
          font-weight: 800; border-radius: 999px;
          background: rgba(22, 6, 9, 0.9); color: #fff2f4;
          border: 1px solid rgba(255, 45, 85, 0.28);
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.55);
          display: flex; align-items: center; justify-content: center;
          text-decoration: none; text-transform: uppercase;
          transition: background 0.3s ease, color 0.3s ease, transform 0.3s ease;
        }
        .pill-link:hover {
          transform: scale(1.06);
          border-color: rgba(255, 80, 110, 0.6);
        }

        .hero-subcards { display: contents; }

        @media (max-width: 1024px) {
          .hero-grid { grid-template-columns: 1fr; gap: 36px; }
          .hero-art { min-height: 820px; margin-top: 10px; }
          .lanyard-wrapper {
            width: 900px;
            height: 900px;
          }
          .features { grid-template-columns: repeat(2, 1fr); }
          .trustbar { grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .trust { border-right: 0; }
        }

        @media (max-width: 860px) {
          .links { display: none; }
          .menu-btn-mobile { display: block; }
          .hp-nav { height: 70px; }
          .brand-logo { width: 38px; height: 38px; }
          .brand-text strong { font-size: 22px; }
          .brand-text span { font-size: 8.5px; letter-spacing: 2.2px; }

          .nav-btn { padding: 9px 15px; font-size: 12.5px; }
          .nav-signin-btn { padding: 7px 14px; font-size: 12.5px; }

          .hero { padding: 32px 0 24px; }
          .hero h1 { font-size: clamp(30px, 8vw, 44px); letter-spacing: -1px; }
          .hero p { font-size: 14.5px; line-height: 1.6; margin-bottom: 24px; }
          .actions { display: flex; flex-direction: column; gap: 10px; width: 100%; }
          .actions .btn { width: 100%; justify-content: center; }

          /* Mobile Hero Art with Lanyard */
          .hero-art {
            min-height: 720px;
            margin-top: 10px;
            width: 100%;
            position: relative;
            overflow: visible;
          }
          .dash {
            width: 100%;
            max-width: 500px;
            padding: 18px 14px;
            border-radius: 20px;
            box-sizing: border-box;
          }
          .dash-grid { grid-template-columns: 1fr; gap: 12px; }
          .balance { font-size: 24px; }

          .lanyard-wrapper {
            width: 750px;
            height: 750px;
            transform: translate(-50%, -50%);
          }

          .success-card {
            position: absolute;
            right: 10px;
            bottom: -20px;
            width: 240px;
            max-width: 90%;
            padding: 12px 14px;
            z-index: 6;
          }
          .qr-card { display: none; }

          /* Trustbar 2x2 grid */
          .trustbar {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            padding: 12px;
            border-radius: 16px;
          }
          .trust {
            border-right: none;
            padding: 8px 10px;
            background: rgba(255, 255, 255, 0.02);
            border-radius: 12px;
            border: 1px solid rgba(255, 45, 85, 0.1);
          }
          .trust b { font-size: 12.5px; }
          .trust span { font-size: 10px; }

          /* Features and Stats */
          .features { grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .feature { padding: 20px 16px; border-radius: 16px; }

          .stats { grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 24px; }
          .stat { padding: 16px 10px; border-radius: 16px; }
          .stat-value { font-size: 25px; }

          /* CTA and Footer */
          .cta {
            flex-direction: column;
            align-items: stretch;
            text-align: center;
            padding: 24px 18px;
            gap: 18px;
            border-radius: 18px;
          }
          .cta-brand {
            flex-direction: column;
            gap: 10px;
            text-align: center;
          }
          .cta .btn.primary { width: 100%; max-width: 280px; margin: 0 auto; }

          .footer-grid { flex-direction: column; align-items: flex-start; gap: 18px; }
          .footer-links { flex-wrap: wrap; gap: 14px; }

          /* Wave Loop */
          .loop-band { padding: 20px 0; margin: 10px 0 -20px; }
          .loop-wrap { max-width: 100%; overflow: hidden; }
          .loop-wrap::before { inset: -20px 0; }

          /* Bubble menu mobile */
          .bubble-menu.hp-bubble-menu { bottom: 18px; right: 18px; }
          .hp-bubble-menu .bubble { width: 50px; height: 50px; }
          .pill-list { padding: 0 16px; gap: 10px; }
          .pill-col { flex: 0 0 100%; margin-bottom: 8px; }
          .pill-link { min-height: 52px; font-size: 1.15rem; padding: 10px 18px; border-radius: 18px; }
        }

        @media (max-width: 540px) {
          .nav-signin-btn { display: none; }
          .nav-btn { padding: 8px 14px; font-size: 12px; }
          .menu-btn-mobile { padding: 7px 11px; }
        }

        @media (max-width: 480px) {
          .features { grid-template-columns: 1fr; }
          .trustbar { grid-template-columns: 1fr; }
          .stat-value { font-size: 22px; }
          .lanyard-wrapper {
            width: 620px;
            height: 620px;
            transform: translate(-50%, -50%);
          }
          .hero-art {
            min-height: 640px;
          }
          .success-card {
            bottom: -30px;
            right: 50%;
            transform: translateX(50%);
          }
        }
      `}</style>

      {/* Ambient background glows */}
      <div className="glow g1" />
      <div className="glow g2" />

      {/* Header */}
      <header className="hp-header">
        <div className="container">
          <nav className="hp-nav">
            <a href="#home" className="brand">
              <img
                src="https://i.ibb.co/bMG1zcF8/image.png"
                alt="HamroPay Logo"
                className="brand-logo"
              />
              <div className="brand-text">
                <strong>Hamro<b>Pay</b></strong>
                <span>PAYMENT GATEWAY</span>
              </div>
            </a>

            <div className="links">
              <a className="active" href="#home">Home</a>
              <a href="#features">Features</a>
              <a href="#stats">Pricing</a>
              <a href="#developers">Developers</a>
              <a href="#docs">Documentation</a>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => onOpenAuth('login')}
                className="nav-signin-btn"
              >
                Sign In
              </button>
              <button
                onClick={() => onOpenAuth('signup')}
                className="nav-btn"
              >
                Get Started →
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="menu-btn-mobile"
                aria-label="Menu"
              >
                ☰
              </button>
            </div>
          </nav>

          {/* Mobile dropdown drawer */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-rose-900/30 bg-slate-950/95 px-2 flex flex-col gap-3 text-sm">
              <a href="#home" onClick={() => setMobileMenuOpen(false)} className="py-1 text-slate-200">Home</a>
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="py-1 text-slate-200">Features</a>
              <a href="#stats" onClick={() => setMobileMenuOpen(false)} className="py-1 text-slate-200">Pricing</a>
              <a href="#developers" onClick={() => setMobileMenuOpen(false)} className="py-1 text-slate-200">Developers</a>
              <div className="pt-2 flex gap-2">
                <button
                  onClick={() => { setMobileMenuOpen(false); onOpenAuth('login'); }}
                  className="flex-1 py-2 text-center text-xs font-bold rounded-lg border border-rose-500/40 text-white"
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); onOpenAuth('signup'); }}
                  className="flex-1 py-2 text-center text-xs font-bold rounded-lg bg-rose-600 text-white"
                >
                  Register
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <main id="home">
        {/* Hero Section */}
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <div className="eyebrow">
                <span className="dot" /> Next-Generation Payment Gateway
              </div>
              <h1>
                Payments Made Simple.<br />
                <span className="grad">Fast. Powerful. Secure.</span>
              </h1>
              <p>
                Accept payments, disburse payouts and manage real-time financial transactions with Nepal's most reliable and developer-friendly gateway.
              </p>
              <div className="actions">
                <button
                  onClick={() => onOpenAuth('signup')}
                  className="btn primary"
                >
                  Create Account →
                </button>
                <a className="btn ghost" href="#developers">
                  ⚡ Explore Documentation
                </a>
              </div>
            </div>

            {/* Interactive Visual Dashboard with 3D Lanyard */}
            <div className="hero-art">
              <div className="dash">
                <div className="dash-top">
                  <div className="mini-brand">
                    <img
                      src="https://i.ibb.co/bMG1zcF8/image.png"
                      alt="Logo"
                      style={{ width: '20px', height: '20px', objectFit: 'contain' }}
                    />
                    Hamro<b>Pay</b> Dashboard
                  </div>
                  <div className="status">● Active</div>
                </div>

                <div className="dash-grid">
                  <div className="panel">
                    <div className="label">Total Settled Balance</div>
                    <div className="balance">Rs. 84,250.00</div>
                    <div className="rise">↗ +24.8% this week</div>
                    <div className="chart">
                      <svg viewBox="0 0 300 110" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="redGrad" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#ff1e4b" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#ff1e4b" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M0 95 C30 85, 50 90, 80 60 S 130 70, 160 35 S 220 50, 250 20 L 300 10"
                          fill="none"
                          stroke="#ff2a55"
                          strokeWidth="3"
                        />
                        <path
                          d="M0 110 L0 95 C30 85, 50 90, 80 60 S 130 70, 160 35 S 220 50, 250 20 L 300 10 L 300 110 Z"
                          fill="url(#redGrad)"
                        />
                      </svg>
                    </div>
                  </div>

                  <div className="panel">
                    <div className="tx-title">Recent Transactions</div>
                    <div className="tx">
                      <div className="tx-left">
                        <div className="tx-icon">↓</div>
                        <div><b>Received</b><small>Just now</small></div>
                      </div>
                      <span className="success">+Rs. 4,500</span>
                    </div>
                    <div className="tx">
                      <div className="tx-left">
                        <div className="tx-icon" style={{ background: 'rgba(255,184,52,0.15)', color: '#ffb834' }}>↑</div>
                        <div><b>Payout</b><small>15m ago</small></div>
                      </div>
                      <span className="success" style={{ color: '#ffb834' }}>-Rs. 1,200</span>
                    </div>
                    <div className="tx">
                      <div className="tx-left">
                        <div className="tx-icon">↓</div>
                        <div><b>Received</b><small>2h ago</small></div>
                      </div>
                      <span className="success">+Rs. 2,900</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ============ LANYARD — free floating 3D ============ */}
              <Lanyard3D />
              {/* ============================================= */}

              <div className="success-card">
                <div className="check">✓</div>
                <div>
                  <b>Payment Received!</b>
                  <div className="label">Rs. 4,500.00 via Fonepay</div>
                </div>
              </div>

              <div className="qr-card">
                <div style={{ fontSize: '10px', fontWeight: 700 }}>Scan & Pay</div>
                <div className="qr" />
                <div style={{ fontSize: '8px', color: 'var(--muted)' }}>Instant Dynamic QR</div>
              </div>
            </div>
          </div>
        </section>

        {/* Trustbar */}
        <div className="container">
          <div className="trustbar">
            <div className="trust">
              <div className="trust-icon">🛡️</div>
              <div><b>Bank-Grade Security</b><span>PCI-DSS Level 1 compliant</span></div>
            </div>
            <div className="trust">
              <div className="trust-icon">⚡</div>
              <div><b>Instant Settlement</b><span>T+0 automatic settlements</span></div>
            </div>
            <div className="trust">
              <div className="trust-icon">▣</div>
              <div><b>10-Min Integration</b><span>Ready SDKs for Node, PHP, Python</span></div>
            </div>
            <div className="trust">
              <div className="trust-icon">👥</div>
              <div><b>24/7 Priority Support</b><span>Real human support anytime</span></div>
            </div>
          </div>
        </div>

        {/* TextLoop Brand Band */}
        <div className="loop-band">
          <div className="container">
            <div className="loop-wrap" ref={brandLoopRef} />
          </div>
        </div>

        {/* Features Section */}
        <section id="features">
          <div className="container">
            <div className="section-head">
              <div className="kicker">Core Features</div>
              <h2>Everything built to move your money faster.</h2>
              <p>Accept payments effortlessly through links, QR codes, debit cards, and national wallets with one single checkout API.</p>
            </div>

            <div className="features">
              <article className="feature">
                <div className="icon">↗</div>
                <h3>Payment Links</h3>
                <p>Generate secure, shareable payment links within seconds across WhatsApp, SMS or Instagram.</p>
                <a onClick={() => onOpenAuth('signup')}>Explore Links →</a>
              </article>

              <article className="feature">
                <div className="icon">▦</div>
                <h3>Smart QR Pay</h3>
                <p>Interoperable QR codes compatible with all major banking apps and mobile wallets.</p>
                <a onClick={() => onOpenAuth('signup')}>Explore QR →</a>
              </article>

              <article className="feature">
                <div className="icon">⚡</div>
                <h3>Automated Payouts</h3>
                <p>Disburse vendor settlements, refunds, and payroll instantly via unified APIs.</p>
                <a onClick={() => onOpenAuth('signup')}>Explore Payouts →</a>
              </article>

              <article className="feature" id="developers">
                <div className="icon">&lt;/&gt;</div>
                <h3>Developer API</h3>
                <p>Clean REST APIs, reliable webhooks, and exhaustive documentation ready to plug in.</p>
                <a onClick={() => onOpenAuth('login')}>View API Docs →</a>
              </article>
            </div>

            {/* Stats Section with Animated Rolling Counter */}
            <div className="stats" id="stats">
              <div className="stat">
                <div className="stat-value">
                  <RollingCounter value={50} places={[10, 1]} />
                  <span className="stat-post">K+</span>
                </div>
                <span>Active Merchants</span>
              </div>
              <div className="stat">
                <div className="stat-value">
                  <span className="stat-pre">Rs.</span>
                  <RollingCounter value={10} places={[10, 1]} />
                  <span className="stat-post">B+</span>
                </div>
                <span>Processed Volume</span>
              </div>
              <div className="stat">
                <div className="stat-value">
                  <RollingCounter value={99.98} places={[10, 1, '.', 0.1, 0.01]} />
                  <span className="stat-post">%</span>
                </div>
                <span>System Uptime</span>
              </div>
              <div className="stat">
                <div className="stat-value">
                  <span className="stat-pre">&lt;</span>
                  <RollingCounter value={1} places={[1]} />
                  <span className="stat-post">sec</span>
                </div>
                <span>Processing Speed</span>
              </div>
            </div>
          </div>
        </section>

        {/* Call To Action */}
        <section id="start" style={{ paddingTop: '20px' }}>
          <div className="container">
            <div className="cta">
              <div className="cta-brand">
                <img
                  src="https://i.ibb.co/bMG1zcF8/image.png"
                  alt="HamroPay"
                  className="brand-logo"
                  style={{ width: '50px', height: '50px' }}
                />
                <div>
                  <h3>Ready to scale your business with HamroPay?</h3>
                  <p>Sign up now to start accepting digital payments within 15 minutes.</p>
                </div>
              </div>
              <button
                onClick={() => onOpenAuth('signup')}
                className="btn primary"
                style={{ whiteSpace: 'nowrap' }}
              >
                Create Free Account →
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="hp-footer" id="docs">
        <div className="container footer-grid">
          <div className="brand">
            <img
              src="https://i.ibb.co/bMG1zcF8/image.png"
              alt="HamroPay"
              className="brand-logo"
              style={{ width: '34px', height: '34px' }}
            />
            <div className="brand-text">
              <strong style={{ fontSize: '20px' }}>Hamro<b>Pay</b></strong>
              <span>PAYMENT GATEWAY</span>
            </div>
          </div>

          <div className="footer-links">
            <a href="#home">Home</a>
            <a href="#features">Features</a>
            <a href="#stats">Pricing</a>
            <a href="#developers">API</a>
            <a href="#docs">Documentation</a>
          </div>

          <div className="copy">© 2026 HamroPay Inc. All rights reserved.</div>
        </div>
      </footer>

      {/* BubbleMenu mount point */}
      <div ref={bubbleMenuRef} />
    </div>
  );
}
