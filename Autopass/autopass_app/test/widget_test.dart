import 'package:flutter_test/flutter_test.dart';
import 'package:autopass_app/main.dart';

void main() {
  testWidgets('AutoPass app smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const AutoPassApp());

    // Verify that splash screen appears
    expect(find.text('Welcome Back!'), findsOneWidget);
    expect(find.text('to Auto Pass'), findsOneWidget);
  });
}