/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.fastcast;

import com.samsung.fastcast.msgs.ErrorMessage;

/**
 * 
 * Listener interface used for internal communication
 * 
 * @author m.gajewski
 *
 */
interface OnInternalMessageListener {
	/**
	 * Called when MSF receive ready message.
	 */
	void onReadyMessage();

	/**
	 * Called when MSF receive bye message.
	 */
	void onByeMessage();

	/**
	 * Called when MSF receive error message
	 * 
	 * @param msg
	 *            {@link ErrorMessage} with code and human readable message
	 */
	void onErrorMessage(ErrorMessage msg);
	
	/**
	 * Called when MSF receive suspend message
	 */
	void onSuspendMessage();
	
	/**
	 * Called when MSF receive restore message
	 */
	void onRestoreMessage();
}
