# AI Agent Instructions for Justin Sensors

This file provides instructions for AI agents (Jules, Gemini, Claude, Copilot, etc.) working on this GNOME Shell extension.

## Quick Reference

| Item | Value |
|------|-------|
| Extension UUID | `justin-sensors@custom` |
| GNOME Version | 42 (Ubuntu 22.04 LTS) |
| Display Server | X11 |
| Language | JavaScript (GJS) |
| UI Framework | GTK4 + libadwaita (Adw) |
| Settings | GSettings |

## File Overview

```
justin-sensors@custom/
├── extension.js          # Main extension - panel indicator, sensor reading
├── prefs.js              # Preferences window (GTK4/Adw)
├── metadata.json         # Extension metadata
├── stylesheet.css        # Panel widget styling
├── schemas/
│   └── org.gnome.shell.extensions.justin-sensors.gschema.xml
├── icons/
│   ├── cpu.png           # CPU icon (colored PNG)
│   ├── ram.png           # RAM icon (colored PNG)
│   └── gpu.png           # GPU icon (colored PNG)
├── README.md             # User documentation
├── CLAUDE.md             # Detailed dev docs for Claude
└── AGENT.md              # This file - AI agent instructions
```

## Key APIs Used

- **St** (Shell Toolkit): `St.BoxLayout`, `St.Label`, `St.Icon`
- **Clutter**: Layout alignment constants
- **GLib**: `timeout_add()`, `spawn_command_line_sync()`, file reading
- **Gio**: `Settings`, `FileIcon`
- **PanelMenu**: `Button` base class for panel indicators
- **Adw** (libadwaita): `PreferencesWindow`, `PreferencesPage`, `PreferencesGroup`, `ActionRow`
- **Gtk**: `SpinButton`, `Switch`, `ColorButton`, `ComboBoxText`

## Data Sources

| Sensor | Source | Command/Path |
|--------|--------|--------------|
| CPU Usage | `/proc/stat` | Read and calculate delta |
| CPU Temp | `/sys/class/thermal/thermal_zone*/temp` | Read, divide by 1000 |
| CPU Temp (alt) | `sensors` | Parse lm-sensors output |
| RAM Usage | `/proc/meminfo` | MemTotal - MemAvailable |
| GPU Usage | `nvidia-smi` | `--query-gpu=utilization.gpu` |
| GPU Temp | `nvidia-smi` | `--query-gpu=temperature.gpu` |
| Fan5 (water pump) | `sensors` | Parse for `fan5:` line |

## Settings Schema

Schema ID: `org.gnome.shell.extensions.justin-sensors`

### Current Keys

| Key | Type | Range/Default | Description |
|-----|------|---------------|-------------|
| `refresh-interval` | int | 500-10000, default 1000 | Update interval (ms) |
| `panel-position` | string | left/center/right | Panel location |
| `show-cpu` | boolean | true | Show CPU usage |
| `show-cpu-temp` | boolean | true | Show CPU temperature |
| `cpu-icon-size` | int | 12-128, default 18 | CPU icon size (px) |
| `cpu-value-color` | string | #ff00ff | CPU value color |
| `cpu-temp-color` | string | #ff00ff | CPU temp color |
| `show-ram` | boolean | true | Show RAM usage |
| `ram-icon-size` | int | 12-128, default 18 | RAM icon size (px) |
| `ram-value-color` | string | #ff00ff | RAM value color |
| `show-gpu` | boolean | true | Show GPU usage |
| `show-gpu-temp` | boolean | true | Show GPU temperature |
| `gpu-icon-size` | int | 12-128, default 18 | GPU icon size (px) |
| `gpu-value-color` | string | #ff00ff | GPU value color |
| `gpu-temp-color` | string | #ff00ff | GPU temp color |
| `show-gpu-fan` | boolean | false | Show fan5 (water pump) |
| `gpu-fan-color` | string | #ff00ff | Fan5 color |
| `value-font-size` | int | 8-72, default 11 | Value text size (px) |
| `temp-font-size` | int | 8-72, default 11 | Temp text size (px) |

## Common Tasks

### Adding a New Sensor

