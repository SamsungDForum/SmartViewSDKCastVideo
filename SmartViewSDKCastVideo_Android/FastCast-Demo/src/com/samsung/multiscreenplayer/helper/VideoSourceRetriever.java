/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.multiscreenplayer.helper;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.content.Context;
import android.content.res.AssetManager;
import android.os.AsyncTask;

import com.samsung.multiscreenplayer.model.VideoSource;

/**
 * Retrives avalable videos list from data.json file hardcoded in project
 * 
 * @author b.skorupski
 */
public class VideoSourceRetriever extends AsyncTask<Void, Void, ArrayList<VideoSource>> {
	private Context mCtx;
	private IListener<ArrayList<VideoSource>> listener;

	public VideoSourceRetriever(Context context) {
		this.mCtx = context;
	}

	private String AssetJSONFile(String filename, Context context) {
		try {
			AssetManager manager = context.getAssets();
			InputStream is = manager.open(filename);
			byte[] buffer = new byte[is.available()];
			is.read(buffer);
			is.close();

			return new String(buffer, "UTF-8");
		} catch (IOException e) {
			e.printStackTrace();
			return null;
		}
	}

	public static void retrieveVideoList(Context ctx, IListener<ArrayList<VideoSource>> listener) {
		VideoSourceRetriever instance = new VideoSourceRetriever(ctx);
		instance.listener = listener;
		instance.execute();
	}

	@Override
	protected ArrayList<VideoSource> doInBackground(Void... params) {
		try {
			JSONObject obj = new JSONObject(AssetJSONFile("data.json", mCtx));
			JSONArray jarray = obj.getJSONArray("movies");
			ArrayList<VideoSource> items = new ArrayList<VideoSource>();

			for (int i = 0; i < jarray.length(); i++) {
				JSONObject json = jarray.getJSONObject(i);
				items.add(new VideoSource(json.getInt("id"), json.getString("title"), json.getString("playback"),
						json.getString("imgUrl"), json.getString("url"), json.getInt("views")));
			}

			return items;
		} catch (JSONException e) {
			e.printStackTrace();
		}

		return null;
	}

	@Override
	protected void onPostExecute(ArrayList<VideoSource> list) {
		if (list != null && listener != null) {
			listener.onData(list);
		}
	}
}
