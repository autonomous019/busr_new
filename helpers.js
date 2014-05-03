var Handlebars = require('hbs');

	 Handlebars.registerHelper("Max", function(A, B){
	     return (A > B) ? A : B;
	 });
	 
	 
	 Handlebars.registerHelper("AgencyId", function(agency_name){
	     return agency_name;
	 });
