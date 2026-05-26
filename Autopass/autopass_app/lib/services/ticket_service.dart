// lib/services/ticket_service.dart
//
// Tickets list with status filtering & pagination.

import 'api_service.dart';

/// Status values for tickets — keep these in sync with the backend enum.
class TicketStatus {
  static const unpaid = 'UNPAID';
  static const paid = 'PAID';
  static const disputed = 'DISPUTED';
  static const cancelled = 'CANCELLED';

  static const all = [unpaid, paid, disputed, cancelled];
}

class TicketService {
  /// Returns the full response, including `data` (List) and `meta` (paging).
  static Future<Map<String, dynamic>> getMyTickets({
    required String status,
    int page = 1,
    int limit = 20,
  }) async {
    return safeApiCall(() async {
      if (status.trim().isEmpty) {
        throw Exception('Status filter is required.');
      }
      if (!TicketStatus.all.contains(status)) {
        throw Exception('Invalid status: $status');
      }

      final response = await ApiService.dio.get(
        '/tickets/my',
        queryParameters: {
          'status': status,
          'page': page,
          'limit': limit,
        },
      );
      return response.data as Map<String, dynamic>;
    });
  }

  /// Convenience: just the list of tickets, ignoring paging meta.
  static Future<List<dynamic>> getMyTicketsList({
    required String status,
    int page = 1,
    int limit = 20,
  }) async {
    final res = await getMyTickets(status: status, page: page, limit: limit);
    return (res['data'] as List?) ?? [];
  }
}
