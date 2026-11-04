# Map network requests

The supplied Network screenshot shows Goong vector tiles (`.pbf`) with HTTP 200
from disk cache. MapLibre requests separate tiles by zoom/x/y; equal filenames
such as `464.pbf` do not establish duplicates because their parent paths differ.
DevTools Keep log also retains requests across navigations. Requests visible in
DevTools cannot be hidden by frontend code.

Changes in MapView:

- Set the camera directly on the first GPS fix instead of flying through
  intermediate regions/zoom levels. Subsequent follow updates ease only after
  the GPS position is at least 20m from the current camera center.
- Selecting a place or showing a route stops GPS follow, so location callbacks
  do not immediately pull the camera away from the destination.
- Refocus a selected place only when its ID or coordinates change.
- Refocus a route only when its coordinates/order or explicit focus token change.
  Remove pending load listeners when route props change or the component unmounts.
- Attach the map key using URLSearchParams, only to the exact HTTPS Goong tiles
  origin. A prefix lookalike domain must never receive the key.

Caching remains governed by MapLibre and provider HTTP cache headers. No cache
expiry override, proxy, provider change, or new dependency was introduced.

## Validation

`node --test scripts/map-camera.test.mjs` from `front-end` runs four regression
tests against the component with fake GPS and MapLibre boundaries. These tests
fail against the original component and pass after the fixes.

TypeScript, ESLint for MapView and the regression script, and the Webpack
production build pass. Chromium interaction smoke checks also pass without
JavaScript errors after the camera changes.

Headless Chromium comparison used a fixed viewport, a synthetic vector style,
empty vector tiles, and mocked API/GPS responses. The same initial Hue view and
first GPS fix at 16.75,107.95 produced:

| Phase | Before | After |
| --- | ---: | ---: |
| Initial viewport | 4 | 4 |
| First GPS fix | 35 | 6 |
| Eight small GPS jitters | 0 | 0 |
| Idle window | 0 | 0 |
| Total tile requests | 39 | 10 |

This isolates camera-driven tile coverage, not production Goong billing or a
guaranteed percentage improvement. Stationary jitter already reused tiles before
the fix; its improvement is fewer unnecessary camera animations, not measured
tile savings in this scenario. Production counts depend on viewport, style,
cache state and actual movements.

## Map key

`NEXT_PUBLIC_GOONG_API_KEY` is browser-visible by design in this integration and
must contain a dedicated Maptiles Key, not a server REST API credential. Goong
documents these as separate key types:
https://help.goong.io/kb/gioi-thieu-tong-quan/dang-ky-va-tao-key/dang-ky-tai-khoan-va-tao-key/

To remove the key from browser requests would require a separate server-side
tile/style/sprite/glyph gateway and operational controls; it would still produce
individual tile requests in Network. That architecture is not necessary to fix
redundant camera requests. No Goong account settings were changed.
