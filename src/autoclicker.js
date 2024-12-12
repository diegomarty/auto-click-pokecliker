(function () {
    let autoClickerActive = false;
    let lastClickTime = 0;

    const autoClickerOptions = {
        interval: 100, 
    };

    function detectAndClick() {
        if (!autoClickerActive) return; 

        const currentTime = performance.now();
        if (currentTime - lastClickTime >= autoClickerOptions.interval) {
            lastClickTime = currentTime;

            const gameState = App.game.gameState;

            try {
                if (gameState === GameConstants.GameState.fighting) {
                    // Vista de ruta
                    if (typeof Battle.clickAttack === "function") {
                        Battle.clickAttack();
                    }
                } else if (gameState === GameConstants.GameState.gym) {
                    // Vista de gimnasio
                    if (typeof GymBattle.clickAttack === "function") {
                        GymBattle.clickAttack();
                    }
                } else if (gameState === GameConstants.GameState.dungeon) {
                    // Vista de mazmorra
                    if (typeof DungeonRunner.handleInteraction === "function") {
                        DungeonRunner.handleInteraction();
                    }
                }
            } catch (error) {
                console.error("Error al ejecutar la acción de autoclicker:", error);
                toggleAutoClicker(false);
            }
        }

        // Continuar el bucle
        requestAnimationFrame(detectAndClick);
    }

    function toggleAutoClicker(isActive) {
        const badge = document.getElementById("autoclicker-badge");

        if (isActive) {
            if (autoClickerActive) return; 

            autoClickerActive = true;
            badge.textContent = "🏃🏻‍♂️";
            badge.classList.replace("bg-secondary", "bg-success");

            // Iniciar el loop
            detectAndClick();
        } else {
            autoClickerActive = false;
            badge.textContent = "❌";
            badge.classList.replace("bg-success", "bg-secondary");
        }
    }

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
            <span id="autoclicker-badge" class="badge bg-secondary" style="padding: 2px 5px; font-size: 10px;">❌</span>
            <button id="autoclicker-toggle-btn" class="btn btn-primary" style="padding: 2px 5px; font-size: 10px;">Toggle</button>
            <input id="autoclicker-interval" type="number" class="form-control" value="${autoClickerOptions.interval}" min="10" style="width: 50px; font-size: 10px; padding: 2px;">
        `;

        document.body.appendChild(card);

        document
            .getElementById("autoclicker-toggle-btn")
            .addEventListener("click", () => toggleAutoClicker(!autoClickerActive));

        document
            .getElementById("autoclicker-interval")
            .addEventListener("change", (e) => {
                const newInterval = parseInt(e.target.value, 10);
                if (newInterval >= 10) {
                    autoClickerOptions.interval = newInterval;
                } else {
                    e.target.value = autoClickerOptions.interval;
                }
            });
    }

    createUI();

    window.toggleAutoClicker = toggleAutoClicker;
})();
