$LOAD_PATH << '.'

require 'rubygems' #otherwise ,require 'json' will fail
require 'open-uri'
require 'json'
require 'redis'
require 'yaml'
require 'optparse'



#Aggregator does heavy lifting of crunching data and setting up final object lists for views (i.e. collections based on models) Basic data is gathered in model.rb when it is called by gtfs.rb this class aggregates those data structs
class Aggregator  
  
  def initialize(agency_name)  
    # Instance variables  
    @agency_name = agency_name 
    @agents = Array.new 
    @system_map_size = 0
    @redis = Redis.new(:host => "localhost", :port => 6379) 
  end  

  
  ########### agents() #################################################### 
  #create a list of agents in the system
  def agents()  
      agents = Array.new
      agents = @redis.smembers('agencies')
      @agents = agents
      return agents
  end 
  
  
  ########### system_map_size() ########################################### 
  #create a list of agents in the system
  def system_map_size()  

      return @system_map_size
      
  end 
  
  
 
  ########### stops() #################################################### 
  #need a list of stop objects per route_id via trip_id and stop_times
  #create a master list of stops grouped by route
  #get Intercity_Transit_trips to get all trips for a route then get all stops from ‘Intercity_Transit_stop_times_<trip_id>’
  #redis-cli SMEMBERS 'Intercity_Transit_trips_7’ gets all trips for a route as INT by trip_id
 
  def stops(route_id)
      stops = Array.new
      trips = Array.new
      temp_stops = Array.new
      trips = @redis.smembers(@agency_name+"_trips_"+route_id)
      
      trips.each do |t|      
        $stop = Hash.new
        temp_stops += @redis.smembers(@agency_name+"_stop_times_"+t)
      end
      
      #create a uniq list of stops by stop_id and push detail info into stop_info array
      temp_stops = temp_stops.uniq

      temp_stops.each do |ts|
        @redis.SADD(@agency_name+"_stops_to_route_"+route_id, ts.to_s)
      end
 
      return temp_stops
  end 
  
  

  
  ########### route_map() #################################################### 
  #gets all coords per an atomized route id in a agency system
 
  def route_map(route_id)
      coords = Array.new
      temp_coords = Array.new
      trips = Array.new
      shape_ids = Array.new
      shapes = Array.new
      
      #get trips for a route
      trips = @redis.smembers(@agency_name+"_trips_"+route_id.to_s)
      trips.each do |t|      
        #hmget 'Intercity_Transit:trip_380' shape_id
        shape_ids += @redis.hmget(@agency_name+":trip_"+t, "shape_id")
      end
      shape_ids.each do |sid|
        #sid = shape_id from 'Intercity_Transit_trips_tripid
        #redis-cli smembers 'Intercity_Transit_shape_8'
        shapes = @redis.smembers(@agency_name+"_shape_"+sid.to_s)
        shapes.each do |s|
          #redis-cli hgetall 'Intercity_Transit:shapes_8_17' s = shape_pt_sequence
          coords.push(@redis.hgetall(@agency_name+":shapes_"+sid.to_s+"_"+s.to_s))
        end  
      end
      
      temp_coords = coords.uniq
      temp_coords.each do |c|
       @redis.rpush @agency_name+":route_shapes_"+route_id.to_s, c['shape_id'].to_s+" "+c['shape_pt_sequence'].to_s
      end
      cnt = 0
      #temp_coords.each do |c|
      #    puts @redis.lindex(@agency_name+":route_shapes_"+route_id.to_s, cnt)
      #    cnt += 1
      #end
      #@redis.set(@agency_name+":route_shapes_length_"+route_id.to_s, cnt)
      #puts @redis.get(@agency_name+":route_shapes_length_"+route_id.to_s)
      return temp_coords
  end
  
  
  
  ########### route_schedule() #################################################### 
  #gets all times for a route atomized by stop id 
  
  # stop_times {"trip_id"=>"726", "stop_id"=>"167", "arrival_time"=>"18:40:00", "departure_time"=>"18:40:00", "stop_sequence"=>"11", "shape_dist_traveled"=>"3.51739790107", "stop_headsign"=>"", "pickup_type"=>"", "drop_off_type"=>""}
          #puts c['trip_id'].to_s+" "+c['stop_id'].to_s+" "+c['arrival_time'].to_s+" "+c['stop_sequence'].to_s+" "+c['shape_dist_traveled']
  
  #   calendar hash     {"service_id"=>"3", "monday"=>"0", "tuesday"=>"0", "wednesday"=>"0", "thursday"=>"0", "friday"=>"0", "saturday"=>"0", "sunday"=>"1", "start_date"=>"20131230", "end_date"=>"20181230"}
          #puts days   
          
  #   t is the trip_id    
  #   redis-cli smembers 'Intercity_Transit_stop_times_380' gives set of stop_ids for a trip         
 
  def route_schedule(route_id)
      times = Array.new
      temp_times = Array.new
      trips = Array.new
      stop_ids = Array.new  
      
      #get trips for a route
      trips = @redis.smembers(@agency_name+"_trips_"+route_id.to_s)
      trips.each do |t|  
        stop_ids.push(@redis.smembers(@agency_name+"_stop_times_"+t))
        stops = @redis.smembers(@agency_name+"_stop_times_"+t)
      
        stops.each do |s|
            stop_times = @redis.hgetall(@agency_name+":stop_times_"+t.to_s+"_"+s.to_s)
            temp_times.push(stop_times)
            
        end

      end

      temp_times.each do |c|
     
          #get the service id from the trip_id and add what day(s) the trip runs, then add to data
          trip_data = @redis.hgetall(@agency_name+":trip_"+c['trip_id'])
          service_id = trip_data['service_id']
          trip_headsign = trip_data['trip_headsign']
          block_id = trip_data['block_id']
          calendar_data = @redis.hgetall(@agency_name+":calendar_"+service_id)
          days = calendar_days(calendar_data)
          data = c['trip_id'].to_s+" "+c['stop_id'].to_s+" "+c['arrival_time'].to_s+" "+c['stop_sequence'].to_s+" "+c['shape_dist_traveled'].to_s+" "+days+" "+trip_headsign+" "+block_id+" "+service_id
          @redis.rpush @agency_name+":route_schedule_"+route_id.to_s, data
          #@redis.SADD(@agency_name+"_stop_schedule_"+c['stop_id'], c['trip_id'].to_s+" "+c['arrival_time'].to_s+" "+c['departure_time'])
          
          #need a set of time data to stop_id from c['stop_id'] above 
     end
        #TODO there should be a set of schedules atomized to each stop. capture trip id and arrival/departure times, stop sequence, stop distance
        # 
  
     return temp_times
  end
  
  
