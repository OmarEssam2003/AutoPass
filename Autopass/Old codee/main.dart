import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:async';

void main() {
  runApp(const AutoPassApp());
}

class AutoPassApp extends StatelessWidget {
  const AutoPassApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AutoPass',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        primarySwatch: Colors.blue,
        useMaterial3: true,
      ),
      home: const SplashScreen(),
    );
  }
}

// ─────────────────────────────────────────
// Validation Helpers
// ─────────────────────────────────────────
class Validators {
  static bool isValidEmail(String email) {
    final emailRegex = RegExp(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$');
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
    if (password.contains(RegExp(r'[!@#$%^&*()_+\-=\[\]{};:,.<>?]'))) strength += 0.2;
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
            const Text('Welcome Back!',
                style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white)),
            const SizedBox(height: 10),
            const Text('to Auto Pass',
                style: TextStyle(fontSize: 24, color: Colors.white70)),
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

  late List<Widget> _pages;

  @override
  void initState() {
    super.initState();
    _pages = [
      HomeTab(userEmail: widget.userEmail),
      const VehicleManagementPage(),
      const HistoryTab(),
    ];
  }

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
      _profileOpen = false;
    });
  }

  void _toggleProfile() {
    setState(() {
      _profileOpen = !_profileOpen;
    });
  }

  void _openNotifications() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const NotificationsPage()),
    ).then((_) => setState(() {}));
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
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    child: Row(
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('AutoPass',
                                style: TextStyle(
                                    fontSize: 24,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white)),
                            Text(widget.userEmail,
                                style: const TextStyle(fontSize: 12, color: Colors.white70)),
                          ],
                        ),
                        const Spacer(),
                        Stack(
                          children: [
                            IconButton(
                              icon: const Icon(Icons.notifications, color: Colors.white),
                              onPressed: _openNotifications,
                            ),
                            if (NotificationManager.unreadCount > 0)
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
                                    '${NotificationManager.unreadCount}',
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
          BottomNavigationBarItem(icon: Icon(Icons.directions_car), label: 'Vehicles'),
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
// Notifications Page
// ─────────────────────────────────────────
class NotificationsPage extends StatefulWidget {
  const NotificationsPage({super.key});

  @override
  State<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends State<NotificationsPage> {
  @override
  Widget build(BuildContext context) {
    final notifications = NotificationManager.all;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        backgroundColor: Colors.blue.shade700,
        foregroundColor: Colors.white,
        actions: [
          TextButton(
            onPressed: () {
              setState(() {
                NotificationManager.markAllAsRead();
              });
            },
            child: const Text(
              'Mark all read',
              style: TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
      body: notifications.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.notifications_none, size: 80, color: Colors.grey.shade400),
                  const SizedBox(height: 16),
                  Text(
                    'No notifications yet',
                    style: TextStyle(fontSize: 18, color: Colors.grey.shade600),
                  ),
                ],
              ),
            )
          : ListView.builder(
              itemCount: notifications.length,
              itemBuilder: (context, index) {
                final notification = notifications[index];
                return _buildNotificationCard(notification);
              },
            ),
    );
  }

  Widget _buildNotificationCard(NotificationItem notification) {
    IconData icon;
    Color iconColor;

    switch (notification.type) {
      case 'ticket':
        icon = Icons.receipt_long;
        iconColor = Colors.blue;
        break;
      case 'rental':
        icon = Icons.car_rental;
        iconColor = Colors.orange;
        break;
      case 'alert':
        icon = Icons.warning_amber;
        iconColor = Colors.red;
        break;
      default:
        icon = Icons.notifications;
        iconColor = Colors.grey;
    }

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: notification.isRead ? Colors.white : Colors.blue.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: notification.isRead ? Colors.grey.shade200 : Colors.blue.shade200,
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
          notification.title,
          style: TextStyle(
            fontWeight: notification.isRead ? FontWeight.normal : FontWeight.bold,
            fontSize: 15,
          ),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Text(
              notification.message,
              style: TextStyle(fontSize: 13, color: Colors.grey.shade700),
            ),
            const SizedBox(height: 6),
            Text(
              _formatTimestamp(notification.timestamp),
              style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
            ),
          ],
        ),
        onTap: () {
          setState(() {
            NotificationManager.markAsRead(notification.id);
          });
        },
        trailing: !notification.isRead
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
    final now = DateTime.now();
    final difference = now.difference(timestamp);

    if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d ago';
    } else {
      return '${timestamp.day}/${timestamp.month}/${timestamp.year}';
    }
  }
}

// ─────────────────────────────────────────
// Profile Sidebar
// ─────────────────────────────────────────
class ProfileSidebar extends StatefulWidget {
  final VoidCallback onClose;
  const ProfileSidebar({super.key, required this.onClose});

  @override
  State<ProfileSidebar> createState() => _ProfileSidebarState();
}

