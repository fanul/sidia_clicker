/* JEV • SYSTEM ONE Cybernetic Vortex Particle Engine */
  class CyberVortex {
    constructor(canvasId) {
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');
      this.particles = [];
      this.numParticles = 280;
      this.speedMult = 1.0;
      this.targetSpeed = 1.0;
      this.heat = 17;
      this.targetHeat = 17;
      this.stageKey = 'idle';
      this.width = 0;
      this.height = 0;
      this.cx = 0;
      this.cy = 0;
      this.dpr = window.devicePixelRatio || 1;
      this.lastFrame = performance.now();

      this.resize();
      window.addEventListener('resize', () => this.resize());
      this.initParticles();
      this.animate = this.animate.bind(this);
      requestAnimationFrame(this.animate);
    }

    resize() {
      if (!this.canvas) return;
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.width = rect.width || 320;
      this.height = rect.height || 255;
      this.canvas.width = Math.floor(this.width * this.dpr);
      this.canvas.height = Math.floor(this.height * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.cx = this.width / 2;
      this.cy = this.height / 2;
    }

    initParticles() {
      this.particles = [];
      // Reference color palette (crimson, ember orange, amber, purple spark, core white)
      const colors = [
        { r: 239, g: 68, b: 68 },   // Crimson
        { r: 249, g: 115, b: 22 },  // Fire Orange
        { r: 251, g: 146, b: 60 },  // Amber Glow
        { r: 250, g: 204, b: 21 },  // Solar Spark
        { r: 192, g: 132, b: 252 }, // Purple Accent
        { r: 255, g: 255, b: 255 }  // Core White Spark
      ];

      const maxRadius = Math.min(this.width || 320, this.height || 255) * 0.48;

      for (let i = 0; i < this.numParticles; i++) {
        const radius = 14 + Math.pow(Math.random(), 0.72) * maxRadius;
        const angle = Math.random() * Math.PI * 2;
        const speed = (0.012 + (1 / Math.sqrt(Math.max(10, radius))) * 0.16) * (0.8 + Math.random() * 0.4);
        const size = 0.8 + Math.random() * 2.2;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const opacity = 0.3 + Math.random() * 0.7;

        this.particles.push({
          r: radius,
          maxR: maxRadius,
          theta: angle,
          baseSpeed: speed,
          size,
          color,
          opacity,
          pulseOffset: Math.random() * Math.PI * 2
        });
      }
    }

    setState(stageKey, heatPercent) {
      this.stageKey = stageKey || 'idle';
      this.targetHeat = Math.min(100, Math.max(10, heatPercent || 17));

      switch (this.stageKey) {
        case 'idle':
          this.targetSpeed = 0.7;
          break;
        case 'navigating':
        case 'tab_selection':
          this.targetSpeed = 1.3;
          break;
        case 'scanning':
        case 'opening_doc':
          this.targetSpeed = 1.7;
          break;
        case 'typing':
        case 'feedback_modal':
          this.targetSpeed = 2.5;
          break;
        case 'rating':
          this.targetSpeed = 1.9;
          break;
        case 'saving':
          this.targetSpeed = 2.9;
          break;
        case 'skipping':
          this.targetSpeed = 2.1;
          break;
        default:
          this.targetSpeed = 1.4;
      }
    }

    animate(now) {
      requestAnimationFrame(this.animate);
      if (!this.ctx || this.width === 0) return;

      this.lastFrame = now;

      // Smooth interpolation for speed and heat
      this.speedMult += (this.targetSpeed - this.speedMult) * 0.08;
      this.heat += (this.targetHeat - this.heat) * 0.08;

      // Motion-blur tail effect preserving deep obsidian background
      this.ctx.fillStyle = 'rgba(6, 7, 10, 0.25)';
      this.ctx.fillRect(0, 0, this.width, this.height);

      const cx = this.cx;
      const cy = this.cy;
      const time = now * 0.001;

      // Center Accretion Radial Glow
      const centerGlow = this.ctx.createRadialGradient(
        cx, cy, 6,
        cx, cy, 82 + Math.sin(time * 3) * 7
      );
      const alphaGlow = 0.16 + (this.heat / 100) * 0.28;
      centerGlow.addColorStop(0, `rgba(239, 68, 68, ${alphaGlow})`);
      centerGlow.addColorStop(0.38, `rgba(249, 115, 22, ${alphaGlow * 0.5})`);
      centerGlow.addColorStop(1, 'rgba(6, 7, 10, 0)');

      this.ctx.save();
      this.ctx.fillStyle = centerGlow;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, 90, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();

      // Swirling Nebula Particles with 3D Accretion Perspective Tilt
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];

        // Angular increment
        p.theta += p.baseSpeed * this.speedMult;

        // Inward vortex spiral drift
        p.r -= 0.11 * this.speedMult;
        if (p.r < 12) {
          p.r = p.maxR * (0.82 + Math.random() * 0.22);
          p.theta = Math.random() * Math.PI * 2;
        }

        // 3D Perspective Galaxy Tilt
        const cosA = Math.cos(p.theta);
        const sinA = Math.sin(p.theta);
        const tiltAngle = -0.22; // ~12 degrees perspective tilt

        const xRot = cosA * p.r * 1.14;
        const yRot = sinA * p.r * 0.82;

        const px = cx + (xRot * Math.cos(tiltAngle) - yRot * Math.sin(tiltAngle));
        const py = cy + (xRot * Math.sin(tiltAngle) + yRot * Math.cos(tiltAngle)) + Math.sin(time * 2.5 + p.pulseOffset) * 2;

        // Fade near core event horizon
        const distRatio = p.r / p.maxR;
        const flicker = 0.8 + Math.sin(time * 4.5 + p.pulseOffset) * 0.2;
        let alpha = p.opacity * flicker;
        if (distRatio < 0.22) alpha *= (distRatio / 0.22);

        this.ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${Math.max(0, Math.min(1, alpha))})`;
        this.ctx.beginPath();
        this.ctx.arc(px, py, Math.max(0.65, p.size * (0.85 + (this.heat / 220))), 0, Math.PI * 2);
        this.ctx.fill();
      }

      // Center Black Hole Event Horizon Void
      const voidGrad = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, 22);
      voidGrad.addColorStop(0, '#06070a');
      voidGrad.addColorStop(0.75, '#06070a');
      voidGrad.addColorStop(1, 'rgba(6, 7, 10, 0)');
      this.ctx.fillStyle = voidGrad;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, 24, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }
