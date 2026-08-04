import { Scene } from 'phaser';
import { addMenuVideoBackground, preloadMenuVideo } from '../menuVideoBackground.js';

const W = 480, H = 720;
const CX1 = 118, CX2 = 362;
const CAR_Y  = 272;
const CARD_W = 185, CARD_H = 262;

const DRIVER_NAMES = [
    'Furious Jack', 'Iron Mia',    'Thunder Kai',  'Reckless Nico',
    'Storm Lexa',   'Viper Sam',   'Blaze Rio',    'Shadow Zoe',
    'Nitro Ace',    'Ghost Max',   'Turbo Lena',   'Drift King',
    'Phantom Eva',  'Speed Demon', 'Crazy Fox',    'Wild Cat',
    'Dark Horse',   'Fast Eddie',  'Rocket Roy',   'Inferno Pete',
    'Bullet Hank',  'Neon Vera',   'Crash Dante',  'Laser Quinn',
    'Savage Teo',   'Cyclone Bex', 'Cobra Nash',   'Toxic Finn',
    'Flashpoint Al','Steel Maya',  'Havoc Cruz',   'Icy Renee',
    'Mad Dog Sal',  'Voltage Kim', 'Rampage Luke', 'Starfire Jess',
    'Outlaw Dex',   'Banshee Nora','Gravel Rex',   'Hyper Tasha',
];

const ALL_CARS = [
    { key: 'playerCar', name: 'EV 3',    unlockKey: null,              scale: 0.27, offY: -85, offX: 1 },
    { key: 'modelY',    name: 'EV Y',    unlockKey: 'evspeed_carY',    scale: 0.10, offY: -12, offX: 0 },
    { key: 'evS',       name: 'EV S',    unlockKey: 'evspeed_evS',     scale: 0.14, offY: -18, offX: 0 },
    { key: 'evX',       name: 'EV X',    unlockKey: 'evspeed_evX',     scale: 0.10, offY: -18, offX: 0 },
    { key: 'cbt',       name: 'CBT',     unlockKey: 'evspeed_cbt',     scale: 0.12, offY: -18, offX: 0 },
    { key: 'scooter',   name: 'SCOOTER', unlockKey: 'evspeed_scooter', scale: 0.10, offY: -15, offX: 0 },
];

// Per-car color variants with their unlock keys and swatch colors
const CARS_WITH_COLORS = {
    playerCar: [
        { variantKey: 'playerCar', previewKey: 'selectEv3White', unlockKey: null, swatch: 0xd8d8d8, scale: 0.23, offY: 3 },
        { variantKey: 'ev3Blue',   unlockKey: 'evspeed_color_ev3Blue',  swatch: 0x2255ee, scale: 0.205, offX: 4, offY: 11 },
        { variantKey: 'ev3Red',    unlockKey: 'evspeed_color_ev3Red',   swatch: 0xdd2222, scale: 0.197, offX: 1, offY: 13 },
    ],
    modelY: [
        { variantKey: 'evYWhite', previewKey: 'selectEvYWhite', unlockKey: 'evspeed_color_evYWhite', swatch: 0xffffff },
        { variantKey: 'modelY',   previewKey: 'selectModelY',   unlockKey: 'evspeed_color_evYGrey',  swatch: 0x888888 },
        { variantKey: 'evYRed',   previewKey: 'selectEvYRed',   unlockKey: 'evspeed_color_evYRed',   swatch: 0xdd2222 },
    ],
    evS: [
        { variantKey: 'evS',       unlockKey: 'evspeed_color_evSBlue',   swatch: 0x2255ee },
        { variantKey: 'evsOrange', unlockKey: 'evspeed_color_evsOrange', swatch: 0xff7700 },
        { variantKey: 'evsGreen',  unlockKey: 'evspeed_color_evsGreen',  swatch: 0x22aa44 },
    ],
    evX: [
        { variantKey: 'evX',     unlockKey: 'evspeed_color_evXBlack', swatch: 0x222222 },
        { variantKey: 'evxBlue', unlockKey: 'evspeed_color_evXBlue',  swatch: 0x33aadd },
        { variantKey: 'evxRed',  unlockKey: 'evspeed_color_evXRed',   swatch: 0xdd2222 },
    ],
    cbt: [
        { variantKey: 'cbtWhite',  unlockKey: 'evspeed_color_cbtWhite',  swatch: 0xffffff },
        { variantKey: 'cbt',       unlockKey: 'evspeed_color_cbtGrey',   swatch: 0x888888 },
        { variantKey: 'cbtPurple', unlockKey: 'evspeed_color_cbtPurple', swatch: 0x8833cc },
    ],
};

