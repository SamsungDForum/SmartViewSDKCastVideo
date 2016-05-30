var tvApp = {

    logsEl: null,
    phrase: null,
    author: null,
    deviceStatus: null,
    deviceName: null,
    deviceAction: null,
    player: null,
    uhdStatus: null,
    connectedTvToChannel: null,
    action: '',
    eventBus: null,
    currentVolume: tizen.tvaudiocontrol.getVolume(),
    isMute: tizen.tvaudiocontrol.isMute(),
    internetConnectionTest: null,
    stateObj: {
        state: "NONE",
        position: -1,
        totalTime: -1,
        videoId: -1,
        videoURL: null
    },

    messageManager: (function () {
        var msgBoxEl = document.getElementById('msg-box');
        var hideTimeout = null;

        var isVisible = function () {
            return getComputedStyle(msgBoxEl).display !== "none";
        };

        var setMsg = function (msg) {
            var name = msg.name || 'unknown error';
            var text = msg.text || '';

            msgBoxEl.textContent = name + ': ' + text;
        };

        var hide = function () {
            msgBoxEl.style.display = 'none';
            msgBoxEl.textContent = '';
        };

        var show = function (msg, autohide, timeout) {
            setMsg(msg);
            msgBoxEl.style.display = 'block';

            if (autohide) {
                clearTimeout(hideTimeout);
                hideTimeout = setTimeout(function () {
                    hide();
                }, timeout || 5000);
            }
        };

        return {
            hide: hide,
            show: show,
            isVisible: isVisible
        };
    }()),

    init: function () {
        this.eventBus = document;
        if(webapis && webapis.network && webapis.network.getIp) {
            document.querySelector('.ip').textContent = webapis.network.getIp();
            document.querySelector('.iptext').style.display = 'inline';
        } else {
            document.querySelector('.iptext').style.display = 'none';
        }

        this.deviceStatus = document.querySelector('.device-status');
        this.deviceName = document.querySelector('.device-name');
        this.deviceAction = document.querySelector('.device-action');
        this.connectedTvToChannel = document.querySelector('.connected-tv');

        this.logoContainer = document.getElementById('logo-container');
        this.videoList = document.getElementById('video-list');
        this.videoPlayer = document.getElementById('video-player');
        this.volumeOSD = document.getElementById('volume-osd');

        this.registerKeys();
        //this.registerKeyHandler();
        this.registerFastCastEvents();

        bishopNavigation.init();

        var app = this;

        jQuery.get('data.json', function (data) {
            /**
             * Video list configuration object.
             * @property {HTML Ul Element}  list         - movie list
             * @property {Array}            data         - array of videos
             * @property {Function}         callback     - function called after DOM update
             */
            var videosConfig = {
                list: tvApp.videoList,
                data: JSON.parse(data).movies,
                callback: function () {
                    var movies = document.querySelectorAll('.navigable');
                    var i, iMax = movies.length, movie;

                    for (i = 0; i < iMax; i += 1) {
                        movie = movies[i];
                        movie.removeEventListener('focus', onFocus);
                        movie.addEventListener('focus', onFocus);
                    }


                    function documentOffsetTop(el) {
                        return el.offsetTop + ( el.offsetParent ? documentOffsetTop(el.offsetParent) : 0 );
                    }

                    function onFocus(e) {
                        console.log(e);
                        var el = document.querySelector('.navigable.focused');
                        var top = documentOffsetTop(el) - ( window.innerHeight / 3 );
                        app.videoList.parentNode.scrollTop = top;
                        app.stateObj.videoId = el.dataset.videoid;
                        app.stateObj.videoURL = el.dataset.video;
                    }
                }
            };
            new VideoList(videosConfig);
            bishopNavigation.focus(document.getElementById('video-list').firstElementChild, 'keyboard');
        });


        /**
         * Player configuration object.
         *
         * @property {String}    url                     - content url
         * @property {HTML Element} player           - application/avplayer object
         * @property {HTML Div Element} controls     - player controls
         * @property {HTLM Div Element} info         - place to display stream info
         */
        var config = {
            url: 'http://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_640x360.m4v',
            player: document.getElementById('av-player'),
            controls: document.querySelector('.video-controls'),
            info: document.getElementById('info'),
            logger: this.log //Function used for logging
        };


        this.player = new VideoPlayer(config);
        this.registerMouseEvents();

        this.volumeControl = new VolumeControl(this.volumeOSD);
        this.volumeControl.init(this.stateObj);

        this.timeouter = Timeouter(document.querySelectorAll('body > nav, .video-controls'));
        this.viewManager.setView('video-list');
    },
    
    viewManager: (function () {
        var recentView = {
            mode: ''
        };
        
        var getRecentViewInfo = function () {
            return {
                mode: recentView.mode
            };
        };
        var setView = function (mode) {
            var selectedVideo = document.querySelector('.navigable.focused');
            
            recentView.mode = mode;

            switch (mode) {
                case 'video-player':
                    tvApp.registerKeyHandler('video-player');
                    tvApp.logoContainer.textContent = selectedVideo.dataset.videotitle;

                    tvApp.videoList.parentNode.style.display = 'none';
                    tvApp.videoPlayer.style.display = 'block';
                    tvApp.timeouter.set();
                    break;
                default:
                    //video-list mode
                    if (webapis.avplay.getState() !== 'IDLE' && webapis.avplay.getState() !== 'NONE') {
                        tvApp.player.stop();
                        tvApp.action = 'stop';
                    }
                    tvApp.registerKeyHandler('video-list');
                    tvApp.timeouter.clear();
                    tvApp.logoContainer.textContent = 'SmartViewSDK Cast Video';
                    tvApp.videoPlayer.style.display = 'none';
                    tvApp.videoList.parentNode.style.display = 'block';
                    break;
            }
        };
        
        return {
            getRecentViewInfo: getRecentViewInfo,
            setView: setView
        }
    }()),

    /**
     * Displays logging information on the screen and in the console.
     * @param {string} msg - Message to log.
     */
    log: function (msg) {
        this.logsEl = document.getElementById('logs');

        if (msg) {
            // Update logs
            console.log('[PlayerAvplay]: ', msg);
            this.logsEl.innerHTML += msg + '<br />';
        } else {
            // Clear logs
            this.logsEl.innerHTML = '';
        }

        this.logsEl.scrollTop = this.logsEl.scrollHeight;
    },

    /**
     * Register keys used in this application
     */
    registerKeys: function () {
        var usedKeys = [
            'MediaPause',
            'MediaPlay',
            'MediaPlayPause',
            'MediaFastForward',
            'MediaRewind',
            'MediaStop',
            'VolumeDown',
            'VolumeUp',
            'VolumeMute',
            '0',
            '1',
            '2',
            '3'
        ];

        usedKeys.forEach(
            function (keyName) {
                tizen.tvinputdevice.registerKey(keyName);
            }
        );
    },

    defaultKeyHandler: function (e) {
        switch(e.keyCode) {
            case 447: // VolumeUp
                tvApp.volumeControl.volumeUp();
                break;
            case 448: // VolumeDown
                tvApp.volumeControl.volumeDown();
                break;
            case 449: // VolumeMute
                tvApp.volumeControl.setMute(!tvApp.volumeControl.isMute());
                break;
            default:
                tvApp.log("Unhandled key");
        }
    },

    listKeyHandler: function (e) {
        switch(e.keyCode) {
            case 13:    // Enter
            case 415:   // MediaPlay
            case 10252: // MediaPlayPause
                tvApp.viewManager.setView('video-player');
                tvApp.action = tvApp.player.playPause(document.querySelector('.navigable.focused').dataset.video);
                break;
            case 10009: // Return
                tizen.application.getCurrentApplication().hide();
                tvApp.action = 'stop';
                break;
            default:
                tvApp.defaultKeyHandler(e);
                //tvApp.log("Unhandled key");
        }
    },

    playerKeyHandler: function (e) {
        switch(e.keyCode) {
            case 13:    // Enter
                tvApp.timeouter.set();
                break;
            case 10252: // MediaPlayPause
                tvApp.timeouter.set();
                tvApp.action = tvApp.player.playPause(document.querySelector('.navigable.focused').dataset.video);
                break;
            case 415:   // MediaPlay
                tvApp.timeouter.set();
                tvApp.action = tvApp.player.playPause(document.querySelector('.navigable.focused').dataset.video);
                break;
            case 19:    // MediaPause
                tvApp.timeouter.set();
                tvApp.action = tvApp.player.playPause(document.querySelector('.navigable.focused').dataset.video);
                break;
            case 413:   // MediaStop
                tvApp.viewManager.setView('video-list');
                break;
            case 417:   // MediaFastForward
                tvApp.timeouter.set();
                tvApp.player.ff();
                break;
            case 412:   // MediaRewind
                tvApp.timeouter.set();
                tvApp.player.rew();
                break;
            case 10009: // Return
                tvApp.viewManager.setView('video-list');
                break;
            default:
                tvApp.defaultKeyHandler(e);
                //tvApp.log("Unhandled key");
        }
    },

    /**
     * Handle input depending on particular view type
     */
    registerKeyHandler: function (viewType) {
        this.eventBus.removeEventListener('keydown', this.listKeyHandler);
        this.eventBus.removeEventListener('keydown', this.playerKeyHandler);
        this.eventBus.removeEventListener('keydown', this.defaultKeyHandler);

        switch(viewType) {
            case 'video-list':
                this.eventBus.addEventListener('keydown', this.listKeyHandler);
                break;
            case 'video-player':
                this.eventBus.addEventListener('keydown', this.playerKeyHandler);
                break;
            default:
                this.eventBus.addEventListener('keydown', this.defaultKeyHandler);
                break;
        }
    },

    registerMouseEvents: function () {
        document.querySelector('.video-controls .play').addEventListener('click', tvApp.player.playPause);
        document.querySelector('.video-controls .stop').addEventListener('click', tvApp.player.stop);
        document.querySelector('.video-controls .ff').addEventListener('click', tvApp.player.ff);
        document.querySelector('.video-controls .rew').addEventListener('click', tvApp.player.rew);


        this.eventBus.addEventListener("currentdata", function (e) {
                var progressData = e.detail.data;
                var total = e.detail.total;
                //FastCast.send('tvAction', {action: 'currentTime', current: progressData, total: total});
        }, false);

        this.eventBus.addEventListener("streamCompleted", function () {
            //FastCast.send('tvAction', {action: 'streamCompleted', current: null, total: null});
        }, false);
    },

    registerFastCastEvents: function () {
        var THAT = this;
        this.eventBus.addEventListener("ms2:volume", function (e){
            console.debug("Received command to change volume. New values: volume: " + e.detail.volume + ", isMute: " + e.detail.isMute);
            THAT.volumeControl.setMute(e.detail.isMute);
            THAT.volumeControl.setVolume(e.detail.volume);
        });
        this.eventBus.addEventListener("ms2:seek", function (e){
            console.debug("Received command to seek. Value: position: " + e.detail.position);
            tvApp.player.seek(e.detail.position);
        });
        this.eventBus.addEventListener("ms2:play", function (e){
            console.debug("Received command to play. Values: movie ID: " + e.detail.videoId + ", starting position: " + e.detail.position);
            var selectedVideoId = document.querySelector('.navigable.focused').dataset.videoid;
            bishopNavigation.focus(document.querySelector('li[data-videoid="' + e.detail.videoId + '"]'), 'keyboard');

            if (webapis.avplay.getState() !== 'IDLE' && webapis.avplay.getState() !== 'NONE') {
                tvApp.player.stop();
            }
            tvApp.player.play(document.querySelector('.navigable.focused').dataset.video, e.detail.position);
            tvApp.viewManager.setView('video-player');
        }.bind(this));
        this.eventBus.addEventListener("ms2:reclaim", function (e) {
            var currentVideoId = tvApp.stateObj.videoId;
            var currentVideoPlaybackTime = tvApp.player.getCurrentMsTime();

            FastCast.play(currentVideoId, currentVideoPlaybackTime);
            //tvApp.viewManager.setView('video-list');
        });
    },

    /**
     * Enabling uhd manually in order to play uhd streams
     */
    setUhd: function () {
        if (!this.uhdStatus) {
            if (webapis.productinfo.isUdPanelSupported()) {
                this.log('4k enabled');
                this.uhdStatus = true;
            } else {
                this.log('this device does not have a panel capable of displaying 4k content');
            }

        } else {
            this.log('4k disabled');
            this.uhdStatus = false;
        }
        this.setUhd(this.uhdStatus);
    }
};

