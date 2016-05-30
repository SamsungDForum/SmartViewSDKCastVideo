/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.multiscreenplayer.model;


/**
 * Base cast device used for discovery adapter
 * 
 * @author m.jagiello
 *
 */

public class BaseCastDevice {

	String mName;
	int mTextColor = android.R.color.secondary_text_light;
	int mTextFlags = 0;
	
	public enum DeviceType {
		MissingDevice, NoDevice, SmartViewDevice, BleDevice
	}

	public BaseCastDevice(String name) {
		this.mName = name;
	}
	
	public BaseCastDevice(String name, int color) {
		this.mName = name;
		this.mTextColor = color;
	}
	
	public BaseCastDevice(String name, int color, int flags) {
		this.mName = name;
		this.mTextColor = color;
		this.mTextFlags = flags;
	}

	public String getName() {
		return mName;
	}

	public void setName(String mName) {
		this.mName = mName;
	}

	public int getTextColor() {
		return mTextColor;
	}
	
	public int getTextFlags() {
		return mTextFlags;
	}		
	
	public void setTextFlags(int flags) {
		this.mTextFlags = flags;
	}

}
