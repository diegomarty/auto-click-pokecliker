(function () {
    let autoQueueActive = false;
    let autoClickerActive = false;
    let autoDungeonActive = false;

    let clickerRunning = false;
    let lastClickTime = 0;
    let clickLoopId = null; // ID para gestionar requestAnimationFrame
    let autoQueueIntervalId = null; // ID para el intervalo del autoQueue
    let autoDungeonIntervalId = null; // ID para el intervalo del autoDungeon

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

    // Intervalo para el AutoDungeon (cada 100 ms en lugar de 3000 ms)
    const autoDungeonOptions = {
        checkInterval: 100
    };

    let clickCount = 0;
    let isPaused = false;

    // ======================= Funciones AutoQueue =======================

    async function ensureModalClosed(retryCount = 0) {
        if (typeof BreedingController.isModalOpen === 'function' && BreedingController.isModalOpen()) {
            if (retryCount < autoQueueOptions.maxModalCloseRetries) {
                //console.log(`Intentando cerrar el modal nuevamente... (Reintento: ${retryCount + 1})`);
                BreedingController.closeBreedingModal();
                await new Promise((resolve) => setTimeout(resolve, autoQueueOptions.modalCloseRetryInterval));
                return ensureModalClosed(retryCount + 1);
            } else {
                console.warn("No se pudo cerrar el modal tras varios intentos.");
            }
        } else {
            //console.log("Modal cerrado con éxito.");
        }
    }

    async function autoFillQueue() {
        if (!autoQueueActive) return;

        try {
            const queueList = App.game.breeding.queueList();
            const maxQueueSlots = App.game.breeding.queueSlots();

            if (queueList.length === 0) {
                let hatcheryList = BreedingController.viewSortedFilteredList();

                if (!hatcheryList || hatcheryList.length === 0) {
                    //console.log("Cargando la lista de Pokémon, abriendo el modal...");
                    BreedingController.openBreedingModal();
                    await new Promise((resolve) => setTimeout(resolve, autoQueueOptions.modalLoadTime));
                    hatcheryList = BreedingController.viewSortedFilteredList();
                }

                let added = false;
                if (hatcheryList?.length > 0) {
                    //console.log("Añadiendo Pokémon a la cola de incubación...");
                    let i = 0;
                    while (App.game.breeding.queueList().length < maxQueueSlots && i < hatcheryList.length) {
                        const pokemon = hatcheryList[i];
                        if (pokemon.isHatchable()) {
                            App.game.breeding.addPokemonToHatchery(pokemon);
                            //console.log(`Pokémon ${pokemon.displayName} añadido a la cola de incubación.`);
                            added = true;
                        }
                        i++;
                    }
                }

                if (App.game.breeding.queueList().length >= maxQueueSlots) {
                    //console.log("Cola completa, intentando cerrar el modal...");
                    BreedingController.closeBreedingModal();
                    await ensureModalClosed();
                } else {
                    if (typeof BreedingController.isModalOpen === 'function' && BreedingController.isModalOpen()) {
                        //console.log("No se añadieron Pokémon. Cerrando el modal mientras esperamos la siguiente iteración...");
                        BreedingController.closeBreedingModal();
                        await ensureModalClosed();
                    }
                }
            } else {
                if (typeof BreedingController.isModalOpen === 'function' && BreedingController.isModalOpen()) {
                    //console.log("El modal de la Hatchery está abierto sin necesidad, intentando cerrar...");
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

    // ======================= Funciones AutoClicker =======================

    function clickLoop() {
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
                //console.log("Pausa activada para el autoclicker.");
                setTimeout(() => {
                    isPaused = false;
                    clickCount = 0;
                    //console.log("Pausa finalizada, reanudando autoclicker.");
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

    // ======================= Funciones AutoDungeon =======================

    function inDungeon() {
        //console.log("Comprobando estado de dungeon...");

        if (typeof DungeonRunner === 'undefined') {
            //console.log("DungeonRunner no está definido.");
            return false;
        }

        if (!DungeonRunner.dungeon) {
            //console.log("DungeonRunner.dungeon no está definido. Aún no se ha iniciado una dungeon.");
            return false;
        }

        if (typeof DungeonRunner.dungeonFinished !== 'function') {
            //console.log("DungeonRunner.dungeonFinished no es una función.");
            return false;
        }

        if (DungeonRunner.dungeonFinished()) {
            //console.log("DungeonRunner.dungeonFinished() es true, la dungeon ya terminó.");
            return false;
        }

        if (!DungeonRunner.map) {
            //console.log("DungeonRunner.map no está definido.");
            return false;
        }

        if (typeof DungeonRunner.map.playerPosition !== 'function') {
            //console.log("DungeonRunner.map.playerPosition no es una función.");
            return false;
        }

        const pos = DungeonRunner.map.playerPosition();
        if (!pos) {
            //console.log("No se pudo obtener la posición del jugador en la dungeon.");
            return false;
        }

        const dungeonMapElement = document.getElementById('dungeonMap');
        if (!dungeonMapElement) {
            //console.log("No se encontró el elemento #dungeonMap en el DOM.");
            return false;
        }

        //console.log("Estamos dentro de una dungeon.");
        return true;
    }

    function getPlayerPosition() {
        const pos = DungeonRunner.map.playerPosition();
        return pos || null;
    }

    function getBoard() {
        const pos = getPlayerPosition();
        if (!pos || !DungeonRunner.map || typeof DungeonRunner.map.board !== 'function') {
            //console.log("No se puede obtener el board: falta posición o DungeonRunner.map.");
            return null;
        }
        const board = DungeonRunner.map.board()[pos.floor];
        if (!board || !Array.isArray(board)) {
            //console.log("El board no es un array válido.");
            return null;
        }
        return board;
    }

    function findTileByType(board, type) {
        const pos = getPlayerPosition();
        if (!pos) return null;
        for (let y = 0; y < board.length; y++) {
            for (let x = 0; x < board[y].length; x++) {
                const tile = board[y][x];
                if (!tile) continue;
                const tileType = typeof tile.type === 'function' ? tile.type() : tile.type;
                if (tileType === type) {
                    return { x, y, floor: pos.floor };
                }
            }
        }
        return null;
    }

    function getUnexploredTiles(board) {
        const tiles = [];
        const pos = getPlayerPosition();
        if (!pos) return tiles;
        for (let y = 0; y < board.length; y++) {
            for (let x = 0; x < board[y].length; x++) {
                const tile = board[y][x];
                if (!tile || tile.isVisited) {
                    continue;
                }
                let cssClassValue = tile.cssClass;
                if (typeof cssClassValue === 'function') {
                    cssClassValue = cssClassValue();
                }
                if (typeof cssClassValue === 'string' && !cssClassValue.includes('tile-invisible')) {
                    tiles.push({ x, y, floor: pos.floor });
                }
            }
        }
        return tiles;
    }

    function moveAlongPath(path) {
        if (!path || path.length === 0) {
            //console.log("No hay pasos en la ruta, no se puede mover.");
            return false;
        }
    
        const pos = getPlayerPosition();
        const nextStep = path[0];
    
        // Verificar si el siguiente paso es el mismo en el que ya está el jugador
        if (pos && pos.x === nextStep.x && pos.y === nextStep.y && pos.floor === nextStep.floor) {
            //console.log("Ya estamos en la celda objetivo, no es necesario moverse.");
            return false;
        }
    
        //console.log("Moviéndome hacia:", nextStep);
        const moved = DungeonRunner.map.moveToTile(nextStep);
        if (!moved) {
            //console.log("No se pudo mover a la celda objetivo. Intentaremos otra acción.");
            return false;
        }
        return true;
    }

    function pickRandomTile(tiles) {
        if (!tiles || tiles.length === 0) return null;
        const index = Math.floor(Math.random() * tiles.length);
        return tiles[index];
    }

    function simulateInteractionClick() {
        const dungeonArea = document.querySelector('.battle-view.card-body');
        if (dungeonArea) {
            dungeonArea.click();
            //console.log("Simulando click de interacción en dungeonArea");
        }
    }

    function startDungeonIfButtonExists() {
        // Selector del botón que inicia la dungeon
        // Puede ser más específico si es necesario, por ejemplo, buscando por onclick
        const dungeonStartBtn = document.querySelector('button.btn-success.p-0[onclick*="DungeonRunner.initializeDungeon"]');
    
        if (dungeonStartBtn && !dungeonStartBtn.disabled) {
            //console.log("Botón de inicio de dungeon detectado. Iniciando dungeon automáticamente...");
            dungeonStartBtn.click();
            return true;
        }
        return false;
    }

    function autoDungeonAction() {
        if (!autoDungeonActive) return;
        //console.log("AutoDungeon check...");
    
        // Si no estamos dentro de una dungeon, verificar si podemos iniciarla
        if (!inDungeon()) {
            // Intentar iniciar la dungeon si el botón está disponible
            const started = startDungeonIfButtonExists();
            if (started) {
                //console.log("Intentando iniciar la dungeon...");
                // Esperar a la próxima iteración donde inDungeon() debería ser true
            } else {
                //console.log("No estamos en una dungeon ni se pudo iniciar automáticamente.");
            }
            return;
        }
    
        // A partir de aquí, ya estamos dentro de la dungeon
        const pos = getPlayerPosition();
        if (!pos) {
            //console.log("No se pudo obtener la posición del jugador en la dungeon.");
            return;
        }
    
        const board = getBoard();
        if (!board) {
            //console.log("El board no está disponible, esperando...");
            return;
        }
    
        // Buscar Boss o Ladder
        const bossPos = findTileByType(board, GameConstants.DungeonTileType.boss);
        const ladderPos = findTileByType(board, GameConstants.DungeonTileType.ladder);
    
        let movedSuccessfully = false;
    
        if (bossPos || ladderPos) {
            const target = bossPos || ladderPos;
            //console.log("Encontrado objetivo (Boss o Ladder) en:", target);
    
            let path = DungeonRunner.map.findShortestPath(pos, target, [GameConstants.DungeonTileType.enemy]);
            if (!path || path.length === 0) {
                path = DungeonRunner.map.findShortestPath(pos, target);
            }
            if (path && path.length > 0) {
                //console.log("Moviéndome hacia el objetivo principal...");
                movedSuccessfully = moveAlongPath(path);
                if (movedSuccessfully) return;
            } else {
                //console.log("No se encontró ruta hacia el objetivo. Intentaremos explorar.");
            }
        }
    
        // Explorar celdas no visitadas
        const unexplored = getUnexploredTiles(board);
        if (!movedSuccessfully && unexplored.length > 0) {
            //console.log(`Hay ${unexplored.length} celdas no exploradas, buscando la más cercana...`);
            let shortestPath = null;
            let shortestDistance = Infinity;
            for (const tile of unexplored) {
                const path = DungeonRunner.map.findShortestPath(pos, tile);
                if (path && path.length < shortestDistance) {
                    shortestDistance = path.length;
                    shortestPath = path;
                }
            }
            if (shortestPath) {
                //console.log("Moviéndome hacia una celda no explorada...");
                movedSuccessfully = moveAlongPath(shortestPath);
                if (movedSuccessfully) return;
            } else {
                //console.log("No se encontró ruta a celdas no exploradas. Moviéndome al azar.");
            }
        }
    
        // Si llegamos al boss o cofre, necesitamos interactuar:
        simulateInteractionClick();
    
        // Movimiento aleatorio si no hay nada mejor que hacer
        if (!movedSuccessfully && typeof DungeonRunner.map.nearbyTiles === 'function') {
            const nearbyTiles = DungeonRunner.map.nearbyTiles(pos);
            if (nearbyTiles && nearbyTiles.length > 0) {
                const randomTile = pickRandomTile(nearbyTiles);
                if (randomTile) {
                    //console.log("Moviéndome a una celda cercana aleatoria...");
                    moveAlongPath([randomTile.position]);
                } else {
                    //console.log("No se encontró una celda cercana para moverse.");
                }
            } else {
                //console.log("No hay celdas cercanas disponibles o la función nearbyTiles no está disponible.");
            }
        }
    }

    function startAutoDungeon() {
        if (autoDungeonIntervalId) return;
        autoDungeonIntervalId = setInterval(autoDungeonAction, autoDungeonOptions.checkInterval);
    }

    function stopAutoDungeon() {
        if (autoDungeonIntervalId) {
            clearInterval(autoDungeonIntervalId);
            autoDungeonIntervalId = null;
        }
    }

    // ======================= Toggles =======================

    function toggleAutoQueue(isActive) {
        autoQueueActive = isActive;
        const queueButton = document.getElementById("autoqueue-toggle-btn");

        if (isActive) {
            //console.log("AutoQueue activado.");
            queueButton.textContent = "Queue: ON";
            queueButton.classList.replace("btn-secondary", "btn-success");
            startAutoQueue();
        } else {
            //console.log("AutoQueue desactivado.");
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
                //console.log("AutoClicker activado.");
                clickerButton.textContent = "Clicker: ON";
                clickerButton.classList.replace("btn-secondary", "btn-success");
                detectAndClick();
            }
        } else {
            //console.log("AutoClicker desactivado.");
            clickerButton.textContent = "Clicker: OFF";
            clickerButton.classList.replace("btn-success", "btn-secondary");

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

    function toggleAutoDungeon(isActive) {
        autoDungeonActive = isActive;
        const dungeonButton = document.getElementById("autodungeon-toggle-btn");

        if (isActive) {
            //console.log("AutoDungeon activado.");
            dungeonButton.textContent = "Dungeon: ON";
            dungeonButton.classList.replace("btn-secondary", "btn-success");
            startAutoDungeon();
        } else {
            //console.log("AutoDungeon desactivado.");
            dungeonButton.textContent = "Dungeon: OFF";
            dungeonButton.classList.replace("btn-success", "btn-secondary");
            stopAutoDungeon();
        }
    }

    // ======================= Interfaz =======================

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
            <button id="autodungeon-toggle-btn" class="btn btn-secondary btn-sm">Dungeon: OFF</button>
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
            .getElementById("autodungeon-toggle-btn")
            .addEventListener("click", () => toggleAutoDungeon(!autoDungeonActive));

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
    window.toggleAutoDungeon = toggleAutoDungeon;
})();
