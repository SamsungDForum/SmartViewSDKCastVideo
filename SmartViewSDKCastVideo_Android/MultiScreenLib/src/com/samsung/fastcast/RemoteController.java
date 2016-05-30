/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.fastcast;

import org.json.JSONObject;

import com.samsung.fastcast.msgs.KeydownMessage;
import com.samsung.fastcast.msgs.MessageType;
import com.samsung.fastcast.msgs.PlayMessage;
import com.samsung.fastcast.msgs.SeekMessage;
import com.samsung.fastcast.msgs.VolumeMessage;

/**
 * Helper class for remote controlling
 * 
 * @author m.gajewski
 *
 */
public class RemoteController {

	private static RemoteController mInstance = null;
	//private CastManager mMSF;

	/**
	 * Gets single object of this class.
	 * 
	 * @return RemoteController object
	 */
	static RemoteController getInstance() {
		if (mInstance == null) {
			mInstance = new RemoteController(/*CastManager.getInstance()*/);
		}
		return mInstance;
	}

	/**
	 * Private Constructor of this Singleton class. CastManager instance is
	 * needed to perform send operation.
	 * 
	 * @param msf
	 *            CastManager instance.
	 */
	private RemoteController(/*CastManager msf*/) {
		//mMSF = msf;
	}

	/**
	 * Sends message to remote device to start video playing on it.
	 * 
	 * @param videoId
	 *            ID of video to be played.
	 * @param beginPosition
	 *            Position in milliseconds where to start playing.
	 */
	public void startPlayback(int videoId, long beginPosition) {
		PlayMessage msg = new PlayMessage();
		msg.setVideoId(videoId);
		msg.setPosition(beginPosition);
		CastManager.getInstance().send(MessageType.PLAY, msg);
	}

	/**
	 * Sends message to remote device to start video playing on it. Use this
	 * version of method if you want add additional data argument to message
	 * sent to TV application
	 * 
	 * @param videoId
	 *            ID of video to be played.
	 * @param beginPosition
	 *            Position in milliseconds where to start playing.
	 * @param JSONData
	 *            Stringified JSON object with all data you need.
	 */
	public void startPlayback(int videoId, long beginPosition, String JSONData) {
		PlayMessage msg = new PlayMessage();
		msg.setVideoId(videoId);
		msg.setPosition(beginPosition);
		msg.setData(JSONData);
		CastManager.getInstance().send(MessageType.PLAY, msg);
	}

	/**
	 * Sends message to remote device to start video playing on it. Use this
	 * version of method if you want add additional data argument to message
	 * sent to TV application
	 * 
	 * @param videoId
	 *            ID of video to be played.
	 * @param beginPosition
	 *            Position in milliseconds where to start playing.
	 * @param JSONData
	 *            JSONObject with all data you need.
	 */
	public void startPlayback(int videoId, long beginPosition, JSONObject data) {
		PlayMessage msg = new PlayMessage();
		msg.setVideoId(videoId);
		msg.setPosition(beginPosition);
		msg.setData(data);
		CastManager.getInstance().send(MessageType.PLAY, msg);
	}

	/**
	 * Sends PlayPause keycode to remote device
	 */
	public void playPause() {
		KeydownMessage msg = new KeydownMessage();
		msg.setKeycode("MediaPlayPause");
		CastManager.getInstance().send(MessageType.KEYDOWN, msg);
	}

	/**
	 * Sends Stop keycode to remote device
	 */
	public void stop() {
		KeydownMessage msg = new KeydownMessage();
		msg.setKeycode("MediaStop");
		CastManager.getInstance().send(MessageType.KEYDOWN, msg);
	}

	/**
	 * Sends Forward keycode to remote device
	 */
	public void fastForward() {
		KeydownMessage msg = new KeydownMessage();
		msg.setKeycode("MediaFastForward");
		CastManager.getInstance().send(MessageType.KEYDOWN, msg);
	}

	/**
	 * Sends Rewind keycode to remote device
	 */
	public void rewind() {
		KeydownMessage msg = new KeydownMessage();
		msg.setKeycode("MediaRewind");
		CastManager.getInstance().send(MessageType.KEYDOWN, msg);
	}

	/**
	 * Sends seek to position message to remote device.
	 * 
	 * @param position
	 *            Position in milliseconds where to jump.
	 */
	public void seek(long position) {
		SeekMessage msg = new SeekMessage();
		msg.setPosition(position);
		CastManager.getInstance().send(MessageType.SEEK, msg);
	}

	/**
	 * Sends new volume value to remote device.
	 * 
	 * @param volume
	 *            new volume value. Negative value means mute at volume =
	 *            abs(value).
	 */
	public void setVolume(int volume) {
		VolumeMessage msg = new VolumeMessage();
		msg.setValue(volume);
		CastManager.getInstance().send(MessageType.VOLUME, msg);
	}

	/**
	 * Sends Reclaim message to remote device. Remote device should back
	 * playback to this device by sending "play" message
	 */
	public void reclaim() {
		CastManager.getInstance().send(MessageType.RECLAIM, null);
	}

	/**
	 * Sends custom keycode to remote device. Keycode should be string in W3C
	 * standard: http://www.w3.org/TR/DOM-Level-3-Events-code/
	 * 
	 * @param keycode
	 *            keycode to send to remote device
	 */
	public void keyDown(String keycode) {
		KeydownMessage msg = new KeydownMessage();
		msg.setKeycode(keycode);
		CastManager.getInstance().send(MessageType.KEYDOWN, msg);
	}
}
