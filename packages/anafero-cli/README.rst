Anafero CLI
===========

WIP.

Wraps Anafero site building functionality with CLI usable in Node environment.

Requires Node 22.

Currently it only supports Firelight GUI.

Development
-----------

To clean & build the package, run ``yarn cbp``.

Notes on dependencies
---------------------

The build produces an almost zero-dependency JS file,
except for esbuild-wasm everything is bundled into the bin entry point
with esbuild, which should allow keep things under ``devDependencies``
and minimize ``dependencies`` that need
to be installed by NPM at npx script invocation time.
