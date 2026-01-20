import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:google_fonts/google_fonts.dart';

// --- CONFIGURATION ---
// REPLACE with your Render URL
const String API_URL = "https://optistock-u4ix.onrender.com";

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'OptiStock Pro',
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF4F46E5), // Indigo Professional
          brightness: Brightness.light,
        ),
        textTheme: GoogleFonts.interTextTheme(),
        scaffoldBackgroundColor: const Color(0xFFF8FAFC), // Slate-50
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

  final List<Widget> _screens = [const ScannerPage(), const InventoryPage()];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(child: _screens[_selectedIndex]),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (idx) => setState(() => _selectedIndex = idx),
        backgroundColor: Colors.white,
        elevation: 2,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.qr_code_scanner_rounded),
            label: 'Customer Scan',
          ),
          NavigationDestination(
            icon: Icon(Icons.inventory_2_rounded),
            label: 'Inventory',
          ),
        ],
      ),
    );
  }
}

// --- TAB 1: CUSTOMER SCANNER (VIP CHECK) ---
class ScannerPage extends StatefulWidget {
  const ScannerPage({super.key});
  @override
  State<ScannerPage> createState() => _ScannerPageState();
}

class _ScannerPageState extends State<ScannerPage> {
  final TextEditingController _controller = TextEditingController();
  Map<String, dynamic>? _data;
  bool _loading = false;
  String? _error;

  Future<void> _fetchCustomer() async {
    if (_controller.text.isEmpty) return;

    setState(() {
      _loading = true;
      _data = null;
      _error = null;
    });
    try {
      // The new data has IDs 1-5000.
      final res = await http.get(
        Uri.parse('$API_URL/analytics/segment/${_controller.text}'),
      );

      if (res.statusCode == 200) {
        setState(() => _data = jsonDecode(res.body));
      } else {
        setState(() => _error = "Customer not found");
      }
    } catch (e) {
      setState(() => _error = "Connection Failed");
    }
    setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            "Customer Lookup",
            style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          const Text(
            "Enter Customer ID (1-5000) to check VIP status",
            style: TextStyle(color: Colors.grey),
          ),
          const SizedBox(height: 24),

          TextField(
            controller: _controller,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(
              hintText: "e.g. 1042",
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              suffixIcon: IconButton(
                onPressed: _fetchCustomer,
                icon: const Icon(Icons.search),
              ),
              filled: true,
              fillColor: Colors.white,
            ),
            onSubmitted: (_) => _fetchCustomer(),
          ),

          const SizedBox(height: 32),

          if (_loading)
            const Center(child: CircularProgressIndicator())
          else if (_error != null)
            Center(
              child: Text(_error!, style: const TextStyle(color: Colors.red)),
            )
          else if (_data != null)
            _buildResultCard(),
        ],
      ),
    );
  }

  Widget _buildResultCard() {
    final isVip = _data!['segment'] == 'VIP';
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isVip
              ? [
                  const Color(0xFFFFD700),
                  const Color(0xFFFFA500),
                ] // Gold for VIP
              : [
                  const Color(0xFFE2E8F0),
                  const Color(0xFFCBD5E1),
                ], // Grey for Regular
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Column(
        children: [
          Icon(
            isVip ? Icons.star_rounded : Icons.person,
            size: 48,
            color: isVip ? Colors.white : Colors.black54,
          ),
          const SizedBox(height: 16),
          Text(
            _data!['segment'],
            style: TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.w900,
              color: isVip ? Colors.white : Colors.black87,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            "Lifetime Spend: \$${_data!['monetary'].toStringAsFixed(2)}",
            style: TextStyle(
              fontSize: 18,
              color: isVip ? Colors.white.withOpacity(0.9) : Colors.black54,
            ),
          ),
        ],
      ),
    );
  }
}

// --- TAB 2: INVENTORY SEARCH (NEW!) ---
class InventoryPage extends StatefulWidget {
  const InventoryPage({super.key});
  @override
  State<InventoryPage> createState() => _InventoryPageState();
}

