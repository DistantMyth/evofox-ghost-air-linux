import os
import sys
import json
import time
import http.server
import socketserver
import urllib.parse
try:
    import hidraw as hid
except ImportError:
    import hid

VID = 0x04D9
PID = 0xA09E

# Default block configurations from Data.ini
DEFAULT_BLOCK_4 = [
    0xd0, 0x02, 0x0a, 0x0a, 0x19, 0x19, 0x07, 0x02, 0xfa, 0x03, 0x02, 0x03, 0x02, 0x3c, 0x09, 0x09,
    0x0a, 0xe2, 0x19, 0x19, 0x01, 0x1e, 0x0f, 0x01, 0x13, 0x1a, 0x20, 0x27, 0x2e, 0x34, 0x3f, 0x22,
    0xf0, 0x00, 0xf1, 0x00, 0xf2, 0x00, 0xf4, 0x00, 0xf3, 0x00, 0x03, 0x03, 0x04, 0x03, 0x0a, 0x03,
    0x06, 0x03, 0x00, 0x02, 0x01, 0x02, 0x0a, 0x03, 0x00, 0x00, 0x00, 0x00, 0xe8, 0x00, 0xe9, 0x00
]

DEFAULT_BLOCK_5 = [
    0xff, 0x00, 0x00, 0x00, 0xff, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0xff, 0xff, 0xff,
    0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0x55, 0x00, 0xff, 0x00, 0x00, 0x00, 0xff, 0x00, 0x00, 0x00,
    0xff, 0xff, 0x55, 0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0xff, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00,
    0x06, 0xe0, 0x19, 0xe0, 0x1b, 0xe0, 0x07, 0xe3, 0x08, 0xe3, 0x09, 0xe3, 0x3d, 0xe2, 0x00, 0x00
]

CONFIG_DIR = os.path.expanduser("~/.config")
CONFIG_PATH = os.path.join(CONFIG_DIR, "evofox-ghost-air.json")

def init_default_config():
    default_profile = {
        "pointer_speed": 10,
        "double_click_speed": 10,
        "scroll_speed": 3,
        "polling_rate": 1000,
        "active_stage": 2,
        "stages_count": 8,
        "stages": [
            {"dpi": 1900, "enabled": True},
            {"dpi": 2600, "enabled": True},
            {"dpi": 3200, "enabled": True},
            {"dpi": 3900, "enabled": True},
            {"dpi": 4600, "enabled": True},
            {"dpi": 5200, "enabled": True},
            {"dpi": 6300, "enabled": True},
            {"dpi": 3400, "enabled": True}
        ],
        "buttons": [
            {"action": "click", "group": 0, "value": 0xf0},             # 1 Left
            {"action": "menu", "group": 0, "value": 0xf1},              # 2 Right
            {"action": "scroll", "group": 0, "value": 0xf2},            # 3 Middle
            {"action": "forward", "group": 0, "value": 0xf4},           # 4 Forward
            {"action": "backward", "group": 0, "value": 0xf3},          # 5 Backward
            {"action": "dpi_up", "group": 3, "value": 0x03},            # 6 DPI+
            {"action": "dpi_down", "group": 3, "value": 0x04},          # 7 DPI-
            {"action": "juji", "group": 3, "value": 0x0a},              # 8 Sniper
            {"action": "light_mode_switch", "group": 3, "value": 0x06}, # 9 Mode Switch
            {"action": "media_player", "group": 2, "value": 0x00},      # 10 Media Player
            {"action": "play_pause", "group": 2, "value": 0x01},        # 11 Play/Pause
            {"action": "juji", "group": 3, "value": 0x0a},              # 12 Sniper (Alt)
            {"action": "off", "group": 0, "value": 0x00},               # 13 Off
            {"action": "off", "group": 0, "value": 0x00},               # 14 Off
            {"action": "scroll_up", "group": 0, "value": 0xe8},         # 15 Scroll Up
            {"action": "scroll_down", "group": 0, "value": 0xe9}        # 16 Scroll Down
        ],
        "lighting": {
            "mode": 6,
            "speed": 25,       # Value 0x19
            "brightness": 27,  # Value 0x1b
            "colors": [
                [255, 0, 0],       # DPI Stage 1 Color
                [255, 0, 0],       # DPI Stage 2 Color
                [255, 255, 255],   # DPI Stage 3 Color
                [0, 255, 255],     # DPI Stage 4 Color
                [0, 255, 255],     # DPI Stage 5 Color
                [255, 255, 85],    # DPI Stage 6 Color
                [255, 0, 0],       # DPI Stage 7 Color
                [255, 0, 0],       # DPI Stage 8 Color
                [255, 255, 85],    # Color 9
                [0, 255, 255],     # Color 10
                [0, 255, 255],     # Color 11
                [255, 0, 0]        # Color 12
            ]
        }
    }
    
    return {
        "active_profile": "Default",
        "profiles": {
            "Default": default_profile
        }
    }

def read_config():
    if not os.path.exists(CONFIG_PATH):
        try:
            os.makedirs(CONFIG_DIR, exist_ok=True)
            config_data = init_default_config()
            write_config(config_data)
            return config_data
        except Exception as e:
            print(f"Error initializing configuration file: {e}")
            return init_default_config()
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error reading configuration file: {e}")
        return init_default_config()

def write_config(config_data):
    try:
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(config_data, f, indent=4)
        return True
    except Exception as e:
        print(f"Error writing configuration file: {e}")
        return False

