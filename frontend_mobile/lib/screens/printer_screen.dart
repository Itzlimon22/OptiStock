import 'package:flutter/material.dart';
import 'package:blue_thermal_printer/blue_thermal_printer.dart';
import 'package:permission_handler/permission_handler.dart';

class PrinterScreen extends StatefulWidget {
  @override
  _PrinterScreenState createState() => _PrinterScreenState();
}

class _PrinterScreenState extends State<PrinterScreen> {
  BlueThermalPrinter bluetooth = BlueThermalPrinter.instance;
  List<BluetoothDevice> _devices = [];
  BluetoothDevice? _selectedDevice;
  bool _connected = false;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _initBluetooth();
  }

  Future<void> _initBluetooth() async {
    // 1. Request Permissions
    await [
      Permission.bluetooth,
      Permission.bluetoothScan,
      Permission.bluetoothConnect,
      Permission.location,
    ].request();

    // 2. Check Connection
    bool? isConnected = await bluetooth.isConnected;
    List<BluetoothDevice> devices = await bluetooth.getBondedDevices();
    setState(() {
      _devices = devices;
      _connected = isConnected ?? false;
    });
  }

  Future<void> _connect() async {
    if (_selectedDevice == null) return;
    setState(() => _loading = true);
    try {
      await bluetooth.connect(_selectedDevice!);
      setState(() => _connected = true);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text("Printer Connected!")));
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text("Connection Failed")));
    }
    setState(() => _loading = false);
  }

  Future<void> _disconnect() async {
    await bluetooth.disconnect();
    setState(() => _connected = false);
  }

  Future<void> _testPrint() async {
    if ((await bluetooth.isConnected) == true) {
      bluetooth.printNewLine();
      bluetooth.printCustom("OptiStock Pro", 3, 1);
      bluetooth.printNewLine();
      bluetooth.printCustom("TEST PRINT SUCCESS", 1, 1);
      bluetooth.printNewLine();
      bluetooth.printNewLine();
      bluetooth.paperCut();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text("Printer Setup")),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Row(
              children: [
                Icon(
                  Icons.print,
                  size: 80,
                  color: _connected ? Colors.green : Colors.grey,
                ),
                SizedBox(width: 20),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "Status: ${_connected ? "Connected" : "Disconnected"}",
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                      SizedBox(height: 5),
                      Text(
                        _connected
                            ? "Ready to print receipts."
                            : "Select a device to connect.",
                      ),
                    ],
                  ),
                ),
              ],
            ),
            SizedBox(height: 30),
            DropdownButtonFormField<BluetoothDevice>(
              decoration: InputDecoration(
                border: OutlineInputBorder(),
                labelText: "Select Printer",
              ),
              items: _devices
                  .map(
                    (d) =>
                        DropdownMenuItem(child: Text(d.name ?? ""), value: d),
                  )
                  .toList(),
              onChanged: (device) => setState(() => _selectedDevice = device),
              value: _selectedDevice,
            ),
            SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: _connected ? _disconnect : _connect,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _connected ? Colors.red : Colors.indigo,
                      foregroundColor: Colors.white,
                    ),
                    child: _loading
                        ? SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              color: Colors.white,
                            ),
                          )
                        : Text(_connected ? "Disconnect" : "Connect"),
                  ),
                ),
                SizedBox(width: 10),
                if (_connected)
                  ElevatedButton(
                    onPressed: _testPrint,
                    child: Text("Test Print"),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
