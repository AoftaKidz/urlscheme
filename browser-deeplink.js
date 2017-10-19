/**
 * browser-deeplink v0.1
 *
 * Author: Hampus Ohlsson, Nov 2014
 * GitHub: http://github.com/hampusohlsson/browser-deeplink
 *
 * MIT License
 */
 
(function (root, factory) {
    if ( typeof define === 'function' && define.amd ) {
        define("deeplink", factory(root));
    } else if ( typeof exports === 'object' ) {
        module.exports = factory(root);
    } else {
        root["deeplink"] = factory(root);
    }
})(window || this, function(root) {
 
    "use strict"

    /**
     * Cannot run without DOM or user-agent
     */
    if (!root.document || !root.navigator) {
        return;
    }

    /**
     * Set up scope variables and settings
     */
    var timeout;
    var settings = {};
    var defaults = {
        iOS: {},
        android: {},
        androidDisabled: false,
        fallback: true,
        fallbackToWeb: false,
        fallbackWebUrl : "",
        delay: 3000,
        delta: 500
    }

    /**
     * Merge defaults with user options
     * @private
     * @param {Object} defaults Default settings
     * @param {Object} options User options
     * @returns {Object} Merged values of defaults and options
     */
    var extend = function(defaults, options) {
        var extended = {};
        for(var key in defaults) {
            extended[key] = defaults[key];
        };
        for(var key in options) {
            extended[key] = options[key];
        };
        return extended;
    };

    /**
     * Generate the app store link for iOS / Apple app store
     *
     * @private
     * @returns {String} App store itms-apps:// link 
     */
    var getStoreURLiOS = function() {
        var baseurl = "itms-apps://itunes.apple.com/app/";
        var name = settings.iOS.appName;
        var id = settings.iOS.appId; 
        return (id && name) ? (baseurl + name + "/id" + id + "?mt=8") : null;
    }

    /**
     * Generate the app store link for Google Play
     *
     * @private
     * @returns {String} Play store https:// link
     */
    var getStoreURLAndroid = function() {
        var baseurl = "market://details?id=";
        var id = settings.android.appId;
        return id ? (baseurl + id) : null;        
    }

    /**
     * Get app store link, depending on the current platform
     *
     * @private
     * @returns {String} url
     */
    var getStoreLink = function() {
        var linkmap = {
            "ios": settings.iOS.storeUrl || getStoreURLiOS(),
            "android": settings.android.storeUrl || getStoreURLAndroid()
        }

        return linkmap[settings.platform];
    }

    /**
     * Get web fallback link, depending on the current platform
     * If none is set, default to current url
     *
     * @private
     * @returns {String} url
     */
    var getWebLink = function() {
        // var linkmap = {
        //     "ios": settings.iOS.fallbackWebUrl || location.href,
        //     "android": settings.android.fallbackWebUrl || location.href
        // }
        return (settings.fallbackWebUrl != "") ? settings.fallbackWebUrl : location.href;
    }

    /**
     * Check if the user-agent is Android
     *
     * @private
     * @returns {Boolean} true/false
     */
    var isAndroid = function() {
        return navigator.userAgent.match('Android');
    }

    /**
     * Check if the user-agent is iPad/iPhone/iPod
     *
     * @private
     * @returns {Boolean} true/false
     */
    var isIOS = function() {
        return navigator.userAgent.match('iPad') || 
               navigator.userAgent.match('iPhone') || 
               navigator.userAgent.match('iPod');
    }

    /**
     * Check if the user is on mobile
     *
     * @private
     * @returns {Boolean} true/false
     */
    var isMobile = function() {
        return isAndroid() || isIOS();
    }

    /**
     * Timeout function that tries to open the fallback link.
     * The fallback link is either the storeUrl for the platofrm
     * or the fallbackWebUrl for the current platform.
     * The time delta comparision is to prevent the app store
     * link from opening at a later point in time. E.g. if the 
     * user has your app installed, opens it, and then returns 
     * to their browser later on.
     *
     * @private
     * @param {Integer} Timestamp when trying to open deeplink
     * @returns {Function} Function to be executed by setTimeout
     */
    var openFallback = function(ts) {
        return function() {
            var link = (settings.fallbackToWeb) ?  getWebLink() : getStoreLink();
            var wait = settings.delay + settings.delta;
            if (typeof link === "string" && (Date.now() - ts) < wait) {
				window.location.href = link;
            }
        }
    }

    /**
     * The setup() function needs to be run before deeplinking can work,
     * as you have to provide the iOS and/or Android settings for your app.
     *
     * @public
     * @param {object} setup options
     */
    var setup = function(options) {
        settings = extend(defaults, options);

        if (isAndroid()) settings.platform = "android";
        if (isIOS()) settings.platform = "ios";
    }

    /**
     * Tries to open your app URI through a hidden iframe.
     *
     * @public
     * @param {String} Deeplink URI
     * @return {Boolean} true, if you're on a mobile device and the link was opened
     */

     function get_browser() {

	    var nAgt = navigator.userAgent;
	    var verOffset,browserName,fullVersion;

	    if ((verOffset=nAgt.indexOf("Chrome"))!=-1) {
			browserName = "Chrome";
			fullVersion = nAgt.substring(verOffset+7,verOffset+9);
		}

	    return {
	      name: browserName,
	      version: fullVersion
	    };
	 }

    var open = function(uri,fallbackWebUrl) {

        if (!isMobile()) {
            return false;
        }

        if (isAndroid() && settings.androidDisabled) {
            return;
        }

        settings.fallbackWebUrl = fallbackWebUrl;
    	var browser = get_browser();

        if(isAndroid() && navigator.userAgent.match(/Chrome/) && browser.version < 40) {
        	return;
        }

        if (isAndroid() && !navigator.userAgent.match(/Firefox/) && !navigator.userAgent.match(/WebView/) ) {
            var matches = uri.match(/([^:]+):\/\/(.+)$/i);
            uri = "intent://" + matches[2] + "#Intent;scheme=" + matches[1];
            uri += ";package=" + settings.android.appId;
            uri += ";S.browser_fallback_url=" + settings.fallbackWebUrl + ";end";
        }

        if (settings.fallback|| settings.fallbackToWeb) {
            //console.log("getWebLink settings.fallbackWebUrl "+settings.fallbackWebUrl);
           timeout = setTimeout(openFallback(Date.now()), settings.delay);
        }

        if (navigator.userAgent.match(/Chrome/)) {
            window.location.href = uri;
        }else{
        	window.location.href = uri;
        }
        
        return true;
    }

    var openWithButton =  function(uri,fallbackWebUrl) {

        if (!isMobile()) {
            return;
        }

        if (isAndroid() && settings.androidDisabled) {
            return;
        }

        settings.fallbackWebUrl = fallbackWebUrl;
        var browser = get_browser();

        if(isAndroid() && navigator.userAgent.match(/Chrome/) && browser.version < 40) {
            window.location.href = fallbackWebUrl;
        }
        else {
            if (isAndroid() && !navigator.userAgent.match(/Firefox/) && !navigator.userAgent.match(/WebView/) ) {
                var matches = uri.match(/([^:]+):\/\/(.+)$/i);
                uri = "intent://" + matches[2] + "#Intent;scheme=" + matches[1];
                uri += ";package=" + settings.android.appId;
                uri += ";S.browser_fallback_url=" + settings.fallbackWebUrl + ";end";
            }

            if (settings.fallback|| settings.fallbackToWeb) {
               timeout = setTimeout(openFallback(Date.now()), settings.delay);
            }

            if (navigator.userAgent.match(/Chrome/)) {
                window.location.href = uri;
            }else{
            	window.location.href = uri;
            }
        }
        
        return true;
    }

    var getLink = function(uri) {
    	if (isAndroid() && !navigator.userAgent.match(/Firefox/) && !navigator.userAgent.match(/WebView/)) {
            var matches = uri.match(/([^:]+):\/\/(.+)$/i);
            uri = "intent://" + matches[2] + "#Intent;scheme=" + matches[1];
            uri += ";package=" + settings.android.appId;
            uri += ";S.browser_fallback_url=" + settings.fallbackWebUrl + ";end";
        }
		return uri;
    }

    // Public API
    return {
        setup: setup,
        open: open,
        openWithButton: openWithButton,
		getLink: getLink
    };

});