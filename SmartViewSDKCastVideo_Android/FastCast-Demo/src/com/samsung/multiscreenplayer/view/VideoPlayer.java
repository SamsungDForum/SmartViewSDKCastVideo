/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.multiscreenplayer.view;

import java.text.SimpleDateFormat;
import java.util.Date;

import android.content.Context;
import android.content.res.Configuration;
import android.media.MediaPlayer;
import android.media.MediaPlayer.OnCompletionListener;
import android.media.MediaPlayer.OnPreparedListener;
import android.net.Uri;
import android.os.Handler;
import android.util.AttributeSet;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.RelativeLayout;
import android.widget.SeekBar;
import android.widget.SeekBar.OnSeekBarChangeListener;
import android.widget.TextView;
import android.widget.VideoView;

import com.samsung.multiscreenplayer.R;
import com.samsung.multiscreenplayer.controller.AppController;
import com.samsung.multiscreenplayer.controller.AppController.ViewsState;
import com.samsung.multiscreenplayer.model.VideoSource;

/**
 * Main application local video player. Handles videos, shows player controls that control video.
 * 
 * @author j.bielak
 * 
 */
public class VideoPlayer extends RelativeLayout{

	public static final int SEEK_JUMP = 5000;

	private boolean isSeekeing = false;
	private int desiredPosition = 0;
	int videoWidth;
	int videoHeight;
	int currentOrientation;

	private Context ctx;

	private RelativeLayout mMainLayout; //Main video player layout

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

	//View for displaying loading screen
	private LoadingView mLoadingView;

	private int mCurrentPosition = 0;

	//Value used to initialize player at given position
	private int mInitialPosition = 0;

	
	//Currently played video item
	private VideoSource mCurrentItem;
	
	//Main video view displaying video content
	private VideoView mVideoView;

	//Handler for updating current seek status from
	private Handler mHandler = new Handler();
	private Runnable mPlayerUpdateRunnable = new Runnable() {

		@Override
		public void run() {
			if (mVideoView != null) {
				if (mVideoView.isPlaying()) {
					// Sometimes media player has incorrect position, especialy
					// not in playing mode
					mCurrentPosition = mVideoView.getCurrentPosition();
					if (!isSeekeing) {
						hideLoading();
						updateSeekUI(mCurrentPosition);
					} else {
						if (mCurrentPosition >= desiredPosition) {
							isSeekeing = false;
							hideLoading();
							updateSeekUI(mCurrentPosition);
						}
					}
				}
				mHandler.postDelayed(this, 250);
				AppController.instance.updateCurrentPosition(mCurrentPosition);
			}
		}
	};

	public VideoPlayer(Context context, AttributeSet attrs, int defStyleAttr) {
		super(context, attrs, defStyleAttr);
		initView(context);
	}

	public VideoPlayer(Context context, AttributeSet attrs) {
		super(context, attrs);
		initView(context);
	}

	public VideoPlayer(Context context) {
		super(context);
		initView(context);
	}

	/**
	 * Sets and prepares async video source in
	 * @param item
	 */
	public void setVideoSource(VideoSource item) {
		mCurrentItem = item;
		if (mVideoView != null) {
			setPlayerControlsVisible(false);
			mHandler.removeCallbacks(mPlayerUpdateRunnable);
			mCurrentPosition = 0;
			mInitialPosition = 0;
			try {
				mVideoView.setVideoURI(Uri.parse(item.getUri()));
			} catch (IllegalArgumentException e) {
				e.printStackTrace();
			} catch (SecurityException e) {
				e.printStackTrace();
			} catch (IllegalStateException e) {
				e.printStackTrace();
			}
		}
	}

	/**
	 * Plays video with seek position. Decides if load and play new video source,
	 * or just play current video source
	 * 
	 * @param currentVideoSource
	 * @param position
	 */
	public void playWithSeek(VideoSource currentVideoSource, long position) {
		if (mCurrentItem == null || currentVideoSource.getId() != mCurrentItem.getId()) {
			setVideoSource(currentVideoSource);
			mInitialPosition = (int) position;
		} else {
			start();
			seekTo((int) position);
			mVideoView.pause();
			updateSeekUI((int) position);
			updatePlayPauseUI();
		}
	}

	/**
	 * Gets media player current seek. Sometimes it can give incorrect data due
	 * to {@link MediaPlayer} behavior
	 * 
	 * @return
	 */
	public int getCurrentPosition() {
		return mCurrentPosition;
	}
	
	/**
	 * Suspends {@link VideoView} and updates controls UI
	 */
	public void suspend() {
		mVideoView.suspend();
		updatePlayPauseUI();
	}
	
	/**
	 * Resumes {@link VideoView} after suspended, sets seek and updates controls UI
	 */
	public void resume() {
		mVideoView.resume();
		mVideoView.seekTo(mCurrentPosition);
		updatePlayPauseUI();
		mVideoView.invalidate();
	}
	
	/**
	 * Stops {@link VideoView} and updates player controls UI
	 */
	public void stop() {			
		mVideoView.stopPlayback();
		mCurrentItem = null;
		mInitialPosition = 0;
		mHandler.removeCallbacks(mPlayerUpdateRunnable);		
		updatePlayPauseUI();
	}

