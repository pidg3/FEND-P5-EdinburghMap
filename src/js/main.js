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
		// this is annoying and has resulted in the hacky-feeling list below
		// TODO: find better way of managing this
		iconLibrary: { 
			'pubs': '../images/bar.png',
			'bars': '../images/bar.png',
			'cafes': '../images/cafe.png',
			'coffee': '../images/cafe.png',
			'tea': '../images/cafe.png',
			'galleries': '../images/museum.png',
			'museums': '../images/museum.png',	
			'landmarks': '../images/museum.png',
			'indian': '../images/restaurant.png',
			'indpak': '../images/restaurant.png',
			'mexican': '../images/restaurant.png',
			'french': '../images/restaurant.png',
			'gastropub': '../images/restaurant.png',
			'english': '../images/restaurant.png',
			'scottish': '../images/restaurant.png',
			'turkish': '../images/restaurant.png',
			'italian': '../images/restaurant.png',
			'steak': '../images/restaurant.png',
			'burgers': '../images/restaurant.png',
			'seafood': '../images/restaurant.png',
			'british': '../images/restaurant.png',
			'modern_european': '../images/restaurant.png',
			'sandwiches': '../images/restaurant.png',
			'vegetarian': '../images/restaurant.png',
			'football': '../images/sports.png',
			'stadiumsarenas': '../images/sports.png'
		},

		defaultIcon: '../images/other.png', // used if cannot find a match with other icons

		favouriteList: [],

		markers: [] // holds current markers

	};	

	// delared as function as per KnockoutJS documentation
	function appViewModel() {
		var self = this; 

		self.displayList = ko.observableArray(); // results shown in menu

		// search entered: carries out search using Yelp API and returns results in menu list
		self.mainSearch = function(type) {+
			$('#search-display').addClass('hidden'); // shows loading spinner and hides search results
			$('#search-loading').removeClass('hidden');
			yelpView.searchType(type, function(result) { // callback function - executes when Yelp data returned
				self.displayList([]); // reset list before re-populate
				for (var i = 0; i < result.businesses.length; i++) { // iterate through list and populate displayList()
					self.displayList.push(result.businesses[i].name);
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

		// displays marker for specific business when name clicked
		self.placeClick = function(name) {
			yelpView.searchName(name, function(result) {
				mapView.createMarker(result.businesses[0]);
			});
		};

		// favourite places implementation TODO - figure out how this works...
		self.favourites = ko.observableArray(); // set observable to point to model data+

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

		// toggles whether a place is included in model.favouriteList
		self.toggleFavourite = function(name) { // generic function to toggle whether a place name is included in favourites
			var favouriteIndex = model.favouriteList.indexOf(name); // set value to index of matched name, or -1 if no match

			if (favouriteIndex === -1) {
				model.favouriteList.push(name); // add to array
			}
			else if (favouriteIndex >= 0) {
				model.favouriteList.splice(favouriteIndex, 1); // remove from array
			}
			else {
				self.errorHandler('The favourites functionality seems to have suffered a meltdown.'); // error handling
			}

			self.favourites(model.favouriteList.slice()); // update observable with model data
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

		// TEST - TODO remove

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

			console.log(place);

			self.currentIcon = '';

			// loop through Yelp object categories and match to matrix of images in model
			// two loops required due to JSON structure
			// break out of both loops if match found
			for (var i = 0; i < place.categories.length; i++) { 
				for (var ref in model.iconLibrary) {
					if (place.categories[i][1] === ref) {
						self.currentIcon = model.iconLibrary[ref];
						break;
					}
				}
				if (self.currentIcon !== '') {
					break;
				}

			}

			// if match not found, set to default symbol
			if (self.currentIcon === '') { 
				self.currentIcon = model.defaultIcon;
			}

			// get location from Yelp object
			self.placeLoc = new google.maps.LatLng(place.location.coordinate.latitude, place.location.coordinate.longitude); 

			// create actual marker
			self.marker = new google.maps.Marker({
				map: mapClosure, 
				position: self.placeLoc,
				animation: google.maps.Animation.DROP, // TODO - replace with BOUNCE with timeout due to issues with animation
				icon: self.currentIcon // custom variable marker as defined above
			});

			// pre-set content of infoWindow
			self.infoWindowTemplate = '<div class="info-content" id="info-window" data-bind="template: { name: \'infoWindow-template\', data: infoWindowContent }"></div>';

			// listen for clicks: bring content as Google Maps infoWindow
			google.maps.event.addListener(self.marker, 'click', function() {
				self.setContent(self.infoWindowTemplate, place, this);
			});

			// populate array of current markers
			self.forModel = {};
			self.forModel[place.name] = self.marker; 
			model.markers.push(self.forModel);
			console.log(model.markers); // TODO - remove


			self.setContent = function(content, place, context) {

				// set infoWindow content in viewModel bindings
				appViewModelContainer.infoWindowContent.name = place.name;
				appViewModelContainer.infoWindowContent.copy = place.snippet_text;
				appViewModelContainer.infoWindowContent.url = place.url;
				appViewModelContainer.infoWindowContent.photo = place.image_url;
				appViewModelContainer.infoWindowContent.rating = place.rating_img_url_large;
				appViewModelContainer.infoWindowContent.mapLink = 'http://maps.google.com/?q=' + place.name + ',Edinburgh';
				appViewModelContainer.infoWindowContent.address = place.location.address;
				
				// set infoWindow content - includes binding to trigger template
				mapView.infoWindow.setContent(content);

				// show actual infoWindow
				mapView.infoWindow.open(mapClosure, context); // TODO - better loading animation, take out flickers

				// apply bindings
				ko.applyBindings(appViewModelContainer, document.getElementById('info-window'));
			};
		},


		// clear all markers TODO - build in functionality to leave favourites alone (differnt colour?)
		clearMarkers: function() {
			for (var i = 0; i < model.markers.length; i++) { // loop through markers in model data
				console.log(model.markers[i]);
				var currentMarker = model.markers[i][Object.keys(model.markers[i])[0]];
				currentMarker.setMap(null); // set so do not display on map
			}

			model.markers = [];
		}

	};

	// all Yelp API calls
	// as a design principle data is NOT processed/parsed but instead raw JSON return passed to other functions

	var yelpView = {

		// credit for API call: Udacity forums - https://discussions.udacity.com/t/how-to-make-ajax-request-to-yelp-api/13699/18

		// this is not a secure implementation as keys are visible to all
		// TODO - hide using server side code

		yelpAPI: {
			yelp_url: 'http://api.yelp.com/v2/search',
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

		// function needs to be called using callback to 'do something' with the result
		// this avoids issues due to async AJAX request
		searchName: function(name, callback) {

			var nameParameters = {
				term : name, // search for name passed to searchName
				limit: 1,
				oauth_timestamp: Math.floor(Date.now()/1000) // generated with each request to avoid timeout issues (300 second limit)
			};

			$.extend(nameParameters, this.commonParameters);


			nameParameters.oauth_nonce = this.nonce_generate(); // must be before signature generated otherwise will return 400 error

			var encodedSignature = oauthSignature.generate('GET', this.yelpAPI.yelp_url, nameParameters, this.yelpAPI.YELP_KEY_SECRET, this.yelpAPI.YELP_TOKEN_SECRET);
			nameParameters.oauth_signature = encodedSignature;

			var ajaxParameters = {
				url: yelpView.yelpAPI.yelp_url,
				data: nameParameters,
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

		searchType: function(type, callback) {

			var typeParameters = {
				term : type, // search for type passed to searchType
				limit: 10,
				oauth_timestamp: Math.floor(Date.now()/1000) // generated with each request to avoid timeout issues (300 second limit)
			};

			$.extend(typeParameters, this.commonParameters);

			typeParameters.oauth_nonce = this.nonce_generate(); // must be before signature generated otherwise will return 400 error

			var encodedSignature = oauthSignature.generate('GET', this.yelpAPI.yelp_url, typeParameters, this.yelpAPI.YELP_KEY_SECRET, this.yelpAPI.YELP_TOKEN_SECRET);
			typeParameters.oauth_signature = encodedSignature;

			var ajaxParameters = {
				url: yelpView.yelpAPI.yelp_url,
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

				console.log('Favourites clicked');

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