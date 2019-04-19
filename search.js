// Search Object
class Search {
  constructor(searchBy, searchTerms) {
    this.searchBy = searchBy;
    this.searchTerms = searchTerms;
    this.results = [];
    this.executed = false;
  }
  
  searchTypeAsString() {
    return (this.searchBy === STREAM) ? "streams" : "channels";
  }
  
  executeSearch() {
    return new Promise(function (resolve, reject) {
      var url = this.getSearchURL(this.searchTerms);
      $.getJSON(url, function(data) {
        console.log("api called " + url);
        if(this.searchBy === STREAM) {
          data.streams.forEach(function(stream) {
            var channel = stream.channel;
            channel.isLive = true;
            channel.viewers = stream.viewers;
            this.results.push(channel);
          }.bind(this));
        }
        else {
          this.results = data.channels;
        }
        this.executed = true;
        resolve();
      }.bind(this));
    }.bind(this));
  }
  
  getSearchURL() {
    var firstPart = "https://api.twitch.tv/kraken/search/";
    var lastPart = "&client_id=qfi2ddm26kctaiej2a9f878wdgl7cv";
    return firstPart + this.searchTypeAsString() + "?q=" + this.searchTerms + lastPart;
  }
  
  equals(otherSearch) {
    return (this.searchTerms === otherSearch.searchTerms && this.searchBy === otherSearch.searchBy);
  }
  
  generateResultsHTML() {
    if(!this.executed) { console.error("Error: this.executed is false. Make sure to use .then() after executeSearch()"); return -1; }
    if(!this.results) { console.error("Error: this.executed flag was true but this.results is null"); return -1; }
    var generatedHTML = "";
    var ind = 0;
    this.results.forEach(function(result) {
      var logo = result.logo;
      var displayName = result.display_name;
      var status = result.status;
      var viewers = result.viewers;
      var game = result.game;
      var newResult = '<div id="result' + ind + '" class="result online" style="color: white;">';
      newResult += logo ? '<img src="' + logo + '">' : '<img src="' + BLANK_IMG + '">';
      newResult += '<span class="result-title">' + displayName + '</span>';
      newResult += "<p>";
      newResult += viewers ? viewers + ' Viewers | ' : '';
      newResult += game + "</p>";
      newResult += "<p>" + status + "</p>";
      newResult += "</div>";
      ind++;
      generatedHTML += newResult;
    }.bind(this));
    return generatedHTML;
  }
  
  attachActionListeners() {
    for(let i=0;i<this.results.length;i++) {
      $("#result" + i).mousedown(function() {
        $("#collapse-bar").collapse("hide");
        toggleStream(this.results[i]);
      }.bind(this));
    }
  }
}

// SearchList Object
class SearchList {
  constructor() {
    this.data = [];
  }
  
  indexOf(search) {
    for(let i=0;i<this.data.length;i++)
      if(this.data[i].equals(search))
        return i;
    return -1;
  }
  
  contains(search) {
    return this.indexOf(search) !== -1;
  }
  
  isFull() {
    return this.length >= SEARCHES_TO_CACHE;
  }
  
  isEmpty() {
    return this.length === 0;
  }
  
  clear() {
    this.data = [];
  }
  
  add(search) {
    this.isFull() && this.data.shift(); // Remove first element if list is full
    this.data.push(search);
  }
  
  get(ind) {
    return this.data[ind];
  }
  
}

class PinList {
  constructor() {
    this.channels = [];
  }
  
  getNextAvailableIndex() {
    for(let i=0;i<8;i++)
      if(!this.channels[i])
        return i;
    return -1; // No more pin slots available
  }
  
  indexOf(channel) {
    return this.channels.indexOf(channel);
  }
  
  add(channel) {
    if(typeof channel == 'string') {
      channel = this.getChannelFromName(channel);
    }
    else if(channel.stream_type) {
      // We are looking at a stream object
    }
    if(!channel) { return -1; } // Check if channel name is null/undefined
    var ind = this.getNextAvailableIndex();
    if(ind === -1) { return -2; } // Check if there are any pin slots available
    this.channels[ind] = channel;
    
    // Add Cookie
  }
  
  // PRIVATE METHODS:
  getChannelFromName(channelName) {
    return new Promise(function (resolve, reject) {
      var channel;
      var url = this.getStreamURL(channelName); // https://api.twitch.tv/kraken/streams/amazhs?client_id=qfi2ddm26kctaiej2a9f878wdgl7cv
      $.getJSON(url, function(data) {
        console.log("api called in getChannelFromName " + url);
        if(data.stream) {
          // Channel is online
          channel = data.stream.channel;
          channel.isLive = true;
          channel.viewers = data.stream.viewers;
          resolve(channel);
        }
        // Channel is offline OR does not exist
        var url = this.getChannelURL(channelName);
        $.getJSON(url, function(data) {
          if(data.error) { 
            console.error("ERROR: Channel does not exist - current implementation SHOULD not allow this to ever happen.");
            reject();
          }
          else {
            channel = data;
            channel.isLive = false;
            resolve(channel);
          }
        });
      }.bind(this));
    }.bind(this));
  }
  
  getChannelURL(channelName) {
    
  }
  
  appendToDom(ind, channel) {
    var result = '<div id="stream' + ind + '" class="card col-4 col-sm-3 col-lg-2">';
    result += '<button id="remove-pin-' + ind + '" class="btn btn-danger btn-sm ml-auto" style="text-align:center;max-width: 28px">X</button>';
    result += '<img class="card-img-top mx-auto" src="'
    result += channel.logo ? channel.logo : BLANK_IMG;
    result += '">';
    result += '<div class="card-block">';
    result += '<h4 class="card-title">' + channel.display_name + '</h4>';
    result += channel.isLive ? '<p class="card-status online">Now Streaming</p>' : '<p class="card-status offline">Offline</p>'
    result += '<p class="card-game">' + channel.game + '</p>';
    result += '</div></div>';
    $("#pinned-channels").append(result);
    $("#stream" + ind).click(function() { toggleStream(channel); });
    $("#remove-pin-" + ind).click(function(e) {
      e.stopPropagation();
      this.remove(ind, channel.name);
    }.bind(this));
  }
  
  /*isFull() {
    return this.channels.length >= MAX_PINNED_CHANNELS;
  }*/
  
  
}