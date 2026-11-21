import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';

import 'place.dart';

Future<void> openDirections(
  BuildContext context,
  Place place,
  LatLng? origin,
) async {
  final uri = Uri.https('www.google.com', '/maps/dir/', {
    'api': '1',
    'destination': '${place.position.latitude},${place.position.longitude}',
    if (origin != null) 'origin': '${origin.latitude},${origin.longitude}',
  });
  try {
    if (await launchUrl(uri, mode: LaunchMode.externalApplication)) return;
  } catch (_) {
    // A device might not have a handler for this URL.
  }
  if (context.mounted) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Không mở được chỉ đường.')));
  }
}

class PlaceDetails extends StatelessWidget {
  const PlaceDetails({super.key, required this.place});

  final Place place;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (place.imageUrl case final image?) ...[
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Image.network(
              image,
              height: 160,
              width: double.infinity,
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) => const SizedBox.shrink(),
            ),
          ),
          const SizedBox(height: 8),
        ],
        if (place.address case final address?) Text(address),
        if (place.hours case final hours?) Text('Giờ mở cửa: $hours'),
        if (place.price case final price?)
          Text(
            price == 0
                ? 'Miễn phí'
                : NumberFormat.currency(
                    locale: 'vi',
                    symbol: '₫',
                    decimalDigits: 0,
                  ).format(price),
          ),
        if (place.description case final description?) ...[
          const SizedBox(height: 24),
          Text(description),
        ],
        if (place.highlights.isNotEmpty) ...[
          const SizedBox(height: 24),
          Text('Điểm nổi bật', style: theme.textTheme.titleLarge),
          for (final highlight in place.highlights) Text('• $highlight'),
        ],
        if (place.notes case final notes?) ...[
          const SizedBox(height: 24),
          Text(notes),
        ],
      ],
    );
  }
}
