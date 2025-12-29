# Justin Sensors

A GNOME Shell extension that displays CPU, RAM, and GPU usage with temperatures in the top panel.

## Features

- **CPU Monitoring**: Shows CPU usage percentage and temperature
- **RAM Monitoring**: Shows memory usage percentage
- **GPU Monitoring**: Shows NVIDIA GPU usage and temperature (via nvidia-smi)
- **Water Pump/Fan5**: Optional display of fan5 sensor (water pump RPM)
- **Custom Icons**: Colorful PNG icons for each sensor
- **Customizable Icon Sizes**: Adjust each sensor icon size independently (12px - 128px)
- **Per-Sensor Colors**: Set different colors for CPU, RAM, GPU values and temperatures
- **Customizable Font Sizes**: Adjust font sizes for values and temperatures (8px - 72px)
- **Settings UI**: Full preferences panel with GTK4/Adw
- **Live Updates**: Changes apply immediately without restart
- **Extensible**: Easy to add new sensors

## Requirements

- GNOME Shell 42 (Ubuntu 22.04 LTS)
- X11 display server
- `lm-sensors` package (for CPU temperature and fan5)
- NVIDIA drivers with `nvidia-smi` (for GPU monitoring)

## Installation

### Install Dependencies

```bash
sudo apt install lm-sensors
sudo sensors-detect  # Follow prompts to detect sensors
```

### Install Extension

The extension is already installed at:
```
~/.local/share/gnome-shell/extensions/justin-sensors@custom/
```

### Compile Schemas

```bash
cd ~/.local/share/gnome-shell/extensions/justin-sensors@custom/
glib-compile-schemas schemas/
```

### Enable Extension

1. Restart GNOME Shell: Press `Alt+F2`, type `r`, press Enter (X11 only)
2. Enable the extension:
   ```bash
   gnome-extensions enable justin-sensors@custom
   ```

Or use GNOME Extensions app / Extensions Manager.

## Configuration

Open the extension preferences:

```bash
gnome-extensions prefs justin-sensors@custom
```

Or right-click the extension in the Extensions app.

### Available Settings

- **General Tab**
  - Refresh interval (500ms - 10000ms)
  - Panel position (left, center, right)

- **Sensors Tab**
  - **CPU**
    - Toggle CPU usage on/off
    - Toggle CPU temperature on/off
    - CPU icon size (12px - 128px)
    - CPU value color (color picker)
    - CPU temperature color (color picker)
  - **RAM**
    - Toggle RAM usage on/off
    - RAM icon size (12px - 128px)
    - RAM value color (color picker)
  - **GPU**
    - Toggle GPU usage on/off
    - Toggle GPU temperature on/off
    - GPU icon size (12px - 128px)
    - GPU value color (color picker)
    - GPU temperature color (color picker)
    - Toggle fan5 (water pump) on/off
    - Fan5 color (color picker)

- **Font Sizes Tab**
  - Value font size (8px - 72px)
  - Temperature font size (8px - 72px)

## Troubleshooting

### Extension doesn't appear
1. Check if extension is enabled: `gnome-extensions list --enabled`
2. Check for errors: `journalctl -f -o cat /usr/bin/gnome-shell`
3. Make sure schemas are compiled

### GPU shows N/A
- Ensure NVIDIA drivers are installed
- Test: `nvidia-smi --query-gpu=utilization.gpu,temperature.gpu --format=csv`

### CPU temperature shows N/A
- Install lm-sensors: `sudo apt install lm-sensors`
- Run sensors-detect: `sudo sensors-detect`
- Test: `sensors`

### Fan5 shows N/A
- Make sure lm-sensors is installed and configured
- Test: `sensors | grep fan5`

### Changes don't take effect
- Most settings apply immediately
- For panel position changes: Restart GNOME Shell (`Alt+F2` -> `r` -> Enter)

## File Structure

```
justin-sensors@custom/
├── extension.js      # Main extension logic
├── metadata.json     # Extension metadata
├── prefs.js          # Preferences UI (GTK4/Adw)
├── stylesheet.css    # Base styling
├── schemas/          # GSettings schema
├── icons/            # Custom PNG icons (cpu.png, ram.png, gpu.png)
├── README.md         # This file
├── CLAUDE.md         # Development documentation
└── AGENT.md          # AI agent instructions (Jules, Gemini, etc.)
```

## License

This extension is provided as-is for personal use.

## Credits

Custom icons provided by user.
