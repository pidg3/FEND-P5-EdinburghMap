# FEND P5: Edinburgh Map

Hosted version here: http://michaelpidgeon.co.uk/mapapp

This project is for the Udacity Front End Nanodegree.

The idea is:

1. To allow the user to get a sense of cool places (Yelp) and cool things (Twitter) going on in Edinburgh.
2. To allow the user to save a list of 'favourite places' that will persist over time (currently via localStorage only).
3. To give me a bit of practice in RESTful API calls, Google maps and learning new JS frameworks.

## Instructions to run/edit the application locally

* Clone the repository as usual
* Make sure PHP installed and set up local host in the root directory: php -S localhost:8000
* Secret keys for Yelp and Twitter are not included in the repo to make the application secure. These will need to be added using your own application keys. Two new files need to be added the dist/php folder: yelp-keys.php and twitter-keys.php. These are simply containers for the API keys: the exact format required is described in yelp.php and twitter.php respectively. 
* Gulpfile contains required modules. 'gulp build' is used to clear dist directory and rebuild from src directory.

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