1. **extension.js**: Add sensor definition to `SENSORS` object
2. **extension.js**: Add `_update<SensorName>()` method
3. **extension.js**: Call new method from `_update()`
4. **gschema.xml**: Add `show-<sensor>`, `<sensor>-icon-size`, `<sensor>-value-color` keys
5. **prefs.js**: Add UI group with toggle, icon size, color picker
6. **icons/**: Add PNG icon file
7. Run: `glib-compile-schemas schemas/`

### Modifying Settings Limits

1. **prefs.js**: Change `upper` value in `Gtk.Adjustment` for spin buttons
2. No schema changes needed (schema has no max constraint)

### Adding a New Setting

1. **gschema.xml**: Add `<key>` element with name, type, default, summary, description
2. **prefs.js**: Add UI widget (switch, spin button, color button, etc.)
3. **extension.js**: Read setting with `this._settings.get_*('key-name')`
4. Run: `glib-compile-schemas schemas/`

### Changing Colors/Styling

- Per-sensor colors: Set in prefs.js color pickers, applied in extension.js via inline styles
- Base CSS: Modify `stylesheet.css`
- Inline styles override CSS classes

## Testing Commands

```bash
# View live logs
journalctl -f -o cat /usr/bin/gnome-shell

# Restart GNOME Shell (X11 only)
# Press Alt+F2, type 'r', press Enter

# Enable/disable extension
gnome-extensions enable justin-sensors@custom
gnome-extensions disable justin-sensors@custom

# Open preferences
gnome-extensions prefs justin-sensors@custom

# Reset all settings
dconf reset -f /org/gnome/shell/extensions/justin-sensors/

# Recompile schemas after changes
glib-compile-schemas ~/.local/share/gnome-shell/extensions/justin-sensors@custom/schemas/

# Test sensor commands
cat /proc/stat | head -1
cat /proc/meminfo | grep -E 'MemTotal|MemAvailable'
nvidia-smi --query-gpu=utilization.gpu,temperature.gpu --format=csv,noheader,nounits
sensors | grep -E 'fan5|temp'
```

## Code Patterns

### Reading Settings
```javascript
const settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.justin-sensors');
const value = settings.get_int('refresh-interval');
const color = settings.get_string('cpu-value-color');
const enabled = settings.get_boolean('show-cpu');
```

### Running Shell Commands
```javascript
const [ok, stdout, stderr, exitCode] = GLib.spawn_command_line_sync('command');
if (ok && exitCode === 0) {
    const output = new TextDecoder().decode(stdout);
    // parse output
}
```

### Reading Files
```javascript
const [ok, contents] = GLib.file_get_contents('/proc/meminfo');
if (ok) {
    const text = new TextDecoder().decode(contents);
    // parse text
}
```

### Creating Panel Widgets
```javascript
const label = new St.Label({
    text: 'value',
    y_align: Clutter.ActorAlign.CENTER,
    style: `font-size: 11px; color: #ff00ff;`
});
container.add_child(label);
```

### Preferences UI (GTK4/Adw)
```javascript
const row = new Adw.ActionRow({
    title: 'Setting Name',
    subtitle: 'Description'
});
group.add(row);

const toggle = new Gtk.Switch({ valign: Gtk.Align.CENTER });
settings.bind('key-name', toggle, 'active', Gio.SettingsBindFlags.DEFAULT);
row.add_suffix(toggle);
```

## Important Notes

1. **GNOME 42 Specific**: This extension targets GNOME Shell 42. APIs may differ in other versions.
2. **X11 Required**: Shell restart (`Alt+F2` -> `r`) only works on X11, not Wayland.
3. **NVIDIA Only**: GPU monitoring uses `nvidia-smi`. AMD/Intel GPUs not supported yet.
4. **Schema Compilation**: Always run `glib-compile-schemas schemas/` after modifying the XML.
5. **Live Updates**: Most settings apply immediately; panel position requires shell restart.
6. **No Time Estimates**: When planning changes, provide steps without time estimates.

## See Also

- `CLAUDE.md` - Detailed development documentation
- `README.md` - User-facing documentation
- [GNOME Shell Extensions Guide](https://gjs.guide/extensions/)
- [GJS Documentation](https://gjs-docs.gnome.org/)
