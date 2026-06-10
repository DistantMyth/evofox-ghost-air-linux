import time
import sys
try:
    import hidraw as hid
except ImportError:
    import hid

from backend import DEFAULT_BLOCK_4, DEFAULT_BLOCK_5, VID, PID

def find_devices():
    cmd_path, data_path = None, None
    for dev in hid.enumerate():
        if dev['vendor_id'] == VID and dev['product_id'] == PID:
            if dev['interface_number'] == 0:
                data_path = dev['path']
            elif dev['interface_number'] == 1:
                cmd_path = dev['path']
    return cmd_path, data_path

cmd_path, data_path = find_devices()

try:
    h_cmd = hid.device()
    h_cmd.open_path(cmd_path)
    h_data = hid.device()
    h_data.open_path(data_path)
    
    b4 = list(DEFAULT_BLOCK_4)
    # Buttons start at byte 32. 
    # Left=0, Right=1, Middle=2, Forward=3, Backward=4
    
    # Set Middle (index 2) to "v" (0x19) with Group 5
    b4[32 + 2*2] = 0x19
    b4[32 + 2*2 + 1] = 0x05
    
    # Set Forward (index 3) to "v" (0x19) with Group 6
    b4[32 + 2*3] = 0x19
    b4[32 + 2*3 + 1] = 0x06
    
    # Set Backward (index 4) to "v" (0x19) with Group 7
    b4[32 + 2*4] = 0x19
    b4[32 + 2*4 + 1] = 0x07
    
    # Write Block 4
    h_cmd.send_feature_report([0x01, 0xAA, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00])
    time.sleep(0.02)
    h_data.send_feature_report([0x00] + b4)
    time.sleep(0.02)
    
    print("Mouse flashed with test groups!")
except Exception as e:
    print(f"Error: {e}")
finally:
    h_cmd.close()
    h_data.close()
