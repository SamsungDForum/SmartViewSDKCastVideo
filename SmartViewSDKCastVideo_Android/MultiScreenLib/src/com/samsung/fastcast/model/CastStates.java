/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.fastcast.model;

/**
 * Possible states of CastManager
 * 
 * @author m.gajewski
 *
 */
public enum CastStates {
	IDLE,
	CONNECTING,
	INSTALLING,
	CONNECTED,		//can receive now
	READY			//remote is ready and can send now
}
