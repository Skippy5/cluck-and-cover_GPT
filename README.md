# Cluck-and-Cover_GPT

Farmer Skip is an older, weathered, spectacularly grumpy farmer who loves his land and his hens. Unfortunately, a growing collection of snakes, roosters, weasels, and one fox bandit have mistaken his farm for an all-you-can-steal buffet. **Cluck-and-Cover_GPT** is a complete ten-level browser arcade game about gathering eggs, chaining combos, throwing corn, buying upgrades, beating two bosses, and getting every last trespasser off Skip's lawn.

## Play

- Move with **WASD** or the **Arrow keys**.
- Aim with the pointer and **click** to throw corn.
- Press **P** or **Escape** to pause.
- On touch screens, use the on-screen direction pad and Throw button.

Collect the level quota before the snakes reach their egg limit. Normal, golden, and speckled teal eggs are worth 1, 3, and 5 points. Quick pickups build a combo. Coins can be spent between non-boss levels without reducing the displayed score.

## What is included

- Ten distinct farmyards with their own palette, obstacles, mood, and mechanic
- King Coil at Level 5 and Redd Ransom at Level 10
- Chickens, eggs, snakes, rooster raids, weasel attacks, apples, ice, mud, darkness, and four timed power-ups
- Five upgrade paths, including Mabel the farm dog
- Keyboard, pointer, and touch controls
- Synthesized Web Audio effects
- Pause, level restart, full replay, game-over, and stat-rich victory screens

## Art and technology

The playfield uses a high-DPI HTML canvas and a `requestAnimationFrame` game loop inside a React/TypeScript application. Every in-game character, animation, effect, obstacle, icon, and interface detail is original and drawn procedurally with Canvas or CSS—no emoji, stock art, sprite packs, or third-party game assets. The social card is an original generated illustration designed specifically for this project.

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Production

- Live game: https://cluck-and-covergpt.vercel.app
- Repository: https://github.com/FarmerSkip/cluck-and-cover_GPT
