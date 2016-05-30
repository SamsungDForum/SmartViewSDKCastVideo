/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.fastcast;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Timer;
import java.util.TimerTask;

import org.json.JSONException;
import org.json.JSONObject;

import android.content.Context;
import android.os.Handler;
import android.widget.ArrayAdapter;

import com.samsung.fastcast.exceptions.FCError;
import com.samsung.fastcast.model.CastStates;
import com.samsung.fastcast.model.ConnectData;
import com.samsung.fastcast.msgs.CustomEvent;
import com.samsung.fastcast.msgs.ErrorMessage;
import com.samsung.fastcast.msgs.MessageBase;
import com.samsung.fastcast.msgs.MessageType;
import com.samsung.fastcast.statemachine.StateMachine;
import com.samsung.multiscreen.Application;
import com.samsung.multiscreen.Channel.OnConnectListener;
import com.samsung.multiscreen.Channel.OnDisconnectListener;
import com.samsung.multiscreen.Channel.OnErrorListener;
import com.samsung.multiscreen.Client;
import com.samsung.multiscreen.Error;
import com.samsung.multiscreen.Result;
import com.samsung.multiscreen.Search;
import com.samsung.multiscreen.Search.OnBleFoundListener;
import com.samsung.multiscreen.Search.OnServiceFoundListener;
import com.samsung.multiscreen.Search.OnServiceLostListener;
import com.samsung.multiscreen.Service;

/**
 * CastManager singleton class to make casting scenarios. It can do service
 * discovery, connection/disconnection to remote channel send messages to host,
 * listen to messages from channel and wrap and proxy errors from MultiScreen
 * Framework. It is implemented as state machine. User can listen for states
 * changes and implement proper GUI changes in own application. Possible states
 * are described in CastStates enumerator.
 * 
 * @see com.samsung.fastcast.statemachine.StateMachine
 * @see com.samsung.fastcast.model.CastStates
 * 
 * @author m.gajewski
 *
 */
public class CastManager extends StateMachine<CastStates> {

	private static final int PING_INTERVAL = 15000;

	private static CastManager mInstance = null;
	private static Context mContext = null;
	private static Object mSync = new Object();

	private Search mSearch = null;
	private Application mRemoteApp = null;
	private ArrayAdapter<Service> mServiceAdapter = null;
	private List<OnDiscoveryListener> mDiscoveryListeners = new ArrayList<OnDiscoveryListener>();
	private List<OnBLEDiscoveryListener> mBLEListeners = new ArrayList<OnBLEDiscoveryListener>();
	private List<OnFCErrorListener> mFCErrorListeners = new ArrayList<OnFCErrorListener>();
	private List<CustomEvent> mCustomEvents = new ArrayList<CustomEvent>();
	private Client mClientObject;
	private RemoteController mRemoteController = null;
	private ConnectData mLastConnectData = null;
	private boolean mSuspended = false;
	private boolean mWasReset = false;
	private boolean mDisconnectRequested = false;

	private static final int DEFAULT_TIMEOUT = 20000;
	private Timer mTimeoutTimer = null;

	private class TimeoutTask extends TimerTask {
		@Override
		public void run() {
			if (mContext != null) {
				new Handler(mContext.getMainLooper()).post(new Runnable() {
				    @Override
				    public void run() {
						FCError libError = new FCError(110, "Connection Timeout. Client can't connect.");
						for (OnFCErrorListener listener : CastManager.this.mFCErrorListeners) {
							listener.OnError(libError);
						}
						reset();
				    }
				});
			}
		}
	}

	/**
	 * Check if remote application is in suspend state. You can also listen on
	 * this by {@link OnTVMessageListener}
	 * 
	 * @return the suspended state.
	 */
	public boolean isSuspended() {
		return mSuspended;
	}

	/**
	 * Static init method have to be called somewhere before use any method from
	 * library. Application context is needed by MultiScreen framework.
	 * 
	 * @param ctx
	 *            Android application context.
	 */
	public static void init(Context ctx) {
		synchronized (mSync) {
			if (mInstance == null) {
				mContext = ctx;
				mInstance = new CastManager();
			}
		}
	}

