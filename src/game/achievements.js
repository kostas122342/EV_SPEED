const STAT_KEYS = {
    races: 'evspeed_stat_races',
    energyCollected: 'evspeed_stat_energy_collected',
    maxSpeed: 'evspeed_stat_max_speed',
};

const REWARD_KEY_PREFIX = 'evspeed_achievement_reward_';
const REWARD_TOTAL_KEY = 'evspeed_achievement_rewards_total';
const TIER_REWARD_KEY_PREFIX = 'evspeed_achievement_tier_reward_';
const TIER_COMPLETION_REWARDS = {
    1: 1000,
    2: 2500,
};
const MAX_ACHIEVEMENT_TIER = 2;

const VEHICLE_UNLOCK_KEYS = [
    'evspeed_carY',
    'evspeed_evS',
    'evspeed_evX',
    'evspeed_cbt',
    'evspeed_scooter',
];

export const ACHIEVEMENT_DEFINITIONS = [
    {
        id: 'first_drive',
        tier: 1,
        title: 'FIRST DRIVE',
        description: 'Start your first race.',
        metric: 'races',
        target: 1,
        reward: 50,
        format: value => `${value} / 1`,
    },
    {
        id: 'score_chaser',
        tier: 1,
        title: 'SCORE CHASER',
        description: 'Reach 1,000 points in one run.',
        metric: 'bestScore',
        target: 1000,
        reward: 100,
        format: value => `${value.toLocaleString()} / 1,000`,
    },
    {
        id: 'energy_hunter',
        tier: 1,
        title: 'ENERGY HUNTER',
        description: 'Collect 25 energy points.',
        metric: 'energyCollected',
        target: 25,
        reward: 150,
        format: value => `${value} / 25`,
    },
    {
        id: 'speed_demon',
        tier: 1,
        title: 'SPEED DEMON',
        description: 'Reach a speed of 150 KM/H.',
        metric: 'maxSpeed',
        target: 150,
        reward: 200,
        format: value => `${value} / 150`,
    },
    {
        id: 'garage_builder',
        tier: 1,
        title: 'GARAGE BUILDER',
        description: 'Own 3 different vehicles.',
        metric: 'ownedVehicles',
        target: 3,
        reward: 300,
        format: value => `${value} / 3`,
    },
    {
        id: 'road_legend',
        tier: 1,
        title: 'ROAD LEGEND',
        description: 'Reach 5,000 points in one run.',
        metric: 'bestScore',
        target: 5000,
        reward: 500,
        format: value => `${value.toLocaleString()} / 5,000`,
    },
    {
        id: 'drive_veteran',
        tier: 2,
        title: 'DRIVE VETERAN',
        description: 'Start 10 races.',
        metric: 'races',
        target: 10,
        reward: 200,
        format: value => `${value} / 10`,
    },
    {
        id: 'score_master',
        tier: 2,
        title: 'SCORE MASTER',
        description: 'Reach 10,000 points in one run.',
        metric: 'bestScore',
        target: 10000,
        reward: 300,
        format: value => `${value.toLocaleString()} / 10,000`,
    },
    {
        id: 'energy_magnet',
        tier: 2,
        title: 'ENERGY MAGNET',
        description: 'Collect 100 energy points.',
        metric: 'energyCollected',
        target: 100,
        reward: 400,
        format: value => `${value} / 100`,
    },
    {
        id: 'speed_legend',
        tier: 2,
        title: 'SPEED LEGEND',
        description: 'Reach a speed of 180 KM/H.',
        metric: 'maxSpeed',
        target: 180,
        reward: 500,
        format: value => `${value} / 180`,
    },
    {
        id: 'elite_garage',
        tier: 2,
        title: 'ELITE GARAGE',
        description: 'Own all 6 different vehicles.',
        metric: 'ownedVehicles',
        target: 6,
        reward: 750,
        format: value => `${value} / 6`,
    },
    {
        id: 'road_king',
        tier: 2,
        title: 'ROAD KING',
        description: 'Reach 25,000 points in one run.',
        metric: 'bestScore',
        target: 25000,
        reward: 1000,
        format: value => `${value.toLocaleString()} / 25,000`,
    },
];

