/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.fastcast.msgs;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * Simple text message class.
 * 
 * @author m.gajewski
 * 
 *
 */
public class SimpleTextMessage extends MessageBase {

	private static final String MESSAGE_KEY = "message";

	private String mMessage = "";

	/**
	 * Gets simple String message.
	 * 
	 * @return String with simple message
	 */
	public String getMessage() {
		return mMessage;
	}

	/**
	 * Sets simple message.
	 * 
	 * @param message
	 *            Simple String message
	 */
	public void setMessage(String message) {
		mMessage = message;
	}

	/**
	 * @see com.samsung.fastcast.msgs.MessageBase#getJSON()
	 */
	@Override
	public JSONObject getJSON() {
		JSONObject json = new JSONObject();
		try {
			json.put(MESSAGE_KEY, mMessage);
		} catch (JSONException e) {
			e.printStackTrace();
		}
		return json;
	}

	/**
	 * Fill message properties using String or JSONObject passed in argument.<BR>
	 * JSON should have one key "message" with simple text message.<BR>
	 * Example of JSONObject: {"message":"Simple text message"}
	 * 
	 * @see com.samsung.fastcast.msgs.MessageBase#fillData(java.lang.Object)
	 * 
	 * @param data
	 *            String with simple text message or <BR>
	 *            JSONObject: {"message":"Simple text message"}
	 */
	@Override
	void fillData(Object data) throws JSONException {
		if (data instanceof String) {
			mMessage = (String) data;
		} else if (data instanceof JSONObject) {
			JSONObject json = (JSONObject) data;
			if (json.opt(MESSAGE_KEY) != null) {
				mMessage = json.getString(MESSAGE_KEY);
			} else {
				mMessage = json.toString();
			}
		}
	}
}
