var app = angular.module('flapperNews', ['ui.router']);

app.config([
	'$stateProvider',
	'$urlRouterProvider',
	function ($stateProvider, $urlRouterProvider) {
		$stateProvider
			.state('home', {
				url: '/home',
				templateUrl: '/home.html',
				controller: 'MainCtrl',
				resolve: {
					postPromise: ['posts',
						function (posts) {
							return posts.getAll();
						}
					]
				}
			})
			.state('login', {
				url: '/login',
				templateUrl: '/login.html',
				controller: 'AuthCtrl',
				onEnter: ['$state', 'auth',
					function ($state, auth) {
						if (auth.isLoggedIn()) {
							$state.go('home');
						}
					}
				]
			})
			.state('posts', {
				url: '/posts/{id}',
				templateUrl: '/posts.html',
				controller: 'PostsCtrl',
				resolve: {
					post: ['$state', '$stateParams', 'posts',
					function ($state, $stateParams, posts) {
						if ($stateParams.id) {
							return posts.get($stateParams.id);
						} else {
							$state.go('home', {
								location: 'replace',
								inherit: false,
								notify: true,
								reload: true
							});
						}
					}
					]
				}
			})
			.state('register', {
				url: '/register',
				templateUrl: '/register.html',
				controller: 'AuthCtrl',
				onEnter: ['$state', 'auth',
					function ($state, auth) {
						if (auth.isLoggedIn()) {
							$state.go('home');
						}
					}
				]
			});

		$urlRouterProvider.otherwise('home');
	}
]);

app.factory('posts', [
	'$http',
	'auth',
	function ($http, auth) {
		var o = {
			posts: []
		};

		o.addComment = function (id, comment) {
			return $http.post('/posts/' + id + '/comments', comment, {
				headers: {
					Authorization: 'Bearer ' + auth.getToken()
				}
			});
		};

		o.create = function (post) {
			return $http.post('/posts', post, {
				headers: {
					Authorization: 'Bearer ' + auth.getToken()
				}
			})
			.success(function (data) {
				o.posts.push(data);
			});
		};

		// delete single post
		o.delete = function (post) {
			return $http.delete('/posts/' + post._id, {
				headers: {
					Authorization: 'Bearer ' + auth.getToken()
				}
			})
			.success(function (data) {
				if (data.length) {
					angular.copy(data, o.posts);
				}
			});
		};

		o.downvote = function (post) {
			return $http.put('/posts/' + post._id + '/downvote', null, {
				headers: {
					Authorization: 'Bearer ' + auth.getToken()
				}
			})
			.success(function (data) {
				post.upvotes = data.upvotes;
				post.downvotes = data.downvotes;
			});
		};

		o.upvote = function (post) {
			return $http.put('/posts/' + post._id + '/upvote', null, {
				headers: {
					Authorization: 'Bearer ' + auth.getToken()
				}
			})
			.success(function (data) {
				post.upvotes = data.upvotes;
				post.downvotes = data.downvotes;
			});
		};

		o.get = function (id) {
			return $http.get('/posts/' + id)
				.then(function(res){
					return res.data;
				});
		};

		o.getAll = function () {
			return $http.get('/posts')
				.success(function (data) {
					angular.copy(data, o.posts);
				});
		};

		o.downvoteComment = function (post, comment) {
			return $http.put('/posts/' + post._id + '/comments/' + comment._id + '/downvote', null, {
				headers: {
					Authorization: 'Bearer ' + auth.getToken()
				}
			})
			.success(function (data) {
				comment.upvotes = data.upvotes;
				comment.downvotes = data.downvotes;
			});
		};

		o.upvoteComment = function (post, comment) {
			return $http.put('/posts/' + post._id + '/comments/' + comment._id + '/upvote', null, {
				headers: {
					Authorization: 'Bearer ' + auth.getToken()
				}
			})
			.success(function (data) {
				comment.upvotes = data.upvotes;
				comment.downvotes = data.downvotes;
			});
		};

		return o;
	}
]);

