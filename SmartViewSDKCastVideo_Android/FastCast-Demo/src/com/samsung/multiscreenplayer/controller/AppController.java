/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.multiscreenplayer.controller;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.ProgressDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.res.Configuration;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.os.CountDownTimer;
import android.support.v4.app.FragmentActivity;
import android.support.v4.app.FragmentManager;
import android.view.View;
import android.widget.ArrayAdapter;

import com.samsung.fastcast.CastManager;
import com.samsung.fastcast.OnBLEDiscoveryListener;
import com.samsung.fastcast.OnDiscoveryListener;
import com.samsung.fastcast.OnFCErrorListener;
import com.samsung.fastcast.OnTVMessageListener;
import com.samsung.fastcast.SimpleCallback;
import com.samsung.fastcast.exceptions.FCError;
import com.samsung.fastcast.model.CastStates;
import com.samsung.fastcast.model.ConnectData;
import com.samsung.fastcast.msgs.CustomEvent;
import com.samsung.fastcast.msgs.PlayMessage;
import com.samsung.fastcast.msgs.RemoteStates;
import com.samsung.fastcast.msgs.SimpleTextMessage;
import com.samsung.fastcast.msgs.StatusMessage;
import com.samsung.fastcast.statemachine.StateChangeArgs;
import com.samsung.fastcast.statemachine.StateChangeListener;
import com.samsung.multiscreen.Application;
import com.samsung.multiscreen.Client;
import com.samsung.multiscreen.Device;
import com.samsung.multiscreen.Error;
import com.samsung.multiscreen.Result;
import com.samsung.multiscreen.Service;
import com.samsung.multiscreenplayer.R;
import com.samsung.multiscreenplayer.adapter.ServiceAdapter;
import com.samsung.multiscreenplayer.adapter.VideoSourceAdapter;
import com.samsung.multiscreenplayer.dialog.DevicesDialogFragment;
import com.samsung.multiscreenplayer.dialog.DevicesDialogFragment.DevicesDialogListener;
import com.samsung.multiscreenplayer.helper.DialogHelper;
import com.samsung.multiscreenplayer.helper.IListener;
import com.samsung.multiscreenplayer.helper.VideoSourceRetriever;
import com.samsung.multiscreenplayer.model.BaseCastDevice;
import com.samsung.multiscreenplayer.model.GuideDevice;
import com.samsung.multiscreenplayer.model.SmartViewDevice;
import com.samsung.multiscreenplayer.model.StoredDevice;
import com.samsung.multiscreenplayer.model.VideoSource;
import com.samsung.multiscreenplayer.view.MultiScreenBar;
import com.samsung.multiscreenplayer.view.RemotePlayerView;
import com.samsung.multiscreenplayer.view.RemotePlayerView.PlayerCastAction;
import com.samsung.multiscreenplayer.view.VideoPlayer;

/**
 * Main application controller. Controls connection with TV and views.
 * Initializes and keeps multi-screen cast manager, holds information about
 * CHANNEL_ID and APP_ID for cast manager.
 * 
 * @author m.gajewski, j.bielak, m.jagiello
 * 
 */
public class AppController {
	final String TAG = getClass().getSimpleName();

	/**
	 * 3 types of views state.
	 */
	public enum ViewsState {
		LIST, // displays only list, without player
		PLAYER_LOCAL, // displays local player
		PLAYER_CASTING // displays remote player
	}

	private IListener<Boolean> mLoadListener = null;

	// Current view state
	private ViewsState mViewState = ViewsState.LIST;

	public static AppController instance = null;
	public final static String CHANNEL_ID = "com.samsung.MultiScreenPlayer";
	public final static String APP_ID = "YcKEdWMZve.SmartViewSDKCastVideo";

	private Context mContext = null;

	// Views to control
	RemotePlayerView mRemotePlayer = null;
	VideoPlayer mLocalPlayer = null;
	MultiScreenBar mMultiScreenBar = null;

	// Main cast manager that handles connection with TV
	private CastManager mCastManager;

