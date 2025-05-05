Firelight monorepo
==================

Firelight renders Metanorma XML
(usually produced from Metanorma-flavoured AsciiDoc)
in a way that is readable and easy to navigate by default
while also being customizable and extensible.

Anafero build system implements the orchestration
of Firelight’s MN XML parsing & site content rendering extensions.

`Example repository <https://github.com/metanorma/mn-samples-plateau/>`_
built with this system;
`deployed version <https://metanorma.github.io/mn-samples-plateau/001/>`_.
(But note that the example does not follow best practices
for source data & config versioning, and instead initializes an empty
repository and generates the config in Github Action logic. That means
it would be unable to make use of versioning-related functionality.
The reason for this is that that particular document’s source files
are particularly large and run into some Git infrastructure limitations.)

Usage
-----

- Intended to be run on macOS and Linux. Not tested on Windows.
- Requires Node 22.

::

    npx --node-options='--experimental-vm-modules' -y @riboseinc/anafero-cli \
      --target-dir <path/to/site/output/dir> \
      --current-rev <main-revision> \
      [--path-prefix </slash-prepended-path-prefix>]
      [--rev <other-revision-or-spec>]
      [--debug]

The command must be run from the root of a Git repository that has
Anafero config file versioned in it (see below).

Anafero config
--------------

A file named ``anafero-config.json`` must reside in the root
of the repository with the data being built.

Example::

    {
      "version": "0.1",
      "entryPoint": "file:documents/001-v4/document.presentation.xml",
      "storeAdapters": [
        "git+https://github.com/metanorma/firelight#main/packages/metanorma-xml-store"
      ],
      "contentAdapters": [
        "git+https://github.com/metanorma/firelight#main/packages/metanorma-site-content"
      ],
      "resourceLayouts": [
        "git+https://github.com/metanorma/firelight#main/packages/plateau-layout"
      ]
    }

(Note that this example pins adapters to branch name, which is not ideal in real use.)

The file must be versioned, unless config is supplied via an override.
Each version being built (e.g., different commits or tags)
can have a different configuration (if a specified version does not have the config,
the config will be sourced from the nearest more recent version that has it,
or via config override if provided).

For extension module reference format (adapters & layouts)
see module identifier shape below.


Module identifier shape
~~~~~~~~~~~~~~~~~~~~~~~

::

    git+https://example.com/path/to/repo#<ref>[/subdirectory/within/repo]

.. important:: It is required to specify a Git ref (e.g., tag or branch).
               Branch is not recommended.
               Pinning by tag is recommended.

Example specifying ``metanorma/firelight`` Github repo at tag ``1.2.3``
and layout under a subdirectory:
``git+https://github.com/metanorma/firelight#1.2.3/packages/plateau-layout``.


Architecture
------------

Anafero
~~~~~~~

Implements the base engine for transforming between various data sources
and resource hierarchy, using the following pluggable components.

- Store adapter module: provides API for transforming
  between certain source (currently, a blob in Git repository)
  and a set of resource relations.

- Content adapter module: determines how resources create the website.

  One key aspect is distinguishing between relations
  that 1) form site hierarchy (e.g., document X contains section Y),
  2) form page hierarchy (e.g., section Y has title foobar),
  or 3) cross-reference resources without regard for hierarchy
  (e.g., link A has target resource M).

  .. note:: This will probably be done instead through a custom ontology
            and thus become a responsibility of store adapter,
            which would have to output relations using that ontology.

  Another key aspect is defining PM schema for page content
  and transforming relations to page content & vice-versa.

  .. note:: This will likely become the sole aspect of content adapter.

- Layout module: allows some custom CSS to control resource rendering.

- App shell: the high-level React component that renders the content.
  (Provisional—for now Firelight GUI is hard-coded as the only option.)

Versioning
^^^^^^^^^^

Currently, versioning is required.

Git commit tree is used to generate versions, with CLI flags
``--current-rev`` and ``--rev`` controlling which commits are used
to generate current & other version.

Glossary:

- Active version: the version being viewed
- Current version: the latest (a.k.a. living, head, trunk) version

Resource URLs are prefixed with version ID of the active version,
unless the active version is current version.

Firelight
~~~~~~~~~

Implements:

- Metanorma XML store adapter that transforms between MN presentation
  XML and a set of resources representing document structure.

