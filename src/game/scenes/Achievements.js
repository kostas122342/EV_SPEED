import { Scene } from 'phaser';
import {
    claimAchievementReward,
    claimTierCompletionReward,
    getAchievementSnapshot,
} from '../achievements.js';
import { addMenuVideoBackground, preloadMenuVideo } from '../menuVideoBackground.js';
import { transitionToScene } from '../sceneTransition.js';

const W = 480;
const H = 720;
const CARD_X = 24;
const CARD_W = W - 48;
const CARD_H = 64;
const CARD_START_Y = 160;
const CARD_GAP = 72;

export class Achievements extends Scene {
    constructor() {
        super('Achievements');
    }

    init(data = {}) {
        this.requestedTier = data.tier ?? null;
    }

    preload() {
        preloadMenuVideo(this);
    }

    create() {
        addMenuVideoBackground(this, W, H);
        const snapshot = getAchievementSnapshot(this.requestedTier);
        this.activeTier = snapshot.tier;

        const shade = this.add.graphics().setDepth(1);
        shade.fillStyle(0x000000, 0.70);
        shade.fillRect(0, 0, W, H);

        const topChrome = this.add.graphics().setDepth(8);
        topChrome.fillStyle(0x010712, 0.88);
        topChrome.fillRect(0, 0, W, 126);
        topChrome.lineStyle(1.5, 0x13d9ff, 0.48);
        topChrome.lineBetween(26, 86, W - 26, 86);
        topChrome.fillStyle(0x14dfff, 0.9);
        topChrome.fillRoundedRect(42, 101, W - 84, 7, 3.5);
        if (snapshot.completed > 0) {
            topChrome.fillStyle(0xff3654, 0.95);
            topChrome.fillRoundedRect(42, 101, (W - 84) * (snapshot.completed / snapshot.total), 7, 3.5);
        }

        this.add.text(W / 2, 40, 'ACHIEVEMENTS', {
            fontFamily: 'Arial Black',
            fontSize: 30,
            color: '#ffffff',
            stroke: '#0033aa',
            strokeThickness: 7,
            fixedWidth: 360,
            align: 'center',
        }).setPadding(12, 4, 12, 4).setOrigin(0.5).setDepth(10);

        this.add.text(
            W / 2,
            72,
            `TIER ${snapshot.tier}  •  ${snapshot.completed} / ${snapshot.total} COMPLETED`,
            {
            fontFamily: 'Arial Black',
            fontSize: 10,
            color: snapshot.completed === snapshot.total ? '#75ffc2' : '#79e8ff',
            letterSpacing: 1.1,
            }
        ).setOrigin(0.5).setDepth(10);

        this.createTierNavigation(snapshot);

        snapshot.items.forEach((achievement, index) => {
            this.drawAchievementCard(achievement, index);
        });

        if (snapshot.tierReward.available) {
            this.createTierCompletionReward(snapshot);
        } else if (snapshot.tierReward.claimed) {
            this.add.text(W / 2, 575, `TIER ${snapshot.tier} MASTERED  ✓`, {
                fontFamily: 'Arial Black',
                fontSize: 11,
                color: '#ffd85a',
                stroke: '#000000',
                strokeThickness: 2,
            }).setOrigin(0.5).setDepth(7);
        }

        this.createBackButton();
    }

    createTierNavigation(snapshot) {
        const addArrow = (x, label, targetTier) => {
            const button = this.add.graphics().setDepth(9);
            const draw = hover => {
                button.clear();
                button.fillStyle(hover ? 0x123354 : 0x071726, 0.95);
                button.fillCircle(x, 72, 15);
                button.lineStyle(1.5, hover ? 0xffd85a : 0x22d8ff, 0.9);
                button.strokeCircle(x, 72, 15);
            };
            draw(false);

            this.add.text(x, 70, label, {
                fontFamily: 'Arial Black',
                fontSize: 21,
                color: '#ffffff',
            }).setOrigin(0.5).setDepth(10);

            this.add.zone(x, 72, 38, 38)
                .setInteractive({ useHandCursor: true })
                .setDepth(11)
                .on('pointerover', () => draw(true))
                .on('pointerout', () => draw(false))
                .on('pointerdown', () => this.scene.restart({ tier: targetTier }));
        };

        if (snapshot.tier > 1) addArrow(48, '‹', snapshot.tier - 1);
        if (snapshot.tier < snapshot.unlockedTier) addArrow(432, '›', snapshot.tier + 1);
    }

