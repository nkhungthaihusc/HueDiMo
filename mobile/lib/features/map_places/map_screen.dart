import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';

import 'place.dart';
import 'place_detail.dart';
import 'place_repository.dart';

const hueCenter = LatLng(16.4637, 107.5907);
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
  final _map = MapController();
  final _search = TextEditingController();
  String? _category;
  Place? _selected;
  LatLng? _location;
  bool _expanded = false;
  bool _locating = false;
  bool _tileError = false;
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
    final places = result.value ?? const <Place>[];
    final query = foldVietnamese(_search.text);
    final filtered = places
        .where(
          (place) =>
              (_category == null || _category == place.category) &&
              (query.isEmpty ||
                  foldVietnamese(
                    '${place.name} ${place.address ?? ''}',
                  ).contains(query)),
        )
        .toList();
    final browsing = query.isEmpty && _category == null;
    final byId = {for (final place in places) place.id: place};
    final suggestions = browsing
        ? [for (final id in featuredIds) ?byId[id]]
        : filtered;
    final selected = _selected == null ? null : byId[_selected!.id];
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
                          maxZoom: 19,
                          onTap: (_, _) => setState(() => _selected = null),
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
                          MarkerLayer(
                            markers: [
                              for (final place in filtered)
                                if (place.id != selected?.id) _marker(place),
                              if (selected != null)
                                _marker(selected, selected: true),
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
                          : _suggestions(result, suggestions, browsing),
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

  Marker _marker(Place place, {bool selected = false}) {
    final category = categoryFor(place.category);
    return Marker(
      point: place.position,
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
            side: BorderSide(color: Colors.white, width: selected ? 4 : 2),
          ),
          icon: Icon(category.icon, size: selected ? 24 : 20),
        ),
      ),
    );
  }

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
      Wrap(
        spacing: 8,
        children: [
          FilledButton.icon(
            onPressed: () => openDirections(context, place, _location),
            icon: const Icon(Icons.directions),
            label: const Text('Chỉ đường'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => PlaceDetail(place: place, origin: _location),
              ),
            ),
            child: const Text('Xem thêm'),
          ),
        ],
      ),
    ],
  );

  Widget _suggestions(
    AsyncValue<List<Place>> result,
    List<Place> suggestions,
    bool browsing,
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
        if (suggestions.isEmpty) const Text('Chưa có địa điểm phù hợp.'),
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
