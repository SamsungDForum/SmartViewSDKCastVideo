/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.multiscreenplayer.view;

import java.text.SimpleDateFormat;
import java.util.Date;

import android.content.Context;
import android.content.res.Configuration;
import android.content.res.Resources;
import android.graphics.Bitmap;
import android.util.AttributeSet;
import android.util.DisplayMetrics;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.RelativeLayout;
import android.widget.SeekBar;
import android.widget.SeekBar.OnSeekBarChangeListener;
import android.widget.TextView;

import com.samsung.fastcast.msgs.RemoteStates;
import com.samsung.fastcast.msgs.StatusMessage;
import com.samsung.multiscreenplayer.R;
import com.samsung.multiscreenplayer.controller.AppController;
import com.samsung.multiscreenplayer.helper.IListener2;
import com.samsung.multiscreenplayer.helper.ThumbsDownloader;
import com.samsung.multiscreenplayer.model.VideoSource;

/**
 * Main application remote video player. Displays TV remote controls.
 * 
 * @author j.bielak
 * 
 */
public class RemotePlayerView extends RelativeLayout implements IListener2<String, Bitmap> {

	/**
	 * Those action are send to {@link AppController#onPlayerCastAction(PlayerCastAction, Object)}
	 */
	public enum PlayerCastAction {
		PLAYPAUSE, STOP, FAST_FORWARD, REWIND, SEEK, VOLUME_DOWN, VOLUME_UP
	}
	
	Context ctx;

	public static final int SEEK_JUMP = 5000;

	private boolean isSeekeing = false;
	private int desiredPosition = 0;

	//Main remote video player layout
	private RelativeLayout mMainLayout;
	private ImageView mSurfaceCastThumb;
	private View mSurfaceCastInfo;
	private View mSurfaceCastVolume;
	private TextView mSurfaceCastVolumeText;
	private FrameLayout mSurfaceLayout;

	//Layout that holds seekbar and playback time indicating textviews
	private View mSeekLayout;
	private SeekBar mSeekBar;
	private TextView mCurrentSeekTextView;
	private TextView mDurationTextView;

	//Layout displaying player controls
	private LinearLayout mControlsLayout;
	private ImageView mPlayButton;
	private ImageView mPauseButton;
	private ImageView mStopButton;
	private ImageView mFFButton;
	private ImageView mRWButton;
	private ImageView mVolUpButton;
	private ImageView mVolDownButton;

	//View for displaying loading screen
	private LoadingView mLoadingView;

	//Current position recived from TV in status message
	private int mCurrentPosition = 0;
	private long mLastVolumeChangeTime = 0;

	private int currentOrientation;

	// base view height in dp
	private int baseHeight = 150;

	public RemotePlayerView(Context context, AttributeSet attrs, int defStyleAttr) {
		super(context, attrs, defStyleAttr);
		initView(context);
	}

	public RemotePlayerView(Context context, AttributeSet attrs) {
		super(context, attrs);
		initView(context);
	}

	public RemotePlayerView(Context context) {
		super(context);
		initView(context);
	}

	/**
	 * Update and shows current volume
	 * @param volume
	 */
	public void updateVolume(int volume) {
		mSurfaceCastVolumeText.setText(" " + volume);
		showVolumeInfo();
	}

	/**
	 * Sets remote player thumbnail
	 * @param video
	 */
	public void setThumbnail(String uri) {
		ThumbsDownloader.getBitmapFromURL(uri, this);
	}

	@Override
	public void onData(String url, Bitmap bmp) {
		mSurfaceCastThumb.setImageBitmap(bmp);
	}

