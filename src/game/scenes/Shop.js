import { Scene } from 'phaser';

const W = 480, H = 720;

const SHOP_CARS = [
    { key: 'car2',   asset: 'assets/car2.png',   name: 'EV 3 - RED', unlockKey: 'evspeed_car2', price: 200,  scale: 0.20, offY: -82, offX: 4  },
    { key: 'modelY', asset: 'assets/modelY.png',  name: 'EV Y',       unlockKey: 'evspeed_carY', price: 600,  scale: 0.10, offY: -28, offX: 0  },
    { key: 'evS',    asset: 'assets/evS.png',     name: 'EV S',       unlockKey: 'evspeed_evS',  price: 2000, scale: 0.14, offY: -40, offX: 0  },
    { key: 'evX',    asset: 'assets/evX.png',     name: 'EV X',       unlockKey: 'evspeed_evX',  price: 3000, scale: 0.10, offY: -40, offX: 0  },
];

const POSITIONS = [
    { cx: 120, cy: 300 },
    { cx: 360, cy: 300 },
    { cx: 120, cy: 610 },
    { cx: 360, cy: 610 },
];

const CARD_W = 190, CARD_H = 280;
const CONTENT_BOTTOM = 610 + CARD_H / 2 + 20;
const MAX_SCROLL = Math.max(0, CONTENT_BOTTOM - (H - 122));

export class Shop extends Scene {
    constructor() { super('Shop'); }

    preload() {
        this.load.image('car2',       'assets/car2.png');
        this.load.image('evS',        'assets/evS.png');
        this.load.image('evX',        'assets/evX.png');
        this.load.image('modelY',     'assets/modelY.png');
        this.load.image('menuBg',     'assets/EVSPEED.png');
        this.load.image('energyLogo', 'assets/En4.png');
    }

