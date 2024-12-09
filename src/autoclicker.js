/**
 * AutoClicker Script
 *
 * Este script permite activar un autoclicker en el juego de forma manual y ajustar el intervalo de clics.
 */

(function () {
    let autoClickerInterval = null;

    const autoClickerOptions = {
        interval: 40, // Intervalo en milisegundos
    };

    // Activa o desactiva el autoclicker
    function toggleAutoClicker(isActive) {
        const badge = document.getElementById("autoclicker-badge");

        if (isActive) {
            if (autoClickerInterval) return;

            if (typeof Battle === "undefined" || typeof Battle.clickAttack !== "function") {
                console.error("Error: No se puede acceder a la función Battle.clickAttack.");
                return;
            }

            autoClickerInterval = setInterval(() => {
                try {
                    Battle.clickAttack(); // Llama directamente a la función del juego
                } catch (error) {
                    console.error("Error al ejecutar Battle.clickAttack:", error);
                    toggleAutoClicker(false);
                }
            }, autoClickerOptions.interval);

            badge.textContent = "Activo";
            badge.classList.replace("bg-secondary", "bg-success");
        } else {
            if (autoClickerInterval) {
                clearInterval(autoClickerInterval);
                autoClickerInterval = null;

                badge.textContent = "Inactivo";
                badge.classList.replace("bg-success", "bg-secondary");
            }
        }
    }

    // Crea la interfaz gráfica compacta
    function createUI() {
        const card = document.createElement("div");
        Object.assign(card.style, {
            position: "fixed",
            bottom: "10px",
            right: "10px",
            backgroundColor: "#fff",
            border: "1px solid #ddd",
            borderRadius: "5px",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            padding: "5px 10px",
            zIndex: "1000",
            fontFamily: "Arial, sans-serif",
            fontSize: "12px",
            display: "flex",
            alignItems: "center",
            gap: "5px",
        });

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
                if (autoClickerInterval) {
                    toggleAutoClicker(false);
                    toggleAutoClicker(true);
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
