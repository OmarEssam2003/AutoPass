// lib/services/api_service.dart
//
// Core HTTP client for AutoPass backend.
// Every protected request automatically attaches the JWT token.
// On 401 the user is logged out and pushed back to /login.

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  // ⚠️ Replace with your backend server IP / domain.
  // For Chrome (web) testing on the same machine use http://localhost:3000/api
  // For a Samsung physical device on the same Wi-Fi use http://<PC_LAN_IP>:3000/api
  static const String baseUrl = 'http://localhost:3000/api';

  static final Dio dio = Dio(
    BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 20),
      sendTimeout: const Duration(seconds: 30), // file uploads
      // Don't throw on 4xx — we handle them ourselves in safeApiCall
      validateStatus: (status) => status != null && status < 500,
    ),
  );

  /// Global navigator key — lets us redirect to /login from anywhere
  /// when the token expires (401). Wire it into MaterialApp.
  static final GlobalKey<NavigatorState> navigatorKey =
      GlobalKey<NavigatorState>();

  static bool _initialized = false;

  /// Call once on app startup (e.g. inside main() before runApp).
  /// Reads the saved JWT and installs request/response interceptors.
  static Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();

    // Remove any old interceptors so re-init (after login) doesn't stack them.
    dio.interceptors.clear();

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          final token = prefs.getString('token');
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onResponse: (response, handler) {
          // Some endpoints return 4xx without throwing because of validateStatus.
          // Convert them into DioExceptions so callers can catch them uniformly.
          final code = response.statusCode ?? 0;
          if (code >= 400) {
            return handler.reject(
              DioException(
                requestOptions: response.requestOptions,
                response: response,
                type: DioExceptionType.badResponse,
                message: response.data is Map
                    ? (response.data['message']?.toString() ?? 'Request failed')
                    : 'Request failed',
              ),
            );
          }
          return handler.next(response);
        },
        onError: (error, handler) async {
          // Only auto-logout on 401 from non-login endpoints.
          // Wrong-password failures shouldn't kick the user out.
          final path = error.requestOptions.path;
          final isLoginEndpoint = path.contains('/auth/login');
          if (error.response?.statusCode == 401 && !isLoginEndpoint) {
            await _handleSessionExpired();
          }
          return handler.next(error);
        },
      ),
    );

    if (kDebugMode) {
      dio.interceptors.add(
        LogInterceptor(
          requestBody: true,
          responseBody: true,
          requestHeader: false,
          responseHeader: false,
          logPrint: (obj) => debugPrint(obj.toString()),
        ),
      );
    }

    _initialized = true;
  }

  static bool get isInitialized => _initialized;

  static Future<void> _handleSessionExpired() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();

    // Only redirect if a /login route is actually registered in MaterialApp.
    // During API testing the test page is the only screen and there is no
    // /login route — in that case we silently skip the redirect.
    final nav = navigatorKey.currentState;
    if (nav == null) return;

    try {
      nav.pushNamedAndRemoveUntil('/login', (route) => false);
    } catch (_) {
      // Route not registered — ignore.
    }
  }
}

/// Wraps any API call so all errors come back as a single Exception
/// with a user-friendly message.
///
/// Usage:
///   final profile = await safeApiCall(() => UserService.getMyProfile());
Future<T> safeApiCall<T>(Future<T> Function() call) async {
  try {
    return await call();
  } on DioException catch (e) {
    final status = e.response?.statusCode;
    final raw = e.response?.data;
    final serverMsg = (raw is Map && raw['message'] != null)
        ? raw['message'].toString()
        : null;

    switch (status) {
      case 400:
        throw Exception(serverMsg ?? 'Bad request. Check the form fields.');
      case 401:
        // 401 from /auth/login means wrong credentials — pass the server's
        // actual message through. 401 from any OTHER endpoint means the
        // saved token is invalid/expired.
        final isLoginEndpoint =
            e.requestOptions.path.contains('/auth/login');
        if (isLoginEndpoint) {
          throw Exception(serverMsg ?? 'Invalid email or password.');
        }
        throw Exception(serverMsg ?? 'Session expired. Please log in again.');
      case 403:
        throw Exception(serverMsg ?? 'You are not allowed to do that.');
      case 404:
        throw Exception(serverMsg ?? 'Not found.');
      case 409:
        throw Exception(serverMsg ?? 'Conflict — this item already exists.');
      case 422:
        throw Exception(serverMsg ?? 'Some fields are missing or invalid.');
      case 429:
        throw Exception('Too many attempts. Please wait a moment.');
      default:
        if (e.type == DioExceptionType.connectionTimeout ||
            e.type == DioExceptionType.receiveTimeout ||
            e.type == DioExceptionType.sendTimeout) {
          throw Exception('Network timeout. Check your connection.');
        }
        if (e.type == DioExceptionType.connectionError) {
          throw Exception(
            'Cannot reach the server. Make sure the backend is running.',
          );
        }
        throw Exception(serverMsg ?? 'Network error. Please try again.');
    }
  } catch (e) {
    if (e is Exception) rethrow;
    throw Exception('Unexpected error: $e');
  }
}
