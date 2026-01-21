import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../services/api_service.dart';

class DashboardScreen extends StatefulWidget {
  @override
  _DashboardScreenState createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Map<String, dynamic>? stats;
  bool loading = true;

  @override
  void initState() {
    super.initState();
    loadStats();
  }

  Future<void> loadStats() async {
    try {
      final data = await ApiService.getDashboardStats();
      setState(() {
        stats = data;
        loading = false;
      });
    } catch (e) {
      setState(() => loading = false);
      print(e);
    }
  }

  Future<void> triggerWatchdog() async {
    try {
      final res = await ApiService.runWatchdog();
      String message = res['message'];

      // If critical, show the list of items
      if (res['status'] == 'Critical') {
        List<dynamic> alerts = res['alerts'];
        message += "\n\n" + alerts.join("\n");
      }

      showDialog(
        context: context,
        builder: (_) => AlertDialog(
          title: Text(
            res['status'] == 'Critical'
                ? '🚨 Low Stock Alert'
                : '✅ Status Clear',
          ),
          content: Text(message),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text("OK"),
            ),
          ],
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Connection Failed: Check Backend")),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (loading) return Center(child: CircularProgressIndicator());
    if (stats == null) return Center(child: Text("Failed to load data"));

    final currency = NumberFormat.simpleCurrency();
    final todayRevenue = stats!['today_revenue'] ?? 0;
    final topProduct = (stats!['top_products'] as List).isNotEmpty
        ? stats!['top_products'][0]['name']
        : "N/A";

    return Scaffold(
      appBar: AppBar(
        title: Text("OptiStock Pro"),
        actions: [
          IconButton(
            icon: Icon(LucideIcons.bell, color: Colors.redAccent),
            onPressed: triggerWatchdog,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // KPI Cards
            Row(
              children: [
                Expanded(
                  child: _buildCard(
                    "Revenue",
                    currency.format(todayRevenue),
                    Colors.green,
                  ),
                ),
                SizedBox(width: 10),
                Expanded(
                  child: _buildCard("Top Seller", topProduct, Colors.blue),
                ),
              ],
            ),
            SizedBox(height: 20),

            // Chart Section
            Text(
              "Sales Trend (7 Days)",
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 10),
            Container(
              height: 200,
              padding: EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
              ),
              child: LineChart(
                LineChartData(
                  gridData: FlGridData(show: false),
                  titlesData: FlTitlesData(show: false),
                  borderData: FlBorderData(show: false),
                  lineBarsData: [
                    LineChartBarData(
                      spots: _getChartPoints(),
                      isCurved: true,
                      color: Colors.indigo,
                      barWidth: 4,
                      dotData: FlDotData(show: false),
                      belowBarData: BarAreaData(
                        show: true,
                        color: Colors.indigo.withOpacity(0.1),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  List<FlSpot> _getChartPoints() {
    List<dynamic> trend = stats!['revenue_trend'] ?? [];
    List<FlSpot> points = [];
    for (int i = 0; i < trend.length; i++) {
      points.add(FlSpot(i.toDouble(), (trend[i]['revenue'] as num).toDouble()));
    }
    return points.isNotEmpty ? points : [FlSpot(0, 0)];
  }

  Widget _buildCard(String title, String value, Color color) {
    return Container(
      padding: EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(color: color, fontWeight: FontWeight.bold),
          ),
          SizedBox(height: 5),
          Text(
            value,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
