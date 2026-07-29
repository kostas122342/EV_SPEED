import '@fontsource/russo-one/latin-400.css';
import StartGame from './game/main';

document.addEventListener('DOMContentLoaded', async () => {
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
