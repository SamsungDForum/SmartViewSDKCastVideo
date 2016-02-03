/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.multiscreenplayer.model;

/**
 *  Model class that keeps information about video source, its id, title,
 *         playback time, uri, thumbnail, views count.
 *         
 * @author b.skorupski
 */
public class VideoSource {
	int mId;
	String mTitle;
	String mPlaybackTime;
	String mImageUri;
	String mUri;
	int mViews;

	public VideoSource(int id, String title, String playback, String imgUri, String uri, int views) {
		this.mId = id;
		this.mTitle = title;
		this.mPlaybackTime = playback;
		this.mImageUri = imgUri;
		this.mUri = uri;
		this.mViews = views;
	}

	public int getId() {
		return mId;
	}

	public void setId(int id) {
		this.mId = id;
	}

	public String getTitle() {
		return mTitle;
	}

	public void setTitle(String title) {
		this.mTitle = title;
	}

	public String getPlaybackTime() {
		return mPlaybackTime;
	}

	public void setPlaybackTime(String playback) {
		this.mPlaybackTime = playback;
	}

	public String getImageUri() {
		return mImageUri;
	}

	public void setImageUri(String imgUri) {
		this.mImageUri = imgUri;
	}

	public String getUri() {
		return mUri;
	}

	public void setUri(String uri) {
		this.mUri = uri;
	}

	public int getViews() {
		return mViews;
	}

	public void setViews(int views) {
		this.mViews = views;
	}
}
