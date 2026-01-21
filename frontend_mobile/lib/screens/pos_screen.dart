import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../services/api_service.dart';
import 'package:blue_thermal_printer/blue_thermal_printer.dart'; // <--- Added
import 'printer_screen.dart'; // <--- Added

class POSScreen extends StatefulWidget {
  @override
  _POSScreenState createState() => _POSScreenState();
}

class _POSScreenState extends State<POSScreen> {
  List<dynamic> products = [];
  Map<int, int> cart = {}; // ProductID -> Quantity
  bool loading = false;

  @override
  void initState() {
    super.initState();
    loadProducts();
  }

  Future<void> loadProducts() async {
    try {
      final list = await ApiService.getProducts();
      setState(() => products = list);
    } catch (e) {
      print(e);
    }
  }

  void addToCart(int id) {
    setState(() {
      cart[id] = (cart[id] ?? 0) + 1;
    });
  }

  double getTotal() {
    double total = 0;
    cart.forEach((id, qty) {
      final product = products.firstWhere((p) => p['id'] == id);
      total += (product['base_price'] * qty);
    });
    return total;
  }

  Future<void> checkout() async {
    if (cart.isEmpty) return;
    setState(() => loading = true);

    List<Map<String, dynamic>> items = [];
    double currentTotal = 0; // Calculate total for receipt

    cart.forEach((id, qty) {
      final product = products.firstWhere((p) => p['id'] == id);
      double price = (product['base_price'] as num).toDouble();
      currentTotal += (price * qty);

      items.add({"product_id": id, "quantity": qty, "price": price});
    });

    try {
      await ApiService.processCheckout(items);

      // 1. Show Success Message
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: Colors.green,
          content: Text("✅ Sale Recorded! Printing Receipt..."),
        ),
      );

      // 2. Print Receipt Automatically
      await printReceipt(currentTotal);

      // 3. Reset Cart
      setState(() {
        cart.clear();
        loading = false;
      });
      loadProducts(); // Refresh stock
    } catch (e) {
      setState(() => loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(backgroundColor: Colors.red, content: Text("Checkout Failed")),
      );
    }
  }

  // --- PRINTING LOGIC ---
  Future<void> printReceipt(double total) async {
    BlueThermalPrinter bluetooth = BlueThermalPrinter.instance;
    // Only print if connected
    if ((await bluetooth.isConnected) == true) {
      // Header
      bluetooth.printCustom("OptiStock Pro", 3, 1); // Size 3, Center
      bluetooth.printCustom("Sales Receipt", 1, 1);
      bluetooth.printNewLine();

      // Items
      for (var id in cart.keys) {
        final p = products.firstWhere((prod) => prod['id'] == id);
        int qty = cart[id]!;
        double price = (p['base_price'] as num).toDouble();

        String line = "${p['name']} (x$qty)";
        String priceLine = "\$${(price * qty).toStringAsFixed(2)}";

        bluetooth.printLeftRight(
          line,
          priceLine,
          1,
        ); // Left aligned item, Right aligned price
      }

      // Footer
      bluetooth.printNewLine();
      bluetooth.printCustom("----------------", 1, 1);
      bluetooth.printCustom("TOTAL: \$${total.toStringAsFixed(2)}", 2, 1);
      bluetooth.printNewLine();
      bluetooth.printCustom("Thank You!", 1, 1);
      bluetooth.printNewLine();
      bluetooth.printNewLine();
      bluetooth.paperCut(); // Cut paper if printer supports it
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text("Mobile POS"),
        actions: [
          // PRINTER SETUP BUTTON
          IconButton(
            icon: Icon(LucideIcons.printer),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => PrinterScreen()),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              itemCount: products.length,
              itemBuilder: (ctx, i) {
                final p = products[i];
                final qtyInCart = cart[p['id']] ?? 0;
                return ListTile(
                  title: Text(p['name']),
                  subtitle: Text("Stock: ${p['stock']} | \$${p['base_price']}"),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (qtyInCart > 0)
                        Text(
                          "x$qtyInCart",
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.indigo,
                          ),
                        ),
                      SizedBox(width: 10),
                      IconButton(
                        icon: Icon(
                          LucideIcons.plusCircle,
                          color: Colors.indigo,
                        ),
                        onPressed: () => addToCart(p['id']),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
          Container(
            padding: EdgeInsets.all(20),
            color: Colors.indigo.shade50,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  "Total: \$${getTotal().toStringAsFixed(2)}",
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                ElevatedButton(
                  onPressed: loading ? null : checkout,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.indigo,
                  ),
                  child: loading
                      ? SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : Text("CHARGE", style: TextStyle(color: Colors.white)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
