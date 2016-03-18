<?php

/*
Yelp API v2.0
Credit: official Yelp API documentation on GitHub: https://github.com/Yelp/yelp-api/tree/master/v2/php

*/

// OAuth used to generated signatur for API call as per Yelp specifications
require_once('OAuth.php');

/**
Contains tokens/keys/secrets in following format:
$CONSUMER_KEY = '';
$CONSUMER_SECRET = '';
$TOKEN = '';
$TOKEN_SECRET = ''; 
Separated so can be isolated from GitHub upload for security reasons
*/
require_once('yelp-keys.php');


$API_HOST = 'api.yelp.com';
$DEFAULT_LOCATION = 'Edinburgh';
$SEARCH_LIMIT = 6;
$SEARCH_PATH = '/v2/search/';
$BUSINESS_PATH = '/v2/business/';

// ====== Makes a request to the Yelp API and returns the response ======

function request($host, $path) {
	$unsigned_url = "https://" . $host . $path;

	// Token object built using the OAuth library
	$token = new OAuthToken($GLOBALS['TOKEN'], $GLOBALS['TOKEN_SECRET']);

	// Consumer object built using the OAuth library
	$consumer = new OAuthConsumer($GLOBALS['CONSUMER_KEY'], $GLOBALS['CONSUMER_SECRET']);

	// Yelp uses HMAC SHA1 encoding
	$signature_method = new OAuthSignatureMethod_HMAC_SHA1();

	$oauthrequest = OAuthRequest::from_consumer_and_token(
		$consumer, 
		$token, 
		'GET', 
		$unsigned_url
	);
	
	// Sign the request
	$oauthrequest->sign_request($signature_method, $consumer, $token);
	
	// Get the signed URL
	$signed_url = $oauthrequest->to_url();
	
	// Send Yelp API Call
	try {
		$ch = curl_init($signed_url);
		if (FALSE === $ch)
			throw new Exception('Failed to initialize');
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		curl_setopt($ch, CURLOPT_HEADER, 0);
		$data = curl_exec($ch);

		if (FALSE === $data)
			throw new Exception(curl_error($ch), curl_errno($ch));
		$http_status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
		if (200 != $http_status)
			throw new Exception($data, $http_status);

		curl_close($ch);
	} catch(Exception $e) {
		trigger_error(sprintf(
			'Curl failed with error #%d: %s',
			$e->getCode(), $e->getMessage()),
			E_USER_ERROR);
	}
	
	return $data;
}

// ====== Search for list of businesses by term - return multiple objects ======

function search($term) {
	$url_params = array();
	
	$url_params['term'] = $term;
	$url_params['location'] = $GLOBALS['DEFAULT_LOCATION'];
	$url_params['limit'] = $GLOBALS['SEARCH_LIMIT'];
	$search_path = $GLOBALS['SEARCH_PATH'] . "?" . http_build_query($url_params);
	
	return request($GLOBALS['API_HOST'], $search_path);
}

// ====== Search single business by unique ID - return single object ======

function get_business($business_id) {
	$business_path = $GLOBALS['BUSINESS_PATH'] . $business_id;
	
	return request($GLOBALS['API_HOST'], $business_path);
}

// ====== Ajax request handler ======

/* Must include following in ajax request data:
	- type: get_business or search (defaults to search if not recognised)
	- businessID: for get_business type only
	- term: for search type only
*/

if ($_POST['type'] === 'get_business') {
	$business_id = $_POST['businessID'];
	echo get_business($business_id);
}

else {
	$term = $_POST['term'];
	echo search($term);
}

?>