def find_mouse_devices():
    cmd_path = None
    data_path = None
    
    for dev in hid.enumerate():
        if dev['vendor_id'] == VID and dev['product_id'] == PID:
            # Interface 1 (Usage Page 1, Usage 6) is command endpoint
            # Interface 0 (Usage Page 1, Usage 2) is data endpoint
            if dev['interface_number'] == 0:
                data_path = dev['path']
            elif dev['interface_number'] == 1:
                cmd_path = dev['path']
                
    return cmd_path, data_path

def apply_profile_to_mouse(profile):
    cmd_path, data_path = find_mouse_devices()
    if not cmd_path or not data_path:
        raise Exception("EvoFox Ghost Air mouse not found or not fully enumerated.")
        
    # Build BLOCK_4
    b4 = list(DEFAULT_BLOCK_4)
    b4[2] = int(profile.get("pointer_speed", 10))
    b4[3] = int(profile.get("double_click_speed", 10))
    b4[6] = int(profile.get("stages_count", 8)) - 1
    b4[7] = int(profile.get("active_stage", 2))
    
    pr = int(profile.get("polling_rate", 1000))
    if pr == 1000:
        b4[23] = 0x01
    elif pr == 500:
        b4[23] = 0x02
    elif pr == 250:
        b4[23] = 0x04
    else:
        b4[23] = 0x08
        
    stages = profile.get("stages", [])
    for i in range(min(8, len(stages))):
        b4[24 + i] = int(stages[i]["dpi"]) // 100
        
    buttons = profile.get("buttons", [])
    for i in range(min(16, len(buttons))):
        b4[32 + 2*i] = int(buttons[i]["value"])
        b4[32 + 2*i + 1] = int(buttons[i]["group"])
        
    # Build BLOCK_5
    b5 = list(DEFAULT_BLOCK_5)
    lighting = profile.get("lighting", {})
    colors = lighting.get("colors", [])
    for i in range(min(12, len(colors))):
        b5[4*i] = int(colors[i][0])
        b5[4*i + 1] = int(colors[i][1])
        b5[4*i + 2] = int(colors[i][2])
        b5[4*i + 3] = 0x00
        
    b5[48] = int(lighting.get("mode", 6))
    b5[50] = int(lighting.get("speed", 25))
    b5[52] = int(lighting.get("brightness", 27))
    
    # Write Block 4
    h_cmd = hid.device()
    h_cmd.open_path(cmd_path)
    h_data = hid.device()
    h_data.open_path(data_path)
    
    try:
        # Write Block 4
        h_cmd.send_feature_report([0x01, 0xAA, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00])
        time.sleep(0.02)
        h_data.send_feature_report([0x00] + b4)
        time.sleep(0.02)
        
        # Write Block 5
        h_cmd.send_feature_report([0x01, 0xAA, 0x00, 0x00, 0x00, 0x05, 0x00, 0x00])
        time.sleep(0.02)
        h_data.send_feature_report([0x00] + b5)
        time.sleep(0.02)
    finally:
        h_cmd.close()
        h_data.close()

class APIServer(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # CORS & Cache headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200, "OK")
        self.end_headers()

    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)
        
        if parsed_path.path == '/api/status':
            cmd_path, data_path = find_mouse_devices()
            connected = (cmd_path is not None) and (data_path is not None)
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"connected": connected}).encode('utf-8'))
            
        elif parsed_path.path == '/api/profiles':
            config_data = read_config()
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(config_data).encode('utf-8'))
            
        else:
            # Fallback to serving static files from current directory
            # Strip leading slash
            local_path = parsed_path.path.lstrip('/')
            if not local_path or local_path == '':
                local_path = 'index.html'
                
            # Basic path validation to prevent directory traversal
            abs_cwd = os.path.abspath(os.getcwd())
            target_path = os.path.abspath(os.path.join(abs_cwd, local_path))
            
            if not target_path.startswith(abs_cwd) or not os.path.exists(target_path):
                self.send_response(404)
                self.end_headers()
                self.wfile.write(b"File not found")
                return
                
            content_type = 'text/html'
            if target_path.endswith('.css'):
                content_type = 'text/css'
            elif target_path.endswith('.js'):
                content_type = 'text/javascript'
            elif target_path.endswith('.png'):
                content_type = 'image/png'
            elif target_path.endswith('.ico'):
                content_type = 'image/x-icon'
                
            self.send_response(200)
            self.send_header('Content-type', content_type)
            self.end_headers()
            with open(target_path, 'rb') as f:
                self.wfile.write(f.read())

    def do_POST(self):
        parsed_path = urllib.parse.urlparse(self.path)
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        if parsed_path.path == '/api/profiles':
            try:
                config_data = json.loads(post_data.decode('utf-8'))
                if write_config(config_data):
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": True}).encode('utf-8'))
                else:
                    self.send_response(500)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": False, "error": "Failed to write config file"}).encode('utf-8'))
            except Exception as e:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))
                
        elif parsed_path.path == '/api/apply':
            try:
                profile_to_apply = json.loads(post_data.decode('utf-8'))
                apply_profile_to_mouse(profile_to_apply)
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

if __name__ == '__main__':
    PORT = 18988
    # Enable socket re-use to avoid 'Address already in use' errors
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), APIServer) as httpd:
        print(f"EvoFox Ghost Air server running on http://localhost:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")
            sys.exit(0)
