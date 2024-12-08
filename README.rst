Firelight monorepo
==================

Firelight provides HTML rendering for Metanorma.

Usage
-----

This does not yet work—please stand by while we publish packages
and provide a better out of the box development experience::

    npx --node-options='--experimental-vm-modules' anafero \
      --target-dir <path/to/target/dir> \
      --current-rev <main-revision> \
      [--rev <other-revision-or-spec>]
      [--debug]
      [develop --package </path/to/anafero-cli>]

Each version should have an ``anafero-config.json``,
which points to the entry point within versioned repository tree,
as well as store/content adapter and layout.

Anafero config spec
-------------------

TBD.

Module identifier shape
~~~~~~~~~~~~~~~~~~~~~~~

::

    git://example.com/path/to/repo#<OID>[/subdirectory/within/repo]

.. important:: It is required to specify OID (Git commit hash, tag, or branch).
               HEAD can be provided, but that is not recommended.
               Pinning by commit hash or tag is recommended.

Example specifying ``metanorma/firelight`` Github repo at hash ``12345``
and layout under a subdirectory:
``git://github.com/metanorma/firelight#12345/packages/plateau-layout``.

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

Very slow.