	/**
	 * Static dispose method have to be called when you no longer need to use
	 * library.
	 */
	public static void dispose() {
		synchronized (mSync) {
			mInstance.reset();
			mInstance = null;
			mContext = null;
		}
	}

	/**
	 * Disconnects from channel if was connected. All events will be invoked
	 * during disconnection. After disconnection it will clean state of library
	 * to state like just after initialization.
	 */
	public void reset() {
		mWasReset = true;
		if (getCurrentState() == CastStates.CONNECTED || getCurrentState() == CastStates.READY) {
			disconnect();
		} else if (getCurrentState() == CastStates.IDLE) {
			_reset();
		} else {
			_reset();
			gotoState(CastStates.IDLE, null);
		}
	}

	/**
	 * Static method to get single object of this class. It is alive after call
	 * to init method. If init wasn't called first it will return null.
	 * 
	 * @return CastManager object or null if CastManager is not initialized.
	 * 
	 * @see #init(Context)
	 */
	public static CastManager getInstance() {
		return mInstance;
	}

	/**
	 * Gets and returns single object of class RemoteController which is helper
	 * for standard operations during casting like play, stop, seek, volume
	 * commands and so on. Returned object can be used only after making
	 * connection in ready state otherwise it can produce error messages and
	 * will fail.
	 * 
	 * @return RemoteController single object.
	 * 
	 * @see com.samsung.fastcast.RemoteController
	 */
	public RemoteController getRemoteController() {
		if (mRemoteController == null) {
			mRemoteController = RemoteController.getInstance();
		}
		return mRemoteController;
	}

	/**
	 * Starts discovery process. If new devices are found it is communicated by
	 * calling OnDiscoveryListener.onServiceFound() method and if service
	 * adapter is set it will add found service to list automatically.
	 * 
	 * @see #addOnDiscoveryListener(OnDiscoveryListener)
	 * @see #setServiceAdapter(ArrayAdapter)
	 */
	public void startDiscovery() {
		if (mServiceAdapter != null) {
			mServiceAdapter.clear();
		}
		mSearch.start();
		mSearch.startUsingBle();
	}

	/**
	 * Stops discovery process. You should stop discovering for example when
	 * user already choose service and start connecting to it.
	 */
	public void stopDiscovery() {
		mSearch.stop();
		mSearch.stopUsingBle();
	}

	/**
	 * Make connection to chosen device and try find application and connect to
	 * channel. All needed data are passed in argument by transport class
	 * ConnectData. Service, applicationId and channelId are necessery to make
	 * connection.
	 * 
	 * @param remote
	 *            ConnectData object with data needed to make connection.
	 * 
	 * @see com.samsung.fastcast.model.ConnectData
	 */
	public void connect(ConnectData remote) {
		connect(remote, DEFAULT_TIMEOUT);
	}

