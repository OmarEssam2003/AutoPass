// lib/services/auth_service.dart
//
// Handles login, registration (multipart with national ID image),
// and logout. Token + user info are persisted via SharedPreferences.

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart'; // for debugPrint
import 'package:http_parser/http_parser.dart'; // for MediaType (MIME type)
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api_service.dart';

class AuthService {
  // ─── Storage keys ──────────────────────────────────────────────
  static const _kToken = 'token';
  static const _kUserId = 'user_id';
  static const _kUserEmail = 'user_email';
  static const _kUserFirstName = 'user_first_name';
  static const _kUserLastName = 'user_last_name';
  static const _kUserType = 'user_type';

  // ─── 1. Login ──────────────────────────────────────────────────
  /// Logs in. Throws Exception on failure.
  /// Refuses admin accounts — only "user" type is accepted in the app.
  static Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    return safeApiCall(() async {
      // Frontend validation — required fields
      if (email.trim().isEmpty) {
        throw Exception('Email is required.');
      }
      if (password.isEmpty) {
        throw Exception('Password is required.');
      }

      final response = await ApiService.dio.post(
        '/auth/login',
        data: {'email': email.trim(), 'password': password},
      );

      final data = response.data as Map<String, dynamic>;
      final account = data['account'] as Map<String, dynamic>;

      if (account['type'] != 'user') {
        throw Exception('Admin accounts cannot log in to the app.');
      }

      // Persist session
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_kToken, data['token']);
      await prefs.setString(_kUserId, account['id']);
      await prefs.setString(_kUserEmail, account['email']);
      await prefs.setString(_kUserFirstName, account['first_name'] ?? '');
      await prefs.setString(_kUserLastName, account['last_name'] ?? '');
      await prefs.setString(_kUserType, account['type']);

      // Re-install interceptors so the new token is picked up.
      await ApiService.init();

      return data;
    });
  }

  // ─── 2. Register ───────────────────────────────────────────────
  /// Registers a new user. ALL fields are required from the UI side
  /// per the project's requirement, even though the backend marks
  /// some as optional.
  ///
  /// The national ID image is uploaded as multipart/form-data and
  /// the backend runs OCR to verify the typed national_id matches.
  static Future<Map<String, dynamic>> register({
    required String email,
    required String password,
    required String firstName,
    required String middleName,
    required String lastName,
    required String nationalId,
    required String phoneNumber,
    required String address,
    required String dateOfBirth, // YYYY-MM-DD
    required XFile nationalIdImage,
  }) async {
    return safeApiCall(() async {
      // ─── Frontend validation — every field treated as required ───
      _requireNotEmpty(email, 'Email');
      _requireNotEmpty(password, 'Password');
      _requireNotEmpty(firstName, 'First name');
      _requireNotEmpty(middleName, 'Middle name');
      _requireNotEmpty(lastName, 'Last name');
      _requireNotEmpty(nationalId, 'National ID');
      _requireNotEmpty(phoneNumber, 'Phone number');
      _requireNotEmpty(address, 'Address');
      _requireNotEmpty(dateOfBirth, 'Date of birth');

      if (!_isValidEmail(email)) {
        throw Exception('Please enter a valid email address.');
      }
      if (!_isStrongPassword(password)) {
        throw Exception(
          'Password must be 8+ chars with uppercase, number & special char.',
        );
      }
      if (nationalId.length != 14 || int.tryParse(nationalId) == null) {
        throw Exception('National ID must be exactly 14 digits.');
      }

      // Read the image as bytes — this works on web AND on mobile.
      // (MultipartFile.fromFile() uses dart:io which is unavailable on web.)
      final bytes = await nationalIdImage.readAsBytes();

      // Use a guaranteed-safe filename. On Chrome web, picked image
      // filenames sometimes come through as just "0" or weird strings
      // without extensions, which can confuse multer/multipart parsers.
      // Always send a stable name with the right extension.
      final lowerOriginal = nationalIdImage.name.toLowerCase();
      String filename;
      MediaType mediaType;
      if (lowerOriginal.endsWith('.png')) {
        filename = 'national_id.png';
        mediaType = MediaType('image', 'png');
      } else if (lowerOriginal.endsWith('.webp')) {
        filename = 'national_id.webp';
        mediaType = MediaType('image', 'webp');
      } else {
        // Default everything else (.jpg, .jpeg, no extension) to JPEG.
        filename = 'national_id.jpg';
        mediaType = MediaType('image', 'jpeg');
      }

      // ── DEBUG: print exactly what we are about to send ───────────
      debugPrint('═══ [register] Sending POST /api/users ═══');
      debugPrint('  email        : "${email.trim()}"');
      debugPrint('  first_name   : "${firstName.trim()}"');
      debugPrint('  middle_name  : "${middleName.trim()}"');
      debugPrint('  last_name    : "${lastName.trim()}"');
      debugPrint('  national_id  : "${nationalId.trim()}" (${nationalId.length} chars)');
      debugPrint('  phone_number : "${phoneNumber.trim()}"');
      debugPrint('  address      : "${address.trim()}"');
      debugPrint('  date_of_birth: "$dateOfBirth"');
      debugPrint('  password     : (${password.length} chars, hidden)');
      debugPrint('  image        : $filename, ${bytes.length} bytes, $mediaType');
      debugPrint('═════════════════════════════════════════');

      final formData = FormData.fromMap({
        'email': email.trim(),
        'password': password,
        'first_name': firstName.trim(),
        'middle_name': middleName.trim(),
        'last_name': lastName.trim(),
        'national_id': nationalId.trim(),
        'phone_number': phoneNumber.trim(),
        'address': address.trim(),
        'date_of_birth': dateOfBirth,
        'national_id_image': MultipartFile.fromBytes(
          bytes,
          filename: filename,
          contentType: mediaType,
        ),
      });

      try {
        final response = await ApiService.dio.post('/users', data: formData);
        debugPrint('═══ [register] RESPONSE ${response.statusCode} ═══');
        debugPrint('${response.data}');
        debugPrint('═════════════════════════════════════════');
        return response.data as Map<String, dynamic>;
      } on DioException catch (e) {
        // ── DEBUG: print the FULL backend error before safeApiCall munges it
        debugPrint('═══ [register] ERROR ${e.response?.statusCode} ═══');
        debugPrint('Response data: ${e.response?.data}');
        debugPrint('Response headers: ${e.response?.headers.map}');
        debugPrint('═════════════════════════════════════════');
        rethrow;
      }
    });
  }

  // ─── 3. Logout ─────────────────────────────────────────────────
  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();

    // Re-init so the next request doesn't carry the cleared token.
    await ApiService.init();

    final nav = ApiService.navigatorKey.currentState;
    if (nav == null) return;

    try {
      nav.pushNamedAndRemoveUntil('/login', (_) => false);
    } catch (_) {
      // Route not registered (e.g. during API testing) — ignore.
    }
  }

  // ─── 4. Session helpers ────────────────────────────────────────
  static Future<bool> isLoggedIn() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(_kToken);
    return token != null && token.isNotEmpty;
  }

  static Future<String?> getCurrentUserId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_kUserId);
  }

  static Future<String> getCurrentUserName() async {
    final prefs = await SharedPreferences.getInstance();
    final f = prefs.getString(_kUserFirstName) ?? '';
    final l = prefs.getString(_kUserLastName) ?? '';
    return '$f $l'.trim();
  }

  static Future<String?> getCurrentUserEmail() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_kUserEmail);
  }

  // ─── Validators (private) ──────────────────────────────────────
  static void _requireNotEmpty(String value, String label) {
    if (value.trim().isEmpty) {
      throw Exception('$label is required.');
    }
  }

  static bool _isValidEmail(String email) {
    final regex = RegExp(r'^[\w\.-]+@[\w\.-]+\.\w{2,}$');
    return regex.hasMatch(email.trim());
  }

  static bool _isStrongPassword(String password) {
    if (password.length < 8) return false;
    final hasUpper = password.contains(RegExp(r'[A-Z]'));
    final hasDigit = password.contains(RegExp(r'\d'));
    final hasSpecial = password.contains(RegExp(r'[!@#\$%^&*(),.?":{}|<>]'));
    return hasUpper && hasDigit && hasSpecial;
  }
}
