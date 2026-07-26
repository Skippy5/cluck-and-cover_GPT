export type Theme = {
  ground: string;
  groundAlt: string;
  border: string;
  accent: string;
  ink: string;
  sky: string;
};

export type LevelDef = {
  number: number;
  name: string;
  kicker: string;
  twist: string;
  skipLine: string;
  obstacle: "rock" | "hay" | "water" | "tree" | "post" | "sunflower" | "mud" | "ice";
  theme: Theme;
  boss?: "snake" | "fox";
};

export const LEVELS: LevelDef[] = [
  {
    number: 1,
    name: "Pebblepatch Welcome",
    kicker: "THE OLD YARD",
    twist: "Learn the lay of the land. No rooster. No weasel. Just eggs, rocks, and one slippery thief.",
    skipLine: "My hens lay 'em. I collect 'em. That noodle with teeth does neither.",
    obstacle: "rock",
    theme: { ground: "#d9b86c", groundAlt: "#c9a45a", border: "#7d4326", accent: "#f3c84b", ink: "#281e18", sky: "#f7e5b1" },
  },
  {
    number: 2,
    name: "High Noon Hayways",
    kicker: "THE CORNFIELD",
    twist: "Hay bales form tight lanes. Pick a route before the snake picks your eggs.",
    skipLine: "Who stacked these bales? If it was me, I had a reason.",
    obstacle: "hay",
    theme: { ground: "#b6a448", groundAlt: "#9a913e", border: "#725022", accent: "#ffdc45", ink: "#292115", sky: "#f5dc77" },
  },
  {
    number: 3,
    name: "Lilywater Bend",
    kicker: "THE POND",
    twist: "Farmer Skip must skirt the pond. The snake swims straight through it.",
    skipLine: "Boots hate ponds. Snakes don't wear boots. Typical.",
    obstacle: "water",
    theme: { ground: "#8fbd73", groundAlt: "#76a75e", border: "#315e54", accent: "#8ddfe3", ink: "#18312d", sky: "#cde8b3" },
  },
  {
    number: 4,
    name: "Ciderfall Orchard",
    kicker: "THE ORCHARD",
    twist: "Apples drop without warning. A direct hit stuns Farmer Skip for one second.",
    skipLine: "I planted these trees. Ungrateful wooden hooligans.",
    obstacle: "tree",
    theme: { ground: "#9cbb63", groundAlt: "#7ea34f", border: "#5b4124", accent: "#d9503e", ink: "#291f18", sky: "#f6d394" },
  },
  {
    number: 5,
    name: "Crowncoil Corral",
    kicker: "BOSS: KING COIL",
    twist: "No quota. Land 10 corn hits on the crowned giant. Every hit makes him briefly furious.",
    skipLine: "Crown or no crown, he's trespassing.",
    obstacle: "rock",
    boss: "snake",
    theme: { ground: "#be8455", groundAlt: "#a66945", border: "#512921", accent: "#ffd35a", ink: "#241614", sky: "#eab985" },
  },
  {
    number: 6,
    name: "Lanternless Lofts",
    kicker: "THE NIGHT BARN",
    twist: "Darkness closes in beyond Farmer Skip's lantern. Listen for trouble at the edge of the light.",
    skipLine: "Sun went home. I haven't.",
    obstacle: "post",
    theme: { ground: "#283a43", groundAlt: "#21313a", border: "#10171e", accent: "#ffc95c", ink: "#0b1014", sky: "#15242e" },
  },
  {
    number: 7,
    name: "Sunspun Doublecross",
    kicker: "THE SUNFLOWER PATCH",
    twist: "Two snakes share one appetite. The flowers make lovely cover—for everybody.",
    skipLine: "Two snakes. Still only one shovel. Shame.",
    obstacle: "sunflower",
    theme: { ground: "#6f9b50", groundAlt: "#5c8842", border: "#43602f", accent: "#ffd83d", ink: "#222419", sky: "#d6e88c" },
  },
  {
    number: 8,
    name: "Slogbottom Acres",
    kicker: "THE MUDDY FIELD",
    twist: "Mud drags Farmer Skip to 60% speed. Predators glide over it without losing a step.",
    skipLine: "Good soil sticks to your boots. Bad soil steals 'em.",
    obstacle: "mud",
    theme: { ground: "#8a7653", groundAlt: "#756344", border: "#463d31", accent: "#d6a964", ink: "#211d18", sky: "#c7b58e" },
  },
  {
    number: 9,
    name: "Frostbite Furrows",
    kicker: "THE WINTER FARM",
    twist: "Ice adds slide and inertia. Uncollected eggs freeze and shatter after 12 seconds.",
    skipLine: "Cold enough to freeze an egg. Conveniently, that's exactly the problem.",
    obstacle: "ice",
    theme: { ground: "#dce9e7", groundAlt: "#c6dbdc", border: "#66869a", accent: "#8bd4e8", ink: "#1f3440", sky: "#edf7f5" },
  },
  {
    number: 10,
    name: "Redtail Reckoning",
    kicker: "FINAL BOSS: REDD RANSOM",
    twist: "The fox bandit steals hens and charges Farmer Skip. Hit him to free carried chickens and break his nerve.",
    skipLine: "Touch one hen, fox, and I'll plant corn on your grave.",
    obstacle: "post",
    boss: "fox",
    theme: { ground: "#955f46", groundAlt: "#7b4c3c", border: "#3d2020", accent: "#ef704d", ink: "#211416", sky: "#d99a72" },
  },
];

export const upgradeCopy = {
  boots: {
    name: "Swift Boots",
    description: "Farmer Skip moves 10% faster per tier.",
    max: 3,
    prices: [18, 34, 56],
  },
  cannon: {
    name: "Corn Cannon",
    description: "Two kernels, then three; final tier pierces once.",
    max: 3,
    prices: [22, 42, 68],
  },
  basket: {
    name: "Big Basket",
    description: "+1 value from golden and special eggs per tier.",
    max: 3,
    prices: [16, 32, 52],
  },
  dog: {
    name: "Farm Dog",
    description: "Mabel patrols the field and automatically chases weasels away.",
    max: 1,
    prices: [72],
  },
  overalls: {
    name: "Spare Overalls",
    description: "Add one life, up to five. Price rises each time.",
    max: 3,
    prices: [28, 46, 70],
  },
} as const;

export type UpgradeKey = keyof typeof upgradeCopy;

export const POWER_NAMES = {
  speed: "Wind at His Heels",
  shield: "Tin-Pan Shield",
  magnet: "Egg Draw",
  freeze: "Cold Shoulder",
} as const;

