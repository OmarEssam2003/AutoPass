// lib/services/user_service.dart
//
// Profile read/update + password change.

import 'api_service.dart';

class UserService {
  // ─── 1. Get my profile ─────────────────────────────────────────
  static Future<Map<String, dynamic>> getMyProfile() async {
    return safeApiCall(() async {
      final response = await ApiService.dio.get('/users/me');
      return response.data['data'] as Map<String, dynamic>;
    });
  }

  // ─── 2. Update profile ─────────────────────────────────────────
  /// All fields required from UI per project policy.
  static Future<Map<String, dynamic>> updateProfile({
    required String firstName,
    required String middleName,
    required String lastName,
    required String phoneNumber,
    required String address,
    required String dateOfBirth, // YYYY-MM-DD
  }) async {
    return safeApiCall(() async {
      _require(firstName, 'First name');
      _require(middleName, 'Middle name');
      _require(lastName, 'Last name');
      _require(phoneNumber, 'Phone number');
      _require(address, 'Address');
      _require(dateOfBirth, 'Date of birth');

      final response = await ApiService.dio.put(
        '/users/me',
        data: {
          'first_name': firstName.trim(),
          'middle_name': middleName.trim(),
          'last_name': lastName.trim(),
          'phone_number': phoneNumber.trim(),
          'address': address.trim(),
          'date_of_birth': dateOfBirth,
        },
      );
      return response.data['data'] as Map<String, dynamic>;
    });
  }

  // ─── 3. Change password ────────────────────────────────────────
  static Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    return safeApiCall(() async {
      _require(currentPassword, 'Current password');
      _require(newPassword, 'New password');

      if (newPassword.length < 8) {
        throw Exception('New password must be at least 8 characters.');
      }

      await ApiService.dio.put(
        '/users/me/password',
        data: {
          'current_password': currentPassword,
          'new_password': newPassword,
        },
      );
    });
  }

  // ─── helpers ───────────────────────────────────────────────────
  static void _require(String v, String label) {
    if (v.trim().isEmpty) throw Exception('$label is required.');
  }
}
