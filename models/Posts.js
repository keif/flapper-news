var mongoose = require('mongoose');

var PostSchema = new mongoose.Schema({
	type: {
		type: String,
		default: 'post'
	},
	author: String,
	author_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Users'
	},
	link: String,
	title: String,
	downvotes: {
		type: Number,
		default: 0
	},
	upvotes: {
		type: Number,
		default: 0
	},
	comments: [
		{
			type: mongoose.Schema.Types.ObjectId,
			// The ref option is what tells Mongoose which model to use during population
			ref: 'Comment'
		}
	]
});

PostSchema.methods.downvote = function (num, cb) {
	this.downvotes += num;
	this.save(cb);
};

PostSchema.methods.upvote = function (num, cb) {
	this.upvotes += num;
	this.save(cb);
};

mongoose.model('Post', PostSchema);