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
  story: string;
  skipLine: string;
  shedLine: string;
  obstacle: "rock" | "hay" | "water" | "tree" | "post" | "sunflower" | "mud" | "ice";
  theme: Theme;
  boss?: "snake" | "fox";
};

export type DifficultyDef = {
  threat: string;
  quota: number;
  snakeLimit: number;
  snakeSpeed: number;
  eggCadence: number;
  roosterDelay: readonly [number, number] | null;
  weaselDelay: readonly [number, number] | null;
};

export const FARMER_SKIP = {
  title: "Keeper of the old farm",
  credo: "Good soil, honest work, and nobody touching his hens.",
  bio: "Farmer Skip has spent a lifetime learning every fence post, muddy rut, and stubborn hen on this land. He grumbles at dawn, distrusts shortcuts, and loves farming enough to fight the whole wild kingdom for one good morning in the yard.",
  softSpot: "His hens, though he insists they are merely reliable employees.",
} as const;

export const DIFFICULTY_CURVE = [
  { threat: "WARM-UP", quota: 5, snakeLimit: 5, snakeSpeed: 0.54, eggCadence: 3.8, roosterDelay: null, weaselDelay: null },
  { threat: "STIRRING", quota: 7, snakeLimit: 6, snakeSpeed: 0.58, eggCadence: 3.6, roosterDelay: [16, 20], weaselDelay: null },
  { threat: "WATCHFUL", quota: 9, snakeLimit: 7, snakeSpeed: 0.61, eggCadence: 3.4, roosterDelay: [16, 20], weaselDelay: [17, 21] },
  { threat: "ROWDY", quota: 11, snakeLimit: 8, snakeSpeed: 0.64, eggCadence: 3.2, roosterDelay: [14, 18], weaselDelay: [15, 19] },
  { threat: "KING COIL", quota: 0, snakeLimit: 99, snakeSpeed: 0.6, eggCadence: 3.2, roosterDelay: null, weaselDelay: null },
  { threat: "TOUGH", quota: 12, snakeLimit: 9, snakeSpeed: 0.67, eggCadence: 3, roosterDelay: [13, 17], weaselDelay: [14, 18] },
  { threat: "DOUBLE TROUBLE", quota: 13, snakeLimit: 9, snakeSpeed: 0.68, eggCadence: 2.85, roosterDelay: [12, 16], weaselDelay: [13, 17] },
  { threat: "HEAVY GOING", quota: 14, snakeLimit: 10, snakeSpeed: 0.71, eggCadence: 2.7, roosterDelay: [11, 15], weaselDelay: [12, 16] },
  { threat: "WHITE-KNUCKLE", quota: 15, snakeLimit: 10, snakeSpeed: 0.74, eggCadence: 2.55, roosterDelay: [10, 14], weaselDelay: [11, 15] },
  { threat: "FINAL RECKONING", quota: 0, snakeLimit: 99, snakeSpeed: 0, eggCadence: 2.7, roosterDelay: null, weaselDelay: null },
] as const satisfies readonly DifficultyDef[];

export function difficultyFor(level: number): DifficultyDef {
  return DIFFICULTY_CURVE[Math.max(0, Math.min(DIFFICULTY_CURVE.length - 1, level - 1))];
}

export function eggLayWindow(level: number) {
  const speedUp = Math.pow(0.96, Math.max(0, level - 1));
  return {
    min: Math.max(2.8, 4.4 * speedUp),
    max: Math.max(4.2, 6.8 * speedUp),
  };
}

export function farmEggCadence(level: number) {
  return difficultyFor(level).eggCadence;
}

