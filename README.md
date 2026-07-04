# ADB Installer

Local web app for discovering Android devices over Wi-Fi, identifying connected products, installing APK files, and reviewing Android TV packages for safe disable or user-level uninstall actions.

## Requirements

- Bun
- Android platform tools (`adb`) available on `PATH`
- Android device with wireless debugging or TCP ADB enabled

## Run

```bash
bun install
bun run start
```

Open `http://localhost:3000`.

## Checks

```bash
bun run lint
bun run typecheck
bun test
bun run build
```
