import { Scene } from 'phaser';
import { preloadMenuAssets } from '../assetManifest.js';
import { preloadMenuVideo, startMenuVideoBackground } from '../menuVideoBackground.js';

const W = 480;
const H = 720;
const BASE_PROGRESS_MS = 2050;
const FINAL_PROGRESS_MS = 420;

const STATUS_MESSAGES = [
    'POWERING THE EV CORE',
    'CONNECTING CITY GRID',
    'SYNCING DRIVE SYSTEMS',
    'PREPARING RACE CONTROL',
];

export class Loading extends Scene {
    constructor() {
        super('Loading');
    }

    init() {
        this.assetsReady = false;
        this.minimumCinematicComplete = false;
        this.progressCompletionStarted = false;
        this.transitioning = false;
        this.loadingError = false;
        this.menuBackgroundReady = false;
        this.visualProgress = { value: 0 };
    }

    preload() {
        this.cameras.main.setBackgroundColor(0x01050c);
        this.createLoadingInterface();

        this.load.on('filecomplete', key => {
            if (key === 'loadingVertical') this.revealVerticalArtwork();
        });

        this.load.image('loadingVertical', 'assets/EVSPEED_VERTICAL.webp');
        this.load.image('loadingLogo', 'assets/EVSPEED_LOGO.webp');
    }

    create() {
        if (!this.backdrop && this.textures.exists('loadingVertical')) {
            this.revealVerticalArtwork();
        }
        this.cameras.main.fadeIn(260, 0, 0, 0);
        this.startArtworkMotion();
        this.startProgressAnimation();
        this.startMenuAssetLoading();
    }

    createLoadingInterface() {
        const base = this.add.graphics().setDepth(0);
        base.fillGradientStyle(0x06172a, 0x03101e, 0x01040a, 0x01040a, 1, 1, 1, 1);
        base.fillRect(0, 0, W, H);

        this.shade = this.add.graphics().setDepth(2);
        this.shade.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.12, 0.12, 0.84, 0.84);
        this.shade.fillRect(0, 0, W, H);
        this.shade.fillStyle(0x01040a, 0.72);
        this.shade.fillRect(0, 582, W, 138);

        const chrome = this.add.graphics().setDepth(5);
        chrome.fillStyle(0x00cfff, 0.9);
        chrome.fillRect(38, 32, 54, 2);
        chrome.fillStyle(0xff2448, 0.88);
        chrome.fillRect(96, 32, 22, 2);
        chrome.lineStyle(1, 0x4adfff, 0.35);
        chrome.lineBetween(38, 41, 442, 41);
        chrome.lineStyle(1, 0xff2448, 0.28);
        chrome.lineBetween(58, 588, 422, 588);

        this.add.text(38, 22, 'EV SPEED // SYSTEM BOOT', {
            fontFamily: 'Arial Black', fontSize: 10,
            color: '#dffaff', letterSpacing: 1.25,
            stroke: '#00131f', strokeThickness: 1,
        }).setOrigin(0, 0.5).setDepth(6);

        this.add.text(442, 22, 'HIGH VOLTAGE', {
            fontFamily: 'Arial Black', fontSize: 9,
            color: '#ff7188', letterSpacing: 1.1,
        }).setOrigin(1, 0.5).setDepth(6);

        this.add.text(50, 617, 'INITIALIZING', {
            fontFamily: 'Arial Black', fontSize: 10,
            color: '#a7eefe', letterSpacing: 1.35,
        }).setOrigin(0, 0.5).setDepth(6);

        this.percentText = this.add.text(430, 617, '00%', {
            fontFamily: 'Arial Black', fontSize: 15,
            color: '#ffffff', stroke: '#002f4b', strokeThickness: 2,
        }).setOrigin(1, 0.5).setDepth(7);

        const track = this.add.graphics().setDepth(6);
        track.fillStyle(0x06111d, 0.98);
        track.fillRoundedRect(50, 639, 380, 8, 4);
        track.lineStyle(1, 0x3384a5, 0.82);
        track.strokeRoundedRect(50, 639, 380, 8, 4);

        this.progressFill = this.add.graphics().setDepth(7).setBlendMode('ADD');
        this.progressGlow = this.add.graphics().setDepth(8).setBlendMode('ADD');

        this.statusText = this.add.text(W / 2, 677, STATUS_MESSAGES[0], {
            fontFamily: 'Arial Black', fontSize: 10,
            color: '#8ddff5', letterSpacing: 1.25,
            stroke: '#00131f', strokeThickness: 1,
        }).setOrigin(0.5).setDepth(7);

