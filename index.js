// Client ID: qfi2ddm26kctaiej2a9f878wdgl7cv

var searchType = "streams";
var currentlyPlaying = null;
var player = null;
var lastSearch = null; // Prevents duplicate search API calls
var lastSearchType = null; // Prevents duplicate search API calls
var numPinnedChannels = 0;

// Configurable
var NUM_RESULTS = 20; // The number of search results to display
var UPDATE_FREQUENCY = 300; // Minimum delay between api calls while typing in search box
var MAX_PIN_COUNT = 1;
var COOKIE_EXPIRATION_DAYS = 7; // Number of days until cookies expire

// Final Global Variables (Do not edit)
var RANDOM = null;
var STREAM = 1;
var CHANNEL = 0;
var KEYCODE_ENTER = 13;
var KEYCODE_ESC = 27;
var updateTimer; // Limits API calls while typing
var BLANK_IMG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

var pinnedChannels = new Array(MAX_PIN_COUNT);

// Booleans
function searchboxIsEmpty() { return $("#searchbox").val() === ""; }
function playing() { return currentlyPlaying !== null; }

// Cookies
function createCookie(name,value,days) {
	if (days) {
		var date = new Date();
		date.setTime(date.getTime()+(days*24*60*60*1000));
		var expires = "; expires="+date.toGMTString();
	}
	else var expires = "";
	document.cookie = name+"="+value+expires+"; path=/";
}

function readCookie(name) {
	var nameEQ = name + "=";
	var ca = document.cookie.split(';');
	for(var i=0;i < ca.length;i++) {
		var c = ca[i];
		while (c.charAt(0)==' ') c = c.substring(1,c.length);
		if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
	}
	return -1;
}

function eraseCookie(name) {
	createCookie(name,"",-1);
}

// Ready Function
$(function() {
  var hasCookies = false;
  var channelsToPin = [];
  for(var i=0;i<MAX_PIN_COUNT; i++) {
    var streamName = readCookie(i);
    if(streamName === -1) { continue; }
    hasCookies = true;
    console.log(streamName);
    var url = getChannelURL(streamName);
    console.log("URL" + url);
    channelsToPin.push($.getJSON(url));
  }
  if(hasCookies) {
   $.when.apply($, channelsToPin).then(function() {
     $("#loading-pins-icon").hide();
     $("#pinned-channels-section").show();
     console.log(arguments.length);
     console.log(arguments[0].length);
     if(arguments[0].constructor === Array) {
      for(var j=0;j<arguments.length;j++) {
        pinChannel(arguments[j][0]);
      }
     }
     else {
       pinChannel(arguments[0]);
     }
   });
  }
  else {
    $("#loading-pins-icon").hide();
    $("#pinned-channels-section").show();
  }
});

$("#searchbychannel").click(function() {
  if(searchType == "channels") {
    $("#searchbox").focus();
    return;
  }
  clearResults();
  searchType = "channels";
  console.log(searchType + "AAAA");
  $("#searchbychannel").addClass("selected");
  $("#searchbystream").removeClass("selected");
  update();
  $("#searchbox").focus();
});
$("#searchbystream").click(function() {
  if(searchType == "streams") {
    $("#searchbox").focus();
    return;
  }
  clearResults();
  searchType = "streams";
  $("#searchbychannel").removeClass("selected");
  $("#searchbystream").addClass("selected");
  update();
  $("#searchbox").focus();
});
$("#searchbox").on("keyup", function(event) {
  switch(event.keyCode) {
    case KEYCODE_ESC:
      $("#collapse-bar").collapse("hide");
      $("#searchbox").blur();
      break;
    default:
      update();
  }
});
$("#searchbox").focusin(function() {
  $("#resultsbox").show();
});
$("#searchbox").click(function() {
  console.log("searchbox clicked");
  $("#resultsbox").show();
});
$("#searchbox").blur(function() {
  if(!$("#resultsbox").is(":focus")) {
    $("#resultsbox").hide();
  }
});

Sortable.create(document.getElementById("pinned-channels"), { animation: 150 });
$('form').submit(function(event){
  event.preventDefault();
});
$("#collapse-bar").on('shown.bs.collapse', function() {
  $("#searchbox").focus();
  $("#resultsbox").show();
  $("#collapseicon").removeClass();
  $("#collapseicon").addClass("fa fa-times");
});
$("#collapse-bar").on('hidden.bs.collapse', function() {
  $("#collapseicon").removeClass();
  $("#collapseicon").addClass("fa fa-search");
});
$("#pin-channel-button").click(function() {
  pinChannel(currentlyPlaying);
});
$("#hide-stream-button").click(function() {
  toggleStream(currentlyPlaying);
});
$("#searchbutton").click(function() {
  console.log("aaa");
  update();
  $("#searchbutton").focus();
  $("#resultsbox").show();
});
$("#searchbutton").blur(function() {
  if(!$("#resultsbox").is(":focus")) {
    $("#resultsbox").hide();
  }
});

