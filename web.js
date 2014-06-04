var express = require('express');
var app = express();
/*
app
  .use(express.bodyParser())
  .use(express.cookieParser('_busrinf0!!!'))
  .use(express.session())
  .use(everyauth.middleware(app));
*/

//app templating engines   
var hbs = require('hbs');
var helpers = require('./helpers.js'); //Handlebars helpers methods
//var L = require('leaflet');


app.set('view engine', 'html');
app.engine('html', hbs.__express);
app.use(express.bodyParser());
app.use(express.static('public'));

//SESSIONS SESSIONS SESSIONS 
//var everyauth = require('everyauth');





//app speciic scripts
var routesEngine = require('./routes');
var agenciesEngine = require('./agencies');
var busrEngine = require('./busr');
var posterEngine = require('./poster');
var routeStopsEngine = require('./route_stops');
var routeMapEngine = require('./route_map');






//APP ROUTES APP ROUTES APP ROUTES APP ROUTES APP ROUTES 
app.get('/', function(req, res) {
	res.render('index',{title:"Busr Transitor", entries:busrEngine.getBusrEntries()});
});




//ROUTES ROUTES ROUTES <as in bus routes not app routing>
app.get('/routes', function(req, res) {
	res.render('routes',{title:"MTA Routes", routes:routesEngine.getRoutes()});
});

app.get('/route/:id', function(req, res) {
	var route_id = req.params.id;
	route_id = route_id.replace("%20","_");
	route_id = route_id.replace(" ", "_");
	route_id = route_id.replace("+", "plus");
	var stops_data = require('./cache/route_stops_'+route_id+'.js');
	//get based on js var route_id
	var stops = stops_data.getStops(route_id);
	var route = routesEngine.getRoute(req.params.id);
	res.render('route',{id:route.id, route:route, stops:stops});
});





//STOPS STOPS STOPS


//MTA version
app.get('/stops/:id', function(req, res) {
	var route_id = req.params.id;
	var stops_data = require('./cache/route_'+route_id+'.js');
	//get based on js var route_id
	var stops = stops_data.getStops(route_id);
	res.render('stops',{id:stops.id, stops:stops});
});


//MTA version 
app.get('/stop/:id', function(req, res) {
	var stop_data = require('./cache/stop_'+req.params.id+'.js');
	//console.log(stop_data);
    //var stopsEngine = require('./stops');
	var stop = stop_data.getStop(req.params.id);
	console.log(req.params.id);
	console.log(stop);
	res.render('stop',{id:stop.id, stop:stop});
});





//ROUTE STOPS ROUTE STOPS ROUTE STOPS 
app.get('/route_stops/:agency_name/:route_id', function(req, res) {

	var agency_name = req.params.agency_name;
	var route_id = req.params.route_id;
	res.render('route_stops',{title:"Route: "+agency_name+" Route: "+route_id, route_id: route_id, agency_name:agency_name, 
	stops:routeStopsEngine.getStops(route_id, agency_name), 
	route_map:routeStopsEngine.getRouteMap(route_id, agency_name), 
	schedules:routeStopsEngine.getSchedules(route_id, agency_name) }); 

});




//system wide route map 
app.get('/route_map/:agency_name', function(req, res) {

	var agency_name = req.params.agency_name;

	res.render('route_map',{title:"Route: "+agency_name, agency_name:agency_name, route_map:routeMapEngine.getRouteMap(agency_name)}); 

});



app.get('/map', function(req, res) {
	//var map_points = require('./maps/icon.js');
	res.render('map', {title:"Map"});
});








//Trip Planning
app.post('/tripresult', function(req, res){ // Specifies which URL to listen for
  // req.body -- contains form data
  res.render('tripresult', {title:"Trip Planning"});
});

app.get('/trip', function(req, res) {
	
	res.render('trip', {title:"Trip Planning"});
});






//ABOUT 
app.get('/about', function(req, res) {
	res.render('about', {title:"About"});
});





//AGENCIES NAVIGATOR
app.get('/agencies', function(req, res) {
	//check if array count is greater > 0 then don't regenerate agents list in agencies.js
	agents = agenciesEngine.getAgencies(); //generate the list of agencies to be called by res.render
	res.render('agencies',{title:"Transit Agencies", agencies:agenciesEngine.getAgenciesStatic()});
	
});

app.get('/agency/:agency_name', function(req, res) {
	var agency_name = req.params.agency_name;
	agents = agenciesEngine.getAgency(agency_name);
	routes = agenciesEngine.getAgencyRoutes(agency_name)
	res.render('agency',{title:"Agency:"+agency_name, agency_name:agency_name, 
	agent_routes:agenciesEngine.getAgencyRoutesStatic(agency_name),  
	agent:agenciesEngine.getAgencyStatic(agency_name)});
});





//Post Delegater
app.post('/post', function(req, res){ // Specifies which URL to listen for

  //will need to add logic to control mode flow in post.html using handlebars.js
	
  // req.body -- contains form data

  var fname = req.body.fname;
  var lname = req.body.lname;
  var email = req.body.email;
  var message = req.body.message;
  var mode = req.body.mode;  //all forms need a mode for the post delegator
  var Poster = require('./poster');
  var poster_conroller = new Poster(req);
  //console.log(poster_conroller.greetingText());
  var greeting = poster_conroller.greetingText();
  //var fileUpdate = poster_controller.writeContact(req.body);

  
  res.render('post', {title:"Post", fname:fname, lname:lname, message:message, email: email, mode:mode, greeting:greeting });
});

//Contact
app.get('/contact', function(req, res) {
	res.render('contact', {title:"Contact"});
});






//app.listen(3000);
app.listen(1337, '127.0.0.1');


//heroku specific
/*app.listen(process.env.PORT || 5000, function(){
  console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
});
*/