	// Adapter for videos displayed on a list
	private VideoSourceAdapter mVideoSourceAdapter = null;
	private ArrayList<VideoSource> mVideoSourcesList;

	private boolean mConnected = false;

	// Adapter to display available services (TVs) on connection dialog
	private ServiceAdapter mServiceAdapter;

	private DevicesDialogFragment mDevicesDialog;

	// Currently displayed video source, could be locally or remotely
	private VideoSource mCurrentVideoSource;
	private long mCurrentVideoPosition;
	private int mTVVolume = 0;
	private final int WOW_TIMEOUT = 15000;

	private int mCurrentOrientation = Configuration.ORIENTATION_PORTRAIT;

	private boolean mWasStop = false;

	private CountDownTimer discoveryTimeoutTimer;
	private ProgressDialog wakingDialog;
	private DeviceStorageManager mStorageHelper;

	// Device discovery listener
	private OnDiscoveryListener mDiscoveryListener = new OnDiscoveryListener() {

		@Override
		public void onServiceLost(Service service) {
			mServiceAdapter.remove(service);
			setMultiScreenBarState();
		}

		@Override
		public void onServiceFound(Service service) {
			mServiceAdapter.add(service);
			setMultiScreenBarState();
			saveDeviceInfo(service, getCurrentWifiName());
		}
	};
	
	private OnFCErrorListener mErrorListener = new OnFCErrorListener() {
		@Override
		public void OnError(FCError error) {
			// Here you can handle msf lib errors
			if (error.getCode() == 403) { // Access denied error
				disconnectFromTv(false);
				DialogHelper.showAccessDeniedDialog(mContext);
			} else if (error.getCode() == 200) {
				if (error.getMsfError().getCode() == 404) { // No TV app
															// found error
					if (mLoadListener != null) {
						mLoadListener.onData(false);
					}
					DialogHelper.showTVAppNotFound(mContext);
				}
			} else if (error.getCode() == 110) { // timeout (No TV app
													// installed?)
				if (mLoadListener != null) {
					mLoadListener.onData(false);
				}			
				DialogHelper.showTVAppNotFound(mContext);
			} else if (error.getCode() == 404) {
				if (error.getMessage() != null) {
					showErrorDialog(error.getMessage());
				}
				mCastManager.disconnect();
			} else if (error.getCode() == 120) {
				// WOW error
				wakingDialog.dismiss();
				if (error.getMessage() != null) {
					showErrorDialog(error.getMessage());
				}
			} else if (error.getCode() != 211) {
				if (error.getMessage() != null) {
					showErrorDialog(error.getMessage());
				}
			}
		}
	};

	private OnBLEDiscoveryListener mBLEListener = new OnBLEDiscoveryListener() {

		@Override
		public void onBLEDeviceFound(String devName) {
			mServiceAdapter.add(devName);
		}
	};

	// Listener to retrieve events from TV
	private OnTVMessageListener mTvMsgListener = new OnTVMessageListener() {

		@Override
		public void onStatusMessage(StatusMessage msg) {
			if (mViewState != ViewsState.PLAYER_LOCAL) {
				if (msg.getState() == RemoteStates.PLAYING
						|| msg.getState() == RemoteStates.PAUSED) {
					if (!mWasStop) {
						setCurrentVideoSource(msg.getVideoId());
						mRemotePlayer.setPlayerStatus(msg);
						if (msg.getVolume() != mTVVolume) {
							mTVVolume = msg.getVolume();
							mRemotePlayer.showVolumeInfo();
						}
					} else {
						mWasStop = false;
					}
				}
				if (mViewState == ViewsState.PLAYER_CASTING) {
					updateCurrentPosition(msg.getPosition());
					mRemotePlayer.hideLoading();
				}
				if (mViewState == ViewsState.LIST) {
					mMultiScreenBar.setPlayingStatus(msg);
				}
			}
		}

		@Override
		public void onSimpleTextMessage(SimpleTextMessage msg) {
		}

		@Override
		public void onPlayMessage(PlayMessage msg) {
		}

		@Override
		public void onSuspendMessage() {
		}

		@Override
		public void onRestoreMessage() {
		}

		@Override
		public void onCustomEventMessage(CustomEvent eventMessage) {
		}
	};

