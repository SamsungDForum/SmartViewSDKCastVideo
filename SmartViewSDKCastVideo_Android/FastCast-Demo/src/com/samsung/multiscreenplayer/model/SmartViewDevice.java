/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.multiscreenplayer.model;

import com.samsung.multiscreen.Service;

/**
 * Smartview device used for discovery adapter
 * 
 * @author m.jagiello
 *
 */

public class SmartViewDevice extends BaseCastDevice {

	private Service mData;
	
	public SmartViewDevice(Service data) {
		super(data.getName());
		this.mData = data;
	}

	public Service getData() {
		return mData;
	}

	public void setData(Service mData) {
		this.mData = mData;
	}

}
