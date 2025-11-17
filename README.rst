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
`deployed version <https://metanorma.github.io/mn-samples-plateau/plateaudocument/>`_.
(But note that the example does not follow best practices
for source data & config versioning, and instead initializes an empty
repository and generates the config in Github Action logic. That means
it would be unable to make use of versioning-related functionality.
The reason for this is that that particular document’s source files
are particularly large and run into some Git infrastructure limitations.)

Usage
-----

The current official way of running the build command is via NPX.

The build command must be run from the root of a Git repository that has
Anafero config file versioned in it (see the “Anafero config” section).

In the following examples:

- ``path/to/site/output/dir`` is where
  you want the build artifact (HTML files & other assets) to appear.
- ``main-revision`` is the current revision Git reference, e.g., ``main``.
- ``rev`` is optional other Git references to build, for example, a tag name
  or name pattern.
- ``/slash-prepended-path-prefix`` is optional URL path prefix
  used when serving the artifact.

Direct
~~~~~~

- Tested on macOS and Linux. Not tested on Windows.
- Requires Node 22. You must have the ``npx`` executable in your path.

::

    npx --node-options='--experimental-vm-modules' -y @riboseinc/anafero-cli \
      build-site \
      --target-dir <path/to/site/output/dir> \
      --current-rev <main-revision> \
      [--path-prefix </slash-prepended-path-prefix> \]
      [--rev <other-revision-or-spec> \]
      [--debug]

Here, ``path/to/site/output/dir`` can be a relative or an absolute path.

Containerized
~~~~~~~~~~~~~

Podman example::

    podman pull docker.io/library/node:22-alpine

    podman [--log-level=debug] run --interactive --tty \
    -v .:/data:ro -v ./path/to/site/output/dir:/out:rw \
    --workdir=/data \
    docker.io/library/node:22-alpine \
      npx --node-options='--experimental-vm-modules' -y @riboseinc/anafero-cli \
        build-site \
        --target-dir /out \
        --current-rev <main-revision> \
        [--path-prefix </slash-prepended-path-prefix> \]
        [--rev <other-revision-or-spec> \]
        [--debug]

This binds current directory as ``/data`` in the container,
and output directory as ``/out`` in the container.

.. note:: Podman’s ``--volume`` flag **requires** that host directory path
          starts with ``.`` or ``/``, otherwise it might be considered
          a named volume reference.

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

- ``entryPoint``: path to entry point file, relative to repository root
- Adapters: lists of module identifiers.
  See module identifier shape section.
  (Note that this example pins adapter identifiers to branch name,
  which is not ideal in real use.)

The file must be versioned, unless config is supplied via an override.

Each version being built (e.g., different commits or tags)
can have a different configuration (if a specified version does not have the config,
the config will be sourced from the nearest more recent version that has it,
or via config override if provided).

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

- Language support is limited. For now, tested with Japanese, English, French.
  The elements of the GUI are only in English for now.

- Certain page contents, like MathML, are supported in degraded mode.

  (ProseMirror node views are not initialized, since React ProseMirror
  library does not allow DOM nodes returned from ``toDOM()``,
  and for now PM schema does not handle converting MathML markup
  to PM array node spec.)

- GHA only: LFS resolution for version other than current may be broken.
  It is required to specify ``with: { lfs: true }`` for the checkout step,
  and building any version other than the one checked out may lead to
  broken results if any objects are stored with LFS.

  So far this was not reproduced in build environments other than GHA.

Development
-----------

Environment setup
~~~~~~~~~~~~~~~~~

In many cases, you can use containers (via Podman or Docker),
which would take care of runtime environment.
This includes IDE LSP setup. Use the same 

System requirements, when you don’t containerize
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

- Have Node 22 installed, with ``node``, ``corepack``, ``npx``
  executables available in your path.
- Run ``corepack enable`` to ensure it can load correct Yarn
  for the package.

.. important:: Extension modules are not being cleaned up after build as of now.
               This is fine in cloud environments that can do the clean up,
               but locally they may accumulate.
               On macOS, you should be able to find temporary build directories
               under ``/var/folders/ln/<long string>/<short string>/anafero-*``.
               They can be safely deleted.

Containerized setup tips
^^^^^^^^^^^^^^^^^^^^^^^^

