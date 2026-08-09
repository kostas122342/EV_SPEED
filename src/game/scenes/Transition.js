import { Scene } from 'phaser';
import { preloadTransitionAssets } from '../assetManifest.js';
import { stopMenuVideoBackgroundForTarget } from '../menuVideoBackground.js';

const W = 480;
const H = 720;
const LOGO_SIZE = 166;
const LOGO_FRAME_SIZE = 198;
const LOGO_CENTER_Y = 258;
const LOADER_REVEAL_DELAY = 220;

function createRoundedLogoPath() {
    const points = [];
    const half = LOGO_FRAME_SIZE / 2;
    const left = W / 2 - half;
    const right = W / 2 + half;
    const top = LOGO_CENTER_Y - half;
    const bottom = LOGO_CENTER_Y + half;
    const radius = 24;
    const cornerSteps = 12;
    const addArc = (cx, cy, startAngle, endAngle) => {
        for (let i = 1; i <= cornerSteps; i += 1) {
            const angle = startAngle + (endAngle - startAngle) * (i / cornerSteps);
            points.push({ x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius });
        }
    };

    points.push({ x: W / 2, y: top }, { x: right - radius, y: top });
    addArc(right - radius, top + radius, -Math.PI / 2, 0);
    points.push({ x: right, y: bottom - radius });
    addArc(right - radius, bottom - radius, 0, Math.PI / 2);
    points.push({ x: left + radius, y: bottom });
    addArc(left + radius, bottom - radius, Math.PI / 2, Math.PI);
    points.push({ x: left, y: top + radius });
    addArc(left + radius, top + radius, Math.PI, Math.PI * 1.5);
    points.push({ x: W / 2, y: top });
    return points;
}

const LOGO_PATH = createRoundedLogoPath();
const LOGO_PATH_SEGMENTS = LOGO_PATH.slice(1).map((point, index) => {
    const from = LOGO_PATH[index];
    const length = Math.hypot(point.x - from.x, point.y - from.y);
    return { from, to: point, length };
});
const LOGO_PATH_LENGTH = LOGO_PATH_SEGMENTS.reduce((sum, segment) => sum + segment.length, 0);

function getLogoPathPoint(progress) {
    let distance = (((progress % 1) + 1) % 1) * LOGO_PATH_LENGTH;
    for (const segment of LOGO_PATH_SEGMENTS) {
        if (distance <= segment.length) {
            const ratio = segment.length > 0 ? distance / segment.length : 0;
            return {
                x: segment.from.x + (segment.to.x - segment.from.x) * ratio,
                y: segment.from.y + (segment.to.y - segment.from.y) * ratio,
            };
        }
        distance -= segment.length;
    }
    return LOGO_PATH[0];
}

const TRANSITIONS = {
    quick: {
        title: 'EV SYSTEM LINK',
        subtitle: 'SWITCHING DRIVE INTERFACE',
        loadingStatus: 'ROUTING CONTROL DATA',
        readyStatus: 'SYSTEM LINK READY',
        minDuration: 210,
        cachedDuration: 170,
    },
    garage: {
        title: 'GARAGE SYNC',
        subtitle: 'CONNECTING VEHICLE DATABASE',
        loadingStatus: 'LOADING VEHICLE DATA',
        readyStatus: 'GARAGE READY',
        minDuration: 760,
        cachedDuration: 240,
    },
    race: {
        title: 'RACE LOADING',
        subtitle: 'PREPARING THE HIGH VOLTAGE GRID',
        loadingStatus: 'LOADING RACE ENVIRONMENT',
        readyStatus: 'READY TO DRIVE',
        minDuration: 980,
        cachedDuration: 360,
    },
    capsule: {
        title: 'CAPSULE SYNC',
        subtitle: 'CONNECTING REWARD SYSTEM',
        loadingStatus: 'LOADING CAPSULE DATA',
        readyStatus: 'CAPSULE READY',
        minDuration: 580,
        cachedDuration: 230,
    },
};

