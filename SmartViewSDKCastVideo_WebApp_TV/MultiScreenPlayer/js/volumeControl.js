function VolumeControl($osd){
    var timeouterVolume = Timeouter($osd);

    return {
        trackVolume: function (stateObj) {
            if (!stateObj) {
                return;
            }
            var vol = tizen.tvaudiocontrol.getVolume();
            if (tizen.tvaudiocontrol.isMute()) {
                vol = 0 - vol;
            }
            stateObj.volume = vol;
        },
        setMute: function (mute) {
            tizen.tvaudiocontrol.setMute(mute);
            if (mute) {
                $osd.classList.add('muted');
            } else {
                $osd.classList.remove('muted');
            }
            timeouterVolume.set();
        },
        isMute: function () {
            var mute = tizen.tvaudiocontrol.isMute();
            if (mute) {
                $osd.classList.add('muted');
            } else {
                $osd.classList.remove('muted');
            }
            return mute;
        },
        setVolume: function (vol) {
            tizen.tvaudiocontrol.setVolume(vol);
        },
        volumeUp: function () {
            tizen.tvaudiocontrol.setVolumeUp();
        },
        volumeDown: function () {
            tizen.tvaudiocontrol.setVolumeDown();
        },
        init: function (stateObj) {
            var THAT = this;
            tizen.tvaudiocontrol.setVolumeChangeListener(function(vol) {
                $osd.innerHTML = vol;
                THAT.isMute();
                timeouterVolume.set();
            });
        
            this.trackVolume(stateObj);
        }
    };
}