// Maps API key: AIzaSyCKaSn7cGU9ER9KVO63fCTQFOPUnOg1q9U

/*eslint-disable no-console */ // TODO - remove for Prod
/* exported mapApp */ // called by maps API callback in index.html

// container for whole app - single global variable
// called by Google Maps script in index.html
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

		defaultIcon: '../images/other.png',

		favouriteList: []

	};	

	// delared as function as per KnockoutJS documentation
	function appViewModel() { 
		var self = this; 

		self.displayList = ko.observableArray(); // results shown in menu

		// search entered: carries out search using Yelp API and returns results in menu list
		self.mainSearch = function(type) {
			yelpView.searchType(type, function(result) { // callback function - executes when Yelp datar returned
				self.displayList([]); // reset list before re-populate
				for (var i = 0; i < result.businesses.length; i++) { // iterate through list and populate displayList()
					self.displayList.push(result.businesses[i].name);
				}

			});
		};

		// holds search query for entry into searchBox() function below
		self.searchQuery = ko.observable(); 

		// set by search query, only used for display via binding, allows reset of search box text between queries
		self.currentSearch = ko.observable(); 

		// triggered by search bar entry
		self.searchBox = function() {
			self.currentSearch(self.searchQuery()); // sets currentSearch to whatever is entered - used to display name of search
			self.searchQuery(''); // resets text to blank
			self.mainSearch(self.currentSearch()); // carried out actual search
		};

		// displays marker for specific business when name clicked
		self.placeClick = function(name) {
			yelpView.searchName(name, function(result) {
				mapView.createMarker(result.businesses[0]);
			});
		};

		// favourite places implementation

		self.favourites = ko.observableArray();

		self.favouriteClick = function(name) {
			var removeIndex = self.favourites().indexOf(name);

			if (removeIndex === -1) {
				self.favourites().push(name);
			}
			else if (removeIndex >= 0) {
				self.favourites().splice(removeIndex, 1);
			}
			else {
				alert('Issue with favourites functionality');
			}

			self.favourites(model.favouriteList);

			console.log(self.favourites());

		};

	}

	ko.applyBindings(new appViewModel()); // triggers KO bindings

	// for all Google Maps API functionality
	var mapView = {

		edinburgh: new google.maps.LatLng(55.944201, -3.197536), // hard Coded to Edinburgh


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

			console.log(place);

			var currentIcon = '';

			// loop through Yelp object categories and match to matrix of images in model
			// two loops required due to JSON structure
			// break out of both loops if match found
			for (var i = 0; i < place.categories.length; i++) { 
				for (var ref in model.iconLibrary) {
					if (place.categories[i][1] === ref) {
						currentIcon = model.iconLibrary[ref];
						break;
					}
				}
				if (currentIcon !== '') {
					break;
				}

			}

			// if match not found, set to default symbol
			if (currentIcon === '') { 
				currentIcon = model.defaultIcon;
			}

			// get location from Yelp object
			var placeLoc = new google.maps.LatLng(place.location.coordinate.latitude, place.location.coordinate.longitude); 

			// create actual marker
			var marker = new google.maps.Marker({
				map: mapClosure, 
				position: placeLoc,
				animation: google.maps.Animation.DROP, // TODO - replace with BOUNCE with timeout due to issues with animation
				icon: currentIcon // custom variable marker as defined above
			});

			// pre-set content of infoWindow
			var infoWindowContent = 
			'<div class="info-content"><h4>' + place.name + '</h4><br>' +
			'<p>' + place.snippet_text + '...<a href="' + place.url + '" target="_blank">Read more</a></p>' +
			'<img class="info-photo" src="' + place.image_url + '" alt="Place Image"></img>' +
			'<img class="info-rating" src="' + place.rating_img_url_large + '"></img>' +
			'<p class="info-address"><a href="http://maps.google.com/?q=' + place.name + ',Edinburgh' + '" target="_blank">' + place.location.address + '</a></p>' +
			'<img class="info-yelp" src="../images/yelp_powered_btn_dark.png" ></img>' +
			'</div>';

			// listen for clicks: bring content as Google Maps infoWindow
			google.maps.event.addListener(marker, 'click', function() { 
				mapView.infoWindow.setContent(infoWindowContent);
				mapView.infoWindow.open(mapClosure, this); // show actual infoWindow
			});
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
			oauth_timestamp: Math.floor(Date.now()/1000),
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
				limit: 1
			};

			$.extend(nameParameters, this.commonParameters);


			nameParameters.oauth_nonce = this.nonce_generate(); // must be before signature generated otherwise will return 400 error

			var encodedSignature = oauthSignature.generate('GET', this.yelpAPI.yelp_url, nameParameters, this.yelpAPI.YELP_KEY_SECRET, this.yelpAPI.YELP_TOKEN_SECRET);
			nameParameters.oauth_signature = encodedSignature;

			var ajaxParameters = {
				url: yelpView.yelpAPI.yelp_url,
				data: nameParameters,
				cache: true,                // This is crucial to include as well to prevent jQuery from adding on a cache-buster parameter '_=23489489749837', invalidating our oauth-signature
				dataType: 'jsonp',
				success: callback,				
				fail: function() {
					alert('AJAX request failed.'); // TODO better error handling
				}
			};

			// Send AJAX query via jQuery library.
			$.ajax(ajaxParameters); // return to be parsed by other function - API call only here

		},

		searchType: function(type, callback) {

			var typeParameters = {
				term : type, // search for type passed to searchType
				limit: 10
			};

			$.extend(typeParameters, this.commonParameters);

			typeParameters.oauth_nonce = this.nonce_generate(); // must be before signature generated otherwise will return 400 error

			var encodedSignature = oauthSignature.generate('GET', this.yelpAPI.yelp_url, typeParameters, this.yelpAPI.YELP_KEY_SECRET, this.yelpAPI.YELP_TOKEN_SECRET);
			typeParameters.oauth_signature = encodedSignature;

			var ajaxParameters = {
				url: yelpView.yelpAPI.yelp_url,
				data: typeParameters,
				cache: true,                // This is crucial to include as well to prevent jQuery from adding on a cache-buster parameter '_=23489489749837', invalidating our oauth-signature
				dataType: 'jsonp',
				success: callback,				
				fail: function() {
					alert('AJAX request failed.'); // TODO better error handling
				}
			};

			// Send AJAX query via jQuery library.
			$.ajax(ajaxParameters); // return to be parsed by other function - API call only here

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

		// listens for searches
		// if menu not open - open it
		// if menu open - pulse animation
		searchListener: function() {
			$('#search-box').submit(function() {

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
	interfaceView.searchListener();

}