- A content adapter that expects a set of resources representing
  a MN document or document collection.

- Layout for PLATEAU documents.

- The main GUI entry point.

Known issues
------------

- Language support is limited. For now, tested with Japanese, English.
  The elements of the GUI are only in English for now.

- GHA only: LFS resolution for version other than current may be broken.
  It is required to specify ``with: { lfs: true }`` for the checkout step,
  and building any version other than the one checked out may lead to
  broken results if any objects are stored with LFS.

  So far this was not reproduced in build environments other than GHA.

Implementing adapter modules
----------------------------

Feel free to reference ``metanorma-xml-store`` for store adapter,
``metanorma-site-content`` for content adapter, ``plateau-layout`` for layout,
but API may change shortly (particularly for content adapters).

Store adapters
~~~~~~~~~~~~~~

The job of a store adapter is to map an entry point file to resources
and relations.

Store adapter module interface
is defined by ``StoreAdapterModule`` in ``anafero/StoreAdapter.mts``.
Adapter module MUST have a default export of an object
that conforms to this interface.

The main part of store adapter API is ``readerFromBlob()``. It is given
an entry point as a binary blob and some helper functions
(e.g., for decoding it into an XML DOM), and must return a resource reader.
Resource reader is responsible for discovering relations
by returning them in chunks via ``onRelationChunk()`` callback
passed to ``discoverAllResources()`` function.

.. note:: ``discoverAllRelations()`` should chunk relations responsibly.
          Avoid calling ``onRelationChunk()`` too frequently,
          as this can create a significant performance overhead.

          Other performance considerations (such as not relying
          on async generators & preferring loops instead) apply.

Anafero will follow outwards relations and initialize another store adapter,
or reuse a previously initialized one that returns ``true`` from
``canResolve()``.

``canResolve()`` is another bit of store adapter API. It’s supposed
to return a boolean indicating whether this adapter should bother
processing a resource based on its URI.
Useful, e.g., if an adapter is supposed to only understand files
with particular filename extension(s).
It’s generally not a problem to return ``true``
and then fail to instantiate a reader because upon closer
inspection source data is not recognizable.

Content adapters
~~~~~~~~~~~~~~~~

.. note:: Content adapter API is likely to change in near future.

The job of a content adapter is to map resource relations to an *hierarchy*
of formatted website pages.

Content adapter module interface
is defined by ``ContentAdapterModule`` in ``anafero/ContentAdapter.mts``.
Adapter module MUST have a default export of an object
that conforms to this interface.

The main parts of content adapter API are:

- Used for determining hierarchy:

  - ``contributingToHierarchy``: spec for relations that create sub-hierarchy.
  - ``crossReferences()``: given a relation, returns whether the relation
    is a cross-reference (and therefore does not participate in hierarchy).

- Used for transforming between page content and relations:

  - ``generateContent()``: given a graph of relations of a page in hierarchy,
    returns content representing it. The content is in ProseMirror doc format,
    with an ID for associated schema.
    The adapter module can import some ``prosemirror-*`` contrib modules
    and is responsible for defining ProseMirror schema.

  - ``resourceContentProseMirrorSchema``: a map of schema ID
    to ProseMirror schema.

    .. important:: A single page is a resource; but its parts are resources too.
                   Anafero attempts to maintain a mapping between subresources
                   and respective DOM nodes. To facilitate this,

                   - created ProseMirror nodes should have ``resourceID`` attr
                     set to resource’s ID (subject URI); conversely,
                   - ``toDOM()`` should ensure returned DOM node representing
                     a resource specifies that resource’s ID
                     (subject URI) using RDFa ``about`` attribute.

    .. important:: Schema nodes MUST NOT return DOM nodes from ``toDOM()``
                   functions currently; only return spec arrays per PM docs.
                   This is a limitation of ``react-prosemirror``.

  - ``resourceContentProseMirrorOptions``: currently only used to supply
    ProseMirror node views. Generally speaking, optional, and node views
    should not be relied on for basic content presentation.

  - ``describe()``: describes a resource (whether a page or its subresource),
    providing a plain-text label and language code.

  - ``generateRelations()``: not currently used. Given page content,
    returns a graph of relations. Planned for reverse transformation
    when editing.

