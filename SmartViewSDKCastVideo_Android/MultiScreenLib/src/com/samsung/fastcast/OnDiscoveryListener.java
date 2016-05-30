/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.fastcast;

import com.samsung.multiscreen.Service;

/**
 * Discovery listener interface. Object implementing this interface may be add
 * as listener for devices found and lost in discovery process
 * 
 * @author m.gajewski
 *
 */
public interface OnDiscoveryListener {
	/**
	 * Called when new device is found. MSF proxy.
	 * 
	 * @param service
	 *            Service object of found device
	 */
	void onServiceFound(Service service);

	/**
	 * Called when some device is lost. MSF proxy.
	 * 
	 * @param service
	 *            Service object of lost device
	 */
	void onServiceLost(Service service);
}
