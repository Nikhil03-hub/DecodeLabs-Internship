/**
 * NEXUS AI — Main JavaScript  (v2 Enhanced Edition)
 * DecodeLabs Internship — Project 1: Responsive Frontend
 *
 * Feature Index:
 * 01. DOM Ready Guard
 * 02. Sticky Navbar + Scroll Shadow
 * 03. Scroll Progress Bar
 * 04. Custom Cursor (dot + lagged ring) — desktop only
 * 05. Hamburger / Mobile Menu Toggle
 * 06. Mobile Menu Close on Link Click
 * 07. Theme Toggle (Dark / Light + localStorage)
 * 08. Scroll-Reveal Animations (IntersectionObserver)
 * 09. Hero Animations (immediate stagger above fold)
 * 10. Hero Interactive Mouse Glow
 * 11. Hero Orb Parallax on Scroll
 * 12. Particle Constellation Canvas
 * 13. Feature Card 3D Tilt (mousemove, desktop only)
 * 14. Magnetic Primary Buttons (desktop only)
 * 15. Stats Counter Animation
 * 16. Pricing Toggle (Monthly / Annual + flip)
 * 17. FAQ Accordion (exclusive open + animation)
 * 18. Back to Top Button
 * 19. Smooth Scroll + Anchor Focus
 * 20. Current Year in Footer
 * 21. Active Nav Link on Scroll (IntersectionObserver)
 *
 * Stack: Vanilla JavaScript ES6+ — No libraries, no frameworks.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {

    const isPointerFine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    /* 02. STICKY NAVBAR */
    const header = document.getElementById('header');
    const onNavScroll = () => {
        if (!header) return;
        header.classList.toggle('header--scrolled', window.scrollY > 60);
    };
    window.addEventListener('scroll', onNavScroll, { passive: true });
    onNavScroll();

    /* 03. SCROLL PROGRESS BAR */
    const progressBar = document.getElementById('scroll-progress');
    const updateProgress = () => {
        if (!progressBar) return;
        const docH = document.documentElement.scrollHeight - window.innerHeight;
        const pct  = docH > 0 ? (window.scrollY / docH) * 100 : 0;
        progressBar.style.width = pct + '%';
        progressBar.setAttribute('aria-valuenow', Math.round(pct));
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();

    /* 04. CUSTOM CURSOR */
    if (isPointerFine) {
        const cursor = document.getElementById('cursor');
        const dot    = cursor && cursor.querySelector('.cursor__dot');
        const ring   = cursor && cursor.querySelector('.cursor__ring');
        let mouseX = -100, mouseY = -100, ringX = -100, ringY = -100;
        const LERP = 0.42; /* 0.1 = ~10 frames of lag — visible trailing effect */

        const moveDot = function(x, y) {
            if (dot) dot.style.transform = 'translate(' + (x - 4) + 'px, ' + (y - 4) + 'px)'; /* center 8px dot */
        };
        const animateRing = function() {
            ringX += (mouseX - ringX) * LERP;
            ringY += (mouseY - ringY) * LERP;
            if (ring) {ring.style.left = ringX + 'px';ring.style.top  = ringY + 'px';} /* center 36px ring */
            requestAnimationFrame(animateRing);
        };
        window.addEventListener('mousemove', function(e) {
            mouseX = e.clientX; mouseY = e.clientY; moveDot(mouseX, mouseY);
        }, { passive: true });
        window.addEventListener('mousedown', function() { if (cursor) cursor.classList.add('cursor--clicking'); });
        window.addEventListener('mouseup',   function() { if (cursor) cursor.classList.remove('cursor--clicking'); });

        document.querySelectorAll(
            'a, button, [role="button"], details summary, input, textarea, select, label'
        ).forEach(function(el) {
            el.addEventListener('mouseenter', function() { if (cursor) cursor.classList.add('cursor--hovering'); });
            el.addEventListener('mouseleave', function() { if (cursor) cursor.classList.remove('cursor--hovering'); });
        });
        animateRing();
    }

    /* 05. HAMBURGER / MOBILE MENU */
    const hamburger  = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobile-menu');

    function openMenu() {
        if (hamburger)  { hamburger.classList.add('is-open'); hamburger.setAttribute('aria-expanded', 'true'); }
        if (mobileMenu) { mobileMenu.classList.add('is-open'); mobileMenu.setAttribute('aria-hidden', 'false'); }
        document.body.style.overflow = 'hidden';
    }
    function closeMenu() {
        if (hamburger)  { hamburger.classList.remove('is-open'); hamburger.setAttribute('aria-expanded', 'false'); }
        if (mobileMenu) { mobileMenu.classList.remove('is-open'); mobileMenu.setAttribute('aria-hidden', 'true'); }
        document.body.style.overflow = '';
    }

    if (hamburger) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.contains('is-open') ? closeMenu() : openMenu();
        });
    }
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && hamburger && hamburger.classList.contains('is-open')) {
            closeMenu(); hamburger.focus();
        }
    });
    if (mobileMenu) {
        mobileMenu.addEventListener('keydown', function(e) {
            if (e.key !== 'Tab' || !hamburger || !hamburger.classList.contains('is-open')) return;
            var focusable = Array.from(mobileMenu.querySelectorAll('a[href], button:not([disabled])'));
            if (!focusable.length) return;
            var first = focusable[0], last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        });
    }

    /* 06. MOBILE MENU LINKS */
    document.querySelectorAll('.mobile-menu__link').forEach(function(link) {
        link.addEventListener('click', closeMenu);
    });

    /* 07. THEME TOGGLE */
    var themeToggle = document.getElementById('theme-toggle');
    var htmlEl = document.documentElement;

    function applyTheme(theme) {
        htmlEl.setAttribute('data-theme', theme);
        localStorage.setItem('nexus-theme', theme);
        if (themeToggle) themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    }
    applyTheme(localStorage.getItem('nexus-theme') || 'dark');
    if (themeToggle) themeToggle.addEventListener('click', function() {
        applyTheme(htmlEl.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
        if (!localStorage.getItem('nexus-theme')) applyTheme(e.matches ? 'dark' : 'light');
    });

    /* 08. SCROLL-REVEAL */
    var animatedEls = document.querySelectorAll('[data-animate]');
    if ('IntersectionObserver' in window && animatedEls.length) {
        var revealIO = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) { entry.target.classList.add('is-visible'); revealIO.unobserve(entry.target); }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -48px 0px' });
        animatedEls.forEach(function(el) { revealIO.observe(el); });
    } else {
        animatedEls.forEach(function(el) { el.classList.add('is-visible'); });
    }

    /* 09. HERO ENTRANCE */
    var heroEls = document.querySelectorAll('.hero [data-animate]');
    heroEls.forEach(function(el, i) { el.style.transitionDelay = (i * 0.12) + 's'; });
    requestAnimationFrame(function() {
        requestAnimationFrame(function() {
            heroEls.forEach(function(el) { el.classList.add('is-visible'); });
        });
    });

    /* 10. HERO MOUSE GLOW */
    if (isPointerFine) {
        var heroSection = document.querySelector('.hero');
        if (heroSection) {
            heroSection.addEventListener('mousemove', function(e) {
                var rect = heroSection.getBoundingClientRect();
                var x = ((e.clientX - rect.left) / rect.width)  * 100;
                var y = ((e.clientY - rect.top)  / rect.height) * 100;
                heroSection.style.setProperty('--mouse-x', x + '%');
                heroSection.style.setProperty('--mouse-y', y + '%');
                heroSection.classList.add('glow-active');
            }, { passive: true });
            heroSection.addEventListener('mouseleave', function() {
                heroSection.classList.remove('glow-active');
            });
        }
    }

    /* 11. HERO ORB PARALLAX */
    var orb1 = document.querySelector('.hero__orb--1');
    var orb2 = document.querySelector('.hero__orb--2');
    var orb3 = document.querySelector('.hero__orb--3');
    if (orb1 || orb2 || orb3) {
        var onOrbScroll = function() {
            var y = window.scrollY;
            if (y >= window.innerHeight) return;
            if (orb1) orb1.style.transform = 'translateY(' + (y * 0.18) + 'px)';
            if (orb2) orb2.style.transform = 'translateY(' + (y * -0.12) + 'px)';
            if (orb3) orb3.style.transform = 'translateY(' + (y * 0.08) + 'px)';
        };
        window.addEventListener('scroll', onOrbScroll, { passive: true });
    }

    /* 12. PARTICLE CONSTELLATION CANVAS */
    (function initParticles() {
        var canvas = document.getElementById('hero-canvas');
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        var particles = [];
        var rafId;

        function resize() { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; }

        function Particle() { this.reset(true); }
        Particle.prototype.reset = function(initial) {
            this.x  = Math.random() * canvas.width;
            this.y  = initial ? Math.random() * canvas.height : (Math.random() < 0.5 ? -5 : canvas.height + 5);
            this.vx = (Math.random() - 0.5) * 0.28;
            this.vy = (Math.random() - 0.5) * 0.28;
            this.r  = Math.random() * 1.4 + 0.4;
            this.a  = Math.random() * 0.35 + 0.08;
        };
        Particle.prototype.update = function() {
            this.x += this.vx; this.y += this.vy;
            if (this.x < -10 || this.x > canvas.width + 10 || this.y < -10 || this.y > canvas.height + 10) this.reset();
        };
        Particle.prototype.draw = function() {
            ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(165,133,111,' + this.a + ')'; ctx.fill();
        };

        function buildParticles() {
            var count = Math.min(Math.floor((canvas.width * canvas.height) / 10000), 85);
            particles = [];
            for (var i = 0; i < count; i++) particles.push(new Particle());
        }
        function connectParticles() {
            var MAX = 110;
            for (var i = 0; i < particles.length; i++) {
                for (var j = i + 1; j < particles.length; j++) {
                    var dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
                    var dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < MAX) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = 'rgba(160,212,224,' + ((1 - dist/MAX) * 0.10) + ')';
                        ctx.lineWidth = 0.5; ctx.stroke();
                    }
                }
            }
        }
        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(function(p) { p.update(); p.draw(); });
            connectParticles();
            rafId = requestAnimationFrame(animate);
        }

        resize(); buildParticles(); animate();

        if (typeof ResizeObserver !== 'undefined') {
            new ResizeObserver(function() { resize(); buildParticles(); }).observe(canvas);
        }
        document.addEventListener('visibilitychange', function() {
            if (document.hidden) cancelAnimationFrame(rafId); else animate();
        });
    })();

    /* 13. FEATURE CARD 3D TILT */
    if (isPointerFine) {
        var tiltCards = document.querySelectorAll('.feature-card[data-tilt]');
        var MAX_TILT = 7;
        tiltCards.forEach(function(card) {
            card.addEventListener('mousemove', function(e) {
                var rect = card.getBoundingClientRect();
                var cx = rect.width / 2, cy = rect.height / 2;
                var mx = e.clientX - rect.left - cx, my = e.clientY - rect.top - cy;
                var rotX = (-my / cy) * MAX_TILT, rotY = (mx / cx) * MAX_TILT;
                card.style.transform = 'perspective(800px) rotateX(' + rotX + 'deg) rotateY(' + rotY + 'deg) translateZ(6px)';
                card.style.boxShadow = '0 12px 32px rgba(0,0,0,0.4), ' + (-rotY*0.6) + 'px ' + (rotX*0.6) + 'px 20px rgba(165,133,111,0.12)';
            }, { passive: true });
            card.addEventListener('mouseleave', function() {
                card.style.transform = ''; card.style.boxShadow = '';
            });
        });
    }

    /* 14. MAGNETIC BUTTONS */
    if (isPointerFine) {
        var magnetBtns = document.querySelectorAll('.btn--primary');
        magnetBtns.forEach(function(btn) {
            btn.addEventListener('mousemove', function(e) {
                var rect = btn.getBoundingClientRect();
                var dx = e.clientX - (rect.left + rect.width / 2);
                var dy = e.clientY - (rect.top  + rect.height / 2);
                btn.style.transform = 'translate(' + (dx * 0.20) + 'px, ' + (dy * 0.25) + 'px)';
            }, { passive: true });
            btn.addEventListener('mouseleave', function() { btn.style.transform = ''; });
        });
    }

    /* 15. STATS COUNTER */
    var statVals = document.querySelectorAll('.stat-item__value[data-count]');
    function countUp(el, target, duration) {
        duration = duration || 2000;
        var startTime = performance.now();
        function easeOutQuart(t) { return 1 - Math.pow(1 - t, 4); }
        function tick(now) {
            var elapsed  = now - startTime;
            var progress = Math.min(elapsed / duration, 1);
            var value    = Math.round(easeOutQuart(progress) * target);
            el.textContent = target >= 1000 ? value.toLocaleString() : String(value);
            if (progress < 1) requestAnimationFrame(tick);
            else el.textContent = target >= 1000 ? target.toLocaleString() : String(target);
        }
        requestAnimationFrame(tick);
    }
    if ('IntersectionObserver' in window && statVals.length) {
        var counterIO = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (!entry.isIntersecting) return;
                var target = parseInt(entry.target.dataset.count, 10);
                if (!isNaN(target)) countUp(entry.target, target);
                counterIO.unobserve(entry.target);
            });
        }, { threshold: 0.5 });
        statVals.forEach(function(el) { counterIO.observe(el); });
    }

    /* 16. PRICING TOGGLE */
    var btnMonthly = document.getElementById('btn-monthly');
    var btnAnnual  = document.getElementById('btn-annual');
    var priceEls   = document.querySelectorAll('.price__amount[data-monthly]');

    function flipPrice(annual) {
        priceEls.forEach(function(el) {
            el.classList.add('is-flipping');
            setTimeout(function() {
                el.textContent = annual ? el.dataset.annual : el.dataset.monthly;
                el.classList.remove('is-flipping');
            }, 200);
        });
        [btnMonthly, btnAnnual].forEach(function(btn, i) {
            if (!btn) return;
            var active = annual ? i === 1 : i === 0;
            btn.classList.toggle('toggle__btn--active', active);
            btn.setAttribute('aria-pressed', String(active));
        });
    }
    if (btnMonthly) btnMonthly.addEventListener('click', function() { flipPrice(false); });
    if (btnAnnual)  btnAnnual.addEventListener('click',  function() { flipPrice(true); });

    /* 17. FAQ ACCORDION */
    var faqItems = document.querySelectorAll('.faq__item');
    faqItems.forEach(function(item) {
        item.addEventListener('toggle', function() {
            if (!item.open) return;
            faqItems.forEach(function(other) {
                if (other !== item && other.open) other.removeAttribute('open');
            });
        });
    });

    /* 18. BACK TO TOP */
    var backToTop = document.getElementById('back-to-top');
    function toggleBackToTop() {
        if (backToTop) backToTop.classList.toggle('is-visible', window.scrollY > 450);
    }
    window.addEventListener('scroll', toggleBackToTop, { passive: true });
    toggleBackToTop();
    if (backToTop) backToTop.addEventListener('click', function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    /* 19. SMOOTH SCROLL + ANCHOR FOCUS */
    document.querySelectorAll('a[href^="#"]').forEach(function(link) {
        link.addEventListener('click', function(e) {
            var href = link.getAttribute('href');
            if (!href || href === '#') return;
            var target = document.querySelector(href);
            if (!target) return;
            e.preventDefault();
            closeMenu();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            history.pushState(null, '', href);
            target.setAttribute('tabindex', '-1');
            target.focus({ preventScroll: true });
            target.addEventListener('blur', function() { target.removeAttribute('tabindex'); }, { once: true });
        });
    });

    /* 20. CURRENT YEAR */
    var yearEl = document.getElementById('current-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    /* 21. ACTIVE NAV HIGHLIGHT */
    var sections = document.querySelectorAll('main section[id]');
    var navLinks = document.querySelectorAll('.nav__link');
    if ('IntersectionObserver' in window && sections.length && navLinks.length) {
        var activeIO = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (!entry.isIntersecting) return;
                var id = entry.target.getAttribute('id');
                navLinks.forEach(function(link) {
                    link.classList.toggle('is-active', link.getAttribute('href') === '#' + id);
                });
            });
        }, { threshold: 0.45 });
        sections.forEach(function(sec) { activeIO.observe(sec); });
    }

    /* DevTools signature */
    console.log('%c Nexus AI - Week 1 v2 Ready | DecodeLabs Internship', 'color:#A5856F;font-weight:bold;font-size:13px;');
    console.log('%c Stack: HTML5 + CSS3 + Vanilla JS | No frameworks', 'color:#A0D4E0;font-size:11px;');

}); // END DOMContentLoaded
