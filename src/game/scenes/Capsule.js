import { Scene } from 'phaser';

const W = 480, H = 720;
const SPACING   = 110;
const NUM_CAPS  = 24;
const CAP_COLORS = [0xffd700, 0xa8a8bc, 0xb8860b, 0xffd700, 0xa8a8bc, 0xffd700, 0xb8860b, 0xa8a8bc];

export class Capsule extends Scene {
    constructor() { super('Capsule'); }

    preload() {
        this.load.image('car2',    'assets/car2.png');
        this.load.image('evS',     'assets/evS.png');
        this.load.image('evX',     'assets/evX.png');
        this.load.image('modelY',  'assets/modelY.png');
    }

    create() {
        this.scrollOffset = 0;
        this.bobT         = 0;
        this.spinning     = false;
        this.spinTime     = 0;
        this.spinDuration = 0;
        this.spinStartVel = 0;
        this.revealed     = false;

        // Dark stadium background
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x060e1e, 0x060e1e, 0x0d1f3c, 0x0d1f3c, 1);
        bg.fillRect(0, 0, W, H);
        bg.fillStyle(0x1a3a6a, 0.35);
        bg.fillRect(0, H / 2 + 88, W, 2);

        this.add.text(W / 2, 52, 'CAPSULE', {
            fontFamily: 'Arial Black', fontSize: 36, color: '#ffffff',
            stroke: '#0033aa', strokeThickness: 7
        }).setOrigin(0.5);

        this.add.text(W / 2, 100, '100 ENERGY POINTS', {
            fontFamily: 'Arial', fontSize: 18, color: '#00cfff',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5);

        // Capsules layer
        this.gCaps = this.add.graphics().setDepth(3);

        // Left / right fade masks
        const mask = this.add.graphics().setDepth(5);
        for (let x = 0; x < 90; x += 3) {
            const a = (90 - x) / 90;
            mask.fillStyle(0x060e1e, a * 0.95);
            mask.fillRect(x, H / 2 - 120, 3, 240);
            mask.fillStyle(0x0d1f3c, a * 0.95);
            mask.fillRect(W - x - 3, H / 2 - 120, 3, 240);
        }


        // Fixed selector arrow below center capsule
        this.arrow = this.add.graphics().setDepth(6);
        const arrow = this.arrow;
        arrow.fillStyle(0xffffff, 0.90);
        arrow.fillTriangle(
            W / 2, H / 2 + 72,
            W / 2 - 16, H / 2 + 92,
            W / 2 + 16, H / 2 + 92
        );
        arrow.fillStyle(0x00cfff, 0.55);
        arrow.fillTriangle(
            W / 2, H / 2 + 76,
            W / 2 - 10, H / 2 + 90,
            W / 2 + 10, H / 2 + 90
        );

        this.tapText = this.add.text(W / 2, H - 80, 'TAP TO SPIN', {
            fontFamily: 'Arial Black', fontSize: 24, color: '#ffdd00',
            stroke: '#000000', strokeThickness: 5
        }).setOrigin(0.5).setDepth(7);

        this.tweens.add({
            targets: this.tapText, alpha: 0.15, duration: 520,
            yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });

        // EV labels for each capsule
        this.capTexts = [];
        for (let i = 0; i < NUM_CAPS; i++) {
            this.capTexts.push(
                this.add.text(0, 0, 'EV', {
                    fontFamily: 'Arial Black', fontSize: 18,
                    color: '#000000', stroke: '#333333', strokeThickness: 1
                }).setOrigin(0.5).setDepth(4).setVisible(false)
            );
        }

        this.input.once('pointerdown', () => this.startSpin());
        this.input.keyboard.once('keydown', () => this.startSpin());
    }

    startSpin() {
        if (this.spinning || this.revealed) return;
        this.spinning     = true;
        this.spinTime     = 0;
        this.spinDuration = 2.2 + Math.random() * 0.9;
        this.spinStartVel = 1100 + Math.random() * 350;
        this.tapText.setVisible(false);
    }

