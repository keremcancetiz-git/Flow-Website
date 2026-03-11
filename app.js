// app.js
// Fluid Dynamics Educational Dashboard Logic

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Tab Navigation System ---
    const tabs = document.querySelectorAll('.tab-btn');
    const sections = document.querySelectorAll('.module-section');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all
            tabs.forEach(t => t.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));

            // Add active to clicked
            tab.classList.add('active');
            const targetId = tab.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // --- 2. Ideal Gas Law Module (Canvas Physics) ---
    function initIdealGas() {
        const canvas = document.getElementById('ideal-gas-canvas');
        const ctx = canvas.getContext('2d');

        // Dom Elements
        const elTemp = document.getElementById('ig-temp');
        const elVol = document.getElementById('ig-vol');
        const elMoles = document.getElementById('ig-moles');

        const dispTemp = document.getElementById('val-ig-temp');
        const dispVol = document.getElementById('val-ig-vol');
        const dispMoles = document.getElementById('val-ig-moles');
        const dispPressure = document.getElementById('val-ig-pressure');

        // Physics constants (abstracted for visualization)
        const R = 0.0821; // L*atm / K*mol

        let particles = [];
        let animationId;

        class Particle {
            constructor(x, y, speedMult) {
                this.x = x;
                this.y = y;
                this.vx = (Math.random() - 0.5) * speedMult;
                this.vy = (Math.random() - 0.5) * speedMult;
                this.radius = 3;
            }

            update(bounds, speedMult) {
                // Adjust speed based on temperature modifier
                const currentSpeedSq = this.vx * this.vx + this.vy * this.vy;
                const targetSpeedSq = (speedMult * speedMult) + 1;

                // Slowly adjust velocity towards target temperature
                if (currentSpeedSq < targetSpeedSq) {
                    this.vx *= 1.05; this.vy *= 1.05;
                } else if (currentSpeedSq > targetSpeedSq) {
                    this.vx *= 0.95; this.vy *= 0.95;
                }

                this.x += this.vx;
                this.y += this.vy;

                // Bounce off walls (accounting for dynamic volume/height)
                if (this.x <= this.radius || this.x >= bounds.width - this.radius) this.vx *= -1;
                if (this.y <= bounds.top + this.radius || this.y >= bounds.height - this.radius) this.vy *= -1;

                // Containment strict
                if (this.y < bounds.top) this.y = bounds.top + this.radius;
            }

            draw(ctx, tempRatio) {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                // Color shifts from blue (cold) to red (hot)
                const r = Math.floor(tempRatio * 255);
                const b = Math.floor((1 - tempRatio) * 255);
                ctx.fillStyle = `rgb(${r}, 50, ${b})`;
                ctx.fill();
            }
        }

        function updatePhysics() {
            const T = parseFloat(elTemp.value);
            const V = parseFloat(elVol.value);
            const n = parseFloat(elMoles.value);

            // Calculate Pressure P = nRT/V
            const P = (n * R * T) / V;

            // Update Displays
            dispTemp.textContent = T;
            dispVol.textContent = V.toFixed(1);
            dispMoles.textContent = n.toFixed(1);
            dispPressure.textContent = P.toFixed(1);

            // Visual Mapping
            const volumeHeight = (V / 20) * canvas.height; // Maps 20L max to full canvas
            const pistonTop = canvas.height - volumeHeight;
            const tempRatio = (T - 100) / 900; // 0 to 1
            const speedMult = 2 + (tempRatio * 8); // Speed based on temp
            const targetParticleCount = Math.floor(n * 100); // 1 mol = 100 dots

            // Adjust particle count
            while (particles.length < targetParticleCount) {
                particles.push(new Particle(
                    canvas.width / 2,
                    canvas.height - (volumeHeight / 2),
                    speedMult
                ));
            }
            while (particles.length > targetParticleCount) {
                particles.pop();
            }

            return { pistonTop, speedMult, tempRatio, volumeHeight };
        }

        function drawLoop() {
            const state = updatePhysics();

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw Piston
            ctx.fillStyle = '#cbd5e1'; // metal
            ctx.fillRect(0, 0, canvas.width, state.pistonTop);
            // Piston bottom edge
            ctx.fillStyle = '#64748b';
            ctx.fillRect(0, state.pistonTop - 10, canvas.width, 10);

            // Draw bounding box
            const bounds = {
                top: state.pistonTop,
                width: canvas.width,
                height: canvas.height
            };

            // Update and draw particles
            particles.forEach(p => {
                p.update(bounds, state.speedMult);
                p.draw(ctx, state.tempRatio);
            });

            animationId = requestAnimationFrame(drawLoop);
        }

        drawLoop();
    }

    // --- 3. Pipe Flow Module (DOM Animation) ---
    function initPipeFlow() {
        const elDiameter = document.getElementById('pf-diameter');
        const elViscosity = document.getElementById('pf-viscosity');

        const dispDia = document.getElementById('val-pf-diameter');
        const dispVisc = document.getElementById('val-pf-viscosity');
        const dispVel = document.getElementById('val-pf-velocity');
        const dispDrop = document.getElementById('val-pf-drop');
        const pipeInner = document.getElementById('venturi-pipe');
        const particles = document.getElementById('pipe-particles');

        const viscLabels = { 1: 'Water', 2: 'Oil', 3: 'Honey' };

        function updateFlow() {
            const D = parseInt(elDiameter.value);
            const visc = parseInt(elViscosity.value);

            dispDia.textContent = D;
            dispVisc.textContent = viscLabels[visc];

            // 1. Math: Velocity increases as diameter decreases (A1V1 = A2V2)
            // Assume V1 is constants 1.0 m/s at 100% boundary.
            const areaRatio = 100 / D; // simplified 2D ratio instead of Area for dramatic effect
            const V2 = 1.0 * areaRatio;

            // 2. Math: Pressure Drop relates to velocity squared and viscosity
            const deltaP = (V2 * V2 * 0.5) * visc;

            dispVel.textContent = V2.toFixed(1);
            dispDrop.textContent = deltaP.toFixed(1);

            // 3. Visuals: Adjust CSS clip-path for venturi effect
            // D = 100 means no pinch. D = 20 means severe pinch.
            const pinch = Math.max(0, (100 - D) / 2); // % to bring in top/bottom
            pipeInner.style.clipPath = `polygon(0 0, 30% 0, 50% ${pinch}%, 70% 0, 100% 0, 100% 100%, 70% 100%, 50% ${100 - pinch}%, 30% 100%, 0 100%)`;

            // 4. Visuals: Speed up particles
            const visualSpeed = Math.max(0.2, 2 / areaRatio); // seconds for animation
            particles.style.animationDuration = `${visualSpeed}s`;
        }

        elDiameter.addEventListener('input', updateFlow);
        elViscosity.addEventListener('input', updateFlow);
        updateFlow();
    }

    // --- 4. Compressible Flow Module (DOM Animation) ---
    function initCompressible() {
        const elTemp = document.getElementById('cf-temp');
        const elPress = document.getElementById('cf-pressure');

        const dispTemp = document.getElementById('val-cf-temp');
        const dispPress = document.getElementById('val-cf-pressure');

        const readVol = document.getElementById('readout-cfm');
        const readMass = document.getElementById('readout-slpm');

        const vizVol = document.querySelector('.vol-dots');
        const vizMass = document.querySelector('.mass-dots');

        function updateCompressible() {
            const T_celcius = parseFloat(elTemp.value);
            const T_kelvin = T_celcius + 273.15;
            const P = parseFloat(elPress.value);

            dispTemp.textContent = T_celcius;
            dispPress.textContent = P.toFixed(1);

            // Base Mass Flow is 10.0 SLPM
            const trueMassFlow = 10.0;

            // Volumetric Flow alters wildly based on Environment (Ideal Gas Law manipulation)
            // V = nRT/P. If T goes up, V goes up. If P goes up, V goes down.
            // Baseline 20C (293.15K) and 1atm
            const baseT = 293.15;
            const baseP = 1.0;

            const volumeMultiplier = (T_kelvin / baseT) * (baseP / P);
            const confusedVolumetricFlow = trueMassFlow * volumeMultiplier;

            // Update UI Numbers
            readVol.textContent = confusedVolumetricFlow.toFixed(1);
            readMass.textContent = trueMassFlow.toFixed(1);

            // Update UI Visuals (Width of the bar represents measured volume)
            // Cap visual width at 100%
            let visualWidthVol = Math.min(100, Math.max(10, 50 * volumeMultiplier));
            vizVol.style.width = `${visualWidthVol}%`;

            // Mass Visual stays perfectly stable
            vizMass.style.width = `50%`;

            // Change density of dots for volume (looks thinner when expanded)
            let dotSpacing = Math.max(5, 15 * volumeMultiplier);
            vizVol.style.backgroundSize = `${dotSpacing}px ${dotSpacing}px`;
        }

        elTemp.addEventListener('input', updateCompressible);
        elPress.addEventListener('input', updateCompressible);
        updateCompressible();
    }

    // Initialize all modules
    initIdealGas();
    initPipeFlow();
    initCompressible();
});
