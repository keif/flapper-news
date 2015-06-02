var mongoose = require('mongoose');

// vote_id is an auto-increment column that creates a unique ID for each vote
// user_id is an identifier of who the user is that submitted this vote
// post_id is an identifier for the post the user is voting on
// vote determines whether this vote was up or down.
var VoteSchema = new mongoose.Schema({
	user_id:  {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Users'
	}, // user id
	post_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Posts'
	}, // comment or post id
	comment_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Comments'
	}, // comment or post id
	vote: Number // vote -1/0/1
});

mongoose.model('Vote', VoteSchema);