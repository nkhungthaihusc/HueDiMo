import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';

class Place {
  Place.fromJson(Map<String, dynamic> json)
    : id = json['id'] as String,
      name = json['name'] as String,
      category = switch (json['category']) {
        'temple' => 'spiritual',
        'culture' => 'cultural',
        final String value => value,
        _ => '',
      },
      position = LatLng(
        _number(json['lat']) ?? double.nan,
        _number(json['lng']) ?? double.nan,
      ),
      address = _text(json['address']),
      description = _text(json['description']),
      hours = _text(json['opening_hours']),
      price = _number(json['price']),
      rating = _number(json['rating']),
      imageUrl = _text(json['image_url']),
      highlights = (json['highlights'] is List
          ? (json['highlights'] as List).whereType<String>().toList()
          : <String>[]),
      notes = _text(json['notes']);

  final String id, name, category;
  final LatLng position;
  final String? address, description, hours, imageUrl, notes;
  final double? price, rating;
  final List<String> highlights;

  bool get hasValidPosition =>
      position.latitude.abs() <= 90 && position.longitude.abs() <= 180;

  static double? _number(Object? value) {
    final number = value is num ? value.toDouble() : double.tryParse('$value');
    return number != null && number.isFinite ? number : null;
  }

  static String? _text(Object? value) =>
      value is String && value.trim().isNotEmpty ? value.trim() : null;
}

typedef PlaceCategory = ({String label, Color color, IconData icon});

const categories = <String, PlaceCategory>{
  'ancient': (
    label: 'Di tích cổ',
    color: Color(0xFF6D28D9),
    icon: Icons.account_balance,
  ),
  'spiritual': (
    label: 'Chùa & Tâm linh',
    color: Color(0xFFA21CAF),
    icon: Icons.temple_buddhist,
  ),
  'food': (label: 'Ẩm thực', color: Color(0xFFC2410C), icon: Icons.restaurant),
  'coffee': (
    label: 'Cà phê & Trà',
    color: Color(0xFF92400E),
    icon: Icons.coffee,
  ),
  'hotel': (label: 'Khách sạn', color: Color(0xFF0E7490), icon: Icons.hotel),
  'nature': (label: 'Thiên nhiên', color: Color(0xFF15803D), icon: Icons.park),
  'beach': (
    label: 'Bãi biển',
    color: Color(0xFF0369A1),
    icon: Icons.beach_access,
  ),
  'cultural': (
    label: 'Văn hóa & Di sản',
    color: Color(0xFF854D0E),
    icon: Icons.palette,
  ),
  'craft_village': (
    label: 'Làng nghề',
    color: Color(0xFFBE185D),
    icon: Icons.handyman,
  ),
  'entertainment': (
    label: 'Giải trí & Phố đêm',
    color: Color(0xFF4338CA),
    icon: Icons.theater_comedy,
  ),
  'shopping': (
    label: 'Chợ & Mua sắm',
    color: Color(0xFF0F766E),
    icon: Icons.shopping_bag,
  ),
};

PlaceCategory categoryFor(String id) =>
    categories[id] ??
    (label: 'Địa điểm', color: const Color(0xFF475569), icon: Icons.place);

String foldVietnamese(String input) {
  var value = input.toLowerCase().trim().replaceAll('đ', 'd');
  const groups = {
    'a': '[àáảãạăằắẳẵặâầấẩẫậ]',
    'e': '[èéẻẽẹêềếểễệ]',
    'i': '[ìíỉĩị]',
    'o': '[òóỏõọôồốổỗộơờớởỡợ]',
    'u': '[ùúủũụưừứửữự]',
    'y': '[ỳýỷỹỵ]',
  };
  for (final entry in groups.entries) {
    value = value.replaceAll(RegExp(entry.value), entry.key);
  }
  return value.replaceAll(RegExp(r'[\u0300-\u036f]'), '');
}