	/**
	 * Make connection to chosen device and try find application and connect to
	 * channel. All needed data are passed in argument by transport class
	 * ConnectData. Service, applicationId and channelId are necessery to make
	 * connection.
	 * 
	 * @param remote
	 *            ConnectData object with data needed to make connection.
	 * @param timeout
	 *            Time for connection. After that time when not connected error
	 *            will appear
	 * 
	 * @see com.samsung.fastcast.model.ConnectData
	 */
	public void connect(ConnectData remote, int timeout) {
		if (getCurrentState() == CastStates.IDLE) {
			mLastConnectData = remote;
			if (mRemoteApp == null) { // try to get application from service if it
										// is not set earlier
				Service service = remote.getService();
				Map<String, Object> startArgs = remote.getStartArgs();
				if (startArgs != null) {
					mRemoteApp = service.createApplication(remote.getAppId(), remote.getChannelId(),
							startArgs);
				} else {
					mRemoteApp = service.createApplication(remote.getAppId(), remote.getChannelId());
				}
			}
			if (mRemoteApp != null) {
				registerMessageCallbacks();
				registerCustomEventsCallbacks();
				mRemoteApp.setConnectionTimeout(PING_INTERVAL);
				mRemoteApp.setOnConnectListener(mConnectListener);
				mRemoteApp.setOnDisconnectListener(mDisconnectListener);
				mRemoteApp.setOnErrorListener(mErrorListener);
				gotoState(CastStates.CONNECTING, null);
				Map<String, String> attributes = remote.getConnectionAttributes();
				if (mConnectResult != null) {
					mConnectResult.cancel();
				}
				mConnectResult = new ConnectResult();
				if (attributes != null) {
					mRemoteApp.connect(attributes, mConnectResult);
				} else {
					mRemoteApp.connect(mConnectResult);
				}
				mTimeoutTimer = new Timer();
				mTimeoutTimer.schedule(new TimeoutTask(), timeout);
				
			} else {
				FCError libError = new FCError(201,
						"Connecting error. Can't create remote app channel.");
				for (OnFCErrorListener listener : mFCErrorListeners) {
					listener.OnError(libError);
				}
			}
		} else {
			FCError libError = new FCError(202,
					"Connecting error. Connect called in wrong state: " + getCurrentState());
			for (OnFCErrorListener listener : mFCErrorListeners) {
				listener.OnError(libError);
			}
		}
	}

	/**
	 * Disconnects from channel. It leaves remote application on. It is alias
	 * for disconnect(false). It can produce error if application wasn't
	 * connected or if something gone wrong on the remote device.
	 * 
	 * @see CastManager#disconnect(boolean)
	 */
	public void disconnect() {
		disconnect(false);
	}

	/**
	 * Disconnects from channel. If exitRemote is true and it is last connected
	 * client it will exit remote application. It can produce error if
	 * application wasn't connected or if something gone wrong on the remote
	 * device.
	 * 
	 * @param exitRemote
	 *            true for close remote application or false otherwise.
	 */
	public void disconnect(boolean exitRemote) {
		if (!mDisconnectRequested) {
			mDisconnectRequested = true;
			if (mRemoteApp != null && mClientObject != null) {
				if (mDisconnectResult != null) {
					mDisconnectResult.cancel();
				}
				mDisconnectResult = new DisconnectResult();
				mRemoteApp.disconnect(exitRemote, mDisconnectResult);
			} else {
				FCError libError = new FCError(211, "Disconnecting error. Client wasn't connected.");
				for (OnFCErrorListener listener : mFCErrorListeners) {
					listener.OnError(libError);
				}
			}
		}
	}

	/**
	 * Sends message to remote device. In theory messages can be send when cast
	 * manager is in CONNECTED state and it can be done without error but it is
	 * better to send messages when cast manager goes to state READY. It means
	 * that connection is established and remote device said that is ready for
	 * receiving. To send message you have to pass message type and object with
	 * message inherited from MessageBase class.
	 * 
	 * @param type
	 *            MessageType enumerator describing type of message
	 * @param msg
	 *            Message object inherited from MessageBase
	 * 
	 * @see com.samsung.fastcast.msgs.MessageType
	 * @see com.samsung.fastcast.msgs.MessageBase
	 */
	public void send(final MessageType type, final MessageBase msg) {
		if (mRemoteApp != null && mClientObject != null) {
			if (mSuspended) {
				restoreRemoteApp(new SimpleCallback<Boolean>() {
					@Override
					public void run(Boolean result) {
						_send(type, msg);
					}
				});
			} else {
				_send(type, msg);
			}
		} else {
			FCError libError = new FCError(221, "Sending error. No ready connection.");
			for (OnFCErrorListener listener : mFCErrorListeners) {
				listener.OnError(libError);
			}
		}
	}

