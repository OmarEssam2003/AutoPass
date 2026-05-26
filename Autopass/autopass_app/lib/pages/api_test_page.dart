// lib/pages/api_test_page.dart
//
// 🧪 TEMPORARY DEBUG PAGE — delete this file when you're done testing.
//
// This page lets you tap buttons to test every API call without
// needing the real UI. Results show in a scrollable log at the bottom.
//
// USAGE:
//   1. In main.dart, set initialRoute: '/api-test'
//   2. Add to routes: '/api-test': (_) => const ApiTestPage(),
//   3. flutter run -d chrome
//   4. Tap each button, watch the log.

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../services/user_service.dart';
import '../services/ticket_service.dart';
import '../services/payment_service.dart';
import '../services/vehicle_service.dart';
import '../services/rental_service.dart';
import '../services/alert_service.dart';

class ApiTestPage extends StatefulWidget {
  const ApiTestPage({super.key});

  @override
  State<ApiTestPage> createState() => _ApiTestPageState();
}

class _ApiTestPageState extends State<ApiTestPage> {
  final List<String> _log = [];
  final ScrollController _scrollCtrl = ScrollController();

  // ─── 🔧 EDIT THESE TEST VALUES ──────────────────────────────────
  // Use real values you know exist in your backend's database.
  // The // ignore comments silence "unused_field" warnings — these
  // fields are intentional placeholders for you to wire up later.
  final String _testEmail = 'test@example.com';
  final String _testPassword = 'Test@1234';
  final String _testPlateNumber = 'ABC 1234';
  // ignore: unused_field
  final String _testRenterEmail = 'renter@example.com';
  final String _testTicketId = ''; // fill after fetching tickets
  // ignore: unused_field
  final String _testVehicleId = ''; // fill after fetching vehicles
  // ignore: unused_field
  final String _testOwnershipId = ''; // fill after linking
  // ignore: unused_field
  final String _testOtp = '123456';
  // ────────────────────────────────────────────────────────────────

