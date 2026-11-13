import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/map_places/place.dart';
import 'package:mobile/features/map_places/place_repository.dart';
import 'package:mobile/main.dart';

void main() {
  testWidgets(
    'finds a featured place and preserves its preview after details',
    (tester) async {
      final place = Place.fromJson({
        'id': 'dai-noi',
        'name': 'Đại Nội Huế',
        'category': 'ancient',
        'lat': '16.47023',
        'lng': '107.57725',
        'opening_hours': '07:00 - 17:30',
      });
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            placesProvider.overrideWith((ref) async => [place]),
          ],
          child: const HueDiMoApp(showTiles: false),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Nổi bật ở Huế'), findsOneWidget);
      await tester.enterText(find.byType(EditableText), 'Dai Noi');
      await tester.pumpAndSettle();
      await tester.tap(find.text('Đại Nội Huế'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Xem thêm'));
      await tester.pumpAndSettle();
      expect(find.text('Giờ mở cửa: 07:00 - 17:30'), findsOneWidget);
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(find.text('Xem thêm'), findsOneWidget);
      expect(find.text('Dai Noi'), findsOneWidget);
    },
  );
}
