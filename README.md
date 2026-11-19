# 🥊 Boxing Birdies

A 3D open-world boxing career game starring birds. Start as an unranked backyard brawler in the town of **Featherton**, train at the gym, take street fights, and climb the rankings at **The Coop Coliseum** until you're the Undisputed Featherweight Champion.

Built with [Three.js](https://threejs.org/) — no build step, no assets to download. Every bird, building and sound is generated in code.

## Play

Serve the folder with any static web server and open it in a browser (ES modules don't load from `file://`):

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## What's in it

- **Open world** — a town with roads, houses, a plaza with a golden champion statue, Puddle Park with swimming ducks, a platforming tower, day/night cycle, drifting clouds and flocks of birds overhead. Pigeons scatter when you run at them.
- **Bird movement** — run, jump, then flap up to 4 times in mid-air and hold Space to glide onto rooftops.
- **Career** — energy, money, fame, a calendar, and four stats: Power, Speed, Stamina, Defense. Sleep in your nest to start a new day (sponsor money arrives each morning based on fame). Progress saves to the browser.
- **Training** — four rhythm mini-games at Feather Fists Gym: Heavy Bag (Power), Speed Bag (Speed), Jump Rope (Stamina), Dodge Drill (Defense).
- **Boxing** — real-time 3D fights with jabs, hooks, uppercuts, blocking, dodging, stamina, counters, guard breaks, knockdowns (mash to get up), KO/TKO and judges' decisions. Feathers fly on every clean hit.
- **Rankings** — ten ranked contenders (Rocky Robin, Crusher Crow, Pelican Pete, Gull Gutpunch, Toucan Tommy, Hawk Talonson, Owlbert Einstrike, Flamingo Fury, Raven Rampage, Eagle Eddie) and the champion, King Condor. Win the title, then defend it.
- **Street fights** — townsbirds with a **!** challenge you for cash.
- **Shop** — food for energy and permanent gear upgrades.
- **Collectibles** — 20 golden feathers hidden around town, some on rooftops and the Lookout Perch.

## Controls

| Exploring | |
|---|---|
| WASD / arrows | Move |
| Shift | Run |
| Space | Jump · press again mid-air to flap · hold to glide |
| Mouse drag / Q, R / wheel | Camera |
| E | Interact |
| C | Career & rankings |
| H | Help |

| Fighting | |
|---|---|
| WASD | Move / circle |
| J or left-click | Jab |
| K or right-click | Hook |
| L | Uppercut |
| Shift (hold) | Block |
| Space (+ direction) | Dodge |
| Mash J/K/L | Get up after a knockdown |

Touch controls (joystick + buttons) appear automatically on phones and tablets.

## Code layout

```
index.html      page, HUD and overlay markup
style.css       UI styling
src/main.js     game loop, player controller, career flow, menus
src/world.js    the open world: buildings, arena, NPCs, birds, collisions, sky
src/bird.js     procedural boxing-bird model and poses
src/fight.js    boxing combat and opponent AI
src/training.js gym rhythm mini-games
src/career.js   stats, rankings roster, shop items, save/load
src/ui.js       HUD, fight HUD, modals, minimap
src/input.js    keyboard, mouse and touch input
src/audio.js    synthesized sound effects
src/particles.js feather particles
```
