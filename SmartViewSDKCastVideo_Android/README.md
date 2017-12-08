# SmartViewSDKCastVideo
Smart View SDK Reference app to cast video

## 1.	Introduction
This document shows how to build simple VOD Multi Screen application using Multi Screen Framework 2.0. Thanks to FastCast library described in other document this task should be easy to perform on any existing VOD application. 

### How to import android studio
---
1. Select "import project(Eclipse ADT,Gradle,etc..)
2. Choose "FastCast-Demo" folder
3. Android stuio change greadle style automatically
4. Create libs folder and copy android-support-v4.jar original folder
5. Build & run


### Prerequisites

----------

We assume that you have Eclipse IDE and Android SDK installed. To add Multi Screen support to any application you should use our FastCast library. Please add “fastcast.jar” file to your Android application “libs” folder. From now you can use API described in Library document.

### Application overview

----------

Sample application shows basic usage of FastCast library in standard VOD application to discover, connect, communicate (control) and disconnect from TV. Basic VOD scenarios are included in app. Application has two main views: list and player. List view displays available video sources to play in player. Player has two modes of working:

• When application is not connected, player view plays video content in local mobile device. Application behaves as simple media player. 

• When application is connected to TV it displays remote player that controls TVs playback. In this mode, mobile user can cast videos to TV, control TVs playback and volume, and reclaim videos from TV back to mobile device. 


Diagram 1 - Application components diagram

### Main Activity

----------

Android activity, which creates and initializes application controller and gives context to it. Creates views and gives some of them to controller. It sends activity lifecycle events to controller.

### Application Controller
----------
Bridge between FastCast library and rest of application. Controls view states (list, player local and player casting), initializes CastManager from FastCast library. Handles in-app connection with TV, showing search TVs list, disconnections (by disconnect options dialog) and error dialogs. Listens for CastManager state changes. Receives TV messages (ie. TV status) and controls playback using libs RemoteController (play/pause, rewind, seek, starts playback, volume control).

### Video List
----------
View that displays a list of movies available to play. Each element contains video name, thumbnail, duration and views count. After clicking video source from list, plays it (locally or remotely) and switches to player view state (if not in it). Visible in every view.

### Local Video Player
----------
View that contains androids VideoView widget. It handles videos loading, shows player controls, controls playback and shows loading screen. Behaves like standard video player with custom controls. Visible when application is not connected to TV and in player local view state.

### Remote Player
----------
View similarly looking like local video player. Visible when in player casting view state (TV is connected). Shows video thumbnail, video playback controls, which behave as TVs remote controller. Displays current TVs seek position and video duration. 

### Multi-screen Bar
----------
Top application action bar view, which displays cast icon.  When connected to TV multi-screen bar displays also currently played video on TV and in list view state current TVs playback status.

### Helpers
----------
Pack of helpers for downloading thumbnails, available video source elements, generic listeners and displaying error dialogs.

## 2.	General process of integration library
In order to integrate FastCast library to application you must follow few simple steps.

1.	Initialize FastCast library before use
2.	Discovery devices in your WiFi network
3.	Connect to device chosen by user
4.	Handle connection state to display it correctly
5.	Listen to and handle messages sent by TV application
6.	Start playback on remote TV application
7.	Control playback on remote TV application
8.	Disconnect from remote TV application

### Initialization
----------
To start working with FastCast library, application needs to initialize it. CastManager is singleton with static init method, which takes android Context as argument. After that controller takes CastManager instance, with static method getInstance.

	// cast manager init and get instance
	CastManager.init(context);
	CastManager castManager = CastManager.getInstance();

After that controller sets ArrayAdapter<Service> to CastManager’s setServiceAdapter method. Cast manager will automatically handle list of available TVs and put them into adapter, which inherits from ArrayAdapter<Service>.

	// Make instance of adapter inherited from ArrayAdapter
	ServiceAdapter adapter = new ServiceAdapter(this);
	// pass your adapter to library
	castManager.setServiceAdapter(adapter);

### Performing discovery and TVs list
----------
After initialization and setting service adapter, when user clicks in-app cast button, controller starts discovering TVs. 

	// Start discovery process
	castManager.startDiscovery();
	showSearchDialog();

Dialog with available TVs is shown after call showSearchDialog method. AlertDialog.Builder was used to create dialog window with ListView inside. ListView use adapter described in initialization step.