########### calendar_days() #################################################### 
  def calendar_days(calendar_data)
    
    if(calendar_data['monday'] === '1')
      monday = "M"
    else
      monday = ""
    end
    
    if(calendar_data['tuesday'] === '1')
      tuesday = "Tu"
    else
      tuesday = ""
    end
    
    if(calendar_data['wednesday'] === '1')
      wednesday = "W"
    else
      wednesday = ""
    end
    
    if(calendar_data['thursday'] === '1')
      thursday = "Th"
    else
      thursday = ""
    end
    
    if(calendar_data['friday'] === '1')
      friday = "F"
    else
      friday = ""
    end
    
    if(calendar_data['saturday'] === '1')
      saturday = "Sa"
    else
      saturday = ""
    end
    
    if(calendar_data['sunday'] === '1')
      sunday = "Su"
    else
      sunday = ""
    end
    
    days = monday+","+tuesday+","+wednesday+","+thursday+","+friday+","+saturday+","+sunday
    
    return days 
    
  end
  
  
  
  
  ########### system_map() #################################################### 
  
 
  def system_map(route_id)
   
      all_coords = Array.new
      all_temp_coords = Array.new
      rs_length = @redis.get(@agency_name+":route_shapes_length_"+route_id.to_s)
      #puts rs_length
      i = 0
      while i < rs_length.to_i  do
        rs_args = @redis.lindex(@agency_name+":route_shapes_"+route_id.to_s, i)
        rs_args = rs_args.split(" ")
        shape_id = rs_args[0] 
        shape_sequence = rs_args[1]
        #puts @agency_name+":shapes_"+shape_id.to_s+"_"+shape_sequence.to_s
        #puts @redis.hgetall(@agency_name+":shapes_"+shape_id.to_s+"_"+shape_sequence.to_s)
        all_coords.push(@redis.hgetall(@agency_name+":shapes_"+shape_id.to_s+"_"+shape_sequence.to_s))
        i += 1
      end
      #puts all_coords.length
      all_temp_coords = all_coords.uniq
      all_temp_coords.each do |c|
        #puts c
       #shape_id =  "%06d" % c['shape_id'].to_s
       shape_id = c['shape_id'].to_s       
       shape_pt_sequence = c['shape_pt_sequence'].to_s

       @redis.rpush @agency_name+":system_coords", c['shape_id'].to_s+" "+c['shape_pt_sequence'].to_s #redis list
       #@redis.zadd(@agency_name+":system_coords_sorted_set", 1, shape_id+" "+shape_pt_sequence)
       @system_map_size += 1
      end

      
      return all_temp_coords
  end
  
  
  
  ########### transfers() #################################################### 
  #create a set of routes per each stop_id, >1 = transfer stop
 
  def transfers(route_id)
    
      stops = Array.new
      trips = Array.new
      temp_stops = Array.new
      trips = @redis.smembers(@agency_name+"_trips_"+route_id.to_s)

      trips.each do |trip|
        #puts trip
        temp_stops += @redis.smembers(@agency_name+"_stop_times_"+trip)   
      end
      
      temp_stops = temp_stops.uniq
      trips.each do |trip|
        temp_stops.each do |stop|
          in_set = @redis.sismember(@agency_name+"_stop_times_"+trip, stop)
          if(in_set)
            #puts "stop "+stop+" is in set" +trip
          end
          @redis.SADD(@agency_name+"_transfers_to_stop_"+stop, stop+":"+route_id.to_s)
 
        end
      end
      #process route maps here
      shape_len = @redis.get(@agency_name+":route_shapes_length_"+route_id.to_s)  
      temp_shapes = Array.new    
      1.upto shape_len.to_i do |a|
         temp_shapes.push(@redis.lindex(@agency_name+":route_shapes_"+route_id.to_s, a))
      end
      transfer_shapes = Array.new
      temp_shapes.each do |shape|
        shaper_info = shape.split(" ")
        trans_shape_id = shaper_info[0]
        trans_shape_sequence = shaper_info[1]

        transfer_shapes.push(@redis.hgetall(@agency_name+":shapes_"+trans_shape_id.to_s+"_"+trans_shape_sequence.to_s))
        
        
      end
      
      #combine all the data and put into hash referenced by route_id
      transfer_shapes.each do |tsh|
        #tsh is a hash of shapes info
         @redis.SADD(@agency_name+"_trans_route_shapes_"+route_id.to_s, tsh)
         header = "var trans_route_shapes =  "
         wr_str = @redis.smembers(@agency_name+"_trans_route_shapes_"+route_id.to_s)
         footer = " ;
         
         exports.getTransRoutesShapes = function() {
         	return routes;
         }
         
         "
         file_writer("../cache/"+@agency_name+"_trans_route_shapes_"+route_id.to_s, wr_str, header, footer)
         
      end
     
      
      
     return transfer_shapes
  end 

  def file_writer(file_name, text, header, footer)
    text = header.to_s + text.to_s + footer.to_s
    begin
       file = File.open(file_name,"w")
       file.write(text) 
    rescue IOError => e
       #some error occur, dir not writable etc.
    ensure
       file.close unless file == nil
    end
      
  end
  
