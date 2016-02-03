/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.fastcast.model;

import java.util.Map;

import com.samsung.multiscreen.Service;

/**
 * Data transport class. It gather all data needed to make connection to remote
 * device. Service to which connection will be made, remote application id and
 * channel id are necessery. Start arguments and connection attributes are
 * optionally. It is good practice to pass client name in attributes using key:
 * "name".
 * 
 * @author m.gajewski
 *
 */
public class ConnectData {
	private Service mService;
	private String mAppId;
	private String mChannelId;
	private Map<String, Object> mStartArgs;
	private Map<String, String> mConnectionAttributes;

	/**
	 * Remote service property getter
	 * 
	 * @return Remote Service
	 */
	public Service getService() {
		return mService;
	}

	/**
	 * Remote service property setter
	 * 
	 * @param service
	 *            Service to set
	 */
	public void setService(Service service) {
		mService = service;
	}

	/**
	 * Remote application ID getter
	 * 
	 * @return Remote application ID
	 */
	public String getAppId() {
		return mAppId;
	}

	/**
	 * Remote application ID setter
	 * 
	 * @param appId
	 *            remote application ID
	 * 
	 */
	public void setAppId(String appId) {
		mAppId = appId;
	}

	/**
	 * Channel ID getter
	 * 
	 * @return Channel ID
	 */
	public String getChannelId() {
		return mChannelId;
	}

	/**
	 * Channel ID setter
	 * 
	 * @param channelId
	 *            Channel ID to set
	 */
	public void setChannelId(String channelId) {
		mChannelId = channelId;
	}

	/**
	 * Start arguments getter
	 * 
	 * @return Start arguments
	 */
	public Map<String, Object> getStartArgs() {
		return mStartArgs;
	}

	/**
	 * Start arguments setter
	 * 
	 * @param startArgs
	 *            Start arguments to set
	 */
	public void setStartArgs(Map<String, Object> startArgs) {
		mStartArgs = startArgs;
	}

	/**
	 * Connection attributes getter
	 * 
	 * @return Connection attributes
	 */
	public Map<String, String> getConnectionAttributes() {
		return mConnectionAttributes;
	}

	/**
	 * Connection attributes setter
	 * 
	 * @param connectionAttributes
	 *            Connection attributes to set
	 */
	public void setConnectionAttributes(Map<String, String> connectionAttributes) {
		mConnectionAttributes = connectionAttributes;
	}
}
