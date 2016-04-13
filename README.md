# FEND P5: Edinburgh Map

Hosted version here: http://michaelpidgeon.co.uk/mapapp

This project is for the Udacity Front End Nanodegree.

**Data from the Yelp is used.**

I have removed all PHP code from this project as per Udacity review request. This means it is not a secure implementation, and the secret keys for Yelp are visible to all.

The idea is:

1. To allow the user to get a sense of cool places (Yelp) in Edinburgh.
2. To allow the user to save a list of 'favourite places' that will persist over time (currently via localStorage only).
3. To give me a bit of practice in RESTful API calls, Google maps and learning new JS frameworks.

## Instructions to run/edit the application locally

* Clone the repository as usual
* **NOTE - on this branch secret keys for Yelp API calls are included, to make the Udacity Review a bit easier :-) This is not the same in the prod version**
* Run `npm install` to install required node modules for build process
* `gulp build` is used to clear dist directory and rebuild from src directory if any change are made.
* In the root directory, run a local HTTP server e.g. a python server: `python -m SimpleHTTPServer 8000`. This is required for the API calls. 
* Navigate to localhost path, localhost:8000 in the above example.

## MV* strategy

KnockoutJS used as framework as per Udacity project rubric. JS  divided into five sections:

1. model. As per standard. Will eventually interface with localstorate and/or Firebase.
2. appViewModel. Standard KnockoutJS ViewModel. Function rather than object as per specification. Binds everything together, including the DOM.
3. mapView. Everything to do with Google Maps API calls.
4. yelpView. Everything to do with Yelp API calls.

## Known issues

* Not all restaurants show as icon as Yelp API does not provide an overall category, only sub-category e.g. Indian, French.

## Notes and credits

* I had to remove the initial dozen or so commits from the history.
* oauth-signatures for Yelp calls: https://github.com/bettiolo/oauth-signature-js
