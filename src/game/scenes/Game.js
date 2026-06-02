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

export class Game extends Scene {
    constructor() { super('Game'); }

    preload() {
        this.load.image('city',        'assets/City.png');
        this.load.image('athens',      'assets/Athens.png');
        this.load.image('playerCar',  'assets/CarFinal.png');
        this.load.image('car2',       'assets/car2.png');
        this.load.image('P1',         'assets/P1.png');
        this.load.image('evS',        'assets/evS.png');
        this.load.image('evX',        'assets/evX.png');
        this.load.image('modelY',     'assets/modelY.png');
        this.load.image('obstacle',   'assets/obstacle.png');
        this.load.image('truck',      'assets/Truck.png');
        this.load.image('energyLogo', 'assets/En4.png');
        this.load.image('energyCoin', 'assets/Energy.png');
        this.load.image('tree',       'assets/tree.png');
    }

    create() {
        this.textures.get('energyLogo').setFilter(Textures.FilterMode.LINEAR);
        const mpData     = this.scene.settings.data || {};
        this.mp          = !!mpData.mp;
        this.mpPlayer    = mpData.player || 1;
        this.mpP1Score   = mpData.p1Score || 0;
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
        this.lk = false; this.rk = false;
        this.sx = 0;     this.sy = 0;
        this.moveDir = 0;

        this.theme  = Math.random() < 0.5 ? 'city' : 'athens';
        this.bgOffY = 0;

        this.gBg   = this.add.graphics().setDepth(0);
        this.bgImg = this.add.image(W / 2, 290, this.theme === 'city' ? 'city' : 'athens')
            .setOrigin(0.5, 1).setDisplaySize(W * 1.05, 305).setDepth(1.3);
        if (this.theme === 'athens') this.bgImg.setTint(0xd8d0c0);
        else                         this.bgImg.setTint(0xc8dce8);

        this.gRoad = this.add.graphics().setDepth(1);
        this.gFog  = this.add.graphics().setDepth(1.5);
        this.gCity = this.add.graphics().setDepth(1.7);
        this.gEnv  = this.add.graphics().setDepth(2);
        this.gCar  = this.add.graphics().setDepth(3);

        this.carRot = 0;
        const selectedCar = localStorage.getItem('evspeed_selected_car') || 'playerCar';
        this.selectedCar = selectedCar;
        const CAR_SCALES = { playerCar: 0.32, car2: 0.27, evS: 0.17, evX: 0.114, modelY: 0.1365 };
        this.playerSprite = this.add.image(this.px, H - 80, selectedCar)
            .setScale(CAR_SCALES[selectedCar] ?? 0.32)
            .setOrigin(0.5, 0.76)
            .setDepth(3.5);

        const uiBg = this.add.graphics().setDepth(8);
        uiBg.fillStyle(0x000000, 0.32);
        uiBg.fillRoundedRect(W - 136, 4, 132, 76, 8);

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

        if (this.mp) {
            this.add.text(12, 57, `P${this.mpPlayer}`, {
                fontFamily: 'Arial Black', fontSize: 20,
                color: this.mpPlayer === 1 ? '#00cfff' : '#ff9900',
                stroke: '#000000', strokeThickness: 4
            }).setOrigin(0, 0.5).setDepth(9);
            this.time.delayedCall(200, () => this.startCountdown());
        }

        this.redraw();
    }

