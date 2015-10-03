

LCBO_AUTH_TOKEN = "MDowZDYyMzdkYy02NzMzLTExZTUtOTViZi1hZjQzOTI5ZDFkYjM6MENZa" /
                  "0FUSW54WmJya2JFcDl5OTdFcmZRcVVUTWFaQTlmUDlp";

LCBO_API_LOCAL_BEER = "http://lcboapi.com/products?q=beer&store_id=511&access_key=" + LCBO_AUTH_TOKEN;

LCBO_API_LOCAL_INVENTORY = "http://lcboapi.com/inventories?store_id=511&access_key=" + LCBO_AUTH_TOKEN;

LCBO_API_PRODUCTS = "http://lcboapi.com/products/";


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
      console.log("past_beers init", $scope.past_beers);
      local_beer_ids = resolve[0];
      console.log(local_beer_ids);
      var random_index = Math.round(Math.random()*local_beer_ids.length);
      return $http.jsonp(LCBO_API_PRODUCTS+local_beer_ids[random_index]+"?callback=JSON_CALLBACK");
    })
    .then(function(responce){
      console.log(responce);
      $scope.curr_beer = responce.data.result;
      console.log($scope.curr_beer.image_url);
      if ($scope.curr_beer.image_url === null) {
        $scope.curr_beer.image_url = "img/no_image_bottle.png";
        $scope.curr_beer.image_thumb_url = "img/no_image_bottle.png";
      }
      var random_index = Math.round(Math.random()*local_beer_ids.length);
      return $http.jsonp(LCBO_API_PRODUCTS+local_beer_ids[random_index]+"?callback=JSON_CALLBACK");
    })
    .then(function(responce){
      console.log(responce);
      $scope.next_beer = responce.data.result;
      // Cache next beer images
      var image = new Image();
      image.src = $scope.next_beer.image_url;
      image.src = $scope.next_beer.image_thumb_url;
    });

  $scope.acceptBeer = function() {
    console.log("past_beers acceptBeer", $scope.past_beers);
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
        if (beer.image_url === null) {
          beer.image_url = "img/no_image_bottle.png";
          beer.image_thumb_url = "img/no_image_bottle.png";
        }
        $scope.next_beer = beer;
        // Cache next beer images
        var image = new Image();
        image.src = beer.image_url;
        image.src = beer.image_thumb_url;
      });
  };

  function getNewRandomLocalBeerAsync() {
    return $q(function(resolve, reject){
      var past_beer_ids = $scope.past_beers.map(function (beer) {return beer.id;}),
          new_beer_ids = _.difference(local_beer_ids, past_beer_ids),
          random_index = Math.round(Math.random()*new_beer_ids.length);

      $http.jsonp(LCBO_API_PRODUCTS+new_beer_ids[random_index]+"?callback=JSON_CALLBACK")
        .then(function (responce) {
          resolve(responce.data.result);
        });
    });
  }

  function getLocalBeerIdsAsync() {
    return $q(function(resolve, reject){
      $q.all([
          getAllPagesAsync(LCBO_API_LOCAL_BEER),
          getAllPagesAsync(LCBO_API_LOCAL_INVENTORY)
        ])
      .then(function(res){
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
      $http.jsonp(url+"&per_page=5&callback=JSON_CALLBACK").success(function(response){
        console.log(response);

        var total_pages = Math.ceil(response.pager.total_record_count/100),
          promices = [];

        for (var i = 1; i <= total_pages; i++) {
          promices.push($http.jsonp(url+"&per_page=100&page="+i+"&callback=JSON_CALLBACK"));
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