	/**
	 * Initializes AppController
	 * 
	 * @param ctx
	 */
	public static void init(Context ctx) {
		instance = new AppController(ctx);
		instance.init();
	}

	/**
	 * Changes state of current views state to new state
	 * 
	 * @param state
	 */
	public void showView(ViewsState state) {

		mRemotePlayer.setVisibility(View.GONE);
		mLocalPlayer.setVisibility(View.GONE);
		if (mViewState == ViewsState.PLAYER_LOCAL) {
			mLocalPlayer.stop();
		}
		switch (state) {
		case PLAYER_CASTING:
			mRemotePlayer.setVisibility(View.VISIBLE);
			mMultiScreenBar.setPlayingStatus(null);
			break;
		case PLAYER_LOCAL:
			mLocalPlayer.setVisibility(View.VISIBLE);
			break;
		case LIST:
			break;
		}
		mViewState = state;
	}

	/**
	 * Decides if start new video or go to casting mode if video currently
	 * played is the same
	 * 
	 * @param item
	 */
	public void playVideo(VideoSource item) {
		if (setCurrentVideoSource(item) == true) {
			startCurrentVideo();
		} else {
			showView(ViewsState.PLAYER_CASTING);
		}
	}

	/**
	 * Gets current video source
	 * 
	 * @return
	 */
	public VideoSource getCurrentVideoSource() {
		return mCurrentVideoSource;
	}

	/**
	 * Called when phone orientation changes. Needed to reconfigure certain
	 * views in the app.
	 * 
	 * @param orientation
	 *            Orientation
	 */
	public void onOrientationChanged(int orientation) {
		mCurrentOrientation = orientation;
		if (mLocalPlayer != null)
			mLocalPlayer.onOrientationChanged(orientation);
		if (mRemotePlayer != null)
			mRemotePlayer.onOrientationChanged(orientation);
	}

	/**
	 * Return current phone orientation
	 * 
	 * @return Integer current orientation
	 */
	public int getCurrentOrientation() {
		return mCurrentOrientation;
	}

	/**
	 * Actions invoked from {@link RemotePlayerView} controls like play, stop,
	 * seek, volume changes etc.
	 * 
	 * @param action
	 *            Action type
	 * @param metadata
	 *            Metadata of action as object
	 */
	public void onPlayerCastAction(PlayerCastAction action, Object metadata) {
		switch (action) {
		case FAST_FORWARD:
			mCastManager.getRemoteController().fastForward();
			break;
		case PLAYPAUSE:
			mWasStop = false;
			mCastManager.getRemoteController().playPause();
			break;
		case STOP:
			mCastManager.getRemoteController().stop();
			mWasStop = true;
			setCurrentVideoSource(null);
			showView(ViewsState.LIST);
			break;
		case REWIND:
			mCastManager.getRemoteController().rewind();
			break;
		case SEEK:
			int seek = (Integer) metadata;
			mCastManager.getRemoteController().seek(seek);
			break;
		case VOLUME_DOWN:
			if (mTVVolume > -100 && mTVVolume != 0) {
				mTVVolume = Math.abs(mTVVolume) - 1;
				mCastManager.getRemoteController().setVolume(mTVVolume);
			}
			break;
		case VOLUME_UP:
			if (mTVVolume < 100) {
				mTVVolume = Math.abs(mTVVolume + 1);
				mCastManager.getRemoteController().setVolume(mTVVolume);
			}
			break;
		default:
			break;
		}
	}

	/**
	 * Shows list when playback is finished
	 */
	public void onMediaFinished() {
		showView(ViewsState.LIST);
	}

	/**
	 * Disconnects from tv
	 */
	public void onDestroy() {
		disconnectFromTv(false);
	}

	/**
	 * Suspends local player when in {@link ViewsState#PLAYER_LOCAL} state
	 */
	public void onPause() {
		if (mViewState == ViewsState.PLAYER_LOCAL) {
			mLocalPlayer.suspend();
		}
	}

