/* extension.js
 *
 * Detailed Sensor - GNOME Shell Extension
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

// Regex constants
const REGEX_CPU_TEMP = /(?:Core 0|Package id 0):\s+\+?([\d.]+)°C/;
const REGEX_RAM_TOTAL = /MemTotal:\s+(\d+)/;
const REGEX_RAM_AVAIL = /MemAvailable:\s+(\d+)/;
const REGEX_FAN5 = /fan5:\s+(\d+)\s*RPM/i;

let SystemMonitorIndicator = GObject.registerClass(
class SystemMonitorIndicator extends PanelMenu.Button {
    _init() {
        super._init(0.0, 'Detailed Sensor');

        this._settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.detailed_sensor');

        // State variables
        this._prevCpuStats = null;
        this._isUpdating = false;
        this._cpuTempPath = null; // Cached path
        this._sensorWidgets = {};

        // Settings cache for update loop
        this._refreshInterval = 1000;

        // Create main container
        this._box = new St.BoxLayout({
            style_class: 'system-monitor-container'
        });
        this.add_child(this._box);

        // Initialize sensor widgets
        this._initSensorWidgets();

        // Detect sensors
        this._detectSensors();

        // Connect to settings changes
        this._settingsConnections = [];
        this._connectSettings();

        // Start update loop
        this._updateTimeoutId = null;
        this._startUpdateLoop();
    }

    _initSensorWidgets() {
        this._box.destroy_all_children();
        this._sensorWidgets = {};

        // Get sorted sensors
        const sortedSensors = Object.values(SENSORS).sort((a, b) => a.order - b.order);

        for (const sensor of sortedSensors) {
            // Create container regardless of visibility (we'll hide/show)
            // This is safer for referencing later, though we could also create on demand.
            // For simplicity in _updateStyles, let's create them if enabled,
            // but the requirement was "Update Widgets Instead of Recreating".
            // So we should create them all and toggle visibility.

            const container = new St.BoxLayout({
                style_class: 'sensor-container',
                visible: this._settings.get_boolean(`show-${sensor.id}`)
            });

            // Create icon
            const iconPath = Me.path + '/icons/' + sensor.icon;
            const iconFile = Gio.File.new_for_path(iconPath);
            const gicon = new Gio.FileIcon({ file: iconFile });
            const icon = new St.Icon({
                gicon: gicon,
                style_class: 'system-monitor-icon'
            });
            container.add_child(icon);

            // Value label
            const valueLabel = new St.Label({
                text: '---%',
                style_class: 'system-monitor-value',
                y_align: Clutter.ActorAlign.CENTER
            });
            container.add_child(valueLabel);

            // Temp label
            let tempLabel = null;
            if (sensor.hasTemp) {
                tempLabel = new St.Label({
                    text: '---°C',
                    style_class: 'system-monitor-temp',
                    y_align: Clutter.ActorAlign.CENTER,
                    visible: this._settings.get_boolean(`show-${sensor.id}-temp`)
                });
                container.add_child(tempLabel);
            }

            // Fan label
            let fanLabel = null;
            if (sensor.hasFan) {
                fanLabel = new St.Label({
                    text: '--- RPM',
                    style_class: 'system-monitor-fan',
                    y_align: Clutter.ActorAlign.CENTER,
                    visible: this._settings.get_boolean(`show-${sensor.id}-fan`)
                });
                container.add_child(fanLabel);
            }

            this._box.add_child(container);

            this._sensorWidgets[sensor.id] = {
                container,
                icon,
                valueLabel,
                tempLabel,
                fanLabel
            };
        }

        // Apply initial styles
        this._updateStyles();
    }

    _updateStyles() {
        const sortedSensors = Object.values(SENSORS);
        const valueFontSize = this._settings.get_int('value-font-size');
        const tempFontSize = this._settings.get_int('temp-font-size');

        for (const sensor of sortedSensors) {
            const widget = this._sensorWidgets[sensor.id];
            if (!widget) continue;

            // Visibility
            widget.container.visible = this._settings.get_boolean(`show-${sensor.id}`);

            // Icon Size
            const iconSize = this._settings.get_int(`${sensor.id}-icon-size`);
            widget.icon.icon_size = iconSize;

            // Colors
            const valueColor = this._settings.get_string(`${sensor.id}-value-color`);
            widget.valueLabel.style = `color: ${valueColor}; font-size: ${valueFontSize}px; font-weight: bold;`;

            if (widget.tempLabel) {
                const showTemp = this._settings.get_boolean(`show-${sensor.id}-temp`);
                widget.tempLabel.visible = showTemp;
                if (showTemp) {
                    const tempColor = this._settings.get_string(`${sensor.id}-temp-color`);
                    widget.tempLabel.style = `color: ${tempColor}; font-size: ${tempFontSize}px; font-weight: bold;`;
                }
            }

            if (widget.fanLabel) {
                const showFan = this._settings.get_boolean(`show-${sensor.id}-fan`);
                widget.fanLabel.visible = showFan;
                if (showFan) {
                    const fanColor = this._settings.get_string(`${sensor.id}-fan-color`);
                    widget.fanLabel.style = `color: ${fanColor}; font-size: ${valueFontSize}px; font-weight: bold;`;
                }
            }
        }
    }

    _detectSensors() {
        // Detect CPU Temp Path
        const customPath = this._settings.get_string('cpu-temp-path');
        if (customPath && customPath.length > 0) {
            this._cpuTempPath = customPath;
        } else {
            // Auto-detect
            const thermalZones = [
                '/sys/class/thermal/thermal_zone0/temp',
                '/sys/class/hwmon/hwmon0/temp1_input',
                '/sys/class/hwmon/hwmon1/temp1_input',
                '/sys/class/hwmon/hwmon2/temp1_input'
            ];

            this._cpuTempPath = null;
            for (const path of thermalZones) {
                if (GLib.file_test(path, GLib.FileTest.EXISTS)) {
                    this._cpuTempPath = path;
                    break;
                }
            }
        }
    }

    _connectSettings() {
        // Re-apply styles on changes
        const styleKeys = [
            'show-cpu', 'show-ram', 'show-gpu', 'show-cpu-temp', 'show-gpu-temp', 'show-gpu-fan',
            'cpu-icon-size', 'ram-icon-size', 'gpu-icon-size',
            'cpu-value-color', 'cpu-temp-color',
            'ram-value-color',
            'gpu-value-color', 'gpu-temp-color', 'gpu-fan-color',
            'value-font-size', 'temp-font-size'
        ];

        for (const key of styleKeys) {
            const id = this._settings.connect(`changed::${key}`, () => {
                this._updateStyles();
            });
            this._settingsConnections.push(id);
        }

        // Handle refresh interval
        const intervalId = this._settings.connect('changed::refresh-interval', () => {
            this._refreshInterval = this._settings.get_int('refresh-interval');
            this._restartUpdateLoop();
        });
        this._settingsConnections.push(intervalId);

        // Handle CPU temp path change
        const pathId = this._settings.connect('changed::cpu-temp-path', () => {
            this._detectSensors();
        });
        this._settingsConnections.push(pathId);

        this._refreshInterval = this._settings.get_int('refresh-interval');
    }

    _startUpdateLoop() {
        this._update(); // Initial update

        this._updateTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, this._refreshInterval, () => {
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

    async _update() {
        if (this._isUpdating) return;
        this._isUpdating = true;

        try {
            // Run updates in parallel? Or sequential is fine since they are async IO.
            // Using Promise.all would be ideal if we were in a full JS environment,
            // but GJS async/await works sequentially nicely.

            if (this._sensorWidgets['cpu'].container.visible) await this._updateCpu();
            if (this._sensorWidgets['ram'].container.visible) await this._updateRam();
            if (this._sensorWidgets['gpu'].container.visible) await this._updateGpu();

        } catch (e) {
            logError(e, 'Error in update loop');
        } finally {
            this._isUpdating = false;
        }
    }

    async _getFileContentsAsync(path) {
        return new Promise((resolve, reject) => {
            const file = Gio.File.new_for_path(path);
            file.load_contents_async(null, (file, res) => {
                try {
                    const [ok, contents] = file.load_contents_finish(res);
                    if (ok) {
                        resolve(new TextDecoder().decode(contents));
                    } else {
                        reject(new Error(`Failed to load ${path}`));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });
    }

    async _execCommandAsync(command) {
        return new Promise((resolve, reject) => {
            try {
                const [cmd, ...args] = command.split(' ');
                const proc = new Gio.Subprocess({
                    argv: [cmd, ...args],
                    flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
                });

                proc.communicate_utf8_async(null, null, (proc, res) => {
                    try {
                        const [ok, stdout, stderr] = proc.communicate_utf8_finish(res);
                        if (ok && proc.get_successful()) {
                            resolve(stdout);
                        } else {
                            reject(new Error(stderr || 'Command failed'));
                        }
                    } catch (e) {
                        reject(e);
                    }
                });
            } catch (e) {
                reject(e);
            }
        });
    }

    async _updateCpu() {
        const widget = this._sensorWidgets['cpu'];

        try {
            // Read CPU stats
            const contents = await this._getFileContentsAsync('/proc/stat');
            const lines = contents.split('\n');
            const cpuLine = lines[0];
            const parts = cpuLine.split(/\s+/);

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

            // CPU Temperature
            if (widget.tempLabel && widget.tempLabel.visible) {
                let temp = null;

                // Use cached path if available
                if (this._cpuTempPath) {
                    try {
                        const tempText = await this._getFileContentsAsync(this._cpuTempPath);
                        temp = parseInt(tempText.trim()) / 1000;
                    } catch (e) {
                        // Cached path failed, maybe reset?
                        // For now, just ignore.
                    }
                }

                // Fallback to sensors command if no file path (or if user hasn't set custom path and we failed)
                // Note: current logic only uses sensors command if _cpuTempPath is null.
                if (temp === null && !this._cpuTempPath) {
                    try {
                        const stdout = await this._execCommandAsync('sensors');
                        const match = stdout.match(REGEX_CPU_TEMP);
                        if (match) {
                            temp = parseFloat(match[1]);
                        }
                    } catch (e) {
                        // ignore
                    }
                }

                if (temp !== null) {
                    widget.tempLabel.set_text(temp.toFixed(1) + '°C');
                }
            }

        } catch (e) {
            // logError(e); // Reduce noise
        }
    }

    async _updateRam() {
        const widget = this._sensorWidgets['ram'];

        try {
            // Check for custom path
            let ramPath = this._settings.get_string('ram-path');
            if (!ramPath) ramPath = '/proc/meminfo';

            const contents = await this._getFileContentsAsync(ramPath);
            const memTotalMatch = contents.match(REGEX_RAM_TOTAL);
            const memAvailableMatch = contents.match(REGEX_RAM_AVAIL);

            if (memTotalMatch && memAvailableMatch) {
                const memTotal = parseInt(memTotalMatch[1]);
                const memAvailable = parseInt(memAvailableMatch[1]);
                const usedPercent = ((memTotal - memAvailable) / memTotal * 100);
                widget.valueLabel.set_text(usedPercent.toFixed(1) + '%');
            }
        } catch (e) {
            // ignore
        }
    }

    async _updateGpu() {
        const widget = this._sensorWidgets['gpu'];

        // GPU Stats
        try {
            // Check for custom command
            let gpuCmd = this._settings.get_string('gpu-command');
            if (!gpuCmd) gpuCmd = 'nvidia-smi --query-gpu=utilization.gpu,temperature.gpu --format=csv,noheader,nounits';

            const output = await this._execCommandAsync(gpuCmd);
            const parts = output.trim().split(',').map(s => s.trim());

            if (parts.length >= 1) {
                widget.valueLabel.set_text(parts[0] + '%');
            }

            if (widget.tempLabel && widget.tempLabel.visible && parts.length >= 2) {
                widget.tempLabel.set_text(parts[1] + '°C');
            }
        } catch (e) {
            widget.valueLabel.set_text('N/A');
            if (widget.tempLabel) widget.tempLabel.set_text('N/A');
        }

        // Fan (Water Pump)
        if (widget.fanLabel && widget.fanLabel.visible) {
            try {
                const stdout = await this._execCommandAsync('sensors');
                const match = stdout.match(REGEX_FAN5);
                if (match) {
                    widget.fanLabel.set_text(match[1] + ' RPM');
                } else {
                    widget.fanLabel.set_text('N/A');
                }
            } catch (e) {
                widget.fanLabel.set_text('N/A');
            }
        }
    }

    destroy() {
        if (this._updateTimeoutId) {
            GLib.source_remove(this._updateTimeoutId);
            this._updateTimeoutId = null;
        }

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
        const settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.detailed_sensor');
        const position = settings.get_string('panel-position');
        Main.panel.addToStatusArea('detailed_sensor', this._indicator, 0, position);
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
