import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'place.dart';

final apiClientProvider = Provider<Dio>((ref) {
  const origin = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://huedimobe.hungthaisoft.id.vn',
  );
  final dio = Dio(
    BaseOptions(
      baseUrl: origin,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 15),
    ),
  );
  ref.onDispose(() => dio.close(force: true));
  return dio;
});

final placesProvider = FutureProvider<List<Place>>((ref) async {
  final cancellation = CancelToken();
  ref.onDispose(() => cancellation.cancel());
  final response = await ref
      .watch(apiClientProvider)
      .get<Object?>('/api/places', cancelToken: cancellation);
  final envelope = response.data;
  if (envelope is! Map<String, dynamic> || envelope['data'] is! List) {
    throw const FormatException('Danh mục địa điểm không hợp lệ.');
  }
  return [
    for (final row in envelope['data'] as List)
      if (row is Map<String, dynamic> &&
          row['id'] is String &&
          row['name'] is String)
        Place.fromJson(row),
  ].where((place) => place.hasValidPosition).toList(growable: false);
});
