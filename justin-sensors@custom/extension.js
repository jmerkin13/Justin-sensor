/* extension.js
 *
 * Justin Sensors - GNOME Shell Extension
 * Displays CPU, RAM, and GPU stats in the top panel
 *
 * For GNOME Shell 42
 */

'use strict';

const { GObject, St, Gio, GLib, Clutter } = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const ExtensionUtils = imports.misc.extensionUtils;

const Me = ExtensionUtils.getCurrentExtension();

// Sensor configuration - add new sensors here
const SENSORS = {
    cpu: {
        id: 'cpu',
        name: 'CPU',
        icon: 'cpu.png',
        hasTemp: true,
        order: 0
    },
    ram: {
        id: 'ram',
        name: 'RAM',
        icon: 'ram.png',
        hasTemp: false,
        order: 1
    },
    gpu: {
        id: 'gpu',
        name: 'GPU',
        icon: 'gpu.png',
        hasTemp: true,
        hasFan: true,
        order: 2
    }
};

let SystemMonitorIndicator = GObject.registerClass(
class SystemMonitorIndicator extends PanelMenu.Button {
    _init() {
        super._init(0.0, 'Justin Sensors');

        this._settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.justin-sensors');

        // Previous CPU stats for delta calculation
        this._prevCpuStats = null;

        // Create main container
        this._box = new St.BoxLayout({
            style_class: 'system-monitor-container'
        });
        this.add_child(this._box);

        // Create sensor displays
        this._sensorWidgets = {};
        this._createSensorWidgets();

        // Connect to settings changes
        this._settingsConnections = [];
        this._connectSettings();

        // Start update loop
        this._updateTimeoutId = null;
        this._startUpdateLoop();
    }

    _createSensorWidgets() {
        // Clear existing widgets
        this._box.destroy_all_children();
        this._sensorWidgets = {};

        // Get sorted sensors
        const sortedSensors = Object.values(SENSORS).sort((a, b) => a.order - b.order);

        for (const sensor of sortedSensors) {
            if (!this._settings.get_boolean(`show-${sensor.id}`)) {
                continue;
            }

            const container = new St.BoxLayout({
                style_class: 'sensor-container'
            });

            // Create icon from PNG file
            const iconPath = Me.path + '/icons/' + sensor.icon;
            const iconFile = Gio.File.new_for_path(iconPath);
            const gicon = new Gio.FileIcon({ file: iconFile });

            // Get icon size from settings
            const iconSize = this._settings.get_int(`${sensor.id}-icon-size`);

            const icon = new St.Icon({
                gicon: gicon,
                style_class: 'system-monitor-icon',
                icon_size: iconSize
            });
            container.add_child(icon);

            // Get text styling from settings (per-sensor colors)
            const valueColor = this._settings.get_string(`${sensor.id}-value-color`);
            const valueFontSize = this._settings.get_int('value-font-size');
            const tempFontSize = this._settings.get_int('temp-font-size');

            // Create value label with inline style
            const valueLabel = new St.Label({
                text: '---%',
                style_class: 'system-monitor-value',
                y_align: Clutter.ActorAlign.CENTER,
                style: `color: ${valueColor}; font-size: ${valueFontSize}px; font-weight: bold;`
            });
            container.add_child(valueLabel);

            // Create temp label if sensor has temperature
            let tempLabel = null;
            if (sensor.hasTemp && this._settings.get_boolean(`show-${sensor.id}-temp`)) {
                const tempColor = this._settings.get_string(`${sensor.id}-temp-color`);
                tempLabel = new St.Label({
                    text: '---°C',
                    style_class: 'system-monitor-temp',
                    y_align: Clutter.ActorAlign.CENTER,
                    style: `color: ${tempColor}; font-size: ${tempFontSize}px; font-weight: bold;`
                });
                container.add_child(tempLabel);
            }

            // Create fan label if sensor has fan
            let fanLabel = null;
            if (sensor.hasFan && this._settings.get_boolean(`show-${sensor.id}-fan`)) {
                const fanColor = this._settings.get_string(`${sensor.id}-fan-color`);
                fanLabel = new St.Label({
                    text: '--- RPM',
                    style_class: 'system-monitor-fan',
                    y_align: Clutter.ActorAlign.CENTER,
                    style: `color: ${fanColor}; font-size: ${valueFontSize}px; font-weight: bold;`
                });
                container.add_child(fanLabel);
            }

            this._box.add_child(container);

            this._sensorWidgets[sensor.id] = {
                container: container,
                icon: icon,
                valueLabel: valueLabel,
                tempLabel: tempLabel,
                fanLabel: fanLabel
            };
        }
    }

    _connectSettings() {
        // Rebuild widgets when sensor visibility, icon size, font size, or color changes
        const sensorKeys = [
            'show-cpu', 'show-ram', 'show-gpu', 'show-cpu-temp', 'show-gpu-temp', 'show-gpu-fan',
            'cpu-icon-size', 'ram-icon-size', 'gpu-icon-size',
            'cpu-value-color', 'cpu-temp-color',
            'ram-value-color',
            'gpu-value-color', 'gpu-temp-color', 'gpu-fan-color',
            'value-font-size', 'temp-font-size'
        ];
        for (const key of sensorKeys) {
            const id = this._settings.connect(`changed::${key}`, () => {
                this._createSensorWidgets();
            });
            this._settingsConnections.push(id);
        }

        // Update refresh interval
        const intervalId = this._settings.connect('changed::refresh-interval', () => {
            this._restartUpdateLoop();
        });
        this._settingsConnections.push(intervalId);
    }

    _startUpdateLoop() {
        // Initial update
        this._update();

        // Set up periodic updates
        const interval = this._settings.get_int('refresh-interval');
        this._updateTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, interval, () => {
            this._update();
            return GLib.SOURCE_CONTINUE;
        });
    }

    _restartUpdateLoop() {
        if (this._updateTimeoutId) {
            GLib.source_remove(this._updateTimeoutId);
            this._updateTimeoutId = null;
        }
        this._startUpdateLoop();
    }

    _update() {
        this._updateCpu();
        this._updateRam();
        this._updateGpu();
    }

    _updateCpu() {
        const widget = this._sensorWidgets['cpu'];
        if (!widget) return;

        try {
            // Read CPU stats from /proc/stat
            const [ok, contents] = GLib.file_get_contents('/proc/stat');
            if (!ok) return;

            const lines = new TextDecoder().decode(contents).split('\n');
            const cpuLine = lines[0]; // First line is aggregate CPU
            const parts = cpuLine.split(/\s+/);

            // cpu user nice system idle iowait irq softirq steal guest guest_nice
            const user = parseInt(parts[1]);
            const nice = parseInt(parts[2]);
            const system = parseInt(parts[3]);
            const idle = parseInt(parts[4]);
            const iowait = parseInt(parts[5]) || 0;
            const irq = parseInt(parts[6]) || 0;
            const softirq = parseInt(parts[7]) || 0;
            const steal = parseInt(parts[8]) || 0;

            const total = user + nice + system + idle + iowait + irq + softirq + steal;
            const idleTotal = idle + iowait;

            if (this._prevCpuStats) {
                const totalDiff = total - this._prevCpuStats.total;
                const idleDiff = idleTotal - this._prevCpuStats.idle;
                const usage = totalDiff > 0 ? ((totalDiff - idleDiff) / totalDiff * 100) : 0;
                widget.valueLabel.set_text(usage.toFixed(1) + '%');
            }

            this._prevCpuStats = { total: total, idle: idleTotal };

            // Get CPU temperature
            if (widget.tempLabel) {
                const temp = this._getCpuTemp();
                if (temp !== null) {
                    widget.tempLabel.set_text(temp.toFixed(1) + '°C');
                }
            }
        } catch (e) {
            logError(e, 'Error updating CPU stats');
        }
    }

    _getCpuTemp() {
        // Try thermal_zone first (common on most systems)
        const thermalZones = [
            '/sys/class/thermal/thermal_zone0/temp',
            '/sys/class/hwmon/hwmon0/temp1_input',
            '/sys/class/hwmon/hwmon1/temp1_input',
            '/sys/class/hwmon/hwmon2/temp1_input'
        ];

        for (const path of thermalZones) {
            try {
                const [ok, contents] = GLib.file_get_contents(path);
                if (ok) {
                    const temp = parseInt(new TextDecoder().decode(contents).trim());
                    // Temperature is in millidegrees
                    return temp / 1000;
                }
            } catch (e) {
                // Try next path
            }
        }

        // Fallback: try using sensors command
        try {
            const [ok, stdout, stderr, exitCode] = GLib.spawn_command_line_sync('sensors');
            if (ok && exitCode === 0) {
                const output = new TextDecoder().decode(stdout);
                // Look for Core 0 or Package temp
                const match = output.match(/(?:Core 0|Package id 0):\s+\+?([\d.]+)°C/);
                if (match) {
                    return parseFloat(match[1]);
                }
            }
        } catch (e) {
            // sensors command not available
        }

        return null;
    }

    _updateRam() {
        const widget = this._sensorWidgets['ram'];
        if (!widget) return;

        try {
            const [ok, contents] = GLib.file_get_contents('/proc/meminfo');
            if (!ok) return;

            const text = new TextDecoder().decode(contents);
            const memTotal = parseInt(text.match(/MemTotal:\s+(\d+)/)[1]);
            const memAvailable = parseInt(text.match(/MemAvailable:\s+(\d+)/)[1]);

            const usedPercent = ((memTotal - memAvailable) / memTotal * 100);
            widget.valueLabel.set_text(usedPercent.toFixed(1) + '%');
        } catch (e) {
            logError(e, 'Error updating RAM stats');
        }
    }

    _updateGpu() {
        const widget = this._sensorWidgets['gpu'];
        if (!widget) return;

        try {
            // Use nvidia-smi for NVIDIA GPUs
            const [ok, stdout, stderr, exitCode] = GLib.spawn_command_line_sync(
                'nvidia-smi --query-gpu=utilization.gpu,temperature.gpu --format=csv,noheader,nounits'
            );

            if (ok && exitCode === 0) {
                const output = new TextDecoder().decode(stdout).trim();
                const parts = output.split(',').map(s => s.trim());

                if (parts.length >= 1) {
                    widget.valueLabel.set_text(parts[0] + '%');
                }

                if (widget.tempLabel && parts.length >= 2) {
                    widget.tempLabel.set_text(parts[1] + '°C');
                }
            } else {
                widget.valueLabel.set_text('N/A');
                if (widget.tempLabel) {
                    widget.tempLabel.set_text('N/A');
                }
            }
        } catch (e) {
            // nvidia-smi not available or error
            widget.valueLabel.set_text('N/A');
            if (widget.tempLabel) {
                widget.tempLabel.set_text('N/A');
            }
        }

        // Update fan5 (water pump) if enabled
        if (widget.fanLabel) {
            try {
                const [ok, stdout, stderr, exitCode] = GLib.spawn_command_line_sync('sensors');
                if (ok && exitCode === 0) {
                    const output = new TextDecoder().decode(stdout);
                    // Look for fan5 in sensors output
                    const match = output.match(/fan5:\s+(\d+)\s*RPM/i);
                    if (match) {
                        widget.fanLabel.set_text(match[1] + ' RPM');
                    } else {
                        widget.fanLabel.set_text('N/A');
                    }
                } else {
                    widget.fanLabel.set_text('N/A');
                }
            } catch (e) {
                widget.fanLabel.set_text('N/A');
            }
        }
    }

    destroy() {
        // Clean up timeout
        if (this._updateTimeoutId) {
            GLib.source_remove(this._updateTimeoutId);
            this._updateTimeoutId = null;
        }

        // Disconnect settings
        for (const id of this._settingsConnections) {
            this._settings.disconnect(id);
        }
        this._settingsConnections = [];

        super.destroy();
    }
});

class Extension {
    constructor() {
        this._indicator = null;
    }

    enable() {
        this._indicator = new SystemMonitorIndicator();

        // Get panel position from settings
        const settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.justin-sensors');
        const position = settings.get_string('panel-position');

        // Add to panel (right side by default)
        Main.panel.addToStatusArea('justin-sensors', this._indicator, 0, position);
    }

    disable() {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}

function init() {
    return new Extension();
}
