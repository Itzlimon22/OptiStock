import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../services/api_service.dart';
import 'package:blue_thermal_printer/blue_thermal_printer.dart'; // Printer Library
import 'printer_screen.dart'; // Printer Setup Screen

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

  // 1. Fetch Inventory from Render Backend
  Future<void> loadProducts() async {
    try {
      final list = await ApiService.getProducts();
      if (mounted) {
        setState(() => products = list);
      }
    } catch (e) {
      print("Error loading products: $e");
    }
  }

  // 2. Add Item to Cart
  void addToCart(int id) {
    setState(() {
      cart[id] = (cart[id] ?? 0) + 1;
    });
  }

  // 3. Calculate Total Price
  double getTotal() {
    double total = 0;
    cart.forEach((id, qty) {
      final product = products.firstWhere((p) => p['id'] == id);
      total += (product['base_price'] * qty);
    });
    return total;
  }

  // 4. Process Sale & Print
  Future<void> checkout() async {
    if (cart.isEmpty) return;
    setState(() => loading = true);

    List<Map<String, dynamic>> items = [];
    double currentTotal = 0;

    // Prepare data for API and Printer
    cart.forEach((id, qty) {
      final product = products.firstWhere((p) => p['id'] == id);
      double price = (product['base_price'] as num).toDouble();
      currentTotal += (price * qty);

      items.add({"product_id": id, "quantity": qty, "price": price});
    });

    try {
      // A. Send to Backend
      await ApiService.processCheckout(items);

      // B. Show Success
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: Colors.green,
          content: Text("✅ Sale Recorded! Printing..."),
          duration: Duration(seconds: 2),
        ),
      );

      // C. Print Receipt (Auto)
      await printReceipt(currentTotal);

      // D. Reset UI
      setState(() {
        cart.clear();
        loading = false;
      });
      loadProducts(); // Refresh stock levels
    } catch (e) {
      setState(() => loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(backgroundColor: Colors.red, content: Text("Checkout Failed")),
      );
    }
  }

  // 5. Receipt Printing Logic
  Future<void> printReceipt(double total) async {
    BlueThermalPrinter bluetooth = BlueThermalPrinter.instance;

    // Check if connected
    if ((await bluetooth.isConnected) == true) {
      // Header
      bluetooth.printCustom("OptiStock Pro", 3, 1); // Size 3, Center
      bluetooth.printCustom("Sales Receipt", 1, 1); // Size 1, Center
      bluetooth.printNewLine();

      // Items
      for (var id in cart.keys) {
        final p = products.firstWhere((prod) => prod['id'] == id);
        int qty = cart[id]!;
        double price = (p['base_price'] as num).toDouble();

        String line = "${p['name']} (x$qty)";
        String priceLine = "\$${(price * qty).toStringAsFixed(2)}";

        // Print: "Item Name (x2) ............ $10.00"
        bluetooth.printLeftRight(line, priceLine, 1);
      }

      // Footer
      bluetooth.printNewLine();
      bluetooth.printCustom("----------------", 1, 1);
      bluetooth.printCustom("TOTAL: \$${total.toStringAsFixed(2)}", 2, 1);
      bluetooth.printNewLine();
      bluetooth.printCustom("Thank You!", 1, 1);
      bluetooth.printNewLine();
      bluetooth.printNewLine();
      bluetooth.paperCut(); // Feed and Cut
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
            tooltip: "Connect Printer",
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => PrinterScreen()),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // Product List
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
                            fontSize: 16,
                          ),
                        ),
                      SizedBox(width: 10),
                      IconButton(
                        icon: Icon(
                          LucideIcons.plusCircle,
                          color: Colors.indigo,
                          size: 28,
                        ),
                        onPressed: () => addToCart(p['id']),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),

          // Checkout Bar
          Container(
            padding: EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.indigo.shade50,
              boxShadow: [
                BoxShadow(
                  color: Colors.black12,
                  blurRadius: 5,
                  offset: Offset(0, -2),
                ),
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "Total",
                      style: TextStyle(fontSize: 14, color: Colors.indigo),
                    ),
                    Text(
                      "\$${getTotal().toStringAsFixed(2)}",
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Colors.indigo[900],
                      ),
                    ),
                  ],
                ),
                ElevatedButton(
                  onPressed: loading ? null : checkout,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.indigo,
                    padding: EdgeInsets.symmetric(horizontal: 32, vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: loading
                      ? SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : Text(
                          "CHARGE",
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
