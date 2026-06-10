const PORT = 18988;
const API_URL = `http://localhost:${PORT}`;

// Application State
let appState = {
    connected: false,
    active_profile: "Default",
    profiles: {}
};

// Button Actions configuration
const BUTTON_ACTIONS = {
    "click": { name: "Left Click", group: 0, value: 0xf0 },
    "menu": { name: "Right Click", group: 0, value: 0xf1 },
    "scroll": { name: "Middle Click", group: 0, value: 0xf2 },
    "forward": { name: "Forward Button", group: 0, value: 0xf4 },
    "backward": { name: "Backward Button", group: 0, value: 0xf3 },
    "off": { name: "Button Off", group: 0, value: 0x00 },
    "dpi_cycle": { name: "DPI Cycle", group: 3, value: 0x01 },
    "dpi_up": { name: "DPI +", group: 3, value: 0x03 },
    "dpi_down": { name: "DPI -", group: 3, value: 0x04 },
    "juji": { name: "Sniper Key", group: 3, value: 0x0a },
    "light_mode_switch": { name: "Light Mode Switch", group: 3, value: 0x06 },
    "media_player": { name: "Media Player", group: 2, value: 0x00 },
    "play_pause": { name: "Play / Pause", group: 2, value: 0x01 },
    "media_stop": { name: "Stop", group: 2, value: 0x02 },
    "pre_track": { name: "Previous Track", group: 2, value: 0x03 },
    "next_track": { name: "Next Track", group: 2, value: 0x04 },
    "volume_up": { name: "Volume +", group: 2, value: 0x05 },
    "volume_down": { name: "Volume -", group: 2, value: 0x06 },
    "mute": { name: "Mute", group: 2, value: 0x07 },
    "keyboard": { name: "Keyboard Key", group: 1, value: 0x04 }
};

// Keyboard Code to USB HID Usage ID Mapping
const CODE_TO_HID = {
    KeyA: 0x04, KeyB: 0x05, KeyC: 0x06, KeyD: 0x07, KeyE: 0x08, KeyF: 0x09, KeyG: 0x0a, KeyH: 0x0b,
    KeyI: 0x0c, KeyJ: 0x0d, KeyK: 0x0e, KeyL: 0x0f, KeyM: 0x10, KeyN: 0x11, KeyO: 0x12, KeyP: 0x13,
    KeyQ: 0x14, KeyR: 0x15, KeyS: 0x16, KeyT: 0x17, KeyU: 0x18, KeyV: 0x19, KeyW: 0x1a, KeyX: 0x1b,
    KeyY: 0x1c, KeyZ: 0x1d,
    Digit1: 0x1e, Digit2: 0x1f, Digit3: 0x20, Digit4: 0x21, Digit5: 0x22, Digit6: 0x23, Digit7: 0x24,
    Digit8: 0x25, Digit9: 0x26, Digit0: 0x27,
    Enter: 0x28, Escape: 0x29, Backspace: 0x2a, Tab: 0x2b, Space: 0x2c,
    Minus: 0x2d, Equal: 0x2e, BracketLeft: 0x2f, BracketRight: 0x30, Backslash: 0x31,
    Semicolon: 0x33, Quote: 0x34, Backquote: 0x35, Comma: 0x36, Period: 0x37, Slash: 0x38,
    CapsLock: 0x39,
    F1: 0x3a, F2: 0x3b, F3: 0x3c, F4: 0x3d, F5: 0x3e, F6: 0x3f, F7: 0x40, F8: 0x41, F9: 0x42, F10: 0x43,
    F11: 0x44, F12: 0x45,
    PrintScreen: 0x46, ScrollLock: 0x47, Pause: 0x48, Insert: 0x49, Home: 0x4a, PageUp: 0x4b, Delete: 0x4c,
    End: 0x4d, PageDown: 0x4e, ArrowRight: 0x4f, ArrowLeft: 0x50, ArrowDown: 0x51, ArrowUp: 0x52,
    NumLock: 0x53, NumpadDivide: 0x54, NumpadMultiply: 0x55, NumpadSubtract: 0x56, NumpadAdd: 0x57,
    NumpadEnter: 0x58, Numpad1: 0x59, Numpad2: 0x5a, Numpad3: 0x5b, Numpad4: 0x5c, Numpad5: 0x5d,
    Numpad6: 0x5e, Numpad7: 0x5f, Numpad8: 0x60, Numpad9: 0x61, Numpad0: 0x62, NumpadDecimal: 0x63,
    ControlLeft: 0xe0, ShiftLeft: 0xe1, AltLeft: 0xe2, MetaLeft: 0xe3,
    ControlRight: 0xe4, ShiftRight: 0xe5, AltRight: 0xe6, MetaRight: 0xe7
};

