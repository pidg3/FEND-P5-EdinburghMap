'use strict';
/*eslint-disable no-console */
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
				yelpRefs: ['Sports', 'football', 'stadiumsarenas']
			}
		},

		Other: { // used if cannot find a match with other icons
			name: 'Other',
			imgBlack: 'images/other.png',
			imgFav: 'images/other-fav.png'
		}
	};

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
			self.currentSearch(self.searchQuery()); // sets currentSearch to whatever is entered - used to display name of search
			self.searchQuery(''); // resets text to blank
			self.mainSearch(self.currentSearch()); // carries out actual search
		};

		// search entered: carries out search using Yelp API and returns results in menu list
		self.mainSearch = function(query) {
			self.menuLoading(true); // shows loading spinner and hides search results

			yelpView.search(query, function(result) { // callback function - executes when Yelp data returned
				console.log(result);
				self.displayList([]); // reset list before re-populate
				var tempItem; // holder var for current dataset

				for (var i = 0; i < result.businesses.length; i++) { // iterate through list and populate displayList() / uniqueIdList()
					tempItem = {
						key: result.businesses[i].id,
						name: result.businesses[i].name,
						type: result.businesses[i].categories[0][1] // only get primary type, not array of options
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
				yelpView.get_business(ID, function(result) { // create new marker via Yelp callback
					mapView.createPlaceMarker(result);
				});
			}
			else if (alreadyMarker === true) { // do not create marker emphasise existing marker
				mapView.animateMarker(currentMarker); // animate marker
				mapClosure.panTo(currentMarker.position); // center map to marker position

				// if mobile device: close menu
				if (Math.max(document.documentElement.clientWidth, window.innerWidth || 0) <= 600) {

					interfaceView.closeMenu($('#menu'));
					interfaceView.closeMenu($('#favourites'));
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

			console.log(favourite);

			var mainType = ''; // used for type category as listed in model

			for (var categoryRef in model.iconLibrary) { // loop through outer iconLibrary object
				for (var i = 0; i < model.iconLibrary[categoryRef].yelpRefs.length; i++) { // loop through yelp categories array
					if (favourite.type === model.iconLibrary[categoryRef].yelpRefs[i]) { // if specific place category matches iconLibrary category
						mainType = model.iconLibrary[categoryRef].name;	 // set to correct name as defined in model
						break; // no further searching necessary - break out of loop (performance boost)
					}
				}
				if (mainType !== '') { // no further searching necessary - break out of loop (performance boost)
					break;
				}
			}

			if (mainType === '') {
				mainType = model.Other.name;
			}

			self.toggleFavourite(favourite.name, favourite.key, mainType);
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

			// if it is: remove object and set image to black
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

			// if it isn't: add new object and set image to white
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
				return self.viewModelFavourites();
			}
			else { // filter entered:
				return ko.utils.arrayFilter(self.viewModelFavourites(), function(favourite) {

					var re = new RegExp(self.currentFilter() , 'i'); // define new regex for filter input

					if (re.test(favourite.name)) {  // name regex match
						return true;
					}
					else if (re.test(favourite.type)) { // type regex match
						return true;
					}
					else { // no match
						return false;
					}
				});

			}
		});

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
			if(localStorage.getItem('favourites')) {
				console.log('Favourites updated from local storage');

				// localStorage as string so needs to be parsed
				self.viewModelFavourites(JSON.parse(localStorage.getItem('favourites')));
			}
		}

		// display log message if functionality not available
		else {
			console.log('No local storage available.');
		}

		// ======== Twitter integration ========

		self.toggleTwitter = function() {
			twitterView.search(11, function(result) { // callback function - executes when Twitter data returned
				console.log(result);
				mapView.createTwitterMarkers(result);
			});
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

			$('#toggle-menu').off(); // remove event handlers
			$('#toggle-favourites').off();
			$('#search-box').off();
		};

		// link to mapView - clear out all current markers
		self.clearMarkers = function() {
			mapView.clearMarkers();
		};
	}

	// applies bindings to a variable so functions can be referenced by other parts of app i.e. not just DOM bindings
	var appViewModelContainer = new appViewModel();
	ko.applyBindings(appViewModelContainer);

	// for all Google Maps API functionality
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

			console.log(place);

			// remove any pre-existing animation: takes out bug where markers can get stuck in infinite loop
			for (var k = 0; k < appViewModelContainer.viewModelMarkers().length; k++) {

				// there will only ever be one pair of object values, however this allows key and value to be separated
				for (var refMarker in appViewModelContainer.viewModelMarkers()[k]) {
					appViewModelContainer.viewModelMarkers()[k][refMarker].setAnimation(null); // reset animation
				}
			}

			self.type; // place type as per definitions in model
			self.iconURL = '';

			// loop through Yelp object categories and match to matrix of images in model
			// break out of both loops if match found
			for (var i = 0; i < place.categories.length; i++) {  // loop through categories in specific place object returned
				for (var categoryRef in model.iconLibrary) { // loop through outer iconLibrary object
					for (var j = 0; j < model.iconLibrary[categoryRef].yelpRefs.length; j++) { // loop through yelp categories array
						if (place.categories[i][1] === model.iconLibrary[categoryRef].yelpRefs[j]) { // if specific place category matches iconLibrary category
							self.type = model.iconLibrary[categoryRef].name;
							self.iconURL = model.iconLibrary[categoryRef]; // prepare to set to correct icon
							break; // no further searching necessary - break out of loop (performance boost)
						}
					}
					if (self.iconURL !== '') { // no further searching necessary - break out of loop (performance boost)
						break;
					}
				}
				if (self.iconURL !== '') { // no further searching necessary - break out of loop (performance boost)
					break;
				}
			}

			// if match not found, set to default symbol
			if (self.iconURL === '') {
				self.type = model.Other.name;
				self.iconURL = model.Other; // prepare to set to correct icon
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

			// set map to marker location
			mapClosure.panTo(self.placeLoc);

			// for mobile devices/small screens
			if (Math.max(document.documentElement.clientWidth, window.innerWidth || 0) <= 600) {

				// close menu (avoid obscuring markers)
				interfaceView.closeMenu($('#menu'));
				interfaceView.closeMenu($('#favourites'));
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

				appViewModelContainer.infoWindowPlaceContent.ID = place.id; // not used for window but needed for favourite functionality
				appViewModelContainer.infoWindowPlaceContent.type = self.type;

				// set infoWindow content - includes binding to trigger template
				console.log(content);
				mapView.infoWindow.setContent(content);

				// show actual infoWindow
				mapView.infoWindow.open(mapClosure, context); // TODO - better loading animation, take out flickers

				// apply bindings
				ko.applyBindings(appViewModelContainer, document.getElementById('info-place'));
			};

			// for mobile devices/small screens
			if (Math.max(document.documentElement.clientWidth, window.innerWidth || 0) <= 600) {

				// close menu (avoid obscuring markers)
				interfaceView.closeMenu($('#menu'));
				interfaceView.closeMenu($('#favourites'));
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
				interfaceView.closeMenu($('#menu'));
				interfaceView.closeMenu($('#favourites'));
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

	// all Yelp API calls
	// as a design principle data is NOT processed/parsed here but instead raw JSON return passed to other functions
	// API calls made via a PHP handler

	var yelpView = {

		// functions need to be called using callback to 'do something' with the result
		// this avoids issues due to async AJAX request

		get_business: function(ID, callback) { // search by specific ID - must match exactly

			var ajaxParameters = {
				type: 'POST', // needs to be POST so can pass data values
				url:'php/yelp.php',
				data: {
					type: 'get_business', // 'search' or 'get_business'
					businessID: ID
				},
				dataType:'JSON',
				success: callback
			};

			// Send AJAX query via jQuery library.
			$.ajax(ajaxParameters) // return to be parsed by other function - API call only here
			.error(function(){
				appViewModelContainer.errorHandler('The Yelp API is misbehaving.'); // error handling
			});
		},


		search: function(query, callback) { // search for 'anything' - place name, type etc

			var ajaxParameters = {
				type: 'POST', // needs to be POST so can pass data values
				url:'php/yelp.php',
				data: {
					type: 'search', // 'search' or 'get_business'
					term: query
				},
				dataType:'JSON',
				success: callback
			};

			// Send AJAX query via jQuery library.
			$.ajax(ajaxParameters) // return to be parsed by other function - API call only here
			.error(function(){
				appViewModelContainer.errorHandler('The Yelp API is misbehaving.'); // error handling
			});
		}
	};

	// twitter API calls
	var twitterView = {
		search: function(number, callback) { // search by specific ID - must match exactly

			var ajaxParameters = {
				type: 'POST', // needs to be POST so can pass data values
				url:'php/twitter.php',
				data: {
					number: number // number of results to return
				},
				dataType:'JSON',
				success: callback
			};

			// Send AJAX query via jQuery library.
			$.ajax(ajaxParameters) // return to be parsed by other function - API call only here
			.error(function(){
				appViewModelContainer.errorHandler('The Twitter API has temporarily flown away.'); // error handling
			});
		}
	};

	// all view to do with interface
	// i.e. any view stuff except Google Maps and Yelp API
	var interfaceView = {

		// for transition/animation end functions following
		transitionEnd: 'transitionend webkitTransitionEnd otransitionend MSTransitionEnd',
		animationEnd: 'animationend webkitAnimationEnd oanimationend msAnimationEnd ',

		// listens for searches
		// if menu not open - open it
		// if menu open - pulse animation
		searchListener: function() {
			$('#search-box').on('submit', function() {

				console.log(appViewModelContainer.menu());

				// open or refresh main menu
				if (appViewModelContainer.menu() === false) { // show pulse animation if menu already open: draws attention to change
					appViewModelContainer.menu(true);
				}

				// close favourites if already open
				if (appViewModelContainer.favourites() === true) { // show pulse animation if menu already open: draws attention to change
					appViewModelContainer.favourites(false);  // toggle whether moving up or down
				}
			});
		}
	};


	// hold map closure - allows map to be accessed by other functions
	var mapClosure = mapView.initMap();

	// add menu/search listeners
	interfaceView.searchListener();

}