'use strict';
/*eslint-disable no-console */
/*global ko $ google _*/
/* exported mapApp mapError */ // called by maps API callback in index.html

function mapInit() {
	var url = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyCKaSn7cGU9ER9KVO63fCTQFOPUnOg1q9U&callback=mapApp&libraries=places';
	$.getScript(url)

	// if getting the script fails
	// initialises a 'mini view model' to avoid having to start whole mapApp function with associated complexities
	.fail(function() {
		function mapErrorViewModel() {
			self.errorToggle = ko.observable(1); // initialise in error state
			self.errorMessage = ko.observable('The Google Maps API is misbehaving.');
		}
		ko.applyBindings(mapErrorViewModel, document.getElementById('error-handler')); // only apply bindings to error handling section
	});
}

mapInit();

// container for whole app - single global variable
// called by Google Maps script in mapInit
function mapApp() {

	/***********************************

	MODEL DATA

	***********************************/

	var model = {

		// there isn't a high-level category in the yelp API e.g. restaurants
		// therefore this mapping table is required
		iconLibrary: {
			Bars: {
				name: 'Bars',
				imgBlack: 'images/bar.png',
				imgFav: 'images/bar-fav.png',
				yelpRefs: ['Bars', 'pubs', 'bars', 'cocktailbars']
			},
			Cafes: {
				name: 'Cafes',
				imgBlack: 'images/cafe.png',
				imgFav: 'images/cafe-fav.png',
				yelpRefs: ['Cafes', 'cafes', 'coffee', 'tea']
			},
			Attractions: {
				name: 'Attractions',
				imgBlack: 'images/attraction.png',
				imgFav: 'images/attraction-fav.png',
				yelpRefs: ['Attractions', 'galleries', 'museums', 'landmarks']
			},
			Restaurants: {
				name: 'Restaurants',
				imgBlack: 'images/restaurant.png',
				imgFav: 'images/restaurant-fav.png',
				yelpRefs: ['Restaurants', 'indian', 'indpak', 'mexican','french', 'gastropub', 'english', 'scottish', 'tuskish', 'italian','steak', 'burgers', 'seafood',
				'british', 'modern_european', 'sandwiches','vegetarian', 'japanese', 'chinese']
			},
			Sports: {
				name: 'Sports',
				imgBlack: 'images/sports.png',
				imgFav: 'images/sports-fav.png',
				yelpRefs: ['Sports', 'football', 'stadiumsarenas', 'sports_clubs']
			}
		},

		Other: { // used if cannot find a match with other icons
			name: 'Other',
			imgBlack: 'images/other.png',
			imgFav: 'images/other-fav.png'
		},

		// used to pre-populate favourits if not already defined
		defaultFavourites: [
			{
				'key': 'national-museum-of-scotland-edinburgh',
				'name': 'National Museum of Scotland',
				'type': 'Attractions'
			},
			{
				'key': 'wellington-coffee-edinburgh',
				'name': 'Wellington Coffee',
				'type': 'Cafes'
			},
			{
				'key': 'artisan-roast-edinburgh',
				'name': 'Artisan Roast',
				'type': 'Cafes'
			},
			{
				'key': 'saint-giles-cafe-bar-edinburgh',
				'name': 'Saint Giles Cafe Bar',
				'type': 'Cafes'
			},
			{
				'key': 'edinburgh-castle-edinburgh',
				'name': 'Edinburgh Castle',
				'type': 'Other'
			},
			{
				'key': 'camera-obscura-edinburgh',
				'name': 'Camera Obscura',
				'type': 'Attractions'
			},
			{
				'key': 'royal-botanic-garden-edinburgh-edinburgh',
				'name': 'Royal Botanic Garden Edinburgh',
				'type': 'Other'
			},
			{
				'key': 'la-barantine-edinburgh',
				'name': 'La Barantine',
				'type': 'Cafes'
			},
			{
				'key': 'the-hanging-bat-beer-cafe-edinburgh',
				'name': 'The Hanging Bat Beer Cafe',
				'type': 'Bars'
			},
			{
				'key': 'the-jazz-bar-edinburgh',
				'name': 'The Jazz Bar',
				'type': 'Bars'
			},
			{
				'key': 'the-jolly-botanist-edinburgh',
				'name': 'The Jolly Botanist',
				'type': 'Bars'
			},
			{
				'key': 'hibernian-fc-edinburgh',
				'name': 'Hibernian FC',
				'type': 'Sports'
			}
		]
	};

	/***********************************

	APP VIEW MODEL

	***********************************/

	// delared as function as per KnockoutJS documentation
	function appViewModel() {
		var self = this;

		// ======== infoWindow content holders ========

		// infoWindow data for bindings
		self.infoWindowPlaceContent = {};

		self.infoWindowTwitterContent = {};

		// ======== Menu animations ========

		// custom 'menuTransition' binding just needs true/false to be passed

		// menu states
		// binding reverses state on load so initialised as true i.e. visible
		self.menu = ko.observable(false);
		self.favourites = ko.observable(false);

		// click listener
		self.toggleMenuState = function(element) {

			if (self[element]() === true) {
				self[element](false);
			}

			else {
				self[element](true);

				// set other elements to be hidden
				if (element === 'favourites') {
					self.menu(false);
				}
				if (element === 'menu') {
					self.favourites(false);
				}
			}
		};

		// close both menus (used for mobile version to maximise screen real estate)
		self.closeMenus = function() {
			if (self.menu() === true) {
				self.menu(false);
			}
			if (self.favourites() === true) {
				self.favourites(false);
			}

		};

		// ======== Search functionality ========

		// results shown in menu: includes name/ID/type
		self.displayList = ko.observableArray();

		// holds search query for entry into searchBox() function below
		self.searchQuery = ko.observable();

		// set by search query, only used for display via binding, separated from searchQuery allow reset of search box text between queries
		self.currentSearch = ko.observable('Search for something to get started...');

		// container for marker objects
		self.viewModelMarkers = ko.observableArray();

		// toggle loading status for menu
		self.menuLoading = ko.observable(false);

		// triggered by search bar entry
		// sets name of search in menu and triggers mainSearch()
		self.searchBox = function() {

			// opens menu if not already opened
			if (self.menu() === false) {
				self.toggleMenuState('menu');
			}

			self.currentSearch(self.searchQuery()); // sets currentSearch to whatever is entered - used to display name of search
			self.searchQuery(''); // resets text to blank
			self.mainSearch(self.currentSearch()); // carries out actual search
		};

		// search entered: carries out search using Yelp API and returns results in menu list
		self.mainSearch = function(query) {
			self.menuLoading(true); // shows loading spinner and hides search results

			yelpView.search(query, function(result) { // callback function - executes when Yelp data returned
				self.displayList([]); // reset list before re-populate
				var tempItem; // holder var for current dataset

				for (var i = 0; i < result.businesses.length; i++) { // iterate through list and populate displayList() / uniqueIdList()
					tempItem = {
						key: result.businesses[i].id,
						name: result.businesses[i].name,
						type: result.businesses[i].categories // only get primary type, not array of options
					};
					self.displayList.push(tempItem);
				}

				self.menuLoading(false); // hides loading spinner and shows search results
			});
		};

		// displays marker for specific business when name clicked, query by ID
		self.placeClick = function(ID) {

			var alreadyMarker = false;
			var currentMarker;

			for (var i = 0; i < self.viewModelMarkers().length; i++) { // loop through existing markers
				if (self.viewModelMarkers()[i][Object.keys(self.viewModelMarkers()[i])[0]].id === ID) { // marker already on map
					alreadyMarker = true;
					currentMarker = self.viewModelMarkers()[i][Object.keys(self.viewModelMarkers()[i])[0]]; // marker object
					break;
				}
			}

			if (alreadyMarker === false) {
				console.log('placeClick');
				yelpView.get_business(ID, function(result) { // create new marker via Yelp callback
					mapView.createPlaceMarker(result);
					console.log('placeClick result');
				});
			}
			else if (alreadyMarker === true) { // do not create marker emphasise existing marker
				mapView.animateMarker(currentMarker); // animate marker
				mapClosure.panTo(currentMarker.position); // center map to marker position

				// if mobile device: close menu
				if (Math.max(document.documentElement.clientWidth, window.innerWidth || 0) <= 600) {
					self.closeMenus;
				}

			}
		};

		// ======== Favourite places ========

		// holds favourites in array (populated from localStorage on page load)
		self.viewModelFavourites = ko.observableArray();

		// parse values and pass to toggleFavourite()
		// needed as menu returns this as an object rather than three separate values
		// also need to get 'type' into one of required categories (so toggleFavourite can update marker image)
		self.menuFavourite = function(favourite) {

			// if type is already in correct format (i.e. called from favourites menu)
			if (typeof favourite.type === 'string') {
				self.toggleFavourite(favourite.name, favourite.key, favourite.type);
			}

			else {
				var mainType = self.getType(favourite.type); // used for type category as listed in model
				self.toggleFavourite(favourite.name, favourite.key, mainType);
			}

		};

		// toggles whether a place is included in model.favouriteList
		// MUST pass in name, ID and type strings, in that order
		self.toggleFavourite = function(name, ID, type) {

			// work out if key already in favourites array
			var favIndex = null;
			for (var i = 0; i < self.viewModelFavourites().length; i++) { // loop through favourites array
				if (ID === self.viewModelFavourites()[i].key) {
					favIndex = i;
					break;
				}
			}

			// work out if key already in marker array
			var markerIndex = null;
			for (var j = 0; j < self.viewModelMarkers().length; j++) { // loop through marker array
				if (self.viewModelMarkers()[j][ID] !== null && self.viewModelMarkers()[j][ID] !== undefined) { // if a marker exists with this ID
					markerIndex = j;
					break;
				}
			}

			// if it is in favourites array: remove object and set image to black
			if (favIndex !== null) { // if value set i.e. already in favourites
				self.viewModelFavourites().splice(favIndex, 1); // delete object
				if (markerIndex !== null) {
					if (type !== 'Other') {
						self.viewModelMarkers()[markerIndex][ID].setIcon(model.iconLibrary[type].imgBlack); // set to correct icon based on type
					}
					else {
						self.viewModelMarkers()[markerIndex][ID].setIcon(model.Other.imgBlack);
					}
				}
			}

			// if it isn't: add new object, set image to white and call marker
			else {
				var newFavourite = {
					key: ID,
					name: name,
					type: type
				};
				self.viewModelFavourites().push(newFavourite); // push to model data
				if (markerIndex !== null) {
					if (type !== 'Other') {
						self.viewModelMarkers()[markerIndex][ID].setIcon(model.iconLibrary[type].imgFav); // set to correct icon based on type
					}
					else {
						self.viewModelMarkers()[markerIndex][ID].setIcon(model.Other.imgFav);
					}
				}
				self.placeClick(ID);
			}

			self.viewModelFavourites.valueHasMutated(); // force update of CSS for stars to change colour

			// if available; update localStorage
			// re-write each time to avoid sync issues

			if (storageAvailable('localStorage')) {

				// localStorage only accepts strings
				localStorage.setItem('favourites', JSON.stringify(self.viewModelFavourites()));
				console.log('Local storage updated');
			}
		};

		// takes ID - returns true if included in favourites
		// used for bindings - needs valueHasMutated() to force refresh of CSS
		self.favouriteChecker = function(ID) {

			for (var i = 0; i < self.viewModelFavourites().length; i++) { // loop through favourites array
				if (ID === self.viewModelFavourites()[i].key) { // if ID supplied and favourites ID match
					return true;
				}
			}
			return false;
		};

		// ======== Favourites filter ========

		self.currentFilter = ko.observable(); // value typed into filter box

		self.toggleFilterSwitcher = ko.observable(false); // true = favourites filter displayed
		self.toggleFilter = function() {
			if (self.toggleFilterSwitcher() === false) {
				self.toggleFilterSwitcher(true);
			}
			else {
				self.toggleFilterSwitcher(false);
				self.currentFilter(null);
			}
		};

		self.filteredFavourites = ko.computed(function() {
			if(!self.currentFilter()) {  // no filter entered - main favourites array returned

				// reset ALL markers to be visible when no filter entered
				if (self.resetMarkerVisibility) {
					self.resetMarkerVisibility();
				}

				return self.viewModelFavourites();
			}
			else { // filter entered:
				return ko.utils.arrayFilter(self.viewModelFavourites(), function(favourite) {

					var re = new RegExp(self.currentFilter() , 'i'); // define new regex for filter input

					if (re.test(favourite.name)) {  // name regex match
						self.markerVisibility(favourite.key, true);
						return true;
					}
					else if (re.test(favourite.type)) { // type regex match
						self.markerVisibility(favourite.key, true);
						return true;
					}
					else { // no match
						self.markerVisibility(favourite.key, false);
						return false;
					}
				});
			}
		});

		// control whether markers are visible
		// passing status = false sets 'Map' value of marker to null
		self.markerVisibility = function(key, status) {

			// get marker object from
			var currentMarker = _.find(self.viewModelMarkers(), function(o) {
				var keyString = Object.keys(o)[0];
				return keyString === key;
			});

			// setting Map to null removes from display (this is recommended solution in GM docs)
			if (status === false) {
				currentMarker[key].setMap(null);
			}

			// setting Map to mapClosure displays as normal (this is default value)
			else {
				currentMarker[key].setMap(mapClosure);
			}
		};

		self.resetMarkerVisibility = function() {
			for (var i = 0; i < self.viewModelMarkers().length; i++) {

				// get object value (i.e. map marker)
				var marker = self.viewModelMarkers()[i][Object.keys(self.viewModelMarkers()[i])];

				// make marker visible
				marker.setMap(mapClosure);
			}
		};

		// ======== LocalStorage for persistent data ========

		// determine whether localStorage available
		function storageAvailable(type) {
			try {
				var storage = window[type],
					x = '__storage_test__';
				storage.setItem(x, x);
				storage.removeItem(x);
				return true;
			}
			catch(e) {
				return false;
			}
		}

		if (storageAvailable('localStorage')) {

			// populate from localStorage, if available and populated
			if (localStorage.getItem('favourites') !== null && localStorage.getItem('favourites') !== '[]') {
				console.log('Favourites updated from local storage');

				// localStorage as string so needs to be parsed
				self.viewModelFavourites(JSON.parse(localStorage.getItem('favourites')));
			}

			// if not already defined, populate from defaults
			else {

				// localStorage as string so JSON needs to be stringified
				localStorage.setItem('favourites', JSON.stringify(model.defaultFavourites));
				self.viewModelFavourites(JSON.parse(localStorage.getItem('favourites')));
				console.log('Default favourites pushed to local storage');
			}

		}

		// display log message if functionality not available
		else {
			console.log('No local storage available.');
		}

		// create initial place markers from favourites
		// called at end of file (so requirements have finished loading)
		self.createInitialMarkers = function() {
			if (self.viewModelFavourites()) {
				for (var i = 0; i < self.viewModelFavourites().length; i++) {
					self.placeClick(self.viewModelFavourites()[i].key);
				}
			}
		};

		// ======== Twitter integration ========

		self.toggleTwitter = function() {
			twitterView.search(11, function(result) { // callback function - executes when Twitter data returned
				mapView.createTwitterMarkers(result);
			});
		};

		// ======== Helper function to get main business type (for marker icons) ========

		// need to pass Yelp array of types (returned by main API call)
		self.getType = function(typeArray) {
			// break out of both loops if match found
			for (var i = 0; i < typeArray.length; i++) {  // loop through categories in specific place object returned
				for (var categoryRef in model.iconLibrary) { // loop through outer iconLibrary object
					for (var j = 0; j < model.iconLibrary[categoryRef].yelpRefs.length; j++) { // loop through yelp categories array
						if (typeArray[i][1] === model.iconLibrary[categoryRef].yelpRefs[j]) { // if specific place category matches iconLibrary category
							return model.iconLibrary[categoryRef].name;
						}
					}
				}
			}

			// if match not found, set to default symbol
			return model.Other.name;
		};

		// ======== Error handling ========

		self.errorToggle = ko.observable(0); // 0 for no error; 1 for error state
		self.errorMessage = ko.observable(); // used for specific part erroring to customise error message
		self.errorHandler = function(component) {
			if (typeof component === 'string') { // custom error message. typeof needed to filter out knockout objects that may find their way in
				self.errorMessage(component);
			}

			else { // generic error message
				self.errorMessage('One of the moving parts seems to have thrown a wobbly.');
			}

			self.errorToggle(1); // triggers changes in display for both map and error-handler divs

		};

		// link to mapView - clear out all current markers
		self.clearMarkers = function() {
			mapView.clearMarkers();
		};
	}

	// applies bindings to a variable so functions can be referenced by other parts of app i.e. not just DOM bindings
	var appViewModelContainer = new appViewModel();
	ko.applyBindings(appViewModelContainer);

	/***********************************

	GOOGLE MAPS FUNCTIONALITY

	***********************************/

	var mapView = {

		edinburgh: new google.maps.LatLng(55.944201, -3.197536), // hard-coded to Edinburgh


		// having single infoWindow variable only allows one infoWindow at a time
		// this is a deliberate design principle from a UX perspective
		infoWindow: new google.maps.InfoWindow({
			maxWidth: 240
		}),

		// map engineered as closure
		// this allows other functions to easily reference stored map
		// as opposed to it being generated once only
		// function closure in mapClosure, defined below
		initMap: function() {

			return new google.maps.Map(document.getElementById('map'), {
				center: mapView.edinburgh,
				zoom: 13, // correct level to show Edinburgh city centre
				mapTypeControl: false // does not show satellite/map switcher
			});

		},

		// determine which icon to use based on data in model
		// have to pass in single Yelp place object
		createPlaceMarker: function(place) {

			var self = this;

			// remove any pre-existing animation: takes out bug where markers can get stuck in infinite loop
			for (var k = 0; k < appViewModelContainer.viewModelMarkers().length; k++) {

				// there will only ever be one pair of object values, however this allows key and value to be separated ...
				// ... value is marker object itself so needs to be accessed directly
				for (var refMarker in appViewModelContainer.viewModelMarkers()[k]) {
					appViewModelContainer.viewModelMarkers()[k][refMarker].setAnimation(null); // reset animation
				}
			}

			// place type as per definitions in model
			self.type = appViewModelContainer.getType(place.categories);

			// prepare to set to correct icon
			self.iconURL = model.iconLibrary[self.type];
			if (!self.iconURL) {
				self.iconURL = model.Other;
			}

			// set to white or black depending on whether in favourites array
			var inFavourites = false;
			for (var m = 0; m < appViewModelContainer.viewModelFavourites().length; m++) { // loop through favourites array
				if (place.id === appViewModelContainer.viewModelFavourites()[m].key) {
					inFavourites = true;
					break;
				}
			}
			if (inFavourites === true) {
				self.iconURL = self.iconURL.imgFav;
			}
			else {
				self.iconURL = self.iconURL.imgBlack;
			}

			// get location from Yelp object
			self.placeLoc = new google.maps.LatLng(place.location.coordinate.latitude, place.location.coordinate.longitude);

			// for mobile devices/small screens
			if (Math.max(document.documentElement.clientWidth, window.innerWidth || 0) <= 600) {

				// close menus (avoid obscuring markers)
				appViewModelContainer.closeMenus();
			}

			// create actual marker
			self.marker = new google.maps.Marker({
				map: mapClosure,
				position: self.placeLoc,
				animation: google.maps.Animation.BOUNCE,
				icon: self.iconURL, // custom variable marker as defined above
				id: place.id, // needed for favourites functionality
				type: self.type // needed for favourites functionality
			});
			setTimeout(function(){ self.marker.setAnimation(null); }, 750); // animations plays once only

			// pre-set content of infoWindow
			self.infoWindowTemplatePlace = '<div class="info-content" id="info-place" data-bind="template: { name: \'infoWindow-place\', data: infoWindowPlaceContent }"></div>';

			// listen for clicks: bring content as Google Maps infoWindow
			google.maps.event.addListener(self.marker, 'click', function() {
				var currentMarker = this;
				mapView.animateMarker(currentMarker); // marker bounces once on click
				self.openInfoWindow(self.infoWindowTemplatePlace, place, currentMarker);
			});

			// populate array of current markers
			self.forModel = {};
			self.forModel[place.id] = self.marker; // key: ID, value: marker content
			appViewModelContainer.viewModelMarkers().push(self.forModel);

			self.openInfoWindow = function(content, place, context) {

				// set infoWindow content in viewModel bindings
				appViewModelContainer.infoWindowPlaceContent.name = place.name;
				appViewModelContainer.infoWindowPlaceContent.copy = place.snippet_text;
				appViewModelContainer.infoWindowPlaceContent.url = place.url;
				appViewModelContainer.infoWindowPlaceContent.photo = place.image_url;
				appViewModelContainer.infoWindowPlaceContent.rating = place.rating_img_url_large;
				appViewModelContainer.infoWindowPlaceContent.mapLink = 'http://maps.google.com/?q=' + place.name + ',Edinburgh';
				appViewModelContainer.infoWindowPlaceContent.address = place.location.address;

				// not used for window but needed for favourite functionality
				appViewModelContainer.infoWindowPlaceContent.ID = place.id;
				appViewModelContainer.infoWindowPlaceContent.type = appViewModelContainer.getType(place.categories);

				// set infoWindow content - includes binding to trigger template
				mapView.infoWindow.setContent(content);

				// show actual infoWindow
				mapView.infoWindow.open(mapClosure, context); // TODO - better loading animation, take out flickers

				// apply bindings
				ko.applyBindings(appViewModelContainer, document.getElementById('info-place'));
			};

			// for mobile devices/small screens
			if (Math.max(document.documentElement.clientWidth, window.innerWidth || 0) <= 600) {

				// close menus (avoid obscuring markers)
				appViewModelContainer.closeMenus();
			}
		},

		createTwitterMarkers: function(tweets) {

			var self = this;

			// to generate actual markers
			// need separate function as otherwise run into scoping issues
			// must be before for loop
			self.showTwitterMarker = function(marker, content, i) {

				// populate array of markers so can be cleared
				self.forModel = {};
				self.forModel['twitter' + i] = marker; // value: marker content
				appViewModelContainer.viewModelMarkers().push(self.forModel);

				// preset infoWindow content
				self.infoWindowTemplateTwitter = '<div class="info-content" id="info-twitter" data-bind="template: { name: \'infoWindow-twitter\', data: infoWindowTwitterContent }"></div>';

				google.maps.event.addListener(marker, 'click', function() {
					var currentMarker = marker;
					mapView.animateMarker(currentMarker); // marker bounces once on click
					appViewModelContainer.infoWindowTwitterContent.copy = content.text;
					appViewModelContainer.infoWindowTwitterContent.screenName = content.user.screen_name;
					appViewModelContainer.infoWindowTwitterContent.imgURL = 'https://twitter.com/' + content.user.screen_name + '/profile_image?size=bigger';

					// set infoWindow content - includes binding to trigger template
					mapView.infoWindow.setContent(self.infoWindowTemplateTwitter);

					// show actual infoWindow
					mapView.infoWindow.open(mapClosure, this); // TODO - better loading animation, take out flickers

					// apply bindings
					ko.applyBindings(appViewModelContainer, document.getElementById('info-twitter'));

				});
			};

			for (var i = 0; i < tweets.statuses.length; i++) {

				// get location from tweet object
				// if/else needed as sometimes tweets do not have coordinates; is so set to centre of map
				if (tweets.statuses[i].geo) {
					self.placeLoc = new google.maps.LatLng(tweets.statuses[i].geo.coordinates[0], tweets.statuses[i].geo.coordinates[1]);
				}

				else {
					self.placeLoc = new google.maps.LatLng(55.944201, -3.197536);
				}

				// create actual marker
				self.marker = new google.maps.Marker({
					map: mapClosure,
					position: self.placeLoc,
					animation: google.maps.Animation.DROP,
					icon: 'images/tweet.png'
				});

				// self.forModel[i] = self.marker; // key: array ID, value: marker content
				// appViewModelContainer.viewModelTwitterMarkers().push(self.forModel); // populate marker object

				self.showTwitterMarker(self.marker, tweets.statuses[i], i);

			} // end for loop

			// for mobile devices/small screens
			if (Math.max(document.documentElement.clientWidth, window.innerWidth || 0) <= 600) {

				// close menu (avoid obscuring markers)
				appViewModelContainer.closeMenus();
			}
		},

		animateMarker: function(marker) {
			marker.setAnimation(google.maps.Animation.BOUNCE); // start animation
			setTimeout(function(){ marker.setAnimation(null); }, 750); // animations plays once only
		},

		// clear all markers TODO - build in functionality to leave favourites alone (differnt colour?)
		clearMarkers: function() {

			var inFavourites; // used to determine whether value in favourites array
			var currentMarker;

			// loop through markers in model data
			// iterate backwards as allows splice() to be used to remove items without corrupting index
			for (var i = appViewModelContainer.viewModelMarkers().length; i >= 0; i--) {

				inFavourites = false; // reset

				// there will only ever be one pair of object values, however this allows key and value to be separated
				for (var refMarker in appViewModelContainer.viewModelMarkers()[i]) {
					currentMarker = appViewModelContainer.viewModelMarkers()[i][refMarker]; // marker object

					for (var refFav in appViewModelContainer.viewModelFavourites()) { // loop through favourites
						if (appViewModelContainer.viewModelFavourites()[refFav].key === currentMarker.id) {
							inFavourites = true;
							break; // exit for loop
						}
					}

					if (inFavourites === false) {
						currentMarker.setMap(null); // set so do not display on map
						appViewModelContainer.viewModelMarkers().splice(i, 1); // remove from marker array
					}
				}
			}
		}
	};

	/***********************************

	YELP API

	***********************************/

	// all Yelp API calls
	// as a design principle data is NOT processed/parsed here but instead raw JSON return passed to other functions

	var yelpView = {

		// credit for API call: Udacity forums - https://discussions.udacity.com/t/how-to-make-ajax-request-to-yelp-api/13699/18

		// this is not a secure implementation as keys are visible to all
		// TODO - hide using server side code

		yelpAPI: {
			YELP_KEY_SECRET: 'sWaoF5jHGhP3lrRobEOhgBpYq80',
			YELP_TOKEN_SECRET: 'Jv-ro8dN-hapeEgoQ2eDONFwSe8'
		},

		nonce_generate: function() { // generates random string as per Yelp OAuth spec
			return Math.floor(Math.random() * 1e12).toString();
		},

		commonParameters: {
			oauth_consumer_key: 'VysIcTbiC1NAl7xLTDqCrA',
			oauth_token: 'hMkJBkzArp4mh4R6bP3hRjhgfF4sZ92_',
			oauth_signature_method: 'HMAC-SHA1',
			oauth_version : '1.0',
			callback: 'cb',
			location : 'Edinburgh'
		},

		// functions need to be called using callback to 'do something' with the result
		// this avoids issues due to async AJAX request

		get_business: function(ID, callback) { // search by specific ID - must match exactly

			var IDParameters = {
				oauth_timestamp: Math.floor(Date.now()/1000) // generated with each request to avoid timeout issues (300 second limit)
			};

			var IDUrl = 'https://api.yelp.com/v2/business/' + ID;

			$.extend(IDParameters, this.commonParameters);

			IDParameters.oauth_nonce = this.nonce_generate(); // must be before signature generated otherwise will return 400 error

			var encodedSignature = oauthSignature.generate('GET', IDUrl, IDParameters, this.yelpAPI.YELP_KEY_SECRET, this.yelpAPI.YELP_TOKEN_SECRET);
			IDParameters.oauth_signature = encodedSignature;

			var ajaxParameters = {
				url: IDUrl,
				data: IDParameters,
				cache: true,                // crucial to include as well to prevent jQuery from adding on a cache-buster parameter '_=23489489749837', invalidating our oauth-signature
				dataType: 'jsonp',
				success: callback
			};

			// Send AJAX query via jQuery library.
			$.ajax(ajaxParameters) // return to be parsed by other function - API call only here
			.error(function(){
				appViewModelContainer.errorHandler('The Yelp API is misbehaving.'); // error handling
			});
		},


		search: function(query, callback) { // search for 'anything' - place name, type etc

			var typeParameters = {
				term : query, // search for query passed to searchAll
				limit: 6,
				oauth_timestamp: Math.floor(Date.now()/1000) // generated with each request to avoid timeout issues (300 second limit)
			};

			$.extend(typeParameters, this.commonParameters);

			typeParameters.oauth_nonce = this.nonce_generate(); // must be before signature generated otherwise will return 400 error

			var encodedSignature = oauthSignature.generate('GET', 'https://api.yelp.com/v2/search', typeParameters, this.yelpAPI.YELP_KEY_SECRET, this.yelpAPI.YELP_TOKEN_SECRET);
			typeParameters.oauth_signature = encodedSignature;

			var ajaxParameters = {
				url: 'https://api.yelp.com/v2/search',
				data: typeParameters,
				cache: true,                // crucial to include as well to prevent jQuery from adding on a cache-buster parameter '_=23489489749837', invalidating our oauth-signature
				dataType: 'jsonp',
				success: callback
			};

			// Send AJAX query via jQuery library.
			$.ajax(ajaxParameters)
			.error(function(){
				appViewModelContainer.errorHandler('The Yelp API is misbehaving.'); // error handling
			});
		}
	};

	// initialise map
	// hold map in closure - allows map to be accessed by other functions
	var mapClosure = mapView.initMap();
	appViewModelContainer.createInitialMarkers();

}
