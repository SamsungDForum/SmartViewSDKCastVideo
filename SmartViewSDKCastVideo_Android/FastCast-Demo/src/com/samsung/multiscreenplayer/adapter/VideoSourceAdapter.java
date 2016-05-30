/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.multiscreenplayer.adapter;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.ImageView;
import android.widget.TextView;

import com.samsung.multiscreenplayer.R;
import com.samsung.multiscreenplayer.controller.AppController;
import com.samsung.multiscreenplayer.helper.IListener2;
import com.samsung.multiscreenplayer.helper.ThumbsDownloader;
import com.samsung.multiscreenplayer.model.VideoSource;

/**
 * Adapter responsible for showing video list.
 * Converts data from {@link VideoSource} to views.
 * 
 * @author a.kedzierski
 * 
 */
public class VideoSourceAdapter extends ArrayAdapter<VideoSource> {
	public static final int COLOR_LIGHT_BLUE = 0xFF4186DF;
	
	public VideoSourceAdapter(Context context) {
		super(context, android.R.layout.simple_list_item_1);
	}

	@Override
	public View getView(int position, View convertView, ViewGroup parent) {
		if (convertView == null) {
			LayoutInflater inflater = (LayoutInflater) getContext().getSystemService(Context.LAYOUT_INFLATER_SERVICE);
			convertView = inflater.inflate(R.layout.video_element, parent, false);
		}
		final TextView videoTitle = (TextView) convertView.findViewById(R.id.video_title);
		final TextView videoTime = (TextView) convertView.findViewById(R.id.video_time);
		final TextView videoViews = (TextView) convertView.findViewById(R.id.video_views);
		final ImageView videoThumb = (ImageView) convertView.findViewById(R.id.video_thumb);
		final View videoGray = convertView.findViewById(R.id.video_gray);
		final View videoLoader = convertView.findViewById(R.id.video_thumb_loader);

		VideoSource item = getItem(position);
		videoTitle.setText(item.getTitle());
		videoTime.setText(item.getPlaybackTime());
		videoViews.setText(item.getViews() + " views");

		//Current item should have different color
		if (AppController.instance.getCurrentVideoSource() == item) {
			videoTitle.setTextColor(COLOR_LIGHT_BLUE);
			videoTime.setTextColor(COLOR_LIGHT_BLUE);
			videoViews.setTextColor(COLOR_LIGHT_BLUE);
			videoGray.setVisibility(View.VISIBLE);
		} else {
			videoTitle.setTextColor(Color.DKGRAY);
			videoTime.setTextColor(Color.DKGRAY);
			videoViews.setTextColor(Color.DKGRAY);
			videoGray.setVisibility(View.INVISIBLE);
		}

		//Request video thumbnail download
		ThumbsDownloader.getBitmapFromURL(item.getImageUri(), new IListener2<String, Bitmap>() {
			@Override
			public void onData(String url, Bitmap bitmap) {
				if (bitmap != null) {
					videoThumb.setImageBitmap(bitmap);
					videoLoader.setVisibility(View.INVISIBLE);
				}
			}
		});
		return convertView;
	}
}