	/**
	 * Resumes local player when in {@link ViewsState#PLAYER_LOCAL} state
	 */
	public void onResume() {
		if (mViewState == ViewsState.PLAYER_LOCAL) {
			mLocalPlayer.resume();
		}
	}

	/**
	 * Decides to go back to list state or returns false when already on a list
	 * state
	 * 
	 * @see ViewsState#LIST
	 * @return true switched to list, false if already on a list
	 */
	public boolean onBackPressed() {
		if (mViewState != ViewsState.LIST) {
			if (mViewState != ViewsState.PLAYER_CASTING) {
				setCurrentVideoSource(null);
			}
			showView(ViewsState.LIST);
			return true;
		} else {
			return false;
		}
	}

	/**
	 * Setter for remote player view
	 * 
	 * @param remote
	 */
	public void setRemoteView(RemotePlayerView remote) {
		mRemotePlayer = remote;
	}

	/**
	 * Setter for local player view
	 * 
	 * @param player
	 */
	public void setLocalPlayer(VideoPlayer player) {
		mLocalPlayer = player;
	}

	/**
	 * Setter for multiscreen bar view
	 * 
	 * @param bar
	 */
	public void setMultiscreenBar(MultiScreenBar bar) {
		mMultiScreenBar = bar;
	}

	/**
	 * Getter for video source adapter
	 * 
	 * @return
	 */
	public VideoSourceAdapter getVideoSourceAdapter() {
		return mVideoSourceAdapter;
	}

	/**
	 * Setter for onLoadListener
	 * 
	 * @param loadListener
	 */
	public void setOnLoadListener(IListener<Boolean> loadListener) {
		mLoadListener = loadListener;
	}

	/**
	 * Volume control from outside source e.g. hardware volume button
	 * 
	 * @param isUp
	 *            true if volume up, false if volume down
	 * @return true if consumed, false if not
	 */
	public boolean onHardwareVolumeChange(boolean isUp) {
		if (mViewState == ViewsState.PLAYER_CASTING) {
			onPlayerCastAction(isUp ? PlayerCastAction.VOLUME_UP
					: PlayerCastAction.VOLUME_DOWN, null);
			mRemotePlayer.showVolumeInfo();
			return true;
		}
		return false;
	}

	/**
	 * Decides to show TV search dialog or TV disconnect actions dialog. Also
	 * checks wifi state
	 */
	public void onCastIconClicked() {
		ConnectivityManager connManager = (ConnectivityManager) mContext
				.getSystemService(Context.CONNECTIVITY_SERVICE);
		NetworkInfo mWifi = connManager
				.getNetworkInfo(ConnectivityManager.TYPE_WIFI);
		if (mWifi.isConnected()) {
			// Decides to show TV actions dialog, start casting mode or show
			// search dialog
			if (mConnected) {
				showDisconnectActionsDialog();
			} else {
				connectToTv();
			}
		} else {
			DialogHelper.showWifiNotConnectedDialog(mContext);
		}
	}

	/**
	 * Goes to casting view state if not in it when connected
	 */
	public void onTitleBarClicked() {
		if (mConnected && mViewState != ViewsState.PLAYER_CASTING) {
			showView(ViewsState.PLAYER_CASTING);
		}
	}

	/**
	 * Setter for current video position
	 * 
	 * @param newPosition
	 */
	public void updateCurrentPosition(long newPosition) {
		mCurrentVideoPosition = newPosition;
	}

	private AppController(Context ctx) {
		CastManager.init(ctx);
		mContext = ctx;
		mCastManager = CastManager.getInstance();
		mServiceAdapter = new ServiceAdapter(ctx);
		wakingDialog = new ProgressDialog(mContext);
		wakingDialog.setMessage(mContext.getText(R.string.dialog_wakingup));
		wakingDialog.setCancelable(false);

		mDevicesDialog = new DevicesDialogFragment(mServiceAdapter);
		mStorageHelper = new DeviceStorageManager(ctx);
	}

