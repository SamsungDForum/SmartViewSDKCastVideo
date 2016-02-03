/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.fastcast.msgs;

/**
 * Enumerator for gather message types. Each message enum is not only const
 * value but object with methods. Each message type is constructed by
 * constructor for which we have to pass String with MSF event name and class
 * object of message object associated with the message type. Thanks that
 * objects of messages can be constructed by calling createEmptyMessage()
 * method. Enumerator also have static method which can return enum value from
 * MSF event name.
 * 
 * @author m.gajewski
 *
 */
public enum MessageType {

	READY("ready", null), 
	STATUS("status", StatusMessage.class), 
	PLAY("play", PlayMessage.class), 
	RECLAIM("reclaim", null), 
	KEYDOWN("keydown", KeydownMessage.class), 
	SEEK("seek",SeekMessage.class), 
	VOLUME("volume", VolumeMessage.class), 
	BYE("bye", null), 
	TEXT_MESSAGE("text", SimpleTextMessage.class), ERROR("error", ErrorMessage.class),
	SUSPEND("suspend", null),
	RESTORE("restore", null);

	private String mTvEvent;
	private Class<?> mMessageClass;

	/**
	 * Private constructor. Object can be constructed only on const list of this
	 * enum.
	 * 
	 * @param tvEvent
	 *            MSF event name associated with this type of message
	 * @param messageClass
	 *            Class object of message class associated with this type of
	 *            message
	 */
	private MessageType(String tvEvent, Class<?> messageClass) {
		mTvEvent = tvEvent;
		mMessageClass = messageClass;
	}

	/**
	 * This method creates empty message object if message class was set in
	 * constructor. If not it will return null.
	 * 
	 * @return Empty message object or null
	 * @throws InstantiationException
	 *             when message class was set but there's no default constructor
	 * @throws IllegalAccessException
	 *             when message class was set but default constructor is private
	 *             or not accessible
	 */
	public MessageBase createEmptyMessage() throws InstantiationException, IllegalAccessException {
		MessageBase msg = null;
		if (mMessageClass != null) {
			msg = (MessageBase) mMessageClass.newInstance();
		}
		return msg;
	}

	/**
	 * Gets name of event associated with this message type
	 * 
	 * @return String with name of event
	 */
	public String getTVEvent() {
		return mTvEvent;
	}

	/**
	 * Gets MessageType from event name associated with message type
	 * 
	 * @param tvEvent
	 *            event name
	 * @return MessageType enum
	 */
	public static MessageType fromEventName(String tvEvent) {
		MessageType type = null;
		for (MessageType t : MessageType.values()) {
			if (t.mTvEvent.compareTo(tvEvent) == 0) {
				type = t;
				break;
			}
		}
		return type;
	}
}