class _ProfileSidebarState extends State<ProfileSidebar> {
  bool _showPassword = false;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        boxShadow: [BoxShadow(color: Colors.black26, blurRadius: 16)],
      ),
      child: SafeArea(
        child: Column(
          children: [
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
                    UserSession.fullName.isNotEmpty ? UserSession.fullName : 'User',
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    UserSession.email.isNotEmpty ? UserSession.email : 'No email',
                    style: const TextStyle(fontSize: 13, color: Colors.white70),
                  ),
                ],
              ),
            ),

            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _sectionTitle('Account'),
                    _infoTile(Icons.email, 'Email', UserSession.email.isNotEmpty ? UserSession.email : '—'),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade50,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.grey.shade200),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.lock, size: 20, color: Colors.blue.shade700),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Password',
                                    style: TextStyle(fontSize: 11, color: Colors.grey)),
                                Text(
                                  _showPassword
                                      ? (UserSession.password.isNotEmpty ? UserSession.password : '—')
                                      : '••••••••',
                                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                                ),
                              ],
                            ),
                          ),
                          GestureDetector(
                            onTap: () => setState(() => _showPassword = !_showPassword),
                            child: Icon(
                              _showPassword ? Icons.visibility_off : Icons.visibility,
                              size: 20,
                              color: Colors.grey,
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),
                    _sectionTitle('Personal Information'),
                    _infoTile(Icons.person, 'First Name',
                        UserSession.firstName.isNotEmpty ? UserSession.firstName : '—'),
                    const SizedBox(height: 8),
                    _infoTile(Icons.person_outline, 'Surname',
                        UserSession.surname.isNotEmpty ? UserSession.surname : '—'),
                    const SizedBox(height: 8),
                    _infoTile(Icons.family_restroom, 'Last Name',
                        UserSession.lastName.isNotEmpty ? UserSession.lastName : '—'),
                    const SizedBox(height: 8),
                    _infoTile(Icons.credit_card, 'National ID',
                        UserSession.nationalId.isNotEmpty ? UserSession.nationalId : '—'),
                    const SizedBox(height: 8),
                    _infoTile(
                      Icons.calendar_today,
                      'Date of Birth',
                      UserSession.dateOfBirth != null
                          ? '${UserSession.dateOfBirth!.day}/${UserSession.dateOfBirth!.month}/${UserSession.dateOfBirth!.year}'
                          : '—',
                    ),
                    const SizedBox(height: 8),
                    _infoTile(Icons.home, 'Address',
                        UserSession.address.isNotEmpty ? UserSession.address : '—'),

                    const SizedBox(height: 30),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: () {
                          Navigator.pushAndRemoveUntil(
                            context,
                            MaterialPageRoute(builder: (_) => const LoginPage()),
                            (route) => false,
                          );
                        },
                        icon: const Icon(Icons.logout, color: Colors.red),
                        label: const Text('Logout', style: TextStyle(color: Colors.red)),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Colors.red),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
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

  Widget _sectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Text(title,
          style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.bold,
              color: Colors.blue.shade700,
              letterSpacing: 0.5)),
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
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
              Text(value,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
            ],
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────
// Home Tab
// ─────────────────────────────────────────
class HomeTab extends StatelessWidget {
  final String userEmail;
  const HomeTab({super.key, required this.userEmail});

  @override
  Widget build(BuildContext context) {
    final List<Map<String, dynamic>> tickets = [
      {
        'id': 'TKT-2025-001',
        'gate': 'Cairo Toll Gate',
        'date': '2026-01-24',
        'time': '10:30 AM',
        'plateNumber': 'ط س و 555',
        'price': 25.0,
        'isPaid': false,
      },
      {
        'id': 'TKT-2025-002',
        'gate': 'Alexandria Highway',
        'date': '2026-01-23',
        'time': '03:15 PM',
        'plateNumber': 'ط س و 555',
        'price': 30.0,
        'isPaid': true,
      },
      {
        'id': 'TKT-2025-003',
        'gate': 'Suez Road Gate',
        'date': '2026-01-22',
        'time': '08:45 AM',
        'plateNumber': 'ط س و 555',
        'price': 20.0,
        'isPaid': false,
      },
    ];

    return Scaffold(
      backgroundColor: Colors.grey.shade100,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
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
                const Text('Welcome Back!',
                    style: TextStyle(
                        fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white)),
                const SizedBox(height: 10),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _buildStatCard('Unpaid', '2', Colors.orange),
                    _buildStatCard('Paid', '1', Colors.green),
                    _buildStatCard('Total', '75 LE', Colors.white),
                  ],
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text('Temporary Tickets',
                style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.grey.shade800)),
          ),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: tickets.length,
              itemBuilder: (context, index) => _buildTicketCard(context, tickets[index]),
            ),
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
          Text(value,
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color)),
          const SizedBox(height: 4),
          Text(label, style: const TextStyle(fontSize: 12, color: Colors.white70)),
        ],
      ),
    );
  }

  Widget _buildTicketCard(BuildContext context, Map<String, dynamic> ticket) {
    final bool isPaid = ticket['isPaid'];
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
              color: Colors.grey.withValues(alpha: 0.1), spreadRadius: 1, blurRadius: 10)
        ],
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isPaid ? Colors.green.shade50 : Colors.orange.shade50,
              borderRadius:
                  const BorderRadius.only(topLeft: Radius.circular(16), topRight: Radius.circular(16)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(Icons.confirmation_number,
                        color: isPaid ? Colors.green : Colors.orange),
                    const SizedBox(width: 8),
                    Text(ticket['id'],
                        style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: isPaid ? Colors.green.shade700 : Colors.orange.shade700)),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: isPaid ? Colors.green : Colors.orange,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(isPaid ? 'PAID' : 'UNPAID',
                      style: const TextStyle(
                          color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                _buildTicketRow(Icons.location_on, 'Gate', ticket['gate']),
                const SizedBox(height: 12),
                _buildTicketRow(Icons.calendar_today, 'Date', ticket['date']),
                const SizedBox(height: 12),
                _buildTicketRow(Icons.access_time, 'Time', ticket['time']),
                const SizedBox(height: 12),
                _buildTicketRow(Icons.directions_car, 'Plate', ticket['plateNumber']),
                const Divider(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Amount:',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    Text('${ticket['price'].toStringAsFixed(2)} LE',
                        style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: Colors.blue.shade700)),
                  ],
                ),
                if (!isPaid) ...[
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                          content: Text('Payment feature coming soon!'),
                          backgroundColor: Colors.blue,
                        ));
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue.shade700,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Pay Now',
                          style: TextStyle(
                              fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
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
        Text('$label:', style: TextStyle(fontSize: 14, color: Colors.grey.shade600)),
        const SizedBox(width: 8),
        Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
      ],
    );
  }
}

