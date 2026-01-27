/**
 * ParkLife - JavaScript
 * Carousel, Mobile Menu, Smooth Scroll, Scroll Animations
 */

document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    initCarousel();
    initSmoothScroll();
    initScrollAnimations();
    initHeaderScroll();
    initHeroImageSwap();
});

/**
 * Mobile Menu
 */
function initMobileMenu() {
    const toggle = document.querySelector('.mobile-menu-toggle');
    const overlay = document.querySelector('.mobile-menu-overlay');
    const mobileLinks = document.querySelectorAll('.mobile-nav a');
    
    if (!toggle || !overlay) return;
    
    toggle.addEventListener('click', () => {
        toggle.classList.toggle('active');
        overlay.classList.toggle('active');
        document.body.style.overflow = overlay.classList.contains('active') ? 'hidden' : '';
    });
    
    // Close menu on link click
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            toggle.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    });
    
    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.classList.contains('active')) {
            toggle.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
}

/**
 * Reference Carousel
 */
function initCarousel() {
    const track = document.querySelector('.reference-track');
    const prevBtn = document.querySelector('.carousel-prev');
    const nextBtn = document.querySelector('.carousel-next');
    
    if (!track || !prevBtn || !nextBtn) return;
    
    const cardWidth = 304; // card width + gap
    let currentScroll = 0;
    
    const getMaxScroll = () => {
        return track.scrollWidth - track.clientWidth;
    };
    
    const updateButtons = () => {
        prevBtn.style.opacity = currentScroll <= 0 ? '0.5' : '1';
        nextBtn.style.opacity = currentScroll >= getMaxScroll() ? '0.5' : '1';
    };
    
    const scrollTo = (position) => {
        currentScroll = Math.max(0, Math.min(position, getMaxScroll()));
        track.scrollTo({
            left: currentScroll,
            behavior: 'smooth'
        });
        updateButtons();
    };
    
    prevBtn.addEventListener('click', () => {
        scrollTo(currentScroll - cardWidth);
    });
    
    nextBtn.addEventListener('click', () => {
        scrollTo(currentScroll + cardWidth);
    });
    
    // Update current scroll on manual scroll
    track.addEventListener('scroll', () => {
        currentScroll = track.scrollLeft;
        updateButtons();
    });
    
    // Touch/swipe support
    let touchStartX = 0;
    let touchEndX = 0;
    
    track.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
    }, { passive: true });
    
    track.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].clientX;
        const diff = touchStartX - touchEndX;
        
        if (Math.abs(diff) > 50) {
            if (diff > 0) {
                scrollTo(currentScroll + cardWidth);
            } else {
                scrollTo(currentScroll - cardWidth);
            }
        }
    }, { passive: true });
    
    // Initial button state
    updateButtons();
}

/**
 * Smooth Scroll for Navigation Links
 */
function initSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href === '#') return;
            
            const target = document.querySelector(href);
            if (!target) return;
            
            e.preventDefault();
            
            const headerHeight = document.querySelector('.header').offsetHeight;
            const targetPosition = target.offsetTop - headerHeight;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        });
    });
}

/**
 * Scroll Animations (Intersection Observer)
 */
function initScrollAnimations() {
    // Add animation class to elements
    const animateElements = document.querySelectorAll(
        '.reference-card, .equipment-grid > *, .design-grid > *, .brochure-grid > *, .footer-col'
    );
    
    animateElements.forEach(el => {
        el.classList.add('animate-on-scroll');
    });
    
    // Intersection Observer
    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -50px 0px',
        threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    animateElements.forEach(el => {
        observer.observe(el);
    });
}

/**
 * Header Background on Scroll
 */
function initHeaderScroll() {
    const headerMain = document.querySelector('.header-main');
    if (!headerMain) return;
    
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        // Add shadow on scroll to white box only
        if (currentScroll > 50) {
            headerMain.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
        } else {
            headerMain.style.boxShadow = 'none';
        }
    }, { passive: true });
}

/**
 * Hero Image Swap on Nav Hover
 */
function initHeroImageSwap() {
    const navLinks = document.querySelectorAll('.nav-secondary .nav-list a[data-hero-image]');
    const heroVideo = document.querySelector('.hero-video');
    const heroImage = document.querySelector('.hero-hover-image');
    
    if (!navLinks.length || !heroImage || !heroVideo) return;

    const hoverOutDelay = 200;
    let hoverOutTimeout = null;
    
    // Preload images for smooth transitions
    navLinks.forEach(link => {
        const imgSrc = link.getAttribute('data-hero-image');
        if (imgSrc) {
            const preloadImg = new Image();
            preloadImg.src = imgSrc;
        }
    });
    
    navLinks.forEach(link => {
        link.addEventListener('mouseenter', () => {
            if (hoverOutTimeout) {
                clearTimeout(hoverOutTimeout);
                hoverOutTimeout = null;
            }
            const newImage = link.getAttribute('data-hero-image');
            if (newImage) {
                heroVideo.style.opacity = '0';
                heroImage.style.opacity = '0';
                setTimeout(() => {
                    heroImage.src = newImage;
                    heroImage.style.opacity = '1';
                }, 150);
            }
        });
        
        link.addEventListener('mouseleave', () => {
            heroImage.style.opacity = '0';
            hoverOutTimeout = setTimeout(() => {
                heroImage.src = '';
                heroVideo.style.opacity = '1';
                hoverOutTimeout = null;
            }, hoverOutDelay);
        });
    });
}

/**
 * Utility: Debounce function
 */
function debounce(func, wait = 100) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Handle window resize
 */
window.addEventListener('resize', debounce(() => {
    // Recalculate carousel on resize
    const track = document.querySelector('.reference-track');
    if (track) {
        track.scrollLeft = 0;
    }
}, 250));
