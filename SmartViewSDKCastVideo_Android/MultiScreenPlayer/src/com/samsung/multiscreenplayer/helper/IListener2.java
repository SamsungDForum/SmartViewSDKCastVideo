/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.multiscreenplayer.helper;

/**
 * Basic listener template for two variables result without errors support.
 * 
 * @author a.kedzierski
 *
 * @param <T1>
 *            Type of first variable with data listener is waiting for
 * @param <T2>
 *            Type of second variable with data listener is waiting for
 */
public interface IListener2<T1, T2> {
	/**
	 * Called when requested data is ready.
	 * 
	 * @param data
	 */
	void onData(T1 data1, T2 data2);
}