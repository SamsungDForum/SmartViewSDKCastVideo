/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.fastcast.msgs;

import java.util.Map;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * Play message to transport information about start new movie. This message is
 * both side. Can be send and received from remote device.
 * 
 * @author m.gajewski
 *
 */
public class PlayMessage extends MessageBase {

	private static final String VIDEO_ID_KEY = "videoId";
	private static final String POSITION_KEY = "position";
	private static final String DATA_KEY = "data";

	private int mVideoId = -1;
	private long mPosition = -1;
	private JSONObject mData = null;

	/**
	 * videoId property getter
	 * 
	 * @return the videoId
	 */
	public int getVideoId() {
		return mVideoId;
	}

	/**
	 * videoId property setter
	 * 
	 * @param videoId
	 *            the videoId to set
	 */
	public void setVideoId(int videoId) {
		mVideoId = videoId;
	}

	/**
	 * position property getter
	 * 
	 * @return the position
	 */
	public long getPosition() {
		return mPosition;
	}

	/**
	 * position property setter
	 * 
	 * @param position
	 *            the position to set
	 */
	public void setPosition(long position) {
		mPosition = position;
	}

	/**
	 * Additional data in JSON format
	 * 
	 * @return the data
	 */
	public JSONObject getData() {
		return mData;
	}

	/**
	 * Set additional data. All additional things needed to play movie in JSON
	 * object format
	 * 
	 * @param data
	 *            the data to set
	 */
	public void setData(JSONObject data) {
		mData = data;
	}

	/**
	 * Set additional data. All additional things needed to play movie. String
	 * in parameter will be parsed to JSONObject format
	 * 
	 * @param data
	 *            the Stringified JSON data to set
	 * @throws JSONException
	 */
	public void setData(String data) {
		try {
			mData = new JSONObject(data);
		} catch (JSONException e) {
			mData = null;
			e.printStackTrace();
		}
	}

	/**
	 * @see com.samsung.fastcast.msgs.MessageBase#getJSON()
	 */
	@Override
	public JSONObject getJSON() {
		JSONObject json = new JSONObject();
		try {
			json.put(VIDEO_ID_KEY, mVideoId);
			json.put(POSITION_KEY, mPosition);
			if (mData != null) {
				json.put(DATA_KEY, mData);
			}
			return json;
		} catch (JSONException e) {
			e.printStackTrace();
		}
		return null;
	}

	/**
	 * Fill message properties using JSONObject passed in argument. <B> JSON
	 * should have two keys "videoId" with video id integer and "position" with
	 * time in milliseconds from video beginning. There is also third key "data"
	 * which is optional. You can send additional data using this key.<BR>
	 * Example of JSONObject: {"videoId":123, "position":5300, "data":{}}
	 * 
	 * @see com.samsung.fastcast.msgs.MessageBase#fillData(java.lang.Object)
	 * 
	 * @param json
	 *            Properly constructed JSONObject
	 */
	@Override
	void fillData(Object json) throws JSONException {
		if (json instanceof JSONObject) {
			mVideoId = ((JSONObject) json).getInt(VIDEO_ID_KEY);
			mPosition = ((JSONObject) json).getInt(POSITION_KEY);
			mData = null;
			Object data = ((JSONObject) json).opt(DATA_KEY);
			if (data != null) {
				if (data instanceof JSONObject) {
					mData = (JSONObject) data;
				}
				else if (data instanceof Map<?, ?>) {
					mData = new JSONObject((Map<?, ?>)data);
				} else if (data instanceof String) {
					mData = new JSONObject((String)data);
				}
			}
		}
	}
}
