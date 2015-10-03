
LCBO_API_LOCAL_BEER       = "http://lcboapi.com/products?q=beer&store_id=511&callback=JSON_CALLBACK";
LCBO_API_LOCAL_INVENTORY  = "http://lcboapi.com/inventories?store_id=511&callback=JSON_CALLBACK";
LCBO_API_PRODUCTS         = "http://lcboapi.com/products/";


var app = angular.module('beerChooser', ["firebase"]);

app.controller('BeerListCtrl', function($scope, $http, $q, $firebaseArray) {
  var ref = new Firebase("https://glowing-heat-4629.firebaseio.com/"),
      local_beer_ids = [];

  $scope.past_beers = $firebaseArray(ref);

  $q.all([
      getLocalBeerIdsAsync(),
      $scope.past_beers.$loaded()
    ])
    .then(function(resolve){
      local_beer_ids = resolve[0];
      var random_index = 0,
          random_index_next = 0;

      while (random_index == random_index_next) {
        random_index = Math.floor(Math.random()*local_beer_ids.length);
        random_index_next = Math.floor(Math.random()*local_beer_ids.length);
      }

      return $q.all([
          getProductAsync(local_beer_ids[random_index]),
          getProductAsync(local_beer_ids[random_index_next])
        ]);
    })
    .then(function (beers) {
      $scope.curr_beer = beers[0];
      $scope.next_beer = beers[1];
    });

  $scope.acceptBeer = function() {
    $scope.past_beers.$add($scope.curr_beer)
      .then(function () {
        console.log("past_beers acceptBeer added", $scope.past_beers);
        $scope.showAnotherBeer();
      });
  };

  $scope.showAnotherBeer = function() {
    $scope.curr_beer = $scope.next_beer;

    getNewRandomLocalBeerAsync()
      .then(function (beer) {
        console.log(beer);
        $scope.next_beer = beer;
      });
  };

  function getProductAsync(id) {
    return $q(function(resolve, reject) {
      $http.jsonp(LCBO_API_PRODUCTS+id+"?callback=JSON_CALLBACK")
        .then(function (responce) {
          console.log(responce);
          var product = responce.data.result;
          if (product.image_url === null) {
            product.image_url = "img/no_image_bottle.png";
            product.image_thumb_url = "img/no_image_bottle.png";
          }
          // Cache product images
          var image = new Image();
          image.src = product.image_url;
          image.src = product.image_thumb_url;
          resolve(product);
        });
    });
  }

  function getNewRandomLocalBeerAsync() {
    var past_beer_ids = $scope.past_beers.map(function (beer) {return beer.id;}),
        new_beer_ids = _.difference(local_beer_ids, past_beer_ids),
        random_index = Math.floor(Math.random()*new_beer_ids.length);

    return getProductAsync(new_beer_ids[random_index]);
  }

  function getLocalBeerIdsAsync() {
    return $q(function(resolve, reject){
      $q.all([
          getAllPagesAsync(LCBO_API_LOCAL_BEER),
          getAllPagesAsync(LCBO_API_LOCAL_INVENTORY)
        ])
      .then(function(res){
        var beer_ids = [],
            inventory_ids = [],
            beers_associated_with_store = res[0],
            store_inventory_products = res[1];

        beers_associated_with_store.filter(function(beer){
          return beer.primary_category == "Beer";
        });

        beer_ids = beers_associated_with_store.map(function(beer){
          return beer.id;
        });

        inventory_ids = store_inventory_products.map(function(product){
          return product.product_id;
        });

        resolve(_.difference(beer_ids, inventory_ids));
      });
    });
  }

  function getAllPagesAsync(url) {
    return $q(function(resolve, reject){
      $http.jsonp(url+"&per_page=5").success(function(response){
        var total_pages = Math.ceil(response.pager.total_record_count/100),
          pages_load = [];

        for (var i = 1; i <= total_pages; i++) {
          pages_load.push($http.jsonp(url+"&per_page=100&page="+i));
        }

        $q.all(pages_load).then(function(resps){
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
