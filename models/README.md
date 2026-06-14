# Legacy 3D model notes

The current demo is **web pixel first**. It does not load GLB models on startup.

Editable game art now lives in:

```
assets/pixel/
```

Those PNG strips can be opened directly in Pixelorama. Each strip uses four frames:
idle, walk, attack/cast, and hurt/death.

This `models/` folder is kept only as a parking place for future Godot or 3D experiments.
If the project returns to a 3D client later, use single-file `.glb` assets here and keep
them optional so a broken model can never block the playable demo.
