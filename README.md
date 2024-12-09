# AutoClicker Script

Un script de autoclick diseñado para juegos de navegador que simula clics automáticos sobre un elemento específico. Compatible con navegadores en escritorio, iOS y Android.

## Características

- Simulación de clics automáticos en un elemento del DOM.
- Control de activación/desactivación mediante un botón flotante o teclas de acceso rápido.
- Ajuste dinámico del intervalo de clic.
- Indicador de estado (activo/inactivo).
- Compatibilidad con navegadores móviles (iOS y Android).

## Cómo usar

### **En Escritorio**
1. Abre el navegador de tu elección (Chrome, Firefox, Edge, etc.).
2. Accede al juego donde quieres usar el autoclicker.
3. Abre la consola del navegador:
   - En Windows/Linux: `Ctrl + Shift + J`.
   - En Mac: `Cmd + Option + J`.
4. Pega el contenido del script en la consola y presiona Enter.
5. Usa la interfaz flotante para activar/desactivar el autoclicker y ajustar el intervalo.

---

### **En iOS**

#### Opción 1: Usando Safari y un Bookmarklet
1. Abre Safari en tu dispositivo iOS.
2. Crea un marcador para cualquier página (por ejemplo, `google.com`).
3. Edita el marcador desde tus favoritos:
   - Cambia su nombre a "AutoClicker".
   - Reemplaza la URL con el contenido del archivo `movile-autoclicker.js` convertido en una línea:
     ```javascript
     javascript:(function(){/* TU SCRIPT INLINE */})();
     ```
4. Abre el juego en Safari.
5. Desde los favoritos, selecciona "AutoClicker" para ejecutar el script.

#### Opción 2: Usando una App con Consola JavaScript
1. Descarga una aplicación como:
   - [iCab Mobile](https://apps.apple.com/app/icab-mobile/id308111628)
   - [Inspect Browser](https://apps.apple.com/app/inspect-browser/id1372526347)
2. Abre el juego dentro de la app.
3. Usa la consola JavaScript de la app para pegar el contenido de `movile-autoclicker.js` y ejecutarlo.

---

### **En Android**

#### Opción 1: Usando Chrome o Firefox con Bookmarklet
1. Abre Chrome o Firefox en tu dispositivo Android.
2. Crea un marcador para cualquier página (por ejemplo, `google.com`).
3. Edita el marcador:
   - Cambia su nombre a "AutoClicker".
   - Reemplaza la URL con el contenido del archivo `movile-autoclicker.js` convertido en una línea:
     ```javascript
     javascript:(function(){/* TU SCRIPT INLINE */})();
     ```
4. Abre el juego en tu navegador.
5. Selecciona "AutoClicker" desde los marcadores para ejecutar el script.

#### Opción 2: Usando Navegadores con Consola Integrada
1. Descarga navegadores como:
   - [Kiwi Browser](https://play.google.com/store/apps/details?id=com.kiwibrowser.browser) (compatible con extensiones de Chrome).
   - [Firefox Developer Edition](https://play.google.com/store/apps/details?id=org.mozilla.fenix).
2. Abre el juego en el navegador.
3. Usa la consola integrada para pegar el contenido de `movile-autoclicker.js` y ejecutarlo.

---

## Archivo `movile-autoclicker.js`

El script inline está diseñado para ser compacto y ejecutable en navegadores móviles. Puedes encontrarlo en el archivo [movile-autoclicker.js](./movile-autoclicker.js).

---

## Contribuciones

Las contribuciones son bienvenidas. Por favor, abre un "issue" o envía un "pull request" para sugerencias o mejoras.

## Licencia

Este proyecto está licenciado bajo la [MIT License](LICENSE).
