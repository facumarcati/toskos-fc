(() => {
  function init() {
    const form = document.getElementById("matchEditorForm");
    if (!form || !window.matchEditorData) return;
    const draftStatus = document.getElementById("matchDraftStatus");
    const discard = document.getElementById("discardMatchDraft");
    const feedback = document.getElementById("matchSaveFeedback");
    const status = document.getElementById("matchSaveStatus");
    const recovery = document.getElementById("matchSaveRecovery");
    const editor = window.matchEditorData;
    const initial = editor.capture(form);
    const baseline = JSON.stringify(initial);
    const key = form.dataset.draftOwner
      ? `toskos:match-draft:v1:${form.dataset.draftOwner}:${form.dataset.draftId}`
      : null;
    let submissionId = crypto.randomUUID();
    let saveTimer;
    let restored = false;
    let finished = false;
    let busy = false;
    let stored = false;
    let interval;
    let pingRequest;
    let pingPromise;
    let lastAlive = 0;

    function clearOwnDraft() {
      try {
        const draft = JSON.parse(localStorage.getItem(key));
        if (draft?.submissionId === submissionId) localStorage.removeItem(key);
      } catch {
        /* A failed storage operation must not discard form data. */
      }
    }

    function saveDraft() {
      if (finished) return;
      clearTimeout(saveTimer);
      const snapshot = editor.capture(form);
      if (JSON.stringify(snapshot) === baseline) {
        clearOwnDraft();
        stored = false;
        discard.hidden = true;
        draftStatus.textContent =
          "El borrador se guarda automáticamente en este dispositivo.";
        return;
      }
      try {
        if (!key) throw new Error("Missing draft owner");
        localStorage.setItem(
          key,
          JSON.stringify({
            version: 1,
            submissionId,
            savedAt: Date.now(),
            snapshot,
          }),
        );
        stored = true;
        discard.hidden = false;
        const time = new Intl.DateTimeFormat("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date());
        draftStatus.textContent = `Borrador guardado en este dispositivo · ${time}`;
      } catch {
        stored = false;
        draftStatus.textContent =
          "No se pudo guardar el borrador en este navegador. Mantené esta página abierta hasta guardar el partido.";
      }
    }

    try {
      const draft = key && JSON.parse(localStorage.getItem(key));
      if (draft?.version === 1 && /^[0-9a-f-]{36}$/i.test(draft.submissionId)) {
        editor.restore(form, draft.snapshot);
        submissionId = draft.submissionId;
        stored = true;
        discard.hidden = false;
        draftStatus.textContent =
          "Borrador recuperado de este dispositivo. Podés continuar la carga.";
      }
    } catch {
      draftStatus.textContent =
        "No se pudo recuperar el borrador. No cierres esta página hasta guardar el partido.";
    }

    async function ping(timeout = 20000) {
      if (pingPromise) return pingPromise;
      pingRequest = new AbortController();
      const request = pingRequest;
      const timer = setTimeout(() => request.abort(), timeout);
      pingPromise = (async () => {
        try {
          const response = await fetch("/api/keep-alive", {
            cache: "no-store",
            signal: request.signal,
          });
          // A platform loading page is not confirmation that the app is ready.
          if (response.status !== 204) return false;
          lastAlive = Date.now();
          return true;
        } catch {
          return false;
        } finally {
          clearTimeout(timer);
          pingPromise = null;
        }
      })();
      return pingPromise;
    }

    async function ensureAwake() {
      if (Date.now() - lastAlive < 30000) return;
      const deadline = Date.now() + 90000;
      while (Date.now() < deadline) {
        if (navigator.onLine === false) break;
        if (await ping(Math.min(20000, deadline - Date.now()))) return;
        await new Promise((resolve) =>
          setTimeout(
            resolve,
            Math.min(2000, Math.max(0, deadline - Date.now())),
          ),
        );
      }
      throw Object.assign(
        new Error(
          "No se pudo conectar con el servidor. Tus datos siguen en el formulario y podés volver a intentar guardar.",
        ),
        { userMessage: true },
      );
    }

    function startKeepAlive() {
      clearInterval(interval);
      ping();
      // Keep this active even if a video is open in another tab.
      interval = setInterval(() => ping(), 5 * 60 * 1000);
    }
    startKeepAlive();
    window.addEventListener("online", () => ping());
    window.addEventListener("pageshow", (event) => {
      if (event.persisted && finished) window.location.reload();
      else startKeepAlive();
    });
    window.addEventListener("pagehide", () => {
      saveDraft();
      clearInterval(interval);
      pingRequest?.abort();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) saveDraft();
      else if (Date.now() - lastAlive > 30000) ping();
    });
    window.addEventListener("beforeunload", (event) => {
      saveDraft();
      if (
        !finished &&
        !stored &&
        JSON.stringify(editor.capture(form)) !== baseline
      ) {
        event.preventDefault();
        event.returnValue = "";
      }
    });

    function changed() {
      if (restored || finished) return;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(saveDraft, 500);
      if (Date.now() - lastAlive > 4 * 60 * 1000) ping();
    }
    for (const event of ["input", "change", "click", "dragend"])
      form.addEventListener(event, changed);
    const observer = new MutationObserver(changed);
    for (const id of ["teamA", "teamB", "goal-timeline-list"])
      observer.observe(document.getElementById(id), { childList: true });

    discard.addEventListener("click", () => {
      if (busy) return;
      clearTimeout(saveTimer);
      clearOwnDraft();
      restored = true;
      editor.restore(form, initial);
      queueMicrotask(() => {
        restored = false;
      });
      submissionId = crypto.randomUUID();
      stored = false;
      discard.hidden = true;
      draftStatus.textContent =
        "Borrador descartado. El guardado automático sigue activo.";
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (busy || finished || !form.reportValidity()) return;
      saveDraft();
      const data = new URLSearchParams(new FormData(form));
      if (form.dataset.draftId === "new")
        data.set("submissionId", submissionId);
      const submit = form.querySelector('button[type="submit"]');
      const originalText = submit.textContent;
      busy = true;
      form.inert = true;
      form.setAttribute("aria-busy", "true");
      discard.disabled = true;
      submit.textContent = "Guardando…";
      feedback.hidden = false;
      delete feedback.dataset.error;
      recovery.hidden = true;
      status.textContent =
        "Conectando con el servidor para guardar. Si estaba suspendido, puede tardar un momento…";
      let timer;
      try {
        await ensureAwake();
        status.textContent = "Guardando partido…";
        const controller = new AbortController();
        timer = setTimeout(() => controller.abort(), 90000);
        const response = await fetch(form.action, {
          method: "POST",
          body: data,
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        const result = response.headers
          .get("Content-Type")
          ?.includes("application/json")
          ? await response.json()
          : null;
        if (!response.ok || !result?.ok || !result.matchId) {
          if (response.status === 403 || result?.loginRequired) {
            recovery.href = "/login";
            recovery.textContent = "Iniciar sesión en otra pestaña";
            recovery.hidden = false;
          } else if (result?.recoveryUrl?.startsWith("/matches/")) {
            recovery.href = result.recoveryUrl;
            recovery.textContent = "Revisar partido guardado";
            recovery.hidden = false;
          }
          throw Object.assign(
            new Error(
              result?.error ||
                "No se pudo confirmar el guardado. Conservamos tus datos para que puedas reintentar.",
            ),
            { userMessage: true },
          );
        }
        finished = true;
        clearTimeout(saveTimer);
        clearOwnDraft();
        status.textContent = "Partido guardado.";
        window.location.assign(
          result.redirectUrl?.startsWith("/matches")
            ? result.redirectUrl
            : "/matches",
        );
      } catch (error) {
        feedback.dataset.error = "true";
        status.textContent =
          error.name === "AbortError"
            ? "No se pudo confirmar el guardado a tiempo. Tus datos siguen disponibles; podés reintentar sin duplicar el partido."
            : error.userMessage
              ? error.message
              : "No se pudo confirmar el guardado. Tus datos siguen disponibles; podés volver a intentar guardar.";
      } finally {
        clearTimeout(timer);
        busy = false;
        form.inert = false;
        form.removeAttribute("aria-busy");
        discard.disabled = false;
        submit.textContent = originalText;
      }
    });
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