// Reverse map for keycode display names
const HID_TO_NAME = {};
for (const [code, hid] of Object.entries(CODE_TO_HID)) {
    HID_TO_NAME[hid] = code.replace("Key", "").replace("Digit", "").replace("Numpad", "Num ").replace("Left", " L").replace("Right", " R");
}

// Helper: RGB Array to Hex String
function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Helper: Hex String to RGB Array
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : [0, 0, 0];
}

// Initialize Dashboard UI
document.addEventListener("DOMContentLoaded", () => {
    setupTabs();
    setupEventListeners();
    populateButtonOptions();
    fetchStatus();
    fetchProfiles();
    
    // Poll connection status every 3 seconds
    setInterval(fetchStatus, 3000);
});

// Setup tab navigation
function setupTabs() {
    const tabs = document.querySelectorAll(".nav-tab");
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            
            const targetPanel = tab.dataset.tab;
            document.querySelectorAll(".tab-panel").forEach(panel => {
                panel.classList.remove("active");
            });
            document.getElementById(`panel-${targetPanel}`).classList.add("active");
        });
    });
}

// Setup static event listeners
function setupEventListeners() {
    // Save & Apply
    document.getElementById("apply-btn").addEventListener("click", applySettings);
    
    // New Profile
    document.getElementById("new-profile-btn").addEventListener("click", createNewProfile);
    
    // Modal buttons
    document.getElementById("rename-cancel-btn").addEventListener("click", () => {
        document.getElementById("rename-modal").style.display = "none";
    });
    
    document.getElementById("rename-save-btn").addEventListener("click", saveProfileRename);
    
    // DPI Settings Sliders & Selects
    document.getElementById("pointer-speed-slider").addEventListener("input", (e) => {
        document.getElementById("val-pointer-speed").textContent = e.target.value;
        updateActiveProfileField("pointer_speed", parseInt(e.target.value));
    });
    document.getElementById("double-click-slider").addEventListener("input", (e) => {
        document.getElementById("val-double-click").textContent = e.target.value;
        updateActiveProfileField("double_click_speed", parseInt(e.target.value));
    });
    
    document.getElementById("polling-rate").addEventListener("change", (e) => {
        updateActiveProfileField("polling_rate", parseInt(e.target.value));
    });
    
    document.getElementById("stages-count").addEventListener("change", (e) => {
        const count = parseInt(e.target.value);
        updateActiveProfileField("stages_count", count);
        renderDPISliders();
    });
    
    // Lighting
    document.getElementById("led-mode").addEventListener("change", (e) => {
        updateActiveProfileLighting("mode", parseInt(e.target.value));
    });
    document.getElementById("led-brightness").addEventListener("input", (e) => {
        const val = parseInt(e.target.value);
        const percent = Math.round((val / 27) * 100);
        document.getElementById("val-brightness").textContent = `${percent}%`;
        updateActiveProfileLighting("brightness", val);
    });
    document.getElementById("led-speed").addEventListener("input", (e) => {
        const val = parseInt(e.target.value);
        let speedText = "Medium";
        if (val < 15) speedText = "Slow";
        else if (val > 35) speedText = "Fast";
        document.getElementById("val-speed").textContent = speedText;
        updateActiveProfileLighting("speed", val);
    });
    
    // SVG Mouse Hover Highlighting
    setupMouseSVGInteraction();
}

