# Cabin audio clips (local, royalty-free)

The audio showpiece (`src/features/audio/`) loads two **local** loops — zero
network dependency on pitch day (dev-decisions §3). Drop the files here with
these exact names (or update the paths in `src/features/audio/engine.ts`):

| File | What it is | Notes |
|---|---|---|
| `cabin-drone.mp3` | Road / wind / engine hum — the fatiguing background | Should loop seamlessly; a steady, broadband drone works best. 10–30s is plenty. |
| `siren.mp3` | Emergency-vehicle siren (the clip that "punches through") | A wail/yelp siren with its energy oscillating in the **600–1500 Hz** band so the live frequency-pattern detector lights up. Looping. |

**Sourcing:** royalty-free only (e.g. Freesound CC0, Pixabay, Mixkit). Never
stream from YouTube and never ship a clip you don't have the rights to. Convert
to `.mp3` (broad browser support) or `.ogg`; if you use a different extension,
change `DRONE_SRC` / `SIREN_SRC` in `engine.ts`.

Until these files are present the audio panel shows an "audio assets missing"
state and the rest of the app is unaffected — the engine fails soft.
