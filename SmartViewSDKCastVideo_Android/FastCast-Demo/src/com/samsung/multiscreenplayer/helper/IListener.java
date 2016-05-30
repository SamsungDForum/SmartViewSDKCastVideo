/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.multiscreenplayer.helper;

/**
 * Basic listener template without errors support.
 * 
 * @author a.kedzierski
 *
 * @param <T>
 *            Type of data listener is waiting for
 */
public interface IListener<T> {
	/**
	 * Called when requested data is ready.
	 * 
	 * @param data
	 */
	void onData(T data);
}