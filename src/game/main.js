import { Game as MainGame } from './scenes/Game';
import { Menu } from './scenes/Menu';
import { Capsule } from './scenes/Capsule';
import { Garage } from './scenes/Garage';
import { Shop } from './scenes/Shop';
import { AUTO, Scale, Game } from 'phaser';

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
        Garage,
        Shop
    ]
};

const StartGame = (parent) => {
    return new Game({ ...config, parent });
}

export default StartGame;
