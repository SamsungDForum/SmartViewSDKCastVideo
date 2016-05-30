/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.fastcast.msgs;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * StatusMessage class to transport information about remote player status
 * 
 * @author m.gajewski
 *
 */
public class StatusMessage extends MessageBase {

	private static final String STATE_KEY = "state";
	private static final String POSITION_KEY = "position";
	private static final String TOTAL_TIME_KEY = "totalTime";
	private static final String VOLUME_KEY = "volume";
	private static final String VIDEO_ID_KEY = "videoId";

	private RemoteStates mState = RemoteStates.NONE;
	private long mPosition = -1;
	private long mTotalTime = -1;
	private int mVolume = -101;
	private int mVideoId = -1;

	/**
	 * Player state property getter
	 * @return state
	 */
	public RemoteStates getState() {
		return mState;
	}

	/**
	 * Player state property setter
	 * @param state
	 *            the state to set
	 */
	public void setState(RemoteStates state) {
		mState = state;
	}

	/**
	 * position property getter
	 * @return the position
	 */
	public long getPosition() {
		return mPosition;
	}

	/**
	 * position property setter
	 * @param position
	 *            the position to set
	 */
	public void setPosition(long position) {
		mPosition = position;
	}

	/**
	 * total time property getter
	 * @return the totalTime
	 */
	public long getTotalTime() {
		return mTotalTime;
	}

	/**
	 * total time property setter
	 * @param totalTime
	 *            the totalTime to set
	 */
	public void setTotalTime(long totalTime) {
		mTotalTime = totalTime;
	}

	/**
	 * volume property getter
	 * @return the volume
	 */
	public int getVolume() {
		return mVolume;
	}

	/**
	 * volume property setter
	 * @param volume
	 *            the volume to set
	 */
	public void setVolume(int volume) {
		mVolume = volume;
	}

	/**
	 * videoId property getter
	 * @return the videoId
	 */
	public int getVideoId() {
		return mVideoId;
	}

	/**
	 * videoId property setter
	 * @param videoId
	 *            the videoId to set
	 */
	public void setVideoId(int videoId) {
		mVideoId = videoId;
	}

	/**
	 * @see com.samsung.fastcast.msgs.MessageBase#getJSON()
	 */
	@Override
	public JSONObject getJSON() {
		JSONObject json = new JSONObject();
		try {
			json.put(STATE_KEY, mState.toString());
			json.put(POSITION_KEY, mPosition);
			json.put(TOTAL_TIME_KEY, mTotalTime);
			json.put(VOLUME_KEY, mVolume);
			json.put(VIDEO_ID_KEY, mVideoId);
			return json;
		} catch (JSONException e) {
			e.printStackTrace();
		}
		return null;
	}

	/**
	 * Fill message properties using JSONObject passed in argument.<BR>
	 * JSON should have five keys: <BR>
	 * 1. "state" with remote player state. Possible AVPlayer states are:
	 * [NONE,IDLE,BUFFERING,READY,PLAYING,PAUSED, ERROR, STOPPED].<BR>
	 * 2. "position" with time in milliseconds from video beginning.<BR>
	 * 3. "totalTime" duration of loaded movie in milliseconds.<BR>
	 * 4. "volume" with sound volume value. Value can be in range <-100, 100>
	 * negative value means mute.<BR>
	 * 5. "videoId" with video id integer.<BR>
	 * Example of JSONObject: {state: "BUFFERRING", position: 5200, totalTime:
	 * 23400, volume: 56, videoId: 123} <BR>
	 * 
	 * @see com.samsung.fastcast.msgs.MessageBase#fillData(java.lang.Object)
	 * 
	 * @param json
	 *            Properly constructed JSONObject
	 */
	@Override
	void fillData(Object json) throws JSONException {
		if (json instanceof JSONObject) {
			JSONObject data = (JSONObject) json;
			mState = RemoteStates.valueOf(data.getString(STATE_KEY));
			mPosition = data.getInt(POSITION_KEY);
			mTotalTime = data.getInt(TOTAL_TIME_KEY);
			mVolume = data.getInt(VOLUME_KEY);
			mVideoId = data.getInt(VIDEO_ID_KEY);
		}
	}
}