An example Dockerfile with TypeScript language server
is bundled (see ``tsls.Dockerfile``). You can set up your IDE
to build the container like this::

    podman build --build-arg "project_path=$REPO_ABSPATH" \
      -f $DOCKERFILE_NAME -t "$DOCKER_IMAGE_NAME" .

And run the container like this::

    podman container run \
      --cpus=1 --memory=4g \
      --interactive --rm --network=none \
      --workdir="$REPO_ABSPATH" --volume="$REPO_ABSPATH:$REPO_ABSPATH:rw" \
      --name "$DOCKER_IMAGE_NAME-container" \
      "$DOCKER_IMAGE_NAME"

Where:

- ``$DOCKERFILE_NAME`` is the Dockerfile that accepts one build arg
  ``project_path``, the absolute path to the repository,
  and runs a TypeScript language server in stdio mode.
- ``$REPO_ABSPATH`` is the absolute path to your repository.
  If you’re in the root of the repository and you use Fish, you’d assign
  ``set $REPO_ABSPATH (pwd)``.
- ``$DOCKER_IMAGE_NAME`` is an image name you want to use,
  you can pick something that makes sense.

.. note:: ``:rw`` technically shouldn’t be required for the volume,
          but sometimes Yarn will need to write ``install-state.tgz``,
          and if it’s unable to do so it will fail with:

              Internal Error: EROFS: read-only file system, open '<repo path>/.yarn/install-state.gz'

          Ideally you should use ``:ro``,
          but then you may need run the command by hand
          to get rid of the error.

          If you want to run some Yarn command mounting directory in read-write mode
          and with network access (this runs ``yarn install``)::

              podman container run \
                --cpus=1 --memory=4g \
                --interactive --rm \
                --entrypoint=sh \
                --workdir="$REPO_ABSPATH" --volume="$REPO_ABSPATH:$REPO_ABSPATH:rw" \
                --name "$DOCKER_IMAGE_NAME-container" \
                "$DOCKER_IMAGE_NAME" -c "yarn install"


.. note:: On macOS, if Podman complains with an error mentioning statfs
          and “statfs no such file or directory”, you may need to reset
          and re-init podman machine, mounting a directory containing your
          project(s) at init time::

              podman machine reset
              podman machine init -v /path/to/project:/path/to/project

          (Both ``/path/to/project``s would be identical
          and should reference a parent directory of wherever your project
          is located in your macOS filesystem.)


Adapter development
~~~~~~~~~~~~~~~~~~~

Feel free to reference ``metanorma-xml-store`` for store adapter,
``metanorma-site-content`` for content adapter, ``plateau-layout`` for layout,
but API may change shortly (particularly for content adapters).

Store adapters
^^^^^^^^^^^^^^

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
^^^^^^^^^^^^^^^^

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
^^^^^^^

Layout module interface
is defined by ``LayoutModule`` in ``anafero/Layout.mts``.
Adapter module MUST have a default export of an object
that conforms to this interface.

TBC.

Local adapter testing/preflight
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

During local development, instead of specifying ``git+https`` URLs
it is possible to specify ``file:`` URLs
in ``anafero-config.json``::

    file:/path/to/adapter-directory

This way it would fetch modules from local filesystem, and any changes
to adapters will have effect immediately without pushing them.

This is helpful when working on modules, of course, but also
when working on something else to save the time fetching module data.

Podman example, Fish shell: similar to the regular Podman usage example,
except additionally mounts inside the container (in read-only mode)
the adapter directory specified in config JSON::

    podman [--log-level=debug] run --interactive --tty \
    -v (pwd):/data:ro -v (pwd)/path/to/site/output/dir:/out:rw \
    -v /path/to/adapter-directory:/path/to/adapter-directory:ro \
    --workdir=/data \
    docker.io/library/node:22-alpine \
      npx --node-options='--experimental-vm-modules' -y @riboseinc/anafero-cli \
        build-site \
        --target-dir /out \
        --current-rev <main-revision> \
        [--path-prefix </slash-prepended-path-prefix> \]
        [--rev <other-revision-or-spec> \]
        [--debug]

Core development
~~~~~~~~~~~~~~~~

Compiling & building
^^^^^^^^^^^^^^^^^^^^

