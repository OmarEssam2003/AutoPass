// lib/services/alert_service.dart
//
// User notifications/alerts. Used by the home page bell icon
// and the notifications panel.

import 'api_service.dart';

class AlertService {
  /// Returns the full response: `data` (List) and `meta` (paging).
  static Future<Map<String, dynamic>> getMyAlerts({
    bool? isRead,
    int page = 1,
    int limit = 20,
  }) async {
    return safeApiCall(() async {
      final response = await ApiService.dio.get(
        '/alerts/my',
        queryParameters: {
          if (isRead != null) 'is_read': isRead.toString(),
          'page': page,
          'limit': limit,
        },
      );
      return response.data as Map<String, dynamic>;
    });
  }

  /// Convenience: just the list.
  static Future<List<dynamic>> getMyAlertsList({
    bool? isRead,
    int page = 1,
    int limit = 20,
  }) async {
    final res = await getMyAlerts(isRead: isRead, page: page, limit: limit);
    return (res['data'] as List?) ?? [];
  }

  /// Returns the count of unread alerts for the bell badge.
  static Future<int> getUnreadCount() async {
    final res = await getMyAlerts(isRead: false, page: 1, limit: 1);
    final meta = res['meta'] as Map<String, dynamic>?;
    if (meta != null && meta['total'] != null) {
      return (meta['total'] as num).toInt();
    }
    return ((res['data'] as List?) ?? []).length;
  }
}
