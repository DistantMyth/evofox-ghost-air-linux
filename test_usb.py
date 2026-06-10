import time
import sys
try:
    import hidraw as hid
except ImportError:
    import hid

VID = 0x04D9
PID = 0xA09E

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
print(f"Cmd Path: {cmd_path}")
print(f"Data Path: {data_path}")

try:
    h_cmd = hid.device()
    h_cmd.open_path(cmd_path)
    print("Opened cmd interface.")
    # Try sending just the command report for BLOCK_4
    h_cmd.send_feature_report([0x01, 0xAA, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00])
    print("Sent cmd report.")
    h_cmd.close()
except Exception as e:
    print(f"Error: {e}")

