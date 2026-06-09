/* ============================================================
   FITFORGE — PARTICLES-CONFIG.JS
   Réseau de données subtil : tsParticles v2 (bundle slim)
   Effet "neural network" lent sur fond noir
   ============================================================ */

(function () {
  'use strict';

  function initParticles() {
    if (typeof tsParticles === 'undefined') {
      // Réessayer dans 200ms si la lib n'est pas encore chargée
      setTimeout(initParticles, 200);
      return;
    }

    // Cibler le canvas existant dans le DOM
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;

    tsParticles.load({
      element: canvas,
      options: {
        fpsLimit: 45,
        pauseOnBlur: true,
        pauseOnOutsideViewport: true,

        background: {
          color: { value: 'transparent' },
        },

        particles: {
          number: {
            value: 55,
            density: { enable: true, area: 900 },
          },

          color: {
            value: ['#ff6600', '#cc5200', '#333333'],
          },

          opacity: {
            value: { min: 0.05, max: 0.35 },
            animation: {
              enable: true,
              speed: 0.4,
              minimumValue: 0.05,
              sync: false,
            },
          },

          size: {
            value: { min: 1, max: 2.5 },
            animation: { enable: false },
          },

          move: {
            enable: true,
            speed: 0.4,
            direction: 'none',
            random: true,
            straight: false,
            outModes: { default: 'bounce' },
            attract: { enable: false },
          },

          links: {
            enable: true,
            distance: 160,
            color: '#ff6600',
            opacity: 0.07,
            width: 1,
            triangles: {
              enable: false,
            },
          },

          shape: {
            type: 'circle',
          },
        },

        interactivity: {
          detectsOn: 'window',
          events: {
            onHover: {
              enable: true,
              mode: 'grab',
            },
            onClick: {
              enable: false,
            },
            resize: true,
          },
          modes: {
            grab: {
              distance: 180,
              links: {
                opacity: 0.25,
                color: '#ff6600',
              },
            },
          },
        },

        detectRetina: true,
      },
    });
  }

  // Démarrer après le DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initParticles);
  } else {
    initParticles();
  }

})();
