document.addEventListener('DOMContentLoaded', () => {
    const room = document.querySelector('.room');
    const backWall = document.querySelector('.back-wall');
    
    // Config
    const spacing = 800; // Distance between projects
    const startOffset = 500; // Initial offset from camera
    
    // Real Project Data
    const projects = [
        { 
            title: "ThisChairDoesNotExist", 
            image: "assets/ThisChairDoesNotExist.jpg",
            position: "pos-center", 
            url: "home.html" 
        },
        { 
            title: "From End to End", 
            image: "assets/From End to End .jpg",
            position: "pos-tl", 
            url: "home.html" 
        },
        { 
            title: "VISTA", 
            image: "assets/VISTA.jpg",
            position: "pos-tr", 
            url: "home.html" 
        },
        { 
            title: "Stools Shuttlecock", 
            image: "assets/Stools Shuttlecock.jpg",
            position: "pos-bl", 
            url: "home.html" 
        },
        { 
            title: "Light and Darkness", 
            image: "assets/Light and Darkness.jpg",
            position: "pos-br", 
            url: "home.html" 
        },
        { 
            title: "Bamboo Whispers", 
            image: "assets/BambooWhispers.png",
            position: "pos-center", 
            url: "home.html" 
        },
        { 
            title: "DepoRooms", 
            image: "assets/DepoRooms.jpg",
            position: "pos-tl", 
            url: "home.html" 
        }
    ];

    // State
    let state = {
        scrollZ: 0,
        targetScrollZ: 0,
        // Increased maxScroll to allow reaching further projects like Delta/Epsilon
        maxScroll: (projects.length + 3) * spacing, 
        roomDepth: (projects.length + 4) * spacing, // Ensure room is deep enough
        roomHeight: window.innerHeight
    };

    // DOM Elements for Wireframe
    const markers = {
        tl: document.querySelector('.marker.tl'),
        tr: document.querySelector('.marker.tr'),
        bl: document.querySelector('.marker.bl'),
        br: document.querySelector('.marker.br')
    };
    const svgLines = {
        tl: document.querySelector('.depth-line.tl'),
        tr: document.querySelector('.depth-line.tr'),
        bl: document.querySelector('.depth-line.bl'),
        br: document.querySelector('.depth-line.br')
    };
    const backRect = document.querySelector('.back-rect');

    // Init
    initGallery();
    setupDarkMode();

    function initGallery() {
        // Set room depth CSS variable
        document.documentElement.style.setProperty('--room-depth', `${state.roomDepth}px`);

        // Available positions
        const positions = ['pos-center', 'pos-tl', 'pos-tr', 'pos-bl', 'pos-br'];

        // Generate Project Planes
        projects.forEach((proj, index) => {
            const partition = document.createElement('div');
            partition.classList.add('wall', 'partition');
            
            // Calculate Position
            // Start from front (approx state.roomDepth/2) and go backwards
            // Z = (Depth/2) - (index * spacing) - startOffset
            const zPos = (state.roomDepth / 2) - (index * spacing) - startOffset;
            
            partition.style.width = 'var(--room-width)';
            partition.style.height = 'var(--room-height)';
            partition.style.transform = `translateZ(${zPos}px)`;
            
            // Content
            // Change div to anchor tag for clickability if URL is provided
            const card = document.createElement(proj.url ? 'a' : 'div');
            card.classList.add('gallery-card');
            if (proj.url) {
                card.href = proj.url;
                // Optional: Open in new tab?
                // card.target = "_blank"; 
            }
            
            // Random Position or Specific Position
            let positionClass = '';
            if (proj.position) {
                positionClass = proj.position;
            } else {
                positionClass = positions[Math.floor(Math.random() * positions.length)];
            }
            card.classList.add(positionClass);
            
            // Project Image with lazy loading
            const img = document.createElement('img');
            img.src = proj.image;
            img.alt = proj.title;
            img.classList.add('gallery-card-image');
            img.loading = 'lazy'; // Native lazy loading
            img.decoding = 'async'; // Non-blocking decode
            
            const title = document.createElement('h2');
            title.textContent = proj.title;
            
            card.appendChild(img);
            card.appendChild(title);
            partition.appendChild(card);
            
            room.insertBefore(partition, backWall);
        });

        // Loop
        animate();
    }

    // Scroll Handling (mouse wheel + touch swipe)
    const wheelSpeed = 2.5;
    const touchMultiplier = 3; // Stronger response for shorter swipe distance
    let lastTouchY = null;

    function applyScrollDelta(delta) {
        state.targetScrollZ += delta;
        state.targetScrollZ = Math.max(0, Math.min(state.targetScrollZ, state.maxScroll));
    }

    window.addEventListener('wheel', (e) => {
        // e.deltaY is usually positive for scrolling down/pulling towards user -> "Moving Forward"
        // Let's say scroll down = move forward into tunnel
        applyScrollDelta(e.deltaY * wheelSpeed);
    }, { passive: true });

    window.addEventListener('touchstart', (e) => {
        if (e.touches.length === 0) return;
        lastTouchY = e.touches[0].clientY;
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
        if (lastTouchY === null || e.touches.length === 0) return;
        const currentY = e.touches[0].clientY;
        const deltaY = (lastTouchY - currentY) * touchMultiplier;
        lastTouchY = currentY;
        applyScrollDelta(deltaY);
        e.preventDefault(); // Keep control similar to wheel to avoid native scroll
    }, { passive: false });

    window.addEventListener('touchend', () => {
        lastTouchY = null;
    }, { passive: true });

    // Throttle wireframe updates for better performance
    let frameCount = 0;
    const wireframeUpdateInterval = 3; // Update wireframe every N frames
    
    function animate() {
        // Smooth Scroll (Lerp)
        const diff = state.targetScrollZ - state.scrollZ;
        
        // Only update if there's meaningful change
        if (Math.abs(diff) > 0.01) {
            state.scrollZ += diff * 0.1;
            
            // Apply Transform
            // We move the room TOWARDS the camera to simulate moving forward
            // Initial room Z is -depth/2. We Add scrollZ.
            const baseZ = state.roomDepth / -2;
            const finalZ = baseZ + state.scrollZ;
            
            room.style.transform = `translateZ(${finalZ}px)`;
            
            // Update Wireframe less frequently for performance
            frameCount++;
            if (frameCount >= wireframeUpdateInterval) {
                updateWireframe();
                frameCount = 0;
            }
        }
        
        requestAnimationFrame(animate);
    }

    // Check if wireframe is visible (CSS may hide it)
    const wireframeOverlay = document.querySelector('.wireframe-overlay');
    const isWireframeVisible = wireframeOverlay && 
        window.getComputedStyle(wireframeOverlay).display !== 'none';

    // Wireframe Logic (Copied/Adapted) - only run if visible
    function updateWireframe() {
        // Skip expensive calculations if wireframe is hidden
        if (!isWireframeVisible) return;
        
        const tl = markers.tl.getBoundingClientRect();
        const tr = markers.tr.getBoundingClientRect();
        const bl = markers.bl.getBoundingClientRect();
        const br = markers.br.getBoundingClientRect();

        const w = window.innerWidth;
        const h = window.innerHeight;

        setLine(svgLines.tl, 0, 0, tl.left, tl.top);
        setLine(svgLines.tr, w, 0, tr.left, tr.top);
        setLine(svgLines.bl, 0, h, bl.left, bl.top);
        setLine(svgLines.br, w, h, br.left, br.top);

        const points = `${tl.left},${tl.top} ${tr.left},${tr.top} ${br.left},${br.top} ${bl.left},${bl.top}`;
        backRect.setAttribute('points', points);
    }

    function setLine(line, x1, y1, x2, y2) {
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
    }

    window.addEventListener('resize', () => {
        state.roomHeight = window.innerHeight;
    });

    function setupDarkMode() {
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (darkModeToggle) {
            const savedMode = localStorage.getItem('darkMode');
            if (savedMode === 'true') {
                document.body.classList.add('dark-mode');
                darkModeToggle.textContent = '●';
                darkModeToggle.classList.add('active');
            }

            darkModeToggle.addEventListener('click', () => {
                document.body.classList.toggle('dark-mode');
                const isDark = document.body.classList.contains('dark-mode');
                darkModeToggle.textContent = isDark ? '●' : '○';
                darkModeToggle.classList.toggle('active', isDark);
                localStorage.setItem('darkMode', isDark);
            });
        }
    }
});
