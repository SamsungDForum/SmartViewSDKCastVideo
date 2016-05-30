/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.multiscreenplayer.view;

import android.content.Context;
import android.util.AttributeSet;
import android.view.MotionEvent;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.TextView;

import com.samsung.multiscreenplayer.R;

/**
 * Shows progress and handles all touch events on it
 * 
 * @author j.bielak
 *
 */
public class LoadingView extends FrameLayout {

	private View mMainLayout;

	public LoadingView(Context context) {
		super(context);
		initView(context);
	}

	public LoadingView(Context context, AttributeSet attrs) {
		super(context, attrs);
		initView(context);
	}

	public LoadingView(Context context, AttributeSet attrs, int defStyleAttr) {
		super(context, attrs, defStyleAttr);
		initView(context);
	}

	private void initView(Context context) {
		mMainLayout = inflate(context, R.layout.loading_layout, this);
		mMainLayout.setOnTouchListener(new OnTouchListener() {

			@Override
			public boolean onTouch(View v, MotionEvent event) {
				//Block all touches in view and all views behind it
				return true;
			}
		});
	}
	
	public void setTextColor(int color) {
		TextView tv = (TextView) findViewById(R.id.loading_textview);
		tv.setTextColor(color);
	}
	
	public void setLoadingText(String text) {
		TextView tv = (TextView) findViewById(R.id.loading_textview);
		tv.setText(text);
	}
}