function getPinIndex() {
  for(var i=0;i<MAX_PIN_COUNT;i++) {
    if(!pinnedChannels[i]) { return i; }
  }
  return -1; // No more pin slots available
}

function update(instant) {
  if (searchboxIsEmpty()) {
    clearTimeout(updateTimer);
    console.log("EMPTY");
    clearResults();
    lastSearch = "";
    return;
  }
  clearTimeout(updateTimer);
  updateTimer = setTimeout(search, UPDATE_FREQUENCY);
}

function clearResults() {
  lastSearch = "";
  $("#resultsbox").html("");
}

function loadingIcon() {
  console.log("LOADING ICON");
  $("#searchbutton-icon").removeClass();
  $("#searchbutton-icon").addClass("fa fa-spinner fa-pulse");
  $('#searchbutton-icon').css('transform', 'none'); // fix for IE bug
}

function searchIcon() {
  console.log("SEARCH ICON");
  $("#searchbutton-icon").removeClass();
  $("#searchbutton-icon").addClass("fa fa-search");
  $('#searchbutton-icon').css('transform', 'none'); // fix for IE bug
}

function search() {
  var searchTerms = $("#searchbox").val();
  console.log("LAST SEARCH: " + lastSearch);
  console.log("LAST SEARCH TYPE: " + lastSearchType);
  if(searchTerms == lastSearch && searchType == lastSearchType) {
    console.log("duplicate search, no api call");
    $("#resultsbox").show();
    return;
  }
  console.log("SEARCH EXECUTED: '" + searchTerms + "'");
  loadingIcon();
  var url = getSearchURL(searchTerms);
  $.getJSON(url, function(data) {
    console.log("API CALLED: " + url);
    var results;
    if(searchType === "streams") {
      results = data.streams;
    }
    else {
      results = data.channels;
    }
    displaySearchResults(results);
    searchIcon();
    lastSearch = searchTerms;
    lastSearchType = searchType;
  });
  
}

function displaySearchResults(results) {
  console.log("CLEARING RESULTS");
  clearResults();
  if(searchType === "streams") {
    for (var i = 0; i < results.length; i++) {
      displayStreamResult(results[i], i);
    }
    return;
  }
  for (var i = 0; i < results.length; i++) {
    displayChannelResult(results[i], i);
  }
}

function displayStreamResult(result, index) {
  var newResult = "";
  newResult += '<div id="result' + index + '" class="result online" style="color: white;">';
  if(!result.channel.logo) {
    newResult += '<img src="' + BLANK_IMG + '">';
  }
  else {
    newResult += '<img src="' + result.channel.logo + '">';
  }
  newResult += '<span class="result-title">';
  newResult += result.channel.display_name;
  newResult += "</span>";
  newResult += "<p>" + result.viewers + " Viewers | " + result.game + "</p>";
  newResult += "<p>" + result.channel.status + "</p>";
  newResult += "</div>";
  $("#resultsbox").append(newResult);
  $("#result" + index).mousedown(function() {
    console.log("RESULT " + index + " CLICKED!");
    $("#collapse-bar").collapse("hide");
    toggleStream(result.channel);
  });
}
function displayChannelResult(result, index) {
  var newResult = "";
  newResult += '<div id="result' + index + '" class="result online" style="color: white;">';
  if(!result.logo) {
    newResult += '<img src="' + BLANK_IMG + '">';
  }
  else {
    newResult += '<img src="' + result.logo + '">';
  }
  newResult += '<span class="result-title">';
  newResult += result.display_name;
  newResult += "</span>";
  newResult += "<p>" + result.status + "</p>";
  newResult += "</div>";
  $("#resultsbox").append(newResult);
  $("#result" + index).mousedown(function() {
    console.log("RESULT " + index + " CLICKED!");
    $("#collapse-bar").collapse("hide");
    toggleStream(result);
  });
}

function getSearchURL(searchTerms) {
  var firstPart = "https://api.twitch.tv/kraken/search/";
  var lastPart = "&client_id=qfi2ddm26kctaiej2a9f878wdgl7cv";
  return firstPart + searchType + "?q=" + searchTerms + lastPart;
}

function getChannelURL(channelName) {
  var url = "https://api.twitch.tv/kraken/channels/" + channelName;
  url += "?client_id=qfi2ddm26kctaiej2a9f878wdgl7cv";
  return url;
}

