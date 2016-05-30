/**
 * @file Video List
 * @author Piotr Nowacki (p.nowacki@samsung.com)
 * @date 2015-11-23
 *
 * @copyright Copyright (c) 2015 Samsung Electronics, Visual Display Division. All Rights Reserved.
 */

function VideoList(config) {
    'use strict';

    var list;
    var videos = [];


    function init(config) {
        list = config.list;
        setData(config.data);
        updateView();
    }

    function get() {
        return videos.slice();
    }

    function setData(data) {
        try {
            if (Array.isArray(data)) {
                videos = data.slice();
            } else {
                throw({ message: 'data is not an array' });
            }
        } catch(e) {
            console.error('unable to set data: ' + e.message);
        }
    }

    function updateView() {
        var html = [];
        var i, el, video;

        for (i = 0; i < videos.length; i += 1) {
            video = videos[i];
            el = [];

            el.push('<div class="img-wrapper"><img src="' + video.imgUrl + '"></div>');
            el.push('<div class="descr"><p>' + video.title + '</p></div>');
            el.push('<div class="bottom-bar"><span class="action-name">play</span><span class="views-count">'
                + video.views
                + ' views</span><span class="playback-time">'
                + video.playback
                + '</span></div>');

            html.push('<li class="navigable" data-videoId="' + video.id
                + '" id="video-' + video.id
                + '" data-videoTitle="' + video.title
                + '" data-video="' + video.url + '">'
                + '<div class="li-content">'
                + el.join('')
                + '</div>'
                + '</li>');
        }

        list.innerHTML = html.join('');

        if (config && typeof config.callback === 'function') {
            config.callback();
        }
    }


    init(config);


    return {
        get: get,
        setData: setData
    };
}