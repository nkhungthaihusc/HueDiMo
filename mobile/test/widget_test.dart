import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:mobile/features/map_places/hue_boundary.dart';
import 'package:mobile/features/map_places/hue_wards.dart';
import 'package:mobile/features/map_places/place.dart';
import 'package:mobile/features/map_places/place_clusters.dart';
import 'package:mobile/features/map_places/place_repository.dart';
import 'package:mobile/main.dart';

void main() {
  test('Huế includes Lăng Cô but excludes neighboring areas', () {
    expect(isInHue(const LatLng(16.4637, 107.5907)), isTrue);
    expect(isInHue(const LatLng(16.2356, 108.0772)), isTrue);
    expect(isInHue(const LatLng(16.63824, 107.30994)), isTrue);
    expect(isInHue(const LatLng(16.10, 107.15)), isFalse);
    expect(isInHue(const LatLng(16.061, 108.227)), isFalse);
  });

  testWidgets(
    'loads 40 wards and matches coordinates to the current boundaries',
    (tester) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);
      final wards = await tester.runAsync(
        () => container.read(hueWardsProvider.future),
      );
      expect(wards, hasLength(40));
      expect(
        wards!.where((ward) => ward.name.startsWith('Phường ')),
        hasLength(21),
      );
      expect(wards.where((ward) => ward.name.startsWith('Xã ')), hasLength(19));
      expect(
        wards
            .where((ward) => ward.contains(const LatLng(16.47023, 107.57725)))
            .map((ward) => ward.code),
        ['19753'],
      );
    },
  );

  test(
    'clusters nearby places below zoom 15 and keeps selected places separate',
    () {
      final a = Place.fromJson({
        'id': 'a',
        'name': 'A',
        'lat': 16.47023,
        'lng': 107.57725,
      });
      final b = Place.fromJson({
        'id': 'b',
        'name': 'B',
        'lat': 16.4703,
        'lng': 107.5773,
      });
      expect(clusterPlaces([a, b], 12).single.places, hasLength(2));
      expect(clusterPlaces([a, b], 15), hasLength(2));
      expect(clusterPlaces([a, b], 12, selectedId: 'a'), hasLength(2));
      expect(clusterPlaces([a, a], 12).single.places, hasLength(1));
      final coincident = Place.fromJson({
        'id': 'c',
        'name': 'C',
        'lat': a.position.latitude,
        'lng': a.position.longitude,
      });
      final offsets = layoutMarkerOffsets([
        (id: a.id, position: a.position),
        (id: coincident.id, position: coincident.position),
      ], 15);
      expect(offsets[a.id], isNot(offsets[coincident.id]));
    },
  );

  testWidgets('shows the selected place details directly in the map preview', (
    tester,
  ) async {
    final place = Place.fromJson({
      'id': 'dai-noi',
      'name': 'Đại Nội Huế (Hoàng Thành)',
      'category': 'ancient',
      'lat': '16.47023',
      'lng': '107.57725',
      'opening_hours': '07:00 - 17:30',
    });
    final outside = Place.fromJson({
      'id': 'cau-rong',
      'name': 'Cầu Rồng',
      'category': 'ancient',
      'lat': 16.061,
      'lng': 108.227,
    });
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          placesProvider.overrideWith((ref) async => [place, outside]),
        ],
        child: const HueDiMoApp(showTiles: false),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Nổi bật ở Huế'), findsOneWidget);
    final map = tester
        .widget<FlutterMap>(find.byType(FlutterMap))
        .mapController!;
    final label = find.text('Đại Nội Huế');
    expect(label, findsNothing);
    map.move(place.position, 15);
    await tester.pumpAndSettle();
    expect(label, findsOneWidget);
    map.move(place.position, 14);
    await tester.pumpAndSettle();
    expect(label, findsNothing);
    await tester.enterText(find.byType(EditableText), 'Cau Rong');
    await tester.pumpAndSettle();
    expect(find.textContaining('Địa điểm này nằm ngoài'), findsOneWidget);
    expect(find.text('Cầu Rồng'), findsNothing);
    await tester.enterText(find.byType(EditableText), 'Dai Noi');
    await tester.pumpAndSettle();
    await tester.tap(find.text(place.name));
    await tester.pumpAndSettle();
    expect(find.text('Giờ mở cửa: 07:00 - 17:30'), findsOneWidget);
    expect(find.text('Xem thêm'), findsNothing);
    expect(find.byType(Dialog), findsNothing);
    await tester.tap(find.byTooltip('Đóng xem nhanh'));
    await tester.pumpAndSettle();
    expect(find.text('Giờ mở cửa: 07:00 - 17:30'), findsNothing);
    expect(find.text('Dai Noi'), findsOneWidget);
  });

  testWidgets(
    'both colocated destinations can be selected by their marker or label',
    (tester) async {
      final first = Place.fromJson({
        'id': 'a',
        'name': 'Điểm thứ nhất',
        'lat': 16.47023,
        'lng': 107.57725,
      });
      final second = Place.fromJson({
        'id': 'b',
        'name': 'Điểm thứ hai',
        'lat': 16.47023,
        'lng': 107.57725,
      });
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            placesProvider.overrideWith((ref) async => [first, first, second]),
            hueWardsProvider.overrideWith((ref) async => []),
          ],
          child: const HueDiMoApp(showTiles: false),
        ),
      );
      await tester.pumpAndSettle();
      final map = tester
          .widget<FlutterMap>(find.byType(FlutterMap))
          .mapController!;
      map.move(first.position, 15);
      await tester.pumpAndSettle();
      final a = tester.getCenter(find.byTooltip(first.name));
      final b = tester.getCenter(find.byTooltip(second.name));
      expect((a - b).distance, greaterThanOrEqualTo(48));
      await tester.tap(find.text(second.name));
      await tester.pumpAndSettle();
      expect(find.byTooltip('Đóng xem nhanh'), findsOneWidget);
      expect(find.text(second.name), findsNWidgets(2));
      await tester.tap(find.byTooltip(first.name));
      await tester.pumpAndSettle();
      expect(find.text(first.name), findsNWidgets(2));
    },
  );

  testWidgets('selects a ward and restores all places from the selector', (
    tester,
  ) async {
    final container = ProviderContainer();
    addTearDown(container.dispose);
    final wards = (await tester.runAsync(
      () => container.read(hueWardsProvider.future),
    ))!;
    final citadel = Place.fromJson({
      'id': 'dai-noi',
      'name': 'Đại Nội',
      'lat': 16.47023,
      'lng': 107.57725,
    });
    final temple = Place.fromJson({
      'id': 'chua-thien-mu',
      'name': 'Thiên Mụ',
      'lat': 16.453,
      'lng': 107.544,
    });
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          placesProvider.overrideWith((ref) async => [citadel, temple]),
          hueWardsProvider.overrideWith(
            (ref) async => wards
                .where((ward) => ['19753', '19774'].contains(ward.code))
                .toList(),
          ),
        ],
        child: const HueDiMoApp(showTiles: false),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byType(DropdownButtonFormField<String>));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Phường Kim Long').last);
    await tester.pumpAndSettle();
    expect(find.text('1 điểm'), findsOneWidget);
    var markers = tester.widget<MarkerLayer>(find.byType(MarkerLayer)).markers;
    expect(markers, hasLength(1));
    expect(markers.single.point, temple.position);
    await tester.tap(find.byType(DropdownButtonFormField<String>));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Toàn thành phố Huế').last);
    await tester.pumpAndSettle();
    expect(find.text('1 điểm'), findsNothing);
    markers = tester.widget<MarkerLayer>(find.byType(MarkerLayer)).markers;
    expect(markers, hasLength(1));
    expect(find.text('2'), findsOneWidget);
  });
}