  void _add(String line) {
    setState(() {
      _log.add('${DateTime.now().toString().substring(11, 19)} → $line');
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _run(String name, Future<dynamic> Function() fn) async {
    _add('▶ $name…');
    try {
      final result = await fn();
      _add('✅ $name OK');
      if (result != null) {
        final preview = result.toString();
        _add('   ${preview.length > 200 ? "${preview.substring(0, 200)}…" : preview}');
      }
    } catch (e) {
      _add('❌ $name FAILED: $e');
    }
  }

  // ─── Sanity check ──────────────────────────────────────────────
  Future<void> _ping() async {
    _add('▶ Pinging backend at ${ApiService.dio.options.baseUrl}…');
    try {
      // Try hitting an endpoint that requires auth — we expect 401, NOT a network error.
      // 401 means "I reached the server but I'm not logged in." That's success here.
      await ApiService.dio.get('/users/me');
      _add('✅ Server reachable AND you are logged in');
    } catch (e) {
      final msg = e.toString().toLowerCase();

      // These are all "good" responses — server reachable, just not auth'd.
      final reachableSignals = [
        'session expired',
        '401',
        'access denied',
        'no token provided',
        'unauthorized',
        'invalid token',
      ];
      final isReachable = reachableSignals.any((s) => msg.contains(s));

      if (isReachable) {
        _add('✅ Server reachable (got 401 — expected if not logged in)');
        return;
      }

      if (msg.contains('cannot reach the server') ||
          msg.contains('timeout') ||
          msg.contains('connection')) {
        _add('❌ NETWORK PROBLEM: $e');
        _add('   → Check baseUrl in api_service.dart');
        _add('   → Make sure backend is running');
        _add('   → Make sure phone & PC on same Wi-Fi');
      } else {
        _add('⚠ Got unexpected response: $e');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('🧪 API Test Page'),
        actions: [
          IconButton(
            icon: const Icon(Icons.delete_outline),
            tooltip: 'Clear log',
            onPressed: () => setState(() => _log.clear()),
          ),
        ],
      ),
      body: Column(
        children: [
          // ─── Buttons ────────────────────────────────────────────
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(12),
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _section('🌐 Connection'),
                  _btn('Ping server', _ping),

                  _section('🔐 Auth'),
                  _btn('Login (test user)', () => _run(
                        'Login',
                        () => AuthService.login(
                          email: _testEmail,
                          password: _testPassword,
                        ),
                      )),
                  _btn('Logout', () => _run('Logout', () async {
                        await AuthService.logout();
                        return 'cleared';
                      })),
                  _btn('Register (with image)', _testRegister),

                  _section('👤 Profile'),
                  _btn('Get my profile', () => _run(
                        'Get profile',
                        () => UserService.getMyProfile(),
                      )),

                  _section('🎫 Tickets'),
                  _btn('Get UNPAID tickets', () => _run(
                        'Tickets UNPAID',
                        () => TicketService.getMyTickets(
                          status: TicketStatus.unpaid,
                        ),
                      )),
                  _btn('Get PAID tickets', () => _run(
                        'Tickets PAID',
                        () => TicketService.getMyTickets(
                          status: TicketStatus.paid,
                        ),
                      )),

                  _section('💰 Payments'),
                  _btn('Pay single (needs ticket_id)', () => _run(
                        'Pay ticket',
                        () => PaymentService.payTicket(
                          ticketId: _testTicketId,
                        ),
                      )),
                  _btn('Payment history', () => _run(
                        'Payment history',
                        () => PaymentService.getMyPayments(),
                      )),

                  _section('🚗 Vehicles'),
                  _btn('Get my vehicles', () => _run(
                        'My vehicles',
                        () => VehicleService.getMyVehicles(),
                      )),
                  _btn('Link vehicle (sends OTP)', () => _run(
                        'Link vehicle',
                        () => VehicleService.linkVehicle(
                          plateNumber: _testPlateNumber,
                        ),
                      )),

                  _section('🤝 Rentals'),
                  _btn('My owned rentals', () => _run(
                        'Owned rentals',
                        () => RentalService.getMyOwnedRentals(),
                      )),
                  _btn('My incoming rentals', () => _run(
                        'Incoming rentals',
                        () => RentalService.getMyIncomingRentals(),
                      )),

                  _section('🔔 Alerts'),
                  _btn('Get all alerts', () => _run(
                        'All alerts',
                        () => AlertService.getMyAlerts(),
                      )),
                  _btn('Unread count', () => _run(
                        'Unread count',
                        () => AlertService.getUnreadCount(),
                      )),
                ],
              ),
            ),
          ),

          // ─── Log output ─────────────────────────────────────────
          Container(
            height: 250,
            color: Colors.black,
            padding: const EdgeInsets.all(8),
            child: ListView.builder(
              controller: _scrollCtrl,
              itemCount: _log.length,
              itemBuilder: (_, i) => Text(
                _log[i],
                style: TextStyle(
                  color: _log[i].contains('❌')
                      ? Colors.redAccent
                      : _log[i].contains('✅')
                          ? Colors.greenAccent
                          : _log[i].contains('⚠')
                              ? Colors.amberAccent
                              : Colors.white,
                  fontFamily: 'monospace',
                  fontSize: 12,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _section(String title) => SizedBox(
        width: double.infinity,
        child: Padding(
          padding: const EdgeInsets.only(top: 8, bottom: 4),
          child: Text(
            title,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 14,
            ),
          ),
        ),
      );

  Widget _btn(String label, VoidCallback onTap) => ElevatedButton(
        onPressed: onTap,
        child: Text(label),
      );

  Future<void> _testRegister() async {
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.gallery);
    if (image == null) {
      _add('⚠ Register cancelled — no image picked');
      return;
    }
    await _run(
      'Register',
      () => AuthService.register(
        email: 'newuser${DateTime.now().millisecondsSinceEpoch}@test.com',
        password: 'Test@1234',
        firstName: 'Test',
        middleName: 'M',
        lastName: 'User',
        nationalId: '29901010123456',
        phoneNumber: '+201001234567',
        address: 'Cairo, Egypt',
        dateOfBirth: '1999-01-01',
        nationalIdImage: image,
      ),
    );
  }
}