// ─────────────────────────────────────────
// Vehicle Management Page with Tabs
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
        children: const [
          RegisteredVehiclesTab(),
          RentalManagementTab(),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────
// Registered Vehicles Tab
// ─────────────────────────────────────────
class RegisteredVehiclesTab extends StatefulWidget {
  const RegisteredVehiclesTab({super.key});

  @override
  State<RegisteredVehiclesTab> createState() => _RegisteredVehiclesTabState();
}

class _RegisteredVehiclesTabState extends State<RegisteredVehiclesTab> {
  final TextEditingController _plateController = TextEditingController();
  String? _selectedCarType;
  String? _selectedColor;

  final List<Map<String, String>> _registeredVehicles = [
    {'type': 'Toyota Corolla', 'plate': 'ط س و 555', 'color': 'White'},
    {'type': 'BMW X5', 'plate': 'أ ب ج 123', 'color': 'Black'},
  ];

  final List<String> _carTypes = [
    'Sedan',
    'SUV',
    'Hatchback',
    'Pickup Truck',
    'Van / Minivan',
    'Coupe',
    'Convertible',
    'Microbus',
    'Motorcycle',
    'Truck',
  ];

  final List<Map<String, dynamic>> _carColors = [
    {'name': 'White', 'color': Colors.white},
    {'name': 'Black', 'color': Colors.black},
    {'name': 'Silver', 'color': Colors.grey},
    {'name': 'Red', 'color': Colors.red},
    {'name': 'Blue', 'color': Colors.blue},
    {'name': 'Grey', 'color': Colors.blueGrey},
    {'name': 'Green', 'color': Colors.green},
    {'name': 'Yellow', 'color': Colors.yellow.shade700},
    {'name': 'Brown', 'color': Colors.brown},
    {'name': 'Orange', 'color': Colors.orange},
  ];

  @override
  void dispose() {
    _plateController.dispose();
    super.dispose();
  }

  void _registerVehicle() {
    if (_selectedCarType == null || _plateController.text.trim().isEmpty || _selectedColor == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Please fill all fields!'),
        backgroundColor: Colors.red,
      ));
      return;
    }

    setState(() {
      _registeredVehicles.add({
        'type': _selectedCarType!,
        'plate': _plateController.text.trim(),
        'color': _selectedColor!,
      });
      _selectedCarType = null;
      _selectedColor = null;
      _plateController.clear();
    });

    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
      content: Text('Vehicle registered successfully!'),
      backgroundColor: Colors.green,
    ));
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                    color: Colors.grey.withValues(alpha: 0.1),
                    spreadRadius: 1,
                    blurRadius: 10)
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.directions_car, color: Colors.blue.shade700, size: 28),
                    const SizedBox(width: 10),
                    Text('Register New Vehicle',
                        style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.blue.shade700)),
                  ],
                ),
                const SizedBox(height: 20),

                Text('Car Type',
                    style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Colors.grey.shade700)),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  initialValue: _selectedCarType,
                  hint: const Text('Select car type'),
                  decoration: InputDecoration(
                    prefixIcon: const Icon(Icons.directions_car_outlined),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    filled: true,
                    fillColor: Colors.grey.shade50,
                  ),
                  items: _carTypes
                      .map((type) => DropdownMenuItem(value: type, child: Text(type)))
                      .toList(),
                  onChanged: (val) => setState(() => _selectedCarType = val),
                ),
                const SizedBox(height: 16),

                Text('Plate Number',
                    style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Colors.grey.shade700)),
                const SizedBox(height: 8),
                TextField(
                  controller: _plateController,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 4),
                  decoration: InputDecoration(
                    hintText: 'e.g.  أ ب ج  1234',
                    prefixIcon: const Icon(Icons.pin),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    filled: true,
                    fillColor: Colors.grey.shade50,
                  ),
                ),
                const SizedBox(height: 16),

                Text('Car Color',
                    style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Colors.grey.shade700)),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: _carColors.map((c) {
                    final isSelected = _selectedColor == c['name'];
                    return GestureDetector(
                      onTap: () => setState(() => _selectedColor = c['name']),
                      child: Column(
                        children: [
                          Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: c['color'] as Color,
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: isSelected
                                    ? Colors.blue.shade700
                                    : Colors.grey.shade300,
                                width: isSelected ? 3 : 1,
                              ),
                              boxShadow: isSelected
                                  ? [
                                      BoxShadow(
                                          color: Colors.blue.withValues(alpha: 0.3),
                                          blurRadius: 6)
                                    ]
                                  : [],
                            ),
                            child: isSelected
                                ? Icon(Icons.check,
                                    color: (c['color'] as Color).computeLuminance() > 0.5
                                        ? Colors.black
                                        : Colors.white,
                                    size: 20)
                                : null,
                          ),
                          const SizedBox(height: 4),
                          Text(c['name'] as String,
                              style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: isSelected
                                      ? FontWeight.bold
                                      : FontWeight.normal,
                                  color: isSelected
                                      ? Colors.blue.shade700
                                      : Colors.grey.shade600)),
                        ],
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 24),

                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton.icon(
                    onPressed: _registerVehicle,
                    icon: const Icon(Icons.check_circle_outline, color: Colors.white),
                    label: const Text('Register Vehicle',
                        style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.white)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue.shade700,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          if (_registeredVehicles.isNotEmpty) ...[
            Text('My Vehicles',
                style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.grey.shade800)),
            const SizedBox(height: 12),
            ..._registeredVehicles.asMap().entries.map((entry) {
              final i = entry.key;
              final v = entry.value;
              final colorData = _carColors.firstWhere(
                  (c) => c['name'] == v['color'],
                  orElse: () => {'name': 'Unknown', 'color': Colors.grey});
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
                        blurRadius: 8)
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      width: 50,
                      height: 50,
                      decoration: BoxDecoration(
                        color: Colors.blue.shade50,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(Icons.directions_car,
                          color: Colors.blue.shade700, size: 28),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(v['type']!,
                              style: const TextStyle(
                                  fontSize: 16, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 4),
                          Text('Plate: ${v['plate']}',
                              style: TextStyle(
                                  fontSize: 13, color: Colors.grey.shade600)),
                        ],
                      ),
                    ),
                    Column(
                      children: [
                        Container(
                          width: 28,
                          height: 28,
                          decoration: BoxDecoration(
                            color: colorData['color'] as Color,
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.grey.shade300),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(v['color']!,
                            style: TextStyle(
                                fontSize: 10, color: Colors.grey.shade500)),
                      ],
                    ),
                    const SizedBox(width: 8),
                    IconButton(
                      icon: const Icon(Icons.delete_outline, color: Colors.red),
                      onPressed: () {
                        setState(() => _registeredVehicles.removeAt(i));
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                          content: Text('Vehicle removed'),
                          backgroundColor: Colors.orange,
                        ));
                      },
                    ),
                  ],
                ),
              );
            }),
          ],
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────
// Rental Management Tab
// ─────────────────────────────────────────
class RentalManagementTab extends StatefulWidget {
  const RentalManagementTab({super.key});

