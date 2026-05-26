// lib/services/payment_service.dart
//
// Pay individual ticket, pay all unpaid tickets for a vehicle,
// and read payment history.

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'api_service.dart';

class PaymentService {
  static const String _defaultMethod = 'MOBILE_APP';

  // ─── 1. Pay a single ticket ────────────────────────────────────
  static Future<Map<String, dynamic>> payTicket({
    required String ticketId,
    String paymentMethod = _defaultMethod,
  }) async {
    return safeApiCall(() async {
      _require(ticketId, 'Ticket ID');

      debugPrint('[payment] POST /payments/pay — ticket_id=$ticketId');

      try {
        final response = await ApiService.dio.post(
          '/payments/pay',
          data: {
            'ticket_id': ticketId,
            'payment_method': paymentMethod,
          },
        );
        debugPrint('[payment] payTicket success: ${response.data}');
        return response.data as Map<String, dynamic>;
      } on DioException catch (e) {
        final code = e.response?.statusCode;
        final body = e.response?.data;
        debugPrint('[payment] payTicket HTTP $code — body: $body');

        // If Joi rejects payment_method as unknown, retry without it
        if (code == 422) {
          debugPrint('[payment] Retrying without payment_method...');
          final retryResponse = await ApiService.dio.post(
            '/payments/pay',
            data: {'ticket_id': ticketId},
          );
          debugPrint('[payment] retry success: ${retryResponse.data}');
          return retryResponse.data as Map<String, dynamic>;
        }
        rethrow;
      }
    });
  }

  // ─── 2. Pay all unpaid tickets for a vehicle ───────────────────
  static Future<Map<String, dynamic>> payAllForVehicle({
    required String vehicleId,
    String paymentMethod = _defaultMethod,
  }) async {
    return safeApiCall(() async {
      _require(vehicleId, 'Vehicle ID');

      debugPrint('[payment] POST /payments/pay-all — vehicle_id=$vehicleId');

      try {
        final response = await ApiService.dio.post(
          '/payments/pay-all',
          data: {
            'vehicle_id': vehicleId,
            'payment_method': paymentMethod,
          },
        );
        debugPrint('[payment] payAll success: ${response.data}');
        return response.data as Map<String, dynamic>;
      } on DioException catch (e) {
        final code = e.response?.statusCode;
        final body = e.response?.data;
        debugPrint('[payment] payAll HTTP $code — body: $body');

        if (code == 422) {
          debugPrint('[payment] Retrying pay-all without payment_method...');
          final retryResponse = await ApiService.dio.post(
            '/payments/pay-all',
            data: {'vehicle_id': vehicleId},
          );
          debugPrint('[payment] pay-all retry success: ${retryResponse.data}');
          return retryResponse.data as Map<String, dynamic>;
        }
        rethrow;
      }
    });
  }

  // ─── 3. Payment history ────────────────────────────────────────
  static Future<Map<String, dynamic>> getMyPayments({
    int page = 1,
    int limit = 20,
  }) async {
    return safeApiCall(() async {
      debugPrint('[payment] GET /payments/my — page=$page limit=$limit');

      final response = await ApiService.dio.get(
        '/payments/my',
        queryParameters: {'page': page, 'limit': limit},
      );

      debugPrint('[payment] getMyPayments keys: ${response.data is Map ? (response.data as Map).keys.toList() : "not-map"}');
      return response.data as Map<String, dynamic>;
    });
  }

  static void _require(String v, String label) {
    if (v.trim().isEmpty) throw Exception('$label is required.');
  }
}