	/**
	 * Sends custom event to remote device. In theory messages can be send when
	 * cast manager is in CONNECTED state and it can be done without error but
	 * it is better to send messages when cast manager goes to state READY. It
	 * means that connection is established and remote device said that is ready
	 * for receiving.
	 * 
	 * @param customEvent
	 *            Object of your class inherited from CustomEvent and described
	 *            event you want send
	 * 
	 * @see com.samsung.fastcast.msgs.CustomEvent
	 */
	public void sendCustomEvent(final CustomEvent customEvent) {
		if (mRemoteApp != null && mClientObject != null) {
			if (mSuspended) {
				restoreRemoteApp(new SimpleCallback<Boolean>() {
					@Override
					public void run(Boolean result) {
						_sendCustom(customEvent);
					}
				});
			} else {
				_sendCustom(customEvent);
			}
		} else {
			FCError libError = new FCError(221, "Sending error. No ready connection.");
			for (OnFCErrorListener listener : mFCErrorListeners) {
				listener.OnError(libError);
			}
		}
	}

	/**
	 * Sets ArrayAdapter to fill when new devices are found during discovery
	 * process. It can be used when you use Android ListView in GUI and want to
	 * fill it by adapter automatically.
	 * 
	 * @param serviceAdapter
	 *            ArrayAdapter<Service> object which will be filled in discovery
	 *            process.
	 */
	public void setServiceAdapter(ArrayAdapter<Service> serviceAdapter) {
		mServiceAdapter = serviceAdapter;
	}

	/**
	 * Adds OnDiscoveryListener to inform about devices found/lost during
	 * discovery process.
	 * 
	 * @param listener
	 *            Your {@link OnDiscoveryListener}
	 * 
	 */
	public void addOnDiscoveryListener(OnDiscoveryListener listener) {
		mDiscoveryListeners.add(listener);
	}

	/**
	 * Removes OnDiscoveryListener.
	 * 
	 * @param listener
	 *            {@link OnDiscoveryListener} to remove
	 */
	public void removeOnDiscoveryListener(OnDiscoveryListener listener) {
		mDiscoveryListeners.remove(listener);
	}

	/**
	 * Removes all OnDiscoveryListeners
	 */
	public void removaAllDiscoveryListeners() {
		mDiscoveryListeners.clear();
	}
	
	/**
	 * Adds OnBLEDiscoveryListener to inform about BLE devices found during
	 * discovery process.
	 * 
	 * @param listener
	 *            Your {@link OnBLEDiscoveryListener}
	 * 
	 */
	public void addOnBLEDiscoveryListener(OnBLEDiscoveryListener listener) {
		mBLEListeners.add(listener);
	}

	/**
	 * Removes OnBLEDiscoveryListener.
	 * 
	 * @param listener
	 *            {@link OnBLEDiscoveryListener} to remove
	 */
	public void removeOnBLEDiscoveryListener(OnBLEDiscoveryListener listener) {
		mBLEListeners.remove(listener);
	}

	/**
	 * Removes all OnBLEDiscoveryListeners
	 */
	public void removaAllBLEDiscoveryListeners() {
		mBLEListeners.clear();
	}
	

	/**
	 * Adds {@link OnTVMessageListener} to listen in GUI to messages received
	 * from remote device.
	 * 
	 * @param listener
	 *            Your {@link OnTVMessageListener} listener.
	 */
	public void addOnTVMessageListener(OnTVMessageListener listener) {
		MessageListener.addOnTVMessageListener(listener);
		CustomMessageListener.addOnTVMessageListener(listener);
	}

	/**
	 * Removes {@link OnTVMessageListener}
	 * 
	 * @param listener
	 *            {@link OnTVMessageListener} to remove.
	 */
	public void removeOnTVMessageListener(OnTVMessageListener listener) {
		MessageListener.removeOnTVMessageListener(listener);
		CustomMessageListener.removeOnTVMessageListener(listener);
	}

	/**
	 * Removes all OnTVMessageListeners
	 */
	public void removaAllTVMessageListeners() {
		MessageListener.removeAllListeners();
		CustomMessageListener.removeAllListeners();
	}