// Populate dropdown selector options
function populateButtonOptions() {
    const selects = document.querySelectorAll(".btn-select");
    selects.forEach(select => {
        if (!select.id.startsWith("btn-select-")) return;
        
        select.innerHTML = "";
        for (const [key, details] of Object.entries(BUTTON_ACTIONS)) {
            const opt = document.createElement("option");
            opt.value = key;
            opt.textContent = details.name;
            select.appendChild(opt);
        }
        
        // Listen to change
        select.addEventListener("change", (e) => {
            const btnIdx = parseInt(e.target.id.replace("btn-select-", ""));
            handleButtonActionChange(btnIdx, e.target.value);
        });
    });
}

// Handle change in button remapping drop down
function handleButtonActionChange(btnIdx, actionKey) {
    const profile = getActiveProfile();
    if (!profile) return;
    
    const input = document.getElementById(`btn-shortcut-${btnIdx}`);
    const actionDetails = BUTTON_ACTIONS[actionKey];
    
    // Get the button item in the profile list
    // Physical button index mapping
    const buttonMap = {
        1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 15: 14, 16: 15
    };
    
    const profileBtnIdx = buttonMap[btnIdx];
    if (profileBtnIdx === undefined) return;
    
    if (actionKey === "keyboard") {
        input.style.display = "block";
        // Setup capturing key
        input.value = HID_TO_NAME[profile.buttons[profileBtnIdx].value] || "Press Key...";
        
        // Remove previous listeners and add keydown listener
        input.onkeydown = (e) => {
            e.preventDefault();
            const hidCode = CODE_TO_HID[e.code];
            if (hidCode) {
                profile.buttons[profileBtnIdx].value = hidCode;
                profile.buttons[profileBtnIdx].group = 1;
                profile.buttons[profileBtnIdx].action = "keyboard";
                input.value = HID_TO_NAME[hidCode];
                input.blur();
                saveProfilesDatabase();
            }
        };
    } else {
        input.style.display = "none";
        profile.buttons[profileBtnIdx].action = actionKey;
        profile.buttons[profileBtnIdx].group = actionDetails.group;
        profile.buttons[profileBtnIdx].value = actionDetails.value;
        saveProfilesDatabase();
    }
}

// SVG Mouse Interactive Highlighting
function setupMouseSVGInteraction() {
    const mousePaths = document.querySelectorAll(".mouse-btn-path");
    
    // Highlight svg when hovering over row
    document.querySelectorAll(".button-row").forEach(row => {
        const btnId = row.dataset.btn;
        row.addEventListener("mouseenter", () => {
            row.classList.add("highlighted");
            const svgBtn = document.getElementById(`svg-btn-${btnId}`);
            if (svgBtn) svgBtn.classList.add("active");
        });
        row.addEventListener("mouseleave", () => {
            row.classList.remove("highlighted");
            const svgBtn = document.getElementById(`svg-btn-${btnId}`);
            if (svgBtn) svgBtn.classList.remove("active");
        });
    });
    
    // Highlight row when hovering over svg path
    mousePaths.forEach(path => {
        const btnId = path.id.replace("svg-btn-", "");
        
        path.addEventListener("mouseenter", () => {
            path.classList.add("active");
            const row = document.querySelector(`.button-row[data-btn="${btnId}"]`);
            if (row) {
                row.classList.add("highlighted");
                row.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }
        });
        
        path.addEventListener("mouseleave", () => {
            path.classList.remove("active");
            const row = document.querySelector(`.button-row[data-btn="${btnId}"]`);
            if (row) row.classList.remove("highlighted");
        });
        
        path.addEventListener("click", () => {
            // Focus on selector
            const select = document.getElementById(`btn-select-${btnId}`);
            if (select) select.focus();
        });
    });
}

