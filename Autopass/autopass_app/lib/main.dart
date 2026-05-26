import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart'; // 🆕 ADD THIS LINE
import 'dart:async';
import 'services/user_service.dart'; // 🆕 ADD if missing
import 'services/vehicle_service.dart';

// 🧪 ADDED FOR API TESTING — remove after testing is complete
import 'services/api_service.dart';
import 'services/auth_service.dart'; // 🆕 ADD
// import 'pages/api_test_page.dart'; // removed — testing complete
import 'package:image_picker/image_picker.dart'; // 🆕 ADD

// 🧪 END
import 'services/ticket_service.dart';
import 'services/payment_service.dart';
import 'services/alert_service.dart';
import 'services/rental_service.dart';

void main() async {
  // 🧪 ADDED FOR API TESTING — required for ApiService.init()
  WidgetsFlutterBinding.ensureInitialized();
  await ApiService.init();
  // 🧪 END

  runApp(const AutoPassApp());
}

class AutoPassApp extends StatelessWidget {
  const AutoPassApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AutoPass',
      debugShowCheckedModeBanner: false,
      // 🧪 ADDED FOR API TESTING — lets the API layer redirect on 401
      navigatorKey: ApiService.navigatorKey,
      // 🧪 END
      theme: ThemeData(primarySwatch: Colors.blue, useMaterial3: true),
      // 🧪 ADDED FOR API TESTING — comment out 'home' below and use this instead
      home: const SplashScreen(),
      // 🧪 END
      // home: const SplashScreen(), // 🧪 RESTORE this line when testing is done
    );
  }
}

// ─────────────────────────────────────────
// Validation Helpers
// ─────────────────────────────────────────
class Validators {
  static bool isValidEmail(String email) {
    final emailRegex = RegExp(
      r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
    );
    return emailRegex.hasMatch(email);
  }

  static String? validatePassword(String password) {
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!password.contains(RegExp(r'[A-Z]'))) {
      return 'Must contain uppercase letter (A-Z)';
    }
    if (!password.contains(RegExp(r'[a-z]'))) {
      return 'Must contain lowercase letter (a-z)';
    }
    if (!password.contains(RegExp(r'[0-9]'))) {
      return 'Must contain a number (0-9)';
    }
    if (!password.contains(RegExp(r'[!@#\$%^&*()_+\-=\[\]{};:,.<>?]'))) {
      return 'Must contain special character (!@#\$%...)';
    }
    return null;
  }

  static double getPasswordStrength(String password) {
    double strength = 0;
    if (password.length >= 8) strength += 0.2;
    if (password.contains(RegExp(r'[A-Z]'))) strength += 0.2;
    if (password.contains(RegExp(r'[a-z]'))) strength += 0.2;
    if (password.contains(RegExp(r'[0-9]'))) strength += 0.2;
    if (password.contains(RegExp(r'[!@#$%^&*()_+\-=\[\]{};:,.<>?]'))) {
      strength += 0.2;
    }
    return strength;
  }

  static String getPasswordStrengthText(double strength) {
    if (strength < 0.4) return 'Weak';
    if (strength < 0.6) return 'Medium';
    if (strength < 0.8) return 'Good';
    return 'Strong';
  }

  static Color getPasswordStrengthColor(double strength) {
    if (strength < 0.4) return Colors.red;
    if (strength < 0.6) return Colors.orange;
    if (strength < 0.8) return Colors.blue;
    return Colors.green;
  }
}

// ─────────────────────────────────────────
// Data Models
// ─────────────────────────────────────────
class UserSession {
  static String email = '';
  static String firstName = '';
  static String surname = '';
  static String lastName = '';
  static String nationalId = '';
  static String address = '';
  static String password = '';
  static DateTime? dateOfBirth;

  static String get fullName => '$firstName $surname $lastName'.trim();
}

class NotificationItem {
  final String id;
  final String title;
  final String message;
  final DateTime timestamp;
  final String type; // 'ticket', 'rental', 'alert'
  bool isRead;

  NotificationItem({
    required this.id,
    required this.title,
    required this.message,
    required this.timestamp,
    required this.type,
    this.isRead = false,
  });
}

class NotificationManager {
  static final List<NotificationItem> _notifications = [
    NotificationItem(
      id: '1',
      title: 'New Ticket Issued',
      message: 'Your car passed through Cairo Toll Gate at 10:30 AM',
      timestamp: DateTime.now().subtract(const Duration(hours: 2)),
      type: 'ticket',
    ),
    NotificationItem(
      id: '2',
      title: 'Rental Request',
      message: 'New rental request for your Toyota Corolla',
      timestamp: DateTime.now().subtract(const Duration(hours: 5)),
      type: 'rental',
    ),
    NotificationItem(
      id: '3',
      title: 'Payment Reminder',
      message: 'You have 2 unpaid tickets totaling 45 LE',
      timestamp: DateTime.now().subtract(const Duration(days: 1)),
      type: 'alert',
    ),
  ];

  static List<NotificationItem> get all => _notifications;
  static int get unreadCount => _notifications.where((n) => !n.isRead).length;

  static void addNotification(NotificationItem notification) {
    _notifications.insert(0, notification);
  }

  static void markAsRead(String id) {
    final index = _notifications.indexWhere((n) => n.id == id);
    if (index != -1) {
      _notifications[index].isRead = true;
    }
  }

  static void markAllAsRead() {
    for (var notification in _notifications) {
      notification.isRead = true;
    }
  }
}

class RentalRequest {
  final String id;
  final String vehiclePlate;
  final String vehicleType;
  final String renterName;
  final String renterEmail;
  final String renterLicenseId;
  String status; // 'pending', 'accepted', 'rejected'
  final DateTime requestDate;

  RentalRequest({
    required this.id,
    required this.vehiclePlate,
    required this.vehicleType,
    required this.renterName,
    required this.renterEmail,
    required this.renterLicenseId,
    this.status = 'pending',
    required this.requestDate,
  });
}

class VehicleActivity {
  final String id;
  final String gate;
  final DateTime timestamp;
  final String ticketId;
  final double amount;

  VehicleActivity({
    required this.id,
    required this.gate,
    required this.timestamp,
    required this.ticketId,
    required this.amount,
  });
}

// ─────────────────────────────────────────
// Splash Screen
// ─────────────────────────────────────────
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => SplashScreenState();
}

class SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    Timer(const Duration(seconds: 3), () {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const LoginPage()),
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.blue.shade700,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.local_parking, size: 120, color: Colors.white),
            const SizedBox(height: 30),
            const Text(
              'Welcome Back!',
              style: TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 10),
            const Text(
              'to Auto Pass',
              style: TextStyle(fontSize: 24, color: Colors.white70),
            ),
            const SizedBox(height: 50),
            const CircularProgressIndicator(color: Colors.white),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────
// Home Page with Bottom Navigation
// ─────────────────────────────────────────
class HomePage extends StatefulWidget {
  final String userEmail;
  const HomePage({super.key, required this.userEmail});

  @override
  State<HomePage> createState() => HomePageState();
}

class HomePageState extends State<HomePage> {
  int _selectedIndex = 0;
  bool _profileOpen = false;
  int _unreadCount = 0; // 🆕 real unread count from backend

  late List<Widget> _pages;

  @override
  void initState() {
    super.initState();
    _pages = [
      HomeTab(userEmail: widget.userEmail),
      const VehicleManagementPage(),
      const HistoryTab(),
    ];
    _loadUnreadCount(); // 🆕 fetch on open
  }

  // 🆕 Fetch unread alert count from backend
  Future<void> _loadUnreadCount() async {
    try {
      final count = await AlertService.getUnreadCount();
      if (mounted) setState(() => _unreadCount = count);
    } catch (_) {
      // Badge silently stays 0 — non-critical
    }
  }

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
      _profileOpen = false;
    });
  }

  void _toggleProfile() {
    setState(() => _profileOpen = !_profileOpen);
  }

  void _openNotifications() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const NotificationsPage()),
    ).then((_) {
      // Refresh badge when returning from notifications
      _loadUnreadCount();
      setState(() {});
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          Column(
            children: [
              Container(
                color: Colors.blue.shade700,
                child: SafeArea(
                  bottom: false,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 10,
                    ),
                    child: Row(
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'AutoPass',
                              style: TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                            Text(
                              widget.userEmail,
                              style: const TextStyle(
                                fontSize: 12,
                                color: Colors.white70,
                              ),
                            ),
                          ],
                        ),
                        const Spacer(),
                        Stack(
                          children: [
                            IconButton(
                              icon: const Icon(
                                Icons.notifications,
                                color: Colors.white,
                              ),
                              onPressed: _openNotifications,
                            ),
                            // 🆕 Real unread count badge
                            if (_unreadCount > 0)
                              Positioned(
                                right: 8,
                                top: 8,
                                child: Container(
                                  padding: const EdgeInsets.all(4),
                                  decoration: const BoxDecoration(
                                    color: Colors.red,
                                    shape: BoxShape.circle,
                                  ),
                                  constraints: const BoxConstraints(
                                    minWidth: 18,
                                    minHeight: 18,
                                  ),
                                  child: Text(
                                    _unreadCount > 99 ? '99+' : '$_unreadCount',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                ),
                              ),
                          ],
                        ),
                        IconButton(
                          icon: Icon(
                            _profileOpen ? Icons.close : Icons.account_circle,
                            color: Colors.white,
                          ),
                          onPressed: _toggleProfile,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              Expanded(child: _pages[_selectedIndex]),
            ],
          ),

          if (_profileOpen)
            Positioned.fill(
              child: GestureDetector(
                onTap: _toggleProfile,
                child: Container(color: Colors.black.withValues(alpha: 0.3)),
              ),
            ),
          if (_profileOpen)
            Positioned(
              top: 0,
              right: 0,
              bottom: 0,
              width: MediaQuery.of(context).size.width * 0.78,
              child: ProfileSidebar(onClose: _toggleProfile),
            ),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
          BottomNavigationBarItem(
            icon: Icon(Icons.directions_car),
            label: 'Vehicles',
          ),
          BottomNavigationBarItem(icon: Icon(Icons.history), label: 'History'),
        ],
        currentIndex: _selectedIndex,
        selectedItemColor: Colors.blue.shade700,
        onTap: _onItemTapped,
      ),
    );
  }
}

// ─────────────────────────────────────────
// 2. NotificationsPage — real alerts from backend
// Full replacement for the existing class.
// ─────────────────────────────────────────

// ─────────────────────────────────────────
// Notifications Page
// ─────────────────────────────────────────
class NotificationsPage extends StatefulWidget {
  const NotificationsPage({super.key});

  @override
  State<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends State<NotificationsPage> {
  bool _loading = true;
  String? _error;
  List<dynamic> _alerts = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final alerts = await AlertService.getMyAlertsList();
      if (!mounted) return;
      setState(() {
        _alerts = alerts;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        backgroundColor: Colors.blue.shade700,
        foregroundColor: Colors.white,
        actions: [
          if (_alerts.isNotEmpty)
            TextButton(
              onPressed: () {
                // Mark all read locally (backend doesn't have a bulk mark-read
                // endpoint yet — just update UI state optimistically)
                setState(() {
                  for (final a in _alerts) {
                    if (a is Map) a['is_read'] = true;
                  }
                });
              },
              child: const Text(
                'Mark all read',
                style: TextStyle(color: Colors.white),
              ),
            ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline, size: 60, color: Colors.red.shade400),
              const SizedBox(height: 16),
              const Text(
                'Could not load notifications',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.grey),
              ),
              const SizedBox(height: 20),
              ElevatedButton.icon(
                onPressed: _load,
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    if (_alerts.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.notifications_none,
              size: 80,
              color: Colors.grey.shade400,
            ),
            const SizedBox(height: 16),
            Text(
              'No notifications yet',
              style: TextStyle(fontSize: 18, color: Colors.grey.shade600),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        itemCount: _alerts.length,
        itemBuilder: (context, index) {
          final alert = _alerts[index] as Map<String, dynamic>;
          return _buildAlertCard(alert, index);
        },
      ),
    );
  }

  Widget _buildAlertCard(Map<String, dynamic> alert, int index) {
    final isRead = alert['is_read'] == true;
    final title = alert['title']?.toString() ?? 'Notification';
    final message = alert['message']?.toString() ?? '';
    final createdAt = DateTime.tryParse(alert['created_at']?.toString() ?? '');

    // Determine icon from alert type or title keywords
    IconData icon = Icons.notifications;
    Color iconColor = Colors.grey;
    final titleLower = title.toLowerCase();
    if (titleLower.contains('ticket') || titleLower.contains('toll')) {
      icon = Icons.receipt_long;
      iconColor = Colors.blue;
    } else if (titleLower.contains('rental') || titleLower.contains('rent')) {
      icon = Icons.car_rental;
      iconColor = Colors.orange;
    } else if (titleLower.contains('payment') || titleLower.contains('paid')) {
      icon = Icons.payment;
      iconColor = Colors.green;
    } else if (titleLower.contains('block') ||
        titleLower.contains('stolen') ||
        titleLower.contains('alert')) {
      icon = Icons.warning_amber;
      iconColor = Colors.red;
    }

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: isRead ? Colors.white : Colors.blue.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isRead ? Colors.grey.shade200 : Colors.blue.shade200,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withValues(alpha: 0.1),
            spreadRadius: 1,
            blurRadius: 4,
          ),
        ],
      ),
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: iconColor.withValues(alpha: 0.1),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: iconColor, size: 24),
        ),
        title: Text(
          title,
          style: TextStyle(
            fontWeight: isRead ? FontWeight.normal : FontWeight.bold,
            fontSize: 15,
          ),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Text(
              message,
              style: TextStyle(fontSize: 13, color: Colors.grey.shade700),
            ),
            const SizedBox(height: 6),
            Text(
              createdAt != null ? _formatTimestamp(createdAt) : '—',
              style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
            ),
          ],
        ),
        onTap: () {
          // Mark as read locally on tap
          setState(() => alert['is_read'] = true);
        },
        trailing: !isRead
            ? Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(
                  color: Colors.blue.shade700,
                  shape: BoxShape.circle,
                ),
              )
            : null,
      ),
    );
  }

  String _formatTimestamp(DateTime timestamp) {
    final difference = DateTime.now().difference(timestamp);
    if (difference.inMinutes < 60) return '${difference.inMinutes}m ago';
    if (difference.inHours < 24) return '${difference.inHours}h ago';
    if (difference.inDays < 7) return '${difference.inDays}d ago';
    return '${timestamp.day}/${timestamp.month}/${timestamp.year}';
  }
}

