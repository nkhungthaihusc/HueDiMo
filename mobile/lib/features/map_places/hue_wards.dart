import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';

final hueWardsProvider = FutureProvider<List<HueWard>>((ref) async {
  final json =
      jsonDecode(await rootBundle.loadString('assets/data/hue-wards.json'))
          as Map<String, dynamic>;
  return (json['features'] as List)
      .map((feature) => HueWard.fromJson(feature as Map<String, dynamic>))
      .toList();
});

class HueWard {
  HueWard.fromJson(Map<String, dynamic> json)
    : code = json['properties']['code'] as String,
      name = json['properties']['name'] as String,
      polygons = _readPolygons(json['geometry'] as Map<String, dynamic>) {
    bounds = LatLngBounds.fromPoints(
      polygons.expand((polygon) => polygon.first).toList(),
    );
  }

  final String code;
  final String name;
  final List<List<List<LatLng>>> polygons;
  late final LatLngBounds bounds;

  static List<List<List<LatLng>>> _readPolygons(Map<String, dynamic> geometry) {
    final coordinates = geometry['coordinates'] as List;
    final polygons = geometry['type'] == 'Polygon'
        ? [coordinates]
        : coordinates;
    return [
      for (final polygon in polygons)
        [
          for (final ring in polygon as List)
            [
              for (final point in ring as List)
                LatLng(
                  (point[1] as num).toDouble(),
                  (point[0] as num).toDouble(),
                ),
            ],
        ],
    ];
  }

  bool contains(LatLng point) =>
      bounds.contains(point) &&
      polygons.any(
        (polygon) =>
            _ringContains(polygon.first, point) &&
            !polygon.skip(1).any((hole) => _ringContains(hole, point)),
      );

  static bool _ringContains(List<LatLng> ring, LatLng point) {
    var inside = false;
    final x = point.longitude;
    final y = point.latitude;
    for (var i = 1; i < ring.length; i++) {
      final a = ring[i - 1];
      final b = ring[i];
      final cross =
          (x - a.longitude) * (b.latitude - a.latitude) -
          (y - a.latitude) * (b.longitude - a.longitude);
      if (cross.abs() < 1e-12 &&
          (x - a.longitude) * (x - b.longitude) <= 0 &&
          (y - a.latitude) * (y - b.latitude) <= 0) {
        return true;
      }
      if ((a.latitude > y) != (b.latitude > y) &&
          x <
              a.longitude +
                  (y - a.latitude) *
                      (b.longitude - a.longitude) /
                      (b.latitude - a.latitude)) {
        inside = !inside;
      }
    }
    return inside;
  }
}