    drawAchievementCard(achievement, index) {
        const centerY = CARD_START_Y + index * CARD_GAP;
        const top = centerY - CARD_H / 2;
        const accent = achievement.completed ? 0x55f2ad : 0x18cfff;

        const card = this.add.graphics().setDepth(3);
        card.fillStyle(0x02050d, 0.93);
        card.fillRoundedRect(CARD_X + 3, top + 4, CARD_W, CARD_H, 13);
        card.fillStyle(achievement.completed ? 0x071b1a : 0x07101e, 0.96);
        card.fillRoundedRect(CARD_X, top, CARD_W, CARD_H, 13);
        card.fillStyle(accent, achievement.completed ? 0.17 : 0.08);
        card.fillRoundedRect(CARD_X + 2, top + 2, CARD_W - 4, 24, { tl: 11, tr: 11, bl: 2, br: 2 });
        card.lineStyle(1.4, accent, achievement.completed ? 0.9 : 0.42);
        card.strokeRoundedRect(CARD_X, top, CARD_W, CARD_H, 13);
        card.fillStyle(accent, 0.95);
        card.fillRoundedRect(CARD_X, top + 12, 4, CARD_H - 24, 2);

        card.fillStyle(achievement.completed ? 0x0b563d : 0x071b30, 1);
        card.fillCircle(54, centerY, 20);
        card.lineStyle(1.5, accent, 0.9);
        card.strokeCircle(54, centerY, 20);

        this.add.text(54, centerY, achievement.completed ? '✓' : `${index + 1}`, {
            fontFamily: 'Arial Black',
            fontSize: achievement.completed ? 22 : 17,
            color: achievement.completed ? '#7dffc5' : '#67e6ff',
        }).setOrigin(0.5).setDepth(5);

        this.add.text(84, centerY - 16, achievement.title, {
            fontFamily: 'Arial Black',
            fontSize: 14,
            color: achievement.completed ? '#85ffca' : '#ffffff',
        }).setOrigin(0, 0.5).setDepth(5);

        const rewardX = CARD_X + CARD_W - 112;
        const rewardY = centerY - 22;
        const rewardW = 100;
        const rewardH = 28;

        if (!achievement.completed) {
            this.add.text(CARD_X + CARD_W - 14, centerY + 3, achievement.progressLabel, {
                fontFamily: 'Arial Black',
                fontSize: 8,
                color: '#73dff7',
            }).setOrigin(1, 0.5).setDepth(5);
        } else if (achievement.rewardClaimed) {
            this.add.text(CARD_X + CARD_W - 14, centerY - 15, 'DONE', {
                fontFamily: 'Arial Black',
                fontSize: 9,
                color: '#69f6b5',
            }).setOrigin(1, 0.5).setDepth(5);
        } else {
            this.createRewardButton(
                achievement,
                rewardX,
                rewardY,
                rewardW,
                rewardH
            );
        }

        this.add.text(84, centerY + 3, achievement.description, {
            fontFamily: 'Arial',
            fontSize: 10,
            color: '#a9bed0',
        }).setOrigin(0, 0.5).setDepth(5);

        const barX = 84;
        const barY = centerY + 19;
        const barW = CARD_X + CARD_W - barX - 14;
        card.fillStyle(0x0b2031, 1);
        card.fillRoundedRect(barX, barY, barW, 5, 2.5);
        if (achievement.progress > 0) {
            card.fillStyle(accent, 1);
            card.fillRoundedRect(barX, barY, Math.max(5, barW * achievement.progress), 5, 2.5);
        }
    }

    createRewardButton(achievement, x, y, width, height) {
        const button = this.add.graphics().setDepth(4);
        const draw = hover => {
            button.clear();
            button.fillStyle(hover ? 0x784800 : 0x6e3b00, 1);
            button.fillRoundedRect(x + 2, y + 3, width, height, 7);
            button.fillStyle(hover ? 0xffb800 : 0xffa600, 1);
            button.fillRoundedRect(x, y + 2, width, height, 7);
            button.fillStyle(hover ? 0xffdb48 : 0xffca20, 1);
            button.fillRoundedRect(x, y, width, height - 3, 7);
        };
        draw(false);

        this.add.text(x + 58, y + height / 2, `+${achievement.reward}`, {
            fontFamily: 'Arial Black',
            fontSize: 11,
            color: '#111111',
        }).setOrigin(1, 0.5).setDepth(5);

        this.add.image(x + 78, y + height / 2, 'energyLogo')
            .setOrigin(0.5)
            .setScale(0.16)
            .setDepth(5);

        const zone = this.add.zone(
            x + width / 2,
            y + height / 2,
            width,
            height
        ).setInteractive({ useHandCursor: true }).setDepth(6)
            .on('pointerover', () => draw(true))
            .on('pointerout', () => draw(false))
            .on('pointerdown', () => {
                zone.disableInteractive();
                const result = claimAchievementReward(achievement.id);
                if (!result.claimed) {
                    this.scene.restart({ tier: this.activeTier });
                    return;
                }

                const feedback = this.add.text(
                    x + width / 2,
                    y - 2,
                    `+${result.reward} ENERGY`,
                    {
                        fontFamily: 'Arial Black',
                        fontSize: 11,
                        color: '#ffe15a',
                        stroke: '#000000',
                        strokeThickness: 2,
                    }
                ).setOrigin(0.5).setDepth(12);

                this.tweens.add({
                    targets: feedback,
                    y: feedback.y - 18,
                    alpha: 0,
                    duration: 360,
                    ease: 'Cubic.easeOut',
                });
                this.time.delayedCall(300, () => {
                    this.scene.restart({ tier: this.activeTier });
                });
            });
    }

