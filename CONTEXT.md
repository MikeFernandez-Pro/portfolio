# Portfolio

An interactive 3D portfolio: the visitor walks a knight across floating
islands, each island presenting one part of the portfolio (projects, skills,
resume, contact).

## Language

### World

**Island**:
One of the four floating landmasses, each presenting one part of the
portfolio: the Projects, Skills, Resume and Contact islands.
_Avoid_: level, zone, area

**Spawn point**:
Where the character appears at the start and after every respawn, beside the
Contact island.
_Avoid_: home, start, experience start

**Collider**:
Invisible solid geometry the character walks on and bumps into.

**Sensor zone**:
An invisible volume that reports when the character enters or leaves it, and
blocks nothing.
_Avoid_: collider (for trigger volumes), trigger, ground sensor

### Character

**Character**:
The knight the visitor controls.
_Avoid_: player, avatar, knight (in code names)

**Dissolve**:
The glowing voronoi effect that makes the character (and the magic books)
burn away or form back.
_Avoid_: lava (reserved for the forge), disintegration

**Head orb**:
The glow inside the character's helmet.

**Character lantern**:
The lantern swinging from the character's belt.
_Avoid_: belt lantern, lantern (alone)

### Death cycle

**Falling zone**:
A sensor zone just below the walkable ground; entering it starts the fall.

**Fall**:
The character dropping off an island, before it dies.
_Avoid_: falling preview (outside debug)

**Death zone**:
A sensor zone below the falling zone; entering it causes death.

**Death**:
The character dissolving away in a burst of death particles after reaching
the death zone.
_Avoid_: despawn, kill, disintegration

**Death particles**:
The glowing motes the character bursts into on death.
_Avoid_: dust burst, disintegration

**Respawn**:
The character returning to the spawn point after death and forming back
through the dissolve, with the spiral sweeping under it.
_Avoid_: reform

**Spiral**:
The glowing decal at the spawn point, visible only while it sweeps during a
respawn.

### Startup

**Loader**:
The percentage shown while assets download and materials build.

**Iris**:
The circular mask that hides the scene, opens slightly once the scene is
ready, and sweeps fully open on Enter.
_Avoid_: scene revealer, revealer, reveal

**Enter**:
The button that starts the experience once the scene is ready.
_Avoid_: start button, initiate

**Intro pan**:
The camera move that follows Enter, during which movement input is ignored.
_Avoid_: intro (alone), intro camera

### Interaction

**Interactive element**:
A spot in the world that reacts when the character stands in it: a link, a
pressure plate or the magic glyph.
_Avoid_: trigger, hotspot

**Link**:
An interactive element that opens an external URL when the visitor presses
Enter (or taps the prompt) while standing in it: mailbox, LinkedIn, X sign,
statue (resume PDF), projects portal.

**Indicator**:
The floating ring and Enter tile shown above a link while the character
stands in it.
_Avoid_: interactive link, prompt

### Projects island

**Projects portal**:
The swirling disc on the Projects island that shows the selected project and
opens its URL. The only thing called a portal.
_Avoid_: portal (alone), projects portals

**Project plate**:
One of the three plates on the Projects island, one per project; stepping on
it selects that project. Each is named after its project.
_Avoid_: pressure plate, portal plate, plate (alone)

**Selected project**:
The project whose plate was pressed last; the projects portal shows and opens
it. Nothing is selected until the first plate press.
_Avoid_: active plate

### Skills island

**Skills glyph**:
The circle of runes on the Skills island ground; stepping on it awakens the
island.
_Avoid_: magic portal, skills portal, magic plate

**Awaken**:
What the Skills island does when the character first steps on the skills
glyph: the glyphs glow, the magic books appear and the floating skills fade
in. It never goes back to sleep.
_Avoid_: activate, activation

**Cauldron potion**:
The liquid in the cauldron, with its swirling surface and bubbles.
_Avoid_: cauldron portal, cauldron liquid

**Cauldron smoke**:
The smoke column rising from the cauldron.

### Environment

**Sky**:
The background colour gradient around the whole scene.
_Avoid_: sky gradient, background

**Stars**:
The star field in the sky.
_Avoid_: sky (for the stars)

**Torch smoke**:
The smoke rising from the torches.
_Avoid_: smoke columns

### Contact island

**Bellows**:
The forge's air pump; each puff makes the forge lava flare.
_Avoid_: blower

### World props

**Lantern**:
A lantern fixed in the world: the street lanterns and the house lantern.
_Avoid_: lamp

**Point light**:
A light glow shaded onto the islands around a small source (torch, lantern,
portal, forge lava, well, spawn point...), named after that source: torch
light, portal light.
_Avoid_: island point light

### Resume island

**Trample**:
Grass bending away under the character's feet and springing back.

**Flower**:
A rare grass blade with a red tip.

**Bonfire smoke**:
The smoke rising from the bonfire on the Resume island.
_Avoid_: smoke (alone)

### Modes

**Photo mode**:
A bare scene with a free camera, no UI, no sound and no intro, opened with
`#photo` for screenshots.

**Debug mode**:
The development panel and physics visualisation, opened with `#debug`; never
shipped in production builds.