/**
 * Function initialising application.
 */
window.onload = function () {
    if (window.tizen === undefined) {
        tvApp.log('This application needs to be run on Tizen device');
        return;
    }
    tvApp.init();
    FastCast.init("com.samsung.MultiScreenPlayer", tvApp.eventBus, function(){
        FastCast.onClientConnect(function (client) {
            tvApp.log("clientConnect : " + client.attributes.name);
            //tvApp.deviceName.text(client.attributes.name);
            //tvApp.deviceStatus.removeClass('fa-cog fa-spin').addClass('fa-check-square');
        });
    
        FastCast.onClientDisconnect(function (client) {
            tvApp.restoreConnection = true;
            tvApp.log("clientDisconnect : " + client.attributes.name);
            //tvApp.deviceName.text(' - ');
            //tvApp.deviceAction.text(' - ');
            //tvApp.deviceStatus.removeClass('fa-check-square').addClass('fa-cog fa-spin');
            //tvApp.viewManager.setView('video-list');
        });
        FastCast.connect({test:"test"});
    });

    // handle visibilitychange event
    document.addEventListener("visibilitychange", function(){
        if (document.hidden) {
            if (tvApp.player.getState() !== "NONE") {
                tvApp.player.suspend();

                //handle connection error
                tvApp.internetConnectionTest = clearInterval(testInternetConnection);
            }
        } else {
            tvApp.player.restore();
            tvApp.internetConnectionTest = setInterval(testInternetConnection, 3000);
        }
    });
    tvApp.internetConnectionTest = setInterval(testInternetConnection, 3000);


    function testInternetConnection() {
        if (window.navigator.onLine && tvApp.messageManager.isVisible()) {
            //hide error - enable ui
            tvApp.registerKeyHandler(tvApp.viewManager.getRecentViewInfo().mode);
            tvApp.messageManager.hide();
        } else if (!window.navigator.onLine) {
            //show error - disable ui
            tvApp.registerKeyHandler();
            tvApp.messageManager.show({ name: 'connection error', text: 'this app needs internet connection to be enabled' });

            if (webapis.avplay.getState() === 'PLAYING') {
                tvApp.action = tvApp.player.pause(tvApp.stateObj.videoURL);
            }
        }
    }
};
