/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.multiscreenplayer;

import android.app.Activity;
import android.os.Bundle;
import android.view.View;
import android.widget.AdapterView;
import android.widget.AdapterView.OnItemClickListener;
import android.widget.ListView;

import com.samsung.multiscreenplayer.adapter.VideoSourceAdapter;
import com.samsung.multiscreenplayer.controller.AppController;
import com.samsung.multiscreenplayer.controller.AppController.ViewsState;
import com.samsung.multiscreenplayer.helper.IListener;
import com.samsung.multiscreenplayer.view.LoadingView;
import com.samsung.multiscreenplayer.view.MultiScreenBar;
import com.samsung.multiscreenplayer.view.RemotePlayerView;
import com.samsung.multiscreenplayer.view.VideoPlayer;

/**
 * Creates views and {@link AppController}. Sends activity lifecycles to {@link AppController} 
 * @author j.bielak
 */
public class PlayerActivity extends Activity {
	public static String TAG = PlayerActivity.class.getName();
	
	private AppController mAppController;
	private LoadingView mLoadingView;

	@Override
	protected void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		setContentView(R.layout.activity_player);
		
		mLoadingView = (LoadingView) findViewById(R.id.loading_view);
		mLoadingView.setVisibility(View.VISIBLE);
		
		AppController.init(this);
		mAppController = AppController.instance;
		
		mAppController.setOnLoadListener(new IListener<Boolean>() {
			@Override
			public void onData(Boolean data) {
				if (data) {
					mLoadingView.setVisibility(View.VISIBLE);
				} else {
					mLoadingView.setVisibility(View.GONE);
				}
			}
		});
		
		initViews();
	}

	private void initViews() {
		VideoPlayer localPlayer = (VideoPlayer) findViewById(R.id.player_view_local);
		RemotePlayerView remotePlayer = (RemotePlayerView) findViewById(R.id.player_view_remote);
		MultiScreenBar multiScreenBar = (MultiScreenBar) findViewById(R.id.multiscreen_bar_view);
		
		mAppController.setRemoteView(remotePlayer);
		mAppController.setLocalPlayer(localPlayer);
		mAppController.setMultiscreenBar(multiScreenBar);
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
		
		mLoadingView.setVisibility(View.GONE);
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

}
