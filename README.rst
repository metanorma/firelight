Firelight monorepo
==================

Firelight renders Metanorma XML
(usually produced from Metanorma-flavoured AsciiDoc)
in a way that is readable and easy to navigate by default
while also being customizable and extensible.

Anafero build system implements the orchestration
of Firelight’s MN XML parsing & site content rendering extensions.

`Example repository <https://github.com/metanorma/mn-samples-plateau-firelight-demo/>`_
built with this system;
`deployed version <https://metanorma.github.io/mn-samples-plateau-firelight-demo/>`_.

Usage
-----

::

    npx --node-options='--experimental-vm-modules' -y @riboseinc/anafero-cli \
      --target-dir <path/to/site/output/dir> \
      --current-rev <main-revision> \
      [--path-prefix </slash-prepended-path-prefix>]
      [--rev <other-revision-or-spec>]
      [--debug]

The command must be run from the root of a repository that has
Anafero config file versioned in the root.

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

    git+https://example.com/path/to/repo#<OID>[/subdirectory/within/repo]

.. important:: It is required to specify OID (Git commit hash, tag, or branch).
               HEAD can be provided, but that is not recommended.
               Pinning by commit hash or tag is recommended.

Example specifying ``metanorma/firelight`` Github repo at hash ``12345``
and layout under a subdirectory:
``git+https://github.com/metanorma/firelight#12345/packages/plateau-layout``.

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

- GHA only: LFS resolution for version other than current may be broken.
  It is required to specify ``with: { lfs: true }`` for the checkout step,
  and building any version other than the one checked out may lead to
  broken results if any objects are stored with LFS.

  So far this was not reproduced in build environments other than GHA.

Development
-----------

.. important:: Extension modules are not being cleaned up after build as of now.
               This is fine in cloud environments that can do the clean up,
               but locally they may accumulate.
               On macOS, you may likely find temporary build directories
               under ``/var/folders/ln/<long string>/<short string>/anafero-*``.
               They can be safely deleted.

Local modules
~~~~~~~~~~~~~

During local development, instead of specifying ``git+https`` URLs
it is possible to specify ``file:`` URLs
in ``anafero-config.json``::

    file:/path/to/store-adapter-directory

This is helpful when working on modules, of course, but also
when working on something else to save the time fetching module data.

Local Anafero
~~~~~~~~~~~~~

After building ``anafero-cli`` with ``yarn cbp``, to test the changes
before making a release invoke the CLI via NPX on your machine
as follows (where tgz is the artifact within ``anafero-cli`` package)::

    npx --node-options='--experimental-vm-modules' -y file:/path/to/anafero.tgz \
      --target-dir <path/to/site/output/dir> \
      --current-rev <main-revision> \
      [--path-prefix </slash-prepended-path-prefix>]
      [--rev <other-revision-or-spec>]
      [--debug]