    startCountdown() {
        const col = this.mpPlayer === 1 ? '#00cfff' : '#ff9900';
        const ov = this.add.graphics().setDepth(24);
        ov.fillStyle(0x000000, 0.70);
        ov.fillRect(0, 0, W, H);

        const lbl = this.add.text(W / 2, H / 2 - 90, `PLAYER ${this.mpPlayer}`, {
            fontFamily: 'Arial Black', fontSize: 34, color: col,
            stroke: '#000000', strokeThickness: 7
        }).setOrigin(0.5).setDepth(25);

        const numTxt = this.add.text(W / 2, H / 2 + 10, '3', {
            fontFamily: 'Arial Black', fontSize: 100, color: '#ffffff',
            stroke: '#000000', strokeThickness: 10
        }).setOrigin(0.5).setDepth(25);

        const steps = ['3', '2', '1', 'GO!'];
        let i = 0;
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
        if (this.moving || this.over || !this.started) return;
        const nl = this.lane + d;
        if (nl < 0 || nl > 2) return;
        this.moving = true;
        this.lane = nl;
        this.moveDir = d;

        const laneRot = [0.26, 0, -0.26];
        this.tweens.add({
            targets: this,
            px: laneX(nl),
            carRot: laneRot[nl],
            duration: 140,
            ease: 'Cubic.easeOut',
            onComplete: () => { this.moving = false; }
        });

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
        this.bgOffY  = Math.min(60, this.bgOffY + dt * (this.spd / 8000));
        this.bgImg.setY(290 - this.bgOffY);

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            // Trigger rush when enemy is fully visible, safely above collision zone, and no other enemy is already rushing
            const anyRushing = this.enemies.some(o => o !== e && o.rushPhase !== 'idle');
            if (e.willRush && e.rushPhase === 'idle' && e.z >= 310 && e.z <= 430 && !anyRushing) {
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
            if (e.z < 80) {
                e.sprite.destroy();
                this.enemies.splice(i, 1);
            }
        }
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            this.obstacles[i].z -= this.spd * dt;
            if (this.obstacles[i].z < 80) {
                this.obstacles[i].sprite.destroy();
                this.obstacles.splice(i, 1);
            }
        }
        // Spawn skid marks at all four wheels while changing lane
        if (this.moving) {
            this.skidMarks.push({
                lx: this.px - 62, rx: this.px + 62, y:  H - 68,
                flx: this.px - 48, frx: this.px + 48, fy: H - 135,
                alpha: 0.72
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
            if (!ec.collected && ec.z < Z_NEAR + 60 && ec.lane === this.lane) {
                ec.collected = true;
                ec.sprite.setVisible(false);
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

        for (const e of this.enemies) {
            const ep   = proj(LANE_CENTERS[e.lane], Math.max(e.z, 1));
            const bodyY  = ep.y;
            const bodyHH = 5 * ep.s;
            const smallCar = this.selectedCar === 'evS' || this.selectedCar === 'modelY';
            const frontBound = smallCar ? H - 162 : this.selectedCar === 'evX' ? H - 158 : H - 145;
            if (bodyY + bodyHH < frontBound || bodyY - bodyHH > H - 55) continue;
            const playerW = smallCar ? 26 : this.selectedCar === 'evX' ? 18 : 10;
            const hw = 62 * ep.s + playerW;
            if (Math.abs(this.px - ep.x) < hw) { this.die(); return; }
        }
        for (const o of this.obstacles) {
            const op = proj(LANE_CENTERS[o.lane], Math.max(o.z, 1));
            if (op.y + 20 * op.s < H - 145 || op.y - 20 * op.s > H - 29) continue;
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
        this.redraw();
    }

    redraw() {
        this.gBg.clear();
        this.gRoad.clear();
        this.gFog.clear();
        this.gCity.clear();
        this.gEnv.clear();
        this.gCar.clear();

        // Sky
        this.gBg.fillStyle(this.theme === 'city' ? 0x87CEEB : 0xb2bec8, 1);
        this.gBg.fillRect(0, 0, W, HORIZON_Y);

        // Ground base
        this.gBg.fillStyle(this.theme === 'city' ? 0x707880 : 0x4a5c38, 1);
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
                const base  = t4 ? 0x526244 : t3 ? 0x425234 : 0x4a5c3c;
                const stone = t1 && t2;
                g.fillStyle(stone ? (t4 ? 0x8a8470 : 0x706a5c) : base, 1);
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

        const S = 3; // step size for all gradient loops — reduces draw calls ~3x

        // Side vignettes
        const vigCol = this.theme === 'city' ? 0x707880 : 0xb0a898;
        const vigW   = 90;
        for (let vx = 0; vx < vigW; vx += S) {
            const a = (1.0 - smoothstep(vx / vigW)) * 0.88;
            this.gFog.fillStyle(vigCol, a);
            this.gFog.fillRect(vx,             0, S, 295);
            this.gFog.fillRect(W - vx - S,     0, S, 295);
        }

        // Top sky fade
        const skyCol = this.theme === 'city' ? 0x87CEEB : 0xb2bec8;
        for (let by = 0; by < 90; by += S) {
            const a = (1.0 - smoothstep(by / 90)) * 0.85;
            this.gFog.fillStyle(skyCol, a);
            this.gFog.fillRect(0, by, W, S);
        }

        // Edge blend fog
        const fogCol = this.theme === 'city' ? 0x4a7a9a : 0xb8b8b8;
        const Y1 = 230, YMID = 278, Y2 = 480;
        for (let by = Y1; by < Y2; by += S) {
            const t = by < YMID
                ? smoothstep((by - Y1)   / (YMID - Y1))
                : 1.0 - smoothstep((by - YMID) / (Y2 - YMID));
            this.gFog.fillStyle(fogCol, t);
            this.gFog.fillRect(0, by, W, S);
        }

        // Trees (far → near)
        const ts = [...this.trees].sort((a, b) => b.z - a.z);
        for (const t of ts) {
            if (t.z <= Z_NEAR || t.z > Z_FAR) continue;
            const p = proj(t.s * t.ox, t.z);
            if (p.y < HORIZON_Y || p.y > H + 100) continue;
            const fa = smoothstep((p.y - HORIZON_Y - FOG_DENSE) / (FOG_H - FOG_DENSE));
            if (this.theme === 'city') {
                t.sprite.setVisible(false);
                const th = Math.max(6, 80 * p.s);
                const tw = Math.max(2, 7 * p.s);
                const lr = Math.max(3, 10 * p.s);
                this.gEnv.fillStyle(0x8899aa, fa);
                this.gEnv.fillRect(p.x - tw / 2, p.y - th, tw, th);
                this.gEnv.fillRect(p.x - tw / 2, p.y - th, tw * 3, tw);
                this.gEnv.fillStyle(0xffeebb, fa * 0.9);
                this.gEnv.fillCircle(p.x + tw * 1.5, p.y - th, lr);
            } else if (t.isStone) {
                t.sprite.setVisible(false);
            } else {
                t.sprite.setVisible(false);
                const th = Math.max(9, 95 * p.s);
                const tw = Math.max(2, 10 * p.s);
                const tr = Math.max(6, 40 * p.s);
                const foliageCY = p.y - th * 0.58;
                const trunkStart = foliageCY + tr;
                if (trunkStart < p.y) {
                    this.gEnv.fillStyle(0x5a3e1e, fa);
                    this.gEnv.fillRect(p.x - tw / 2, trunkStart, tw, p.y - trunkStart);
                }
                this.gEnv.fillStyle(0x2d6e1a, fa);
                this.gEnv.fillCircle(p.x, foliageCY, tr);
                this.gEnv.fillStyle(0x3d8a25, fa * 0.75);
                this.gEnv.fillCircle(p.x - tr * 0.3, foliageCY - tr * 0.2, tr * 0.72);
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
        const skidCol = this.selectedCar === 'modelY' ? 0x777777 : this.selectedCar === 'evS' ? 0x003899 : 0x000000;
        const isEvS = this.selectedCar === 'evS';
        for (const m of this.skidMarks) {
            for (const [tx, ty, h] of [
                [m.lx,  m.y,  8], [m.rx,  m.y,  8],
                [m.flx, m.fy, 6], [m.frx, m.fy, 6]
            ]) {
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
                this.add.text(W / 2, H / 2 - 35, 'PLAYER 1 DONE', {
                    fontFamily: 'Arial Black', fontSize: 26, color: '#00cfff',
                    stroke: '#000000', strokeThickness: 5
                }).setOrigin(0.5).setDepth(22);
                this.add.text(W / 2, H / 2 + 10, 'SCORE: ' + p1Score, {
                    fontFamily: 'Arial Black', fontSize: 24, color: '#ffffff',
                    stroke: '#000000', strokeThickness: 4
                }).setOrigin(0.5).setDepth(22);
                this.time.delayedCall(2500, () => {
                    this.scene.start('Game', { mp: true, player: 2, p1Score });
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
            this.add.text(W / 2 - 130, y - 16, `PLAYER ${playerNum}`, {
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
            () => this.scene.start('Game', { mp: true, player: 1, p1Score: 0 }));
        makeBtn(W / 2, 638, 260, '← MAIN MENU', 0x333333, 0x555555,
            () => this.scene.start('Menu'));
    }
}
