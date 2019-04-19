// Constants
const RANDOM = null;
const STREAM = 1;
const CHANNEL = 0;
const KEYCODE_ENTER = 13;
const KEYCODE_ESC = 27;
const BLANK_IMG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

// Global Variables
var searchType = STREAM; 
var currentlyPlaying = null; // Object for currently playing channel
var player = null; // Twitch video player object
var numPinnedChannels = 0;
var searchHistory = new SearchList();
var updateTimer; // Limits API calls while typing
var pinnedChannels = new Array(MAX_PIN_COUNT);

// Configurable Variables
var NUM_RESULTS = 20; // The max number of search results to display (TODO: This is not implemented yet)
var UPDATE_FREQUENCY = 300; // Minimum delay between api calls while typing in search box
var MAX_PIN_COUNT = 8; // Maximum number of pinned channels (TODO: currently hard-coded in class definition)
var COOKIE_EXPIRATION_DAYS = 2; // Number of days until cookies expire
var SEARCHES_TO_CACHE = 10; // Cache this many past searches

// Boolean Functions (TODO: Make these methods of an object)
function searchboxIsEmpty() { return $("#searchbox").val() === ""; }
function streamIsPlaying() { return currentlyPlaying !== null; }

// Ready function
$(function() {
  processCookies();
});

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
	for(let i=0;i < ca.length;i++) {
		var c = ca[i];
		while (c.charAt(0)==' ') c = c.substring(1,c.length);
		if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
	}
	return -1;
}

function eraseCookie(name) {
	createCookie(name,"",-1);
}

function processCookies() {
  var channelObjectsFromCookies = [];
  var hasCookies = false;
  for(let i=0;i<MAX_PIN_COUNT; i++) {
    var channelName = readCookie(i);
    if(channelName === -1) continue; // if cookie data === -1, then cookie was erased, skip it.
    hasCookies = true;
    console.log("READ COOKIE: " + channelName);
    var url = getChannelURL(channelName);
    console.log("A: " + url);
    channelObjectsFromCookies.push($.getJSON(url));
  }
  if(!hasCookies) {
    displayPinnedChannels();
    return -1;
  }
  $.when.apply($, channelObjectsFromCookies).then(function() {
    displayPinnedChannels();
     if(arguments[0].constructor !== Array) {
       pinChannel(arguments[0]);
       return 1;
     }
     for(let i=0;i<arguments.length;i++) {
       pinChannel(arguments[i][0]);
     }
   });
}

function displayPinnedChannels() {
  $("#loading-pins-icon").hide();
  $("#pinned-channels-section").show();
}

// Event Listeners
$("#searchbychannel").click(function() {
  $("#searchbox").focus();
  if(searchType === CHANNEL) return;
  clearResults();
  searchType = CHANNEL;
  $("#searchbychannel").addClass("selected");
  $("#searchbystream").removeClass("selected");
  update();
  $("#searchbox").focus();
});
$("#searchbystream").click(function() {
  $("#searchbox").focus();
  if(searchType === STREAM) return;
  clearResults();
  searchType = STREAM;
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

Sortable.create(document.getElementById("pinned-channels"));
$('form').submit(function(evt){
  evt.preventDefault();
});

function getPinIndex() {
  for(let i=0;i<MAX_PIN_COUNT;i++) {
    if(!pinnedChannels[i]) { return i; }
  }
  return -1; // No more pin slots available
}

function update() {
  if(searchboxIsEmpty()) {
    clearTimeout(updateTimer);
    clearResults();
    return;
  }
  clearTimeout(updateTimer);
  var newSearch = generateSearchObject();
  var cachedSearchIndex = searchHistory.indexOf(newSearch);
  if(cachedSearchIndex !== -1)
    search(cachedSearchIndex);
  else
    updateTimer = setTimeout(search, UPDATE_FREQUENCY, cachedSearchIndex);
}

function generateSearchObject() {
  return new Search(searchType, $("#searchbox").val());
}

function clearResults() {
  $("#resultsbox").html("");
}

function loadingIcon() {
  $("#searchbutton-icon").removeClass();
  $("#searchbutton-icon").addClass("fa fa-spinner fa-pulse");
  $('#searchbutton-icon').css('transform', 'none'); // fix for IE bug
}

function searchIcon() {
  $("#searchbutton-icon").removeClass();
  $("#searchbutton-icon").addClass("fa fa-search");
  $('#searchbutton-icon').css('transform', 'none'); // fix for IE bug
}

function search(cachedSearchIndex) {
  if(cachedSearchIndex !== -1) {
    var cachedSearch = searchHistory.get(cachedSearchIndex);
    $("#resultsbox").html(cachedSearch.generateResultsHTML());
    cachedSearch.attachActionListeners();
    return;
  }
  var newSearch = generateSearchObject();
  loadingIcon();
  newSearch.executeSearch().then(function() {
    $("#resultsbox").html(newSearch.generateResultsHTML());
    newSearch.attachActionListeners();
    searchHistory.add(newSearch);
    searchIcon();
  });
}

function getChannelURL(channelName) {
  var url = "https://api.twitch.tv/kraken/channels/" + channelName;
  url += "?client_id=qfi2ddm26kctaiej2a9f878wdgl7cv";
  return url;
}

function toggleStream(channel) {
  if (channel === currentlyPlaying) {
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
  result += channel.isLive ? '<p class="card-status online">Now Streaming</p>' : '<p class="card-status offline">Offline</p>'
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
  if(streamIsPlaying() && currentlyPlaying.name === channelName) {
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