end #end of class def

##################### DRIVER ####################################
# main driver
options = {}
OptionParser.new do |opts|
  
  opts.banner = "Usage: aggregator.rb [options]"
  opts.on("-a", "--agency", "transit agency") do |a|
    options[:agency] = a
  end

  #TODO need an option -l to list agencies ready for aggregation
  
end.parse!


#TODO: create a list of stops that service multiple routes and list as transfer stops

ARGV.each do |argv|
  agg = Aggregator.new(argv)
  puts
  puts "Aggregating Data into Redis for Agency: "+argv
  redis = Redis.new(:host => "localhost", :port => 6379) 
  #get a list of routes by agency
  routes = redis.smembers(argv+'_routes') 
  system_coords = Array.new

#agg.transfers(33)
#exit
  
 
  
############################################################################## 
  # generate stops for routes
  puts
  puts "Generating Stops Graph into Redis for Agency: "+argv
  system_stops = Array.new
  routes_cnt = 0
  data_arr = Hash.new {|h,k| h[k]=[]}
  
  routes.each do |r|
    
    agg_stops = agg.stops(r)
    puts "Route: "+ r+" STOPS LEN "+agg_stops.length.to_s
    cnt = 0
    agg_stops.each do |as|
      puts as
      data_arr["stops"] << as.to_s
      #system_stops.push(data_arr)
      cnt += 1
    end
    
    routes_cnt += 1
  end
  puts data_arr
  data_arr
  header = "var "+argv.to_s+"_stops =  "
  wr_str = data_arr.to_s
  
  footer = " ;
  
  exports.get"+argv+"Stops = function() {
  	return routes;
  }
  
  "
  
  agg.file_writer("../cache/"+argv+"_stops.js", wr_str, header, footer)
  
  puts "Total Number of Routes for "+argv+": "+routes_cnt.to_s
  
  
  exit
  