app.factory('auth', [
	'$http',
	'$window',
	function ($http, $window) {
		var auth = {};

		auth.currentUser = function () {
			if (auth.isLoggedIn()) {
				var token = auth.getToken();
				var payload = JSON.parse($window.atob(token.split('.')[1]));

				return payload.username;
			}
		};

		auth.currentUserId = function () {
			if (auth.isLoggedIn()) {
				var token = auth.getToken();
				var payload = JSON.parse($window.atob(token.split('.')[1]));

				return payload._id;
			}
		};

		auth.getToken = function () {
			return $window.localStorage['flapper-news-token'];
		};

		auth.isCurrentUser = function (user) {
			var token = auth.getToken();

			if (token) {
				var payload = JSON.parse($window.atob(token.split('.')[1]));

				return (auth.currentUserId() === payload._id);
			} else {
				return false;
			}
		};

		auth.isLoggedIn = function () {
			var token = auth.getToken();

			if (token) {
				var payload = JSON.parse($window.atob(token.split('.')[1]));

				return payload.exp > Date.now() / 1000;
			} else {
				return false;
			}
		};

		auth.logIn = function (user) {
			return $http.post('/login', user).success(function (data) {
				auth.saveToken(data.token);
			});
		};

		auth.logOut = function () {
			$window.localStorage.removeItem('flapper-news-token');
		};

		auth.register = function (user) {
			return $http.post('/register', user).success(function (data) {
				auth.saveToken(data.token);
			});
		};

		auth.saveToken = function (token) {
			$window.localStorage['flapper-news-token'] = token;
		};

		return auth;
	}
]);

app.controller('MainCtrl', [
	'$scope',
	'posts',
	'auth',
	function ($scope, posts, auth) {
		$scope.isLoggedIn = auth.isLoggedIn;
		$scope.posts = posts.posts;

		$scope.addPost = function () {
			if (!$scope.title || $scope.title === '')  {
				return;
			}

			posts.create({
				title: $scope.title,
				link: $scope.link
			});

			$scope.title = '';
			$scope.link = '';
		};

		$scope.isCurrentUser = function (post) {
			if (post && post.author_id) {
				return (post.author_id === auth.currentUserId());
			}

			return false;
		};

		$scope.deletePost = function (post) {
			posts.delete(post);
		};

		$scope.incrementDownvotes = function (post) {
			posts.downvote(post);
		};

		$scope.incrementUpvotes = function (post) {
			posts.upvote(post);
		};
	}
]);

app.controller('AuthCtrl', [
	'$scope',
	'$state',
	'auth',
	function ($scope, $state, auth) {
		$scope.user = {};

		$scope.register = function () {
			auth.register($scope.user)
				.error(function (error) {
					$scope.error = error;
				})
				.then(function () {
					$state.go('home');
				});
		};

		$scope.logIn = function () {
			auth.logIn($scope.user)
				.error(function (error) {
					$scope.error = error;
				})
				.then(function () {
					$state.go('home');
				});
		};
	}
]);

app.controller('NavCtrl', [
	'$scope',
	'auth',
	function ($scope, auth) {
		$scope.currentUser = auth.currentUser;
		$scope.isLoggedIn = auth.isLoggedIn;
		$scope.logOut = auth.logOut;
	}
]);

app.controller('PostsCtrl', [
	'$state',
	'$scope',
	'posts',
	'post',
	'auth',
	function ($state, $scope, posts, post, auth) {
		$scope.isLoggedIn = auth.isLoggedIn;
		$scope.post = post;

		$scope.addComment = function () {
			if ($scope.body === '') {
				return;
			}

			posts.addComment(post._id, {
				body: $scope.body,
				author: auth.currentUser
			}).success(function (comment) {
				$scope.post.comments.push(comment);
			});

			$scope.body = '';
		};


		$scope.deletePost = function (post) {
			posts.delete(post);
		};

		$scope.incrementPostDownvotes = function (post) {
			posts.downvote(post);
		};

		$scope.incrementPostUpvotes = function (post) {
			posts.upvote(post);
		};

		$scope.incrementCommentDownvotes = function (comment) {
			posts.downvoteComment(post, comment);
		};

		$scope.incrementCommentUpvotes = function (comment) {
			posts.upvoteComment(post, comment);
		};
	}
]);

app.controller('VoteCtrl', [
	'$scope',
	'posts',
	'auth',
	function ($scope, auth) {
		$scope.isLoggedIn = auth.isLoggedIn;
		$scope.currentUser = auth.currentUser;
		$scope.logOut = auth.logOut;
	}
]);
