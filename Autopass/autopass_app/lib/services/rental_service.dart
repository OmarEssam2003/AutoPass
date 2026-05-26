// lib/services/rental_service.dart
//
// ─── KEY DISCOVERY ───────────────────────────────────────────────────────────
// The backend's GET /vehicle-rentals Joi schema does NOT accept owner_id or
// renter_id as query params ("renter_id" is not allowed — Joi 422 error).
//
// Instead, the backend uses the JWT token to auto-filter results:
// "Regular users automatically receive only rentals where they are the owner
//  or the renter." (from vehicleRental.routes.js comments)
//
// So we call GET /vehicle-rentals with NO owner/renter filter, get back all
// rentals involving this user, then split client-side by comparing owner_id
// and renter_id against the logged-in user's UUID.
//
// PATCH endpoint is /vehicle-rentals/:id/status (not /:id directly).
// DELETE endpoint is SUPER_ADMIN / OPERATOR only — not for regular users.
// ─────────────────────────────────────────────────────────────────────────────

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'api_service.dart';
import 'auth_service.dart';

class RentalStatus {
  static const pending  = 'PENDING';
  static const accepted = 'ACCEPTED';
  static const rejected = 'REJECTED';
}

class RentalService {

  // ── Get the logged-in user's UUID ────────────────────────────
  static Future<String> _getUserId() async {
    final stored = await AuthService.getCurrentUserId();
    if (stored != null && stored.isNotEmpty) return stored;
    // Fallback: ask the backend
    final response = await ApiService.dio.get('/users/me');
    final id = response.data['data']?['user_id']?.toString();
    if (id == null || id.isEmpty) throw Exception('Could not get user ID.');
    return id;
  }

  // ── Parse list from any response shape ───────────────────────
  static List<dynamic> _parseList(dynamic payload) {
    if (payload is List) return payload;
    if (payload is Map) {
      for (final key in ['data', 'rentals', 'items', 'results']) {
        final v = payload[key];
        if (v is List) return v;
      }
    }
    return [];
  }

  // ── Fetch ALL my rentals from backend ─────────────────────────
  // Backend auto-filters by JWT — returns rentals where I am
  // the owner OR the renter. No owner_id/renter_id params needed.
  static Future<List<dynamic>> _getAllMyRentals({String? status}) async {
    debugPrint('[rental] GET /vehicle-rentals (no filter params — JWT auto-filters)');
    try {
      final response = await ApiService.dio.get(
        '/vehicle-rentals',
        queryParameters: {
          if (status != null && status.isNotEmpty) 'status': status,
        },
      );
      final list = _parseList(response.data);
      debugPrint('[rental] backend returned ${list.length} total rentals');
      if (list.isNotEmpty) {
        debugPrint('[rental] sample: ${list.first}');
      }
      return list;
    } on DioException catch (e) {
      final code = e.response?.statusCode;
      final body = e.response?.data;
      debugPrint('[rental] _getAllMyRentals HTTP $code body: $body');
      if (code == 404) return [];
      final msg = (body is Map ? body['message'] : null) ?? 'Failed to load rentals.';
      throw Exception(msg);
    }
  }

  // ── 1. Rentals I created as the OWNER ────────────────────────
  static Future<List<dynamic>> getMyOwnedRentals({String? status}) async {
    final userId = await _getUserId();
    final all = await _getAllMyRentals(status: status);
    // Filter: only rentals where owner_id == my user_id
    final owned = all
        .where((r) => (r as Map)['owner_id']?.toString() == userId)
        .toList();
    debugPrint('[rental] owned (as owner): ${owned.length}');
    return owned;
  }

  // ── 2. Rentals where I am the RENTER ─────────────────────────
  static Future<List<dynamic>> getMyIncomingRentals({String? status}) async {
    final userId = await _getUserId();
    final all = await _getAllMyRentals(status: status);
    // Filter: only rentals where renter_id == my user_id
    final incoming = all
        .where((r) => (r as Map)['renter_id']?.toString() == userId)
        .toList();
    debugPrint('[rental] incoming (as renter): ${incoming.length}');
    return incoming;
  }

  // ── 3. Create a rental request ────────────────────────────────
  static Future<Map<String, dynamic>> createRental({
    required String plateNumber,
    required String renterEmail,
    required DateTime startDate,
    required DateTime endDate,
  }) async {
    return safeApiCall(() async {
      if (plateNumber.trim().isEmpty) throw Exception('Plate number is required.');
      if (renterEmail.trim().isEmpty) throw Exception('Renter email is required.');
      if (!endDate.isAfter(startDate)) {
        throw Exception('End date must be after start date.');
      }
      final response = await ApiService.dio.post(
        '/vehicle-rentals',
        data: {
          'plate_number': plateNumber.trim().toUpperCase(),
          'renter_email': renterEmail.trim(),
          'start_date':   startDate.toUtc().toIso8601String(),
          'end_date':     endDate.toUtc().toIso8601String(),
        },
      );
      return response.data['data'] as Map<String, dynamic>;
    });
  }

  // ── 4. Accept or reject a rental (renter only) ───────────────
  // Correct endpoint: PATCH /vehicle-rentals/:id/status
  static Future<void> respondToRental({
    required String rentalId,
    required String status,
  }) async {
    return safeApiCall(() async {
      if (rentalId.trim().isEmpty) throw Exception('Rental ID is required.');
      if (status != RentalStatus.accepted && status != RentalStatus.rejected) {
        throw Exception('Status must be ACCEPTED or REJECTED.');
      }
      await ApiService.dio.patch(
        '/vehicle-rentals/$rentalId/status',   // ← /status suffix required!
        data: {'status': status},
      );
    });
  }

  // ── 5. Cancel a rental ────────────────────────────────────────
  // Note: DELETE /vehicle-rentals/:id is SUPER_ADMIN / OPERATOR only.
  // Regular users get 403. Kept for future admin feature.
  static Future<void> cancelRental({required String rentalId}) async {
    return safeApiCall(() async {
      if (rentalId.trim().isEmpty) throw Exception('Rental ID is required.');
      await ApiService.dio.delete('/vehicle-rentals/$rentalId');
    });
  }
}