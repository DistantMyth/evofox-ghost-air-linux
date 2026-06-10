import time
import sys
try:
    import hidraw as hid
except ImportError:
    import hid

from backend import DEFAULT_BLOCK_4, DEFAULT_BLOCK_5, VID, PID

def find_devices():
    cmd_path = None
    data_path = None
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
    
    # Write Block 4
    h_cmd.send_feature_report([0x01, 0xAA, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00])
    time.sleep(0.02)
    # Use 0x00 as Report ID because the descriptor has no Report IDs for interface 0
    h_data.send_feature_report([0x00] + DEFAULT_BLOCK_4)
    time.sleep(0.02)
    
    # Write Block 5
    h_cmd.send_feature_report([0x01, 0xAA, 0x00, 0x00, 0x00, 0x05, 0x00, 0x00])
    time.sleep(0.02)
    h_data.send_feature_report([0x00] + DEFAULT_BLOCK_5)
    time.sleep(0.02)
    
    print("Success")
except Exception as e:
    print(f"Error: {e}")
finally:
    h_cmd.close()
    h_data.close()

