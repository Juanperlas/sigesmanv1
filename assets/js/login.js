/**
 * Script para la página de login
 */
document.addEventListener("DOMContentLoaded", () => {
  // Inicializar partículas
  if (typeof particlesJS !== "undefined") {
    particlesJS("particles-js", {
      particles: {
        number: {
          value: 80,
          density: {
            enable: true,
            value_area: 800,
          },
        },
        color: {
          value: "#f5a623",
        },
        shape: {
          type: "circle",
          stroke: {
            width: 0,
            color: "#000000",
          },
          polygon: {
            nb_sides: 5,
          },
        },
        opacity: {
          value: 0.5,
          random: true,
          anim: {
            enable: true,
            speed: 1,
            opacity_min: 0.1,
            sync: false,
          },
        },
        size: {
          value: 3,
          random: true,
          anim: {
            enable: true,
            speed: 2,
            size_min: 0.1,
            sync: false,
          },
        },
        line_linked: {
          enable: true,
          distance: 150,
          color: "#f5a623",
          opacity: 0.4,
          width: 1,
        },
        move: {
          enable: true,
          speed: 1,
          direction: "none",
          random: true,
          straight: false,
          out_mode: "out",
          bounce: false,
          attract: {
            enable: false,
            rotateX: 600,
            rotateY: 1200,
          },
        },
      },
      interactivity: {
        detect_on: "canvas",
        events: {
          onhover: {
            enable: true,
            mode: "grab",
          },
          onclick: {
            enable: true,
            mode: "push",
          },
          resize: true,
        },
        modes: {
          grab: {
            distance: 140,
            line_linked: {
              opacity: 1,
            },
          },
          bubble: {
            distance: 400,
            size: 40,
            duration: 2,
            opacity: 8,
            speed: 3,
          },
          repulse: {
            distance: 200,
            duration: 0.4,
          },
          push: {
            particles_nb: 4,
          },
          remove: {
            particles_nb: 2,
          },
        },
      },
      retina_detect: true,
    });
  }

  // Efecto de luz que sigue al cursor
  const lightEffect = document.querySelector(".light-effect");

  if (lightEffect) {
    document.addEventListener("mousemove", (e) => {
      // Solo seguir el cursor en pantallas grandes
      if (window.innerWidth > 992) {
        lightEffect.style.animation = "none";
        lightEffect.style.top = e.clientY + "px";
        lightEffect.style.left = e.clientX + "px";
      } else {
        // En pantallas pequeñas, volver a la animación automática
        lightEffect.style.animation =
          "moveLight 15s infinite alternate ease-in-out";
      }
    });
  }

  // Mostrar/ocultar contraseña
  const togglePassword = document.querySelector(".toggle-password");
  const passwordInput = document.querySelector("#contrasena");

  if (togglePassword && passwordInput) {
    togglePassword.addEventListener("click", function () {
      const type =
        passwordInput.getAttribute("type") === "password" ? "text" : "password";
      passwordInput.setAttribute("type", type);

      // Cambiar el icono
      const icon = this.querySelector("i");
      icon.classList.toggle("bi-eye");
      icon.classList.toggle("bi-eye-slash");
    });
  }

  // Animación de entrada para los elementos
  const animateElements = [
    document.querySelector(".login-header"),
    document.querySelector(".login-form"),
    document.querySelector(".login-content"),
  ];

  animateElements.forEach((element, index) => {
    if (element) {
      element.style.opacity = "0";
      element.style.transform = "translateY(20px)";

      setTimeout(() => {
        element.style.transition = "opacity 0.8s ease, transform 0.8s ease";
        element.style.opacity = "1";
        element.style.transform = "translateY(0)";
      }, 100 * (index + 1));
    }
  });

  // Efecto de enfoque en los campos de entrada
  const inputs = document.querySelectorAll("input");

  inputs.forEach((input) => {
    input.addEventListener("focus", function () {
      this.parentElement.classList.add("input-focused");
    });

    input.addEventListener("blur", function () {
      this.parentElement.classList.remove("input-focused");
    });
  });

  // Animación del botón de login
  const loginButton = document.querySelector(".login-button");

  if (loginButton) {
    loginButton.addEventListener("mouseenter", function () {
      const icon = this.querySelector("i");
      if (icon) {
        icon.style.transform = "translateX(4px)";
      }
    });

    loginButton.addEventListener("mouseleave", function () {
      const icon = this.querySelector("i");
      if (icon) {
        icon.style.transform = "translateX(0)";
      }
    });
  }

  // Ocultar preloader cuando la página esté cargada
  const loaderBg = document.querySelector(".loader-bg");
  if (loaderBg) {
    setTimeout(() => {
      loaderBg.style.display = "none";
    }, 500);
  }
});
