# Justin Sensors - Development Documentation

This file provides context for Claude or other AI assistants working on this GNOME Shell extension.

## Project Overview

**Name**: Justin Sensors
**UUID**: justin-sensors@custom
**Target**: GNOME Shell 42 on Ubuntu 22.04.5 LTS with X11
**Purpose**: Display CPU, RAM, and GPU stats in the top panel

## Architecture

### Core Files

| File | Purpose |
|------|---------|
| `extension.js` | Main extension logic, panel indicator, sensor data collection |
| `prefs.js` | GTK4/Adw preferences window |
| `stylesheet.css` | Custom CSS styling for panel widgets |
| `metadata.json` | Extension metadata (UUID, version, GNOME Shell version) |
| `schemas/*.xml` | GSettings schema for persistent settings |

### Key Classes

**SystemMonitorIndicator** (extension.js)
- Extends `PanelMenu.Button`
- Contains `_sensorWidgets` object with UI elements for each sensor
- Uses `GLib.timeout_add()` for periodic updates
- Reads settings from GSettings

### Data Sources

| Sensor | Source | Method |
|--------|--------|--------|
| CPU Usage | `/proc/stat` | Parse, calculate delta between reads |
| CPU Temp | `/sys/class/thermal/thermal_zone*/temp` | Read file, divide by 1000 |
| CPU Temp (fallback) | `sensors` command | Parse output |
| RAM Usage | `/proc/meminfo` | Parse MemTotal and MemAvailable |
| GPU (NVIDIA) | `nvidia-smi` | Run command, parse CSV output |

## Adding New Sensors

### Step 1: Add Sensor Definition

In `extension.js`, add to the `SENSORS` object:

```javascript
const SENSORS = {
    // ... existing sensors ...

    disk: {
        id: 'disk',
        name: 'Disk',
        icon: 'disk.png',  // Add icon to icons/ folder
        hasTemp: false,    // Set true if sensor has temperature
        order: 3           // Display order in panel
    }
};
```

### Step 2: Add Data Collection Method

Add a new method in `SystemMonitorIndicator`:

```javascript
_updateDisk() {
    const widget = this._sensorWidgets['disk'];
    if (!widget) return;

    try {
        // Your data collection logic here
        // Example: Read disk usage from df command
        const [ok, stdout] = GLib.spawn_command_line_sync('df / --output=pcent');
        if (ok) {
            const usage = new TextDecoder().decode(stdout).trim().split('\n')[1];
            widget.valueLabel.set_text(usage.trim());
        }
    } catch (e) {
        logError(e, 'Error updating disk stats');
    }
}
```

### Step 3: Call from Update Loop

Add to `_update()` method:

```javascript
_update() {
    this._updateCpu();
    this._updateRam();
    this._updateGpu();
    this._updateDisk();  // Add this line
}
```

### Step 4: Add Settings Schema Key

In `schemas/org.gnome.shell.extensions.justin-sensors.gschema.xml`:

```xml
<key name="show-disk" type="b">
  <default>true</default>
  <summary>Show Disk</summary>
  <description>Show disk usage in the panel</description>
</key>
```

### Step 5: Add to Preferences UI

In `prefs.js`, add a new group/rows for the sensor.

### Step 6: Recompile Schemas

```bash
glib-compile-schemas schemas/
```

## Settings Schema

**ID**: `org.gnome.shell.extensions.justin-sensors`
**Path**: `/org/gnome/shell/extensions/justin-sensors/`

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `refresh-interval` | int | 1000 | Update interval in ms |
| `panel-position` | string | 'right' | Panel position |
| `show-cpu` | boolean | true | Show CPU sensor |
| `show-cpu-temp` | boolean | true | Show CPU temperature |
| `cpu-icon-size` | int | 18 | CPU icon size in pixels (12-128) |
| `cpu-value-color` | string | '#ff00ff' | CPU value color |
| `cpu-temp-color` | string | '#ff00ff' | CPU temp color |
| `show-ram` | boolean | true | Show RAM sensor |
| `ram-icon-size` | int | 18 | RAM icon size in pixels (12-128) |
| `ram-value-color` | string | '#ff00ff' | RAM value color |
| `show-gpu` | boolean | true | Show GPU sensor |
| `show-gpu-temp` | boolean | true | Show GPU temperature |
| `gpu-icon-size` | int | 18 | GPU icon size in pixels (12-128) |
| `gpu-value-color` | string | '#ff00ff' | GPU value color |
| `gpu-temp-color` | string | '#ff00ff' | GPU temp color |
| `show-gpu-fan` | boolean | false | Show fan5 (water pump) |
| `gpu-fan-color` | string | '#ff00ff' | Fan5 color |
| `value-font-size` | int | 11 | Font size for percentage values (8-72) |
| `temp-font-size` | int | 11 | Font size for temperature values (8-72) |

## Styling

The extension uses these CSS classes (in `stylesheet.css`):

- `.system-monitor-container` - Main container box
- `.sensor-container` - Individual sensor container
- `.system-monitor-icon` - Icon elements
- `.system-monitor-value` - Usage percentage labels
- `.system-monitor-temp` - Temperature labels
- `.system-monitor-fan` - Fan speed labels

Default colors: Magenta/pink (#ff00ff) for all values (customizable per-sensor).

## Debugging

### View Extension Logs

```bash
journalctl -f -o cat /usr/bin/gnome-shell
```

### Test Commands

```bash
# Check CPU temp sources
cat /sys/class/thermal/thermal_zone0/temp
sensors

# Check GPU
nvidia-smi --query-gpu=utilization.gpu,temperature.gpu --format=csv,noheader,nounits

# Check RAM
cat /proc/meminfo | grep -E 'MemTotal|MemAvailable'

# Check CPU stats
head -1 /proc/stat
```

### Restart GNOME Shell (X11 only)

Press `Alt+F2`, type `r`, press Enter.

### Reset Settings

```bash
dconf reset -f /org/gnome/shell/extensions/justin-sensors/
```

## GNOME Shell API Reference

- St (Shell Toolkit): UI widgets
- Clutter: Layout and animation
- GLib: Main loop, file operations
- Gio: Settings, file icons
- PanelMenu: Panel button base class

## Common Issues

1. **Icons not showing**: Check file paths, ensure PNGs exist in icons/
2. **Settings not saving**: Ensure schema is compiled
3. **GPU shows N/A**: nvidia-smi not found or failing
4. **High CPU usage**: Increase refresh interval

## Future Improvements

- [ ] Add network sensor (upload/download speed)
- [ ] Add disk I/O sensor
- [ ] Add click menu with detailed stats
- [ ] Support AMD GPUs (radeontop)
- [ ] Support Intel GPUs (intel_gpu_top)
- [ ] Dynamic color based on thresholds (green/yellow/red)