function buildCarsList() {
    const result = [];
    for (const carDef of ALL_CARS) {
        const carOwned = !carDef.unlockKey || localStorage.getItem(carDef.unlockKey) === 'true';
        if (!carOwned) continue;

        const colorDefs = CARS_WITH_COLORS[carDef.key];
        if (colorDefs) {
            const owned = colorDefs.filter(c => !c.unlockKey || localStorage.getItem(c.unlockKey) === 'true');
            const colors = owned.length > 0 ? owned : [colorDefs[0]]; // fallback to first if none owned
            const savedColor = localStorage.getItem(`evspeed_activeColor_${carDef.key}`);
            const activeColor = colors.find(c => c.variantKey === savedColor) || colors[0];
            result.push({
                ...carDef,
                colors,
                variantKey: activeColor.variantKey,
                swatch:     activeColor.swatch,
                scale:      activeColor.scale || carDef.scale,
            });
        } else {
            result.push({ ...carDef, colors: [], variantKey: carDef.key, swatch: null });
        }
    }
    return result;
}

export class MPCarSelect extends Scene {
    constructor() { super('MPCarSelect'); }

    preload() {
        this.load.image('playerCar', 'assets/CarFinal.png');
        this.load.image('selectEv3White', 'assets/CarFinal.png');
        this.load.image('ev3Blue',   'assets/ev3BLUE.png');
        this.load.image('ev3Red',    'assets/ev3RED.png');
        this.load.image('evS',       'assets/evS.png');
        this.load.image('evsOrange', 'assets/evsORANGE.png');
        this.load.image('evsGreen',  'assets/evsGREEN.png');
        this.load.image('evX',       'assets/evX.png');
        this.load.image('evxBlue',   'assets/evxBLUE.png');
        this.load.image('evxRed',    'assets/evxRED.png');
        this.load.image('modelY',    'assets/modelY.png');
        this.load.image('evYWhite',  'assets/evYWHITE.png');
        this.load.image('evYRed',    'assets/evYRED.png');
        // Dedicated keys prevent another scene's texture cache from leaving EV Y
        // previews mapped to Phaser's tiny missing-texture placeholder.
        this.load.image('selectModelY',   'assets/modelY.png');
        this.load.image('selectEvYWhite', 'assets/evYWHITE.png');
        this.load.image('selectEvYRed',   'assets/evYRED.png');
        this.load.image('cbt',       'assets/CBT.png');
        this.load.image('cbtWhite',  'assets/CBTWHITE.png');
        this.load.image('cbtPurple', 'assets/cbtPURPLE.png');
        this.load.image('scooter',   'assets/SCOOTER.png');
        preloadMenuVideo(this);
    }

