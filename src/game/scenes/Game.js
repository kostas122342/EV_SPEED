import { Scene, Textures } from 'phaser';

const W = 480, H = 720;
const HORIZON_Y = 180;
const FOCAL = 200, CAM_H = 540;
const Z_NEAR = 250, Z_FAR = 2000;
const ROAD_HW = 280;
const LANE_CENTERS = [-ROAD_HW * 0.67, 0, ROAD_HW * 0.67];
const DASH_LEN = 80, DASH_GAP = 80, DASH_P = DASH_LEN + DASH_GAP;
const SCAN = 3;
const CITY_LAYER_VARIANTS = [
    { swapped: false, size: 1.00, side: 40,  ground: 0 },
    { swapped: true,  size: 0.88, side: 88,  ground: 8 },
    { swapped: false, size: 0.96, side: 126, ground: 4 },
    { swapped: true,  size: 0.82, side: 62,  ground: 12 },
];
const CITY_LAYER_COUNT = CITY_LAYER_VARIANTS.length;
const CITY_LAYER_NEAR_Z = 480;
const CITY_LAYER_FAR_Z = 2680;
const CITY_LAYER_SPAN = CITY_LAYER_FAR_Z - CITY_LAYER_NEAR_Z;
const CITY_LAYER_SCROLL = 0.16;
const CITY_BANK_W = 1086;
// The source is 724 px tall, but its final 53 rows are fully transparent.
// Cropping them makes the visible tree roots, not the empty canvas, touch ground.
const CITY_BANK_H = 671;
const CITY_LEFT_INNER_GAP = 133;
const CITY_RIGHT_INNER_GAP = 117;
const CITY_HILL_REVEAL_DISTANCE = 1000;


function roadHillLift(wz) {
    const t = smoothstep((wz - 520) / (Z_FAR - 520));
    return 34 * t;
}

function hillCrestY(screenX) {
    const edgeT = Math.min(1, Math.abs(screenX - W / 2) / (W / 2));
    return HORIZON_Y + 22 + 9 * Math.pow(edgeT, 1.6);
}

function proj(wx, wz) {
    const s = FOCAL / wz;
    return { x: W / 2 + wx * s, y: HORIZON_Y + CAM_H * s - roadHillLift(wz), s };
}

function laneX(lane) {
    return W / 2 + LANE_CENTERS[lane] * (FOCAL / Z_NEAR);
}

function rnd(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function smoothstep(t) { const c = Math.min(1, Math.max(0, t)); return c * c * (3 - 2 * c); }
function hash01(n) { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); }

function lerpColor(a, b, t) {
    const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
    const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
    return ((ar + (br - ar) * t | 0) << 16) | ((ag + (bg - ag) * t | 0) << 8) | (ab + (bb - ab) * t | 0);
}

const DAY_CYCLE_SECONDS = 60;
const DAY_CYCLE_KEYS = [
    { t: 0.00, sky: 0x78c9ed, grass: 0x4a8c3f, night: 0.00, sunX: 240, sunY: 54,  sunAlpha: 1.00, sun: 0xfff2ad },
    { t: 0.18, sky: 0x82c9e5, grass: 0x4c873c, night: 0.00, sunX: 245, sunY: 78,  sunAlpha: 1.00, sun: 0xffdf8b },
    { t: 0.34, sky: 0xe47745, grass: 0x596b32, night: 0.20, sunX: 254, sunY: 160, sunAlpha: 1.00, sun: 0xffa94b },
    { t: 0.42, sky: 0x5b456f, grass: 0x293a27, night: 0.62, sunX: 258, sunY: 205, sunAlpha: 0.08, sun: 0xff7b3d },
    { t: 0.48, sky: 0x07152e, grass: 0x111b16, night: 1.00, sunX: 258, sunY: 230, sunAlpha: 0.00, sun: 0xff6a35 },
    { t: 0.67, sky: 0x07152e, grass: 0x111b16, night: 1.00, sunX: 222, sunY: 230, sunAlpha: 0.00, sun: 0xff6a35 },
    { t: 0.73, sky: 0x493b65, grass: 0x243228, night: 0.68, sunX: 222, sunY: 205, sunAlpha: 0.10, sun: 0xff8745 },
    { t: 0.84, sky: 0xe68455, grass: 0x596e35, night: 0.18, sunX: 228, sunY: 145, sunAlpha: 1.00, sun: 0xffba62 },
    { t: 0.94, sky: 0x7bcbed, grass: 0x4a8c3f, night: 0.00, sunX: 237, sunY: 72,  sunAlpha: 1.00, sun: 0xffe99b },
    { t: 1.00, sky: 0x78c9ed, grass: 0x4a8c3f, night: 0.00, sunX: 240, sunY: 54,  sunAlpha: 1.00, sun: 0xfff2ad },
];

function sampleDayCycle(phase) {
    for (let i = 0; i < DAY_CYCLE_KEYS.length - 1; i++) {
        const from = DAY_CYCLE_KEYS[i];
        const to = DAY_CYCLE_KEYS[i + 1];
        if (phase > to.t) continue;
        const blend = smoothstep((phase - from.t) / (to.t - from.t));
        return {
            sky:      lerpColor(from.sky, to.sky, blend),
            grass:    lerpColor(from.grass, to.grass, blend),
            night:    from.night + (to.night - from.night) * blend,
            sunX:     from.sunX + (to.sunX - from.sunX) * blend,
            sunY:     from.sunY + (to.sunY - from.sunY) * blend,
            sunAlpha: from.sunAlpha + (to.sunAlpha - from.sunAlpha) * blend,
            sun:      lerpColor(from.sun, to.sun, blend),
        };
    }
    return DAY_CYCLE_KEYS[DAY_CYCLE_KEYS.length - 1];
}

export class Game extends Scene {
    constructor() { super('Game'); }

    preload() {
        this.load.image('city',        'assets/City.png');
        this.load.image('athens',      'assets/Athens.png');
        this.load.image('playerCar', 'assets/CarFinal.png');
        this.load.image('ev3Blue',   'assets/ev3BLUE.png');
        this.load.image('ev3Red',    'assets/ev3RED.png');
        this.load.image('P1',        'assets/P1.png');
        this.load.image('enemyCityEv', 'assets/enemyCityEv.png');
        this.load.image('evS',       'assets/evS.png');
        this.load.image('evsOrange', 'assets/evsORANGE.png');
        this.load.image('evsGreen',  'assets/evsGREEN.png');
        this.load.image('evX',       'assets/evX.png');
        this.load.image('evxBlue',   'assets/evxBLUE.png');
        this.load.image('evxRed',    'assets/evxRED.png');
        this.load.image('modelY',    'assets/modelY.png');
        this.load.image('evYWhite',  'assets/evYWHITE.png');
        this.load.image('evYRed',    'assets/evYRED.png');
        // Gameplay-only EV Y keys avoid stale/missing textures cached by other scenes.
        this.load.image('gameModelY',   'assets/modelY.png');
        this.load.image('gameEvYWhite', 'assets/EVYWHITE.png');
        this.load.image('gameEvYRed',   'assets/evYRED.png');
        this.load.image('cbt',       'assets/CBT.png');
        this.load.image('cbtWhite',  'assets/CBTWHITE.png');
        this.load.image('cbtPurple', 'assets/cbtPURPLE.png');
        this.load.image('scooter',   'assets/SCOOTER.png');
        this.load.image('obstacle',   'assets/obstacle.png');
        this.load.image('truck',      'assets/Truck.png');
        this.load.image('energyLogo', 'assets/En4.png');
        this.load.image('energyCoin', 'assets/Energy.png');
        this.load.image('bombItem',   'assets/bomb.png');
        this.load.image('clearItem',  'assets/CLEAR.png');
        this.load.image('shieldIcon', 'assets/shieldIcon.png');
        this.load.image('tree',       'assets/tree.png');
        this.load.image('mountainLayer',   'assets/mountain-layer.png');
        this.load.image('forestCityLayer', 'assets/forest-city-layer.png');
        this.load.audio('energyBeat', 'assets/energyBeat.mp3');
        this.load.audio('bombBeat',   'assets/bombBeat.mp3');
        this.load.audio('lazerBeat',   'assets/lazerBeat.mp3');
        this.load.audio('countdown',   'assets/countdown.mp3');
    }