	/**
	 * Sets player status. Handles weird seekbar behavior and shows/hides loading screen
	 * @param msg
	 *            Message with currently played video data
	 */
	public void setPlayerStatus(StatusMessage msg) {
		if (System.currentTimeMillis() - mLastVolumeChangeTime > 3000) {
			hideVolumeInfo();
		}

		RemoteStates state = msg.getState();
		mSurfaceCastVolumeText.setText(" " + msg.getVolume());
		int pos = (int) msg.getPosition();
		if (!isSeekeing) {
			if (state == RemoteStates.PLAYING) {
				setPlayerControlsVisible(true);
				updateSeekUI(pos);
				mCurrentPosition = pos;				
			}
			int max = (int) msg.getTotalTime();
			if (max != mSeekBar.getMax()) {
				mSeekBar.setMax(max);
				mDurationTextView.setText(millisecondsToString(max));
			}
			switch (state) {
			case PLAYING:
				updatePlayPauseUI(true);
				break;
			default:
				updatePlayPauseUI(false);
				break;
			}
		} else {
			showLoading();
			int currentDiff = pos - mCurrentPosition;
			if (currentDiff > 0 && currentDiff < 1500) {
				// just old update. It was sent just before seek. Ignore it.

			} else {
				int seekDiff = Math.abs(pos - desiredPosition);
				if (seekDiff > 999 && pos > desiredPosition) {
					isSeekeing = false;
					setPlayerControlsVisible(true);
					updateSeekUI(pos);
					mCurrentPosition = pos;
				}
			}
		}
	}

	/**
	 * Gets TVs current seek position.
	 * 
	 * @return
	 */
	public int getCurrentPosition() {
		return mCurrentPosition;
	}
	
	/**
	 * Shows loading screen
	 */
	public void showLoading() {
		if (mLoadingView != null) {
			mLoadingView.setVisibility(View.VISIBLE);
		}
	}

	/**
	 * Hides loading screen
	 */
	public void hideLoading() {
		if (mLoadingView != null) {
			mLoadingView.setVisibility(View.GONE);
		}
	}

	private void initView(Context context) {
		
		this.ctx = context;
		
		mMainLayout = (RelativeLayout) inflate(context, R.layout.remote_player_layout, this);
		mSurfaceLayout = (FrameLayout) mMainLayout.findViewById(R.id.player_surface_layout);
		mSurfaceCastInfo = mMainLayout.findViewById(R.id.player_casting_to_tv);
		mSurfaceCastThumb = (ImageView) mMainLayout.findViewById(R.id.player_casting_thumbnail);
		mSurfaceCastVolume = mMainLayout.findViewById(R.id.player_volume);
		mSurfaceCastVolumeText = (TextView) mMainLayout.findViewById(R.id.player_volume_text);
		mSeekBar = (SeekBar) mMainLayout.findViewById(R.id.player_seekBar);
		mControlsLayout = (LinearLayout) mMainLayout.findViewById(R.id.player_controls_layout);
		mPlayButton = (ImageView) mMainLayout.findViewById(R.id.play_button);
		mPauseButton = (ImageView) mMainLayout.findViewById(R.id.pause_button);
		mStopButton = (ImageView) mMainLayout.findViewById(R.id.stop_button);
		mFFButton = (ImageView) mMainLayout.findViewById(R.id.fast_forward_button);
		mRWButton = (ImageView) mMainLayout.findViewById(R.id.rewind_back_button);
		mCurrentSeekTextView = (TextView) mMainLayout.findViewById(R.id.player_current_seek_textview);
		mDurationTextView = (TextView) mMainLayout.findViewById(R.id.player_duration_textview);
		mSeekLayout = mMainLayout.findViewById(R.id.player_seek_layout);
		mLoadingView = (LoadingView) findViewById(R.id.player_loading_view);
		mVolUpButton = (ImageView) mMainLayout.findViewById(R.id.volume_up_button);
		mVolDownButton = (ImageView) mMainLayout.findViewById(R.id.volume_down_button);

		mSeekBar.setOnSeekBarChangeListener(new OnSeekBarChangeListener() {

			@Override
			public void onStopTrackingTouch(SeekBar seekBar) {
				AppController.instance.onPlayerCastAction(PlayerCastAction.SEEK, desiredPosition);
			}

			@Override
			public void onStartTrackingTouch(SeekBar seekBar) {
				desiredPosition = mCurrentPosition;
				isSeekeing = true;
			}

			@Override
			public void onProgressChanged(SeekBar seekBar, int progress, boolean fromUser) {
				if (fromUser) {
					desiredPosition = progress;
					mCurrentSeekTextView.setText(millisecondsToString(progress));
				}
			}
		});

		mPlayButton.setOnClickListener(new OnClickListener() {

			@Override
			public void onClick(View view) {
				AppController.instance.onPlayerCastAction(PlayerCastAction.PLAYPAUSE, null);
			}
		});

		mStopButton.setOnClickListener(new OnClickListener() {

			@Override
			public void onClick(View view) {

				AppController.instance.onPlayerCastAction(PlayerCastAction.STOP, null);

			}
		});

		mPauseButton.setOnClickListener(new OnClickListener() {

			@Override
			public void onClick(View view) {

				AppController.instance.onPlayerCastAction(PlayerCastAction.PLAYPAUSE, null);

			}
		});

		mRWButton.setOnClickListener(new OnClickListener() {

			@Override
			public void onClick(View v) {

				AppController.instance.onPlayerCastAction(PlayerCastAction.REWIND, null);

			}
		});

		mFFButton.setOnClickListener(new OnClickListener() {

			@Override
			public void onClick(View v) {
				AppController.instance.onPlayerCastAction(PlayerCastAction.FAST_FORWARD, null);
			}
		});

		mVolUpButton.setOnClickListener(new OnClickListener() {

			@Override
			public void onClick(View v) {
				AppController.instance.onPlayerCastAction(PlayerCastAction.VOLUME_UP, null);
				showVolumeInfo();
			}
		});

		mVolDownButton.setOnClickListener(new OnClickListener() {

			@Override
			public void onClick(View v) {
				AppController.instance.onPlayerCastAction(PlayerCastAction.VOLUME_DOWN, null);
				showVolumeInfo();
			}
		});
		hideVolumeInfo();
	}

