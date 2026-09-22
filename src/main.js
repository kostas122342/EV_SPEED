import '@fontsource/russo-one/latin-400.css';
import StartGame from './game/main';
import { saveStorage } from './game/saveStorage.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await saveStorage.init();
    } catch (error) {
        console.error('Unable to load saved progress.', error);
        const message = document.createElement('div');
        message.style.cssText = 'position:fixed;inset:0;display:grid;place-content:center;gap:20px;padding:24px;background:#071522;color:white;text-align:center;font-family:sans-serif;z-index:99999';
        const text = document.createElement('p');
        text.textContent = 'Could not load your saved progress. Please retry. Your save has not been reset.';
        const retry = document.createElement('button');
        retry.textContent = 'RETRY';
        retry.addEventListener('click', () => window.location.reload());
        message.append(text, retry);
        document.body.append(message);
        return;
    }
    document.addEventListener('visibilitychange', () => { void saveStorage.flush(); });
    window.addEventListener('pagehide', () => { void saveStorage.flush(); });
    // Phaser draws text to textures only once when each scene is created.
    // Wait for the bundled font so mobile never captures a blurry fallback.
    if (document.fonts?.load) {
        try {
            await document.fonts.load('16px "Russo One"');
        } catch {
            // The system-ui fallback remains available if font loading fails.
        }
    }

    StartGame('game-container');

});