export const LEVELS: LevelDef[] = [
  {
    number: 1,
    name: "Pebblepatch Welcome",
    kicker: "THE OLD YARD",
    twist: "Learn the lay of the land. No rooster. No weasel. Just eggs, rocks, and one slippery thief.",
    story: "Skip has opened this gate before sunrise for longer than most folks can remember. The Old Yard is where every hen learns the farm—and where he remembers why he never wanted any other life.",
    skipLine: "My hens lay 'em. I collect 'em. That noodle with teeth does neither.",
    shedLine: "A slow morning is a good morning. Gives a man time to see trouble coming.",
    obstacle: "rock",
    theme: { ground: "#d9b86c", groundAlt: "#c9a45a", border: "#7d4326", accent: "#f3c84b", ink: "#281e18", sky: "#f7e5b1" },
  },
  {
    number: 2,
    name: "High Noon Hayways",
    kicker: "THE CORNFIELD",
    twist: "Hay bales form tight lanes. Pick a route before the snake picks your eggs.",
    story: "Skip measures a summer by the height of its corn. He planted these rows, stacked these bales, and knows exactly which lane leads home when the field turns into a maze.",
    skipLine: "Who stacked these bales? If it was me, I had a reason.",
    shedLine: "Tools get sharper. Farmers just get more specific about what needs cutting.",
    obstacle: "hay",
    theme: { ground: "#b6a448", groundAlt: "#9a913e", border: "#725022", accent: "#ffdc45", ink: "#292115", sky: "#f5dc77" },
  },
  {
    number: 3,
    name: "Lilywater Bend",
    kicker: "THE POND",
    twist: "Farmer Skip must skirt the pond. The snake swims straight through it.",
    story: "Skip dug Lilywater Bend by hand back when his beard was still brown. The hens drink here, the frogs keep him awake, and no boot-wearing farmer gets to ignore the shoreline.",
    skipLine: "Boots hate ponds. Snakes don't wear boots. Typical.",
    shedLine: "Water finds the shortest path. So does trouble. Buy accordingly.",
    obstacle: "water",
    theme: { ground: "#8fbd73", groundAlt: "#76a75e", border: "#315e54", accent: "#8ddfe3", ink: "#18312d", sky: "#cde8b3" },
  },
  {
    number: 4,
    name: "Ciderfall Orchard",
    kicker: "THE ORCHARD",
    twist: "Apples drop without warning. A direct hit stuns Farmer Skip for one second.",
    story: "Every apple tree started as a sapling Skip carried across the farm himself. He loves the orchard dearly; the orchard expresses affection by dropping fruit on his hat.",
    skipLine: "I planted these trees. Ungrateful wooden hooligans.",
    shedLine: "Never trust a tree just because you raised it.",
    obstacle: "tree",
    theme: { ground: "#9cbb63", groundAlt: "#7ea34f", border: "#5b4124", accent: "#d9503e", ink: "#291f18", sky: "#f6d394" },
  },
  {
    number: 5,
    name: "Crowncoil Corral",
    kicker: "BOSS: KING COIL",
    twist: "No quota. Land 10 corn hits on the crowned giant. Every hit makes him briefly furious.",
    story: "King Coil has mistaken size for ownership. Skip does not care how large a trespasser gets, what it calls itself, or whether it arrives wearing farm-inappropriate jewelry.",
    skipLine: "Crown or no crown, he's trespassing.",
    shedLine: "One king evicted. Whole farm still standing. As expected.",
    obstacle: "rock",
    boss: "snake",
    theme: { ground: "#be8455", groundAlt: "#a66945", border: "#512921", accent: "#ffd35a", ink: "#241614", sky: "#eab985" },
  },
  {
    number: 6,
    name: "Lanternless Lofts",
    kicker: "THE NIGHT BARN",
    twist: "Darkness closes in beyond Farmer Skip's lantern. Listen for trouble at the edge of the light.",
    story: "Skip can cross the night barn by memory alone. He knows each creaking board, each warm nesting box, and the exact sound of something being where it should not be.",
    skipLine: "Sun went home. I haven't.",
    shedLine: "Lantern oil, dry socks, and a firm opinion. Night-work essentials.",
    obstacle: "post",
    theme: { ground: "#283a43", groundAlt: "#21313a", border: "#10171e", accent: "#ffc95c", ink: "#0b1014", sky: "#15242e" },
  },
  {
    number: 7,
    name: "Sunspun Doublecross",
    kicker: "THE SUNFLOWER PATCH",
    twist: "Two snakes share one appetite. The flowers make lovely cover—for everybody.",
    story: "Skip planted the sunflowers because the hens liked the seeds. He claims the bright blooms are impractical, then quietly replants twice as many every spring.",
    skipLine: "Two snakes. Still only one shovel. Shame.",
    shedLine: "Flowers are fine. Things hiding behind flowers are generally not.",
    obstacle: "sunflower",
    theme: { ground: "#6f9b50", groundAlt: "#5c8842", border: "#43602f", accent: "#ffd83d", ink: "#222419", sky: "#d6e88c" },
  },
  {
    number: 8,
    name: "Slogbottom Acres",
    kicker: "THE MUDDY FIELD",
    twist: "Mud drags Farmer Skip to 60% speed. Predators glide over it without losing a step.",
    story: "To Skip, deep mud means rich soil and a future crop. It also means losing a boot while a weasel sails past like it owns a boat, which explains the current mood.",
    skipLine: "Good soil sticks to your boots. Bad soil steals 'em.",
    shedLine: "Mud washes off. Being outsmarted by a weasel does not.",
    obstacle: "mud",
    theme: { ground: "#8a7653", groundAlt: "#756344", border: "#463d31", accent: "#d6a964", ink: "#211d18", sky: "#c7b58e" },
  },
  {
    number: 9,
    name: "Frostbite Furrows",
    kicker: "THE WINTER FARM",
    twist: "Ice adds slide and inertia. Uncollected eggs freeze and shatter after 12 seconds.",
    story: "Winter taught Skip patience, preparation, and several words unsuitable for the henhouse. He keeps the farm moving because living things still need care when the easy weather quits.",
    skipLine: "Cold enough to freeze an egg. Conveniently, that's exactly the problem.",
    shedLine: "Cold hands. Warm hens. Keep moving.",
    obstacle: "ice",
    theme: { ground: "#dce9e7", groundAlt: "#c6dbdc", border: "#66869a", accent: "#8bd4e8", ink: "#1f3440", sky: "#edf7f5" },
  },
  {
    number: 10,
    name: "Redtail Reckoning",
    kicker: "FINAL BOSS: REDD RANSOM",
    twist: "The fox bandit steals hens and charges Farmer Skip. Hit him to free carried chickens and break his nerve.",
    story: "Redd Ransom is not merely stealing livestock. He is testing the promise Skip makes every morning when he opens the coop: every hen comes home before the gate closes.",
    skipLine: "Touch one hen, fox, and I'll plant corn on your grave.",
    shedLine: "Bring every hen home. Then—and only then—complain about the fence.",
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
    prices: [14, 28, 48],
  },
  cannon: {
    name: "Corn Cannon",
    description: "Two kernels, then three; final tier pierces once.",
    max: 3,
    prices: [18, 36, 60],
  },
  basket: {
    name: "Big Basket",
    description: "+1 value from golden and special eggs per tier.",
    max: 3,
    prices: [12, 24, 42],
  },
  dog: {
    name: "Farm Dog",
    description: "Mabel patrols the field and automatically chases weasels away.",
    max: 1,
    prices: [48],
  },
  overalls: {
    name: "Spare Overalls",
    description: "Add one life, up to five. Price rises each time.",
    max: 3,
    prices: [22, 40, 62],
  },
} as const;

export type UpgradeKey = keyof typeof upgradeCopy;

export const POWER_NAMES = {
  speed: "Wind at His Heels",
  shield: "Tin-Pan Shield",
  magnet: "Egg Draw",
  freeze: "Cold Shoulder",
} as const;
