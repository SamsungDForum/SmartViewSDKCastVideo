/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.fastcast.msgs;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * Seek message to transport seek command
 * 
 * @author m.gajewski
 *
 */
public class SeekMessage extends MessageBase {

	private static final String POSITION_KEY = "position";

	private long mPosition = -1;

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
	 * @param position
	 *            the position to set
	 */
	public void setPosition(long position) {
		mPosition = position;
	}

	/**
	 * @see com.samsung.fastcast.msgs.MessageBase#getJSON()
	 */
	@Override
	public JSONObject getJSON() {
		JSONObject json = new JSONObject();
		try {
			json.put(POSITION_KEY, mPosition);
			return json;
		} catch (JSONException e) {
			e.printStackTrace();
		}
		return null;
	}

	/**
	 * Fill message properties using JSONObject passed in argument.<BR>
	 * JSON should have one key "position" with time in milliseconds from video
	 * beginning.<BR>
	 * Example of JSONObject: {"position":5400}
	 * 
	 * @see com.samsung.fastcast.msgs.MessageBase#fillData(java.lang.Object)
	 * 
	 * @param json
	 *            Properly constructed JSONObject
	 */
	@Override
	void fillData(Object json) throws JSONException {
		if (json instanceof JSONObject) {
			mPosition = ((JSONObject) json).getInt(POSITION_KEY);
		}
	}
}