    create() {
        this.ensureShieldTexture();
        this.textures.get('energyLogo').setFilter(Textures.FilterMode.LINEAR);
        const mpData     = this.scene.settings.data || {};
        this.mp          = !!mpData.mp;
        this.mpPlayer    = mpData.player || 1;
        this.mpP1Score   = mpData.p1Score || 0;
        this.mpP1Car     = mpData.p1Car   || 'playerCar';
        this.mpP2Car     = mpData.p2Car   || 'playerCar';
        this.mpP1Color   = mpData.p1Color || null;
        this.mpP2Color   = mpData.p2Color || null;
        this.mpP1Name    = mpData.p1Name  || 'PLAYER 1';
        this.mpP2Name    = mpData.p2Name  || 'PLAYER 2';
        this.started     = !this.mp;

        this.dist   = 0;
        this.spd    = 350;
        this.lane   = 1;
        this.px     = laneX(1);
        this.moving = false;
        this.enemies   = [];
        this.obstacles = [];
        this.energies  = [];
        this.sparks    = [];
        this.trees     = [];
        this.skidMarks = [];
        this.treePool  = []; // grows lazily, sprites never destroyed
        this.score   = 0;
        this.energy  = 0;
        this.over    = false;
        this.homeDown = false;
        this.powerups     = {
            clearLane: parseInt(localStorage.getItem('evspeed_pu_clear') || '0'),
            megaBomb:  parseInt(localStorage.getItem('evspeed_pu_bomb')  || '0'),
            shield:    parseInt(localStorage.getItem('evspeed_pu_shield') || '0'),
        };
        this.powerupItems = [];
        this.puFlashT     = 0;
        this.puBombT      = 0;
        this.shieldT      = 0;

        this.lk = false; this.rk = false;
        this.sx = 0;     this.sy = 0;
        this.moveDir = 0;

        this.theme = 'athens';

        // Continuous solar day/night cycle. Starting in late morning gives the
        // player time to see the sun before the first sunset.
        this.dayCycleT = 0.10;
        const initialDay = sampleDayCycle(this.dayCycleT);
        this.wSky     = initialDay.sky;
        this.wGrass   = initialDay.grass;
        this.wNight   = initialDay.night;
        this.sunX     = initialDay.sunX;
        this.sunY     = initialDay.sunY;
        this.sunAlpha = initialDay.sunAlpha;
        this.sunColor = initialDay.sun;

        this.gBg    = this.add.graphics().setDepth(0);
        this.gSkyFx = this.add.graphics().setDepth(0.2);
        this.mountainLayer = this.add.image(W / 2, HORIZON_Y + 60, 'mountainLayer')
            .setOrigin(0.5, 1)
            .setDisplaySize(560, 265)
            .setDepth(0.35);
        const cityTexture = this.textures.get('forestCityLayer');
        if (!cityTexture.has('cityBankLeftGrounded')) {
            cityTexture.add('cityBankLeftGrounded', 0, 0, 0, CITY_BANK_W, CITY_BANK_H);
            cityTexture.add('cityBankRightGrounded', 0, CITY_BANK_W, 0, CITY_BANK_W, CITY_BANK_H);
        }
        this.cityDepthLayers = Array.from({ length: CITY_LAYER_COUNT }, (_, i) => {
            const variant = CITY_LAYER_VARIANTS[i];
            const leftFrame = variant.swapped ? 'cityBankRightGrounded' : 'cityBankLeftGrounded';
            const rightFrame = variant.swapped ? 'cityBankLeftGrounded' : 'cityBankRightGrounded';
            const left = this.add.image(W / 2, HORIZON_Y, 'forestCityLayer', leftFrame)
                .setOrigin(1, 1)
                .setFlipX(variant.swapped)
                .setDepth(0.5);
            const right = this.add.image(W / 2, HORIZON_Y, 'forestCityLayer', rightFrame)
                .setOrigin(0, 1)
                .setFlipX(variant.swapped)
                .setDepth(0.5);
            return { left, right, index: i, variant };
        });
        this.gHill  = this.add.graphics().setDepth(0.9);
        this.gRoad  = this.add.graphics().setDepth(1);
        this.gFog   = this.add.graphics().setDepth(1.45);
        this.gCity  = this.add.graphics().setDepth(1.7);
        this.gEnv   = this.add.graphics().setDepth(2);
        // Keep the night wash above every moving world object so cars and
        // pickups do not suddenly brighten as their perspective depth changes.
        this.gNight = this.add.graphics().setDepth(3.2);
        this.gHorizonLights = this.add.graphics().setDepth(3.3);
        this.gCar   = this.add.graphics().setDepth(3);

        this.carRot = 0;
        const mpCarKey = this.mp ? (this.mpPlayer === 1 ? mpData.p1Car : mpData.p2Car) : (mpData.carKey || null);
        const selectedCar = mpCarKey || localStorage.getItem('evspeed_selected_car') || 'playerCar';
        this.selectedCar = selectedCar;
        const CAR_SCALES = { playerCar: 0.32, evS: 0.17, evsOrange: 0.17, evsGreen: 0.17, evX: 0.114, evxBlue: 0.114, evxRed: 0.114, modelY: 0.1365, evYWhite: 0.1365, evYRed: 0.1365, cbt: 0.16, cbtWhite: 0.16, cbtPurple: 0.16, scooter: 0.11 };
        const VARIANT_DEFAULTS = { playerCar: 'playerCar', modelY: 'evYWhite', evS: 'evS', evX: 'evX', cbt: 'cbtWhite' };
        let carTextureKey = selectedCar;
        if (VARIANT_DEFAULTS[selectedCar]) {
            const mpColor = this.mp ? (this.mpPlayer === 1 ? mpData.p1Color : mpData.p2Color) : null;
            carTextureKey = mpColor || localStorage.getItem(`evspeed_activeColor_${selectedCar}`) || VARIANT_DEFAULTS[selectedCar];
        }
        const GAME_TEXTURE_KEYS = {
            modelY: 'gameModelY',
            evYWhite: 'gameEvYWhite',
            evYRed: 'gameEvYRed',
        };
        carTextureKey = GAME_TEXTURE_KEYS[carTextureKey] || carTextureKey;
        this.playerSprite = this.add.image(this.px, H - 140, carTextureKey)
            .setScale(CAR_SCALES[selectedCar] ?? 0.32)
            .setOrigin(0.5, 0.76)
            .setDepth(3.5);

        const uiBg = this.add.graphics().setDepth(8);
        uiBg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0.52, 0, 0.52);
        uiBg.fillRect(W - 170, 0, 170, 80);
        uiBg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0.52, 0, 0);
        uiBg.fillRect(W - 170, 80, 170, 34);

        this.tSc = this.add.text(W - 10, 10, 'SCORE: 0', {
            fontFamily: 'Arial', fontSize: 20, color: '#ffffff',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(1, 0).setDepth(9);


        this.add.image(W - 90, 57, 'energyLogo')
            .setOrigin(0.5, 0.5)
            .setScale(0.32)
            .setDepth(9);

        this.tEn = this.add.text(W - 70, 57, ': 0', {
            fontFamily: 'Arial', fontSize: 26, color: '#00cfff',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0, 0.5).setDepth(9);

        this.tSp = this.add.text(10, 10, '100 KM/H', {
            fontFamily: 'Arial', fontSize: 18, color: '#ffff00',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0, 0).setDepth(9);


        this.keys = this.input.keyboard.createCursorKeys();

        this.input.on('pointerdown', p => { this.sx = p.x; this.sy = p.y; this.swiped = false; });
        this.input.on('pointermove', p => {
            if (!p.isDown || this.swiped || this.over) return;
            const dx = p.x - this.sx, dy = p.y - this.sy;
            if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) {
                this.swiped = true;
                this.go(dx > 0 ? 1 : -1);
            }
        });
        this.input.on('pointerup', () => { this.swiped = false; });

        this.time.addEvent({ delay: 1600, loop: true, callback: () => {
            if (!this.over && this.started) {
                const busy = new Set([
                    ...this.enemies.map(e => e.lane),
                    ...this.obstacles.filter(o => o.z > 900).map(o => o.lane),
                    ...this.energies.filter(ec => !ec.collected && ec.z > 900).map(ec => ec.lane)
                ]);
                const free = [0, 1, 2].filter(l => !busy.has(l));
                if (free.length === 0) return;
                const lane = free[Math.floor(Math.random() * free.length)];
                const willRush = this.spd >= 700 && Math.random() < 0.45;
                const enemyTypes = [
                    { key: 'P1',          renderScale: 0.20, originY: 0.74, hitHalfW: 62, hitTop: 5,   hitBottom: 5 },
                    { key: 'enemyCityEv', renderScale: 0.18, originY: 0.76, hitHalfW: 74, hitTop: 115, hitBottom: 16 },
                ];
                const enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
                const e = {
                    z: Z_FAR, lane, speedMul: 1.0, rushPhase: 'idle', rushT: 0, willRush,
                    renderScale: enemyType.renderScale,
                    hitHalfW: enemyType.hitHalfW,
                    hitTop: enemyType.hitTop,
                    hitBottom: enemyType.hitBottom,
                };
                e.sprite = this.add.image(0, 0, enemyType.key)
                    .setOrigin(0.5, enemyType.originY).setDepth(2.5).setVisible(false);
                this.enemies.push(e);
            }
        }});

        this.time.addEvent({ delay: 2200, loop: true, callback: () => {
            if (!this.over && this.started) {
                const busy = new Set([
                    ...this.obstacles.filter(o => o.z > 900).map(o => o.lane),
                    ...this.enemies.filter(e => e.z > 900).map(e => e.lane),
                    ...this.energies.filter(ec => !ec.collected && ec.z > 900).map(ec => ec.lane)
                ]);
                const free = [0, 1, 2].filter(l => !busy.has(l));
                if (free.length === 0) return;
                const lane = free[Math.floor(Math.random() * free.length)];
                const obstKey = Math.random() < 0.5 ? 'obstacle' : 'truck';
                const o = { z: Z_FAR, lane, type: obstKey };
                o.sprite = this.add.image(0, 0, obstKey).setOrigin(0.5, obstKey === 'truck' ? 0.82 : 0.5).setDepth(2.5).setVisible(false);
                this.obstacles.push(o);
            }
        }});
        this.time.addEvent({ delay: 1800, loop: true, callback: () => {
            if (!this.over && this.started && this.trees.length < 8) {
                const getSprite = () => {
                    const free = this.treePool.find(sp => !sp.getData('used'));
                    if (free) { free.setData('used', true); return free; }
                    const ns = this.add.image(0, 0, 'tree')
                        .setOrigin(0.5, 1).setDepth(2.2).setVisible(false).setData('used', true);
                    this.treePool.push(ns);
                    return ns;
                };
                const ox = ROAD_HW + 60 + rnd(0, 100);
                const is = Math.random() < 0.3;
                this.trees.push({ z: Z_FAR, s: -1, ox, isStone: is, sprite: getSprite() });
                this.trees.push({ z: Z_FAR, s:  1, ox, isStone: is, sprite: getSprite() });
            }
        }});
        this.time.addEvent({ delay: 1600, loop: true, callback: () => {
            if (!this.over && this.started) {
                const allObjs = [...this.enemies, ...this.obstacles, ...this.energies.filter(ec => !ec.collected)];
                const isBlocked = (lane, z) => allObjs.some(o => o.lane === lane && Math.abs(o.z - z) < 320);

                const busy = new Set([0, 1, 2].filter(l => isBlocked(l, Z_FAR)));
                const free = [0, 1, 2].filter(l => !busy.has(l));
                if (free.length === 0) return;

                let curLane = free[Math.floor(Math.random() * free.length)];
                const path = [];
                let held = 0;
                let holdFor = 2 + Math.floor(Math.random() * 2);
                for (let i = 0; i < 6; i++) {
                    const coinZ = Z_FAR - i * 80;
                    if (isBlocked(curLane, coinZ)) {
                        const adj = [curLane - 1, curLane + 1].filter(l => l >= 0 && l <= 2 && !isBlocked(l, coinZ));
                        if (adj.length > 0) { curLane = adj[Math.floor(Math.random() * adj.length)]; held = 0; holdFor = 2 + Math.floor(Math.random() * 2); }
                        else continue;
                    } else if (held >= holdFor) {
                        const adj = [curLane - 1, curLane + 1].filter(l => l >= 0 && l <= 2 && !isBlocked(l, coinZ));
                        if (adj.length > 0) curLane = adj[Math.floor(Math.random() * adj.length)];
                        held = 0;
                        holdFor = 2 + Math.floor(Math.random() * 2);
                    } else {
                        held++;
                    }
                    path.push({ lane: curLane, z: coinZ });
                }

                for (const pt of path) {
                    const ec = { z: pt.z, lane: pt.lane, collected: false };
                    ec.sprite = this.add.image(0, 0, 'energyCoin')
                        .setOrigin(0.5, 0.5).setDepth(2.8).setVisible(false);
                    this.energies.push(ec);
                }
            }
        }});
        this.time.addEvent({ delay: 100, loop: true, callback: () => {
            if (!this.over && this.started) this.score += Math.floor(10 + this.spd / 100);
        }});

        this.time.addEvent({ delay: 8000, loop: true, callback: () => {
            if (!this.over && this.started) {
                const busy = new Set([
                    ...this.enemies.filter(e => e.z > 900).map(e => e.lane),
                    ...this.obstacles.filter(o => o.z > 900).map(o => o.lane),
                    ...this.energies.filter(ec => !ec.collected && ec.z > 900).map(ec => ec.lane),
                    ...this.powerupItems.filter(p => !p.collected && p.z > 900).map(p => p.lane),
                ]);
                const free = [0, 1, 2].filter(l => !busy.has(l));
                if (free.length === 0) return;
                const lane = free[Math.floor(Math.random() * free.length)];
                const roll = Math.random();
                const type = roll < 0.60 ? 'clearLane' : roll < 0.82 ? 'megaBomb' : 'shield';
                const item = { z: Z_FAR, lane, type, collected: false };
                const imgKey = type === 'megaBomb' ? 'bombItem' : type === 'shield' ? 'shieldIcon' : 'clearItem';
                item.sprite = this.add.image(0, 0, imgKey)
                    .setOrigin(0.5, 0.5).setDepth(2.8).setVisible(false);
                this.powerupItems.push(item);
            }
        }});

        // Home button (bottom right)
        const homeBg = this.add.graphics().setDepth(9);
        const drawHomeBg = (hover) => {
            homeBg.clear();
            homeBg.fillStyle(hover ? 0x0055aa : 0x000000, hover ? 0.75 : 0.50);
            homeBg.fillCircle(W - 38, H - 38, 26);
            homeBg.lineStyle(2, 0xffffff, hover ? 0.95 : 0.60);
            homeBg.strokeCircle(W - 38, H - 38, 26);
        };
        drawHomeBg(false);
        this.add.text(W - 38, H - 39, '⌂', {
            fontFamily: 'Arial', fontSize: 26, color: '#ffffff',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5, 0.5).setDepth(10);
        const homeZone = this.add.zone(W - 38, H - 38, 52, 52).setInteractive().setDepth(11);
        homeZone.on('pointerover',  () => drawHomeBg(true));
        homeZone.on('pointerout',   () => drawHomeBg(false));
        homeZone.on('pointerdown',  () => { this.homeDown = true; this.scene.start('Menu'); });

        // Power-up buttons (bottom-left)
        this.puClrGfx = this.add.graphics().setDepth(9);
        this.puBmbGfx = this.add.graphics().setDepth(9);
        this.puShdGfx = this.add.graphics().setDepth(9);
        this.shieldGfx = this.add.graphics().setDepth(4);
        this.puClrIcon = this.add.image(45,  H - 57, 'clearItem').setScale(0.09).setOrigin(0.5).setDepth(10);
        this.puBmbIcon = this.add.image(105, H - 54, 'bombItem' ).setScale(0.12).setOrigin(0.5).setDepth(10);
        this.puShdIcon = this.add.image(165, H - 56, 'shieldIcon').setScale(0.03).setOrigin(0.5).setDepth(10);
        this.puClrLbl  = this.add.text(45,  H - 24, 'CLR',  { fontFamily: 'Arial Black', fontSize: 12, color: '#00eeff', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5).setDepth(10);
        this.puBmbLbl  = this.add.text(105, H - 24, 'BOMB', { fontFamily: 'Arial Black', fontSize: 12, color: '#ffaa44', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5).setDepth(10);
        this.puShdLbl  = this.add.text(165, H - 24, 'SHIELD', { fontFamily: 'Arial Black', fontSize: 10, color: '#55ddff', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5).setDepth(10);
        this.puClrCnt  = this.add.text(66,  H - 72, '',     { fontFamily: 'Arial Black', fontSize: 12, color: '#00ffff', stroke: '#000000', strokeThickness: 2 }).setOrigin(0.5).setDepth(10);
        this.puBmbCnt  = this.add.text(126, H - 72, '',     { fontFamily: 'Arial Black', fontSize: 12, color: '#ffaa00', stroke: '#000000', strokeThickness: 2 }).setOrigin(0.5).setDepth(10);
        this.puShdCnt  = this.add.text(186, H - 72, '',     { fontFamily: 'Arial Black', fontSize: 12, color: '#55ddff', stroke: '#000000', strokeThickness: 2 }).setOrigin(0.5).setDepth(10);
        this.shieldTimeTxt = this.add.text(W / 2, H - 238, '', { fontFamily: 'Arial Black', fontSize: 16, color: '#55eeff', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5).setDepth(10);
        this.add.zone(45,  H - 56, 52, 52).setInteractive().setDepth(11).on('pointerdown', () => this.activateClearLane());
        this.add.zone(105, H - 56, 52, 52).setInteractive().setDepth(11).on('pointerdown', () => this.activateMegaBomb());
        this.add.zone(165, H - 56, 52, 52).setInteractive().setDepth(11).on('pointerdown', () => this.activateShield());
        this.updatePowerupBtns();

        if (this.mp) {
            this.time.delayedCall(200, () => this.startCountdown());
        }

        this.redraw();
    }

    startCountdown() {
        const col = this.mpPlayer === 1 ? '#00cfff' : '#ff9900';
        const ov = this.add.graphics().setDepth(24);
        ov.fillStyle(0x000000, 0.70);
        ov.fillRect(0, 0, W, H);

        const lbl = this.add.text(W / 2, H / 2 - 90, this.mpPlayer === 1 ? this.mpP1Name : this.mpP2Name, {
            fontFamily: 'Arial Black', fontSize: 34, color: col,
            stroke: '#000000', strokeThickness: 7
        }).setOrigin(0.5).setDepth(25);

        const numTxt = this.add.text(W / 2, H / 2 + 10, '3', {
            fontFamily: 'Arial Black', fontSize: 100, color: '#ffffff',
            stroke: '#000000', strokeThickness: 10
        }).setOrigin(0.5).setDepth(25);

        const steps = ['3', '2', '1', 'GO!'];
        let i = 0;
        this.playSfx('countdown', { volume: 0.8 });
        const tick = () => {
            numTxt.setText(steps[i]);
            numTxt.setScale(1.5);
            this.tweens.add({ targets: numTxt, scaleX: 1, scaleY: 1, duration: 700, ease: 'Back.easeOut' });
            i++;
            if (i < steps.length) {
                this.time.delayedCall(900, tick);
            } else {
                this.time.delayedCall(650, () => {
                    this.tweens.add({ targets: [ov, lbl, numTxt], alpha: 0, duration: 300,
                        onComplete: () => { ov.destroy(); lbl.destroy(); numTxt.destroy(); }
                    });
                    this.started = true;
                });
            }
        };
        tick();
    }

    go(d) {
        if (this.over || !this.started) return;
        const nl = this.lane + d;
        if (nl < 0 || nl > 2 || nl === this.lane) return;

        const now = this.time.now;
        if (now - (this.laneChangedAt || 0) < 60) return;
        this.laneChangedAt = now;

        if (this.laneTween) { this.laneTween.stop(); this.laneTween = null; }

        this.moving = true;
        this.lane = nl;
        this.moveDir = d;

        if (this.selectedCar === 'scooter') {
            const leanAngle   = d * 0.28;
            const settleAngle = [0.26, 0, -0.26][nl];
            this.laneTween = this.tweens.add({
                targets: this,
                px: laneX(nl),
                carRot: leanAngle,
                duration: 160,
                ease: 'Sine.easeOut',
                onComplete: () => {
                    this.moving = false;
                    this.laneTween = null;
                    this.tweens.add({
                        targets: this,
                        carRot: settleAngle,
                        duration: 420,
                        ease: 'Sine.easeOut'
                    });
                }
            });
        } else {
            const laneRot = [0.26, 0, -0.26];
            this.laneTween = this.tweens.add({
                targets: this,
                px: laneX(nl),
                carRot: laneRot[nl],
                duration: 140,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                    this.moving = false;
                    this.laneTween = null;
                }
            });
        }
    }

    update(time, delta) {
        if (this.over) return;
        const dt = delta / 1000;
        if (this.shieldT > 0) this.shieldT = Math.max(0, this.shieldT - dt);
        this.drawShield(time);

        const ld = this.keys.left.isDown, rd = this.keys.right.isDown;
        if (ld && !this.lk) this.go(-1);
        if (rd && !this.rk) this.go(1);
        this.lk = ld; this.rk = rd;

        this.dist   += this.spd * dt;
        this.spd     = Math.min(1800, 350 + Math.sqrt(this.score) * 8);

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            // Trigger rush only if lane is clear of obstacles and no other enemy is already rushing
            const anyRushing = this.enemies.some(o => o !== e && o.rushPhase !== 'idle');
            const obstacleClear = !this.obstacles.some(o => o.lane === e.lane && o.z > 280 && o.z < 1400);
            if (e.willRush && e.rushPhase === 'idle' && e.z >= 310 && e.z <= 430 && !anyRushing && obstacleClear) {
                e.willRush = false;
                e.rushPhase = 'accel';
                e.rushT = 0;
            }

            if (e.rushPhase !== 'idle') {
                e.rushT += dt;
                if (e.rushPhase === 'accel') {
                    // briefly lurches forward (z increases)
                    e.speedMul = 1.0 - Math.min(1, e.rushT / 0.4) * 1.4; // 1.0 → -0.4
                    if (e.rushT >= 0.4) { e.rushPhase = 'stop'; e.rushT = 0; }
                } else if (e.rushPhase === 'stop') {
                    // almost stopped — player passes it
                    e.speedMul = 0.04;
                    if (e.rushT >= 2.8) { e.rushPhase = 'idle'; e.rushT = 0; e.speedMul = 1.0; }
                }
            }
            e.z = Math.min(Z_FAR - 1, e.z - this.spd * e.speedMul * dt);
            let enemyRemoved = false;
            if (e.z < 80) {
                e.sprite.destroy();
                this.enemies.splice(i, 1);
                enemyRemoved = true;
            }
            // Crash: obstacle hits stopped enemy during rush
            if (!enemyRemoved && e.rushPhase === 'stop') {
                for (let oi = this.obstacles.length - 1; oi >= 0; oi--) {
                    const o = this.obstacles[oi];
                    if (o.lane === e.lane && Math.abs(e.z - o.z) < 130) {
                        this.showEnemyCrash(e.sprite, e.z, e.lane);
                        o.sprite.destroy();
                        this.obstacles.splice(oi, 1);
                        this.enemies.splice(i, 1);
                        break;
                    }
                }
            }
        }
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            this.obstacles[i].z -= this.spd * dt;
            if (this.obstacles[i].z < 80) {
                this.obstacles[i].sprite.destroy();
                this.obstacles.splice(i, 1);
            }
        }
        // Spawn skid marks while changing lane
        if (this.moving) {
            this.skidMarks.push({
                cx: this.px,
                lx: this.px - 62, rx: this.px + 62, y:  H - 128,
                flx: this.px - 48, frx: this.px + 48, fy: H - 195,
                alpha: 0.72,
                twoWheel: this.selectedCar === 'scooter'
            });
        }

        // Scroll marks with road perspective and fade
        for (let i = this.skidMarks.length - 1; i >= 0; i--) {
            const m = this.skidMarks[i];
            const dy  = m.y  - HORIZON_Y;
            const dyf = m.fy - HORIZON_Y;
            m.y  += (CAM_H * FOCAL * this.spd * dt) / (dy  * dy);
            m.fy += (CAM_H * FOCAL * this.spd * dt) / (dyf * dyf);
            m.alpha -= dt * 1.2;
            if (m.alpha <= 0 || m.y > H + 10) this.skidMarks.splice(i, 1);
        }

        for (let i = this.trees.length - 1; i >= 0; i--) {
            this.trees[i].z -= this.spd * dt;
            if (this.trees[i].z < Z_NEAR - 120) {
                this.trees[i].sprite.setVisible(false).setData('used', false);
                this.trees.splice(i, 1);
            }
        }

        for (let i = this.energies.length - 1; i >= 0; i--) {
            const ec = this.energies[i];
            ec.z -= this.spd * dt;
            if (ec.z < Z_NEAR - 150) {
                ec.sprite.destroy();
                this.energies.splice(i, 1);
                continue;
            }
            if (!ec.collected && ec.z < Z_NEAR + 130 && ec.lane === this.lane) {
                ec.collected = true;
                ec.sprite.setVisible(false);
                this.playSfx('energyBeat', { volume: 0.25 });
                this.energy++;
                this.tEn.setText(': ' + this.energy);
                const prev = parseInt(localStorage.getItem('evspeed_energy') || '0');
                localStorage.setItem('evspeed_energy', prev + 1);
                const sp = proj(LANE_CENTERS[ec.lane], Math.max(ec.z, 1));
                for (let k = 0; k < 12; k++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 80 + Math.random() * 160;
                    this.sparks.push({
                        x: sp.x, y: sp.y,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed - 60,
                        life: 1.0,
                        size: 1.5 + Math.random() * 2.5,
                        white: Math.random() < 0.3
                    });
                }
            }
        }

        for (let i = this.powerupItems.length - 1; i >= 0; i--) {
            const pu = this.powerupItems[i];
            pu.z -= this.spd * dt;
            if (pu.z < Z_NEAR - 150) {
                if (pu.sprite) pu.sprite.destroy();
                this.powerupItems.splice(i, 1);
                continue;
            }
            if (!pu.collected && pu.z < Z_NEAR + 130 && pu.lane === this.lane) {
                pu.collected = true;
                if (pu.sprite) pu.sprite.setVisible(false);
                this.powerups[pu.type]++;
                this.updatePowerupBtns();
                const sp = proj(LANE_CENTERS[pu.lane], Math.max(pu.z, 1));
                for (let k = 0; k < 18; k++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 90 + Math.random() * 200;
                    this.sparks.push({
                        x: sp.x, y: sp.y,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed - 80,
                        life: 1.0,
                        size: 2.5 + Math.random() * 3.5,
                        white: pu.type === 'megaBomb'
                    });
                }
            }
        }
        if (this.puFlashT > 0) this.puFlashT -= dt;
        if (this.puBombT  > 0) this.puBombT  -= dt;

        for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
            const e = this.enemies[ei];
            const smallCar = this.selectedCar === 'evS' || this.selectedCar === 'modelY';
            const playerW = smallCar ? 26 : this.selectedCar === 'evX' ? 18 : this.selectedCar === 'cbt' ? 14 : this.selectedCar === 'scooter' ? 16 : 10;
            // Stop-phase enemies sit at z≈350-400 which projects above the normal y-bounds.
            // Use z+x proximity so the player must actually reach the car horizontally.
            if (e.rushPhase === 'stop' && e.z <= Z_NEAR + 200) {
                const sp = proj(LANE_CENTERS[e.lane], Math.max(e.z, 1));
                if (Math.abs(this.px - sp.x) < e.hitHalfW * sp.s + playerW) {
                    if (this.shieldT > 0) {
                        this.showEnemyCrash(e.sprite, e.z, e.lane);
                        this.enemies.splice(ei, 1);
                        continue;
                    }
                    this.die(); return;
                }
            }
            const ep   = proj(LANE_CENTERS[e.lane], Math.max(e.z, 1));
            const enemyTop = ep.y - e.hitTop * ep.s;
            const enemyBottom = ep.y + e.hitBottom * ep.s;
            const frontBound = smallCar ? H - 222 : this.selectedCar === 'evX' ? H - 218 : this.selectedCar === 'cbt' ? H - 212 : this.selectedCar === 'scooter' ? H - 216 : H - 205;
            if (enemyBottom < frontBound || enemyTop > H - 115) continue;
            const hw = e.hitHalfW * ep.s + playerW;
            if (Math.abs(this.px - ep.x) < hw) {
                if (this.shieldT > 0) {
                    this.showEnemyCrash(e.sprite, e.z, e.lane);
                    this.enemies.splice(ei, 1);
                    continue;
                }
                this.die(); return;
            }
        }
        for (let oi = this.obstacles.length - 1; oi >= 0; oi--) {
            const o = this.obstacles[oi];
            const op = proj(LANE_CENTERS[o.lane], Math.max(o.z, 1));
            if (op.y + 20 * op.s < (this.selectedCar === 'cbt' ? H - 212 : this.selectedCar === 'scooter' ? H - 216 : H - 205) || op.y - 20 * op.s > H - 89) continue;
            if (Math.abs(this.px - op.x) < 32 * op.s + 20) {
                if (this.shieldT > 0) {
                    this.showObstacleClear(o.sprite, o.z, o.lane);
                    this.obstacles.splice(oi, 1);
                    continue;
                }
                this.die(); return;
            }
        }

        for (let i = this.sparks.length - 1; i >= 0; i--) {
            const sk = this.sparks[i];
            sk.x  += sk.vx * dt;
            sk.y  += sk.vy * dt;
            sk.vy += 260 * dt;
            sk.life -= dt * 2.8;
            if (sk.life <= 0) this.sparks.splice(i, 1);
        }

        this.tSc.setText('SCORE: ' + this.score);
        this.tSp.setText(Math.min(200, Math.floor(100 + (this.spd - 350) / 5)) + ' KM/H');

        // Continuous sunset → night → sunrise cycle.
        this.dayCycleT = (this.dayCycleT + dt / DAY_CYCLE_SECONDS) % 1;
        const day = sampleDayCycle(this.dayCycleT);
        this.wSky     = day.sky;
        this.wGrass   = day.grass;
        this.wNight   = day.night;
        this.sunX     = day.sunX;
        this.sunY     = day.sunY;
        this.sunAlpha = day.sunAlpha;
        this.sunColor = day.sun;

        this.redraw();
    }

    drawMountainRidge(g, baseY, topY, color, seed, alpha, valleyDepth = 0) {
        const step = 30;
        g.fillStyle(color, alpha);
        g.beginPath();
        g.moveTo(-step, baseY);
        for (let x = -step; x <= W + step; x += step) {
            const broadShape = Math.sin((x + seed * 23) * 0.018) * 14;
            const crag = (hash01(seed * 101 + x) - 0.5) * 25;
            const centreValley = Math.max(0, 1 - Math.abs(x - W / 2) / 125) * valleyDepth;
            g.lineTo(x, topY + broadShape + crag + centreValley);
        }
        g.lineTo(W + step, baseY);
        g.closePath();
        g.fillPath();

        // Sparse highlights suggest rock faces without outlining the whole ridge.
        const highlight = lerpColor(color, 0xb9c8bd, 0.15);
        g.fillStyle(highlight, alpha * 0.22);
        for (let x = 5; x < W; x += 72) {
            const peakY = topY + Math.sin((x + seed * 23) * 0.018) * 14 +
                (hash01(seed * 101 + x) - 0.5) * 25 +
                Math.max(0, 1 - Math.abs(x - W / 2) / 125) * valleyDepth;
            g.fillTriangle(x, peakY + 3, x + 12, peakY + 24, x + 4, peakY + 18);
        }
    }

    drawDetailedPine(g, x, baseY, h, baseCol, night, seed, alpha = 1) {
        const trunkW = Math.max(1.2, h * 0.045);
        const trunkCol = lerpColor(0x4b3422, 0x120b08, night);
        const shadowCol = lerpColor(baseCol, 0x000000, 0.34);
        const lightCol = lerpColor(baseCol, night > 0.45 ? 0x23384a : 0x8fbf72, 0.20);

        g.fillStyle(trunkCol, alpha);
        g.fillRect(x - trunkW / 2, baseY - h * 0.34, trunkW, h * 0.36);

        // Overlapping, slightly irregular branch shelves read much more like a
        // conifer than three perfectly even triangles.
        for (let tier = 0; tier < 6; tier++) {
            const jitter = (hash01(seed * 17 + tier * 7) - 0.5) * h * 0.018;
            const topY = baseY - h + tier * h * 0.125;
            const bottomY = topY + h * (0.24 + tier * 0.018);
            const halfW = h * (0.095 + tier * 0.025) * (0.90 + hash01(seed + tier * 13) * 0.16);
            const cx = x + jitter;

            g.fillStyle(shadowCol, alpha);
            g.fillTriangle(cx, topY, cx - halfW, bottomY, cx + halfW, bottomY);
            g.fillStyle(lightCol, alpha * 0.78);
            g.fillTriangle(cx - 0.5, topY + 1, cx - halfW, bottomY, cx - halfW * 0.04, bottomY);
            g.fillStyle(baseCol, alpha * 0.92);
            g.fillTriangle(cx, topY + 2, cx, bottomY, cx + halfW, bottomY);
        }

        // Fine crown and a few low branch tips break the geometric silhouette.
        g.fillStyle(lightCol, alpha * 0.72);
        g.fillTriangle(x, baseY - h * 1.04, x - h * 0.045, baseY - h * 0.82, x + h * 0.025, baseY - h * 0.82);
        g.fillStyle(shadowCol, alpha * 0.8);
        g.fillTriangle(x, baseY - h * 0.34, x - h * 0.18, baseY - h * 0.08, x + h * 0.18, baseY - h * 0.08);
    }

    drawPseudoBuilding(g, bx, by, bw, bh, night, seed) {
        const side = 7 + hash01(seed + 5) * 4;
        const frontTop = lerpColor(0x87939a, 0x1a2634, night);
        const frontBottom = lerpColor(0x505d64, 0x0a111c, night);
        const sideCol = lerpColor(0x38464d, 0x050a12, night);
        const roofCol = lerpColor(0xaab4b8, 0x273546, night);

        // Grounding shadow, shaded side plane and a shallow perspective roof.
        g.fillStyle(0x07100c, 0.26);
        g.fillEllipse(bx + bw * 0.55, by + 2, bw + side + 12, 8);
        g.fillStyle(sideCol, 1);
        g.fillTriangle(bx + bw, by - bh, bx + bw + side, by - bh - 6, bx + bw + side, by);
        g.fillTriangle(bx + bw, by - bh, bx + bw + side, by, bx + bw, by);
        g.fillGradientStyle(frontTop, frontTop, frontBottom, frontBottom, 1);
        g.fillRect(bx, by - bh, bw, bh);
        g.fillStyle(roofCol, 1);
        g.fillTriangle(bx, by - bh, bx + side, by - bh - 6, bx + bw + side, by - bh - 6);
        g.fillTriangle(bx, by - bh, bx + bw + side, by - bh - 6, bx + bw, by - bh);

        // Recessed windows and occasional balcony/roof equipment add scale.
        const windowGlow = night > 0.30 ? 0xffd58a : 0xb9d9dc;
        const rows = Math.max(2, Math.floor((bh - 12) / 12));
        for (let row = 0; row < rows; row++) {
            const wy = by - bh + 10 + row * 12;
            for (let wx = bx + 6; wx < bx + bw - 4; wx += 9) {
                if (hash01(seed * 31 + wx + row * 9) > 0.24) {
                    g.fillStyle(0x071018, 0.62);
                    g.fillRect(wx - 1, wy - 1, 5, 7);
                    g.fillStyle(windowGlow, 0.28 + night * 0.67);
                    g.fillRect(wx, wy, 3, 5);
                }
            }
        }
        if (hash01(seed + 90) > 0.45) {
            g.fillStyle(sideCol, 1);
            g.fillRect(bx + bw * 0.46, by - bh - 11, 2, 6);
            g.fillStyle(roofCol, 1);
            g.fillRect(bx + bw * 0.36, by - bh - 6, bw * 0.22, 3);
        }
    }

    drawBuildingNightLights(g, bx, by, bw, bh, night, seed) {
        const intensity = smoothstep((night - 0.16) / 0.54);
        if (intensity <= 0) return;

        const rows = Math.max(2, Math.floor((bh - 12) / 12));
        for (let row = 0; row < rows; row++) {
            const wy = by - bh + 10 + row * 12;
            for (let wx = bx + 6; wx < bx + bw - 4; wx += 9) {
                if (hash01(seed * 31 + wx + row * 9) > 0.24) {
                    // Soft halo is rendered above the global night tint, followed
                    // by a warm, sharp window core.
                    g.fillStyle(0xffc45e, intensity * 0.075);
                    g.fillCircle(wx + 1.5, wy + 2.5, 5.5);
                    g.fillStyle(0xffd98a, intensity * 0.88);
                    g.fillRect(wx, wy, 3, 5);
                    g.fillStyle(0xfff1bf, intensity * 0.65);
                    g.fillRect(wx, wy, 1, 4);
                }
            }
        }
    }

    redraw() {
        // Objects emerge from fog: invisible inside fog, fully visible by y=260
        const fogFade = (py) => smoothstep((py - HORIZON_Y - 30) / 50);

        this.gBg.clear();
        this.gSkyFx.clear();
        this.gHill.clear();
        this.gRoad.clear();
        this.gFog.clear();
        this.gCity.clear();
        this.gEnv.clear();
        this.gNight.clear();
        this.gHorizonLights.clear();
        this.gCar.clear();

        // Sky
        this.gBg.fillStyle(this.wSky, 1);
        this.gBg.fillRect(0, 0, W, HORIZON_Y);

        // Stars fade in only after dusk. Their deterministic positions avoid
        // flicker while a tiny phase-based pulse keeps the night sky alive.
        const starAlpha = smoothstep((this.wNight - 0.38) / 0.52);
        if (starAlpha > 0) {
            for (let i = 0; i < 34; i++) {
                const sx = 12 + hash01(2100 + i * 7) * (W - 24);
                const sy = 14 + hash01(3100 + i * 11) * (HORIZON_Y - 32);
                const twinkle = 0.62 + 0.38 * Math.sin(this.dayCycleT * Math.PI * 2 * (2 + hash01(i + 91)) + i);
                const sa = starAlpha * (0.28 + hash01(4100 + i * 13) * 0.60) * twinkle;
                this.gSkyFx.fillStyle(i % 7 === 0 ? 0xbfdcff : 0xffffff, sa);
                this.gSkyFx.fillCircle(sx, sy, i % 9 === 0 ? 1.35 : 0.8);
            }
        }

        // Layered glow keeps the sun crisp in the centre while giving it a
        // natural atmospheric halo near sunset and sunrise. The mountains have
        // greater depth, so the disc genuinely disappears behind their ridge.
        const visibleSunAlpha = this.sunAlpha * (1 - this.wNight * 0.28);
        if (visibleSunAlpha > 0.002) {
            const lowSun = smoothstep((this.sunY - 72) / 100);
            const outerRadius = 42 + lowSun * 18;
            this.gSkyFx.fillStyle(this.sunColor, visibleSunAlpha * (0.035 + lowSun * 0.025));
            this.gSkyFx.fillCircle(this.sunX, this.sunY, outerRadius);
            this.gSkyFx.fillStyle(this.sunColor, visibleSunAlpha * 0.075);
            this.gSkyFx.fillCircle(this.sunX, this.sunY, 29 + lowSun * 8);
            this.gSkyFx.fillStyle(this.sunColor, visibleSunAlpha * 0.16);
            this.gSkyFx.fillCircle(this.sunX, this.sunY, 19 + lowSun * 4);
            this.gSkyFx.fillStyle(this.sunColor, visibleSunAlpha * (0.05 + lowSun * 0.06));
            this.gSkyFx.fillEllipse(this.sunX, Math.min(this.sunY + 3, HORIZON_Y - 2), 150 + lowSun * 70, 25 + lowSun * 16);
            this.gSkyFx.fillStyle(lerpColor(this.sunColor, 0xffffff, 0.55), visibleSunAlpha);
            this.gSkyFx.fillCircle(this.sunX, this.sunY, 10.5 + lowSun * 1.5);
            this.gSkyFx.fillStyle(0xffffff, visibleSunAlpha * 0.62);
            this.gSkyFx.fillCircle(this.sunX - 2.5, this.sunY - 2.5, 5.5);
        }

        // Grass
        this.gBg.fillStyle(this.wGrass, 1);
        this.gBg.fillRect(0, HORIZON_Y, W, H - HORIZON_Y);

        // Fog uses exact sky color so the top edge is seamless with the sky background.
        // Sky-colored haze over the road gives realistic atmospheric perspective.
        const fogColor = this.wSky;
        this.gFog.fillGradientStyle(fogColor, fogColor, fogColor, fogColor, 0, 0, 0.92, 0.92);
        this.gFog.fillRect(0, HORIZON_Y, W, 30);       // y=180→210: alpha 0→92%
        this.gFog.fillGradientStyle(fogColor, fogColor, fogColor, fogColor, 0.92, 0.92, 0, 0);
        this.gFog.fillRect(0, HORIZON_Y + 30, W, 35);  // y=210→245: alpha 92→0%

        // Layered high-resolution pseudo-3D environment. Mountains stay fixed;
        // the split city banks below move through projected world depth.
        const ni = this.wNight;
        const environmentTint = lerpColor(0xffffff, this.wSky, 0.14);
        this.mountainLayer
            .setPosition(W / 2, HORIZON_Y + 60)
            .setTint(environmentTint)
            .setAlpha(0.96 - ni * 0.08);
        const cityTint = lerpColor(0xffffff, this.wSky, 0.10);
        const cityAlpha = 1 - ni * 0.05;

        // Perspective city banks. They begin fully hidden on the far side of
        // the uphill crest, then rise into view while continuing to grow and
        // spread away from the vanishing point as they approach the camera.
        const renderedCityLayers = [];
        const citySpacing = CITY_LAYER_SPAN / CITY_LAYER_COUNT;
        const cityTravel = ((this.dist * CITY_LAYER_SCROLL) % CITY_LAYER_SPAN + CITY_LAYER_SPAN) % CITY_LAYER_SPAN;
        for (const layer of this.cityDepthLayers) {
            const layerTravel = (cityTravel + layer.index * citySpacing) % CITY_LAYER_SPAN;
            const z = CITY_LAYER_FAR_Z - layerTravel;
            const p = proj(0, z);
            const bankScale = (CITY_LAYER_NEAR_Z / z) * layer.variant.size;
            const bankH = CITY_BANK_H * bankScale;
            const spread = (ROAD_HW + layer.variant.side) * p.s;
            const leftX = W / 2 - spread;
            const rightX = W / 2 + spread;
            const travelledFromFar = CITY_LAYER_FAR_Z - z;
            // Asymptotic rise avoids a hard 100% cutoff: the hill emergence
            // blends continuously into the normal perspective-forward motion.
            const hillReveal = Math.tanh(
                Math.max(0, travelledFromFar) / CITY_HILL_REVEAL_DISTANCE
            );
            const crestY = hillCrestY(leftX);
            const rootBurial = Math.max(2, 10 * bankScale);
            const projectedGround = p.y + layer.variant.ground * p.s + rootBurial;
            const groundY = Math.max(crestY + rootBurial, projectedGround);
            const bankBottom = groundY + (1 - hillReveal) * bankH;
            const farFade = smoothstep((CITY_LAYER_FAR_Z - z) / 190);
            const nearFade = smoothstep((z - CITY_LAYER_NEAR_Z) / 120);
            const atmosphere = 0.58 + 0.42 * smoothstep((CITY_LAYER_FAR_Z - z) / 950);
            const alpha = cityAlpha * farFade * nearFade * atmosphere;
            const depthT = 1 - (z - CITY_LAYER_NEAR_Z) / CITY_LAYER_SPAN;
            const haze = Math.max(0, Math.min(0.34, (1 - depthT) * 0.34));
            const layerTint = lerpColor(cityTint, this.wSky, haze);
            const depth = 0.42 + depthT * 0.42;

            layer.left
                .setVisible(alpha > 0.004)
                .setPosition(leftX, bankBottom)
                .setScale(bankScale)
                .setTint(layerTint)
                .setAlpha(alpha)
                .setDepth(depth);
            layer.right
                .setVisible(alpha > 0.004)
                .setPosition(rightX, bankBottom)
                .setScale(bankScale)
                .setTint(layerTint)
                .setAlpha(alpha)
                .setDepth(depth);

            if (alpha > 0.004) {
                renderedCityLayers.push({
                    leftX,
                    rightX,
                    bottom: bankBottom,
                    height: bankH,
                    scale: bankScale,
                    alpha,
                    swapped: layer.variant.swapped,
                    z,
                    groundY,
                    reveal: hillReveal,
                });
            }
        }

        // Foreground crest occludes the unrevealed part of every city bank.
        // Its gentle crown follows the uphill road and the global horizon fog
        // softens the seam, so buildings appear to emerge from behind terrain.
        this.gHill.fillStyle(this.wGrass, 1);
        this.gHill.beginPath();
        this.gHill.moveTo(0, hillCrestY(0));
        for (let x = 16; x <= W; x += 16) {
            this.gHill.lineTo(x, hillCrestY(x));
        }
        this.gHill.lineTo(W, H);
        this.gHill.lineTo(0, H);
        this.gHill.closePath();
        this.gHill.fillPath();

        // A small extra haze bank only at the roots of distant tree rows.
        // It blends them into the raised terrain without fogging the road centre
        // or washing out the nearer scenery.
        for (const city of renderedCityLayers) {
            if (city.z < 1500) continue;
            const distanceFog = smoothstep((city.z - 1500) / 700);
            const fogAlpha = 0.16 * distanceFog * city.alpha * city.reveal;
            if (fogAlpha < 0.004) continue;

            const leftGap = city.swapped ? CITY_RIGHT_INNER_GAP : CITY_LEFT_INNER_GAP;
            const rightGap = city.swapped ? CITY_LEFT_INNER_GAP : CITY_RIGHT_INNER_GAP;
            const leftEnd = Math.max(0, Math.min(W, city.leftX - leftGap * city.scale));
            const rightStart = Math.max(0, Math.min(W, city.rightX + rightGap * city.scale));
            const fogHalfH = Math.max(6, 13 * city.scale);

            this.gFog.fillGradientStyle(
                fogColor, fogColor, fogColor, fogColor,
                0, 0, fogAlpha, fogAlpha
            );
            this.gFog.fillRect(0, city.groundY - fogHalfH, leftEnd, fogHalfH);
            this.gFog.fillRect(rightStart, city.groundY - fogHalfH, W - rightStart, fogHalfH);
            this.gFog.fillGradientStyle(
                fogColor, fogColor, fogColor, fogColor,
                fogAlpha, fogAlpha, 0, 0
            );
            this.gFog.fillRect(0, city.groundY, leftEnd, fogHalfH);
            this.gFog.fillRect(rightStart, city.groundY, W - rightStart, fogHalfH);

            // Rounded inner caps prevent a visible vertical edge where the
            // localized root fog meets the clear road opening.
            this.gFog.fillStyle(fogColor, fogAlpha * 0.55);
            this.gFog.fillEllipse(leftEnd, city.groundY, fogHalfH * 2.4, fogHalfH * 1.6);
            this.gFog.fillEllipse(rightStart, city.groundY, fogHalfH * 2.4, fogHalfH * 1.6);
        }

        // Emissive window layer remains visible above the global night tint.
        const windowGlow = smoothstep((ni - 0.16) / 0.52);
        if (windowGlow > 0) {
            // Window glows use normalized coordinates so they remain attached
            // to each moving building row at every perspective scale.
            const lightRegions = [
                { bank: 'left',  sourceX: 217, cols: 3, rows: 4 },
                { bank: 'right', sourceX: 803, cols: 3, rows: 4 },
            ];
            for (let li = 0; li < renderedCityLayers.length; li++) {
                const city = renderedCityLayers[li];
                const top = city.bottom - city.height;
                for (let ri = 0; ri < lightRegions.length; ri++) {
                    const region = lightRegions[ri];
                    const innerDistance = region.bank === 'left'
                        ? (city.swapped ? 803 : CITY_BANK_W - region.sourceX)
                        : (city.swapped ? 869 : region.sourceX);
                    for (let row = 0; row < region.rows; row++) {
                        for (let col = 0; col < region.cols; col++) {
                            if (hash01(1500 + li * 300 + ri * 100 + row * 11 + col) < 0.38) continue;
                            const wx = region.bank === 'left'
                                ? city.leftX - (innerDistance - col * 27) * city.scale
                                : city.rightX + (innerDistance + col * 27) * city.scale;
                            const wy = top + (138 + row * 46) * city.scale;
                            if (wx < -10 || wx > W + 10 || wy < -10 || wy > H + 10) continue;
                            const glowAlpha = windowGlow * city.alpha;
                            const windowW = Math.max(1, 12 * city.scale);
                            const windowH = Math.max(1.5, 19 * city.scale);
                            if (wy + windowH >= hillCrestY(wx)) continue;
                            this.gHorizonLights.fillStyle(0xffc45e, glowAlpha * 0.10);
                            this.gHorizonLights.fillCircle(
                                wx + windowW / 2,
                                wy + windowH / 2,
                                Math.max(2, 19 * city.scale)
                            );
                            this.gHorizonLights.fillStyle(0xffdfa0, glowAlpha * 0.90);
                            this.gHorizonLights.fillRect(wx, wy, windowW, windowH);
                        }
                    }
                }
            }
        }



        // Road scanlines. Safe flicker thresholds (dz/scanline < 0.5*period):
        //   road stripes (p=120): dy>74   curbs (p=60): dy>104
        //   grass t4 (p=130): dy>71       grass t3 (p=51): dy>113
        const Z_ROAD_MAX = 1800;
        const g = this.gRoad;
        for (let y = HORIZON_Y + 30; y < H; y += SCAN) {
            const dy = y - HORIZON_Y;
            // Invert the elevated-road projection iteratively so every screen
            // scanline remains continuous while the far section climbs uphill.
            let z = (FOCAL * CAM_H) / dy;
            for (let hi = 0; hi < 4; hi++) {
                z = (FOCAL * CAM_H) / (dy + roadHillLift(z));
            }
            if (z > Z_ROAD_MAX) continue;
            const sc = FOCAL / z;
            const hw = ROAD_HW * sc;
            const cx = W / 2;

            // Road surface: alternating stripes where stable, solid blend near horizon
            if (dy > 74) {
                const seg = (Math.floor((z + this.dist) / 120) & 1);
                g.fillStyle(seg ? 0x606060 : 0x4e4e4e, 1);
            } else {
                g.fillStyle(0x565656, 1);
            }
            g.fillRect(cx - hw, y, hw * 2, SCAN);

            const cw = Math.max(SCAN, hw * 0.07);

            // Curbs: period 60 where stable (dy>105), wider period 180 in far zone (dy>60)
            if (dy > 105) {
                const cseg = (Math.floor((z + this.dist) / 60) & 1);
                g.fillStyle(cseg ? 0xffffff : 0xdd1111, 1);
            } else {
                const cseg = (Math.floor((z + this.dist) / 180) & 1);
                g.fillStyle(cseg ? 0xffffff : 0xdd1111, 1);
            }
            g.fillRect(cx - hw - cw, y, cw, SCAN);
            g.fillRect(cx + hw,      y, cw, SCAN);

            // Side ground texture: use stable frequencies per zone
            const zd = z + this.dist;
            if (dy > 113) {
                const t3 = (Math.floor(zd / 51)  & 1);
                const t4 = (Math.floor(zd / 130) & 1);
                if (this.theme === 'city') {
                    g.fillStyle(t4 ? 0x787e86 : t3 ? 0x72787e : 0x6a7078, 1);
                } else {
                    const gc = this.wGrass;
                    g.fillStyle(t4 ? lerpColor(gc, 0x000000, 0.11) : t3 ? lerpColor(gc, 0x000000, 0.06) : gc, 1);
                }
            } else if (dy > 71) {
                const t4 = (Math.floor(zd / 130) & 1);
                if (this.theme === 'city') {
                    g.fillStyle(t4 ? 0x787e86 : 0x6a7078, 1);
                } else {
                    const gc = this.wGrass;
                    g.fillStyle(t4 ? lerpColor(gc, 0x000000, 0.11) : gc, 1);
                }
            } else {
                g.fillStyle(this.theme === 'city' ? 0x6a7078 : this.wGrass, 1);
            }
            g.fillRect(0,            y, cx - hw - cw, SCAN);
            g.fillRect(cx + hw + cw, y, W - (cx + hw + cw), SCAN);

            // Lane dashes
            const ph = ((z + this.dist) % DASH_P + DASH_P) % DASH_P;
            if (ph < DASH_LEN) {
                g.fillStyle(0xffffff, 1);
                const dw = Math.max(1, 3 * sc);
                for (let d = 1; d < 3; d++) {
                    const lw = (LANE_CENTERS[d - 1] + LANE_CENTERS[d]) / 2 * sc;
                    g.fillRect(cx + lw - dw, y, dw * 2, SCAN);
                }
            }
        }

        // Night overlay — blue tint deepens toward full night
        if (this.wNight > 0) {
            const ovCol = lerpColor(0x000818, 0x00082e, this.wNight);
            this.gNight.fillStyle(ovCol, this.wNight * 0.65);
            this.gNight.fillRect(0, 0, W, H);
        }

        // Realistic roadside lamps. The metal structure and ground light pool
        // stay inside the world lighting; only the warm LED bloom is emissive.
        const lampPower = smoothstep((this.wNight - 0.06) / 0.30);
        const LAMP_SPACING = 430;
        const lampTravel = ((this.dist % LAMP_SPACING) + LAMP_SPACING) % LAMP_SPACING;
        for (let zl = 105 + LAMP_SPACING - lampTravel; zl < Z_FAR; zl += LAMP_SPACING) {
            const pL = proj(-ROAD_HW - 24, zl);
            const pR = proj( ROAD_HW + 24, zl);
            if (pL.y < HORIZON_Y + 4 || pL.y > H + 65) continue;

            const visibility = fogFade(pL.y);
            if (visibility < 0.015) continue;

            const sides = [{ p: pL, dir: 1 }, { p: pR, dir: -1 }];
            for (const { p, dir } of sides) {
                const poleH = Math.max(9, 165 * p.s);
                const poleW = Math.max(0.85, 5.4 * p.s);
                const armLen = Math.max(4.2, 44 * p.s);
                const armDrop = Math.max(0.7, 6.5 * p.s);
                const topY = p.y - poleH;
                const bendX = p.x + dir * armLen * 0.48;
                const bendY = topY - armDrop * 0.35;
                const headX = p.x + dir * armLen;
                const headY = topY + armDrop;
                const poleAlpha = visibility * (0.72 + this.wNight * 0.18);

                // Small base collar and a tapered, double-stroked steel post.
                const baseW = Math.max(1.2, poleW * 2.1);
                const baseH = Math.max(1.5, 7 * p.s);
                this.gCity.fillStyle(0x20282d, poleAlpha);
                this.gCity.fillRect(p.x - baseW / 2, p.y - baseH, baseW, baseH);

                this.gCity.lineStyle(poleW + 0.8, 0x11181d, poleAlpha * 0.95);
                this.gCity.lineBetween(p.x, p.y - baseH, p.x, topY);
                this.gCity.lineBetween(p.x, topY, bendX, bendY);
                this.gCity.lineBetween(bendX, bendY, headX, headY);
                this.gCity.lineStyle(poleW, 0x66737b, poleAlpha);
                this.gCity.lineBetween(p.x, p.y - baseH, p.x, topY);
                this.gCity.lineBetween(p.x, topY, bendX, bendY);
                this.gCity.lineBetween(bendX, bendY, headX, headY);

                // Slim horizontal luminaire, instead of the old circular head.
                const headW = Math.max(3.5, 25 * p.s);
                const headH = Math.max(1.5, 7.5 * p.s);
                this.gCity.fillStyle(0x182126, poleAlpha);
                this.gCity.fillRoundedRect(
                    headX - headW / 2,
                    headY - headH / 2,
                    headW,
                    headH,
                    Math.min(2, headH / 2)
                );

                const lightAlpha = lampPower * visibility;
                if (lightAlpha < 0.01) continue;

                // Restrained amber bloom with a bright LED strip.
                this.gHorizonLights.fillStyle(0xffc76a, lightAlpha * 0.07);
                this.gHorizonLights.fillEllipse(
                    headX,
                    headY + headH * 0.35,
                    Math.max(4.5, 43 * p.s),
                    Math.max(2.8, 25 * p.s)
                );
                this.gHorizonLights.fillStyle(0xffd990, lightAlpha * 0.19);
                this.gHorizonLights.fillEllipse(
                    headX,
                    headY + headH * 0.35,
                    Math.max(3, 24 * p.s),
                    Math.max(1.8, 12 * p.s)
                );
                this.gHorizonLights.fillStyle(0xffe4a8, lightAlpha);
                this.gHorizonLights.fillRoundedRect(
                    headX - headW * 0.34,
                    headY,
                    headW * 0.68,
                    Math.max(0.8, headH * 0.36),
                    Math.min(1.5, headH * 0.18)
                );
                this.gHorizonLights.fillStyle(0xfff4cf, lightAlpha);
                this.gHorizonLights.fillCircle(
                    headX,
                    headY + headH * 0.22,
                    Math.max(0.65, 1.9 * p.s)
                );

                // A faint pool on the verge/road edge reads as illumination
                // without the opaque triangular beams used previously.
                if (p.y > HORIZON_Y + 34) {
                    const poolW = Math.max(8, 76 * p.s);
                    const poolH = Math.max(2.5, 20 * p.s);
                    this.gCity.fillStyle(0xffd27d, lightAlpha * 0.15);
                    this.gCity.fillEllipse(
                        p.x + dir * poolW * 0.16,
                        p.y + poolH * 0.18,
                        poolW,
                        poolH
                    );
                }
            }
        }

        // Trees (far → near)
        for (let ti = this.trees.length - 1; ti >= 0; ti--) {
            const t = this.trees[ti];
            if (t.z <= Z_NEAR || t.z > Z_FAR) continue;
            const p = proj(t.s * t.ox, t.z);
            if (p.y < HORIZON_Y || p.y > H + 100) continue;
            const fa = fogFade(p.y);
            if (fa < 0.02) continue;
            t.sprite.setVisible(false);
            if (t.isStone) {
                const br = Math.max(3, 20 * p.s);
                this.gEnv.fillStyle(lerpColor(0x356e18, 0x091506, ni), fa);
                this.gEnv.fillCircle(p.x, p.y - br * 0.55, br);
                this.gEnv.fillStyle(lerpColor(0x4a9222, 0x0c1c08, ni), fa * 0.7);
                this.gEnv.fillCircle(p.x - br * 0.35, p.y - br * 0.85, br * 0.62);
                continue;
            }
            const treeFa = fa;
            const th = Math.max(9, 95 * p.s);
            const tw = Math.max(2, 10 * p.s);
            const tr = Math.max(6, 40 * p.s);
            const foliageCY = p.y - th * 0.58;
            const trunkStart = foliageCY + tr;
            if (trunkStart < p.y) {
                this.gEnv.fillStyle(lerpColor(0x5a3e1e, 0x1a0e08, ni), treeFa);
                this.gEnv.fillRect(p.x - tw / 2, trunkStart, tw, p.y - trunkStart);
            }
            this.gEnv.fillStyle(lerpColor(0x2d6e1a, 0x0a1a06, ni), treeFa);
            this.gEnv.fillCircle(p.x, foliageCY, tr);
            this.gEnv.fillStyle(lerpColor(0x3d8a25, 0x0e2208, ni), treeFa * 0.75);
            this.gEnv.fillCircle(p.x - tr * 0.3, foliageCY - tr * 0.2, tr * 0.72);
        }

        // Enemy cars
        for (const e of this.enemies) {
            if (e.z <= 1 || e.z > Z_FAR) { e.sprite.setVisible(false); continue; }
            const p = proj(LANE_CENTERS[e.lane], e.z);
            if (p.y < HORIZON_Y || p.y > H + 80) { e.sprite.setVisible(false); continue; }
            const fa = fogFade(p.y);
            const laneRot = [0.26, 0, -0.26];
            e.sprite.setVisible(true)
                .setPosition(p.x, p.y)
                .setScale(p.s * e.renderScale)
                .setAlpha(fa)
                .setTint(0xffffff)
                .setRotation(laneRot[e.lane])
                .setDepth(3 - e.z / Z_FAR);
        }

        // Obstacles
        for (const o of this.obstacles) {
            if (o.z <= 1 || o.z > Z_FAR) { o.sprite.setVisible(false); continue; }
            const p = proj(LANE_CENTERS[o.lane], o.z);
            if (p.y < HORIZON_Y || p.y > H + 80) { o.sprite.setVisible(false); continue; }
            const fa = fogFade(p.y);
            o.sprite.setVisible(true)
                .setPosition(p.x, p.y)
                .setScale(p.s * (o.type === 'truck' ? 0.18 : 0.25))
                .setAlpha(fa)
                .setTint(0xffffff)
                .setDepth(3 - o.z / Z_FAR);
        }

        // Energy collectibles
        for (const ec of this.energies) {
            if (ec.collected || ec.z <= 1 || ec.z > Z_FAR) { ec.sprite.setVisible(false); continue; }
            const p = proj(LANE_CENTERS[ec.lane], ec.z);
            if (p.y < HORIZON_Y || p.y > H + 80) { ec.sprite.setVisible(false); continue; }
            const fa = fogFade(p.y);
            ec.sprite.setVisible(true)
                .setPosition(p.x, p.y)
                .setScale(p.s * 0.12)
                .setAlpha(fa)
                .setTint(0xffffff)
                .setDepth(2.9 - ec.z / Z_FAR);
        }

        // Power-up collectibles
        for (const pu of this.powerupItems) {
            if (pu.collected || pu.z <= 1 || pu.z > Z_FAR) continue;
            const p = proj(LANE_CENTERS[pu.lane], pu.z);
            if (p.y < HORIZON_Y || p.y > H + 80) continue;
            const fa = fogFade(p.y);
            const r = Math.max(7, 28 * p.s);
            if (pu.sprite) {
                const t     = this.time.now / 1000;
                const pulse = 1 + 0.18 * Math.sin(t * 5);
                if (pu.type === 'megaBomb') {
                    const sc = 0.42 * p.s * pulse;
                    pu.sprite.setVisible(true).setPosition(p.x, p.y).setScale(sc)
                        .setAlpha(fa).setTint(0xffffff)
                        .setAngle(Math.sin(t * 3) * 14);
                } else if (pu.type === 'shield') {
                    const sc = 0.05 * p.s * pulse;
                    pu.sprite.setVisible(true).setPosition(p.x, p.y).setScale(sc)
                        .setAlpha(fa).setTint(0xffffff).setAngle(0);
                } else {
                    const sc = 0.34 * p.s * pulse;
                    pu.sprite.setVisible(true).setPosition(p.x, p.y).setScale(sc)
                        .setAlpha(fa).setTint(0xffffff).setAngle(0);
                }
            }
        }

        // Spark particles from energy collection
        for (const sk of this.sparks) {
            const r = Math.max(0.5, sk.size * sk.life);
            this.gCar.fillStyle(sk.white ? 0xffffff : 0x00cfff, sk.life * 0.9);
            this.gCar.fillCircle(sk.x, sk.y, r);
            if (!sk.white) {
                this.gCar.fillStyle(0xffffff, sk.life * 0.5);
                this.gCar.fillCircle(sk.x, sk.y, r * 0.4);
            }
        }

        // Skid marks — twin thin lines per tyre (tyre-edge imprint)
        const skidCol = this.selectedCar === 'modelY' ? 0x777777 : this.selectedCar === 'evS' ? 0x003899 : this.selectedCar === 'cbt' ? 0x00cfff : this.selectedCar === 'scooter' ? 0xffee00 : 0x000000;
        const isEvS = this.selectedCar === 'evS';
        for (const m of this.skidMarks) {
            const pairs = m.twoWheel
                ? [[m.cx, m.y, 8], [m.cx, m.fy, 6]]
                : [[m.lx, m.y, 8], [m.rx, m.y, 8], [m.flx, m.fy, 6], [m.frx, m.fy, 6]];
            for (const [tx, ty, h] of pairs) {
                if (isEvS) {
                    this.gCar.fillStyle(0x000011, m.alpha * 0.45);
                    this.gCar.fillRect(tx - 3 + 1, ty - h / 2 + 1, 1.5, h);
                    this.gCar.fillRect(tx + 2 + 1, ty - h / 2 + 1, 1.5, h);
                }
                this.gCar.fillStyle(skidCol, m.alpha);
                this.gCar.fillRect(tx - 3, ty - h / 2, 1.5, h);
                this.gCar.fillRect(tx + 2, ty - h / 2, 1.5, h);
            }
        }

        // Power-up activation flash
        if (this.puFlashT > 0) {
            this.gCar.fillStyle(0x00aaff, Math.min(this.puFlashT / 0.4, 1) * 0.28);
            this.gCar.fillRect(0, HORIZON_Y, W, H - HORIZON_Y);
        }
        if (this.puBombT > 0) {
            this.gCar.fillStyle(0xff5500, Math.min(this.puBombT / 0.5, 1) * 0.42);
            this.gCar.fillRect(0, 0, W, H);
        }

        this.playerSprite.setX(this.px).setRotation(this.carRot);
    }

    drawCar(g, cx, cy, sc, col, alpha = 1) {
        const bw = 54 * sc, bh = 92 * sc;
        g.fillStyle(col, alpha);
        g.fillRect(cx - bw / 2, cy - bh / 2, bw, bh);
        g.fillStyle(0xaaddff, alpha);
        g.fillRect(cx - bw * 0.3, cy - bh * 0.44, bw * 0.6, bh * 0.28);
        g.fillStyle(0x111111, alpha);
        const wr = Math.max(3, 7 * sc);
        g.fillCircle(cx - bw * 0.44, cy - bh * 0.3, wr);
        g.fillCircle(cx + bw * 0.44, cy - bh * 0.3, wr);
        g.fillCircle(cx - bw * 0.44, cy + bh * 0.3, wr);
        g.fillCircle(cx + bw * 0.44, cy + bh * 0.3, wr);
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

    drawShield(time) {
        this.shieldGfx.clear();
        if (this.shieldT <= 0) {
            this.shieldTimeTxt.setText('');
            return;
        }
        const pulse = Math.sin(time * 0.008) * 3;
        const radius = 78 + pulse;
        const shieldY = H - 175;
        this.shieldGfx.fillStyle(0x00aaff, 0.10);
        this.shieldGfx.fillCircle(this.px, shieldY, radius);
        this.shieldGfx.lineStyle(5, 0x33ddff, 0.88);
        this.shieldGfx.strokeCircle(this.px, shieldY, radius);
        this.shieldGfx.lineStyle(2, 0xffffff, 0.65);
        this.shieldGfx.strokeCircle(this.px, shieldY, radius - 7);
        this.shieldTimeTxt.setText(`${this.shieldT.toFixed(1)}s`);
    }

    updatePowerupBtns() {
        const clrHas = this.powerups.clearLane > 0;
        const bmbHas = this.powerups.megaBomb  > 0;
        const shdHas = this.powerups.shield    > 0;

        this.puClrGfx.clear();
        this.puClrGfx.fillStyle(clrHas ? 0x003388 : 0x1a1a1a, 0.88);
        this.puClrGfx.fillCircle(45, H - 56, 26);
        this.puClrGfx.lineStyle(2, clrHas ? 0x00cfff : 0x334455, clrHas ? 1 : 0.5);
        this.puClrGfx.strokeCircle(45, H - 56, 26);

        this.puBmbGfx.clear();
        this.puBmbGfx.fillStyle(bmbHas ? 0x771100 : 0x1a1a1a, 0.88);
        this.puBmbGfx.fillCircle(105, H - 56, 26);
        this.puBmbGfx.lineStyle(2, bmbHas ? 0xff6600 : 0x443322, bmbHas ? 1 : 0.5);
        this.puBmbGfx.strokeCircle(105, H - 56, 26);

        this.puShdGfx.clear();
        this.puShdGfx.fillStyle(shdHas ? 0x064477 : 0x1a1a1a, 0.88);
        this.puShdGfx.fillCircle(165, H - 56, 26);
        this.puShdGfx.lineStyle(2, shdHas ? 0x33ddff : 0x334455, shdHas ? 1 : 0.5);
        this.puShdGfx.strokeCircle(165, H - 56, 26);

        this.puClrCnt.setText(clrHas ? `×${this.powerups.clearLane}` : '');
        this.puBmbCnt.setText(bmbHas ? `×${this.powerups.megaBomb}`  : '');
        this.puShdCnt.setText(shdHas ? `×${this.powerups.shield}` : '');
        this.puClrIcon.setAlpha(clrHas ? 1 : 0.35);
        this.puBmbIcon.setAlpha(bmbHas ? 1 : 0.35);
        this.puShdIcon.setAlpha(shdHas ? 1 : 0.35);
        this.puClrLbl.setAlpha(clrHas ? 1 : 0.35);
        this.puBmbLbl.setAlpha(bmbHas ? 1 : 0.35);
        this.puShdLbl.setAlpha(shdHas ? 1 : 0.35);
    }

    playSfx(key, config = {}) {
        if (localStorage.getItem('evspeed_sfx') === 'false') return;
        this.sound.play(key, config);
    }

    activateClearLane() {
        if (this.powerups.clearLane <= 0 || this.over || !this.started) return;
        this.powerups.clearLane--;
        localStorage.setItem('evspeed_pu_clear', this.powerups.clearLane);
        this.updatePowerupBtns();
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            if (this.enemies[i].lane === this.lane) {
                this.showEnemyCrash(this.enemies[i].sprite, this.enemies[i].z, this.enemies[i].lane);
                this.enemies.splice(i, 1);
            }
        }
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            if (this.obstacles[i].lane === this.lane) {
                this.showObstacleClear(this.obstacles[i].sprite, this.obstacles[i].z, this.obstacles[i].lane);
                this.obstacles.splice(i, 1);
            }
        }
        this.playSfx('lazerBeat', { volume: 0.7 });
        this.puFlashT = 0.5;
    }

    activateMegaBomb() {
        if (this.powerups.megaBomb <= 0 || this.over || !this.started) return;
        this.powerups.megaBomb--;
        localStorage.setItem('evspeed_pu_bomb', this.powerups.megaBomb);
        this.updatePowerupBtns();
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            this.showEnemyCrash(this.enemies[i].sprite, this.enemies[i].z, this.enemies[i].lane);
            this.enemies.splice(i, 1);
        }
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            this.showObstacleClear(this.obstacles[i].sprite, this.obstacles[i].z, this.obstacles[i].lane);
            this.obstacles.splice(i, 1);
        }
        this.cameras.main.shake(300, 0.015);
        this.playSfx('bombBeat', { volume: 0.7 });
        this.puBombT = 0.6;
    }

    activateShield() {
        if (this.powerups.shield <= 0 || this.over || !this.started) return;
        this.powerups.shield--;
        localStorage.setItem('evspeed_pu_shield', this.powerups.shield);
        this.shieldT = 12;
        this.updatePowerupBtns();
    }

    showObstacleClear(sprite, z, lane) {
        const p  = proj(LANE_CENTERS[lane], Math.max(z, 1));
        const ss = p.s;

        // Cyan impact flash
        const impact = this.add.graphics().setDepth(12);
        impact.fillStyle(0x00ddff, 0.85);
        impact.fillCircle(p.x, p.y, 32 * ss);
        this.tweens.add({ targets: impact, alpha: 0, duration: 200,
            onComplete: () => impact.destroy() });

        // Expanding cyan ring
        const ring = this.add.graphics().setDepth(11);
        ring.lineStyle(4 * ss, 0x00aaff, 1);
        ring.strokeCircle(p.x, p.y, 18 * ss);
        this.tweens.add({ targets: ring, scaleX: 4, scaleY: 4, alpha: 0,
            duration: 550, ease: 'Cubic.easeOut',
            onComplete: () => ring.destroy() });

        // Obstacle spins upward and fades
        this.tweens.add({
            targets: sprite,
            y: sprite.y - 90 * ss,
            rotation: sprite.rotation + Math.PI * 3,
            scaleX: 0.05, scaleY: 0.05,
            alpha: 0,
            duration: 700,
            ease: 'Cubic.easeOut',
            onComplete: () => sprite.destroy()
        });

        // Cyan sparks
        for (let k = 0; k < 10; k++) {
            const angle = Math.random() * Math.PI * 2;
            const dist  = (40 + Math.random() * 70) * ss;
            const spark = this.add.graphics().setDepth(12);
            spark.fillStyle(k % 2 === 0 ? 0x00ccff : 0xffffff, 1);
            spark.fillCircle(0, 0, (2 + Math.random() * 3) * ss);
            spark.setPosition(p.x, p.y);
            this.tweens.add({
                targets: spark,
                x: p.x + Math.cos(angle) * dist,
                y: p.y + Math.sin(angle) * dist,
                alpha: 0, scaleX: 0.1, scaleY: 0.1,
                duration: 400 + Math.random() * 300,
                ease: 'Cubic.easeOut',
                onComplete: () => spark.destroy()
            });
        }
    }

    showEnemyCrash(sprite, z, lane) {
        const ep = proj(LANE_CENTERS[lane], Math.max(z, 1));
        const sx = ep.x, sy = ep.y, ss = ep.s;

        // Camera shake on impact
        this.cameras.main.shake(250, 0.008);

        // Instant white impact flash
        const impact = this.add.graphics().setDepth(12);
        impact.fillStyle(0xffffff, 0.9);
        impact.fillCircle(sx, sy, 36 * ss);
        this.tweens.add({ targets: impact, alpha: 0, duration: 160,
            onComplete: () => impact.destroy() });

        // Expanding orange ring
        const ring = this.add.graphics().setDepth(11);
        ring.lineStyle(5 * ss, 0xff6600, 1);
        ring.strokeCircle(sx, sy, 20 * ss);
        this.tweens.add({ targets: ring, scaleX: 4, scaleY: 4, alpha: 0,
            duration: 600, ease: 'Cubic.easeOut',
            onComplete: () => ring.destroy() });

        // Car tumbles forward and fades (longer)
        this.tweens.add({
            targets: sprite,
            y: sprite.y + 60 * ss,
            rotation: sprite.rotation + Math.PI * 2.5,
            scaleX: 0.05, scaleY: 0.05,
            alpha: 0,
            duration: 900,
            ease: 'Cubic.easeIn',
            onComplete: () => sprite.destroy()
        });

        // Sparks (more, fly further)
        const sparkCols = [0xff8800, 0xffdd00, 0xff4400, 0xffffff];
        for (let k = 0; k < 14; k++) {
            const angle = Math.random() * Math.PI * 2;
            const dist  = (55 + Math.random() * 80) * ss;
            const spark = this.add.graphics().setDepth(12);
            spark.fillStyle(sparkCols[k % sparkCols.length], 1);
            spark.fillCircle(0, 0, (2 + Math.random() * 3.5) * ss);
            spark.setPosition(sx, sy);
            this.tweens.add({
                targets: spark,
                x: sx + Math.cos(angle) * dist,
                y: sy + Math.sin(angle) * dist,
                alpha: 0, scaleX: 0.1, scaleY: 0.1,
                duration: 500 + Math.random() * 350,
                ease: 'Cubic.easeOut',
                onComplete: () => spark.destroy()
            });
        }

        // Smoke puffs (linger longer)
        for (let k = 0; k < 5; k++) {
            const smoke = this.add.graphics().setDepth(10);
            smoke.fillStyle(0x999999, 0.5);
            smoke.fillCircle(0, 0, (11 + Math.random() * 9) * ss);
            smoke.setPosition(sx + (Math.random() - 0.5) * 26 * ss, sy);
            this.tweens.add({
                targets: smoke,
                scaleX: 3 + Math.random(),
                scaleY: 3 + Math.random(),
                alpha: 0,
                y: sy - (35 + Math.random() * 30) * ss,
                duration: 850 + Math.random() * 400,
                delay: k * 100,
                ease: 'Cubic.easeOut',
                onComplete: () => smoke.destroy()
            });
        }
    }

    die() {
        this.over = true;
        this.shieldT = 0;
        if (this.shieldGfx) this.shieldGfx.clear();
        if (this.shieldTimeTxt) this.shieldTimeTxt.setText('');

        const fl = this.add.graphics().setDepth(20);
        fl.fillStyle(0xff0000, 0.6);
        fl.fillRect(0, 0, W, H);
        this.tweens.add({ targets: fl, alpha: 0, duration: 500, ease: 'Power2' });

        if (this.mp) {
            if (this.mpPlayer === 1) {
                const p1Score = this.score;
                const box = this.add.graphics().setDepth(21);
                box.fillStyle(0x000000, 0.80);
                box.fillRoundedRect(W / 2 - 160, H / 2 - 70, 320, 140, 12);
                this.add.text(W / 2, H / 2 - 35, `${this.mpP1Name} DONE`, {
                    fontFamily: 'Arial Black', fontSize: 22, color: '#00cfff',
                    stroke: '#000000', strokeThickness: 5
                }).setOrigin(0.5).setDepth(22);
                this.add.text(W / 2, H / 2 + 10, 'SCORE: ' + p1Score, {
                    fontFamily: 'Arial Black', fontSize: 24, color: '#ffffff',
                    stroke: '#000000', strokeThickness: 4
                }).setOrigin(0.5).setDepth(22);
                this.time.delayedCall(2500, () => {
                    this.scene.start('Game', { mp: true, player: 2, p1Score, p1Car: this.mpP1Car, p2Car: this.mpP2Car, p1Color: this.mpP1Color, p2Color: this.mpP2Color, p1Name: this.mpP1Name, p2Name: this.mpP2Name });
                });
            } else {
                this.time.delayedCall(600, () => this.showLeaderboard(this.mpP1Score, this.score));
            }
            return;
        }

        const prevBest = parseInt(localStorage.getItem('evspeed_highscore') || '0');
        const isHighScore = this.score > prevBest;
        if (isHighScore) localStorage.setItem('evspeed_highscore', this.score);

        const boxH = isHighScore ? 230 : 190;
        const bx = this.add.graphics().setDepth(21);
        bx.fillStyle(0x000000, 0.75);
        bx.fillRoundedRect(W / 2 - 150, H / 2 - boxH / 2, 300, boxH, 10);

        this.add.text(W / 2, H / 2 - boxH / 2 + 38, 'GAME OVER', {
            fontFamily: 'Arial Black', fontSize: 34, color: '#ff4444',
            stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5).setDepth(22);

        if (isHighScore) {
            const hs = this.add.text(W / 2, H / 2 - 18, 'NEW HIGH SCORE!', {
                fontFamily: 'Arial Black', fontSize: 20, color: '#ffd700',
                stroke: '#000000', strokeThickness: 4
            }).setOrigin(0.5).setDepth(22);
            this.tweens.add({ targets: hs, scaleX: 1.08, scaleY: 1.08, duration: 340, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
            this.add.text(W / 2, H / 2 + 18, 'SCORE: ' + this.score, {
                fontFamily: 'Arial Black', fontSize: 22, color: '#ffffff',
                stroke: '#000000', strokeThickness: 4
            }).setOrigin(0.5).setDepth(22);
        } else {
            this.add.text(W / 2, H / 2 - 10, 'SCORE: ' + this.score, {
                fontFamily: 'Arial Black', fontSize: 22, color: '#ffffff',
                stroke: '#000000', strokeThickness: 4
            }).setOrigin(0.5).setDepth(22);
            this.add.text(W / 2, H / 2 + 22, 'BEST: ' + prevBest, {
                fontFamily: 'Arial', fontSize: 16, color: '#dddddd',
                stroke: '#000000', strokeThickness: 2
            }).setOrigin(0.5).setDepth(22);
        }

        const rt = this.add.text(W / 2, H / 2 + boxH / 2 - 28, 'TAP TO RESTART', {
            fontFamily: 'Arial Black', fontSize: 18, color: '#ffff00',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(22);

        this.tweens.add({
            targets: rt, alpha: 0, duration: 500,
            yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });

        this.time.delayedCall(400, () => {
            this.input.once('pointerdown', () => { if (!this.homeDown) this.scene.restart(); });
            this.input.keyboard.once('keydown', () => this.scene.restart());
        });
    }

    showLeaderboard(p1Score, p2Score) {
        const winner = p1Score > p2Score ? 1 : p2Score > p1Score ? 2 : 0;

        const ov = this.add.graphics().setDepth(23);
        ov.fillStyle(0x000000, 0.92);
        ov.fillRect(0, 0, W, H);

        this.add.text(W / 2, 110, 'LEADERBOARD', {
            fontFamily: 'Arial Black', fontSize: 34, color: '#ffd700',
            stroke: '#000000', strokeThickness: 7
        }).setOrigin(0.5).setDepth(24);

        const drawRow = (playerNum, score, y) => {
            const isWinner = winner === playerNum;
            const col = playerNum === 1 ? '#00cfff' : '#ff9900';
            const box = this.add.graphics().setDepth(24);
            box.fillStyle(isWinner ? 0x003355 : 0x111111, 1);
            box.fillRoundedRect(W / 2 - 170, y - 44, 340, 88, 12);
            if (isWinner) {
                box.lineStyle(3, 0xffd700, 1);
                box.strokeRoundedRect(W / 2 - 170, y - 44, 340, 88, 12);
                this.add.text(W / 2 + 120, y - 8, '👑', { fontSize: 38 }).setOrigin(0.5).setDepth(25);
            }
            this.add.text(W / 2 - 130, y - 16, playerNum === 1 ? this.mpP1Name : this.mpP2Name, {
                fontFamily: 'Arial Black', fontSize: 20, color: col,
                stroke: '#000000', strokeThickness: 4
            }).setOrigin(0, 0.5).setDepth(25);
            this.add.text(W / 2 - 130, y + 18, score.toLocaleString(), {
                fontFamily: 'Arial Black', fontSize: 26, color: '#ffffff',
                stroke: '#000000', strokeThickness: 5
            }).setOrigin(0, 0.5).setDepth(25);
        };

        drawRow(1, p1Score, 270);
        drawRow(2, p2Score, 390);

        if (winner === 0) {
            this.add.text(W / 2, 480, "IT'S A TIE!", {
                fontFamily: 'Arial Black', fontSize: 24, color: '#ffffff',
                stroke: '#000000', strokeThickness: 5
            }).setOrigin(0.5).setDepth(25);
        }

        // Rematch button
        const makeBtn = (x, y, w, label, col1, col2, onClick) => {
            const g = this.add.graphics().setDepth(25);
            g.fillStyle(col1, 1);
            g.fillRoundedRect(x - w / 2 + 3, y - 26, w, 52, 12);
            g.fillStyle(col2, 1);
            g.fillRoundedRect(x - w / 2, y - 28, w, 52, 12);
            this.add.text(x, y - 2, label, {
                fontFamily: 'Arial Black', fontSize: 22, color: '#ffffff',
                stroke: '#000000', strokeThickness: 4, fontStyle: 'italic'
            }).setOrigin(0.5).setDepth(26);
            this.add.zone(x, y, w, 52).setInteractive().setDepth(27)
                .on('pointerdown', onClick);
        };

        makeBtn(W / 2, 560, 260, '🔄  REMATCH',  0x880000, 0xcc2222,
            () => this.scene.start('Game', { mp: true, player: 1, p1Score: 0, p1Car: this.mpP1Car, p2Car: this.mpP2Car, p1Color: this.mpP1Color, p2Color: this.mpP2Color, p1Name: this.mpP1Name, p2Name: this.mpP2Name }));
        makeBtn(W / 2, 638, 260, '← MAIN MENU', 0x333333, 0x555555,
            () => this.scene.start('Menu'));
    }
}