export class Transition extends Scene {
    constructor() {
        super('Transition');
    }

    init(data = {}) {
        this.sourceSceneKey = data.sourceSceneKey || null;
        this.target = data.target || 'Menu';
        this.targetData = data.targetData || {};
        this.kind = TRANSITIONS[data.kind] ? data.kind : 'quick';
        this.transitionConfig = TRANSITIONS[this.kind];
        this.assetsReady = false;
        this.minimumComplete = false;
        this.completionStarted = false;
        this.loadingError = false;
        this.loaderVisible = false;
        this.visualProgress = { value: 0 };
    }

    create() {
        // This invisible zone blocks taps while the paused source scene stays
        // visible during the short no-flash loading grace period.
        this.add.zone(W / 2, H / 2, W, H)
            .setInteractive()
            .setDepth(1000);

        this.revealTimer = this.time.delayedCall(
            LOADER_REVEAL_DELAY,
            () => this.revealLoader()
        );
        this.startAssetLoading();
    }

    revealLoader() {
        if (this.loaderVisible || this.completionStarted) return;
        if (this.assetsReady && !this.loadingError) {
            this.finishWithoutLoader();
            return;
        }

        this.loaderVisible = true;
        this.cameras.main.setBackgroundColor(0x01050c);
        this.drawScreen();
        this.time.delayedCall(45, () => this.refreshTextTextures());
        this.startMotion();

        if (this.loadingError) {
            this.statusText.setText('RECOVERING ASSET STREAM').setColor('#ff647b');
        }

        this.tweens.add({
            targets: this.visualProgress,
            value: 0.9,
            duration: this.transitionConfig.minDuration,
            ease: 'Sine.easeOut',
            onUpdate: () => {
                this.drawProgress(this.visualProgress.value);
                this.updateStatus(this.visualProgress.value);
            },
            onComplete: () => {
                this.minimumComplete = true;
                this.completeIfReady();
            },
        });
    }

