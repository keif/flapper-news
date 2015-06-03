var express = require('express');
var mongoose = require('mongoose');
var passport = require('passport');
var jwt = require('express-jwt');

var router = express.Router();

// models
var Post = mongoose.model('Post');
var Comment = mongoose.model('Comment');
var Vote = mongoose.model('Vote');
var User = mongoose.model('User');

// token/auth
var auth = jwt({
	secret: 'SECRET',
	userProperty: 'payload'
});

// has to be a better way to do this, right?
var vote = function (req, res, next, num) {
	var post,
		payload,
		voteObj = {},
		query;

	post = req.post;
	payload = req.payload;
	voteObj = {
		user_id: mongoose.Types.ObjectId(payload._id), // user id
		post_id: (post.type === 'post') ? post._id : null,
		comment_id: (post.type === 'comment') ? post._id : null
	},
	num = parseInt(num, 10);

	query = Vote.find(voteObj).limit(1);
	query.exec(function (err, vote) {
		if (err) {
			return next(err);
		}

		if (vote.length) {
			var originalVote = vote[0].vote;

			Vote.update(voteObj, {
				vote: (vote[0].vote === num) ? 0 : num
			}, function (err, numAffected, raw) {
				if (err) {
					return next(err);
				}

				// default
				var newUpvote = 0;
				var newDownvote = 0;
				var hasUpvote = (originalVote === 1);
				var hasDownvote = (originalVote === -1);
				var upvote = (num === 1);
				var downvote = (num === -1);

				if (hasUpvote) {
					if (upvote) {
						newUpvote = -1;
						newDownvote = 0;
					} else if (downvote) {
						newUpvote = -1;
						newDownvote = 1;
					}
				} else if (hasDownvote) {
					if (upvote) {
						newUpvote = 1;
						newDownvote = -1;
					} else if (downvote) {
						newUpvote = 0;
						newDownvote = -1;
					}
				// is zero
				} else {
					newUpvote = (upvote) ? num : 0;
					newDownvote = (downvote) ? num : 0;
				}

				req.post.upvote(newUpvote, function (err, post) {
					if (err) {
						return next(err);
					}

					req.post.downvote(newDownvote, function (err, post) {
						if (err) {
							return next(err);
						}

						res.json(post);
					});
				});
			});
		} else {
			var newVote = new Vote();
			newVote.user_id = payload._id, // user id
			newVote.post_id = (post.type === 'post') ? post._id : null,
			newVote.comment_id = (post.type === 'comment') ? post._id : null,
			newVote.vote = parseInt(num, 10);

			newVote.save(function(err, vote){
				if (err) {
					return next(err);
				}

				req.post[(vote.vote === 1) ? 'upvote' : 'downvote'](vote.vote, function (err, post) {
					if (err) {
						return next(err);
					}

					res.json(post);
				});
			});
		}
	});
};

// GET home page.
router.get('/', function (req, res, next) {
	res.render('index', {
		title: 'Express'
	});
});

// preload comments object
router.param('comment', function (req, res, next, id) {
	var query = Comment.findById(id);

	query.exec(function (err, post) {
		if (err) {
			return next(err);
		}

		if (!post) {
			return next(new Error('can\'t find comment'));
		}

		req.post = post;

		return next();
	});
});

// POST login authentication for the user and returns token
router.post('/login', function (req, res, next) {
	if (!req.body.username || !req.body.password) {
		return res.status(400).json({
			message: 'Please fill out all fields'
		});
	}

	passport.authenticate('local', function (err, user, info) {
		if (err) {
			return next(err);
		}

		if (user) {
			return res.json({
				token: user.generateJWT()
			});
		} else {
			return res.status(401).json(info);
		}
	})(req, res, next);
});

// Preload posts object
router.param('post', function (req, res, next, id) {
	var query = Post.findById(id);

	query.exec(function (err, post) {
		if (err) {
			return next(err);
		}

		if (!post) {
			return next(new Error('can\'t find post'));
		}

		req.post = post;

		return next();
	})
});

// GET posts
router.get('/posts', function (req, res, next) {
	Post.find(function(err, posts){
		if (err) {
			return next(err);
		}

		res.json(posts);
	});
});

// POST posts
router.post('/posts', auth, function(req, res, next) {
	var post = new Post(req.body);

	post.author = req.payload.username;
	post.author_id = req.payload._id;

	post.save(function(err, post){
		if (err) {
			return next(err);
		}

		res.json(post);
	});
});

// GET post by ID
router.get('/posts/:post', function(req, res) {
	req.post.populate('comments', function (err, post) {
		if (err) {
			return next(err);
		}

		res.json(req.post);
	});
});

// DELETE post
router.delete('/posts/:post', auth, function(req, res) {
	var query = Post.findById(req.params.post);

	query.exec(function (err, post) {
		if (err) {
			return next(err);
		}

		if (!post) {
			return next(new Error('can\'t find post'));
		}

		if (req.payload._id === post.author_id.toString()) {
			// remove all comments for :post
			req.post.comments.forEach(function(id) {
				Comment.remove({
					_id: id
				}, function (err) {
					if (err) {
						return next(err);
					}
				});
			});

			// remove vote information
			Vote.remove({
				post_id: req.params.post
			}, function (err, vote) {
				if (err) {
					return next(err);
				}
			});

			// remove :post
			Post.remove({
				_id: req.params.post
			}, function (err, post) {
				if (err) {
					return next(err);
				}

				// refresh Post by getting and returning the Posts
				Post.find(function(err, posts) {
					if (err) {
						return next(err);
					}

					res.json(posts);
				});
			});
		}
	});
});

// PUT downvote call for POST ID
router.put('/posts/:post/downvote', auth, function(req, res, next) {
	vote(req, res, next, -1);
});

// PUT upvote call for POST ID
router.put('/posts/:post/upvote', auth, function(req, res, next) {
	vote(req, res, next, 1);
});

// POST comment for POST ID
router.post('/posts/:post/comments', auth, function(req, res, next) {
	var comment = new Comment(req.body);
	comment.post = req.post;
	comment.author = req.payload.username;
	comment.author_id = req.payload._id;

	comment.save(function (err, comment) {
		if (err) {
			return next(err);
		}

		req.post.comments.push(comment);
		req.post.save(function (err, post) {
			if (err) {
				return next(err);
			}

			res.json(comment);
		});
	});
});

// PUT downvote call for POST ID COMMENT ID
router.put('/posts/:post/comments/:comment/downvote', auth, function(req, res, next) {
	vote(req, res, next, -1);
});

// PUT upvote call for POST ID COMMENT ID
router.put('/posts/:post/comments/:comment/upvote', auth, function(req, res, next) {
	vote(req, res, next, 1);
});

// POST register user with password
router.post('/register', function (req, res, next) {
	if (!req.body.username || !req.body.password) {
		return res.status(400).json({
			message: 'Please fill out all fields'
		});
	}

	var user = new User();

	user.username = req.body.username;

	user.setPassword(req.body.password);

	user.save(function (err) {
		if (err) {
			return next(err);
		}

		return res.json({
			token: user.generateJWT()
		});
	});
});

// preload comments object
router.param('vote', function (req, res, next, id) {
	var query = Vote.findById(id);

	query.exec(function (err, post) {
		if (err) {
			return next(err);
		}

		if (!post) {
			return next(new Error('can\'t find comment'));
		}

		req.post = post;

		return next();
	})
});

module.exports = router;