function readNumber(key) {
    const value = Number.parseInt(localStorage.getItem(key) || '0', 10);
    return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function writeNumber(key, value) {
    localStorage.setItem(key, Math.max(0, Math.floor(value)).toString());
}

export function recordRaceStarted() {
    writeNumber(STAT_KEYS.races, readNumber(STAT_KEYS.races) + 1);
}

export function recordEnergyCollected(amount = 1) {
    const stored = localStorage.getItem(STAT_KEYS.energyCollected);
    const previous = stored === null
        ? Math.max(0, readNumber('evspeed_energy') - readNumber(REWARD_TOTAL_KEY))
        : readNumber(STAT_KEYS.energyCollected);
    writeNumber(STAT_KEYS.energyCollected, previous + amount);
}

export function recordMaxSpeed(speedKmh) {
    const speed = Math.max(0, Math.floor(speedKmh));
    if (speed > readNumber(STAT_KEYS.maxSpeed)) {
        writeNumber(STAT_KEYS.maxSpeed, speed);
    }
}

function getOwnedVehicleCount() {
    return 1 + VEHICLE_UNLOCK_KEYS.reduce(
        (count, key) => count + (localStorage.getItem(key) === 'true' ? 1 : 0),
        0
    );
}

export function getAchievementSnapshot(requestedTier = null) {
    const bestScore = readNumber('evspeed_highscore');
    const storedEnergyCollected = localStorage.getItem(STAT_KEYS.energyCollected);
    const legacyEnergyCollected = Math.max(
        0,
        readNumber('evspeed_energy') - readNumber(REWARD_TOTAL_KEY)
    );
    const inferredSpeed = bestScore > 0
        ? Math.min(200, Math.floor(100 + Math.sqrt(bestScore) * 1.6))
        : 0;
    const recordedMaxSpeed = readNumber(STAT_KEYS.maxSpeed);
    const metrics = {
        races: readNumber(STAT_KEYS.races),
        bestScore,
        energyCollected: storedEnergyCollected === null
            ? legacyEnergyCollected
            : readNumber(STAT_KEYS.energyCollected),
        maxSpeed: recordedMaxSpeed > 0 ? recordedMaxSpeed : inferredSpeed,
        ownedVehicles: getOwnedVehicleCount(),
    };

    const allItems = ACHIEVEMENT_DEFINITIONS.map(definition => {
        const value = metrics[definition.metric] || 0;
        const progress = Math.min(1, value / definition.target);
        return {
            ...definition,
            value,
            progress,
            completed: progress >= 1,
            progressLabel: definition.format(value),
        };
    });

    allItems.forEach(item => {
        item.rewardClaimed = localStorage.getItem(`${REWARD_KEY_PREFIX}${item.id}`) === 'true';
    });

    const unlockedTier = localStorage.getItem(`${TIER_REWARD_KEY_PREFIX}1`) === 'true'
        ? MAX_ACHIEVEMENT_TIER
        : 1;
    const parsedTier = Number.parseInt(requestedTier, 10);
    const tier = Number.isFinite(parsedTier)
        ? Math.max(1, Math.min(unlockedTier, parsedTier))
        : unlockedTier;
    const items = allItems.filter(item => item.tier === tier);
    const completed = items.filter(item => item.completed).length;
    const tierRewardClaimed = localStorage.getItem(
        `${TIER_REWARD_KEY_PREFIX}${tier}`
    ) === 'true';

    return {
        metrics,
        items,
        completed,
        total: items.length,
        tier,
        unlockedTier,
        tierReward: {
            reward: TIER_COMPLETION_REWARDS[tier],
            available: completed === items.length && !tierRewardClaimed,
            claimed: tierRewardClaimed,
        },
    };
}

export function claimAchievementReward(achievementId) {
    const definition = ACHIEVEMENT_DEFINITIONS.find(item => item.id === achievementId);
    const achievement = definition
        ? getAchievementSnapshot(definition.tier).items.find(item => item.id === achievementId)
        : null;

    if (!achievement?.completed || achievement.rewardClaimed) {
        return { claimed: false, reward: 0, balance: readNumber('evspeed_energy') };
    }

    const balance = readNumber('evspeed_energy') + achievement.reward;
    writeNumber('evspeed_energy', balance);
    writeNumber(
        REWARD_TOTAL_KEY,
        readNumber(REWARD_TOTAL_KEY) + achievement.reward
    );
    localStorage.setItem(`${REWARD_KEY_PREFIX}${achievement.id}`, 'true');

    return { claimed: true, reward: achievement.reward, balance };
}

export function claimTierCompletionReward(tierNumber) {
    const tier = Math.max(
        1,
        Math.min(MAX_ACHIEVEMENT_TIER, Number.parseInt(tierNumber, 10) || 1)
    );
    const snapshot = getAchievementSnapshot(tier);

    if (!snapshot.tierReward.available) {
        return {
            claimed: false,
            reward: 0,
            balance: readNumber('evspeed_energy'),
            nextTier: snapshot.tier,
        };
    }

    const reward = snapshot.tierReward.reward;
    const balance = readNumber('evspeed_energy') + reward;
    writeNumber('evspeed_energy', balance);
    writeNumber(REWARD_TOTAL_KEY, readNumber(REWARD_TOTAL_KEY) + reward);
    localStorage.setItem(`${TIER_REWARD_KEY_PREFIX}${tier}`, 'true');

    return {
        claimed: true,
        reward,
        balance,
        nextTier: Math.min(MAX_ACHIEVEMENT_TIER, tier + 1),
    };
}
