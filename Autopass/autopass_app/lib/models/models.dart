// lib/models/models.dart
//
// Lightweight data classes for the JSON the backend returns.
// Each has a fromJson constructor so you can do:
//   final user = UserProfile.fromJson(await UserService.getMyProfile());

class UserProfile {
  final String userId;
  final String email;
  final String firstName;
  final String? middleName;
  final String lastName;
  final String phoneNumber;
  final String nationalId;
  final String? address;
  final String? dateOfBirth;
  final bool isBlocked;
  final DateTime? createdAt;

  UserProfile({
    required this.userId,
    required this.email,
    required this.firstName,
    this.middleName,
    required this.lastName,
    required this.phoneNumber,
    required this.nationalId,
    this.address,
    this.dateOfBirth,
    required this.isBlocked,
    this.createdAt,
  });

  factory UserProfile.fromJson(Map<String, dynamic> j) => UserProfile(
        userId: j['user_id']?.toString() ?? '',
        email: j['email']?.toString() ?? '',
        firstName: j['first_name']?.toString() ?? '',
        middleName: j['middle_name']?.toString(),
        lastName: j['last_name']?.toString() ?? '',
        phoneNumber: j['phone_number']?.toString() ?? '',
        nationalId: j['national_id']?.toString() ?? '',
        address: j['address']?.toString(),
        dateOfBirth: j['date_of_birth']?.toString(),
        isBlocked: j['is_blocked'] == true,
        createdAt: DateTime.tryParse(j['created_at']?.toString() ?? ''),
      );

  String get fullName => '$firstName $lastName'.trim();
}

class Ticket {
  final String ticketId;
  final String plateNumber;
  final String gateName;
  final String? zoneName;
  final String direction; // IN | OUT
  final double price;
  final String status; // UNPAID | PAID | DISPUTED | CANCELLED
  final String? chargedAs; // OWNER | RENTER
  final DateTime? issuedAt;

  Ticket({
    required this.ticketId,
    required this.plateNumber,
    required this.gateName,
    this.zoneName,
    required this.direction,
    required this.price,
    required this.status,
    this.chargedAs,
    this.issuedAt,
  });

  factory Ticket.fromJson(Map<String, dynamic> j) => Ticket(
        ticketId: j['ticket_id']?.toString() ?? '',
        plateNumber: j['plate_number']?.toString() ?? '',
        gateName: j['gate_name']?.toString() ?? '',
        zoneName: j['zone_name']?.toString(),
        direction: j['direction']?.toString() ?? '',
        price: (j['price'] as num?)?.toDouble() ?? 0.0,
        status: j['status']?.toString() ?? 'UNPAID',
        chargedAs: j['charged_as']?.toString(),
        issuedAt: DateTime.tryParse(j['issued_at']?.toString() ?? ''),
      );

  bool get isPaid => status == 'PAID';
  String get priceLabel => '${price.toStringAsFixed(2)} LE';
}

class Vehicle {
  final String ownershipId;
  final String vehicleId;
  final String? plateNumber;
  final String? make;
  final String? model;
  final String? color;
  final bool verified;

  Vehicle({
    required this.ownershipId,
    required this.vehicleId,
    this.plateNumber,
    this.make,
    this.model,
    this.color,
    required this.verified,
  });

  factory Vehicle.fromJson(Map<String, dynamic> j) {
    // The API may return vehicle details nested, flatten it gracefully.
    final v = j['vehicle'] is Map ? j['vehicle'] as Map<String, dynamic> : null;
    return Vehicle(
      ownershipId: j['ownership_id']?.toString() ?? '',
      vehicleId: j['vehicle_id']?.toString() ?? v?['id']?.toString() ?? '',
      plateNumber:
          j['plate_number']?.toString() ?? v?['plate_number']?.toString(),
      make: j['make']?.toString() ?? v?['make']?.toString(),
      model: j['model']?.toString() ?? v?['model']?.toString(),
      color: j['color']?.toString() ?? v?['color']?.toString(),
      verified: j['verified'] == true,
    );
  }
}

class Rental {
  final String rentalId;
  final String vehicleId;
  final String? plateNumber;
  final String? renterEmail;
  final String? ownerEmail;
  final DateTime? startDate;
  final DateTime? endDate;
  final String status; // PENDING | ACCEPTED | REJECTED

  Rental({
    required this.rentalId,
    required this.vehicleId,
    this.plateNumber,
    this.renterEmail,
    this.ownerEmail,
    this.startDate,
    this.endDate,
    required this.status,
  });

  factory Rental.fromJson(Map<String, dynamic> j) => Rental(
        rentalId: j['rental_id']?.toString() ?? '',
        vehicleId: j['vehicle_id']?.toString() ?? '',
        plateNumber: j['plate_number']?.toString(),
        renterEmail: j['renter_email']?.toString(),
        ownerEmail: j['owner_email']?.toString(),
        startDate: DateTime.tryParse(j['start_date']?.toString() ?? ''),
        endDate: DateTime.tryParse(j['end_date']?.toString() ?? ''),
        status: j['status']?.toString() ?? 'PENDING',
      );

  bool get isPending => status == 'PENDING';
  bool get isAccepted => status == 'ACCEPTED';
}

class Alert {
  final String alertId;
  final String? title;
  final String? message;
  final bool isRead;
  final DateTime? createdAt;

  Alert({
    required this.alertId,
    this.title,
    this.message,
    required this.isRead,
    this.createdAt,
  });

  factory Alert.fromJson(Map<String, dynamic> j) => Alert(
        alertId: j['alert_id']?.toString() ?? j['id']?.toString() ?? '',
        title: j['title']?.toString(),
        message: j['message']?.toString(),
        isRead: j['is_read'] == true,
        createdAt: DateTime.tryParse(j['created_at']?.toString() ?? ''),
      );
}
