/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.fastcast.exceptions;

import com.samsung.multiscreen.Error;

/**
 * Error wrapper. MSF gets some errors and also this library can produce some
 * errors. All of them are wrapped into this class.
 * 
 * @author m.gajewski
 *
 */
public class FCError {

	protected Error mMsfError;

	protected int mCode;
	protected String mMessage;

	/**
	 * Constructor of this error wrapping MSF error
	 * 
	 * @param msfError
	 *            {@link Error} from MSF
	 */
	public FCError(Error msfError) {
		mMsfError = msfError;
	}

	/**
	 * Constructor of this error with code and human readable message
	 * 
	 * @param code
	 *            integer code of error
	 * @param message
	 *            human readable message
	 */
	public FCError(int code, String message) {
		mCode = code;
		mMessage = message;
	}

	/**
	 * Wrapped MSF {@link Error} getter
	 * @return the msfError
	 */
	public Error getMsfError() {
		return mMsfError;
	}

	/**
	 * Wrapped MSF {@link Error} setter
	 * @param msfError
	 *            the msfError to set
	 */
	public void setMsfError(Error msfError) {
		mMsfError = msfError;
	}

	/**
	 * Error code property getter
	 * @return the code
	 */
	public int getCode() {
		return mCode;
	}

	/**
	 * Error code property setter
	 * @param code
	 *            the code to set
	 */
	public void setCode(int code) {
		mCode = code;
	}

	/**
	 * human readable message property getter
	 * @return the message
	 */
	public String getMessage() {
		return mMessage;
	}

	/**
	 * human readable message property setter
	 * @param message
	 *            the message to set
	 */
	public void setMessage(String message) {
		mMessage = message;
	}
}
