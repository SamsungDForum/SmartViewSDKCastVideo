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

import com.samsung.fastcast.msgs.ErrorMessage;
import com.samsung.fastcast.msgs.MessageBase;
import com.samsung.fastcast.msgs.MessageType;
import com.samsung.fastcast.msgs.PlayMessage;
import com.samsung.fastcast.msgs.SimpleTextMessage;
import com.samsung.fastcast.msgs.StatusMessage;
import com.samsung.multiscreen.Channel.OnMessageListener;
import com.samsung.multiscreen.Message;

/**
 * Remote device can send messages to this device. When messages are received
 * MultiScreen Framework call onMessage method in passed listener. This is
 * implementation of such listener. It uses MessageType to properly dispatch
 * different messages received from connection channel
 * 
 * @author m.gajewski
 *
 */
class MessageListener implements OnMessageListener {

	private MessageType mMsgType;
	private static List<OnTVMessageListener> mListeners = new ArrayList<OnTVMessageListener>();
	private static OnInternalMessageListener mInternalMessageListener = null;

	/**
	 * Constructor. Makes object of MessageListener which can dispatch messages
	 * of type msgType
	 * 
	 * @param msgType
	 *            The type of messages that listener object can dispatch
	 */
	public MessageListener(MessageType msgType) {
		mMsgType = msgType;
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
	 * Sets internal messages listeners. Internal messages are used to control
	 * connection and are not exposed outside library.
	 * 
	 * @param listener
	 */
	static void setOnInternalMessageListener(OnInternalMessageListener listener) {
		mInternalMessageListener = listener;
	}

	/**
	 * Dispatch message to listeners.
	 * 
	 * @param msg
	 *            Message to dispatch.
	 */
	private void dispatch(MessageBase msg) {
		for (OnTVMessageListener listener : mListeners) {
			switch (mMsgType) {
			case STATUS:
				listener.onStatusMessage((StatusMessage) msg);
				break;
			case PLAY:
				listener.onPlayMessage((PlayMessage) msg);
				break;
			case TEXT_MESSAGE:
				listener.onSimpleTextMessage((SimpleTextMessage) msg);
				break;
			case SUSPEND:
				listener.onSuspendMessage();
				break;
			case RESTORE:
				listener.onRestoreMessage();
				break;
			default:
				break;
			}
		}
		if (mInternalMessageListener != null) {
			switch (mMsgType) {
			case READY:
				mInternalMessageListener.onReadyMessage();
				break;
			case BYE:
				mInternalMessageListener.onByeMessage();
				break;
			case ERROR:
				mInternalMessageListener.onErrorMessage((ErrorMessage)msg);
				break;
			case SUSPEND:
				mInternalMessageListener.onSuspendMessage();
				break;
			case RESTORE:
				mInternalMessageListener.onRestoreMessage();
				break;
			default:
				break;
			}
		}
	}

	/**
	 * This method is called when MSF received message from remote device. In
	 * this implementation we assume that if received message has additional
	 * data it is either String object or HashMap<String, Object> object which
	 * represents JSON format object. It will be HashMap when on remote device
	 * in JavaScript web application it will be send as Object (not String or
	 * not stringify object). In this case we can just use it to build Java
	 * JSONObject and use as data to fill our Message object inherited from
	 * MessageBase. Message object have to implement fillData() method to do
	 * that. In case when received data are String we try to build JSONObject
	 * using this String and if it goes good we do the same as in HashMap case.
	 * The last case is when received data are not JSON string. In this case we
	 * assume that is just simple text message. For additional information see
	 * Messages classes.
	 * 
	 * @param tvmsg
	 *            Message received by MultiScreen Framework
	 * 
	 * @see com.samsung.fastcast.msgs.MessageBase
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
		MessageBase msg = null;
		try {
			msg = MessageBase.createMessage(mMsgType, dispatchData);
		} catch (JSONException e) {
			e.printStackTrace();
		}
		dispatch(msg);
	}
}
