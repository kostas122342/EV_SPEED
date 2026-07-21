import { Scene, Textures } from 'phaser';

const W = 480, H = 720;
const HORIZON_Y = 180;
const FOCAL = 200, CAM_H = 540;
const Z_NEAR = 250, Z_FAR = 2000;
const ROAD_HW = 280;
const LANE_CENTERS = [-ROAD_HW * 0.67, 0, ROAD_HW * 0.67];
const DASH_LEN = 80, DASH_GAP = 80, DASH_P = DASH_LEN + DASH_GAP;
const SCAN = 3;


function roadHillLift(wz) {
    const t = smoothstep((wz - 520) / (Z_FAR - 520));
    return 34 * t;
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

const WEATHER_STATES = [
    { sky: 0x87CEEB, grass: 0x4a8c3f, night: 0.0  },  // Day
    { sky: 0x9aaabb, grass: 0x3d7a35, night: 0.1  },  // Overcast
    { sky: 0xe06030, grass: 0x4a4e24, night: 0.35 },  // Sunset
    { sky: 0x080820, grass: 0x0e180e, night: 1.0  },  // Night
    { sky: 0xbb5577, grass: 0x3a3e28, night: 0.4  },  // Dawn
];

export class Game extends Scene {
    constructor() { super('Game'); }

    preload() {
        this.load.image('city',        'assets/City.png');
        this.load.image('athens',      'assets/Athens.png');
        this.load.image('playerCar', 'assets/CarFinal.png');
        this.load.image('ev3Blue',   'assets/ev3BLUE.png');
        this.load.image('ev3Red',    'assets/ev3RED.png');
        this.load.image('P1',        'assets/P1.png');
        this.load.image('evS',       'assets/evS.png');
        this.load.image('evsOrange', 'assets/evsORANGE.png');
        this.load.image('evsGreen',  'assets/evsGREEN.png');
        this.load.image('evX',       'assets/evX.png');
        this.load.image('evxBlue',   'assets/evxBLUE.png');
        this.load.image('evxRed',    'assets/evxRED.png');
        this.load.image('modelY',    'assets/modelY.png');
        this.load.image('evYWhite',  'assets/evYWHITE.png');
        this.load.image('evYRed',    'assets/evYRED.png');
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
        this.load.image('tree',       'assets/tree.png');
        this.load.image('mountainLayer',   'assets/mountain-layer.png');
        this.load.image('forestCityLayer', 'assets/forest-city-layer.png');
        this.load.audio('energyBeat', 'assets/energyBeat.mp3');
        this.load.audio('bombBeat',   'assets/bombBeat.mp3');
        this.load.audio('lazerBeat',   'assets/lazerBeat.mp3');
        this.load.audio('countdown',   'assets/countdown.mp3');
    }

    create() {
        this.textures.get('energyLogo').setFilter(Textures.FilterMode.LINEAR);
        const mpData     = this.scene.settings.data || {};
        this.mp          = !!mpData.mp;
        this.mpPlayer    = mpData.player || 1;
        this.mpP1Score   = mpData.p1Score || 0;
        this.mpP1Car     = mpData.p1Car   || 'playerCar';
        this.mpP2Car     = mpData.p2Car   || 'playerCar';
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
        };
        this.powerupItems = [];
        this.puFlashT     = 0;
        this.puBombT      = 0;

        this.lk = false; this.rk = false;
        this.sx = 0;     this.sy = 0;
        this.moveDir = 0;

        this.theme = 'athens';

        // Weather / time-of-day
        this.weatherIdx = 0;
        this.weatherNext = 1;
        this.weatherT = 1.0;
        this.wSky   = WEATHER_STATES[0].sky;
        this.wGrass = WEATHER_STATES[0].grass;
        this.wNight = 0.0;

        this.gBg    = this.add.graphics().setDepth(0);
        this.mountainLayer = this.add.image(W / 2, HORIZON_Y + 60, 'mountainLayer')
            .setOrigin(0.5, 1)
            .setDisplaySize(560, 265)
            .setDepth(0.35);
        this.forestCityLayer = this.add.image(W / 2, HORIZON_Y + 61, 'forestCityLayer')
            .setOrigin(0.5, 1)
            .setDisplaySize(560, 187)
            .setDepth(0.5);
        this.gRoad  = this.add.graphics().setDepth(1);
        this.gFog   = this.add.graphics().setDepth(1.45);
        this.gCity  = this.add.graphics().setDepth(1.7);
        this.gEnv   = this.add.graphics().setDepth(2);
        this.gNight = this.add.graphics().setDepth(2.8);
        this.gHorizonLights = this.add.graphics().setDepth(2.9);
        this.gCar   = this.add.graphics().setDepth(3);

        this.carRot = 0;
        const mpCarKey = this.mp ? (this.mpPlayer === 1 ? mpData.p1Car : mpData.p2Car) : (mpData.carKey || null);
        const selectedCar = mpCarKey || localStorage.getItem('evspeed_selected_car') || 'playerCar';
        this.selectedCar = selectedCar;
        const CAR_SCALES = { playerCar: 0.32, evS: 0.17, evsOrange: 0.17, evsGreen: 0.17, evX: 0.114, evxBlue: 0.114, evxRed: 0.114, modelY: 0.1365, evYWhite: 0.1365, evYRed: 0.1365, cbt: 0.16, cbtWhite: 0.16, cbtPurple: 0.16, scooter: 0.11 };
        const VARIANT_DEFAULTS = { playerCar: 'playerCar', modelY: 'evYWhite', evS: 'evS', evX: 'evX', cbt: 'cbtWhite' };
        let carTextureKey = selectedCar;
        if (VARIANT_DEFAULTS[selectedCar]) {
            carTextureKey = localStorage.getItem(`evspeed_activeColor_${selectedCar}`) || VARIANT_DEFAULTS[selectedCar];
        }
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
                const e = { z: Z_FAR, lane, speedMul: 1.0, rushPhase: 'idle', rushT: 0, willRush };
                e.sprite = this.add.image(0, 0, 'P1').setOrigin(0.5, 0.74).setDepth(2.5).setVisible(false);
                this.enemies.push(e);
            }
        }});

        this.time.addEvent({ delay: 18000, loop: true, callback: () => {
            if (!this.over) this.weatherT = 0;
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
                const type = Math.random() < 0.78 ? 'clearLane' : 'megaBomb';
                const item = { z: Z_FAR, lane, type, collected: false };
                const imgKey = type === 'megaBomb' ? 'bombItem' : 'clearItem';
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
        this.puClrIcon = this.add.image(45,  H - 57, 'clearItem').setScale(0.09).setOrigin(0.5).setDepth(10);
        this.puBmbIcon = this.add.image(105, H - 54, 'bombItem' ).setScale(0.12).setOrigin(0.5).setDepth(10);
        this.puClrLbl  = this.add.text(45,  H - 24, 'CLR',  { fontFamily: 'Arial Black', fontSize: 12, color: '#00eeff', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5).setDepth(10);
        this.puBmbLbl  = this.add.text(105, H - 24, 'BOMB', { fontFamily: 'Arial Black', fontSize: 12, color: '#ffaa44', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5).setDepth(10);
        this.puClrCnt  = this.add.text(66,  H - 72, '',     { fontFamily: 'Arial Black', fontSize: 12, color: '#00ffff', stroke: '#000000', strokeThickness: 2 }).setOrigin(0.5).setDepth(10);
        this.puBmbCnt  = this.add.text(126, H - 72, '',     { fontFamily: 'Arial Black', fontSize: 12, color: '#ffaa00', stroke: '#000000', strokeThickness: 2 }).setOrigin(0.5).setDepth(10);
        this.add.zone(45,  H - 56, 52, 52).setInteractive().setDepth(11).on('pointerdown', () => this.activateClearLane());
        this.add.zone(105, H - 56, 52, 52).setInteractive().setDepth(11).on('pointerdown', () => this.activateMegaBomb());
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

        for (const e of this.enemies) {
            // Stop-phase enemies sit at z≈350-400 which projects above the normal y-bounds.
            // Use z+x proximity so the player must actually reach the car horizontally.
            if (e.rushPhase === 'stop' && e.z <= Z_NEAR + 200) {
                const sp = proj(LANE_CENTERS[e.lane], Math.max(e.z, 1));
                if (Math.abs(this.px - sp.x) < 38 * sp.s) { this.die(); return; }
            }
            const ep   = proj(LANE_CENTERS[e.lane], Math.max(e.z, 1));
            const bodyY  = ep.y;
            const bodyHH = 5 * ep.s;
            const smallCar = this.selectedCar === 'evS' || this.selectedCar === 'modelY';
            const frontBound = smallCar ? H - 222 : this.selectedCar === 'evX' ? H - 218 : this.selectedCar === 'cbt' ? H - 212 : this.selectedCar === 'scooter' ? H - 216 : H - 205;
            if (bodyY + bodyHH < frontBound || bodyY - bodyHH > H - 115) continue;
            const playerW = smallCar ? 26 : this.selectedCar === 'evX' ? 18 : this.selectedCar === 'cbt' ? 14 : this.selectedCar === 'scooter' ? 16 : 10;
            const hw = 62 * ep.s + playerW;
            if (Math.abs(this.px - ep.x) < hw) { this.die(); return; }
        }
        for (const o of this.obstacles) {
            const op = proj(LANE_CENTERS[o.lane], Math.max(o.z, 1));
            if (op.y + 20 * op.s < (this.selectedCar === 'cbt' ? H - 212 : this.selectedCar === 'scooter' ? H - 216 : H - 205) || op.y - 20 * op.s > H - 89) continue;
            if (Math.abs(this.px - op.x) < 32 * op.s + 20) { this.die(); return; }
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

        // Weather transition (8s blend)
        if (this.weatherT < 1.0) {
            this.weatherT = Math.min(1.0, this.weatherT + dt / 8);
            const from = WEATHER_STATES[this.weatherIdx];
            const to   = WEATHER_STATES[this.weatherNext];
            this.wSky   = lerpColor(from.sky,   to.sky,   this.weatherT);
            this.wGrass = lerpColor(from.grass, to.grass, this.weatherT);
            this.wNight = from.night + (to.night - from.night) * this.weatherT;
            if (this.weatherT >= 1.0) {
                this.weatherIdx  = this.weatherNext;
                this.weatherNext = (this.weatherIdx + 1) % WEATHER_STATES.length;
            }
        }

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

        // Layered high-resolution pseudo-3D environment. These raster layers stay
        // fixed while the projected road provides motion and depth.
        const ni = this.wNight;
        const environmentTint = lerpColor(0xffffff, this.wSky, 0.14);
        this.mountainLayer.setTint(environmentTint).setAlpha(0.96 - ni * 0.08);
        this.forestCityLayer.setTint(lerpColor(0xffffff, this.wSky, 0.10)).setAlpha(1 - ni * 0.05);

        // Emissive window layer remains visible above the global night tint.
        const windowGlow = smoothstep((ni - 0.16) / 0.52);
        if (windowGlow > 0) {
            // Only the two tall buildings — lower buildings are too tree-covered at game scale.
            // Front face only (no side faces). Rows limited to visible window band.
            const lightRegions = [
                { x: 16,  y: 90, cols: 3, rows: 4, dx: 7, dy: 12 }, // left tall  (front face x≈14-34)
                { x: 447, y: 90, cols: 3, rows: 4, dx: 7, dy: 12 }, // right tall (front face x≈445-466)
            ];
            for (let ri = 0; ri < lightRegions.length; ri++) {
                const region = lightRegions[ri];
                for (let row = 0; row < region.rows; row++) {
                    for (let col = 0; col < region.cols; col++) {
                        if (hash01(1500 + ri * 100 + row * 11 + col) < 0.38) continue;
                        const wx = region.x + col * region.dx;
                        const wy = region.y + row * region.dy;
                        this.gHorizonLights.fillStyle(0xffc45e, windowGlow * 0.10);
                        this.gHorizonLights.fillCircle(wx + 1.5, wy + 2.5, 5);
                        this.gHorizonLights.fillStyle(0xffdfa0, windowGlow * 0.90);
                        this.gHorizonLights.fillRect(wx, wy, 3, 5);
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

        // Roadside lamp posts (both sides, scroll with road)
        const lampFade = Math.max(0, (this.wNight - 0.2) / 0.35);
        if (lampFade > 0) {
            const LAMP_SPACING = 380;
            const baseZ = ((this.dist % LAMP_SPACING) + LAMP_SPACING) % LAMP_SPACING;
            for (let zl = baseZ + 80; zl < Z_FAR; zl += LAMP_SPACING) {
                const pL = proj(-ROAD_HW - 20, zl);
                const pR = proj( ROAD_HW + 20, zl);
                if (pL.y < HORIZON_Y || pL.y > H + 60) continue;
                const lfa = lampFade;
                const sides = [{ p: pL, dir: 1 }, { p: pR, dir: -1 }];
                for (const { p, dir } of sides) {
                    const th = Math.max(5, 78 * p.s);
                    const tw = Math.max(1.5, 6 * p.s);
                    const lr = Math.max(2.5, 9 * p.s);
                    // Post
                    this.gCity.fillStyle(0x5566aa, lfa);
                    this.gCity.fillRect(p.x - tw / 2, p.y - th, tw, th);
                    // Arm toward road
                    this.gCity.fillRect(p.x - tw / 2, p.y - th, tw * 3.5 * dir, tw * 0.8);
                    // Lamp head
                    this.gCity.fillStyle(0xeef5ff, lfa);
                    this.gCity.fillCircle(p.x + tw * 1.75 * dir, p.y - th, lr);
                    // Glow halo
                    this.gCity.fillStyle(0xbbddff, lfa * 0.25);
                    this.gCity.fillCircle(p.x + tw * 1.75 * dir, p.y - th, lr * 2.8);
                    // Light cone downward
                    if (lampFade > 0.4) {
                        const coneA = lfa * (lampFade - 0.4) * 0.22;
                        const lx = p.x + tw * 1.75 * dir, ly = p.y - th;
                        this.gCity.fillStyle(0xaaccff, coneA);
                        this.gCity.fillTriangle(lx, ly + lr, lx - lr * 2.5 * dir, ly + lr * 6, lx + lr * 2.5 * dir, ly + lr * 6);
                    }
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
            const lampFade = Math.max(0, (ni - 0.2) / 0.4);
            if (lampFade < 1) {
                const treeFa = fa * (1 - lampFade);
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
            if (lampFade > 0) {
                const lfa = fa * lampFade;
                const th = Math.max(6, 80 * p.s);
                const tw = Math.max(2, 7 * p.s);
                const lr = Math.max(3, 10 * p.s);
                this.gEnv.fillStyle(0x7788aa, lfa);
                this.gEnv.fillRect(p.x - tw / 2, p.y - th, tw, th);
                this.gEnv.fillRect(p.x - tw / 2, p.y - th, tw * 3, tw);
                this.gEnv.fillStyle(0xfff0cc, lfa);
                this.gEnv.fillCircle(p.x + tw * 1.5, p.y - th, lr);
                if (lampFade > 0.3) {
                    const coneA = lfa * (lampFade - 0.3) * 0.35;
                    this.gEnv.fillStyle(0xfff0aa, coneA);
                    this.gEnv.fillTriangle(
                        p.x + tw * 1.5, p.y - th + lr,
                        p.x + tw * 1.5 - lr * 3, p.y - th + lr * 5,
                        p.x + tw * 1.5 + lr * 3, p.y - th + lr * 5
                    );
                }
            }
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
                .setScale(p.s * 0.20)
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

    updatePowerupBtns() {
        const clrHas = this.powerups.clearLane > 0;
        const bmbHas = this.powerups.megaBomb  > 0;

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

        this.puClrCnt.setText(clrHas ? `×${this.powerups.clearLane}` : '');
        this.puBmbCnt.setText(bmbHas ? `×${this.powerups.megaBomb}`  : '');
        this.puClrIcon.setAlpha(clrHas ? 1 : 0.35);
        this.puBmbIcon.setAlpha(bmbHas ? 1 : 0.35);
        this.puClrLbl.setAlpha(clrHas ? 1 : 0.35);
        this.puBmbLbl.setAlpha(bmbHas ? 1 : 0.35);
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
                    this.scene.start('Game', { mp: true, player: 2, p1Score, p1Car: this.mpP1Car, p2Car: this.mpP2Car, p1Name: this.mpP1Name, p2Name: this.mpP2Name });
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
            () => this.scene.start('Game', { mp: true, player: 1, p1Score: 0, p1Car: this.mpP1Car, p2Car: this.mpP2Car, p1Name: this.mpP1Name, p2Name: this.mpP2Name }));
        makeBtn(W / 2, 638, 260, '← MAIN MENU', 0x333333, 0x555555,
            () => this.scene.start('Menu'));
    }
}
