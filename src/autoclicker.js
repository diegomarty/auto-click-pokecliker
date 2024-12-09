/**
 * AutoClicker Script
 * 
 * Simula clics automáticos en el contenedor de un juego de navegador.
 * 
 * Cómo usar:
 * 1. Carga este script en la consola del navegador.
 * 2. Usa `toggleAutoClicker(true)` para iniciar y `toggleAutoClicker(false)` para detener.
 * 
 * @author DiegoMarty
 * @version 1.0
 */

(function () {
    let autoClickerInterval = null;

    /**
     * Activa o desactiva el autoclicker.
     * @param {boolean} isActive - `true` para activar, `false` para detener.
     */
    window.toggleAutoClicker = function (isActive) {
        try {
            const clickableContainer = document.querySelector(
                "#routeBattleContainer .col.no-gutters.clickable"
            );

            if (!clickableContainer) {
                console.error("Error: No se encontró el contenedor interno para clics.");
                return;
            }

            if (isActive) {
                if (autoClickerInterval) return;

                autoClickerInterval = setInterval(() => {
                    try {
                        const rect = clickableContainer.getBoundingClientRect();
                        if (!rect.width || !rect.height) {
                            console.error("Error: Contenedor no visible o inválido.");
                            toggleAutoClicker(false);
                            return;
                        }

                        const x = rect.left + rect.width / 2;
                        const y = rect.top + rect.height / 2;

                        ["mousedown", "mouseup", "click"].forEach((eventType) => {
                            clickableContainer.dispatchEvent(
                                new MouseEvent(eventType, {
                                    bubbles: true,
                                    cancelable: true,
                                    clientX: x,
                                    clientY: y,
                                })
                            );
                        });
                    } catch (innerError) {
                        console.error("Error en el intervalo: ", innerError);
                        toggleAutoClicker(false);
                    }
                }, 40);
            } else {
                if (autoClickerInterval) {
                    clearInterval(autoClickerInterval);
                    autoClickerInterval = null;
                }
            }
        } catch (error) {
            console.error("Error en toggleAutoClicker: ", error);
        }
    };

    // console.log("Script cargado. Usa toggleAutoClicker(true) para iniciar y toggleAutoClicker(false) para detener.");
})();
