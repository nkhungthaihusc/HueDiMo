import 'dart:math' as math;
import 'dart:ui';

import 'package:latlong2/latlong.dart';

import 'place.dart';

class PlaceCluster {
  PlaceCluster(Place place, this.x, this.y)
    : places = [place],
      position = place.position;

  final List<Place> places;
  LatLng position;
  double x;
  double y;
}

List<PlaceCluster> clusterPlaces(
  List<Place> places,
  double zoom, {
  String? selectedId,
}) {
  final groups = <PlaceCluster>[];
  final worldSize = 256 * math.pow(2, zoom);
  final sorted = {for (final place in places) place.id: place}.values.toList()
    ..sort((a, b) => a.id.compareTo(b.id));
  for (final place in sorted) {
    final sinLat = math.sin(place.position.latitude * math.pi / 180);
    final x = (place.position.longitude + 180) / 360 * worldSize;
    final y =
        (.5 - math.log((1 + sinLat) / (1 - sinLat)) / (4 * math.pi)) *
        worldSize;
    PlaceCluster? nearby;
    if (zoom < 15 && place.id != selectedId) {
      for (final group in groups) {
        if (group.places.first.id != selectedId &&
            math.sqrt(math.pow(group.x - x, 2) + math.pow(group.y - y, 2)) <
                60) {
          nearby = group;
          break;
        }
      }
    }
    if (nearby == null) {
      groups.add(PlaceCluster(place, x, y));
      continue;
    }
    final count = nearby.places.length;
    nearby.position = LatLng(
      (nearby.position.latitude * count + place.position.latitude) /
          (count + 1),
      (nearby.position.longitude * count + place.position.longitude) /
          (count + 1),
    );
    nearby.x = (nearby.x * count + x) / (count + 1);
    nearby.y = (nearby.y * count + y) / (count + 1);
    nearby.places.add(place);
  }
  return groups;
}

Map<String, Offset> layoutMarkerOffsets(
  List<({String id, LatLng position})> points,
  double zoom,
) {
  final offsets = <String, Offset>{};
  final occupied = <Offset>[];
  final worldSize = 256 * math.pow(2, zoom);
  final horizontalGap = zoom >= 15 ? 144.0 : 52.0;
  final verticalGap = zoom >= 15 ? 76.0 : 52.0;
  const directions = [
    Offset(0, -1),
    Offset(1, 0),
    Offset(0, 1),
    Offset(-1, 0),
    Offset(1, -1),
    Offset(1, 1),
    Offset(-1, 1),
    Offset(-1, -1),
  ];
  final sorted = [...points]..sort((a, b) => a.id.compareTo(b.id));
  for (final point in sorted) {
    final sinLat = math.sin(point.position.latitude * math.pi / 180);
    final position = Offset(
      (point.position.longitude + 180) / 360 * worldSize,
      (.5 - math.log((1 + sinLat) / (1 - sinLat)) / (4 * math.pi)) * worldSize,
    );
    bool isFree(Offset offset) => !occupied.any(
      (other) =>
          (other.dx - position.dx - offset.dx).abs() < horizontalGap &&
          (other.dy - position.dy - offset.dy).abs() < verticalGap,
    );
    var offset = Offset.zero;
    if (!isFree(offset)) {
      search:
      for (var ring = 1; ring <= points.length; ring++) {
        for (final direction in directions) {
          final candidate = Offset(
            direction.dx * horizontalGap * ring,
            direction.dy * verticalGap * ring,
          );
          if (isFree(candidate)) {
            offset = candidate;
            break search;
          }
        }
      }
    }
    offsets[point.id] = offset;
    occupied.add(position + offset);
  }
  return offsets;
}
