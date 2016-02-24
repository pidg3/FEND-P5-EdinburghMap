// Maps API key: AIzaSyCKaSn7cGU9ER9KVO63fCTQFOPUnOg1q9U

// TODO - resolve bug with infoWindow links

/*eslint-disable no-console */
/* exported mapApp mapError */ // called by maps API callback in index.html

// container for whole app - single global variable
// called by Google Maps script in index.html

function mapInit() {
	var url = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyCKaSn7cGU9ER9KVO63fCTQFOPUnOg1q9U&callback=mapApp&libraries=places';
	$.getScript(url)

	// if getting the script fails
	// error handling not done via knockout as avoids the need to artificially set bindings for all elements in DOM
	.fail(function() {
		$('#error-handler p:first-of-type').append('<p>Google Maps seems to have gone AWOL.</p>');
		$('#error-handler').css('display', 'block');
	});
}

mapInit();

function mapApp() {
	'use strict';
	var model = {

		// there isn't a high-level category in the yelp API e.g. restaurants
		// therefore this mapping table is required
		iconLibrary: {
			bars: {
				name: 'Bars',
				imgBlack: '../images/bar.png',
				imgFav: '../images/bar-fav.png',
				yelpRefs: ['pubs', 'bars', 'cocktailbars']
			},
			cafes: {
				name: 'Cafes',
				imgBlack: '../images/cafe.png',
				yelpRefs: ['cafes', 'coffee', 'tea']
			},
			attractions: {
				name: 'Attractions',
				imgBlack: '../images/museum.png',
				yelpRefs: ['galleries', 'museums', 'landmarks']
			},
			restaurants: {
				name: 'Restaurants',
				imgBlack: '../images/museum.png',
				yelpRefs: ['indian', 'indpak', 'mexican','french', 'gastropub', 'english', 'scottish', 'tuskish', 'italian','steak', 'burgers', 'seafood',
				'british', 'modern_european', 'sandwiches','vegetarian', 'japanese', 'chinese']
			},
			sports: {
				name: 'Sports',
				imgBlack: '../images/sports.png',
				yelpRefs: ['football', 'stadiumsarenas']
			}
		},

		defaultIcon: { // used if cannot find a match with other icons
			name: 'Other',
			imgBlack: '../images/other.png'
		}, 

		favouriteList: [],

		markers: [] // holds current markers. Needs to be array as index is used for selection in Yelp API calls

	};	

	// delared as function as per KnockoutJS documentation
	function appViewModel() {
		var self = this; 

		self.displayList = ko.observableArray(); // results shown in menu: includes name/ID/type

		// search entered: carries out search using Yelp API and returns results in menu list
		self.mainSearch = function(query) {
			$('#search-display').addClass('hidden'); // shows loading spinner and hides search results
			$('#search-loading').removeClass('hidden');

			yelpView.searchAll(query, function(result) { // callback function - executes when Yelp data returned
				self.displayList([]); // reset list before re-populate
				var tempItem; // holder var for current dataset

				for (var i = 0; i < result.businesses.length; i++) { // iterate through list and populate displayList() / uniqueIdList()
					tempItem = {
						key: result.businesses[i].id,
						name: result.businesses[i].name,
						type: result.businesses[i].categories[0][0] // only get primary type, not array of options
					};
					self.displayList.push(tempItem);
				}

				$('#search-display').removeClass('hidden'); // hides loading spinner and shows search results
				$('#search-loading').addClass('hidden');

			});
		};

		// holds search query for entry into searchBox() function below
		self.searchQuery = ko.observable(); 

		// set by search query, only used for display via binding, allows reset of search box text between queries
		self.currentSearch = ko.observable('Search for something to get started...'); 

		// triggered by search bar entry
		self.searchBox = function() {
			self.currentSearch(self.searchQuery()); // sets currentSearch to whatever is entered - used to display name of search
			self.searchQuery(''); // resets text to blank
			self.mainSearch(self.currentSearch()); // carries out actual search
		};

		// displays marker for specific business when name clicked, query by ID
		self.placeClick = function(ID) {
			
			var alreadyMarker = false;
			var currentMarker;

			for (var i = 0; i < model.markers.length; i++) { // loop through existing markers
				if (model.markers[i][Object.keys(model.markers[i])[0]].id === ID) { // marker already on map
					alreadyMarker = true;
					currentMarker = model.markers[i][Object.keys(model.markers[i])[0]]; // marker object
					break;
				}
			}

			if (alreadyMarker === false) {
				yelpView.searchID(ID, function(result) { // create new marker via Yelp callback
					mapView.createMarker(result); 
				});
			}

			else if (alreadyMarker === true) {
				mapView.animateMarker(currentMarker);
			}

		};

		// favourite places implementation TODO - figure out how this works...
		self.viewModelFavourites = ko.observableArray(); // set observable to point to model data+

		// infoWindow data for bindings
		self.infoWindowContent = {
			name: '',
			copy: '',
			url: '',
			rating: '',
			photo: '',
			mapLink: '',
			address: ''
		};

		// parse values and pass to toggleFavourite()
		// needed as menu returns this as an object rather than three separate values
		self.menuFavourite = function(favourite) {
			self.toggleFavourite(favourite.name, favourite.key, favourite.type);
		};

		// toggles whether a place is included in model.favouriteList
		// MUST pass in name, ID and type strings, in that order
		self.toggleFavourite = function(name, ID, type) { // generic function to toggle whether a place name is included in favourites

			// work out if key already in array
			var previousIndex = null;
			for (var i = 0; i < self.viewModelFavourites().length; i++) { // loop through favourites array
				if (ID === self.viewModelFavourites()[i].key) {
					previousIndex = i;
					break;
				}
			}

			// if it is: remove object
			if (previousIndex !== null) { // if value set i.e. already in favourites
				self.viewModelFavourites().splice(previousIndex, 1); // delete object
			}

			// if it isn't: add new object
			else {
				var newFavourite = {
					key: ID,
					name: name, 
					type: type
				};
				self.viewModelFavourites().push(newFavourite); // push to model data
			}

			self.viewModelFavourites.valueHasMutated(); // force update of CSS
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

		// error handling
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
		createMarker: function(place) {
			
			var self = this;

			console.log(place); // TODO - remove (useful for debugging in dev)

			// remove any pre-existing animation: takes out bug where markers can get stuck in infinite loop
			for (var k = 0; k < model.markers.length; k++) {

				// there will only ever be one pair of object values, however this allows key and value to be separated
				for (var refMarker in model.markers[k]) {
					model.markers[k][refMarker].setAnimation(null); // reset animation
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
							self.iconURL = model.iconLibrary[categoryRef].imgBlack; // set to correct icon
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
				self.iconURL = model.defaultIcon.imgBlack;
			}

			// get location from Yelp object
			self.placeLoc = new google.maps.LatLng(place.location.coordinate.latitude, place.location.coordinate.longitude); 

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
			self.infoWindowTemplate = '<div class="info-content" id="info-window" data-bind="template: { name: \'infoWindow-template\', data: infoWindowContent }"></div>';

			// listen for clicks: bring content as Google Maps infoWindow
			google.maps.event.addListener(self.marker, 'click', function() {
				var currentMarker = this;
				mapView.animateMarker(currentMarker); // marker bounces once on click
				self.openInfoWindow(self.infoWindowTemplate, place, currentMarker);
			});

			// populate array of current markers
			self.forModel = {};
			self.forModel[place.name] = self.marker; // key: name, value: marker content
			model.markers.push(self.forModel);

			self.openInfoWindow = function(content, place, context) {

				// set infoWindow content in viewModel bindings
				appViewModelContainer.infoWindowContent.name = place.name;
				appViewModelContainer.infoWindowContent.copy = place.snippet_text;
				appViewModelContainer.infoWindowContent.url = place.url;
				appViewModelContainer.infoWindowContent.photo = place.image_url;
				appViewModelContainer.infoWindowContent.rating = place.rating_img_url_large;
				appViewModelContainer.infoWindowContent.mapLink = 'http://maps.google.com/?q=' + place.name + ',Edinburgh';
				appViewModelContainer.infoWindowContent.address = place.location.address;

				appViewModelContainer.infoWindowContent.ID = place.id; // not used for window but needed for favourite functionality

				// set infoWindow content - includes binding to trigger template
				mapView.infoWindow.setContent(content);

				// show actual infoWindow
				mapView.infoWindow.open(mapClosure, context); // TODO - better loading animation, take out flickers

				// apply bindings
				ko.applyBindings(appViewModelContainer, document.getElementById('info-window'));
			};
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
			for (var i = model.markers.length; i >= 0; i--) { 

				inFavourites = false; // reset

				// there will only ever be one pair of object values, however this allows key and value to be separated
				for (var refMarker in model.markers[i]) {
					currentMarker = model.markers[i][refMarker]; // marker object

					for (var refFav in appViewModelContainer.viewModelFavourites()) { // loop through favourites
						if (appViewModelContainer.viewModelFavourites()[refFav].key === currentMarker.id) {
							inFavourites = true;
							break; // exit for loop
						}
					}

					if (inFavourites === false) {
						currentMarker.setMap(null); // set so do not display on map
						model.markers.splice(i, 1); // remove from marker array
					}
				}
			}

			// TODO - reset marker array to null??? 

		}

	};

	// all Yelp API calls
	// as a design principle data is NOT processed/parsed but instead raw JSON return passed to other functions

	var yelpView = {

		// credit for API call: Udacity forums - https://discussions.udacity.com/t/how-to-make-ajax-request-to-yelp-api/13699/18

		// this is not a secure implementation as keys are visible to all
		// TODO - hide using server side code

		yelpAPI: {
			YELP_KEY_SECRET: 'sWaoF5jHGhP3lrRobEOhgBpYq80',	
			YELP_TOKEN_SECRET: '54_OmI6aX963nRd9JJBb1PTLy5A'
		},

		nonce_generate: function() { // generates random string as per Yelp OAuth spec
			return (Math.floor(Math.random() * 1e12).toString());
		},

		commonParameters: {
			oauth_consumer_key: 'VysIcTbiC1NAl7xLTDqCrA',
			oauth_token: 'pEE9CKVmrKhZr6yVigDUMej-pEu526M_',
			oauth_signature_method: 'HMAC-SHA1',
			oauth_version : '1.0',
			callback: 'cb',
			location : 'Edinburgh'
		},

		// functions need to be called using callback to 'do something' with the result
		// this avoids issues due to async AJAX request

		searchID: function(ID, callback) { // search by specific ID - must match exactly

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


		searchAll: function(query, callback) { // search for 'anything' - place name, type etc

			var typeParameters = {
				term : query, // search for query passed to searchAll
				limit: 10,
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

	// all view to do with interface
	// i.e. any view stuff except Google Maps and Yelp API
	var interfaceView = {

		// for transition/animation end functions following, DNRY
		transitionEnd: 'transitionend webkitTransitionEnd otransitionend MSTransitionEnd',
		animationEnd: 'animationend webkitAnimationEnd oanimationend msAnimationEnd ',

		// listens to clicks in main interface hamburger button, then toggles whether menu open
		menuListener: function() {

			$('#toggle-menu').on('click', function() {

				var menu = $('#menu');

				menu.addClass('animating');
				if (menu.hasClass('menu-visible')) { // toggle whether moving up or down
					menu.addClass('bottom');
				} 
				else {
					menu.addClass('top');
				}

				// callback when transition ends
				menu.on(interfaceView.transitionEnd, function() {
					menu
					.removeClass('animating top bottom')
					.toggleClass('menu-visible');
					menu.off(interfaceView.transitionEnd); // removes event handler
				});
			});
		},

		favouritesListener: function() {
			$('#toggle-favourites').on('click', function() {

				var favourites = $('#favourites');

				favourites.addClass('animating');
				if (favourites.hasClass('menu-visible')) { // toggle whether moving up or down
					favourites.addClass('bottom');
				} 
				else {
					favourites.addClass('top');
				}

				// callback when transition ends
				favourites.on(interfaceView.transitionEnd, function() {
					favourites
					.removeClass('animating top bottom')
					.toggleClass('menu-visible');
					favourites.off(interfaceView.transitionEnd); // removes event handler
				});
			});
		},

		// listens for searches
		// if menu not open - open it
		// if menu open - pulse animation
		searchListener: function() {
			$('#search-box').on('submit', function() {

				var menu = $('#menu');

				if (menu.hasClass('menu-visible')) {
					menu.addClass('animated pulse'); // trigger animation
					menu.on(interfaceView.animationEnd, function() {
						menu
						.removeClass('animated pulse');
						menu.off(interfaceView.animationEnd); // removes event handler
					});

				}
				else {
					menu.addClass('animating');
					menu.addClass('top');
					menu.on(interfaceView.transitionEnd, function() {
						menu
						.removeClass('animating top bottom')
						.toggleClass('menu-visible');
						menu.off(interfaceView.transitionEnd);
					});
				}
			});
		}
	};


	// hold map closure - allows map to be accessed by other functions
	var mapClosure = mapView.initMap();

	// add menu/search listeners
	interfaceView.menuListener(); 
	interfaceView.favouritesListener();
	interfaceView.searchListener();

}