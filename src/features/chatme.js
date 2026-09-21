/** Chatme disclosures: shared desktop/mobile content, positioning and idle timers. */
Portfolio.register(
  "chatme",
  ["data", "backgroundField"],
  ({ data, backgroundField }) => {
    const t = Portfolio.t;
    // Keep the visual fade and dismissal timer synchronized from one configuration value.
    document.documentElement.style.setProperty(
      "--chatme-fade-duration",
      `${PORTFOLIO_RUNTIME.chatme.fadeMs}ms`,
    );
    // One message shared by the desktop speech bubble and mobile disclosure.
    document.querySelectorAll(".chatme-bubble").forEach((bubble) => {
      bubble.innerHTML = `<div class="pixel-shell"><div class="pixel-content chatme-content"><div class="chatme-copy"><span class="chatme-eyebrow" data-site="chatme.titleSub"></span><strong data-site="chatme.title"></strong><div data-site-paragraphs="chatme.content"></div><a data-social="email"><span data-i18n="ui.letsTalk">${t("letsTalk")}</span> <span aria-hidden="true">${Icons.svg("arrow-up-right")}</span></a></div><img class="chatme-icon" data-site-src="chatme.icon" src="${Portfolio.escape(data.site.chatme.icon)}" alt="${t("mascot")}" data-i18n-alt="ui.mascot" width="104" height="104"></div></div><span class="pixel-tail chatme-tail" aria-hidden="true"></span><button type="button" class="chatme-close" aria-label="${t("closeChatme")}" data-i18n-aria-label="ui.closeChatme">${Icons.svg("x-lg")}</button>`;
    });
    const chatmeTimers = new Map(
      [...document.querySelectorAll(".chatme-bubble")].map((bubble) => [
        bubble,
        { idle: null, fade: null, appear: null, hovered: false },
      ]),
    );
    /** Cancel both idle and fade timers before changing disclosure state. */
    function cancelChatmeHide(bubble) {
      const state = chatmeTimers.get(bubble);
      clearTimeout(state.idle);
      clearTimeout(state.fade);
      state.idle = state.fade = null;
      bubble.classList.remove("is-fading");
    }
    /** Treat pointer hover and visible keyboard focus as active interaction. */
    function chatmeEngaged(bubble) {
      return (
        chatmeTimers.get(bubble).hovered ||
        Boolean(bubble.querySelector(":focus-visible"))
      );
    }
    /** Start one inactivity countdown only when the disclosure is visible and idle. */
    function scheduleChatmeHide(button) {
      const bubble = document.getElementById(
        button.getAttribute("aria-controls"),
      );
      cancelChatmeHide(bubble);
      if (
        bubble.hidden ||
        chatmeEngaged(bubble) ||
        chatmeTimers.get(bubble).appear !== null
      )
        return;
      const state = chatmeTimers.get(bubble);
      state.idle = setTimeout(() => {
        state.idle = null;
        if (bubble.hidden || chatmeEngaged(bubble)) return;
        if (Portfolio.reducedMotion()) {
          setChatme(button, false);
          return;
        }
        bubble.classList.add("is-fading");
        state.fade = setTimeout(
          () => setChatme(button, false),
          PORTFOLIO_RUNTIME.chatme.fadeMs,
        );
      }, PORTFOLIO_RUNTIME.chatme.idleMs);
    }
    /** Apply open state, accessibility labels, focus restoration and timer policy. */
    function setChatme(button, open, reveal = false) {
      const bubble = document.getElementById(
        button.getAttribute("aria-controls"),
      );
      cancelChatmeHide(bubble);
      const state = chatmeTimers.get(bubble);
      clearTimeout(state.appear);
      state.appear = null;
      bubble.classList.remove("is-appearing");
      if (!open) chatmeTimers.get(bubble).hovered = false;
      if (!open && bubble.contains(document.activeElement))
        button.focus({ preventScroll: true });
      Portfolio.disclosure(button, bubble, open);
      button.setAttribute("aria-label", t(open ? "hideChatme" : "showChatme"));
      positionChatme();
      if (open && reveal && !Portfolio.reducedMotion()) {
        // Count the full idle interval only after the initial fade-in is complete.
        bubble.classList.add("is-appearing");
        state.appear = setTimeout(() => {
          state.appear = null;
          bubble.classList.remove("is-appearing");
          scheduleChatmeHide(button);
        }, PORTFOLIO_RUNTIME.chatme.fadeMs);
      } else if (open) scheduleChatmeHide(button);
    }
    /** Anchor beside the chat icon and clamp narrow-screen disclosures to the viewport. */
    function positionChatme() {
      const mobileBubble = document.querySelector("#chatme-mobile");
      if (Portfolio.isMobile() && !mobileBubble.hidden) {
        const anchor = document
          .querySelector(".mobile-header .chatme-toggle")
          .getBoundingClientRect();
        const box = mobileBubble.getBoundingClientRect();
        mobileBubble.style.setProperty(
          "--chat-tail-left",
          `${Math.max(18, Math.min(anchor.left + anchor.width / 2 - box.left - 3, box.width - 42))}px`,
        );
      }
      const bubble = document.querySelector("#chatme-desktop");
      if (Portfolio.isMobile() || bubble.hidden) return;
      const anchor = document
        .querySelector(".brand-heading .chatme-toggle")
        .getBoundingClientRect();
      const sidebar = document
        .querySelector("#sidebar")
        .getBoundingClientRect();
      bubble.style.visibility =
        anchor.bottom <= sidebar.top || anchor.top >= sidebar.bottom
          ? "hidden"
          : "visible";
      const left = Math.max(
        14,
        Math.min(
          anchor.right + 18,
          window.innerWidth - bubble.offsetWidth - 14,
        ),
      );
      bubble.style.left = `${left}px`;
      const top = Math.max(
        12,
        Math.min(anchor.top, window.innerHeight - bubble.offsetHeight - 12),
      );
      bubble.style.top = `${top}px`;
      bubble.style.setProperty(
        "--chat-tail-top",
        `${Math.max(18, Math.min(anchor.top + anchor.height / 2 - top - 3, bubble.offsetHeight - 42))}px`,
      );
    }
    positionChatme();
    // Track the changing rail width throughout desktop expand/collapse transitions.
    Portfolio.observeLayout(document.querySelector("#sidebar"), positionChatme);
    document
      .querySelector("#sidebar")
      .addEventListener("scroll", positionChatme, { passive: true });
    // Defer the initial message until the frame, content and navigation are settled.
    let initialPending = true;
    document.querySelectorAll(".chatme-toggle").forEach((button) => {
      const bubble = document.getElementById(
        button.getAttribute("aria-controls"),
      );
      const state = chatmeTimers.get(bubble);
      button.addEventListener("click", () => {
        initialPending = false;
        setChatme(
          button,
          bubble.classList.contains("is-fading") || bubble.hidden,
        );
      });
      bubble.addEventListener("pointerenter", (event) => {
        if (event.pointerType === "touch") return;
        state.hovered = true;
        cancelChatmeHide(bubble);
      });
      bubble.addEventListener("pointerleave", (event) => {
        if (event.pointerType === "touch") return;
        state.hovered = false;
        scheduleChatmeHide(button);
      });
      bubble.addEventListener("focusin", () => scheduleChatmeHide(button));
      bubble.addEventListener("focusout", () =>
        queueMicrotask(() => scheduleChatmeHide(button)),
      );
      bubble.addEventListener("pointerdown", (event) => {
        if (event.pointerType === "touch") scheduleChatmeHide(button);
      });
      setChatme(button, false);
    });

    backgroundField.whenReady.then(() => {
      if (!initialPending) return;
      initialPending = false;
      // Choose the current layout, including a resize during the entrance.
      const id = Portfolio.isMobile() ? "chatme-mobile" : "chatme-desktop";
      setChatme(document.querySelector(`[aria-controls="${id}"]`), true, true);
    });

    document.querySelectorAll(".chatme-close").forEach((button) =>
      button.addEventListener("click", () => {
        const bubble = button.closest(".chatme-bubble");
        setChatme(
          document.querySelector(
            `.chatme-toggle[aria-controls="${bubble.id}"]`,
          ),
          false,
        );
      }),
    );
    document.addEventListener("pointerdown", (event) => {
      if (!event.target.closest(".chatme-toggle, .chatme-bubble"))
        setChatme(
          document.querySelector(".mobile-header .chatme-toggle"),
          false,
        );
    });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const activeBubble = document.activeElement.closest(".chatme-bubble");
      document.querySelectorAll(".chatme-toggle").forEach((button) => {
        if (button.getAttribute("aria-expanded") !== "true") return;
        setChatme(button, false);
        if (activeBubble?.id === button.getAttribute("aria-controls"))
          button.focus();
      });
    });

    /**
     * Refresh UI labels and geometry after siteContent fills the chatme.* bindings.
     * Content changes must preserve the existing open state and idle timers.
     */
    function refresh() {
      document
        .querySelectorAll(".chatme-toggle")
        .forEach((button) =>
          button.setAttribute(
            "aria-label",
            t(
              button.getAttribute("aria-expanded") === "true"
                ? "hideChatme"
                : "showChatme",
            ),
          ),
        );
      positionChatme();
    }
    return { refresh };
  },
);
