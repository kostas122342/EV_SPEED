import { Scene } from 'phaser';
import { preloadGarageAssets } from '../assetManifest.js';
import { addMenuVideoBackground, preloadMenuVideo } from '../menuVideoBackground.js';
import { transitionToScene } from '../sceneTransition.js';

const W = 480, H = 720;

const SHOP_CARS = [
    { key: 'playerCar', name: 'EV 3',    unlockKey: null,              price: 0,    scale: 0.23, offY: -92, offX: 0, colors: [
        { key: 'playerCar', swatch: '#d8d8d8', price: 0, unlockKey: null, offX: 2, offY: -3 },
        { key: 'ev3Blue',   swatch: '#2255ee', price: 200, unlockKey: 'evspeed_color_ev3Blue', scale: 0.205, offX: 5, offY: 6 },
        { key: 'ev3Red',    swatch: '#dd2222', price: 200, unlockKey: 'evspeed_color_ev3Red',  scale: 0.197, offX: 4, offY: 10 },
    ]},
    { key: 'modelY',    name: 'EV Y',    unlockKey: 'evspeed_carY',    price: 500, scale: 0.10, offY: -28, offX: 0, colors: [
        { key: 'evYWhite', previewKey: 'shopEvYWhite', swatch: '#ffffff', price: 0, unlockKey: 'evspeed_color_evYWhite' },
        { key: 'modelY',   previewKey: 'shopModelY',   swatch: '#888888', price: 300, unlockKey: 'evspeed_color_evYGrey' },
        { key: 'evYRed',   previewKey: 'shopEvYRed',   swatch: '#dd2222', price: 300, unlockKey: 'evspeed_color_evYRed' },
    ]},
    { key: 'evS',       name: 'EV S',    unlockKey: 'evspeed_evS',     price: 1000, scale: 0.14, offY: -40, offX: 0, colors: [
        { key: 'evS',       swatch: '#2255ee', price: 0, unlockKey: 'evspeed_color_evSBlue' },
        { key: 'evsOrange', swatch: '#ff7700', price: 400, unlockKey: 'evspeed_color_evsOrange' },
        { key: 'evsGreen',  swatch: '#22aa44', price: 400, unlockKey: 'evspeed_color_evsGreen' },
    ]},
    { key: 'evX',       name: 'EV X',    unlockKey: 'evspeed_evX',     price: 1500, scale: 0.10, offY: -40, offX: 0, colors: [
        { key: 'evX',     swatch: '#222222', price: 0, unlockKey: 'evspeed_color_evXBlack' },
        { key: 'evxBlue', swatch: '#33aadd', price: 500, unlockKey: 'evspeed_color_evXBlue' },
        { key: 'evxRed',  swatch: '#dd2222', price: 500, unlockKey: 'evspeed_color_evXRed' },
    ]},
    { key: 'cbt',       name: 'CBT',     unlockKey: 'evspeed_cbt',     price: 2000, scale: 0.12, offY: -40, offX: 0, colors: [
        { key: 'cbtWhite',  swatch: '#ffffff', price: 0, unlockKey: 'evspeed_color_cbtWhite' },
        { key: 'cbt',       swatch: '#888888', price: 600, unlockKey: 'evspeed_color_cbtGrey' },
        { key: 'cbtPurple', swatch: '#8833cc', price: 600, unlockKey: 'evspeed_color_cbtPurple' },
    ]},
    { key: 'scooter',   name: 'SCOOTER', unlockKey: 'evspeed_scooter', price: 3000, scale: 0.10, offY: -40, offX: 0 },
];

const POWER_UPS = [
    { key: 'clear', name: 'CLR',  icon: 'shopClear', price: 250, storeKey: 'evspeed_pu_clear', desc: 'Destroys lane obstacles',  iconScale: 0.20, iconOffY: 0 },
    { key: 'bomb',  name: 'BOMB', icon: 'shopBomb',  price: 400, storeKey: 'evspeed_pu_bomb',  desc: 'Destroys all obstacles',   iconScale: 0.28, iconOffY: 6 },
    { key: 'shield', name: 'SHIELD', icon: 'shieldIcon', price: 600, storeKey: 'evspeed_pu_shield', desc: '4s collision protection', iconScale: 0.07, iconOffY: 0 },
];

const POSITIONS = [
    { cx: 120, cy: 300 },
    { cx: 360, cy: 300 },
    { cx: 120, cy: 610 },
    { cx: 360, cy: 610 },
    { cx: 120, cy: 920 },
    { cx: 360, cy: 920 },
    { cx: 240, cy: 1230 },
];

const PU_POSITIONS = [
    { cx: 120, cy: 300 },
    { cx: 360, cy: 300 },
    { cx: 120, cy: 610 },
    { cx: 360, cy: 610 },
];

const CARD_W = 190, CARD_H = 280;
const CONTENT_BOTTOM    = 1230 + CARD_H / 2 + 20;
const MAX_SCROLL        = Math.max(0, CONTENT_BOTTOM - (H - 122));
const PU_CONTENT_BOTTOM = (POWER_UPS.length > 2 ? 610 : 300) + CARD_H / 2 + 20;
const PU_MAX_SCROLL     = Math.max(0, PU_CONTENT_BOTTOM - (H - 122));

const TAB_Y = 90, TAB_H = 30;