  @override
  State<RentalManagementTab> createState() => _RentalManagementTabState();
}

class _RentalManagementTabState extends State<RentalManagementTab> {
  final List<RentalRequest> _rentalRequests = [
    RentalRequest(
      id: '1',
      vehiclePlate: 'ط س و 555',
      vehicleType: 'Toyota Corolla',
      renterName: 'Ahmed Mohamed',
      renterEmail: 'ahmed@example.com',
      renterLicenseId: '12345678901234',
      status: 'pending',
      requestDate: DateTime.now().subtract(const Duration(hours: 2)),
    ),
    RentalRequest(
      id: '2',
      vehiclePlate: 'أ ب ج 123',
      vehicleType: 'BMW X5',
      renterName: 'Sara Ali',
      renterEmail: 'sara@example.com',
      renterLicenseId: '98765432109876',
      status: 'accepted',
      requestDate: DateTime.now().subtract(const Duration(days: 1)),
    ),
  ];

  final List<Map<String, dynamic>> _rentedVehicles = [
    {
      'plate': 'أ ب ج 123',
      'type': 'BMW X5',
      'renter': 'Sara Ali',
      'status': 'active',
      'activities': [
        VehicleActivity(
          id: '1',
          gate: 'Cairo Toll Gate',
          timestamp: DateTime.now().subtract(const Duration(hours: 3)),
          ticketId: 'TKT-2025-100',
          amount: 25.0,
        ),
        VehicleActivity(
          id: '2',
          gate: 'Alexandria Highway',
          timestamp: DateTime.now().subtract(const Duration(hours: 8)),
          ticketId: 'TKT-2025-099',
          amount: 30.0,
        ),
      ],
    },
  ];

