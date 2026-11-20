# 🥊 Boxing Birdies

A 3D open-world boxing career game starring birds, built with [Three.js](https://threejs.org/). Pick one of three real birds, Lightning, Cookie or Abbas, and fight your way from unranked to Undisputed Featherweight Champion of **Featherton**.

There's no build step and there are no asset files: every bird, texture, building and sound is generated in code.

## Play

Serve the folder with any static web server (ES modules don't load from `file://`):

```bash
python3 -m http.server 8000
# open http://localhost:8000   (add ?q=low for the faster graphics mode)
```

## Your birds

| Bird | Species | Style |
|---|---|---|
| **Lightning** "The Crest" (boy) | Grey cockatiel: bright yellow face and crest, orange cheek patches | Well-rounded |
| **Cookie** "Lemon Drop" | Lutino cockatiel: creamy yellow, orange cheeks, red eyes | Fast |
| **Abbas** "The Red Rocket" (boy) | Peach-faced lovebird: red head, green body, blue rump | Hard hitter |

Pick one to box. The other two are your **corner team**: they live in the yard by your nest, you can **spar** with them for stat gains, and they stand in your corner at every fight, cheering and giving advice between rounds. Rival cockatiels and lovebirds (Pearl and Blaze) are in the rankings too, and wild ones fly around town and sit on the power lines.

## Open-world life

- **Traffic**: cars, taxis, pickups and a Featherton Transit bus drive the main roads with bird drivers. They loop the plaza roundabout, stop for birds crossing, and honk if you stand in the road.
- **Drive**: walk up to any parked car and press **E**. Your red sports car is parked next to your nest, and there are more at the gym, Seed & Feed and the Coliseum lot. Townsbirds hop out of your way (and tell you about it).
- **More birds**: 33 species in all, including penguins, peacocks, puffins, kingfishers, woodpeckers, swans, Canada geese (flying in V formation), hummingbirds, canaries and blue-and-gold macaws. Many townsbirds wear caps, beanies, cowboy hats, top hats and shades.

## Outfits

**Plume Boutique** (just east of the plaza) sells 10 glove colors, 10 trunk styles, hats (headbands, caps, a beanie, a cowboy hat, a top hat) and black or gold shades. Win the title to unlock the Champion's Crown. Swap between outfits you own at your nest. Your outfit shows up everywhere, including in the ring.

## Difficulty

Chosen at the start and changeable any time under **C → Settings**:

- **Rookie** (default): you hit harder and take less damage, rivals react slower, their gloves glow red before a punch, training timing is forgiving, and flying costs less.
- **Pro**: a fair fight with the punch tells still on.
- **Legend**: the original challenge, with no hints and one Coliseum bout per day.

## Realism

- **Birds**: anatomically shaped bodies with per-species plumage (cheek patches, masks, rumps, wing bars), feather textures, hooked parrot beaks, layered crests that rise when your bird gets fired up, feathered wings that spread when gliding, zygodactyl parrot feet, glossy eyes, breathing and head-jerk idle motion. 23 species in all.
- **World**: a physically based sky with sun, moon and stars, image-based lighting, soft shadows, wind-blown grass, textured brick, siding, shingles and asphalt, reflective rippling water, street lights that light the road at night, power lines with perched birds that scatter, flocks that flap and glide, and ducks on the pond.
- **Boxing**: a magpie referee who keeps position and counts knockdowns, a round-card bird, stools between rounds, three ringside judges scoring 10-point-must, split/majority/unanimous decisions and draws, punch stats by type, a jumbotron, camera flashes, crowd noise, swelling eyes as damage builds, wobbly legs when hurt, and a TV broadcast camera (press **V**).

## Controls

| Exploring | |
|---|---|
| WASD / arrows | Move |
| Shift | Run |
| Space | Jump · tap again in the air to flap · hold to glide (uses the wing meter) |
| Mouse drag / Q, R / wheel | Camera |
| E | Interact |
| C | Career, rankings and settings |
| H | Help |

| Fighting | |
|---|---|
| WASD | Move / circle |
| J or left-click | Jab |
| K or right-click | Hook |
| L | Uppercut |
| Shift (hold) | Block |
| Space (+ direction) | Dodge |
| V | Switch camera (over the shoulder / TV) |
| Mash J/K/L | Get up after a knockdown |

| Driving | |
|---|---|
| E | Get in / get out |
| W / S | Gas / brake and reverse |
| A / D | Steer |
| Space | Handbrake |
| F | Horn |

Touch controls (joystick and buttons) appear automatically on phones and tablets.

## Code layout

```
index.html       page, HUD and overlay markup
style.css        UI styling
src/main.js      game loop, player and flight, your team, career flow, menus, settings
src/world.js     the open world: sky, buildings, arena, boutique, NPCs, birds, collisions
src/vehicles.js  car models, traffic routes and drivable cars
src/bird.js      species plumage and procedural bird models
src/textures.js  procedural canvas textures (feathers, grass, brick, water…)
src/fight.js     boxing, opponent AI, referee, judges' scoring
src/training.js  gym rhythm mini-games
src/career.js    your birds, difficulty, rankings, shop, save/load
src/ui.js        HUD, fight HUD, modals, minimap
src/input.js     keyboard, mouse and touch input
src/audio.js     synthesized sound effects
src/particles.js feather particles
```
