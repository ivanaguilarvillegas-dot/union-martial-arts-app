(function (global) {
  const DEFAULT_STORAGE_KEY = "unionGuardiansState";

  const FALLBACK_DATA = {
    system: "UNION GUARDIANS",
    version: "1.0.0",
    storageKey: DEFAULT_STORAGE_KEY,
    starterGuardians: [
      { id: "ignis", nombre: "Ignis", elemento: "Fuego", valor: "Coraje", rareza: "Común", nivel: 1, experiencia: 0, evolucion: "Ignis" },
      { id: "aqua", nombre: "Aqua", elemento: "Agua", valor: "Calma", rareza: "Común", nivel: 1, experiencia: 0, evolucion: "Aqua" },
      { id: "zephyr", nombre: "Zephyr", elemento: "Viento", valor: "Libertad", rareza: "Común", nivel: 1, experiencia: 0, evolucion: "Zephyr" },
      { id: "terra", nombre: "Terra", elemento: "Tierra", valor: "Resistencia", rareza: "Común", nivel: 1, experiencia: 0, evolucion: "Terra" },
      { id: "volt", nombre: "Volt", elemento: "Rayo", valor: "Impulso", rareza: "Raro", nivel: 1, experiencia: 0, evolucion: "Volt" },
      { id: "umbra", nombre: "Umbra", elemento: "Sombra", valor: "Disciplina", rareza: "Raro", nivel: 1, experiencia: 0, evolucion: "Umbra" },
      { id: "solis", nombre: "Solis", elemento: "Luz", valor: "Esperanza", rareza: "Raro", nivel: 1, experiencia: 0, evolucion: "Solis" },
      { id: "astra", nombre: "Astra", elemento: "Estrella", valor: "Guía", rareza: "Legendaria", nivel: 1, experiencia: 0, evolucion: "Astra" }
    ],
    evolutionStages: [
      { nivel: 1, nombre: "Forma Inicial" },
      { nivel: 5, nombre: "Forma Despierta" },
      { nivel: 10, nombre: "Forma Guardiana" }
    ]
  };

  function safeLocalStorage() {
    try {
      return typeof localStorage !== "undefined" ? localStorage : null;
    } catch (error) {
      return null;
    }
  }

  function cloneGuardian(guardian) {
    return {
      id: guardian.id,
      nombre: guardian.nombre,
      elemento: guardian.elemento,
      valor: guardian.valor,
      rareza: guardian.rareza,
      nivel: guardian.nivel,
      experiencia: guardian.experiencia,
      evolucion: guardian.evolucion
    };
  }

  function createDefaultState() {
    return {
      version: FALLBACK_DATA.version,
      students: {},
      guardians: FALLBACK_DATA.starterGuardians.map(cloneGuardian),
      assignments: {},
      meta: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };
  }

  function normalizeState(state) {
    const source = state && typeof state === "object" ? state : {};
    const guardians = Array.isArray(source.guardians) && source.guardians.length > 0
      ? source.guardians.map(cloneGuardian)
      : FALLBACK_DATA.starterGuardians.map(cloneGuardian);

    return {
      version: source.version || FALLBACK_DATA.version,
      students: source.students && typeof source.students === "object" ? source.students : {},
      guardians,
      assignments: source.assignments && typeof source.assignments === "object" ? source.assignments : {},
      meta: source.meta && typeof source.meta === "object"
        ? source.meta
        : {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
    };
  }

  function createGuardianManager(options) {
    const settings = options && typeof options === "object" ? options : {};
    const storageKey = settings.storageKey || FALLBACK_DATA.storageKey || DEFAULT_STORAGE_KEY;
    const storage = safeLocalStorage();

    function readState() {
      if (!storage) {
        return createDefaultState();
      }

      const raw = storage.getItem(storageKey);
      if (!raw) {
        return createDefaultState();
      }

      try {
        return normalizeState(JSON.parse(raw));
      } catch (error) {
        return createDefaultState();
      }
    }

    function writeState(state) {
      const nextState = normalizeState(state);
      nextState.meta.updatedAt = new Date().toISOString();

      if (storage) {
        storage.setItem(storageKey, JSON.stringify(nextState));
      }

      return nextState;
    }

    function getAllGuardians() {
      return readState().guardians.map(cloneGuardian);
    }

    function getGuardianById(guardianId) {
      return getAllGuardians().find(function (guardian) {
        return guardian.id === guardianId;
      }) || null;
    }

    function getStudentGuardian(studentId) {
      const state = readState();
      const guardianId = state.assignments[studentId];
      return guardianId ? getGuardianById(guardianId) : null;
    }

    function ensureStudent(studentId, studentName) {
      if (!studentId) {
        throw new Error("studentId is required");
      }

      const state = readState();
      const nextState = normalizeState(state);
      nextState.students[studentId] = {
        id: studentId,
        nombre: studentName || nextState.students[studentId]?.nombre || "Alumno",
        guardianId: nextState.students[studentId]?.guardianId || null
      };

      return writeState(nextState);
    }

    function assignGuardianToStudent(studentId, guardianId, studentName) {
      if (!studentId) {
        throw new Error("studentId is required");
      }

      const guardian = getGuardianById(guardianId);
      if (!guardian) {
        throw new Error("guardianId is invalid");
      }

      const state = readState();
      const nextState = normalizeState(state);

      nextState.students[studentId] = {
        id: studentId,
        nombre: studentName || nextState.students[studentId]?.nombre || "Alumno",
        guardianId: guardian.id
      };
      nextState.assignments[studentId] = guardian.id;

      return writeState(nextState);
    }

    function createGuardianProfile(guardianId, overrides) {
      const template = getGuardianById(guardianId);
      if (!template) {
        throw new Error("guardianId is invalid");
      }

      const custom = overrides && typeof overrides === "object" ? overrides : {};
      return normalizeGuardianProfile(Object.assign({}, template, custom));
    }

    function normalizeGuardianProfile(profile) {
      return {
        id: profile.id,
        nombre: profile.nombre,
        elemento: profile.elemento,
        valor: profile.valor,
        rareza: profile.rareza,
        nivel: typeof profile.nivel === "number" ? profile.nivel : 1,
        experiencia: typeof profile.experiencia === "number" ? profile.experiencia : 0,
        evolucion: profile.evolucion || profile.nombre
      };
    }

    function addExperience(studentId, points) {
      const amount = Number(points) || 0;
      if (!studentId || amount <= 0) {
        return readState();
      }

      const state = readState();
      const guardianId = state.assignments[studentId];
      if (!guardianId) {
        return state;
      }

      const nextState = normalizeState(state);
      const guardianIndex = nextState.guardians.findIndex(function (guardian) {
        return guardian.id === guardianId;
      });

      if (guardianIndex === -1) {
        return state;
      }

      const guardian = nextState.guardians[guardianIndex];
      guardian.experiencia += amount;

      while (guardian.experiencia >= xpNeededForLevel(guardian.nivel)) {
        guardian.experiencia -= xpNeededForLevel(guardian.nivel);
        guardian.nivel += 1;
      }

      guardian.evolucion = resolveEvolutionStage(guardian.nivel);
      nextState.guardians[guardianIndex] = guardian;

      return writeState(nextState);
    }

    function xpNeededForLevel(level) {
      return Math.max(20, level * 25);
    }

    function resolveEvolutionStage(level) {
      const stages = FALLBACK_DATA.evolutionStages.slice().reverse();
      const matchedStage = stages.find(function (stage) {
        return level >= stage.nivel;
      });

      return matchedStage ? matchedStage.nombre : "Forma Inicial";
    }

    function reset() {
      const state = createDefaultState();
      return writeState(state);
    }

    function exportState() {
      return readState();
    }

    function importState(nextState) {
      return writeState(nextState);
    }

    return {
      storageKey,
      readState,
      writeState,
      reset,
      exportState,
      importState,
      getAllGuardians,
      getGuardianById,
      getStudentGuardian,
      ensureStudent,
      assignGuardianToStudent,
      createGuardianProfile,
      addExperience,
      xpNeededForLevel,
      resolveEvolutionStage,
      getStarterGuardians: function () {
        return FALLBACK_DATA.starterGuardians.map(cloneGuardian);
      },
      getSystemInfo: function () {
        return {
          system: FALLBACK_DATA.system,
          version: FALLBACK_DATA.version,
          storageKey: storageKey
        };
      }
    };
  }

  const guardianManager = createGuardianManager();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      createGuardianManager,
      guardianManager,
      FALLBACK_DATA
    };
  }

  global.UnionGuardiansManager = guardianManager;
  global.createUnionGuardiansManager = createGuardianManager;
})(typeof window !== "undefined" ? window : globalThis);