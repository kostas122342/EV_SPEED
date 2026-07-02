import { Scene, Textures } from 'phaser';

const W = 480, H = 720;
const HORIZON_Y = 180;
const FOCAL = 200, CAM_H = 540;
const Z_NEAR = 250, Z_FAR = 2000;
const ROAD_HW = 280;
const LANE_CENTERS = [-ROAD_HW * 0.67, 0, ROAD_HW * 0.67];
const DASH_LEN = 80, DASH_GAP = 80, DASH_P = DASH_LEN + DASH_GAP;
const SCAN = 3;



function proj(wx, wz) {
    const s = FOCAL / wz;
    return { x: W / 2 + wx * s, y: HORIZON_Y + CAM_H * s, s };
}

function laneX(lane) {
    return W / 2 + LANE_CENTERS[lane] * (FOCAL / Z_NEAR);
}

function rnd(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function smoothstep(t) { const c = Math.min(1, Math.max(0, t)); return c * c * (3 - 2 * c); }

function lerpColor(a, b, t) {
    const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
    const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
    return ((ar + (br - ar) * t | 0) << 16) | ((ag + (bg - ag) * t | 0) << 8) | (ab + (bb - ab) * t | 0);
}

const WEATHER_STATES = [
    { sky: 0x87CEEB, fog: 0x87CEEB, grass: 0x4a8c3f, night: 0.0  },  // Day
    { sky: 0x9aaabb, fog: 0xaabbc8, grass: 0x3d7a35, night: 0.1  },  // Overcast
    { sky: 0xe06030, fog: 0xf08858, grass: 0x4a4e24, night: 0.35 },  // Sunset
    { sky: 0x080820, fog: 0x101830, grass: 0x0e180e, night: 1.0  },  // Night
    { sky: 0xbb5577, fog: 0xcc7799, grass: 0x3a3e28, night: 0.4  },  // Dawn
];

export class Game extends Scene {
    constructor() { super('Game'); }

    preload() {
        this.load.image('city',        'assets/City.png');
        this.load.image('athens',      'assets/Athens.png');
        this.load.image('playerCar',  'assets/CarFinal.png');
        this.load.image('P1',         'assets/P1.png');
        this.load.image('evS',        'assets/evS.png');
        this.load.image('evS_white',  'assets/EVSWHITE.png');
        this.load.image('evX',        'assets/evX.png');
        this.load.image('evX_white',  'assets/EVXWHITE.png');
        this.load.image('modelY',       'assets/modelY.png');
        this.load.image('modelY_white', 'assets/EVYWHITE.png');
        this.load.image('cbt',        'assets/CBT.png');
        this.load.image('cbt_white',  'assets/CBTWHITE.png');
        this.load.image('scooter',    'assets/SCOOTER.png');
        this.load.image('obstacle',   'assets/obstacle.png');
        this.load.image('truck',      'assets/Truck.png');
        this.load.image('energyLogo', 'assets/En4.png');
        this.load.image('energyCoin', 'assets/Energy.png');
        this.load.image('bombItem',   'assets/bomb.png');
        this.load.image('clearItem',  'assets/CLEAR.png');
        this.load.image('tree',       'assets/tree.png');
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
        this.score   = 0;
        this.energy  = 0;
        this.over    = false;
        this.homeDown = false;
        this.powerups     = { clearLane: 0, megaBomb: 0 };
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
        this.wFog   = WEATHER_STATES[0].fog;
        this.wGrass = WEATHER_STATES[0].grass;
        this.wNight = 0.0;

        this.gBg    = this.add.graphics().setDepth(0);

        this.gRoad  = this.add.graphics().setDepth(1);
        this.gFog   = this.add.graphics().setDepth(1.5);
        this.gCity  = this.add.graphics().setDepth(1.7);
        this.gEnv   = this.add.graphics().setDepth(2);
        this.gNight = this.add.graphics().setDepth(2.8);
        this.gCar   = this.add.graphics().setDepth(3);

        this.carRot = 0;
        const WHITE_KEYS = { modelY: 'modelY_white', evS: 'evS_white', evX: 'evX_white', cbt: 'cbt_white' };
        const mpCarKey = this.mp ? (this.mpPlayer === 1 ? mpData.p1Car : mpData.p2Car) : (mpData.carKey || null);
        const selectedCar = mpCarKey || localStorage.getItem('evspeed_selected_car') || 'playerCar';
        this.selectedCar = selectedCar;
        const CAR_SCALES = { playerCar: 0.32, evS: 0.17, evX: 0.114, modelY: 0.1365, cbt: 0.16, scooter: 0.11 };
        const storedTint = localStorage.getItem(`evspeed_tint_${selectedCar}`);
        const hasValidTint = storedTint && storedTint !== '#ffffff';
        const carTextureKey = (hasValidTint && WHITE_KEYS[selectedCar]) ? WHITE_KEYS[selectedCar] : selectedCar;
        this.playerSprite = this.add.image(this.px, H - 140, carTextureKey)
            .setScale(CAR_SCALES[selectedCar] ?? 0.32)
            .setOrigin(0.5, 0.76)
            .setDepth(3.5);
        if (hasValidTint) this.playerSprite.setTint(parseInt(storedTint.replace('#', ''), 16));

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

        this.input.on('pointerdown', p => { this.sx = p.x; this.sy = p.y; });
        this.input.on('pointerup', p => {
            if (this.over) return;
            const dx = p.x - this.sx, dy = p.y - this.sy;
            if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy))
                this.go(dx > 0 ? 1 : -1);
        });

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
        this.time.addEvent({ delay: 600, loop: true, callback: () => {
            if (!this.over && this.started) {
                const ox = ROAD_HW + 55 + rnd(0, 150);
                const isStone = Math.random() < 0.5;
                const mkTree = () => this.add.image(0, 0, 'tree').setOrigin(0.5, 1).setDepth(2.2).setVisible(false);
                this.trees.push({ z: Z_FAR, s: -1, ox, isStone, sprite: mkTree() });
                this.trees.push({ z: Z_FAR, s:  1, ox, isStone, sprite: mkTree() });
            }
        }});
        this.time.addEvent({ delay: 1600, loop: true, callback: () => {
            if (!this.over && this.started) {
                const busy = new Set([
                    ...this.enemies.filter(e => e.z > 600).map(e => e.lane),
                    ...this.obstacles.filter(o => o.z > 600).map(o => o.lane)
                ]);
                const free = [0, 1, 2].filter(l => !busy.has(l));
                if (free.length === 0) return;

                // Build curved path: forced curve around obstacles, random curve otherwise
                const allObjs = [...this.enemies, ...this.obstacles];
                const isBlocked = (lane, z) => allObjs.some(o => o.lane === lane && Math.abs(o.z - z) < 280);

                let curLane = free[Math.floor(Math.random() * free.length)];
                const path = [];
                let held = 0;
                let holdFor = 2 + Math.floor(Math.random() * 2);
                for (let i = 0; i < 6; i++) {
                    const coinZ = Z_FAR - i * 90;
                    if (isBlocked(curLane, coinZ)) {
                        const adj = [curLane - 1, curLane + 1].filter(l => l >= 0 && l <= 2 && !isBlocked(l, coinZ));
                        if (adj.length > 0) { curLane = adj[Math.floor(Math.random() * adj.length)]; held = 0; holdFor = 2 + Math.floor(Math.random() * 2); }
                    } else if (held >= holdFor) {
                        const adj = [curLane - 1, curLane + 1].filter(l => l >= 0 && l <= 2);
                        if (adj.length > 0) curLane = adj[Math.floor(Math.random() * adj.length)];
                        held = 0;
                        holdFor = 2 + Math.floor(Math.random() * 2);
                    } else {
                        held++;
                    }
                    path.push(curLane);
                }

                for (let i = 0; i < 6; i++) {
                    const ec = { z: Z_FAR - i * 90, lane: path[i], collected: false };
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
                this.trees[i].sprite.destroy();
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
            this.wFog   = lerpColor(from.fog,   to.fog,   this.weatherT);
            this.wGrass = lerpColor(from.grass, to.grass, this.weatherT);
            this.wNight = from.night + (to.night - from.night) * this.weatherT;
            if (this.weatherT >= 1.0) {
                this.weatherIdx  = this.weatherNext;
                this.weatherNext = (this.weatherIdx + 1) % WEATHER_STATES.length;
            }
        }

        this.redraw();
    }

    redraw() {
        this.gBg.clear();
        this.gRoad.clear();
        this.gFog.clear();
        this.gCity.clear();
        this.gEnv.clear();
        this.gNight.clear();
        this.gCar.clear();

        // Sky
        this.gBg.fillStyle(this.wSky, 1);
        this.gBg.fillRect(0, 0, W, HORIZON_Y);

        // Grass
        this.gBg.fillStyle(this.wGrass, 1);
        this.gBg.fillRect(0, HORIZON_Y, W, H - HORIZON_Y);

        // Road scanlines
        const g = this.gRoad;
        for (let y = HORIZON_Y + SCAN; y < H; y += SCAN) {
            const dy = y - HORIZON_Y;
            const z  = (FOCAL * CAM_H) / dy;
            const sc = FOCAL / z;
            const hw = ROAD_HW * sc;
            const cx = W / 2;

            const seg  = (Math.floor((z + this.dist) / 120) & 1);
            const cseg = (Math.floor((z + this.dist) / 60)  & 1);
            const ph   = ((z + this.dist) % DASH_P + DASH_P) % DASH_P;

            g.fillStyle(seg ? 0x606060 : 0x4e4e4e, 1);
            g.fillRect(cx - hw, y, hw * 2, SCAN);

            const cw = Math.max(SCAN, hw * 0.07);
            g.fillStyle(cseg ? 0xffffff : 0xdd1111, 1);
            g.fillRect(cx - hw - cw, y, cw, SCAN);
            g.fillRect(cx + hw,      y, cw, SCAN);

            // Side ground texture (perspective-correct multi-frequency)
            const zd = z + this.dist;
            const t1 = (Math.floor(zd / 22)  & 1);
            const t2 = (Math.floor(zd / 9)   & 1);
            const t3 = (Math.floor(zd / 51)  & 1);
            const t4 = (Math.floor(zd / 130) & 1);
            if (this.theme === 'city') {
                const base  = t4 ? 0x787e86 : 0x6a7078;
                const mark  = t1 && t2 ? 0x595f67 : t3 ? 0x82888e : base;
                g.fillStyle(mark, 1);
            } else {
                const gc = this.wGrass;
                const base = t4 ? lerpColor(gc, 0x000000, 0.12) : t3 ? gc : lerpColor(gc, 0x000000, 0.06);
                const dark = t1 && t2 && t3;
                g.fillStyle(dark ? lerpColor(gc, 0x000000, 0.22) : base, 1);
            }
            g.fillRect(0,            y, cx - hw - cw, SCAN);
            g.fillRect(cx + hw + cw, y, W - (cx + hw + cw), SCAN);

            if (ph < DASH_LEN) {
                g.fillStyle(0xffffff, 1);
                const dw = Math.max(1, 3 * sc);
                for (let d = 1; d < 3; d++) {
                    const lw = (LANE_CENTERS[d - 1] + LANE_CENTERS[d]) / 2 * sc;
                    g.fillRect(cx + lw - dw, y, dw * 2, SCAN);
                }
            }
        }

        const FOG_DENSE = 90;
        const FOG_H     = 240;

        // Horizon fog: dense near horizon, fades toward player
        for (let fy = 0; fy < FOG_H; fy += 2) {
            const alpha = fy < FOG_DENSE
                ? 1.0
                : 1.0 - smoothstep((fy - FOG_DENSE) / (FOG_H - FOG_DENSE));
            this.gFog.fillStyle(this.wFog, alpha);
            this.gFog.fillRect(0, HORIZON_Y + fy, W, 2);
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
            const FOG_DENSE_L = 90, FOG_H_L = 240;
            const LAMP_SPACING = 380;
            const baseZ = ((this.dist % LAMP_SPACING) + LAMP_SPACING) % LAMP_SPACING;
            for (let zl = baseZ + 80; zl < Z_FAR; zl += LAMP_SPACING) {
                const pL = proj(-ROAD_HW - 20, zl);
                const pR = proj( ROAD_HW + 20, zl);
                if (pL.y < HORIZON_Y || pL.y > H + 60) continue;
                const fa2 = smoothstep((pL.y - HORIZON_Y - FOG_DENSE_L) / (FOG_H_L - FOG_DENSE_L));
                const lfa = fa2 * lampFade;
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
        const ts = [...this.trees].sort((a, b) => b.z - a.z);
        for (const t of ts) {
            if (t.z <= Z_NEAR || t.z > Z_FAR) continue;
            const p = proj(t.s * t.ox, t.z);
            if (p.y < HORIZON_Y || p.y > H + 100) continue;
            const fa = smoothstep((p.y - HORIZON_Y - FOG_DENSE) / (FOG_H - FOG_DENSE));
            t.sprite.setVisible(false);
            if (t.isStone) continue;

            const ni = this.wNight;
            const lampFade = Math.max(0, (ni - 0.2) / 0.4); // 0→1 as night approaches

            // Athens tree (darkened by night)
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

            // Lamp post (fades in at night)
            if (lampFade > 0) {
                const lfa = fa * lampFade;
                const th = Math.max(6, 80 * p.s);
                const tw = Math.max(2, 7 * p.s);
                const lr = Math.max(3, 10 * p.s);
                this.gEnv.fillStyle(0x7788aa, lfa);
                this.gEnv.fillRect(p.x - tw / 2, p.y - th, tw, th);
                this.gEnv.fillRect(p.x - tw / 2, p.y - th, tw * 3, tw);
                // Lamp glow
                this.gEnv.fillStyle(0xfff0cc, lfa);
                this.gEnv.fillCircle(p.x + tw * 1.5, p.y - th, lr);
                // Light cone
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
            const fa = smoothstep((p.y - HORIZON_Y - FOG_DENSE) / (FOG_H - FOG_DENSE));
            const laneRot = [0.26, 0, -0.26];
            e.sprite.setVisible(true)
                .setPosition(p.x, p.y)
                .setScale(p.s * 0.20)
                .setAlpha(fa)
                .setRotation(laneRot[e.lane])
                .setDepth(3 - e.z / Z_FAR);
        }

        // Obstacles
        for (const o of this.obstacles) {
            if (o.z <= 1 || o.z > Z_FAR) { o.sprite.setVisible(false); continue; }
            const p = proj(LANE_CENTERS[o.lane], o.z);
            if (p.y < HORIZON_Y || p.y > H + 80) { o.sprite.setVisible(false); continue; }
            const fa = smoothstep((p.y - HORIZON_Y - FOG_DENSE) / (FOG_H - FOG_DENSE));
            o.sprite.setVisible(true)
                .setPosition(p.x, p.y)
                .setScale(p.s * (o.type === 'truck' ? 0.18 : 0.25))
                .setAlpha(fa)
                .setDepth(3 - o.z / Z_FAR);
        }

        // Energy collectibles
        for (const ec of this.energies) {
            if (ec.collected || ec.z <= 1 || ec.z > Z_FAR) { ec.sprite.setVisible(false); continue; }
            const p = proj(LANE_CENTERS[ec.lane], ec.z);
            if (p.y < HORIZON_Y || p.y > H + 80) { ec.sprite.setVisible(false); continue; }
            const fa = smoothstep((p.y - HORIZON_Y - FOG_DENSE) / (FOG_H - FOG_DENSE));
            ec.sprite.setVisible(true)
                .setPosition(p.x, p.y)
                .setScale(p.s * 0.12)
                .setAlpha(fa)
                .setDepth(2.9 - ec.z / Z_FAR);
        }

        // Power-up collectibles
        for (const pu of this.powerupItems) {
            if (pu.collected || pu.z <= 1 || pu.z > Z_FAR) continue;
            const p = proj(LANE_CENTERS[pu.lane], pu.z);
            if (p.y < HORIZON_Y || p.y > H + 80) continue;
            const fa = smoothstep((p.y - HORIZON_Y - FOG_DENSE) / (FOG_H - FOG_DENSE));
            const r = Math.max(7, 28 * p.s);
            if (pu.sprite) {
                const t     = this.time.now / 1000;
                const pulse = 1 + 0.18 * Math.sin(t * 5);
                if (pu.type === 'megaBomb') {
                    const sc = Math.max(0.12, 0.42 * p.s) * pulse;
                    pu.sprite.setVisible(true).setPosition(p.x, p.y).setScale(sc)
                        .setAlpha(fa).setAngle(Math.sin(t * 3) * 14);
                } else {
                    const sc = Math.max(0.10, 0.34 * p.s) * pulse;
                    pu.sprite.setVisible(true).setPosition(p.x, p.y).setScale(sc)
                        .setAlpha(fa).setAngle(0);
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
