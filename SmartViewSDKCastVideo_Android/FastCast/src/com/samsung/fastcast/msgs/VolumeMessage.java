/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.fastcast.msgs;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * Volume message class to transport information about volume level change
 * 
 * @author m.gajewski
 *
 */
public class VolumeMessage extends MessageBase {

	private static final String VALUE_KEY = "value";

	private int mValue = -101;

	/**
	 * volume property getter
	 * @return the value
	 */
	public int getValue() {
		return mValue;
	}

	/**
	 * volume property setter
	 * @param value
	 *            the value to set
	 */
	public void setValue(int value) {
		mValue = value;
	}

	/**
	 * @see com.samsung.fastcast.msgs.MessageBase#getJSON()
	 */
	@Override
	public JSONObject getJSON() {
		JSONObject json = new JSONObject();
		try {
			json.put(VALUE_KEY, mValue);
			return json;
		} catch (JSONException e) {
			e.printStackTrace();
		}
		return null;
	}

	/**
	 * Fill message properties using JSONObject passed in argument.<BR>
	 * JSON should have one key "value" with sound volume value. Value can be in
	 * range <-100, 100> negative value means mute. <BR>
	 * Example of JSONObject: {"value":54} <BR>
	 * 
	 * @see com.samsung.fastcast.msgs.MessageBase#fillData(java.lang.Object)
	 * 
	 * @param json
	 *            Properly constructed JSONObject
	 */
	@Override
	void fillData(Object json) throws JSONException {
		if (json instanceof JSONObject) {
			mValue = ((JSONObject) json).getInt(VALUE_KEY);
		}
	}
}