############################################################################## 
  puts
  puts "Generating Atomized Route Map Coordinates Graph into Redis for Agency: "+argv
  routes.each do |r|
    agg_routes = agg.route_map(r)
    redis.set(argv+":route_shapes_length_"+r.to_s, agg_routes.length.to_s)
    puts "Route: "+ r+" MAPS LEN "+agg_routes.length.to_s
  end
  
############################################################################## 
  puts
  puts "Generating System Map Coordinates Graph into Redis for Agency: "+argv
  routes.each do |r|
    agg_system_map = agg.system_map(r)
    puts argv+": "+ r+" System Map LEN "+agg_system_map.length.to_s
    system_coords.push(agg_system_map)
  end
  
  sys_map_length = agg.system_map_size()
  
  cnt = 0
   while cnt < sys_map_length.to_i  do
     #puts redis.lindex(argv+":system_coords", cnt)
      cnt += 1
  end
  
  puts "Total Coordinates in System: "+sys_map_length.to_s


############################################################################## 
  puts
  puts "Generating Route Schedules Set into Redis for Agency: "+argv
  
  routes.each do |r|
    schedule = agg.route_schedule(r)
    puts argv+": "+ r+" route sched len " + schedule.length.to_s
    redis.set(argv+":route_schedule_length_"+r.to_s, schedule.length.to_s)
  
    #schedule.each do |sched|
    #  puts sched
    #end
  
    #cnt = 0
    # while cnt < schedule.length.to_i  do
    #   puts redis.lindex(argv+":route_schedule_"+r, cnt)
    #    cnt += 1
    #end
    
  end
############################################################################## 


  
############################################################################## 
    # generate transfer routes for each stop (atomized)
    puts
    puts "Generating Transfers Graph into Redis for Agency: "+argv
    routes_cnt = 0
    routes.each do |r|
      agg_transfers = agg.transfers(r)
      puts "Stop Routes: "+ r+" STOPS LEN "+agg_transfers.length.to_s
      
      
      routes_cnt += 1
    end
   
  

  
end
puts "---------------------------------------------"
puts