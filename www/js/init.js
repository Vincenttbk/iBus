accountKey = "ROKeG8zKRHS8MpEmngfdcg==";
uniqueUserID = "a2ea8cdf-4e28-4e9d-b1ba-2fa4de20f87c";
var currLat = "";
var currLon = "";
var resultLen = 0;
var allBusStops = [];
var nearbyStops = [];
var currStop;
var intervalCounter;

function initApp(){
    downloadBusStopInfo();
}

function downloadBusStopInfo(){
    $.get({
        url: "http://datamall2.mytransport.sg/ltaodataservice/BusStops?$skip="+resultLen,
        headers:{
            "AccountKey":accountKey,
            "UniqueUserID":uniqueUserID,
            "accept": "application/json"
        },
        success: function(result){
            resultLen+= result.value.length;
            if(result.value.length !== 0){
                console.log("Info");
                allBusStops = allBusStops.concat(result.value);
                downloadBusStopInfo();    
            }
            else{
                getNearByBusStop();
            }
        },
        async: false
    });
}

function getNearByBusStop(){
    navigator.geolocation.getCurrentPosition(onSuccess, onError);
}

var onSuccess = function(position) {
    nearbyStops = [];
    var countAlert = 0;
    var tempBus = allBusStops;
    for(var i = 0; i< tempBus.length; i++){
        var busLon =  tempBus[i].Longitude;
        var busLat = tempBus[i].Latitude;
        var distance = getDistanceFromLatLonInKm(busLat, busLon, position.coords.latitude, position.coords.longitude);
        
        if(distance < 0.2){
            tempBus[i]["distance"] = distance;
            nearbyStops.push(tempBus[i]);            
        }   
    }

    if(nearbyStops.length >0){
        var counter = 0;
        nearbyStops.sort(dynamicSort("distance"));
        intervalCounter = setInterval(function(){
            if(counter < nearbyStops.length){
                currStop = nearbyStops[counter];
                speakText('Are you at ' + nearbyStops[counter]["Description"]);
                shake.startWatch(onShake, 20 /*, onError */);

                counter++;
                console.log(counter);
            }
            else{
                clearInterval(intervalCounter);
            }
        },7000);
    }
    else{
             speakText("There is no bus-stop nearby, please seek help");
    }
}

function speakText(text){
    TTS.speak({
        text: text,
        locale: 'en-US',
        rate: 1.5
    }, function () {
        console.log("success");
        TTS.speak({
            text: "",
            locale: 'en-US',
            rate: 1.5
        }, function () {
            console.log("success");
        }, function (reason) {
            alert(reason);
        });
    }, function (reason) {
        alert(reason);
    });
}

// onError Callback receives a PositionError object
//
function onError(error) {
    alert('code: '    + error.code    + '\n' +
          'message: ' + error.message + '\n');
}

function getDistanceFromLatLonInKm(lat1,lon1,lat2,lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2-lat1);  // deg2rad below
  var dLon = deg2rad(lon2-lon1); 
  var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI/180)
}

function dynamicSort(property) {
    var sortOrder = 1;
    if(property[0] === "-") {
        sortOrder = -1;
        property = property.substr(1);
    }
    return function (a,b) {
        var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
        return result * sortOrder;
    }
}

var onShake = function () {
     speakText("");
    clearInterval(intervalCounter);
    shake.stopWatch();
    setTimeout(function(){
        speakText("Bus services available are");
    },2000);
    
    var busServices = getServicesInStop(currStop["BusStopCode"]);
    console.log(busServices);
    var counter = 0;
    setTimeout(function(){
         shake.startWatch(onShake2, 20 /*, onError */);
        intervalCounter = setInterval(function(){
            if(counter < busServices.length){
                currSer = busServices[counter];
                speakText("bus "+busServices[counter]["ServiceNo"]);
                    counter++;
                }
            else{
                clearInterval(intervalCounter);
            }
        },4000);
    },3000);
    
   
  // Fired when a shake is detected
};


function getServicesInStop(busStopId){
    var results = [];
$.get({
        url: "http://datamall2.mytransport.sg/ltaodataservice/BusArrival?BusStopID="+busStopId,
        headers:{
            "AccountKey":accountKey,
            "UniqueUserID":uniqueUserID,
            "accept": "application/json"
        },
        success: function(result){
            results = result.Services;     
        },
        async: false
    });
    return results;
}


var onShake2 = function () {
    clearInterval(intervalCounter);
    shake.stopWatch();
    
    speakText("The next arrival time for bus "+currSer["ServiceNo"] + "will be");    
    var currTime = new Date().addHours(8);
    var nextArrival = currSer.NextBus.EstimatedArrival;
    var arrival = dateToTimestamp(nextArrival);
    
    var diff = arrival - currTime;

    var msec = diff;
    var hh = Math.floor(msec / 1000 / 60 / 60);
    msec -= hh * 1000 * 60 * 60;
    var mm = Math.floor(msec / 1000 / 60);
    msec -= mm * 1000 * 60;
    var ss = Math.floor(msec / 1000);
    msec -= ss * 1000;

    var time = mm;
    
    setTimeout(function(){
        speakText(mm + " minutes");
    },5000);
  // Fired when a shake is detected
};

var onError = function () {
  // Fired when there is an accelerometer error (optional)
};

function dateToTimestamp(dataValue) {
    var dateTimeArr = dataValue.split("T");
    var date = dateTimeArr[0];
    var time = dateTimeArr[1];

    var timeArr = time.split("+");
    var gmtTime = timeArr[0];
    var gmtTimeArr = gmtTime.split(":");
    var timeDiff = timeArr[1];

    var dateArr = date.split("-");

    var newDate = new Date(dateArr[0], dateArr[1], dateArr[2], gmtTimeArr[0], gmtTimeArr[1], gmtTimeArr[2]);

    newDate = newDate.addHours(8);

    return newDate;
}

Date.prototype.addHours = function (h) {
    this.setHours(this.getHours() + h);
    return this;
}