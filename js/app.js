
LCBO_API_LOCAL_BEER       = "http://lcboapi.com/products?q=beer&store_id=511&callback=JSON_CALLBACK";
LCBO_API_LOCAL_INVENTORY  = "http://lcboapi.com/inventories?store_id=511&callback=JSON_CALLBACK";
LCBO_API_PRODUCTS         = "http://lcboapi.com/products/";
FIREBASE_URL              = "https://glowing-heat-4629.firebaseio.com/";

NUM_BEERS_TO_PRELOAD      = 10;

var app = angular.module('beerChooser', ["firebase", 'ui.bootstrap'])

.filter('reverse', function() {
   function toArray(list) {
    var k, out = [];
    if( list ) {
      if( angular.isArray(list) ) {
        out = list;
      }
      else if( typeof(list) === 'object' ) {
        for (k in list) {
          if (angular.isObject(list[k])) { out.push(list[k]); }
        }
      }
    }
    return out;
  }
  return function(items) {
    return toArray(items).slice().reverse();
  };
})

.factory('TogglePref',function($firebaseObject) {
    return function(path) {
        var obj = $firebaseObject(new Firebase(FIREBASE_URL + "/toggle_pref"));
        obj.$loaded(function() {
            if( obj.$value === null ) {
                angular.extend(obj, {show: false});
                obj.$save();
            }
        });
        return obj;
    };
})

.controller('BeerListCtrl', function($scope, $http, $q, $firebaseObject, $firebaseArray, TogglePref) {
  var firebase_ref = new Firebase(FIREBASE_URL);

  $scope.new_beer_ids = [];
  $scope.past_beers = $firebaseArray(firebase_ref.child("past_beers"));
  $scope.next_beers_cache = [];
  $scope.isLoading = true;
  $scope.num_beers_to_try = 0;

  TogglePref().$bindTo($scope, "toggle_pref");

  $q.all([
      getLocalBeerIdsAsync(),
      $scope.past_beers.$loaded()
    ])
    .then(function(resolve){
      var past_beer_ids = $scope.past_beers.map(function (beer) {return beer.id;});

      $scope.new_beer_ids = _.difference(resolve[0], past_beer_ids);

      if ($scope.new_beer_ids.length < 1) {
        $scope.isLoading = false;
        return;
      }

      $scope.new_beer_ids.shuffle();
      $scope.num_beers_to_try = $scope.new_beer_ids.length;

      getProductAsync($scope.new_beer_ids.shift())
        .then(function(beer){
          $scope.next_beers_cache[0] = beer;
          $scope.isLoading = false;
        });

      var next_beers_promices = [];

      for (var i=0; i<NUM_BEERS_TO_PRELOAD-1 && $scope.new_beer_ids[0]; i++) {
        next_beers_promices.push(getProductAsync($scope.new_beer_ids.shift()));
      }

      $q.all(next_beers_promices)
        .then(function (beers) {
          $scope.next_beers_cache = $scope.next_beers_cache.concat(beers);
        });
    });

  $scope.acceptBeer = function() {
    $scope.num_beers_to_try--;
    $scope.past_beers.$add($scope.next_beers_cache.shift())
      .then(function() {
        if ($scope.new_beer_ids.length <= 0) {
          return $q.reject();
        }
        return getProductAsync($scope.new_beer_ids.shift());
      })
      .then(function(beer) {
         $scope.next_beers_cache.push(beer);
      });
  };

  $scope.showAnotherBeer = function() {
    if ($scope.new_beer_ids.length > 0) {
      getProductAsync($scope.new_beer_ids.shift())
        .then(function (beer) {
          $scope.next_beers_cache.push(beer);
        });

      $scope.new_beer_ids.push($scope.next_beers_cache.shift().id);
      $scope.new_beer_ids.shuffle();
    }
    else {
      var prev_beer = $scope.next_beers_cache[0];
      while (prev_beer === $scope.next_beers_cache[0]) {
        $scope.next_beers_cache.shuffle();
      }
    }
  };

  $scope.startOver = function() {

    var past_beers_tmp = $scope.past_beers;
    past_beers_tmp.shuffle();
    firebase_ref.child("past_beers").remove();

    for (var i=0; i<NUM_BEERS_TO_PRELOAD && past_beers_tmp[0]; i++) {
      $scope.next_beers_cache.push(past_beers_tmp.shift());
    }

    for (i=0; i<past_beers_tmp.length; i++) {
      $scope.new_beer_ids.push(past_beers_tmp[i].id);
    }

    $scope.num_beers_to_try = $scope.new_beer_ids.length + $scope.next_beers_cache.length;
  };

  $scope.toggleInfo = function() {
    $scope.toggle_pref.show = !$scope.toggle_pref.show;
  };

  function getProductAsync(id, cache) {
    return $q(function(resolve, reject) {
      $http.jsonp(LCBO_API_PRODUCTS+id+"?callback=JSON_CALLBACK")
        .then(function (responce) {
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

Array.prototype.shuffle = function() {
    var counter = this.length, temp, index;

    while (counter > 0) {
        index = Math.floor(Math.random() * counter);

        counter--;

        temp = this[counter];
        this[counter] = this[index];
        this[index] = temp;
    }

    return this;
};
