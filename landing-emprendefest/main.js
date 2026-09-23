/* ==========================================================
   Emprendefest Córdoba rumbo a Buenos Aires
   ----------------------------------------------------------
   LINKS: reemplazar los "" por las URLs reales cuando estén.
   Mientras un link esté vacío, el botón muestra un aviso
   "disponible pronto" en lugar de navegar.
   ========================================================== */
const LINKS = {
  GENERAL_CHECKOUT_URL: "",
  VIP_CHECKOUT_URL: "",
  EMBAJADORA_FORM_URL: "",
  WHATSAPP_URL: "", // ej: "https://wa.me/549351XXXXXXX?text=Hola!%20Tengo%20una%20duda"
};

const PENDING_MESSAGES = {
  GENERAL_CHECKOUT_URL: "El link de compra de la entrada General estará disponible muy pronto.",
  VIP_CHECKOUT_URL: "El link de compra de la entrada VIP estará disponible muy pronto.",
  EMBAJADORA_FORM_URL: "El formulario de Embajadoras estará disponible muy pronto.",
  WHATSAPP_URL: "El contacto por WhatsApp estará disponible muy pronto.",
};

(function () {
  document.documentElement.classList.add("js");

  /* ---------- Toast ---------- */
  const toast = document.querySelector("[data-toast]");
  let toastTimer;
  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3200);
  }

  /* ---------- Links externos (checkout, formulario, WhatsApp) ---------- */
  document.querySelectorAll("[data-link]").forEach((el) => {
    const key = el.getAttribute("data-link");
    const url = (LINKS[key] || "").trim();
    if (url) {
      el.setAttribute("href", url);
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener");
    } else {
      el.addEventListener("click", (event) => {
        event.preventDefault();
        showToast(PENDING_MESSAGES[key] || "Disponible muy pronto.");
      });
    }
  });

  /* ---------- Header al hacer scroll ---------- */
  const header = document.querySelector("[data-header]");
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 12);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Menú mobile ---------- */
  const toggle = document.querySelector("[data-menu-toggle]");
  const nav = document.querySelector("[data-nav]");
  const toggleLabel = toggle.querySelector(".sr-only");

  function setMenu(open) {
    toggle.setAttribute("aria-expanded", String(open));
    toggleLabel.textContent = open ? "Cerrar menú" : "Abrir menú";
    nav.classList.toggle("is-open", open);
    header.classList.toggle("menu-open", open);
    document.body.style.overflow = open ? "hidden" : "";
  }

  toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
  nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("is-open")) {
      setMenu(false);
      toggle.focus();
    }
  });
  window.matchMedia("(min-width: 900px)").addEventListener("change", (e) => {
    if (e.matches) setMenu(false);
  });

  /* ---------- CTA fija en mobile ---------- */
  const mobileCta = document.querySelector("[data-mobile-cta]");
  const hero = document.getElementById("inicio");
  const closing = document.getElementById("cierre");
  const tickets = document.getElementById("entradas");

  if ("IntersectionObserver" in window) {
    const visible = new Map();
    const updateCta = () => {
      const show = !visible.get(hero) && !visible.get(closing) && !visible.get(tickets);
      mobileCta.classList.toggle("is-visible", show);
      mobileCta.setAttribute("aria-hidden", String(!show));
      mobileCta.querySelector("a").tabIndex = show ? 0 : -1;
    };
    const ctaObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => visible.set(entry.target, entry.isIntersecting));
      updateCta();
    });
    [hero, closing, tickets].forEach((el) => {
      visible.set(el, true);
      ctaObserver.observe(el);
    });

    /* ---------- Aparición suave ---------- */
    const revealTargets = document.querySelectorAll(
      ".section-head, .split, .concepts, .ticket, .tickets-note, .pack, .amb-row, .future, .route, .bonus, .faq, .closing-inner"
    );
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px" }
    );
    revealTargets.forEach((el) => {
      el.classList.add("reveal");
      revealObserver.observe(el);
    });
  }
})();