	/**
	 * Adds {@link OnFCErrorListener} to listen in GUI to library errors.
	 * 
	 * @param listener
	 *            Your {@link OnFCErrorListener} listener.
	 */
	public void addOnFCErrorListener(OnFCErrorListener listener) {
		mFCErrorListeners.add(listener);
	}

	/**
	 * Removes {@link OnFCErrorListener}
	 * 
	 * @param listener
	 *            {@link OnFCErrorListener} to remove.
	 */
	public void removeOnFCErrorListener(OnErrorListener listener) {
		mFCErrorListeners.remove(listener);
	}

	/**
	 * Removes all OnMSFLibErrorListeners
	 */
	public void removaAllFCErrorListeners() {
		mFCErrorListeners.clear();
	}

	/**
	 * Gets Service associated with remote device to which we are currently
	 * connected. If there is no connection this method will return null.
	 * 
	 * @return Connected Service or null.
	 */
	public Service getConnectedService() {
		if (getCurrentState() == CastStates.CONNECTED || getCurrentState() == CastStates.READY) {
			return mLastConnectData.getService();
		} else {
			return null;
		}
	}

	/**
	 * Use this method to register custom event. You have to do that if you want
	 * listen on custom events sent from TV application. for details see
	 * CustomEvent class.
	 * 
	 * @param customEvent
	 *            Object of your CustomEvent class (has to inherit from
	 *            CustomEvent
	 * @return True on success and false on fail.
	 * 
	 * @see CustomEvent
	 */
	public boolean registerCustomEvent(CustomEvent customEvent) {
		if (MessageType.fromEventName(customEvent.getEvent()) != null) {
			// error: cant use this event name!
			FCError libError = new FCError(301,
					"Custom event registering error. Can't use event name: "
							+ customEvent.getEvent() + ".");
			for (OnFCErrorListener listener : mFCErrorListeners) {
				listener.OnError(libError);
			}
			return false;
		} else {
			for (CustomEvent event : mCustomEvents) {
				if (event.getEvent().compareTo(customEvent.getEvent()) == 0) {
					// error: event name already registered
					FCError libError = new FCError(301,
							"Custom event registering error. Already registered event name: "
									+ customEvent.getEvent() + ".");
					for (OnFCErrorListener listener : mFCErrorListeners) {
						listener.OnError(libError);
					}
					return false;
				}
			}
			mCustomEvents.add(customEvent);
			if (getCurrentState() != CastStates.IDLE && mRemoteApp != null) {
				mRemoteApp.addOnMessageListener(customEvent.getEvent(), new CustomMessageListener(
						customEvent));
			}
			return true;
		}
	}

	private void _reset() {
		mWasReset = false;
		removaAllDiscoveryListeners();
		removaAllFCErrorListeners();
		removaAllTVMessageListeners();
		if (mTimeoutTimer != null) {
			mTimeoutTimer.cancel();
			mTimeoutTimer = null;
		}
		if (mConnectResult != null) {
			mConnectResult.cancel();
		}
		if (mDisconnectResult != null) {
			mDisconnectResult.cancel();
		}
		if (mRemoteApp != null) {
			mRemoteApp.removeOnMessageListeners();
			mRemoteApp.removeAllListeners();
			mRemoteApp = null;
		}
		mDisconnectRequested = false;
		mClientObject = null;
		mServiceAdapter = null;
		mCustomEvents.clear();
		mRemoteController = null;
		mLastConnectData = null;
		mSuspended = false;
	}

	private void _send(MessageType type, MessageBase msg) {
		JSONObject json = null;
		if (msg != null) {
			json = msg.getJSON();
		}
		mRemoteApp.publish(type.getTVEvent(), json, "host");
	}

	private void _sendCustom(CustomEvent customEvent) {
		JSONObject json = null;
		if (customEvent != null) {
			json = customEvent.getDataJSON();
		}
		mRemoteApp.publish(customEvent.getEvent(), json, "host");
	}