// Fetch Status (Is Connected)
async function fetchStatus() {
    try {
        const res = await fetch(`${API_URL}/api/status`);
        const data = await res.json();
        appState.connected = data.connected;
        
        const container = document.getElementById("connection-status");
        const text = container.querySelector(".status-text");
        
        if (data.connected) {
            container.className = "connection-status connected";
            text.textContent = "Mouse Connected";
        } else {
            container.className = "connection-status disconnected";
            text.textContent = "Mouse Disconnected";
        }
    } catch (e) {
        const container = document.getElementById("connection-status");
        container.className = "connection-status disconnected";
        container.querySelector(".status-text").textContent = "Service Offline";
    }
}

// Fetch Profiles
async function fetchProfiles() {
    try {
        const res = await fetch(`${API_URL}/api/profiles`);
        const data = await res.json();
        appState.active_profile = data.active_profile;
        appState.profiles = data.profiles;
        
        renderProfilesSidebar();
        loadActiveProfileData();
    } catch (e) {
        console.error("Failed to fetch profiles:", e);
    }
}

// Render profiles lists in Sidebar
function renderProfilesSidebar() {
    const list = document.getElementById("profile-list");
    list.innerHTML = "";
    
    for (const name of Object.keys(appState.profiles)) {
        const item = document.createElement("div");
        item.className = `profile-item ${name === appState.active_profile ? 'active' : ''}`;
        
        // Profile Name label
        const label = document.createElement("span");
        label.className = "profile-name";
        label.textContent = name;
        label.addEventListener("click", () => switchActiveProfile(name));
        item.appendChild(label);
        
        // Action buttons
        const actions = document.createElement("div");
        actions.className = "profile-actions";
        
        // Rename
        const renameBtn = document.createElement("button");
        renameBtn.className = "profile-action-btn";
        renameBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z"></path></svg>`;
        renameBtn.addEventListener("click", () => openRenameModal(name));
        actions.appendChild(renameBtn);
        
        // Delete
        if (name !== "Default") {
            const deleteBtn = document.createElement("button");
            deleteBtn.className = "profile-action-btn delete";
            deleteBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
            deleteBtn.addEventListener("click", () => deleteProfile(name));
            actions.appendChild(deleteBtn);
        }
        
        item.appendChild(actions);
        list.appendChild(item);
    }
}

// Load current profile data into form controls
function loadActiveProfileData() {
    const profile = getActiveProfile();
    if (!profile) return;
    
    // Sliders & Selects
    document.getElementById("pointer-speed-slider").value = profile.pointer_speed;
    document.getElementById("val-pointer-speed").textContent = profile.pointer_speed;
    
    document.getElementById("double-click-slider").value = profile.double_click_speed;
    document.getElementById("val-double-click").textContent = profile.double_click_speed;
    
    document.getElementById("polling-rate").value = profile.polling_rate;
    document.getElementById("stages-count").value = profile.stages_count;
    
    // Buttons mapping dropdowns & shortcut inputs
    // Mapping: physical btn index -> array profile index
    const buttonMap = {
        1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 15: 14, 16: 15
    };
    
    for (const [btnIdx, arrayIdx] of Object.entries(buttonMap)) {
        const btnData = profile.buttons[arrayIdx];
        const select = document.getElementById(`btn-select-${btnIdx}`);
        const input = document.getElementById(`btn-shortcut-${btnIdx}`);
        
        if (btnData) {
            select.value = btnData.action;
            if (btnData.action === "keyboard") {
                input.style.display = "block";
                input.value = HID_TO_NAME[btnData.value] || "Press Key...";
            } else {
                input.style.display = "none";
            }
        }
    }
    
    // Lighting
    const lighting = profile.lighting;
    document.getElementById("led-mode").value = lighting.mode;
    document.getElementById("led-brightness").value = lighting.brightness;
    const percent = Math.round((lighting.brightness / 27) * 100);
    document.getElementById("val-brightness").textContent = `${percent}%`;
    
    document.getElementById("led-speed").value = lighting.speed;
    let speedText = "Medium";
    if (lighting.speed < 15) speedText = "Slow";
    else if (lighting.speed > 35) speedText = "Fast";
    document.getElementById("val-speed").textContent = speedText;
    
    // Render DPI list and Colors
    renderDPISliders();
    renderDPIColorPickerGrid();
}

