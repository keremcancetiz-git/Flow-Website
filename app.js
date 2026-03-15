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
            const deltaP = ((V2 * V2 * 0.5) * visc) / 10;

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

    // --- 5. FTIR Spectroscopy Module (Canvas & DOM) ---
    function initFtir() {
        const canvas = document.getElementById('ftir-canvas');
        const ctx = canvas.getContext('2d');

        const elGas = document.getElementById('ftir-gas');
        const elConc = document.getElementById('ftir-conc');
        const elPress = document.getElementById('ftir-press');
        const elTemp = document.getElementById('ftir-temp');

        const dispConc = document.getElementById('val-ftir-conc');
        const dispPress = document.getElementById('val-ftir-press');
        const dispTemp = document.getElementById('val-ftir-temp');

        // Gas Spectroscopic Data (Approximations for Education)
        const gasData = {
            'co2': {
                name: 'Carbon Dioxide',
                color: '#ef4444',
                peaks: [[2349, 1.0, 15], [667, 0.6, 20]],
                xMin: 500, xMax: 3000
            },
            'h2o': {
                name: 'Water Vapor',
                color: '#3b82f6',
                peaks: [[1595, 0.8, 40], [3657, 0.5, 30], [3756, 0.7, 30]],
                xMin: 1000, xMax: 4000
            },
            'ch4': {
                name: 'Methane',
                color: '#10b981',
                peaks: [[1306, 0.7, 25], [3019, 0.9, 15]],
                xMin: 800, xMax: 3500
            }
        };

        function drawSpectrum() {
            const gasKey = elGas.value;
            const conc = parseFloat(elConc.value) / 100;
            const P = parseFloat(elPress.value);
            const T = parseFloat(elTemp.value) + 273.15;

            dispConc.textContent = elConc.value;
            dispPress.textContent = P.toFixed(1);
            dispTemp.textContent = elTemp.value;

            const gas = gasData[gasKey];
            const densityFactor = conc * (P / (T / 298.15));
            const totalBroadening = Math.max(1, P * 1.5) * Math.max(1, Math.sqrt(T / 298.15));

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let i = 1; i < 10; i++) {
                let x = (canvas.width / 10) * i;
                ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
                let y = (canvas.height / 4) * i;
                ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
            }
            ctx.stroke();

            ctx.beginPath();
            ctx.strokeStyle = gas.color;
            ctx.lineWidth = 2;
            const numPoints = canvas.width;
            const xRange = gas.xMax - gas.xMin;

            for (let i = 0; i <= numPoints; i++) {
                let wavenumber = gas.xMin + (i / numPoints) * xRange;
                let totalAbsorbance = 0;
                gas.peaks.forEach(peak => {
                    let [center, strength, baseWidth] = peak;
                    let currentWidth = baseWidth * totalBroadening;
                    let distance = Math.abs(wavenumber - center);
                    totalAbsorbance += (strength * densityFactor) / (1 + Math.pow(distance / currentWidth, 2));
                });
                let visualY = canvas.height - (Math.min(totalAbsorbance / 1.2, 1) * canvas.height);
                visualY += (Math.random() - 0.5) * (T / 800) * 5;
                if (i === 0) ctx.moveTo(i, visualY);
                else ctx.lineTo(i, Math.max(0, visualY));
            }
            ctx.stroke();

            const particles = document.getElementById('ftir-particles');
            if (particles) particles.style.backgroundColor = gas.color;
        }

        elGas.addEventListener('change', drawSpectrum);
        elConc.addEventListener('input', drawSpectrum);
        elPress.addEventListener('input', drawSpectrum);
        elTemp.addEventListener('input', drawSpectrum);
        drawSpectrum();
    }

    // --- 6. Molecular View Module (Canvas Particle-Photon) ---
    function initMolecularView() {
        const canvas = document.getElementById('molecular-canvas');
        const ctx = canvas.getContext('2d');

        const elCross = document.getElementById('mol-cross');
        const elSpeed = document.getElementById('mol-speed');
        const elDensity = document.getElementById('mol-density');
        const elFlux = document.getElementById('mol-flux');

        const dispCross = document.getElementById('val-mol-cross');
        const dispSpeed = document.getElementById('val-mol-speed');
        const dispDensity = document.getElementById('val-mol-density');

        let molecules = [];
        let photons = [];
        let frameCount = 0;

        class Molecule {
            constructor() {
                this.reset();
            }
            reset() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.vx = (Math.random() - 0.5) * 2;
                this.vy = (Math.random() - 0.5) * 2;
                this.isExcited = 0;
                this.baseRadius = 8;
            }
            update(speedMult) {
                this.x += this.vx * speedMult;
                this.y += this.vy * speedMult;
                if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
                if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
                if (this.isExcited > 0) this.isExcited -= 0.03;
            }
            draw(ctx, crossMult) {
                const r = this.baseRadius * crossMult;
                ctx.beginPath();
                ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
                if (this.isExcited > 0) {
                    ctx.fillStyle = `rgba(16, 185, 129, ${this.isExcited})`;
                    ctx.strokeStyle = '#10b981';
                    const shake = this.isExcited * 5;
                    ctx.arc(this.x + (Math.random() - 0.5) * shake, this.y + (Math.random() - 0.5) * shake, r, 0, Math.PI * 2);
                } else {
                    ctx.fillStyle = 'rgba(30, 41, 59, 0.05)';
                    ctx.strokeStyle = '#1e293b';
                }
                ctx.lineWidth = 2;
                ctx.fill();
                ctx.stroke();
            }
        }

        class Photon {
            constructor() {
                this.x = 0;
                this.y = Math.random() * canvas.height;
                this.speed = 5;
            }
            update() {
                this.x += this.speed;
            }
            draw(ctx) {
                ctx.beginPath();
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 2;
                ctx.moveTo(this.x, this.y);
                for (let i = 0; i < 15; i += 3) {
                    ctx.lineTo(this.x - i, this.y + Math.sin((this.x - i) * 0.4) * 4);
                }
                ctx.stroke();
            }
        }

        function syncMolecules() {
            const count = parseInt(elDensity.value);
            while (molecules.length < count) molecules.push(new Molecule());
            while (molecules.length > count) molecules.pop();
            dispDensity.textContent = count;
        }

        function simLoop() {
            const speedVal = parseInt(elSpeed.value);
            const crossMult = parseFloat(elCross.value);
            const flux = parseInt(elFlux.value);

            dispSpeed.textContent = speedVal > 7 ? 'High' : (speedVal < 3 ? 'Low' : 'Normal');
            dispCross.textContent = crossMult.toFixed(1);

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (frameCount % Math.max(1, Math.floor(40 / flux)) === 0) {
                photons.push(new Photon());
            }

            molecules.forEach(m => {
                m.update(speedVal / 3);
                m.draw(ctx, crossMult);
            });

            for (let i = photons.length - 1; i >= 0; i--) {
                const p = photons[i];
                p.update();
                p.draw(ctx);
                let absorbed = false;
                for (let m of molecules) {
                    const dx = p.x - m.x;
                    const dy = p.y - m.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < m.baseRadius * crossMult * 1.2) {
                        m.isExcited = 1.0;
                        absorbed = true;
                        break;
                    }
                }
                if (absorbed || p.x > canvas.width + 20) photons.splice(i, 1);
            }
            frameCount++;
            requestAnimationFrame(simLoop);
        }

        elDensity.addEventListener('input', syncMolecules);
        syncMolecules();
        simLoop();
    }

    // Initialize all modules
    initIdealGas();
    initPipeFlow();
    initCompressible();
    initFtir();
    initMolecularView();
});
