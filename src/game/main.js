import { Game as MainGame } from './scenes/Game';
import { Menu } from './scenes/Menu';
import { Capsule } from './scenes/Capsule';
import { Shop } from './scenes/Shop';
import { MPCarSelect } from './scenes/MPCarSelect';
import { Settings } from './scenes/Settings';
import { AUTO, Scale, Game, GameObjects } from 'phaser';

// Phaser rasterizes every Text object to its own canvas texture. Rendering
// those textures at 2x keeps lettering crisp on high-DPI mobile displays
// without changing any logical font size, scale, origin or position.
const HD_TEXT_RESOLUTION = 2;
const textFactory = GameObjects.GameObjectFactory.prototype.text;

GameObjects.GameObjectFactory.prototype.text = function (x, y, text, style = {}) {
    const sourceStyle = style ?? {};
    const requestedResolution = Number(sourceStyle.resolution) || 0;
    const hdStyle = {
        ...sourceStyle,
        resolution: Math.max(requestedResolution, HD_TEXT_RESOLUTION)
    };

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
