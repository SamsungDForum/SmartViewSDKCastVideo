/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.fastcast.msgs;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * Base class for all messages exchanged between mobile and TV. All new messages
 * should be inherited from this class and properly implements abstract method
 * to pack and unpack properties from JSONObject or from String.
 * 
 * @author m.gajewski
 *
 */
public abstract class MessageBase {

	/**
	 * Create empty message associated with type and fill it with data. Message
	 * class have to inherit from MessageBase and properly implements fillData
	 * method. Data parameter may be simple String message or JSONObject. <BR>
	 * 
	 * @param type
	 *            MessageType which message should be created.
	 * @param data
	 *            String for simple message or JSONObject for complex structure
	 * @return Message object associated with message type and filled with data.
	 * @throws JSONException
	 *             in case of use wrong JSONObject data for this type of
	 *             message.
	 */
	public static MessageBase createMessage(MessageType type, Object data) throws JSONException {
		MessageBase msg = null;
		try {
			msg = type.createEmptyMessage();
			if (msg != null && data != null) {
				msg.fillData(data);
			}
		} catch (InstantiationException e) {
			e.printStackTrace();
		} catch (IllegalAccessException e) {
			e.printStackTrace();
		}
		return msg;
	}

	/**
	 * Abstract method need to be implemented in inherited class and should
	 * create JSONObject which will be sent to remote device.
	 * 
	 * @return Created and properly filled JSONObject that will be sent to
	 *         remote device.
	 */
	public abstract JSONObject getJSON();

	/**
	 * Internal abstract method need to be implemented in inherited class. <BR>
	 * This method is used for filling message object with data received from
	 * remote device. Parameter data can be either String for simple messages or
	 * JSONObject for complex structures.
	 * 
	 * @param data
	 *            String or JSONObject depends on your message.
	 * @throws JSONException
	 *             Exception should be thrown when data argument is wrong
	 *             JSONObject for your message.
	 */
	abstract void fillData(Object data) throws JSONException;
}