    drawScreen() {
        this.verticalBackdrop = this.add.image(W / 2, H / 2, 'loadingVertical')
            .setDisplaySize(W, H)
            .setAlpha(0.14)
            .setDepth(0);

        const grade = this.add.graphics().setDepth(1);
        grade.fillStyle(0x01050c, 0.7);
        grade.fillRect(0, 0, W, H);
        grade.fillGradientStyle(0x001526, 0x001526, 0x01040a, 0x01040a, 0.16, 0.16, 0.98, 0.98);
        grade.fillRect(0, 0, W, H);

        const logoPlate = this.add.graphics().setDepth(2);
        const logoFrameX = W / 2 - LOGO_FRAME_SIZE / 2;
        const logoFrameY = LOGO_CENTER_Y - LOGO_FRAME_SIZE / 2;
        logoPlate.fillStyle(0x010611, 0.88);
        logoPlate.fillRoundedRect(logoFrameX - 7, logoFrameY - 7, LOGO_FRAME_SIZE + 14, LOGO_FRAME_SIZE + 14, 31);
        logoPlate.lineStyle(1, 0x46ddff, 0.18);
        logoPlate.strokeRoundedRect(logoFrameX, logoFrameY, LOGO_FRAME_SIZE, LOGO_FRAME_SIZE, 24);
        logoPlate.lineStyle(1, 0xff3556, 0.13);
        logoPlate.strokeRoundedRect(logoFrameX + 5, logoFrameY + 5, LOGO_FRAME_SIZE - 10, LOGO_FRAME_SIZE - 10, 20);

        this.logo = this.add.image(W / 2, LOGO_CENTER_Y, 'loadingLogo')
            .setDisplaySize(LOGO_SIZE, LOGO_SIZE)
            .setAlpha(0.97)
            .setDepth(3);

        this.logoProgressFrame = this.add.graphics().setDepth(4).setBlendMode('ADD');
        this.logoOrbitGlow = this.add.circle(W / 2, LOGO_CENTER_Y, 7, 0x54e9ff, 0.17)
            .setDepth(6).setBlendMode('ADD');
        this.logoOrbitHead = this.add.circle(W / 2, LOGO_CENTER_Y, 2.4, 0xffffff, 0.96)
            .setDepth(7).setBlendMode('ADD');
        this.logoOrbitValue = { value: 0 };
        this.lastLogoProgressDraw = -1;

        const frame = this.add.graphics().setDepth(3);
        frame.lineStyle(1, 0x31dfff, 0.58);
        frame.lineBetween(34, 47, 446, 47);
        frame.lineBetween(34, 47, 34, 94);
        frame.lineBetween(446, 47, 446, 94);
        frame.lineStyle(1, 0xff294d, 0.5);
        frame.lineBetween(76, 419, 404, 419);
        frame.fillStyle(0x29dfff, 0.92);
        frame.fillRect(34, 38, 56, 2);
        frame.fillStyle(0xff294d, 0.9);
        frame.fillRect(94, 38, 24, 2);

        this.add.text(34, 24, 'EV SPEED // LOADING', {
            fontFamily: 'Arial Black', fontSize: 10,
            color: '#dbf9ff', letterSpacing: 1.3,
        }).setOrigin(0, 0.5).setDepth(4);
        this.add.text(446, 24, this.kind.toUpperCase(), {
            fontFamily: 'Arial Black', fontSize: 9,
            color: '#ff7188', letterSpacing: 1.25,
        }).setOrigin(1, 0.5).setDepth(4);

        const footer = this.add.graphics().setDepth(4);
        footer.fillGradientStyle(0x020712, 0x020712, 0x000207, 0x000207, 0.82, 0.82, 0.98, 0.98);
        footer.fillRect(0, 438, W, H - 438);
        footer.lineStyle(1, 0x0fd6ff, 0.34);
        footer.lineBetween(34, 447, 446, 447);

        this.add.text(W / 2, 486, this.transitionConfig.title, {
            fontFamily: 'Arial Black',
            fontSize: this.kind === 'race' ? 27 : 25,
            color: '#f6fcff',
            stroke: '#003252',
            strokeThickness: 4,
            letterSpacing: 1.2,
        }).setOrigin(0.5).setDepth(6);

        this.add.text(W / 2, 520, this.transitionConfig.subtitle, {
            fontFamily: 'Arial Black', fontSize: 9,
            color: '#72dff7', letterSpacing: 1.3,
        }).setOrigin(0.5).setDepth(6);

        this.statusText = this.add.text(W / 2, 574, this.transitionConfig.loadingStatus, {
            fontFamily: 'Arial Black', fontSize: 10,
            color: '#9feaff', letterSpacing: 1.25,
        }).setOrigin(0.5).setDepth(7);

        this.add.text(W / 2, 678, 'ELECTRIC PERFORMANCE // URBAN SPEED', {
            fontFamily: 'Arial', fontSize: 8,
            color: '#4f7d92', letterSpacing: 1.4,
        }).setOrigin(0.5).setDepth(7);

        this.drawProgress(0);
    }

