import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the actual component's effects at the GPS/MapLibre boundary without
// real location permissions, network requests, or a WebGL dependency in CI.
function mount(initialProps = {}) {
  const slots = [];
  const effects = [];
  let cursor = 0;
  let gps;
  const mapInstances = [];
  const element = () => ({ style: {}, appendChild() {}, addEventListener() {}, querySelector: () => null });
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useRef(value) { const i = cursor++; return slots[i] ??= { current: i === 0 ? element() : value }; },
    useState(value) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof value === 'function' ? value() : value;
      return [slots[i], (next) => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }];
    },
    useCallback(fn, deps) {
      const i = cursor++;
      if (!same(slots[i]?.deps, deps)) slots[i] = { fn, deps };
      return slots[i].fn;
    },
    useEffect(fn, deps) {
      const i = cursor++;
      if (!same(slots[i]?.deps, deps)) effects.push(() => {
        slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() };
      });
    },
  };
  class MapStub {
    constructor(options) { mapInstances.push(this); this.options = options; this.center = { lat: 16.469, lng: 107.578 }; this.zoom = 12; this.moves = []; this.listeners = new Map(); }
    on(event, fn) { this.listeners.set(event, fn); }
    once(event, fn) { this.on(event, fn); }
    off(event, fn) { if (this.listeners.get(event) === fn) this.listeners.delete(event); }
    getStyle() { return { layers: [] }; }
    getCenter() { return this.center; }
    getZoom() { return this.zoom; }
    getCanvas() { return element(); }
    isStyleLoaded() { return true; }
    getLayer() { return null; }
    getSource() { return null; }
    resize() {}
    remove() {}
    move(kind, options) { this.moves.push({ kind, options }); if (options.center) this.center = { lng: options.center[0], lat: options.center[1] }; this.zoom = options.zoom ?? this.zoom; }
    flyTo(options) { this.move('fly', options); }
    easeTo(options) { this.move('ease', options); }
    jumpTo(options) { this.move('jump', options); }
    fitBounds(bounds, options) { this.moves.push({ kind: 'bounds', bounds, options }); }
  }
  class MarkerStub {
    constructor(options) { this.element = options.element; }
    setLngLat() { return this; }
    addTo() { return this; }
    setPopup(popup) { this.popup = popup; return this; }
    getPopup() { return this.popup; }
    getElement() { return this.element; }
    remove() {}
  }
  class PopupStub { setHTML() { return this; } }
  const imports = {
    react,
    'react/jsx-runtime': { jsx: () => null, jsxs: () => null },
    'maplibre-gl': { Map: MapStub, Marker: MarkerStub, Popup: PopupStub, setWorkerUrl() {} },
    '@/lib/data/places': { HUE_CENTER: { lat: 16.469, lng: 107.578 } },
    '@/lib/data/categories': { getCategory: () => ({ emoji: 'x', color: '#fff' }) },
    '@/lib/api/reverse-geocode': { getReverseGeocode: async () => ({ address: 'Test address' }) },
  };
  const componentModule = { exports: {} };
  const filename = process.env.MAP_VIEW_SOURCE || path.join(import.meta.dirname, '../components/home/MapView.tsx');
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(output, {
    module: componentModule, exports: componentModule.exports, require(name) { if (!(name in imports)) throw Error(name); return imports[name]; },
    document: { createElement: element }, window: { location: { origin: 'http://localhost:3010' } },
    navigator: { geolocation: { watchPosition(fn) { gps = fn; return 1; }, clearWatch() {} } },
    requestAnimationFrame: (fn) => fn(), URL, console, process: { env: { NEXT_PUBLIC_GOONG_API_KEY: 'test-key' } },
  });
  let props = { selectedId: null, visiblePlaces: [], onSelect() {}, ...initialProps };
  function render(next = {}) { props = { ...props, ...next }; cursor = 0; componentModule.exports.default(props); while (effects.length) effects.shift()(); }
  render();
  return { map: mapInstances[0], render, gps(lat, lng) { gps({ coords: { latitude: lat, longitude: lng, accuracy: 10, heading: null } }); }, dispose() { slots.forEach(slot => slot?.cleanup?.()); } };
}

test('GPS initializes directly, ignores stationary jitter, and follows meaningful movement', () => {
  const app = mount();
  app.gps(16.75, 107.95);
  assert.equal(app.map.moves[0].kind, 'jump');
  for (let i = 0; i < 10; i++) app.gps(16.75 + (i % 2) * 0.00001, 107.95);
  assert.equal(app.map.moves.length, 1);
  app.gps(16.751, 107.95);
  assert.equal(app.map.moves[1].kind, 'ease');
  app.map.listeners.get('dragstart')();
  app.gps(16.8, 107.95);
  assert.equal(app.map.moves.length, 2);
  app.dispose();
});

test('selected place survives list refresh without refocusing or GPS stealing focus', () => {
  const place = { id: 'a', lat: 16.5, lng: 107.6, category: 'ancient' };
  const app = mount({ visiblePlaces: [place], selectedId: 'a' });
  assert.equal(app.map.moves.length, 1);
  app.render({ visiblePlaces: [{ ...place, name: 'Updated' }] });
  app.gps(16.8, 107.9);
  assert.equal(app.map.moves.length, 1);
  app.render({ visiblePlaces: [{ ...place, lat: 16.6 }] });
  assert.equal(app.map.moves.length, 2);
  app.dispose();
});

test('route metadata refresh does not refocus; changed coordinates or explicit focus do', () => {
  const route = [{ id: 'a', lng: 107.6, lat: 16.5 }, { id: 'b', lng: 107.7, lat: 16.6 }];
  const app = mount({ routePlaces: route });
  app.render({ routePlaces: route.map(place => ({ ...place, name: 'Updated' })) });
  assert.equal(app.map.moves.length, 1);
  app.render({ focusRouteToken: 1 });
  assert.equal(app.map.moves.length, 2);
  app.render({ routePlaces: [route[1], route[0]] });
  assert.equal(app.map.moves.length, 3);
  app.dispose();
});

test('tile key attaches only to exact Goong origin, once, with URL encoding', () => {
  const app = mount();
  const transform = app.map.options.transformRequest;
  assert.match(transform('https://tiles.goong.io/tiles/1/2/3.pbf').url, /api_key=test-key/);
  assert.equal(new URL(transform('https://tiles.goong.io/tile?api_key=existing').url).searchParams.getAll('api_key').length, 1);
  assert.equal(transform('https://tiles.goong.io.attacker.test/tile').url, 'https://tiles.goong.io.attacker.test/tile');
  assert.equal(transform('/local-resource').url, '/local-resource');
  app.dispose();
});