	private void init() {
		// Cast manager will automatically handle list of available TVs and puts
		// them to adapter
		// mCastManager.setServiceAdapter(mServiceAdapter);

		// Add listener to cast manager that listens for state changes
		mCastManager.onStateStarts
				.addListener(new StateChangeListener<CastStates>() {

					@Override
					public void stateChanged(StateChangeArgs<CastStates> args) {
						stateStarted(args);
					}
				});

		// Add listener that listens for tv messages
		mCastManager.addOnTVMessageListener(mTvMsgListener);

		// Add listener that listens for new devices
		mCastManager.addOnDiscoveryListener(mDiscoveryListener);

		// Add listener that listens for BLE only devices
		mCastManager.addOnBLEDiscoveryListener(mBLEListener);

		// Add on errors listener
		mCastManager.addOnFCErrorListener(mErrorListener);

		mVideoSourceAdapter = new VideoSourceAdapter(mContext);

		// Retrieve available videos list
		VideoSourceRetriever.retrieveVideoList(mContext,
				new IListener<ArrayList<VideoSource>>() {
					@Override
					public void onData(ArrayList<VideoSource> list) {
						// Save video sources in application controller
						mVideoSourcesList = list;
						mVideoSourceAdapter.addAll(list);
					}
				});
	}

	/**
	 * Setter for currently used VideoSource
	 * 
	 * @param newVideoSource
	 * @return true if source changed, false if not
	 */
	private boolean setCurrentVideoSource(VideoSource newVideoSource) {
		if (newVideoSource != mCurrentVideoSource) {
			mCurrentVideoSource = newVideoSource;
			mCurrentVideoPosition = 0;
			if (newVideoSource == null) {
				mMultiScreenBar.setDefaultTitle();
			} else {
				mMultiScreenBar.setTitle(newVideoSource.getTitle());
				mRemotePlayer.setThumbnail(newVideoSource.getImageUri());
			}
			mVideoSourceAdapter.notifyDataSetChanged();
			return true;
		}
		return false;
	}

	/**
	 * Setter for currently used VideoSource
	 * 
	 * @param videoId
	 * @return true if source changed, false if not
	 */
	private boolean setCurrentVideoSource(int videoId) {
		if (mCurrentVideoSource != null
				&& mCurrentVideoSource.getId() == videoId) {
			return false;
		}
		for (VideoSource vs : mVideoSourcesList) {
			if (vs.getId() == videoId) {
				return setCurrentVideoSource(vs);
			}
		}
		return false;
	}

	private void startCurrentVideo() {
		if (mConnected) {
			showView(ViewsState.PLAYER_CASTING);
			mCastManager.getRemoteController().startPlayback(
					mCurrentVideoSource.getId(), mCurrentVideoPosition);
			mRemotePlayer.showLoading();
		} else {
			if (mCurrentVideoSource != null) {
				showView(ViewsState.PLAYER_LOCAL);
				mLocalPlayer.playWithSeek(mCurrentVideoSource,
						mCurrentVideoPosition);
			} else {
				showView(ViewsState.LIST);
			}
		}
	}

	/**
	 * Starts TV discovery and shows available TVs list dialog
	 * 
	 * @param currentVideoSource
	 */
	private void connectToTv() {
		startDiscovery();
		startDiscoveryTimeout();
		showSearchDialog();
	}

	/**
	 * Disconnects from TV
	 */
	private void disconnectFromTv(boolean closeRemote) {
		mConnected = false;
		mCastManager.disconnect(closeRemote);
		// startCurrentVideo();
	}

	private void startDiscovery() {
		mServiceAdapter.searchStart();
		setMultiScreenBarState();
		mCastManager.startDiscovery();
		mDevicesDialog.setProgressBarVisibility(true);
	}

	private void startDiscoveryTimeout() {
		discoveryTimeoutTimer = new CountDownTimer(15000, 15000) {

			@Override
			public void onTick(long millisUntilFinished) {
			}

			@Override
			public void onFinish() {
				discoveryTimeout();
			}
		}.start();
	}

	private void stopDiscoveryTimeout() {
		if (discoveryTimeoutTimer != null)
			discoveryTimeoutTimer.cancel();
	}

