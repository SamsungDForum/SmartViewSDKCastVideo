/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.multiscreenplayer.adapter;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.TextView;

import com.samsung.multiscreen.Service;

/**
 * Array adapter to display available {@link Service}
 * @author j.bielak
 *
 */
public class ServiceAdapter extends ArrayAdapter<Service> {

	public ServiceAdapter(Context context) {
		super(context, android.R.layout.simple_list_item_1);
	}

	@Override
	public View getView(int position, View convertView, ViewGroup parent) {

		if (convertView == null) {
			LayoutInflater inflater = (LayoutInflater) getContext().getSystemService(Context.LAYOUT_INFLATER_SERVICE);
			convertView = inflater.inflate(android.R.layout.simple_list_item_1, parent, false);
		}

		Service item = getItem(position);
		TextView name = (TextView) convertView.findViewById(android.R.id.text1);
		if (name != null) {
			name.setText(item.getName());
		}

		return convertView;
	}

}
