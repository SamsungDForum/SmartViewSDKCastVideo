/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.multiscreenplayer.helper;

import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.util.HashMap;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.AsyncTask;

/**
 * AsyncTask downloading images from URLs as bitmaps. Supports basic caching to
 * avoid downloading the same file again. Do not use in big applications - cache
 * is never cleared and can grow too large!
 * 
 * @author a.kedzierski, b.skorupski
 * @param <T>
 *            Type of data listener is waiting for
 */
public class ThumbsDownloader extends AsyncTask<Void, Void, Bitmap> {
	/**
	 * Container with already downloaded Bitmaps ready for reuse.
	 */
	private static HashMap<String, Bitmap> cache = new HashMap<String, Bitmap>();

	/**
	 * Listener that should get thumbnail when it downloads.
	 */
	private IListener2<String, Bitmap> listener;
	
	/**
	 * Url with image to download.
	 */
	private String url;

	/**
	 * Downloads image from given URL and passes it as Bitmap to the listener
	 * 
	 * @param url
	 *            image to download
	 * @param listener
	 *            will get image when it downloads.
	 */
	public static void getBitmapFromURL(String url, IListener2<String, Bitmap> listener) {
		// try to reuse cached bitmap
		Bitmap bmp = cache.get(url);
		if (bmp != null) {
			listener.onData(url, bmp);
		} else {
			// create AsyncTask to download image
			ThumbsDownloader instance = new ThumbsDownloader();
			instance.url = url;
			instance.listener = listener;
			instance.execute();
		}
	}

	/**
	 * Gets thumbnail downloaded before if possible
	 * 
	 * @param url
	 *            image to download
	 * @return cached image from given URL or null.
	 */
	public static Bitmap getCachedBitmap(String url) {
		return cache.get(url);
	}

	@Override
	protected Bitmap doInBackground(Void... params) {
		try {
			InputStream is = (InputStream) new URL(this.url).getContent();
			Bitmap bmp = BitmapFactory.decodeStream(is);
			is.close();
			return bmp;
		} catch (IOException e) {
			e.printStackTrace();
			return null;
		}
	}

	@Override
	protected void onPostExecute(Bitmap bitmap) {
		if (bitmap != null) {
			// check if other task downloaded same link to avoid holding
			// duplicate bitmaps.
			synchronized (cache) {
				Bitmap cached = cache.get(url);
				if (cached != null) {
					bitmap.recycle();
					bitmap = cached;
				} else {
					cache.put(url, bitmap);
				}
			}
			if (listener != null)
				listener.onData(url, bitmap);
		}
	}
}