### Connect
----------
After click of dialogs list element, controller stops discovering other TVs. Puts connection attributes, creates and sets connection data with AppId and ChannelId. Also sets Service picked up from list of available services and sends connection request to Service.

	// stop discovery process. It is no longer needed
	castManager.stopDiscovery();
	// Map for TV application start arguments
	Map<String, Object> startArgs = new HashMap<String, Object>();
	// Map for client attributes
	Map<String, String> attributes = new HashMap<String, String>();
	// Some example start argument
	startArgs.put("url", "http://samsung.com");
	// Attribute name to get TV application known whose connecting
	attributes.put("name", "Mobile");
	// create ConnectData object and fill it with data
	ConnectData connectionParams = new ConnectData();
	connectionParams.setAppId(APP_ID);
	connectionParams.setChannelId(CHANNEL_ID);
	connectionParams.setService(choosenService);
	connectionParams.setStartArgs(startArgs);
	connectionParams.setConnectionAttributes(attributes);
	// call connect method
	castManager.connect(connectionParams);

### Connection states handling
----------
Controller listens for CastManager state changes by adding listener. 

	// Add listener to cast manager that listens for state changes
		mCastManager.onStateStarts.addListener(new StateChangeListener<CastStates>() {
			@Override
			public void stateChanged(StateChangeArgs<CastStates> args) {
				stateStarted(args);
			}
	});

In stateStarted method there is a switch that handles states of CastManager. There are 5 different states (for need of application 3 of them are currently handled). State IDLE sets connected boolean to false and also switches displayed views to disconnect mode.
State CONNECTING shows loading screen. State READY starts when connection is established and both devices are ready to communicate. It hides loading screen, sets connected boolean to true and switches displayed views to connected mode.

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
		mMultiScreenBar.setConnectedState(mConnected);
		break;
	case CONNECTED:
		//TV app and mobile app connected, but not yet ready  
		break;
	case CONNECTING:
		if (mLoadListener != null) {
			mLoadListener.onData(true);
		}
		break;
	case INSTALLING:
		//TV App installing state
		break;
	case IDLE:
		mConnected = false;
		mMultiScreenBar.setConnectedState(mConnected);
		if (mViewState == ViewsState.PLAYER_CASTING) {
			showView(ViewsState.PLAYER_LOCAL);
			startCurrentVideo();
		}
		break;

### TV messages listening
----------
To listen messages from TV, controller adds OnTVMessageListener listener.

	// Add listener that listens for tv messages
	mCastManager.addOnTVMessageListener(mTvMsgListener); 

Controller currently uses only one message from OnTVMessageListener. It overrides onStatusMessage which TV sends every second when TV player is playing when devices are connected. Status message gives information about currently played video id, videos current position and total time, TV volume, TV player current state. Information is propagated through application views like remote player, multiscreen top bar etc. Message listener code should looks as follow: 
 
	//Listener to retrieve events from TV
	private OnTVMessageListener mTvMsgListener = new OnTVMessageListener() {
	@Override
		public void onStatusMessage(StatusMessage msg) {
			if (mViewState != ViewsState.PLAYER_LOCAL) {
				setCurrentVideoSource(msg.getVideoId());
				mRemotePlayer.setPlayerStatus(msg);
				if (mViewState == ViewsState.PLAYER_CASTING) {
					updateCurrentPosition(msg.getPosition());
					mRemotePlayer.hideLoading();
				}
				if (mViewState == ViewsState.LIST) {
					mMultiScreenBar.setPlayingStatus(msg);
				}
			}
		}
		...
	};

### Start remote playback
----------
When connected to TV, user can select videos to be played on TV, by clicking video elements from videos list. Application controller gets RemoteController from CastManager. RemoteController is helper class, which gives simple playback control methods. Controller invokes startPlayback method, giving to it video id and seek position. 

	// Plays content on TV from given position
	mCastManager.getRemoteController().startPlayback(mCurrentVideoSource.getId(), mCurrentVideoPosition);

### Remote control
When connection is established default video player is replaced by RemotePlayerView. Every time user makes playback action (play/pause, rewind, seek, volume change etc.), controllers onPlayerCastAction method is invoked. Depending on action it invokes RemoteController methods.

	// Plays content on TV from given position
	public void onPlayerCastAction(PlayerCastAction action, Object metadata) {
		switch (action) {
		case FAST_FORWARD:
			mCastManager.getRemoteController().fastForward();
			break;
		case PLAYPAUSE:
			mCastManager.getRemoteController().playPause();
			break;
		case STOP:
			mCastManager.getRemoteController().stop();
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
			mCastManager.getRemoteController().setVolume(mTVVolume);
			break;
		case VOLUME_UP:
			mCastManager.getRemoteController().setVolume(mTVVolume);
			break;
		default:
			break;
		}
	}

### Disconnect
----------
To disconnect from TV user clicks in-app cast button and selects disconnect action from dialog. Contoller invokes CastManager’s disconnect method with boolean closeRemote parameter. After that local player starts video with seek from last status message from TV.

	private void disconnectFromTv(boolean closeRemote) {
		mConnected = false;
		mCastManager.disconnect(closeRemote);
		startCurrentVideo();
	}

