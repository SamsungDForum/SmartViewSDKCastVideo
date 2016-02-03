/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.fastcast.msgs;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * Error message to transport error code and human readable message
 * 
 * @author m.gajewski
 *
 */
public class ErrorMessage extends MessageBase {

	private static final String CODE_KEY = "code";
	private static final String MESSAGE_KEY = "message";

	private int mCode = -1;
	private String mMessage = "";

	/**
	 * @return Code of error
	 */
	public int getCode() {
		return mCode;
	}

	/**
	 * @param code
	 *            the code of error to set
	 */
	public void setCode(int code) {
		mCode = code;
	}

	/**
	 * @return human readable message
	 */
	public String getMessage() {
		return mMessage;
	}

	/**
	 * @param message
	 *            the message to set
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
			json.put(CODE_KEY, mCode);
			json.put(MESSAGE_KEY, mMessage);
			return json;
		} catch (JSONException e) {
			e.printStackTrace();
		}
		return null;
	}

	/**
	 * Fill message properties using JSONObject passed in argument. <BR>
	 * JSON should have two keys: <BR>
	 * 1. "code" integer number with error code<BR>
	 * 2. "message" String message with human readable error description<BR>
	 * Example of JSONObject: {"code":403,message:"Access denied"}
	 * 
	 * @see com.samsung.fastcast.msgs.MessageBase#fillData(java.lang.Object)
	 * 
	 * @param json
	 *            Properly constructed JSONObject
	 */
	@Override
	void fillData(Object json) throws JSONException {
		if (json instanceof JSONObject) {
			mCode = ((JSONObject) json).getInt(CODE_KEY);
			mMessage = ((JSONObject) json).getString(MESSAGE_KEY);
		}
	}

}