    update(time, delta) {
        if (this.revealed) return;
        const dt = delta / 1000;
        this.bobT += dt;

        if (this.spinning) {
            this.spinTime += dt;
            if (this.spinTime >= this.spinDuration) {
                this.spinning = false;
                this.snapToCapsule();
            } else {
                const t    = this.spinTime / this.spinDuration;
                const ease = t * t * (3 - 2 * t);
                this.scrollOffset += this.spinStartVel * (1 - ease) * dt;
            }
        }

        this.drawCapsules();
    }

    drawCapsules() {
        const g  = this.gCaps;
        const CY = H / 2 - 10;
        g.clear();

        for (let i = 0; i < NUM_CAPS; i++) {
            const cx = W / 2 + i * SPACING - this.scrollOffset;
            const txt = this.capTexts[i];
            if (cx < -80 || cx > W + 80) { txt.setVisible(false); continue; }
            const dist = Math.abs(cx - W / 2);
            const sc   = Math.max(0.52, 1.0 - dist / 400);
            const bob  = this.spinning ? 0 : Math.sin(this.bobT * 1.8 + i * 0.9) * 6 * sc;
            const col  = CAP_COLORS[i % CAP_COLORS.length];
            this.drawBall(g, cx, CY - bob, 54 * sc, col, this.bobT * 2 + i * 0.7);
            const spinAngle = this.bobT * 2 + i * 0.7;
            const spinX = Math.abs(Math.cos(spinAngle));
            txt.setVisible(true).setPosition(cx, CY - bob).setScale(sc * spinX, sc).setRotation(0);
        }

    }

    drawBall(g, cx, cy, r, col, angle) {
        const spin = Math.cos(angle);
        const r0 = (col >> 16) & 0xff, g0 = (col >> 8) & 0xff, b0 = col & 0xff;
        const dk = (Math.floor(r0 * 0.52) << 16) | (Math.floor(g0 * 0.52) << 8) | Math.floor(b0 * 0.52);
        const lt = (Math.min(255, Math.floor(r0 * 1.38)) << 16) | (Math.min(255, Math.floor(g0 * 1.38)) << 8) | Math.min(255, Math.floor(b0 * 1.38));

        g.fillStyle(0x000000, 0.28);
        g.fillEllipse(cx + 4, cy + r * 0.92, r * 1.7, r * 0.38);

        g.fillStyle(dk, 1);
        g.fillCircle(cx, cy, r);
        g.fillStyle(col, 1);
        g.fillCircle(cx, cy, r - 3);

        const pw = r * 0.56 * Math.abs(spin);
        if (pw > 2) {
            g.lineStyle(2, dk, 0.52);
            g.strokeEllipse(cx, cy, pw * 2, r * 1.45);
            g.strokeEllipse(cx, cy, pw * 1.15, r * 0.88);
        }

        g.fillStyle(lt, 0.22);
        g.fillCircle(cx + r * 0.26, cy + r * 0.26, r * 0.14);
    }

