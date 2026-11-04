# UI motion

Shared timing and easing live in `front-end/app/motion.css`: 140ms feedback,
200ms standard transitions, 240ms entry, and 160ms exit. Keep
`MOTION_EXIT_MS` in `usePresence.ts` synchronized with the CSS exit token.

- Mobile panels slide using transforms while retaining their layout height.
  Hidden content becomes invisible and cannot receive focus after exit.
- Modals, place details, radial filters, native menus, and the admin drawer
  have entry and exit motion. Pending close timers cancel on reopen/unmount.
- Toast countdowns animate scaleX in CSS instead of updating React every 30ms.
- Interactive controls use explicit transition properties. Map markers avoid
  permanent layer hints and animated shadows; decorative pulses are quieter.
- Reduced-motion preferences suppress CSS motion, disable auth carousel autoplay,
  shorten modal removal, and apply to MapLibre camera movements.

Validation: TypeScript, targeted ESLint, and Webpack production build pass.
Headless Chromium tests with mocked API responses cover interrupted modal exits,
seven modal/panel close paths, toast countdown/auto-dismiss, radial filters,
native menus, admin drawer, and reduced-motion carousel behavior. Nine layout
checks cover widths 320, 390, 768, 1024, 1440 and short landscape 667x375.
No JavaScript errors were observed in these scenarios.

These checks establish interaction and layout behavior, not a measured frame-rate
guarantee. Physical mobile Safari and lower-powered devices still need testing.
