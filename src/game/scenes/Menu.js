import { Scene, Textures } from 'phaser';
import { preloadMenuAssets } from '../assetManifest.js';
import { addMenuVideoBackground, preloadMenuVideo } from '../menuVideoBackground.js';
import { transitionToScene } from '../sceneTransition.js';
import { getAchievementSnapshot } from '../achievements.js';

const W = 480, H = 720;
const MENU_BUTTON_CENTER_Y = 374;
const MENU_BUTTON_SPACING = 60;
const MENU_BUTTON_TEXT_LAYOUT = { emoji: -27, label: -5 };
const SHOP_BUTTON_TEXT_LAYOUT = { emoji: -32, label: -10 };
const SETTINGS_BUTTON_TEXT_LAYOUT = { emoji: -37, label: -5 };

export class Menu extends Scene {
    constructor() { super('Menu'); }

    preload() {
        preloadMenuVideo(this);
        preloadMenuAssets(this);
    }

    create() {
        this.textures.get('energyLogo').setFilter(Textures.FilterMode.LINEAR);
        const achievementSnapshot = getAchievementSnapshot();
        const totalEnergy = parseInt(localStorage.getItem('evspeed_energy') || '0');

        const musicOn = localStorage.getItem('evspeed_music') !== 'false';
        let bgMusic = this.sound.get('bgMusic');
        if (!bgMusic) bgMusic = this.sound.add('bgMusic', { loop: true, volume: 0.45 });
        if (musicOn && !bgMusic.isPlaying) bgMusic.play();
        else if (!musicOn && bgMusic.isPlaying) bgMusic.stop();

        this.menuVideo = addMenuVideoBackground(this, W, H);

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
        this.menuGroup.add(energyIcon);

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

        this.makeAchievementsTab(this.menuGroup, achievementSnapshot);

        // START button
        this.makeButton(W / 2, MENU_BUTTON_CENTER_Y - MENU_BUTTON_SPACING, 210, 48, '▶  START', () => {
            this.showModeSelect();
        }, undefined, this.menuGroup, MENU_BUTTON_TEXT_LAYOUT);

        this.makeButton(W / 2, MENU_BUTTON_CENTER_Y, 210, 48, '🛒  SHOP', () => {
            transitionToScene(this, 'Shop', {}, 'garage');
        }, [0x004488, 0x0055aa, 0x2288cc], this.menuGroup, SHOP_BUTTON_TEXT_LAYOUT);

        this.makeButton(W / 2, MENU_BUTTON_CENTER_Y + MENU_BUTTON_SPACING, 210, 48, '⚙️  SETTINGS', () => {
            transitionToScene(this, 'Settings');
        }, [0x333344, 0x444466, 0x6666aa], this.menuGroup, SETTINGS_BUTTON_TEXT_LAYOUT);
    }

    makeAchievementsTab(group, snapshot) {
        const { completed, total } = snapshot;
        const x = 52, y = 17, width = 190, height = 38;
        const centerY = y + height / 2;
        const panel = this.add.graphics().setDepth(3);

        const draw = hover => {
            panel.clear();
            panel.fillStyle(0x000000, 0.48);
            panel.fillRoundedRect(x + 2, y + 3, width, height, 11);
            panel.fillStyle(hover ? 0x142238 : 0x07111f, hover ? 0.96 : 0.88);
            panel.fillRoundedRect(x, y, width, height, 11);
            panel.fillStyle(0xffffff, hover ? 0.10 : 0.055);
            panel.fillRoundedRect(x + 2, y + 2, width - 4, 15, { tl: 9, tr: 9, bl: 2, br: 2 });
            panel.lineStyle(1.4, hover ? 0xffd85a : 0xd89a24, hover ? 1 : 0.78);
            panel.strokeRoundedRect(x, y, width, height, 11);
            panel.fillStyle(0xffbd2f, 0.95);
            panel.fillRoundedRect(x + 8, y + height - 4, width - 16, 2, 1);

            panel.fillStyle(0x5b3900, 0.95);
            panel.fillCircle(x + 19, centerY, 13);
            panel.lineStyle(1, 0xffd45a, 0.95);
            panel.strokeCircle(x + 19, centerY, 13);

            panel.fillStyle(completed > 0 ? 0x0d5a43 : 0x11233a, 1);
            panel.fillRoundedRect(x + width - 42, y + 8, 34, 22, 8);
            panel.lineStyle(1, completed > 0 ? 0x56f2b2 : 0x2cbfe8, 0.7);
            panel.strokeRoundedRect(x + width - 42, y + 8, 34, 22, 8);
        };
        draw(false);

        const trophy = this.add.text(x + 19, centerY, '🏆', {
            fontFamily: 'Arial Black', fontSize: 15,
        }).setOrigin(0.5).setDepth(4);
        const label = this.add.text(x + 38, centerY, 'ACHIEVEMENTS', {
            fontFamily: 'Arial Black', fontSize: 11,
            color: '#f7fbff', letterSpacing: 0.4,
        }).setOrigin(0, 0.5).setDepth(4);
        const count = this.add.text(x + width - 25, centerY, `${completed}/${total}`, {
            fontFamily: 'Arial Black', fontSize: 9,
            color: completed > 0 ? '#78ffc5' : '#6fe4ff',
        }).setOrigin(0.5).setDepth(4);
        const zone = this.add.zone(x + width / 2, centerY, width, height)
            .setInteractive({ useHandCursor: true })
            .setDepth(5)
            .on('pointerover', () => draw(true))
            .on('pointerout', () => draw(false))
            .on('pointerdown', () => transitionToScene(this, 'Achievements'));

        group.add(panel);
        group.add(trophy);
        group.add(label);
        group.add(count);
        group.add(zone);
    }

