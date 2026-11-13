import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'features/map_places/map_screen.dart';

void main() => runApp(const ProviderScope(child: HueDiMoApp()));

class HueDiMoApp extends StatelessWidget {
  const HueDiMoApp({super.key, this.showTiles = true});

  final bool showTiles;

  @override
  Widget build(BuildContext context) {
    const purple = Color(0xFF6D28D9);
    final theme = ThemeData(
      brightness: Brightness.light,
      colorScheme: ColorScheme.fromSeed(
        seedColor: purple,
      ).copyWith(primary: purple),
      scaffoldBackgroundColor: const Color(0xFFFAF7F2),
      fontFamily: 'Geist',
      inputDecorationTheme: InputDecorationThemeData(
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(minimumSize: const Size(48, 48)),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(minimumSize: const Size(48, 48)),
      ),
    );
    return MaterialApp(
      title: 'HueDiMo',
      debugShowCheckedModeBanner: false,
      theme: theme,
      home: MapScreen(showTiles: showTiles),
    );
  }
}
