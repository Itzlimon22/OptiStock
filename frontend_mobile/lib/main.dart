import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart'; // For web detection
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile_scanner/mobile_scanner.dart'; // The Camera Scanner

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        textTheme: GoogleFonts.interTextTheme(),
      ),
      home: const DashboardPage(),
    );
  }
}

class DashboardPage extends StatefulWidget {
  const DashboardPage({super.key});

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  final TextEditingController _idController = TextEditingController();
  Map<String, dynamic>? _customerData;
  bool _loading = false;

  // Smart URL Selection
  // If Web: localhost. If Android Emulator: 10.0.2.2.
  final String apiUrl = kIsWeb
      ? "http://127.0.0.1:8000/analytics/segment"
      : "http://10.0.2.2:8000/analytics/segment";

  // --- LOGIC: Fetch Data ---
  Future<void> _fetchCustomer(String id) async {
    if (id.isEmpty) return;
    setState(() {
      _loading = true;
      _customerData = null;
    });

    try {
      final response = await http.get(Uri.parse('$apiUrl/$id'));
      if (response.statusCode == 200) {
        setState(() => _customerData = jsonDecode(response.body));
      } else {
        _showSnack("Customer ID $id not found.", Colors.red);
      }
    } catch (e) {
      _showSnack("Connection Error. Is Backend running?", Colors.red);
    }
    setState(() => _loading = false);
  }

  // --- LOGIC: Mock Notification ---
  void _checkStockAlerts() {
    // Simulating a Push Notification
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.warning, color: Colors.orange),
            SizedBox(width: 10),
            Text("Stock Alert"),
          ],
        ),
        content: const Text(
          "⚠️ Milk Inventory Low!\n\nAI Prediction: 50 sales expected tomorrow.\nRestock recommended immediately.",
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text("Acknowledge"),
          ),
        ],
      ),
    );
  }

  void _showSnack(String msg, Color color) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(msg), backgroundColor: color));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: const Text("Store Manager"),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_active, color: Colors.orange),
            onPressed: _checkStockAlerts, // Triggers Mock Notification
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // --- SECTION 1: SCANNER CONTROLS ---
            Card(
              elevation: 2,
              color: Colors.white,
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    const Text(
                      "Identify Customer",
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 15),

                    // Manual Entry
                    TextField(
                      controller: _idController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: "Enter ID Manually",
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.keyboard),
                      ),
                    ),
                    const SizedBox(height: 15),

                    Row(
                      children: [
                        // Manual Button
                        Expanded(
                          child: FilledButton.icon(
                            onPressed: () => _fetchCustomer(_idController.text),
                            icon: const Icon(Icons.search),
                            label: const Text("Lookup"),
                          ),
                        ),
                        const SizedBox(width: 10),

                        // Scanner Button (Opens Camera Page)
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => ScannerScreen(
                                    onScan: (code) {
                                      Navigator.pop(context); // Close camera
                                      _idController.text =
                                          code; // Fill text box
                                      _fetchCustomer(code); // Auto-fetch
                                    },
                                  ),
                                ),
                              );
                            },
                            icon: const Icon(Icons.qr_code_scanner),
                            label: const Text("Scan QR"),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 20),
            if (_loading) const Center(child: CircularProgressIndicator()),

            // --- SECTION 2: RESULTS CARD ---
            if (_customerData != null) _buildVipCard(),
          ],
        ),
      ),
    );
  }

  Widget _buildVipCard() {
    final segment = _customerData!['segment'];
    final isVip = segment == "VIP";
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isVip
              ? [Colors.indigo, Colors.purple]
              : [Colors.blue, Colors.blueAccent],
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black26,
            blurRadius: 10,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Column(
        children: [
          Icon(
            isVip ? Icons.diamond : Icons.person,
            size: 60,
            color: Colors.white,
          ),
          const SizedBox(height: 10),
          Text(
            segment.toUpperCase(),
            style: const TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.bold,
              color: Colors.white,
              letterSpacing: 2,
            ),
          ),
          const SizedBox(height: 10),
          if (isVip)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.amber,
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Text(
                "OFFER 10% DISCOUNT",
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: Colors.black,
                ),
              ),
            ),
          const Divider(color: Colors.white24, height: 30),
          Text(
            "Lifetime Spend: \$${_customerData!['monetary'].toStringAsFixed(2)}",
            style: const TextStyle(color: Colors.white70),
          ),
        ],
      ),
    );
  }
}

// --- SCANNER SCREEN (Separate Page) ---
class ScannerScreen extends StatelessWidget {
  final Function(String) onScan;
  const ScannerScreen({super.key, required this.onScan});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Scan Customer QR")),
      body: MobileScanner(
        onDetect: (capture) {
          final List<Barcode> barcodes = capture.barcodes;
          for (final barcode in barcodes) {
            if (barcode.rawValue != null) {
              onScan(barcode.rawValue!); // Send data back
              break;
            }
          }
        },
      ),
    );
  }
}
