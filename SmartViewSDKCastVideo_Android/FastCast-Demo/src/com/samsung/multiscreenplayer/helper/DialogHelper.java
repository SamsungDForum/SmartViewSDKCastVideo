/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.multiscreenplayer.helper;

import android.app.AlertDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.DialogInterface.OnClickListener;
import android.content.Intent;
import android.provider.Settings;

import com.samsung.multiscreenplayer.R;

/**
 * Shows different types of error dialogs
 * 
 * @author j.bielak
 */
public class DialogHelper {

	/**
	 * Show access denied dialog
	 * 
	 * @param ctx
	 */
	public static void showAccessDeniedDialog(Context ctx) {
		AlertDialog.Builder builder = new AlertDialog.Builder(ctx);
		builder.setTitle(R.string.access_denied);
		builder.setMessage(R.string.maximum_limit);

		builder.setNeutralButton(R.string.ok, new DialogInterface.OnClickListener() {

			@Override
			public void onClick(DialogInterface dialog, int which) {
				dialog.dismiss();
			}
		});
		builder.show();
	}

	/**
	 * Show not connected to wifi dialog. Starts android wifi settings activity when
	 * positive button clicked
	 * 
	 * @param ctx
	 */
	public static void showWifiNotConnectedDialog(final Context ctx) {
		AlertDialog.Builder builder = new AlertDialog.Builder(ctx);
		builder.setTitle(R.string.wifi_not_connected);
		builder.setMessage(R.string.connect_to_wifi);

		builder.setPositiveButton(R.string.yes, new OnClickListener() {

			@Override
			public void onClick(DialogInterface dialog, int which) {
				ctx.startActivity(new Intent(Settings.ACTION_WIFI_SETTINGS));
			}
		});
		builder.setNegativeButton(R.string.no, new DialogInterface.OnClickListener() {

			@Override
			public void onClick(DialogInterface dialog, int which) {
				dialog.dismiss();
			}
		});
		builder.show();
	}

	/**
	 * Show application not found on TV dialog
	 * 
	 * @param ctx
	 */
	public static void showTVAppNotFound(Context ctx) {
		AlertDialog.Builder builder = new AlertDialog.Builder(ctx);
		builder.setTitle(R.string.app_not_found_title);
		builder.setMessage(R.string.app_not_found_body);

		builder.setNeutralButton(R.string.ok, new DialogInterface.OnClickListener() {

			@Override
			public void onClick(DialogInterface dialog, int which) {
				dialog.dismiss();
			}
		});
		builder.show();
	}
	
}
