var mongoose = require('mongoose');

var CommentSchema = new mongoose.Schema({
	type: {
		type: String,
		default: 'comment'
	},
	body: String,
	author: String,
	downvotes: {
		type: Number,
		default: 0
	},
	upvotes: {
		type: Number,
		default: 0
	},
	post: {
		type: mongoose.Schema.Types.ObjectId,
		// The ref option is what tells Mongoose which model to use during population
		ref: 'Post'
	}
});

CommentSchema.methods.downvote = function (num, cb) {
	this.downvotes += num;
	this.save(cb);
};

CommentSchema.methods.upvote = function (num, cb) {
	this.upvotes += num;
	this.save(cb);
};

mongoose.model('Comment', CommentSchema);