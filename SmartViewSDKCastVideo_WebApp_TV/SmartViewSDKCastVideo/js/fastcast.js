/**
 * @file FastCast
 * @author Pawel Pruszkowski (p.pruszkowski@samsung.com)
 * @date 2016-03-03
 * @copyright Copyright (c) 2015 Samsung Electronics, Visual Display Division. All Rights Reserved.
 * @description The FastCast module defines an api over Samsung MultiScreen 2.0 protocol.
 * @version 1.5.2
 */

/**
 * @module FastCast
 */
var FastCast = (function(){

    var channel = null,
        ownName = "TV",
        eventBus = null,
        tvKeys = {
            "ArrowDown": 40,
            "ArrowUp": 38,
            "ArrowLeft": 37,
            "ArrowRight": 39,
            "Enter": 13
        },
        videoId = -1,
        clientCallbacks = {},
        maxClients = 2,
        forbiddenClients = [],
        allowingAllClients = false,
        nativeVolumeHandled = true,
        eventCallbacks = {
            "keydown": onKeydown,
            "seek": onSeek,
            "volume": onVolume,
            "play": onPlay,
            "reclaim": onReclaim
        },
        errors = [
            {
                message: "Not connected",
                code: 500
            }, {
                message: "Seek failed",
                code: 500
            }, {
                message: "No such stream",
                code: 404
            }, {
                message: "General error",
                code: 9999
            }
        ],
        debug = false,

    //************************************************************************//
        FCLog = (function () {
            var $div = null,
                CHANNEL_NAME = '',
                id = 'multiScreenLogs',
                logsClass = 'logs',
                logIndicator = null,
                bgcolor,
                textcolor;
        
            function chooseTheme(isDark) {
                var colors = {
                        light: {
                            background: 'rgba(255,255,255,0.5)',
                            text: '#000'
                        }, 
                        dark: {
                            background: 'rgba(0, 0, 0, 0.5)',
                            text: '#fff'
                        }
                    };

                if (isDark) {
                    bgcolor = colors.dark.background;
                    textcolor = colors.dark.text;
                } else {
                    bgcolor = colors.light.background;
                    textcolor = colors.light.text;
                }
            }
            function createLogsDiv() {
                var childDiv,
                    appDiv,
                    config,
                    header;
        
                // parent container
                if ($div === null) {
                    $div = document.createElement("div");
                    $div.id = id;
                }
        
                /* app info container */
                appDiv = document.createElement('div');
        
                config = [
                        'CHANNEL NAME: "' + CHANNEL_NAME + '"',
                        'APP ID: "' + (tizen ? tizen.application.getAppInfo().id  : '') + '"'
                ];
                appDiv.innerHTML = config.join('<br/>');
                /* header */
                header = document.createElement('h1');
                header.innerHTML = 'Logs:';
                /* container */
                childDiv = document.createElement('div');
                childDiv.className = logsClass;
                $div.appendChild(appDiv);
                $div.appendChild(header);
                $div.appendChild(childDiv);
                document.body.appendChild($div);
        
                logIndicator = document.getElementById(id).getElementsByClassName(logsClass)[0];
                addStyles();
            }
        
            function addStyles () {
                var style = document.createElement('style');
                style.type = 'text/css';
                style.innerHTML = [
                        '#' + id,
                    ' {',
                    'position: absolute;',
                    'width: 50%;',
                    'height: 75%;',
                    'z-index: 9999;',
                    'background-color: ' + bgcolor + ';',
                    'border-radius: 1em;',
                    'left: 0;',
                    'right: 0;',
                    'top: 0;',
                    'bottom: 0;',
                    'margin: auto;',
                    'color: ' + textcolor + ';',
                    'padding: 10px;',
                    'font-size: 14px;',
                    'font-family: arial;',
                    'display: none;',
                    '}' ,
                        '#' + id,
                    ' h1 {',
                    'color: ' + textcolor + ';',
                    'font-size: 16px;',
                    'margin: 5px',
                    '}',
                        '#' + id,
                    ' .logs {',
                    'overflow-y: scroll;',
                    'padding: 4px 7px;',
                    'margin-top: 10px;',
                    'border: 1px solid #ccc;',
                    'height: 350px;',
                    '}'
                ].join('');
                document.getElementsByTagName('head')[0].appendChild(style);
            }
            
            function toggle(visible) {
                if (visible) {
                    $div.style.display = 'block';
                } else {
                    $div.style.display = 'none';
                }
            }
        
            return {
                log: function (html, error) {
                    var line,
                        addedHtml;

                    if (!debug) {
                        return;
                    }
        
                    if (logIndicator) {
                        html = '[' +  (new Date()).toTimeString().substring(0, 8) + '] ' + html;
                        line = error ? '<span style="color: #f00;">' + html + '</span>' : html;
        
                        addedHtml = logIndicator.innerHTML;
                        logIndicator.innerHTML = line + '<br/>' + addedHtml;
                        //logIndicator.scrollTop = logIndicator.offsetHeight;
                    } else {
                        createLogsDiv();
                        this.log(html, error);
                    }
                },
        
                init: function (channel_name, isDark) {
                    CHANNEL_NAME = channel_name;
                    chooseTheme(isDark);
                    $div = document.createElement("div");
                    $div.id = id;
                },
                hide: function () {
                    toggle(false);
                },
                show: function () {
                    toggle(true);
                }
            }
        })();
    //Milestone 1  end remove
    //************************************************************************//

    function onDebug() {
        debug = true;
        FCLog.show();
    }

    function offDebug() {
        debug = false;
        FCLog.hide();
    }

    /**
     * Broadcasts an error message to other clients connected to the channel.
     * Predefined error types are: FastCast.error.NOT_CONNECTED, FastCast.error.NO_SUCH_STREAM, FastCast.error.SEEK_FAILED.
     * @func error
     * @memberof module:FastCast
     * @private
     * @param {string|number|object} type - custom message string or predefined error type or error object
     * @returns {undefined}
     */
    function error(type) {
            var payload;
            if (typeof type === "string") {
                payload = {message:type,code:9998};
            } else if (typeof type === "number") {
                if (type >= errors.length) {
                    type = errors.length - 1;
                }
                payload = {message: errors[type].message, code: errors[type].code};
            } else {
                payload = type;
            }
            send("error", payload);
    }
    
    error.NOT_CONNECTED = 0;
    error.SEEK_FAILED = 1;
    error.NO_SUCH_STREAM = 2;

    tizen.tvinputdevice.getSupportedKeys().forEach(function(el){
        tvKeys[el.name] = el.code;
    });

    /**
     * Dispatches keydown event.
     * @func sendKeydownEvent
     * @memberof module:FastCast
     * @private
     * @param {number} keyCode - key code
     * @returns {undefined}
     */
    function sendKeydownEvent(keyCode) {
        // magic happens here. don't change anything, please.
        var eventObj = document.createEventObject ?
            document.createEventObject() : document.createEvent("Events"),
            el = null;
        
        if (eventBus !== null) {
            el = eventBus;
        } else {
            el = document.activeElement;
        }
        
        if (eventObj.initEvent){
            eventObj.initEvent("keydown", true, true);
        }

        eventObj.keyCode = keyCode;
        eventObj.which = keyCode;

        el.dispatchEvent ? el.dispatchEvent(eventObj) : el.fireEvent("onkeydown", eventObj);
    }

    /**
     * Verifies if particular client is allowed to connect to the channel.
     * It is impossible to establish connection if maximum clients number is reached.
     * @func isClientAllowed
     * @memberof module:FastCast
     * @private
     * @param {Object} client - client data
     * @param {number} client.id - client id
     * @returns {boolean}
     */
    function isClientAllowed(client) {
        if (forbiddenClients.indexOf(client.id) < 0) {
            return true;
        }
        return false;
    }

    /**
     * Checks if there are any client devices connected. Doesn't give
     * any information about number of connected clients though.
     * @func isClientConnected
     * @memberof module:FastCast
     * @private
     * @returns {boolean}
     */
    function isClientConnected() {
        return channel && channel.clients && channel.clients.length > 1;
    }

    /**
     * Channel connect handler.
     * Broadcasts clientConnect event message to every client except TV app.
     * @func onChannelConnect
     * @memberof module:FastCast
     * @private
     * @param {Object} [err] - error object
     * @returns {undefined}
     */
    function onChannelConnect (err) {
        var clients, client;
        if (err) {
            console.error("Error initializing FastCast!");
            return;
        }
        clients = channel.clients.slice();
        while (clients.length > 0) {
            client = clients.shift();
            if (client.isHost) {
                continue;
            }
            channel.emit("clientConnect", client);
        }
    }

    /**
     * Client disconnect from channel handler.
     * @func onClientDisconnect
     * @memberof module:FastCast
     * @private
     * @param {Object} client - client data
     * @returns {undefined}
     */
    function onClientDisconnect (client) {
        FCLog.log('Client disconnected: ' + client.id);
        if (channel.clients.length <= maxClients) {
            //console.debug('clearing forbiddenClients!', channel.clients.length, maxClients);
            forbiddenClients = [];
        }
        if (typeof clientCallbacks["disconnect"] === "function") {
            clientCallbacks["disconnect"](client);
        }
    }

    /**
     * Client connect to channel handler.
     * Raises an error if client number limit is exceeded.
     * Otherwise executes client's connect handler.
     * @func onClientConnect
     * @memberof module:FastCast
     * @private
     * @param {Object} client - client data
     * @param {number} client.id - client id
     * @returns {undefined}
     */
    function onClientConnect (client) {
        var i;

        send("ready", client.id);
        FCLog.log('New client connected: ' + client.id);

        if (channel.clients.length > maxClients) {
            // deny access
            raiseError(403, client.id);
            // mark this client as unwanted
            forbiddenClients.push(client.id);
        } else {
            // if this client was denied access before, now it can
            // be granted one, because the limit is not reached at the moment
            i = forbiddenClients.indexOf(client.id);
            if (i > -1) {
                forbiddenClients.splice(i, 1);
            }

            // firing application callback for client, if there is one
            if (typeof clientCallbacks["connect"] === "function") {
                clientCallbacks["connect"](client);
            }
        }
    }

    /**
     * TV connect to channel handler.
     * @func onConnect
     * @memberof module:FastCast
     * @private
     * @returns {undefined}
     */
    function onConnect () {
        //console.debug('TV connected', arguments);
    }

    /**
     * TV disconnect from channel  handler.
     * @func onDisconnect
     * @memberof module:FastCast
     * @private
     * @returns {undefined}
     */
    function onDisconnect () {
        // we can't do much, we're already disconnected
        //console.debug('TV disconnected', arguments);
    }

    /**
     * Channel keydown message handler.
     * Dispatches keydown event.
     * @func onKeydown
     * @memberof module:FastCast
     * @private
     * @param {Object} parsed - parsed JSON data
     * @param {string|number} parsed.keycode - name or code of the key
     * @returns {undefined}
     */
    function onKeydown(parsed) {
        if (parsed.keycode) {
            FCLog.log('keydown event received: ' + parsed.keycode);
            if (tvKeys[parsed.keycode]) {
                keycode = tvKeys[parsed.keycode];
            } else if (typeof parsed.keycode === "number") {
                keycode = parsed.keycode;
            }
            sendKeydownEvent(keycode);
        }
    }

    /**
     * Channel volume message handler.
     * Dispatches ms2:volume event to be handled in application.
     * @func onVolume
     * @memberof module:FastCast
     * @private
     * @param {Object} parsed - parsed JSON data
     * @param {number} parsed.value - volume level
     * @returns {undefined}
     */
    function onVolume(parsed) {
        var volume,
            isMute;

        if (!nativeVolumeHandled) {
            return;
        }

        volume =  parseInt(parsed.value, 10);

        if (!isNaN(volume)) {
            if (volume < 0) {
                isMute = true;
            } else {
                isMute = false;
            }
            volume = Math.abs(volume);
            tizen.tvaudiocontrol.setVolume(volume);
            tizen.tvaudiocontrol.setMute(isMute);
            event = new CustomEvent("ms2:volume", {detail:{ volume: volume, isMute: isMute }});
            document.dispatchEvent(event);
            FCLog.log('VOLUME event received: volume: ' + volume + ', isMute: ' + isMute);
        }
    }

    /**
     * Channel seek message handler.
     * Dispatches ms2:seek event to be handled in application.
     * @func onSeek
     * @memberof module:FastCast
     * @private
     * @param {Object} parsed - parsed JSON data
     * @param {number} parsed.position - playback starting position in miliseconds
     * @returns {undefined}
     */
    function onSeek(parsed) {
        var event = null;
        if (parsed.position) {
            event = new CustomEvent("ms2:seek", {detail:{position:parsed.position}});
            document.dispatchEvent(event);
            FCLog.log('SEEK event received: position: ' + parsed.position);
        }
    }

    /**
     * Channel play message handler.
     * Dispatches ms2:play event to be handled in application.
     * @func onPlay
     * @memberof module:FastCast
     * @private
     * @param {Object} parsed - parsed JSON data
     * @param {number} parsed.videoId - video id
     * @param {number} parsed.position - playback starting position in miliseconds
     * @param {Object} parsed.data - other data to be passed from client
     * @returns {undefined}
     */
    function onPlay(parsed) {
        var event = null, detail = null;
        if (parsed.videoId) {
            videoId = parsed.videoId;
            detail = {
                videoId:  parsed.videoId,
                position: parsed.position
            };
            if (parsed.data) {
                detail.data = parsed.data;
            }
            event = new CustomEvent("ms2:play", {detail:detail});
            document.dispatchEvent(event);
            try {
                FCLog.log('PLAY event received: ' + JSON.stringify(detail));
            } catch (e) {
                FCLog.log('PLAY event received.');
            }
        }
    }

    /**
     * Channel reclaim message handler.
     * Dispatches ms2:reclaim event to be handled in application.
     * @func onReclaim
     * @memberof module:FastCast
     * @private
     * @returns {undefined}
     */
    function onReclaim(parsed) {
        var event = new CustomEvent("ms2:reclaim");
        document.dispatchEvent(event);
        try {
            FCLog.log('RECLAIM event received: ' + JSON.stringify(parsed));
        } catch (e) {
            FCLog.log('RECLAIM event received.');
        }
    }

    /**
     * Emits error message to particular client.
     * @func raiseError
     * @memberof module:FastCast
     * @private
     * @param {number} code - error code
     * @param {number} clientId - error message recipient id
     * @returns {undefined}
     */
    function raiseError(code, clientId) {
        // send error message to client
        var messages = {
            403: "Access denied",
            500: "Internal error"
        };
        send("error", {message: messages[code], code: code}, clientId);
    }

    /**
     * Defines a function with event param in closure.
     * @func dispatch
     * @memberof module:FastCast
     * @private
     * @param {string} event - event name
     * @returns {function} anonymous function - executes event handler if conditions are fulfilled.
     */
    function dispatch(event) {
        return function (obj, client) {
            var parsed = null;
            if (typeof eventCallbacks[event] !== "function") {
                raiseError(500, client.id);
                return false;
            }
            if (!isClientAllowed(client) && !allowingAllClients) {
                raiseError(403, client.id);
                return false;
            }
            if (typeof obj === "string") {
                try {
                    parsed = JSON.parse(obj);
                } catch (e) {
                    //console.error("JSON.parse exception", e);
                }
            } else {
                parsed = obj;
            }
            eventCallbacks[event](parsed);
        };
    }

    /**
     * Connects device to the channel, so it can exchange messages with other devices.
     * Registers protocol-defined messages (keydown, play, reclaim, seek, volume)
     * so that channel message will dispatch a proper event (ms2:keydown, ms2:play, ms2:reclaim, ms2:seek, ms2:volume) to be handled in the application.
     * Registers generic event (connect, disconnect, clientConnect, clientDisconnect) handlers.
     * Registers visibilityChange event callback to emit a proper message (suspend, restore) when tv application goes to and from the background.
     * @func connect
     * @memberof module:FastCast
     * @private
     * @param {Object} [prop] - any attributes associated with the client
     * @param {number} [maximumClients] - maximum number of simultaneously connected clients
     * @returns {undefined}
     * @example
     * FastCast.connect({ name: "TV" });
     */
    function connect(prop, maximumClients) {
        var options = {name:ownName};

        if (typeof prop === "object") {
            options = prop;
            if (!options.name) {
                options.name = ownName;
            }
        } else if (typeof prop === "number") {
            maximumClients = prop;
        }

        if (typeof maximumClients === "number") {
            if (maximumClients < 0) {
                allowingAllClients = true;
            } else {
                maxClients = maximumClients + 1;
            }
        }
        
        if (options.debug) {
            onDebug();
        }

        // protocol-defined events
        channel.on("keydown", dispatch("keydown"));
        channel.on("seek", dispatch("seek"));
        channel.on("volume", dispatch("volume"));
        channel.on("play", dispatch("play"));
        channel.on("reclaim", dispatch("reclaim"));

        // generic events
        channel.on("clientConnect", onClientConnect);
        channel.on("clientDisconnect", onClientDisconnect);
        channel.on("connect", onConnect);
        channel.on("disconnect", onDisconnect);
        
        // secret, internal events
        channel.on("debugOn", onDebug);
        channel.on("debugOff", offDebug);

        // actual connection
        channel.connect(options, onChannelConnect);
        // wire up visibilitychange event handling
        onVisibilityChangeHandle();
    }

    /**
     * Sets visibility change event handler.
     * @func onVisibilityChangeHandle
     * @memberof module:FastCast
     * @private
     * @returns {undefined}
     */
    function onVisibilityChangeHandle() {
        document.addEventListener("visibilitychange", function(){
            if (document.hidden) {
                send("suspend");
            } else {
                send("restore");
            }
        });
    }

    /**
     * Returns handler registered to the event.
     * @func setCallback
     * @memberof module:FastCast
     * @private
     * @param {string} event - event name
     * @returns {function}
     */
    function setCallback(event) {
        return function(callback) {
            clientCallbacks[event] = callback;
        }
    }

    /**
     * Initializes FastCast. Expects 3 arguments: channel name, event bus
     * object and a callback function. Channel name is required. If event bus
     * is not provided, events are fired on document.activeElement. Callback
     * function is optional. If provided, does not receive any arguments.
     * @method init
     * @memberof module:FastCast
     * @access private
     * @param {string} chanName - name of FastCast channel
     * @param {Object} [eb = null] - event bus object
     * @param {function} [callback] - function to be called after initialization
     * @returns {undefined}
     */
    function init(chanName, eb, callback, themeDark) {
        if (typeof msf === "undefined") {
            console.error("FastCast framework not loaded!");
            return;
        }
        if (channel && channel.isConnected) {
            return;
        }
        if (!chanName || typeof chanName !== "string") {
            console.error("Channel name MUST be provided and MUST be a string!");
            return;
        }
        try {
            tizen.tvaudiocontrol.getVolume();
        } catch (e) {
            nativeVolumeHandled = false;
        }
        if (typeof eb === "function") {
            callback = eb;
            eb = null;
        }
        eventBus = eb;
        msf.local(function(err, service){
            if (err) {
                console.error("FastCast initialization failed:", err);
                return;
            }
            channel = service.channel(chanName);
            FCLog.init(chanName, themeDark);
            if (typeof callback === "function") {
                callback();
            }
        });
    }

    /**
     * Disconnects device from recent channel.
     * @method deinit
     * @memberof module:FastCast
     * @private
     * @returns {undefined}
     */
    function deinit() {
        channel.disconnect();
        channel = null;
    }

    /**
     * Sends a custom event message to other client connected to the channel.
     * By default message is broadcasted to all other clients.
     * This is a proxy function for Channel object's <code>publish</code> method.
     * @func send
     * @memberof module:FastCast
     * @private
     * @param {string} event - name of event to be sent
     * @param {*} [data] - data to be sent with event
     * @param {string} [clientId] - id of a client who will receive message
     * @param {blob|arrayBuffer} [payload] - any binary data to be sent
     * @returns {undefined}
     * @example
     * //Emits FastCast play message with video parameters
     * send("play", JSON.stringify({videoId:videoId,position:position}));
     *
     * @example
     * //Emits user's custom message
     * send("myChannelMsg");
     */
    function send() {
        channel.publish.apply(channel, arguments);
    }

    /**
     * Broadcasts play message that can be received by other clients connected to the channel.
     * @func play
     * @memberof module:FastCast
     * @private
     * @param {number} vid - video id
     * @param {number} position - playback starting position in miliseconds
     * @param {mixed} data (optional) - any other data to send to client
     * @returns {undefined}
     */
    function play(vid, position, data) {
        var castParams = null;
        if (typeof position !== "number") {
            if (typeof position === "object") {
                data = position;
            }
            position = webapis.avplay.getCurrentTime();
        }
        if (typeof vid === "object") {
            data = vid;
            vid = videoId;
        } else if (!vid) {
            vid = videoId;
        }
        castParams = {videoId:vid,position:position};
        if (data) {
            castParams.data = data;
        }
        send("play", castParams);
    }

    /**
     * Broadcasts recent status to other clients connected to the channel.
     * Status object can be provided as parameter or it will be generated automatically with the usage of
     * tizen.tvaudiocontrol (provides volume data)
     * and webapis.avplay (provides video player recent state)
     * This method does not work with HTML5Video.
     * @method sendStatus
     * @memberof module:FastCast
     * @private
     * @param {Object} [statusObj] - status to be sent through the channel
     * @param {number} statusObj.position - recent playback time position in miliseconds
     * @param {string} statusObj.state - AVPlay recent state
     * @param {number} statusObj.totalTime - video playback time in miliseconds
     * @param {number} statusObj.videoId - video id
     * @param {number} statusObj.volume - volume level
     * @returns {undefined}
     */
    function sendStatus(statusObj) {
        var volume;
        if (!statusObj) {
            if (!nativeVolumeHandled) {
                volume = -1;
            } else {
                volume = tizen.tvaudiocontrol.getVolume();
                if (tizen.tvaudiocontrol.isMute()) {
                    volume = 0 - volume;
                }
            }

            statusObj = {
                state: webapis.avplay.getState(),
                position: webapis.avplay.getCurrentTime(),
                totalTime: webapis.avplay.getDuration(),
                volume: volume,
                videoId: videoId
            };
        }
        send("status", JSON.stringify(statusObj));
    }

    /**
     * Registers custom channel message handler (you can send custom messages with send method).
     * Following event names which are defined in FastCast library are restricted:
     * "connect", "disconnect", "clientConnect", "clientDisconnect".
     * @func on
     * @memberof module:FastCast
     * @private
     * @param {string} eventName - event name
     * @param {function} callback - event handler
     * @returns {undefined}
     */
    function on(eventName, callback) {
        var libRestrictedEvents = Object.keys(eventCallbacks),
            restrictedEvents = libRestrictedEvents.concat(["connect", "disconnect", "clientConnect", "clientDisconnect"]);
        if (restrictedEvents.indexOf(eventName) > -1) {
            console.debug("Registering event " + eventName + " is forbidden. Please use library API.");
            return false;
        }
        if (typeof callback !== "function") {
            callback = function () {
                console.log("[FastCast][" + eventName + "] User did not provide callback for event.");
            };
        }
        channel.on(eventName, callback);
    }

    /**
     * Function sets private variable videoId.
     * @func setVideoId
     * @memberOf module:FastCast
     * @private
     * @param id
     * @returns undefined
     */
    function setVideoId(id) {
        videoId = id;
    }

    /**
     * Function returns private variable videoId.
     * @func getVideoId
     * @memberOf module:FastCast
     * @private
     * @returns mixed
     */
    function getVideoId() {
        return videoId;
    }

    return {
        /**
         * Initializes FastCast. Expects 3 arguments: channel name, event bus
         * object and a callback function. Channel name is required. If event bus
         * is not provided, events are fired on document.activeElement. Callback
         * function is optional. If provided, does not receive any arguments.
         * @method init
         * @memberof module:FastCast
         * @access public
         * @param {string} chanName - name of FastCast channel
         * @param {Object} [eb = null] - event bus object
         * @param {function} [callback] - function to be called after initialization
         * @returns {undefined}
         */
        init: init,

        /**
         * Disconnects device from recent channel.
         * @method deinit
         * @memberof module:FastCast
         * @access public
         * @returns {undefined}
         * @example
         * FastCast.deinit();
         */
        deinit: deinit,

        /**
         * Registers client connect event handler.
         * @method onClientConnect
         * @memberof module:FastCast
         * @access public
         * @param {Object} client - event object
         * @param {string} client.id - client id
         * @param {Object} client.attributes - passed by the client when connecting
         * @param {boolean} client.isHost - TV application is a host
         * @param {number} client.connectTime - when the client connected (miliseconds)
         * @returns {undefined}
         * @example
         * //show client name when he connects
         * FastCast.onClientConnect(function (client) {
         *     tvApp.log("clientConnect : " + client.attributes.name);
         * });
         */
        onClientConnect: setCallback('connect'),

        /**
         * Registers client disconnect event handler.
         * @method onClientDisconnect
         * @memberof module:FastCast
         * @access public
         * @param {Object} client - event object
         * @param {string} client.id - client id
         * @param {Object} client.attributes - passed by the client when connecting
         * @param {boolean} client.isHost - TV application is a host
         * @param {number} client.connectTime - when the client connected (miliseconds)
         * @returns {undefined}
         * @example
         * //show client name when he disconnects
         * FastCast.onClientDisconnect(function (client) {
         *     tvApp.log("clientConnect : " + client.attributes.name);
         * });
         */
        onClientDisconnect: setCallback('disconnect'),

        /**
         * Connects device to the channel, so it can exchange messages with other devices.
         * Registers protocol-defined messages (keydown, play, reclaim, seek, volume)
         * so that channel message will dispatch a proper event (ms2:keydown, ms2:play, ms2:reclaim, ms2:seek, ms2:volume) to be handled in the application.
         * Registers generic event (connect, disconnect, clientConnect, clientDisconnect) handlers.
         * Registers visibilityChange event callback to emit a proper message (suspend, restore) when tv application goes to and from the background.
         * @func connect
         * @memberof module:FastCast
         * @access public
         * @param {Object} [prop] - any attributes associated with the client
         * @param {number} [maximumClients] - maximum number of simultaneously connected clients
         * @returns {undefined}
         * @example
         * FastCast.connect({ name: "TV" });
         */
        connect: connect,

        /**
         * Sends a custom event message to other client connected to the channel.
         * By default message is broadcasted to all other clients.
         * This is a proxy function for Channel object's <code>publish</code> method.
         * @func send
         * @memberof module:FastCast
         * @access public
         * @param {string} event - name of event to be sent
         * @param {*} [data] - data to be sent with event
         * @param {string} [clientId] - id of a client who will receive message
         * @param {blob|arrayBuffer} [payload] - any binary data to be sent
         * @returns {undefined}
         * @example
         * //Emits FastCast play message with video parameters
         * send("play", {videoId:videoId,position:position});
         *
         * @example
         * //Emits user's custom message
         * send("myChannelMsg");
         */
        send: send,

        /**
         * Broadcasts play message that can be received by other clients connected to the channel.
         * @func play
         * @memberof module:FastCast
         * @access public
         * @param {number} videoId - video id
         * @param {number} position - playback starting position in miliseconds
         * @param {mixed} data (optional) - any other data to send to client
         * @returns {undefined}
         * @example
         * //TV application receives FastCast reclaim message and emits play message to all clients.
         * document.addEventListener("ms2:reclaim", function (e) {
         *     FastCast.play(recentVideoId, recentVideoPlaybackTime, {seriesID: 2345});
         * });
         */
        play: play,

        /**
         * Broadcasts recent status to other clients connected to the channel.
         * Status object can be provided as parameter or it will be generated automatically with the usage of
         * tizen.tvaudiocontrol (provides volume data)
         * and webapis.avplay (provides video player recent state)
         * This method does not work with HTML5Video.
         * @method status
         * @memberof module:FastCast
         * @access public
         * @param {Object} [statusObj] - status to be sent through the channel
         * @param {number} statusObj.position - recent playback time position in miliseconds
         * @param {string} statusObj.state - AVPlay recent state
         * @param {number} statusObj.totalTime - video playback time in miliseconds
         * @param {number} statusObj.videoId - video id
         * @param {number} statusObj.volume - volume level
         * @returns {undefined}
         * @example
         * //Emits status every time buffering is completed
         * webapis.avplay.setListener({
         *     onbufferingcomplete: function () {
         *         FastCast.status();
         *     }
         * });
         */
        status: sendStatus,

        /**
         * Broadcasts an error message to other clients connected to the channel.
         * Predefined error types are: FastCast.error.NOT_CONNECTED, FastCast.error.NO_SUCH_STREAM, FastCast.error.SEEK_FAILED.
         * Function accepts also simple strings or error objects.
         * @func error
         * @memberof module:FastCast
         * @access public
         * @param {string|number|object} type - custom message string or predefined error type or error object
         * @returns {undefined}
         * @example
         * FastCast.error(FastCast.error.NO_SUCH_STREAM);
         * FastCast.error("General error.");
         * FastCast.error(new Error("My custom error"));
         * FastCast.error({'message': 'My custom error', 'code': 'E002-010'));
         */
        error: error,

        /**
         * Registers custom channel message handler (you can send custom messages with send method).
         * Following event names which are defined in FastCast library are restricted:
         * "connect", "disconnect", "clientConnect", "clientDisconnect".
         * @func on
         * @memberof module:FastCast
         * @access public
         * @param {string} eventName - event name
         * @param {function} callback - event handler
         * @returns {undefined}
         * @example
         * FastCast.on('myChannelMsg', function (msg, from) {
         *     console.log(from.attributes.name + " has just sent me myChannelMsg: " + msg);
         * });
         */
        on: on,

        /**
         * Function sets private variable videoId.
         * @func setVideoId
         * @memberof module:FastCast
         * @access public
         * @param id
         * @returns undefined
         */
        setVideoId: setVideoId,

        /**
         * Function returns private variable videoId.
         * @func getVideoId
         * @memberof module:FastCast
         * @access public
         * @returns mixed
         */
        getVideoId: getVideoId,

        /**
         * Checks if there are any client devices connected. Doesn't give
         * any information about number of connected clients though.
         * @func isClientConnected
         * @memberof module:FastCast
         * @access public
         * @returns {boolean}
         */
        isClientConnected: isClientConnected
    }
}());

if (typeof module !== "undefined" && module.exports) {
    module.exports.FastCast = FastCast;
}