    createTierCompletionReward(snapshot) {
        const x = 60;
        const y = 564;
        const width = 360;
        const height = 38;
        const button = this.add.graphics().setDepth(7);
        const draw = hover => {
            button.clear();
            button.fillStyle(0x5b2600, 1);
            button.fillRoundedRect(x + 3, y + 5, width, height, 11);
            button.fillStyle(hover ? 0xffa900 : 0xf28b00, 1);
            button.fillRoundedRect(x, y + 2, width, height, 11);
            button.fillStyle(hover ? 0xffdf55 : 0xffc928, 1);
            button.fillRoundedRect(x, y, width, height - 5, 11);
            button.lineStyle(1.5, 0xfff0a0, hover ? 1 : 0.75);
            button.strokeRoundedRect(x, y, width, height, 11);
        };
        draw(false);

        this.add.text(x + 112, y + height / 2, 'OBTAIN REWARD', {
            fontFamily: 'Arial Black',
            fontSize: 13,
            color: '#181000',
        }).setOrigin(0.5).setDepth(8);

        this.add.text(x + 278, y + height / 2, `+${snapshot.tierReward.reward}`, {
            fontFamily: 'Arial Black',
            fontSize: 14,
            color: '#181000',
        }).setOrigin(1, 0.5).setDepth(8);

        this.add.image(x + 314, y + height / 2, 'energyLogo')
            .setOrigin(0.5)
            .setScale(0.19)
            .setDepth(8);

        const zone = this.add.zone(
            x + width / 2,
            y + height / 2,
            width,
            height
        ).setInteractive({ useHandCursor: true }).setDepth(9)
            .on('pointerover', () => draw(true))
            .on('pointerout', () => draw(false))
            .on('pointerdown', () => {
                zone.disableInteractive();
                const result = claimTierCompletionReward(snapshot.tier);
                if (!result.claimed) {
                    this.scene.restart({ tier: snapshot.tier });
                    return;
                }

                const feedback = this.add.text(W / 2, 548, `+${result.reward} ENERGY`, {
                    fontFamily: 'Arial Black',
                    fontSize: 17,
                    color: '#ffe36a',
                    stroke: '#000000',
                    strokeThickness: 3,
                }).setOrigin(0.5).setDepth(15);
                this.tweens.add({
                    targets: feedback,
                    y: feedback.y - 30,
                    scale: 1.12,
                    alpha: 0,
                    duration: 520,
                    ease: 'Cubic.easeOut',
                });
                this.time.delayedCall(460, () => {
                    this.scene.restart({ tier: result.nextTier });
                });
            });
    }

    createBackButton() {
        const footerTop = H - 111;
        const footer = this.add.graphics().setDepth(8);
        footer.fillStyle(0x01040b, 0.92);
        footer.fillRect(0, footerTop, W, H - footerTop);
        footer.lineStyle(1, 0x13d9ff, 0.25);
        footer.lineBetween(32, footerTop, W - 32, footerTop);

        const bw = 200;
        const bh = 56;
        const bx = W / 2;
        const by = H - 66;
        const button = this.add.graphics().setDepth(9);
        const draw = hover => {
            button.clear();
            button.fillStyle(hover ? 0x550000 : 0x880000, 1);
            button.fillRoundedRect(bx - bw / 2 + 3, by - bh / 2 + 5, bw, bh, 12);
            button.fillStyle(hover ? 0x770000 : 0xaa0000, 1);
            button.fillRoundedRect(bx - bw / 2, by - bh / 2, bw, bh, 12);
            button.fillStyle(hover ? 0x993333 : 0xcc2222, 1);
            button.fillRoundedRect(bx - bw / 2 + 2, by - bh / 2 + 2, bw - 4, bh / 2, { tl: 10, tr: 10, bl: 0, br: 0 });
        };
        draw(false);

        this.add.text(bx, by, 'BACK', {
            fontFamily: 'Arial Black',
            fontSize: 24,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
            fontStyle: 'italic',
        }).setOrigin(0.5).setDepth(10);

        this.add.zone(bx, by, bw, bh).setInteractive().setDepth(11)
            .on('pointerover', () => draw(true))
            .on('pointerout', () => draw(false))
            .on('pointerdown', () => transitionToScene(this, 'Menu'));
    }
}
