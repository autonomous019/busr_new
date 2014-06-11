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
						  	console.log(schedules);
							return schedules;
						  }
						  cnt++;
						  
					      //TODO when adding atomized stop schedules use this:	  
						  //@redis.SADD(@agency_name+"_stop_schedule_"+c['stop_id'], c['trip_id'].to_s+" "+c['arrival_time'].to_s+" "+c['departure_time'])
						
						
	  		  }
	  		});	
	  	}
	});
}


exports.getSchedules = function(route_id, agency_name) {
	this.setSchedules(route_id, agency_name);
	
	return schedules;

};


