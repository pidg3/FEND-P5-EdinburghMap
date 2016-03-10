# FEND P5: Edinburgh Map

This project is for the Udacity Front End Nanodegree.

The idea is:

1. To allow the user to get a sense of cool places (Yelp) and cool things (Twitter) going on in Edinburgh.
2. To allow the user to save a list of 'favourite places' that will persist over time (currently via localStorage only).
3. To give me a bit of practice in RESTful API calls, Google maps and learning new JS frameworks.

Current status (as at 10 March 16):

* About 90% of the way there.
* Have a hosting solution in place (although exact URL TBC) and have written some basic PHP to obscure the secret keys for Yelp and Twitter.
* Needs a bit of refactoring and general tidying up.

## If forking/cloning

* You need to set up two new php files in the PHP folder: twitter-keys.php and yelp-keys.php. API keys need to be added in order for the OAuth call to work. The format is described in the respective main PHP files. 

## MV* strategy

KnockoutJS used as framework as per Udacity project rubric. JS currently divided into five sections:

1. model. As per standard. Will eventually interface with localstorate and/or Firebase.
2. appViewModel. Standard KnockoutJS ViewModel. Function rather than object as per specification. Binds everything together, including the DOM. 
3. mapView. Everything to do with Google Maps API calls.
4. yelpView. Everything to do with Google Maps API calls.
5. interfaceView. All other interface (view) functionality outside of ViewModel. 

## Known issues

* Not all restaurants show as icon as Yelp API does not provide an overall category, only sub-category e.g. Indian, French.

## Notes and credits

* I had to remove the initial dozen or so commits from the history.
* PHP code to call Yelp API courtesy of: https://github.com/Yelp/yelp-api/tree/master/v2/php
* PHP code to call Twitter API courtesy of: https://github.com/J7mbo/twitter-api-php