import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  // 🔴 IMPORTANT: Replace this with your actual Render URL
  static const String baseUrl = "https://optistock-u4ix.onrender.com";

  // 1. Fetch Executive Dashboard Stats
  static Future<Map<String, dynamic>> getDashboardStats() async {
    final response = await http.get(Uri.parse('$baseUrl/analytics/dashboard'));
    if (response.statusCode == 200) {
      return json.decode(response.body);
    } else {
      throw Exception('Failed to load stats');
    }
  }

  // 2. Fetch Products (Inventory)
  static Future<List<dynamic>> getProducts() async {
    final response = await http.get(Uri.parse('$baseUrl/products'));
    if (response.statusCode == 200) {
      return json.decode(response.body);
    } else {
      throw Exception('Failed to load products');
    }
  }

  // 3. Process POS Checkout
  static Future<void> processCheckout(List<Map<String, dynamic>> items) async {
    final response = await http.post(
      Uri.parse('$baseUrl/pos/checkout'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({'items': items}),
    );
    if (response.statusCode != 200) {
      throw Exception('Checkout Failed');
    }
  }

  // 4. Trigger Watchdog
  static Future<Map<String, dynamic>> runWatchdog() async {
    final response = await http.post(Uri.parse('$baseUrl/admin/run-watchdog'));
    if (response.statusCode == 200) {
      return json.decode(response.body);
    } else {
      throw Exception('Watchdog failed');
    }
  }
}
