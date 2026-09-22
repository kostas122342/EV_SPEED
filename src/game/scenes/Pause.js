import { Scene } from 'phaser';
import { showRaceCountdown } from '../countdown.js';
import { transitionToScene } from '../sceneTransition.js';

export class Pause extends Scene {
    constructor() { super('Pause'); }

    create() {
        this.counting = false;
        const race = this.scene.get('Game');
        const menu = this.add.container(0, 0).setDepth(1);
        menu.add(this.add.rectangle(240, 360, 480, 720, 0x000000, 0.72));
        // Block touches throughout the countdown, even with the menu hidden.
        this.add.zone(240, 360, 480, 720).setInteractive();
        menu.add(this.add.text(240, 260, 'PAUSED', {
            fontFamily: 'Arial Black', fontSize: 36, color: '#ffffff',
            stroke: '#0033aa', strokeThickness: 6, fontStyle: 'italic',
        }).setOrigin(0.5));
        const button = (y, label, color, action) => {
            const bg = this.add.rectangle(240, y, 230, 54, color)
                .setStrokeStyle(2, 0x00cfff).setInteractive({ useHandCursor: true });
            const text = this.add.text(240, y, label, {
                fontFamily: 'Arial Black', fontSize: 26, color: '#ffffff',
                stroke: '#000000', strokeThickness: 4, fontStyle: 'italic',
            }).setOrigin(0.5);
            menu.add([bg, text]);
            bg.on('pointerdown', () => { if (!this.counting) action(); });
        };
        button(355, 'RESUME', 0x005588, () => {
            this.counting = true;
            menu.setVisible(false);
            showRaceCountdown(this, {
                fontStyle: 'italic',
                label: race.mp ? (race.mpPlayer === 1 ? race.mpP1Name : race.mpP2Name) : 'GET READY',
                color: race.mp && race.mpPlayer === 2 ? '#ff9900' : '#00cfff',
                onComplete: () => {
                    // A focus change on the last countdown frame must not resume a race.
                    if (document.hidden || !document.hasFocus()) {
                        this.scene.restart();
                        return;
                    }
                    race.homeDown = false;
                    race.swiped = false;
                    race.input.keyboard?.resetKeys();
                    for (const sound of race.pauseSounds || []) {
                        if (sound.isPaused) sound.resume();
                    }
                    race.pauseSounds = [];
                    this.scene.resume('Game');
                    this.scene.stop();
                },
            });
        });
        button(430, 'MENU', 0xaa0000, () => {
            for (const sound of race.pauseSounds || []) {
                if (sound.key !== 'bgMusic') sound.stop();
            }
            race.pauseSounds = [];
            this.scene.stop('Game');
            transitionToScene(this, 'Menu');
        });
        // If interrupted during 3-2-1, require Continue again on return.
        const interrupted = () => {
            if (this.counting) {
                this.counting = false;
                this.scene.restart();
            }
        };
        this.game.events.on('blur', interrupted);
        this.game.events.on('hidden', interrupted);
        this.events.once('shutdown', () => {
            this.game.events.off('blur', interrupted);
            this.game.events.off('hidden', interrupted);
        });
    }
}