        this.scanLine = this.add.rectangle(W / 2, 95, W * 0.82, 1, 0x83ecff, 0)
            .setDepth(4)
            .setBlendMode('ADD');
        this.streakLayer = this.add.container(0, 0).setDepth(4);
        this.drawProgress(0);
    }

    revealVerticalArtwork() {
        if (this.backdrop) return;
        this.backdrop = this.add.image(W / 2, H / 2, 'loadingVertical')
            .setDisplaySize(W, H)
            .setDepth(1)
            .setAlpha(0);
        this.tweens.add({
            targets: this.backdrop,
            alpha: 1,
            duration: 380,
            ease: 'Sine.easeOut',
        });
    }

    startArtworkMotion() {
        if (this.backdrop) {
            const startScaleX = this.backdrop.scaleX;
            const startScaleY = this.backdrop.scaleY;
            this.tweens.add({
                targets: this.backdrop,
                scaleX: startScaleX * 1.035,
                scaleY: startScaleY * 1.035,
                y: H / 2 - 5,
                duration: 3200,
                ease: 'Sine.easeInOut',
            });
        }

        this.tweens.add({
            targets: this.scanLine,
            y: 545,
            alpha: { from: 0, to: 0.42 },
            duration: 1450,
            repeat: -1,
            repeatDelay: 280,
            ease: 'Sine.easeInOut',
        });

        this.streakTimer = this.time.addEvent({
            delay: 170,
            loop: true,
            callback: () => this.spawnEdgeStreak(),
        });

    }

    startMenuAssetLoading() {
        const queuedFiles = preloadMenuAssets(this) + preloadMenuVideo(this);

        if (queuedFiles === 0) {
            this.handleAssetsReady();
            return;
        }

        this.load.once('complete', () => this.handleAssetsReady());
        this.load.on('loaderror', () => {
            this.loadingError = true;
            this.statusText.setText('RECOVERING ASSET STREAM').setColor('#ff6078');
        });
        this.load.start();
    }

    handleAssetsReady() {
        if (this.assetsReady) return;
        this.assetsReady = true;
        this.startMenuBackgroundWarmup();
    }

    startMenuBackgroundWarmup() {
        const background = startMenuVideoBackground(this);
        const markReady = () => {
            if (this.menuBackgroundReady) return;
            this.menuBackgroundReady = true;
            if (this.menuReadyFallback) this.menuReadyFallback.remove(false);
            this.completeProgressIfReady();
        };

        if (background?.videoReady) {
            markReady();
            return;
        }

        background?.events.once('menu-video-ready', markReady);
        // Muted/no-audio playback should always autoplay. This guard prevents
        // an unusual browser codec failure from trapping the boot screen.
        this.menuReadyFallback = this.time.delayedCall(2200, markReady);
    }

    startProgressAnimation() {
        this.tweens.add({
            targets: this.visualProgress,
            value: 0.9,
            duration: BASE_PROGRESS_MS,
            ease: 'Sine.easeOut',
            onUpdate: () => {
                this.drawProgress(this.visualProgress.value);
                this.updateStatus(this.visualProgress.value);
            },
            onComplete: () => {
                this.minimumCinematicComplete = true;
                this.completeProgressIfReady();
            },
        });
    }

    completeProgressIfReady() {
        if (!this.assetsReady || !this.menuBackgroundReady || !this.minimumCinematicComplete || this.progressCompletionStarted) return;
        this.progressCompletionStarted = true;
        this.tweens.add({
            targets: this.visualProgress,
            value: 1,
            duration: FINAL_PROGRESS_MS,
            ease: 'Cubic.easeOut',
            onUpdate: () => {
                this.drawProgress(this.visualProgress.value);
                this.updateStatus(this.visualProgress.value);
            },
            onComplete: () => this.time.delayedCall(180, () => this.finishLoading()),
        });
    }

    drawProgress(value) {
        if (!this.progressFill) return;
        const progress = Math.max(0, Math.min(1, value));
        const width = 374 * progress;
        this.progressFill.clear();
        this.progressGlow.clear();

        if (width > 0) {
            this.progressFill.fillGradientStyle(0x21dfff, 0x8ef4ff, 0x008dcc, 0xff274a, 1, 1, 1, 0.96);
            this.progressFill.fillRoundedRect(53, 642, Math.max(6, width), 3, 1.5);
            const capX = Math.min(427, 53 + width);
            this.progressGlow.fillStyle(0xbff9ff, 0.22);
            this.progressGlow.fillCircle(capX, 643.5, 9);
            this.progressGlow.fillStyle(0xffffff, 0.95);
            this.progressGlow.fillCircle(capX, 643.5, 2);
        }
        const percent = `${Math.round(progress * 100).toString().padStart(2, '0')}%`;
        if (this.percentText.text !== percent) this.percentText.setText(percent);
    }

    updateStatus(progress) {
        if (this.loadingError) return;
        let message = 'FINALIZING EV SYSTEMS';
        if (progress < 0.3) message = STATUS_MESSAGES[0];
        else if (progress < 0.58) message = STATUS_MESSAGES[1];
        else if (progress < 0.8) message = STATUS_MESSAGES[2];
        else if (progress < 0.94) message = STATUS_MESSAGES[3];
        if (this.statusText.text !== message) this.statusText.setText(message);
    }

    spawnEdgeStreak() {
        const fromLeft = Math.random() < 0.5;
        const width = 36 + Math.random() * 70;
        const line = this.add.rectangle(
            fromLeft ? -width : W + width,
            420 + Math.random() * 145,
            width,
            1,
            fromLeft ? 0x27dfff : 0xff294d,
            0.16 + Math.random() * 0.24
        ).setRotation(fromLeft ? -0.08 : 0.08).setBlendMode('ADD');
        this.streakLayer.add(line);
        this.tweens.add({
            targets: line,
            x: fromLeft ? W + width : -width,
            alpha: 0,
            duration: 380 + Math.random() * 280,
            ease: 'Cubic.easeIn',
            onComplete: () => line.destroy(),
        });
    }

    finishLoading() {
        if (this.transitioning) return;
        this.transitioning = true;
        this.statusText.setText('EV SYSTEMS ONLINE').setColor('#70f7c3');

        const sweep = this.add.rectangle(-W, H * 0.51, W * 1.5, 2, 0xd9fbff, 0.96)
            .setDepth(20)
            .setBlendMode('ADD')
            .setRotation(-0.1);
        this.tweens.add({
            targets: sweep,
            x: W * 1.65,
            scaleY: 14,
            alpha: 0,
            duration: 360,
            ease: 'Cubic.easeIn',
            onComplete: () => this.scene.start('Menu'),
        });
    }
}
