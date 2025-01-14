(function () {
    let autoQueueActive = false;
    let autoClickerActive = false;
    let autoDungeonActive = false;
    let autoDungeonTreasurePriorityActive = false;
    let autoMiningActive = false; 

    let clickerRunning = false;
    let lastClickTime = 0;
    let clickLoopId = null;
    let autoQueueIntervalId = null;
    let autoDungeonIntervalId = null;
    let autoMiningIntervalId = null;

    const autoQueueOptions = {
        checkInterval: 2000,
        modalLoadTime: 500,
        maxModalCloseRetries: 5,
        modalCloseRetryInterval: 500,
    };

    const autoClickerOptions = {
        interval: 100,
        pauseAfterClicks: 100,
        pauseDuration: 2000,
    };

    const autoDungeonOptions = {
        checkInterval: 100,
    };

    const autoMiningOptions = {
        checkInterval: 100,
    };

    let clickCount = 0;
    let isPaused = false;

    // ======================= Funciones AutoQueue =======================

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

                // Usamos jQuery solo para los modals:
                $('#breedingModal').modal('hide');
            } else {
                $('#breedingModal').modal('hide');
            }
        } catch (error) {
            console.error("Error en la automatización de la cola:", error);
        }
    }

    function startAutoQueue() {
        if (autoQueueIntervalId) return;
        autoQueueIntervalId = setInterval(autoFillQueue, autoQueueOptions.checkInterval);
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
                } else if (gameState === GameConstants.GameState.temporaryBattle && typeof TemporaryBattleBattle.clickAttack === "function") {
                    TemporaryBattleBattle.clickAttack();
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
        if (typeof DungeonRunner === "undefined") return false;
        if (!DungeonRunner.dungeon) return false;
        if (typeof DungeonRunner.dungeonFinished !== "function") return false;
        if (DungeonRunner.dungeonFinished()) return false;
        if (!DungeonRunner.map) return false;
        if (typeof DungeonRunner.map.playerPosition !== "function") return false;
        const pos = DungeonRunner.map.playerPosition();
        if (!pos) return false;
        const dungeonMapElement = document.getElementById("dungeonMap");
        if (!dungeonMapElement) return false;
        return true;
    }

    function getPlayerPosition() {
        const pos = DungeonRunner.map.playerPosition();
        return pos || null;
    }

    function getBoard() {
        const pos = getPlayerPosition();
        if (!pos || !DungeonRunner.map || typeof DungeonRunner.map.board !== "function") {
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
                const tileType = typeof tile.type === "function" ? tile.type() : tile.type;
                if (tileType === type) {
                    return { x, y, floor: pos.floor };
                }
            }
        }
        return null;
    }

    function getAllTilesByType(board, type) {
        const pos = getPlayerPosition();
        if (!pos) return [];
        const tiles = [];
        for (let y = 0; y < board.length; y++) {
            for (let x = 0; x < board[y].length; x++) {
                const tile = board[y][x];
                if (!tile) continue;
                const tileType = typeof tile.type === "function" ? tile.type() : tile.type;
                if (tileType === type) {
                    tiles.push({ x, y, floor: pos.floor });
                }
            }
        }
        return tiles;
    }

    function getUnexploredTiles(board) {
        const tiles = [];
        const pos = getPlayerPosition();
        if (!pos) return tiles;
        for (let y = 0; y < board.length; y++) {
            for (let x = 0; x < board[y].length; x++) {
                const tile = board[y][x];
                if (!tile || tile.isVisited) continue;
                let cssClassValue = tile.cssClass;
                if (typeof cssClassValue === "function") {
                    cssClassValue = cssClassValue();
                }
                if (typeof cssClassValue === "string" && !cssClassValue.includes("tile-invisible")) {
                    tiles.push({ x, y, floor: pos.floor });
                }
            }
        }
        return tiles;
    }

    function moveAlongPath(path) {
        if (!path || path.length === 0) return false;

        const pos = getPlayerPosition();
        const nextStep = path[0];

        if (pos && pos.x === nextStep.x && pos.y === nextStep.y && pos.floor === nextStep.floor) {
            return false;
        }

        const moved = DungeonRunner.map.moveToTile(nextStep);
        if (!moved) return false;
        return true;
    }

    function pickRandomTile(tiles) {
        if (!tiles || tiles.length === 0) return null;
        const index = Math.floor(Math.random() * tiles.length);
        return tiles[index];
    }

    function simulateInteractionClick() {
        const dungeonArea = document.querySelector(".battle-view.card-body");
        if (dungeonArea) dungeonArea.click();
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
            startDungeonIfButtonExists();
            return;
        }

        const pos = getPlayerPosition();
        if (!pos) return;

        const board = getBoard();
        if (!board) return;

        let movedSuccessfully = false;

        // Prioridad tesoros
        if (autoDungeonTreasurePriorityActive) {
            const chestTiles = getAllTilesByType(board, GameConstants.DungeonTileType.chest);
            if (chestTiles.length > 0) {
                let shortestPath = null;
                let shortestDistance = Infinity;
                for (const tile of chestTiles) {
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
        }

        // Boss o ladder
        const bossPos = findTileByType(board, GameConstants.DungeonTileType.boss);
        const ladderPos = findTileByType(board, GameConstants.DungeonTileType.ladder);

        if (!movedSuccessfully && (bossPos || ladderPos)) {
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

        // Celdas no exploradas
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

        if (!movedSuccessfully && typeof DungeonRunner.map.nearbyTiles === "function") {
            const nearbyTiles = DungeonRunner.map.nearbyTiles(pos);
            if (nearbyTiles && nearbyTiles.length > 0) {
                const randomTile = pickRandomTile(nearbyTiles);
                if (randomTile) moveAlongPath([randomTile.position]);
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

    // ======================= NUEVO: Funciones AutoMining =======================

    function autoMiningAction() {
        // Si no está activo, no hacemos nada
        if (!autoMiningActive) return;

        // Chequear si hay una mina activa
        const currentMine = App.game.underground.mine;
        if (!currentMine || currentMine.completed) {
            // No generamos nueva mina, el usuario se encargará
            return;
        }

        // Seleccionar la herramienta Bomb, asumiendo que tenemos usos infinitos
        // ID 2 es Bomb (Chisel=0, Hammer=1, Bomb=2, Survey=3 en la mayoría de versiones)
        App.game.underground.tools.selectedToolType = UndergroundToolType.Bomb;

        // Tomar todos los .mineSquare
        const mineSquares = document.querySelectorAll('#mineBody .mineSquare');
        if (!mineSquares?.length) return;

        // Iteramos cada .mineSquare y simulamos un mouseDown, 
        // que es lo que el juego escucha para excavar
        mineSquares.forEach(square => {
            // Verificamos si la mina sigue activa y no se completó en medio de la iteración
            if (!App.game.underground.mine || App.game.underground.mine.completed) {
                return;
            }
            // Disparamos el evento para usar Bomb en esa celda
            square.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        });
    }

    function startAutoMining() {
        if (autoMiningIntervalId) return;
        autoMiningIntervalId = setInterval(autoMiningAction, autoMiningOptions.checkInterval);
    }

    function stopAutoMining() {
        if (autoMiningIntervalId) {
            clearInterval(autoMiningIntervalId);
            autoMiningIntervalId = null;
        }
    }

    // ======================= Toggles =======================

    function updateAccordionTitle() {
        const accordionTitle = document.getElementById("automation-accordion-title");
        if (!accordionTitle) return;

        const H = autoQueueActive ? "H✅" : "H❌";
        const C = autoClickerActive ? "C✅" : "C❌";
        const D = autoDungeonActive ? "D✅" : "D❌";
        const M = autoMiningActive ? "M✅" : "M❌";

        accordionTitle.textContent = `⚙️: ${H} | ${C} | ${D} | ${M}`;
    }

    function toggleAutoQueue(isActive) {
        autoQueueActive = isActive;
        const queueButton = document.getElementById("autoqueue-toggle-btn");

        if (isActive) {
            queueButton.textContent = "Hatchery: ON";
            queueButton.classList.replace("btn-secondary", "btn-success");
            startAutoQueue();
        } else {
            queueButton.textContent = "Hatchery: OFF";
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

    function toggleDungeonTreasurePriority(isActive) {
        autoDungeonTreasurePriorityActive = isActive;
    }

    function toggleAutoMining(isActive) {
        autoMiningActive = isActive;
        const miningButton = document.getElementById("automining-toggle-btn");

        if (isActive) {
            miningButton.textContent = "Mining: ON";
            miningButton.classList.replace("btn-secondary", "btn-success");
            startAutoMining();
        } else {
            miningButton.textContent = "Mining: OFF";
            miningButton.classList.replace("btn-success", "btn-secondary");
            stopAutoMining();
        }
        updateAccordionTitle();
    }

    // ======================= Interfaz (Acordeón + Modal Info) =======================

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
            width: "200px",
            zIndex: "2000",
        });
    
        const header = document.createElement("div");
        Object.assign(header.style, {
            backgroundColor: "#6200ea",
            color: "#ffffff",
            borderRadius: "8px 8px 0 0",
            padding: "5px",
            cursor: "pointer",
            textAlign: "center",
            fontWeight: "bold",
            fontSize: "14px",
        });

        header.id = "automation-accordion-title";
        header.textContent = "⚙️: H❌ | C❌ | D❌ | M❌";
    
        const content = document.createElement("div");
        Object.assign(content.style, {
            display: "none",
            flexDirection: "column",
            gap: "5px",
            padding: "8px",
        });
    
        content.innerHTML = `
            <button id="autoclicker-toggle-btn" class="btn btn-secondary btn-sm w-100">Clicker: OFF</button>
            <div style="display: flex; align-items: center; gap: 5px; font-size: 12px;">
                <label for="autoclicker-interval" style="margin: 0;" class="text-secondary">Interval:</label>
                <input id="autoclicker-interval" type="number" class="form-control form-control-sm w-100" value="${autoClickerOptions.interval}" min="10" step="10">
            </div>
            <button id="autoqueue-toggle-btn" class="btn btn-secondary btn-sm w-100">Hatchery: OFF</button>
            <div style="display: flex; align-items: center; gap: 5px; font-size: 12px;">
                <input type="checkbox" id="autodungeon-treasure" />
                <label for="autodungeon-treasure" style="margin:0;" class="text-secondary">Prioritize treasure</label>
            </div>
            <button id="autodungeon-toggle-btn" class="btn btn-secondary btn-sm w-100">Dungeon: OFF</button>
            <button id="automining-toggle-btn" class="btn btn-secondary btn-sm w-100">Mining: OFF</button>
            <div style="text-align: right;">
                <a href="#" id="more-info-link" style="font-size:10px; color: #6c757d;">More info</a>
            </div>
        `;
    
        header.addEventListener("click", () => {
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
    
        document.getElementById("automining-toggle-btn")
            .addEventListener("click", () => toggleAutoMining(!autoMiningActive));
    
        document.getElementById("autoclicker-interval")
            .addEventListener("change", (e) => {
                const newInterval = parseInt(e.target.value, 10);
                if (newInterval >= 10) {
                    autoClickerOptions.interval = newInterval;
                } else {
                    e.target.value = autoClickerOptions.interval;
                }
            });
    
        document.getElementById("autodungeon-treasure")
            .addEventListener("change", (e) => toggleDungeonTreasurePriority(e.target.checked));
    
        document.getElementById("more-info-link").addEventListener("click", (e) => {
            e.preventDefault();
            $('#infoModal').modal('show');
        });
    
        const infoModal = document.createElement('div');
        infoModal.innerHTML = `
            <div class="modal fade" id="infoModal" tabindex="-1" role="dialog" aria-labelledby="infoModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered" role="document">
                    <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="infoModalLabel">Automation Features</h5>
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body" style="font-size:14px;">
                        <p><strong>Auto Hatchery (H):</strong> It's best to list Pokémon by breeding efficiency, so you hatch the most optimal eggs first.</p>
                        <p><strong>Auto Clicker (C):</strong> We do not recommend decreasing the click interval below 100ms as it may cause performance issues. Keep it at 100ms or above for stability.</p>
                        <p><strong>Auto Dungeon (D):</strong> Prioritizing treasure first can be beneficial, as it often yields extra rewards. Then proceed towards the boss or unexplored areas.</p>
                        <p><strong>Auto Mining (M):</strong> This feature is to automate the mining process. It will use the Bomb tool on every square in the mine.</p>
                        <p><strong>Additional Tips:</strong><br>
                        - Always ensure you have enough resources before starting these automations.<br>
                        - Monitor performance when lowering intervals or activating multiple features.</p>
                        <p>Code can be found here: <a href="https://github.com/diegomarty/auto-click-pokecliker" target="_blank">GitHub</a>. Suggestions and improvements are welcome!</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary btn-sm" data-dismiss="modal">Close</button>
                    </div>
                    </div>
                </div>
            </div>`;
    
        document.body.appendChild(infoModal);
    }

    createUI();
    window.toggleAutoQueue = toggleAutoQueue;
    window.toggleAutoClicker = toggleAutoClicker;
    window.toggleAutoDungeon = toggleAutoDungeon;
})();
