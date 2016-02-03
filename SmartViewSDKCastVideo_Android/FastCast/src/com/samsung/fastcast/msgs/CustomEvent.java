/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.fastcast.msgs;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * CustomEvent class is base class for events that can be created outside
 * library by programmer implementing his scenario. This class is similar to
 * MessageBase but it additionally has informations about event name. If you
 * want create your own custom event you have to inherit from this class. You
 * have to name your event using unique string. <BR><BR>
 * You shouldn't use names used internally: <BR> <b> "ready", "status", "play", "reclaim", "keydown", "seek",
 * "volume", "bye", "text", "suspend", "restore" </b> <br>see: {@link MessageType}.<br>
 * If you use one of above names it can make troubles in library working.
 * 
 * @author m.gajewski
 *
 */
public abstract class CustomEvent {
	/**
	 * Set event name in your implementation
	 */
	protected String mEvent = null;

	public CustomEvent(String event) {
		mEvent = event;
	}

	/**
	 * @return the event
	 */
	public String getEvent() {
		return mEvent;
	}

	/**
	 * Abstract method need to be implemented in inherited class and should
	 * create and return empty object of this class.
	 * 
	 * @return
	 */
	public abstract CustomEvent creatyEmptyInstance();

	/**
	 * Abstract method need to be implemented in inherited class and should
	 * create JSONObject which will be sent to remote device.
	 * 
	 * @return Created and properly filled JSONObject that will be sent to
	 *         remote device.
	 */
	public abstract JSONObject getDataJSON();

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
	public abstract void fillData(Object data) throws JSONException;
}
