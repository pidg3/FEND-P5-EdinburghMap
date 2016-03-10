<?php
ini_set('display_errors', 1);
require_once('TwitterAPIExchange.php');

/**
Contains tokens/keys/secrets in following format:
$settings = array(
    'oauth_access_token' => '',
    'oauth_access_token_secret' => '',
    'consumer_key' => '',
    'consumer_secret' => ''
);
Separated so can be isolated from GitHub upload for security reasons
*/
require_once('twitter-keys.php');

/** Perform a GET request and echo the response **/
/** Note: Set the GET field BEFORE calling buildOauth(); **/

$number = $_POST['number'];

$url = 'https://api.twitter.com/1.1/search/tweets.json';
$getfield = '?geocode=55.944201,-3.197536,1mi&count='.$number;
$requestMethod = 'GET';
$twitter = new TwitterAPIExchange($settings);
echo $twitter->setGetfield($getfield)
             ->buildOauth($url, $requestMethod)
             ->performRequest();
?>