    showModeSelect() {
        this.menuGroup.setVisible(false);

        // Restore the soft-focus modal treatment used before the video menu:
        // the animation remains visible, but is dimmed behind a framed panel.
        const dimOverlay = this.add.graphics().setDepth(10);
        dimOverlay.fillStyle(0x000000, 0.62);
        dimOverlay.fillRect(0, 0, W, H);

        const modalFrame = this.add.graphics().setDepth(10.5);
        modalFrame.fillStyle(0x050b16, 0.72);
        modalFrame.fillRoundedRect(60, 205, 360, 350, 26);
        modalFrame.lineStyle(3, 0x087fc5, 0.82);
        modalFrame.strokeRoundedRect(60, 205, 360, 350, 26);
        modalFrame.lineStyle(1, 0x5ee5ff, 0.38);
        modalFrame.strokeRoundedRect(66, 211, 348, 338, 21);

        this.add.text(W / 2, H / 2 - 110, 'SELECT MODE', {
            fontFamily: 'Arial Black', fontSize: 30, color: '#ffffff',
            stroke: '#0033aa', strokeThickness: 7
        }).setOrigin(0.5).setDepth(11);

        this.makeModalButton(W / 2, H / 2 - 20, 240, 56, '👤  1 PLAYER',
            () => transitionToScene(this, 'MPCarSelect', { mode: 'single' }, 'garage'),
            [0x880000, 0xaa0000, 0xdd2222]);

        this.makeModalButton(W / 2, H / 2 + 60, 240, 56, '👥  2 PLAYERS',
            () => transitionToScene(this, 'MPCarSelect', { mode: 'multi' }, 'garage'),
            [0x005533, 0x007744, 0x22aa66]);

        this.makeModalButton(W / 2, H / 2 + 148, 160, 44, '← BACK',
            () => transitionToScene(this, 'Menu'),
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
                fontFamily: 'Arial Black', fontSize: textOffsetX.emojiFontSize || 26,
                color: '#ffffff', stroke: '#000000', strokeThickness: 4,
                fontStyle: 'italic'
            }).setOrigin(0.5).setDepth(3);
            txt = this.add.text(x + lo + 28, y, splitParts[2], {
                fontFamily: 'Arial Black', fontSize: textOffsetX.labelFontSize || 26,
                color: '#ffffff', stroke: '#000000', strokeThickness: 4,
                fontStyle: 'italic'
            }).setOrigin(0.5).setDepth(3);
            if (group) { group.add(emojiTxt); group.add(txt); }
        } else {
            const off = typeof textOffsetX === 'number' ? textOffsetX : 0;
            txt = this.add.text(x + off, y, label, {
                fontFamily: 'Arial Black', fontSize: 26,
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
            zone.on('pointerdown', () => transitionToScene(this, 'Capsule', {}, 'capsule'));
        }

        this.addShine(bx, by, bw, bh);
    }

    showInfoOverlay() {
        if (this.infoOverlay) return;

        const overlay = this.add.container(0, 0).setDepth(20).setAlpha(0);
        this.infoOverlay = overlay;

        const shade = this.add.graphics();
        shade.fillStyle(0x000000, 0.88);
        shade.fillRect(0, 0, W, H);
        overlay.add(shade);

        // Absorb input so the menu buttons behind the modal cannot be pressed.
        const inputBlocker = this.add.zone(W / 2, H / 2, W, H)
            .setInteractive()
            .setDepth(1);
        overlay.add(inputBlocker);

        const chrome = this.add.graphics().setDepth(2);

        // Main panel and header.
        chrome.fillStyle(0x000000, 0.55);
        chrome.fillRoundedRect(12, 16, 456, 696, 22);
        chrome.fillStyle(0x050d1b, 0.99);
        chrome.fillRoundedRect(16, 12, 448, 696, 22);
        chrome.lineStyle(2, 0x20cfff, 0.88);
        chrome.strokeRoundedRect(16, 12, 448, 696, 22);
        chrome.fillStyle(0x09233d, 1);
        chrome.fillRoundedRect(20, 16, 440, 64, { tl: 18, tr: 18, bl: 5, br: 5 });
        chrome.lineStyle(1, 0x5ce8ff, 0.58);
        chrome.lineBetween(28, 80, 452, 80);

        // Controls card.
        chrome.fillStyle(0x08182c, 1);
        chrome.fillRoundedRect(34, 94, 412, 108, 14);
        chrome.lineStyle(1.5, 0x1d5378, 0.9);
        chrome.strokeRoundedRect(34, 94, 412, 108, 14);
        chrome.fillStyle(0x020912, 0.92);
        chrome.fillRoundedRect(48, 107, 88, 82, 10);
        chrome.lineStyle(1, 0x20cfff, 0.42);
        chrome.strokeRoundedRect(48, 107, 88, 82, 10);

        // A compact road/car diagram for the lane-change gesture.
        chrome.lineStyle(2, 0xffffff, 0.35);
        chrome.lineBetween(76, 112, 76, 184);
        chrome.lineBetween(108, 112, 108, 184);
        chrome.fillStyle(0xe9f7ff, 1);
        chrome.fillRoundedRect(84, 127, 16, 42, 5);
        chrome.fillStyle(0x142338, 1);
        chrome.fillRoundedRect(87, 133, 10, 13, 3);
        chrome.fillRoundedRect(87, 151, 10, 10, 3);
        chrome.lineStyle(3, 0x20cfff, 1);
        chrome.lineBetween(81, 148, 59, 148);
        chrome.lineBetween(103, 148, 125, 148);
        chrome.lineBetween(59, 148, 66, 141);
        chrome.lineBetween(59, 148, 66, 155);
        chrome.lineBetween(125, 148, 118, 141);
        chrome.lineBetween(125, 148, 118, 155);

        const rows = [
            {
                top: 252, center: 299, color: 0x20cfff,
                title: 'CLR',
                description: 'Clears obstacles from your current lane.',
                texture: 'infoClear', scale: 0.15
            },
            {
                top: 360, center: 407, color: 0xff9d2e,
                title: 'BOMB',
                description: 'Destroys every obstacle on the road.',
                texture: 'infoBomb', scale: 0.25, iconOffsetY: 3
            },
            {
                top: 468, center: 515, color: 0x70e7ff,
                title: 'SHIELD',
                description: 'Protects you from collisions for 4 seconds.',
                texture: 'infoShield', scale: 0.047
            }
        ];

        rows.forEach((row) => {
            chrome.fillStyle(0x08182c, 1);
            chrome.fillRoundedRect(34, row.top, 412, 94, 14);
            chrome.lineStyle(1.25, row.color, 0.42);
            chrome.strokeRoundedRect(34, row.top, 412, 94, 14);
            chrome.fillStyle(row.color, 0.9);
            chrome.fillRoundedRect(34, row.top + 13, 4, 68, 2);
            chrome.fillStyle(row.color, 0.10);
            chrome.fillCircle(88, row.center, 35);
            chrome.lineStyle(1.25, row.color, 0.38);
            chrome.strokeCircle(88, row.center, 35);
        });
        overlay.add(chrome);

        const title = this.add.text(W / 2, 41, 'HOW TO PLAY', {
            fontFamily: 'Arial Black', fontSize: 27, color: '#ffffff',
            stroke: '#00111f', strokeThickness: 4
        }).setOrigin(0.5).setDepth(3);
        const subtitle = this.add.text(W / 2, 68, 'EV SPEED  •  QUICK GUIDE', {
            fontFamily: 'Arial', fontSize: 11, color: '#67ddff',
            letterSpacing: 1.5
        }).setOrigin(0.5).setDepth(3);

        const controlsTitle = this.add.text(154, 121, 'SWIPE LEFT / RIGHT', {
            fontFamily: 'Arial Black', fontSize: 18, color: '#ffffff'
        }).setOrigin(0, 0.5).setDepth(3);
        const controlsDesc = this.add.text(154, 153, 'Change lanes and dodge traffic.', {
            fontFamily: 'Arial', fontSize: 15, color: '#b9d0e6',
            wordWrap: { width: 270 }
        }).setOrigin(0, 0.5).setDepth(3);
        const controlsHint = this.add.text(154, 178, 'Swipe or use the arrow keys.', {
            fontFamily: 'Arial', fontSize: 12, color: '#5fcfee'
        }).setOrigin(0, 0.5).setDepth(3);

        const powerTitle = this.add.text(34, 229, 'POWER-UPS', {
            fontFamily: 'Arial Black', fontSize: 17, color: '#ffffff',
            stroke: '#00111f', strokeThickness: 3
        }).setOrigin(0, 0.5).setDepth(3);
        const powerLine = this.add.graphics().setDepth(3);
        powerLine.lineStyle(2, 0x20cfff, 0.55);
        powerLine.lineBetween(154, 229, 446, 229);

        overlay.add([
            title, subtitle, controlsTitle, controlsDesc, controlsHint,
            powerTitle, powerLine
        ]);

        rows.forEach((row) => {
            const icon = this.add.image(88, row.center + (row.iconOffsetY || 0), row.texture)
                .setScale(row.scale)
                .setDepth(3);
            const rowTitle = this.add.text(140, row.center - 17, row.title, {
                fontFamily: 'Arial Black', fontSize: 20,
                color: `#${row.color.toString(16).padStart(6, '0')}`,
                stroke: '#00111f', strokeThickness: 3
            }).setOrigin(0, 0.5).setDepth(3);
            const rowDesc = this.add.text(140, row.center + 15, row.description, {
                fontFamily: 'Arial', fontSize: 14, color: '#c9d9e8',
                wordWrap: { width: 286 }
            }).setOrigin(0, 0.5).setDepth(3);
            overlay.add([icon, rowTitle, rowDesc]);
        });

        const button = this.add.graphics().setDepth(3);
        const drawButton = (alpha = 1) => {
            button.clear();
            button.fillStyle(0x006799, alpha);
            button.fillRoundedRect(113, 615, 254, 51, 15);
            button.fillStyle(0x00aada, alpha);
            button.fillRoundedRect(116, 612, 248, 49, 14);
            button.fillStyle(0x37dfff, 0.30 * alpha);
            button.fillRoundedRect(119, 615, 242, 20, { tl: 11, tr: 11, bl: 2, br: 2 });
            button.lineStyle(1.5, 0x8defff, alpha);
            button.strokeRoundedRect(116, 612, 248, 49, 14);
        };
        drawButton();
        const buttonText = this.add.text(W / 2, 636, 'GOT IT', {
            fontFamily: 'Arial Black', fontSize: 20, color: '#ffffff',
            stroke: '#003044', strokeThickness: 4
        }).setOrigin(0.5).setDepth(4);
        const footer = this.add.text(W / 2, 686, 'Collect power-ups. Survive longer. Go faster.', {
            fontFamily: 'Arial', fontSize: 11, color: '#55758e'
        }).setOrigin(0.5).setDepth(3);
        overlay.add([button, buttonText, footer]);

        const closeOverlay = () => {
            if (this.infoOverlay !== overlay) return;
            this.tweens.add({
                targets: overlay,
                alpha: 0,
                duration: 120,
                onComplete: () => {
                    overlay.destroy(true);
                    if (this.infoOverlay === overlay) this.infoOverlay = null;
                }
            });
        };

        const closeIcon = this.add.graphics().setDepth(4);
        closeIcon.fillStyle(0x020913, 0.88);
        closeIcon.fillCircle(435, 45, 15);
        closeIcon.lineStyle(1.5, 0x70e7ff, 0.75);
        closeIcon.strokeCircle(435, 45, 15);
        closeIcon.lineStyle(2, 0xffffff, 0.9);
        closeIcon.lineBetween(429, 39, 441, 51);
        closeIcon.lineBetween(441, 39, 429, 51);

        const closeZone = this.add.zone(435, 45, 42, 42)
            .setInteractive({ useHandCursor: true })
            .setDepth(5)
            .once('pointerdown', closeOverlay);
        const buttonZone = this.add.zone(W / 2, 636, 254, 54)
            .setInteractive({ useHandCursor: true })
            .setDepth(5)
            .on('pointerover', () => drawButton(0.82))
            .on('pointerout', () => drawButton(1))
            .once('pointerdown', closeOverlay);
        overlay.add([closeIcon, closeZone, buttonZone]);
        overlay.sort('depth');

        this.tweens.add({
            targets: overlay,
            alpha: 1,
            duration: 180,
            ease: 'Quad.easeOut'
        });
    }
}
