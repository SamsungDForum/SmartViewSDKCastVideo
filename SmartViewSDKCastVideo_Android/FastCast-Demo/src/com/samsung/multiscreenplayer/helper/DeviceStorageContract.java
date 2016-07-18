/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.multiscreenplayer.helper;

import android.provider.BaseColumns;

public final class DeviceStorageContract {
	private DeviceStorageContract(){}
	
	public static abstract class Devices implements BaseColumns {
		public static final String TABLE_NAME = "devices";
        public static final String COLUMN_NAME_MAC = "mac";
        public static final String COLUMN_NAME_DEVICENAME = "devicename";
        public static final String COLUMN_NAME_URI = "uri";
        public static final String COLUMN_NAME_SSID = "ssid";
        public static final String COLUMN_NAME_OID = "outerid";
	}

}