    create() {
        const energy = parseInt(localStorage.getItem('evspeed_energy') || '0');

        this.add.image(W / 2, H / 2, 'menuBg').setDisplaySize(W, H).setDepth(0);
        const ov = this.add.graphics().setDepth(1);
        ov.fillStyle(0x000000, 0.62);
        ov.fillRect(0, 0, W, H);

        this.scrollY = 0;
        const hitAreas = [];
        const hoverBtns = [];
        this.cont = this.add.container(0, 0).setDepth(2);
        const scrollIcons = [];

        SHOP_CARS.forEach((car, i) => {
            const { cx, cy } = POSITIONS[i];
            const owned      = localStorage.getItem(car.unlockKey) === 'true';
            const canAfford  = energy >= car.price;

            const card = this.add.graphics();
            card.fillStyle(owned ? 0x003377 : 0x080818, 0.94);
            card.fillRoundedRect(cx - CARD_W / 2, cy - CARD_H / 2, CARD_W, CARD_H, 12);
            card.lineStyle(3, owned ? 0x00cfff : 0x223355, 1);
            card.strokeRoundedRect(cx - CARD_W / 2, cy - CARD_H / 2, CARD_W, CARD_H, 12);
            this.cont.add(card);

            const carImg = this.add.image(cx + car.offX, cy + car.offY, car.key)
                .setScale(car.scale).setOrigin(0.5);
            this.cont.add(carImg);

            this.cont.add(this.add.text(cx, cy + CARD_H / 2 - 102, car.name, {
                fontFamily: 'Arial Black', fontSize: 15,
                color: '#ffffff', stroke: '#000000', strokeThickness: 3
            }).setOrigin(0.5));

            if (owned) {
                const badge = this.add.graphics();
                badge.fillStyle(0x00cfff, 1);
                badge.fillRoundedRect(cx - 54, cy + CARD_H / 2 - 72, 108, 32, 7);
                this.cont.add(badge);
                this.cont.add(this.add.text(cx, cy + CARD_H / 2 - 56, 'OWNED', {
                    fontFamily: 'Arial Black', fontSize: 13, color: '#002244'
                }).setOrigin(0.5));
            } else {
                const priceStr = car.price.toString();
                const labelY = cy + CARD_H / 2 - 74;
                const btnY   = cy + CARD_H / 2 - 40;

                // BUY button
                const btn = this.add.graphics();
                const bx0 = cx - 54, by0 = cy + CARD_H / 2 - 56;
                const drawBtn = (hover) => {
                    btn.clear();
                    btn.fillStyle(hover ? 0x003d77 : 0x005599, 1);
                    btn.fillRoundedRect(bx0 + 3, by0 + 4, 108, 32, 7);
                    btn.fillStyle(hover ? 0x0055aa : 0x0077cc, 1);
                    btn.fillRoundedRect(bx0, by0, 108, 32, 7);
                };
                drawBtn(false);
                this.cont.add(btn);
                hoverBtns.push({ cx, cy: btnY, drawBtn, _over: false });

                // Price + icon inside button
                this.cont.add(this.add.text(cx + 2, btnY, priceStr, {
                    fontFamily: 'Arial Black', fontSize: 14,
                    color: '#ffffff',
                    stroke: '#000000', strokeThickness: 2
                }).setOrigin(1, 0.5));
                const priceIcon = this.add.image(cx + 22, btnY, 'energyLogo')
                    .setOrigin(0.5, 0.5).setScale(0.22).setDepth(5);
                scrollIcons.push({ img: priceIcon, baseY: btnY });

                hitAreas.push({ type: 'buy', key: car.unlockKey, price: car.price,
                    canAfford, cx, cy: btnY, hw: 54, hh: 16 });
            }
        });

        // Energy display
        const uiBg = this.add.graphics().setDepth(9);
        uiBg.fillStyle(0x000000, 0.40);
        uiBg.fillRoundedRect(W - 160, 8, 156, 58, 10);
        this.add.image(W - 120, 37, 'energyLogo').setOrigin(0.5).setScale(0.38).setDepth(9);
        this.add.text(W - 20, 37, energy.toString(), {
            fontFamily: 'Arial Black', fontSize: 34, color: '#00cfff',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(1, 0.5).setDepth(9);

        // Top chrome
        const topChrome = this.add.graphics().setDepth(9);
        topChrome.fillStyle(0x000000, 0.62);
        topChrome.fillRect(0, 0, W, 82);
        this.add.text(W / 2, 55, 'SHOP', {
            fontFamily: 'Arial Black', fontSize: 36, color: '#ffffff',
            stroke: '#0033aa', strokeThickness: 7
        }).setOrigin(0.5).setDepth(10);

        // Bottom chrome + back button
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

        // DOM input (same pattern as Garage)
        const canvas = this.sys.game.canvas;

        const toGame = (clientX, clientY) => {
            const r = canvas.getBoundingClientRect();
            return { x: (clientX - r.left) * (W / r.width),
                     y: (clientY - r.top)  * (H / r.height) };
        };

        const applyScroll = (newY) => {
            this.scrollY = Math.max(-MAX_SCROLL, Math.min(0, newY));
            this.cont.y  = this.scrollY;
            for (const { img, baseY } of scrollIcons) img.setY(baseY + this.scrollY);
        };

        this.input.on('pointermove', (ptr) => {
            for (const b of hoverBtns) {
                const ay = b.cy + this.scrollY;
                const over = Math.abs(ptr.x - b.cx) <= 54 && Math.abs(ptr.y - ay) <= 16;
                if (over !== b._over) { b._over = over; b.drawBtn(over); }
            }
        });

        const checkClick = (clientX, clientY) => {
            const { x, y } = toGame(clientX, clientY);
            for (const a of hitAreas) {
                const ay = a.type === 'buy' ? a.cy + this.scrollY : a.cy;
                if (Math.abs(x - a.cx) <= a.hw && Math.abs(y - ay) <= a.hh) {
                    if (a.type === 'back') {
                        drawBack(false);
                        this.scene.start('Menu');
                    } else {
                        if (a.canAfford) {
                            const prev = parseInt(localStorage.getItem('evspeed_energy') || '0');
                            localStorage.setItem('evspeed_energy', prev - a.price);
                            localStorage.setItem(a.key, 'true');
                            this.showPurchase();
                        } else {
                            this.showToast('NOT ENOUGH ENERGY');
                        }
                    }
                    return true;
                }
            }
            return false;
        };

        let dragStartClientY = 0, dragStartScrollY = 0, dragMoved = false;

        const onWheel = (e) => { e.preventDefault(); applyScroll(this.scrollY - e.deltaY * 0.5); };

        const onMouseMove = (e) => {
            const dy = (e.clientY - dragStartClientY) * (H / canvas.getBoundingClientRect().height);
            if (Math.abs(dy) > 12) { dragMoved = true; applyScroll(dragStartScrollY + dy); }
        };
        const onMouseUp = (e) => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup',   onMouseUp);
            drawBack(false);
            if (!dragMoved) checkClick(e.clientX, e.clientY);
            dragMoved = false;
        };
        const onMouseDown = (e) => {
            dragStartClientY = e.clientY; dragStartScrollY = this.scrollY; dragMoved = false;
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup',   onMouseUp);
            const { x, y } = toGame(e.clientX, e.clientY);
            if (Math.abs(x - bx) <= bw / 2 && Math.abs(y - by) <= bh / 2) drawBack(true);
        };
        const onTouchStart = (e) => {
            dragStartClientY = e.touches[0].clientY; dragStartScrollY = this.scrollY; dragMoved = false;
        };
        const onTouchMove = (e) => {
            e.preventDefault();
            if (!e.touches.length) return;
            const dy = (e.touches[0].clientY - dragStartClientY) * (H / canvas.getBoundingClientRect().height);
            if (Math.abs(dy) > 10) { dragMoved = true; applyScroll(dragStartScrollY + dy); }
        };
        const onTouchEnd = (e) => {
            if (!dragMoved && e.changedTouches.length > 0) checkClick(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
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

    showPurchase() {
        const flash = this.add.graphics().setDepth(19);
        flash.fillStyle(0x00ff88, 0.22);
        flash.fillRect(0, 0, W, H);
        this.tweens.add({ targets: flash, alpha: 0, duration: 400,
            onComplete: () => flash.destroy() });

        const panel = this.add.graphics().setDepth(20).setAlpha(0);
        panel.fillStyle(0x000000, 0.82);
        panel.fillRoundedRect(W / 2 - 170, H / 2 - 46, 340, 92, 14);
        panel.lineStyle(2, 0x00cc66, 1);
        panel.strokeRoundedRect(W / 2 - 170, H / 2 - 46, 340, 92, 14);

        const txt = this.add.text(W / 2, H / 2, 'UNLOCKED!', {
            fontFamily: 'Arial Black', fontSize: 24, color: '#00ff88',
            stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5).setDepth(21).setScale(1.45).setAlpha(0);

        this.tweens.add({ targets: [panel, txt], alpha: 1, duration: 180 });
        this.tweens.add({ targets: txt, scaleX: 1, scaleY: 1, duration: 280, ease: 'Back.easeOut' });

        this.time.delayedCall(1000, () => {
            this.tweens.add({
                targets: [panel, txt], alpha: 0, duration: 300,
                onComplete: () => this.scene.restart()
            });
        });
    }

    showToast(msg) {
        if (this._toast) return;
        this._toast = true;

        // Red screen flash
        const flash = this.add.graphics().setDepth(19);
        flash.fillStyle(0xff0000, 0.28);
        flash.fillRect(0, 0, W, H);
        this.tweens.add({ targets: flash, alpha: 0, duration: 350,
            onComplete: () => flash.destroy() });

        // Dark panel
        const panel = this.add.graphics().setDepth(20).setAlpha(0);
        panel.fillStyle(0x000000, 0.82);
        panel.fillRoundedRect(W / 2 - 170, H / 2 - 46, 340, 92, 14);
        panel.lineStyle(2, 0xff3333, 1);
        panel.strokeRoundedRect(W / 2 - 170, H / 2 - 46, 340, 92, 14);

        const txt = this.add.text(W / 2, H / 2, msg, {
            fontFamily: 'Arial Black', fontSize: 24, color: '#ff4444',
            stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5).setDepth(21).setScale(1.45).setAlpha(0);

        // Bounce in
        this.tweens.add({ targets: [panel, txt], alpha: 1, duration: 180 });
        this.tweens.add({ targets: txt, scaleX: 1, scaleY: 1, duration: 280, ease: 'Back.easeOut' });

        // Light shake
        this.time.delayedCall(180, () => {
            this.tweens.add({
                targets: txt, x: W / 2 + 3, duration: 60,
                yoyo: true, repeat: 2, ease: 'Sine.easeInOut',
                onComplete: () => txt.setX(W / 2)
            });
        });

        // Fade out
        this.time.delayedCall(1300, () => {
            this.tweens.add({
                targets: [panel, txt], alpha: 0, duration: 380,
                onComplete: () => { panel.destroy(); txt.destroy(); this._toast = null; }
            });
        });
    }
}
