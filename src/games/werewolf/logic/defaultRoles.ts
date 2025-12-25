import type { RoleDefinition } from './types';

export const DEFAULT_ROLES: RoleDefinition[] = [
    {
        id: 'WEREWOLF',
        name: 'Werewolf',
        description: 'Wake up at night and kill a villager.',
        icon: '🐺',
        alignment: 'WEREWOLF',
        abilities: [
            { type: 'KILL', timing: 'EVERY_NIGHT', targetCount: 1 }
        ],
        isCustom: false
    },
    {
        id: 'WITCH',
        name: 'Witch',
        description: 'Has two potions: one to kill and one to heal.',
        icon: '🧙‍♀️',
        alignment: 'VILLAGER',
        abilities: [
            { type: 'HEAL', timing: 'EVERY_NIGHT', targetCount: 1, usesPerGame: 1 },
            { type: 'KILL', timing: 'EVERY_NIGHT', targetCount: 1, usesPerGame: 1 }
        ],
        isCustom: false
    },
    {
        id: 'SEER',
        name: 'Seer',
        description: 'Can see the role of one player each night.',
        icon: '🔮',
        alignment: 'VILLAGER',
        abilities: [
            { type: 'CHECK_ROLE', timing: 'EVERY_NIGHT', targetCount: 1 }
        ],
        isCustom: false
    },
    {
        id: 'CUPID',
        name: 'Cupid',
        description: 'Links two players as lovers on the first night.',
        icon: '💘',
        alignment: 'VILLAGER',
        abilities: [
            { type: 'LINK_LOVERS', timing: 'FIRST_NIGHT', targetCount: 2 }
        ],
        isCustom: false
    },
    {
        id: 'HUNTER',
        name: 'Hunter',
        description: 'If killed, can shoot another player.',
        icon: '🔫',
        alignment: 'VILLAGER',
        abilities: [], // Passive ability, triggered on death
        isCustom: false
    },
    {
        id: 'LITTLE_GIRL',
        name: 'Little Girl',
        description: 'Can secretly peek while werewolves are active.',
        icon: '👧',
        alignment: 'VILLAGER',
        abilities: [
            { type: 'PEEK', timing: 'EVERY_NIGHT', targetCount: 0 }
        ],
        isCustom: false
    },
    {
        id: 'DETECTIVE',
        name: 'Detective',
        description: 'Can check the exact role of a player.',
        icon: '🕵️‍♂️',
        alignment: 'VILLAGER',
        abilities: [
            { type: 'CHECK_ROLE', timing: 'EVERY_NIGHT', targetCount: 1 }
        ],
        isCustom: false
    },
    {
        id: 'GUARDIAN',
        name: 'Guardian',
        description: 'Protects one player each night.',
        icon: '🛡️',
        alignment: 'VILLAGER',
        abilities: [
            { type: 'PROTECT', timing: 'EVERY_NIGHT', targetCount: 1 }
        ],
        isCustom: false
    },
    {
        id: 'BLACK_CAT',
        name: 'Black Cat',
        description: 'Each night, curse a player to give them an extra vote against them.',
        icon: '🐈‍⬛',
        alignment: 'VILLAGER',
        abilities: [
            { type: 'CURSE', timing: 'EVERY_NIGHT', targetCount: 1 }
        ],
        isCustom: false
    },
    {
        id: 'WISE',
        name: 'Wise Elder',
        description: 'Survives the first werewolf attack.',
        icon: '👴',
        alignment: 'VILLAGER',
        abilities: [], // Passive
        isCustom: false
    },
    {
        id: 'BLACK_WEREWOLF',
        name: 'Black Werewolf',
        description: 'Can infect one victim to become a werewolf instead of killing them.',
        icon: '🧛‍♂️',
        alignment: 'WEREWOLF',
        abilities: [
            { type: 'INFECT', timing: 'EVERY_NIGHT', targetCount: 1, usesPerGame: 1 }
        ],
        isCustom: false
    },
    {
        id: 'WHITE_WEREWOLF',
        name: 'White Werewolf',
        description: 'Wakes up every other night to kill a werewolf.',
        icon: '🐺⚪',
        alignment: 'NEUTRAL', // Wins alone
        abilities: [
            { type: 'KILL', timing: 'ROUND_NUMBER', targetCount: 1 } // Simplified timing representation
        ],
        isCustom: false
    },
    {
        id: 'ANGEL',
        name: 'Angel',
        description: 'Wins if eliminated on the first day.',
        icon: '👼',
        alignment: 'NEUTRAL',
        abilities: [],
        isCustom: false
    },
    {
        id: 'EASTER_BUNNY',
        name: 'Easter Bunny',
        description: 'Gives chocolate eggs to players.',
        icon: '🐰',
        alignment: 'VILLAGER',
        abilities: [
            { type: 'GIVE_EGG', timing: 'EVERY_NIGHT', targetCount: 1 }
        ],
        isCustom: false
    },
    {
        id: 'WOLFDOG',
        name: 'Wolfdog',
        description: 'Chooses to be a Villager or Werewolf on the first night.',
        icon: '🐕',
        alignment: 'VILLAGER', // Initially
        abilities: [
            { type: 'CHOOSE_CAMP', timing: 'FIRST_NIGHT', targetCount: 0 }
        ],
        isCustom: false
    },
    {
        id: 'RIPPER',
        name: 'Jack the Ripper',
        description: 'Can kill players.',
        icon: '🔪',
        alignment: 'NEUTRAL', // Serial killer
        abilities: [
            { type: 'KILL', timing: 'EVERY_NIGHT', targetCount: 1 }
        ],
        isCustom: false
    },
    {
        id: 'SURVIVOR',
        name: 'Survivor',
        description: 'Has vest that protects from limited attacks.',
        icon: '🦺',
        alignment: 'VILLAGER',
        abilities: [
            { type: 'PROTECT', timing: 'EVERY_NIGHT', targetCount: 0, usesPerGame: 2 } // Protects self
        ],
        isCustom: false
    },
    {
        id: 'PYROMANIAC',
        name: 'Pyromaniac',
        description: 'Does not kill. Pours oil on people. Can burn them all at once.',
        icon: '🔥',
        alignment: 'NEUTRAL',
        abilities: [
            { type: 'OIL', timing: 'EVERY_NIGHT', targetCount: 2 },
            { type: 'BURN', timing: 'EVERY_NIGHT', targetCount: 0 }
        ],
        isCustom: false
    },
    {
        id: 'THIEF',
        name: 'Thief',
        description: 'Steals a role from another player.',
        icon: '🦝',
        alignment: 'NEUTRAL',
        abilities: [
            { type: 'STEAL_ROLE', timing: 'FIRST_NIGHT', targetCount: 1 }
        ],
        isCustom: false
    }
];
