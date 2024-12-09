/**
 * AutoClicker Script Optimizado
 *
 * Reduce la carga en la aplicación y mejora el rendimiento del clic automático.
 */

(function () {
    let autoClickerInterval = null;
    let clickableContainer = null;
    let lastClickTime = 0;

    const autoClickerOptions = {
        interval: 40, // Intervalo inicial en milisegundos
        debug: false, // Mensajes de depuración en consola
    };

    // Detecta cambios en el DOM de manera eficiente
    const observer = new MutationObserver(() => {
        const newContainer = document.querySelector("#routeBattleContainer .col.no-gutters.clickable");
        if (newContainer && newContainer !== clickableContainer) {
            clickableContainer = newContainer;
            if (autoClickerOptions.debug) {
                console.log("Elemento de clic actualizado dinámicamente.");
            }
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Crea eventos de clic reutilizables
    let precomputedEvents = [];
    function precomputeEvents(element) {
        const rect = element.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        precomputedEvents = ["mousedown", "mouseup", "click"].map((eventType) =>
            new MouseEvent(eventType, {
                bubbles: true,
                cancelable: true,
                clientX: x,
                clientY: y,
            })
        );
    }

    // Simula un clic reutilizando eventos
    function simulateClick() {
        if (!clickableContainer) {
            console.error("Error: No hay un contenedor válido para realizar el clic.");
            return;
        }
        precomputedEvents.forEach((event) => clickableContainer.dispatchEvent(event));
        if (autoClickerOptions.debug) {
            console.log("Clic simulado.");
        }
    }

    // Usa requestAnimationFrame para clics más eficientes
    function autoClickerLoop() {
        if (autoClickerInterval) {
            const now = performance.now();
            if (now - lastClickTime >= autoClickerOptions.interval) {
                simulateClick();
                lastClickTime = now;
            }
            requestAnimationFrame(autoClickerLoop);
        }
    }

    // Activa o desactiva el autoclicker
    function toggleAutoClicker(isActive) {
        const badge = document.getElementById("autoclicker-badge");
        try {
            if (isActive) {
                if (autoClickerInterval || !clickableContainer) return;

                precomputeEvents(clickableContainer);
                autoClickerInterval = true;
                lastClickTime = performance.now();
                requestAnimationFrame(autoClickerLoop);

                badge.textContent = "Activo";
                badge.classList.remove("bg-secondary");
                badge.classList.add("bg-success");
                console.log("Autoclicker activado.");
            } else {
                autoClickerInterval = null;

                badge.textContent = "Inactivo";
                badge.classList.remove("bg-success");
                badge.classList.add("bg-secondary");
                console.log("Autoclicker desactivado.");
            }
        } catch (error) {
            console.error("Error en toggleAutoClicker: ", error);
        }
    }

    // Crea la interfaz gráfica compacta
    function createUI() {
        const card = document.createElement("div");
        card.style.position = "fixed";
        card.style.bottom = "10px";
        card.style.right = "10px";
        card.style.backgroundColor = "#fff";
        card.style.border = "1px solid #ddd";
        card.style.borderRadius = "5px";
        card.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
        card.style.padding = "5px 10px";
        card.style.zIndex = "1000";
        card.style.fontFamily = "Arial, sans-serif";
        card.style.fontSize = "12px";
        card.style.display = "flex";
        card.style.alignItems = "center";
        card.style.gap = "10px";

        card.innerHTML = `
            <span style="font-weight: bold; color: #000;">AutoClicker:</span>
            <span id="autoclicker-badge" class="badge bg-secondary" style="padding: 2px 5px; font-size: 10px;">Inactivo</span>
            <button id="autoclicker-toggle-btn" class="btn btn-primary" style="padding: 2px 5px; font-size: 10px;">Toggle</button>
            <input id="autoclicker-interval" type="number" class="form-control" value="${autoClickerOptions.interval}" min="10" style="width: 50px; font-size: 10px; padding: 2px;">
        `;

        document.body.appendChild(card);

        const toggleBtn = document.getElementById("autoclicker-toggle-btn");
        const intervalInput = document.getElementById("autoclicker-interval");

        toggleBtn.onclick = () => toggleAutoClicker(!autoClickerInterval);
        intervalInput.onchange = (e) => {
            const newInterval = parseInt(e.target.value, 10);
            if (newInterval >= 10) {
                autoClickerOptions.interval = newInterval;
                if (autoClickerOptions.debug) {
                    console.log(`Intervalo actualizado a ${newInterval} ms.`);
                }
            } else {
                e.target.value = autoClickerOptions.interval;
            }
        };
    }

    // Inicializa la interfaz
    createUI();

    // Exporta la función a la ventana global
    window.toggleAutoClicker = toggleAutoClicker;
})();
