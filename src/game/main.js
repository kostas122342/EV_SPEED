import { Game as MainGame } from './scenes/Game';
import { Menu } from './scenes/Menu';
import { Capsule } from './scenes/Capsule';
import { Shop } from './scenes/Shop';
import { MPCarSelect } from './scenes/MPCarSelect';
import { Settings } from './scenes/Settings';
import { AUTO, Scale, Game, GameObjects } from 'phaser';

// Use the bundled display font everywhere Arial Black was requested, instead
// of relying on a platform-dependent mobile fallback. Phaser rasterizes every
// Text object to its own canvas texture, so small labels receive an extra
// resolution boost and a slimmer outline without changing their font size,
// scale, origin or position.
const GAME_DISPLAY_FONT = '"Russo One", system-ui, sans-serif';
const GAME_BODY_FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
const HD_TEXT_RESOLUTION = 2;
const SMALL_TEXT_RESOLUTION = 3;
const textFactory = GameObjects.GameObjectFactory.prototype.text;

GameObjects.GameObjectFactory.prototype.text = function (x, y, text, style = {}) {
    const sourceStyle = style ?? {};
    const fontSize = Number.parseFloat(sourceStyle.fontSize) || 16;
    const requestedResolution = Number(sourceStyle.resolution) || 0;
    const usesDisplayFont = sourceStyle.fontFamily === 'Arial Black';
    const usesBodyFont = sourceStyle.fontFamily === 'Arial';
    const strokeThickness = Number(sourceStyle.strokeThickness) || 0;
    const isSmallLabel = fontSize <= 14;

    const hdStyle = {
        ...sourceStyle,
        resolution: Math.max(
            requestedResolution,
            isSmallLabel ? SMALL_TEXT_RESOLUTION : HD_TEXT_RESOLUTION
        )
    };

    if (usesDisplayFont) hdStyle.fontFamily = GAME_DISPLAY_FONT;
    else if (usesBodyFont) hdStyle.fontFamily = GAME_BODY_FONT;

    if (usesDisplayFont && isSmallLabel) {
        hdStyle.strokeThickness = Math.min(strokeThickness, 1);
    }

    return textFactory.call(this, x, y, text, hdStyle);
};

// Find out more information about the Game Config at:
// https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config = {
    type: AUTO,
    width: 480,
    height: 720,
    parent: 'game-container',
    backgroundColor: '#028af8',
    pixelArt: false,
    scale: {
        mode: Scale.FIT,
        autoCenter: Scale.CENTER_BOTH
    },
    input: {
        touch: { capture: true },
        mouse: { preventDefaultWheel: true }
    },
    scene: [
        Menu,
        MainGame,
        Capsule,
        Shop,
        MPCarSelect,
        Settings
    ]
};

const StartGame = (parent) => {
    return new Game({ ...config, parent });
}

export default StartGame;
