import { Scene } from 'phaser';

const W = 480, H = 720;

const CARS = [
    { key: 'playerCar', asset: 'assets/CarFinal.png', name: 'EV 3',         unlockKey: null,            scale: 0.23, offY: -80, offX: 0  },
    { key: 'modelY',    asset: 'assets/modelY.png',   name: 'EV Y',         unlockKey: 'evspeed_carY',  scale: 0.10, offY: -12, offX: 0, whiteKey: 'modelY_white'  },
    { key: 'evS',       asset: 'assets/evS.png',      name: 'EV S',         unlockKey: 'evspeed_evS',   scale: 0.14, offY: -40, offX: 0, whiteKey: 'evS_white'  },
    { key: 'evX',       asset: 'assets/evX.png',      name: 'EV X',         unlockKey: 'evspeed_evX',   scale: 0.10, offY: -40, offX: 0, whiteKey: 'evX_white'  },
    { key: 'cbt',       asset: 'assets/CBT.png',      name: 'CBT',          unlockKey: 'evspeed_cbt',      scale: 0.12, offY: -40, offX: 0, whiteKey: 'cbt_white'  },
    { key: 'scooter',   asset: 'assets/SCOOTER.png',  name: 'SCOOTER',      unlockKey: 'evspeed_scooter',  scale: 0.15, offY: -40, offX: 0  },
];

const POSITIONS = [
    { cx: 68,  cy: 310 },
    { cx: 240, cy: 310 },
    { cx: 412, cy: 310 },
    { cx: 68,  cy: 630 },
    { cx: 240, cy: 630 },
    { cx: 412, cy: 630 },
    { cx: 68,  cy: 950 },
];

const CARD_W = 128, CARD_H = 290;
const CONTENT_BOTTOM = 1320;
const MAX_SCROLL = Math.max(0, CONTENT_BOTTOM - H);  // 340

export class Garage extends Scene {
    constructor() { super('Garage'); }

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
        const selected = localStorage.getItem('evspeed_selected_car') || 'playerCar';

        this.add.image(W / 2, H / 2, 'menuBg').setDisplaySize(W, H).setDepth(0);
        const ov = this.add.graphics().setDepth(1);
        ov.fillStyle(0x000000, 0.62);
        ov.fillRect(0, 0, W, H);

        this.scrollY = 0;

        // Clickable areas (no Phaser zones — checked manually via DOM)
        // { type: 'select'|'back', key?, cx, cy, hw, hh }
        const hitAreas = [];

        this.cont = this.add.container(0, 0).setDepth(2);

