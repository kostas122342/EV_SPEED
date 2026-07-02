import { Scene } from 'phaser';

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
    { key: 'playerCar', name: 'EV 3',          unlockKey: null,           scale: 0.23, offY: -80, offX: 0 },
    { key: 'modelY',    name: 'EV Y',          unlockKey: 'evspeed_carY', scale: 0.10, offY: -12, offX: 0, whiteKey: 'modelY_white' },
    { key: 'evS',       name: 'EV S',          unlockKey: 'evspeed_evS',  scale: 0.14, offY: -18, offX: 0, whiteKey: 'evS_white' },
    { key: 'evX',       name: 'EV X',          unlockKey: 'evspeed_evX',  scale: 0.10, offY: -18, offX: 0, whiteKey: 'evX_white' },
    { key: 'cbt',       name: 'CBT',           unlockKey: 'evspeed_cbt',     scale: 0.12, offY: -18, offX: 0, whiteKey: 'cbt_white' },
    { key: 'scooter',   name: 'SCOOTER',       unlockKey: 'evspeed_scooter', scale: 0.10, offY: -15, offX: 0 },
];

export class MPCarSelect extends Scene {
    constructor() { super('MPCarSelect'); }

    preload() {
        this.load.image('playerCar', 'assets/CarFinal.png');
        this.load.image('evS',       'assets/evS.png');
        this.load.image('evS_white', 'assets/EVSWHITE.png');
        this.load.image('evX',       'assets/evX.png');
        this.load.image('evX_white', 'assets/EVXWHITE.png');
        this.load.image('modelY',       'assets/modelY.png');
        this.load.image('modelY_white', 'assets/EVYWHITE.png');
        this.load.image('cbt',       'assets/CBT.png');
        this.load.image('cbt_white', 'assets/CBTWHITE.png');
        this.load.image('scooter',   'assets/SCOOTER.png');
        this.load.image('menuBg',    'assets/EVSPEED2.png');
    }

