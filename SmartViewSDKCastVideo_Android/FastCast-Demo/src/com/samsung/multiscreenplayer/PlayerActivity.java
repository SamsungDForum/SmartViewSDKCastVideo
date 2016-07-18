/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.multiscreenplayer;

import java.util.ArrayList;

import android.content.res.Configuration;
import android.net.Uri;
import android.os.Bundle;
import android.support.v4.app.FragmentActivity;
import android.view.KeyEvent;
import android.view.View;
import android.widget.AdapterView;
import android.widget.AdapterView.OnItemClickListener;
import android.widget.ListView;
import android.widget.Toast;

import com.samsung.multiscreenplayer.adapter.VideoSourceAdapter;
import com.samsung.multiscreenplayer.controller.AppController;
import com.samsung.multiscreenplayer.controller.AppController.ViewsState;
import com.samsung.multiscreenplayer.controller.DeviceStorageManager;
import com.samsung.multiscreenplayer.helper.IListener;
import com.samsung.multiscreenplayer.model.StoredDevice;
import com.samsung.multiscreenplayer.view.MultiScreenBar;
import com.samsung.multiscreenplayer.view.RemotePlayerView;
import com.samsung.multiscreenplayer.view.VideoPlayer;

/**
 * Creates views and {@link AppController}. Sends activity lifecycles to
 * {@link AppController}
 * 
 * @author j.bielak
 */
public class PlayerActivity extends FragmentActivity {
	public static String TAG = PlayerActivity.class.getName();

	private AppController mAppController;
	private VideoPlayer mVideoPlayer;
	private MultiScreenBar mMultiScreenBar;
	private RemotePlayerView mRemotePlayer;

	private DeviceStorageManager deviceStorage = null;

	@Override
	protected void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		setContentView(R.layout.activity_player);

		deviceStorage = new DeviceStorageManager(this);

		/*/ --------- Storage test. Remove this!----------------------
		StoredDevice device = new StoredDevice("TestDevice", "000000",
				Uri.parse("http://samsung.com"), "SPRC_WIFI");
		deviceStorage.insertDevice(device, new IListener<Boolean>() {

			@Override
			public void onData(Boolean data) {
				if (data) {
					Toast.makeText(PlayerActivity.this, "Device Inserted", Toast.LENGTH_LONG)
							.show();
				} else {
					Toast.makeText(PlayerActivity.this, "Device Exists", Toast.LENGTH_LONG).show();
				}
				deviceStorage.readDevices("SPRC_WIFI", new IListener<ArrayList<StoredDevice>>() {
					@Override
					public void onData(ArrayList<StoredDevice> data) {
						if (!data.isEmpty()) {
							Toast.makeText(PlayerActivity.this,
									"Device Read: " + data.get(0).getMac(), Toast.LENGTH_LONG)
									.show();
						}
						deviceStorage.clearDevices(null);
					}
				});
			}
		});
		// -------------------------------------------------------------------------*/

		AppController.init(this);
		mAppController = AppController.instance;

		mAppController.setOnLoadListener(new IListener<Boolean>() {
			@Override
			public void onData(Boolean data) {
			}
		});

		initViews();
	}

	private void initViews() {
		mVideoPlayer = (VideoPlayer) findViewById(R.id.player_view_local);
		mRemotePlayer = (RemotePlayerView) findViewById(R.id.player_view_remote);
		mMultiScreenBar = (MultiScreenBar) findViewById(R.id.multiscreen_bar_view);

		mAppController.setRemoteView(mRemotePlayer);
		mAppController.setLocalPlayer(mVideoPlayer);
		mAppController.setMultiscreenBar(mMultiScreenBar);
		mAppController.showView(ViewsState.LIST);

		ListView videoSourceList = (ListView) findViewById(R.id.videos_list);

		final VideoSourceAdapter adapter = mAppController.getVideoSourceAdapter();
		if (videoSourceList != null) {
			videoSourceList.setAdapter(adapter);
			videoSourceList.setOnItemClickListener(new OnItemClickListener() {
				@Override
				public void onItemClick(AdapterView<?> parent, View view, int position, long id) {
					mAppController.playVideo(adapter.getItem(position));
				}
			});
		}

	}

	@Override
	protected void onPause() {
		mAppController.onPause();
		super.onPause();
	}

	@Override
	protected void onResume() {
		super.onResume();
		mAppController.onResume();
	}

	@Override
	protected void onDestroy() {
		mAppController.onDestroy();
		super.onDestroy();
	}

	@Override
	public void onBackPressed() {
		if (!mAppController.onBackPressed()) {
			super.onBackPressed();
		}
	}

	@Override
	public void onConfigurationChanged(Configuration config) {
		super.onConfigurationChanged(config);
		if (mAppController != null)
			mAppController.onOrientationChanged(config.orientation);
	}

	@Override
	public boolean dispatchKeyEvent(KeyEvent event) {
		int action = event.getAction();
		int keyCode = event.getKeyCode();
		boolean consumed = false;
		switch (keyCode) {
		case KeyEvent.KEYCODE_VOLUME_UP:
			if (action == KeyEvent.ACTION_DOWN)
				consumed = mAppController.onHardwareVolumeChange(true);
			break;
		case KeyEvent.KEYCODE_VOLUME_DOWN:
			if (action == KeyEvent.ACTION_DOWN)
				consumed = mAppController.onHardwareVolumeChange(false);
			break;
		}
		return consumed ? consumed : super.dispatchKeyEvent(event);
	}

}
