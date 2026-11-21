import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';

import 'hue_boundary.dart';
import 'hue_boundary_points.dart';
import 'hue_wards.dart';
import 'place.dart';
import 'place_clusters.dart';
import 'place_detail.dart';
import 'place_repository.dart';

const hueCenter = LatLng(16.4637, 107.5907);
const outsideHuePlaceMessage =
    'Địa điểm này nằm ngoài thành phố Huế. Bản đồ vẫn hiển thị Huế.';
const featuredIds = [
  'dai-noi',
  'chua-thien-mu',
  'lang-co',
  'cau-truong-tien',
  'cho-dong-ba',
  'lang-huong-thuy-xuan',
];

class MapScreen extends ConsumerStatefulWidget {
  const MapScreen({super.key, this.showTiles = true});

  final bool showTiles;

  @override
  ConsumerState<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends ConsumerState<MapScreen> {
  static const _placeLabelMinZoom = 15.0;
  static final _placeNameSuffix = RegExp(r'(?:\s+\([^()]*\))+\s*$');
  final _map = MapController();
  final _search = TextEditingController();
  String? _category;
  Place? _selected;
  LatLng? _location;
  bool _expanded = false;
  bool _locating = false;
  bool _tileError = false;
  bool _showPlaceLabels = false;
  double _zoom = 13;
  HueWard? _ward;
  int _tileRevision = 0;

  @override
  void dispose() {
    _search.dispose();
    _map.dispose();
    super.dispose();
  }

  void _select(Place place) {
    FocusScope.of(context).unfocus();
    _map.move(place.position, _map.camera.zoom);
    setState(() {
      _selected = place;
      _expanded = false;
    });
  }

  void _selectWard(HueWard? ward) {
    setState(() {
      _ward = ward;
      _selected = null;
      _expanded = false;
    });
    _map.fitCamera(
      CameraFit.bounds(
        bounds: ward?.bounds ?? hueBounds,
        padding: const EdgeInsets.all(36),
        maxZoom: 14,
      ),
    );
  }

  Future<void> _locate() async {
    setState(() => _locating = true);
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        _message('Hãy bật dịch vụ vị trí trên điện thoại.');
        return;
      }
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission != LocationPermission.always &&
          permission != LocationPermission.whileInUse) {
        _message(
          'Bạn vẫn có thể chọn địa điểm trên bản đồ. Để định vị, hãy cho phép vị trí trong Cài đặt.',
        );
        return;
      }
      final result = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          timeLimit: Duration(seconds: 12),
        ),
      );
      if (!mounted) return;
      final location = LatLng(result.latitude, result.longitude);
      if (!isInHue(location)) {
        setState(() => _location = null);
        _message(
          'Bạn đang ở ngoài thành phố Huế, nên bản đồ vẫn hiển thị Huế.',
        );
        return;
      }
      _map.move(location, 14);
      setState(() {
        _location = location;
        _selected = null;
      });
    } catch (_) {
      _message('Không lấy được vị trí. Vui lòng thử lại.');
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  void _message(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final result = ref.watch(placesProvider);
    final wardResult = ref.watch(hueWardsProvider);
    final wards = wardResult.value ?? const <HueWard>[];
    final catalog = {
      for (final place in result.value ?? const <Place>[]) place.id: place,
    }.values.toList(growable: false);
    final places = catalog.where(
      (place) =>
          isInHue(place.position) && (_ward?.contains(place.position) ?? true),
    );
    final query = foldVietnamese(_search.text);
    bool matches(Place place) =>
        foldVietnamese('${place.name} ${place.address ?? ''}').contains(query);

    final filtered = places
        .where(
          (place) =>
              (_category == null || _category == place.category) &&
              (query.isEmpty || matches(place)),
        )
        .toList();
    final browsing = query.isEmpty && _category == null && _ward == null;
    final byId = {for (final place in places) place.id: place};
    final suggestions = browsing
        ? [for (final id in featuredIds) ?byId[id]]
        : filtered;
    final outsideMatch =
        query.isNotEmpty &&
        suggestions.isEmpty &&
        catalog.any((place) => matches(place) && !isInHue(place.position));
    final selected = _selected == null ? null : byId[_selected!.id];
    final clusters = clusterPlaces(filtered, _zoom, selectedId: selected?.id);
    final offsets = layoutMarkerOffsets([
      for (final cluster in clusters)
        (
          id: cluster.places.map((place) => place.id).join('|'),
          position: cluster.position,
        ),
    ], _zoom);
    return Scaffold(
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            return Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                  child: TextField(
                    controller: _search,
                    onChanged: (_) => setState(() => _selected = null),
                    decoration: InputDecoration(
                      hintText: 'Tìm địa điểm ở Huế',
                      prefixIcon: const Icon(Icons.search),
                      suffixIcon: _search.text.isEmpty
                          ? null
                          : IconButton(
                              tooltip: 'Xóa tìm kiếm',
                              onPressed: () {
                                _search.clear();
                                setState(() => _selected = null);
                              },
                              icon: const Icon(Icons.close),
                            ),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                  child: Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          key: ValueKey(_ward?.code ?? ''),
                          initialValue: _ward?.code ?? '',
                          isExpanded: true,
                          decoration: const InputDecoration(
                            labelText: 'Xã / phường',
                          ),
                          items: [
                            DropdownMenuItem(
                              value: '',
                              child: Text(
                                wardResult.isLoading
                                    ? 'Đang tải ranh giới…'
                                    : wardResult.hasError
                                    ? 'Chưa tải được ranh giới'
                                    : 'Toàn thành phố Huế',
                              ),
                            ),
                            for (final ward in wards)
                              DropdownMenuItem(
                                value: ward.code,
                                child: Text(ward.name),
                              ),
                          ],
                          onChanged: wards.isEmpty
                              ? null
                              : (code) => _selectWard(
                                  wards
                                      .where((ward) => ward.code == code)
                                      .firstOrNull,
                                ),
                        ),
                      ),
                      if (_ward != null)
                        Padding(
                          padding: const EdgeInsets.only(left: 8),
                          child: Text('${filtered.length} điểm'),
                        ),
                      if (wardResult.hasError)
                        IconButton(
                          tooltip: 'Tải lại ranh giới',
                          onPressed: () => ref.invalidate(hueWardsProvider),
                          icon: const Icon(Icons.refresh),
                        ),
                    ],
                  ),
                ),
                SizedBox(
                  height: 54,
                  child: ListView(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    scrollDirection: Axis.horizontal,
                    children: [
                      _filter(null, 'Tất cả'),
                      for (final entry in categories.entries)
                        _filter(entry.key, entry.value.label, entry.value),
                    ],
                  ),
                ),
                Expanded(
                  child: Stack(
                    children: [
                      FlutterMap(
                        mapController: _map,
                        options: MapOptions(
                          initialCenter: hueCenter,
                          initialZoom: 13,
                          minZoom: 8,
                          maxZoom: 19,
                          cameraConstraint: CameraConstraint.containCenter(
                            bounds: hueBounds,
                          ),
                          onPositionChanged: (camera, _) {
                            final showLabels =
                                camera.zoom >= _placeLabelMinZoom;
                            if (_zoom != camera.zoom) {
                              setState(() {
                                _zoom = camera.zoom;
                                _showPlaceLabels = showLabels;
                              });
                            }
                          },
                          onTap: (_, point) {
                            if (!isInHue(point)) {
                              _message(outsideHuePlaceMessage);
                              return;
                            }
                            final ward = wards
                                .where((ward) => ward.contains(point))
                                .firstOrNull;
                            if (ward != null) {
                              _selectWard(ward);
                              return;
                            }
                            setState(() => _selected = null);
                          },
                        ),
                        children: [
                          if (widget.showTiles)
                            TileLayer(
                              key: ValueKey(_tileRevision),
                              urlTemplate: const String.fromEnvironment(
                                'MAP_TILE_URL',
                                defaultValue:
                                    'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                              ),
                              userAgentPackageName: 'vn.hungthaisoft.huedimo',
                              errorTileCallback: (_, _, _) {
                                if (_tileError) return;
                                WidgetsBinding.instance.addPostFrameCallback((
                                  _,
                                ) {
                                  if (mounted && !_tileError) {
                                    setState(() => _tileError = true);
                                  }
                                });
                              },
                            ),
                          if (widget.showTiles)
                            PolygonLayer(
                              polygons: [
                                Polygon(
                                  points: const [
                                    LatLng(10, 100),
                                    LatLng(10, 115),
                                    LatLng(23, 115),
                                    LatLng(23, 100),
                                  ],
                                  holePointsList: const [hueBoundaryPoints],
                                  color: const Color(0x2EE2E8F0),
                                ),
                              ],
                            ),
                          PolygonLayer(
                            polygons: [
                              for (final ward in wards)
                                for (final polygon in ward.polygons)
                                  Polygon(
                                    points: polygon.first,
                                    holePointsList: polygon.skip(1).toList(),
                                    color: const Color(0xFF7C3AED).withValues(
                                      alpha: _ward?.code == ward.code
                                          ? .12
                                          : .015,
                                    ),
                                    borderColor: _ward?.code == ward.code
                                        ? const Color(0xFF6D28D9)
                                        : const Color(0xBF64748B),
                                    borderStrokeWidth: _ward?.code == ward.code
                                        ? 3
                                        : 1.2,
                                  ),
                            ],
                          ),
                          MarkerLayer(
                            markers: [
                              for (final cluster in clusters)
                                _offsetMarker(
                                  cluster.places.length > 1
                                      ? _clusterMarker(cluster)
                                      : _marker(
                                          cluster.places.first,
                                          selected:
                                              cluster.places.first.id ==
                                              selected?.id,
                                        ),
                                  offsets[cluster.places
                                      .map((place) => place.id)
                                      .join('|')]!,
                                ),
                              if (_location case final location?)
                                Marker(
                                  point: location,
                                  child: const Icon(
                                    Icons.my_location,
                                    color: Colors.blue,
                                  ),
                                ),
                            ],
                          ),
                        ],
                      ),
                      Positioned(
                        top: 8,
                        right: 12,
                        child: IconButton.filledTonal(
                          tooltip: 'Vị trí của tôi',
                          onPressed: _locating ? null : _locate,
                          icon: const Icon(Icons.my_location),
                        ),
                      ),
                      if (_tileError)
                        Positioned(
                          top: 8,
                          left: 12,
                          right: 70,
                          child: Align(
                            alignment: Alignment.centerLeft,
                            child: FilledButton.tonalIcon(
                              onPressed: () => setState(() {
                                _tileError = false;
                                _tileRevision++;
                              }),
                              icon: const Icon(Icons.refresh),
                              label: const Text('Tải lại bản đồ'),
                            ),
                          ),
                        ),
                      if (widget.showTiles)
                        Positioned(
                          right: 4,
                          bottom: 0,
                          child: TextButton(
                            onPressed: () => launchUrl(
                              Uri.parse(
                                const String.fromEnvironment(
                                  'MAP_ATTRIBUTION_URL',
                                  defaultValue:
                                      'https://www.openstreetmap.org/copyright',
                                ),
                              ),
                            ),
                            style: TextButton.styleFrom(
                              backgroundColor: Colors.white,
                            ),
                            child: const Text(
                              String.fromEnvironment(
                                'MAP_ATTRIBUTION',
                                defaultValue: '© OpenStreetMap contributors',
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                Material(
                  color: Colors.white,
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(24),
                  ),
                  child: ConstrainedBox(
                    constraints: BoxConstraints(
                      maxHeight: constraints.maxHeight * .46,
                    ),
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      child: selected != null
                          ? _preview(selected)
                          : _suggestions(
                              result,
                              suggestions,
                              browsing,
                              outsideMatch,
                            ),
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _filter(String? id, String label, [PlaceCategory? category]) =>
      Padding(
        padding: const EdgeInsets.only(right: 8),
        child: Center(
          child: FilterChip(
            label: Text(label),
            avatar: category == null
                ? null
                : Icon(category.icon, color: category.color, size: 18),
            selected: _category == id,
            onSelected: (_) => setState(() {
              _category = id;
              _selected = null;
            }),
          ),
        ),
      );

  Marker _offsetMarker(Marker marker, Offset offset) {
    if (offset == Offset.zero) return marker;
    final width = marker.width + 2 * offset.dx.abs();
    final height = marker.height + 2 * offset.dy.abs();
    final anchor = Offset(
      marker.width * (1 - (marker.alignment?.x ?? 0)) / 2 + offset.dx.abs(),
      marker.height * (1 - (marker.alignment?.y ?? 0)) / 2 + offset.dy.abs(),
    );
    return Marker(
      point: marker.point,
      width: width,
      height: height,
      alignment: Alignment(
        1 - 2 * anchor.dx / width,
        1 - 2 * anchor.dy / height,
      ),
      child: Stack(
        children: [
          Positioned(
            left: anchor.dx,
            top: anchor.dy,
            child: IgnorePointer(
              child: Transform.rotate(
                angle: math.atan2(offset.dy, offset.dx),
                alignment: Alignment.centerLeft,
                child: SizedBox(
                  width: offset.distance,
                  height: 1,
                  child: const ColoredBox(color: Color(0xFF64748B)),
                ),
              ),
            ),
          ),
          Positioned(
            left: offset.dx.abs() + offset.dx,
            top: offset.dy.abs() + offset.dy,
            width: marker.width,
            height: marker.height,
            child: marker.child,
          ),
        ],
      ),
    );
  }

  Marker _marker(Place place, {bool selected = false}) {
    final category = categoryFor(place.category);
    final shortName = place.name.replaceFirst(_placeNameSuffix, '').trim();
    return Marker(
      point: place.position,
      width: _showPlaceLabels ? 132 : 48,
      height: _showPlaceLabels ? 76 : 48,
      alignment: _showPlaceLabels
          ? const Alignment(0, 1 - 48 / 76)
          : Alignment.center,
      child: Stack(
        fit: StackFit.expand,
        clipBehavior: Clip.none,
        children: [
          Positioned(
            top: 0,
            left: _showPlaceLabels ? 42 : 0,
            width: 48,
            height: 48,
            child: Semantics(
              selected: selected,
              child: IconButton(
                tooltip: place.name,
                onPressed: () => _select(place),
                style: IconButton.styleFrom(
                  foregroundColor: Colors.white,
                  backgroundColor: category.color,
                  side: BorderSide(
                    color: Colors.white,
                    width: selected ? 4 : 2,
                  ),
                ),
                icon: Icon(category.icon, size: selected ? 24 : 20),
              ),
            ),
          ),
          if (_showPlaceLabels)
            Positioned(
              top: 52,
              left: 0,
              right: 0,
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () => _select(place),
                child: Semantics(
                  button: true,
                  child: Center(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(6),
                        boxShadow: const [
                          BoxShadow(color: Colors.black26, blurRadius: 4),
                        ],
                      ),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 2,
                        ),
                        child: Text(
                          shortName.isEmpty ? place.name : shortName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Color(0xFF0F172A),
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Marker _clusterMarker(PlaceCluster cluster) => Marker(
    point: cluster.position,
    width: 48,
    height: 48,
    child: Semantics(
      label: 'Phóng to cụm ${cluster.places.length} địa điểm',
      button: true,
      child: FilledButton(
        style: FilledButton.styleFrom(
          padding: EdgeInsets.zero,
          backgroundColor: const Color(0xFF7C3AED),
          foregroundColor: Colors.white,
          shape: const CircleBorder(
            side: BorderSide(color: Color(0xFFC4B5FD), width: 4),
          ),
        ),
        onPressed: () => _map.move(cluster.position, (_zoom + 2).clamp(8, 15)),
        child: Text('${cluster.places.length}'),
      ),
    ),
  );

  Widget _preview(Place place) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Row(
        children: [
          Expanded(
            child: Text(
              place.name,
              style: Theme.of(context).textTheme.titleMedium,
            ),
          ),
          IconButton(
            tooltip: 'Đóng xem nhanh',
            icon: const Icon(Icons.close),
            onPressed: () => setState(() => _selected = null),
          ),
        ],
      ),
      if (place.rating case final rating? when rating > 0)
        Text('Đánh giá: ${rating.toStringAsFixed(1)} / 5'),
      FilledButton.icon(
        onPressed: () => openDirections(context, place, _location),
        icon: const Icon(Icons.directions),
        label: const Text('Chỉ đường'),
      ),
      const SizedBox(height: 8),
      PlaceDetails(place: place),
    ],
  );

  Widget _suggestions(
    AsyncValue<List<Place>> result,
    List<Place> suggestions,
    bool browsing,
    bool outsideMatch,
  ) {
    if (result.isLoading && !result.hasValue) {
      return const LinearProgressIndicator();
    }
    if (result.hasError && !result.hasValue) {
      return Column(
        children: [
          const Text('Không tải được danh mục địa điểm.'),
          TextButton(
            onPressed: () => ref.invalidate(placesProvider),
            child: const Text('Thử lại'),
          ),
        ],
      );
    }
    final rows = _expanded ? suggestions : suggestions.take(1);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                browsing ? 'Nổi bật ở Huế' : 'Kết quả',
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ),
            if (suggestions.length > 1)
              TextButton(
                onPressed: () => setState(() => _expanded = !_expanded),
                child: Text(_expanded ? 'Thu gọn' : 'Xem danh sách'),
              ),
          ],
        ),
        if (suggestions.isEmpty)
          Text(
            outsideMatch
                ? outsideHuePlaceMessage
                : _search.text.trim().isEmpty
                ? 'Chưa có địa điểm phù hợp.'
                : 'Không tìm thấy địa điểm phù hợp. Bản đồ chỉ hỗ trợ địa điểm tại Huế.',
          ),
        for (final place in rows)
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(
              categoryFor(place.category).icon,
              color: categoryFor(place.category).color,
            ),
            title: Text(place.name),
            onTap: () => _select(place),
          ),
      ],
    );
  }
}