    create() {
        const data = this.scene.settings.data || {};
        this.isSingle = data.mode === 'single';

        this.cars  = ALL_CARS.filter(c => !c.unlockKey || localStorage.getItem(c.unlockKey) === 'true');
        const lastCar = localStorage.getItem('evspeed_selected_car') || 'playerCar';
        const lastIdx = this.cars.findIndex(c => c.key === lastCar);
        this.p1Idx = this.isSingle ? (lastIdx >= 0 ? lastIdx : 0) : 0;
        this.p2Idx = this.cars.length > 1 ? 1 : 0;

        const i1 = Math.floor(Math.random() * DRIVER_NAMES.length);
        let i2;
        do { i2 = Math.floor(Math.random() * DRIVER_NAMES.length); } while (i2 === i1);
        this.p1DriverName = DRIVER_NAMES[i1];
        this.p2DriverName = DRIVER_NAMES[i2];

        // Background
        this.add.image(W / 2, H / 2, 'menuBg').setDisplaySize(W, H).setDepth(0);
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

        if (this.isSingle) {
            // ── SINGLE PLAYER: one centred card ──────────────────────
            const cx = W / 2;

            this.p1Card = this.add.graphics().setDepth(2);
            this.drawCard(this.p1Card, cx, 0x00cfff);

            const c1 = this.cars[this.p1Idx];
            this.p1Img = this.add.image(cx + c1.offX, CAR_Y + c1.offY, c1.key)
                .setScale(c1.scale).setOrigin(0.5).setDepth(4);
            this.applyTint(this.p1Img, c1.key);

            const sepY = CAR_Y + CARD_H / 2 - 68;
            const sg = this.add.graphics().setDepth(3);
            sg.lineStyle(1, 0x1e2e44, 1);
            sg.lineBetween(cx - CARD_W / 2 + 12, sepY, cx + CARD_W / 2 - 12, sepY);

            const nameY = CAR_Y + CARD_H / 2 - 52;
            this.p1Name = this.add.text(cx, nameY, c1.name, {
                fontFamily: 'Arial Black', fontSize: 13, color: '#ccd8ee',
                stroke: '#000000', strokeThickness: 2
            }).setOrigin(0.5).setDepth(4);

            const dotY = CAR_Y + CARD_H / 2 - 28;
            this.p1Dots = this.add.graphics().setDepth(4);
            this.drawDots(this.p1Dots, cx, dotY, this.p1Idx);

            if (this.cars.length > 1) {
                this.makeArrow(cx - 58, dotY, '◄', () => this.changeCar(1, -1));
                this.makeArrow(cx + 58, dotY, '►', () => this.changeCar(1, +1));
            }
        } else {
            // ── MULTIPLAYER: two columns ──────────────────────────────
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

            this.add.text(CX1, 120, '✎ tap to edit', {
                fontFamily: 'Arial', fontSize: 9, color: '#336688'
            }).setOrigin(0.5).setDepth(3);
            this.add.text(CX2, 120, '✎ tap to edit', {
                fontFamily: 'Arial', fontSize: 9, color: '#664433'
            }).setOrigin(0.5).setDepth(3);

            this.p1LblTxt.on('pointerdown', () => this.showNameInput(1));
            this.p2LblTxt.on('pointerdown', () => this.showNameInput(2));

            this.p1Card = this.add.graphics().setDepth(2);
            this.p2Card = this.add.graphics().setDepth(2);
            this.drawCard(this.p1Card, CX1, 0x00cfff);
            this.drawCard(this.p2Card, CX2, 0xff7744);

            const c1 = this.cars[this.p1Idx], c2 = this.cars[this.p2Idx];
            this.p1Img = this.add.image(CX1 + c1.offX, CAR_Y + c1.offY, c1.key)
                .setScale(c1.scale).setOrigin(0.5).setDepth(4);
            this.applyTint(this.p1Img, c1.key);
            this.p2Img = this.add.image(CX2 + c2.offX, CAR_Y + c2.offY, c2.key)
                .setScale(c2.scale).setOrigin(0.5).setDepth(4);
            this.applyTint(this.p2Img, c2.key);

            const sepY = CAR_Y + CARD_H / 2 - 68;
            [CX1, CX2].forEach(cx => {
                const sg = this.add.graphics().setDepth(3);
                sg.lineStyle(1, 0x1e2e44, 1);
                sg.lineBetween(cx - CARD_W / 2 + 12, sepY, cx + CARD_W / 2 - 12, sepY);
            });

            const nameY = CAR_Y + CARD_H / 2 - 52;
            this.p1Name = this.add.text(CX1, nameY, c1.name, {
                fontFamily: 'Arial Black', fontSize: 13, color: '#ccd8ee',
                stroke: '#000000', strokeThickness: 2
            }).setOrigin(0.5).setDepth(4);
            this.p2Name = this.add.text(CX2, nameY, c2.name, {
                fontFamily: 'Arial Black', fontSize: 13, color: '#ccd8ee',
                stroke: '#000000', strokeThickness: 2
            }).setOrigin(0.5).setDepth(4);

            const dotY = CAR_Y + CARD_H / 2 - 28;
            this.p1Dots = this.add.graphics().setDepth(4);
            this.p2Dots = this.add.graphics().setDepth(4);
            this.drawDots(this.p1Dots, CX1, dotY, this.p1Idx);
            this.drawDots(this.p2Dots, CX2, dotY, this.p2Idx);

            if (this.cars.length > 1) {
                this.makeArrow(CX1 - 58, dotY, '◄', () => this.changeCar(1, -1));
                this.makeArrow(CX1 + 58, dotY, '►', () => this.changeCar(1, +1));
                this.makeArrow(CX2 - 58, dotY, '◄', () => this.changeCar(2, -1));
                this.makeArrow(CX2 + 58, dotY, '►', () => this.changeCar(2, +1));
            }
        }

        // Bottom chrome
        const botChrome = this.add.graphics().setDepth(8);
        botChrome.fillStyle(0x000000, 0.65);
        botChrome.fillRect(0, H - 122, W, 122);

        // START button
        this.makeBtn(W / 2, H - 76, 220, 54, 'START',
            [0x005533, 0x007744, 0x22aa66], () => {
                const p1Car = this.cars[this.p1Idx].key;
                if (this.isSingle) {
                    localStorage.setItem('evspeed_selected_car', p1Car);
                    this.scene.start('Game', { mp: false, carKey: p1Car });
                } else {
                    const p2Car = this.cars[this.p2Idx].key;
                    this.scene.start('Game', { mp: true, player: 1, p1Score: 0, p1Car, p2Car, p1Name: this.p1DriverName, p2Name: this.p2DriverName });
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
        // Base
        gfx.fillStyle(0x06090f, 0.96);
        gfx.fillRoundedRect(x, y, CARD_W, CARD_H, 14);
        // Subtle inner top highlight
        gfx.fillStyle(0xffffff, 0.03);
        gfx.fillRoundedRect(x + 2, y + 2, CARD_W - 4, 40, { tl: 12, tr: 12, bl: 0, br: 0 });
        // Border
        gfx.lineStyle(1.5, borderCol, 0.7);
        gfx.strokeRoundedRect(x, y, CARD_W, CARD_H, 14);
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
            gfx.fillRoundedRect(x - 18, y - 14, 36, 28, 6);
            gfx.fillStyle(hover ? 0x3355aa : 0x1a2a55, 1);
            gfx.fillRoundedRect(x - 18, y - 14, 36, 26, 6);
        };
        draw(false);
        this.add.text(x, y - 1, label, {
            fontFamily: 'Arial Black', fontSize: 13, color: '#7799bb',
            stroke: '#000000', strokeThickness: 1
        }).setOrigin(0.5).setDepth(5);
        const zone = this.add.zone(x, y, 36, 28).setInteractive().setDepth(6);
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
        const dotY = CAR_Y + CARD_H / 2 - 28;
        if (player === 1) {
            this.p1Idx = (this.p1Idx + dir + this.cars.length) % this.cars.length;
            const c = this.cars[this.p1Idx];
            const cx = this.isSingle ? W / 2 : CX1;
            this.p1Img.setTexture(c.key).setScale(c.scale).setPosition(cx + c.offX, CAR_Y + c.offY);
            this.applyTint(this.p1Img, c.key);
            this.p1Name.setText(c.name);
            this.drawDots(this.p1Dots, cx, dotY, this.p1Idx);
        } else {
            this.p2Idx = (this.p2Idx + dir + this.cars.length) % this.cars.length;
            const c = this.cars[this.p2Idx];
            this.p2Img.setTexture(c.key).setScale(c.scale).setPosition(CX2 + c.offX, CAR_Y + c.offY);
            this.applyTint(this.p2Img, c.key);
            this.p2Name.setText(c.name);
            this.drawDots(this.p2Dots, CX2, dotY, this.p2Idx);
        }
    }

    applyTint(img, carKey) {
        const t = localStorage.getItem(`evspeed_tint_${carKey}`);
        const hasValidTint = t && t !== '#ffffff';
        const car = ALL_CARS.find(c => c.key === carKey);
        if (hasValidTint) {
            if (car && car.whiteKey) img.setTexture(car.whiteKey);
            img.setTint(parseInt(t.replace('#', ''), 16));
        } else {
            img.setTexture(carKey);
            img.clearTint();
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
