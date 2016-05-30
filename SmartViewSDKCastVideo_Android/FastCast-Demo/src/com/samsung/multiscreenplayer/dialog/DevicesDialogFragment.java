package com.samsung.multiscreenplayer.dialog;

import android.app.Dialog;
import android.content.DialogInterface;
import android.os.Bundle;
import android.support.v4.app.DialogFragment;
import android.view.LayoutInflater;
import android.view.View;
import android.view.View.OnClickListener;
import android.widget.AdapterView;
import android.widget.AdapterView.OnItemClickListener;
import android.widget.Button;
import android.widget.ListAdapter;
import android.widget.ListView;
import android.widget.ProgressBar;

import com.samsung.multiscreenplayer.R;

public class DevicesDialogFragment extends DialogFragment {

	public interface DevicesDialogListener {
		void onItemClicked(int index);
		void onDismiss();
	}
	
	private ListAdapter adapter;
	
	private DevicesDialogListener listener;
	
	private ProgressBar progressBar;

	private boolean progressBarVisible;

	public DevicesDialogFragment(ListAdapter adapter) {
		super();
		this.adapter = adapter;
	}

	@Override
	public Dialog onCreateDialog(Bundle savedInstanceState) {
		
	    LayoutInflater inflater = getActivity().getLayoutInflater();

	    final Dialog dialog = new Dialog(getContext());	    
	    
		View innerView = inflater.inflate(R.layout.devices_dialog_layout, null);
		dialog.requestWindowFeature(STYLE_NO_TITLE);
		dialog.setContentView(innerView);
		
		progressBar = (ProgressBar) innerView.findViewById(R.id.devices_dialog_loading);
		progressBar.setVisibility(progressBarVisible ? View.VISIBLE : View.GONE);
		
		ListView deviceList = (ListView) innerView.findViewById(R.id.devices_dialog_list);
		deviceList.setAdapter(adapter);
		Button negativeButton = (Button) innerView.findViewById(R.id.negativeButton);
		negativeButton.setOnClickListener(new OnClickListener() {
			
			@Override
			public void onClick(View v) {
				dialog.dismiss();				
			}
		});
		
		deviceList.setOnItemClickListener(new OnItemClickListener() {

			@Override
			public void onItemClick(AdapterView<?> adapter, View view, int index, long id) {
				if (listener != null) {
					listener.onItemClicked(index);
				}
			}
		});	
		
	    return dialog;
	}
	
	@Override
	public void onDismiss(DialogInterface dialog) {
		super.onDismiss(dialog);
		if (listener != null) {
			listener.onDismiss();
		}
	}
	
	public void setProgressBarVisibility(boolean visible) {
		progressBarVisible = visible;
		if (progressBar != null) {
			progressBar.setVisibility(visible ? View.VISIBLE : View.GONE);
		}
	}

	public void setDevicesDialogListener(DevicesDialogListener listener) {
		this.listener = listener;
	}

}
