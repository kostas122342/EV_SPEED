import { Scene, Textures } from 'phaser';

const W = 480, H = 720;

export class Menu extends Scene {
    constructor() { super('Menu'); }

    preload() {
        this.load.image('menuBg',   'assets/EVSPEED.png');
        this.load.image('playerCar', 'assets/CarFinal.png');
        this.load.image('energyLogo', 'assets/En4.png');
        this.load.audio('bgMusic',  'assets/EvSong.mp3');
        this.load.image('infoPanel', 'assets/info.png');
    }

    create() {
        this.textures.get('energyLogo').setFilter(Textures.FilterMode.LINEAR);
        const totalEnergy = parseInt(localStorage.getItem('evspeed_energy') || '0');

        const musicOn = localStorage.getItem('evspeed_music') !== 'false';
        let bgMusic = this.sound.get('bgMusic');
        if (!bgMusic) bgMusic = this.sound.add('bgMusic', { loop: true, volume: 0.45 });
        if (musicOn && !bgMusic.isPlaying) bgMusic.play();
        else if (!musicOn && bgMusic.isPlaying) bgMusic.stop();

        // Background
        this.add.image(W / 2, H / 2, 'menuBg')
            .setDisplaySize(W, H)
            .setDepth(0);

        this.menuGroup = this.add.group();

        // Energy display top right
        const uiBg = this.add.graphics().setDepth(2);
        uiBg.fillStyle(0x000000, 0.40);
        uiBg.fillRoundedRect(W - 160, 8, 156, 58, 10);
        this.menuGroup.add(uiBg);

        const energyTxt = this.add.text(W - 20, 37, totalEnergy.toString(), {
            fontFamily: 'Arial Black', fontSize: 34, color: '#00cfff',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(1, 0.5).setDepth(3);
        this.menuGroup.add(energyTxt);

        const energyIcon = this.add.image(W - 135, 37, 'energyLogo')
            .setOrigin(0.5, 0.5).setScale(0.38).setDepth(3);
        this.menuGroup.add(energyTxt);

        // Info button top-left
        const infoBg = this.add.graphics().setDepth(3);
        infoBg.fillStyle(0x000000, 0.45);
        infoBg.fillCircle(28, 36, 18);
        infoBg.lineStyle(1.5, 0xaaaaaa, 0.7);
        infoBg.strokeCircle(28, 36, 18);
        this.add.text(28, 36, 'i', {
            fontFamily: 'Georgia, serif', fontSize: 20, color: '#ffffff',
            fontStyle: 'italic', stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(4);
        this.add.zone(28, 36, 40, 40).setInteractive({ useHandCursor: true }).setDepth(5)
            .on('pointerdown', () => this.showInfoOverlay());

        // START button
        this.makeButton(W / 2, 310, 240, 56, '▶  START', () => {
            this.showModeSelect();
        }, undefined, this.menuGroup);

        this.makeButton(W / 2, 385, 240, 56, '🛒  SHOP', () => {
            this.scene.start('Shop');
        }, [0x004488, 0x0055aa, 0x2288cc], this.menuGroup, { emoji: -44, label: -10 });

        this.makeButton(W / 2, 460, 240, 56, '⚙️  SETTINGS', () => {
            this.scene.start('Settings');
        }, [0x333344, 0x444466, 0x6666aa], this.menuGroup, { emoji: -60, label: -10 });
    }

    showModeSelect() {
        this.menuGroup.setVisible(false);

        const ov = this.add.graphics().setDepth(10);
        ov.fillStyle(0x000000, 1);
        ov.fillRect(0, 0, W, H);
        this.add.image(W / 2, H / 2, 'menuBg').setDisplaySize(W, H).setDepth(10);
        const dimOv = this.add.graphics().setDepth(10);
        dimOv.fillStyle(0x000000, 0.65);
        dimOv.fillRect(0, 0, W, H);

        this.add.text(W / 2, H / 2 - 110, 'SELECT MODE', {
            fontFamily: 'Arial Black', fontSize: 30, color: '#ffffff',
            stroke: '#0033aa', strokeThickness: 7
        }).setOrigin(0.5).setDepth(11);

        this.makeModalButton(W / 2, H / 2 - 20, 240, 56, '👤  1 PLAYER',
            () => this.scene.start('MPCarSelect', { mode: 'single' }),
            [0x880000, 0xaa0000, 0xdd2222]);

        this.makeModalButton(W / 2, H / 2 + 60, 240, 56, '👥  2 PLAYERS',
            () => this.scene.start('MPCarSelect', { mode: 'multi' }),
            [0x005533, 0x007744, 0x22aa66]);

        this.makeModalButton(W / 2, H / 2 + 148, 160, 44, '← BACK',
            () => this.scene.restart(),
            [0x333333, 0x555555, 0x777777]);
    }

    showComingSoon() { // unused
        const txt = this.add.text(W / 2, H / 2 + 220, 'COMING SOON', {
            fontFamily: 'Arial Black', fontSize: 22, color: '#ffdd00',
            stroke: '#000000', strokeThickness: 5
        }).setOrigin(0.5).setDepth(15).setAlpha(0);
        this.tweens.add({ targets: txt, alpha: 1, duration: 250,
            onComplete: () => this.time.delayedCall(1500, () =>
                this.tweens.add({ targets: txt, alpha: 0, duration: 400,
                    onComplete: () => txt.destroy() })) });
    }

    makeModalButton(x, y, bw, bh, label, onClick, colors) {
        const bx = x - bw / 2, by = y - bh / 2;
        const btn = this.add.graphics().setDepth(12);

        const draw = (alpha) => {
            btn.clear();
            btn.fillStyle(colors[0], alpha);
            btn.fillRoundedRect(bx + 3, by + 5, bw, bh, 14);
            btn.fillStyle(colors[1], alpha);
            btn.fillRoundedRect(bx, by, bw, bh, 14);
            btn.fillStyle(colors[2], alpha);
            btn.fillRoundedRect(bx + 2, by + 2, bw - 4, bh / 2, { tl: 12, tr: 12, bl: 0, br: 0 });
        };
        draw(1);

        this.add.text(x, y, label, {
            fontFamily: 'Arial Black', fontSize: 22,
            color: '#ffffff', stroke: '#000000', strokeThickness: 4,
            fontStyle: 'italic'
        }).setOrigin(0.5).setDepth(13);

        const zone = this.add.zone(x, y, bw, bh).setInteractive().setDepth(14);
        zone.on('pointerover', () => draw(0.75));
        zone.on('pointerout',  () => draw(1));
        zone.on('pointerdown', onClick);

        this.addShine(bx, by, bw, bh);
    }

    makeButton(x, y, bw, bh, label, onClick, colors = [0x880000, 0xaa0000, 0xdd2222], group = null, textOffsetX = 0) {
        const bx = x - bw / 2, by = y - bh / 2;
        const btn = this.add.graphics().setDepth(2);
        if (group) group.add(btn);

        const draw = (alpha) => {
            btn.clear();
            btn.fillStyle(colors[0], alpha);
            btn.fillRoundedRect(bx + 3, by + 5, bw, bh, 14);
            btn.fillStyle(colors[1], alpha);
            btn.fillRoundedRect(bx, by, bw, bh, 14);
            btn.fillStyle(colors[2], alpha);
            btn.fillRoundedRect(bx + 2, by + 2, bw - 4, bh / 2, { tl: 12, tr: 12, bl: 0, br: 0 });
        };
        draw(1);

        let txt;
        const splitParts = (typeof textOffsetX === 'object') ? label.match(/^(\S+)\s{2}(.+)$/) : null;
        if (splitParts) {
            const eo = textOffsetX.emoji || 0, lo = textOffsetX.label || 0;
            const emojiTxt = this.add.text(x + eo - 28, y, splitParts[1], {
                fontFamily: 'Arial Black', fontSize: 30,
                color: '#ffffff', stroke: '#000000', strokeThickness: 4,
                fontStyle: 'italic'
            }).setOrigin(0.5).setDepth(3);
            txt = this.add.text(x + lo + 28, y, splitParts[2], {
                fontFamily: 'Arial Black', fontSize: 30,
                color: '#ffffff', stroke: '#000000', strokeThickness: 4,
                fontStyle: 'italic'
            }).setOrigin(0.5).setDepth(3);
            if (group) { group.add(emojiTxt); group.add(txt); }
        } else {
            const off = typeof textOffsetX === 'number' ? textOffsetX : 0;
            txt = this.add.text(x + off, y, label, {
                fontFamily: 'Arial Black', fontSize: 30,
                color: '#ffffff', stroke: '#000000', strokeThickness: 4,
                fontStyle: 'italic'
            }).setOrigin(0.5).setDepth(3);
            if (group) group.add(txt);
        }

        const zone = this.add.zone(x, y, bw, bh).setInteractive().setDepth(4);
        zone.on('pointerover',  () => draw(0.80));
        zone.on('pointerout',   () => draw(1));
        zone.on('pointerdown',  onClick);
        if (group) group.add(zone);

        const shine = this.addShine(bx, by, bw, bh);
        if (group && shine) group.add(shine);
        return txt;
    }

    addShine(bx, by, bw, bh) {
        const g = this.add.graphics().setDepth(3.5);
        const sv = { p: bx - 60 };
        const draw = () => {
            g.clear();
            const p = sv.p;
            const tl = Math.max(bx, p - 22), tr = Math.min(bx + bw, p + 22);
            const bl = Math.max(bx, p - 6),  br = Math.min(bx + bw, p + 38);
            if (tr > tl) {
                g.fillStyle(0xffffff, 0.22);
                g.fillPoints([{ x: tl, y: by + 1 }, { x: tr, y: by + 1 }, { x: br, y: by + bh - 1 }, { x: bl, y: by + bh - 1 }], true);
            }
        };
        const run = () => {
            sv.p = bx - 60;
            this.tweens.add({
                targets: sv, p: bx + bw + 60, duration: 900, ease: 'Linear',
                onUpdate: draw,
                onComplete: () => { g.clear(); this.time.delayedCall(2200 + Math.random() * 2000, run); }
            });
        };
        this.time.delayedCall(400 + Math.random() * 1600, run);
        return g;
    }

    makeBuyButton(x, y, bw, bh, canBuy, energy) {
        const bx = x - bw / 2, by = y - bh / 2;
        const btn = this.add.graphics().setDepth(2);

        const baseCol  = canBuy ? 0x005599 : 0x333333;
        const midCol   = canBuy ? 0x0077cc : 0x444444;
        const topCol   = canBuy ? 0x22aaee : 0x555555;

        btn.fillStyle(baseCol, 1);
        btn.fillRoundedRect(bx + 3, by + 5, bw, bh, 14);
        btn.fillStyle(midCol, 1);
        btn.fillRoundedRect(bx, by, bw, bh, 14);
        btn.fillStyle(topCol, 1);
        btn.fillRoundedRect(bx + 2, by + 2, bw - 4, bh / 2, { tl: 12, tr: 12, bl: 0, br: 0 });

        this.add.text(x, y - 10, 'BUY CAR', {
            fontFamily: 'Arial Black', fontSize: 26,
            color: canBuy ? '#ffffff' : '#888888',
            stroke: '#000000', strokeThickness: 4,
            fontStyle: 'italic'
        }).setOrigin(0.5).setDepth(3);

        const sub = canBuy
            ? '0 ENERGY'
            : `NEED ${0 - energy} MORE ENERGY`;
        this.add.text(x, y + 18, sub, {
            fontFamily: 'Arial', fontSize: 14,
            color: canBuy ? '#ffffff' : '#666666',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(3);

        if (canBuy) {
            const zone = this.add.zone(x, y, bw, bh).setInteractive().setDepth(4);
            zone.on('pointerover', () => {
                btn.clear();
                btn.fillStyle(0x004477, 1);
                btn.fillRoundedRect(bx + 3, by + 5, bw, bh, 14);
                btn.fillStyle(0x005599, 1);
                btn.fillRoundedRect(bx, by, bw, bh, 14);
                btn.fillStyle(0x1188cc, 1);
                btn.fillRoundedRect(bx + 2, by + 2, bw - 4, bh / 2, { tl: 12, tr: 12, bl: 0, br: 0 });
            });
            zone.on('pointerout', () => {
                btn.clear();
                btn.fillStyle(baseCol, 1);
                btn.fillRoundedRect(bx + 3, by + 5, bw, bh, 14);
                btn.fillStyle(midCol, 1);
                btn.fillRoundedRect(bx, by, bw, bh, 14);
                btn.fillStyle(topCol, 1);
                btn.fillRoundedRect(bx + 2, by + 2, bw - 4, bh / 2, { tl: 12, tr: 12, bl: 0, br: 0 });
            });
            zone.on('pointerdown', () => this.scene.start('Capsule'));
        }

        this.addShine(bx, by, bw, bh);
    }

    showInfoOverlay() {
        const ov = this.add.graphics().setDepth(20);
        ov.fillStyle(0x000000, 0.78);
        ov.fillRect(0, 0, W, H);

        const img = this.add.image(W / 2, H / 2, 'infoPanel')
            .setDepth(21).setOrigin(0.5);
        const scl = Math.min((W - 40) / img.width, (H - 100) / img.height);
        img.setScale(scl);

        const closeTxt = this.add.text(W / 2, H - 38, 'TAP TO CLOSE', {
            fontFamily: 'Arial Black', fontSize: 13, color: '#aaaaaa',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(21);

        const closeZone = this.add.zone(W / 2, H / 2, W, H).setInteractive().setDepth(22);
        closeZone.once('pointerdown', () => {
            ov.destroy(); img.destroy(); closeTxt.destroy(); closeZone.destroy();
        });
    }
}
