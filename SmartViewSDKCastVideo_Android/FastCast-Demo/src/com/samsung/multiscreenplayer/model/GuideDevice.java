/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.multiscreenplayer.model;


/**
 * Smartview device used for discovery adapter
 * 
 * @author m.jagiello
 *
 */

public class GuideDevice extends BaseCastDevice {
	
	public GuideDevice(String name) {
		super(name);
		this.mTextColor = android.R.color.secondary_text_light_nodisable;
	}
	
	public GuideDevice(String name, int flags) {
		super(name, android.R.color.secondary_text_light_nodisable, flags);
	}

}
