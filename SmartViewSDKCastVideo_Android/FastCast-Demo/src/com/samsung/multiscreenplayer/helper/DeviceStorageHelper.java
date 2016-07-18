/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.multiscreenplayer.helper;

import com.samsung.multiscreenplayer.helper.DeviceStorageContract.Devices;

import android.content.Context;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

public class DeviceStorageHelper extends SQLiteOpenHelper{
    
	private static final String TEXT_TYPE = " TEXT";
	private static final String COMMA_SEP = ",";
	private static final String SQL_CREATE_ENTRIES =
	    "CREATE TABLE IF NOT EXISTS " + Devices.TABLE_NAME + " (" +
	    		Devices._ID + " INTEGER PRIMARY KEY," +
	    		Devices.COLUMN_NAME_MAC + TEXT_TYPE + " UNIQUE" + COMMA_SEP +
	    		Devices.COLUMN_NAME_DEVICENAME + TEXT_TYPE + COMMA_SEP +
	    		Devices.COLUMN_NAME_URI + TEXT_TYPE + COMMA_SEP +
	    		Devices.COLUMN_NAME_SSID + TEXT_TYPE + COMMA_SEP +
	    		Devices.COLUMN_NAME_OID + TEXT_TYPE + " UNIQUE " + 
	    " )";

	private static final String SQL_DELETE_ENTRIES =
	    "DROP TABLE IF EXISTS " + Devices.TABLE_NAME;
	
	public static final int DATABASE_VERSION = 1;
    public static final String DATABASE_NAME = "DeviceStorage.db";
	
	public DeviceStorageHelper(Context context) {
		super(context, DATABASE_NAME, null, DATABASE_VERSION);
	}

	@Override
	public void onCreate(SQLiteDatabase db) {
		db.execSQL(SQL_CREATE_ENTRIES);
	}

	@Override
	public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
		db.execSQL(SQL_DELETE_ENTRIES);
		onCreate(db);
	}
}