// ─────────────────────────────────────────
// 3. _HomeTabState — real tickets from backend
// Replace from: class _HomeTabState extends State<HomeTab>
// To end of class (before PaymentConfirmationPage comment)
// ─────────────────────────────────────────

// ─────────────────────────────────────────
// Profile Sidebar — wired to UserService.getMyProfile() & changePassword()
// Drop-in replacement for the previous ProfileSidebar class.
//
// Loads profile from backend on open, shows loading/error states,
// includes a "Change Password" dialog, and a working logout.
// ─────────────────────────────────────────
class ProfileSidebar extends StatefulWidget {
  final VoidCallback onClose;
  const ProfileSidebar({super.key, required this.onClose});

  @override
  State<ProfileSidebar> createState() => _ProfileSidebarState();
}

class _ProfileSidebarState extends State<ProfileSidebar> {
  bool _loading = true;
  String? _error;
  Map<String, dynamic>? _profile;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final data = await UserService.getMyProfile();
      debugPrint('[profile] Loaded: $data');
      if (!mounted) return;
      setState(() {
        _profile = data;
        _loading = false;
      });
    } catch (e) {
      debugPrint('[profile] Failed to load: $e');
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  Future<void> _logout() async {
    // Confirm before logging out
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Log out?'),
        content: const Text('You will need to log in again to use the app.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Log out'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    // Properly clear the session — token, prefs, navigate
    await AuthService.logout();

    // AuthService.logout() tries to navigate to '/login' which doesn't exist
    // as a named route in this app, so we fall back to manual navigation.
    if (!mounted) return;
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => const LoginPage()),
      (route) => false,
    );
  }

  Future<void> _openChangePassword() async {
    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => const _ChangePasswordDialog(),
    );

    if (result == true && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Password changed successfully ✓'),
          backgroundColor: Colors.green,
        ),
      );
    }
  }

  String _formatBackendDate(String? raw) {
    if (raw == null || raw.isEmpty) return '—';
    final d = DateTime.tryParse(raw);
    if (d == null) return raw;
    return '${d.day.toString().padLeft(2, '0')}/'
        '${d.month.toString().padLeft(2, '0')}/'
        '${d.year}';
  }

  String _formatMonthYear(String? raw) {
    if (raw == null || raw.isEmpty) return '—';
    final d = DateTime.tryParse(raw);
    if (d == null) return raw;
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return '${months[d.month - 1]} ${d.year}';
  }

  String _str(String key) {
    final v = _profile?[key];
    if (v == null) return '—';
    final s = v.toString().trim();
    return s.isEmpty ? '—' : s;
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        boxShadow: [BoxShadow(color: Colors.black26, blurRadius: 16)],
      ),
      child: SafeArea(child: _buildBody()),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Loading profile…', style: TextStyle(color: Colors.grey)),
          ],
        ),
      );
    }

    if (_error != null) {
      return Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 60, color: Colors.red.shade400),
            const SizedBox(height: 16),
            const Text(
              'Could not load profile',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              _error!,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: _loadProfile,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
            const SizedBox(height: 12),
            TextButton(onPressed: widget.onClose, child: const Text('Close')),
          ],
        ),
      );
    }

    // ─── Profile loaded successfully ──────────────────────────────
    final firstName = _str('first_name');
    final lastName = _str('last_name');
    final fullName = firstName != '—' && lastName != '—'
        ? '$firstName $lastName'
        : 'User';
    final email = _str('email');

    return Column(
      children: [
        // ─── Header (gradient banner with avatar + name) ────────────
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [Colors.blue.shade700, Colors.blue.shade500],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: Column(
            children: [
              const CircleAvatar(
                radius: 40,
                backgroundColor: Colors.white,
                child: Icon(Icons.person, size: 50, color: Colors.blue),
              ),
              const SizedBox(height: 12),
              Text(
                fullName,
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 4),
              Text(
                email,
                style: const TextStyle(fontSize: 13, color: Colors.white70),
              ),
            ],
          ),
        ),

        // ─── Body (info tiles + actions) ────────────────────────────
        Expanded(
          child: RefreshIndicator(
            onRefresh: _loadProfile,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _sectionTitle('Account'),
                  _infoTile(Icons.email, 'Email', email),
                  const SizedBox(height: 8),

                  // Change Password row — replaces the old "show password" tile
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 10,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade50,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.lock, size: 20, color: Colors.blue.shade700),
                        const SizedBox(width: 12),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Password',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Colors.grey,
                                ),
                              ),
                              Text(
                                '••••••••',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                        TextButton(
                          onPressed: _openChangePassword,
                          child: const Text('Change'),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),
                  _sectionTitle('Personal Information'),
                  _infoTile(Icons.person, 'First Name', firstName),
                  const SizedBox(height: 8),
                  _infoTile(
                    Icons.person_outline,
                    'Middle Name',
                    _str('middle_name'),
                  ),
                  const SizedBox(height: 8),
                  _infoTile(Icons.family_restroom, 'Last Name', lastName),
                  const SizedBox(height: 8),
                  _infoTile(
                    Icons.credit_card,
                    'National ID',
                    _str('national_id'),
                  ),
                  const SizedBox(height: 8),
                  _infoTile(Icons.phone, 'Phone Number', _str('phone_number')),
                  const SizedBox(height: 8),
                  _infoTile(
                    Icons.calendar_today,
                    'Date of Birth',
                    _formatBackendDate(_profile?['date_of_birth']?.toString()),
                  ),
                  const SizedBox(height: 8),
                  _infoTile(Icons.home, 'Address', _str('address')),

                  const SizedBox(height: 16),
                  // "Member since" — small grey footer
                  Center(
                    child: Text(
                      'Member since ${_formatMonthYear(_profile?['created_at']?.toString())}',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey.shade600,
                      ),
                    ),
                  ),

                  const SizedBox(height: 30),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: _logout,
                      icon: const Icon(Icons.logout, color: Colors.red),
                      label: const Text(
                        'Logout',
                        style: TextStyle(color: Colors.red),
                      ),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Colors.red),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _sectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.bold,
          color: Colors.blue.shade700,
          letterSpacing: 0.5,
        ),
      ),
    );
  }

  Widget _infoTile(IconData icon, String label, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Colors.blue.shade700),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(fontSize: 11, color: Colors.grey),
                ),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
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

// ─────────────────────────────────────────
// Change Password Dialog
// Returns true via Navigator.pop(true) on success.
// ─────────────────────────────────────────
class _ChangePasswordDialog extends StatefulWidget {
  const _ChangePasswordDialog();

  @override
  State<_ChangePasswordDialog> createState() => _ChangePasswordDialogState();
}

class _ChangePasswordDialogState extends State<_ChangePasswordDialog> {
  final currentCtrl = TextEditingController();
  final newCtrl = TextEditingController();
  final confirmCtrl = TextEditingController();

  bool _obscureCurrent = true;
  bool _obscureNew = true;
  bool _obscureConfirm = true;
  bool _isSubmitting = false;
  String? _error;

  @override
  void dispose() {
    currentCtrl.dispose();
    newCtrl.dispose();
    confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _error = null);

    final current = currentCtrl.text;
    final newPwd = newCtrl.text;
    final confirm = confirmCtrl.text;