export class Shop extends Scene {
    constructor() { super('Shop'); }

    preload() {
        preloadGarageAssets(this);
        preloadMenuVideo(this);
    }

    create() {
        this._toast = false;
        this.ensureShieldTexture();

        const energy      = parseInt(localStorage.getItem('evspeed_energy') || '0');
        const selectedCar = localStorage.getItem('evspeed_selected_car') || 'playerCar';
        this.activeTab    = localStorage.getItem('evspeed_shop_tab') || 'cars';

        // Restore scroll from before a buy-restart
        const savedScrollY   = parseInt(localStorage.getItem('evspeed_shop_scrollY')   || '0');
        const savedPuScrollY = parseInt(localStorage.getItem('evspeed_shop_puScrollY') || '0');
        localStorage.removeItem('evspeed_shop_scrollY');
        localStorage.removeItem('evspeed_shop_puScrollY');

        this.scrollY   = 0;
        this.puScrollY = 0;

        // Mutable live state (updated in-place on SELECT)
        let liveSelected = selectedCar;
        let liveEnergy   = energy;

        addMenuVideoBackground(this, W, H);
        const ov = this.add.graphics().setDepth(1);
        ov.fillStyle(0x000000, 0.62);
        ov.fillRect(0, 0, W, H);

        // ── CARS CONTAINER ──────────────────────────────────────────
        this.cont = this.add.container(0, 0).setDepth(2);
        const carHitAreas        = [];
        const hoverBtns          = [];
        const scrollIcons        = [];
        const carImages          = {};
        const redrawSwatchesFns  = {};
        const redrawActionBtnFns = {};
        // Per-card refs for in-place select
        const selBorderFns  = {};  // carKey → fn(isSelected)
        const cardStateFns  = {};  // carKey → { cardState, drawBtn } for non-color cards

        SHOP_CARS.forEach((car, i) => {
            const { cx, cy } = POSITIONS[i];
            const owned      = !car.unlockKey || localStorage.getItem(car.unlockKey) === 'true';
            const isSelected = selectedCar === car.key;
            const canAfford  = energy >= car.price;

            // Card fill (never changes)
            const card = this.add.graphics();
            card.fillStyle(0x080818, 0.94);
            card.fillRoundedRect(cx - CARD_W / 2, cy - CARD_H / 2, CARD_W, CARD_H, 12);
            card.lineStyle(3, owned ? 0x334466 : 0x223355, 1);
            card.strokeRoundedRect(cx - CARD_W / 2, cy - CARD_H / 2, CARD_W, CARD_H, 12);
            this.cont.add(card);

            // Separate selection border layer
            const selGfx = this.add.graphics();
            const drawSelBorder = (sel) => {
                selGfx.clear();
                if (sel) {
                    selGfx.lineStyle(3, 0x00cfff, 1);
                    selGfx.strokeRoundedRect(cx - CARD_W / 2, cy - CARD_H / 2, CARD_W, CARD_H, 12);
                }
            };
            drawSelBorder(isSelected);
            this.cont.add(selGfx);
            selBorderFns[car.key] = drawSelBorder;

            // Car image (always created; locked cars get tint + overlay)
            const defaultColorKey  = car.colors ? car.colors[0].key : car.key;
            const activeColorKey   = car.colors
                ? (localStorage.getItem(`evspeed_activeColor_${car.key}`) || defaultColorKey)
                : car.key;
            const activeVariantDef = car.colors ? car.colors.find(v => v.key === activeColorKey) : null;
            const initScale = (activeVariantDef && activeVariantDef.scale != null) ? activeVariantDef.scale : car.scale;
            const initOffX  = car.offX + (activeVariantDef && activeVariantDef.offX != null ? activeVariantDef.offX : 0);
            const initOffY  = car.offY + (activeVariantDef && activeVariantDef.offY != null ? activeVariantDef.offY : 0);
            const activeTextureKey = activeVariantDef?.previewKey || activeColorKey;
            const carImg = this.add.image(cx + initOffX, cy + initOffY, activeTextureKey)
                .setScale(initScale).setOrigin(0.5);
            if (!owned) carImg.setTint(0x666666);
            this.cont.add(carImg);
            if (car.colors) carImages[car.key] = carImg;

            // Lock overlay (stored for in-place unlock)
            let lockOverlay = null, lockTxt = null;
            if (!owned) {
                lockOverlay = this.add.graphics();
                lockOverlay.fillStyle(0x000000, 0.40);
                lockOverlay.fillRoundedRect(cx - CARD_W / 2 + 4, cy - CARD_H / 2 + 4, CARD_W - 8, CARD_H - 8, 11);
                this.cont.add(lockOverlay);
                lockTxt = this.add.text(cx, cy + CARD_H / 2 - 38, 'LOCKED', {
                    fontFamily: 'Arial Black', fontSize: 18, color: '#445566',
                    stroke: '#000000', strokeThickness: 3
                }).setOrigin(0.5);
                this.cont.add(lockTxt);
            }

            // Car name
            this.cont.add(this.add.text(cx, cy + CARD_H / 2 - 107, car.name, {
                fontFamily: 'Arial Black', fontSize: 13,
                color: '#ffffff', stroke: '#000000', strokeThickness: 3
            }).setOrigin(0.5));

            if (car.colors && owned) {
                // ── COLOR SWATCH + ACTION BUTTON ─────────────────────
                const swSize = 26, swGap = 8;
                const totalW   = car.colors.length * swSize + (car.colors.length - 1) * swGap;
                const swStartX = cx - totalW / 2;
                const swY      = cy + CARD_H / 2 - 78;
                const previewState  = { variantKey: activeColorKey };
                const cardState     = { selected: isSelected };
                const swatchGfxArr  = [];

                const drawOneSwatch = (sg, variant, vi, highlighted) => {
                    const vx     = swStartX + vi * (swSize + swGap);
                    const ownedV = !variant.unlockKey || localStorage.getItem(variant.unlockKey) === 'true';
                    const swColor = parseInt(variant.swatch.replace('#', ''), 16);
                    sg.clear();
                    sg.fillStyle(swColor, 1);
                    sg.fillRoundedRect(vx, swY - swSize / 2, swSize, swSize, 5);
                    if (highlighted) {
                        sg.lineStyle(3, 0x00cfff, 1);
                        sg.strokeRoundedRect(vx - 2, swY - swSize / 2 - 2, swSize + 4, swSize + 4, 6);
                    } else {
                        sg.lineStyle(1, 0x445566, 1);
                        sg.strokeRoundedRect(vx, swY - swSize / 2, swSize, swSize, 5);
                    }
                    if (!ownedV) {
                        sg.lineStyle(2, 0x556677, 1);
                        sg.strokeRoundedRect(vx + 1, swY - swSize / 2 + 1, swSize - 2, swSize - 2, 4);
                    }
                };

                car.colors.forEach((variant, vi) => {
                    const vx  = swStartX + vi * (swSize + swGap);
                    const vcx = vx + swSize / 2;
                    const sg  = this.add.graphics();
                    drawOneSwatch(sg, variant, vi, activeColorKey === variant.key);
                    this.cont.add(sg);
                    swatchGfxArr.push({ sg, variant, vi });
                    carHitAreas.push({
                        type: 'colorPreview', state: previewState,
                        carKey: car.key, carColors: car.colors, carBaseScale: car.scale,
                        carCx: cx + car.offX, carCy: cy + car.offY,
                        variantKey: variant.key,
                        cx: vcx, cy: swY, hw: swSize / 2 + 2, hh: swSize / 2 + 2
                    });
                });

                redrawSwatchesFns[car.key] = (highlightKey) =>
                    swatchGfxArr.forEach(({ sg, variant, vi }) =>
                        drawOneSwatch(sg, variant, vi, variant.key === highlightKey));

                const actionBtnY = swY + swSize / 2 + 26;
                const abx0 = cx - 54, abw = 108, abh = 32, abyBase = actionBtnY - abh / 2;
                const actionGfx    = this.add.graphics();
                const actionTxt    = this.add.text(cx, actionBtnY, '', {
                    fontFamily: 'Arial Black', fontSize: 14,
                    color: '#ffffff'
                }).setOrigin(0.5, 0.5);
                const actionEnIcon = this.add.image(cx + 22, actionBtnY, 'energyLogo')
                    .setOrigin(0.5).setScale(0.22).setVisible(false);
                this.cont.add(actionGfx);
                this.cont.add(actionTxt);
                this.cont.add(actionEnIcon);

                const drawActionBtn = (variantKey) => {
                    const variant      = car.colors.find(v => v.key === variantKey);
                    const ownedV       = !variant.unlockKey || localStorage.getItem(variant.unlockKey) === 'true';
                    const storedActive = localStorage.getItem(`evspeed_activeColor_${car.key}`) || defaultColorKey;
                    const isCurrentActive = storedActive === variantKey && cardState.selected;
                    actionGfx.clear();
                    if (isCurrentActive && ownedV) {
                        actionGfx.fillStyle(0x000000, 0.45);
                        actionGfx.fillRoundedRect(abx0 + 3, abyBase + 5, abw, abh, 7);
                        actionGfx.fillStyle(0x008899, 1);
                        actionGfx.fillRoundedRect(abx0, abyBase + 3, abw, abh, 7);
                        actionGfx.fillStyle(0x00cfff, 1);
                        actionGfx.fillRoundedRect(abx0, abyBase, abw, abh, 7);
                        actionTxt.setText('SELECTED').setColor('#002244')
                            .setStroke('#000000', 0).setOrigin(0.5, 0.5).setX(cx);
                        actionEnIcon.setVisible(false);
                    } else if (ownedV) {
                        actionGfx.fillStyle(0x000000, 0.45);
                        actionGfx.fillRoundedRect(abx0 + 3, abyBase + 5, abw, abh, 7);
                        actionGfx.fillStyle(0x001a33, 1);
                        actionGfx.fillRoundedRect(abx0, abyBase + 3, abw, abh, 7);
                        actionGfx.fillStyle(0x005588, 1);
                        actionGfx.fillRoundedRect(abx0, abyBase, abw, abh, 7);
                        actionTxt.setText('SELECT').setColor('#ffffff')
                            .setStroke('#000000', 0).setOrigin(0.5, 0.5).setX(cx);
                        actionEnIcon.setVisible(false);
                    } else {
                        const canAffordV = liveEnergy >= (variant.price || 0);
                        actionGfx.fillStyle(0x000000, 0.45);
                        actionGfx.fillRoundedRect(abx0 + 3, abyBase + 5, abw, abh, 7);
                        actionGfx.fillStyle(0x996600, 1);
                        actionGfx.fillRoundedRect(abx0, abyBase + 3, abw, abh, 7);
                        actionGfx.fillStyle(0xffaa00, 1);
                        actionGfx.fillRoundedRect(abx0, abyBase, abw, abh, 7);
                        actionTxt.setText((variant.price || 0).toString())
                            .setColor('#000000')
                            .setStroke('#000000', 0)
                            .setOrigin(1, 0.5).setX(cx + 2);
                        actionEnIcon.setVisible(true);
                    }
                };
                drawActionBtn(activeColorKey);
                redrawActionBtnFns[car.key] = drawActionBtn;
                cardStateFns[car.key] = cardState;

                carHitAreas.push({
                    type: 'colorAction', state: previewState, cardState,
                    carKey: car.key, colors: car.colors, defaultColorKey,
                    cx, cy: actionBtnY, hw: 54, hh: 14
                });

            } else {
                // ── NON-COLOR BUTTON ────────────────────────────────
                const bx0  = cx - 54;
                const by0  = cy + CARD_H / 2 - 56;
                const btnY = cy + CARD_H / 2 - 40;
                const btnGfx  = this.add.graphics();
                const btnTxt  = this.add.text(cx, btnY, '', {
                    fontFamily: 'Arial Black', fontSize: 13,
                    color: '#ffffff'
                }).setOrigin(0.5);
                let priceIcon = null;

                const drawNonColorBtn = (state) => {
                    btnGfx.clear();
                    if (state === 'selected') {
                        btnGfx.fillStyle(0x008899, 1);
                        btnGfx.fillRoundedRect(bx0 + 3, by0 + 4, 108, 32, 7);
                        btnGfx.fillStyle(0x00cfff, 1);
                        btnGfx.fillRoundedRect(bx0, by0, 108, 32, 7);
                        btnTxt.setText('SELECTED').setColor('#002244')
                            .setStroke('#000000', 0).setOrigin(0.5, 0.5);
                        if (priceIcon) priceIcon.setVisible(false);
                    } else if (state === 'select') {
                        btnGfx.fillStyle(0x001a33, 1);
                        btnGfx.fillRoundedRect(bx0 + 3, by0 + 4, 108, 32, 7);
                        btnGfx.fillStyle(0x005588, 1);
                        btnGfx.fillRoundedRect(bx0, by0, 108, 32, 7);
                        btnTxt.setText('SELECT').setColor('#ffffff')
                            .setStroke('#000000', 0).setOrigin(0.5, 0.5);
                        if (priceIcon) priceIcon.setVisible(false);
                    } else {
                        // buy
                        btnGfx.fillStyle(0x996600, 1);
                        btnGfx.fillRoundedRect(bx0 + 3, by0 + 4, 108, 32, 7);
                        btnGfx.fillStyle(0xffaa00, 1);
                        btnGfx.fillRoundedRect(bx0, by0, 108, 32, 7);
                        btnTxt.setText(car.price.toString())
                            .setColor('#000000')
                            .setStroke('#000000', 0)
                            .setOrigin(1, 0.5).setX(cx + 2);
                        if (priceIcon) priceIcon.setVisible(true);
                    }
                };

                this.cont.add(btnGfx);
                this.cont.add(btnTxt);

                if (isSelected && owned) {
                    drawNonColorBtn('selected');
                    carHitAreas.push({ type: 'select', key: car.key, cx, cy: btnY, hw: 54, hh: 16 });
                } else if (owned) {
                    drawNonColorBtn('select');
                    hoverBtns.push({ cx, cy: btnY, drawBtn: (h) => {
                        if (liveSelected === car.key) return;
                        btnGfx.clear();
                        btnGfx.fillStyle(h ? 0x001122 : 0x001a33, 1);
                        btnGfx.fillRoundedRect(bx0 + 3, by0 + 4, 108, 32, 7);
                        btnGfx.fillStyle(h ? 0x004477 : 0x005588, 1);
                        btnGfx.fillRoundedRect(bx0, by0, 108, 32, 7);
                    }, _over: false });
                    carHitAreas.push({ type: 'select', key: car.key, cx, cy: btnY, hw: 54, hh: 16 });
                } else {
                    drawNonColorBtn('buy');
                    priceIcon = this.add.image(cx + 22, btnY, 'energyLogo')
                        .setOrigin(0.5, 0.5).setScale(0.22).setDepth(5);
                    scrollIcons.push({ img: priceIcon, baseY: btnY });
                    hoverBtns.push({ cx, cy: btnY, drawBtn: (h) => {
                        btnGfx.clear();
                        btnGfx.fillStyle(h ? 0xdd9900 : 0x996600, 1);
                        btnGfx.fillRoundedRect(bx0 + 3, by0 + 4, 108, 32, 7);
                        btnGfx.fillStyle(h ? 0xffcc33 : 0xffaa00, 1);
                        btnGfx.fillRoundedRect(bx0, by0, 108, 32, 7);
                    }, _over: false });
                    const firstColorUnlockKey = car.colors ? car.colors[0].unlockKey : null;
                    carHitAreas.push({ type: 'buy', key: car.unlockKey, price: car.price,
                        firstColorUnlockKey, canAfford, cx, cy: btnY, hw: 54, hh: 16 });
                }

                cardStateFns[car.key] = { drawNonColorBtn, lockOverlay, lockTxt, carImg, owned };
            }
        });

        // ── POWER UPS CONTAINER ─────────────────────────────────────
        this.puCont = this.add.container(0, 0).setDepth(2);
        const puHitAreas    = [];
        const puScrollIcons = [];
        const puCountRefs   = {};

        POWER_UPS.forEach((pu, i) => {
            const { cx, cy } = PU_POSITIONS[i];
            const count       = parseInt(localStorage.getItem(pu.storeKey) || '0');
            const canAffordPu = energy >= pu.price;

            const card = this.add.graphics();
            card.fillStyle(0x080818, 0.94);
            card.fillRoundedRect(cx - CARD_W / 2, cy - CARD_H / 2, CARD_W, CARD_H, 12);
            card.lineStyle(3, 0x334455, 1);
            card.strokeRoundedRect(cx - CARD_W / 2, cy - CARD_H / 2, CARD_W, CARD_H, 12);
            this.puCont.add(card);

            const icon = this.add.image(cx, cy - 68 + (pu.iconOffY || 0), pu.icon)
                .setScale(pu.iconScale).setOrigin(0.5);
            this.puCont.add(icon);

            this.puCont.add(this.add.text(cx, cy + CARD_H / 2 - 132, pu.name, {
                fontFamily: 'Arial Black', fontSize: 16,
                color: '#ffffff', stroke: '#000000', strokeThickness: 3
            }).setOrigin(0.5));

            this.puCont.add(this.add.text(cx, cy + CARD_H / 2 - 112, pu.desc, {
                fontFamily: 'Arial', fontSize: 12, color: '#7799aa'
            }).setOrigin(0.5));

            const cby  = cy + CARD_H / 2 - 84;
            const cbg  = this.add.graphics();
            const cTxt = this.add.text(cx, cby, `x${count}`, {
                fontFamily: 'Arial Black', fontSize: 15,
                color: '#00ee66', stroke: '#000000', strokeThickness: 2
            }).setOrigin(0.5);
            const drawCountBadge = (n) => {
                cbg.clear();
                if (n > 0) {
                    cbg.fillStyle(0x002211, 1);
                    cbg.fillRoundedRect(cx - 22, cby - 12, 44, 24, 7);
                    cbg.lineStyle(1.5, 0x00cc55, 1);
                    cbg.strokeRoundedRect(cx - 22, cby - 12, 44, 24, 7);
                    cTxt.setText(`x${n}`).setVisible(true);
                } else {
                    cTxt.setVisible(false);
                }
            };
            drawCountBadge(count);
            this.puCont.add(cbg);
            this.puCont.add(cTxt);
            puCountRefs[pu.storeKey] = drawCountBadge;

            const bx0  = cx - 54;
            const by0  = cy + CARD_H / 2 - 56;
            const btnY = cy + CARD_H / 2 - 40;
            const btn  = this.add.graphics();
            const drawPuBtn = (hover) => {
                btn.clear();
                btn.fillStyle(0x000000, 0.45);
                btn.fillRoundedRect(bx0 + 3, by0 + 4, 108, 32, 7);
                btn.fillStyle(hover ? 0xdd9900 : 0x996600, 1);
                btn.fillRoundedRect(bx0, by0, 108, 32, 7);
                btn.fillStyle(hover ? 0xffcc33 : 0xffaa00, 1);
                btn.fillRoundedRect(bx0, by0, 108, 32, 7);
            };
            drawPuBtn(false);
            this.puCont.add(btn);
            hoverBtns.push({ cx, cy: btnY, drawBtn: drawPuBtn, _over: false, isPu: true });

            this.puCont.add(this.add.text(cx + 2, btnY, pu.price.toString(), {
                fontFamily: 'Arial Black', fontSize: 14,
                color: '#000000'
            }).setOrigin(1, 0.5));

            const puIcon = this.add.image(cx + 22, btnY, 'energyLogo')
                .setOrigin(0.5).setScale(0.22).setDepth(5);
            puScrollIcons.push({ img: puIcon, baseY: btnY });

            puHitAreas.push({ type: 'buyPu', storeKey: pu.storeKey, price: pu.price,
                canAfford: canAffordPu, cx, cy: btnY, hw: 54, hh: 16 });
        });

        // Initial container visibility
        this.cont.setVisible(this.activeTab === 'cars');
        this.puCont.setVisible(this.activeTab === 'powerups');
        for (const { img } of scrollIcons)   img.setVisible(this.activeTab === 'cars');
        for (const { img } of puScrollIcons) img.setVisible(this.activeTab === 'powerups');

        // ── ENERGY DISPLAY ──────────────────────────────────────────
        const uiBg = this.add.graphics().setDepth(9);
        uiBg.fillStyle(0x000000, 0.40);
        uiBg.fillRoundedRect(W - 160, 8, 156, 48, 10);
        this.add.image(W - 120, 32, 'energyLogo').setOrigin(0.5).setScale(0.32).setDepth(9);
        const energyTxt = this.add.text(W - 20, 32, energy.toString(), {
            fontFamily: 'Arial Black', fontSize: 28, color: '#00cfff',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(1, 0.5).setDepth(9);

        // ── TOP CHROME ──────────────────────────────────────────────
        const topChrome = this.add.graphics().setDepth(9);
        topChrome.fillStyle(0x000000, 0.62);
        topChrome.fillRect(0, 0, W, TAB_Y + TAB_H + 8);
        this.add.text(W / 2, 42, 'SHOP', {
            fontFamily: 'Arial Black', fontSize: 32, color: '#ffffff',
            stroke: '#0033aa', strokeThickness: 7
        }).setOrigin(0.5).setDepth(10);

        // ── TABS ────────────────────────────────────────────────────
        const tabGfx = this.add.graphics().setDepth(10);
        const tabLabels = [
            this.add.text(W / 4, TAB_Y + TAB_H / 2, 'CARS', {
                fontFamily: 'Arial Black', fontSize: 13
            }).setOrigin(0.5).setDepth(11),
            this.add.text(3 * W / 4, TAB_Y + TAB_H / 2, 'POWER UPS', {
                fontFamily: 'Arial Black', fontSize: 13
            }).setOrigin(0.5).setDepth(11),
        ];

        const drawTabs = () => {
            tabGfx.clear();
            [
                { active: this.activeTab === 'cars',      cx: W / 4,     tx: 8,          tw: W / 2 - 12, li: 0 },
                { active: this.activeTab === 'powerups',  cx: 3 * W / 4, tx: W / 2 + 4,  tw: W / 2 - 12, li: 1 },
            ].forEach(t => {
                if (t.active) {
                    tabGfx.fillStyle(0x000000, 0.40);
                    tabGfx.fillRoundedRect(t.tx + 2, TAB_Y + 3, t.tw, TAB_H, 8);
                    tabGfx.fillStyle(0x003377, 1);
                    tabGfx.fillRoundedRect(t.tx, TAB_Y, t.tw, TAB_H, 8);
                    tabGfx.lineStyle(2, 0x00cfff, 1);
                    tabGfx.strokeRoundedRect(t.tx, TAB_Y, t.tw, TAB_H, 8);
                    tabLabels[t.li].setColor('#ffffff');
                } else {
                    tabGfx.fillStyle(0x0a1020, 0.90);
                    tabGfx.fillRoundedRect(t.tx, TAB_Y, t.tw, TAB_H, 8);
                    tabGfx.lineStyle(1, 0x223355, 1);
                    tabGfx.strokeRoundedRect(t.tx, TAB_Y, t.tw, TAB_H, 8);
                    tabLabels[t.li].setColor('#446688');
                }
            });
        };
        drawTabs();

        const switchTab = (tab) => {
            this.activeTab = tab;
            localStorage.setItem('evspeed_shop_tab', tab);
            this.cont.setVisible(tab === 'cars');
            this.puCont.setVisible(tab === 'powerups');
            for (const { img } of scrollIcons)   img.setVisible(tab === 'cars');
            for (const { img } of puScrollIcons) img.setVisible(tab === 'powerups');
            drawTabs();
        };

        // ── BOTTOM CHROME + BACK ─────────────────────────────────────
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

        // ── IN-PLACE SELECT ─────────────────────────────────────────
        const selectCarInPlace = (newCarKey, newColorKey) => {
            const oldKey = liveSelected;

            // Deselect old card
            selBorderFns[oldKey]?.(false);
            if (cardStateFns[oldKey]) {
                const cs = cardStateFns[oldKey];
                if (cs.drawNonColorBtn) {
                    cs.drawNonColorBtn('select');
                } else {
                    // color card: update cardState + redraw button
                    cs.selected = false;
                    const storedActive = localStorage.getItem(`evspeed_activeColor_${oldKey}`)
                        || (SHOP_CARS.find(c => c.key === oldKey)?.colors?.[0]?.key || oldKey);
                    redrawActionBtnFns[oldKey]?.(storedActive);
                }
            }

            // Select new card
            liveSelected = newCarKey;
            localStorage.setItem('evspeed_selected_car', newCarKey);
            if (newColorKey) localStorage.setItem(`evspeed_activeColor_${newCarKey}`, newColorKey);

            selBorderFns[newCarKey]?.(true);
            if (cardStateFns[newCarKey]) {
                const cs = cardStateFns[newCarKey];
                if (cs.drawNonColorBtn) {
                    cs.drawNonColorBtn('selected');
                } else {
                    cs.selected = true;
                    const activeKey = newColorKey
                        || localStorage.getItem(`evspeed_activeColor_${newCarKey}`)
                        || (SHOP_CARS.find(c => c.key === newCarKey)?.colors?.[0]?.key || newCarKey);
                    redrawActionBtnFns[newCarKey]?.(activeKey);
                }
            }
        };

        // ── INPUT ───────────────────────────────────────────────────
        const canvas = this.sys.game.canvas;
        const toGame = (clientX, clientY) => {
            const r = canvas.getBoundingClientRect();
            return { x: (clientX - r.left) * (W / r.width),
                     y: (clientY - r.top)  * (H / r.height) };
        };

        const applyScroll = (newY) => {
            if (this.activeTab === 'cars') {
                this.scrollY = Math.max(-MAX_SCROLL, Math.min(0, newY));
                this.cont.y  = this.scrollY;
                for (const { img, baseY } of scrollIcons) img.setY(baseY + this.scrollY);
            } else {
                this.puScrollY  = Math.max(-PU_MAX_SCROLL, Math.min(0, newY));
                this.puCont.y   = this.puScrollY;
                for (const { img, baseY } of puScrollIcons) img.setY(baseY + this.puScrollY);
            }
        };

        // Restore saved scroll after buy-restart
        if (savedScrollY < 0)   applyScroll(savedScrollY);
        if (savedPuScrollY < 0) {
            this.puScrollY = Math.max(-PU_MAX_SCROLL, Math.min(0, savedPuScrollY));
            this.puCont.y  = this.puScrollY;
            for (const { img, baseY } of puScrollIcons) img.setY(baseY + this.puScrollY);
        }

        this.input.on('pointermove', (ptr) => {
            const isPu = this.activeTab === 'powerups';
            const activeScroll = isPu ? this.puScrollY : this.scrollY;
            for (const b of hoverBtns) {
                if (!!b.isPu !== isPu) continue;
                const ay   = b.cy + activeScroll;
                const over = Math.abs(ptr.x - b.cx) <= 54 && Math.abs(ptr.y - ay) <= 16;
                if (over !== b._over) { b._over = over; b.drawBtn(over); }
            }
        });

        const checkClick = (clientX, clientY) => {
            const { x, y } = toGame(clientX, clientY);

            // Tab buttons
            if (y >= TAB_Y && y <= TAB_Y + TAB_H + 4) {
                if (x < W / 2 && this.activeTab !== 'cars')      { switchTab('cars');      return true; }
                if (x >= W / 2 && this.activeTab !== 'powerups') { switchTab('powerups');  return true; }
                return true;
            }

            // Back button
            if (Math.abs(x - bx) <= bw / 2 && Math.abs(y - by) <= bh / 2) {
                drawBack(false);
                transitionToScene(this, 'Menu');
                return true;
            }

            const activeHitAreas = this.activeTab === 'cars' ? carHitAreas : puHitAreas;
            const activeScroll   = this.activeTab === 'cars' ? this.scrollY : this.puScrollY;

            for (const a of activeHitAreas) {
                const ay = a.cy + activeScroll;
                if (Math.abs(x - a.cx) <= a.hw && Math.abs(y - ay) <= a.hh) {

                    if (a.type === 'select') {
                        // ── In-place car select ──
                        selectCarInPlace(a.key, null);

                    } else if (a.type === 'colorPreview') {
                        a.state.variantKey = a.variantKey;
                        const vDef  = a.carColors.find(v => v.key === a.variantKey);
                        const vScale = (vDef && vDef.scale != null) ? vDef.scale : a.carBaseScale;
                        const vOffX  = vDef && vDef.offX != null ? vDef.offX : 0;
                        const vOffY  = vDef && vDef.offY != null ? vDef.offY : 0;
                        carImages[a.carKey].setTexture(vDef?.previewKey || a.variantKey).setScale(vScale)
                            .setPosition(a.carCx + vOffX, a.carCy + vOffY);
                        redrawSwatchesFns[a.carKey](a.variantKey);
                        redrawActionBtnFns[a.carKey](a.variantKey);

                    } else if (a.type === 'colorAction') {
                        const variantKey = a.state.variantKey;
                        const variant    = a.colors.find(v => v.key === variantKey);
                        const ownedV     = !variant.unlockKey || localStorage.getItem(variant.unlockKey) === 'true';
                        if (ownedV) {
                            // ── In-place color select ──
                            selectCarInPlace(a.carKey, variantKey);
                        } else {
                            const cur = parseInt(localStorage.getItem('evspeed_energy') || '0');
                            if (cur >= (variant.price || 0)) {
                                localStorage.setItem('evspeed_energy', cur - (variant.price || 0));
                                localStorage.setItem(variant.unlockKey, 'true');
                                localStorage.setItem(`evspeed_activeColor_${a.carKey}`, variantKey);
                                localStorage.setItem('evspeed_shop_scrollY', this.scrollY);
                                this.showPurchase();
                            } else {
                                this.showToast('NOT ENOUGH ENERGY');
                            }
                        }

                    } else if (a.type === 'buy') {
                        if (a.canAfford) {
                            const prev = parseInt(localStorage.getItem('evspeed_energy') || '0');
                            localStorage.setItem('evspeed_energy', prev - a.price);
                            localStorage.setItem(a.key, 'true');
                            if (a.firstColorUnlockKey) localStorage.setItem(a.firstColorUnlockKey, 'true');
                            localStorage.setItem('evspeed_shop_scrollY', this.scrollY);
                            this.showPurchase();
                        } else {
                            this.showToast('NOT ENOUGH ENERGY');
                        }

                    } else if (a.type === 'buyPu') {
                        const curEnergy = parseInt(localStorage.getItem('evspeed_energy') || '0');
                        if (curEnergy >= a.price) {
                            const count     = parseInt(localStorage.getItem(a.storeKey) || '0');
                            const newEnergy = curEnergy - a.price;
                            localStorage.setItem('evspeed_energy', newEnergy);
                            localStorage.setItem(a.storeKey, count + 1);
                            liveEnergy = newEnergy;
                            energyTxt.setText(newEnergy.toString());
                            puCountRefs[a.storeKey](count + 1);
                            this.showQuickPurchase();
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

        const onWheel = (e) => {
            e.preventDefault();
            const cur = this.activeTab === 'cars' ? this.scrollY : this.puScrollY;
            applyScroll(cur - e.deltaY * 0.5);
        };
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
            dragStartClientY  = e.clientY;
            dragStartScrollY  = this.activeTab === 'cars' ? this.scrollY : this.puScrollY;
            dragMoved = false;
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup',   onMouseUp);
            const { x, y } = toGame(e.clientX, e.clientY);
            if (Math.abs(x - bx) <= bw / 2 && Math.abs(y - by) <= bh / 2) drawBack(true);
        };
        const onTouchStart = (e) => {
            dragStartClientY = e.touches[0].clientY;
            dragStartScrollY = this.activeTab === 'cars' ? this.scrollY : this.puScrollY;
            dragMoved = false;
        };
        const onTouchMove = (e) => {
            e.preventDefault();
            if (!e.touches.length) return;
            const dy = (e.touches[0].clientY - dragStartClientY) * (H / canvas.getBoundingClientRect().height);
            if (Math.abs(dy) > 10) { dragMoved = true; applyScroll(dragStartScrollY + dy); }
        };
        const onTouchEnd = (e) => {
            if (!dragMoved && e.changedTouches.length > 0)
                checkClick(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
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

    ensureShieldTexture() {
        if (this.textures.exists('shieldIcon')) return;
        const g = this.add.graphics();
        g.fillStyle(0x06335c, 0.8);
        g.fillCircle(32, 32, 25);
        g.lineStyle(5, 0x33ddff, 1);
        g.strokeCircle(32, 32, 24);
        g.lineStyle(2, 0xffffff, 0.9);
        g.strokeCircle(32, 32, 17);
        g.generateTexture('shieldIcon', 64, 64);
        g.destroy();
    }

    showPurchase() {
        const flash = this.add.graphics().setDepth(19);
        flash.fillStyle(0x00ff88, 0.22);
        flash.fillRect(0, 0, W, H);
        this.tweens.add({ targets: flash, alpha: 0, duration: 400,
            onComplete: () => flash.destroy() });

        const panel = this.add.graphics().setDepth(20).setAlpha(0);
        panel.fillStyle(0x000000, 0.82);
        panel.fillRoundedRect(W / 2 - 170, H / 2 - 6, 340, 92, 14);
        panel.lineStyle(2, 0x00cc66, 1);
        panel.strokeRoundedRect(W / 2 - 170, H / 2 - 6, 340, 92, 14);

        const txt = this.add.text(W / 2, H / 2 + 40, 'UNLOCKED!', {
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

    showQuickPurchase() {
        const flash = this.add.graphics().setDepth(19);
        flash.fillStyle(0x00ff88, 0.22);
        flash.fillRect(0, 0, W, H);
        this.tweens.add({ targets: flash, alpha: 0, duration: 400,
            onComplete: () => flash.destroy() });

        const panel = this.add.graphics().setDepth(20).setAlpha(0);
        panel.fillStyle(0x000000, 0.82);
        panel.fillRoundedRect(W / 2 - 170, H / 2 - 6, 340, 92, 14);
        panel.lineStyle(2, 0x00cc66, 1);
        panel.strokeRoundedRect(W / 2 - 170, H / 2 - 6, 340, 92, 14);

        const txt = this.add.text(W / 2, H / 2 + 40, 'UNLOCKED!', {
            fontFamily: 'Arial Black', fontSize: 24, color: '#00ff88',
            stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5).setDepth(21).setScale(1.45).setAlpha(0);

        this.tweens.add({ targets: [panel, txt], alpha: 1, duration: 180 });
        this.tweens.add({ targets: txt, scaleX: 1, scaleY: 1, duration: 280, ease: 'Back.easeOut' });

        this.time.delayedCall(900, () => {
            this.tweens.add({ targets: [panel, txt], alpha: 0, duration: 300,
                onComplete: () => { panel.destroy(); txt.destroy(); } });
        });
    }

    showToast(msg) {
        if (this._toast) return;
        this._toast = true;

        const flash = this.add.graphics().setDepth(19);
        flash.fillStyle(0xff0000, 0.28);
        flash.fillRect(0, 0, W, H);
        this.tweens.add({ targets: flash, alpha: 0, duration: 350,
            onComplete: () => flash.destroy() });

        const panel = this.add.graphics().setDepth(20).setAlpha(0);
        panel.fillStyle(0x000000, 0.82);
        panel.fillRoundedRect(W / 2 - 170, H / 2 - 36, 340, 72, 14);
        panel.lineStyle(2, 0xcc2222, 1);
        panel.strokeRoundedRect(W / 2 - 170, H / 2 - 36, 340, 72, 14);

        const txt = this.add.text(W / 2, H / 2, msg, {
            fontFamily: 'Arial Black', fontSize: 20, color: '#ff4444',
            stroke: '#000000', strokeThickness: 5
        }).setOrigin(0.5).setDepth(21).setAlpha(0);

        this.tweens.add({ targets: [panel, txt], alpha: 1, duration: 150 });
        this.time.delayedCall(1200, () => {
            this.tweens.add({ targets: [panel, txt], alpha: 0, duration: 300,
                onComplete: () => { this._toast = false; } });
        });
    }
}
