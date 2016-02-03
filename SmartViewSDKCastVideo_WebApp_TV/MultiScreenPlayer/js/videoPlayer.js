/**
 * Player object constructor.
 *
 * @param   {Object} config - Playback and player configuration.
 * @returns {Object}
 */
function VideoPlayer(config) {
    var log = config.logger;

    /**
     * HTML av-player element
     */
    var player = config.player;

    /**
     * HTML controls div
     */
    var controls = config.controls;

    /**
     * Fullscreen flag
     * @type {Boolean}
     */
    var isFullscreen = false;

    /**
     * HTML element o display stream properties.
     */
    var info = config.info;

    var defaultResolutionWidth = 1920;
    var resolutionWidth = config.resolutionWidth;

    var playerCoords = {
        x: 0,//x: 10,
        y: 0,//y: 113,
        width: 1920,//width: 939,
        height: 1080//height: 450
    };
    
    var errorCallbacks = {
        seek: onSeekError,
        prepare: onPrepareError
    };
    
    var loader = null;

    function avProxy() {
        var args = Array.prototype.slice.call(arguments),
            method = args.shift();
        if (!method) {
            return;
        }

        try {
            webapis.avplay[method].apply(webapis.avplay, args);
        } catch (e) {
            console.error('avplay exception at', method, e.message);
            if (typeof errorCallbacks[method] === "function") {
                errorCallbacks[method](e);
            } else {
                FastCast.error('avplay exception at ' + method + ", " + e.message);
            }
        }
    }

    function onPrepareError() {
        FastCast.error(FastCast.error.NO_SUCH_STREAM);
    }

    function onSeekError() {
        FastCast.error(FastCast.error.SEEK_FAILED);
    }

    function toggleLoading(show) {
        if (loader === null) {
            setTimeout(function () {
                loader = document.querySelector('.loader');
                showLoading();
            }, 200);
            return;
        }
        if (show) {
            loader.classList.add('active');
        } else {
            loader.classList.remove('active');
        }
    }


    /**
     * 4k flag
     * @type {Boolean}
     */
    var isUhd = false;

    var $progressBar = null;
    var currentTime = 0;
    var totalTime = 0;
    var listener = null;
    var jumpLength = 1000;

    return {
        url: "",
        startingPosition: 0,
        /**
         * Function to initialize the playback.
         * @param {String} url - content url, if there is no value then take url from config
         */
        play: function (url, startingPosition) {
            /* Create listener object. */
            toggleLoading(true);
            var that = this;
            listener = {
                onbufferingstart: function () {
                    log("Buffering start.");
                    tvApp.stateObj.state = webapis.avplay.getState();
                    tvApp.volumeControl.trackVolume(tvApp.stateObj);
                    FastCast.status(tvApp.stateObj);
                },
                onbufferingprogress: function (percent) {
                    log("Buffering progress data : " + percent);
                    tvApp.stateObj.totalTime = webapis.avplay.getDuration();
                    tvApp.stateObj.position = webapis.avplay.getCurrentTime();
                    tvApp.volumeControl.trackVolume(tvApp.stateObj);
                    FastCast.status(tvApp.stateObj);
                },
                onbufferingcomplete: function () {
                    log("Buffering complete.");
                    //document.querySelector('.loader').classList.remove('active');
                    toggleLoading();
                    tvApp.stateObj.totalTime = webapis.avplay.getDuration();
                    tvApp.stateObj.position = webapis.avplay.getCurrentTime();
                    tvApp.volumeControl.trackVolume(tvApp.stateObj);
                    FastCast.status(tvApp.stateObj);
                    jumpLength = totalTime / 10;
                },
                oncurrentplaytime: function (currentTime) {
                    //log("Current playtime: " + currentTime);
                    document.querySelector('.current-time').textContent = this.getCurrentTime(currentTime);
                    tvApp.stateObj.state = webapis.avplay.getState();
                    tvApp.stateObj.totalTime = totalTime;
                    tvApp.stateObj.position = currentTime;
                    tvApp.volumeControl.trackVolume(tvApp.stateObj);
                    FastCast.status(tvApp.stateObj);
                    this.setProgressBar(currentTime, totalTime);

                }.bind(this),
                onevent: function (eventType, eventData) {
                    log("event type: " + eventType + ", data: " + eventData);
                },
                onstreamcompleted: function () {
                    log("Stream Completed");
                    var eve = new CustomEvent("streamCompleted");
                    tvApp.eventBus.dispatchEvent(eve);
                    this.stop();
                    tvApp.stateObj.state = webapis.avplay.getState();
                    FastCast.status(tvApp.stateObj);
                }.bind(this),
                onerror: function (eventType) {
                    log("event type error : " + eventType);
                }
            };

            if (!url) {
                url = config.url;
            }
            if (!this.url) {
                this.url = url;
            }
            log('videoPlayer open: ' + url);
            try {
                webapis.avplay.open(url);
                webapis.avplay.setDisplayMethod('PLAYER_DISPLAY_MODE_FULL_SCREEN');
                webapis.avplay.setDisplayRect(
                    playerCoords.x,
                    playerCoords.y,
                    playerCoords.width,
                    playerCoords.height
                );
                webapis.avplay.setListener(listener);
            } catch (e) {
                log(e);
            }

            //set bitrates according to the values in your stream manifest
            //			this.setBitrate(477000, 2056000, 2056000, 688000);

            //set 4k
            if (isUhd) {
                this.set4K();
            }

            webapis.avplay.prepareAsync(function () {
                if (startingPosition) {
                    avProxy("seekTo", parseInt(startingPosition, 10));
                }
                totalTime = webapis.avplay.getDuration();
                that.setTotalTime();
                avProxy("play");
            }, function () {
                toggleLoading();
                onPrepareError.apply(null, arguments);
            })


        },

        setProgressBar: function (millisecond, total) {
            var currentPlayTime = millisecond;
            if ($progressBar === null) {
                $progressBar = document.querySelector('.determinate');
            }
            if (total > 0) {
                var t = (currentPlayTime / total) * 100;
                $progressBar.style.width = t + '%';

                var myEvent = new CustomEvent("currentdata",
                    {
                        'detail': {
                            data: currentPlayTime,
                            total: total
                        }
                    });

                tvApp.eventBus.dispatchEvent(myEvent);
            }
        },

        /**
         * Function to start/pause playback.
         * @param {String} url - content url, if there is no value then take url from config
         */
        playPause: function (url, callback) {
            var action = '';
            if (!url) {
                url = config.url;
            }
            if (!this.url) {
                this.url = url;
            }

            if (webapis.avplay.getState() === 'PLAYING' || webapis.avplay.getState() === 'PAUSED') {
                document.querySelector('.play-pause').classList.remove('fa-pause');
                document.querySelector('.play-pause').classList.add('fa-play');
                action = this.pause();
            } else {
                document.querySelector('.play-pause').classList.remove('fa-play');
                document.querySelector('.play-pause').classList.add('fa-pause');
                this.play(url);
                action = 'play';
            }
            listener.oncurrentplaytime(webapis.avplay.getCurrentTime());
            return action;
        },
        /**
         * Function to stop current playback.
         */
        stop: function () {
            avProxy("stop");

            //switch back from fullscreen to window if stream finished playing
            //if (isFullscreen === true) {
            //    this.toggleFullscreen();
            //}
            document.querySelector('.total-time').textContent = '0:00:00';
            document.querySelector('.current-time').textContent = '0:00:00';
            document.querySelector('.determinate').style.width = '0%';
            //clear stream information window
            if(info) {
                info.innerHTML = '';
            }
            document.querySelector('.play-pause').classList.remove('fa-pause');
            document.querySelector('.play-pause').classList.add('fa-play');
            listener.oncurrentplaytime(webapis.avplay.getCurrentTime());
        },
        /**
         * Function to pause/resume playback.
         * @param {String} url - content url, if there is no value then take url from config
         */
        pause: function (url) {
            var action
            if (!url) {
                url = config.url;
            }
            if (!this.url) {
                this.url = url;
            }
            if (webapis.avplay.getState() === 'PLAYING') {
                avProxy("pause");
                action = 'pause';
            } else if (webapis.avplay.getState() === 'NONE' || webapis.avplay.getState() === 'IDLE') {
                this.play(url);
                action = 'play';
            } else {
                //this works like resume
                document.querySelector('.play-pause').classList.remove('fa-play');
                document.querySelector('.play-pause').classList.add('fa-pause');
                avProxy("play");
                action = 'play';
            }
            listener.oncurrentplaytime(webapis.avplay.getCurrentTime());
            return action;
        },
        /**
         * Jump forward 1/10th of total movie length.
         */
        ff: function () {
            console.debug("Jumping forward by", jumpLength);
            avProxy("jumpForward", jumpLength);
        },
        /**
         * Seek to time.
         */
        seek: function (time) {
            if (!time) {
                return;
            }
            toggleLoading(true);
            this.pause();
            avProxy("seekTo", time);
            this.playPause(this.url);
        },
        /**
         * Rewind 1/10th of total movie length.
         */
        rew: function () {
            console.debug("Jumping backward by", jumpLength);
            avProxy("jumpBackward", jumpLength);
        },
        /**
         * Set flag to play UHD content.
         * @param {Boolean} isEnabled - Flag to set UHD.
         */
        setUhd: function (isEnabled) {
            isUhd = isEnabled;
        },
        /**
         * Set to TV to play UHD content.
         */
        set4K: function () {
            avProxy("setStreamingProperty", "SET_MODE_4K", "true");
        },
        /**
         * get ttotal time
         * @returns {number}
         */
        setTotalTime: function () {
            document.querySelector('.total-time').textContent = this.formatMsToString(totalTime);
        },
        /**
         *
         * @param currentTime
         * @returns {*}
         */
        getCurrentTime: function (currentTime) {
            return this.formatMsToString(currentTime);
        },

        getCurrentMsTime: function () {
            return webapis.avplay.getCurrentTime();
        },

        formatMsToString: function (time) {
            if (time === 0) {
                return '00:00';
            }

            var timeVal2 = time;
            var timeHour1 = parseInt(timeVal2 / 1000);
            var timeSec = (timeHour1 % 60).toString();
            if (Number(timeSec) < 10) timeSec = '0' + timeSec.toString();
            var timeHour = (timeHour1 - Number(timeSec)) / 60;
            var timeMin = (timeHour % 60).toString();
            if (Number(timeMin) < 10) timeMin = timeMin;
            timeMin = Number(timeMin) > 9 ? String(timeMin) : '0' + String(timeMin);
            timeHour = (timeHour - Number(timeMin)) / 60;
            return timeHour + ":" + timeMin + ":" + timeSec;
        },


        /**
         * Function to set specific bitrates used to play the stream.
         * In case of Smooth Streaming STARTBITRATE and SKIPBITRATE values 'LOWEST', 'HIGHEST', 'AVERAGE' can be set.
         * For other streaming engines there must be numeric values.
         *
         * @param {Number} from  - Lower value of bitrates range.
         * @param {Number} to    - Higher value of the bitrates range.
         * @param {Number} start - Bitrate which should be used for initial chunks.
         * @param {Number} skip  - Bitrate that will not be used.
         */
        setBitrate: function (from, to, start, skip) {
            var bitrates = '|BITRATES=' + from + '~' + to;

            if (start !== '' && start !== undefined) {
                bitrates += '|STARTBITRATE=' + start;
            }
            if (to !== '' && to !== undefined) {
                bitrates += '|SKIPBITRATE=' + skip;
            }

            avProxy("setStreamingProperty", "ADAPTIVE_INFO", bitrates);
        },
        /**
         * Function to change current VIDEO/AUDIO/TEXT track
         * @param {String} type  - Streaming type received with webapis.avplay.getTotalTrackInfo(), possible values
         *     are: VIDEO, AUDIO, TEXT.
         * @param {Number} index - Track id received with webapis.avplay.getTotalTrackInfo().
         */
        setTrack: function (type, index) {
            avProxy("setSelectTrack", type, index);
        },
        /**
         * Show information about all available stream tracks on the screen.
         */
        getTracks: function () {
            var trackInfo = webapis.avplay.getTotalTrackInfo();
            var text = 'type of track info: ' + typeof trackInfo + '<br />';
            text += 'length: ' + trackInfo.length + '<br />';
            for (var i = 0; i < trackInfo.length; i++) {
                text += 'index: ' + trackInfo[i].index + ' ';
                text += 'type: ' + trackInfo[i].type + ' ';
                text += 'extra_info: ' + trackInfo[i].extra_info + '<br />';
            }
            info.innerHTML = text;
        },
        /**
         * Show streaming properties on the screen.
         */
        getProperties: function () {
            var text = 'AVAILABLE_BITRATE: ' + webapis.avplay.getStreamingProperty("AVAILABLE_BITRATE") + '<br />';
            text += 'CURRENT_BANDWIDTH: ' + webapis.avplay.getStreamingProperty("CURRENT_BANDWITH") + '<br />';
            text += 'DURATION: ' + webapis.avplay.getStreamingProperty("DURATION") + '<br />';
            text += 'BUFFER_SIZE: ' + webapis.avplay.getStreamingProperty("BUFFER_SIZE") + '<br />';
            text += 'START_FRAGMENT: ' + webapis.avplay.getStreamingProperty("START_FRAGMENT") + '<br />';
            text += 'COOKIE: ' + webapis.avplay.getStreamingProperty("COOKIE") + '<br />';
            text += 'CUSTOM_MESSAGE: ' + webapis.avplay.getStreamingProperty("CUSTOM_MESSAGE");
            info.innerHTML = text;
        },
        getState: function () {
            return webapis.avplay.getState();
        },
        /**
         * Switch between full screen mode and normal windowed mode.
         */
        toggleFullscreen: function () {
            if (isFullscreen === false) {
                webapis.avplay.setDisplayRect(0, 0, 1920, 1080);
                player.classList.add('fullscreenMode');
                controls.classList.add('fullscreenMode');
                isFullscreen = true;
            } else {
                log('Fullscreen off');
                try {
                    webapis.avplay.setDisplayRect(
                        playerCoords.x,
                        playerCoords.y,
                        playerCoords.width,
                        playerCoords.height
                    );
                } catch (e) {
                    log(e);
                }
                player.classList.remove('fullscreenMode');
                controls.classList.remove('fullscreenMode');
                isFullscreen = false;
            }
        },
        suspend: function () {
            avProxy("suspend");
        },
        restore: function () {
            avProxy("restore");
        }
    };
}