Layouts
~~~~~~~

Layout module interface
is defined by ``LayoutModule`` in ``anafero/Layout.mts``.
Adapter module MUST have a default export of an object
that conforms to this interface.

TBC.

Development
-----------

Environment setup
~~~~~~~~~~~~~~~~~

Use Node 22.
Run `corepack enable` to ensure it can load correct Yarn
for the package.

.. important:: Extension modules are not being cleaned up after build as of now.
               This is fine in cloud environments that can do the clean up,
               but locally they may accumulate.
               On macOS, you may likely find temporary build directories
               under ``/var/folders/ln/<long string>/<short string>/anafero-*``.
               They can be safely deleted.

Local modules
^^^^^^^^^^^^^

During local development, instead of specifying ``git+https`` URLs
it is possible to specify ``file:`` URLs
in ``anafero-config.json``::

    file:/path/to/store-adapter-directory

This way it would fetch modules from local filesystem, and any changes
to adapters will have effect immediately without pushing them.

This is helpful when working on modules, of course, but also
when working on something else to save the time fetching module data.

Local Anafero
^^^^^^^^^^^^^

.. note:: For GUI-side typechecking, it is currently *required*
          to run ``yarn compile`` inside ``firelight-gui`` package separately.
          ``yarn cbp`` will not reveal all typing issues.

After building ``anafero-cli`` with ``yarn cbp``, to test the changes
before making a release invoke the CLI via NPX on your machine
as follows (where tgz is the artifact within ``anafero-cli`` package)::

    npx --node-options='--experimental-vm-modules' -y file:/path/to/anafero.tgz \
      --target-dir <path/to/site/output/dir> \
      --current-rev <main-revision> \
      [--path-prefix </slash-prepended-path-prefix>]
      [--rev <other-revision-or-spec>]
      [--debug]

Gotchas
~~~~~~~

- If you work on styling and confusingly what you defined in your local CSS
  is overridden by library CSS, make sure that your local CSS is not imported
  before library CSS in the total import tree (this can accidentally happen
  if you have components split across multiple files that import class names
  from a single shared local CSS module).

  If you see that in CSS bundle some library CSS appears after your local
  CSS, then somehow that went wrong. Project’s local CSS always comes last.


Conventions
~~~~~~~~~~~

Types & schema
^^^^^^^^^^^^^^

- We try to make the most out of TypeScript while staying pragmatic
  and not going overboard type wrangling.

- Using `any` or `unknown` is almost never acceptable.
  For data constructed by the code directly at runtime, we make sure
  the interface or type is clearly defined somewhere.

- For data that can arrive from an external source
  (including storage, such as JSON configuration, LocalStorage, IndexedDB),
  do not define or annotate types by hand.

  - Instead of defining types by hand, declare
    an `Effect schema <https://effect.website/docs/guides/schema/basic-usage>`_
    and derive the typings from that.

    - For consistently, the schema for a type ``Something`` must be called
      ``SomethingSchema``, and the following pattern is OK::

          import * as S from 'effect/Schema';

          export const SomethingSchema = S.Something({...});

          // If type needs to be manually annotated somewhere,
          // this can be defined:
          export type Something = S.Schema.Type<typeof SomethingSchema>;

  - Instead of using type guards and ad-hoc checking, or annotating types without
    actual validation, decode incoming structure with the schema
    (even with simple ``S.decodeUnkownSync()``) and handle parsing errors.

- If the type in question was defined and can be inferred by TSC
  *and* by a human without explicit annotation, manual annotation can/should be omitted.

Other conventions
^^^^^^^^^^^^^^^^^

- Do not export something that does not need exporting.
- Use ``@ts-expect-error``, if necessary, but not the ignore directive.

Known issues
~~~~~~~~~~~~

- There are 16 typing errors when compiling. While they don’t stop ``yarn cbp``
  from otherwise completing, we aim to get rid of them when possible.
  Some of the errors are caused by apparent mismatch between
  TypeScript compiler invoked at build and TS language server.

- The API for content & store adapters, and layouts as well, is being changed.

- App shell (Firelight) may be made pluggable, to facilitate sites that look & feel
  differently enough from a document.

- Some of the CSS that currently is implemented in Firelight GUI
  possibly belongs to Plateau layout adapter instead.
