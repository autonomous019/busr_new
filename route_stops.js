var redis = require("redis"),
     client = redis.createClient();

client.on("error", function (err) {
    console.log("Error " + err);
});

var my_arr = new Array();
var stops =  new Array();

var my_route_arr = new Array();
var route_maps =  new Array();
var shape_keys =  new Array();

var my_schedule_arr = new Array();
var schedules =  new Array();

var realbus = new Array();
var get_realbus = new Array();


//STOPS
exports.setStops = function(route_id, agency_name) {
	
    if(stops.length >= 1){
    	 stops.length = 0;
    }

	var i = 0;	

    client.smembers(agency_name+'_stops_to_route_'+route_id, function(err,stop_ids) {
	
	//console.log(agency_name+'_stops_to_route_'+route_id+' '+stop_ids+' '+i);
	
	   if (err) {
          
	  		my_arr += [{"stop_id":"404: error, no data"}];

	      } else {
			  
			  i++;
			  for(var i = 0, len = stop_ids.length; i < len; i++) {  
		  	      var k = 0;
	
				  
				  //"Intercity_Transit:stop_82"
		  		client.hgetall(agency_name+':stop_'+stop_ids[i], function(err, results) {
			
		  		   if (err) {
		          
		  		  		my_arr += [{"agency_id":"404: error, no data", "agency_url":"sorry, temporary error"}];

		  		      } else {
				  
		  				 my_arr = results;
		  				 stops.push(my_arr);
				 
		  				 if(k == stop_ids.length-1){
		  					 //console.log(stops);
		  					 return stops;
		  				 } 

		  		     }
		  			  k++;
		  		});
				  
				  
		  		
	     }
	  }
	});	

};




exports.getStops = function(route_id, agency_name) {
	this.setStops(route_id, agency_name);
	
	return stops;

};



exports.setRouteMap = function(route_id, agency_name) {
	
    if(route_maps.length >= 1){
    	 route_maps.length = 0;
    }

	var i = 0;	
	
	client.get(agency_name+':route_shapes_length_'+route_id, function(err,rs_len) {
 	   if (err) {
                 var rs_length = 0;
 	      } else {
			
			  var rs_length = rs_len;

		  	console.log("rs length 2: "+rs_length);
		  	for(var c = 0; c < rs_length; c++ ){
				
		  	    client.lindex(agency_name+':route_shapes_'+route_id, c, function(err,route_map_ids) {
	
		
		  		   if (err) {
          
		  		  		my_route_arr += [{"route_map_id":"404: error, no data"}];

		  		      } else {
			  
						  //console.log(route_map_ids);
		
		  				  
		  			  	      var k = 0;
	
		  					  //console.log(route_map_ids[i]);
		  					  var route_params = route_map_ids.split(" ");
		  					  var shape_id = route_params[0];
		  					  var shape_sequence = route_params[1];
		  					  shape_keys.push(shape_id+'_'+shape_sequence);
				          
						      //console.log("args "+shape_id+' '+shape_sequence);
							  
		  					//redis-cli hgetall 'Intercity_Transit:shapes_8_17'
		  			  		client.hgetall(agency_name+':shapes_'+shape_id+'_'+shape_sequence, function(err, results) {
			
		  			  		   if (err) {
		          
		  			  		  		my_route_arr += [{"agency_id":"404: error, no data", "agency_url":"sorry, temporary error"}];

		  			  		      } else {
				  
		  			  				 my_route_arr = results;
		  			  				 route_maps.push(my_route_arr);
				 
		  			  				 if(k == route_map_ids.length-1){
							 
		  			  					 //console.log(route_maps);
		  			  					 return route_maps;
		  			  				 } 

		  			  		     }
		  			  			  k++;
		  			  		});
				  
				  
		  		
	
		
		  		  }
		  		});	
		
		
		
		  	}
			  
			  
			
			  
			  
			  
			  
		  }
	});
	
    

};


exports.getRouteMap = function(route_id, agency_name) {
	this.setRouteMap(route_id, agency_name);
	
	return route_maps;

};