	private void restoreRemoteApp(final SimpleCallback<Boolean> callback) {
		if (mLastConnectData != null) {
			final Service service = mLastConnectData.getService();
			final String appId = mLastConnectData.getAppId();
			if (service != null && appId != null && !appId.isEmpty()) {
				Thread thread = new Thread(new Runnable() {
					@Override
					public void run() {
						String urlString = service.getUri() + "applications/" + appId;
						StringBuffer response = new StringBuffer("");
						try {
							URL url = new URL(urlString);
							HttpURLConnection connection = (HttpURLConnection) url.openConnection();
							connection.setRequestProperty("User-Agent", "");
							connection.setRequestMethod("POST");
							connection.setDoInput(true);
							connection.connect();

							InputStream inputStream = connection.getInputStream();

							BufferedReader rd = new BufferedReader(new InputStreamReader(
									inputStream));
							String line = "";
							while ((line = rd.readLine()) != null) {
								response.append(line);
							}
							connection.disconnect();

							JSONObject json = new JSONObject(response.toString());
							if (callback != null) {
								if (json.getBoolean("ok") == true) {
									callback.run(true);
								} else {
									callback.run(false);
								}
							}

						} catch (IOException e) {
							e.printStackTrace();
						} catch (JSONException e) {
							e.printStackTrace();
						}
					}
				});
				thread.start();
			}
		}
	}

	/**
	 * Internal service found listener. Used as listener in discovery process in
	 * MultiScreen Framework. When new service is found it is added to
	 * ArrayAdapter or send to all listeners.
	 */
	private OnServiceFoundListener serviceFoundListener = new OnServiceFoundListener() {
		@Override
		public void onFound(Service service) {
			if (mServiceAdapter != null) {
				mServiceAdapter.add(service);
			}
			for (OnDiscoveryListener listener : mDiscoveryListeners) {
				listener.onServiceFound(service);
			}
		}
	};

	/**
	 * Internal service lost listener. Used as listener in discovery process in
	 * MultiScreen Framework. When some service is lost it is removed from
	 * ArrayAdapter or send to all listeners.
	 */
	private OnServiceLostListener serviceLostListener = new OnServiceLostListener() {
		@Override
		public void onLost(Service service) {
			if (mServiceAdapter != null) {
				mServiceAdapter.remove(service);
			}
			for (OnDiscoveryListener listener : mDiscoveryListeners) {
				listener.onServiceLost(service);
			}
		}
	};
	
	private OnBleFoundListener bleFoundListener = new OnBleFoundListener() {
		@Override
		public void onFoundOnlyBLE(String devName) {
			for (OnBLEDiscoveryListener listener : mBLEListeners) {
				listener.onBLEDeviceFound(devName);
			}
		}
	}; 
	

	/**
	 * Remote installation callback. MultiScreen Framework doesn't use it
	 * properly so it is commented out. In theory MultiScreen Framework can
	 * start installation of application remotely. If something gone wrong
	 * onError should be called. When installation is done it should be
	 * onSuccess called. Application to install have to be published in market
	 * 
	 * TODO: Check and fix this scenario! ADD wasReset check!
	 */
	private Result<Boolean> mInstallResult = new Result<Boolean>() {

		@Override
		public void onError(Error error) { // Never called by msf!
			// cleanUpConnection();
			// FCError libError = new FCError(error);
			// libError.setCode(200);
			// libError.setMessage("Installing error. Check msf error. Call getMsfError()");
			// for (OnFCErrorListener listener : mFCErrorListeners) {
			// listener.OnError(libError);
			// }
		}

		@Override
		public void onSuccess(Boolean someResult) {
			if (someResult == true) { // probably user accepts
										// installation
				// try connect again ?
				// connect(mLastConnectData);

			} else { // something happen. Probably user decline installation
				// cleanUpConnection();
				// FCError libError = new FCError(231,
				// "Installing error. Probably user not accepts installation");
				// for (OnFCErrorListener listener : mFCErrorListeners)
				// {
				// listener.OnError(libError);
				// }
			}
		}
	};

