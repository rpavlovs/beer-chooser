

LCBO_AUTH_TOKEN = "MDowZDYyMzdkYy02NzMzLTExZTUtOTViZi1hZjQzOTI5ZDFkYjM6MENZa" /
					"0FUSW54WmJya2JFcDl5OTdFcmZRcVVUTWFaQTlmUDlp";

LCBO_API_LOCAL_BEER = "http://lcboapi.com/products?q=beer&store_id=511&access_key="+LCBO_AUTH_TOKEN;

LCBO_API_CALL = "http://lcboapi.com/inventories?store_id=511&access_key="+LCBO_AUTH_TOKEN;


var app = angular.module('beerChooser', []);

app.controller('BeerListCtrl', function($scope, $http, $q) {

	 getAllPagesAsync(LCBO_API_LOCAL_BEER).then(function(beers){
	 	$scope.beers = beers;
	 	console.log(beers);
	 });

	 getAllPagesAsync(LCBO_API_CALL).then(function(res){
	 	var prod_ids = [];
	 	_.each(res, function(product){
	 		prod_ids.push(product.product_id);
	 	});
	 	console.log(res);
	 	console.log(prod_ids);
	 });

	function getAllPagesAsync(url) {
		return $q(function(resolve, reject){
			$http.get(url+"&per_page=5").success(function(response){
		 	 	console.log(response);

		 	 	var total_pages = Math.ceil(response.pager.total_record_count/100),
		 	 		promices = [];

		 	 	for (var i = 1; i <= total_pages; i++) {
		 	 		promices.push($http.get(url+"&per_page=100&page="+i));
		 	 	}

		 	 	$q.all(promices).then(function(resps){
		 	 		beers = [];
		 	 		_.each(resps, function(resp){
		 	 			beers = _.union(beers,resp.data.result);
		 	 		});
		 	 		resolve(beers);
		 	 	});
			});
		});
	}
});
