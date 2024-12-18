(function () {
    let autoQueueActive = false;
    let autoClickerActive = false;
    let autoDungeonActive = false;

    let clickerRunning = false;
    let lastClickTime = 0;
    let clickLoopId = null;
    let autoQueueIntervalId = null;
    let autoDungeonIntervalId = null;

    const autoQueueOptions = {
        checkInterval: 2000,
        modalLoadTime: 500,
        maxModalCloseRetries: 5,
        modalCloseRetryInterval: 500
    };

    const autoClickerOptions = {
        interval: 100,
        pauseAfterClicks: 100,
        pauseDuration: 2000,
    };

    const autoDungeonOptions = {
        checkInterval: 100
    };

    let clickCount = 0;
    let isPaused = false;

    // ======================= Funciones AutoQueue =======================

    async function ensureModalClosed(retryCount = 0) {
        if (typeof BreedingController.isModalOpen === 'function' && BreedingController.isModalOpen()) {
            if (retryCount < autoQueueOptions.maxModalCloseRetries) {
                BreedingController.closeBreedingModal();
                await new Promise((resolve) => setTimeout(resolve, autoQueueOptions.modalCloseRetryInterval));
                return ensureModalClosed(retryCount + 1);
            } else {
                console.warn("No se pudo cerrar el modal tras varios intentos.");
            }
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
                    BreedingController.openBreedingModal();
                    await new Promise((resolve) => setTimeout(resolve, autoQueueOptions.modalLoadTime));
                    hatcheryList = BreedingController.viewSortedFilteredList();
                }

                if (hatcheryList?.length > 0) {
                    let i = 0;
                    while (App.game.breeding.queueList().length < maxQueueSlots && i < hatcheryList.length) {
                        const pokemon = hatcheryList[i];
                        if (pokemon.isHatchable()) {
                            App.game.breeding.addPokemonToHatchery(pokemon);
                        }
                        i++;
                    }
                }

                if (App.game.breeding.queueList().length >= maxQueueSlots) {
                    BreedingController.closeBreedingModal();
                    await ensureModalClosed();
                } else {
                    if (typeof BreedingController.isModalOpen === 'function' && BreedingController.isModalOpen()) {
                        BreedingController.closeBreedingModal();
                        await ensureModalClosed();
                    }
                }
            } else {
                if (typeof BreedingController.isModalOpen === 'function' && BreedingController.isModalOpen()) {
                    BreedingController.closeBreedingModal();
                    await ensureModalClosed();
                }
            }
        } catch (error) {
            console.error("Error en la automatización de la cola:", error);
        }
    }

    function startAutoQueue() {
        if (autoQueueIntervalId) return;
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
                setTimeout(() => {
                    isPaused = false;
                    clickCount = 0;
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
        if (typeof DungeonRunner === 'undefined') return false;
        if (!DungeonRunner.dungeon) return false;
        if (typeof DungeonRunner.dungeonFinished !== 'function') return false;
        if (DungeonRunner.dungeonFinished()) return false;
        if (!DungeonRunner.map) return false;
        if (typeof DungeonRunner.map.playerPosition !== 'function') return false;
        const pos = DungeonRunner.map.playerPosition();
        if (!pos) return false;
        const dungeonMapElement = document.getElementById('dungeonMap');
        if (!dungeonMapElement) return false;
        return true;
    }

    function getPlayerPosition() {
        const pos = DungeonRunner.map.playerPosition();
        return pos || null;
    }

    function getBoard() {
        const pos = getPlayerPosition();
        if (!pos || !DungeonRunner.map || typeof DungeonRunner.map.board !== 'function') {
            return null;
        }
        const board = DungeonRunner.map.board()[pos.floor];
        if (!board || !Array.isArray(board)) {
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
            return false;
        }
    
        const pos = getPlayerPosition();
        const nextStep = path[0];
    
        if (pos && pos.x === nextStep.x && pos.y === nextStep.y && pos.floor === nextStep.floor) {
            return false;
        }
    
        const moved = DungeonRunner.map.moveToTile(nextStep);
        if (!moved) {
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
        }
    }

    function startDungeonIfButtonExists() {
        const dungeonStartBtn = document.querySelector('button.btn-success.p-0[onclick*="DungeonRunner.initializeDungeon"]');
        if (dungeonStartBtn && !dungeonStartBtn.disabled) {
            dungeonStartBtn.click();
            return true;
        }
        return false;
    }

    function autoDungeonAction() {
        if (!autoDungeonActive) return;
    
        if (!inDungeon()) {
            const started = startDungeonIfButtonExists();
            return;
        }
    
        const pos = getPlayerPosition();
        if (!pos) return;
    
        const board = getBoard();
        if (!board) return;
    
        const bossPos = findTileByType(board, GameConstants.DungeonTileType.boss);
        const ladderPos = findTileByType(board, GameConstants.DungeonTileType.ladder);
    
        let movedSuccessfully = false;
    
        if (bossPos || ladderPos) {
            const target = bossPos || ladderPos;
    
            let path = DungeonRunner.map.findShortestPath(pos, target, [GameConstants.DungeonTileType.enemy]);
            if (!path || path.length === 0) {
                path = DungeonRunner.map.findShortestPath(pos, target);
            }
            if (path && path.length > 0) {
                movedSuccessfully = moveAlongPath(path);
                if (movedSuccessfully) return;
            } 
        }
    
        const unexplored = getUnexploredTiles(board);
        if (!movedSuccessfully && unexplored.length > 0) {
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
                movedSuccessfully = moveAlongPath(shortestPath);
                if (movedSuccessfully) return;
            }
        }
    
        simulateInteractionClick();
    
        if (!movedSuccessfully && typeof DungeonRunner.map.nearbyTiles === 'function') {
            const nearbyTiles = DungeonRunner.map.nearbyTiles(pos);
            if (nearbyTiles && nearbyTiles.length > 0) {
                const randomTile = pickRandomTile(nearbyTiles);
                if (randomTile) {
                    moveAlongPath([randomTile.position]);
                }
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

    function updateAccordionTitle() {
        const accordionTitle = document.getElementById("automation-accordion-title");
        if (!accordionTitle) return;
    
        const Q = autoQueueActive ? 'Q✅' : 'Q❌';
        const C = autoClickerActive ? 'C✅' : 'C❌';
        const D = autoDungeonActive ? 'D✅' : 'D❌';
        accordionTitle.textContent = `⚙️: ${Q} | ${C} | ${D}`;
    }

    function toggleAutoQueue(isActive) {
        autoQueueActive = isActive;
        const queueButton = document.getElementById("autoqueue-toggle-btn");

        if (isActive) {
            queueButton.textContent = "Queue: ON";
            queueButton.classList.replace("btn-secondary", "btn-success");
            startAutoQueue();
        } else {
            queueButton.textContent = "Queue: OFF";
            queueButton.classList.replace("btn-success", "btn-secondary");
            stopAutoQueue();
        }

        updateAccordionTitle();
    }

    function toggleAutoClicker(isActive) {
        autoClickerActive = isActive;
        const clickerButton = document.getElementById("autoclicker-toggle-btn");

        if (isActive) {
            if (!clickerRunning) {
                clickerButton.textContent = "Clicker: ON";
                clickerButton.classList.replace("btn-secondary", "btn-success");
                detectAndClick();
            }
        } else {
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

        updateAccordionTitle();
    }

    function toggleAutoDungeon(isActive) {
        autoDungeonActive = isActive;
        const dungeonButton = document.getElementById("autodungeon-toggle-btn");

        if (isActive) {
            dungeonButton.textContent = "Dungeon: ON";
            dungeonButton.classList.replace("btn-secondary", "btn-success");
            startAutoDungeon();
        } else {
            dungeonButton.textContent = "Dungeon: OFF";
            dungeonButton.classList.replace("btn-success", "btn-secondary");
            stopAutoDungeon();
        }

        updateAccordionTitle();
    }

    // ======================= Interfaz (Acordeón) =======================

    function createUI() {
        const container = document.createElement("div");
        Object.assign(container.style, {
            position: "fixed",
            bottom: "10px",
            right: "10px",
            backgroundColor: "#f8f9fa",
            border: "1px solid #ced4da",
            borderRadius: "8px",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
            fontFamily: "Arial, sans-serif",
            fontSize: "12px",
            width: "160px",
            zIndex: "1000",
        });
    
        // Acordeón header
        const header = document.createElement("div");
        Object.assign(header.style, {
            backgroundColor: "#6200ea", // un púrpura agradable
            color: "#ffffff", // texto en blanco para contraste
            borderRadius: "8px 8px 0 0",
            padding: "5px",
            cursor: "pointer",
            textAlign: "center",
            fontWeight: "bold",
            fontSize: "14px"
        });
        header.id = "automation-accordion-title";
        header.textContent = "⚙️: Q❌ | C❌ | D❌";
    
        const content = document.createElement("div");
        Object.assign(content.style, {
            display: "none",
            flexDirection: "column",
            gap: "5px",
            padding: "8px"
        });
    
        content.innerHTML = `
            <button id="autoqueue-toggle-btn" class="btn btn-secondary btn-sm w-100">Queue: OFF</button>
            <button id="autoclicker-toggle-btn" class="btn btn-secondary btn-sm w-100">Clicker: OFF</button>
            <button id="autodungeon-toggle-btn" class="btn btn-secondary btn-sm w-100">Dungeon: OFF</button>
            <div style="display: flex; align-items: center; gap: 5px; font-size: 12px;">
                <label for="autoclicker-interval" style="margin: 0;">Interval:</label>
                <input id="autoclicker-interval" type="number" class="form-control form-control-sm w-100" value="${autoClickerOptions.interval}" min="10" step="10">
            </div>
        `;
    
        header.addEventListener('click', () => {
            content.style.display = (content.style.display === "none") ? "flex" : "none";
        });
    
        container.appendChild(header);
        container.appendChild(content);
        document.body.appendChild(container);
    
        document.getElementById("autoqueue-toggle-btn")
            .addEventListener("click", () => toggleAutoQueue(!autoQueueActive));
    
        document.getElementById("autoclicker-toggle-btn")
            .addEventListener("click", () => toggleAutoClicker(!autoClickerActive));
    
        document.getElementById("autodungeon-toggle-btn")
            .addEventListener("click", () => toggleAutoDungeon(!autoDungeonActive));
    
        document.getElementById("autoclicker-interval")
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
