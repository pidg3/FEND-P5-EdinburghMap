# FEND P5: Edinburgh Map

This project is for the Udacity Front End Nanodegree. 

It's fair to say I'm being quite ambitious in what I plan to do with it. The backlog is here: https://trello.com/b/XamRU7ja/p5-1

## MV* strategy

KnockoutJS used as framework as per Udacity project rubric. JS currently divided into four sections:

1. model. As per standard. Will eventually interface with localstorate and/or Firebase.
2. appViewModel. Standard KnockoutJS ViewModel. Function rather than object as per specification. Binds everything together, including the DOM. 
3. mapView. Everything to do with the Map. This is to keep the Google Maps API separate, as it apparently doesn't play nice with KnockoutJS bindings. Also there is a logical distinction between it and...
4. otherView. All other view elements. Specifically, the interface. Currently a placeholder only.

## Known issues

* Not all restaurants show as icon as Yelp API does not provide an overall category, only sub-category e.g. Indian, French.
* Chain stores are not well handled e.g. search for Starbucks
* All sorts of stuff returned in search - add filter for zero reviews?
* Links in infoWindows need fixing
* Formatting in main list not watertight - e.g. venues

## Notes

* I had to remove the initial dozen or so commits from the history completely as I'd accidently included some personal data in the directory and committed it.