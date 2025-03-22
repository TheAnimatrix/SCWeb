<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    opacity?: number;
    particleCount?: number;
    color?: string;
  }

  let { opacity = 0.4, particleCount = 40, color = 'hsl(var(--accent-hue), var(--accent-saturation), var(--accent-lightness))' }: Props = $props();
  
  interface Particle {
    x: number;
    y: number;
    radius: number;
    velocity: {
      x: number;
      y: number;
    };
    alpha: number;
    decreasing: boolean;
  }

  let smokeCanvas: HTMLCanvasElement = $state();
  let colorHelper: HTMLDivElement = $state();

  function createParticle(): Particle {
    const radius = Math.random() * 180 + 120;
    return {
      x: Math.random() * (smokeCanvas?.width || 0),
      y: (smokeCanvas?.height || 0) + radius,
      radius: radius,
      velocity: {
        x: (Math.random() - 0.5) * 0.4,
        y: -Math.random() * 0.7 - 0.4
      },
      alpha: 0.07 + Math.random() * 0.08,
      decreasing: Math.random() > 0.5
    };
  }

  onMount(() => {
    if (!smokeCanvas || !colorHelper) return;

    const ctx = smokeCanvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      smokeCanvas.width = smokeCanvas.offsetWidth;
      smokeCanvas.height = smokeCanvas.offsetHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push(createParticle());
    }

    function updateSmoke() {
      if (!ctx || !colorHelper) return;
      
      ctx.clearRect(0, 0, smokeCanvas.width, smokeCanvas.height);

      // Get the computed RGB values from our helper div
      const computedStyle = window.getComputedStyle(colorHelper);
      const backgroundColor = computedStyle.backgroundColor;
      const rgbMatch = backgroundColor.match(/\d+/g);
      const [r, g, b] = rgbMatch ? rgbMatch.map(Number) : [194, 255, 0];

      for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];

        particle.x += particle.velocity.x;
        particle.y += particle.velocity.y;

        if (particle.decreasing) {
          particle.alpha -= 0.0005;
          if (particle.alpha <= 0.06) {
            particle.decreasing = false;
          }
        } else {
          particle.alpha += 0.0005;
          if (particle.alpha >= 0.15) {
            particle.decreasing = true;
          }
        }

        ctx.beginPath();
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.radius
        );
        
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${particle.alpha})`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();

        if (particle.y < -particle.radius || 
            particle.x < -particle.radius || 
            particle.x > smokeCanvas.width + particle.radius) {
          particles[i] = createParticle();
        }
      }

      requestAnimationFrame(updateSmoke);
    }

    updateSmoke();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  });
</script>

<div class="smoke-container absolute inset-0 z-0 overflow-hidden mix-blend-screen" style="opacity: {opacity}">
  <!-- Hidden div to sample the color -->
  <div 
    bind:this={colorHelper} 
    class="hidden" 
    style="background-color: {color}"
  ></div>
  <canvas bind:this={smokeCanvas} class="w-full h-full"></canvas>
</div> 