// Render dynamic DPI configuration sliders
function renderDPISliders() {
    const profile = getActiveProfile();
    if (!profile) return;
    
    const container = document.getElementById("dpi-stages-container");
    container.innerHTML = "";
    
    const activeCount = profile.stages_count;
    const activeStageIdx = profile.active_stage;
    
    for (let i = 0; i < 8; i++) {
        const stage = profile.stages[i];
        if (!stage) continue;
        
        const card = document.createElement("div");
        card.className = `dpi-stage-card ${i === activeStageIdx ? 'active-indicator' : ''}`;
        if (i >= activeCount) {
            card.style.opacity = "0.35";
        }
        
        const header = document.createElement("div");
        header.className = "dpi-stage-header";
        
        const title = document.createElement("div");
        title.className = "dpi-stage-title";
        title.textContent = `Stage ${i + 1}`;
        header.appendChild(title);
        
        // Active indicator radio
        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "active-dpi-stage";
        radio.checked = (i === activeStageIdx);
        radio.disabled = (i >= activeCount);
        radio.addEventListener("change", () => {
            profile.active_stage = i;
            saveProfilesDatabase();
            document.querySelectorAll(".dpi-stage-card").forEach(c => c.classList.remove("active-indicator"));
            card.classList.add("active-indicator");
        });
        header.appendChild(radio);
        container.appendChild(header);
        
        // Display Value
        const valDisplay = document.createElement("div");
        valDisplay.className = "dpi-value-display";
        valDisplay.textContent = `${stage.dpi} DPI`;
        
        // Slider
        const slider = document.createElement("input");
        slider.type = "range";
        slider.className = "slider";
        slider.min = "200";
        slider.max = "12400";
        slider.step = "100";
        slider.value = stage.dpi;
        slider.disabled = (i >= activeCount);
        slider.addEventListener("input", (e) => {
            const dpiVal = parseInt(e.target.value);
            valDisplay.textContent = `${dpiVal} DPI`;
            stage.dpi = dpiVal;
        });
        slider.addEventListener("change", () => {
            saveProfilesDatabase();
        });
        
        card.appendChild(valDisplay);
        card.appendChild(slider);
        container.appendChild(card);
    }
}

// Render grid of Color mappings
function renderDPIColorPickerGrid() {
    const profile = getActiveProfile();
    if (!profile) return;
    
    const grid = document.getElementById("dpi-color-grid");
    grid.innerHTML = "";
    
    const colors = profile.lighting.colors;
    for (let i = 0; i < 12; i++) {
        const item = document.createElement("div");
        item.className = "color-item";
        
        const title = document.createElement("span");
        title.textContent = i < 8 ? `Stage ${i + 1}` : `Color ${i + 1}`;
        item.appendChild(title);
        
        const patch = document.createElement("div");
        patch.className = "color-patch";
        const [r, g, b] = colors[i] || [255, 0, 0];
        patch.style.backgroundColor = rgbToHex(r, g, b);
        item.appendChild(patch);
        
        // Input color picker overlay
        const picker = document.createElement("input");
        picker.type = "color";
        picker.className = "color-picker-input";
        picker.value = rgbToHex(r, g, b);
        picker.addEventListener("input", (e) => {
            const hex = e.target.value;
            patch.style.backgroundColor = hex;
            colors[i] = hexToRgb(hex);
        });
        picker.addEventListener("change", () => {
            saveProfilesDatabase();
        });
        item.appendChild(picker);
        grid.appendChild(item);
    }
}

// Helper: Fetch current active profile object
function getActiveProfile() {
    return appState.profiles[appState.active_profile];
}