	private void updateSeekUI(int position) {
		mSeekBar.setProgress(position);
		mCurrentSeekTextView.setText(millisecondsToString(position));
	}

	private void setPlayerControlsVisible(boolean visible) {
		if (visible) {
			mControlsLayout.setVisibility(View.VISIBLE);
			mSeekLayout.setVisibility(View.VISIBLE);
			hideLoading();
		} else {
			showLoading();
			mControlsLayout.setVisibility(View.INVISIBLE);
			mSeekLayout.setVisibility(View.INVISIBLE);
		}
	}

	private void updatePlayPauseUI(boolean isPlaying) {
		if (isPlaying) {
			mPlayButton.setVisibility(GONE);
			mPauseButton.setVisibility(VISIBLE);
		} else {
			mPlayButton.setVisibility(VISIBLE);
			mPauseButton.setVisibility(GONE);
		}
	}
	
	/**
	 * Method called when phone orientation changes.
	 * 
	 * @param orientation
	 */
	public void onOrientationChanged(int orientation) {
		currentOrientation = orientation;
		setVideoViewSize();				
	}
	
	/**
	 * Method called when there's a need to change the video view size.
	 * 
	 * @param bottomMargin
	 */
	private void setVideoViewSize() {									
		
		DisplayMetrics displayMetrics = ctx.getResources().getDisplayMetrics();
		android.view.ViewGroup.LayoutParams lp = mSurfaceLayout.getLayoutParams();
		lp.width = displayMetrics.widthPixels;
		
		if (currentOrientation == Configuration.ORIENTATION_LANDSCAPE)
			lp.height = (int)(displayMetrics.heightPixels * 0.65);
		else
			lp.height = convertDpToPixel(baseHeight );
		
		mSurfaceLayout.setLayoutParams(lp);		
		mSurfaceLayout.invalidate();
	}
	
	/**
	 * Converts dp to pixels
	 * @param dp dp to convert
	 * @return pixels
	 */
	private int convertDpToPixel(int dp){
	    Resources resources = ctx.getResources();
	    DisplayMetrics metrics = resources.getDisplayMetrics();
	    return (int)(dp * ((float) metrics.densityDpi / DisplayMetrics.DENSITY_DEFAULT));
	}

	/**
	 * Converts millisecond to String
	 * 
	 * @param millis
	 * @return String time with minutes and seconds
	 */
	private String millisecondsToString(int millis) {
		Date date = new Date(millis);
		SimpleDateFormat formatter = new SimpleDateFormat("mm:ss");
		return formatter.format(date);
	}

	public void showVolumeInfo() {
		mLastVolumeChangeTime = System.currentTimeMillis();
		mSurfaceCastInfo.setVisibility(View.GONE);
		mSurfaceCastVolume.setVisibility(View.VISIBLE);
	}

	private void hideVolumeInfo() {
		mSurfaceCastVolume.setVisibility(View.GONE);
		mSurfaceCastInfo.setVisibility(View.VISIBLE);
	}
}
