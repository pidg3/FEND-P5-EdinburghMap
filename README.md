# FEND P5: Edinburgh Map

This project is for the Udacity Front End Nanodegree. 

The idea is:

1. To allow the user to get a sense of cool places and cool things going on in Edinburgh.
2. To allow the user to save a list of 'favourite places' that will persist over time.

## MV* strategy

KnockoutJS used as framework as per Udacity project rubric. JS currently divided into four sections:

1. model. As per standard. Will eventually interface with localstorate and/or Firebase.
2. appViewModel. Standard KnockoutJS ViewModel. Function rather than object as per specification. Binds everything together, including the DOM. 
3. mapView. Everything to do with Google Maps API calls.
4. yelpView. Everything to do with Google Maps API calls.
5. interfaceView. All other interface (view) functionality outside of ViewModel. 

## Known issues

* Not all restaurants show as icon as Yelp API does not provide an overall category, only sub-category e.g. Indian, French.
* All sorts of stuff returned in search - add filter for zero reviews?

## Notes

* I had to remove the initial dozen or so commits from the history.