    if (current.isEmpty) {
      setState(() => _error = 'Please enter your current password.');
      return;
    }
    if (newPwd.length < 8) {
      setState(() => _error = 'New password must be at least 8 characters.');
      return;
    }
    if (newPwd != confirm) {
      setState(() => _error = 'New passwords do not match.');
      return;
    }
    if (newPwd == current) {
      setState(() => _error = 'New password must be different from current.');
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      await UserService.changePassword(
        currentPassword: current,
        newPassword: newPwd,
      );
      if (!mounted) return;
      Navigator.pop(context, true); // success
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _isSubmitting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Change Password'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _passwordField(
              controller: currentCtrl,
              label: 'Current Password',
              obscure: _obscureCurrent,
              onToggle: () =>
                  setState(() => _obscureCurrent = !_obscureCurrent),
            ),
            const SizedBox(height: 12),
            _passwordField(
              controller: newCtrl,
              label: 'New Password',
              obscure: _obscureNew,
              onToggle: () => setState(() => _obscureNew = !_obscureNew),
            ),
            const SizedBox(height: 12),
            _passwordField(
              controller: confirmCtrl,
              label: 'Confirm New Password',
              obscure: _obscureConfirm,
              onToggle: () =>
                  setState(() => _obscureConfirm = !_obscureConfirm),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red.shade200),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.error_outline,
                      color: Colors.red.shade700,
                      size: 18,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _error!,
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.red.shade700,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 8),
            const Text(
              'Min 8 characters. Use a strong password.',
              style: TextStyle(fontSize: 11, color: Colors.grey),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isSubmitting ? null : () => Navigator.pop(context, false),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _isSubmitting ? null : _submit,
          child: _isSubmitting
              ? const SizedBox(
                  height: 18,
                  width: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Change'),
        ),
      ],
    );
  }

  Widget _passwordField({
    required TextEditingController controller,
    required String label,
    required bool obscure,
    required VoidCallback onToggle,
  }) {
    return TextField(
      controller: controller,
      obscureText: obscure,
      enabled: !_isSubmitting,
      decoration: InputDecoration(
        labelText: label,
        border: const OutlineInputBorder(),
        suffixIcon: IconButton(
          icon: Icon(
            obscure ? Icons.visibility_off : Icons.visibility,
            size: 20,
          ),
          onPressed: onToggle,
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────
// Home Tab — now with Unpaid / Paid tabs + Pay All
// ─────────────────────────────────────────
class HomeTab extends StatefulWidget {
  final String userEmail;
  const HomeTab({super.key, required this.userEmail});

  @override
  State<HomeTab> createState() => _HomeTabState();
}

class _HomeTabState extends State<HomeTab> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // 🆕 Backend state
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _tickets = [];

  // Tracks which ticket IDs are currently being paid (for per-card spinners)
  final Set<String> _payingIds = {};

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadTickets(); // 🆕 fetch on open
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  // 🆕 Fetch ALL tickets (both unpaid and paid) in parallel
  Future<void> _loadTickets() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      // Fetch unpaid and paid in parallel for speed
      final results = await Future.wait([
        TicketService.getMyTicketsList(status: TicketStatus.unpaid),
        TicketService.getMyTicketsList(status: TicketStatus.paid),
      ]);

      final unpaid = results[0];
      final paid = results[1];

      // Normalize backend fields to the shape the UI expects
      final normalized = [
        ...unpaid.map((t) => _normalize(t as Map<String, dynamic>)),
        ...paid.map((t) => _normalize(t as Map<String, dynamic>)),
      ];

      if (!mounted) return;
      setState(() {
        _tickets = normalized;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  /// Convert backend ticket fields → shape the card widget expects
  Map<String, dynamic> _normalize(Map<String, dynamic> t) {
    final issuedAt = DateTime.tryParse(t['issued_at']?.toString() ?? '');
    return {
      // Keep original backend fields
      ...t,
      // Add UI-friendly aliases
      'id': t['ticket_id']?.toString() ?? '—',
      'gate': t['gate_name']?.toString() ?? '—',
      'date': issuedAt != null
          ? '${issuedAt.year}-'
                '${issuedAt.month.toString().padLeft(2, '0')}-'
                '${issuedAt.day.toString().padLeft(2, '0')}'
          : '—',
      'time': issuedAt != null
          ? '${issuedAt.hour.toString().padLeft(2, '0')}:'
                '${issuedAt.minute.toString().padLeft(2, '0')}'
          : '—',
      'plateNumber': t['plate_number']?.toString() ?? '—',
      'price': double.tryParse(t['price']?.toString() ?? '0') ?? 0.0,
      'isPaid': t['status']?.toString() != 'UNPAID',
    };
  }

  List<Map<String, dynamic>> get _unpaid =>
      _tickets.where((t) => t['isPaid'] == false).toList();

  List<Map<String, dynamic>> get _paid =>
      _tickets.where((t) => t['isPaid'] == true).toList();

  double get _unpaidTotal =>
      _unpaid.fold(0.0, (sum, t) => sum + (t['price'] as double));

  // 🆕 Pay a single ticket via backend
  Future<void> _payOne(Map<String, dynamic> ticket) async {
    final ticketId = ticket['ticket_id']?.toString() ?? ticket['id'];
    if (ticketId == null || ticketId == '—') return;

    final ok = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) => PaymentConfirmationPage(tickets: [ticket]),
      ),
    );
    if (ok == true && mounted) {
      // Optimistically mark as paid in local state
      setState(() {
        final index = _tickets.indexWhere((t) => t['id'] == ticket['id']);
        if (index != -1) _tickets[index]['isPaid'] = true;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Payment successful ✓'),
          backgroundColor: Colors.green,
        ),
      );
    }
  }

  // 🆕 Pay all unpaid tickets via backend
  Future<void> _payAll() async {
    if (_unpaid.isEmpty) return;
    final ok = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) => PaymentConfirmationPage(
          tickets: List<Map<String, dynamic>>.from(_unpaid),
        ),
      ),
    );
    if (ok == true && mounted) {
      setState(() {
        for (var t in _tickets) {
          if (t['isPaid'] == false) t['isPaid'] = true;
        }
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('All tickets paid ✓'),
          backgroundColor: Colors.green,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline, size: 60, color: Colors.red.shade400),
              const SizedBox(height: 16),
              const Text(
                'Could not load tickets',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.grey),
              ),
              const SizedBox(height: 20),
              ElevatedButton.icon(
                onPressed: _loadTickets,
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Colors.grey.shade100,
      body: RefreshIndicator(
        onRefresh: _loadTickets,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ─── Stats banner ──────────────────────────────────
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [Colors.blue.shade700, Colors.blue.shade500],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Welcome Back!',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildStatCard(
                        'Unpaid',
                        '${_unpaid.length}',
                        Colors.orange,
                      ),
                      _buildStatCard('Paid', '${_paid.length}', Colors.green),
                      _buildStatCard(
                        'Due',
                        '${_unpaidTotal.toStringAsFixed(0)} LE',
                        Colors.white,
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // ─── Pill tab bar ──────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(30),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.grey.withValues(alpha: 0.1),
                      blurRadius: 6,
                    ),
                  ],
                ),
                child: TabBar(
                  controller: _tabController,
                  indicator: BoxDecoration(
                    color: Colors.blue.shade700,
                    borderRadius: BorderRadius.circular(30),
                  ),
                  indicatorSize: TabBarIndicatorSize.tab,
                  indicatorPadding: const EdgeInsets.all(4),
                  dividerColor: Colors.transparent,
                  labelColor: Colors.white,
                  unselectedLabelColor: Colors.grey.shade700,
                  labelStyle: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                  tabs: [
                    Tab(text: 'Unpaid (${_unpaid.length})'),
                    Tab(text: 'Paid (${_paid.length})'),
                  ],
                ),
              ),
            ),

            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [_buildUnpaidView(), _buildPaidView()],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildUnpaidView() {
    if (_unpaid.isEmpty) {
      return _buildEmptyState(
        icon: Icons.check_circle_outline,
        title: 'All caught up!',
        subtitle: 'You have no unpaid tickets.',
        color: Colors.green,
      );
    }

    return Column(
      children: [
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            itemCount: _unpaid.length,
            itemBuilder: (context, index) =>
                _buildTicketCard(context, _unpaid[index]),
          ),
        ),
        Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
          decoration: BoxDecoration(
            color: Colors.white,
            boxShadow: [
              BoxShadow(
                color: Colors.grey.withValues(alpha: 0.15),
                blurRadius: 8,
                offset: const Offset(0, -2),
              ),
            ],
          ),
          child: SafeArea(
            top: false,
            child: Row(
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Total Due',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey.shade600,
                      ),
                    ),
                    Text(
                      '${_unpaidTotal.toStringAsFixed(2)} LE',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: Colors.blue.shade700,
                      ),
                    ),
                  ],
                ),
                const Spacer(),
                ElevatedButton.icon(
                  onPressed: _payAll,
                  icon: const Icon(Icons.payment, color: Colors.white),
                  label: Text(
                    'Pay All (${_unpaid.length})',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue.shade700,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 14,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPaidView() {
    if (_paid.isEmpty) {
      return _buildEmptyState(
        icon: Icons.receipt_long,
        title: 'No paid tickets yet',
        subtitle: 'Your payment history will appear here.',
        color: Colors.grey,
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
      itemCount: _paid.length,
      itemBuilder: (context, index) => _buildTicketCard(context, _paid[index]),
    );
  }

  Widget _buildEmptyState({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
  }) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 80, color: color.withValues(alpha: 0.5)),
          const SizedBox(height: 16),
          Text(
            title,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Colors.grey.shade700,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            subtitle,
            style: TextStyle(fontSize: 14, color: Colors.grey.shade500),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: const TextStyle(fontSize: 12, color: Colors.white70),
          ),
        ],
      ),
    );
  }

  Widget _buildTicketCard(BuildContext context, Map<String, dynamic> ticket) {
    final bool isPaid = ticket['isPaid'] as bool;
    final bool isPaying = _payingIds.contains(ticket['id']?.toString());

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withValues(alpha: 0.1),
            spreadRadius: 1,
            blurRadius: 10,
          ),
        ],
      ),
      child: Column(
        children: [
          // Header with ticket ID and status badge
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isPaid ? Colors.green.shade50 : Colors.orange.shade50,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(16),
                topRight: Radius.circular(16),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(
                      Icons.confirmation_number,
                      color: isPaid ? Colors.green : Colors.orange,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      ticket['id']?.toString() ?? '—',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: isPaid
                            ? Colors.green.shade700
                            : Colors.orange.shade700,
                      ),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: isPaid ? Colors.green : Colors.orange,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    isPaid ? 'PAID' : 'UNPAID',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Body with ticket details
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                _buildTicketRow(
                  Icons.location_on,
                  'Gate',
                  ticket['gate']?.toString() ?? '—',
                ),
                const SizedBox(height: 12),
                _buildTicketRow(
                  Icons.calendar_today,
                  'Date',
                  ticket['date']?.toString() ?? '—',
                ),
                const SizedBox(height: 12),
                _buildTicketRow(
                  Icons.access_time,
                  'Time',
                  ticket['time']?.toString() ?? '—',
                ),
                const SizedBox(height: 12),
                _buildTicketRow(
                  Icons.directions_car,
                  'Plate',
                  ticket['plateNumber']?.toString() ?? '—',
                ),
                if (ticket['zone_name'] != null &&
                    ticket['zone_name'].toString().isNotEmpty) ...[
                  const SizedBox(height: 12),
                  _buildTicketRow(
                    Icons.map,
                    'Zone',
                    ticket['zone_name'].toString(),
                  ),
                ],
                if (ticket['direction'] != null) ...[
                  const SizedBox(height: 12),
                  _buildTicketRow(
                    Icons.swap_horiz,
                    'Direction',
                    ticket['direction'].toString(),
                  ),
                ],
                const Divider(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Amount:',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      '${(ticket['price'] as double).toStringAsFixed(2)} LE',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Colors.blue.shade700,
                      ),
                    ),
                  ],
                ),

                // Pay Now button — only for unpaid
                if (!isPaid) ...[
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: isPaying ? null : () => _payOne(ticket),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue.shade700,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text(
                        'Pay Now',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTicketRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 20, color: Colors.grey.shade600),
        const SizedBox(width: 12),
        Text(
          '$label:',
          style: TextStyle(fontSize: 14, color: Colors.grey.shade600),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────
// 4. _PaymentConfirmationPageState — real backend payment
// Replace: class _PaymentConfirmationPageState
// (keep PaymentConfirmationPage StatefulWidget as-is, just replace the State)
// ─────────────────────────────────────────

// ─────────────────────────────────────────
// Payment Confirmation Page
// ─────────────────────────────────────────
class PaymentConfirmationPage extends StatefulWidget {
  final List<Map<String, dynamic>> tickets;
  const PaymentConfirmationPage({super.key, required this.tickets});

  @override
  State<PaymentConfirmationPage> createState() =>
      _PaymentConfirmationPageState();
}

class _PaymentConfirmationPageState extends State<PaymentConfirmationPage> {
  bool _processing = false;

  double get _total => widget.tickets.fold(
    0.0,
    (sum, t) => sum + (double.tryParse(t['price']?.toString() ?? '0') ?? 0.0),
  );

  // 🆕 Real payment — calls PaymentService for each ticket
  Future<void> _confirmPayment() async {
    setState(() => _processing = true);

    try {
      final isMultiple = widget.tickets.length > 1;

      if (isMultiple) {
        // Pay-all: group by vehicle_id and call payAll for each vehicle
        // If all tickets are for the same vehicle, one call is enough.
        final vehicleIds = widget.tickets
            .map((t) => t['vehicle_id']?.toString())
            .where((id) => id != null && id.isNotEmpty)
            .toSet();

        if (vehicleIds.isNotEmpty) {
          // Call payAll for each unique vehicle
          for (final vehicleId in vehicleIds) {
            await PaymentService.payAllForVehicle(vehicleId: vehicleId!);
          }
        } else {
          // Fallback: no vehicle_id available, pay each ticket individually
          for (final ticket in widget.tickets) {
            final ticketId = ticket['ticket_id']?.toString() ?? ticket['id'];
            if (ticketId != null && ticketId != '—') {
              await PaymentService.payTicket(ticketId: ticketId);
            }
          }
        }
      } else {
        // Single ticket payment
        final ticket = widget.tickets.first;
        final ticketId = ticket['ticket_id']?.toString() ?? ticket['id'];
        if (ticketId == null || ticketId == '—') {
          throw Exception('Invalid ticket ID.');
        }
        await PaymentService.payTicket(ticketId: ticketId);
      }

      if (!mounted) return;
      Navigator.pop(context, true); // ← success, tells HomeTab to refresh
    } catch (e) {
      if (!mounted) return;
      setState(() => _processing = false);
      final msg = e.toString().replaceFirst('Exception: ', '');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(msg),
          backgroundColor: Colors.red,
          duration: const Duration(seconds: 4),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isMultiple = widget.tickets.length > 1;

    return Scaffold(
      backgroundColor: Colors.grey.shade100,
      appBar: AppBar(
        title: Text(isMultiple ? 'Pay All Tickets' : 'Confirm Payment'),
        backgroundColor: Colors.blue.shade700,
        foregroundColor: Colors.white,
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Total amount banner
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [Colors.blue.shade700, Colors.blue.shade500],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        children: [
                          const Icon(
                            Icons.account_balance_wallet,
                            color: Colors.white,
                            size: 40,
                          ),
                          const SizedBox(height: 12),
                          const Text(
                            'Total Amount',
                            style: TextStyle(
                              color: Colors.white70,
                              fontSize: 14,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            '${_total.toStringAsFixed(2)} LE',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 40,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${widget.tickets.length} ticket${widget.tickets.length == 1 ? '' : 's'}',
                            style: const TextStyle(
                              color: Colors.white70,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    Text(
                      'Tickets',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey.shade800,
                      ),
                    ),
                    const SizedBox(height: 12),

                    ...widget.tickets.map(
                      (t) => Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.grey.shade200),
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: Colors.orange.shade50,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Icon(
                                Icons.confirmation_number,
                                color: Colors.orange.shade700,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    t['id']?.toString() ?? '—',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    '${t['gate'] ?? '—'} • ${t['date'] ?? '—'}',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: Colors.grey.shade600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Text(
                              '${(t['price'] as double).toStringAsFixed(2)} LE',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Colors.blue.shade700,
                                fontSize: 15,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.grey.shade200),
                      ),
                      child: Column(
                        children: [
                          _summaryRow(
                            'Subtotal',
                            '${_total.toStringAsFixed(2)} LE',
                          ),
                          const SizedBox(height: 8),
                          _summaryRow('Service fee', '0.00 LE'),
                          const Divider(height: 20),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                'Total',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              Text(
                                '${_total.toStringAsFixed(2)} LE',
                                style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.blue.shade700,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Confirm button
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: Colors.grey.withValues(alpha: 0.15),
                    blurRadius: 8,
                    offset: const Offset(0, -2),
                  ),
                ],
              ),
              child: SizedBox(
                width: double.infinity,
                height: 55,
                child: ElevatedButton.icon(
                  onPressed: _processing ? null : _confirmPayment,
                  icon: _processing
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2.5,
                          ),
                        )
                      : const Icon(Icons.check_circle, color: Colors.white),
                  label: Text(
                    _processing
                        ? 'Processing…'
                        : 'Confirm Payment (${_total.toStringAsFixed(2)} LE)',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue.shade700,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _summaryRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(color: Colors.grey.shade700)),
        Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
      ],
    );
  }
}

// ─────────────────────────────────────────
// Vehicle Management Page with Tabs
// (unchanged — paste as-is)
// ─────────────────────────────────────────
class VehicleManagementPage extends StatefulWidget {
  const VehicleManagementPage({super.key});

  @override
  State<VehicleManagementPage> createState() => _VehicleManagementPageState();
}

class _VehicleManagementPageState extends State<VehicleManagementPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade100,
      appBar: AppBar(
        title: const Text('Vehicle Management'),
        backgroundColor: Colors.blue.shade700,
        foregroundColor: Colors.white,
        automaticallyImplyLeading: false,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: const [
            Tab(text: 'Registered'),
            Tab(text: 'Rental'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: const [RegisteredVehiclesTab(), RentalManagementTab()],
      ),
    );
  }
}

// ─────────────────────────────────────────
// Registered Vehicles Tab — wired to VehicleService
// (Delete removed. Report Stolen added per vehicle. Pending badge for unverified.)
// ─────────────────────────────────────────

class RegisteredVehiclesTab extends StatefulWidget {
  const RegisteredVehiclesTab({super.key});

  @override
  State<RegisteredVehiclesTab> createState() => _RegisteredVehiclesTabState();
}

class _RegisteredVehiclesTabState extends State<RegisteredVehiclesTab> {
  final TextEditingController _plateController = TextEditingController();

  bool _isLinking = false;
  Future<List<dynamic>>? _vehiclesFuture;

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  @override
  void dispose() {
    _plateController.dispose();
    super.dispose();
  }

  void _refresh() {
    setState(() {
      _vehiclesFuture = VehicleService.getMyVehicles();
    });
  }

  // ── Step 1: link the vehicle (triggers OTP) ────────────────
  Future<void> _linkVehicle() async {
    final plate = _plateController.text.trim();
    debugPrint('[vehicle] _linkVehicle plate="$plate"');

    if (plate.isEmpty) {
      _snack('Please enter a plate number!', Colors.red);
      return;
    }

    setState(() => _isLinking = true);
    try {
      final result = await VehicleService.linkVehicle(plateNumber: plate);
      debugPrint('[vehicle] linkVehicle response: $result');

      final ownershipId =
          result['ownership_id']?.toString() ??
          result['id']?.toString() ??
          result['_id']?.toString();

      if (ownershipId == null || ownershipId.isEmpty) {
        debugPrint('[vehicle] ❌ no ownership_id in response');
        _snack(
          'Linking succeeded but no ownership ID was returned.',
          Colors.red,
        );
        return;
      }

      if (!mounted) return;
      _snack('OTP sent! Please enter the 6-digit code.', Colors.blue);

      await _showOtpDialog(ownershipId: ownershipId, plate: plate);
    } catch (e) {
      debugPrint('[vehicle] ❌ linkVehicle failed: $e');
      if (!mounted) return;
      _snack(
        e.toString().replaceFirst('Exception: ', ''),
        Colors.red,
        durationSeconds: 4,
      );
    } finally {
      if (mounted) setState(() => _isLinking = false);
    }
  }

  // ── Step 2: OTP verification dialog ────────────────────────
  Future<void> _showOtpDialog({
    required String ownershipId,
    required String plate,
  }) async {
    final otpController = TextEditingController();
    bool verifying = false;
    String? errorText;

    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setDialogState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              title: Row(
                children: [
                  Icon(Icons.sms, color: Colors.blue.shade700),
                  const SizedBox(width: 8),
                  const Text('Verify Ownership'),
                ],
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Enter the 6-digit code sent for plate:',
                    style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    plate.toUpperCase(),
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: otpController,
                    enabled: !verifying,
                    keyboardType: TextInputType.number,
                    maxLength: 6,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 8,
                    ),
                    decoration: InputDecoration(
                      hintText: '000000',
                      counterText: '',
                      errorText: errorText,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      filled: true,
                      fillColor: Colors.grey.shade50,
                    ),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: verifying ? null : () => Navigator.pop(ctx),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue.shade700,
                    foregroundColor: Colors.white,
                  ),
                  onPressed: verifying
                      ? null
                      : () async {
                          final otp = otpController.text.trim();
                          if (otp.length != 6) {
                            setDialogState(
                              () => errorText = 'OTP must be 6 digits',
                            );
                            return;
                          }
                          setDialogState(() {
                            verifying = true;
                            errorText = null;
                          });

                          try {
                            await VehicleService.verifyOwnership(
                              ownershipId: ownershipId,
                              otp: otp,
                            );
                            debugPrint('[vehicle] ✅ ownership verified');

                            if (!ctx.mounted) return;
                            Navigator.pop(ctx);

                            if (!mounted) return;
                            _snack('Vehicle verified ✓', Colors.green);
                            _plateController.clear();
                            _refresh();
                          } catch (e) {
                            debugPrint('[vehicle] ❌ verifyOwnership: $e');
                            setDialogState(() {
                              verifying = false;
                              errorText = e.toString().replaceFirst(
                                'Exception: ',
                                '',
                              );
                            });
                          }
                        },
                  child: verifying
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2.5,
                          ),
                        )
                      : const Text('Verify'),
                ),
              ],
            );
          },
        );
      },
    );

    otpController.dispose();
  }

  // ── Report Stolen dialog (per registered vehicle) ──────────
  Future<void> _showReportStolenDialog(Map<String, dynamic> v) async {
    final reasonController = TextEditingController();
    final notesController = TextEditingController();
    bool submitting = false;
    String? errorText;

    final plate = (v['plate_number'] ?? v['plateNumber'] ?? v['plate'] ?? '')
        .toString();
    final brand = (v['brand'] ?? v['make'] ?? '').toString();
    final model = (v['model'] ?? '').toString();
    final title = [brand, model].where((s) => s.isNotEmpty).join(' ').trim();

    if (plate.isEmpty) {
      _snack('Cannot report: missing plate number.', Colors.red);
      return;
    }

    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setDialogState) => AlertDialog(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            title: Row(
              children: [
                Icon(Icons.warning_amber, color: Colors.red.shade700),
                const SizedBox(width: 8),
                const Text('Report Stolen Vehicle'),
              ],
            ),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (title.isNotEmpty)
                          Text(
                            title,
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                        Text('Plate: $plate'),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: reasonController,
                    enabled: !submitting,
                    maxLines: 2,
                    decoration: InputDecoration(
                      labelText: 'Reason (min 10 characters)',
                      hintText: 'e.g. Stolen from parking lot on May 9',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: notesController,
                    enabled: !submitting,
                    maxLines: 3,
                    decoration: InputDecoration(
                      labelText: 'Additional Notes',
                      hintText: 'Provide any extra details for authorities',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                  ),
                  if (errorText != null) ...[
                    const SizedBox(height: 10),
                    Text(
                      errorText!,
                      style: TextStyle(
                        color: Colors.red.shade700,
                        fontSize: 12,
                      ),
                    ),
                  ],
                  const SizedBox(height: 12),
                  Text(
                    'This will block the vehicle and notify authorities.',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.red.shade700,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: submitting ? null : () => Navigator.pop(ctx),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                onPressed: submitting
                    ? null
                    : () async {
                        final reason = reasonController.text.trim();
                        final notes = notesController.text.trim();
                        if (reason.length < 10) {
                          setDialogState(
                            () => errorText =
                                'Please describe the theft in at least 10 characters.',
                          );
                          return;
                        }
                        if (notes.isEmpty) {
                          setDialogState(
                            () =>
                                errorText = 'Please provide additional notes.',
                          );
                          return;
                        }

                        setDialogState(() {
                          submitting = true;
                          errorText = null;
                        });

                        try {
                          await VehicleService.reportStolen(
                            plateNumber: plate,
                            reason: reason,
                            notes: notes,
                          );
                          if (!ctx.mounted) return;
                          Navigator.pop(ctx);
                          if (!mounted) return;
                          _snack(
                            'Vehicle $plate reported as stolen. Authorities notified.',
                            Colors.red,
                          );
                        } catch (e) {
                          debugPrint('[vehicle] ❌ reportStolen: $e');
                          setDialogState(() {
                            submitting = false;
                            errorText = e.toString().replaceFirst(
                              'Exception: ',
                              '',
                            );
                          });
                        }
                      },
                child: submitting
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2.5,
                        ),
                      )
                    : const Text(
                        'Report',
                        style: TextStyle(color: Colors.white),
                      ),
              ),
            ],
          ),
        );
      },
    );

    reasonController.dispose();
    notesController.dispose();
  }

  void _snack(String text, Color color, {int durationSeconds = 3}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(text),
        backgroundColor: color,
        duration: Duration(seconds: durationSeconds),
      ),
    );
  }

  // ── Build ──────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () async => _refresh(),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildLinkCard(),
            const SizedBox(height: 24),
            Text(
              'My Vehicles',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.grey.shade800,
              ),
            ),
            const SizedBox(height: 12),
            _buildVehiclesList(),
          ],
        ),
      ),
    );
  }

  // ── Link Vehicle card ──────────────────────────────────────
  Widget _buildLinkCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withValues(alpha: 0.1),
            spreadRadius: 1,
            blurRadius: 10,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.directions_car, color: Colors.blue.shade700, size: 28),
              const SizedBox(width: 10),
              Text(
                'Link a Vehicle',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.blue.shade700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'We\'ll fetch the car details from the traffic database and send '
            'an OTP to verify ownership.',
            style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
          ),
          const SizedBox(height: 20),

          Text(
            'Plate Number',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: Colors.grey.shade700,
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _plateController,
            enabled: !_isLinking,
            textAlign: TextAlign.center,
            textCapitalization: TextCapitalization.characters,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              letterSpacing: 4,
            ),
            decoration: InputDecoration(
              hintText: 'e.g.  ABC1234',
              prefixIcon: const Icon(Icons.pin),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              filled: true,
              fillColor: Colors.grey.shade50,
            ),
          ),
          const SizedBox(height: 24),

          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton.icon(
              onPressed: _isLinking ? null : _linkVehicle,
              icon: _isLinking
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2.5,
                      ),
                    )
                  : const Icon(Icons.link, color: Colors.white),
              label: Text(
                _isLinking ? 'Sending OTP…' : 'Link Vehicle',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue.shade700,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── My Vehicles list (FutureBuilder) ───────────────────────
  Widget _buildVehiclesList() {
    return FutureBuilder<List<dynamic>>(
      future: _vehiclesFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Padding(
            padding: EdgeInsets.symmetric(vertical: 32),
            child: Center(child: CircularProgressIndicator()),
          );
        }

        if (snapshot.hasError) {
          return Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.red.shade50,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.red.shade200),
            ),
            child: Row(
              children: [
                Icon(Icons.error_outline, color: Colors.red.shade700),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    snapshot.error.toString().replaceFirst('Exception: ', ''),
                    style: TextStyle(fontSize: 13, color: Colors.red.shade900),
                  ),
                ),
                TextButton(onPressed: _refresh, child: const Text('Retry')),
              ],
            ),
          );
        }

        // Show only verified vehicles — unverified are pending
        // and not yet active, so we exclude them.
        final vehicles = (snapshot.data ?? const [])
            .where((v) => (v as Map)['verified'] == true)
            .toList();

        if (vehicles.isEmpty) {
          return Container(
            padding: const EdgeInsets.all(28),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Center(
              child: Column(
                children: [
                  Icon(
                    Icons.directions_car_outlined,
                    size: 48,
                    color: Colors.grey.shade400,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'No vehicles linked yet',
                    style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
                  ),
                ],
              ),
            ),
          );
        }

        return Column(
          children: vehicles
              .map(
                (v) => _buildVehicleCard(Map<String, dynamic>.from(v as Map)),
              )
              .toList(),
        );
      },
    );
  }

  Widget _buildVehicleCard(Map<String, dynamic> v) {
    final plate = (v['plate_number'] ?? v['plateNumber'] ?? v['plate'] ?? '—')
        .toString();
    final brand = (v['brand'] ?? v['make'] ?? v['manufacturer'] ?? '')
        .toString();
    final model = (v['model'] ?? '').toString();
    final type = (v['type'] ?? v['vehicle_type'] ?? '').toString();
    final colorName = (v['color'] ?? '').toString();
    final isVerified = v['verified'] == true;

    final title = [brand, model].where((s) => s.isNotEmpty).join(' ').trim();
    final displayTitle = title.isNotEmpty
        ? title
        : (type.isNotEmpty ? type : 'Vehicle');

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withValues(alpha: 0.08),
            spreadRadius: 1,
            blurRadius: 8,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  Icons.directions_car,
                  color: Colors.blue.shade700,
                  size: 28,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            displayTitle,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Plate: $plate',
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey.shade600,
                      ),
                    ),
                    if (colorName.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Text(
                          'Color: $colorName',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey.shade500,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),

          // Report Stolen — only meaningful for verified vehicles
          if (isVerified) ...[
            const SizedBox(height: 12),
            const Divider(height: 1),
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: () => _showReportStolenDialog(v),
                icon: const Icon(Icons.report_problem, size: 18),
                label: const Text('Report Stolen'),
                style: TextButton.styleFrom(foregroundColor: Colors.red),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────
// Rental Management Tab
// ─────────────────────────────────────────
// ─────────────────────────────────────────
// Rental Management Tab — wired to RentalService
// ─────────────────────────────────────────
class RentalManagementTab extends StatefulWidget {
  const RentalManagementTab({super.key});

  @override
  State<RentalManagementTab> createState() => _RentalManagementTabState();
}

class _RentalManagementTabState extends State<RentalManagementTab> {
  // ── Send Rental Request form ───────────────────────────────
  final TextEditingController _renterEmailCtrl = TextEditingController();
  DateTime? _startDate;
  DateTime? _endDate;
  Map<String, dynamic>? _selectedVehicle; // selected from verified vehicles
  bool _isSending = false;

  // ── Data from backend ──────────────────────────────────────
  bool _loading = true;
  // ignore: unused_field
  String? _error;
  List<dynamic> _myVehicles = []; // verified vehicles for dropdown
  List<dynamic> _ownedRentals = []; // rentals I created (as owner)
  List<dynamic> _incomingRentals = []; // rentals offered to me (as renter)

  @override
  void initState() {
    super.initState();
    _loadAll();
  }

  @override
  void dispose() {
    _renterEmailCtrl.dispose();
    super.dispose();
  }

  // ── Load everything in parallel ────────────────────────────
  // Per-section error state
  // ignore: unused_field
  String? _vehiclesError;
  String? _ownedError;
  String? _incomingError;

  Future<void> _loadAll() async {
    setState(() {
      _loading = true;
      _error = null;
      _vehiclesError = null;
      _ownedError = null;
      _incomingError = null;
    });

    // Load each section independently — one failure won't block the others
    List<dynamic> vehicles = [], owned = [], incoming = [];
    String? vehiclesErr, ownedErr, incomingErr;

    await Future.wait([
      VehicleService.getMyVehicles().then((v) => vehicles = v).catchError((
        Object e,
      ) {
        vehiclesErr = _cleanError(e);
        debugPrint('[rental] vehicles error: $e');
        return <dynamic>[];
      }),
      RentalService.getMyOwnedRentals().then((v) => owned = v).catchError((
        Object e,
      ) {
        ownedErr = _cleanError(e);
        debugPrint('[rental] owned error: $e');
        return <dynamic>[];
      }),
      RentalService.getMyIncomingRentals().then((v) => incoming = v).catchError(
        (Object e) {
          incomingErr = _cleanError(e);
          debugPrint('[rental] incoming error: $e');
          return <dynamic>[];
        },
      ),
    ]);
    if (!mounted) return;

    debugPrint(
      '[rental] loaded — vehicles:${vehicles.length} owned:${owned.length} incoming:${incoming.length}',
    );

    setState(() {
      _myVehicles = vehicles;
      _ownedRentals = owned;
      _incomingRentals = incoming;
      _vehiclesError = vehiclesErr;
      _ownedError = ownedErr;
      _incomingError = incomingErr;
      _loading = false;
      if (_myVehicles.isNotEmpty && _selectedVehicle == null) {
        _selectedVehicle = Map<String, dynamic>.from(_myVehicles.first as Map);
      }
    });
  }

  // Treat "Validation failed" / 422 as empty list — not a visible error.
  // The backend returns 422 when a user has no rentals for a given filter.
  String? _cleanError(Object e) {
    final msg = e.toString().replaceFirst('Exception: ', '');
    if (msg.toLowerCase().contains('validation') ||
        msg.toLowerCase().contains('422')) {
      return null;
    }
    return msg;
  }

  // ── Pick a date ────────────────────────────────────────────
  Future<DateTime?> _pickDate({
    required String label,
    DateTime? firstDate,
  }) async {
    return showDatePicker(
      context: context,
      helpText: label,
      initialDate: firstDate ?? DateTime.now().add(const Duration(days: 1)),
      firstDate: firstDate ?? DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
  }

  // ── Send rental request ────────────────────────────────────
  Future<void> _sendRentalRequest() async {
    if (_selectedVehicle == null) {
      _snack('Please select a vehicle.', Colors.red);
      return;
    }
    final renterEmail = _renterEmailCtrl.text.trim();
    if (renterEmail.isEmpty) {
      _snack('Please enter the renter\'s email.', Colors.red);
      return;
    }
    if (_startDate == null) {
      _snack('Please select a start date.', Colors.red);
      return;
    }
    if (_endDate == null) {
      _snack('Please select an end date.', Colors.red);
      return;
    }
    if (!_endDate!.isAfter(_startDate!)) {
      _snack('End date must be after start date.', Colors.red);
      return;
    }

    final plate =
        (_selectedVehicle!['plate_number'] ??
                _selectedVehicle!['plateNumber'] ??
                _selectedVehicle!['plate'] ??
                '')
            .toString();

    if (plate.isEmpty) {
      _snack('Selected vehicle has no plate number.', Colors.red);
      return;
    }

    setState(() => _isSending = true);
    try {
      await RentalService.createRental(
        plateNumber: plate,
        renterEmail: renterEmail,
        startDate: _startDate!,
        endDate: _endDate!,
      );
      if (!mounted) return;
      _snack('Rental request sent ✓', Colors.green);
      // Reset form
      setState(() {
        _renterEmailCtrl.clear();
        _startDate = null;
        _endDate = null;
      });
      await _loadAll(); // refresh list
    } catch (e) {
      if (!mounted) return;
      _snack(
        e.toString().replaceFirst('Exception: ', ''),
        Colors.red,
        durationSeconds: 4,
      );
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  // ── Respond to incoming rental (accept / reject) ──────────
  Future<void> _respond(String rentalId, String status) async {
    try {
      await RentalService.respondToRental(rentalId: rentalId, status: status);
      if (!mounted) return;
      final label = status == RentalStatus.accepted ? 'accepted' : 'rejected';
      _snack(
        'Rental $label ✓',
        status == RentalStatus.accepted ? Colors.green : Colors.red,
      );
      await _loadAll();
    } catch (e) {
      if (!mounted) return;
      _snack(
        e.toString().replaceFirst('Exception: ', ''),
        Colors.red,
        durationSeconds: 4,
      );
    }
  }

  // ── Cancel a rental I created ──────────────────────────────
  Future<void> _cancel(String rentalId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel Rental'),
        content: const Text(
          'Are you sure you want to cancel this rental request?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('No'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text(
              'Cancel Rental',
              style: TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await RentalService.cancelRental(rentalId: rentalId);
      if (!mounted) return;
      _snack('Rental cancelled.', Colors.orange);
      await _loadAll();
    } catch (e) {
      if (!mounted) return;
      final msg = e.toString().replaceFirst('Exception: ', '');
      // DELETE is admin-only — show a helpful message instead
      if (msg.toLowerCase().contains('forbidden') ||
          msg.toLowerCase().contains('403')) {
        _snack(
          'Only admins can delete rentals. Ask the renter to reject the request instead.',
          Colors.orange,
          durationSeconds: 5,
        );
      } else {
        _snack(msg, Colors.red, durationSeconds: 4);
      }
    }
  }

  void _snack(String text, Color color, {int durationSeconds = 3}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(text),
        backgroundColor: color,
        duration: Duration(seconds: durationSeconds),
      ),
    );
  }

  // ── Helpers ────────────────────────────────────────────────
  String _formatDate(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}/'
      '${d.month.toString().padLeft(2, '0')}/'
      '${d.year}';

  String _formatBackendDate(String? raw) {
    if (raw == null || raw.isEmpty) return '—';
    final d = DateTime.tryParse(raw);
    return d != null ? _formatDate(d) : raw;
  }

  Color _statusColor(String status) {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return Colors.orange;
      case 'ACCEPTED':
        return Colors.green;
      case 'REJECTED':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  // ── Build ──────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _loadAll,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ─ 1. Send Rental Request section ──────────────────
            _buildSendRequestCard(),
            const SizedBox(height: 28),

            // ─ 2. Rentals I created (as owner) ─────────────────
            _sectionTitle('Rental Requests I Sent'),
            const SizedBox(height: 12),
            _buildBody(
              loading: _loading,
              error: _ownedError,
              emptyIcon: Icons.send,
              emptyTitle: 'No rental requests sent yet',
              emptySubtitle:
                  'Use the form above to rent your vehicle to someone.',
              child: _buildOwnedRentalsList(),
            ),
            const SizedBox(height: 28),

            // ─ 3. Incoming rental requests (as renter) ─────────
            _sectionTitle('Incoming Rental Requests'),
            const SizedBox(height: 12),
            _buildBody(
              loading: _loading,
              error: _incomingError,
              emptyIcon: Icons.inbox,
              emptyTitle: 'No incoming requests',
              emptySubtitle:
                  'When someone sends you a rental request it will appear here.',
              child: _buildIncomingRentalsList(),
            ),
          ],
        ),
      ),
    );
  }

  // ── Send Request card ──────────────────────────────────────
  Widget _buildSendRequestCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withValues(alpha: 0.1),
            spreadRadius: 1,
            blurRadius: 10,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              Icon(Icons.send, color: Colors.blue.shade700, size: 24),
              const SizedBox(width: 10),
              Text(
                'Send Rental Request',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.bold,
                  color: Colors.blue.shade700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'Select one of your verified vehicles, set the rental period, '
            'and enter the renter\'s email.',
            style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
          ),
          const SizedBox(height: 20),

          // Vehicle dropdown
          Text(
            'Vehicle',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: Colors.grey.shade700,
            ),
          ),
          const SizedBox(height: 8),
          if (_myVehicles.isEmpty)
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.orange.shade50,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.orange.shade200),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.info_outline,
                    color: Colors.orange.shade700,
                    size: 18,
                  ),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text(
                      'No verified vehicles. Link a vehicle in the '
                      'Registered tab first.',
                      style: TextStyle(fontSize: 12),
                    ),
                  ),
                ],
              ),
            )
          else
            DropdownButtonFormField<String>(
              initialValue: _selectedVehicle != null
                  ? (_selectedVehicle!['ownership_id'] ??
                            _selectedVehicle!['vehicle_id'] ??
                            _selectedVehicle!['plate_number'])
                        ?.toString()
                  : null,
              decoration: InputDecoration(
                prefixIcon: const Icon(Icons.directions_car),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                filled: true,
                fillColor: Colors.grey.shade50,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 14,
                ),
              ),
              items: _myVehicles.map((v) {
                final vehicle = v as Map<String, dynamic>;
                final plate =
                    (vehicle['plate_number'] ??
                            vehicle['plateNumber'] ??
                            vehicle['plate'] ??
                            '—')
                        .toString();
                final brand = (vehicle['brand'] ?? vehicle['make'] ?? '')
                    .toString();
                final model = (vehicle['model'] ?? '').toString();
                final label = [
                  brand,
                  model,
                ].where((s) => s.isNotEmpty).join(' ').trim();
                final displayLabel = label.isNotEmpty
                    ? '$plate — $label'
                    : plate;
                final id =
                    (vehicle['ownership_id'] ?? vehicle['vehicle_id'] ?? plate)
                        .toString();
                return DropdownMenuItem<String>(
                  value: id,
                  child: Text(displayLabel, overflow: TextOverflow.ellipsis),
                );
              }).toList(),
              onChanged: _isSending
                  ? null
                  : (val) {
                      setState(() {
                        _selectedVehicle = _myVehicles
                            .map((v) => v as Map<String, dynamic>)
                            .firstWhere(
                              (v) =>
                                  (v['ownership_id'] ??
                                          v['vehicle_id'] ??
                                          v['plate_number'])
                                      ?.toString() ==
                                  val,
                              orElse: () => _selectedVehicle!,
                            );
                      });
                    },
            ),
          const SizedBox(height: 16),

          // Start date + End date (side by side)
          Row(
            children: [
              // Start date
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Start Date',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: Colors.grey.shade700,
                      ),
                    ),
                    const SizedBox(height: 8),
                    InkWell(
                      onTap: _isSending
                          ? null
                          : () async {
                              final d = await _pickDate(label: 'Start Date');
                              if (d != null) {
                                setState(() {
                                  _startDate = d;
                                  // Reset end date if it's before new start
                                  if (_endDate != null &&
                                      !_endDate!.isAfter(d)) {
                                    _endDate = null;
                                  }
                                });
                              }
                            },
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 14,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.grey.shade50,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.grey.shade400),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              Icons.calendar_today,
                              size: 18,
                              color: Colors.blue.shade700,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              _startDate != null
                                  ? _formatDate(_startDate!)
                                  : 'Select',
                              style: TextStyle(
                                fontSize: 14,
                                color: _startDate != null
                                    ? Colors.black87
                                    : Colors.grey,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              // End date
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'End Date',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: Colors.grey.shade700,
                      ),
                    ),
                    const SizedBox(height: 8),
                    InkWell(
                      onTap: _isSending
                          ? null
                          : () async {
                              final d = await _pickDate(
                                label: 'End Date',
                                firstDate: _startDate != null
                                    ? _startDate!.add(const Duration(days: 1))
                                    : DateTime.now().add(
                                        const Duration(days: 1),
                                      ),
                              );
                              if (d != null) setState(() => _endDate = d);
                            },
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 14,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.grey.shade50,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.grey.shade400),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              Icons.event,
                              size: 18,
                              color: Colors.blue.shade700,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              _endDate != null
                                  ? _formatDate(_endDate!)
                                  : 'Select',
                              style: TextStyle(
                                fontSize: 14,
                                color: _endDate != null
                                    ? Colors.black87
                                    : Colors.grey,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Renter email
          Text(
            'Renter\'s Email',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: Colors.grey.shade700,
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _renterEmailCtrl,
            enabled: !_isSending,
            keyboardType: TextInputType.emailAddress,
            decoration: InputDecoration(
              hintText: 'e.g. renter@example.com',
              prefixIcon: const Icon(Icons.email),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              filled: true,
              fillColor: Colors.grey.shade50,
            ),
          ),
          const SizedBox(height: 20),

          // Send button
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton.icon(
              onPressed: (_isSending || _myVehicles.isEmpty)
                  ? null
                  : _sendRentalRequest,
              icon: _isSending
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2.5,
                      ),
                    )
                  : const Icon(Icons.send, color: Colors.white),
              label: Text(
                _isSending ? 'Sending…' : 'Send Rental Request',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue.shade700,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Loading / error / empty wrapper ───────────────────────
  Widget _buildBody({
    required bool loading,
    required String? error,
    required IconData emptyIcon,
    required String emptyTitle,
    required String emptySubtitle,
    required Widget child,
  }) {
    if (loading) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 32),
        child: Center(child: CircularProgressIndicator()),
      );
    }
    if (error != null) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.red.shade50,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.red.shade200),
        ),
        child: Row(
          children: [
            Icon(Icons.error_outline, color: Colors.red.shade700),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                error,
                style: TextStyle(fontSize: 13, color: Colors.red.shade900),
              ),
            ),
            TextButton(onPressed: _loadAll, child: const Text('Retry')),
          ],
        ),
      );
    }
    return child;
  }

  // ── Rentals I created (as owner) ──────────────────────────
  Widget _buildOwnedRentalsList() {
    if (_ownedRentals.isEmpty) {
      return _emptyState(
        icon: Icons.send,
        title: 'No rental requests sent yet',
        subtitle: 'Use the form above to send a request.',
      );
    }
    return Column(
      children: _ownedRentals.map((r) {
        final rental = r as Map<String, dynamic>;
        final status = rental['status']?.toString() ?? 'PENDING';
        final plate = rental['plate_number']?.toString() ?? '—';
        final renter = rental['renter_email']?.toString() ?? '—';
        final start = _formatBackendDate(rental['start_date']?.toString());
        final end = _formatBackendDate(rental['end_date']?.toString());
        final id = rental['rental_id']?.toString() ?? '';

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(
                color: Colors.grey.withValues(alpha: 0.08),
                spreadRadius: 1,
                blurRadius: 6,
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header row
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: _statusColor(status).withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.car_rental,
                      color: _statusColor(status),
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          plate,
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 15,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'To: $renter',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey.shade600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  _statusBadge(status),
                ],
              ),
              const SizedBox(height: 10),
              // Dates
              Row(
                children: [
                  Icon(Icons.date_range, size: 14, color: Colors.grey.shade500),
                  const SizedBox(width: 6),
                  Text(
                    '$start → $end',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                ],
              ),
              // Cancel button (only for PENDING)
              if (status.toUpperCase() == 'PENDING' && id.isNotEmpty) ...[
                const SizedBox(height: 10),
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton.icon(
                    onPressed: () => _cancel(id),
                    icon: const Icon(
                      Icons.cancel_outlined,
                      size: 16,
                      color: Colors.red,
                    ),
                    label: const Text(
                      'Cancel Request',
                      style: TextStyle(color: Colors.red, fontSize: 13),
                    ),
                  ),
                ),
              ],
            ],
          ),
        );
      }).toList(),
    );
  }

  // ── Incoming rentals (as renter) ──────────────────────────
  Widget _buildIncomingRentalsList() {
    if (_incomingRentals.isEmpty) {
      return _emptyState(
        icon: Icons.inbox,
        title: 'No incoming requests',
        subtitle:
            'When someone sends you a rental request it will appear here.',
      );
    }
    return Column(
      children: _incomingRentals.map((r) {
        final rental = r as Map<String, dynamic>;
        final status = rental['status']?.toString() ?? 'PENDING';
        final plate = rental['plate_number']?.toString() ?? '—';
        final owner = rental['owner_email']?.toString() ?? '—';
        final start = _formatBackendDate(rental['start_date']?.toString());
        final end = _formatBackendDate(rental['end_date']?.toString());
        final id = rental['rental_id']?.toString() ?? '';
        final isPending = status.toUpperCase() == 'PENDING';

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: isPending ? Border.all(color: Colors.blue.shade200) : null,
            boxShadow: [
              BoxShadow(
                color: Colors.grey.withValues(alpha: 0.08),
                spreadRadius: 1,
                blurRadius: 6,
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: _statusColor(status).withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.car_rental,
                      color: _statusColor(status),
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          plate,
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 15,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'From: $owner',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey.shade600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  _statusBadge(status),
                ],
              ),
              const SizedBox(height: 10),
              // Dates
              Row(
                children: [
                  Icon(Icons.date_range, size: 14, color: Colors.grey.shade500),
                  const SizedBox(width: 6),
                  Text(
                    '$start → $end',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                ],
              ),
              // Accept / Reject buttons — only for PENDING
              if (isPending && id.isNotEmpty) ...[
                const SizedBox(height: 12),
                const Divider(height: 1),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () => _respond(id, RentalStatus.accepted),
                        icon: const Icon(
                          Icons.check,
                          color: Colors.white,
                          size: 18,
                        ),
                        label: const Text(
                          'Accept',
                          style: TextStyle(color: Colors.white),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.green,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => _respond(id, RentalStatus.rejected),
                        icon: const Icon(
                          Icons.close,
                          color: Colors.red,
                          size: 18,
                        ),
                        label: const Text(
                          'Reject',
                          style: TextStyle(color: Colors.red),
                        ),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Colors.red),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        );
      }).toList(),
    );
  }

  // ── Reusable widgets ───────────────────────────────────────
  Widget _sectionTitle(String title) => Text(
    title,
    style: TextStyle(
      fontSize: 18,
      fontWeight: FontWeight.bold,
      color: Colors.grey.shade800,
    ),
  );

  Widget _statusBadge(String status) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: _statusColor(status),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        status.toUpperCase(),
        style: const TextStyle(
          color: Colors.white,
          fontSize: 10,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _emptyState({
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    return Container(
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Center(
        child: Column(
          children: [
            Icon(icon, size: 44, color: Colors.grey.shade400),
            const SizedBox(height: 10),
            Text(
              title,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Colors.grey.shade600,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: Colors.grey.shade400),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────
// ─────────────────────────────────────────
// History Tab
// ─────────────────────────────────────────
class HistoryTab extends StatefulWidget {
  const HistoryTab({super.key});

  @override
  State<HistoryTab> createState() => _HistoryTabState();
}

class _HistoryTabState extends State<HistoryTab>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  bool _loading = true;
  String? _error;
  List<dynamic> _allTickets = [];
  List<dynamic> _payments = [];

  static const _statuses = ['ALL', 'UNPAID', 'PAID', 'DISPUTED', 'CANCELLED'];
  String _selectedStatus = 'ALL';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final ticketResults = await Future.wait([
        TicketService.getMyTicketsList(status: TicketStatus.unpaid),
        TicketService.getMyTicketsList(status: TicketStatus.paid),
        TicketService.getMyTicketsList(status: TicketStatus.disputed),
        TicketService.getMyTicketsList(status: TicketStatus.cancelled),
      ]);

      Map<String, dynamic> paymentData = {'data': []};
      try {
        paymentData = await PaymentService.getMyPayments();
      } catch (e) {
        debugPrint('[history] payments error (non-fatal): $e');
      }

      final allTickets = [
        ...ticketResults[0],
        ...ticketResults[1],
        ...ticketResults[2],
        ...ticketResults[3],
      ];

      allTickets.sort((a, b) {
        final aDate =
            DateTime.tryParse((a as Map)['issued_at']?.toString() ?? '') ??
            DateTime(2000);
        final bDate =
            DateTime.tryParse((b as Map)['issued_at']?.toString() ?? '') ??
            DateTime(2000);
        return bDate.compareTo(aDate);
      });

      if (!mounted) return;
      setState(() {
        _allTickets = allTickets;
        _payments = (paymentData['data'] as List?) ?? [];
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  List<dynamic> get _filteredTickets {
    if (_selectedStatus == 'ALL') return _allTickets;
    return _allTickets
        .where((t) => (t as Map)['status']?.toString() == _selectedStatus)
        .toList();
  }

  String _fmt(String? raw) {
    if (raw == null || raw.isEmpty) return '—';
    final d = DateTime.tryParse(raw);
    if (d == null) return raw;
    return '${d.day.toString().padLeft(2, '0')}/'
        '${d.month.toString().padLeft(2, '0')}/'
        '${d.year}  '
        '${d.hour.toString().padLeft(2, '0')}:'
        '${d.minute.toString().padLeft(2, '0')}';
  }

  Color _statusColor(String s) {
    switch (s.toUpperCase()) {
      case 'PAID':
        return Colors.green;
      case 'UNPAID':
        return Colors.orange;
      case 'DISPUTED':
        return Colors.purple;
      case 'CANCELLED':
        return Colors.grey;
      default:
        return Colors.blue;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade100,
      appBar: AppBar(
        title: const Text('History'),
        backgroundColor: Colors.blue.shade700,
        foregroundColor: Colors.white,
        automaticallyImplyLeading: false,
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _load),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: const [
            Tab(text: 'Tickets'),
            Tab(text: 'Payments'),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
          ? _buildError()
          : TabBarView(
              controller: _tabController,
              children: [_buildTicketsTab(), _buildPaymentsTab()],
            ),
    );
  }

  Widget _buildError() => Center(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 60, color: Colors.red.shade400),
          const SizedBox(height: 16),
          Text(
            _error!,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.grey),
          ),
          const SizedBox(height: 20),
          ElevatedButton.icon(
            onPressed: _load,
            icon: const Icon(Icons.refresh),
            label: const Text('Retry'),
          ),
        ],
      ),
    ),
  );

  Widget _buildTicketsTab() {
    return Column(
      children: [
        Container(
          color: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: _statuses.map((s) {
                final selected = _selectedStatus == s;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    label: Text(s),
                    selected: selected,
                    onSelected: (_) => setState(() => _selectedStatus = s),
                    selectedColor: Colors.blue.shade700,
                    labelStyle: TextStyle(
                      color: selected ? Colors.white : Colors.black87,
                      fontWeight: selected
                          ? FontWeight.bold
                          : FontWeight.normal,
                    ),
                    checkmarkColor: Colors.white,
                  ),
                );
              }).toList(),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 4),
          child: Align(
            alignment: Alignment.centerLeft,
            child: Text(
              '${_filteredTickets.length} ticket${_filteredTickets.length == 1 ? "" : "s"}',
              style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
            ),
          ),
        ),
        Expanded(
          child: _filteredTickets.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.receipt_long,
                        size: 70,
                        color: Colors.grey.shade300,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        _selectedStatus == 'ALL'
                            ? 'No tickets yet'
                            : 'No $_selectedStatus tickets',
                        style: TextStyle(
                          color: Colors.grey.shade500,
                          fontSize: 16,
                        ),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
                    itemCount: _filteredTickets.length,
                    itemBuilder: (_, i) =>
                        _buildTicketCard(_filteredTickets[i] as Map),
                  ),
                ),
        ),
      ],
    );
  }

  Widget _buildTicketCard(Map ticket) {
    final status = ticket['status']?.toString() ?? 'UNPAID';
    final plate = ticket['plate_number']?.toString() ?? '—';
    final gate = ticket['gate_name']?.toString() ?? '—';
    final zone = ticket['zone_name']?.toString() ?? '';
    final direction = ticket['direction']?.toString() ?? '';
    final price = double.tryParse(ticket['price']?.toString() ?? '0') ?? 0.0;
    final chargedAs = ticket['charged_as']?.toString() ?? '';
    final issuedAt = _fmt(ticket['issued_at']?.toString());
    final color = _statusColor(status);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withValues(alpha: 0.08),
            blurRadius: 8,
            spreadRadius: 1,
          ),
        ],
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.08),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(14),
                topRight: Radius.circular(14),
              ),
            ),
            child: Row(
              children: [
                Icon(Icons.confirmation_number, color: color, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    plate,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                      color: color,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: color,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    status,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              children: [
                _row(
                  Icons.location_on,
                  'Gate',
                  zone.isNotEmpty ? '$gate — $zone' : gate,
                ),
                if (direction.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  _row(Icons.swap_horiz, 'Direction', direction),
                ],
                const SizedBox(height: 8),
                _row(Icons.access_time, 'Issued', issuedAt),
                if (chargedAs.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  _row(Icons.person, 'Charged as', chargedAs),
                ],
                const Divider(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Amount',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      '${price.toStringAsFixed(2)} LE',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.blue.shade700,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _row(IconData icon, String label, String value) => Row(
    children: [
      Icon(icon, size: 16, color: Colors.grey.shade500),
      const SizedBox(width: 8),
      Text(
        '$label: ',
        style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
      ),
      Expanded(
        child: Text(
          value,
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          overflow: TextOverflow.ellipsis,
        ),
      ),
    ],
  );

  Widget _buildPaymentsTab() {
    if (_payments.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.payment, size: 70, color: Colors.grey.shade300),
            const SizedBox(height: 12),
            Text(
              'No payments yet',
              style: TextStyle(color: Colors.grey.shade500, fontSize: 16),
            ),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _payments.length,
        itemBuilder: (_, i) => _buildPaymentCard(_payments[i] as Map),
      ),
    );
  }

  Widget _buildPaymentCard(Map payment) {
    final amount = double.tryParse(payment['amount']?.toString() ?? '0') ?? 0.0;
    final status = payment['status']?.toString() ?? '—';
    final method = payment['payment_method']?.toString() ?? '—';
    final paidAt = _fmt(payment['paid_at']?.toString());

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withValues(alpha: 0.08),
            blurRadius: 8,
            spreadRadius: 1,
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.green.shade50,
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.check_circle,
              color: Colors.green.shade700,
              size: 24,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  method,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  paidAt,
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                ),
                const SizedBox(height: 2),
                Text(
                  status,
                  style: TextStyle(fontSize: 11, color: Colors.green.shade700),
                ),
              ],
            ),
          ),
          Text(
            '${amount.toStringAsFixed(2)} LE',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.blue.shade700,
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────
// Login Page — wired to AuthService.login()
// ─────────────────────────────────────────
class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => LoginPageState();
}

