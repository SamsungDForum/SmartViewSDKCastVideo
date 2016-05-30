/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.fastcast.msgs;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * Keydown message to transport information about keys. It is sended only by
 * mobile to TV and use W3C keycodes standard:
 * http://www.w3.org/TR/DOM-Level-3-Events-code/
 * 
 * @author m.gajewski
 *
 */
public class KeydownMessage extends MessageBase {
	private static final String KEYCODE_KEY = "keycode";

	private String mKeycode = "";

	/**
	 * @return the keycode
	 */
	public String getKeycode() {
		return mKeycode;
	}

	/**
	 * @param keycode
	 *            the keycode to set
	 */
	public void setKeycode(String keycode) {
		mKeycode = keycode;
	}

	/**
	 * @see com.samsung.fastcast.msgs.MessageBase#getJSON()
	 */
	@Override
	public JSONObject getJSON() {
		JSONObject json = new JSONObject();
		try {
			json.put(KEYCODE_KEY, mKeycode);
			return json;
		} catch (JSONException e) {
			e.printStackTrace();
		}
		return null;
	}

	/**
	 * Fill message properties using JSONObject passed in argument. <BR>
	 * JSON should have one key "keycode" and its value should be keycode string
	 * from W3C standard: http://www.w3.org/TR/DOM-Level-3-Events-code/ <BR>
	 * Example of JSONObject: {"keycode":"MediaPlayPasue"}
	 * 
	 * @see com.samsung.fastcast.msgs.MessageBase#fillData(java.lang.Object)
	 * 
	 * @param json
	 *            Properly constructed JSONObject
	 */
	@Override
	void fillData(Object json) throws JSONException {
		if (json instanceof JSONObject) {
			mKeycode = ((JSONObject) json).getString(KEYCODE_KEY);
		}
	}
}