	private void stopDiscovery() {
		mCastManager.stopDiscovery();		
		// mServiceAdapter.searchStop();
		mDevicesDialog.setProgressBarVisibility(false);
	}

	private void discoveryTimeout() {
		stopDiscovery();
		loadStandbyDevices(getCurrentWifiName());
	}

	private void setMultiScreenBarState() {
		mMultiScreenBar
				.setDiscoveryState(mServiceAdapter.hasSmartViewDevices());
	}

	/**
	 * Method called on cast manager state started
	 * 
	 * @param args
	 */
	private void stateStarted(StateChangeArgs<CastStates> args) {
		switch (args.state_new) {
		case READY:
			if (mLoadListener != null) {
				mLoadListener.onData(false);
			}
			mConnected = true;
			if (mViewState == ViewsState.PLAYER_LOCAL) {
				showView(ViewsState.PLAYER_CASTING);
				startCurrentVideo();
			}
			mMultiScreenBar.setConnectedState(args.state_new);
			break;
		case CONNECTED:
			// TV app and mobile app connected, but not yet ready
			break;
		case CONNECTING:
			if (mLoadListener != null) {
				mLoadListener.onData(true);
				mMultiScreenBar.setConnectedState(args.state_new);
			}
			break;
		case INSTALLING:
			// TV App installing state
			break;
		case IDLE:
			mConnected = false;
			mMultiScreenBar.setConnectedState(args.state_new);
			if (mViewState == ViewsState.PLAYER_CASTING) {
				showView(ViewsState.PLAYER_LOCAL);
				startCurrentVideo();
			} else {
				setCurrentVideoSource(null);
			}
			break;
		}
	}

	/**
	 * Dialog shows available action when user is connected TV
	 */
	private void showDisconnectActionsDialog() {
		AlertDialog.Builder builder = new AlertDialog.Builder(mContext);
		builder.setIcon(R.drawable.ic_cast_connected_blue_24dp);
		builder.setTitle(mCastManager.getConnectedService().getName());
		final ArrayAdapter<String> tvActionsAdapter = new ArrayAdapter<String>(
				mContext, android.R.layout.simple_list_item_1);

		tvActionsAdapter.add(mContext
				.getString(R.string.disconnect_leave_remote));

		builder.setNegativeButton(R.string.cancel,
				new DialogInterface.OnClickListener() {

					@Override
					public void onClick(DialogInterface dialog, int which) {
						dialog.dismiss();
					}
				});

		builder.setAdapter(tvActionsAdapter,
				new DialogInterface.OnClickListener() {

					@Override
					public void onClick(DialogInterface dialog, int which) {
						// if (which == 0) {
						// disconnectFromTv(true);
						// } else {
						disconnectFromTv(false);
						// }

					}
				});
		builder.show();
	}

	/**
	 * Shows dialog with dynamic list of available TVs
	 */
	private void showSearchDialog() {
		FragmentManager fragmentManager = ((FragmentActivity) mContext)
				.getSupportFragmentManager();

		mDevicesDialog.setDevicesDialogListener(new DevicesDialogListener() {

			@Override
			public void onItemClicked(int index) {

				BaseCastDevice device = mServiceAdapter.getItem(index);

				if (device instanceof SmartViewDevice) {
					smartDeviceClicked(((SmartViewDevice) device).getData());
					mDevicesDialog.dismiss();
				} else if (device instanceof GuideDevice) {
					showGuideDialog();
					mDevicesDialog.dismiss();
				} else if (device instanceof StoredDevice) {
					StoredDevice storedDevice = (StoredDevice) device;
					String mac = storedDevice.getMac();
					if (mac != null && !mac.isEmpty()) {

						wakingDialog.show();

						mCastManager.wakeDevice(mac, storedDevice.getUri(),
								WOW_TIMEOUT, new SimpleCallback<Service>() {

									@Override
									public void run(Service result) {
										smartDeviceClicked(result);
										wakingDialog.cancel();
										mDevicesDialog.dismiss();																				
									}
								});
					}
				}
			}

			@Override
			public void onDismiss() {
				stopDiscoveryTimeout();
				stopDiscovery();
			}
		});
		mDevicesDialog.show(fragmentManager, "DevicesDialog");

	}		