    create() {
        const data = this.scene.settings.data || {};
        this.isSingle = data.mode === 'single';

        this.cars = buildCarsList();
        if (this.cars.length === 0) this.cars = [{ key: 'playerCar', name: 'EV 3', unlockKey: null, scale: 0.23, offY: -82, offX: 1, variantKey: 'playerCar', swatch: 0xd8d8d8 }];

        // The carousel contains one entry per model; colors are selected inside its card.
        const lastCar = localStorage.getItem('evspeed_selected_car') || 'playerCar';
        let lastIdx = this.cars.findIndex(c => c.key === lastCar);
        if (lastIdx < 0) lastIdx = 0;

        this.p1Idx = this.isSingle ? lastIdx : 0;
        this.p2Idx = this.cars.length > 1 ? 1 : 0;
        this.p1Colors = Object.fromEntries(this.cars.map(c => [c.key, c.variantKey]));
        this.p2Colors = Object.fromEntries(this.cars.map(c => [c.key, c.variantKey]));
        this.p1ColorZones = [];
        this.p2ColorZones = [];

        const i1 = Math.floor(Math.random() * DRIVER_NAMES.length);
        let i2;
        do { i2 = Math.floor(Math.random() * DRIVER_NAMES.length); } while (i2 === i1);
        this.p1DriverName = DRIVER_NAMES[i1];
        this.p2DriverName = DRIVER_NAMES[i2];

        // Animated background shared by the single-player and two-player modes.
        addMenuVideoBackground(this, W, H);

        const ov = this.add.graphics().setDepth(1);
        ov.fillStyle(0x000000, 0.68);
        ov.fillRect(0, 0, W, H);

        // Top chrome
        const topChrome = this.add.graphics().setDepth(9);
        topChrome.fillStyle(0x000000, 0.65);
        topChrome.fillRect(0, 0, W, 82);
        this.add.text(W / 2, 52, this.isSingle ? 'SELECT CAR' : 'SELECT CARS', {
            fontFamily: 'Arial Black', fontSize: 28, color: '#ffffff',
            stroke: '#0033aa', strokeThickness: 7
        }).setOrigin(0.5).setDepth(10);

        const nameY  = CAR_Y + CARD_H / 2 - 75;
        const swatchY = CAR_Y + CARD_H / 2 - 43;
        const dotY   = CAR_Y + CARD_H / 2 - 24;
        const sepY   = CAR_Y + CARD_H / 2 - 92;
        const arrowY = CAR_Y;

        if (this.isSingle) {
            const cx = W / 2;

            this.p1Card = this.add.graphics().setDepth(2);
            this.drawCard(this.p1Card, cx, 0x00cfff);

            const c1 = this.getPlayerCar(1);
            this.p1Img = this.add.image(cx + c1.offX, CAR_Y + c1.offY, c1.textureKey)
                .setScale(c1.scale).setOrigin(0.5).setDepth(4);

            const sg = this.add.graphics().setDepth(3);
            sg.lineStyle(1, 0x1e2e44, 1);
            sg.lineBetween(cx - CARD_W / 2 + 12, sepY, cx + CARD_W / 2 - 12, sepY);

            this.p1Name = this.add.text(cx, nameY, c1.name, {
                fontFamily: 'Arial Black', fontSize: 13, color: '#ccd8ee',
                stroke: '#000000', strokeThickness: 2
            }).setOrigin(0.5).setDepth(4);

            this.p1ColorOptions = this.add.graphics().setDepth(4);
            this.drawColorOptions(1, cx, swatchY);

            this.p1Dots = this.add.graphics().setDepth(4);
            this.drawDots(this.p1Dots, cx, dotY, this.p1Idx);

            if (this.cars.length > 1) {
                const singleArrowOffset = 65;
                this.makeArrow(cx - singleArrowOffset, arrowY, '◄', () => this.changeCar(1, -1));
                this.makeArrow(cx + singleArrowOffset, arrowY, '►', () => this.changeCar(1, +1));
            }
        } else {
            const divGfx = this.add.graphics().setDepth(2);
            divGfx.lineStyle(3, 0xffffff, 0.5);
            divGfx.lineBetween(W / 2, 88, W / 2, H - 130);

            this.p1LblTxt = this.add.text(CX1, 105, this.p1DriverName, {
                fontFamily: 'Arial Black', fontSize: 15, color: '#00cfff',
                stroke: '#000000', strokeThickness: 4
            }).setOrigin(0.5).setDepth(3).setInteractive({ useHandCursor: true });
            this.p2LblTxt = this.add.text(CX2, 105, this.p2DriverName, {
                fontFamily: 'Arial Black', fontSize: 15, color: '#ff7744',
                stroke: '#000000', strokeThickness: 4
            }).setOrigin(0.5).setDepth(3).setInteractive({ useHandCursor: true });

            this.add.text(CX1, 120, '✎ tap to edit', { fontFamily: 'Arial', fontSize: 9, color: '#336688' }).setOrigin(0.5).setDepth(3);
            this.add.text(CX2, 120, '✎ tap to edit', { fontFamily: 'Arial', fontSize: 9, color: '#664433' }).setOrigin(0.5).setDepth(3);

            this.p1LblTxt.on('pointerdown', () => this.showNameInput(1));
            this.p2LblTxt.on('pointerdown', () => this.showNameInput(2));

            this.p1Card = this.add.graphics().setDepth(2);
            this.p2Card = this.add.graphics().setDepth(2);
            this.drawCard(this.p1Card, CX1, 0x00cfff);
            this.drawCard(this.p2Card, CX2, 0xff7744);

            const c1 = this.getPlayerCar(1), c2 = this.getPlayerCar(2);
            this.p1Img = this.add.image(CX1 + c1.offX, CAR_Y + c1.offY, c1.textureKey)
                .setScale(c1.scale).setOrigin(0.5).setDepth(4);
            this.p2Img = this.add.image(CX2 + c2.offX, CAR_Y + c2.offY, c2.textureKey)
                .setScale(c2.scale).setOrigin(0.5).setDepth(4);

            [CX1, CX2].forEach(cx => {
                const sg = this.add.graphics().setDepth(3);
                sg.lineStyle(1, 0x1e2e44, 1);
                sg.lineBetween(cx - CARD_W / 2 + 12, sepY, cx + CARD_W / 2 - 12, sepY);
            });

            this.p1Name = this.add.text(CX1, nameY, c1.name, {
                fontFamily: 'Arial Black', fontSize: 13, color: '#ccd8ee',
                stroke: '#000000', strokeThickness: 2
            }).setOrigin(0.5).setDepth(4);
            this.p2Name = this.add.text(CX2, nameY, c2.name, {
                fontFamily: 'Arial Black', fontSize: 13, color: '#ccd8ee',
                stroke: '#000000', strokeThickness: 2
            }).setOrigin(0.5).setDepth(4);

            this.p1ColorOptions = this.add.graphics().setDepth(4);
            this.p2ColorOptions = this.add.graphics().setDepth(4);
            this.drawColorOptions(1, CX1, swatchY);
            this.drawColorOptions(2, CX2, swatchY);

            this.p1Dots = this.add.graphics().setDepth(4);
            this.p2Dots = this.add.graphics().setDepth(4);
            this.drawDots(this.p1Dots, CX1, dotY, this.p1Idx);
            this.drawDots(this.p2Dots, CX2, dotY, this.p2Idx);

            if (this.cars.length > 1) {
                this.makeArrow(CX1 - 65, arrowY, '◄', () => this.changeCar(1, -1));
                this.makeArrow(CX1 + 65, arrowY, '►', () => this.changeCar(1, +1));
                this.makeArrow(CX2 - 65, arrowY, '◄', () => this.changeCar(2, -1));
                this.makeArrow(CX2 + 65, arrowY, '►', () => this.changeCar(2, +1));
            }
        }

        // Bottom chrome
        const botChrome = this.add.graphics().setDepth(8);
        botChrome.fillStyle(0x000000, 0.65);
        botChrome.fillRect(0, H - 122, W, 122);

        // START button
        this.makeBtn(W / 2, H - 76, 220, 54, 'START',
            [0x005533, 0x007744, 0x22aa66], () => {
                const p1 = this.getPlayerCar(1);
                localStorage.setItem('evspeed_selected_car', p1.key);
                localStorage.setItem(`evspeed_activeColor_${p1.key}`, p1.variantKey);
                if (this.isSingle) {
                    this.scene.start('Game', { mp: false, carKey: p1.key });
                } else {
                    const p2 = this.getPlayerCar(2);
                    localStorage.setItem(`evspeed_activeColor_${p2.key}`, p2.variantKey);
                    this.scene.start('Game', { mp: true, player: 1, p1Score: 0, p1Car: p1.key, p2Car: p2.key, p1Color: p1.variantKey, p2Color: p2.variantKey, p1Name: this.p1DriverName, p2Name: this.p2DriverName });
                }
            });

        // BACK
        const backTxt = this.add.text(W / 2, H - 22, '← BACK', {
            fontFamily: 'Arial Black', fontSize: 14, color: '#667788',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(10).setInteractive({ useHandCursor: true });
        backTxt.on('pointerover',  () => backTxt.setColor('#aabbcc'));
        backTxt.on('pointerout',   () => backTxt.setColor('#667788'));
        backTxt.on('pointerdown',  () => this.scene.start('Menu'));
    }

    drawCard(gfx, cx, borderCol) {
        const x = cx - CARD_W / 2, y = CAR_Y - CARD_H / 2;
        gfx.clear();
        gfx.fillStyle(0x06090f, 0.96);
        gfx.fillRoundedRect(x, y, CARD_W, CARD_H, 14);
        gfx.fillStyle(0xffffff, 0.03);
        gfx.fillRoundedRect(x + 2, y + 2, CARD_W - 4, 40, { tl: 12, tr: 12, bl: 0, br: 0 });
        gfx.lineStyle(1.5, borderCol, 0.7);
        gfx.strokeRoundedRect(x, y, CARD_W, CARD_H, 14);
    }

    getPlayerCar(player) {
        const idx = player === 1 ? this.p1Idx : this.p2Idx;
        const selections = player === 1 ? this.p1Colors : this.p2Colors;
        const car = this.cars[idx];
        const variantKey = selections[car.key] || car.variantKey;
        const variant = car.colors.find(c => c.variantKey === variantKey);
        return {
            ...car,
            variantKey,
            textureKey: variant?.previewKey || variantKey,
            swatch: variant?.swatch ?? car.swatch,
            scale: variant?.scale || car.scale,
            offX: car.offX + (variant?.offX || 0),
            offY: car.offY + (variant?.offY || 0),
        };
    }

    drawColorOptions(player, cx, y) {
        const gfx = player === 1 ? this.p1ColorOptions : this.p2ColorOptions;
        const oldZones = player === 1 ? this.p1ColorZones : this.p2ColorZones;
        gfx.clear();
        oldZones.forEach(zone => zone.destroy());
        oldZones.length = 0;

        const car = this.getPlayerCar(player);
        if (car.colors.length === 0) return;

        const size = 24;
        const gap = 10;
        const totalW = car.colors.length * size + (car.colors.length - 1) * gap;
        const startX = cx - totalW / 2 + size / 2;
        car.colors.forEach((variant, i) => {
            const x = startX + i * (size + gap);
            const active = variant.variantKey === car.variantKey;
            gfx.fillStyle(variant.swatch, 1);
            gfx.fillRoundedRect(x - size / 2, y - size / 2, size, size, 5);
            gfx.lineStyle(active ? 3 : 1.5, active ? (player === 1 ? 0x00cfff : 0xff7744) : 0x445566, 1);
            gfx.strokeRoundedRect(x - size / 2, y - size / 2, size, size, 5);

            const zone = this.add.zone(x, y, size + 6, size + 6)
                .setInteractive({ useHandCursor: true }).setDepth(6);
            zone.on('pointerdown', () => this.selectColor(player, variant.variantKey));
            oldZones.push(zone);
        });
    }

    selectColor(player, variantKey) {
        const car = this.cars[player === 1 ? this.p1Idx : this.p2Idx];
        const selections = player === 1 ? this.p1Colors : this.p2Colors;
        if (!car.colors.some(c => c.variantKey === variantKey)) return;
        selections[car.key] = variantKey;

        const selected = this.getPlayerCar(player);
        const cx = this.isSingle ? W / 2 : (player === 1 ? CX1 : CX2);
        const img = player === 1 ? this.p1Img : this.p2Img;
        img.setTexture(selected.textureKey).setScale(selected.scale)
            .setPosition(cx + selected.offX, CAR_Y + selected.offY);
        this.drawColorOptions(player, cx, CAR_Y + CARD_H / 2 - 43);
    }

    drawDots(gfx, cx, y, activeIdx) {
        gfx.clear();
        const n = this.cars.length;
        if (n <= 1) return;
        const spacing = 11;
        const startX = cx - ((n - 1) * spacing) / 2;
        for (let i = 0; i < n; i++) {
            gfx.fillStyle(i === activeIdx ? 0xaaccee : 0x2a3a55, 1);
            gfx.fillCircle(startX + i * spacing, y, i === activeIdx ? 4 : 3);
        }
    }

    makeArrow(x, y, label, onClick) {
        const gfx = this.add.graphics().setDepth(4);
        const draw = (hover) => {
            gfx.clear();
            gfx.fillStyle(hover ? 0x1e2e48 : 0x0e1622, 1);
            gfx.fillRoundedRect(x - 23, y - 18, 46, 36, 8);
            gfx.fillStyle(hover ? 0x3355aa : 0x1a2a55, 1);
            gfx.fillRoundedRect(x - 23, y - 18, 46, 34, 8);
        };
        draw(false);
        this.add.text(x, y - 1, label, {
            fontFamily: 'Arial Black', fontSize: 18, color: '#7799bb',
            stroke: '#000000', strokeThickness: 1
        }).setOrigin(0.5).setDepth(5);
        const zone = this.add.zone(x, y, 46, 36).setInteractive().setDepth(6);
        zone.on('pointerover', () => draw(true));
        zone.on('pointerout',  () => draw(false));
        zone.on('pointerdown', onClick);
    }

    makeBtn(x, y, bw, bh, label, colors, onClick) {
        const gfx = this.add.graphics().setDepth(9);
        const bx = x - bw / 2, by = y - bh / 2;
        const draw = (hover) => {
            gfx.clear();
            gfx.fillStyle(colors[0], 1);
            gfx.fillRoundedRect(bx + 3, by + 4, bw, bh, 12);
            gfx.fillStyle(hover ? darkenHex(colors[1]) : colors[1], 1);
            gfx.fillRoundedRect(bx, by, bw, bh, 12);
            gfx.fillStyle(hover ? darkenHex(colors[2]) : colors[2], 1);
            gfx.fillRoundedRect(bx + 2, by + 2, bw - 4, bh / 2, { tl: 10, tr: 10, bl: 0, br: 0 });
        };
        draw(false);
        this.add.text(x, y, label, {
            fontFamily: 'Arial Black', fontSize: 22,
            color: '#ffffff', stroke: '#000000', strokeThickness: 4, fontStyle: 'italic'
        }).setOrigin(0.5).setDepth(10);
        const zone = this.add.zone(x, y, bw, bh).setInteractive().setDepth(11);
        zone.on('pointerover', () => draw(true));
        zone.on('pointerout',  () => draw(false));
        zone.on('pointerdown', onClick);
    }

    changeCar(player, dir) {
        const dotY    = CAR_Y + CARD_H / 2 - 24;
        const nameY   = CAR_Y + CARD_H / 2 - 75;
        const swatchY = CAR_Y + CARD_H / 2 - 43;

        if (player === 1) {
            this.p1Idx = (this.p1Idx + dir + this.cars.length) % this.cars.length;
            const c  = this.getPlayerCar(1);
            const cx = this.isSingle ? W / 2 : CX1;
            this.p1Img.setTexture(c.textureKey).setScale(c.scale)
                .setPosition(cx + c.offX, CAR_Y + c.offY);
            this.p1Name.setText(c.name);
            this.drawColorOptions(1, cx, swatchY);
            this.drawDots(this.p1Dots, cx, dotY, this.p1Idx);
        } else {
            this.p2Idx = (this.p2Idx + dir + this.cars.length) % this.cars.length;
            const c = this.getPlayerCar(2);
            this.p2Img.setTexture(c.textureKey).setScale(c.scale)
                .setPosition(CX2 + c.offX, CAR_Y + c.offY);
            this.p2Name.setText(c.name);
            this.drawColorOptions(2, CX2, swatchY);
            this.drawDots(this.p2Dots, CX2, dotY, this.p2Idx);
        }
    }

    showNameInput(player) {
        const canvas = this.sys.game.canvas;
        const rect   = canvas.getBoundingClientRect();
        const scaleX = rect.width  / W;
        const scaleY = rect.height / H;
        const gameX  = player === 1 ? CX1 : CX2;
        const color  = player === 1 ? '#00cfff' : '#ff7744';
        const border = player === 1 ? '#00cfff' : '#ff7744';

        const inp = document.createElement('input');
        inp.type      = 'text';
        inp.maxLength = 18;
        inp.value     = player === 1 ? this.p1DriverName : this.p2DriverName;
        inp.style.cssText = `
            position: fixed;
            left:   ${rect.left + (gameX - 75) * scaleX}px;
            top:    ${rect.top  + 89 * scaleY}px;
            width:  ${150 * scaleX}px;
            height: ${28 * scaleY}px;
            background: rgba(0,8,22,0.97);
            border: 2px solid ${border};
            border-radius: 6px;
            color: ${color};
            font-family: Arial Black, sans-serif;
            font-size: ${Math.max(16, 13 * scaleY)}px;
            text-align: center;
            outline: none;
            z-index: 9999;
            padding: 0 6px;
            box-sizing: border-box;
        `;
        document.body.appendChild(inp);
        inp.focus();
        inp.select();

        const done = () => {
            const val = inp.value.trim();
            const newName = val.length > 0 ? val : (player === 1 ? this.p1DriverName : this.p2DriverName);
            if (player === 1) { this.p1DriverName = newName; this.p1LblTxt.setText(newName); }
            else               { this.p2DriverName = newName; this.p2LblTxt.setText(newName); }
            if (inp.parentNode) inp.parentNode.removeChild(inp);
        };

        inp.addEventListener('blur',    done);
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); });

        this.events.once('shutdown', () => { if (inp.parentNode) inp.parentNode.removeChild(inp); });
    }
}

function darkenHex(col) {
    const r = ((col >> 16) & 0xff) * 0.75 | 0;
    const g = ((col >> 8)  & 0xff) * 0.75 | 0;
    const b = (col         & 0xff) * 0.75 | 0;
    return (r << 16) | (g << 8) | b;
}