// Update simple field of active profile
function updateActiveProfileField(field, value) {
    const profile = getActiveProfile();
    if (profile) {
        profile[field] = value;
        saveProfilesDatabase();
    }
}

// Update lighting setting in active profile
function updateActiveProfileLighting(field, value) {
    const profile = getActiveProfile();
    if (profile && profile.lighting) {
        profile.lighting[field] = value;
        saveProfilesDatabase();
    }
}

// Switch active profile
function switchActiveProfile(name) {
    appState.active_profile = name;
    renderProfilesSidebar();
    loadActiveProfileData();
    saveProfilesDatabase();
}

// Create new profile (duplicate active profile)
function createNewProfile() {
    const name = prompt("Enter new profile name:");
    if (!name || name.trim() === "") return;
    
    const trimName = name.trim();
    if (appState.profiles[trimName]) {
        alert("A profile with this name already exists.");
        return;
    }
    
    // Copy active profile
    const active = getActiveProfile();
    appState.profiles[trimName] = JSON.parse(JSON.stringify(active));
    appState.active_profile = trimName;
    
    renderProfilesSidebar();
    loadActiveProfileData();
    saveProfilesDatabase();
}

// Open Rename Profile modal
let profileToRename = null;
function openRenameModal(name) {
    profileToRename = name;
    const modal = document.getElementById("rename-modal");
    const input = document.getElementById("rename-profile-input");
    input.value = name;
    modal.style.display = "flex";
    input.focus();
}

// Save profile rename
function saveProfileRename() {
    const input = document.getElementById("rename-profile-input");
    const newName = input.value.trim();
    
    if (!newName || newName === "") return;
    if (newName === profileToRename) {
        document.getElementById("rename-modal").style.display = "none";
        return;
    }
    
    if (appState.profiles[newName]) {
        alert("A profile with this name already exists.");
        return;
    }
    
    // Copy and delete old key
    appState.profiles[newName] = appState.profiles[profileToRename];
    delete appState.profiles[profileToRename];
    
    if (appState.active_profile === profileToRename) {
        appState.active_profile = newName;
    }
    
    document.getElementById("rename-modal").style.display = "none";
    renderProfilesSidebar();
    saveProfilesDatabase();
}

// Delete Profile
function deleteProfile(name) {
    if (name === "Default") return;
    if (confirm(`Are you sure you want to delete profile "${name}"?`)) {
        delete appState.profiles[name];
        if (appState.active_profile === name) {
            appState.active_profile = "Default";
        }
        renderProfilesSidebar();
        loadActiveProfileData();
        saveProfilesDatabase();
    }
}

// POST current state to profiles database
async function saveProfilesDatabase() {
    try {
        const payload = {
            active_profile: appState.active_profile,
            profiles: appState.profiles
        };
        await fetch(`${API_URL}/api/profiles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (e) {
        console.error("Failed to save profiles to database:", e);
    }
}

// POST apply settings to hardware
async function applySettings() {
    const applyBtn = document.getElementById("apply-btn");
    const statusText = document.getElementById("connection-status").querySelector(".status-text");
    
    const originalText = applyBtn.innerHTML;
    applyBtn.disabled = true;
    applyBtn.textContent = "Applying...";
    
    const profile = getActiveProfile();
    try {
        const res = await fetch(`${API_URL}/api/apply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profile)
        });
        const data = await res.json();
        
        if (data.success) {
            applyBtn.textContent = "Success!";
            applyBtn.style.boxShadow = "0 0 15px var(--success-green)";
            setTimeout(() => {
                applyBtn.disabled = false;
                applyBtn.innerHTML = originalText;
                applyBtn.style.boxShadow = "";
            }, 1500);
        } else {
            throw new Error(data.error);
        }
    } catch (e) {
        alert(`Failed to apply configurations: ${e.message}`);
        applyBtn.disabled = false;
        applyBtn.innerHTML = originalText;
    }
}