	private void initView(Context context) {
		ctx = context;

		mMainLayout = (RelativeLayout) inflate(context, R.layout.local_player_layout, this);
		mVideoView = (VideoView) mMainLayout.findViewById(R.id.player_videoview);
		mSurfaceLayout = (FrameLayout) mMainLayout.findViewById(R.id.player_surface_layout);
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

		mVideoView.setOnPreparedListener(new OnPreparedListener() {
			
			@Override
			public void onPrepared(MediaPlayer mp) {
				mediaPrepared(mp);
			}
		});
		
		mVideoView.setOnCompletionListener(new OnCompletionListener() {
			
			@Override
			public void onCompletion(MediaPlayer arg0) {
				AppController.instance.onMediaFinished();
			}
		});
		
		mSeekBar.setOnSeekBarChangeListener(new OnSeekBarChangeListener() {

			@Override
			public void onStopTrackingTouch(SeekBar seekBar) {
				
				seekTo(desiredPosition);
				showLoading();
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
				switchStartPause();

			}
		});

		mStopButton.setOnClickListener(new OnClickListener() {

			@Override
			public void onClick(View view) {
				AppController.instance.showView(ViewsState.LIST);
			}
		});

		mPauseButton.setOnClickListener(new OnClickListener() {

			@Override
			public void onClick(View view) {
				switchStartPause();
			}
		});

		mRWButton.setOnClickListener(new OnClickListener() {

			@Override
			public void onClick(View v) {
				int current = mVideoView.getCurrentPosition();
				seekTo(Math.max(0, current - SEEK_JUMP));
			}
		});

		mFFButton.setOnClickListener(new OnClickListener() {

			@Override
			public void onClick(View v) {
				int current = mVideoView.getCurrentPosition();
				int max = mVideoView.getDuration();
				seekTo(Math.min(max, current + SEEK_JUMP));
			}
		});
	}
	
	private void start() {
		mVideoView.start();
		updatePlayPauseUI();
	}

	private void switchStartPause() {
		if (mVideoView.isPlaying()) {
			mVideoView.pause();
			updatePlayPauseUI();
		} else {
			mVideoView.start();
			updatePlayPauseUI();
		}
	}

	/**
	 * Seeks to position in media player and updates UI
	 * 
	 * @param position
	 */
	private void seekTo(int position) {
		mVideoView.seekTo(position);
	}

	private void updateSeekUI(int position) {
		mSeekBar.setProgress(position);
		mCurrentSeekTextView.setText(millisecondsToString(position));
	}

	
	
	/**
	 * Method called when {@link VideoView} content is prepared.
	 * Resizes layout to fit video ratio. Sets UI, starts timer and plays
	 * content
	 * 
	 * @param mp
	 */
	private void mediaPrepared(MediaPlayer mp) {
		videoWidth = mp.getVideoWidth();
		videoHeight = mp.getVideoHeight();		
		setPlayerControlsVisible(true);		
		setVideoViewSize();	
		mSeekBar.setMax(mVideoView.getDuration());
		mDurationTextView.setText(millisecondsToString(mVideoView.getDuration()));
		start();
		if (mInitialPosition != 0) {
			seekTo(mInitialPosition);
			mVideoView.pause();
			updateSeekUI(mInitialPosition);
			updatePlayPauseUI();
		}
		mHandler.post(mPlayerUpdateRunnable);
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
										
		if (videoHeight == 0 || videoWidth == 0)
			return;
		
		DisplayMetrics displayMetrics = ctx.getResources().getDisplayMetrics();
		android.view.ViewGroup.LayoutParams lp = mSurfaceLayout.getLayoutParams();
		ViewGroup.LayoutParams lp2 = mVideoView.getLayoutParams();
		lp.width = displayMetrics.widthPixels;
		lp2.width = lp.width;
		
		if (currentOrientation == Configuration.ORIENTATION_LANDSCAPE)
			lp.height = (int)(displayMetrics.heightPixels * 0.65);
		else
			lp.height = (int) (((float) videoHeight / (float) videoWidth) * (float) displayMetrics.widthPixels);
		
		lp2.height = lp.height;
		
		mSurfaceLayout.setLayoutParams(lp);		
		mVideoView.setLayoutParams(lp2);
		
		mVideoView.invalidate();	
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
	
	private void updatePlayPauseUI() {
		if (mVideoView.isPlaying()) {
			mPlayButton.setVisibility(GONE);
			mPauseButton.setVisibility(VISIBLE);
		} else {
			mPlayButton.setVisibility(VISIBLE);
			mPauseButton.setVisibility(GONE);
		}
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

	/**
	 * Shows loading screen
	 */
	private void showLoading() {
		if (mLoadingView != null) {
			mLoadingView.setVisibility(View.VISIBLE);
		}
	}

	/**
	 * Hides loading screen
	 */
	private void hideLoading() {
		if (mLoadingView != null) {
			mLoadingView.setVisibility(View.GONE);
		}
	}

}
