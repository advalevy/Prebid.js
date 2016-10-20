var utils = require('../utils.js');
var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');

/**
 * Adapter for requesting bids from Amobee
 */
var AmobeeAdapter = function AmobeeAdapter() {
  
  let iframe;

  // Define the bidder code
  var amobeeBidderCode = 'amobee';

  // Manage the requested and received ad units' codes, to know which are invalid (didn't return)
  //var reqAdUnitsCode = [],
  //    resAdUnitsCode = [];
      
  function _callBids(params) {

    var bidRequests = params.bids || [];

    // Get page data
    //var siteDomain = window.location.host;
    //var sitePage = window.location.href;

    // Go through the requests and build array of impressions
    utils._each(bidRequests, function(bid) {
    	
      //reqAdUnitsCode.push(bid.placementCode);
		
      //create the iframe
      iframe = utils.createInvisibleIframe();
      var elToAppend = document.getElementsByTagName('head')[0];
        
      //insert the iframe into document
      elToAppend.insertBefore(iframe, elToAppend.firstChild);

      var iframeDoc = utils.getIframeDocument(iframe);
      iframeDoc.write(_createRequestContent(bid));
      iframeDoc.close();
   
    });
  }

  function _createRequestContent(bid) {
  
    var domain = bid.params.amobeeDomain || 'http://prebid.aws.amobee.com';
    var adspace = bid.params.as;
    var params = bid.params;
    params.adw = (bid.sizes[0][0] || 0);
    params.adh = (bid.sizes[0][1] || 0);
    params.acc = params.acc || '1000004';
    params.hb_bid_id = bid.bidId;
    params.hb_placement_code = bid.placementCode;
 	
    var content = '<!DOCTYPE html><html><head><base target="_top" /><scr' +
                'ipt>inDapIF=true;</scr' + 'ipt></head>';    
    content += '<body>';
    content += '<scr' + 'ipt type="text/javascript" src=' + domain + '/tag></scr' + 'ipt>';
    content += '<scr' + 'ipt type="text/javascript">';
    content += '' +
        'var amobeeAdRequest = new amobee.adrequest({' +
        'as: \"' + adspace + '\",' + 
        'is_hb: true,' + 
        'parameters: ' +
        JSON.stringify(params) + 		
        ',' +
        'callback: window.parent.$$PREBID_GLOBAL$$.handleAmobeeAdCallback' +  
        '});';
    //      content += 'amobeeAdRequest.start();';
    content += '</scr' + 'ipt>';
    content += '</body></html>';

    return content;
  }

  $$PREBID_GLOBAL$$.handleAmobeeAdCallback = function (adReceived, adRequest, adResponseHeaders, headerBiddingResponse, bidId) {
	
    //var bidObj = utils.getBidRequest(bidId);
    var bidObj = $$PREBID_GLOBAL$$._bidsRequested.find(bidSet => bidSet.bidderCode === amobeeBidderCode).bids
              .find(bid => bid.bidId === bidId);
    var bidObject;

    if (bidObj) {
      if (adReceived && headerBiddingResponse !== null && headerBiddingResponse !== '') {
        var responseJson = JSON.parse(headerBiddingResponse);
        bidObject = bidfactory.createBid(1);
        bidObject.bidderCode = amobeeBidderCode;
        bidObject.cpm = responseJson.bidPrice;
        bidObject.ad = responseJson.adFragment;
        bidObject.width = bidObj.sizes[0][0];
        bidObject.height = bidObj.sizes[0][1];

        // Add the bid
        bidmanager.addBidResponse(bidObj.placementCode, bidObject);
			
      } else {
        // invalid bid response
        bidObject = bidfactory.createBid(2);
        bidObject.bidderCode = amobeeBidderCode;
        bidmanager.addBidResponse(bidObj.placementCode, bidObject);
		
      }	
    }

  };

  return {
    callBids: _callBids,
    createRequestContent: _createRequestContent
  };
};

module.exports = AmobeeAdapter;
