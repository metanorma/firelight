Anafero CLI
===========

Wraps Anafero site building functionality with CLI usable in Node environment.

Requires Node 22.

Currently it only supports Firelight GUI.

Notes on dependencies
---------------------

The build produces an almost zero-dependency JS file,
except for esbuild-wasm everything is bundled into the bin entry point.

All dependencies should be specified as ``devDependencies``,
except for esbuild-wasm.
