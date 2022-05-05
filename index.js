require('dotenv').config();
let path = require('path');
let cors = require('cors');
let logger = require('morgan');
let express = require('express');
let bodyParser = require('body-parser');

let app = express();

const port = process.env.PORT || 3000;
//
//	Add cors to make jQuery API requests
//
app.use(cors());

//
//	Check for HTTPS
//
app.use(force_https);

//
//	Expose the public folder to the world
//
app.use(express.static(path.join(__dirname, 'public')));

//
//	Remove the information about what type of framework is the site running on
//
app.disable('x-powered-by');

//
// HTTP request logger middleware for node.js
//
app.use(logger('dev'));

//
//	Parse all request as regular text, and not JSON objects
//
app.use(bodyParser.json());

//
//	Parse application/x-www-form-urlencoded
//
app.use(bodyParser.urlencoded({ extended: false }));

//////////////////////////////////////////////////////////////////////////////

app.use('/api/', require('./routes/index'));

app.use(function(req, res, next) {

	let err = new Error('Not Found');
		err.status = 404;

	next(err);

});

app.use(function(err, req, res, next) {

	let obj_message = {
		message: err.message
	};

	if(process.env.NODE_ENV == 'development')
	{
		obj_message.error = err;

		console.error(err);
	}


	res.status(err.status || 500);

	res.json(obj_message);

});

function force_https(req, res, next)
{

	if(process.env.NODE_ENV == 'production')
	{

		if(req.headers['x-forwarded-proto'] !== 'https')
		{

			return res.redirect('https://' + req.get('host') + req.url);
		}
	}

	next();
}

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

module.exports = app;