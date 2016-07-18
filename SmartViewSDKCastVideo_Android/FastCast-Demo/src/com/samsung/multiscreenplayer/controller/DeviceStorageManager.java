/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.multiscreenplayer.controller;

import java.util.ArrayList;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.net.Uri;
import android.os.AsyncTask;

import com.samsung.multiscreenplayer.helper.DeviceStorageContract.Devices;
import com.samsung.multiscreenplayer.helper.DeviceStorageHelper;
import com.samsung.multiscreenplayer.helper.IListener;
import com.samsung.multiscreenplayer.model.StoredDevice;

public class DeviceStorageManager {
	private DeviceStorageHelper mDBHelper;

	private interface DBTask<T> {
		T run(SQLiteDatabase db);
	}

	private interface ResultTask<T> {
		void run(T data);
	}

	private class DBTaskRunner<T> extends AsyncTask<Void, Void, T> {

		private boolean mReadOnly = false;
		private DBTask<T> mTask = null;
		private ResultTask<T> mResultTask = null;

		public DBTaskRunner(boolean readOnly, DBTask<T> task) {
			mReadOnly = readOnly;
			mTask = task;
		}

		public DBTaskRunner(boolean readOnly, DBTask<T> task,
				ResultTask<T> resultTask) {
			mReadOnly = readOnly;
			mTask = task;
			mResultTask = resultTask;
		}

		public DBTaskRunner(DBTask<T> task) {
			mTask = task;
		}

		public DBTaskRunner(DBTask<T> task, ResultTask<T> resultTask) {
			mTask = task;
			mResultTask = resultTask;
		}

		@Override
		protected T doInBackground(Void... params) {
			T data = null;
			if (mTask != null) {
				SQLiteDatabase db = null;
				if (mReadOnly == true) {
					db = mDBHelper.getReadableDatabase();
				} else {
					db = mDBHelper.getWritableDatabase();
				}
				data = mTask.run(db);
			}
			return data;
		}

		@Override
		protected void onPostExecute(T result) {
			if (mResultTask != null) {
				mResultTask.run(result);
			}
			super.onPostExecute(result);
		}

	}

	public DeviceStorageManager(Context context) {
		mDBHelper = new DeviceStorageHelper(context);
	}

	public void insertDevice(final StoredDevice device) {
		insertDevice(device, null);
	}

	public void insertDevice(final StoredDevice device,
			final IListener<Boolean> resultCallback) {
		DBTaskRunner<Boolean> runner = new DBTaskRunner<Boolean>(
				new DBTask<Boolean>() {
					@Override
					public Boolean run(SQLiteDatabase db) {
						ContentValues values = new ContentValues();
						values.put(Devices.COLUMN_NAME_MAC, device.getMac());
						values.put(Devices.COLUMN_NAME_DEVICENAME,
								device.getName());
						values.put(Devices.COLUMN_NAME_URI, device.getUri()
								.toString());
						values.put(Devices.COLUMN_NAME_SSID, device.getSsid());
						values.put(Devices.COLUMN_NAME_OID, device.getId());

						long newRowId = db.insert(Devices.TABLE_NAME, null,
								values);

						return newRowId < 0 ? false : true;
					}
				}, new ResultTask<Boolean>() {
					@Override
					public void run(Boolean data) {
						if (resultCallback != null) {
							resultCallback.onData(data);
						}
					};
				});
		runner.execute();
	}

	public void readDevices(
			final IListener<ArrayList<StoredDevice>> resultCallback) {
		readDevices(null, resultCallback);
	}

	public void readDevices(final String ssid,
			final IListener<ArrayList<StoredDevice>> resultCallback) {
		DBTaskRunner<ArrayList<StoredDevice>> runner = new DBTaskRunner<ArrayList<StoredDevice>>(
				true, new DBTask<ArrayList<StoredDevice>>() {
					@Override
					public ArrayList<StoredDevice> run(SQLiteDatabase db) {
						ArrayList<StoredDevice> data = new ArrayList<StoredDevice>();

						String[] projection = { Devices.COLUMN_NAME_MAC,
								Devices.COLUMN_NAME_DEVICENAME, Devices.COLUMN_NAME_URI,
								Devices.COLUMN_NAME_SSID, Devices.COLUMN_NAME_OID };

						String selection = null;
						String[] selectionArgs = null;
						if (ssid != null) {
							selection = Devices.COLUMN_NAME_SSID + " LIKE ?";
							selectionArgs = new String[] { ssid };
						} else {
							selectionArgs = null;
						}

						Cursor cursor = db.query(Devices.TABLE_NAME, projection, selection,
								selectionArgs, null, null, null);

						while (cursor.moveToNext()) {
							String name = cursor.getString(cursor
									.getColumnIndex(Devices.COLUMN_NAME_DEVICENAME));
							String mac = cursor.getString(cursor
									.getColumnIndex(Devices.COLUMN_NAME_MAC));
							String uri = cursor.getString(cursor
									.getColumnIndex(Devices.COLUMN_NAME_URI));
							String ssid = cursor.getString(cursor
									.getColumnIndex(Devices.COLUMN_NAME_SSID));
							String oid = cursor.getString(cursor
									.getColumnIndex(Devices.COLUMN_NAME_OID));

							StoredDevice device = new StoredDevice(name, mac, Uri.parse(uri), ssid, oid);
							data.add(device);
						}
						return data;
					}
				}, new ResultTask<ArrayList<StoredDevice>>() {
					@Override
					public void run(ArrayList<StoredDevice> data) {
						if (resultCallback != null) {
							resultCallback.onData(data);
						}
					}
				});
		runner.execute();
	}

	public void deleteDevice(final StoredDevice device,
			final IListener<Integer> resultCallback) {
		DBTaskRunner<Integer> runner = new DBTaskRunner<Integer>(
				new DBTask<Integer>() {
					@Override
					public Integer run(SQLiteDatabase db) {
						String selection = null;
						String[] selectionArgs = null;
						if (device != null) {
							selection = Devices.COLUMN_NAME_MAC + " LIKE ?";
							selectionArgs = new String[] { device.getMac() };
						}

						return db.delete(Devices.TABLE_NAME, selection,
								selectionArgs);
					}
				}, new ResultTask<Integer>() {
					@Override
					public void run(Integer data) {
						if (resultCallback != null) {
							resultCallback.onData(data);
						}
					}
				});
		runner.execute();
	}

	public void updateDevice(final StoredDevice device,
			final IListener<Integer> resultCallback) {
		DBTaskRunner<Integer> runner = new DBTaskRunner<Integer>(
				new DBTask<Integer>() {
					@Override
					public Integer run(SQLiteDatabase db) {
						String selection = Devices.COLUMN_NAME_MAC + " LIKE ?";
						String[] selectionArgs = { device.getMac() };

						ContentValues values = new ContentValues();
						values.put(Devices.COLUMN_NAME_DEVICENAME,
								device.getName());
						values.put(Devices.COLUMN_NAME_URI, device.getUri()
								.toString());
						values.put(Devices.COLUMN_NAME_SSID, device.getSsid());
						values.put(Devices.COLUMN_NAME_OID, device.getId());

						return db.update(Devices.TABLE_NAME, values, selection,
								selectionArgs);
					}
				}, new ResultTask<Integer>() {
					@Override
					public void run(Integer data) {
						if (resultCallback != null) {
							resultCallback.onData(data);
						}
					}
				});
		runner.execute();
	}

	public void clearDevices(final IListener<Integer> resultCallback) {
		deleteDevice(null, resultCallback);
	}
}
