var mongoose = require('mongoose');

var PostSchema = new mongoose.Schema({
	title: String,
	link: String,
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
			ref: 'Comment'
		}
	]
});

PostSchema.methods.downvote = function (cb) {
	this.downvotes += 1;
	this.save(cb);
};

PostSchema.methods.upvote = function (cb) {
	this.upvotes += 1;
	this.save(cb);
};

mongoose.model('Post', PostSchema);