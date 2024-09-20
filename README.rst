Firelight renderer for Metanorma
================================

Firelight renders Metanorma XML
(usually produced from Metanorma-flavoured AsciiDoc)
in a way that is readable and easy to navigate by default
while also being customizable and extensible.

Usage
-----

::

    npx firelight <path/to/Metanorma/document.xml>
      [--layout <layout>]
      [--look <library>]
      [--renderer <renderer>]

If layout, library or renderer specifies identifier without a namespace
(e.g., ``--layout plateau``) then it is resolved
in Ribose/Metanorma’s contrib Firelight package namespace.

Otherwise, identifier can be a URL of the shape::

    git://example.com/path/to/repo#<OID>[/subdirectory/within/repo]

.. important:: It is required to specify OID (Git commit hash, tag, or branch).
               HEAD can be provided, but that is not recommended.
               Pinning by hash or tag is recommended.

Example specifying ``metanorma/firelight`` Github repo at hash ``12345``,
layout under Plateau contrib plugin (there’s only one there),
and look from there as well::

    npx firelight <path/to/Metanorma/document.xml>
      --layout git://github.com/metanorma/firelight#12345/contrib/plateau/layout
      --layout git://github.com/metanorma/firelight#12345/contrib/plateau/look

Note the duplication required.

Configuring via file
--------------------

TBD.

A YAML(?) configuration file is intended to cover cases
where providing command-line flags is not convenient.

Architecture
------------

Three layers are designed to be swappable out independently,
though may have some degree of inter-dependency:

* Layout
  defines the general aspects of resource presentation
  (e.g., it’s a document, a document collection, etc.),
  specifies flexibility points
  and provides components that form its default look.
* Look is a component library
  determines how parts of the core content,
  as well as surrounding elements like navigation and branding,
  look and behave.
* Renderer
  controls how the combined result of layout + components,
  which is a JSX tree,
  is serialised into the final deliverable
  (e.g., a static single-page site/webapp).

At runtime, user specifies a layout, optionally a component library,
and a renderer.

Firelight’s builder (which *is*, as of now, NodeJS-based) will:

1. Download anything required (mainly layout and component library,
   as renderers are currently bundled with Firelight).
2. Validate document tree, if specified by layout.
3. Obtain a JSX tree by calling layout with document source
   (serialised into)
   and (if provided) component library.
4. Obtain the final deliverable by passing the JSX tree to the renderer.

Packaging dependencies
----------------------

Layout, component library, and renderer may come from outside Firelight.
They should expose API endpoints as expected by Firelight
(packagers/validators will help ensure that).
Firelight will build them using esbuild at runtime.
The esbuild version used during the build depends on Firelight version.

A single Firelight plugin can provide a mix of layouts/components/renderers,
or focus on providing just one.

If there’s only layout/component/renderer, it can be specified purely via
plugin name (``--layout plateau`` will pick layout, if there’s only one),
otherwise

- Any pluggable component is designed to work in a standards-compatible
  browser-compatible JS runtime and can not have any NodeJS-specific code.

- Components cannot specify external dependencies.
  Everything must be vendored in the package.