        CARS.forEach((car, i) => {
            const { cx, cy } = POSITIONS[i];
            const unlocked   = !car.unlockKey || localStorage.getItem(car.unlockKey) === 'true';
            const isSelected = selected === car.key;

            const card = this.add.graphics();
            card.fillStyle(isSelected ? 0x003377 : 0x080818, 0.94);
            card.fillRoundedRect(cx - CARD_W / 2, cy - CARD_H / 2, CARD_W, CARD_H, 12);
            card.lineStyle(3, isSelected ? 0x00cfff : 0x223355, 1);
            card.strokeRoundedRect(cx - CARD_W / 2, cy - CARD_H / 2, CARD_W, CARD_H, 12);
            this.cont.add(card);

            const storedTint = unlocked ? localStorage.getItem(`evspeed_tint_${car.key}`) : null;
            const hasValidTint = storedTint && storedTint !== '#ffffff';
            const textureKey = (hasValidTint && car.whiteKey) ? car.whiteKey : car.key;
            const carImg = this.add.image(cx + car.offX, cy + car.offY, textureKey)
                .setScale(car.scale).setOrigin(0.5);
            if (!unlocked) carImg.setTint(0x111111);
            else if (hasValidTint) carImg.setTint(parseInt(storedTint.replace('#', ''), 16));
            this.cont.add(carImg);

            if (!unlocked) {
                const lockOv = this.add.graphics();
                lockOv.fillStyle(0x000000, 0.50);
                lockOv.fillRoundedRect(cx - CARD_W / 2 + 4, cy - CARD_H / 2 + 4, CARD_W - 8, CARD_H - 8, 11);
                this.cont.add(lockOv);
                this.cont.add(this.add.text(cx, cy + CARD_H / 2 - 38, 'LOCKED', {
                    fontFamily: 'Arial Black', fontSize: 18, color: '#445566',
                    stroke: '#000000', strokeThickness: 3
                }).setOrigin(0.5));
            }

            this.cont.add(this.add.text(cx, cy + CARD_H / 2 - 82, car.name, {
                fontFamily: 'Arial Black', fontSize: 15,
                color: unlocked ? '#ffffff' : '#334455',
                stroke: '#000000', strokeThickness: 3
            }).setOrigin(0.5));

            if (unlocked) {
                if (isSelected) {
                    const badge = this.add.graphics();
                    badge.fillStyle(0x00cfff, 1);
                    badge.fillRoundedRect(cx - 54, cy + CARD_H / 2 - 54, 108, 32, 7);
                    this.cont.add(badge);
                    this.cont.add(this.add.text(cx, cy + CARD_H / 2 - 38, 'SELECTED', {
                        fontFamily: 'Arial Black', fontSize: 13, color: '#002244'
                    }).setOrigin(0.5));
                } else {
                    this.btnGfx = this.btnGfx || {};
                    const btn = this.add.graphics();
                    btn.fillStyle(0x005599, 1);
                    btn.fillRoundedRect(cx - 54, cy + CARD_H / 2 - 54, 108, 32, 7);
                    this.cont.add(btn);
                    this.cont.add(this.add.text(cx, cy + CARD_H / 2 - 38, 'SELECT', {
                        fontFamily: 'Arial Black', fontSize: 13, color: '#ffffff',
                        stroke: '#000000', strokeThickness: 2
                    }).setOrigin(0.5));

                    // Register hit area for DOM click detection (scrolled coords)
                    hitAreas.push({ type: 'select', key: car.key,
                        cx, cy: cy + CARD_H / 2 - 38, hw: 54, hh: 16 });
                }
            }
        });