  int? _expandedRentalIndex;
  int? _expandedRentedIndex;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Rental Requests Section
          Text('Rental Requests',
              style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey.shade800)),
          const SizedBox(height: 12),

          if (_rentalRequests.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Center(
                child: Text(
                  'No rental requests',
                  style: TextStyle(color: Colors.grey.shade500),
                ),
              ),
            )
          else
            ..._rentalRequests.asMap().entries.map((entry) {
              final index = entry.key;
              final request = entry.value;
              final isExpanded = _expandedRentalIndex == index;

              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.grey.withValues(alpha: 0.1),
                      spreadRadius: 1,
                      blurRadius: 4,
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    ListTile(
                      leading: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: _getStatusColor(request.status).withValues(alpha: 0.1),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          Icons.car_rental,
                          color: _getStatusColor(request.status),
                        ),
                      ),
                      title: Text(
                        '${request.vehicleType} (${request.vehiclePlate})',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SizedBox(height: 4),
                          Text(
                            'Renter: ${request.renterName}',
                            style: const TextStyle(fontSize: 13),
                          ),
                          const SizedBox(height: 2),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: _getStatusColor(request.status),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              request.status.toUpperCase(),
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                      trailing: IconButton(
                        icon: Icon(
                          isExpanded ? Icons.expand_less : Icons.expand_more,
                          color: Colors.blue.shade700,
                        ),
                        onPressed: () {
                          setState(() {
                            _expandedRentalIndex = isExpanded ? null : index;
                          });
                        },
                      ),
                    ),
                    if (isExpanded)
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Divider(),
                            const SizedBox(height: 8),
                            _buildInfoRow(Icons.email, 'Email', request.renterEmail),
                            const SizedBox(height: 8),
                            _buildInfoRow(Icons.credit_card, 'License ID',
                                request.renterLicenseId),
                            const SizedBox(height: 8),
                            _buildInfoRow(
                              Icons.calendar_today,
                              'Request Date',
                              '${request.requestDate.day}/${request.requestDate.month}/${request.requestDate.year}',
                            ),
                            const SizedBox(height: 16),
                            if (request.status == 'pending')
                              Row(
                                children: [
                                  Expanded(
                                    child: ElevatedButton.icon(
                                      onPressed: () {
                                        setState(() {
                                          request.status = 'accepted';
                                        });
                                        ScaffoldMessenger.of(context)
                                            .showSnackBar(const SnackBar(
                                          content: Text(
                                              'Rental request accepted! Notification sent.'),
                                          backgroundColor: Colors.green,
                                        ));
                                      },
                                      icon: const Icon(Icons.check, color: Colors.white),
                                      label: const Text('Accept',
                                          style: TextStyle(color: Colors.white)),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: Colors.green,
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: OutlinedButton.icon(
                                      onPressed: () {
                                        setState(() {
                                          request.status = 'rejected';
                                        });
                                        ScaffoldMessenger.of(context)
                                            .showSnackBar(const SnackBar(
                                          content: Text('Rental request rejected'),
                                          backgroundColor: Colors.red,
                                        ));
                                      },
                                      icon: const Icon(Icons.close, color: Colors.red),
                                      label: const Text('Reject',
                                          style: TextStyle(color: Colors.red)),
                                      style: OutlinedButton.styleFrom(
                                        side: const BorderSide(color: Colors.red),
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                      ),
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
            }),

          const SizedBox(height: 32),

          // Rented Vehicles Section
          Text('Rented Vehicles',
              style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey.shade800)),
          const SizedBox(height: 12),

          if (_rentedVehicles.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Center(
                child: Text(
                  'No rented vehicles',
                  style: TextStyle(color: Colors.grey.shade500),
                ),
              ),
            )
          else
            ..._rentedVehicles.asMap().entries.map((entry) {
              final index = entry.key;
              final vehicle = entry.value;
              final isExpanded = _expandedRentedIndex == index;

              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.grey.withValues(alpha: 0.1),
                      spreadRadius: 1,
                      blurRadius: 4,
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    ListTile(
                      leading: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.green.shade50,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          Icons.directions_car,
                          color: Colors.green.shade700,
                        ),
                      ),
                      title: Text(
                        '${vehicle['type']} (${vehicle['plate']})',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      subtitle: Text('Rented by: ${vehicle['renter']}'),
                      trailing: IconButton(
                        icon: Icon(
                          isExpanded ? Icons.expand_less : Icons.expand_more,
                          color: Colors.blue.shade700,
                        ),
                        onPressed: () {
                          setState(() {
                            _expandedRentedIndex = isExpanded ? null : index;
                          });
                        },
                      ),
                    ),
                    if (isExpanded)
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Divider(),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text(
                                  'Vehicle Activity',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                TextButton.icon(
                                  onPressed: () {
                                    _showReportDialog(context, vehicle);
                                  },
                                  icon: const Icon(Icons.report_problem, size: 18),
                                  label: const Text('Report Stolen'),
                                  style: TextButton.styleFrom(
                                    foregroundColor: Colors.red,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            ...((vehicle['activities'] as List<VehicleActivity>)
                                .map((activity) {
                              return Container(
                                margin: const EdgeInsets.only(bottom: 8),
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: Colors.grey.shade50,
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: Colors.grey.shade200),
                                ),
                                child: Row(
                                  children: [
                                    Icon(Icons.location_on,
                                        size: 16, color: Colors.grey.shade600),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            activity.gate,
                                            style: const TextStyle(
                                              fontSize: 13,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            '${activity.timestamp.day}/${activity.timestamp.month} ${activity.timestamp.hour}:${activity.timestamp.minute.toString().padLeft(2, '0')}',
                                            style: TextStyle(
                                              fontSize: 11,
                                              color: Colors.grey.shade600,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Text(
                                      '${activity.amount.toStringAsFixed(2)} LE',
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.blue.shade700,
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            })),
                          ],
                        ),
                      ),
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 18, color: Colors.grey.shade600),
        const SizedBox(width: 8),
        Text(
          '$label: ',
          style: TextStyle(
            fontSize: 13,
            color: Colors.grey.shade600,
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'pending':
        return Colors.orange;
      case 'accepted':
        return Colors.green;
      case 'rejected':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  void _showReportDialog(BuildContext context, Map<String, dynamic> vehicle) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.warning_amber, color: Colors.red.shade700),
            const SizedBox(width: 8),
            const Text('Report Stolen Vehicle'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Are you sure you want to report this vehicle as stolen?',
              style: TextStyle(color: Colors.grey.shade700),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Vehicle: ${vehicle['type']}',
                      style: const TextStyle(fontWeight: FontWeight.bold)),
                  Text('Plate: ${vehicle['plate']}'),
                  Text('Renter: ${vehicle['renter']}'),
                ],
              ),
            ),
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
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                content: Text(
                    'Vehicle ${vehicle['plate']} reported as stolen. Authorities notified.'),
                backgroundColor: Colors.red,
              ));
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
            ),
            child: const Text('Report', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────
// History Tab
// ─────────────────────────────────────────
class HistoryTab extends StatelessWidget {
  const HistoryTab({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Ticket History'),
        backgroundColor: Colors.blue.shade700,
        foregroundColor: Colors.white,
        automaticallyImplyLeading: false,
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.history, size: 100, color: Colors.grey.shade400),
            const SizedBox(height: 20),
            Text('Ticket History',
                style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.grey.shade700)),
            const SizedBox(height: 10),
            Text('All your past tickets will appear here',
                style: TextStyle(fontSize: 16, color: Colors.grey.shade500)),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────
// Login Page
// ─────────────────────────────────────────
class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => LoginPageState();
}

class LoginPageState extends State<LoginPage> {
  final TextEditingController emailController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();

  @override
  void dispose() {
    emailController.dispose();
    passwordController.dispose();
    super.dispose();
  }

  void _handleLogin() {
    String email = emailController.text.trim();
    String password = passwordController.text.trim();

    if (email.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Please enter email and password!'),
        backgroundColor: Colors.red,
      ));
      return;
    }

    if (!Validators.isValidEmail(email)) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Please enter a valid email address!'),
        backgroundColor: Colors.red,
      ));
      return;
    }

    UserSession.email = email;
    UserSession.password = password;

    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (context) => HomePage(userEmail: email)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.local_parking, size: 100, color: Colors.blue.shade700),
                const SizedBox(height: 20),
                Text('Auto Pass',
                    style: TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                        color: Colors.blue.shade700)),
                const SizedBox(height: 10),
                Text('Login to your account',
                    style: TextStyle(fontSize: 16, color: Colors.grey.shade600)),
                const SizedBox(height: 40),
                TextField(
                  controller: emailController,
                  decoration: InputDecoration(
                    labelText: 'Email',
                    hintText: 'Enter your email',
                    prefixIcon: const Icon(Icons.email),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    filled: true,
                    fillColor: Colors.grey.shade50,
                  ),
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 20),
                TextField(
                  controller: passwordController,
                  decoration: InputDecoration(
                    labelText: 'Password',
                    hintText: 'Enter your password',
                    prefixIcon: const Icon(Icons.lock),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    filled: true,
                    fillColor: Colors.grey.shade50,
                  ),
                  obscureText: true,
                ),
                const SizedBox(height: 30),
                SizedBox(
                  width: double.infinity,
                  height: 55,
                  child: ElevatedButton(
                    onPressed: _handleLogin,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue.shade700,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('Log In',
                        style: TextStyle(
                            fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                  ),
                ),
                const SizedBox(height: 15),
                SizedBox(
                  width: double.infinity,
                  height: 55,
                  child: OutlinedButton(
                    onPressed: () {
                      Navigator.push(context,
                          MaterialPageRoute(builder: (context) => const RegistrationPage()));
                    },
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(color: Colors.blue.shade700, width: 2),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: Text('Register',
                        style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.blue.shade700)),
                  ),
                ),
                const SizedBox(height: 20),
                TextButton(
                  onPressed: () => debugPrint('Forgot password pressed!'),
                  child: Text('Forgot Password?',
                      style: TextStyle(color: Colors.blue.shade700, fontSize: 14)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────
// Registration Page
// ─────────────────────────────────────────
class RegistrationPage extends StatefulWidget {
  const RegistrationPage({super.key});

  @override
  State<RegistrationPage> createState() => RegistrationPageState();
}

class RegistrationPageState extends State<RegistrationPage> {
  final TextEditingController firstNameController = TextEditingController();
  final TextEditingController surnameController = TextEditingController();
  final TextEditingController lastNameController = TextEditingController();
  final TextEditingController nationalIdController = TextEditingController();
  final TextEditingController addressController = TextEditingController();
  final TextEditingController emailController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();
  final TextEditingController confirmPasswordController = TextEditingController();

  DateTime? selectedDate;
  String? frontIdPhoto;
  String? licenseFrontPhoto;
  
  double _passwordStrength = 0.0;
  bool _showPasswordRequirements = false;

  @override
  void dispose() {
    firstNameController.dispose();
    surnameController.dispose();
    lastNameController.dispose();
    nationalIdController.dispose();
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

  void _uploadPhoto(String photoType) {
    setState(() {
      if (photoType == 'id') {
        frontIdPhoto = 'ID_Photo_${DateTime.now().millisecondsSinceEpoch}.jpg';
      } else {
        licenseFrontPhoto = 'License_Photo_${DateTime.now().millisecondsSinceEpoch}.jpg';
      }
    });
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text('$photoType photo uploaded successfully!'),
      backgroundColor: Colors.green,
    ));
  }

  void _submitRegistration() {
    if (!Validators.isValidEmail(emailController.text.trim())) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Please enter a valid email address!'),
        backgroundColor: Colors.red,
      ));
      return;
    }

    String? passwordError = Validators.validatePassword(passwordController.text);
    if (passwordError != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(passwordError),
        backgroundColor: Colors.red,
      ));
      return;
    }

    if (passwordController.text != confirmPasswordController.text) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Passwords do not match!'),
        backgroundColor: Colors.red,
      ));
      return;
    }

    if (firstNameController.text.isEmpty ||
        surnameController.text.isEmpty ||
        lastNameController.text.isEmpty ||
        nationalIdController.text.length != 14 ||
        selectedDate == null ||
        addressController.text.isEmpty ||
        emailController.text.isEmpty ||
        passwordController.text.isEmpty ||
        confirmPasswordController.text.isEmpty ||
        frontIdPhoto == null ||
        licenseFrontPhoto == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Please fill all fields and upload required photos!'),
        backgroundColor: Colors.red,
      ));
      return;
    }

    UserSession.firstName = firstNameController.text.trim();
    UserSession.surname = surnameController.text.trim();
    UserSession.lastName = lastNameController.text.trim();
    UserSession.nationalId = nationalIdController.text.trim();
    UserSession.address = addressController.text.trim();
    UserSession.email = emailController.text.trim();
    UserSession.password = passwordController.text;
    UserSession.dateOfBirth = selectedDate;

    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
      content: Text('Registration Successful! ✓'),
      backgroundColor: Colors.green,
    ));

    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {

        Navigator.pop(context); }

       });
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
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Column(
                  children: [
                    Icon(Icons.person_add, size: 80, color: Colors.blue.shade700),
                    const SizedBox(height: 10),
                    Text('Register for AutoPass',
                        style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: Colors.blue.shade700)),
                    const SizedBox(height: 30),
                  ],
                ),
              ),

              _sectionLabel('Personal Information'),
              const SizedBox(height: 15),

              _buildField(firstNameController, 'First Name', 'Enter your first name', Icons.person),
              const SizedBox(height: 15),
              _buildField(surnameController, 'Surname (Middle Name)', 'Enter your surname', Icons.person_outline),
              const SizedBox(height: 15),
              _buildField(lastNameController, 'Last Name', 'Enter your last name', Icons.family_restroom),
              const SizedBox(height: 15),

              TextField(
                controller: nationalIdController,
                decoration: InputDecoration(
                  labelText: 'National ID (14 digits)',
                  hintText: 'Enter your 14-digit national ID',
                  prefixIcon: const Icon(Icons.credit_card),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  filled: true,
                  fillColor: Colors.grey.shade50,
                ),
                keyboardType: TextInputType.number,
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(14),
                ],
              ),
              const SizedBox(height: 15),

              InkWell(
                onTap: () => _selectDate(context),
                child: InputDecorator(
                  decoration: InputDecoration(
                    labelText: 'Date of Birth',
                    prefixIcon: const Icon(Icons.calendar_today),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    filled: true,
                    fillColor: Colors.grey.shade50,
                  ),
                  child: Text(
                    selectedDate == null
                        ? 'Select your date of birth'
                        : '${selectedDate!.day}/${selectedDate!.month}/${selectedDate!.year}',
                    style: TextStyle(color: selectedDate == null ? Colors.grey : Colors.black),
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
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  filled: true,
                  fillColor: Colors.grey.shade50,
                ),
                maxLines: 2,
              ),
              const SizedBox(height: 25),

              _sectionLabel('Upload Documents'),
              const SizedBox(height: 15),

              _buildUploadBox(
                uploaded: frontIdPhoto != null,
                uploadedLabel: 'National ID Uploaded ✓',
                pendingLabel: 'Upload Front of National ID',
                icon: Icons.credit_card,
                onTap: () => _uploadPhoto('id'),
                buttonLabel: frontIdPhoto != null ? 'Change Photo' : 'Choose Photo',
              ),
              const SizedBox(height: 15),

              _buildUploadBox(
                uploaded: licenseFrontPhoto != null,
                uploadedLabel: 'Driver\'s License Uploaded ✓',
                pendingLabel: 'Upload Front of Driver\'s License',
                icon: Icons.badge,
                onTap: () => _uploadPhoto('license'),
                buttonLabel: licenseFrontPhoto != null ? 'Change Photo' : 'Choose Photo',
              ),
              const SizedBox(height: 25),

              _sectionLabel('Account Credentials'),
              const SizedBox(height: 15),

              _buildField(emailController, 'Email', 'Enter your email', Icons.email,
                  keyboardType: TextInputType.emailAddress),
              const SizedBox(height: 15),
              
              // Password field with strength indicator
              TextField(
                controller: passwordController,
                obscureText: true,
                onChanged: (value) {
                  setState(() {
                    _passwordStrength = Validators.getPasswordStrength(value);
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
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  filled: true,
                  fillColor: Colors.grey.shade50,
                ),
              ),
              const SizedBox(height: 8),
              
              // Password strength indicator
              if (passwordController.text.isNotEmpty)
                Column(
                  children: [
                    LinearProgressIndicator(
                      value: _passwordStrength,
                      backgroundColor: Colors.grey.shade200,
                      color: Validators.getPasswordStrengthColor(_passwordStrength),
                      minHeight: 6,
                      borderRadius: BorderRadius.circular(3),
                    ),
                    const SizedBox(height: 4),
                    Align(
                      alignment: Alignment.centerRight,
                      child: Text(
                        Validators.getPasswordStrengthText(_passwordStrength),
                        style: TextStyle(
                          fontSize: 12,
                          color: Validators.getPasswordStrengthColor(_passwordStrength),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              
              // Password requirements
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
                      _buildRequirement('At least 8 characters', passwordController.text.length >= 8),
                      _buildRequirement('Uppercase letter (A-Z)', passwordController.text.contains(RegExp(r'[A-Z]'))),
                      _buildRequirement('Lowercase letter (a-z)', passwordController.text.contains(RegExp(r'[a-z]'))),
                      _buildRequirement('Number (0-9)', passwordController.text.contains(RegExp(r'[0-9]'))),
                      _buildRequirement('Special character (!@#\$...)', passwordController.text.contains(RegExp(r'[!@#\$%^&*()_+\-=\[\]{};:,.<>?]'))),
                    ],
                  ),
                ),
              
              const SizedBox(height: 15),
              _buildField(confirmPasswordController, 'Confirm Password', 'Re-enter your password',
                  Icons.lock_outline,
                  obscure: true),
              const SizedBox(height: 30),

              SizedBox(
                width: double.infinity,
                height: 55,
                child: ElevatedButton(
                  onPressed: _submitRegistration,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue.shade700,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Create Account',
                      style: TextStyle(
                          fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                ),
              ),
              const SizedBox(height: 15),

              Center(
                child: TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text('Already have an account? Login',
                      style: TextStyle(color: Colors.blue.shade700, fontSize: 14)),
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _sectionLabel(String label) {
    return Text(label,
        style: TextStyle(
            fontSize: 18, fontWeight: FontWeight.bold, color: Colors.grey.shade800));
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
        border: Border.all(color: uploaded ? Colors.green : Colors.grey.shade300),
      ),
      child: Column(
        children: [
          Icon(uploaded ? Icons.check_circle : icon,
              size: 50, color: uploaded ? Colors.green : Colors.grey),
          const SizedBox(height: 10),
          Text(uploaded ? uploadedLabel : pendingLabel,
              style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: uploaded ? Colors.green : Colors.grey.shade700)),
          const SizedBox(height: 10),
          ElevatedButton.icon(
            onPressed: onTap,
            icon: const Icon(Icons.upload),
            label: Text(buttonLabel),
            style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue.shade700, foregroundColor: Colors.white),
          ),
        ],
      ),
    );
  }
}
