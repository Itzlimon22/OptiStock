import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

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
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.teal,
        ), // New Professional Color
        textTheme: GoogleFonts.interTextTheme(),
      ),
      home: const MainScreen(),
    );
  }
}

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});
  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _selectedIndex = 0;

  // SCREENS
  final List<Widget> _screens = [const ScannerPage(), const InventoryPage()];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _screens[_selectedIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (idx) => setState(() => _selectedIndex = idx),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.qr_code_scanner),
            label: 'Scanner',
          ),
          NavigationDestination(
            icon: Icon(Icons.inventory_2),
            label: 'Inventory',
          ),
        ],
      ),
    );
  }
}

// --- SCREEN 1: SCANNER (Kept similar to before) ---
class ScannerPage extends StatefulWidget {
  const ScannerPage({super.key});
  @override
  State<ScannerPage> createState() => _ScannerPageState();
}

class _ScannerPageState extends State<ScannerPage> {
  // USE YOUR RENDER URL HERE
  final String apiUrl = "https://optistock-u4ix.onrender.com/analytics/segment";
  Map<String, dynamic>? _data;
  bool _loading = false;

  Future<void> _fetch(String id) async {
    setState(() {
      _loading = true;
      _data = null;
    });
    try {
      final res = await http.get(Uri.parse('$apiUrl/$id'));
      if (res.statusCode == 200) setState(() => _data = jsonDecode(res.body));
    } catch (e) {
      print(e);
    }
    setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("VIP Scanner")),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            TextField(
              decoration: const InputDecoration(
                labelText: "Enter Customer ID",
                border: OutlineInputBorder(),
              ),
              onSubmitted: _fetch,
            ),
            const SizedBox(height: 20),
            if (_loading) const CircularProgressIndicator(),
            if (_data != null)
              Card(
                color: _data!['segment'] == 'VIP'
                    ? Colors.amber[100]
                    : Colors.blue[50],
                child: ListTile(
                  title: Text(
                    _data!['segment'],
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 24,
                    ),
                  ),
                  subtitle: Text(
                    "Spend: \$${_data!['monetary'].toStringAsFixed(2)}",
                  ),
                  leading: Icon(
                    _data!['segment'] == 'VIP' ? Icons.star : Icons.person,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// --- SCREEN 2: INVENTORY LIST (New Feature!) ---
class InventoryPage extends StatefulWidget {
  const InventoryPage({super.key});
  @override
  State<InventoryPage> createState() => _InventoryPageState();
}

class _InventoryPageState extends State<InventoryPage> {
  // USE YOUR RENDER URL HERE
  final String baseUrl = "https://optistock-u4ix.onrender.com";
  List<dynamic> _products = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadProducts();
  }

  Future<void> _loadProducts() async {
    try {
      final res = await http.get(Uri.parse('$baseUrl/products'));
      if (res.statusCode == 200) {
        setState(() => _products = jsonDecode(res.body));
      }
    } catch (e) {
      print(e);
    }
    setState(() => _loading = false);
  }

  Future<void> _updateStock(int id, int currentStock) async {
    final TextEditingController _ctrl = TextEditingController(
      text: currentStock.toString(),
    );

    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Update Stock"),
        content: TextField(
          controller: _ctrl,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: "New Quantity"),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text("Cancel"),
          ),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final newVal = int.tryParse(_ctrl.text);
              if (newVal != null) {
                // API Call to Update
                await http.put(
                  Uri.parse('$baseUrl/products/$id/stock'),
                  headers: {"Content-Type": "application/json"},
                  body: jsonEncode({"quantity": newVal}),
                );
                _loadProducts(); // Refresh list
              }
            },
            child: const Text("Save"),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Store Inventory")),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView.builder(
              itemCount: _products.length,
              itemBuilder: (ctx, i) {
                final p = _products[i];
                return Card(
                  margin: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 5,
                  ),
                  child: ListTile(
                    leading: CircleAvatar(child: Text(p['id'].toString())),
                    title: Text(
                      p['name'] ?? "Product ${p['id']}",
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    subtitle: Text("Price: \$${p['base_price']}"),
                    trailing: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.teal[100],
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        "Stock: ${p['stock']}",
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                    onTap: () => _updateStock(p['id'], p['stock'] ?? 0),
                  ),
                );
              },
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: _loadProducts,
        child: const Icon(Icons.refresh),
      ),
    );
  }
}
