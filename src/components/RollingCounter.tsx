import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface RollingCounterProps {
  value: number;
  places: (number | string)[];
  fontSize?: number;
  padding?: number;
  gap?: number;
  fontWeight?: number;
  textColor?: string;
  gradientHeight?: number;
}

function normalizeNearInteger(num: number): number {
  const nearest = Math.round(num);
  const tolerance = 1e-9 * Math.max(1, Math.abs(num));
  return Math.abs(num - nearest) < tolerance ? nearest : num;
}

function getValueRoundedToPlace(value: number, place: number): number {
  return Math.floor(normalizeNearInteger(value / place));
}

export default function RollingCounter({
  value,
  places,
  fontSize = 34,
  padding = 10,
  gap = 2,
  fontWeight = 900,
  textColor = '#fff',
  gradientHeight = 8,
}: RollingCounterProps) {
  const hostRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.innerHTML = '';

    const height = fontSize + padding;

    const container = document.createElement('span');
    container.className = 'counter-container';

    const counter = document.createElement('span');
    counter.className = 'counter-counter';
    counter.style.fontSize = `${fontSize}px`;
    counter.style.height = `${height}px`;
    counter.style.gap = `${gap}px`;
    counter.style.fontWeight = String(fontWeight);
    counter.style.color = textColor;

    interface DigitRef {
      element: HTMLElement;
      numbers: HTMLElement[] | null;
      isDecimal: boolean;
    }

    const refs: DigitRef[] = [];

    places.forEach((place) => {
      const isDecimal = place === '.';
      const digitEl = document.createElement('span');
      digitEl.className = 'counter-digit';
      digitEl.style.height = `${height}px`;

      if (isDecimal) {
        digitEl.style.width = 'fit-content';
        digitEl.style.overflow = 'visible';
        digitEl.textContent = '.';
        refs.push({ element: digitEl, numbers: null, isDecimal: true });
        counter.appendChild(digitEl);
        return;
      }

      const numbers: HTMLElement[] = [];
      for (let n = 0; n < 10; n++) {
        const numEl = document.createElement('span');
        numEl.className = 'counter-number';
        numEl.textContent = String(n);
        numEl.style.transform = `translateY(${n * height}px)`;
        digitEl.appendChild(numEl);
        numbers.push(numEl);
      }
      refs.push({ element: digitEl, numbers, isDecimal: false });
      counter.appendChild(digitEl);
    });

    container.appendChild(counter);

    const gradContainer = document.createElement('span');
    gradContainer.className = 'gradient-container';
    const topGrad = document.createElement('span');
    topGrad.className = 'top-gradient';
    topGrad.style.height = `${gradientHeight}px`;
    topGrad.style.background = 'linear-gradient(to bottom, rgba(20,5,8,0.95), rgba(20,5,8,0))';
    const botGrad = document.createElement('span');
    botGrad.className = 'bottom-gradient';
    botGrad.style.height = `${gradientHeight}px`;
    botGrad.style.background = 'linear-gradient(to top, rgba(20,5,8,0.95), rgba(20,5,8,0))';
    gradContainer.appendChild(topGrad);
    gradContainer.appendChild(botGrad);
    container.appendChild(gradContainer);

    host.appendChild(container);

    const state = { value: 0 };
    function updateDigits() {
      refs.forEach((ref, i) => {
        if (ref.isDecimal || !ref.numbers) return;
        const place = places[i] as number;
        const digitVal = getValueRoundedToPlace(state.value, place);
        const placeVal = ((digitVal % 10) + 10) % 10;
        ref.numbers.forEach((numEl, n) => {
          const offset = (10 + n - placeVal) % 10;
          let y = offset * height;
          if (offset > 5) y -= 10 * height;
          numEl.style.transform = `translateY(${y}px)`;
        });
      });
    }

    updateDigits();

    let tween: gsap.core.Tween | null = null;
    let triggered = false;

    function run() {
      if (triggered) return;
      triggered = true;
      tween = gsap.to(state, {
        value: value,
        duration: 2.2,
        ease: 'power3.out',
        onUpdate: updateDigits,
      });
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          run();
          io.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    io.observe(host);

    if (host.getBoundingClientRect().top < window.innerHeight) {
      setTimeout(run, 250);
    }

    return () => {
      io.disconnect();
      if (tween) tween.kill();
    };
  }, [value, JSON.stringify(places), fontSize, padding, gap, fontWeight, textColor, gradientHeight]);

  return <span ref={hostRef} className="stat-counter inline-block" />;
}
