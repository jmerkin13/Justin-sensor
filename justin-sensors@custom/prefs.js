/* prefs.js
 *
 * Justin Sensors - Preferences
 * Settings UI for the extension
 *
 * For GNOME Shell 42 (GTK4 + Adw)
 */

'use strict';

const { Adw, Gdk, Gio, Gtk } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;

function init() {
    // Nothing to initialize
}

function fillPreferencesWindow(window) {
    const settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.justin-sensors');

    // Create General page
    const generalPage = new Adw.PreferencesPage({
        title: 'General',
        icon_name: 'preferences-system-symbolic'
    });
    window.add(generalPage);

    // General settings group
    const generalGroup = new Adw.PreferencesGroup({
        title: 'General Settings'
    });
    generalPage.add(generalGroup);

    // Refresh interval
    const refreshRow = new Adw.ActionRow({
        title: 'Refresh Interval',
        subtitle: 'How often to update sensor readings'
    });
    generalGroup.add(refreshRow);

    const refreshSpin = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower: 500,
            upper: 10000,
            step_increment: 100,
            page_increment: 500,
            value: settings.get_int('refresh-interval')
        }),
        valign: Gtk.Align.CENTER
    });
    refreshSpin.connect('value-changed', () => {
        settings.set_int('refresh-interval', refreshSpin.get_value());
    });
    refreshRow.add_suffix(refreshSpin);

    const msLabel = new Gtk.Label({
        label: 'ms',
        valign: Gtk.Align.CENTER,
        margin_start: 4
    });
    refreshRow.add_suffix(msLabel);

    // Panel position
    const positionRow = new Adw.ActionRow({
        title: 'Panel Position',
        subtitle: 'Where to display in the top panel'
    });
    generalGroup.add(positionRow);

    const positionCombo = new Gtk.ComboBoxText({
        valign: Gtk.Align.CENTER
    });
    positionCombo.append('left', 'Left');
    positionCombo.append('center', 'Center');
    positionCombo.append('right', 'Right');
    positionCombo.set_active_id(settings.get_string('panel-position'));
    positionCombo.connect('changed', () => {
        settings.set_string('panel-position', positionCombo.get_active_id());
    });
    positionRow.add_suffix(positionCombo);

    // Create Sensors page
    const sensorsPage = new Adw.PreferencesPage({
        title: 'Sensors',
        icon_name: 'utilities-system-monitor-symbolic'
    });
    window.add(sensorsPage);

    // CPU group
    const cpuGroup = new Adw.PreferencesGroup({
        title: 'CPU',
        description: 'Source: /proc/stat'
    });
    sensorsPage.add(cpuGroup);

    const cpuRow = new Adw.ActionRow({
        title: 'Show CPU Usage',
        subtitle: 'Source: /proc/stat (calculates delta)'
    });
    cpuGroup.add(cpuRow);

    const cpuSwitch = new Gtk.Switch({
        active: settings.get_boolean('show-cpu'),
        valign: Gtk.Align.CENTER
    });
    settings.bind('show-cpu', cpuSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);
    cpuRow.add_suffix(cpuSwitch);
    cpuRow.set_activatable_widget(cpuSwitch);

    const cpuTempRow = new Adw.ActionRow({
        title: 'Show CPU Temperature',
        subtitle: 'Source: /sys/class/thermal or lm-sensors'
    });
    cpuGroup.add(cpuTempRow);

    const cpuTempSwitch = new Gtk.Switch({
        active: settings.get_boolean('show-cpu-temp'),
        valign: Gtk.Align.CENTER
    });
    settings.bind('show-cpu-temp', cpuTempSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);
    cpuTempRow.add_suffix(cpuTempSwitch);
    cpuTempRow.set_activatable_widget(cpuTempSwitch);

    // CPU icon size
    const cpuIconSizeRow = new Adw.ActionRow({
        title: 'CPU Icon Size',
        subtitle: 'Size of CPU icon in pixels'
    });
    cpuGroup.add(cpuIconSizeRow);

    const cpuIconSizeSpin = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower: 12,
            upper: 128,
            step_increment: 1,
            page_increment: 8,
            value: settings.get_int('cpu-icon-size')
        }),
        valign: Gtk.Align.CENTER
    });
    cpuIconSizeSpin.connect('value-changed', () => {
        settings.set_int('cpu-icon-size', cpuIconSizeSpin.get_value());
    });
    cpuIconSizeRow.add_suffix(cpuIconSizeSpin);

    const cpuPxLabel = new Gtk.Label({
        label: 'px',
        valign: Gtk.Align.CENTER,
        margin_start: 4
    });
    cpuIconSizeRow.add_suffix(cpuPxLabel);

    // CPU value color
    const cpuValueColorRow = new Adw.ActionRow({
        title: 'CPU Value Color',
        subtitle: 'Color for CPU usage percentage'
    });
    cpuGroup.add(cpuValueColorRow);

    const cpuValueColorButton = new Gtk.ColorButton({
        valign: Gtk.Align.CENTER,
        use_alpha: false
    });
    const cpuValueRgba = new Gdk.RGBA();
    cpuValueRgba.parse(settings.get_string('cpu-value-color'));
    cpuValueColorButton.set_rgba(cpuValueRgba);
    cpuValueColorButton.connect('color-set', () => {
        const color = cpuValueColorButton.get_rgba().to_string();
        settings.set_string('cpu-value-color', color);
    });
    cpuValueColorRow.add_suffix(cpuValueColorButton);

    // CPU temp color
    const cpuTempColorRow = new Adw.ActionRow({
        title: 'CPU Temp Color',
        subtitle: 'Color for CPU temperature'
    });
    cpuGroup.add(cpuTempColorRow);

    const cpuTempColorButton = new Gtk.ColorButton({
        valign: Gtk.Align.CENTER,
        use_alpha: false
    });
    const cpuTempRgba = new Gdk.RGBA();
    cpuTempRgba.parse(settings.get_string('cpu-temp-color'));
    cpuTempColorButton.set_rgba(cpuTempRgba);
    cpuTempColorButton.connect('color-set', () => {
        const color = cpuTempColorButton.get_rgba().to_string();
        settings.set_string('cpu-temp-color', color);
    });
    cpuTempColorRow.add_suffix(cpuTempColorButton);

    // RAM group
    const ramGroup = new Adw.PreferencesGroup({
        title: 'RAM',
        description: 'Source: /proc/meminfo'
    });
    sensorsPage.add(ramGroup);

    const ramRow = new Adw.ActionRow({
        title: 'Show RAM Usage',
        subtitle: 'Source: /proc/meminfo (MemTotal - MemAvailable)'
    });
    ramGroup.add(ramRow);

    const ramSwitch = new Gtk.Switch({
        active: settings.get_boolean('show-ram'),
        valign: Gtk.Align.CENTER
    });
    settings.bind('show-ram', ramSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);
    ramRow.add_suffix(ramSwitch);
    ramRow.set_activatable_widget(ramSwitch);

    // RAM icon size
    const ramIconSizeRow = new Adw.ActionRow({
        title: 'RAM Icon Size',
        subtitle: 'Size of RAM icon in pixels'
    });
    ramGroup.add(ramIconSizeRow);

    const ramIconSizeSpin = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower: 12,
            upper: 128,
            step_increment: 1,
            page_increment: 8,
            value: settings.get_int('ram-icon-size')
        }),
        valign: Gtk.Align.CENTER
    });
    ramIconSizeSpin.connect('value-changed', () => {
        settings.set_int('ram-icon-size', ramIconSizeSpin.get_value());
    });
    ramIconSizeRow.add_suffix(ramIconSizeSpin);

    const ramPxLabel = new Gtk.Label({
        label: 'px',
        valign: Gtk.Align.CENTER,
        margin_start: 4
    });
    ramIconSizeRow.add_suffix(ramPxLabel);

    // RAM value color
    const ramValueColorRow = new Adw.ActionRow({
        title: 'RAM Value Color',
        subtitle: 'Color for RAM usage percentage'
    });
    ramGroup.add(ramValueColorRow);

    const ramValueColorButton = new Gtk.ColorButton({
        valign: Gtk.Align.CENTER,
        use_alpha: false
    });
    const ramValueRgba = new Gdk.RGBA();
    ramValueRgba.parse(settings.get_string('ram-value-color'));
    ramValueColorButton.set_rgba(ramValueRgba);
    ramValueColorButton.connect('color-set', () => {
        const color = ramValueColorButton.get_rgba().to_string();
        settings.set_string('ram-value-color', color);
    });
    ramValueColorRow.add_suffix(ramValueColorButton);

    // GPU group
    const gpuGroup = new Adw.PreferencesGroup({
        title: 'GPU (NVIDIA)',
        description: 'Source: nvidia-smi'
    });
    sensorsPage.add(gpuGroup);

    const gpuRow = new Adw.ActionRow({
        title: 'Show GPU Usage',
        subtitle: 'Source: nvidia-smi --query-gpu=utilization.gpu'
    });
    gpuGroup.add(gpuRow);

    const gpuSwitch = new Gtk.Switch({
        active: settings.get_boolean('show-gpu'),
        valign: Gtk.Align.CENTER
    });
    settings.bind('show-gpu', gpuSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);
    gpuRow.add_suffix(gpuSwitch);
    gpuRow.set_activatable_widget(gpuSwitch);

    const gpuTempRow = new Adw.ActionRow({
        title: 'Show GPU Temperature',
        subtitle: 'Source: nvidia-smi --query-gpu=temperature.gpu'
    });
    gpuGroup.add(gpuTempRow);

    const gpuTempSwitch = new Gtk.Switch({
        active: settings.get_boolean('show-gpu-temp'),
        valign: Gtk.Align.CENTER
    });
    settings.bind('show-gpu-temp', gpuTempSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);
    gpuTempRow.add_suffix(gpuTempSwitch);
    gpuTempRow.set_activatable_widget(gpuTempSwitch);

    // GPU icon size
    const gpuIconSizeRow = new Adw.ActionRow({
        title: 'GPU Icon Size',
        subtitle: 'Size of GPU icon in pixels'
    });
    gpuGroup.add(gpuIconSizeRow);

    const gpuIconSizeSpin = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower: 12,
            upper: 128,
            step_increment: 1,
            page_increment: 8,
            value: settings.get_int('gpu-icon-size')
        }),
        valign: Gtk.Align.CENTER
    });
    gpuIconSizeSpin.connect('value-changed', () => {
        settings.set_int('gpu-icon-size', gpuIconSizeSpin.get_value());
    });
    gpuIconSizeRow.add_suffix(gpuIconSizeSpin);

    const gpuPxLabel = new Gtk.Label({
        label: 'px',
        valign: Gtk.Align.CENTER,
        margin_start: 4
    });
    gpuIconSizeRow.add_suffix(gpuPxLabel);

    // GPU value color
    const gpuValueColorRow = new Adw.ActionRow({
        title: 'GPU Value Color',
        subtitle: 'Color for GPU usage percentage'
    });
    gpuGroup.add(gpuValueColorRow);

    const gpuValueColorButton = new Gtk.ColorButton({
        valign: Gtk.Align.CENTER,
        use_alpha: false
    });
    const gpuValueRgba = new Gdk.RGBA();
    gpuValueRgba.parse(settings.get_string('gpu-value-color'));
    gpuValueColorButton.set_rgba(gpuValueRgba);
    gpuValueColorButton.connect('color-set', () => {
        const color = gpuValueColorButton.get_rgba().to_string();
        settings.set_string('gpu-value-color', color);
    });
    gpuValueColorRow.add_suffix(gpuValueColorButton);

    // GPU temp color
    const gpuTempColorRow = new Adw.ActionRow({
        title: 'GPU Temp Color',
        subtitle: 'Color for GPU temperature'
    });
    gpuGroup.add(gpuTempColorRow);

    const gpuTempColorButton = new Gtk.ColorButton({
        valign: Gtk.Align.CENTER,
        use_alpha: false
    });
    const gpuTempRgba = new Gdk.RGBA();
    gpuTempRgba.parse(settings.get_string('gpu-temp-color'));
    gpuTempColorButton.set_rgba(gpuTempRgba);
    gpuTempColorButton.connect('color-set', () => {
        const color = gpuTempColorButton.get_rgba().to_string();
        settings.set_string('gpu-temp-color', color);
    });
    gpuTempColorRow.add_suffix(gpuTempColorButton);

    // GPU fan (water pump) toggle
    const gpuFanRow = new Adw.ActionRow({
        title: 'Show Fan5 (Water Pump)',
        subtitle: 'Source: lm-sensors (sensors | grep fan5)'
    });
    gpuGroup.add(gpuFanRow);

    const gpuFanSwitch = new Gtk.Switch({
        active: settings.get_boolean('show-gpu-fan'),
        valign: Gtk.Align.CENTER
    });
    settings.bind('show-gpu-fan', gpuFanSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);
    gpuFanRow.add_suffix(gpuFanSwitch);
    gpuFanRow.set_activatable_widget(gpuFanSwitch);

    // GPU fan color
    const gpuFanColorRow = new Adw.ActionRow({
        title: 'Fan5 Color',
        subtitle: 'Color for fan5 (water pump) speed'
    });
    gpuGroup.add(gpuFanColorRow);

    const gpuFanColorButton = new Gtk.ColorButton({
        valign: Gtk.Align.CENTER,
        use_alpha: false
    });
    const gpuFanRgba = new Gdk.RGBA();
    gpuFanRgba.parse(settings.get_string('gpu-fan-color'));
    gpuFanColorButton.set_rgba(gpuFanRgba);
    gpuFanColorButton.connect('color-set', () => {
        const color = gpuFanColorButton.get_rgba().to_string();
        settings.set_string('gpu-fan-color', color);
    });
    gpuFanColorRow.add_suffix(gpuFanColorButton);

    // Create Font Sizes page
    const fontSizePage = new Adw.PreferencesPage({
        title: 'Font Sizes',
        icon_name: 'font-x-generic-symbolic'
    });
    window.add(fontSizePage);

    // Font sizes group
    const fontSizeGroup = new Adw.PreferencesGroup({
        title: 'Text Sizes',
        description: 'Adjust font sizes for all sensors (colors are set per-sensor in Sensors tab)'
    });
    fontSizePage.add(fontSizeGroup);

    // Value font size
    const valueFontSizeRow = new Adw.ActionRow({
        title: 'Value Font Size',
        subtitle: 'Font size for usage percentages'
    });
    fontSizeGroup.add(valueFontSizeRow);

    const valueFontSizeSpin = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower: 8,
            upper: 72,
            step_increment: 1,
            page_increment: 4,
            value: settings.get_int('value-font-size')
        }),
        valign: Gtk.Align.CENTER
    });
    valueFontSizeSpin.connect('value-changed', () => {
        settings.set_int('value-font-size', valueFontSizeSpin.get_value());
    });
    valueFontSizeRow.add_suffix(valueFontSizeSpin);

    const valuePxLabel = new Gtk.Label({
        label: 'px',
        valign: Gtk.Align.CENTER,
        margin_start: 4
    });
    valueFontSizeRow.add_suffix(valuePxLabel);

    // Temperature font size
    const tempFontSizeRow = new Adw.ActionRow({
        title: 'Temperature Font Size',
        subtitle: 'Font size for temperature values'
    });
    fontSizeGroup.add(tempFontSizeRow);

    const tempFontSizeSpin = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower: 8,
            upper: 72,
            step_increment: 1,
            page_increment: 4,
            value: settings.get_int('temp-font-size')
        }),
        valign: Gtk.Align.CENTER
    });
    tempFontSizeSpin.connect('value-changed', () => {
        settings.set_int('temp-font-size', tempFontSizeSpin.get_value());
    });
    tempFontSizeRow.add_suffix(tempFontSizeSpin);

    const tempPxLabel = new Gtk.Label({
        label: 'px',
        valign: Gtk.Align.CENTER,
        margin_start: 4
    });
    tempFontSizeRow.add_suffix(tempPxLabel);

    // About page
    const aboutPage = new Adw.PreferencesPage({
        title: 'About',
        icon_name: 'help-about-symbolic'
    });
    window.add(aboutPage);

    const aboutGroup = new Adw.PreferencesGroup();
    aboutPage.add(aboutGroup);

    const aboutRow = new Adw.ActionRow({
        title: 'Justin Sensors',
        subtitle: 'Display CPU, RAM, and GPU stats in the top panel\n\nVersion 1.0'
    });
    aboutGroup.add(aboutRow);

    const howToAddRow = new Adw.ActionRow({
        title: 'Adding New Sensors',
        subtitle: 'See CLAUDE.md in the extension folder for instructions on adding custom sensors'
    });
    aboutGroup.add(howToAddRow);

    window.set_default_size(500, 600);
}
