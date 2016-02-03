/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.fastcast;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.json.JSONException;
import org.json.JSONObject;

import com.samsung.fastcast.msgs.CustomEvent;
import com.samsung.multiscreen.Channel.OnMessageListener;
import com.samsung.multiscreen.Message;

/**
 * Remote device can send messages to this device. When messages are received
 * MultiScreen Framework call onMessage method in passed listener. This is
 * implementation of such listener. This class is very similar to
 * {@link MessageListener} but it works with custom events registered outside
 * library instead messages defined inside library.
 * 
 * @author m.gajewski
 *
 */
class CustomMessageListener implements OnMessageListener {

	private CustomEvent mListenEvent;
	private static List<OnTVMessageListener> mListeners = new ArrayList<OnTVMessageListener>();

	/**
	 * Constructor. Makes object of MessageListener which can dispatch messages
	 * of specified CustomEvent.
	 * 
	 * @param listenEvent
	 *            Object of CustomEvent which know on what event we have to
	 *            listen and how to build empty object of its class
	 */
	public CustomMessageListener(CustomEvent listenEvent) {
		mListenEvent = listenEvent;
	}

	/**
	 * Static method for add listeners. Messages received from remote device
	 * will be dispatched using this listeners. This is static method. All
	 * objects of class MessageListener use the same set of listeners. But each
	 * object is responsible for dispatch different message.
	 * 
	 * @param listener
	 *            {@link OnTVMessageListener} to add.
	 */
	public static void addOnTVMessageListener(OnTVMessageListener listener) {
		mListeners.add(listener);
	}

	/**
	 * Removes {@link OnTVMessageListener} from listeners.
	 * 
	 * @param listener
	 *            {@link OnTVMessageListener} to remove.
	 * 
	 * @see #addOnTVMessageListener(OnTVMessageListener)
	 */
	public static void removeOnTVMessageListener(OnTVMessageListener listener) {
		mListeners.remove(listener);
	}

	/**
	 * Removes all listeners
	 * 
	 * @see #addOnTVMessageListener(OnTVMessageListener)
	 */
	public static void removeAllListeners() {
		mListeners.clear();
	}

	/**
	 * Dispatch message to listeners.
	 * 
	 * @param msg
	 *            Message to dispatch.
	 */
	private void dispatch(CustomEvent event) {
		for (OnTVMessageListener listener : mListeners) {
			listener.onCustomEventMessage(event);
		}
	}

	/**
	 * This method is called when MSF received message from remote device. In
	 * this implementation we assume that if received message has additional
	 * data it is either String object or HashMap<String, Object> object which
	 * represents JSON format object. It will be HashMap when on remote device
	 * in JavaScript web application it will be send as Object (not String or
	 * not stringify object). In this case we can just use it to build Java
	 * JSONObject and use as data to fill our Event object inherited from
	 * CustomEvent. Event object have to implement fillData() method to do
	 * that. In case when received data are String we try to build JSONObject
	 * using this String and if it goes good we do the same as in HashMap case.
	 * The last case is when received data are not JSON string. In this case we
	 * assume that is just simple text message. For additional information see
	 * CustomEvent class.
	 * 
	 * @param tvmsg
	 *            Message received by MultiScreen Framework
	 * 
	 * @see com.samsung.fastcast.msgs.CustomEvent
	 * 
	 */
	@Override
	public void onMessage(Message tvmsg) {
		Object msgData = tvmsg.getData();
		Object dispatchData = null;
		if (msgData != null) {
			if (msgData instanceof Map<?, ?>) {
				JSONObject json = new JSONObject((Map<?, ?>) msgData);
				dispatchData = json;
			} else if (msgData instanceof String) {
				try {
					JSONObject json = new JSONObject((String) msgData);
					dispatchData = json;
				} catch (JSONException e) {
					dispatchData = (String) msgData;
				}
			}
		}
		CustomEvent event = null;
		try {
			event = mListenEvent.creatyEmptyInstance();
			if (event != null) {
				event.fillData(dispatchData);
			}
		} catch (JSONException e) {
			e.printStackTrace();
		}
		dispatch(event);
	}

}
