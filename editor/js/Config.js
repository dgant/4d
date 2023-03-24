function Config() {
  const name = 'threejs-editor';
  const storage = {
    'language': 'en',
    'autosave': true,
    'project/title': '',
    'project/editable': false,
    'project/vr': false,
    'project/renderer/antialias': true,
    'project/renderer/shadows': true,
    'project/renderer/shadowType': 1, // PCF
    'project/renderer/useLegacyLights': false,
    'project/renderer/toneMapping': 0, // NoToneMapping
    'project/renderer/toneMappingExposure': 1,
    'settings/history': false,
  };
  if (window.localStorage[ name ] === undefined) {
    window.localStorage[ name ] = JSON.stringify(storage);
  } else {
    const data = JSON.parse(window.localStorage[ name ]);
    for (const key in data) {
      storage[ key ] = data[ key ];
    }
  }
  return {
    getKey: function (key) { return storage[ key ]; },
    setKey: function() { // key, value, key, value ...
      for (let i = 0, l = arguments.length; i < l; i += 2) {
        storage[ arguments[ i ] ] = arguments[ i + 1 ];
      }
      window.localStorage[ name ] = JSON.stringify(storage);
      console.log('[' + /\d\d\:\d\d\:\d\d/.exec(new Date())[ 0 ] + ']', 'Saved config to LocalStorage.');
    },
    clear: function() { delete window.localStorage[ name ]; }
  };
}
export { Config };
