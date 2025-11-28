const glassBaseClasses =
  "backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl shadow-black/20 rounded-2xl";

let confirmModalInstance;
let hoverPreviewInstance;

export function getConfirmModal() {
  if (confirmModalInstance) return confirmModalInstance;

  const modal = document.createElement("div");
  modal.className =
    "fixed inset-0 z-[1200] hidden items-center justify-center bg-black/40 backdrop-blur-sm";

  modal.innerHTML = `
    <div class="${glassBaseClasses} max-w-md w-full mx-4 p-6 text-gray-100 space-y-6 animate-fade-in">
      <div>
        <p class="text-sm tracking-wide text-white/60 uppercase">Confirm Action</p>
        <h2 class="text-2xl font-semibold" data-confirm-title>Are you sure?</h2>
      </div>
      <p class="text-white/70" data-confirm-message>
        This action cannot be undone. Continue?
      </p>
      <div class="flex gap-3 justify-end">
        <button data-confirm-cancel class="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 transition">Cancel</button>
        <button data-confirm-accept class="px-4 py-2 rounded-xl bg-red-500/80 hover:bg-red-500 text-white transition">Confirm Delete</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  let confirmResolver = () => {};

  modal.addEventListener("click", (evt) => {
    if (evt.target === modal) modal.classList.add("hidden");
  });

  modal.querySelector("[data-confirm-cancel]").addEventListener("click", () => {
    modal.classList.add("hidden");
    confirmResolver(false);
  });

  modal.querySelector("[data-confirm-accept]").addEventListener("click", () => {
    modal.classList.add("hidden");
    confirmResolver(true);
  });

  confirmModalInstance = {
    open({ title = "Delete Item", message = "This cannot be undone." } = {}) {
      modal.querySelector("[data-confirm-title]").textContent = title;
      modal.querySelector("[data-confirm-message]").textContent = message;
      modal.classList.remove("hidden");
      return new Promise((resolve) => {
        confirmResolver = resolve;
      });
    },
  };

  return confirmModalInstance;
}

export function getHoverPreview() {
  if (hoverPreviewInstance) return hoverPreviewInstance;

  const tooltip = document.createElement("div");
  tooltip.className = `${glassBaseClasses} fixed z-[1300] max-w-xs p-4 text-sm text-white/90 opacity-0 pointer-events-none transition-opacity duration-150`;
  tooltip.style.transform = "translate(-50%, calc(-100% - 12px))";
  tooltip.setAttribute("role", "tooltip");
  document.body.appendChild(tooltip);

  const show = (content, event) => {
    tooltip.innerHTML = content;
    tooltip.style.left = `${event.clientX}px`;
    tooltip.style.top = `${event.clientY - 12}px`;
    tooltip.style.opacity = "1";
  };

  const move = (event) => {
    tooltip.style.left = `${event.clientX}px`;
    tooltip.style.top = `${event.clientY - 12}px`;
  };

  const hide = () => {
    tooltip.style.opacity = "0";
  };

  hoverPreviewInstance = {
    bind(target, contentGenerator) {
      if (!target) return;
      target.addEventListener("mouseenter", (event) => {
        const content =
          typeof contentGenerator === "function"
            ? contentGenerator(event)
            : contentGenerator;
        show(content, event);
      });
      target.addEventListener("mousemove", move);
      target.addEventListener("mouseleave", hide);
    },
    show,
    hide,
  };

  return hoverPreviewInstance;
}

export function renderFilterButtons(container, filters, activeId, onSelect) {
  if (!container) return;
  container.innerHTML = "";

  filters.forEach(({ id, label }) => {
    const btn = document.createElement("button");
    const isActive = id === activeId;
    btn.className = [
      "px-4 py-2 rounded-full text-sm font-semibold transition",
      glassBaseClasses,
      isActive ? "bg-white/20 text-white shadow-lg" : "text-white/70 hover:bg-white/10",
    ].join(" ");
    btn.textContent = label;
    btn.dataset.filterId = id;
    btn.addEventListener("click", () => {
      onSelect(id);
    });
    container.appendChild(btn);
  });
}

export function fadeTableRow(row) {
  if (!row) return;
  row.style.transition = "opacity 200ms ease, transform 200ms ease";
  row.style.opacity = "0";
  row.style.transform = "translateY(4px)";
  setTimeout(() => row.remove(), 200);
}

export function showToast(message, state = "info") {
  const toast = document.createElement("div");
  toast.className = `fixed bottom-6 right-6 z-[1400] px-5 py-3 rounded-2xl text-sm font-medium text-white backdrop-blur-xl bg-gradient-to-r ${
    state === "success"
      ? "from-emerald-500/80 to-emerald-600/80"
      : state === "error"
      ? "from-rose-500/80 to-rose-600/80"
      : "from-sky-500/80 to-indigo-500/80"
  } shadow-xl opacity-0 translate-y-4 transition-all`;
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.remove("opacity-0", "translate-y-4");
  });
  setTimeout(() => {
    toast.classList.add("opacity-0", "translate-y-4");
    setTimeout(() => toast.remove(), 250);
  }, 2600);
}

