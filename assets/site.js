// Strings the script writes itself, per page language (<html lang>)
const strings = {
  de: { locale: 'de-CH', hours: 'Std.', subject: 'Warteliste: ', company: 'Betrieb', email: 'E-Mail', phone: 'Telefon' },
  en: { locale: 'en-CH', hours: 'hrs', subject: 'Waitlist: ', company: 'Company', email: 'Email', phone: 'Phone' }
};
const copy = strings[document.documentElement.lang.slice(0, 2)] || strings.de;

// Language switch keeps the current section (#kontakt etc.) when changing language
document.querySelectorAll('.lang a').forEach((a) => {
  a.addEventListener('click', () => { a.href = a.getAttribute('href').split('#')[0] + location.hash; });
});

// Nav background once the page scrolls
const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Reveal sections as they enter the viewport
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

// Cost calculator: hours/week × 45 weeks × CHF 50
const hours = document.getElementById('hours');
const fmt = (n) => n.toLocaleString(copy.locale);
const updateCalc = () => {
  const h = Number(hours.value);
  const yearlyHours = h * 45;
  document.getElementById('hoursOut').textContent = h + ' ' + copy.hours;
  document.getElementById('costOut').textContent = 'CHF ' + fmt(yearlyHours * 50);
  document.getElementById('daysOut').textContent = fmt(Math.round(yearlyHours / 8.4));
  hours.style.setProperty('--fill', ((h - hours.min) / (hours.max - hours.min)) * 100 + '%');
};
hours.addEventListener('input', updateCalc);
updateCalc();

// Waitlist form. FormSubmit forwards each entry to this address by email, no account needed.
// The very first entry triggers an "Activate Form" email to contact@flowton.ch; click it once.
// Until then (or if the service is down) the form falls back to opening the visitor's mail app.
const FORM_ENDPOINT = 'https://formsubmit.co/ajax/contact@flowton.ch';

const form = document.getElementById('contactForm');
const successMsg = document.getElementById('successMsg');

const mailtoFallback = () => {
  const d = new FormData(form);
  const body = `Name: ${d.get('name')}\n${copy.company}: ${d.get('company')}\n${copy.email}: ${d.get('email')}\n${copy.phone}: ${d.get('phone')}\n\n${d.get('message')}`;
  window.location.href = `mailto:contact@flowton.ch?subject=${encodeURIComponent(copy.subject + d.get('company'))}&body=${encodeURIComponent(body)}`;
};

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const data = new FormData(form);
  data.append('_subject', copy.subject + data.get('company'));
  data.append('_template', 'table');

  try {
    const res = await fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: data
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && String(json.success) === 'true') {
      form.style.display = 'none';
      successMsg.style.display = 'block';
    } else {
      mailtoFallback();
    }
  } catch (err) {
    mailtoFallback();
  }
});

// Hero: flowing dot-mesh waves, after the banner artwork
(() => {
  const canvas = document.getElementById('waves');
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w, h, dpr, running = true, t = 0;

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const waveY = (nx, r, depth) => {
    const baseY = h * 0.38 + depth * h * 0.42;
    const amp = (30 + depth * 70) * (h / 900);
    return baseY
      + Math.sin(nx * 5.2 + t * 0.6 + r * 0.18) * amp * 0.6
      + Math.sin(nx * 2.1 - t * 0.35 + r * 0.07) * amp * 0.8;
  };

  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    const rows = 30;
    const cols = Math.min(150, Math.floor(w / 8));

    // Dot mesh
    for (let r = 0; r < rows; r++) {
      const depth = r / rows;
      for (let c = 0; c <= cols; c++) {
        const nx = c / cols;
        // Brighter toward the right, like the banner light
        const glow = Math.pow(nx, 1.2) * (0.3 + 0.7 * Math.sin(nx * 3.2 + t * 0.4 + r * 0.1) ** 2);
        const alpha = (0.1 + glow * 0.8) * (0.45 + depth * 0.55);
        ctx.fillStyle = `rgba(${165 + glow * 70 | 0}, ${115 + glow * 80 | 0}, 255, ${alpha})`;
        const size = 0.8 + depth * 1.4;
        ctx.fillRect(nx * w, waveY(nx, r, depth), size, size);
      }
    }

    // A few silky ribbons on top
    ctx.globalCompositeOperation = 'lighter';
    for (const r of [4, 11, 19, 26]) {
      const depth = r / rows;
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, 'rgba(124, 58, 237, 0)');
      grad.addColorStop(0.55, 'rgba(150, 90, 255, 0.25)');
      grad.addColorStop(1, 'rgba(210, 180, 255, 0.7)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1 + depth * 1.5;
      ctx.shadowColor = 'rgba(167, 123, 243, 0.9)';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      for (let c = 0; c <= cols; c++) {
        const nx = c / cols;
        const y = waveY(nx, r, depth);
        c === 0 ? ctx.moveTo(0, y) : ctx.lineTo(nx * w, y);
      }
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'source-over';
  };

  const loop = () => {
    if (!running) return;
    t += 0.012;
    draw();
    requestAnimationFrame(loop);
  };

  resize();
  window.addEventListener('resize', () => { resize(); if (reduced) draw(); });

  if (reduced) { draw(); return; }

  // Pause the animation while the hero is off screen
  new IntersectionObserver(([entry]) => {
    const wasRunning = running;
    running = entry.isIntersecting;
    if (running && !wasRunning) loop();
  }).observe(canvas);
  loop();
})();
