# AutoClicker Script

A versatile autoclicker script designed for browser-based games, enabling automatic clicks on specific webpage elements. Compatible with desktop browsers as well as iOS and Android devices.

## Key Features

- **Automated Clicks:** Continuously simulates clicks on a chosen DOM element.  
- **Easy Activation/Deactivation:** Use a floating control button or keyboard shortcuts to quickly enable or disable the autoclicker.  
- **Adjustable Intervals:** Dynamically change the click frequency to suit your needs.  
- **Visual Status Indicator:** Instantly see whether the autoclicker is active or inactive.  
- **Multi-Platform Support:** Works smoothly on desktop browsers and mobile browsers (iOS and Android).

## How to Use

### Desktop

1. Open your preferred browser (Chrome, Firefox, Edge, etc.).
2. Navigate to the game where you want to use the autoclicker.
3. Open the browser console:
   - Windows/Linux: `Ctrl + Shift + J`
   - macOS: `Cmd + Option + J`
4. Paste the script into the console and press Enter.
5. Use the floating interface to turn the autoclicker on/off and adjust the interval as needed.

### iOS

**Option 1: Bookmarklet in Safari**
1. In Safari, create a bookmark for any page.
2. Edit the bookmark:
   - Rename it to "AutoClicker".
   - Replace the URL with the single-line `javascript:` version of the script.
3. Open the game in Safari.
4. Tap the "AutoClicker" bookmark to run the script.

**Option 2: JavaScript Console Apps**
1. Install an app with a JavaScript console, such as [iCab Mobile](https://apps.apple.com/app/icab-mobile/id308111628) or [Inspect Browser](https://apps.apple.com/app/inspect-browser/id1372526347).
2. Open the game in the app.
3. Paste and execute the `autoclicker.min.js` content in the built-in console.

### Android

**Option 1: Bookmarklet in Chrome/Firefox**
1. Create a bookmark for any page (e.g., `google.com`).
2. Edit the bookmark:
   - Name it "AutoClicker".
   - Replace the URL with the single-line `javascript:` version of `autoclicker.min.js`.
3. Open the game in your browser.
4. Select the "AutoClicker" bookmark to run the script.

**Option 2: Browsers with Integrated Consoles**
1. Install a browser with console support, such as [Kiwi Browser](https://play.google.com/store/apps/details?id=com.kiwibrowser.browser) (supports Chrome extensions) or [Firefox Developer Edition](https://play.google.com/store/apps/details?id=org.mozilla.fenix).
2. Open the game in that browser.
3. Paste and execute `autoclicker.min.js` in the integrated console.

## `autoclicker.min.js` File

The [autoclicker.min.js](./autoclicker.min.js) file provides a compact, mobile-friendly version of the script, suitable for use as a bookmarklet or direct console injection in mobile browsers.

## Code and Contributions

You can find the complete source code here: [https://github.com/diegomarty/auto-click-pokecliker](https://github.com/diegomarty/auto-click-pokecliker)

Suggestions and improvements are welcome. Feel free to open an issue or submit a pull request.
