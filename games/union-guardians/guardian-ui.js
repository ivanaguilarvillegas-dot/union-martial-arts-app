(function (global) {
  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function createGuardianCard(guardian) {
    return [
      '<article class="ug-card">',
      '  <div class="ug-card__header">',
      '    <strong class="ug-card__name">' + escapeHtml(guardian.nombre) + '</strong>',
      '    <span class="ug-card__rarity">' + escapeHtml(guardian.rareza) + '</span>',
      '  </div>',
      '  <dl class="ug-card__stats">',
      '    <div><dt>Elemento</dt><dd>' + escapeHtml(guardian.elemento) + '</dd></div>',
      '    <div><dt>Valor</dt><dd>' + escapeHtml(guardian.valor) + '</dd></div>',
      '    <div><dt>Nivel</dt><dd>' + escapeHtml(guardian.nivel) + '</dd></div>',
      '    <div><dt>Experiencia</dt><dd>' + escapeHtml(guardian.experiencia) + '</dd></div>',
      '    <div><dt>Evolución</dt><dd>' + escapeHtml(guardian.evolucion) + '</dd></div>',
      '  </dl>',
      '</article>'
    ].join("");
  }

  function renderGuardianRoster(container, guardians, options) {
    const root = typeof container === "string" ? document.querySelector(container) : container;
    const settings = options && typeof options === "object" ? options : {};

    if (!root) {
      return null;
    }

    const title = settings.title || "Union Guardians";
    const subtitle = settings.subtitle || "Sistema base local para asignación y evolución";
    const cards = Array.isArray(guardians) ? guardians.map(createGuardianCard).join("") : "";

    root.innerHTML = [
      '<section class="ug-panel">',
      '  <header class="ug-panel__header">',
      '    <p class="ug-panel__eyebrow">' + escapeHtml(title) + '</p>',
      '    <h2 class="ug-panel__title">Guardianes iniciales</h2>',
      '    <p class="ug-panel__subtitle">' + escapeHtml(subtitle) + '</p>',
      '  </header>',
      '  <div class="ug-grid">' + cards + '</div>',
      '</section>'
    ].join("");

    return root;
  }

  function mountGuardianPanel(container, manager, options) {
    const activeManager = manager || global.UnionGuardiansManager;
    if (!activeManager) {
      throw new Error("Union Guardians manager is not available");
    }

    const guardians = activeManager.getAllGuardians();
    return renderGuardianRoster(container, guardians, options);
  }

  function renderAssignmentSummary(container, studentId, manager) {
    const activeManager = manager || global.UnionGuardiansManager;
    const root = typeof container === "string" ? document.querySelector(container) : container;

    if (!root || !activeManager) {
      return null;
    }

    const guardian = activeManager.getStudentGuardian(studentId);
    root.innerHTML = guardian
      ? '<div class="ug-summary"><strong>Guardian asignado:</strong> ' + escapeHtml(guardian.nombre) + '</div>'
      : '<div class="ug-summary ug-summary--empty">Todavía no hay guardian asignado.</div>';

    return root;
  }

  global.UnionGuardiansUI = {
    createGuardianCard,
    renderGuardianRoster,
    mountGuardianPanel,
    renderAssignmentSummary
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = global.UnionGuardiansUI;
  }
})(typeof window !== "undefined" ? window : globalThis);