//Schedules
exports.setSchedules = function(route_id, agency_name) {
	//need to get route schedule lengths then iterate through lindexes per length
	
    if(schedules.length >= 1){
    	 schedules.length = 0;
    }
    var cnt = 0;
	
	client.get(agency_name+':route_schedule_length_'+route_id, function(err,sched_len){
	     console.log("sched len:" + sched_len);
		 schedule_len = sched_len;	
		 
	  	for(var c = 0; c < schedule_len; c++ ){
			 var k = 0;
	  	    client.lindex(agency_name+':route_schedule_'+route_id, c, function(err, sched) {

	  		   if (err) {
       
	  		  		my_route_arr += [{"route_map_id":"404: error, no data"}];

	  		      } else {
		                
	  					  var route_params = sched.split(" ");
						  trip_id = route_params[0];
						  stop_id = route_params[1];
						  arrival_time = route_params[2];
						  sequencer = route_params[3];
						  distance_from_head = route_params[4];
						  days = route_params[5];
						  trip_headsign = route_params[6];
						  block_id = route_params[7];
						  service_id = route_params[8];
						  
						  var data_arr = new Array();
						  data_arr['trip_id'] = trip_id;
						  data_arr['stop_id'] = stop_id;
						  data_arr['arrival_time'] = arrival_time;
						  data_arr['sequencer'] = sequencer;
						  data_arr['distance_from_head'] = distance_from_head;
						  data_arr['days'] = days;
 					      data_arr['trip_headsign'] = trip_headsign;
 					      data_arr['block_id'] = block_id;
 					      data_arr['service_id'] = service_id;
						  
						  schedules.push(data_arr);
						  
						  if(cnt === schedule_len-1){
						  	//console.log(schedules);
							return schedules;
						  }
						  cnt++;
						  
					      //TODO when adding atomized stop schedules use this:	  
						  //@redis.SADD(@agency_name+"_stop_schedule_"+c['stop_id'], c['trip_id'].to_s+" "+c['arrival_time'].to_s+" "+c['departure_time'])
						
						
	  		  }
	  		});	
	  	}
	});
};


exports.getSchedules = function(route_id, agency_name) {
	this.setSchedules(route_id, agency_name);
	
	return schedules;

};


exports.setRealBus = function(route_short_name){
    if(realbus.length >= 1){
    	 //realbus.length = 0;
		 return realbus;
    }
	
    var request = require('request');
    
	proc_realtime = request.get('http://www.intercitytransit.com/rtacs/busdata.txt', function (error, response, body) {
        
		if (!error && response.statusCode == 200) {
            var csv = body;
			var data = csv.split("\n");
			for(var x=0; x<data.length-1; x++){
				
				/*
                   busdata.txt sample line: 
                   400,13,99,4104,0,-120,874,CBLE,872,46.981174,-122.918282,1402522051,41,4104,0,3005,
                   0:trip_id, 1:route_id, 2:unkown, 3:unknown, 4:unknown, 5:time delay, 6:unkwown, 7:headsign, 8:unkown, 9:lat, 10:lon, 11:unkown, 12:unknown, 13:unknown, 14:unknown, 15:unknown, 16:unknown
				*/
				
				d = data[x].split(",");
				var data_arr = new Array();
				data_arr["route_real_id"] = d[1];
				data_arr["time_delay"] = d[5];
				data_arr["headsign"] = d[7];
				data_arr["lat"] = d[9];
				data_arr["lon"] = d[10];
				//filter to match route_short_name to route_real_id, on sys map take this filter out
				if(d[1] === route_short_name){
					realbus.push(data_arr);
				}
				//realbus.push(data_arr);
				//realbus.push(d[1]);
			}

			console.log("realbus len "+realbus.length);
			console.log(realbus);
			return realbus;

        } else {
			console.log("error in setRealTime");
        	return realbus;
        }
		
    });	
	
	
};

exports.getRealBus = function(route_short_name) {
	
	this.setRealBus(route_short_name);
	console.log(realbus.length);
	return realbus;

};