- ``yarn compile`` compiles a package.
- ``yarn cbp`` within ``anafero-cli`` package builds the CLI into a tarball
  ready for publishing or testing (see local testing section).

.. note:: When working on Firelight GUI, or initial adapters,
          for typechecking you should
          run ``yarn compile`` inside respective packages, because
          ``yarn cbp`` may not reveal typing issues from other packages.

Direct example::

    # If you are in repo root
    yarn workspace @riboseinc/anafero-cli cbp

    # If you are in anafero-cli package directory
    yarn cbp

Podman example, Fish shell: executing ``yarn cbp`` in a container
(assuming you are in repository root)::

    dir=(pwd)/packages/anafero-cli \
    podman --log-level=debug run --cpus=1 --memory=4g --interactive --tty \
      -v "$dir"/dist:"$dir"/dist:rw -v "$dir"/compiled:"$dir"/compiled:rw \
      --workdir=(pwd) \
      localhost/fltest:latest \
      yarn workspace @riboseinc/anafero-cli cbp

The tarball will be under ``packages/anafero-cli/dist``.

Testing changes locally
^^^^^^^^^^^^^^^^^^^^^^^

After building ``anafero-cli`` with ``yarn cbp``, to test the changes
before making a release invoke the CLI via NPX on your machine,
giving it the path to the NPM tarball produced by ``yarn cbp``.

Example without containerization::

    npx --node-options='--experimental-vm-modules' -y file:/path/to/anafero.tgz \
      --target-dir <path/to/site/output/dir> \
      --current-rev <main-revision> \
      [--path-prefix </slash-prepended-path-prefix> \]
      [--rev <other-revision-or-spec> \]
      [--debug]

Example with containerization: TBC
(use the example from the main Usage section, but modified to mount
anafero tarball from host filesystem?).

Code conventions
~~~~~~~~~~~~~~~~

- Do not export something that does not need exporting.

- Single quotes are used for identifier-like strings
  (e.g., some object key or style attribute).

  Double quotes are used for human-visible text
  (which may be phased away in favour of string IDs and translations
  supplied by separate files).

  The distinction is good to maintain, because those two cases
  are very different. This applies to JSX as well.

Dependencies
^^^^^^^^^^^^

- Do not add a dependency unless warranted.
  Inspect dependency’s dependency tree.
  The bigger the tree, the less desirable the dependency.
  Try to architect the feature in a way that doesn’t require that dependency.

- If you add or upgrade a dependency, run ``yarn`` and pay attention
  if it reports a duplicate instance error at the end.
  If there are duplicate instances, you need to eliminate them.
  They may cause subtle runtime bugs
  (and/or spurious typing errors, possibly).

  You can investigate duplicate virtual instances using the command
  ``yarn check-for-multiple-instances``
  together with ``yarn why [duplicate package name]``.

  Duplicates may be caused by dependency specification
  in one of the packages in this repository (e.g., some dependency
  resolves to another version by another workspace),
  or some downstream package’s own specification. The above commands
  make it possible to narrow down the cause.

Types & schema
^^^^^^^^^^^^^^

- We try to make the most out of TypeScript while staying pragmatic
  and not going overboard type wrangling.

- Using ``any`` or ``unknown`` is almost never acceptable.
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

- Use ``@ts-expect-error``, if necessary, but not the ignore directive.

Gotchas
~~~~~~~

- We use esbuild for faster building, and TSC for typechecking.

  - You should run ``tsc`` (via respective ``compile`` commands),
    not just build commands, when developing and testing.
    Make sure you do not introduce new TSC errors.

  - ESM imports require ``.mjs`` / ``.js`` extensions.
    This is counter-intuitive, because the source resides
    in ``.mts`` / ``.ts`` files; when you write imports just pretend
    that the code was already transpiled.

    We don’t want to use ``allowImportingTsExtensions`` because it
    requires ``noEmit`` and because it’s unclear how esbuild plays with it.

- If you work on styling and confusingly what you defined in your local CSS
  is overridden by library CSS, make sure that your local CSS is not imported
  before library CSS in the total import tree (this can accidentally happen
  if you have components split across multiple files that import class names
  from a single shared local CSS module).

  If you see that in CSS bundle some library CSS appears after your local
  CSS, then somehow that went wrong. Project’s local CSS always comes last.

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
