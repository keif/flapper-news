var express = require('express');
var mongoose = require('mongoose');
var passport = require('passport');
var jwt = require('express-jwt');

var router = express.Router();
var Post = mongoose.model('Post');
var Comment = mongoose.model('Comment');
var Vote = mongoose.model('Vote');
var User = mongoose.model('User');
var auth = jwt({
	secret: 'SECRET',
	userProperty: 'payload'
});

var vote = function (req, res, next, num) {
	var post = req.post,
		payload = req.payload;

	console.log("---- REQ POST -----");
	console.log(post);

	console.log("---- VOTE OBJ :: POST -----");
	var vote = new Vote(req.body);
	console.log(typeof post.__v, post.__v);
	console.log(typeof num, num);
	vote.user_id = payload._id, // user id
	vote.post_id = post._id, // comment or post id
	vote.comment_id = null, // comment or post id
	vote.vote = parseInt(post.__v, 10) * parseInt(num, 10);

	vote.save(function(err, vote){
		if (err) {
			console.error(err);
			return next(err);
		}
		console.log(vote);
		// res.json(vote);
		// next();
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
	})
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

	// remove :post
	Post.remove({
		_id: id
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
});

// PUT downvote call for POST ID
router.put('/posts/:post/downvote', auth, function(req, res, next) {
	req.post.downvote(function (err, post) {
		if (err) {
			return next(err);
		}

		vote(req, res, next, -1);

		res.json(post);
	});
});

// PUT upvote call for POST ID
router.put('/posts/:post/upvote', auth, function(req, res, next) {
	req.post.upvote(function (err, post) {
		if (err) {
			return next(err);
		}

		vote(req, res, next, 1);

		res.json(post);
	});
});

// POST comment for POST ID
router.post('/posts/:post/comments', auth, function(req, res, next) {
	var comment = new Comment(req.body);
	comment.post = req.post;
	comment.author = req.payload.username;

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
	req.post.downvote(function (err, post) {
		if (err) {
			return next(err);
		}

		vote(req, res, next, -1);

		res.json(post);
	});
});

// PUT upvote call for POST ID COMMENT ID
router.put('/posts/:post/comments/:comment/upvote', auth, function(req, res, next) {
	req.post.upvote(function (err, post) {
		if (err) {
			return next(err);
		}

		vote(req, res, next, 1);

		res.json(post);
	});
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