	/**
	 * Connection result callback. When something gone wrong during the
	 * connection onError is called. We can check what type of error it is. If
	 * it is 404 error it means that application is not installed or if it is
	 * cloud application it is not accessible. On this error we should try to
	 * install application from applications market. In case of installation
	 * failed there are some problem with msf so for now we just produce error.
	 * OnSuccess method of this callback is not always called by msf so it is
	 * better to use OnConnectListener to get known about connection success.
	 */
	private class ConnectResult implements Result<Client> {
		private boolean mCancel = false;

		@Override
		public void onError(Error error) {
			if (!mCancel) {
				if (mTimeoutTimer != null) {
					mTimeoutTimer.cancel();
					mTimeoutTimer = null;
				}
				if (error.getCode() == 404) { // application is not installed
					// Try install scenario doesn't work due to probably buggy
					// msf!
					// tryInstallAndConnect();
					// So we just produce 404 error:
					cleanUpConnection();
					FCError libError = new FCError(error);
					libError.setCode(200);
					libError.setMessage("Connecting error. Application not installed. Call getMsfError()");
					for (OnFCErrorListener listener : mFCErrorListeners) {
						listener.OnError(libError);
					}

				} else {
					cleanUpConnection();
					FCError libError = new FCError(error);
					libError.setCode(200);
					libError.setMessage("Connecting error. Check msf error. Call getMsfError()");
					for (OnFCErrorListener listener : mFCErrorListeners) {
						listener.OnError(libError);
					}
				}
				if (mWasReset) {
					_reset();
				}
			}
		}

		@Override
		public void onSuccess(Client client) {
			// Don't use!! Sometimes not called. Probably buggy MSF??
		}

		public void cancel() {
			mCancel = true;
		}
	}

	private ConnectResult mConnectResult = null;

	/**
	 * Disconnect result callback. Passed as argument to disconnect method. When
	 * MultiScreen Framework do something wrong during disconnection it should
	 * call onError method. If it do so we send error outside to get users known
	 * about error during disconnection. Generally it should never happen.
	 * onSuccess should be called when client is properly disconnected from
	 * channel. Normally it should be place, where we can do all clean ups after
	 * connection. But when we use OnDisconnectListener it is better to do it
	 * there because of MultiScreen framework problem when we remove all
	 * listeners during cleaning up. Framework still try to call
	 * OnDisconnectListener and ends with NullPointerException (no null pointer
	 * check in MSF?).
	 */
	private class DisconnectResult implements Result<Client> {
		private boolean mCancel = false;

		@Override
		public void onError(Error error) {
			mDisconnectRequested = false;
			if (!mCancel) {
				FCError libError = new FCError(error);
				libError.setCode(200);
				libError.setMessage("Disconnecting error. Check msf error. Call getMsfError()");
				for (OnFCErrorListener listener : mFCErrorListeners) {
					listener.OnError(libError);
				}
				if (mWasReset) {
					_reset();
				}
			}
		}

		@Override
		public void onSuccess(Client client) {
			// Can't call cleanup here! Once disconnect listener is set it
			// have to be called by msf framework (Buggy MSF??). If clean up
			// is done here msf internally ends with null pointer exception
			// (onDisconnectListener = null)
			// cleanUpConnection();
		}

		public void cancel() {
			mCancel = true;
		}
	};

	private DisconnectResult mDisconnectResult = null;

	/**
	 * Internal connection listener. This way we get known that we are properly
	 * connected to channel.
	 */
	private OnConnectListener mConnectListener = new OnConnectListener() {

		@Override
		public void onConnect(Client client) {
			if (mTimeoutTimer != null) {
				mTimeoutTimer.cancel();
				mTimeoutTimer = null;
			}
			mClientObject = client;
			gotoState(CastStates.CONNECTED, null);
			if (mWasReset) {
				_reset();
			}
		}
	};

	/**
	 * Internal disconnection listener. This way we get known that we are
	 * properly disconnected from channel.
	 */
	private OnDisconnectListener mDisconnectListener = new OnDisconnectListener() {

		@Override
		public void onDisconnect(Client client) {
			mDisconnectRequested = false;
			if (mWasReset) {
				_reset();
			}
			cleanUpConnection();
		}
	};