        // Scroll hint
        const hint = this.add.text(W / 2, H - 138, '▼  SCROLL', {
            fontFamily: 'Arial Black', fontSize: 13, color: '#aaaaaa',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(8).setAlpha(0.8);
        this.tweens.add({ targets: hint, alpha: 0, duration: 500, delay: 2500,
            onComplete: () => hint.destroy() });

        // Top chrome
        const topChrome = this.add.graphics().setDepth(9);
        topChrome.fillStyle(0x000000, 0.62);
        topChrome.fillRect(0, 0, W, 82);
        this.add.text(W / 2, 55, 'GARAGE', {
            fontFamily: 'Arial Black', fontSize: 36, color: '#ffffff',
            stroke: '#0033aa', strokeThickness: 7
        }).setOrigin(0.5).setDepth(10);

        // Bottom chrome + back button (visual only)
        const botChrome = this.add.graphics().setDepth(8);
        botChrome.fillStyle(0x000000, 0.62);
        botChrome.fillRect(0, H - 122, W, 122);

        const bw = 200, bh = 56, bx = W / 2, by = H - 78;
        const backGfx = this.add.graphics().setDepth(9);
        const drawBack = (hover) => {
            backGfx.clear();
            backGfx.fillStyle(hover ? 0x550000 : 0x880000, 1);
            backGfx.fillRoundedRect(bx - bw / 2 + 3, by - bh / 2 + 5, bw, bh, 12);
            backGfx.fillStyle(hover ? 0x770000 : 0xaa0000, 1);
            backGfx.fillRoundedRect(bx - bw / 2, by - bh / 2, bw, bh, 12);
            backGfx.fillStyle(hover ? 0x993333 : 0xcc2222, 1);
            backGfx.fillRoundedRect(bx - bw / 2 + 2, by - bh / 2 + 2, bw - 4, bh / 2, { tl: 10, tr: 10, bl: 0, br: 0 });
        };
        drawBack(false);
        this.add.text(bx, by, 'BACK', {
            fontFamily: 'Arial Black', fontSize: 24, color: '#ffffff',
            stroke: '#000000', strokeThickness: 4, fontStyle: 'italic'
        }).setOrigin(0.5).setDepth(10);

        hitAreas.push({ type: 'back', cx: bx, cy: by, hw: bw / 2, hh: bh / 2 });

        // ── DOM INPUT ──────────────────────────────────────────────
        const canvas = this.sys.game.canvas;

        const toGame = (clientX, clientY) => {
            const r = canvas.getBoundingClientRect();
            return { x: (clientX - r.left) * (W / r.width),
                     y: (clientY - r.top)  * (H / r.height) };
        };

        const applyScroll = (newY) => {
            this.scrollY  = Math.max(-MAX_SCROLL, Math.min(0, newY));
            this.cont.y   = this.scrollY;
        };

        // Hit-test against registered areas
        const checkClick = (clientX, clientY) => {
            const { x, y } = toGame(clientX, clientY);
            for (const a of hitAreas) {
                // SELECT buttons move with scroll; BACK button is fixed
                const ay = a.type === 'select' ? a.cy + this.scrollY : a.cy;
                if (Math.abs(x - a.cx) <= a.hw && Math.abs(y - ay) <= a.hh) {
                    if (a.type === 'back') {
                        drawBack(false);
                        this.scene.start('Menu');
                    } else {
                        localStorage.setItem('evspeed_selected_car', a.key);
                        this.scene.restart();
                    }
                    return true;
                }
            }
            return false;
        };

        let dragStartClientY = 0, dragStartScrollY = 0, dragMoved = false;

        // Wheel
        const onWheel = (e) => {
            e.preventDefault();
            applyScroll(this.scrollY - e.deltaY * 0.5);
        };

        // Mouse — attach move/up to window only while button is held
        const onMouseMove = (e) => {
            const dy = (e.clientY - dragStartClientY) * (H / canvas.getBoundingClientRect().height);
            if (Math.abs(dy) > 12) {
                dragMoved = true;
                applyScroll(dragStartScrollY + dy);
            }
        };
        const onMouseUp = (e) => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup',   onMouseUp);
            drawBack(false);
            if (!dragMoved) checkClick(e.clientX, e.clientY);
            dragMoved = false;
        };
        const onMouseDown = (e) => {
            dragStartClientY = e.clientY;
            dragStartScrollY = this.scrollY;
            dragMoved = false;
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup',   onMouseUp);
            const { x, y } = toGame(e.clientX, e.clientY);
            if (Math.abs(x - bx) <= bw / 2 && Math.abs(y - by) <= bh / 2) drawBack(true);
        };

        // Touch
        const onTouchStart = (e) => {
            dragStartClientY = e.touches[0].clientY;
            dragStartScrollY = this.scrollY;
            dragMoved = false;
        };
        const onTouchMove = (e) => {
            e.preventDefault(); // always block browser page-scroll on the canvas
            if (!e.touches.length) return;
            const dy = (e.touches[0].clientY - dragStartClientY) * (H / canvas.getBoundingClientRect().height);
            if (Math.abs(dy) > 10) {
                dragMoved = true;
                applyScroll(dragStartScrollY + dy);
            }
        };
        const onTouchEnd = (e) => {
            if (!dragMoved && e.changedTouches.length > 0) {
                const t = e.changedTouches[0];
                checkClick(t.clientX, t.clientY);
            }
            dragMoved = false;
        };

        canvas.addEventListener('wheel',      onWheel,      { passive: false });
        canvas.addEventListener('mousedown',  onMouseDown);
        canvas.addEventListener('touchstart', onTouchStart, { passive: true });
        canvas.addEventListener('touchmove',  onTouchMove,  { passive: false });
        canvas.addEventListener('touchend',   onTouchEnd);

        this.events.once('shutdown', () => {
            canvas.removeEventListener('wheel',      onWheel);
            canvas.removeEventListener('mousedown',  onMouseDown);
            canvas.removeEventListener('touchstart', onTouchStart);
            canvas.removeEventListener('touchmove',  onTouchMove);
            canvas.removeEventListener('touchend',   onTouchEnd);
            window.removeEventListener('mousemove',  onMouseMove);
            window.removeEventListener('mouseup',    onMouseUp);
        });
    }
}