class _InventoryPageState extends State<InventoryPage> {
  List<dynamic> _allProducts = [];
  List<dynamic> _filteredProducts = [];
  bool _loading = true;
  final TextEditingController _searchCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadProducts();
  }

  Future<void> _loadProducts() async {
    try {
      final res = await http.get(Uri.parse('$API_URL/products'));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as List;
        setState(() {
          _allProducts = data;
          _filteredProducts = data; // Initially show all
          _loading = false;
        });
      }
    } catch (e) {
      print(e);
      setState(() => _loading = false);
    }
  }

  void _filterList(String query) {
    setState(() {
      if (query.isEmpty) {
        _filteredProducts = _allProducts;
      } else {
        _filteredProducts = _allProducts
            .where(
              (p) =>
                  p['name'].toString().toLowerCase().contains(
                    query.toLowerCase(),
                  ) ||
                  p['category'].toString().toLowerCase().contains(
                    query.toLowerCase(),
                  ),
            )
            .toList();
      }
    });
  }

  Future<void> _updateStock(int id, int currentStock) async {
    final TextEditingController qtyCtrl = TextEditingController(
      text: currentStock.toString(),
    );
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Adjust Stock"),
        content: TextField(
          controller: qtyCtrl,
          keyboardType: TextInputType.number,
          autofocus: true,
          decoration: const InputDecoration(
            labelText: "New Quantity",
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text("Cancel"),
          ),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final newVal = int.tryParse(qtyCtrl.text);
              if (newVal != null) {
                await http.put(
                  Uri.parse('$API_URL/products/$id/stock'),
                  headers: {"Content-Type": "application/json"},
                  body: jsonEncode({"quantity": newVal}),
                );
                _loadProducts(); // Refresh data to confirm sync
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
    return Column(
      children: [
        // Header & Search Area
        Container(
          padding: const EdgeInsets.all(16),
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(bottom: BorderSide(color: Colors.black12)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                "Store Inventory",
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _searchCtrl,
                onChanged: _filterList,
                decoration: InputDecoration(
                  hintText: "Search items...",
                  prefixIcon: const Icon(Icons.search),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                  filled: true,
                  fillColor: Colors.grey[100],
                  contentPadding: const EdgeInsets.symmetric(vertical: 0),
                ),
              ),
            ],
          ),
        ),

        // Product List
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _filteredProducts.isEmpty
              ? const Center(child: Text("No items found"))
              : ListView.builder(
                  padding: const EdgeInsets.all(8),
                  itemCount: _filteredProducts.length,
                  itemBuilder: (ctx, i) {
                    final p = _filteredProducts[i];
                    return Card(
                      elevation: 0,
                      color: Colors.white,
                      margin: const EdgeInsets.only(bottom: 8),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: const BorderSide(color: Color(0xFFF1F5F9)),
                      ),
                      child: ListTile(
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 8,
                        ),
                        title: Text(
                          p['name'],
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 15,
                          ),
                        ),
                        subtitle: Padding(
                          padding: const EdgeInsets.only(top: 6),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 6,
                                  vertical: 2,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.blue[50],
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  p['category'] ?? "General",
                                  style: TextStyle(
                                    fontSize: 10,
                                    color: Colors.blue[800],
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                "\$${p['base_price']}",
                                style: const TextStyle(color: Colors.grey),
                              ),
                            ],
                          ),
                        ),
                        trailing: InkWell(
                          onTap: () => _updateStock(p['id'], p['stock']),
                          child: Container(
                            width: 50,
                            height: 40,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: (p['stock'] < 10)
                                  ? Colors.red[50]
                                  : Colors.green[50],
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: (p['stock'] < 10)
                                    ? Colors.red[200]!
                                    : Colors.green[200]!,
                              ),
                            ),
                            child: Text(
                              "${p['stock']}",
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: (p['stock'] < 10)
                                    ? Colors.red[700]
                                    : Colors.green[700],
                              ),
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }
}
