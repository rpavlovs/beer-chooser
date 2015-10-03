

LCBO_AUTH_TOKEN = "MDowZDYyMzdkYy02NzMzLTExZTUtOTViZi1hZjQzOTI5ZDFkYjM6MENZa" /
                  "0FUSW54WmJya2JFcDl5OTdFcmZRcVVUTWFaQTlmUDlp";

LCBO_API_LOCAL_BEER = "http://lcboapi.com/products?q=beer&store_id=511&access_key=" + LCBO_AUTH_TOKEN;

LCBO_API_LOCAL_INVENTORY = "http://lcboapi.com/inventories?store_id=511&access_key=" + LCBO_AUTH_TOKEN;

LCBO_API_PRODUCTS = "http://lcboapi.com/products/";


var app = angular.module('beerChooser', []);

app.controller('BeerListCtrl', function($scope, $http, $q) {

  var local_beer_ids = [];

  getLocalBeerIdsAsync()
    .then(function(beerIds){
      local_beer_ids = beerIds;
      var random_index = Math.round(Math.random()*local_beer_ids.length);
      return $http.get(LCBO_API_PRODUCTS+local_beer_ids[random_index]);
    })
    .then(function(resp){
      console.log(resp);
      $scope.next_beer = resp.data.result;
      var random_index = Math.round(Math.random()*local_beer_ids.length);
      return $http.get(LCBO_API_PRODUCTS+local_beer_ids[random_index]);
    })
    .then(function(resp){
      console.log(resp);
      $scope.next_next_beer = resp.data.result;
    });

  $scope.showAnotherBeer = function() {
    $scope.next_beer = $scope.next_next_beer;
    var random_index = Math.round(Math.random()*local_beer_ids.length);
    $http.get(LCBO_API_PRODUCTS+local_beer_ids[random_index])
      .then(function(resp){
        console.log(resp);
        $scope.next_next_beer = resp.data.result;
        var image = new Image();
        image.src = next_next_beer.image_url;

      });
  };


  function getLocalBeerIdsAsync() {
    return $q(function(resolve, reject){
      $q.all([
        getAllPagesAsync(LCBO_API_LOCAL_BEER),
        getAllPagesAsync(LCBO_API_LOCAL_INVENTORY)
       ]).then(function(res){
        var beer_ids = [],
          inventory_ids = [];

        _.each(res[0], function(beer){
          if(beer.primary_category == "Beer"){
            beer_ids.push(beer.id);
          }
        });

        _.each(res[1], function(product){
          inventory_ids.push(product.product_id);
        });

        resolve(_.difference(beer_ids, inventory_ids));
      });
    });
  }

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
