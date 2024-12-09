Firelight monorepo
==================

Firelight renders Metanorma XML
(usually produced from Metanorma-flavoured AsciiDoc)
in a way that is readable and easy to navigate by default
while also being customizable and extensible.

Anafero build system implements the orchestration
of Firelight’s MN XML parsing & site content rendering extensions.

Usage
-----

::

    npx --node-options='--experimental-vm-modules' -y @riboseinc/anafero-cli \
      --target-dir <path/to/target/dir> \
      --current-rev <main-revision> \
      [--path-prefix </slash-prepended-path-prefix>]
      [--rev <other-revision-or-spec>]
      [--debug]

The command must be run from the root of the repository that has
Anafero config file in the root.

Anafero config
--------------

A file named ``anafero-config.json`` must reside in the root
of the repository with the data being built.

Example::

    {
      "version": "0.1",
      "entryPoint": "file:documents/001-v4/document.presentation.xml",
      "storeAdapters": [
        "git+https://github.com/metanorma/firelight#next/packages/metanorma-xml-store"
      ],
      "contentAdapters": [
        "git+https://github.com/metanorma/firelight#next/packages/metanorma-site-content"
      ],
      "resourceLayouts": [
        "git+https://github.com/metanorma/firelight#next/packages/plateau-layout"
      ]
    }

Each version being built (e.g., different commits or tags)
can have a different configuration. If a specified version does not have the config,
the config will be sourced from the nearest more recent version that has it,
or via config override if provided.

For extension module reference format (adapters & layouts)
see module identifier shape below.


Module identifier shape
~~~~~~~~~~~~~~~~~~~~~~~

::

    git+https://example.com/path/to/repo#<OID>[/subdirectory/within/repo]

.. important:: It is required to specify OID (Git commit hash, tag, or branch).
               HEAD can be provided, but that is not recommended.
               Pinning by commit hash or tag is recommended.

Example specifying ``metanorma/firelight`` Github repo at hash ``12345``
and layout under a subdirectory:
``git+https://github.com/metanorma/firelight#12345/packages/plateau-layout``.

During local development, it is possible to specify ``file:`` URLs instead::

    file:/path/to/store-adapter-directory

Module specification
~~~~~~~~~~~~~~~~~~~~

TBD. Feel free to reference ``metanorma-xml-store`` for store adapter,
``metanorma-site-content`` for content adapter, but API may change shortly
(particularly for content adapters).

Architecture
------------

- Firelight implements:

  - Metanorma XML store adapter that transforms between MN presentation
    XML and a set of resources representing document structure.

  - A content adapter that expects a set of resources representing
    a MN document or document collection.

  - Layout for PLATEAU documents.

  - The main GUI entry point.

- Anafero: implements the engine for transforming between various data sources
  and resource hierarchy, using the following pluggable components.

  - Store adapter module: provides API for transforming
    between certain source (currently, a blob in Git repository)
    and a set of resource relations.

  - Content adapter module: determines how resources form website hierarchy.

  - Layout module: allows some custom CSS to control resource rendering.

  - App shell: the high-level React component that renders the content.
    (Provisional—for now Firelight GUI is hard-coded as the only option.)

Known issues
------------

- Language support is limited, for now just Japanese, English
  and possibly French work.
