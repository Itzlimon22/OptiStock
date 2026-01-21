import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../services/api_service.dart';

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
    cart.forEach((id, qty) {
      final product = products.firstWhere((p) => p['id'] == id);
      items.add({
        "product_id": id,
        "quantity": qty,
        "price": product['base_price'],
      });
    });

    try {
      await ApiService.processCheckout(items);
      setState(() {
        cart.clear();
        loading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: Colors.green,
          content: Text("✅ Sale Recorded!"),
        ),
      );
      loadProducts(); // Refresh stock
    } catch (e) {
      setState(() => loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(backgroundColor: Colors.red, content: Text("Checkout Failed")),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text("Mobile POS")),
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
                      ? CircularProgressIndicator(color: Colors.white)
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
