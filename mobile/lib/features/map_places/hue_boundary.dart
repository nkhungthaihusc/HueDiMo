import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import 'hue_boundary_points.dart';

final hueBounds = LatLngBounds.fromPoints(hueBoundaryPoints);

bool isInHue(LatLng point) {
  final lat = point.latitude;
  final lng = point.longitude;
  if (!lat.isFinite || !lng.isFinite || !hueBounds.contains(point)) {
    return false;
  }

  var inside = false;
  for (var i = 1; i < hueBoundaryPoints.length; i++) {
    final a = hueBoundaryPoints[i - 1];
    final b = hueBoundaryPoints[i];
    final cross =
        (lng - a.longitude) * (b.latitude - a.latitude) -
        (lat - a.latitude) * (b.longitude - a.longitude);
    if (cross.abs() < 1e-12 &&
        (lng - a.longitude) * (lng - b.longitude) <= 0 &&
        (lat - a.latitude) * (lat - b.latitude) <= 0) {
      return true;
    }
    if ((a.latitude > lat) != (b.latitude > lat) &&
        lng <
            a.longitude +
                (lat - a.latitude) *
                    (b.longitude - a.longitude) /
                    (b.latitude - a.latitude)) {
      inside = !inside;
    }
  }
  return inside;
}
