/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.multiscreenplayer.adapter;


import android.content.Context;
import android.graphics.Paint;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.TextView;

import com.samsung.multiscreen.Service;
import com.samsung.multiscreenplayer.R;
import com.samsung.multiscreenplayer.model.BaseCastDevice;
import com.samsung.multiscreenplayer.model.GuideDevice;
import com.samsung.multiscreenplayer.model.SmartViewDevice;

/**
 * Array adapter to display available devices like {@link Service}
 * or any other that extends the BaseCastDevice
 * @author j.bielak, m.jagiello
 *
 */
public class ServiceAdapter extends ArrayAdapter<BaseCastDevice> {

	
	private Context mContext;
	private BaseCastDevice mMissingDevice;
	private BaseCastDevice mNoDevice;
	
	/**
	 * Creates adapter and fills it with "missing a device?" guide element
	 * @param context
	 */
	public ServiceAdapter(Context context) {
		super(context, android.R.layout.simple_list_item_1);
		this.mContext = context;
		this.mMissingDevice = new GuideDevice(mContext.getString(R.string.no_smartview_devices), Paint.UNDERLINE_TEXT_FLAG);
		this.mNoDevice = new BaseCastDevice(mContext.getString(R.string.no_devices_found));
	}

	@Override
	public View getView(int position, View convertView, ViewGroup parent) {

		if (convertView == null) {
			LayoutInflater inflater = (LayoutInflater) getContext().getSystemService(Context.LAYOUT_INFLATER_SERVICE);
			convertView = inflater.inflate(android.R.layout.simple_list_item_1, parent, false);
		}

		BaseCastDevice device = getItem(position);
		
		TextView name = (TextView) convertView.findViewById(android.R.id.text1);

		int textColor = mContext.getResources().getColor(device.getTextColor());
		
		name.setPaintFlags(device.getTextFlags());
		name.setTextColor(textColor);
		name.setText(device.getName());

		return convertView;
	}
	
	/**
	 * Adds a device based on Service data
	 * @param service
	 */
	public void add(Service service) {
		if (!contains(service))
			add(new SmartViewDevice(service));
	}
	
	/**
	 * Adds a device based on tvname - used for BLE discovery
	 * @param tvname
	 */
	public void add(String tvname) {
		add(new GuideDevice(tvname));
	}
	
	/**
	 * Removes a device based on Service data
	 * @param service
	 */
	public void remove(Service service) {
		for (int i = 0; i < this.getCount(); i++) {
			BaseCastDevice device = getItem(i);
			if (device instanceof SmartViewDevice) {			
				String deviceId = ((SmartViewDevice) device).getData().getId();
				if (service.getId().equals(deviceId)) {
					remove(device);
					return;
				}
			}
		}
	}	
	
	/**
	 * Checks if device based on Service data is already in the collection
	 * @param service
	 * @return
	 */
	private boolean contains(Service service) {
		for (int i = 0; i < this.getCount(); i++) {
			BaseCastDevice device = getItem(i);
			if (device instanceof SmartViewDevice) {			
				String deviceId = ((SmartViewDevice) device).getData().getId();
				if (service.getId().equals(deviceId))
					return true;
			}
		}
		
		return false;
	}	
	
	/**
	 * Checks if there are any smartview devices on the list
	 * @return
	 */
	public boolean hasSmartViewDevices() {
		for (int i = 0; i < getCount(); i++)
			if (getItem(i) instanceof SmartViewDevice)
				return true;
		
		return false;
	}
	
	/**
	 * Called when discovery stars
	 */
	public void searchStart() {
		this.clear();
	}
	
	/**
	 * Called when discovery stops
	 */
	public void searchStop() {
		if (this.isEmpty())
			this.add(mNoDevice);			
		this.add(mMissingDevice);
	}

}