    snapToCapsule() {
        const snapped = Math.round(this.scrollOffset / SPACING) * SPACING;
        this.tweens.add({
            targets: this,
            scrollOffset: snapped,
            duration: 380,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                this.time.delayedCall(420, () => this.openCapsule());
            }
        });
    }

    openCapsule() {
        this.revealed = true;

        const fl = this.add.graphics().setDepth(20);
        fl.fillStyle(0xffffff, 1);
        fl.fillRect(0, 0, W, H);
        this.tweens.add({ targets: fl, alpha: 0, duration: 500 });

        const selectedIdx = Math.round(this.scrollOffset / SPACING);
        const selectedCol = CAP_COLORS[((selectedIdx % CAP_COLORS.length) + CAP_COLORS.length) % CAP_COLORS.length];
        const SILVER_PRIZES = [
            { lsKey: 'evspeed_evS',  spriteKey: 'evS',    label: 'EV S', revealY: H / 2 + 10,  revealScale: 0.30 },
            { lsKey: 'evspeed_carY', spriteKey: 'modelY', label: 'EV Y', revealY: H / 2 + 10,  revealScale: 0.25 },
        ];
        const COLOR_UNLOCK = {
            [0xa8a8bc]: SILVER_PRIZES[Math.floor(Math.random() * SILVER_PRIZES.length)],
            [0xb8860b]: { lsKey: 'evspeed_car2', spriteKey: 'car2', label: 'EV RED',  revealY: H / 2 - 130, revealScale: 0.48 },
            [0xffd700]: { lsKey: 'evspeed_evX',  spriteKey: 'evX',  label: 'EV X',    revealX: W / 2 - 5,  revealY: H / 2 - 10,  revealScale: 0.22 },
        };
        const toUnlock = COLOR_UNLOCK[selectedCol] || null;
        const prev = parseInt(localStorage.getItem('evspeed_energy') || '0');
        localStorage.setItem('evspeed_energy', Math.max(0, prev - 100));
        if (toUnlock) localStorage.setItem(toUnlock.lsKey, 'true');

        this.time.delayedCall(300, () => {
            this.gCaps.clear();
            this.capTexts.forEach(t => t.setVisible(false));
            this.arrow.setVisible(false);

            if (!toUnlock) {
                const txt1 = this.add.text(W / 2, H / 2 - 30, 'BETTER LUCK\nNEXT TIME!', {
                    fontFamily: 'Arial Black', fontSize: 32, color: '#ffd700',
                    stroke: '#000000', strokeThickness: 6, align: 'center'
                }).setOrigin(0.5).setDepth(6).setAlpha(0);
                this.tweens.add({ targets: txt1, alpha: 1, duration: 400 });
            } else {
                const glow = this.add.graphics().setDepth(4);
                glow.fillStyle(0x00cfff, 0.10);
                glow.fillCircle(W / 2, H / 2 + 10, 230);
                glow.fillStyle(0x0055ff, 0.07);
                glow.fillCircle(W / 2, H / 2 + 10, 155);

                const carImg = this.add.image(toUnlock.revealX ?? W / 2, toUnlock.revealY, toUnlock.spriteKey)
                    .setScale(0).setDepth(5).setOrigin(0.5, 0.5);
                this.tweens.add({ targets: carImg, scale: toUnlock.revealScale, duration: 700, ease: 'Back.easeOut' });

                for (let k = 0; k < 18; k++) {
                    const ang  = (k / 18) * Math.PI * 2;
                    const dist = 80 + Math.random() * 80;
                    const sx   = W / 2 + Math.cos(ang) * 20;
                    const sy   = H / 2 - 100 + Math.sin(ang) * 20;
                    const star = this.add.graphics().setDepth(6);
                    star.fillStyle(Math.random() < 0.5 ? 0x00cfff : 0xffdd00, 1);
                    star.fillCircle(sx, sy, 3 + Math.random() * 3);
                    this.tweens.add({
                        targets: star,
                        x: Math.cos(ang) * dist, y: Math.sin(ang) * dist,
                        alpha: 0, duration: 700 + Math.random() * 400, ease: 'Power2'
                    });
                }

                const txt1 = this.add.text(W / 2, H / 2 + 210, 'NEW CAR UNLOCKED!', {
                    fontFamily: 'Arial Black', fontSize: 26, color: '#ffdd00',
                    stroke: '#000000', strokeThickness: 5
                }).setOrigin(0.5).setDepth(6).setAlpha(0);
                this.tweens.add({ targets: txt1, alpha: 1, duration: 400, delay: 500 });
            }

            this.time.delayedCall(1800, () => {
                const cont = this.add.text(W / 2, H - 75, 'TAP TO CONTINUE', {
                    fontFamily: 'Arial Black', fontSize: 20, color: '#ffffff',
                    stroke: '#000000', strokeThickness: 3
                }).setOrigin(0.5).setDepth(6);
                this.tweens.add({ targets: cont, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });
                this.input.once('pointerdown', () => this.scene.start('Menu'));
                this.input.keyboard.once('keydown', () => this.scene.start('Menu'));
            });
        });
    }
}