function toggleStream(channel) {
  if (channel === currentlyPlaying) {
    console.log("TRUE");
    hidePlayer();
    return;
  }
  showPlayer(channel.name);
  currentlyPlaying = channel;
}

function hidePlayer() {
  $("#player").stop().slideUp("slow");
  $("#player").html("");
  player = null;
  currentlyPlaying = null;
  $("#stream-options").stop().hide("true");
}

function showPlayer(channelName) {
  $("#player").html('<div id="' + channelName + '" class="player"></div>');
  $("html, body").animate({ scrollTop: 0 }, "slow");
  var options = {
    width: 854,
    height: 480,
    channel: channelName,
    theme: "dark",
    layout: "video"
    //video: "{esl_sc2}"
  };
  $("#player").stop().slideDown("slow", function() {
    if(pinnedChannels.indexOf(channelName) === -1) {
      $("#pin-channel-text").show();
    }
    else {
      $("#pin-channel-text").hide();
    }
    $("#stream-options").show(function() {
      player = new Twitch.Embed(channelName, options);
    });
  });
}

function pinChannel(channel) {
  if(!channel) { return; } // Do nothing if no channel is playing
  var pinIndex = getPinIndex();
  if(pinIndex === -1) { // Show alert message if all pin slots are full
    $("#max-pins-alert").remove();
    var alertHTML = generateMaximumPinsAlertHTML();
    $("#stream-options").append(alertHTML);
    $("#max-pins-alert").fadeIn().delay(3000).fadeOut();
    return;
  }
  $("#no-pinned-channels-text").hide();
  $("#pin-channel-text").hide();
  var result = '<div id="stream' + pinIndex + '" class="card col-4 col-sm-3 col-lg-2">';
  result += '<button id="remove-pin-' + pinIndex + '" class="btn btn-danger btn-sm ml-auto" style="text-align:center;max-width: 28px">X</button>';
  if(!channel.logo) {
    result += '<img class="card-img-top mx-auto" src="' + BLANK_IMG + '">';
  }
  else {
    result += '<img class="card-img-top mx-auto" src="' + channel.logo + '">';
  }
  result += '<div class="card-block">';
  result += '<h4 class="card-title">' + channel.display_name + '</h4>';
  result += '<p class="card-status online">Now Streaming</p>';
  result += '<p class="card-game">' + channel.game + '</p>';
  result += '</div></div>';
  $("#pinned-channels").append(result);
  $("#stream" + pinIndex).click(function() {
    toggleStream(channel);
    console.log("toggling " + channel.name);
  });
  $("#remove-pin-" + pinIndex).click(function(e) {
    e.stopPropagation();
    unpinChannel(pinIndex, channel.name);
  });
  pinnedChannels[pinIndex] = channel.name;
  createCookie(pinIndex,channel.name,COOKIE_EXPIRATION_DAYS);
  numPinnedChannels++;
}

function unpinChannel(pinIndex, channelName) {
  console.log("unpinning channel");
  $("#stream" + pinIndex).remove();
  if(playing() && currentlyPlaying.name === channelName) {
    $("#pin-channel-text").show();
  }
  console.log(numPinnedChannels);
  if(numPinnedChannels <= 1) {
    $("#no-pinned-channels-text").fadeIn();
  }
  for(let i=pinIndex;i<numPinnedChannels-1;i++) {
    pinnedChannels[i] = pinnedChannels[i+1];
    $("#stream" + (i+1)).prop("id", "stream" + i);
    $("#remove-pin-" + (i+1)).prop("id", "remove-pin-" + i);
    $("#remove-pin-" + i).off('click');
    $("#remove-pin-" + i).click(function(e) {
      e.stopPropagation();
      console.log("removing channel " + pinnedChannels[i] + " at index " + i);
    console.log(pinnedChannels);
      unpinChannel(i, pinnedChannels[i]);
    });
    eraseCookie(i);
    createCookie(i, readCookie(i+1), COOKIE_EXPIRATION_DAYS);
  }
  pinnedChannels[numPinnedChannels-1] = null;
  eraseCookie(numPinnedChannels-1);
  numPinnedChannels--;
}

function generateMaximumPinsAlertHTML() {
  var result = '<div id="max-pins-alert" class="alert alert-danger" style="display:none;position:absolute;margin-top:-18px;left:0;right:0;margin-left: auto;margin-right:auto;z-index:2;" role="alert">';
  var channelText = ((MAX_PIN_COUNT === 1) ? " channel" : " channels");
  result += 'You can only pin ' + MAX_PIN_COUNT + channelText + '.  Remove one to make room for this.';
  result += '</div>';
  return result;
}