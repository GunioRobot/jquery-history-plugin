/*
 * jQuery history plugin
 * 
 * sample page: http://www.serpere.info/jquery-history-plugin/samples/
 *
 * Copyright (c) 2006-2009 Taku Sano (Mikage Sawatari)
 * Copyright (c) 2010 Takayuki Miwa
 * Licensed under the MIT License:
 *   http://www.opensource.org/licenses/mit-license.php
 *
 * Modified by Lincoln Cooper to add Safari support and only call the callback once during initialization
 * for msie when no initial hash supplied.
 */

(function($) {
    var locationWrapper = {
        put: function(hash, win) {
            (win || window).location.hash = this.encoder(hash);
        },
        get: function(win) {
            var hash = ((win || window).location.hash).replace(/^#/, '');
            return $.browser.mozilla ? hash : decodeURIComponent(hash);
        },
        encoder: encodeURIComponent
    };

    var iframeWrapper = {
        id: "__jQuery_history",
        init: function() {
            var html = '<iframe id="'+ this.id +'" style="display:none" src="javascript:false;" />';
            $("body").prepend(html);
            return this;
        },
        _document: function() {
            return $("#"+ this.id)[0].contentWindow.document;
        },
        put: function(hash) {
            var doc = this._document();
            doc.open();
            doc.close();
            locationWrapper.put(hash, doc);
        },
        get: function() {
            return locationWrapper.get(this._document());
        }
    };

    function initObjects(options) {
        options = $.extend({
                unescape: false
            }, options || {});

        locationWrapper.encoder = encoder(options.unescape);

        function encoder(unescape_) {
            if(unescape_ === true) {
                return function(hash){ return hash; };
            }
            if(typeof unescape_ == "string" &&
               (unescape_ = partialDecoder(unescape_.split("")))
               || typeof unescape_ == "function") {
                return function(hash) { return unescape_(encodeURIComponent(hash)); };
            }
            return encodeURIComponent;
        }

        function partialDecoder(chars) {
            var re = new RegExp($.map(chars, encodeURIComponent).join("|"), "ig");
            return function(enc) { return enc.replace(re, decodeURIComponent); };
        }
    }

    var implementations = {};

    implementations.base = {
        callback: undefined,
        type: undefined,

        check: function() {},
        load:  function(hash) {},
        init:  function(callback, options) {
            initObjects(options);
            _.callback = callback;
            _._options = options;
            _._init();
        },

        _init: function() {},
        _options: {}
    };

    implementations.timer = {
        _appState: undefined,
        _init: function() {
            var current_hash = locationWrapper.get();
            _._appState = current_hash;
            _.callback(current_hash);
            setInterval(_.check, 100);
        },
        check: function() {
            var current_hash = locationWrapper.get();
            if(current_hash != _._appState) {
                _._appState = current_hash;
                _.callback(current_hash);
            }
        },
        load: function(hash) {
            if(hash != _._appState) {
                locationWrapper.put(hash);
                _._appState = hash;
                _.callback(hash);
            }
        }
    };

    implementations.iframeTimer = {
        _appState: undefined,
        _init: function() {
            var current_hash = locationWrapper.get();
            _._appState = current_hash;
            iframeWrapper.init().put(current_hash);
            _.callback(current_hash);
            setInterval(_.check, 100);
        },
        check: function() {
            var iframe_hash = iframeWrapper.get(),
                location_hash = locationWrapper.get();

            if (location_hash != iframe_hash) {
                if (location_hash == _._appState) {    // user used Back or Forward button
                    _._appState = iframe_hash;
                    locationWrapper.put(iframe_hash);
                    _.callback(iframe_hash); 
                } else {                              // user loaded new bookmark
                    _._appState = location_hash;  
                    iframeWrapper.put(location_hash);
                    _.callback(location_hash);
                }
            }
        },
        load: function(hash) {
            if(hash != _._appState) {
                locationWrapper.put(hash);
                iframeWrapper.put(hash);
                _._appState = hash;
                _.callback(hash);
            }
        }
    };

    implementations.hashchangeEvent = {
        _init: function() {
            _.callback(locationWrapper.get());
            $(window).bind('hashchange', _.check);
        },
        check: function() {
            _.callback(locationWrapper.get());
        },
        load: function(hash) {
            locationWrapper.put(hash);
        }
    };

    var _ = $.extend({}, implementations.base);

    if($.browser.msie && ($.browser.version < 8 || document.documentMode < 8)) {
        _.type = 'iframeTimer';
    } else if("onhashchange" in window) {
        _.type = 'hashchangeEvent';
    } else {
        _.type = 'timer';
    }

    $.extend(_, implementations[_.type]);
    $.history = _;
})(jQuery);
