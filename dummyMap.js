// ---------------------- dev log 20190625: what can be improved ----------------------
// - now give 1468 sta_date each a step in slide bar, is there a better way? 
// - now only know existing locationid-unlo mapping, cannot get get geocode of unseen locationid/unlo

var data = null;
var getFiltered = null;
var getLocCount = null;

var info1 = null;
var getUnloCount = null;

var info2 = null;
var getDataPoint = null;


var result = null;
var input = '2015-02-05'; // get the input date from reading DOM slide bar
// var input = '2013-03-02'; // get the input date from reading DOM slide bar

// ========== load local linestops data; will be replaced by making request to JDBC ==========  
d3.csv("./data/linestops_n.csv", function(d){
    // write data to a global variable
    data = d;

    // helper func of getLocCount
    // instatiate the getFiltered function
    getFiltered = function(dateString) {
        var filtered = data.filter(function(data){
            return data.sta_date == dateString;
        })
        return filtered;
    }

    // helper func of getUnloCount
    // return [{key:xxxx, value:yyyy}, ...]
    // where key is locationid, value is count(on that day how many linestopid is at the location)
    getLocCount = function(data) {
        var count = d3.nest()
                      .key(function(data) {return data.locationid;})
                      .rollup(function(v) {return v.length;})
                      .entries(getFiltered(document.getElementById('range').innerHTML)); // later change `input` to get value from DOM
        // console.log(count);
        return count;
    }

    // ------------- load two local json -------------
    d3.json('./data/locationid_to_unlo.json', function(data){
        info1 = data;
        // helper func of getDataPoint
        getUnloCount = function(){
            var unloCount = {};
            var locCount = getLocCount();
            locCount.forEach( ele => {
                if (unloCount[info1[ele.key]] == undefined){
                    unloCount[info1[ele.key]] = ele.value;
                } else {
                    unloCount[info1[ele.key]] += ele.value;
                }
            });
            return unloCount;
        }
    })

    d3.json('./data/unlo_to_latlong.json', function(data){
        info2 = data;
        // input: (later) get date string from slide bar 
        // output: an array of json, will be used to draw geo bubble
        //         each json is {city: nn, latitude: xx, longitude: yy, count: cc}
        getDataPoint = function(){
            var dataPoint =  [];
            var unloCount = getUnloCount();
            Object.keys(unloCount).forEach( key => {
                var dp = JSON.stringify(info2[key]).slice(0, -1);
                dp += ',';
                dp += '"count":'
                dp += unloCount[key];
                dp += '}'
                dataPoint.push(JSON.parse(dp));
            })
            return dataPoint;
        }

        // ========== draw Map, Circle, activate Slide bar ========== 
        d3.json("https://www.webuildinternet.com/articles/2015-07-19-geojson-data-of-the-netherlands/townships.geojson", function(data){

            // Draw the map
            svg.append("g")
                .selectAll("path")
                .data(data.features)
                .enter()
                .append("path")
                  .attr("fill", "PeachPuff")
                  .attr("d", d3.geoPath()
                      .projection(projection)
                  )
                .style("stroke", "white")
                .style("stroke-width", ".5")
                .style("stroke-opacity", ".5")

            // Add circles only after draw map is done
            svg
              .selectAll("circle")
              .data(getDataPoint())
              .enter()
              .append("circle")
                .attr("cx", function(d){ return projection([d.longitude, d.latitude])[0] })
                .attr("cy", function(d){ return projection([d.longitude, d.latitude])[1] })
                .attr("r", function(d) {
                              return size(d.count)})
                .style("fill", "69b3a2")
                .attr("stroke", "#69b3a2")
                .attr("stroke-width", 3)
                .attr("fill-opacity", .4)
                .on('mouseover', mouseover)
                .on('mousemove', mousemove)
                .on('mouseleave', mouseleave)

            // Activate slide bar
            d3.select("#timeslide").on("input", function() {
                update(+this.value);
            });
        })
    })
});


// ==========  svg area ==========  
var width = 800, 
    height = 580

var svg = d3.select('#mapContainer')
                 .append('svg')
                 .attr('width', width)
                 .attr('height', height) 

// ==========  Map prepare: projection ==========  
var projection = d3.geoMercator()
    .center([5, 52])                // GPS of location to zoom on
    .scale(5000)                       // This is like the zoom
    .translate([ width/2, height/2 ])

// ==========  Circle prepare: scale for circle size ==========  
var size = d3.scaleLinear()
  .domain([0, 15])  // per day there's at most 15 barge at any city
  .range([ 0, 50])  // Size in pixel

// ==========  Tooltip prepare: area and interaction ==========  
var Tooltip = d3.select('body')
                .append('div')
                .attr('class', 'tooltip')
                // .style('z-index', '10')
                .style('position', 'absolute')
                .style('visibility', 'hidden')
                .style('background-color', 'white')
                .style('border', 'solid')
                .style('border-width', '1px')
                .style('border-radius', '5px')

var mouseover = function(d){
  // Tooltip.style('opacity', 1)
  Tooltip.style('visibility', 'visible')
}
var mousemove = function(d) {
  Tooltip.html('<b>' + d.city + '</b>' + '<br>' +
               '#barge: '+ d.count)
         // .style('left', (d3.mouse(this)[0]+10) + 'px')
         // .style('top', (d3.mouse(this)[1]) + 'px')
         .style("top", (event.pageY-10)+"px")
         .style("left",(event.pageX+10)+"px");
}
var mouseleave = function(d){
  // Tooltip.style('opacity', 0)
  Tooltip.style('visibility', 'hidden')
}

// ==========  Slide bar prepare: ==========  
var inputValue = null;
var time = ["2013-03-02", "2015-02-15", "2017-09-27", "2017-10-12"];

function update(value) {
    document.getElementById("range").innerHTML = time[value];
    inputValue = time[value];
    // svg.selectAll("circle").data(getDataPoint());

    // remove old data
    d3.selectAll("circle").remove();
    // Add circles only after draw map is done
    // add new data
    svg
      .selectAll("circle")
      .data(getDataPoint())
      .enter()
      .append("circle")
        .attr("cx", function(d){ return projection([d.longitude, d.latitude])[0] })
        .attr("cy", function(d){ return projection([d.longitude, d.latitude])[1] })
        .attr("r", function(d) {
                      return size(d.count)})
        .style("fill", "69b3a2")
        .attr("stroke", "#69b3a2")
        .attr("stroke-width", 3)
        .attr("fill-opacity", .4)
        .on('mouseover', mouseover)
        .on('mousemove', mousemove)
        .on('mouseleave', mouseleave)
}


// -------------- leaflet.js --------------

// Initialize the map
// [50, -0.1] are the latitude and longitude
// 4 is the zoom
// mapid is the id of the div where the map will appear
// var mymap = L
//   .map('mapid')
//   .setView([50, -0.1], 3);

// // Add a tile to the map = a background. Comes from OpenStreetmap
// L.tileLayer(
//     'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
//     attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
//     maxZoom: 6,
//     }).addTo(mymap);

