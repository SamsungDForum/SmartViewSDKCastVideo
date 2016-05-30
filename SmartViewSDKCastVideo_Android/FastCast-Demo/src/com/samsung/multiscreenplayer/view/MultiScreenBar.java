/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.multiscreenplayer.view;

import android.content.Context;
import android.util.AttributeSet;
import android.util.Log;
import android.view.View;
import android.widget.ImageView;
import android.widget.RelativeLayout;
import android.widget.TextView;
import android.widget.ImageView;
import android.graphics.drawable.AnimationDrawable;

import com.samsung.fastcast.model.CastStates;
import com.samsung.fastcast.msgs.RemoteStates;
import com.samsung.fastcast.msgs.StatusMessage;
import com.samsung.fastcast.statemachine.StateChangeArgs;
import com.samsung.multiscreenplayer.R;
import com.samsung.multiscreenplayer.controller.AppController;

/**
 * Multi-screen bar that displays cast button, currently played movie title and
 * play status
 * 
 * @author b.skorupski, j.bielak
 *
 */
public class MultiScreenBar extends RelativeLayout {
	private RelativeLayout mMainLayout;
	private boolean mIsCasting = false;

	private ImageView mCastButton;
	private ImageView mPlayingIcon = null;
	private ImageView mStopIcon = null;
	private ImageView mPauseIcon = null;

	public MultiScreenBar(Context context) {
		super(context);
		initView(context);
	}

	public MultiScreenBar(Context context, AttributeSet attrs) {
		super(context, attrs);
		initView(context);
	}

	public MultiScreenBar(Context context, AttributeSet attrs, int defStyleAttr) {
		super(context, attrs, defStyleAttr);
		initView(context);
	}

	private void initView(Context context) {
		mMainLayout = (RelativeLayout) inflate(context,
				R.layout.multiscreen_bar_layout, this);

		mMainLayout.setOnClickListener(new OnClickListener() {
			@Override
			public void onClick(View view) {
				AppController.instance.onTitleBarClicked();
			}
		});

		mCastButton = (ImageView) mMainLayout.findViewById(R.id.cast_button);
		mCastButton.setOnClickListener(new OnClickListener() {
			@Override
			public void onClick(View view) {
				AppController.instance.onCastIconClicked();
			}
		});

		mPlayingIcon = (ImageView) findViewById(R.id.playing_icon);
		mStopIcon = (ImageView) findViewById(R.id.stop_icon);
		mPauseIcon = (ImageView) findViewById(R.id.pause_icon);
	}

	/**
	 * Sets video title in layout bar
	 * 
	 * @param title
	 */
	public void setTitle(String title) {
		final TextView videoTitle = (TextView) mMainLayout
				.findViewById(R.id.video_title);
		videoTitle.setText(title);
	}

	/**
	 * Sets application name as default title
	 * 
	 */
	public void setDefaultTitle() {
		final TextView videoTitle = (TextView) mMainLayout
				.findViewById(R.id.video_title);
		videoTitle.setText(R.string.app_name);
	}

	/**
	 * Sets playing icon status
	 * 
	 * @param status
	 */
	public void setPlayingStatus(StatusMessage status) {
		if (status == null) {
			mPlayingIcon.setVisibility(View.GONE);
			mStopIcon.setVisibility(View.GONE);
			mPauseIcon.setVisibility(View.GONE);
		} else {
			if (mIsCasting) {
				switch (status.getState()) {
				case PLAYING:
					mPlayingIcon.setVisibility(View.VISIBLE);
					mStopIcon.setVisibility(View.GONE);
					mPauseIcon.setVisibility(View.GONE);
					break;

				case STOPPED:
				case IDLE:
				case BUFFERING:
					mStopIcon.setVisibility(View.GONE);
					mPlayingIcon.setVisibility(View.GONE);
					mPauseIcon.setVisibility(View.GONE);
					break;

				case PAUSED:
					mPauseIcon.setVisibility(View.VISIBLE);
					mPlayingIcon.setVisibility(View.GONE);
					mStopIcon.setVisibility(View.GONE);
					break;

				default:
					break;
				}
			}
		}
	}

	/**
	 * Changes connected icon
	 * 
	 * @param isCasting
	 */
	public void setConnectedState(CastStates state_new) {

		if (state_new == CastStates.READY) {
			mIsCasting = true;
			mCastButton.setImageResource(R.drawable.uncast);
		} else {
			mIsCasting = false;

			if (state_new == CastStates.CONNECTING) {
				mCastButton.setImageResource(R.drawable.cast_icon_connecting);
				((AnimationDrawable) mCastButton.getDrawable()).start();
			} else { // IDLE
				mCastButton.setImageResource(R.drawable.cast);
				mPlayingIcon.setVisibility(View.GONE);
				mStopIcon.setVisibility(View.GONE);
				mPauseIcon.setVisibility(View.GONE);
			}
		}
	}

	/**
	 * Sets the device discovery state.
	 * 
	 * @param isDevices
	 *            True if there are smartview devices, false if not
	 */
	public void setDiscoveryState(boolean isDevices) {
		mCastButton.setImageResource(isDevices ? R.drawable.cast
				: R.drawable.cast_disabled);
	}
}
