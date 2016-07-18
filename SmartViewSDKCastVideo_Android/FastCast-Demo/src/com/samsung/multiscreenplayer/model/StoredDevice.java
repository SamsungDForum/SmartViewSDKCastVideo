/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.multiscreenplayer.model;

import android.net.Uri;

public class StoredDevice extends BaseCastDevice {

	private String mMac;
	private Uri mUri;
	private String mSsid;
	private String mId;
	
	public StoredDevice(String name) {
		super(name);
	}
	
	public StoredDevice(String name, String mac, Uri uri, String ssid, String id) {
		super(name);
		mMac = mac;
		mUri = uri;
		mSsid = ssid;
		mId = id;
		this.mTextColor = android.R.color.secondary_text_light_nodisable;
	}

	/**
	 * @return the mMac
	 */
	public String getMac() {
		return mMac;
	}

	/**
	 * @param mMac the mMac to set
	 */
	public void setMac(String mMac) {
		this.mMac = mMac;
	}

	/**
	 * @return the mUri
	 */
	public Uri getUri() {
		return mUri;
	}

	/**
	 * @param mUri the mUri to set
	 */
	public void setUri(Uri mUri) {
		this.mUri = mUri;
	}

	/**
	 * @return the mSsid
	 */
	public String getSsid() {
		return mSsid;
	}

	/**
	 * @param mSsid the mSsid to set
	 */
	public void setSsid(String mSsid) {
		this.mSsid = mSsid;
	}
	
	/**
	 * @return the device ID
	 */
	public String getId() {
		return mId;
	}
	
	/**
	 * @param the device id
	 */
	public void setId(String id) {
		this.mId = id;
	}
}
