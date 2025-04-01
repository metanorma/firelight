# relaton-collection-xml-store

Takes a `documents.xml`-like file that has `<relaton-collection>`
root element.

It reads basic metadata about the publisher
(not wrapped in a `<bibdata>`tag) to be used for the index page.

For each document in the collection, it only
pays attention to the local relative path to its
Metanorma XML file. The path is transformed to have
the conventional `.presentation.xml` extension.
For each such document, outputs a `hasPart` relation with
`file:` URI to that presentation XML.

Metanorma XML store adapter is assumed to be used
in order to read the presentation XML.
