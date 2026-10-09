# Portfolio

## Development

```sh
pnpm install
pnpm dev     # http://localhost:5173 (#debug: debug panel, #photo: photo mode)
pnpm build
pnpm lint
```

## Scripts

- `pnpm pack-textures`: packs source textures from `src/assets/textures`
  into the channel-packed maps, the screens atlas and the grass placement
  mask, then compresses them to KTX2 (needs the KTX-Software `ktx` CLI
  v5+).
- `pnpm physics-parity`: runs the island colliders through the custom
  physics and through rapier with the same scripted inputs, and reports the
  deviation. Run it after any change to `src/physics/`.
- `scripts/make-typeface.mjs`: one-off conversion of the skills font to
  three's typeface JSON (see its header for the `OPENTYPE` setup).