    startMotion() {
        const logoScaleX = this.logo.scaleX;
        const logoScaleY = this.logo.scaleY;
        this.tweens.add({
            targets: this.logo,
            scaleX: logoScaleX * 1.018,
            scaleY: logoScaleY * 1.018,
            duration: 1450,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
        this.tweens.add({
            targets: this.logoOrbitValue,
            value: 1,
            duration: 1350,
            repeat: -1,
            ease: 'Linear',
            onUpdate: () => this.drawLogoOrbit(this.logoOrbitValue.value),
        });
    }

    startAssetLoading() {
        const queuedFiles = preloadTransitionAssets(this, this.kind);

        if (queuedFiles === 0) {
            this.assetsReady = true;
            this.finishWithoutLoader();
            return;
        }

        this.load.once('complete', () => {
            this.assetsReady = true;
            if (this.loaderVisible) this.completeIfReady();
            else this.finishWithoutLoader();
        });
        this.load.on('loaderror', () => {
            this.loadingError = true;
            if (!this.loaderVisible) this.revealLoader();
            else this.statusText.setText('RECOVERING ASSET STREAM').setColor('#ff647b');
        });
        this.load.start();
    }

    finishWithoutLoader() {
        if (this.completionStarted) return;
        this.completionStarted = true;
        this.time.delayedCall(0, () => this.startTargetScene());
    }

    completeIfReady() {
        if (!this.loaderVisible || !this.assetsReady || !this.minimumComplete || this.completionStarted) return;
        this.completionStarted = true;
        this.statusText.setText(this.transitionConfig.readyStatus).setColor('#70f7c3');
        this.tweens.add({
            targets: this.visualProgress,
            value: 1,
            duration: 170,
            ease: 'Cubic.easeOut',
            onUpdate: () => this.drawProgress(this.visualProgress.value),
            onComplete: () => this.finishTransition(),
        });
    }

    drawProgress(value) {
        const progress = Math.max(0, Math.min(1, value));
        this.drawLogoProgress(progress);
    }

    drawLogoProgress(progress) {
        if (progress < 1 && Math.abs(progress - this.lastLogoProgressDraw) < 0.02) return;
        this.lastLogoProgressDraw = progress;
        this.logoProgressFrame.clear();
        if (progress <= 0) return;

        let remaining = LOGO_PATH_LENGTH * progress;
        let head = LOGO_PATH[0];
        this.logoProgressFrame.lineStyle(3, 0x2edfff, 0.9);
        this.logoProgressFrame.beginPath();
        this.logoProgressFrame.moveTo(head.x, head.y);
        for (const segment of LOGO_PATH_SEGMENTS) {
            if (remaining <= 0) break;
            const ratio = Math.min(1, remaining / segment.length);
            head = {
                x: segment.from.x + (segment.to.x - segment.from.x) * ratio,
                y: segment.from.y + (segment.to.y - segment.from.y) * ratio,
            };
            this.logoProgressFrame.lineTo(head.x, head.y);
            remaining -= segment.length;
            if (ratio < 1) break;
        }
        this.logoProgressFrame.strokePath();
    }

    drawLogoOrbit(progress) {
        const point = getLogoPathPoint(progress);
        this.logoOrbitGlow.setPosition(point.x, point.y);
        this.logoOrbitHead.setPosition(point.x, point.y);
    }

    updateStatus(progress) {
        if (this.loadingError || this.completionStarted) return;
        const message = progress < 0.78
            ? this.transitionConfig.loadingStatus
            : 'FINALIZING ASSET STREAM';
        if (this.statusText.text !== message) this.statusText.setText(message);
    }

    refreshTextTextures() {
        this.children.list.forEach(child => {
            if (child.type !== 'Text') return;
            child.setPadding(7, 3, 7, 3);
            child.updateText();
        });
    }

    finishTransition() {
        const sweep = this.add.rectangle(-W, H / 2, W * 1.45, 2, 0xd8fbff, 0.96)
            .setDepth(30)
            .setBlendMode('ADD')
            .setRotation(-0.09);
        this.tweens.add({
            targets: sweep,
            x: W * 1.65,
            scaleY: 13,
            alpha: 0,
            duration: 260,
            ease: 'Cubic.easeIn',
        });
        this.time.delayedCall(120, () => {
            this.cameras.main.flash(70, 75, 215, 255, false);
            this.cameras.main.fadeOut(190, 0, 3, 10);
            this.time.delayedCall(195, () => this.startTargetScene());
        });
    }

    startTargetScene() {
        stopMenuVideoBackgroundForTarget(this, this.target);
        if (this.sourceSceneKey) this.scene.stop(this.sourceSceneKey);
        this.scene.start(this.target, this.targetData);
    }
}
