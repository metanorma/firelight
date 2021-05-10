## Questions

In no particular order please:

1. You say "more like a web application", do you mean you'd like it to look and feel like one, but really just an HTML page OR an actual SPA?

  * two cases. One form of deliverable is a single HTML page. The second form is an HTML site. The only difference with the former is that the latter allows shared code and separate files to be loaded. 
  * both cases need to be supported eventually. 

2. Would you prefer I use `bs-202000-l3.html` or `bs-202000.html` as a starting point?

  * the only difference between the two is the presence of the checklist
  * please start with the L3 document 

3. Current implementation contains a lot of JS, font & CSS dependencies. Do we need to use any of them? 

  * we only need the Gesta font and the differentiated styling of the document elements. The JS is only for the TOC; we don't mind change to the better. 

4. What limitations are there on using other/new dependencies?

  * needs to work on IE 11. 

5. In some places, there are `total: 2` and `nested: 2`, does this / should this be rendered?

  * these exist only in the Level 3 checklist at Annex D. No, those are debug messages to indicate the depth level of the checklist. 

6. What bookmark capabilities are required, e.g. main headings, all headings, ANY element?

  * Every element needs to be uniquely identifiable. 

7. What deadline do you/we have on this being delivered?

  * By Tuesday your evening. 

8. What is the physical deliverable required?

  * The dynamic checklist. 

9. What browser support is required?

  * Modern browsers for Tuesday. 

10. What device support (screen size & orientation) is required?

  * not a concern at the moment. 


11. Is any authentication required, user login, oAuth etc.?

  * no. 

12. Should we have a _Reset All_ / _Start Over_ piece of functionality or is refreshing the page sufficient?

  * don't understand the question. 

13. Current implementation has inline CSS, something I am keen to avoid, would this be an issue?

  * if those can be replaced with CSS rules, go ahead. 

14. What is the inputs (apart from checklist)?

  * again, the document is generated from a source document in the Metanorma format. 

15. What are the outputs?

  * do you mean output of the checklist after submission? The form doesn't currently link anywhere. A result page could be shown to indicate the percentage of boxes checked to indicate compliance, perhaps. 

16. How will it be tested (outwith my testing)?

  * we will go through manual testing. 

17. The current implementation(s) use a CSS reset, is this something that is important or am I free to do it my way?

  * free to do as you see fit. 

18. I see a mention of `MathJax` in current implementation, is this required?

  * yes the document generated can contain MathJax. 

19. I see a mention of Font Awesome (icons) but no need for them in the document? Safe to remove?

  * safe to remove 

20. You have previously mentioned print version of this, does THIS need to be able to be printed?

  * no. The printed (PDF) version is not based on HTML output. 
