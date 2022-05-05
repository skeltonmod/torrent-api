let fs = require("fs")
let path = require("path");
let express = require('express');
let WebTorrent = require('webtorrent')

let router = express.Router();

router.get('/', (req, res, next) => {
	res.send('API Home');
})

//
//	1.	When the server starts create a WebTorrent client
//
let client = new WebTorrent();

//
//	2.	The object that holds the client stats to be displayed in the front end
//	using an API call every n amount of time using jQuery.
//
let stats = {
	progress: 0,
	downloadSpeed: 0,
	ratio: 0
}

//
//	3.	The variable that holds the error message from the client. Farly crude but
//		I don't expect to much happening hear aside the potential to add the same
//		Magnet Hash twice.
//
let error_message = "";

//
//	4.	Listen for any potential client error and update the above variable so
//		the front end can display it in the browser.
//
client.on('error', function(err) {

	error_message = err.message;

});

//
//	5.	Emitted by the client whenever data is downloaded. Useful for reporting the
//		current torrent status of the client.
//
client.on('download', function() {

	//
	//	1.	Update the object with fresh data
	//
	stats = {
		progress: Math.round(client.progress * 100 * 100) / 100,
		downloadSpeed: client.downloadSpeed,
		ratio: client.ratio
	}

});

//
//	API call that adds a new Magnet Hash to the client so it can start
//	downloading it.
//
//	magnet 		-> 	Magnet Hash
//
//	return 		<-	An array with a list of files
//
router.get('/add/:magnet', function(req, res) {

	//
	//	1.	Extract the magnet Hash and save it in a meaningful variable.
	//
	let magnet = req.params.magnet;
	console.log('Magnet', magnet);
	//
	//	2.	Add the magnet Hash to the client
	//
	client.add(magnet, function (torrent) {

		//
		//	1.	The array that will hold the content of the Magnet Hash.
		//
		let files = [];

		//
		//	2.	Loop over all the file that are inside the Magnet Hash and add
		//	them to the above variable.
		//
		torrent.files.forEach(function(data) {

			files.push({
				name: data.name,
				length: data.length
			});

		});

		//
		//	->	Once we have all the data send it back to the browser to be
		//		displayed.
		//
		res.status(200)
		res.json(files);

	});

});

router.get('/stream/:magnet/:file_name', function(req, res, next) {

	let magnet = req.params.magnet;


	var tor = client.get(magnet);

	let file = {};

	for(i = 0; i < tor.files.length; i++)
	{
		if(tor.files[i].name == req.params.file_name)
		{
			file = tor.files[i];
		}
	}

	let range = req.headers.range;

	console.log(range);


	if(!range)
	{

		let err = new Error("Wrong range");
			err.status = 416;

		return next(err);
	}

	let positions = range.replace(/bytes=/, "").split("-");

	let start = parseInt(positions[0], 10);

	let file_size = file.length;

	let end = positions[1] ? parseInt(positions[1], 10) : file_size - 1;

	let chunksize = (end - start) + 1;

	let head = {
		"Content-Range": "bytes " + start + "-" + end + "/" + file_size,
		"Accept-Ranges": "bytes",
		"Content-Length": chunksize,
		"Content-Type": "video/mp4"
	}


	res.writeHead(206, head);


	let stream_position = {
		start: start,
		end: end
	}

	let stream = file.createReadStream(stream_position)

	stream.pipe(res);


	stream.on("error", function(err) {

		return next(err);

	});

});


router.get('/list', function(req, res, next) {

	let torrent = client.torrents.reduce(function(array, data) {

		array.push({
			hash: data.infoHash
		});

		return array;

	}, []);

	res.status(200);
	res.json(torrent);

});


router.get('/stats', function(req, res, next) {

	res.status(200);
	res.json(stats);

});

router.get('/errors', function(req, res, next) {

	res.status(200);
	res.json(error_message);

});

router.get('/delete/:magnet', function(req, res, next) {

	let magnet = req.params.magnet;

	client.remove(magnet, function() {

		res.status(200);
		res.end();

	});

});

module.exports = router;