class LoginPageState extends State<LoginPage> {
  final TextEditingController emailController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();

  bool _isSubmitting = false;
  bool _obscurePassword = true;

  @override
  void dispose() {
    emailController.dispose();
    passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    final email = emailController.text.trim();
    final password = passwordController.text;

    debugPrint('═══ [login] _handleLogin called ═══');
    debugPrint('  email    : "$email"');
    debugPrint('  password : ${password.length} chars');
    debugPrint('═════════════════════════════════');

    if (email.isEmpty) {
      debugPrint('[login] ❌ STOPPED: email empty');
      _snack('Please enter your email!', Colors.red);
      return;
    }
    if (password.isEmpty) {
      debugPrint('[login] ❌ STOPPED: password empty');
      _snack('Please enter your password!', Colors.red);
      return;
    }
    if (!Validators.isValidEmail(email)) {
      debugPrint('[login] ❌ STOPPED: invalid email format');
      _snack('Please enter a valid email address!', Colors.red);
      return;
    }

    debugPrint(
      '[login] ✅ Validation passed — calling backend POST /auth/login',
    );

    setState(() => _isSubmitting = true);

    try {
      final result = await AuthService.login(email: email, password: password);

      debugPrint('═══ [login] Backend response ═══');
      debugPrint('  result keys : ${result.keys.toList()}');
      debugPrint('  status      : ${result['status']}');
      debugPrint('  has token   : ${result['token'] != null}');
      debugPrint('  account     : ${result['account']}');
      debugPrint('═════════════════════════════════');

      if (result['token'] == null) {
        debugPrint('[login] ❌ Response had no token — refusing to navigate');
        _snack('Login response was incomplete. Please try again.', Colors.red);
        return;
      }

      final account = result['account'] as Map<String, dynamic>?;
      if (account != null) {
        UserSession.email = account['email']?.toString() ?? email;
        UserSession.firstName = account['first_name']?.toString() ?? '';
        UserSession.lastName = account['last_name']?.toString() ?? '';
      }

      debugPrint('[login] ✅ Login successful — navigating to HomePage');

      if (!mounted) return;
      _snack('Welcome back! 👋', Colors.green);

      await Future.delayed(const Duration(milliseconds: 600));
      if (!mounted) return;

      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => HomePage(userEmail: email)),
      );
    } catch (e) {
      debugPrint('[login] ❌ Login failed: $e');
      if (!mounted) return;
      final msg = e.toString().replaceFirst('Exception: ', '');
      _snack(msg, Colors.red, durationSeconds: 4);
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  void _snack(String text, Color color, {int durationSeconds = 3}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(text),
        backgroundColor: color,
        duration: Duration(seconds: durationSeconds),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Stack(
          children: [
            Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.local_parking,
                      size: 100,
                      color: Colors.blue.shade700,
                    ),
                    const SizedBox(height: 20),
                    Text(
                      'Auto Pass',
                      style: TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                        color: Colors.blue.shade700,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      'Login to your account',
                      style: TextStyle(
                        fontSize: 16,
                        color: Colors.grey.shade600,
                      ),
                    ),
                    const SizedBox(height: 40),

                    TextField(
                      controller: emailController,
                      enabled: !_isSubmitting,
                      decoration: InputDecoration(
                        labelText: 'Email',
                        hintText: 'Enter your email',
                        prefixIcon: const Icon(Icons.email),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        filled: true,
                        fillColor: Colors.grey.shade50,
                      ),
                      keyboardType: TextInputType.emailAddress,
                      textInputAction: TextInputAction.next,
                    ),
                    const SizedBox(height: 20),

                    TextField(
                      controller: passwordController,
                      enabled: !_isSubmitting,
                      obscureText: _obscurePassword,
                      onSubmitted: (_) => _handleLogin(),
                      decoration: InputDecoration(
                        labelText: 'Password',
                        hintText: 'Enter your password',
                        prefixIcon: const Icon(Icons.lock),
                        suffixIcon: IconButton(
                          icon: Icon(
                            _obscurePassword
                                ? Icons.visibility_off
                                : Icons.visibility,
                          ),
                          onPressed: () {
                            setState(() {
                              _obscurePassword = !_obscurePassword;
                            });
                          },
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        filled: true,
                        fillColor: Colors.grey.shade50,
                      ),
                    ),
                    const SizedBox(height: 30),

                    SizedBox(
                      width: double.infinity,
                      height: 55,
                      child: ElevatedButton(
                        onPressed: _isSubmitting ? null : _handleLogin,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blue.shade700,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: _isSubmitting
                            ? const SizedBox(
                                height: 24,
                                width: 24,
                                child: CircularProgressIndicator(
                                  color: Colors.white,
                                  strokeWidth: 3,
                                ),
                              )
                            : const Text(
                                'Log In',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                      ),
                    ),
                    const SizedBox(height: 15),

                    SizedBox(
                      width: double.infinity,
                      height: 55,
                      child: OutlinedButton(
                        onPressed: _isSubmitting
                            ? null
                            : () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) =>
                                        const RegistrationPage(),
                                  ),
                                );
                              },
                        style: OutlinedButton.styleFrom(
                          side: BorderSide(
                            color: Colors.blue.shade700,
                            width: 2,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: Text(
                          'Register',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.blue.shade700,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),

                    TextButton(
                      onPressed: _isSubmitting
                          ? null
                          : () {
                              _snack(
                                'Forgot password is not yet implemented.',
                                Colors.orange,
                              );
                            },
                      child: Text(
                        'Forgot Password?',
                        style: TextStyle(
                          color: Colors.blue.shade700,
                          fontSize: 14,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            if (_isSubmitting)
              Positioned.fill(
                child: ColoredBox(
                  color: Colors.black.withValues(alpha: 0.3),
                  child: const Center(
                    child: Card(
                      child: Padding(
                        padding: EdgeInsets.all(20),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            CircularProgressIndicator(),
                            SizedBox(height: 16),
                            Text(
                              'Signing you in…',
                              style: TextStyle(fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────
// Registration Page — wired to AuthService.register()
// ─────────────────────────────────────────
class RegistrationPage extends StatefulWidget {
  const RegistrationPage({super.key});

  @override
  State<RegistrationPage> createState() => RegistrationPageState();
}

class RegistrationPageState extends State<RegistrationPage> {
  final TextEditingController firstNameController = TextEditingController();
  final TextEditingController middleNameController = TextEditingController();
  final TextEditingController lastNameController = TextEditingController();
  final TextEditingController nationalIdController = TextEditingController();
  final TextEditingController phoneController = TextEditingController();
  final TextEditingController addressController = TextEditingController();
  final TextEditingController emailController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();
  final TextEditingController confirmPasswordController =
      TextEditingController();

  DateTime? selectedDate;

  XFile? _frontIdImage;

  double _passwordStrength = 0.0;
  bool _showPasswordRequirements = false;
  bool _isSubmitting = false;

  @override
  void dispose() {
    firstNameController.dispose();
    middleNameController.dispose();
    lastNameController.dispose();
    nationalIdController.dispose();
    phoneController.dispose();
    addressController.dispose();
    emailController.dispose();
    passwordController.dispose();
    confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _selectDate(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: DateTime(2000),
      firstDate: DateTime(1950),
      lastDate: DateTime.now(),
    );
    if (picked != null && picked != selectedDate) {
      setState(() => selectedDate = picked);
    }
  }

  Future<void> _uploadPhoto() async {
    debugPrint('[register] _uploadPhoto called');
    final picker = ImagePicker();

    ImageSource? source;
    if (kIsWeb) {
      source = ImageSource.gallery;
      debugPrint('[register] kIsWeb=true → forcing gallery');
    } else {
      source = await showModalBottomSheet<ImageSource>(
        context: context,
        builder: (ctx) => SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.photo_camera),
                title: const Text('Take a photo'),
                onTap: () => Navigator.pop(ctx, ImageSource.camera),
              ),
              ListTile(
                leading: const Icon(Icons.photo_library),
                title: const Text('Choose from gallery'),
                onTap: () => Navigator.pop(ctx, ImageSource.gallery),
              ),
            ],
          ),
        ),
      );
      if (source == null) {
        debugPrint('[register] User cancelled the source picker');
        return;
      }
    }

    debugPrint('[register] Calling picker.pickImage(source=$source)…');
    try {
      final picked = await picker.pickImage(source: source);

      if (picked == null) {
        debugPrint('[register] pickImage returned null — user cancelled');
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('No image selected.'),
            backgroundColor: Colors.orange,
          ),
        );
        return;
      }

      debugPrint('[register] Got image: ${picked.name} (path=${picked.path})');

      setState(() => _frontIdImage = picked);

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('National ID photo selected ✓ (${picked.name})'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e, st) {
      debugPrint('[register] pickImage threw: $e');
      debugPrint('$st');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Could not pick image: $e'),
          backgroundColor: Colors.red,
          duration: const Duration(seconds: 5),
        ),
      );
    }
  }

  Future<void> _submitRegistration() async {
    debugPrint('═══ [register] _submitRegistration called ═══');
    debugPrint('  firstName  : "${firstNameController.text}"');
    debugPrint('  middleName : "${middleNameController.text}"');
    debugPrint('  lastName   : "${lastNameController.text}"');
    debugPrint(
      '  nationalId : "${nationalIdController.text}" '
      '(len=${nationalIdController.text.trim().length})',
    );
    debugPrint('  phone      : "${phoneController.text}"');
    debugPrint('  email      : "${emailController.text}"');
    debugPrint('  address    : "${addressController.text}"');
    debugPrint('  password   : ${passwordController.text.length} chars');
    debugPrint('  confirmPwd : ${confirmPasswordController.text.length} chars');
    debugPrint('  selectedDate : $selectedDate');
    debugPrint('  _frontIdImage: ${_frontIdImage?.name ?? "NULL"}');
    debugPrint('═════════════════════════════════════════');

    if (!Validators.isValidEmail(emailController.text.trim())) {
      debugPrint('[register] ❌ STOPPED: invalid email');
      _snack('Please enter a valid email address!', Colors.red);
      return;
    }

    final passwordError = Validators.validatePassword(passwordController.text);
    if (passwordError != null) {
      debugPrint('[register] ❌ STOPPED: password — $passwordError');
      _snack(passwordError, Colors.red);
      return;
    }

    if (passwordController.text != confirmPasswordController.text) {
      debugPrint('[register] ❌ STOPPED: passwords don\'t match');
      _snack('Passwords do not match!', Colors.red);
      return;
    }

    final phone = phoneController.text.trim();
    if (phone.length < 10) {
      debugPrint('[register] ❌ STOPPED: phone too short (${phone.length})');
      _snack(
        'Please enter a valid phone number (e.g. +201001234567)',
        Colors.red,
      );
      return;
    }

    if (firstNameController.text.trim().isEmpty) {
      debugPrint('[register] ❌ STOPPED: first name empty');
      _snack('Please enter your first name!', Colors.red);
      return;
    }
    if (middleNameController.text.trim().isEmpty) {
      debugPrint('[register] ❌ STOPPED: middle name empty');
      _snack('Please enter your middle name!', Colors.red);
      return;
    }
    if (lastNameController.text.trim().isEmpty) {
      debugPrint('[register] ❌ STOPPED: last name empty');
      _snack('Please enter your last name!', Colors.red);
      return;
    }
    if (nationalIdController.text.trim().length != 14) {
      debugPrint('[register] ❌ STOPPED: national ID not 14 digits');
      _snack('National ID must be exactly 14 digits!', Colors.red);
      return;
    }
    if (selectedDate == null) {
      debugPrint('[register] ❌ STOPPED: no date of birth');
      _snack('Please select your date of birth!', Colors.red);
      return;
    }
    if (addressController.text.trim().isEmpty) {
      debugPrint('[register] ❌ STOPPED: address empty');
      _snack('Please enter your address!', Colors.red);
      return;
    }
    if (_frontIdImage == null) {
      debugPrint('[register] ❌ STOPPED: no national ID photo');
      _snack('Please upload your National ID photo!', Colors.red);
      return;
    }

    debugPrint('[register] ✅ All client-side checks passed — calling backend');

    setState(() => _isSubmitting = true);

    try {
      final dob =
          '${selectedDate!.year}-'
          '${selectedDate!.month.toString().padLeft(2, '0')}-'
          '${selectedDate!.day.toString().padLeft(2, '0')}';

      await AuthService.register(
        email: emailController.text.trim(),
        password: passwordController.text,
        firstName: firstNameController.text.trim(),
        middleName: middleNameController.text.trim(),
        lastName: lastNameController.text.trim(),
        nationalId: nationalIdController.text.trim(),
        phoneNumber: phone,
        address: addressController.text.trim(),
        dateOfBirth: dob,
        nationalIdImage: _frontIdImage!,
      );

      if (!mounted) return;
      _snack('Account created! You can now log in. ✓', Colors.green);

      await Future.delayed(const Duration(milliseconds: 1500));
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (!mounted) return;
      final msg = e.toString().replaceFirst('Exception: ', '');
      _snack(msg, Colors.red, durationSeconds: 5);
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  void _snack(String text, Color color, {int durationSeconds = 3}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(text),
        backgroundColor: color,
        duration: Duration(seconds: durationSeconds),
      ),
    );
  }

  Widget _buildRequirement(String text, bool satisfied) {
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Row(
        children: [
          Icon(
            satisfied ? Icons.check_circle : Icons.cancel,
            size: 16,
            color: satisfied ? Colors.green : Colors.grey,
          ),
          const SizedBox(width: 6),
          Text(
            text,
            style: TextStyle(
              fontSize: 11,
              color: satisfied ? Colors.green.shade700 : Colors.grey.shade600,
              decoration: satisfied ? TextDecoration.lineThrough : null,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Create Account'),
        backgroundColor: Colors.blue.shade700,
        foregroundColor: Colors.white,
      ),
      body: SafeArea(
        child: Stack(
          children: [
            SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _sectionLabel('Personal Information'),
                  const SizedBox(height: 15),

                  _buildField(
                    firstNameController,
                    'First Name',
                    'Enter your first name',
                    Icons.person,
                  ),
                  const SizedBox(height: 15),

                  _buildField(
                    middleNameController,
                    'Middle Name',
                    'Enter your middle name',
                    Icons.person_outline,
                  ),
                  const SizedBox(height: 15),

                  _buildField(
                    lastNameController,
                    'Last Name',
                    'Enter your last name',
                    Icons.person,
                  ),
                  const SizedBox(height: 15),

                  _buildField(
                    nationalIdController,
                    'National ID',
                    'Enter your 14-digit national ID',
                    Icons.badge,
                    keyboardType: TextInputType.number,
                  ),
                  const SizedBox(height: 15),

                  _buildField(
                    phoneController,
                    'Phone Number',
                    'e.g. +201001234567',
                    Icons.phone,
                    keyboardType: TextInputType.phone,
                  ),
                  const SizedBox(height: 15),

                  InkWell(
                    onTap: () => _selectDate(context),
                    child: Container(
                      padding: const EdgeInsets.all(15),
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.grey.shade400),
                        borderRadius: BorderRadius.circular(12),
                        color: Colors.grey.shade50,
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.calendar_today, color: Colors.grey),
                          const SizedBox(width: 10),
                          Text(
                            selectedDate == null
                                ? 'Select your date of birth'
                                : '${selectedDate!.day}/${selectedDate!.month}/${selectedDate!.year}',
                            style: TextStyle(
                              color: selectedDate == null
                                  ? Colors.grey
                                  : Colors.black,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 15),

                  TextField(
                    controller: addressController,
                    decoration: InputDecoration(
                      labelText: 'Address',
                      hintText: 'Enter your full address',
                      prefixIcon: const Icon(Icons.home),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      filled: true,
                      fillColor: Colors.grey.shade50,
                    ),
                    maxLines: 2,
                  ),
                  const SizedBox(height: 25),

                  _sectionLabel('Upload National ID'),
                  const SizedBox(height: 15),

                  _buildUploadBox(
                    uploaded: _frontIdImage != null,
                    uploadedLabel: 'National ID Uploaded ✓',
                    pendingLabel: 'Upload Front of National ID',
                    icon: Icons.credit_card,
                    onTap: _uploadPhoto,
                    buttonLabel: _frontIdImage != null
                        ? 'Change Photo'
                        : 'Choose Photo',
                  ),
                  const SizedBox(height: 25),

                  _sectionLabel('Account Credentials'),
                  const SizedBox(height: 15),

                  _buildField(
                    emailController,
                    'Email',
                    'Enter your email',
                    Icons.email,
                    keyboardType: TextInputType.emailAddress,
                  ),
                  const SizedBox(height: 15),

                  TextField(
                    controller: passwordController,
                    obscureText: true,
                    onChanged: (value) {
                      setState(() {
                        _passwordStrength = Validators.getPasswordStrength(
                          value,
                        );
                      });
                    },
                    onTap: () {
                      setState(() {
                        _showPasswordRequirements = true;
                      });
                    },
                    decoration: InputDecoration(
                      labelText: 'Password',
                      hintText: 'Create a strong password',
                      prefixIcon: const Icon(Icons.lock),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      filled: true,
                      fillColor: Colors.grey.shade50,
                    ),
                  ),
                  const SizedBox(height: 8),

                  if (passwordController.text.isNotEmpty)
                    Column(
                      children: [
                        LinearProgressIndicator(
                          value: _passwordStrength,
                          backgroundColor: Colors.grey.shade200,
                          color: Validators.getPasswordStrengthColor(
                            _passwordStrength,
                          ),
                          minHeight: 6,
                          borderRadius: BorderRadius.circular(3),
                        ),
                        const SizedBox(height: 4),
                        Align(
                          alignment: Alignment.centerRight,
                          child: Text(
                            Validators.getPasswordStrengthText(
                              _passwordStrength,
                            ),
                            style: TextStyle(
                              fontSize: 12,
                              color: Validators.getPasswordStrengthColor(
                                _passwordStrength,
                              ),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),

                  if (_showPasswordRequirements)
                    Container(
                      margin: const EdgeInsets.only(top: 8),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.blue.shade50,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.blue.shade200),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Password Requirements:',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: Colors.blue.shade700,
                            ),
                          ),
                          const SizedBox(height: 6),
                          _buildRequirement(
                            'At least 8 characters',
                            passwordController.text.length >= 8,
                          ),
                          _buildRequirement(
                            'Uppercase letter (A-Z)',
                            passwordController.text.contains(RegExp(r'[A-Z]')),
                          ),
                          _buildRequirement(
                            'Lowercase letter (a-z)',
                            passwordController.text.contains(RegExp(r'[a-z]')),
                          ),
                          _buildRequirement(
                            'Number (0-9)',
                            passwordController.text.contains(RegExp(r'[0-9]')),
                          ),
                          _buildRequirement(
                            'Special character (!@#\$...)',
                            passwordController.text.contains(
                              RegExp(r'[!@#\$%^&*()_+\-=\[\]{};:,.<>?]'),
                            ),
                          ),
                        ],
                      ),
                    ),

                  const SizedBox(height: 15),
                  _buildField(
                    confirmPasswordController,
                    'Confirm Password',
                    'Re-enter your password',
                    Icons.lock_outline,
                    obscure: true,
                  ),
                  const SizedBox(height: 30),

                  SizedBox(
                    width: double.infinity,
                    height: 55,
                    child: ElevatedButton(
                      onPressed: _isSubmitting ? null : _submitRegistration,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue.shade700,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: _isSubmitting
                          ? const SizedBox(
                              height: 24,
                              width: 24,
                              child: CircularProgressIndicator(
                                color: Colors.white,
                                strokeWidth: 3,
                              ),
                            )
                          : const Text(
                              'Create Account',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                    ),
                  ),
                  const SizedBox(height: 15),

                  Center(
                    child: TextButton(
                      onPressed: _isSubmitting
                          ? null
                          : () => Navigator.pop(context),
                      child: Text(
                        'Already have an account? Login',
                        style: TextStyle(
                          color: Colors.blue.shade700,
                          fontSize: 14,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),

            if (_isSubmitting)
              Positioned.fill(
                child: ColoredBox(
                  color: Colors.black.withValues(alpha: 0.3),
                  child: const Center(
                    child: Card(
                      child: Padding(
                        padding: EdgeInsets.all(20),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            CircularProgressIndicator(),
                            SizedBox(height: 16),
                            Text(
                              'Creating your account…',
                              style: TextStyle(fontWeight: FontWeight.bold),
                            ),
                            SizedBox(height: 4),
                            Text(
                              'Verifying your national ID, this may take a few seconds.',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _sectionLabel(String label) {
    return Text(
      label,
      style: TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.bold,
        color: Colors.grey.shade800,
      ),
    );
  }

  Widget _buildField(
    TextEditingController controller,
    String label,
    String hint,
    IconData icon, {
    bool obscure = false,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return TextField(
      controller: controller,
      obscureText: obscure,
      keyboardType: keyboardType,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        prefixIcon: Icon(icon),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        filled: true,
        fillColor: Colors.grey.shade50,
      ),
    );
  }

  Widget _buildUploadBox({
    required bool uploaded,
    required String uploadedLabel,
    required String pendingLabel,
    required IconData icon,
    required VoidCallback onTap,
    required String buttonLabel,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: uploaded ? Colors.green : Colors.grey.shade300,
        ),
      ),
      child: Column(
        children: [
          Icon(
            uploaded ? Icons.check_circle : icon,
            size: 50,
            color: uploaded ? Colors.green : Colors.grey,
          ),
          const SizedBox(height: 10),
          Text(
            uploaded ? uploadedLabel : pendingLabel,
            style: TextStyle(
              fontWeight: FontWeight.bold,
              color: uploaded ? Colors.green : Colors.grey.shade700,
            ),
          ),
          const SizedBox(height: 10),
          ElevatedButton.icon(
            onPressed: onTap,
            icon: const Icon(Icons.upload),
            label: Text(buttonLabel),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.blue.shade700,
              foregroundColor: Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}
