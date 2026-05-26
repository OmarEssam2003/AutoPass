// lib/services/vehicle_service.dart
//
// Vehicle ownership: list, link (with OTP), verify OTP, unlink,
// and report a vehicle as stolen.

import 'api_service.dart';
import 'auth_service.dart';

class VehicleService {
  // ─── 1. My vehicles ────────────────────────────────────────────
  /// Returns only the user's verified vehicles by default.
  static Future<List<dynamic>> getMyVehicles({bool verifiedOnly = false}) async {
    return safeApiCall(() async {
      final userId = await AuthService.getCurrentUserId();
      if (userId == null) {
        throw Exception('Not logged in.');
      }

      final response = await ApiService.dio.get(
        '/vehicle-ownerships',
        queryParameters: {
          'user_id': userId,
          if (verifiedOnly) 'verified': 'true',
        },
      );
      return (response.data['data'] as List?) ?? [];
    });
  }

  // ─── 2. Link a new vehicle (sends OTP) ─────────────────────────
  /// Returns the created ownership object including `ownership_id`
  /// which you'll need to call [verifyOwnership].
  static Future<Map<String, dynamic>> linkVehicle({
    required String plateNumber,
  }) async {
    return safeApiCall(() async {
      _require(plateNumber, 'Plate number');

      final response = await ApiService.dio.post(
        '/vehicle-ownerships',
        data: {'plate_number': plateNumber.trim().toUpperCase()},
      );
      return response.data['data'] as Map<String, dynamic>;
    });
  }

  // ─── 3. Verify OTP ─────────────────────────────────────────────
static Future<void> verifyOwnership({
  required String ownershipId,
  required String otp,
}) async {
  return safeApiCall(() async {
    _require(ownershipId, 'Ownership ID');
    _require(otp, 'OTP');
    if (otp.length != 6 || int.tryParse(otp) == null) {
      throw Exception('OTP must be 6 digits.');
    }

    await ApiService.dio.post(
      '/vehicle-ownerships/verify',
      data: {
        'ownership_id': ownershipId,
        'otp': otp,
      },
    );
  });
}

  // ─── 4. Unlink a vehicle ───────────────────────────────────────
  static Future<void> unlinkVehicle({required String ownershipId}) async {
    return safeApiCall(() async {
      _require(ownershipId, 'Ownership ID');
      await ApiService.dio.delete('/vehicle-ownerships/$ownershipId');
    });
  }

  // ─── 5. Report stolen ──────────────────────────────────────────
  static Future<void> reportStolen({
    required String plateNumber,
    required String reason,
    required String notes,
  }) async {
    return safeApiCall(() async {
      _require(plateNumber, 'Plate number');
      _require(reason, 'Reason');
      _require(notes, 'Notes');

      await ApiService.dio.post(
        '/vehicle-enforcements/report-stolen',
        data: {
          'plate_number': plateNumber.trim().toUpperCase(),
          'reason': reason.trim(),
          'notes': notes.trim(),
        },
      );
    });
  }

  static void _require(String v, String label) {
    if (v.trim().isEmpty) throw Exception('$label is required.');
  }
}
