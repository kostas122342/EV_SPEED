import { Scene } from 'phaser';

const W = 480, H = 720;

const SETTINGS = [
    { key: 'evspeed_music',  label: 'MUSIC'    },
    { key: 'evspeed_sfx',    label: 'SOUND FX' },
];

export class Settings extends Scene {
    constructor() { super('Settings'); }

    preload() {
        this.load.image('menuBg', 'assets/EVSPEED2.png');
    }

    create() {
        this.add.image(W / 2, H / 2, 'menuBg').setDisplaySize(W, H).setDepth(0);
        const ov = this.add.graphics().setDepth(1);
        ov.fillStyle(0x000000, 0.62);
        ov.fillRect(0, 0, W, H);

        // Top chrome
        const topChrome = this.add.graphics().setDepth(9);
        topChrome.fillStyle(0x000000, 0.62);
        topChrome.fillRect(0, 0, W, 82);
        this.add.text(W / 2, 52, 'SETTINGS', {
            fontFamily: 'Arial Black', fontSize: 32, color: '#ffffff',
            stroke: '#0033aa', strokeThickness: 7
        }).setOrigin(0.5).setDepth(10);

        // Toggle rows
        const startY = 240;
        SETTINGS.forEach((s, i) => {
            const rowY = startY + i * 130;
            const enabled = localStorage.getItem(s.key) !== 'false';

            // Row bg
            const rowBg = this.add.graphics().setDepth(2);
            rowBg.fillStyle(0x080818, 0.85);
            rowBg.fillRoundedRect(60, rowY - 38, W - 80, 76, 14);
            rowBg.lineStyle(1.5, 0x223355, 1);
            rowBg.strokeRoundedRect(60, rowY - 38, W - 80, 76, 14);

            // Label
            this.add.text(100, rowY, s.label, {
                fontFamily: 'Arial Black', fontSize: 20, color: '#ffffff',
                stroke: '#000000', strokeThickness: 3
            }).setOrigin(0, 0.5).setDepth(3);

            // Toggle
            const tx = W - 120, tw = 72, th = 34, tr = 17;
            const toggleBg = this.add.graphics().setDepth(3);
            const toggleThumb = this.add.graphics().setDepth(4);

            const draw = (on) => {
                toggleBg.clear();
                toggleBg.fillStyle(on ? 0x0077cc : 0x223344, 1);
                toggleBg.fillRoundedRect(tx, rowY - th / 2, tw, th, tr);
                toggleBg.fillStyle(on ? 0x00cfff : 0x334466, 1);
                toggleBg.fillRoundedRect(tx, rowY - th / 2, tw, th - 2, tr);

                toggleThumb.clear();
                const thumbX = on ? tx + tw - tr - 2 : tx + tr + 2;
                toggleThumb.fillStyle(0x000000, 0.3);
                toggleThumb.fillCircle(thumbX + 1, rowY + 1, tr - 5);
                toggleThumb.fillStyle(0xffffff, 1);
                toggleThumb.fillCircle(thumbX, rowY, tr - 5);
            };

            draw(enabled);

            // ON / OFF label
            const stateTxt = this.add.text(tx + tw / 2, rowY + th / 2 + 10, enabled ? 'ON' : 'OFF', {
                fontFamily: 'Arial Black', fontSize: 11, color: enabled ? '#00cfff' : '#556677',
                stroke: '#000000', strokeThickness: 2
            }).setOrigin(0.5).setDepth(4);

            // Click zone
            const zone = this.add.zone(tx + tw / 2, rowY, tw + 20, th + 20)
                .setInteractive({ useHandCursor: true }).setDepth(5);
            zone.on('pointerdown', () => {
                const nowOn = localStorage.getItem(s.key) !== 'false';
                const next = !nowOn;
                localStorage.setItem(s.key, next.toString());
                draw(next);
                stateTxt.setText(next ? 'ON' : 'OFF');
                stateTxt.setColor(next ? '#00cfff' : '#556677');
                if (s.key === 'evspeed_music') {
                    const bgMusic = this.sound.get('bgMusic');
                    if (bgMusic) { if (next) bgMusic.play(); else bgMusic.stop(); }
                }
            });
        });

        // Bottom chrome + back
        const botChrome = this.add.graphics().setDepth(8);
        botChrome.fillStyle(0x000000, 0.62);
        botChrome.fillRect(0, H - 122, W, 122);

        const bw = 200, bh = 56, bx = W / 2, by = H - 78;
        const backGfx = this.add.graphics().setDepth(9);
        const drawBack = (hover) => {
            backGfx.clear();
            backGfx.fillStyle(hover ? 0x550000 : 0x880000, 1);
            backGfx.fillRoundedRect(bx - bw/2 + 3, by - bh/2 + 5, bw, bh, 12);
            backGfx.fillStyle(hover ? 0x770000 : 0xaa0000, 1);
            backGfx.fillRoundedRect(bx - bw/2, by - bh/2, bw, bh, 12);
            backGfx.fillStyle(hover ? 0x993333 : 0xcc2222, 1);
            backGfx.fillRoundedRect(bx - bw/2 + 2, by - bh/2 + 2, bw-4, bh/2, { tl: 10, tr: 10, bl: 0, br: 0 });
        };
        drawBack(false);
        this.add.text(bx, by, 'BACK', {
            fontFamily: 'Arial Black', fontSize: 24, color: '#ffffff',
            stroke: '#000000', strokeThickness: 4, fontStyle: 'italic'
        }).setOrigin(0.5).setDepth(10);

        const backZone = this.add.zone(bx, by, bw, bh).setInteractive().setDepth(11);
        backZone.on('pointerover',  () => drawBack(true));
        backZone.on('pointerout',   () => drawBack(false));
        backZone.on('pointerdown',  () => this.scene.start('Menu'));
    }
}
