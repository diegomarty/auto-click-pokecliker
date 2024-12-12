(function () {
    let autoQueueActive = false;
    let autoClickerActive = false;
    let clickerRunning = false;
    let lastClickTime = 0;
    let clickLoopId = null; // ID para gestionar requestAnimationFrame
    let autoQueueIntervalId = null; // ID para el intervalo del autoQueue

    const autoQueueOptions = {
        checkInterval: 2000,
        modalLoadTime: 500, // Tiempo para cargar el modal
        maxModalCloseRetries: 5,
        modalCloseRetryInterval: 500
    };

    const autoClickerOptions = {
        interval: 100,
        pauseAfterClicks: 100, // Cantidad de clics antes de pausar
        pauseDuration: 2000, // Duración de la pausa en ms
    };

    let clickCount = 0;
    let isPaused = false;

    async function ensureModalClosed(retryCount = 0) {
        // Si existe una función para comprobar si el modal está abierto, la usamos
        if (typeof BreedingController.isModalOpen === 'function' && BreedingController.isModalOpen()) {
            if (retryCount < autoQueueOptions.maxModalCloseRetries) {
                console.log(`Intentando cerrar el modal nuevamente... (Reintento: ${retryCount + 1})`);
                BreedingController.closeBreedingModal();
                await new Promise((resolve) => setTimeout(resolve, autoQueueOptions.modalCloseRetryInterval));
                return ensureModalClosed(retryCount + 1);
            } else {
                console.warn("No se pudo cerrar el modal tras varios intentos.");
            }
        } else {
            console.log("Modal cerrado con éxito.");
        }
    }

    async function autoFillQueue() {
        if (!autoQueueActive) return;

        try {
            const queueList = App.game.breeding.queueList();
            const maxQueueSlots = App.game.breeding.queueSlots();

            // Si la cola está vacía, intentamos rellenarla
            if (queueList.length === 0) {
                let hatcheryList = BreedingController.viewSortedFilteredList();

                if (!hatcheryList || hatcheryList.length === 0) {
                    console.log("Cargando la lista de Pokémon, abriendo el modal...");
                    BreedingController.openBreedingModal();
                    await new Promise((resolve) => setTimeout(resolve, autoQueueOptions.modalLoadTime));
                    hatcheryList = BreedingController.viewSortedFilteredList();
                }

                let added = false;
                if (hatcheryList?.length > 0) {
                    console.log("Añadiendo Pokémon a la cola de incubación...");
                    let i = 0;
                    while (App.game.breeding.queueList().length < maxQueueSlots && i < hatcheryList.length) {
                        const pokemon = hatcheryList[i];
                        if (pokemon.isHatchable()) {
                            App.game.breeding.addPokemonToHatchery(pokemon);
                            console.log(`Pokémon ${pokemon.displayName} añadido a la cola de incubación.`);
                            added = true;
                        }
                        i++;
                    }
                }

                // Si se llenó la cola, cerramos el modal
                if (App.game.breeding.queueList().length >= maxQueueSlots) {
                    console.log("Cola completa, intentando cerrar el modal...");
                    BreedingController.closeBreedingModal();
                    await ensureModalClosed();
                } else {
                    // Si no se agregó ningún Pokémon o la cola sigue vacía, comprobar si el modal sigue abierto
                    if (typeof BreedingController.isModalOpen === 'function' && BreedingController.isModalOpen()) {
                        console.log("No se añadieron Pokémon. Cerrando el modal mientras esperamos la siguiente iteración...");
                        BreedingController.closeBreedingModal();
                        await ensureModalClosed();
                    }
                }
            } else {
                // Si la cola no está vacía, pero el modal está abierto por alguna razón, lo cerramos
                if (typeof BreedingController.isModalOpen === 'function' && BreedingController.isModalOpen()) {
                    console.log("El modal de la Hatchery está abierto sin necesidad, intentando cerrar...");
                    BreedingController.closeBreedingModal();
                    await ensureModalClosed();
                }
            }
        } catch (error) {
            console.error("Error en la automatización de la cola:", error);
        }
    }

    function startAutoQueue() {
        if (autoQueueIntervalId) return; // Evita múltiples hilos
        autoQueueIntervalId = setInterval(() => {
            autoFillQueue();
        }, autoQueueOptions.checkInterval);
    }

    function stopAutoQueue() {
        if (autoQueueIntervalId) {
            clearInterval(autoQueueIntervalId);
            autoQueueIntervalId = null;
        }
    }

    function clickLoop() {
        // Si el autoclicker está desactivado o estamos en pausa, detenemos el loop
        if (!autoClickerActive || isPaused) {
            clickerRunning = false;
            return;
        }

        const currentTime = performance.now();
        if (currentTime - lastClickTime >= autoClickerOptions.interval) {
            lastClickTime = currentTime;
            clickCount++;

            const gameState = App.game.gameState;

            try {
                if (gameState === GameConstants.GameState.fighting && typeof Battle.clickAttack === "function") {
                    Battle.clickAttack();
                } else if (gameState === GameConstants.GameState.gym && typeof GymBattle.clickAttack === "function") {
                    GymBattle.clickAttack();
                } else if (gameState === GameConstants.GameState.dungeon && typeof DungeonRunner.handleInteraction === "function") {
                    DungeonRunner.handleInteraction();
                }
            } catch (error) {
                console.error("Error al ejecutar la acción de autoclicker:", error);
                toggleAutoClicker(false);
                return;
            }

            if (clickCount >= autoClickerOptions.pauseAfterClicks) {
                isPaused = true;
                console.log("Pausa activada para el autoclicker.");
                setTimeout(() => {
                    isPaused = false;
                    clickCount = 0;
                    console.log("Pausa finalizada, reanudando autoclicker.");
                    // Si el autoclicker sigue activo, reanudamos el loop
                    if (autoClickerActive) {
                        lastClickTime = performance.now(); 
                        clickLoopId = requestAnimationFrame(clickLoop);
                    } else {
                        clickerRunning = false;
                    }
                }, autoClickerOptions.pauseDuration);
                return;
            }
        }

        // Continuar el loop si aún está activo
        if (autoClickerActive && !isPaused) {
            clickLoopId = requestAnimationFrame(clickLoop);
        } else {
            clickerRunning = false;
        }
    }

    function detectAndClick() {
        if (clickerRunning || !autoClickerActive || isPaused) return;

        clickerRunning = true;
        lastClickTime = performance.now();
        clickLoopId = requestAnimationFrame(clickLoop);
    }

    function toggleAutoQueue(isActive) {
        autoQueueActive = isActive;
        const queueButton = document.getElementById("autoqueue-toggle-btn");

        if (isActive) {
            console.log("AutoQueue activado.");
            queueButton.textContent = "Queue: ON";
            queueButton.classList.replace("btn-secondary", "btn-success");
            startAutoQueue();
        } else {
            console.log("AutoQueue desactivado.");
            queueButton.textContent = "Queue: OFF";
            queueButton.classList.replace("btn-success", "btn-secondary");
            stopAutoQueue();
        }
    }

    function toggleAutoClicker(isActive) {
        autoClickerActive = isActive;
        const clickerButton = document.getElementById("autoclicker-toggle-btn");

        if (isActive) {
            if (!clickerRunning) {
                console.log("AutoClicker activado.");
                clickerButton.textContent = "Clicker: ON";
                clickerButton.classList.replace("btn-secondary", "btn-success");
                detectAndClick();
            }
        } else {
            console.log("AutoClicker desactivado.");
            clickerButton.textContent = "Clicker: OFF";
            clickerButton.classList.replace("btn-success", "btn-secondary");

            // Detener el loop activo
            autoClickerActive = false;
            isPaused = false; 
            clickCount = 0;
            if (clickLoopId) {
                cancelAnimationFrame(clickLoopId);
                clickLoopId = null;
            }
            clickerRunning = false;
        }
    }

    function createUI() {
        const card = document.createElement("div");
        Object.assign(card.style, {
            position: "fixed",
            bottom: "10px",
            right: "10px",
            backgroundColor: "#f8f9fa",
            border: "1px solid #ced4da",
            borderRadius: "8px",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
            padding: "8px",
            zIndex: "1000",
            fontFamily: "Arial, sans-serif",
            fontSize: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "5px",
            width: "160px",
        });

        card.innerHTML = `
            <div style="text-align: center; font-weight: bold; font-size: 14px;">Automation</div>
            <button id="autoqueue-toggle-btn" class="btn btn-secondary btn-sm">Queue: OFF</button>
            <button id="autoclicker-toggle-btn" class="btn btn-secondary btn-sm">Clicker: OFF</button>
            <div style="display: flex; align-items: center; gap: 5px; font-size: 12px;">
                <label for="autoclicker-interval" style="margin: 0;">Interval:</label>
                <input id="autoclicker-interval" type="number" class="form-control form-control-sm" value="${autoClickerOptions.interval}" min="10" style="width: 50px;">
            </div>
        `;

        document.body.appendChild(card);

        document
            .getElementById("autoqueue-toggle-btn")
            .addEventListener("click", () => toggleAutoQueue(!autoQueueActive));

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

    window.toggleAutoQueue = toggleAutoQueue;
    window.toggleAutoClicker = toggleAutoClicker;
})();