	/**
	 * Internal error listener. This way we are informed about all others than
	 * Connection (it is passed to connection callback only) errors from
	 * MultiScreenFramework
	 */
	private OnErrorListener mErrorListener = new OnErrorListener() {

		@Override
		public void onError(Error error) {
			FCError libError = new FCError(error);
			libError.setCode(200);
			libError.setMessage("Connecting error. Check msf error. Call getMsfError()");
			for (OnFCErrorListener listener : mFCErrorListeners) {
				listener.OnError(libError);
			}
		}
	};

	/**
	 * Clean ups after connection. Remove listeners. Make references null and
	 * change state of manager to IDLE.
	 */
	private void cleanUpConnection() {
		mDisconnectRequested = false;
		mClientObject = null;
		if (mRemoteApp != null) {
			mRemoteApp.removeOnMessageListeners();
			mRemoteApp.removeAllListeners();
			mRemoteApp = null;
		}
		gotoState(CastStates.IDLE, null);
	}

	/**
	 * Internal message listener is used to listen on READY, BYE, ERROR, SUSPEND
	 * and RESTORE messages from TV. READY, BYE and ERROR messages are used to
	 * only control communication flow and are not introduced outside library.
	 */
	private OnInternalMessageListener mInternalListener = new OnInternalMessageListener() {

		@Override
		public void onReadyMessage() {
			gotoState(CastStates.READY, null);
		}

		@Override
		public void onByeMessage() {
			// not used yet
		}

		@Override
		public void onErrorMessage(ErrorMessage errorMsg) {
			FCError libError = new FCError(errorMsg.getCode(), errorMsg.getMessage());
			for (OnFCErrorListener listener : mFCErrorListeners) {
				listener.OnError(libError);
			}
		}

		@Override
		public void onSuspendMessage() {
			mSuspended = true;
		}

		@Override
		public void onRestoreMessage() {
			mSuspended = false;
		}
	};

	/**
	 * Messages listeners are added automatically. To make it we use MessageType
	 * enumerator object which is not only just a constant but it is object
	 * which have needed informations. Here we also use MessageListener objects.
	 * Objects are produced one per MessageType and it know how to process
	 * received message.
	 * 
	 * @see com.samsung.fastcast.msgs.MessageType
	 * @see com.samsung.fastcast.MessageListener
	 */
	private void registerMessageCallbacks() {
		MessageListener.setOnInternalMessageListener(mInternalListener);
		for (MessageType type : MessageType.values()) {
			mRemoteApp.addOnMessageListener(type.getTVEvent(), new MessageListener(type));
		}
	}

	/**
	 * This method creates listeners for custom events created outside library
	 */
	private void registerCustomEventsCallbacks() {
		for (CustomEvent event : mCustomEvents) {
			mRemoteApp.addOnMessageListener(event.getEvent(), new CustomMessageListener(event));
		}
	}

	/**
	 * Can't use install scenario. It looks like it not working properly in msf.
	 */
	@SuppressWarnings("unused")
	private void tryInstallAndConnect() {
		if (mRemoteApp != null) {
			gotoState(CastStates.INSTALLING, null);
			mRemoteApp.install(mInstallResult);
		}
	}

	/**
	 * Private constructor. This is singleton object.
	 */
	private CastManager() {
		super(CastStates.IDLE);
		if (mContext != null) {
			mSearch = Service.search(mContext);
			mSearch.setOnServiceFoundListener(serviceFoundListener);
			mSearch.setOnServiceLostListener(serviceLostListener);
			mSearch.setOnBleFoundListener(bleFoundListener);
		} else {
			FCError error = new FCError(0, "MSFLib not initialized! Call MultiScreenManager.init()");
			for (OnFCErrorListener listener : mFCErrorListeners) {
				listener.OnError(error);
			}
		}
	}
}