	/**
	 * Shows dialog with device connection guide
	 */
	private void showGuideDialog() {
		AlertDialog.Builder builder = new AlertDialog.Builder(mContext);
		builder.setTitle(mContext.getString(R.string.tvguide_title));

		View view = ((Activity) mContext).getLayoutInflater().inflate(
				R.layout.tv_guide, null);
		View link = view.findViewById(R.id.tvGuideLink);
		link.setOnClickListener(new View.OnClickListener() {

			@Override
			public void onClick(View v) {
				Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri
						.parse(mContext.getString(R.string.tvguide_link)));
				mContext.startActivity(browserIntent);
			}
		});

		builder.setView(view);

		builder.setNegativeButton(R.string.cancel,
				new DialogInterface.OnClickListener() {

					@Override
					public void onClick(DialogInterface dialog, int which) {
						dialog.dismiss();
					}
				});

		builder.show();
	}

	private void smartDeviceClicked(Service service) {

		// Connection attributes
		Map<String, String> attributes = new HashMap<String, String>();
		attributes.put("name", "Mobile");

		// Creates connection and sets AppId and ChannelId
		ConnectData connectionParams = new ConnectData();
		connectionParams.setAppId(AppController.APP_ID);
		connectionParams.setChannelId(AppController.CHANNEL_ID);

		// Get from adapter clicked service and set it to connect with
		connectionParams.setService(service);
		connectionParams.setConnectionAttributes(attributes);

		// Send connection request with connection data
		mCastManager.connect(connectionParams);
	}

	protected void showErrorDialog(String message) {
		AlertDialog.Builder builder = new AlertDialog.Builder(mContext);
		builder.setTitle(R.string.error);
		builder.setMessage(message);

		builder.setNeutralButton(R.string.ok,
				new DialogInterface.OnClickListener() {

					@Override
					public void onClick(DialogInterface dialog, int which) {
						dialog.dismiss();
					}
				});
		builder.show();
	}

	private boolean checkIfDeviceIsOn(StoredDevice device) {
		/*
		 * Check if device loaded from db is already on the discovered devices
		 * list
		 */

		for (int i = 0; i < mServiceAdapter.getCount(); i++) {

			if (mServiceAdapter.getItem(i) instanceof SmartViewDevice) {

				SmartViewDevice discoveredDevice = (SmartViewDevice) mServiceAdapter
						.getItem(i);
				if (discoveredDevice != null
						&& (discoveredDevice.getData().getId().equals(device
								.getId())))
					return true;

			}
		}

		return false;
	}

	private void saveDeviceInfo(Service device, final String ssid) {

		final String name = device.getName();
		final Uri uri = device.getUri();
		final String id = device.getId();

		device.getDeviceInfo(new Result<Device>() {

			@Override
			public void onSuccess(Device device) {

				final String mac = device.getWifiMac();

				if (mac != null && !mac.isEmpty() && id != null) {

					StoredDevice deviceInfo = new StoredDevice(name
							+ " (standby)", mac, uri, ssid, id);
					mStorageHelper.insertDevice(deviceInfo);

				}
			}

			@Override
			public void onError(Error error) {
			}
		});

	}

	private void loadStandbyDevices(String networkId) {

		mStorageHelper.readDevices(networkId, new IListener<ArrayList<StoredDevice>>() {

			@Override
			public void onData(ArrayList<StoredDevice> result) {
				for (StoredDevice device : result) {
					if (!checkIfDeviceIsOn(device))
						mServiceAdapter.add(device);
				}

				mServiceAdapter.searchStop();
			}
		});

	}

	private String getCurrentWifiName() {
		WifiManager wifiMgr = (WifiManager) mContext
				.getSystemService(Context.WIFI_SERVICE);
		WifiInfo wifiInfo = wifiMgr.getConnectionInfo();
		return wifiInfo.getSSID();
	}

}
