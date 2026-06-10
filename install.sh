#!/bin/bash

# Exit on any error
set -e

echo "======================================================"
echo "EvoFox Ghost Air Linux Utility Installer"
echo "======================================================"

# 1. Detect Package Manager and Install System Dependencies
echo "Detecting system package manager..."
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS_ID=$ID
    OS_LIKE=$ID_LIKE
else
    OS_ID=$(uname -s)
    OS_LIKE=""
fi

echo "OS detected: $OS_ID ($OS_LIKE)"

install_system_deps() {
    # Match ID or ID_LIKE
    if [[ "$OS_ID" =~ (ubuntu|debian|pop|mint|elementary|kali) ]] || [[ "$OS_LIKE" =~ (ubuntu|debian) ]]; then
        echo "Ubuntu/Debian-based system detected. Installing system packages..."
        sudo apt-get update
        sudo apt-get install -y python3-venv python3-pip libhidapi-hidraw0 libusb-1.0-0
    elif [[ "$OS_ID" =~ (fedora|rhel|centos|rocky|almalinux) ]] || [[ "$OS_LIKE" =~ fedora ]]; then
        echo "Fedora/RedHat-based system detected. Installing system packages..."
        sudo dnf install -y python3-virtualenv hidapi
    elif [[ "$OS_ID" =~ (arch|manjaro|garuda|arco) ]] || [[ "$OS_LIKE" =~ arch ]]; then
        echo "Arch Linux-based system detected. Installing system packages..."
        sudo pacman -Sy --noconfirm python hidapi
    elif [[ "$OS_ID" =~ (opensuse|suse) ]] || [[ "$OS_LIKE" =~ suse ]]; then
        echo "openSUSE system detected. Installing system packages..."
        sudo zypper install -y python3-virtualenv hidapi
    else
        echo "Warning: Unknown or generic Linux distribution. Please ensure 'python3-venv' and 'hidapi' are installed manually."
    fi
}

install_system_deps

# 2. Check for Python 3
if ! command -v python3 &>/dev/null; then
    echo "Error: Python 3 is not installed. Please install it first."
    exit 1
fi


# 3. Create install directories
INSTALL_DIR="$HOME/.local/share/evofox-ghost-air"
SYSTEMD_USER_DIR="$HOME/.config/systemd/user"

echo "Creating directories..."
mkdir -p "$INSTALL_DIR"
mkdir -p "$SYSTEMD_USER_DIR"

# 4. Set up python virtual environment
echo "Setting up virtual environment in $INSTALL_DIR/venv..."
python3 -m venv "$INSTALL_DIR/venv"

# 5. Install dependencies
echo "Installing python dependencies (hidapi)..."
"$INSTALL_DIR/venv/bin/pip" install --upgrade pip
"$INSTALL_DIR/venv/bin/pip" install hidapi

# 6. Copy files to install directory
echo "Copying application files..."
cp backend.py "$INSTALL_DIR/"
cp index.html "$INSTALL_DIR/"
cp style.css "$INSTALL_DIR/"
cp app.js "$INSTALL_DIR/"

# 7. Copy systemd user service
echo "Configuring systemd user service..."
cp evofox-ghost-air.service "$SYSTEMD_USER_DIR/"

# 8. Install udev rules (requires sudo)
echo "------------------------------------------------------"
echo "Installing udev rules requires administrative privileges."
echo "Please enter your password when prompted."
echo "------------------------------------------------------"

sudo cp 99-evofox-ghost-air.rules /etc/udev/rules.d/
echo "Reloading udev rules..."
sudo udevadm control --reload-rules
sudo udevadm trigger

# 9. Create Desktop Entry
echo "Creating application shortcut..."
DESKTOP_ENTRY_DIR="$HOME/.local/share/applications"
mkdir -p "$DESKTOP_ENTRY_DIR"
cat << EOF > "$DESKTOP_ENTRY_DIR/evofox-ghost-air.desktop"
[Desktop Entry]
Name=EvoFox Ghost Air Config
Comment=Configuration Dashboard for EvoFox Ghost Air Mouse
Exec=xdg-open http://localhost:18988
Icon=input-mouse
Terminal=false
Type=Application
Categories=Settings;HardwareSettings;
EOF
update-desktop-database "$DESKTOP_ENTRY_DIR" 2>/dev/null || true

# 10. Enable and start systemd user service
echo "Starting background configuration service..."
systemctl --user daemon-reload
systemctl --user enable evofox-ghost-air.service
systemctl --user restart evofox-ghost-air.service

echo "======================================================"
echo "Installation Successful!"
echo "======================================================"
echo "The configuration service is now running in the background."
echo "Open your web browser and navigate to:"
echo ""
echo "    http://localhost:18988"
echo ""
echo "To check the service status, run:"
echo "    systemctl --user status evofox-ghost-air.service"
echo "======================================================"
