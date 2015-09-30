
LCBO_AUTH_TOKEN = "MDowZDYyMzdkYy02NzMzLTExZTUtOTViZi1hZjQzOTI5ZDFkYjM6MENZa0FUSW54WmJya2JFcDl5OTdFcmZRcVVUTWFaQTlmUDlp";

var app = angular.module('beerChooser', []);

app.controller('BeerListCtrl', function($scope, $http) {
	$http.get("http://lcboapi.com/products?q=beer&store_id=511&access_key="+LCBO_AUTH_TOKEN)
	 .success(function(response){
		$scope.beers = response.result;
		console.log(response);
	});
});
