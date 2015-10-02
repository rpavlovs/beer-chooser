

LCBO_AUTH_TOKEN = "MDowZDYyMzdkYy02NzMzLTExZTUtOTViZi1hZjQzOTI5ZDFkYjM6MENZa" /
					"0FUSW54WmJya2JFcDl5OTdFcmZRcVVUTWFaQTlmUDlp";

LCBO_API_LOCAL_BEER = "http://lcboapi.com/products?q=beer&store_id=511&access_key="+LCBO_AUTH_TOKEN;

LCBO_API_LOCAL_INVENTORY = "http://lcboapi.com/inventories?store_id=511&access_key="+LCBO_AUTH_TOKEN;


var app = angular.module('beerChooser', []);

app.controller('BeerListCtrl', function($scope, $http, $q) {

	$q.all([
		getAllPagesAsync(LCBO_API_LOCAL_BEER),
		getAllPagesAsync(LCBO_API_LOCAL_INVENTORY)
	 ]).then(function(res){

	 	var beer_ids = [],
			inventory_ids = [];

	 	$scope.beers = res[0];

	 	_.each(res[0], function(beer){
	 		if(beer.primary_category == "Beer"){
	 			beer_ids.push(beer.id);
	 		}
	 	});
	 	console.log("Beer_ids: ", beer_ids.sort());

	 	_.each(res[1], function(product){
	 		inventory_ids.push(product.product_id);
	 	});
	 	console.log("inventory_ids: ", inventory_ids.sort());


	 	var beers_in_store = _.intersection(beer_ids, inventory_ids),
	 		beers_not_in_store = _.difference(beer_ids, inventory_ids);
	 	console.log("In store: ", beers_in_store);
	 	console.log("Not in store: ", beers_not_in_store);
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
